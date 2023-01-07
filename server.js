import { addWordToUserList, createGame, resetUserList, joinGame, removePlayer, removeRoom } from './firebase.js';

import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
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

// const db = {
//     test: {
//         users: [{
//             name: 'user1',
//             id: 1234,
//             words: ['apple', 'banana']
//         }, {
//             name: 'user2',
//             id: 1235,
//             words: ['plane', 'lime']
//         }],
//         isComplete: false,
//         id: 1
//     }
// };

const getGameIdFromSocket = (socketId) => socketId.slice(0, 4).toUpperCase();

io.on('connection', (socket) => {
  console.log('a user connected');

    socket.on('create', async (userInfo) => {
        const gameId = getGameIdFromSocket(socket.id);
        const game = await createGame(gameId, userInfo);

        if (game.exists()) {
            socket.data = { userInfo, gameId, ref: game.id };
            socket.join(gameId);
            socket.emit('currentGame', {
                ref: game.id,
                ...game.data()
            });
        } else {
            io.to(socket.id).emit('error', `Game failed to create. Code: ${gameId}`);
        }
    })

    socket.on('game', async (gameId, userInfo) => {
        try {
            const updatedDoc = await joinGame(gameId, userInfo);
            socket.data = { userInfo, gameId, ref: updatedDoc.id };

            socket.join(gameId);
            io.to(gameId).emit('currentGame', {
                ref: updatedDoc.id,
                ...updatedDoc.data()
            });
        } catch (err) {
            console.log(err)
            io.to(socket.id).emit('error', 'Game does not exist');
        }
    });

    socket.on('word', async ({ word }) => {
        try {
            const { userInfo: { id: userId }, ref: refId, gameId } = socket.data;
            const updatedDoc = await addWordToUserList(userId, refId, word);

            io.to(gameId).emit('currentGame', {
                ref: updatedDoc.id,
                ...updatedDoc.data()
            });

        } catch (err) {
            io.to(socket.id).emit('error', err);
        }

    })

    socket.on('disconnect', async (reason) => {
        const { gameId, userInfo, ref } = socket.data;

        const clients = io.sockets.adapter.rooms.get(gameId);
        const numClients = clients?.size ?? 0;

        if (numClients < 1) {
            await removeRoom(ref);
        }

        io.to(gameId).emit('error', ` ${userInfo?.name ?? 'Someone'} has disconnected.`);
        console.log(reason, "disconnected");
    })

    socket.on('reset', async ({ id }) => {
        try {
            const { ref } = socket.data;
            const game = await resetUserList(ref);
            io.to(id).emit('currentGame', {
                ref: game.id,
                ...game.data()
            });
        } catch (err) {
            console.error(err);
            io.to(id).emit('error', err)
        }
    })

    socket.on('removePlayer', async (playerId) => {
        const { gameId, ref } = socket.data;
        const updatedDoc = await removePlayer(playerId, ref, gameId);

        io.to(gameId).emit('currentGame', {
            ref: updatedDoc.id,
            ...updatedDoc.data()
        });
    })
});


const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log('listening on *:', port);
});
