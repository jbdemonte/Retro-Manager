var path = require('path');
var contentDisposition = require('content-disposition');

var classes = {
  HTMLHandler: require('./HTMLHandler')
};

module.exports = Response;

function Response(engine, query, response, completeURL) {
  this.url = query.url;
  this.body = response.body;
  this.filename = function () {
    return extractFilename(response);
  };

  if ((response.headers['content-type'] || '').match('text/html.*')) {
    this.body = new classes.HTMLHandler(engine.origin, response.body, completeURL);
  }
}

/**
 * Retrieve the filename from the response
 * @param {object} response
 * @return {string}
 */
function extractFilename(response) {
  if (response.headers['content-disposition']) {
    var parsed = contentDisposition.parse(response.headers['content-disposition']);
    if (parsed && parsed.parameters && parsed.parameters.filename) {
      return parsed.parameters.filename;
    }
  }
  return decodeURI(path.basename(response.request.href));
}