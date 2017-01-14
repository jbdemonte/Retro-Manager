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
 * Return an hexa string of 4 digit
 * @return {string}
 */
function s4() {
  return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

/**
 * Return a guid
 * @return {string}
 */
function guid() {
  return  s4() + s4() + '-' +
          s4() + '-' +
          s4() + '-' +
          s4() + '-' +
          s4() + s4() + s4();
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