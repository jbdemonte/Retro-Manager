// Global "systems" come from index.html

var app = angular.module('app', ['ui.router', 'ngFileUpload']);

app.config(['$stateProvider', '$httpProvider', function ($stateProvider, $httpProvider) {

  $httpProvider.defaults.headers.delete = {"Content-Type": "application/json;charset=utf-8"};

  $stateProvider.state('root', {
    url: '',
    templateUrl: '/partials/list.html',
    controller: 'ListCtrl'
  });

  $stateProvider.state('system', {
    url: '/system/:systemId',
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
          .get('api/' + $stateParams.systemId)
          .then(function (response) {
            return response.data ? response.data.games || [] : [];
          });
      }]
    }
  });


}]);

app.filter("noExtension", function () {
  return function (file) {
    file = file.split('.');
    if (file.length > 1) {
      file.pop();
    }
    return file.join('.');
  };
});

app.controller('ListCtrl', ['$scope', function ($scope) {
  $scope.systems = systems;
}]);

app.controller('SystemCtrl', ['$scope', '$http', '$timeout', 'Upload', 'system', 'games', function ($scope, $http, $timeout, Upload, system, games) {
  $scope.system = system;
  $scope.games = games;
  $scope.uploading = [];
  $scope.selected = {};
  $scope.unknown = {};

  games.forEach(function (game) {
    console.log(game, system.extensions, game.split('.').pop(), system.extensions.indexOf(game.split('.').pop()));
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
    $http.delete('api/' + system.id, {data: JSON.stringify({games: games})});
  };

  $scope.$watch('files', function () {
    upload($scope.files);
  });

  function upload(files) {
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
          url: 'api/' + system.id,
          data: {
            file: file
          }
        })
        .then(
          function (response) {
            if (!response.data.error) {
              (response.data.files || []).forEach(function (filename) {
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
  }



}]);