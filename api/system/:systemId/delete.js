var fs = require('fs');
var path = require('path');
var tools = require('../../../server/tools');

module.exports = function (req, res) {
  var system = tools.system.get(req.params.systemId);
  if (!system) {
    return res.json({error: 'Unknown system'});
  }

  var promises = (Array.isArray(req.body.games) ? req.body.games : []).map(function (file) {
    // check requested file is in the target system path
    var filePath = path.resolve(system.path.roms + '/' + file);
    if (filePath.indexOf(system.path.rom) === 0) {
      return new Promise(function (resolve, reject) {
        fs.unlink(filePath, function (err) {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    } else {
      return Promise.reject(new Error('Unknown file ' + file));
    }
  });

  Promise
    .all(promises)
    .then(function () {
      res.send({});
    })
    .catch(function (err) {
      res.status(400).send({error: err ? err.message : 'Unknown error'});
    });
};