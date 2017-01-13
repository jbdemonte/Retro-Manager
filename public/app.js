// Global "systems" come from index.html

var app = angular.module('app', ['ui.router', 'ngFileUpload', 'infinite-scroll']);

app.config(['$stateProvider', '$httpProvider', '$locationProvider', function ($stateProvider, $httpProvider, $locationProvider) {

  $httpProvider.defaults.headers.delete = {"Content-Type": "application/json;charset=utf-8"};

  var systemResolver = ['$stateParams', function ($stateParams) {
    return systems
      .filter(function (system) {
        return system.id === $stateParams.systemId;
      })
      .shift();
  }];

  $stateProvider.state('home', {
    url: '/',
    templateUrl: '/partials/home.html',
    controller: 'HomeCtrl'
  });

  $stateProvider.state('credits', {
    url: '/credits',
    templateUrl: '/partials/credits.html'
  });

  $stateProvider.state('bios', {
    url: '/bios',
    templateUrl: '/partials/bios.html',
    controller: 'BiosCtrl',
    resolve: {
      listing: ['$http', function ($http) {
        return $http
          .get('api/bios')
          .then(function (response) {
            return response.data.listing || {};
          });
      }]
    }
  });

  $stateProvider.state('arcades', {
    url: '/arcades',
    templateUrl: '/partials/systems.html',
    controller: 'SystemsCtrl'
  });

  $stateProvider.state('computers', {
    url: '/computers',
    templateUrl: '/partials/systems.html',
    controller: 'SystemsCtrl'
  });

  $stateProvider.state('consoles', {
    url: '/consoles',
    templateUrl: '/partials/systems.html',
    controller: 'SystemsCtrl'
  });

  $stateProvider.state('handhelds', {
    url: '/handhelds',
    templateUrl: '/partials/systems.html',
    controller: 'SystemsCtrl'
  });

  $stateProvider.state('others', {
    url: '/others',
    templateUrl: '/partials/systems.html',
    controller: 'SystemsCtrl'
  });

  $stateProvider.state('sources', {
    url: '/sources',
    templateUrl: '/partials/sources.html',
    controller: 'SourcesCtrl',
    resolve: {
      sources: ['$http', function ($http) {
        return $http
          .get('api/sources')
          .then(function (response) {
            return response.data.sources;
          });
      }]
    }
  });

  var listing = {
    templateUrl: '/partials/system.html',
    controller: 'SystemCtrl',
    resolve: {
      system: systemResolver,
      data: ['$http', '$stateParams', function ($http, $stateParams) {
        return $http
          .get('api/system/' + $stateParams.systemId)
          .then(function (response) {
            return response.data;
          });
      }]
    }
  };

  $stateProvider.state('arcades_list', Object.assign({url: '/arcades/:systemId'}, listing));
  $stateProvider.state('computers_list', Object.assign({url: '/computers/:systemId'}, listing));
  $stateProvider.state('consoles_list', Object.assign({url: '/consoles/:systemId'}, listing));
  $stateProvider.state('handhelds_list', Object.assign({url: '/handhelds/:systemId'}, listing));
  $stateProvider.state('others_list', Object.assign({url: '/others/:systemId'}, listing));

  $stateProvider.state('system_sources', {
    url: '/:section/:systemId/sources',
    templateUrl: '/partials/system_sources.html',
    controller: 'SystemSourcesCtrl',
    resolve: {
      system: systemResolver,
      sources: ['$http', '$stateParams', function ($http, $stateParams) {
        return $http
          .get('api/system/' + $stateParams.systemId + '/sources')
          .then(function (response) {
            return response.data.sources || [];
          });
      }]
    }
  });

  $stateProvider.state('system_source', {
    url: '/:section/:systemId/sources/:sourceId',
    templateUrl: '/partials/system_source.html',
    controller: 'SystemSourceCtrl',
    resolve: {
      system: systemResolver,
      source: ['$http', '$stateParams', function ($http, $stateParams) {
        return $http
          .get('api/system/' + $stateParams.systemId + '/sources/' + $stateParams.sourceId)
          .then(function (response) {
            return response.data;
          });
      }]
    }
  });

  $locationProvider.html5Mode(true);

}]);

app.factory('socket', function ($rootScope) {
  var socket = io.connect();
  return {
    on: function (eventName, callback) {
      var handler = function () {
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      };
      socket.on(eventName, handler);

      return function () {
        socket.off(eventName, handler);
      };
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      });
    }
  };
});

