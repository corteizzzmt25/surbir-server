// Elements
const dmView = document.getElementById('dm-view');
const chatView = document.getElementById('chat-view');
const dmList = document.getElementById('dm-list');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const btRefreshBtn = document.getElementById('bt-refresh');
const backToDmBtn = document.getElementById('back-to-dm');
const chatWithName = document.getElementById('chat-with-name');

const loginOverlay = document.getElementById('login-overlay');
const loadingOverlay = document.getElementById('loading-overlay');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');

const requestModal = document.getElementById('request-modal');
const acceptBtn = document.getElementById('accept-btn');
const refuseBtn = document.getElementById('refuse-btn');

// State
let MY_USERNAME = "";
let CURRENT_LANG = localStorage.getItem('surbit_lang') || 'tr';
let CURRENT_CHAT_DEVICE = null;
let DISCOVERED_DEVICES = [];
let CHAT_HISTORIES = {};

const translations = {
    tr: {
        welcome: "Surbit 🇸🇾",
        instruction: "Lütfen bir rumuz girerek başlayın.",
        login_btn: "Bağlan",
        active_title: "Aktif P2P Cihazları",
        scanning: "Cihazlar taranıyor... 🔍",
        no_device: "Gerçek cihaz bulunamadı.",
        request_title: "Bağlantı İsteği",
        request_msg: "seninle mesajlaşmak istiyor.",
        accept: "Kabul Et",
        refuse: "Reddet",
        placeholder: "Mesaj yazın...",
        p2p_status: "P2P Bağlantısı Aktif",
        encryption: "Bluetooth P2P Şifreli 🇸🇾"
    },
    ar: {
        welcome: "سوربيت 🇸🇾",
        instruction: "يرجى إدخال اسم مستعار للبدء.",
        login_btn: "اتصال",
        active_title: "أجهزة P2P النشطة",
        scanning: "جاري البحث عن أجهزة... 🔍",
        no_device: "لم يتم العثور على أجهزة حقيقية.",
        request_title: "طلب اتصال",
        request_msg: "يريد مراسلتك.",
        accept: "قبول",
        refuse: "رفض",
        placeholder: "اكتب رسالة...",
        p2p_status: "اتصال P2P نشط",
        encryption: "تشفير بلوتوث P2P 🇸🇾"
    },
    en: {
        welcome: "Surbit 🇸🇾",
        instruction: "Please enter a nickname to start.",
        login_btn: "Connect",
        active_title: "Active P2P Devices",
        scanning: "Scanning for devices... 🔍",
        no_device: "No real hardware found.",
        request_title: "Connection Request",
        request_msg: "wants to chat with you.",
        accept: "Accept",
        refuse: "Refuse",
        placeholder: "Type a message...",
        p2p_status: "P2P Connection Active",
        encryption: "Bluetooth P2P Encrypted 🇸🇾"
    }
};

// 1. Language Logic
window.changeLanguage = (lang) => {
    CURRENT_LANG = lang;
    localStorage.setItem('surbit_lang', lang);
    applyTranslations();
};

function applyTranslations() {
    const t = translations[CURRENT_LANG];
    document.getElementById('lang-welcome').innerText = t.welcome;
    document.getElementById('lang-instruction').innerText = t.instruction;
    document.getElementById('login-btn').innerText = t.login_btn;
    document.getElementById('lang-active-title').innerText = t.active_title;
    document.getElementById('lang-scanning').innerText = t.scanning;
    document.getElementById('lang-request-title').innerText = t.request_title;
    document.getElementById('accept-btn').innerText = t.accept;
    document.getElementById('refuse-btn').innerText = t.refuse;
    document.getElementById('message-input').placeholder = t.placeholder;
    document.getElementById('lang-p2p-status').innerText = t.p2p_status;
    document.getElementById('lang-encryption').innerText = t.encryption;

    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`lang-${CURRENT_LANG}`);
    if (activeBtn) activeBtn.classList.add('active');
}

