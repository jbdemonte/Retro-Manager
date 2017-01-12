module.exports = Game;

var tools = {
  string: require('../../tools/lib/string')
};

/**
 * Game instance
 * @param {object} config
 * @param {HTMLHandler} item
 * @constructor
 */
function Game(config, item) {
  var self = this;

  self.id = tools.string.guid();

  self.sc = config.sourceId;
  self.sid = config.systemId;
  self.ref = item.origin;
  self.downloaded = false;
  self.downloading = false;

  self.img = '';
  self.url = '';
  self.name = '';
  self.size = '';

  extractData.apply(this, arguments);

  /**
   * Notice download as started
   * Return True if game downloaded has not been tried yet
   * @return {boolean}
   */
  this.download = {
    start: function () {
      if (self.downloaded || self.downloading) {
        return false;
      }
      self.downloading = true;
      return true;
    },
    end: function (complete) {
      self.downloaded = complete;
      self.downloading = false;
    }
  };

  this.toJSON = function () {
    var data = {};
    'id sc sid ref downloaded downloading img url name size'.split(' ').forEach(function (key) {
      data[key] = self[key];
    });
    return data;
  };

}

function extractData(config, item) {
  var self = this;

  // classic image tag
  if (config.pg_games.img) {
    self.img = item.find(config.pg_games.img).attr('src');
  }
  // there is a link to an image
  if (!self.img && config.pg_games.imgLink) {
    self.img = item.find(config.pg_games.imgLink).attr('href');
  }

  // check if image is not a default one
  if (config.missingImg && self.img && ~self.img.indexOf(config.missingImg)) {
    delete self.img;
  }

  if (config.pg_games.romLink) {
    // Direct link to the rom
    if (typeof config.pg_games.romLink === 'function') {
      self.url = config.pg_games.romLink(item);
    }
  } else if (config.pg_games.link) {
    // get game page link
    self.url = item.find(config.pg_games.link).attr('href');
  } else {
    // the item itself is the link to the page
    self.url = item.attr('href');
  }

  if (self.url) {
    self.url = item.completeURL(self.url);
  }

  // get game name
  if (config.pg_games.name) {
    self.name = item.find(config.pg_games.name).text();
  } else {
    // the item itself show the game name
    self.name = item.text();
  }
  self.name = (self.name || '').trim();

  // get game size
  if (config.pg_games.size) {
    self.size = (item.find(config.pg_games.size).text() || '').trim();
  }

}