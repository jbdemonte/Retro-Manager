var uuid = require('node-uuid');

var guidRE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

module.exports = {
  rand: rand,
  guid: guid,
  completeURL: completeURL
};

/**
 *
 * Generate a random string
 * @param {number} [length]
 * @return {string}
 */
function rand(length) {
  length = length || 10;
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for(var i=0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Return a guid
 * @return {string}
 */
function guid() {
  return uuid.v1();
}

function guidValid(str) {
  return str && typeof str === 'string' && str.match(guidRE);
}

/**
 * Complete URL if needed (URL may be relative to the origin)
 * @param {string} origin
 * @param {string} url
 * @return {string}
 */
function completeURL(origin, url) {
  var scheme = /^(https?:)?\/\//;
  if (url) {
    if (url.match(scheme)) {
      if (url[0] === '/') {
        // url starts with // => extract origin scheme
        return (origin.match(scheme)[1] || 'http:') + url;
      }
      // url starts with http: or https:
      return url;
    }
    return origin + (url[0] === '/' ? '' : '/') + url;
  }
}