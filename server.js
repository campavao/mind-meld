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

    socket.on('ping', (msg) => {
        io.emit('pong', msg)
        console.log('pong -> ping');
    });

    socket.on('setUserId', (id) => {
        console.log('new user', id);
    });

    socket.on('create', (gameId, userInfo) => {
        if (db[gameId]) {
            io.emit('error', 'Game already exists');
        } else {
            console.dir(db, { depth: null })
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
        console.log('word, gameId, userId', word, gameId, userId);
        if (!db[gameId]) {
            console.warn('no game found for gameId: ', gameId)
            return;
        }
        const user = db[gameId]?.users.find(user => user.id === userId);
        console.dir(user, { depth: null });
        user.words.push(word);
        socket.emit('currentGame', db[gameId]);
        io.to(gameId).emit('currentGame', db[gameId]);
    })

    socket.on('disconnect', (reason) => {
        console.log(reason, socket.id, "disconnected")
    })
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log('listening on *:', port);
});
