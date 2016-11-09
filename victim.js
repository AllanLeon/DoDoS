var express = require("express");
var app = express();
var request = require("request");
app.use(express.static(__dirname + '/'));

app.post("/", function(req, res) {
	console.log("HELP!");
});

app.get("/", function(req, res) {
	console.log("HELP!");
});

//Starts this victim, default port is 3000
var port = parseInt(process.argv.slice(2)) || 3000;
app.listen(port);
console.log("Victim running on: " + port);