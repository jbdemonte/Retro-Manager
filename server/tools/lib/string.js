var uuid = require('node-uuid');
var parseURL = require('url').parse;
var path = require('path');
var crypto = require('crypto');

var guidRE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

module.exports = {
  completeURL: completeURL,
  getFilenameFromURL: getFilenameFromURL,
  getSemVer: getSemVer,
  guid: guid,
  guidValid: guidValid,
  md5: md5,
  rand: rand
};

/**
 * Return a md5 hash
 * @param {string} input
 * @return {string}
 */
function md5(input) {
  var md5sum = crypto.createHash('md5');
  md5sum.update(input);
  return md5sum.digest('hex');
}

/**
 * Return the filename of a URL
 * @param {string} url
 * @return {string}
 */
function getFilenameFromURL(url) {
  return path.basename(parseURL(url).pathname);
}

/**
 * Complete URL if needed (URL may be relative to the origin)
 * @param {string} origin
 * @param {string} url
 * @return {string}
 */
function completeURL(origin, url) {
  var scheme = /^(data:image)|((https?:)?\/\/)/;
  if (url) {
    if (url.match(scheme)) {
      if (url[0] === '/') {
        // url starts with // => extract origin scheme
        return (origin.match(scheme)[1] || 'http:') + url;
      }
      // url starts with http: or https:
      return url;
    }
    return origin.replace(/\/+$/, '') + (url[0] === '/' ? '' : '/') + url;
  }
}

/**
 * Return version as an array of integer
 * @param {string} entry
 * @return {[number,number,number]}
 */
function getSemVer(entry) {
  var version = [0, 0, 0];
  (entry || '')
    .split('.')
    .slice(0, 3)
    .forEach(function (value, index) {
      version[index] = parseInt(value, 10) || 0;
    });
  return version;
}

/**
 * Return a guid
 * @return {string}
 */
function guid() {
  return uuid.v1();
}

/**
 * Return True if the entry is a well formed guid
 * @param {string} entry
 * @return {boolean}
 */
function guidValid(entry) {
  return Boolean(entry && typeof entry === 'string' && entry.match(guidRE));
}

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