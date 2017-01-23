var tools = require(__base + 'server/tools');
var multipart = require('connect-multiparty');
var config = require(__base + 'config');

module.exports = [multipart(), function (req, res) {

  if (!req.files ||!req.files.file || !req.files.file.name || !req.files.file.path) {
    return res.json({error: 'Upload error'});
  }

  var file = req.files.file;
  var bios = [];

  handleFile(file.path, file.name, bios)
    .then(function (renamed) {
      if (!renamed) {
        return tools.fs.unlink(file.path);
      }
    })
    .then(function () {
      res.send({added: bios});
    })
    .catch(function (err) {
      res.send({error: err ? err.message : 'Unknown error'});
    });
}];

/**
 * Try to identify a file or its content (if it is an archives) as BIOS file(s)
 * @param {string} source
 * @param {string} filename - Original filename (if different from source)
 * @param {array} bios output
 * @return {Promise.<boolean>} - Return True if source has been renamed (moved)
 */
function handleFile(source, filename, bios) {
  return tools.fs
    .md5(source)
    .then(function (md5) {
      var match;

      config.systems.some(function (system) {
        return (system.bios || []).some(function (item) {
          if (item.md5 === md5) {
            match = Object.assign({system: system.id}, item);
            return true;
          }
        });
      });

      // find a matching bios
      if (match) {
        return tools.fs
          .rename(source, match.path + '/' + match.file)
          .then(function () {
            bios.push(match);
            return true;
          });
      }
      // if file is an archive, uncompress it and then test all files contained
      if (tools.compression.hasArchiveExtension(filename || source)) {
        return tools.compression.uncompressToTmp(source)
          .then(function (result) {
            return Promise
              .all(result.files.map(function (file) {
                return handleFile(result.tmpPath + '/' + file, '', bios);
              }))
              .then(function () {
                return tools.fs.rmTmpDir(result.tmpPath);
              });
          });
      }
      // else ignore this file
    });
}