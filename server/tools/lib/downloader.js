var path = require('path');
var WEB_PATH = path.resolve('web');

var tools = {
  fs: require('./fs')
};

module.exports = {
  list: list
};

function list(system) {
  return tools.fs
    .glob(WEB_PATH + '/*')
    .then(function (items) {
      return tools.fs.filterDirs(items);
    })
    .then(function (items) {
      var downloaders =  items.map(function (item) {
        return new Downloader(item);
      });
      return Promise
        .all(downloaders.map(function (downloader) {
          return downloader.load();
        }))
        .then(function () {
          return downloaders.filter(function (downloader) {
            return downloader.valid && (!system || downloader.manifest.systems[system.id]);
          });
        });
    })
    .catch(function (err) {
      console.log(err);
    });
}


function Downloader(path) {
  this.path = path;
}

Downloader.prototype.load = function () {
  try {
    this.manifest = require(this.path + '/manifest.json');
    this.manifest.systems = this.manifest.systems || {};
    this.valid = true;
  } catch (err) {
    // swallow
  }
};

/**
 * Return true if the downloader handle this system
 * @param {object} system
 * @return {boolean}
 */
Downloader.prototype.hasSystem = function (system) {
  return !!this.manifest.systems[system.id];
};

/**
 * Downloader public interface
 * @typedef {Object} DownloaderJSON
 * @property {string} id
 * @property {string} [name]
 * @property {string} [picture] - filename (without the path)
 */

/**
 * Return the public data of a downloader
 * @return {DownloaderJSON}
 */
Downloader.prototype.toJSON = function () {
  return {
    id: this.path.split('/').pop(),
    name: this.manifest.name,
    picture: this.manifest.picture
  };
};