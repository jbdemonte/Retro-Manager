global.__base = __dirname + '/';

var glob = require('glob');
var express = require('express');
var stylus = require('stylus');
var nib = require('nib');
var bodyParser = require('body-parser');
var constants = require('./constants');
var config = require('./config');


var app = express();
var server = require('http').createServer(app);

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib());
}

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/public/views');
app.set('view engine', 'jade');

app.use(stylus.middleware({ src: __dirname + '/public', compile: compile}));
app.use(express.static(__dirname + '/public'));

app.get('/partials/*.html', function (req, res) {
  return res.render(__dirname + '/public/partials/' + req.params[0]);
});

app.get('/images/sources/:sourceId/:image', function (req, res) {
  res.sendFile(
    constants.SOURCES_PATH + '/' + req.params.sourceId + '/' + req.params.image,
    function (err) {
      if (err) {
        return res.status(err.status).end();
      }
    }
  );
});

app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({ extended: true }));


Promise
  .resolve()
  .then(function () {
    return config.systems ? serve() : serveError();
  })
  .then(function () {
    server.listen(app.get('port'), function () {
      console.log('Express server listening on port ' + app.get('port'));
    });
  })
  .catch(function (err) {
    console.log(err);
  });


/**
 * Start normal server
 * @return {Promise}
 */
function serve() {
  console.log('Host=' + config.host);

  require('./server/socket')(server);

  // Load API and create route automatically
  glob.sync('api/**/*.js', {cwd: __base + 'server'}).forEach(function (api) {
    var path = api.split('/');
    var method = path.pop().replace('.js', '');
    var args = require('./server/' + api);
    if (!Array.isArray(args)) {
      args = [args];
    }
    args.unshift('/' + path.join('/'));
    app[method].apply(app, args);
  });

  app.get('*', function (req, res) {
    res.render('index', {systems: JSON.stringify(config.systems)});
  });

  return require('./server/tools').source.list();
}

/**
 * Start error server
 * @return {Promise}
 */
function serveError() {
  app.get('*', function (req, res) {
    res.render('missing');
  });

  return Promise.resolve();
}