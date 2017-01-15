var tools = require('../../server/tools');
var constant = require('../../constants');
var multipart = require('connect-multiparty');

module.exports = [multipart(), function (req, res) {

  if (!req.files ||!req.files.file || !req.files.file.name || !req.files.file.path) {
    return res.json({error: 'Upload error'});
  }

  var file = req.files.file;
  var sources = [];

  handleFile(file.path, file.name, sources)
    .then(function () {
      return tools.fs.unlink(file.path);
    })
    .then(function () {
      return tools.source.reload();
    })
    .then(function () {
      return tools.source.list();
    })
    .then(function (sources) {
      res.json({
        sources: sources.map(function (source) {
          return source.toJSON();
        })
      });
    })
    .catch(function (err) {
      res.send({error: err ? err.message : 'Unknown error'});
    });
}];

/**
 * Try to identify an archive as a source package
 * @param {string} source
 * @param {string} filename - Original filename (if different from source)
 * @param {array} sources output
 * @return {Promise}
 */
function handleFile (source, filename, sources) {

  filename = filename || path.basename(source);

  if (!tools.compression.hasArchiveExtension(filename)) {
    return Promise.resolve(false);
  }

  return tools.compression.uncompressToTmp(source, ['js', 'json', 'jpg', 'png', 'gif'])
    .then(function (result) {
      try {
        var source = require(result.tmpPath);
        if (source.guid) {
          return tools.fs.rename(result.tmpPath, constant.SOURCES_PATH + '/' + source.guid);
        }
      } catch (err) {
        return tools.fs.rmTmpDir(result.tmpPath);
      }
    });
}