const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users.js') ;

const PORT = process.env.PORT || 5000;

const router = require('./router');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
    cors: {
        origin: '*',
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.on('connect', (socket)=>{
    socket.on('join', ({ name, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, name, room });
    
        if(error) return callback(error);
    
        socket.join(user.room);
    
        socket.emit('message', { user: 'app message', text: `${user.name}, welcome to room ${user.room}.`});
        socket.broadcast.to(user.room).emit('message', { user: 'app message', text: `${user.name} has joined!` });
    
        io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
    
        callback();
      });

    socket.on('sendMessage', (message, callback)=>{
        const user = getUser(socket.id);

        io.to(user.room).emit('message', { user: user.name, text: message });

        if(callback) callback();
    });

    socket.on('disconnect', ()=>{
        const user = removeUser(socket.id);

        if (user){
            io.to(user.room).emit('message', { user: 'app message', text: `${user.name} has left`});
            io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
        }
    });
});

app.use(router);
app.use(cors());

server.listen(PORT, ()=> console.log(`Server has started on port ${PORT}`));