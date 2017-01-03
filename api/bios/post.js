var tools = require('../../server/tools');
var multipart = require('connect-multiparty');

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
 * @return {Promise.boolean} - Return True if source has been renamed (moved)
 */
function handleFile(source, filename, bios) {
  return tools.fs
    .md5(source)
    .then(function (md5) {
      var system = tools.system.getByBIOS(md5);
      // find a system which recognize this file as a BIOS
      if (system) {
        return tools.fs
          .rename(source, system.biosPath + '/' + system.bios[md5])
          .then(function () {
            bios.push({
              system: system.id,
              file: system.bios[md5],
              md5: md5
            });
            return true;
          });
      }
      // if file is an archive, uncompress it and then test all files contained
      if (tools.compression.hasArchiveExtension(filename || source)) {
        return uncompress(source)
          .then(function (result) {
            return Promise
              .all(result.files.map(function (file) {
                return handleFile(result.tmpPath + '/' + file, bios);
              }))
              .then(function () {
                return tools.fs.rmTmpDir(result.tmpPath);
              });
          });
      }
      // else ignore this file
    });
}

/**
 * Uncompress an archive and return its tmpPath path and files
 * @param {string} source
 * @return {Promise.<{tmpPath: string, files: string[]}>}
 */
function uncompress(source) {
  return tools.fs
    .mkTmpDir()
    .then(function (tmpPath) {
      return tools.compression
        .uncompress(source, tmpPath)
        .then(function (files) {
          return {
            tmpPath: tmpPath,
            files: files
          };
        });
    });
}