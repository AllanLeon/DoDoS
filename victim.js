var express = require("express");
var app = express();
var request = require("request");
app.use(express.static(__dirname + '/'));

app.post("/attacker", function(req, res) {
	console.log("HELP!");
	res.sendStatus(200);
});

app.get("/attacker", function(req, res) {
	console.log("HELP!");
	res.sendStatus(200);
});

//Starts this victim, default port is 3000
var port = 3000;
app.listen(port);
console.log("Victim running on: " + port);