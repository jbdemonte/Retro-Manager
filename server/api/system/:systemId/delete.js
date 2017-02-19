var path = require('path');
var tools = require(__base + 'server/tools');

module.exports = function (req, res) {
  var system = tools.system.get(req.params.systemId);
  if (!system) {
    return res.json({error: 'Unknown system'});
  }

  Promise
    .all(tools.array(req.body.games).map(function (file) {
      // check requested file is in the target system path
      var filePath = path.resolve(system.path.roms + '/' + file);
      if (filePath.indexOf(system.path.roms) === 0) {
        return tools.fs.rm(filePath);
      }
      return Promise.reject(new Error('Unknown file ' + file));
    }))
    .then(function () {
      res.send({});
    })
    .catch(function (err) {
      res.status(400).send({error: err ? err.toString() : 'Unknown error'});
    });
};