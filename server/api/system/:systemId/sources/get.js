var tools = require(__base + 'server/tools');

module.exports = function (req, res) {
  var system = tools.system.get(req.params.systemId);
  if (!system) {
    return res.json({error: 'Unknown system'});
  }
  tools.source.list(system)
    .then(function (sources) {
      res.json({
        sources: sources.map(function (source) {
          return source.toJSON();
        })
      });
    })
    .catch(function (err) {
      res.json({sources: []});
    });

};