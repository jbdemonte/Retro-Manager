var tools = require(__base + 'server/tools');
var systems = require(__base + 'config/systems');

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
    var unknown, unhandled;
    var system = tools.system.get(systemId);
    var urls = tools.array(sourceSystem).map(function (item) {
      return tools.string.completeURL(source.config.origin, item.url);
    });
    if (!system) {
      system = systems
        .filter(function (system) {
          return system.id === systemId;
        })
        .shift();
      unknown = !system;
      unhandled = !unknown;
    }
    system = system || {};
    return {
      id: systemId,
      picture: system.picture,
      name: system.name,
      section: system.section,
      url: urls.length > 1 ? urls : urls.pop(),
      unhandled: unhandled,
      unknown: unknown
    };
  });

  res.json({source: data});
};