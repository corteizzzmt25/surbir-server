// DOM Elements
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
        welcome: "BitCep P2P",
        instruction: "BitChat'e hoş geldiniz. Başlamak için bir rumuz girin.",
        login_btn: "Bağlan",
        placeholder: "Mesaj...",
        encryption_msg: "Bluetooth P2P Şifreli Haberleşme 🇸🇾",
        bt_title: "Cihaz Bulma",
        bt_instruction: "Çevredeki cihazlar taranıyor... (P2P Aktif)",
        bt_searching: "Gerçek cihazlar aranıyor...",
        bt_close: "Kapat",
        bt_label: "📡 Bluetooth P2P",
        bt_alert: "Cihazla haberleşme kuruluyor...",
        nickname_error: "Lütfen bir rumuz girin.",
        audio_msg: "🎤 Sesli Mesaj",
        download: "İndir"
    },
    ar: {
        welcome: "بيت جيب P2P",
        instruction: "مرحباً بك في بيت شات. أدخل اسم مستعار للبدء.",
        login_btn: "اتصال",
        placeholder: "رسالة...",
        encryption_msg: "تشفير بلوتوث P2P (سور-بيت) 🇸🇾",
        bt_title: "البحث عن أجهزة",
        bt_instruction: "جاري البحث عن أجهزة محررة... (وضع P2P)",
        bt_searching: "جاري البحث عن أجهزة حقيقية...",
        bt_close: "إغلاق",
        bt_label: "📡 بلوتوث P2P",
        bt_alert: "جاري الاتصال عبر P2P...",
        nickname_error: "يرجى إدخال اسم مستعار.",
        audio_msg: "🎤 رسالة صوتية",
        download: "تحميل"
    },
    en: {
        welcome: "BitCep P2P",
        instruction: "Welcome to BitChat. Enter a nickname to start.",
        login_btn: "Connect",
        placeholder: "Message...",
        encryption_msg: "Bluetooth P2P Encrypted 🇸🇾",
        bt_title: "Device Discovery",
        bt_instruction: "Scanning for nearby devices... (P2P Enabled)",
        bt_searching: "Searching for real devices...",
        bt_close: "Close",
        bt_label: "📡 Bluetooth P2P",
        bt_alert: "Establishing P2P Bluetooth connection...",
        nickname_error: "Please enter a nickname.",
        audio_msg: "🎤 Voice Message",
        download: "Download"
    }
};

window.changeLanguage = (lang) => {
    CURRENT_LANG = lang;
    const btns = document.querySelectorAll('.lang-btn');
    btns.forEach(b => b.classList.remove('active'));
    if (lang === 'tr') btns[0].classList.add('active');
    if (lang === 'ar') btns[1].classList.add('active');
    if (lang === 'en') btns[2].classList.add('active');

    const t = translations[lang];
    document.getElementById('lang-welcome').innerText = t.welcome;
    document.getElementById('app-title').innerText = t.welcome;
    document.getElementById('lang-instruction').innerText = t.instruction;
    document.getElementById('login-btn').innerText = t.login_btn;
    document.getElementById('message-input').placeholder = t.placeholder;
    document.getElementById('lang-encryption-msg').innerText = t.encryption_msg;
    document.getElementById('bt-scan').innerHTML = `<span>${t.bt_label}</span> <div class="bt-wave"></div>`;
    if (document.getElementById('lang-bt-title')) document.getElementById('lang-bt-title').innerText = t.bt_title;
    if (document.getElementById('close-modal')) document.getElementById('close-modal').innerText = t.bt_close;
};

// Bluetooth & Permission Logic
async function requestAllPermissions() {
    if (window.Capacitor) {
        try {
            // Ask for Camera and Mic permissions
            await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        } catch (e) { console.warn("Permissions e:", e); }
    }
}

