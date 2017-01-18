var path = require('path');
var fs = require('fs');
var constants = require(__base + 'constants');

var tools = {
  promise: require('./promise'),
  string: require('./string')
};

var _mkdir = tools.promise.promify(require('mkdirp'));
var _rmdir = tools.promise.promify(fs, fs.rmdir);
var _rename = tools.promise.promify(fs, fs.rename);

var exports = module.exports = {
  extension: getExtension,

  /**
   * Return the md5 of a file
   * @param {string} source
   * @return {Promise.string}
   */
  md5: require('md5-file/promise'),

  mkdir: mkdir,
  rename: rename,

  rmdir: rmdir,
  mkTmpDir: mkTmpDir,
  rmTmpDir: rmTmpDir,
  saveToTmpFile: saveToTmpFile,
  saveToFile: saveToFile,

  filterDirs: filterDirs,

  stat: tools.promise.promify(fs, fs.stat),
  unlink: tools.promise.promify(fs, fs.unlink),

  readdir: tools.promise.promify(fs, fs.readdir, true, []),
  glob: tools.promise.promify(require('glob'))
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
        return exports.stat(fullPath)
          .then(function (stats) {
            if (stats.isDirectory()) {
              return rmdir(fullPath);
            }
            return exports.unlink(fullPath);
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
  return tmpPath()
    .then(function (tmp) {
      return mkdir(tmp);
    });
}

/**
 * Delete a TMP directory
 * @param {string} tmpDir
 * @return {Promise}
 */
function rmTmpDir(tmpDir) {
  if (tmpDir.indexOf(constants.TMP_PATH) !== 0) {
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

/**
 * Save data into a temporary file
 * @param {string} raw
 * @param {string} filename
 * @return {Promise.<string>} Return the filepath
 */
function saveToTmpFile(raw, filename) {
  return mkdir(constants.TMP_PATH)
    .then(function () {
      return tmpPath(filename);
    })
    .then(function (tmp) {
      return new Promise(function (resolve, reject) {
        fs.writeFile(tmp, raw, function (err) {
          if (err) {
            return reject();
          }
          resolve(tmp);
        });
      });
    });
}

/**
 * Save data into a file
 * @param {string} raw
 * @param {string} filepath
 * @return {Promise}
 */
function saveToFile(raw, filepath) {
  return mkdir(path.dirname(filepath))
    .then(function () {
      return new Promise(function (resolve, reject) {
        fs.writeFile(filepath, raw, function (err) {
          if (err) {
            return reject();
          }
          resolve();
        });
      });
    });
}

/**
 * Return an available filepath (a non existing random filepath)
 * @param {string} [filename]
 * @return {Promise.<string>}
 */
function tmpPath(filename) {
  var extension = filename ? getExtension(filename) : '';

  return new Promise(function (resolve) {
    var tmp = constants.TMP_PATH + '/' + tools.string.rand() + (extension ? '.' + extension : '');
    fs.access(tmp, function (err) {
      // if err => path does not exist => ok
      resolve(err ? tmp : false);
    });
  })
  .then(function (tmp) {
    if (!tmpPath) {
      return tmpPath(filename);
    }
    return tmp;
  });
}

/**
 * Filter a list of path to get only folders
 * @param {string[]} items
 * @return {Promise.<string[]>}
 */
function filterDirs(items) {
  return Promise.all(
    (items || []).map(function (item) {
      return exports.stat(item);
    }))
    .then(function (results) {
      return results
        .map(function (stats, index) {
          if (stats.isDirectory()) {
            return items[index];
          }
        })
        .filter(function (item) {
          return item;
        });
    });
}