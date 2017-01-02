var fs = require('fs');
var mkdirp = require('mkdirp');

module.exports = {
  mk: mk
};

function mk(target) {
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