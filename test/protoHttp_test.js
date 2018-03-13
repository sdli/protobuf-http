var tape = require("tape");
var protoHttp = require("../lib/protoHttp")

tape("Basic Test",function(t){
    t.plan(1);

    t.equal(typeof protoHttp, "function");
});


tape("Instance Test : Ready",function(t){
    var protoRequest = new protoHttp("./file.proto");
    t.plan(2);

    t.equal(typeof protoRequest, "object");
    protoRequest.on("ready",function(code,err){
        t.equal(code,10001);
    });

    protoRequest.on("error",function(code,err){
        t.equal(code, 20003);
    });

});

tape("Instance Test : Error",function(t){
    var protoRequest = new protoHttp("../lib/file_no.proto");
    t.plan(2);

    t.equal(typeof protoRequest, "object");
    protoRequest.on("error",function(code,err){
        t.equal(code,20005);
    });
});
