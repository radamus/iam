var AWS = require("aws-sdk");
var helpers = require("../helpers");
var log = console.log;
AWS.config.loadFromPath('./config.json');

var errorResult = function(err,user, result){
  result.push({user : user.UserName, error : err});
};

var processUsersArray = function(iam, users, result, operation, onElemError, onElemData, callback){
  if(users.length > 0){
    var user = users.shift();
    operation(user, function(err, data){
      if(err){
        onElemError(err, user, result);
      }else {
        onElemData(data,user, result);
      }
      processUsersArray(iam, users, result, operation, onElemError, onElemData, callback);
    });
  }else{
    callback(result);
}
}

var getGroup = function(iam, users, result, callback){
  processUsersArray(iam, users, result, function(user, callback){
    iam.getGroup(user,callback);
  }, errorResult, function(data,user, result){
    log(data);
    data.Users.forEach(function(elem){
      log(elem);
      result.push({"UserName":elem.UserName});
      });
  }, callback);
}
var listAccessKeys = function(iam, users, result, callback){
  processUsersArray(iam, users, result, function(user, callback){
    iam.listAccessKeys(user,callback);
  }, errorResult, function(data,user, result){
    data.AccessKeyMetadata.forEach(function(elem){
      log(elem);
      result.push({"UserName":elem.UserName, "AccessKeyId":elem.AccessKeyId});
      });
  }, callback);
}

var createSingleAccessKey = function(iam, users, result, callback){
  processUsersArray(iam, users, result, function(user, callback){
    iam.createAccessKey(user,callback);
  } , errorResult, function(data, user, result){
    result.push(data.AccessKey);
  }, callback);
}
var deleteSingleKey = function(iam, users, result, callback){
  processUsersArray(iam, users, result, function(user, callback){
    iam.deleteAccessKey(user,callback);
  }, errorResult, function(data, user, result){
    result.push({"user" : user.UserName, "result" : data});
  }, callback);
}


var process = function(iam, users, processor, callback){
  var result = [];
  processor(iam, users, result, callback);

}

var rotate = function(iam, users, result, callback){
  process(iam, users.concat(), deleteUsersKeys, function(deleteResult){
    process(iam, users.concat(), createSingleAccessKey, function(createResult){
      callback(deleteResult.concat(createResult));
    });
  });
}
var deleteUsersKeys = function(iam, users, result, callback){
  process(iam, users.concat(), listAccessKeys, function(listResult){
    process(iam, listResult, deleteSingleKey, function(deleteResult){
      callback(deleteResult);
    });
  });
}
var unknownAction = function(iam, users, result, callback){
  callback([{"result": "unknown Action"}]);
}

var listUsers = function(iam, users, result, callback){
  callback(users);
}

var getCommand = function(action){
  var command;
  switch (action) {
    case 'delete':
      command = deleteUsersKeys;
      break;
      case 'create':
        command = createSingleAccessKey;
        break;
      case 'rotate':
          command = rotate;
          break;
      case 'list':
            command = listAccessKeys;
          break;
      case 'users':
        command = listUsers;
        break;
    default:
      command = unknownAction;

  }
  return command;
}

var task =  function(request, callback){
  log(request.query);
  var action = request.query['action'];
  var groupName = request.query['group'];
  var param = [{GroupName : groupName}];
	var iam = new AWS.IAM();
  process(iam, param, getGroup, function(users) {
    log(param);
    log(users);
    process(iam, users.concat(), getCommand(action), function(result) {
      callback(null, result);
    });
  });
}

exports.action = task
