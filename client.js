var socket = require('socket.io-client')('http://localhost:1213');
socket.on('connect', function(){
	socket.emit('request', /* */); // emit an event to the socket
  	socket.on('reply', function(){ /* */ }); // listen to the event
});
socket.on('event', function(data){});
socket.on('disconnect', function(){});