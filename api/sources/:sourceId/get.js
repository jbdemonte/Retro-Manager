var tools = require('../../../server/tools');

module.exports = function (req, res) {
  var source = tools.source.get(req.params.sourceId);
  if (!source) {
    return res.json({error: 'Unknown source'});
  }
  var data = {
    id: source.id,
    url: source.config.origin
  };

  'guid name picture version'.split(' ').forEach(function (key) {
    data[key] = source.config[key];
  });

  data.systems =  tools.object.map(source.config.systems, function (sourceSystem, systemId) {
    var system = tools.system.get(systemId) || {};
    return {
      id: systemId,
      picture: system.picture,
      name: system.name,
      section: system.section,
      url: tools.string.completeURL(source.config.origin, sourceSystem.path)
    };
  });

  res.json(data);
};