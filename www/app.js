var app = angular.module('dachshund', ["chart.js"]); // module declaration

// controller of the devices and sensors' chart
app.controller('MainController', function($scope, socket) {
	$scope.devices = []; // array of all iot-devices

  	// default options for a chart.js
  	$scope.chartOptions = {
  		animation: false,
  		responsive: true,
  		scales: {
            xAxes: [{
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'Datetime'
                }
            }],
            yAxes: [{
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'Value'
                }
            }]
        }
  	}

  	// chart data will be displayed as a line with no fill
  	var defaultDashedDatasetOverride = {
        type: 'line',
        fill: false
  	};

  	// callback function when a socket 'device data' message is received
  	// updates the respective device with the received data
	socket.on('device data', function(device) {
		updateDeviceInfo(device);
	});

	// updates the respective device inside devices array with
	// the received data from server
	function updateDeviceInfo(receivedData) {
		var found = false; // flag if the received data belongs to an already registered device

		// iterate over all the registered devices
		for (var i = 0; i < $scope.devices.length && !found; i++) {
			var device = $scope.devices[i];

			if (device.ID === receivedData.ID) { // device is already registered
				found = true;
				addDataToRegisteredDevice(device, receivedData);
			}
		}

		if (!found) { // received data from a new device
			registerDevice(receivedData);
		}
	}

	// register new device
	function registerDevice(receivedData) {
		var newDevice = { // create a new device object
			ID: receivedData.ID, // id
			timeToWait: 1000, // time the device will wait to send a message
			labels: [receivedData.datetime], // x-axis labels (datetime)
			series: [], // sensors
			data: [], // data from the sensors
			datasetOverride: [] // display options
		}

		for (var key in receivedData.data) {
			newDevice.series.push(key); // push all the sensors
			newDevice.datasetOverride.push(defaultDashedDatasetOverride); // set display options for the data of all the sensors
			newDevice.data.push([receivedData.data[key]]); // push received data from sensors
		}
		$scope.devices.push(newDevice);
	}

	// update device data with received data from server
	function addDataToRegisteredDevice(device, receivedData) {
		var fill_elements = []; // array to fill sensor data, if new sensor data is received
		for (var j = 0; j < device.labels.length; j++) {
			fill_elements.push(null);
		}

		// Remove first data element from sensors if there are more than 10 entries
		if (device.labels.length > 10) {
			device.labels.shift();
			device.data.every(numbers => numbers.shift());
		}

		// push new x-axis label (datetime)
		device.labels.push(receivedData.datetime);

		// check, add and fill sensor data if there is no past data of a new sensor
		for (var key in receivedData.data) {
			if (device.series.indexOf(key) == -1) {
				device.series.push(key);
				device.datasetOverride.push(defaultDashedDatasetOverride);
				device.data.push(fill_elements);
			}
		}

		// push data for all the sensors
		// if a sensor doesn't send data this iteration push null
		for (var j = 0; j < device.series.length; j++) {
			if (receivedData.data[device.series[j]]) {
				device.data[j].push(receivedData.data[device.series[j]]);
			} else {
				device.data[j].push(null);
			}
		}
	}
});

// Controller of addresses list to attack
app.controller('AttackAddressesCtrl', function($scope, socket) {
    $scope.isAttacking = false;
    $scope.addrList = []; // ip address + port list
   	//var addresses = [];
   	//var ports = [];

   	// adds an address to the list
    $scope.add = function() {
        $scope.addrList.push({addr:$scope.addrInput, check:false});
        $scope.addrInput = "";
    };

    // removes selected addresses from the list
    $scope.remove = function() {
        var oldList = $scope.addrList;
        $scope.addrList = [];
        angular.forEach(oldList, function(elem) {
            if (!elem.check)
            	$scope.addrList.push(elem);
        });
    };

/*    function tokenize(list) {
        angular.forEach(list, function(elem) {
			var splitElem = elem.addr.split(":");
			addresses.push(splitElem[0]);
			ports.push(splitElem[1]);
        });
    };
*/
	
	// sends the addresses list to the server and starts the attack
    $scope.attack = function() {
		//tokenize($scope.addrList);
		var addresses = [];
        angular.forEach($scope.addrList, function(elem) {
			addresses.push(elem.addr);
        });

        // send socket 'attack' message to server
    	socket.emit('attack', {
			'addresses': addresses
		});
		console.log("Looks like its sent, bud");
    $scope.isAttacking = true;
    };

    // stops the attack
    $scope.stop = function() {
		socket.emit('stop', {});
		console.log("Stopping attack");
    $scope.isAttacking = false;
    };
});

// factory used for socket services
// implements 'on' and 'emit' methods, so them can be used inside a controller
app.factory('socket', ['$rootScope', function ($rootScope) {
  var socket = io();

  return {
  	// on method implementation
    on: function (eventName, callback) {
      function wrapper() {
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      }

      socket.on(eventName, wrapper);

      return function () {
        socket.removeListener(eventName, wrapper);
      };
    },

    // emit method implementation
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if(callback) {
            callback.apply(socket, args);
          }
        });
      });
    }
  };
}]);
