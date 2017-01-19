var tools = require(__base + 'server/tools');

module.exports = function (server) {

  var io = require('socket.io').listen(server);

  io.on('connection', function (socket) {
    var delisteners = [];
    var sources = {};

    socket.on('disconnect', function () {
      delisteners.forEach(function (off) {
        off();
      });
    });

    socket.on('crawl', function (data) {
      var source = tools.source.get(data.sourceId);
      addListeners(source);
      source.crawl(data.systemId);
    });

    socket.on('download', function (game) {
      var source = sources[game.sc];
      if (source) {
        source.download(game);
      }
    });

    function addListeners(source) {
      if (sources[source.id]) {
        return ;
      }
      sources[source.id] = source;
      'games progress crawling started complete status pause game-state server-error'.split(' ').forEach(function (event) {
        proxify(source, event);
      });
    }

    function attach(emitter, event, handler) {
      emitter.on(event, handler);
      delisteners.push(function () {
        emitter.removeListener(event, handler);
      });
    }

    function proxify(emitter, event) {
      attach(emitter, event, function (data) {
        socket.emit(event, data);
      });
    }

  });
};
