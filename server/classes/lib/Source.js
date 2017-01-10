var EventEmitter = require('events').EventEmitter;
var util = require('util');

var classes = {
  Engine: require('./Engine')
};

var tools = {
  fs: require('../../tools/lib/fs'),
  object: require('../../tools/lib/object'),
  systems: require('../../tools/lib/system')
};

//todo CACHE

/**
 * Game Data.
 *
 * @typedef {object} GameData
 * @property {string} mid - Manifest Id (guid)
 * @property {string} sid - System Id
 * @property {string} ref - Referer URL
 * @property {string} name
 * @property {string} url
 * @property {string} [img] - Screenshot of the game if available
 */

/**
 * Games event.
 *
 * @event Source#games
 * @type {GameData[]}
 */

/**
 * Crawling event.
 *
 * @event Source#crawling
 * @type {object.<string, boolean>} - systemId => crawling
 */

module.exports = Source;

/**
 * System handler
 * @param {string} path
 * @constructor
 * @augments EventEmitter
 */
function Source(path) {
  this.id = path.split('/').pop();
  this.path = path;

  try {
    this.manifest = require(this.path);
    this.manifest.systems = this.manifest.systems || {};
    this.valid = true;
  } catch (err) {
    // return a non Source object to avoid any unwanted function call
    return {};
  }

  /**
   * hashmap
   * @type {{systemId: object}}
   */
  this.crawling = {};

  /**
   * hashmap
   * @type {{systemId: games}}
   */
  this.games = {};

  /**
   * hashmap manifestId => { systemId => {url : true} }
   * @type {{mid: {sid: {url: boolean}}}}
   */
  this.downloading = {};
  this.engine = new classes.Engine(this.manifest.origin, this.manifest.headers);
}

util.inherits(Source, EventEmitter);

/**
 * Return true if the source handle this system
 * @param {object} system
 * @return {boolean}
 */
Source.prototype.hasSystem = function (system) {
  return !!this.manifest.systems[system.id];
};

/**
 * source public interface
 * @typedef {Object} sourceJSON
 * @property {string} id
 * @property {string} [name]
 * @property {string} [picture] - filename (without the path)
 */

/**
 * Return the public data of a source
 * @params {string} [systemId]
 * @return {sourceJSON}
 */
Source.prototype.toJSON = function (systemId) {
  var data = {
    id: this.id,
    name: this.manifest.name,
    picture: this.manifest.picture
  };
  if (systemId) {
    data.crawling = !!this.crawling[systemId];
    data.games = this.games[systemId];
  }
  return data;
};

Source.prototype.systemManifest = function (systemId) {
  var manifest = Object.assign({}, this.manifest.generic, this.manifest.systems[systemId], {sourceId: this.id, systemId: systemId});
  if (manifest.missingImg) {
    manifest.missingImg = this.engine.makeUrl(manifest.missingImg);
  }
  ['pg_home', 'pg_games'].forEach(function (key) {
    manifest[key] = manifest[key] || {};
  });
  return manifest;
};

/**
 * Start website crawling if not already done
 * @fires Source#games
 * @fires Source#crawling
 * @param systemId
 */
Source.prototype.crawl = function (systemId) {
  var self = this;
  if (self.games[systemId] || self.crawling[systemId]) {
    return;
  }
  self.crawling[systemId] = true;
  self.emit('crawling', self.crawling);
  var manifest = self.systemManifest(systemId);
  var engine = this.engine;

  loadGameList(manifest, engine, manifest.path)
    .then(function (games) {
      games = unique(games || []);

      if (manifest.pg_games.ignore) {
        var ignore = new RegExp(manifest.pg_games.ignore);
        games = games.filter(function (game) {
          return !game.name.match(ignore);
        });
      }
      self.games[systemId] = games;
      self.crawling[systemId] = false;
      self.emit('games', games);
      self.emit('crawling', self.crawling);
    })
    .catch(function (err)  {
      console.log(err);
    });

};

/**
 * Download a game
 * @param {GameData} game
 */
Source.prototype.download = function (game) {
  var dl = this.downloading;
  var engine = this.engine;
  var self = this;

  dl[game.sc] = dl[game.sc] || {};
  dl[game.sc][game.sid] = dl[game.sc][game.sid] || {};
  if (dl[game.sc][game.sid][game.url]) {
    return ;
  }
  dl[game.sc][game.sid][game.url] = true;
  var manifest = this.systemManifest(game.sid);

  var progressEventName = 'progress_' + game.sc + '_' + game.sid + '_' + game.url;

  function progress(progression) {
    self.emit('progress', {
      game: game,
      progression: progression
    });
  }

  engine.on(progressEventName, progress);

  var tasks = [];
  var files = [];
  var filename, tmpfile;

  find(self.games[game.sid], game.url).downloading = true;
  
  if (manifest.pg_game) {
    tasks = Array.isArray(manifest.pg_game) ? manifest.pg_game.slice() : [manifest.pg_game];
  }
  
  download(engine, game.url, game.ref, progressEventName, tasks)
    .then(function (result) {
      engine.removeListener(progressEventName, progress);
      if (result) {
        filename = result.filename;
        return tools.fs.saveToTmpFile(result.body, result.filename);
      }
    })
    .then(function (_tmpfile) {
      tmpfile = _tmpfile;
      return tools.systems.get(game.sid).handleFile(tmpfile, filename, files);
    })
    .then(function (renamed) {
      var local = find(self.games[game.sid], game.url);
      local.downloading = false;
      local.downloaded = true;

      self.emit('complete', {
        game: game,
        files: files
      });
      if (!renamed) {
        return tools.fs.unlink(tmpfile);
      }
    })
    .catch(function (err) {
      find(self.games[game.sid], game.url).downloading = false;
      console.log(err);
    });

};

