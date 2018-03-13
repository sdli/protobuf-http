"use strict";
module.exports = protoBufRequest;

var http 					= require("http"),
	https 					= require("https"),
	protoBuf 				= require("protobufjs"),
	uitls 					= require("util"),
	path 					= require("path"),
	eventEmitter 			= require("events").EventEmitter,

	// events management
	events              = 
	{
	    ready           : "ready", // when http/https is ready
		// responese       : "responese",// when protobuf end request
		// error code: 20001(one or more resps matches no reqs), 20002(no req method in proto file), 20003(http(s) request error), 20004(no message found), 20005( protofile load error)
	    error           : "error", 
	    // startRequest    : "startRequest",
	    // requestEnd      : "requestEnd"
	},

	// prototype and function bind
	protoConfigs =
		{
			loadProto		: loadProto,
			getDictionary	: getDictionary,
			httpRequest		: httpRequest,
			httpsRequest	: httpsRequest,
			allRequest		: allRequest,
			createReqBuffer	: createReqBuffer,
			decodeBuffer	: decodeBuffer
		};


/**
 * class / contructor for http/https request in protobufMode
 * @param {String} protoFile  path to protoFile
 */
function protoBufRequest(filePath) {


	// dictionary includes : method name for request and response messages
	// requests and response message should written in pattern like below:
	// ***
	// message userInfoReq { ... }
	// message userInfoResp { ... }
	// ***
	// notice: key word Req and Resp must be added in your proto file!!
	this._dictionary 		= {};
	this._filePath 			= path.resolve(filePath); // file path
	this._root 				= {}; // create an empty object for root
	this._package 			= "";
	this._rand 				= 0;

	// copy eventEmitter 
	eventEmitter.call(this);

	// load proto file and give set _root properties
	this.loadProto();

	this.on(events.error, function (code,err) {
		console.error(err);
	});

	this.on(events.ready,function(code,err){
	});
}

uitls.inherits(protoBufRequest, eventEmitter);

/**
 * load protoConfigs
 */
for (var protoItem in protoConfigs) {
	protoBufRequest.prototype[protoItem] = protoConfigs[protoItem];
}

/**
 * load proto file and emit "ready" event
 */
function loadProto() {
	var self = this;
	protoBuf.load(self._filePath, function (err, root) {
		if (err) {
			self.emit("error", 20005,"load proto file error!");
			throw Error(err);
		} else {
			self._root = root;
			self.getDictionary();
			self._rand = parseInt(Math.random(0, 1) * 1000);
			self.emit("ready", 10001);
		}
	});
}

/**
 * extract dictionary from root  
 */
function getDictionary() {
	var obj = {},
		reqPattern 			= new RegExp(/Req\b/),
		respPattern 		= new RegExp(/Resp\b/),
		tempReqs 			= [],
		tempResps 			= [],
		returnObj 			= {},
		self 				= this;

	// collect reqs and resps for dictionary
	for (var i in self._root.nested) { obj = self._root.nested[i]; self._package = i; break; }
	for (var j in obj) {
		reqPattern.test(j)
			? tempReqs.push(j)
			: (
				(respPattern.test(j))
					? tempResps.push(j)
					: null
			);
	}

	// turn array into obj for dictionary
	if (tempReqs.length == 0) {
		self.emit("error", 20002,"no Req found in your proto file, please check your proto file and its message name; see more: http://github.com/sdli/");
	} else {
		for (var n = 0; n < tempReqs.length; n++) {
			var reqName = tempReqs[n].split(/Req\b/)[0];
			var respName = tempResps[tempResps.indexOf(reqName + "Resp")];
			if (respName == "" || typeof respName === "undefined") {
				self.emit("error", 20001 ,"no Resp found for message [" + reqName + "]");
			}
			returnObj[tempReqs[n]] = respName;
		}
		self._dictionary = returnObj;
		self.emit("dictionaryReady");
	}
}


/**
 * httpReqeust and httsRequest
 * @param {Object} options includes headers body 
 * @param {Function} cb callback function 
 */
function httpRequest(options, cb) {
	var self = this;
	return allRequest(self)(options, cb);
}
function httpsRequest(options, cb) {
	var self = this;
	return allRequest(self, true)(options, cb);
}

/**
 * request for http and https
 * @param {Object} self class pointer 
 * @param {Bool} ifHttps if https needed 
 */
function allRequest(self, ifHttps) {
	return function (options, cb) {
		if ("message" in options && options.message in self._dictionary) {
			var reqBuffer = self.createReqBuffer(options);
			var httpReq =
				ifHttps
					? https.request(
						Object.assign(options, { body: reqBuffer }),  // add reqBuffer into request body
						function (res) {
							responseHandler(res, self, cb, options);
						}
					)
					: http.request(
						Object.assign(options, { body: reqBuffer }),  // add reqBuffer into request body
						function (res) {
							responseHandler(res, self, cb, options);
						}
					);
			httpReq.write(reqBuffer);
			httpReq.end();
			httpReq.on("error", function (e) {
				self.emit("error", 20003, e.message);
			});
		} else {
			self.emit("error", 20004, "[reqMethod] is not in options or not in proto file ,add it in options or protofile and try again!");
		}
	};
}

/**
 * handle responses
 * @param {object} res 
 * @param {object} self 
 * @param {function} cb 
 * @param {object} options 
 */
function responseHandler(res, self, cb, options) {
	var buffArray = [];
	
	res.on("data", function (chunk) {
		buffArray.push(chunk);
	});
	res.on("end", function () {
		var responseBuffer 		= Buffer.concat(buffArray);
		var decodedBuffer 		= self.decodeBuffer(options, responseBuffer);

		// eventually, type of decodedBuffer is object
		self.emit("requestEnd", decodedBuffer);
		cb(decodedBuffer);
	});
}

/** 
 * create request buffer body by message name
 * @param {Object} options 
*/
function createReqBuffer(options) {
	var self = this;
	var AwesomeMessage 		= self._root.lookup(self._package + "." + options.message);
	var dataTable 			= options.body ? options.body : null;
	try {
		var message = AwesomeMessage.create(dataTable);
		var buffer = AwesomeMessage.encode(message).finish();
	} catch (e) {
		if (e) throw "Error in Changing Data into buffer!";
	}
	return buffer;
}

/**
 * decode buffer
 * @param {object} options 
 * @param {buffer} buffer recieved buffer data
 */
function decodeBuffer(options, buffer) {
	var self = this;
	var receiveMsg 		= self._root.lookup(self._package + "." + self._dictionary[options.message]);
	var message 		= receiveMsg.decode(buffer);
	var returnObj 		= receiveMsg.toObject(message, {
		enums: String,  // enums as string names
		longs: String,  // longs as strings (requires long.js)
		bytes: String,  // bytes as base64 encoded strings
		defaults: true, // includes default values
		arrays: true,   // populates empty arrays (repeated fields) even if defaults=false
		objects: true,  // populates empty objects (map fields) even if defaults=false
		oneofs: true    // includes virtual oneof fields set to the present field's name
	});
	return returnObj;
}


