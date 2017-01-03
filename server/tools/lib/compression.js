var p7zip = require('p7zip');

var tools = {
  fs: require('./fs')
};

module.exports = {
  hasArchiveExtension: hasArchiveExtension,
  uncompress: uncompress
};


/**
 * Uncompress a 7z archive
 * @param {string} source
 * @param {string} destination
 * @param {string[]} [extensions]
 * @return {Promise.string[]} Extracted file list
 */
function un7zip(source, destination, extensions) {
  return p7zip
    .list(source)
    .then(function (info) {
      var files = info.files
        .filter(function (entry) {
          return extensions ? ~extensions.indexOf(tools.fs.extension(entry.name)) : true;
        })
        .map(function (entry) {
          return entry.name;
        });
      if (files) {
        return p7zip
          .extract(source, destination, files, false)
          .then(function () {
            return files.map(function (file) {
              return file.split('/').pop(); // remove relative path
            });
          });
      }
      return files;
    });
}

 /**
 * Uncompress an archive
 * @param {string} source
 * @param {string} destination
 * @param {string[]} [extensions]
 * @return {Promise.string[]} Extracted file list
 */
function uncompress(source, destination, extensions) {
  if (hasArchiveExtension(source)) {
    return un7zip(source, destination, extensions);
  }
  return Promise.reject({message: 'Unknown file type'});
}

/**
 * Return TRUE if the file seems to be a known kind of archive
 * @param {string} source
 * @return {boolean}
 */
function hasArchiveExtension(source) {
  return !!~[
    'zip', '7z', 'gz', 'gzip', 'tgz', 'tar', 'arj', 'bz2', 'bzip2',
    'tbz2', 'tbz', 'xz', 'txz', 'dmg', 'lzma', 'udf', 'iso', 'img'
  ].indexOf(tools.fs.extension(source));
}