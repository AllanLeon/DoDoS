var express = require("express");
var app = express();
app.use(express.static(__dirname + '/'));

app.post("/attacker", function(req, res) {
	req.write("Hi, BITCH!");
});

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