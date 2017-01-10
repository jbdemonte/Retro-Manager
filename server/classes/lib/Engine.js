var request = require('request');
var progress = require('request-progress');
var cheerio = require('cheerio');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var path = require('path');
var contentDisposition = require('content-disposition');

module.exports = Engine;

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

  mainHeaders.Origin = origin;

  // todo Engine#progress

  /**
   * Send a HTTP(S) request
   * @param {string|object} query
   * @param {object} headers
   * @param {object} options
   * @return {Promise}
   * @fires Engine#progress
   */
  function send(query, headers, options) {

    options = options || {};

    query.headers = Object.assign(query.headers || {}, mainHeaders, headers);

    query.url = self.makeUrl(query.url);

    if (query.method === 'POST' && typeof query.body === 'object') {
      query.headers['content-type'] = query.headers['content-type'] || 'application/x-www-form-urlencoded';
      query.body = querystring.stringify(query.body);
    }

    return new Promise(function (resolve, reject) {
      var rq = request(query, function (error, response) {
        if (error) {
          return reject(error);
        }
        var data = {
          url: query.url,
          query: query,
          response: response,
          body: response.body,
          filename: extractFilename(query, response)
        };
        if ((response.headers['content-type'] || '').match('text/html.*')) {
          handleBody(response.body, data);
        }
        process.nextTick(function () {
          resolve(data);
        });
      });

      if (options.progress) {
        progress(rq, {throttle: 250}).on('progress', function (state) {

          state.txt = {
            progress: padLeft((100 * state.percent).toFixed(1), 5) + '%',
            speed: padLeft(fileSizeSI(state.speed), 8) + '/s',
            size: padLeft(fileSizeSI(state.size.transferred), 8) + '/' + fileSizeSI(state.size.total),
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
   * @param {object} headers
   * @param {object} options
   * @return {Promise.<object>}
   */
  self.get = function (query, headers, options) {
    if (typeof query === 'string') {
      query = {
        url: query
      };
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

  self.makeUrl = function (url) {
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
  };

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

/**
 * Pad string on left up to the required length
 * @param {string} str
 * @param {number} required
 * @return {string}
 */
function padLeft(str, required) {
  str = str + '';
  var len = required - String(str).length;
  if (len > 0) {
    return (new Array(len)).join(' ') + str;
  }
  return str;
}

function extractFilename(query, response) {
  if (response.headers['content-disposition']) {
    var parsed = contentDisposition.parse(response.headers['content-disposition']);
    if (parsed && parsed.parameters && parsed.parameters.filename) {
      return parsed.parameters.filename;
    }
  }
  return decodeURI(path.basename(response.request.href));
}

/**
 * "jQuerify" the body + append some helper to the target object
 * @param {string} body
 * @param {object} target
 */
function handleBody(body, target) {
  var $ = cheerio.load(body);

  target.$body = $;

  target.forEach = function (items, fn) {
    target.map(items, fn);
  };

  target.map = function (items, fn) {
    var results = [];
    items = typeof items === 'string' ? $(items) : items;
    for (var i = 0; i < items.length; i++) {
      results.push(fn(items.eq(i), i));
    }
    return results;
  };

  // Append :eq() support to cheerio
  target.find = function (selectors) {
    selectors = selectors.split(',');
    var result = selectors.map(function (selector) {
      var cursor = $;
      selector.split(/:eq\((\d+)\)/).forEach(function (part) {
        if (part) {
          if (part.match(/^\d+$/)) {
            cursor = cursor.eq(parseInt(part, 10));
          } else {
            cursor = cursor(part);
          }
        }
      });
      return cursor;
    });
    var items = $();
    while (result.length) {
      items = items.add(result.shift());
    }
    return items;
  };
}