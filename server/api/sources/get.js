var tools = require(__base + 'server/tools');

module.exports = function (req, res) {
  tools.source.list()
    .then(function (sources) {
      res.json(sources.map(function (source) {
          return source.toJSON();
        }));
    })
    .catch(function (err) {
      res.json([]);
    });

};