// 2. Discovery
async function startDiscovery() {
    if (!MY_USERNAME) return;
    const t = translations[CURRENT_LANG];
    dmList.innerHTML = `<div class="empty-state">${t.scanning}</div>`;
    DISCOVERED_DEVICES = [];

    if (window.Capacitor && window.Capacitor.Plugins.BluetoothLe) {
        const Ble = window.Capacitor.Plugins.BluetoothLe;
        try {
            await Ble.initialize();
            // Permissions request for better real device discovery
            await Ble.requestPermissions();

            await Ble.requestLEScan();
            Ble.addListener('onScanResult', (res) => {
                const name = res.device.name || "Bilinmeyen Cihaz";
                if (!DISCOVERED_DEVICES.find(d => d.deviceId === res.device.deviceId)) {
                    DISCOVERED_DEVICES.push(res.device);
                    addDeviceToDmList(name, res.rssi, res.device.deviceId);
                }
            });
            setTimeout(() => Ble.stopLEScan(), 15000); // 15s scan
        } catch (e) { console.error("BT Error", e); }
    } else {
        dmList.innerHTML = `<div class="empty-state">${t.no_device}</div>`;
    }
}

function addDeviceToDmList(name, rssi, deviceId) {
    if (dmList.querySelector('.empty-state')) dmList.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'dm-item';
    div.innerHTML = `
        <div class="dm-avatar">${name[0]}</div>
        <div class="dm-info">
            <div class="dm-name">${name}</div>
            <div class="dm-status">Sig: ${rssi}dBm • P2P Ready</div>
        </div>
    `;
    div.onclick = () => showRequest(name, deviceId);
    dmList.appendChild(div);
}

// 3. Chat Session Logic
function showRequest(name, deviceId) {
    const t = translations[CURRENT_LANG];
    document.getElementById('request-msg').innerText = `${name} ${t.request_msg}`;
    requestModal.style.display = 'flex';

    acceptBtn.onclick = () => {
        requestModal.style.display = 'none';
        CURRENT_CHAT_DEVICE = { name, deviceId };
        openChat();
    };
    refuseBtn.onclick = () => requestModal.style.display = 'none';
}

function openChat() {
    const { name, deviceId } = CURRENT_CHAT_DEVICE;
    chatWithName.innerText = name;
    dmView.classList.replace('view-active', 'view-hidden');
    chatView.classList.replace('view-hidden', 'view-active');
    messagesDiv.innerHTML = '';
    if (CHAT_HISTORIES[deviceId]) {
        CHAT_HISTORIES[deviceId].forEach(m => appendToUI(m.sender, m.text, m.time, m.isMe));
    }
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();
}

backToDmBtn.onclick = () => {
    chatView.classList.replace('view-active', 'view-hidden');
    dmView.classList.replace('view-hidden', 'view-active');
};

// 4. Messaging
function handleSend() {
    const text = messageInput.value.trim();
    if (!text) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msg = { sender: MY_USERNAME, text, time, isMe: true };
    const id = CURRENT_CHAT_DEVICE.deviceId;
    if (!CHAT_HISTORIES[id]) CHAT_HISTORIES[id] = [];
    CHAT_HISTORIES[id].push(msg);
    appendToUI(MY_USERNAME, text, time, true);
    messageInput.value = '';
    messageInput.focus();
}

function appendToUI(sender, text, time, isMe) {
    const div = document.createElement('div');
    div.className = `message ${isMe ? 'sent' : 'received'}`;
    div.innerHTML = `
        <div class="msg-bubble">${text}</div>
        <div style="font-size:0.65rem; opacity:0.5; margin-top:4px; text-align:${isMe ? 'right' : 'left'}">${time}</div>
    `;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

sendBtn.onclick = handleSend;
messageInput.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };

// 5. App Start and Transitions
function cycleLanguage() {
    const langs = ['tr', 'ar', 'en'];
    let idx = langs.indexOf(CURRENT_LANG);
    idx = (idx + 1) % langs.length;
    changeLanguage(langs[idx]);
}

document.getElementById('lang-cycle-btn').onclick = cycleLanguage;
document.getElementById('chat-lang-cycle-btn').onclick = cycleLanguage;

loginBtn.onclick = () => {
    const name = usernameInput.value.trim();
    if (name) {
        MY_USERNAME = name;
        localStorage.setItem('bitcep_username', name);

        // Show Loading (Premium Transition)
        loadingOverlay.classList.remove('loader-hidden');

        setTimeout(() => {
            loadingOverlay.classList.add('loader-hidden');
            loginOverlay.style.display = 'none';
            startDiscovery();
        }, 1500); // 1.5s loading
    }
};

btRefreshBtn.onclick = startDiscovery;

document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
    const saved = localStorage.getItem('bitcep_username');
    if (saved) {
        MY_USERNAME = saved;
        loginOverlay.style.display = 'none';
        startDiscovery();
    }
});
