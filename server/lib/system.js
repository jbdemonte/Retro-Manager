var config = require('../../config.json');
var path = require('path');

module.exports = {
  get: function (systemId) {
    return systems[systemId];
  }
};

// build system hashmap
var systems = (function () {
  var result = {};
  (require('../../systems.json') || []).forEach(function (system) {
    if (!system.id) {
      throw new Error('System id is missing in ' + JSON.stringify(system));
    }
    if (!Array.isArray(system.extensions) || !system.extensions.length) {
      throw new Error('System extentions are missing in ' + JSON.stringify(system));
    }
    if (result[system.id]) {
      throw new Error('Duplicate system id: ' + system.id);
    }
    result[system.id] = system;
    system.path = path.resolve(config.path.roms + '/' + system.id);
  });
  return result;
})();