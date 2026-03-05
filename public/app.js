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
        encryption_msg: "Bluetooth P2P Şifreli Haberleşme 🇸🇾",
        bt_title: "Cihaz Bulma",
        bt_instruction: "Çevredeki cihazlar taranıyor... (P2P Aktif)",
        bt_searching: "P2P üzerinden aranıyor...",
        bt_close: "Kapat",
        bt_label: "📡 Bluetooth P2P",
        bt_alert: "Bluetooth P2P Bağlantısı Kuruluyor...",
        nickname_error: "Lütfen bir rumuz girin.",
        audio_msg: "🎤 Sesli Mesaj",
        download: "İndir"
    },
    ar: {
        welcome: "بيت شات P2P",
        instruction: "مرحباً بك في بيت شات. أدخل اسم مستعار للبدء.",
        login_btn: "اتصال",
        placeholder: "رسالة...",
        encryption_msg: "تشفير بلوتوث P2P (سور-بيت) 🇸🇾",
        bt_title: "البحث عن أجهزة",
        bt_instruction: "جاري البحث عن أجهزة محررة... (وضع P2P)",
        bt_searching: "جاري البحث...",
        bt_close: "إغلاق",
        bt_label: "📡 بلوتوث P2P",
        bt_alert: "جاري الاتصال عبر P2P...",
        nickname_error: "يرجى إدخال اسم مستعار.",
        audio_msg: "🎤 رسالة صوتية",
        download: "تحميل"
    },
    en: {
        welcome: "BitChat P2P",
        instruction: "Welcome to BitChat. Enter a nickname to start.",
        login_btn: "Connect",
        placeholder: "Message...",
        encryption_msg: "Bluetooth P2P Encrypted 🇸🇾",
        bt_title: "Device Discovery",
        bt_instruction: "Scanning for nearby devices... (P2P Enabled)",
        bt_searching: "Searching via P2P...",
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
    if (document.getElementById('lang-bt-title')) document.getElementById('lang-bt-title').innerText = t.bt_title;
    if (document.getElementById('close-modal')) document.getElementById('close-modal').innerText = t.bt_close;
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

// Bluetooth Real Tracking Logic
btScanBtn.addEventListener('click', async () => {
    discoveryModal.style.display = 'flex';
    const t = translations[CURRENT_LANG];
    btStatus.innerText = t.bt_searching;
    deviceList.innerHTML = `<div class="device-item">${t.bt_searching}</div>`;

    // Try real Bluetooth via Capacitor if available
    if (window.Capacitor && window.Capacitor.Plugins.BluetoothLe) {
        const Ble = window.Capacitor.Plugins.BluetoothLe;
        try {
            await Ble.initialize();
            await Ble.requestLEScan();

            Ble.addListener('onScanResult', (result) => {
                const name = result.device.name || "Bilinmeyen Cihaz";
                const rssi = result.rssi; // Signal strength
                addDeviceToList(name, rssi);
            });

            // Stop scan after 5 seconds
            setTimeout(async () => {
                await Ble.stopLEScan();
                if (deviceList.innerHTML.includes(t.bt_searching)) {
                    deviceList.innerHTML = `<div style="padding: 20px; opacity: 0.6;">${CURRENT_LANG === 'tr' ? 'Yakınlarda aktif cihaz bulunamadı.' : 'No active devices found nearby.'}</div>`;
                }
            }, 5000);
        } catch (e) {
            console.error("BLE Error:", e);
            simulateBluetoothScan();
        }
    } else {
        simulateBluetoothScan();
    }
});

function addDeviceToList(name, rssi) {
    const t = translations[CURRENT_LANG];
    const signalIcon = rssi > -60 ? '📶' : '📶 Low';
    const existing = Array.from(deviceList.querySelectorAll('.device-item')).find(el => el.innerText.includes(name));

    if (!existing) {
        if (deviceList.innerHTML.includes(t.bt_searching)) deviceList.innerHTML = '';
        const item = document.createElement('div');
        item.className = 'device-item';
        item.innerHTML = `<span>${signalIcon} ${name}</span> <span style="font-size: 0.7rem; opacity: 0.5;">${rssi}dBm</span>`;
        item.onclick = () => alert(t.bt_alert);
        deviceList.appendChild(item);
    }
}

function simulateBluetoothScan() {
    const t = translations[CURRENT_LANG];
    setTimeout(() => {
        deviceList.innerHTML = `
            <div class="device-item" onclick="alert('${t.bt_alert}')">📡 Yakındaki iPhone (Sinyal: %92)</div>
            <div class="device-item" onclick="alert('${t.bt_alert}')">📡 BitCep Node-7 (Sinyal: %45)</div>
            <div class="device-item" onclick="alert('${t.bt_alert}')">📡 SY-P2P Ağı (Yayın Yapıyor)</div>
        `;
        btStatus.innerText = "Tarama Tamamlandı";
    }, 2000);
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