app.component('monitor', {
  templateUrl: '/partials/monitor.html',
  controller: ['$http', '$interval', function ($http, $interval) {
    var self = this;
    function update() {
      $http
        .get('api/monitor')
        .then(function (response) {
          if (response.data.mem.total) {
            response.data.mem.usedPct = response.data.mem.used * 100 / response.data.mem.total;
          }
          self.data = response.data;
        });
    }
    $interval(update, 5000);
    update();
  }]
});

app.component('uploadingList', {
  templateUrl: '/partials/uploading-list.html',
  bindings: {
    list: '<'
  }
});

app.filter("noExtension", function () {
  return function (file) {
    file = file.split('.');
    if (file.length > 1) {
      file.pop();
    }
    return file.join('.');
  };
});

app.filter("toFarenheight", function () {
  return function (degree) {
    if (degree) {
      return Math.round(parseFloat(degree) * 9/5 + 32);
    }
  };
});

app.filter("prettySize", function () {
  return function (bytes) {
    var units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'];
    var number = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.floor(bytes / Math.pow(1024, Math.floor(number))) +  ' ' + units[number];
  };
});

app.controller('HomeCtrl', ['$scope', function ($scope) {
  $scope.sections = {};
  systems.forEach(function (system) {
    $scope.sections[system.section] = true;
  });
}]);

app.controller('BiosCtrl', ['$scope', '$http', 'Upload', 'listing', function ($scope, $http, Upload, listing) {

  $scope.selected = {};
  $scope.bios = [];
  $scope.uploading = [];

  function sort() {
    $scope.bios.sort(function (a, b) {
      if (a.system < b.system) {
        return -1;
      } else if (a.system > b.system) {
        return 1;
      }
      return a.name < b.name ? -1 : 1;
    });
  }

  $scope.hasSelected = function () {
    return Object.keys($scope.selected).some(function (key) {
      return $scope.selected[key];
    });
  };

  $scope.remove = function () {
    var files = Object.keys($scope.selected).filter(function (key) {
      return $scope.selected[key];
    });
    $scope.bios.filter(function (item) {
      return item.unknown && !$scope.selected[item.system + '/' + item.file];
    });
    $scope.bios.forEach(function (item) {
      if ($scope.selected[item.system + '/' + item.file]) {
        item.missing = true;
      }
    });
    $scope.selected = {};
    $http.delete('api/bios', {data: JSON.stringify({files: files})});
  };

  $scope.toggle = function (item) {
    if (item.missing) {
      return ;
    }
    $scope.selected[item.system + '/' + item.file] = !$scope.selected[item.system + '/' + item.file];
  };

  $scope.$watch('files', function (files) {
    (files || []).forEach(function (file) {
      if (file.$error) {
        return ;
      }
      var item = {
        name: file.name,
        progress: {}
      };
      $scope.uploading.push(item);
      function hide() {
        $scope.uploading.splice($scope.uploading.indexOf(item), 1);
      }
      Upload
        .upload({
          url: 'api/bios',
          data: {
            file: file
          }
        })
        .then(
          function (response) {
            if (response.data.added) {
              response.data.added.forEach(function (item) {
                var found = $scope.bios.some(function (entry) {
                  if (item.system === entry.system && item.md5 === entry.md5 && item.file === entry.file) {
                    entry.missing = entry.unknown = false;
                    return true;
                  }
                });
                if (!found) {
                  $scope.bios.push(item);
                }
              });
              sort();
            }
            hide();
          },
          function () {
            hide();
          },
          function (evt) {
            item.progress = Math.floor(100.0 * evt.loaded / evt.total);
          }
        )
        .catch(function () {
          hide();
        });
    });
  });

  systems.forEach(function (system) {
    if (system.bios) {
      Object.keys(system.bios).forEach(function (md5) {
        var item = {system: system.id, file: system.bios[md5], md5: md5};
        item.missing = listing.every(function (item) {
          return item.system !== system.id || item.md5 !== md5 || item.file !== system.bios[md5];
        });
        $scope.bios.push(item);
      });
    }
  });

  listing.forEach(function (item) {
    var found = systems.some(function (system) {
      return system.bios && Object.keys(system.bios).some(function (md5) {
        return item.system === system.id && item.md5 === md5 && item.file === system.bios[md5];
      });
    });
    if (!found) {
      item.unknown = true;
      $scope.bios.push(item);
    }
  });

  sort();

}]);

