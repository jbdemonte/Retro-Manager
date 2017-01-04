var path = require('path');
var config = require('../../../config.json');
var systems = require('../../../systems.json');

var systemsById = {};

// build system hashmap
systems.forEach(function (system) {
  if (!system.id) {
    throw new Error('System id is missing in ' + JSON.stringify(system));
  }
  if (!Array.isArray(system.extensions) || !system.extensions.length) {
    throw new Error('System extentions are missing in ' + JSON.stringify(system));
  }
  if (systemsById[system.id]) {
    throw new Error('Duplicate system id: ' + system.id);
  }
  systemsById[system.id] = system;
  system.path = {
    roms: path.resolve(config.path.roms + '/' + system.id),
    bios: path.resolve(config.path.bios + '/' + system.id)
  };
});

module.exports = {
  get: get,
  getByBIOS: getByBIOS
};

/**
 * Retrieve a system by its id
 * @param {string} id
 * @return {object|undefined}
 */
function get(id) {
  return systemsById[id];
}

/**
 * Retrieve a system by the md5 of a BIOS
 * @param {string} md5
 * @return {object|undefined}
 */
function getByBIOS(md5) {
  return systems
    .filter(function (system) {
      return system.bios && system.bios[md5];
    })
    .shift();
}