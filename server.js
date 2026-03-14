const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    maxHttpBufferSize: 20e6 // 20 MB for photos
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '20mb' }));

// ===================== IN-MEMORY DB =====================
// In production you'd use a real DB. For local/demo use memory.
const users = {};       // { email: { id, email, username, passwordHash, profilePhoto, createdAt } }
const usernameIndex = {}; // { username_lowercase: email }
const sessions = {};    // { token: email }
const stories = [];     // [{ id, authorEmail, authorUsername, media, mediaType, text, createdAt, expiresAt }]
const messages = {};    // { roomKey: [{ id, from, fromUsername, type, content, time }] }
const onlineUsers = {}; // { socketId: { email, username } }

// ===================== HELPERS =====================
function getRoomKey(emailA, emailB) {
    return [emailA, emailB].sort().join('::');
}

function cleanExpiredStories() {
    const now = Date.now();
    for (let i = stories.length - 1; i >= 0; i--) {
        if (stories[i].expiresAt < now) stories.splice(i, 1);
    }
}

function generateToken() {
    return uuidv4() + '-' + uuidv4();
}

function getUserByToken(token) {
    const email = sessions[token];
    if (!email) return null;
    return users[email] || null;
}

// ===================== REST API =====================

// Register
app.post('/api/register', async (req, res) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password) return res.status(400).json({ error: 'Eksik alan.' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Geçersiz e-posta.' });
    if (username.length < 3 || username.length > 20) return res.status(400).json({ error: 'Kullanıcı adı 3-20 karakter olmalı.' });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Kullanıcı adı sadece harf, rakam ve _ içerebilir.' });
    if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı.' });

    const emailLow = email.toLowerCase();
    const usernameLow = username.toLowerCase();

    if (users[emailLow]) return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı.' });
    if (usernameIndex[usernameLow]) return res.status(409).json({ error: 'Bu kullanıcı adı alınmış.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = { id: uuidv4(), email: emailLow, username, passwordHash, profilePhoto: '', createdAt: Date.now() };
    users[emailLow] = user;
    usernameIndex[usernameLow] = emailLow;

    const token = generateToken();
    sessions[token] = emailLow;

    res.json({ token, user: { id: user.id, email: user.email, username: user.username, profilePhoto: user.profilePhoto } });
});

// Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Eksik alan.' });

    const emailLow = email.toLowerCase();
    const user = users[emailLow];
    if (!user) return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });

    const token = generateToken();
    sessions[token] = emailLow;
    res.json({ token, user: { id: user.id, email: user.email, username: user.username, profilePhoto: user.profilePhoto } });
});

// Delete account
app.delete('/api/account', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ error: 'Yetkisiz.' });

    // Remove all sessions for user
    for (const [t, em] of Object.entries(sessions)) {
        if (em === user.email) delete sessions[t];
    }
    delete usernameIndex[user.username.toLowerCase()];
    delete users[user.email];

    res.json({ ok: true });
});

// Check username availability
app.get('/api/check-username/:username', (req, res) => {
    const uname = req.params.username.toLowerCase();
    res.json({ available: !usernameIndex[uname] });
});

// Search users by username
app.get('/api/search-user/:query', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const me = getUserByToken(token);
    if (!me) return res.status(401).json({ error: 'Yetkisiz.' });
    const q = req.params.query.toLowerCase();
    const results = [];
    for (const [unameLow, email] of Object.entries(usernameIndex)) {
        if (email === me.email) continue; // skip self
        if (unameLow.includes(q)) {
            const u = users[email];
            results.push({ username: u.username, profilePhoto: u.profilePhoto || '' });
        }
        if (results.length >= 20) break;
    }
    res.json(results);
});

// Update profile photo
app.post('/api/profile-photo', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ error: 'Yetkisiz.' });
    const { photo } = req.body;
    if (!photo) return res.status(400).json({ error: 'Fotoğraf gerekli.' });
    user.profilePhoto = photo;
    // Notify online users about profile update
    io.emit('profile_update', { username: user.username, profilePhoto: photo });
    res.json({ ok: true });
});

// Get stories
app.get('/api/stories', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!getUserByToken(token)) return res.status(401).json({ error: 'Yetkisiz.' });
    cleanExpiredStories();
    res.json(stories.map(s => ({
        id: s.id,
        authorUsername: s.authorUsername,
        mediaType: s.mediaType,
        media: s.media,
        text: s.text,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt
    })));
});

// Post story
app.post('/api/stories', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ error: 'Yetkisiz.' });

    const { media, mediaType, text } = req.body;
    if (!media && !text) return res.status(400).json({ error: 'Hikaye boş olamaz.' });

    const story = {
        id: uuidv4(),
        authorEmail: user.email,
        authorUsername: user.username,
        media: media || '',
        mediaType: mediaType || 'text',
        text: text || '',
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
    };
    stories.unshift(story);

    io.emit('new_story', {
        id: story.id,
        authorUsername: story.authorUsername,
        mediaType: story.mediaType,
        media: story.media,
        text: story.text,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt
    });

    res.json({ ok: true, story: { id: story.id } });
});

// Delete own story
app.delete('/api/stories/:id', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ error: 'Yetkisiz.' });

    const idx = stories.findIndex(s => s.id === req.params.id && s.authorEmail === user.email);
    if (idx === -1) return res.status(404).json({ error: 'Bulunamadı.' });
    stories.splice(idx, 1);
    io.emit('delete_story', { id: req.params.id });
    res.json({ ok: true });
});

// ===================== SOCKET.IO =====================
io.on('connection', (socket) => {
    let currentUser = null;

    socket.on('authenticate', ({ token }) => {
        const user = getUserByToken(token);
        if (!user) { socket.emit('auth_error', { error: 'Geçersiz oturum.' }); return; }
        currentUser = user;
        onlineUsers[socket.id] = { email: user.email, username: user.username };
        socket.emit('authenticated', { user: { id: user.id, email: user.email, username: user.username } });
        io.emit('online_users', Object.values(onlineUsers).map(u => u.username));
    });


    // Chat message via Socket.IO (internet mode)
    socket.on('chat_message', ({ toUsername, type, content }) => {
        if (!currentUser) return;
        const targetEntry = Object.entries(onlineUsers).find(([, u]) => u.username === toUsername);
        const roomKey = getRoomKey(currentUser.email, targetEntry ? users[targetEntry[1].email]?.email : toUsername);
        const msg = {
            id: uuidv4(),
            from: currentUser.email,
            fromUsername: currentUser.username,
            type: type || 'text',
            content,
            time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        };
        if (!messages[roomKey]) messages[roomKey] = [];
        messages[roomKey].push(msg);

        // Send to target if online
        if (targetEntry) {
            io.to(targetEntry[0]).emit('chat_message', msg);
        }
        // Echo back to sender
        socket.emit('chat_message_sent', msg);
    });

    socket.on('disconnect', () => {
        delete onlineUsers[socket.id];
        io.emit('online_users', Object.values(onlineUsers).map(u => u.username));
    });
});

// ===================== START =====================
function startServer(port) {
    server.listen(port, '0.0.0.0', () => {
        console.log(`\n🚀 Surbit sunucu çalışıyor: http://localhost:${port}`);
        console.log(`   Yerel ağda: http://[IP]:${port}`);
        console.log(`   İnternet üzerinden Ngrok/Cloudflare Tunnel kullanabilirsiniz.\n`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} dolu, ${port + 1} deneniyor...`);
            startServer(port + 1);
        } else {
            console.error(err);
        }
    });
}

startServer(PORT);
