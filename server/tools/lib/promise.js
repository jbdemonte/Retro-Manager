module.exports = {
  promify: promify
};


/**
 * Convert a "callback mode" function onto a "Promise mode" one
 * @param {object} [self] - context
 * @param {function} fn - function to call
 * @param {boolean} noError - Swallow error
 * @param {*} errorResult - Result sent in case of error swallowed
 * @return {function.Promise.<*>}
 */
function promify(self, fn, noError, errorResult) {
  if (typeof self === 'function') {
    fn = self;
    self = null;
  }
  return function () {
    var args = Array.prototype.slice.call(arguments);
    return new Promise(function (resolve, reject) {
      args.push(function (err, result) {
        if (err) {
          if (noError) {
            // "deep copy" errorResult the lazy way
            errorResult = errorResult ? JSON.parse(JSON.stringify(errorResult)) : errorResult;
            return resolve(errorResult);
          }
          return reject(err);
        }
        resolve(result);
      });
      fn.apply(self, args);
    });
  };
}