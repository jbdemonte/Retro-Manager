var EventEmitter = require('events').EventEmitter;
var util = require('util');
var path = require('path');

var classes = {
  Engine: require('./Engine'),
  Game: require('./Game'),
  GameList: require('./GameList')
};

var tools = {
  fs: require('../../tools/lib/fs'),
  object: require('../../tools/lib/object'),
  string: require('../../tools/lib/string'),
  systems: require('../../tools/lib/system')
};

/**
 * Games event.
 *
 * @event Source#games
 * @type {Game[]}
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
 * @param {string} sourcePath
 * @constructor
 * @augments EventEmitter
 */
function Source(sourcePath) {
  this.id = sourcePath.split('/').pop();
  this.path = sourcePath;

  // delete all previous cache because module may have be updated
  delete require.cache[require.resolve(this.path)];

  try {
    this.config = require(this.path);
    this.config.systems = this.config.systems || {};
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

  this.games = new classes.GameList();

  this.engine = new classes.Engine(this.config.origin, this.config.headers);
}

util.inherits(Source, EventEmitter);

/**
 * Return true if the source handle this system
 * @param {object} system
 * @return {boolean}
 */
Source.prototype.hasSystem = function (system) {
  return !!this.config.systems[system.id];
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
    name: this.config.name,
    url: this.config.origin,
    picture: this.config.picture,
    version: this.config.version
  };
  if (systemId) {
    data.crawling = !!this.crawling[systemId];
    data.games = this.games.get(systemId);
  }
  return data;
};

/**
 * Return True if raw entry version is newer than the current one
 * @param {object} raw
 * @return {boolean}
 */
Source.prototype.isOlderThan = function (raw) {
  var mine = tools.string.getSemVer(this.config.version);
  var theirs = tools.string.getSemVer(raw.version);
  for (var i = 0; i < 3; i++) {
    if (mine[i] < theirs[i]) {
      return true;
    }
    if (mine[i] > theirs[i]) {
      return false;
    }
  }
  return false;
};

/**
 * Start website crawling if not already done
 * @fires Source#games
 * @fires Source#crawling
 * @param systemId
 */
Source.prototype.crawl = function (systemId) {
  var self = this;

  // return if already crawled or is crawling
  if (self.games.get(systemId) || self.crawling[systemId]) {
    return;
  }

  // Reuse a cache
  if (self._loadCache(systemId)) {
    self.emit('games', {systemId: systemId, games: self.games.get(systemId)});
    return;
  }

  self.crawling[systemId] = true;
  self.emit('crawling', self.crawling);

  var config = self.systemConfig(systemId);

  self._loadGameList(config)
    .then(function (games) {
      games = unique(games || []);

      if (config.pg_games.ignore) {
        var ignore = new RegExp(config.pg_games.ignore);
        games = games.filter(function (game) {
          return !game.name.match(ignore);
        });
      }

      games = games.sort(function (g1, g2) {
        return g1.name < g2.name ? -1 : 1;
      });

      self.games.set(systemId, games);
      self.crawling[systemId] = false;
      self.emit('games', {systemId: systemId, games: games});
      self.emit('crawling', self.crawling);

      self._saveCache(systemId);
    })
    .catch(function (err)  {
      console.log(err);
    });

};

/**
 * Download a game
 * @param {object} jsonGame
 */
Source.prototype.download = function (jsonGame) {
  var engine = this.engine;
  var self = this;
  var game = self.games.retrieve(jsonGame);

  if (!game.download.start()) {
    return ;
  }
  var config = this.systemConfig(game.sid);

  var progressEventName = 'progress_' + game.id;

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

  if (config.pg_game) {
    tasks = Array.isArray(config.pg_game) ? config.pg_game.slice() : [config.pg_game];
  }
  
  this._download(game, progressEventName, tasks)
    .then(function (response) {
      engine.removeListener(progressEventName, progress);
      if (response) {
        filename = response.filename();
        return tools.fs.saveToTmpFile(response.body, filename);
      }
    })
    .then(function (_tmpfile) {
      tmpfile = _tmpfile;
      return tools.systems.get(game.sid).handleFile(tmpfile, filename, files);
    })
    .then(function (renamed) {
      game.download.end(true);

      self.emit('complete', {
        game: game,
        files: files
      });
      if (!renamed) {
        return tools.fs.unlink(tmpfile);
      }
    })
    .catch(function (err) {
      game.download.end(false);
      console.log(err);
    });

};

/**
 * Execute tasks to ends downloading a file
 * @param {Game} game
 * @param {string} progressEventName
 * @param {object[]} tasks
 * @return {Promise}
 * @private
 */
