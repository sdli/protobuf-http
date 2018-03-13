## A nodejs and protobufjs based http request method;

### You can use protobuf-http just like [nodejs-http.request](https://nodejs.org/api/http.html) or [https.request](https://nodejs.org/api/https.html)

##### 1. install 
```
npm install protobuf-http --save 
```
##### 2. add a protobuf.proto in your project just like below

```
// message name must includes string "Req"
message CourseReq
{
}

// message name must includes string "Resp"
message CourseResp
{
	int32 Result = 1;
	string ErrMsg = 2;
}
```
**NOTICE: Your message name is very important in this tools, and use "Req" for request or "resp" for responese in your message name**

##### 3. require / import protobuf-http , add message name in your httpReqeust options

```javascript

// express + protobuf_http demo
var protobuf_http = require("protobuf-http");
var express = require("express");

var pbhttp = new protobuf_http("path_to_your_proto_file");
var app = new app();


pbhttp.on("ready",function(){

    app.get("/",function(){
        //....make http request here
        pbhttp.httpRequest({
            headers: {},
            message: "courseReq", // message name here
            host: "",
            body: {
                // your req body
            }
        },  function(res){
                // do something with res data 
        });
    });

    app.listen(8080,function(){});
});
```

