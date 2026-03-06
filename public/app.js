// DOM Elements - Versiyon: Bluetooth P2P Premium
const dmView = document.getElementById('dm-view');
const chatView = document.getElementById('chat-view');
const dmList = document.getElementById('dm-list');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const btRefreshBtn = document.getElementById('bt-refresh');
const backToDmBtn = document.getElementById('back-to-dm');
const chatWithName = document.getElementById('chat-with-name');
const attachPlusBtn = document.getElementById('attach-plus-btn');
const micBtn = document.getElementById('mic-btn');
const photoInput = document.getElementById('photo-input');

const requestModal = document.getElementById('request-modal');
const acceptBtn = document.getElementById('accept-btn');
const refuseBtn = document.getElementById('refuse-btn');

const loginOverlay = document.getElementById('login-overlay');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');

const recorderStatus = document.getElementById('recorder-status');
const recorderTime = document.getElementById('recorder-time');

// App State
let MY_USERNAME = "";
let CURRENT_CHAT_DEVICE = null;
let DISCOVERED_DEVICES = [];
let mediaRecorder;
let audioChunks = [];

// Bluetooth UUIDs - P2P Haberleşme için standart
const SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
const CHARACTERISTIC_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';

// 1. Bluetooth Taraması ve DM Listesi
async function startDiscovery() {
    dmList.innerHTML = '<div class="empty-state">Etraf taranıyor... 🇸🇾</div>';

    if (window.Capacitor && window.Capacitor.Plugins.BluetoothLe) {
        const Ble = window.Capacitor.Plugins.BluetoothLe;
        try {
            await Ble.initialize();
            await Ble.requestLEScan();

            Ble.addListener('onScanResult', (res) => {
                const name = res.device.name || "Bilinmeyen Cihaz";
                if (!DISCOVERED_DEVICES.find(d => d.deviceId === res.device.deviceId)) {
                    DISCOVERED_DEVICES.push(res.device);
                    addDeviceToDmList(name, res.rssi, res.device.deviceId);
                }
            });

            setTimeout(async () => {
                await Ble.stopLEScan();
                if (DISCOVERED_DEVICES.length === 0) {
                    dmList.innerHTML = '<div class="empty-state">Yakında cihaz bulunamadı.</div>';
                }
            }, 10000);
        } catch (e) { console.error("BT Tarama Hatası:", e); }
    } else {
        // Tarayıcı Test Modu
        setTimeout(() => {
            addDeviceToDmList("iPhone 11 (Ahmet)", -40, "DE:AD:BE:EF:01");
            addDeviceToDmList("Galaxy S21 (Suriye-BT)", -55, "CA:FE:BA:BE:02");
        }, 1500);
    }
}

function addDeviceToDmList(name, rssi, deviceId) {
    if (dmList.querySelector('.empty-state')) dmList.innerHTML = '';

    const item = document.createElement('div');
    item.className = 'dm-item';
    item.innerHTML = `
        <div class="dm-avatar">${name.charAt(0)}</div>
        <div class="dm-info">
            <div class="dm-name">${name}</div>
            <div class="dm-status">Sinyal: ${rssi}dBm • P2P Hazır</div>
        </div>
    `;
    item.onclick = () => sendConnectionRequest(name, deviceId);
    dmList.appendChild(item);
}

// 2. Bağlantı İstek Akışı
function sendConnectionRequest(name, deviceId) {
    // Gerçekte burada bir GATT write ile karşıya "CONN_REQ" paketi atılır
    // Simülasyon: Karşı tarafın isteği kabul ettiğini varsayalım
    const status = confirm(`${name} cihazına bağlantı isteği gönderilsin mi?`);
    if (status) {
        CURRENT_CHAT_DEVICE = { name, deviceId };
        openChat(name);
    }
}

function openChat(name) {
    chatWithName.innerText = name;
    dmView.classList.remove('view-active');
    dmView.classList.add('view-hidden');
    chatView.classList.remove('view-hidden');
    chatView.classList.add('view-active');
    messageInput.disabled = false;
    sendBtn.disabled = false;
}

