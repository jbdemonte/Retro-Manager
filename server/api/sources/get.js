var tools = require(__base + 'server/tools');

module.exports = function (req, res) {
  var result = {sources: []};
  tools.source.list()
    .then(function (sources) {
      result.sources = sources.map(function (source) {
        return source.toJSON();
      });
      res.json(result);
    })
    .catch(function (err) {
      result.error = err;
      res.json(result);
    });

};