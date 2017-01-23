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
  get: get
};

/**
 * Retrieve a system by its id
 * @param {string} id
 * @return {object|undefined}
 */
function get(id) {
  return systemById[id];
}