var request = require('request');
var progress = require('request-progress');
var cheerio = require('cheerio');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var path = require('path');

module.exports = Engine;

var classes = {
  Response: require('./Response')
};

var tools = {
  string: require(__base + 'server/tools/lib/string')
};

/**
 * HTTP Engine
 * @param {string} origin
 * @param {object} [mainHeaders]
 * @constructor
 * @augments EventEmitter
 */
function Engine(origin, mainHeaders) {
  var self = this;

  mainHeaders = mainHeaders || {};

  if (origin.substr(-1) === '/') {
    origin = origin.replace(/\/+$/, '');
  }

  self.origin = mainHeaders.Origin = origin;

  /**
   * Complete URL if needed (URL may be relative to the origin)
   * @param {string} url
   * @return {string}
   */
  function completeURL(url) {
    return tools.string.completeURL(origin, url);
  }

  // todo Engine#progress

  /**
   * Send a HTTP(S) request
   * @param {string|object} query
   * @param {object} [headers]
   * @param {object} [options]
   * @return {Promise}
   * @fires Engine#progress
   */
  function send(query, headers, options) {

    options = options || {};

    query.headers = Object.assign(query.headers || {}, mainHeaders, headers);

    query.url = completeURL(query.url);


    if (query.method === 'POST' && typeof query.body === 'object') {
      query.headers['content-type'] = query.headers['content-type'] || 'application/x-www-form-urlencoded';
      query.body = querystring.stringify(query.body);
    }

    return new Promise(function (resolve, reject) {
      var rq = request(query, function (error, response) {
        if (error) {
          return reject(error);
        }
        process.nextTick(function () {
          resolve(new classes.Response(self, query, response, completeURL));
        });
      });

      if (options.progress) {
        progress(rq, {throttle: 250}).on('progress', function (state) {

          state.txt = {
            progress: (100 * state.percent).toFixed(1) + '%',
            speed: fileSizeSI(state.speed) + '/s',
            size: fileSizeSI(state.size.transferred) + '/' + fileSizeSI(state.size.total),
            remaining:  (state.time.remaining || 0).toFixed(1) + 's'
          };

          self.emit(typeof options.progress === 'string' ? options.progress : 'progress', state);
        });
      }
    });
  }

  /**
   * Send a GET query
   * @param {string|object} query
   * @param {object} [headers]
   * @param {object} [options]
   * @return {Promise.<object>}
   */
  self.get = function (query, headers, options) {
    if (typeof query === 'string') {
      query = {url: query};
    }
    query.method = 'GET';
    return send(query, headers, options);
  };

  /**
   * Send a POST query
   * @param {string|object} query
   * @param {object} headers
   * @param {object} options
   * @return {Promise.<object>}
   */
  self.post = function (query, headers, options) {
    query.method = 'POST';
    return send(query, headers, options);
  };

  /**
   * Send a built query
   * @type {send}
   */
  self.send = send;

  self.completeURL = completeURL;

}

util.inherits(Engine, EventEmitter);

/**
 * Return a human readable size
 * @param {number} size
 * @return {string}
 */
function fileSizeSI(size) {
  var e = (Math.log(size) / Math.log(1e3)) | 0;
  return +(size / Math.pow(1e3, e)).toFixed(2) + ' ' + ('kMGTPEZY'[e - 1] || '') + 'B';
}

