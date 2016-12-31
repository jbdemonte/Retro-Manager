var config = require('../config.json');
var path = require('path');

// build system hashmap
var systems = (function () {
  var result = {};
  (require('../systems.json') || []).forEach(function (system) {
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
    system.path = path.resolve(config.ROMS_PATH + '/' + system.id);
  });
  return result;
})();


function getExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}


module.exports = {
  file: {
    extension: getExtension
  },
  system: {
    get: function (systemId) {
      return systems[systemId];
    }
  }
};
