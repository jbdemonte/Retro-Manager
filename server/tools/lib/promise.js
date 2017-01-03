module.exports = {
  promify: promify
};


/**
 * Call a classic node function (using callback) and return a Promise
 * @param {object} [self] - context
 * @param {function} fn - function to call
 * @return {Promise.<*>}
 */
function promify(self, fn) {
  var args;
  if (typeof self === 'function') {
    args = Array.prototype.slice.call(arguments, 1);
    fn = self;
    self = this;
  } else {
    args = Array.prototype.slice.call(arguments, 2);
  }
  return new Promise(function (resolve, reject) {
    args.push(function (err, result) {
      if (err) {
        return reject(err);
      }
      resolve(result);
    });
    fn.apply(self, args);
  });
}

/**
 * Return a function which will call promify using arguments
 * @param {object} [self] - context
 * @param {function} fn - function to call
 * @return {function}
 */
promify.prepare = function (self, fn) {
  var args = Array.prototype.slice.call(arguments);
  /**
   * @return {Promise.<*>}
   */
  return function () {
    return promify.apply(this, args);
  };
};