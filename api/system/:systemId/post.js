var fs = require('fs');
var tools = require('../../../server/tools');
var multipart = require('connect-multiparty');

module.exports = [multipart(), function (req, res) {

  var system = tools.system.get(req.params.systemId);
  if (!system) {
    return res.json({error: 'Unknown system'});
  }

  if (!req.files ||!req.files.file || !req.files.file.name || !req.files.file.path) {
    return res.json({error: 'Upload error'});
  }

  var file = req.files.file;
  var extension = tools.fs.extension(file.name);
  var moved;

  Promise
    .resolve()
    .then(function () {
      return tools.fs.mkdir(system.path);
    })
    .then(function () {
      if (system.extensions.indexOf(extension) < 0) {
        return tools.compression.uncompress(file.path, system.path, system.extensions);
      }
      return tools.fs.rename(file.path, system.path + '/' + file.name).then(function () {
        moved = true;
        return [file.name];
      });
    })
    .then(function (files) {
      res.send({files: files});
    })
    .catch(function (err) {
      res.send({error: err ? err.message : 'Unknown error'});
    })
    .then(function () { // finally
      if (!moved) {
        fs.unlink(file.path, function () {});
      }
    });

}];