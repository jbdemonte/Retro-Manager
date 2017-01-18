var tools = require(__base + 'server/tools');
var constant = require(__base + 'constants');
var multipart = require('connect-multiparty');

module.exports = [multipart(), function (req, res) {

  if (!req.files ||!req.files.file || !req.files.file.name || !req.files.file.path) {
    return res.json({error: 'Upload error'});
  }

  var file = req.files.file;

  handleFile(file.path, file.name)
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
 * @return {Promise}
 */
function handleFile (source, filename) {

  filename = filename || path.basename(source);

  if (!tools.compression.hasArchiveExtension(filename)) {
    return Promise.resolve(false);
  }

  function cleanReject(tmpPath, err) {
    return tools.fs
      .rmTmpDir(tmpPath)
      .then(function () {
        return Promise.reject(err);
      });
  }

  return tools.compression.uncompressToTmp(source, ['js', 'json', 'jpg', 'png', 'gif'])
    .then(function (result) {
      try {
        var config = require(result.tmpPath);
        if (tools.string.guidValid(config.guid)) {
          return {config: config, tmpPath: result.tmpPath};
        }
      } catch (err) {
        return cleanReject(result.tmpPath, err);
      }
      return Promise.reject(new Error('Invalid package'));
    })
    .then(function (data) {
      var source = tools.source.get(data.config.guid);
      // A same source file already exist, check the version
      if (source && !source.isOlderThan(data.config)) {
        return cleanReject(data.tmpPath, new Error('Updating a package requires an increased version number'));
      }
      if (source) {
        return tools.fs
          .rmdir(constant.SOURCES_PATH + '/' + data.config.guid)
          .then(function () {
            return data;
          });
      }
      return data;
    })
    .then(function (data) {
      return tools.fs.rename(data.tmpPath, constant.SOURCES_PATH + '/' + data.config.guid);
    });
}