Source.prototype._download = function (game, progressEventName, tasks) {
  var engine = this.engine;
  if (!tasks.length) {
    return engine.get({url: game.url, followAllRedirects: true, encoding: null}, {referer: game.ref}, {progress: progressEventName});
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
      then(function (response) {
        if (task.form) {
          var form = response.body.find(task.form);
          if (!form) {
            return Promise.reject('Form not found');
          }
          query.url = form.attr('action');
          query.method = (form.attr('method') || 'post').toUpperCase();
          query.form = {};
          form.find('input').forEach(function (input) {
            query.form[input.attr('name')] = input.val();
          });
        }
        return response;
      })
      .then(function (response) {
        if (task.link) {
          query = {
            method: 'GET',
            url: response.body.selectAttr(task.link, 'href')
          };
        }
        return response;
      })
      .then(function (response) {
        if (!query.method) {
          return Promise.reject('Unknown method');
        }
        if (tasks.length) {
          return handle(engine.send(query, {referer: game.ref}));

        } else {
          query.encoding = null;
          return engine.send(query, {referer: response.url}, {progress: progressEventName});
        }
      });
  }

  return handle(engine.get(game.url));
};

/**
 * Return a system dedicated config
 * @param {string} systemId
 * @return {object}
 * @private
 */
Source.prototype.systemConfig = function (systemId) {
  var config = Object.assign({}, this.config.generic, this.config.systems[systemId], {sourceId: this.id, systemId: systemId});
  ['pg_home', 'pg_games'].forEach(function (key) {
    config[key] = config[key] || {};
  });
  return config;
};

/**
 * Start deep crawling an URL and return all games
 * @param {object} systemConfig
 * @return {Promise.<Game[]>}
 * @private
 */
Source.prototype._loadGameList = function (systemConfig) {
  var self = this;
  var crawled = {}; // URL HashMap to avoid infinity loop
  var engine = this.engine;
  var url = engine.completeURL(systemConfig.url);

  if (!tools.object.isObject(systemConfig.pg_games)) {
    return Promise.reject('Manifest error: pages.games mismatch');
  }

  // Single page with all games
  if (!systemConfig.pg_home.pageLinks) {
    return self._loadGameListPage(systemConfig, url, crawled);
  }

  crawled[url] = true;

  self.emit('status', 'crawling ' + url);

  // Main page with pagination (ie: A-Z Roms)
  return engine
    .get(url)
    .then(function (response) {
      return response.body.find(systemConfig.pg_home.pageLinks).map(function (link) {
        return link.attr('href');
      });
    })
    .then(function (urls) {
      if (!urls || !urls.length) {
        return ;
      }
      return Promise
        .all(urls.map(function (url) {
          return self._loadGameListPage(systemConfig, url, crawled);
        }))
        .then(function (results) {
          return Array.prototype.concat.apply([], results);
        });
    });
};

/**
 * Deep crawl an URL and return all games
 * @param {object} systemConfig
 * @param {string} url
 * @param {object} crawled - URL HashMap
 * @return {Promise.<Game[]>}
 * @private
 */
Source.prototype._loadGameListPage = function (systemConfig, url, crawled) {
  var self = this;

  if (crawled[url]) {
    return Promise.resolve([]);
  }
  crawled[url] = true;

  self.emit('status', 'crawling ' + url);

  return self.engine
    .get(url)
    .then(function (response) {
      var games = response.body.find(systemConfig.pg_games.items).map(function (item) {
        return new classes.Game(systemConfig, item);
      });
      if (systemConfig.pg_home.next) {
        // Pagination base on "Previous - Next"
        var next = response.body.find(systemConfig.pg_home.next).attr('href');
        if (next) {
          return self._loadGameListPage(systemConfig, next, crawled)
            .then(function (moreGames) {
              return games.concat(moreGames);
            });
        }
      }
      return games;
    });
};

/**
 * Return the cache file path of a systemId
 * @param {string} systemId
 * @return {string}
 * @private
 */
Source.prototype._cacheFile = function (systemId) {
  return path.join(this.path, 'cache', systemId + '.json');
};

/**
 * Save the game list of a system in its cache
 * @param {string} systemId
 * @return {Promise}
 * @private
 */
Source.prototype._saveCache = function (systemId) {
  var games = this.games.get(systemId).map(function (game) {
    return game.toJSON(true);
  });
  return tools.fs.saveToFile(JSON.stringify(games, null, 4), this._cacheFile(systemId));
};

/**
 * Load a game list from its cache
 * @param {string} systemId
 * @return {boolean}
 * @private
 */
Source.prototype._loadCache = function (systemId) {
  try {
    var games = require(this._cacheFile(systemId));
    games = games.map(function (game) {
      return (new classes.Game()).fromJSON(game);
    });
    this.games.set(systemId, games);
    return true;
  } catch (err) {
    return false;
  }
};

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