backToDmBtn.onclick = () => {
    chatView.classList.remove('view-active');
    chatView.classList.add('view-hidden');
    dmView.classList.remove('view-hidden');
    dmView.classList.add('view-active');
};

// 3. Mesajlaşma Mantığı (Bluetooth GATT üzerinden veri paketi)
async function sendBTMessage(data) {
    if (!window.Capacitor) {
        // Browser simülasyonu
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        appendMessage(MY_USERNAME, data.text || "Dosya gönderildi", time, true, data.type);
        return;
    }

    // Gerçek Bluetooth Gönderimi
    const Ble = window.Capacitor.Plugins.BluetoothLe;
    try {
        const encoder = new TextEncoder();
        const value = encoder.encode(JSON.stringify(data));
        // GATT Write
        await Ble.write({
            deviceId: CURRENT_CHAT_DEVICE.deviceId,
            service: SERVICE_UUID,
            characteristic: CHARACTERISTIC_UUID,
            value: btoa(String.fromCharCode(...value))
        });

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        appendMessage(MY_USERNAME, data.text || "Dosya", time, true, data.type);
    } catch (e) {
        alert("Mesaj gönderilemedi: Bluetooth bağlantısı koptu.");
    }
}

function appendMessage(sender, content, time, isMe, type = 'chat') {
    const msgElement = document.createElement('div');
    msgElement.className = `message ${isMe ? 'sent' : 'received'}`;

    let contentHTML = content;
    if (type === 'image') contentHTML = `<img src="${content}" class="msg-img">`;
    if (type === 'audio') contentHTML = `<audio controls class="msg-audio"><source src="${content}"></audio>`;

    msgElement.innerHTML = `
        <div style="display: flex; gap: 8px; align-items: flex-end; ${isMe ? 'flex-direction: row-reverse;' : ''}">
            <div style="display: flex; flex-direction: column;">
                <div class="msg-bubble">${contentHTML}</div>
                <div class="msg-meta">${isMe ? '' : sender + ' • '}${time}</div>
            </div>
        </div>
    `;
    messagesDiv.appendChild(msgElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// 4. Input ve Medya İşlemleri
function handleSendMessage() {
    const text = messageInput.value.trim();
    if (text) {
        sendBTMessage({ sender: MY_USERNAME, type: 'chat', text: text });
        messageInput.value = '';
        messageInput.focus();
    }
}

sendBtn.onclick = handleSendMessage;
messageInput.onkeypress = (e) => { if (e.key === 'Enter') handleSendMessage(); };

attachPlusBtn.onclick = () => photoInput.click();
photoInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => sendBTMessage({ sender: MY_USERNAME, type: 'image', text: ev.target.result });
    reader.readAsDataURL(file);
};

micBtn.onclick = async () => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => sendBTMessage({ sender: MY_USERNAME, type: 'audio', text: reader.result });
            reader.readAsDataURL(blob);
        };
        mediaRecorder.start();
        micBtn.classList.add('active');
        recorderStatus.classList.remove('recorder-hidden');
    } else {
        mediaRecorder.stop();
        micBtn.classList.remove('active');
        recorderStatus.classList.add('recorder-hidden');
    }
};

// 5. Başlangıç ve Giriş
document.addEventListener('DOMContentLoaded', () => {
    const savedName = localStorage.getItem('bitcep_username');
    if (savedName) {
        MY_USERNAME = savedName;
        loginOverlay.style.display = 'none';
        startDiscovery();
    }
});

loginBtn.onclick = () => {
    const name = usernameInput.value.trim();
    if (name) {
        MY_USERNAME = name;
        localStorage.setItem('bitcep_username', name);
        loginOverlay.style.display = 'none';
        startDiscovery();
    }
};

btRefreshBtn.onclick = startDiscovery;
