var fs = require('fs');
var mkdirp = require('mkdirp');
var AdmZip = require('adm-zip');
var p7zip = require('p7zip');
var tools = require('../../server/tools');
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
  var extension = tools.file.extension(file.name);
  var moved;

  Promise
    .resolve()
    .then(function () {
      return mkdir(system.path);
    })
    .then(function () {
      if (system.extensions.indexOf(extension) < 0) {
        if (extension === 'zip') {
          return unzip(file.path, system.path, system.extensions);
        }
        if (extension === '7z') {
          return un7zip(file.path, system.path, system.extensions);
        }
      } else {
        return rename(file.path, system.path + '/' + file.name).then(function () {
          moved = true;
          return [file.name];
        });
      }
      return Promise.reject({message: 'Unknown file type'});
    })
    .then(function (files) {
      res.send({files: files});
    })
    .catch(function (err) {
      res.send({error: err ? err.message : 'Unknown error'});
    })
    .then(function () { // finally
      if (!moved) {
        fs.unlink(file.path);
      }
    });

}];

function rename(source, target) {
  return new Promise(function (resolve, reject) {
    fs.rename(source, target, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function unzip(source, destination, extensions) {
  return new Promise(function (resolve, reject) {
    try {
      var zip = new AdmZip(source);

      var files = zip
        .getEntries()
        .filter(function (entry) {
          return ~extensions.indexOf(tools.file.extension(entry.entryName));
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
          return ~extensions.indexOf(tools.file.extension(entry.name));
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

function mkdir(target) {
  return new Promise(function (resolve, reject) {
    mkdirp(target, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}