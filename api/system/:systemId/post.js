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
  var extension = tools.file.extension(file.name);
  var moved;

  Promise
    .resolve()
    .then(function () {
      return tools.dir.mk(system.path);
    })
    .then(function () {
      if (system.extensions.indexOf(extension) < 0) {
        if (extension === 'zip') {
          return tools.compression.unzip(file.path, system.path, system.extensions);
        }
        if (extension === '7z') {
          return tools.compression.un7zip(file.path, system.path, system.extensions);
        }
      } else {
        return tools.file.rename(file.path, system.path + '/' + file.name).then(function () {
          moved = true;
          return [file.name];
        });
      }
      return Promise.reject({message: 'Unknown file type'});
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