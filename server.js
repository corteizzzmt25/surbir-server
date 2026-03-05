const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Store connected clients
const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('New client connected');

    // Send the current network info to the new client
    const interfaces = os.networkInterfaces();
    let localIP = 'Local IP: Not found';
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                localIP = alias.address;
                break;
            }
        }
    }

    ws.send(JSON.stringify({ type: 'system', text: `Bağlandı. Yerel ağ IP: ${localIP}:${PORT}` }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            // Broadcast the message to all clients
            const broadcastData = JSON.stringify({
                type: data.type || 'chat',
                sender: data.sender || 'Misafir',
                text: data.text || '',
                data: data.data || '', // for image/audio base64
                time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
            });

            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(broadcastData);
                }
            });
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log('Client disconnected');
    });
});

function startServer(port) {
    server.listen(port, '0.0.0.0', () => {
        console.log(`Server is running on http://localhost:${port}`);
        console.log(`Other devices on the same network can access it at http://[YOUR-IP]:${port}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is busy, trying ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error(err);
        }
    });
}

startServer(PORT);

