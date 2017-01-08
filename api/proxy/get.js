/*
  Website may have security against bandwidth steal
  This API proxify the ressource request injecting target base url as origin
*/

var request = require('request');
var url = require("url");
var path = require("path");

var headers = {
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "fr-CA,fr;q=0.8,fr-FR;q=0.6,en;q=0.4,en-US;q=0.2",
  "Cache-Control": "max-age=0",
  "Connection": "keep-alive",
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.132 Safari/537.36"
};

module.exports = function (req, res) {
  if (!req.query.url) {
    return res.status(404).end();
  }

  setTimeout(function () {
    var parsed = url.parse(req.query.url);
    var query = {
      method: 'GET',
      origin: parsed.protocol + '//' + parsed.host,
      url: req.query.url,
      headers: Object.assign({}, headers),
      encoding: null
    };
    request(query, function (error, response) {
      if (error) {
        return res.status(404).end();
      }
      res.setHeader('Content-disposition', 'inline; filename="' + path.basename(req.query.url) + '"');
      res.setHeader('Content-Type', response.headers['content-type']);
      res.end(response.body, 'binary');
    });
  }, 10);
};
