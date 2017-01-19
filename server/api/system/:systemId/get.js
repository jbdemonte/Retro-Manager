var tools = require(__base + 'server/tools');

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
      return tools.source.list();
    })
    .then(function (sources) {
      result.downloadable = sources.some(function (source) {
        return source.hasSystem(system);
      });
    })
    .then(function () {
      res.json(result);
    })
    .catch(function (err) {
      result.error = err;
      res.json(result);
    });

};