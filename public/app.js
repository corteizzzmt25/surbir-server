const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const btScanBtn = document.getElementById('bt-scan');
const discoveryModal = document.getElementById('discovery-modal');
const closeModalBtn = document.getElementById('close-modal');
const btStatus = document.getElementById('bt-status');
const deviceList = document.getElementById('device-list');

const loginOverlay = document.getElementById('login-overlay');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');

const attachBtn = document.getElementById('attach-btn');
const micBtn = document.getElementById('mic-btn');
const photoInput = document.getElementById('photo-input');
const audioInput = document.getElementById('audio-input');

const recorderStatus = document.getElementById('recorder-status');
const recorderTime = document.getElementById('recorder-time');

let MY_USERNAME = "";
let CURRENT_LANG = 'tr';
let mediaRecorder;
let audioChunks = [];
let recordTimer;
let secondsRecord = 0;

const translations = {
    tr: {
        welcome: "BitChat P2P",
        instruction: "BitChat'e hoş geldiniz. Başlamak için bir rumuz girin.",
        login_btn: "Bağlan",
        placeholder: "Mesaj...",
        encryption_msg: "Bluetooth P2P Haberleşme Ağı 🇸🇾",
        bt_title: "Bluetooth",
        bt_instruction: "Çevredeki cihazlar aranıyor... (IPA/P2P Modu)",
        bt_searching: "Cihazlar taranıyor...",
        bt_close: "Kapat",
        bt_label: "📡 Bluetooth",
        bt_alert: "Bluetooth bağlantısı kuruluyor...",
        nickname_error: "Lütfen bir rumuz girin.",
        audio_msg: "🎤 Sesli Mesaj",
        download: "İndir"
    },
    ar: {
        welcome: "بيت شات P2P",
        instruction: "مرحباً بك في بيت شات. أدخل اسم مستعار للبدء.",
        login_btn: "اتصال",
        placeholder: "رسالة...",
        encryption_msg: "شبكة بلوتوث P2P (سور-بيت) 🇸🇾",
        bt_title: "بلوتوث",
        bt_instruction: "جاري البحث عن أجهزة... (وضع P2P)",
        bt_searching: "جاري البحث...",
        bt_close: "إغلاق",
        bt_label: "📡 بلوتوث",
        bt_alert: "جاري الاتصال عبر البلوتوث...",
        nickname_error: "يرجى إدخال اسم مستعار.",
        audio_msg: "🎤 رسالة صوتية",
        download: "تحميل"
    },
    en: {
        welcome: "BitChat P2P",
        instruction: "Welcome to BitChat. Enter a nickname to start.",
        login_btn: "Connect",
        placeholder: "Message...",
        encryption_msg: "Bluetooth P2P Network 🇸🇾",
        bt_title: "Bluetooth",
        bt_instruction: "Scanning for devices... (P2P Mode)",
        bt_searching: "Scanning...",
        bt_close: "Close",
        bt_label: "📡 Bluetooth",
        bt_alert: "Establishing Bluetooth connection...",
        nickname_error: "Please enter a nickname.",
        audio_msg: "🎤 Voice Message",
        download: "Download"
    }
};

window.changeLanguage = (lang) => {
    CURRENT_LANG = lang;
    const btns = document.querySelectorAll('.lang-btn');
    btns[0].classList.toggle('active', lang === 'tr');
    btns[1].classList.toggle('active', lang === 'ar');
    btns[2].classList.toggle('active', lang === 'en');

    const t = translations[lang];
    document.getElementById('lang-welcome').innerText = t.welcome;
    document.getElementById('lang-instruction').innerText = t.instruction;
    document.getElementById('login-btn').innerText = t.login_btn;
    document.getElementById('message-input').placeholder = t.placeholder;
    document.getElementById('lang-encryption-msg').innerText = t.encryption_msg;
    document.getElementById('bt-scan').innerText = t.bt_label;
};

// Handle File Attachments
attachBtn.addEventListener('click', () => {
    photoInput.click();
});

photoInput.addEventListener('change', (e) => handleFileUpload(e.target.files[0], 'image'));

async function handleFileUpload(file, type) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const payload = {
            sender: MY_USERNAME,
            type: type,
            data: e.target.result
        };
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(payload));
        }
    };
    reader.readAsDataURL(file);
}

