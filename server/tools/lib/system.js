var classes = {
  System: require(__base + 'server/classes/lib/System')
};

var systemById = {};

// LOAD SYSTEMS FROM JSON
require(__base + 'config').systems.forEach(function (data) {
  var system = new classes.System(data);
  if (systemById[system.id]) {
    throw new Error('Duplicate system id: ' + system.id);
  }
  systemById[system.id] = system;
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
  return systemById[id];
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