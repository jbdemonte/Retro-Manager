var si = require('systeminformation');

function populate(data, handler) {
  return function () {
    return si[handler]()
      .then(function (value) {
        data[handler] = value;
      });
  };
}

module.exports = function (req, res) {
  var data = {};
  Promise
    .resolve()
    .then(populate(data, 'mem'))
    .then(populate(data, 'cpuTemperature'))
    .then(populate(data, 'fsSize'))
    .then(populate(data, 'currentLoad'))
    .then(function () {
      res.json(data);
    })
    .catch(function (err) {
      res.status(400).send({error: err ? err.message : 'Unknown error'});
    });
};