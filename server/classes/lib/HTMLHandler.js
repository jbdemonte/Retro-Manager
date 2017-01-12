var cheerio = require('cheerio');

module.exports = HTMLHandler;

var regex = {
  eq: /:eq\((\d+)\)/,
  digit: /^\d+$/
};

/**
 * Return True if attribute is an URL one
 * @param {string} attributeName
 * @return {boolean}
 */
function urlAttribute(attributeName) {
  return !!~['href', 'src', 'action'].indexOf(attributeName);
}

/**
 * Handle an HTML string
 * @param {string} origin - website origin url
 * @param {string|Element} html - HTML code or cheerio object
 * @param {function} completeURL
 * @constructor
 */
function HTMLHandler(origin, html, completeURL) {
  var $ = typeof html === 'string' ? cheerio.load(html) : html;
  var self = this;

  self.origin = origin;
  self.length = $.length;

  self.forEach = function (fn) {
    self.map(fn);
  };

  self.map = function (fn) {
    var results = [];
    for (var i = 0; i < $.length; i++) {
      results.push(fn(new HTMLHandler(origin, $.eq(i), completeURL), i));
    }
    return results;
  };

  // Append :eq() support to cheerio
  self.find = function (container, selectors) {
    if (!selectors) {
      selectors = container;
      container = $;
    }
    var $result = cheerio();
    selectors.split(',').forEach(function (selector) {
      var cursor = container;
      selector.split(regex.eq).forEach(function (part) {
        if (part) {
          if (part.match(regex.digit)) {
            cursor = cursor.eq(parseInt(part, 10));
          } else {
            cursor = cursor.find ? cursor.find(part) : cursor(part);
          }
        }
      });
      $result = $result.add(cursor);
    });
    return new HTMLHandler(origin, $result, completeURL);
  };

  // attach some functions from cheerio
  'eq val html text'.split(' ').forEach(function (name) {
    self[name] = function () {
      return $[name].apply($, arguments);
    };
  });

  /**
   * Retrieve an attribute value
   * @param {string} attributeName
   * @return {string}
   */
  self.attr = function (attributeName) {
    var value = $.attr(attributeName);
    if (urlAttribute(attributeName)) {
      value = completeURL(value);
    }
    return value;
  };

  /**
   * Retrieve an attribute value
   * @param {string|function} selector - CSS selector or function to execute to get the value
   * @param {string} attributeName
   * @return {string}
   */
  self.selectAttr = function (selector, attributeName) {
    var value = typeof selector === 'function' ? selector(self) : self.find(selector).attr(attributeName);
    if (urlAttribute(attributeName)) {
      value = completeURL(value);
    }
    return value;
  };

  /**
   * Complete an URL if needed
   * @param {string} url
   * @return {string}
   */
  self.completeURL = completeURL;
}