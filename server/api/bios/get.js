var glob = require('glob');
var tools = require(__base + 'server/tools');
var config = require(__base + 'config');

module.exports = function (req, res) {
  var bios = [];

  config.systems.forEach(function (system) {
    (system.bios || []).forEach(function (item) {
      bios.push(Object.assign({system: system.id}, item));
    });
  });

  explore(bios)
    .then(function (listing) {
      res.json({listing: listing});
    })
    .catch(function (err) {
      res.json({error: err.toString() || 'Unknown error'});
    });
};

function explore(bios, existing) {
  existing = existing || [];
  if (bios.length) {
    var item = bios.shift();
    return tools.fs
      .md5(item.path + '/' + item.file)
      .then(function (md5) {
        if (item.md5 === md5) {
          existing.push(item);
        }
      })
      .catch(function (err) {
        // swallow error
      })
      .then(function () {
        return explore(bios, existing);
      });
  }
  return Promise.resolve(existing);
}