var glob = require('glob');
var fs = require('fs');
var md5 = require('md5');
var tools = require('../../server/tools');
var config = require('../../config.json');

module.exports = function (req, res) {

  glob(config.path.bios + '/**/*', {nodir: true}, function (err, files) {

    var listing = [];

    var promises = (files || []).map(function (file) {
      return new Promise(function (resolve, reject) {
        fs.readFile(file, function (err, buf) {
          if (err) {
            return reject(err);
          }
          var filepath = file.replace(config.path.bios + '/', '').split('/');
          listing.push({
            system: filepath.length > 1 ? filepath.shift() : '',
            file: filepath.join('/'),
            md5: md5(buf)
          });
          resolve();
        });
      });
    });

    Promise.all(promises)
      .then(function () {
        res.json({listing: listing});
      })
      .catch(function (err) {
        res.json({error: err.toString() || 'Unknown error'});
      });
  });
};
