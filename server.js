function guid() {
    function s4() {
	return Math.floor((1 + Math.random()) * 0x10000)
	    .toString(16)
	    .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
	s4() + '-' + s4() + s4() + s4();
}

var http = require("http");
var server = http.createServer(function(req,res) {
    res.write("Hello World!!");
    res.end();
});

var io = require('socket.io')(server);

var nsp = io.of('/ponyo');
nsp.on('connection', function(socket){
    console.log('someone connected');
});
nsp.emit('hi','ponyo room');

var rooms = [];

function create_room(user_id, name) { 
    var room_id = guid();
    rooms.push([room_id, user_id, name]);
    console.log("created room: " + room_id);
    return room_id;
}

function pop_room() {
    var room_id = rooms.shift();
    console.log("popped room: " + room_id);
    return room_id;
}

function search_room(obj, socket) {
    var user_id = obj["user_id"];
    var name = obj["name"];
    if (rooms.length == 0) { // host
	var room_id = create_room(user_id, name);	
    } else { // guest
	var ary = pop_room();
	var room_id = ary[0];
	var host_id = ary[1];
	var host_name = ary[2];	
	if (user_id == host_id) {
	    create_room(user_id, name);
	    return;
	}	

	io.emit(user_id, {
	    role: "guest",
	    room_id: room_id,
	    host_name: host_name
	});
	
	io.emit(host_id, {
	    role: "host",		
	    room_id: room_id,
	    guest_name: name
	});	    	    
	
	socket.on("room_" + room_id + "_host", function(obj) {
	    io.emit("room_client_" + room_id + "_guest", obj);		    
	});

	socket.on("room_" + room_id + "_guest", function(obj) {
	    io.emit("room_client_" + room_id + "_host", obj);
	});	    	
    }
}

io.on('connection', function(socket) {
    console.log("client connected!!")

    socket.on('disconnect', function() {
        console.log("client disconnected!!")
    });
    socket.on("from_client", function(obj){
        console.log(obj);
        echo(obj);
    });        

    socket.on("search_room", function(obj) {
	search_room(obj, socket);
    });
});

var echo = function(obj) {
    io.emit("from_server", obj);
    console.log("echoed");
};

var send_servertime = function() {
    var now = new Date();
    io.emit("from_server", now.toLocaleString());
    console.log(now.toLocaleString());
    setTimeout(send_servertime, 1000)
};
//send_servertime();


server.listen(8080);