app.controller('SystemsCtrl', ['$scope', '$state', function ($scope, $state) {
  $scope.state = $state.current.name;
  $scope.systems = systems.filter(function (system) {
    return system.section === $scope.state;
  });
}]);

app.controller('SourcesCtrl', ['$scope', 'sources', function ($scope, sources) {
  $scope.sources = sources;
}]);

app.controller('SystemSourcesCtrl', ['$scope', 'system', 'sources', function ($scope, system, sources) {
  $scope.system = system;
  $scope.sources = sources;
}]);

app.controller('SystemSourceCtrl', ['$scope', '$stateParams', 'socket', 'system', 'source', function ($scope, $stateParams, socket, system, source) {
  $scope.system = system;
  $scope.source = source;
  $scope.filters = {};
  $scope.loading = !source.games;

  var gamesByUrl = {};
  var gameList = source.games || [];
  var pagination = 100;


  function mapGames() {
    gamesByUrl = {};
    gameList.forEach(function (game) {
      gamesByUrl[game.url] = game;
    });
    source.games = [];
    $scope.showMore();
  }


  $scope.showMore = function () {
    var max = (source.games ? source.games.length : 0) + pagination;
    var count = 0;
    source.games = gameList.filter(function (game) {
      if (count === max) {
        return false;
      }
      if ($scope.filters.name && !~(game.name || '').toLowerCase().indexOf($scope.filters.name)) {
        return false;
      }
      count++;
      return true;
    });
  };

  $scope.$watch('filters', function () {
    $scope.showMore();
  }, true);

  $scope.download = function (game) {
    if (!game.downloaded && !game.downloading) {
      game.downloading = true;
      socket.emit('download', game);
    }
  };

  socket.on('games', function (data) {
    if (system.id === data.systemId) {
      gameList = data.games;
      mapGames();
      $scope.loading = false;
    }
  });

  socket.on('progress', function (data) {
    var game = gamesByUrl[data.game.url];
    if (game) {
      game.progression = data.progression;
    }
  });

  socket.on('complete', function (data) {
    var game = gamesByUrl[data.game.url];
    if (game) {
      delete game.progression;
      game.downloading = false;
      game.downloaded = true;
    }
  });

  socket.on('status', function (status) {
    $scope.status = status;
  });

  socket.on('crawling', function (crawling) {
    if (system.id in crawling) {
      source.crawling = crawling[system.id];
      $scope.loading = false;
    }
  });

  socket.emit('crawl', {sourceId: $stateParams.sourceId, systemId: system.id});

  mapGames();
}]);

app.controller('SystemCtrl', ['$scope', '$http', '$timeout', 'Upload', 'system', 'data', function ($scope, $http, $timeout, Upload, system, data) {
  $scope.system = system;
  $scope.games = data.games;
  $scope.downloadable = data.downloadable;
  $scope.uploading = [];
  $scope.selected = {};
  $scope.unknown = {};
  $scope.games.forEach(function (game) {
    $scope.unknown[game] = system.extensions.indexOf(game.split('.').pop()) < 0;
  });

  $scope.hasSelected = function () {
    return Object.keys($scope.selected).some(function (key) {
      return $scope.selected[key];
    });
  };

  $scope.remove = function () {
    var games = Object.keys($scope.selected).filter(function (key) {
      return $scope.selected[key];
    });
    $scope.games = $scope.games.filter(function (game) {
      return !$scope.selected[game];
    });
    $scope.selected = {};
    $http.delete('api/system/' + system.id, {data: JSON.stringify({games: games})});
  };

  $scope.$watch('files', function (files) {
    (files || []).forEach(function (file) {
      if (file.$error) {
        return ;
      }
      var item = {
        name: file.name,
        progress: {}
      };
      $scope.uploading.push(item);
      function hide() {
        $scope.uploading.splice($scope.uploading.indexOf(item), 1);
      }
      Upload
        .upload({
          url: 'api/system/' + system.id,
          data: {
            file: file
          }
        })
        .then(
          function (response) {
            if (!response.data.error) {
              (response.data.added || []).forEach(function (filename) {
                if ($scope.games.indexOf(filename) < 0) {
                  $scope.games.push(filename);
                }
              });
            }
            hide();
          },
          function () {
            hide();
          },
          function (evt) {
            item.progress = Math.floor(100.0 * evt.loaded / evt.total);
          }
        )
        .catch(function () {
          hide();
        });
    });
  });

}]);