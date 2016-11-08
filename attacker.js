var express = require("express");
var app = express();
var request = require("request");
app.use(express.static(__dirname + '/'));
var bodyParser = require('body-parser');

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var serverAddress = "http://127.0.0.1:8080";
var id = "My IoT";

function randomizer(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

function sendSensorData() {
	request.put({
	  headers: {"content-type" : "application/json"},
	  url:     serverAddress + "/attacker",
	  body:    buildJSONbody()
	}, function(error, res, body){
	  console.log(body);
	});	
}

function sendPort() {
	request.post({
	  headers: {"content-type" : "application/json"},
	  url:     serverAddress + "/attacker",
	  body:    JSON.stringify({"port": port, "id": id})
	}, function(error, res, body){
	  console.log(body);
	  setInterval(sendSensorData, 1000);
	});	
}

app.post("/attackers", function(req, res) {
	console.log("receiving attackers data...");
	attackersData = req.body;
	console.log(attackersData);
	res.sendStatus(200);
});


//Starts this attacker. Default Port would be 8081, else +1
var port = 8081;
var attackersData = {};

function connect(p) {
	app.listen(p, function() {
		console.log(p);
		sendPort();
	}).on('error', function(err) {
		port++;
		console.log("Unavailable port. Increasing by 1, now trying on port: " + port);
		connect(port);
	});
	console.log("Attacker on:" + port);
}

connect(port);
