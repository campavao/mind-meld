const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static(path.resolve(__dirname, './build')));

app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, './build', 'index.html'));
});


app.get('/api/game/:gameId', (req, res) => {
  res.json({ message: 'hello world'});
});

// app.get('/game/:gameId', (req, res) => {
//     res.json({ message: 'game id', gameId: req });
//     console.log('gameid', req)
//   });

const db = {
    test: {
        users: [{
            name: 'user1',
            id: 1234,
            words: ['apple', 'banana']
        }, {
            name: 'user2',
            id: 1235,
            words: ['plane', 'lime']
        }],
        isComplete: false,
        id: 1
    }
};

io.on('connection', (socket) => {
  console.log('a user connected');

    socket.on('create', (gameId, userInfo) => {
        if (db[gameId]) {
            io.emit('error', 'Game already exists');
        } else {
            db[gameId] = {
                users: [userInfo],
                id: gameId
            };
            socket.join(gameId);
            io.to(gameId).emit('currentGame', db[gameId]);
            // socket.emit('currentGame', db[gameId])
        }
    })

    socket.on('game', (gameId, userInfo) => {
        if (!db[gameId]) {
            io.emit('error', 'Game does not exist');
        } else {
            db[gameId].users.push(userInfo)
            socket.emit('currentGame', db[gameId])
            socket.join(gameId);
            io.to(gameId).emit('currentGame', db[gameId]);

            // socket.broadcast.emit('currentGame', db[gameId])
        }
    });

    socket.on('word', ({ word, gameId, userId }) => {
        if (!db[gameId]) {
            console.warn('no game found for gameId: ', gameId)
            return;
        }
        const user = db[gameId]?.users.find(user => user.id === userId);
        user.words.push(word);
        socket.emit('currentGame', db[gameId]);
        io.to(gameId).emit('currentGame', db[gameId]);
    })

    socket.on('disconnect', (reason) => {
        console.log(reason, "disconnected")
    })

    socket.on('reset', (gameId) => {
        console.log(socket.id, gameId);
        db[gameId].users = db[gameId].users.map(user => ({
            ...user,
            words: []
        }));
        socket.emit('currentGame', db[gameId]);
        socket.broadcast.emit('currentGame', db[gameId]);
    })
});

const port = process.env.PORT || 3001;

server.listen(port, () => {
  console.log('listening on *:', port);
});
