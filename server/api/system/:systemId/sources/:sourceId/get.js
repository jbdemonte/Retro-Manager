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
  res.send(source.toJSON(system.id));
};