var fs = require('fs');
var path = require('path');
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

  handleFile(file.path, file.name, system, files)
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

/**
 * Try to identify a file or its content (if it is an archives) as ROM file(s)
 * @param {string} source
 * @param {string} filename - Original filename (if different from source)
 * @param {object} system
 * @param {string[]} files output
 * @return {Promise.boolean} - Return True if source has been renamed (moved)
 */
function handleFile(source, filename, system, files) {
  filename = filename || path.basename(source);
  var isArchive = tools.compression.hasArchiveExtension(filename);
  var promise;

  if (isArchive) {
    // file may be an archive accepted by the emulator, but which is a pack of ROMs
    // so, we need to check it first, and unpack multiple roms if required
    promise = tools.compression
      .listFiles(source)
      .then(function (listing) {
        return listing.filter(function (archivedFilename) {
          return ~system.extensions.indexOf(tools.fs.extension(archivedFilename));
        }).length;
      });
  }

  return (promise || Promise.resolve(0))
    .then(function (romArchived) {

      // Extension is accepted by the emulator - a ROM or a compressed ROM (only one ROM in the archive)
      if (~system.extensions.indexOf(tools.fs.extension(filename)) && romArchived < 2) {
        return tools.fs
          .rename(source, system.path.roms + '/' + filename)
          .then(function () {
            files.push(filename);
            return true;
          });
      }

      // if file is an archive, uncompress it and then test all files contained
      if (isArchive) {
        return tools.compression.uncompressToTmp(source)
          .then(function (result) {
            return Promise
              .all(result.files.map(function (file) {
                return handleFile(result.tmpPath + '/' + file, '', system, files);
              }))
              .then(function () {
                return tools.fs.rmTmpDir(result.tmpPath);
              });
          });
      }
      // else ignore this file
    });
}