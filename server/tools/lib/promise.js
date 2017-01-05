module.exports = {
  promify: promify
};


/**
 * Convert a "callback mode" function onto a "Promise mode" one
 * @param {object} [self] - context
 * @param {function} fn - function to call
 * @return {function.Promise.<*>}
 */
function promify(self, fn) {
  if (typeof self === 'function') {
    fn = self;
    self = null;
  }
  return function () {
    var args = Array.prototype.slice.call(arguments);
    return new Promise(function (resolve, reject) {
      args.push(function (err, result) {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
      fn.apply(self, args);
    });
  };
}