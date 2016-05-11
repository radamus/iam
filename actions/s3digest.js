var AWS = require("aws-sdk");

AWS.config.loadFromPath('./config.json');

var task =  function(request, callback){
	var bucket = request.query["bucket"];
	var key = request.query["key"];


}

exports.action = task
