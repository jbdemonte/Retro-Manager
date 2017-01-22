var path = require('path');
var config = require(__base + 'config');

var tools = {
  compression: require(__base + 'server/tools/lib/compression'),
  fs: require(__base + 'server/tools/lib/fs')
};

module.exports = System;

/**
 * System handler
 * @param {object} data
 * @constructor
 */
function System(data) {
  Object.assign(this, data);

  if (!this.id) {
    throw new Error('System id is missing in ' + JSON.stringify(data));
  }
  if (!Array.isArray(this.extensions) || !this.extensions.length) {
    throw new Error('System extentions are missing in ' + JSON.stringify(data));
  }
  if (!this.picture) {
    throw new Error('System picture is missing in ' + JSON.stringify(data));
  }
  if (!this.section) {
    throw new Error('System section is missing in ' + JSON.stringify(data));
  }
  if (!~['arcades', 'consoles', 'computers', 'handhelds', 'others'].indexOf(this.section)) {
    throw new Error('Unknown system section in ' + JSON.stringify(data));
  }

  this.path = {
    roms: path.resolve(config.path.roms + '/' + this.id),
    bios: path.resolve(config.path.bios + '/' + this.id)
  };
}

/**
 * Try to identify a file or its content (if it is an archives) as ROM file(s)
 * @param {string} source
 * @param {string} filename - Original filename (if different from source)
 * @param {string[]} files output
 * @return {Promise.boolean} - Return True if source has been renamed (moved)
 */
System.prototype.handleFile = function (source, filename, files) {
  var self = this;

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
          return ~self.extensions.indexOf(tools.fs.extension(archivedFilename));
        }).length;
      });
  }

  return (promise || Promise.resolve(0))
    .then(function (romArchived) {

      // Extension is accepted by the emulator - a ROM or a compressed ROM (only one ROM in the archive)
      if (~self.extensions.indexOf(tools.fs.extension(filename)) && romArchived < 2) {
        return tools.fs
          .rename(source, self.path.roms + '/' + filename)
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
                return self.handleFile(result.tmpPath + '/' + file, '', files);
              }))
              .then(function () {
                return tools.fs.rmTmpDir(result.tmpPath);
              });
          });
      }
      // else ignore this file
    });
};