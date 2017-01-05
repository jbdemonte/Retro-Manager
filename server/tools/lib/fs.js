var path = require('path');
var fs = require('fs');
var md5File = require('md5-file/promise');
var glob = require('glob');

var tools = {
  promise: require('./promise'),
  string: require('./string')
};

var _mkdir = tools.promise.promify(require('mkdirp'));
var _rmdir = tools.promise.promify(fs, fs.rmdir);
var _rename = tools.promise.promify(fs, fs.rename);

var TMP_DIR = path.resolve(path.join(__dirname, '../../..')) + '/tmp';

var exports = module.exports = {
  extension: getExtension,

  /**
   * Return the md5 of a file
   * @param {string} source
   * @return {Promise.string}
   */
  md5: md5File,

  mkdir: mkdir,
  rename: rename,

  rmdir: rmdir,
  mkTmpDir: mkTmpDir,
  rmTmpDir: rmTmpDir,

  stat: tools.promise.promify(fs, fs.stat),
  unlink: tools.promise.promify(fs, fs.unlink),

  readdir: tools.promise.promify(fs, fs.readdir),
  glob: tools.promise.promify(glob)
};

/**
 * Recursively mkdir, like "mkdir -p"
 * @param {string} target
 * @return {Promise.string} target
 */
function mkdir(target) {
  return _mkdir(target).then(function () {
    return target;
  });
}

/**
 * Recursively remove a directory, like "rm -rf"
 * @param {string} target
 * @return {Promise}
 */
function rmdir(target) {
  return exports.readdir(target)
    .then(function (list) {
      return Promise.all(list.map(function (item) {
        if (~['.', '..'].indexOf(item)) {
          return;
        }
        var fullPath = path.join(target, item);
        return stat(fullPath)
          .then(function (stats) {
            if (stats.isDirectory()) {
              return rmdir(fullPath);
            }
            return unlink(fullPath);
          });

      }));
    })
    .then(function () {
      return _rmdir(target);
    });
}

/**
 * Make a temporary directory
 * @return {Promise.<string>}
 */
function mkTmpDir() {
  return new Promise(function (resolve) {
      var tmp = TMP_DIR + '/' + tools.string.rand();
      fs.access(tmp, function (err) {
        // if err => path does not exist => ok
        resolve(err ? tmp : false);
      });
    })
    .then(function (tmp) {
      // if path does not exists, create and return it, else re-call mkTmpDir
      if (!tmp) {
        return mkTmpDir();
      }
      return mkdir(tmp);
    });
}

/**
 * Delete a TMP directory
 * @param {string} tmpDir
 * @return {Promise}
 */
function rmTmpDir(tmpDir) {
  if (tmpDir.indexOf(TMP_DIR) !== 0) {
    return Promise.reject(new Error('tmp directory mismatch ' + tmpDir));
  }
  return rmdir(tmpDir);
}

/**
 * Return the extension of a file
 * @param {string} filename
 * @return {string}
 */
function getExtension(filename) {
  var parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * Rename a file
 * @param {string} source
 * @param {string} target
 * @return {Promise}
 */
function rename(source, target) {
  return mkdir(path.dirname(target))
    .then(function () {
      return _rename(source, target);
    });
}
