var express = require("express");
var app = express();
var request = require("request");
app.use(express.static(__dirname + '/'));

function randomizer(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildJSONbody() {
	var sensor0, sensor1, sensor2;
	var d = new Date();

	sensor0 = randomizer(-20, 20) * 5;
	sensor1 = randomizer(-20, 20) * 5;
	sensor2 = randomizer(-20, 20) * 5;

	var jsonbody = "{ \"id\" : \"My IoT\", \"datetime\" : \"";
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

function callPost() {
	request.post({
	  headers: {"content-type" : "application/json"},
	  url:     "http://localhost:8080/attacker",
	  body:    buildJSONbody()
	}, function(error, res, body){
	  console.log(body);
	});	
}


//Starts this attacker. Default Port would be 8081, else +1
var port = 8081;

function connect(p) {
	app.listen(p).on('error', function(err) {
		port++;
		console.log("Unavailable port. Increasing by 1, now trying on port: " + port);
		connect(port);
	});	
	console.log("Attacker on:" + port); 
}

connect(port);
setInterval(callPost, 1000);