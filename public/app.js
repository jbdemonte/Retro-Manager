// Global "systems" come from index.html

var app = angular.module('app', ['ui.router', 'ngFileUpload']);

app.config(['$stateProvider', '$httpProvider', '$locationProvider', function ($stateProvider, $httpProvider, $locationProvider) {

  $httpProvider.defaults.headers.delete = {"Content-Type": "application/json;charset=utf-8"};

  $stateProvider.state('home', {
    url: '/',
    templateUrl: '/partials/home.html'
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

  $stateProvider.state('consoles', {
    url: '/consoles',
    templateUrl: '/partials/systems.html',
    controller: 'SystemsCtrl'
  });

  var listing = {
    templateUrl: '/partials/system.html',
    controller: 'SystemCtrl',
    resolve: {
      system: ['$stateParams', function ($stateParams) {
        return systems
          .filter(function (system) {
            return system.id === $stateParams.systemId;
          })
          .shift();
      }],
      games: ['$http', '$stateParams', function ($http, $stateParams) {
        return $http
          .get('api/system/' + $stateParams.systemId)
          .then(function (response) {
            return response.data.games || [];
          });
      }]
    }
  };

  $stateProvider.state('consoles_list', Object.assign({url: '/consoles/:systemId'}, listing));

  $locationProvider.html5Mode(true);

}]);

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
  $scope.systems = systems;
}]);

app.controller('SystemCtrl', ['$scope', '$http', '$timeout', 'Upload', 'system', 'games', function ($scope, $http, $timeout, Upload, system, games) {
  $scope.system = system;
  $scope.games = games;
  $scope.uploading = [];
  $scope.selected = {};
  $scope.unknown = {};
  games.forEach(function (game) {
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