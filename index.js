var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var game = require('./game');
game.globals(io);

app.use(express.static(__dirname + '/public'));
// app.get('/', function(req, res) {
//     res.sendFile('public/index.html');
// });

io.on('connection', function(socket){
    // add the user
    game.newUser(socket);

    // someone chooses an answer
    socket.on('choose answer', function(data) {
        io.emit('choose answer', game.on.chooseAnswer(data.col, data.i));
    });

    // user buzzes in
    socket.on('buzz in', function(data){
        io.emit('buzzed in', game.on.buzzIn(socket.id));
    });

    // user selects a question
    socket.on('choose question', function(data) {
        io.emit('choose question', game.on.chooseQuestion(data.key));
    });

    socket.on('error', function(data) {
        console.log(data);
    });
    socket.on('disconnect', function(){
        game.removeUser(socket);
    });
});


http.listen(3000, function(){
  console.log('listening on *:3000');
});