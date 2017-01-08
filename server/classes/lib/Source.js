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
    this.manifest = require(this.path + '/manifest.json');
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
      if (manifest.pg_games.reIgnore) {
        var ignore = new RegExp(manifest.pg_games.reIgnore);
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

  var files = [];
  var filename, tmpfile;

  find(self.games[game.sid], game.url).downloading = true;

  Promise
    .resolve()
    .then(function () {
      if (manifest.pg_game && manifest.pg_game.form) {
        return engine
          .get(game.url)
          .then(function (data) {
            var form = data.$(manifest.pg_game.form);

            if (!form) {
              return Promise.reject('Form not found');
            }

            var action = form.attr('action');
            var method = (form.attr('method') || 'post').toLowerCase();
            var values = {};
            data.$.tools.forEach(form.find('input'), function (input) {
              values[input.attr('name')] = input.val();
            });

            if (typeof engine[method] !== 'function') {
              return Promise.reject('unknown form method: ' + method);
            }

            return engine[method]({url: action, form: values, followAllRedirects: true, encoding: null}, {referer: game.ref}, {progress: progressEventName});
          });
      }

      return engine.get({url: game.url, encoding: null}, {referer: game.ref}, {progress: progressEventName});
    })
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
  crawled[url] = true;

  if (!tools.object.isObject(manifest.pg_games)) {
    return Promise.reject('Manifest error: pages.games mismatch');
  }

  // Single page with all games
  if (!manifest.pg_home || !manifest.pg_home.pageLinks) {
    return loadGameListPage(manifest, engine, url);
  }

  // Main page with pagination (ie: A-Z Roms)
  return engine
    .get(url)
    .then(function (result) {
      return result.$.tools.map(manifest.pg_home.pageLinks, function (link) {
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
    })
    .then(function (games) {
      return unique(games || []);
    });
}

function loadGameListPage(manifest, engine, url) {
  return engine
    .get(url)
    .then(function (result) {
      return result.$.tools.map(manifest.pg_games.items, function (item) {
        return buildGame(manifest, engine, item, url);
      });
    });
}

function buildGame(manifest, engine, item, url) {
  var img;

  if (manifest.pg_games.img) {
    img = engine.makeUrl(item.find(manifest.pg_games.img).attr('src'));
  } else if (manifest.pg_games.imgLnk) {
    img = engine.makeUrl(item.find(manifest.pg_games.imgLnk).attr('href'));
  }

  if (manifest.missingImg && img === manifest.missingImg) {
    img = undefined;
  }

  return {
    sc  : manifest.sourceId,
    sid : manifest.systemId,
    url : engine.makeUrl(item.find(manifest.pg_games.link).attr('href')),
    ref : engine.makeUrl(url),
    name: (item.find(manifest.pg_games.name).text() || '').trim(),
    size: manifest.pg_games.size ? (item.find(manifest.pg_games.size).text() || '').trim() : undefined,
    img : img
  };
}

function unique(games) {
  var urls = games.map(function (game) {
    return game.url;
  });
  return games.filter(function (game, index) {
    return urls.indexOf(game.url) === index;
  });
}