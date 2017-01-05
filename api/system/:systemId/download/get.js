var tools = require('../../../../server/tools');

module.exports = function (req, res) {
  var system = tools.system.get(req.params.systemId);
  if (!system) {
    return res.json({error: 'Unknown system'});
  }
  tools.downloader.list(system)
    .then(function (downloaders) {
      res.json({
        downloaders: downloaders.map(function (downloader) {
          return downloader.toJSON();
        })
      });
    })
    .catch(function (err) {
      res.json({downloaders: []});
    });

};