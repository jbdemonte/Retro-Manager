var fs = require('fs');
var tools = require('../../server/tools');

module.exports = function (req, res) {
  var system = tools.system.get(req.params.systemId);
  if (!system) {
    return res.json({error: 'Unknown system'});
  }
  fs.readdir(system.path, function (err, files) {
    res.json({games: files || []});
  });

};