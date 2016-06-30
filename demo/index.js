angular
    .module('App', ['ngPopup'])
    .config(['$routeProvider', function($routeProvider){
            
        $routeProvider
        .when('/template1', {
            templateUrl: 'template1.html',
            reloadOnSearch: false
        })
        .when('/template2', {
            templateUrl: 'template2.html',
            reloadOnSearch: false
        });
        
        $routeProvider.otherwise({
            redirectTo: '/'
        });
        
    }])
    .controller('AppCtrl', ['$scope', function($scope){
         
    }]);