// Voice Recording Logic
micBtn.addEventListener('click', async () => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        startRecording();
    } else {
        stopRecording();
    }
});

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = async () => {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        sender: MY_USERNAME,
                        type: 'audio',
                        data: reader.result
                    }));
                }
            };
            reader.readAsDataURL(blob);
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        micBtn.classList.add('active');
        recorderStatus.classList.remove('recorder-hidden');

        secondsRecord = 0;
        recordTimer = setInterval(() => {
            secondsRecord++;
            const m = Math.floor(secondsRecord / 60).toString().padStart(2, '0');
            const s = (secondsRecord % 60).toString().padStart(2, '0');
            recorderTime.innerText = `${m}:${s}`;
        }, 1000);

    } catch (err) {
        alert(CURRENT_LANG === 'tr' ? "Mikrofon izni gerekli." : "Microphone permission required.");
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        micBtn.classList.remove('active');
        recorderStatus.classList.add('recorder-hidden');
        clearInterval(recordTimer);
    }
}

// Bluetooth Logic for Mobile IPA
btScanBtn.addEventListener('click', () => {
    discoveryModal.style.display = 'flex';
    const t = translations[CURRENT_LANG];

    // Check for native Bluetooth plugins (Capacitor/Cordova)
    if (window.bluetoothSerial || (window.Capacitor && window.Capacitor.Plugins.BluetoothLe)) {
        btStatus.innerText = t.bt_searching;
        // Native Bluetooth Scan Logic here
    } else {
        btStatus.innerText = t.bt_instruction;
        simulateBluetoothScan();
    }
});

function simulateBluetoothScan() {
    const t = translations[CURRENT_LANG];
    deviceList.innerHTML = `<div class="device-item">${t.bt_searching}</div>`;
    setTimeout(() => {
        deviceList.innerHTML = `
            <div class="device-item" onclick="alert('${t.bt_alert}')">📱 iPhone 13 (P2P)</div>
            <div class="device-item" onclick="alert('${t.bt_alert}')">📱 Galaxy S22 (P2P)</div>
            <div class="device-item" onclick="alert('${t.bt_alert}')">📱 Tablet-Sur (P2P)</div>
        `;
    }, 1500);
}

closeModalBtn.addEventListener('click', () => {
    discoveryModal.style.display = 'none';
});

// Login Logic
loginBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    if (name) {
        MY_USERNAME = name;
        loginOverlay.style.display = 'none';
        connect();
    } else {
        alert(translations[CURRENT_LANG].nickname_error || "Nickname required");
    }
});

// WebSocket Connection (Fallback for local testing)
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${protocol}//${window.location.host}`;
let socket;

function connect() {
    socket = new WebSocket(wsUrl);
    socket.onopen = () => {
        messageInput.disabled = false;
        sendBtn.disabled = false;
    };
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const isMe = data.sender === MY_USERNAME;
        appendMessage(data.sender, data.text || data.data, data.time, isMe, data.type);
    };
}

function appendMessage(sender, content, time, isMe, type = 'chat') {
    const msgElement = document.createElement('div');
    msgElement.classList.add('message');
    msgElement.classList.add(isMe ? 'sent' : 'received');

    let contentHTML = "";
    if (type === 'image') {
        contentHTML = `
            <div style="position: relative;">
                <img src="${content}" class="msg-img">
                <a href="${content}" download="bit_image_${Date.now()}.png" class="download-btn" title="${translations[CURRENT_LANG].download}">📥</a>
            </div>`;
    } else if (type === 'audio') {
        contentHTML = `<div style="font-size: 0.8rem; margin-bottom: 5px; opacity: 0.8;">${translations[CURRENT_LANG].audio_msg}</div>
                       <audio controls class="msg-audio"><source src="${content}"></audio>`;
    } else {
        contentHTML = `<div class="msg-bubble">${content}</div>`;
    }

    msgElement.innerHTML = `
        <div style="display: flex; gap: 8px; align-items: flex-end; ${isMe ? 'flex-direction: row-reverse;' : ''}">
            <div style="display: flex; flex-direction: column;">
                ${(type === 'image' || type === 'audio') ? `<div class="msg-bubble">${contentHTML}</div>` : contentHTML}
                <div class="msg-meta">${isMe ? '' : sender + ' • '}${time}</div>
            </div>
        </div>
    `;

    messagesDiv.appendChild(msgElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function sendMessage() {
    const text = messageInput.value.trim();
    if (text && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            sender: MY_USERNAME,
            type: 'chat',
            text: text
        }));
        messageInput.value = '';
    }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') loginBtn.click(); });

changeLanguage('tr');
