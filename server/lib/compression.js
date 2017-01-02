var AdmZip = require('adm-zip');
var p7zip = require('p7zip');
var getExtension = require('./file').extension;

module.exports = {
  unzip: unzip,
  un7zip: un7zip
};

function unzip(source, destination, extensions) {
  return new Promise(function (resolve, reject) {
    try {
      var zip = new AdmZip(source);

      var files = zip
        .getEntries()
        .filter(function (entry) {
          return ~extensions.indexOf(getExtension(entry.entryName));
        })
        .map(function (entry) {
          zip.extractEntryTo(entry.entryName, destination, false, true);
          return entry.entryName;
        });
      resolve(files);
    } catch (err) {
      reject(err);
    }
  });
}

function un7zip(source, destination, extensions) {
  return p7zip
    .list(source)
    .then(function (info) {
      var files = info.files
        .filter(function (entry) {
          return ~extensions.indexOf(getExtension(entry.name));
        })
        .map(function (entry) {
          return entry.name;
        });
      if (files) {
        return p7zip
          .extract(source, destination, files, false)
          .then(function () {
            return files;
          });
      }
      return files;
    });
}