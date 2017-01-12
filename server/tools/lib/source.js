var path = require('path');
var classes = require('../../classes');
var WEB_PATH = path.resolve('web');

var sourceById;

var tools = {
  fs: require('./fs'),
  object: require('./object')
};

module.exports = {
  list: list,
  get: get
};

/**
 * LOAD ALL SOURCES IN GLOBAL SOURCES
 * @return {Promise}
 */
function loadSources() {
  return tools.fs
    .glob(WEB_PATH + '/*')
    .then(function (items) {
      return tools.fs.filterDirs(items);
    })
    .then(function (items) {
      sourceById = {};
      items.map(function (item) {
        var source = new classes.Source(item);
        if (source.valid) {
          sourceById[source.id] = source;
        }
      });
    });
}

/**
 * Lit all sources filtering or not on a system
 * @param {object} [system]
 * @return {Promise.<Source[]>}
 */
function list(system) {
  return Promise
    .resolve()
    .then(function () {
      if (!sourceById) {
        return loadSources();
      }
    })
    .then(function () {
      return tools.object.filter(sourceById, function (source) {
        return !system || source.config.systems[system.id];
      });
    });
}

/**
 * Return a Source by its Id
 * @param {string} sourceId
 * @return {object}
 */
function get(sourceId) {
  return sourceById[sourceId];
}