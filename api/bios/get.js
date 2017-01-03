var glob = require('glob');
var tools = require('../../server/tools');
var config = require('../../config.json');

module.exports = function (req, res) {

  glob(config.path.bios + '/**/*', {nodir: true}, function (err, files) {

    var promises = (files || []).map(function (file) {
      return tools.fs
        .md5(file)
        .then(function (md5) {
          var filepath = file.replace(config.path.bios + '/', '').split('/');
          return {
            system: filepath.length > 1 ? filepath.shift() : '',
            file: filepath.join('/'),
            md5: md5
          };
        });
    });

    Promise.all(promises)
      .then(function (listing) {
        res.json({listing: listing});
      })
      .catch(function (err) {
        res.json({error: err.toString() || 'Unknown error'});
      });
  });
};
