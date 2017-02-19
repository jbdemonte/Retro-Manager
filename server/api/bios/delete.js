var path = require('path');
var tools = require(__base + 'server/tools');
var config = require(__base + 'config');

module.exports = function (req, res) {
  Promise
    .all(tools.array(req.body.files).map(function (filepath) {
      // check requested file is in the bios path
      var filePath = path.resolve(filepath);
      if (filePath.indexOf(config.path.bios) === 0 || filePath.indexOf(config.path.roms) === 0) {
        return tools.fs.rm(filePath);
      }
      return Promise.reject(new Error('Unknown file ' + filepath));
    }))
    .then(function () {
      res.send({});
    })
    .catch(function (err) {
      res.status(400).send({error: err ? err.toString() : 'Unknown error'});
    });
};