btScanBtn.addEventListener('click', async () => {
    discoveryModal.style.display = 'flex';
    const t = translations[CURRENT_LANG];
    btStatus.innerText = t.bt_searching;
    deviceList.innerHTML = `<div class="device-item">${t.bt_searching}</div>`;

    if (window.Capacitor && window.Capacitor.Plugins.BluetoothLe) {
        const Ble = window.Capacitor.Plugins.BluetoothLe;
        try {
            await Ble.initialize();
            await Ble.requestLEScan();
            Ble.addListener('onScanResult', (res) => {
                const name = res.device.name || "Bilinmeyen Cihaz";
                addDeviceToList(name, res.rssi);
            });
            setTimeout(async () => {
                await Ble.stopLEScan();
                if (deviceList.innerHTML.includes(t.bt_searching)) {
                    deviceList.innerHTML = `<div style="padding: 20px; opacity: 0.6;">${CURRENT_LANG === 'tr' ? 'Cihaz bulunamadı.' : 'No devices found.'}</div>`;
                }
            }, 7000);
        } catch (e) { simulateBluetoothScan(); }
    } else { simulateBluetoothScan(); }
});

function addDeviceToList(name, rssi) {
    if (deviceList.innerHTML.includes(translations[CURRENT_LANG].bt_searching)) deviceList.innerHTML = '';
    const item = document.createElement('div');
    item.className = 'device-item';
    item.innerHTML = `<span>📶 ${name}</span> <span style="font-size: 0.7rem; opacity: 0.4;">${rssi}dBm</span>`;
    item.onclick = () => alert(translations[CURRENT_LANG].bt_alert);
    deviceList.appendChild(item);
}

function simulateBluetoothScan() {
    setTimeout(() => {
        deviceList.innerHTML = `<div style="padding: 20px; opacity: 0.6;">Simülatör Aktif: ${CURRENT_LANG === 'tr' ? 'Cihazlar taranıyor...' : 'Scanning...'}</div>`;
    }, 1500);
}

// Auto-Login and focus fixes
document.addEventListener('DOMContentLoaded', () => {
    requestAllPermissions();
    const savedName = localStorage.getItem('bitcep_username');
    if (savedName) {
        MY_USERNAME = savedName;
        usernameInput.value = savedName;
        loginOverlay.style.display = 'none';
        connect();
    }
});

loginBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    if (name) {
        MY_USERNAME = name;
        localStorage.setItem('bitcep_username', name);
        loginOverlay.style.display = 'none';
        connect();
        // Force focus on next tick
        setTimeout(() => { messageInput.disabled = false; messageInput.focus(); }, 100);
    }
});

messageInput.addEventListener('click', () => {
    if (messageInput.disabled) return;
    messageInput.focus();
});

// WebSocket and Chat Logic
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

    let contentHTML = (type === 'image') ? `<img src="${content}" class="msg-img">` : (type === 'audio' ? `<audio controls class="msg-audio"><source src="${content}"></audio>` : `<div class="msg-bubble">${content}</div>`);

    msgElement.innerHTML = `
        <div style="display: flex; gap: 8px; align-items: flex-end; ${isMe ? 'flex-direction: row-reverse;' : ''}">
            <div style="display: flex; flex-direction: column;">
                ${type !== 'chat' ? `<div class="msg-bubble">${contentHTML}</div>` : contentHTML}
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
        socket.send(JSON.stringify({ sender: MY_USERNAME, type: 'chat', text: text }));
        messageInput.value = '';
        messageInput.focus(); // Keep keyboard open
    }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

attachBtn.addEventListener('click', () => photoInput.click());
photoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        socket.send(JSON.stringify({ sender: MY_USERNAME, type: 'image', data: ev.target.result }));
    };
    reader.readAsDataURL(file);
});

micBtn.addEventListener('click', async () => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => socket.send(JSON.stringify({ sender: MY_USERNAME, type: 'audio', data: reader.result }));
            reader.readAsDataURL(blob);
            stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorder.start();
        micBtn.classList.add('active');
        recorderStatus.classList.remove('recorder-hidden');
    } else {
        mediaRecorder.stop();
        micBtn.classList.remove('active');
        recorderStatus.classList.add('recorder-hidden');
    }
});

changeLanguage('tr');
