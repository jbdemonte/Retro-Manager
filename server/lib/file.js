var fs = require('fs');

module.exports = {
  extension: getExtension,
  rename: rename
};


function getExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

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