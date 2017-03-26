var path = require('path');
var p7zip = require('p7zip');
var unecm = require('unecm');

var tools = {
  fs: require('./fs')
};

var re = {
  ecm: /\.ecm$/i
};

module.exports = {
  hasArchiveExtension: hasArchiveExtension,
  uncompressToTmp: uncompressToTmp,
  listFiles: listFiles
};

// list only extensions which are un-compressible and which may not be a system ROM extension (ie. ISO)
var CLASSIC_ARCHIVES_EXTENSIONS = 'rar zip 7z gz gzip tgz tar arj bz2 bzip2 tbz2 tbz xz txz lzma ecm'.split(' ');

/**
 * Return the File list of an archives
 * @param {string} source
 * @return {Promise.string[]}
 */
function listFiles(source) {
  if (source.match(re.ecm)) {
    return Promise.resolve([decodeECMFilename(source)]);
  }
  return p7zip.list(source).then(function (result) {
    return result.files.map(function (file) {
      return file.name;
    });
  });
}

/**
 * Return the filename of an ECM encoded file
 * @param {string} source
 * @return {string}
 */
function decodeECMFilename(source) {
  return path.basename(source).replace(re.ecm, '');
}

/**
 * Decode an ECM encoded file
 * @param {string} source
 * @param {string} destination
 * @return {Promise.string[]} Decoded file list (one element)
 */
function decodeECM(source, destination) {
  return new Promise(function (resolve, reject) {
    var handler = unecm(source, destination);

    handler.on('error', function (data) {
      reject(new Error(data.error));
    });

    handler.on('complete', function () {
      resolve([decodeECMFilename(source)]);
    });
  });
}

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
      if (files.length) {
        return p7zip
          .extract(source, destination, extensions ? files : null, false)
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
    if (source.match(re.ecm)) {
      return decodeECM(source, path.join(destination, decodeECMFilename(source)));
    }
    return un7zip(source, destination, extensions);
  }
  return Promise.reject({message: 'Unknown file type'});
}

/**
 * Uncompress an archive and return its tmpPath path and files
 * @param {string} source
 * @param {string[]} [extensions]
 * @return {Promise.<{tmpPath: string, files: string[]}>}
 */
function uncompressToTmp(source, extensions) {
  return tools.fs
    .mkTmpDir()
    .then(function (tmpPath) {
      return uncompress(source, tmpPath, extensions)
        .then(function (files) {
          return {
            tmpPath: tmpPath,
            files: files
          };
        });
    });
}

/**
 * Return TRUE if the file seems to be a known kind of archive
 * @param {string} source
 * @return {boolean}
 */
function hasArchiveExtension(source) {
  return !!~CLASSIC_ARCHIVES_EXTENSIONS.indexOf(tools.fs.extension(source));
}