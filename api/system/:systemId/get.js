var tools = require('../../../server/tools');

module.exports = function (req, res) {
  var system = tools.system.get(req.params.systemId);
  if (!system) {
    return res.json({error: 'Unknown system'});
  }
  var result = {games: []};
  tools.fs
    .readdir(system.path.roms)
    .then(function (files) {
      result.games = files;
    })
    .then(function () {
      return tools.downloader.list();
    })
    .then(function (downloaders) {
      result.downloadable = downloaders.some(function (downloader) {
        return downloader.hasSystem(system);
      });
    })
    .then(function () {
      res.json(result);
    })
    .catch(function (err) {
      res.json(result);
    });

};