/**
 * Retrieve the game in the list
 * @param {object[]} games
 * @param {string} url
 * @return {object}
 */
function find(games, url) {
  // Update the memory cache (to keep the state on refresh)
  for(var i=0; i<games.length; i++) {
    if (games[i].url === url) {
      return games[i];
    }
  }
  // would never happen
  return {};
}

function loadGameList(manifest, engine, url, crawled) {
  crawled = crawled || {};

  // Check if the requested url has not already been crawled
  if (crawled[url]) {
    return Promise.resolve();
  }

  if (!tools.object.isObject(manifest.pg_games)) {
    return Promise.reject('Manifest error: pages.games mismatch');
  }

  // Single page with all games
  if (!manifest.pg_home.pageLinks) {
    return loadGameListPage(manifest, engine, url, crawled);
  }

  crawled[url] = true;

  // Main page with pagination (ie: A-Z Roms)
  return engine
    .get(url)
    .then(function (result) {
      return result.map(manifest.pg_home.pageLinks, function (link) {
        return link.attr('href');
      });
    })
    .then(function (urls) {
      if (!urls || !urls.length) {
        return ;
      }
      return Promise
        .all(urls.map(function (url) {
          return loadGameListPage(manifest, engine, url);
        }))
        .then(function (results) {
          return Array.prototype.concat.apply([], results);
        });
    });
}

function loadGameListPage(manifest, engine, url, crawled) {
  if (crawled[url]) {
    return Promise.resolve([]);
  }
  crawled[url] = true;

  return engine
    .get(url)
    .then(function (result) {
      var games = result.map(manifest.pg_games.items, function (item) {
        return buildGame(manifest, engine, result, item, url);
      });
      if (manifest.pg_home.next) {
        // Pagination base on "Previous - Next"
        var next = result.find(manifest.pg_home.next).attr('href');
        if (next) {
          return loadGameListPage(manifest, engine, next, crawled)
            .then(function (moreGames) {
              return games.concat(moreGames);
            });
        }
      }
      return games;
    });
}

function buildGame(manifest, engine, result, item, url) {
  var data = {
    sc  : manifest.sourceId,
    sid : manifest.systemId,
    ref : engine.makeUrl(url)
  };

  // classic image tag
  if (manifest.pg_games.img) {
    data.img = engine.makeUrl(result.find(item, manifest.pg_games.img).attr('src'));
  }
  // there is a link to an image
  if (!data.img && manifest.pg_games.imgLink) {
    data.img = engine.makeUrl(result.find(item, manifest.pg_games.imgLink).attr('href'));
  }

  // check if image is not a default one
  if (manifest.missingImg && data.img === manifest.missingImg) {
    delete data.img;
  }

  if (manifest.pg_games.romLink) {
    // Direct link to the rom
    data.url = manifest.pg_games.romLink;
  } else if (manifest.pg_games.link) {
  // get game page link
    data.url = result.find(item, manifest.pg_games.link).attr('href');
  } else {
    // the item itself is the link to the page
    data.url = item.attr('href');
  }

  if (typeof data.url === 'function') {
    data.url = data.url(item);
  }

  if (data.url) {
    data.url = engine.makeUrl(data.url);
  }

  // get game name
  if (manifest.pg_games.name) {
    data.name = (result.find(item, manifest.pg_games.name).text() || '').trim();
  } else {
    // the item itself show the game name
    data.name = item.text().trim();
  }

  // get game size
  if (manifest.pg_games.size) {
    data.size = (result.find(item, manifest.pg_games.size).text() || '').trim();
  }

  return data;
}

/**
 * Execute tasks to ends downloading a file
 * @param {Engine} engine
 * @param {string} url
 * @param {string} referer
 * @param {string} progressEventName
 * @param {object[]} tasks
 * @return {Promise}
 */
function download(engine, url, referer, progressEventName, tasks) {
  if (!tasks.length) {
    return engine.get({url: url, followAllRedirects: true, encoding: null}, {referer: referer}, {progress: progressEventName});
  }

  /**
   * Shift a task and run it on the downloaded page
   * @param {Promise} promise
   * @return {Promise}
   */
  function handle(promise) {
    var task = tasks.shift();
    var query = {followAllRedirects: true};
    return promise.
      then(function (data) {
        if (task.form) {
          var form = data.find(task.form);
          if (!form) {
            return Promise.reject('Form not found');
          }
          query.url = form.attr('action');
          query.method = (form.attr('method') || 'post').toUpperCase();
          query.form = {};
          data.forEach(data.find(form, 'input'), function (input) {
            query.form[input.attr('name')] = input.val();
          });
        }
        return data;
      })
      .then(function (data) {
        if (task.link) {
          query = {
            method: 'GET',
            url: data.find(task.link).attr('href')
          };
        }
        return data;
      })
      .then(function () {
        if (!query.method) {
          return Promise.reject('Unknown method');
        }
        if (tasks.length) {
          return handle(engine.send(query, {referer: referer}));

        } else {
          query.encoding = null;
          return engine.send(query, {referer: referer}, {progress: progressEventName});
        }
      });
  }

  return handle(engine.get(url));
}

/**
 * Remove duplicate games
 * @param {object[]} games
 * @return {object[]}
 */
function unique(games) {
  var urls = games.map(function (game) {
    return game.url;
  });
  return games.filter(function (game, index) {
    return urls.indexOf(game.url) === index;
  });
}