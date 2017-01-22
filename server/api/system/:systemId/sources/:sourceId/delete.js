var tools = require(__base + 'server/tools');

module.exports = function (req, res) {
  var system = tools.system.get(req.params.systemId);
  if (!system) {
    return res.json({error: 'Unknown system'});
  }
  var source = tools.source.get(req.params.sourceId);
  if (!source) {
    return res.json({error: 'Unknown source'});
  }
  source
    .clearCache(system.id)
    .then(function () {
      res.send({});
    })
    .catch(function (err) {
      res.status(400).send({error: err ? err.message : 'Unknown error'});
    });
};