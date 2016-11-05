// require necessary dependencies for http transactions
var express = require("express");
var app = express();
var http = require('http').Server(app);
var io = require("socket.io")(http);
var bodyParser = require('body-parser');

app.use(express.static(__dirname + '/www')); // path used for the webpage
app.use('/node_modules', express.static(__dirname + '/node_modules')); // path used to reference node modules in html

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// Callback function when a HTTP POST method is requested, in the path '/iot-device'
// Converts iot-device received data to a format understood by the web client
app.post("/iot-device", function(req, res) {
	console.log("Receiving device data...")
	console.log(req.body);
	/*var iot_id = req.body.id;
	var data = [];
	i = 0;
	for (var key in req.body.data) {
		data[i] = {
			x: [req.body.datetime],
			y: [req.body.data[key]],
			name: key
		}
		i++;
	}*/

	// socket broadcast message to all the connected clients
	// with the received device data
	io.emit("device data", {
		"ID": req.body.id,
		"datetime": req.body.datetime,
		"data": req.body.data
	});

	// set device message sending time to default, if it's a new device
	updateDeviceTime(req.body.id);

	// response sent to device with the time to send a message in milliseconds
	res.send(iotDevicesTime[req.body.id] + '');
})

// Callback function when a 'connection' socket message is received
// When a client connection is established
io.on('connection', function(socket){
  console.log('Web client connection established');
  
  // Callback function when a 'update time' socket message is received
  // Updates a given device with a given time
  socket.on('update time', function(deviceTime) {
	updateDeviceTime(deviceTime.ID, deviceTime.time);
  });
});

var iotDevicesTime = {}; // JSON containing the time to send a message for all devices

// Updates the time of a given device
function updateDeviceTime(id, time) {
	if (time) { // time is passed as a parameter
		iotDevicesTime[id] = time;
	} else if (!iotDevicesTime[id]) { // time isn't passed as a parameter
		iotDevicesTime[id] = 1000; // set device time to default (1000 milliseconds)
	}
}

//Starts the server, it listens on port 8080
var serverPort = 8080;
http.listen(serverPort);
console.log("Server running on: " + serverPort);