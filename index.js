var glob = require('glob');
var express = require('express');
var stylus = require('stylus');
var nib = require('nib');
var bodyParser = require('body-parser');

var app = express();

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib());
}
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(stylus.middleware({ src: __dirname + '/public', compile: compile}));
app.use(express.static(__dirname + '/public'));

app.get('/partials/*.html', function (req, res) {
  return res.render(__dirname + '/partials/' + req.params[0]);
});

app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({ extended: true }));

// Load API and create route automatically
glob.sync('api/**/*.js').forEach(function (api) {
  var path = api.split('/');
  var method = path.pop().replace('.js', '');
  var args = require('./' + api);
  if (!Array.isArray(args)) {
    args = [args];
  }
  args.unshift('/' + path.join('/'));
  app[method].apply(app, args);
});

app.get('*', function (req, res) {
  res.render('index', {systems: JSON.stringify(require('./systems.json'))});
});

app.listen(3000);