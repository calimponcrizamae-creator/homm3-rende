const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const players = new Map();
let onlineCount = 0;

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('AUTHENTICATE', (data) => {
        const player = { 
            id: socket.id, 
            username: data?.username || 'Gracz_' + Math.floor(Math.random()*9999),
            faction: data?.faction || 'CASTLE'
        };
        players.set(socket.id, player);
        onlineCount++;
        
        socket.emit('AUTHENTICATED', { 
            success: true, 
            user: player, 
            heroes: [{
                id: 1,
                name: 'Bohater',
                faction: player.faction,
                level: 1
            }], 
            castles: [{
                id: 1,
                name: 'Zamek',
                faction: player.faction
            }],
            gameState: { current_turn: 1, time_remaining: 600 }
        });
        io.emit('PLAYER_JOINED', { onlinePlayers: onlineCount });
    });
    
    socket.on('CHAT_MESSAGE', (data) => {
        const player = players.get(socket.id);
        if (player) {
            io.emit('CHAT_MESSAGE', {
                username: player.username,
                message: data.message,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        if (players.has(socket.id)) {
            const player = players.get(socket.id);
            players.delete(socket.id);
            onlineCount = Math.max(0, onlineCount - 1);
            io.emit('PLAYER_LEFT', { onlinePlayers: onlineCount });
        }
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', players: onlineCount, version: '1.0.0' });
});

app.get('/api/players', (req, res) => {
    const playersList = Array.from(players.values()).map(p => ({
        id: p.id,
        username: p.username,
        faction: p.faction
    }));
    res.json({ players: playersList, count: playersList.length });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('🏰 Heroes of Might and Magic III - Złota Edycja ONLINE');
    console.log('⚔️  Serwer na porcie ' + PORT);
    console.log('👥 Server ready!');
});
