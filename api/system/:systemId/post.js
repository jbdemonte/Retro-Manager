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
  var files = [];

  system.handleFile(file.path, file.name, files)
    .then(function (renamed) {
      if (!renamed) {
        return tools.fs.unlink(file.path);
      }
    })
    .then(function () {
      res.send({added: files});
    })
    .catch(function (err) {
      res.send({error: err ? err.message : 'Unknown error'});
    });
}];