module.exports = {
  map: map,
  filter: filter,
  isObject: isObject
};

/**
 * Array.map for object
 * @param {object} obj
 * @param {function} fn
 * @param {object} self
 * @returns {array}
 */
function map(obj, fn, self) {
  return Object.keys(obj).map(function (key) {
    return fn.call(self, obj[key], key);
  });
}

/**
 * Array.filter for object
 * @param {object} obj
 * @param {function} fn
 * @param {object} self
 * @return {Array}
 */
function filter(obj, fn, self) {
  return Object.keys(obj)
    .filter(function (key, index, array) {
      return fn.call(self, obj[key], index, array);
    })
    .map(function (key) {
      return obj[key];
    });
}

/**
 * Return True if item is an object
 * @param item
 * @return {boolean}
 */
function isObject(item) {
  return !!item || typeof item !== 'object' || Array.isArray(item);
}