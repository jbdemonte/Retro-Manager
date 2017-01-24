// Global "systems" come from index.html

var app = angular.module('app', ['ui.router', 'ngFileUpload', 'infinite-scroll', 'ncy-angular-breadcrumb']);

app.config(['$breadcrumbProvider', function ($breadcrumbProvider) {
  $breadcrumbProvider.setOptions({
    templateUrl: '/partials/breadcrumb.html'
  });
}]);

app.config(['$stateProvider', '$httpProvider', '$locationProvider', function ($stateProvider, $httpProvider, $locationProvider) {
  $httpProvider.defaults.headers.delete = {"Content-Type": "application/json;charset=utf-8"};

  $stateProvider.state('root', {
    abstract: true,
    templateUrl: '/partials/root.html'
  });

  $stateProvider.state('root.home', {
    url: '/',
    views: {
      'container@root': {
        templateUrl: '/partials/home.html',
        controller: 'HomeCtrl'
      }
    },
    ncyBreadcrumb: {
      label: 'HOME'
    }
  });

  $stateProvider.state('root.home.credits', {
    url: 'credits',
    views: {
      'container@root': {
        templateUrl: '/partials/credits.html'
      }
    },
    ncyBreadcrumb: {
      label: 'CREDITS'
    }
  });

  $stateProvider.state('root.home.bios', {
    url: 'bios',
    views: {
      'container@root': {
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
      }
    },
    ncyBreadcrumb: {
      label: 'BIOS'
    }
  });

  $stateProvider.state('root.home.sources', {
    url: 'sources',
    views: {
      'container@root': {
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
      }
    },
    ncyBreadcrumb: {
      label: 'SOURCES'
    }
  });

  $stateProvider.state('root.home.sources.details', {
    url: '/:sourceId',
    views: {
      'container@root': {
        templateUrl: '/partials/source.html',
        controller: 'SourceCtrl',
        resolve: {
          source: ['$http', '$stateParams', function ($http, $stateParams) {
            return $http
              .get('api/sources/' + $stateParams.sourceId)
              .then(function (response) {
                return response.data.source;
              });
          }]
        }
      }
    },
    ncyBreadcrumb: {
      label: '{{source.name}}'
    }
  });

  $stateProvider.state('root.home.section', {
    url: '{section:arcades|computers|consoles|handhelds|others}',
    views: {
      'container@root': {
        templateUrl: '/partials/systems.html',
        controller: 'SystemsCtrl'
      }
    },
    ncyBreadcrumb: {
      label: '{{section}}'
    }
  });

  $stateProvider.state('root.home.section.system', {
    url: '/:systemId',
    resolve: {
      system: ['$stateParams', function ($stateParams) {
        return systems
          .filter(function (system) {
            return system.id === $stateParams.systemId;
          })
          .shift();
      }]
    },
    views: {
      'container@root': {
        templateUrl: '/partials/system.html',
        controller: 'SystemCtrl',
        resolve: {
          data: ['$http', '$stateParams', function ($http, $stateParams) {
            return $http
              .get('api/system/' + $stateParams.systemId)
              .then(function (response) {
                return response.data;
              });
          }]
        }
      }
    },
    ncyBreadcrumb: {
      label: '{{system.name}}'
    }
  });

  $stateProvider.state('root.home.section.system.sources', {
    url: '/sources',
    views: {
      'container@root': {
        templateUrl: '/partials/system/sources.html',
        controller: 'SystemSourcesCtrl',
        resolve: {
          sources: ['$http', '$stateParams', function ($http, $stateParams) {
            return $http
              .get('api/system/' + $stateParams.systemId + '/sources')
              .then(function (response) {
                return response.data.sources || [];
              });
          }]
        }
      }
    },
    ncyBreadcrumb: {
      label: 'SOURCES'
    }
  });

  $stateProvider.state('root.home.section.system.sources.details', {
    url: '/:sourceId',
    views: {
      'container@root': {
        templateUrl: '/partials/system/source.html',
        controller: 'SystemSourceCtrl',
        resolve: {
          source: ['$http', '$stateParams', function ($http, $stateParams) {
            return $http
              .get('api/system/' + $stateParams.systemId + '/sources/' + $stateParams.sourceId)
              .then(function (response) {
                return response.data.source;
              });
          }]
        }
      }
    },
    ncyBreadcrumb: {
      label: '{{source.name}}'
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

app.component('serverMessage', {
  templateUrl: '/partials/server-message.html',
  controller: ['$timeout', '$rootScope', 'socket', function ($timeout, $rootScope, socket) {
    var self = this;
    var count = 0;

    self.messages = [];

    self.remove = function (message) {
      self.messages.splice(self.messages.indexOf(message), 1);
    };

    function display(message, duration) {
      message.id = 'message-' + Date.now() + '-' + (count++);
      self.messages.push(message);

      $timeout(function () {
        message.visible = true;
        angular.element(document.getElementById(message.id)).css('maxHeight', '100px');
      }, 100);

      $timeout(function () {
        message.visible = false;
        angular.element(document.getElementById(message.id)).css({maxHeight: '0px'});

        $timeout(function () {
          self.remove(message);
        }, 500);

      }, duration || 3000);
    }

    socket.on('server-error', function (data) {
      display({error: true, msg: data.error}, 10000);
    });

    $rootScope.$on('server-error', function (event, data) {
      display({error: true, msg: data.error}, 10000);
    });

    socket.on('pause', function (data) {
      display({information: true, msg: 'Pause for ' + (data.duration / 1000).toFixed(2) + ' second' + (data.duration > 1000 ? 's' : '')});
    });

    socket.on('complete', function (data) {
      display({congrats: true, msg: 'Download complete (' + data.game.name + ')'});
    });
  }]
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
      return a.file < b.file ? -1 : 1;
    });
  }

  $scope.hasSelected = function () {
    return Object.keys($scope.selected).some(function (key) {
      return $scope.selected[key];
    });
  };

  $scope.remove = function () {
    var files = $scope.bios
      .filter(function (item, index) {
        return $scope.selected[index];
      })
      .map(function (item) {
        item.missing = true;
        return item.path + '/' + item.file;
      });
    $scope.selected = {};
    $http.delete('api/bios', {data: JSON.stringify({files: files})});
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
        .upload({url: 'api/bios', data: {file: file}})
        .then(
          function (response) {
            if (response.data.added) {
              response.data.added.forEach(function (item) {
                var found = $scope.bios.some(function (entry) {
                  if (item.system === entry.system && item.md5 === entry.md5 && item.path === entry.path && item.file === entry.file) {
                    entry.missing = false;
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
      system.bios.forEach(function (item) {
        item = Object.assign({system: system.id}, item);
        item.missing = listing.every(function (existing) {
          return existing.system !== item.system || existing.md5 !== item.md5 || existing.path !== item.path || existing.file !== item.file;
        });
        $scope.bios.push(item);
      });
    }
  });

  sort();
}]);

app.controller('SystemsCtrl', ['$scope', '$state', '$stateParams', function ($scope, $state, $stateParams) {
  $scope.section = $stateParams.section;
  $scope.systems = systems.filter(function (system) {
    return system.section === $stateParams.section;
  });
}]);

app.controller('SourcesCtrl', ['$scope', 'Upload', 'sources', function ($scope, Upload, sources) {
  $scope.sources = sources;
  $scope.uploading = [];

  function sort() {
    $scope.sources.sort(function (a, b) {
      return a.name < b.name ? -1 : 1;
    });
  }

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
          url: 'api/sources',
          data: {
            file: file
          }
        })
        .then(
          function (response) {
            if (response.data && response.data.sources) {
              $scope.sources = response.data.sources;
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

  sort();
}]);

app.controller('SourceCtrl', ['$scope', 'source', function ($scope, source) {
  $scope.source = source;

  $scope.isArray = function (url) {
    return Array.isArray(url);
  };
}]);

app.controller('SystemSourcesCtrl', ['$scope', '$stateParams', 'system', 'sources', function ($scope, $stateParams, system, sources) {
  $scope.section = $stateParams.section;
  $scope.system = system;
  $scope.sources = sources;
}]);

app.controller('SystemSourceCtrl', ['$scope', '$stateParams', '$http', 'socket', 'system', 'source', function ($scope, $stateParams, $http, socket, system, source) {
  $scope.section = $stateParams.section;
  $scope.system = system;
  $scope.source = source;
  $scope.filters = {};
  $scope.loading = !source.games;
  $scope.games = [];

  var gamesByUrl = {};
  var pagination = 100;
  var delisteners = [];


  function mapGames() {
    gamesByUrl = {};
    (source.games || []).forEach(function (game) {
      gamesByUrl[game.url] = game;
    });
    $scope.games = [];
    $scope.showMore();
  }

  $scope.refresh = function () {
    if (!$scope.loading && !$scope.source.crawling) {
      $scope.loading = true;
      $http
        .delete('api/system/' + system.id + '/sources/' + source.id)
        .then(function () {
          socket.emit('crawl', {sourceId: source.id, systemId: system.id});
        });

    }
  };

  $scope.download = function (game) {
    if (!game.downloaded && !game.downloading) {
      game.downloading = true;
      socket.emit('download', game);
    }
  };

  $scope.showMore = function () {
    var max = $scope.games.length + pagination;
    var count = 0;
    $scope.games = (source.games || []).filter(function (game) {
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

  $scope.$on('$destroy', function () {
    delisteners.forEach(function (off) {
      off();
    });
  });

  delisteners.push(socket.on('games', function (data) {
    if (system.id === data.systemId) {
      source.games = data.games || [];
      mapGames();
      $scope.loading = false;
    }
  }));

  delisteners.push(socket.on('progress', function (data) {
    var game = gamesByUrl[data.game.url];
    if (game) {
      game.progression = data.progression;
      game.downloading = true;
      game.error = false;
    }
  }));

  delisteners.push(socket.on('complete', function (data) {
    var game = gamesByUrl[data.game.url];
    if (game) {
      delete game.progression;
      game.downloading = false;
      game.downloaded = true;
      game.error = false;
    }
  }));

  delisteners.push(socket.on('failed', function (data) {
    var game = gamesByUrl[data.game.url];
    if (game) {
      delete game.progression;
      game.downloading = false;
      game.downloaded = false;
      game.error = data.error;
    }
  }));

  delisteners.push(socket.on('game-state', function (data) {
    var game = gamesByUrl[data.game.url];
    if (game) {
      if (!data.state.downloading) {
        delete game.progression;
      }
      game.downloading = data.state.downloading;
      game.downloaded = data.state.downloaded;
    }
  }));

  delisteners.push(socket.on('status', function (status) {
    $scope.status = status;
  }));

  delisteners.push(socket.on('crawling', function (crawling) {
    if (system.id in crawling) {
      source.crawling = crawling[system.id];
      $scope.loading = false;
    }
  }));

  socket.emit('crawl', {sourceId: source.id, systemId: system.id});

  mapGames();
}]);

app.controller('SystemCtrl', ['$rootScope', '$scope', '$http', '$timeout', '$state', '$stateParams', 'Upload', 'system', 'data', function ($rootScope, $scope, $http, $timeout, $state, $stateParams, Upload, system, data) {
  $scope.section = $stateParams.section;
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
        .upload({url: 'api/system/' + system.id, data: {file: file}})
        .then(
          function (response) {
            if (response.data.error) {
              $rootScope.$emit('server-error', response.data);
            } else {
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