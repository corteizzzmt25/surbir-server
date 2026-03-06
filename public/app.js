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
    // Dil menülerini kapat
    document.getElementById('lang-options').classList.add('lang-options-hidden');
    document.getElementById('chat-lang-options').classList.add('lang-options-hidden');
};

function applyTranslations() {
    const t = translations[CURRENT_LANG];
    const get = (id) => document.getElementById(id);
    if (get('lang-welcome')) get('lang-welcome').innerText = t.welcome;
    if (get('lang-instruction')) get('lang-instruction').innerText = t.instruction;
    if (get('login-btn')) get('login-btn').innerText = t.login_btn;
    if (get('lang-active-title')) get('lang-active-title').innerText = t.active_title;
    if (get('lang-scanning')) get('lang-scanning').innerText = t.scanning;
    if (get('lang-request-title')) get('lang-request-title').innerText = t.request_title;
    if (get('accept-btn')) get('accept-btn').innerText = t.accept;
    if (get('refuse-btn')) get('refuse-btn').innerText = t.refuse;
    if (get('message-input')) get('message-input').placeholder = t.placeholder;
    if (get('lang-p2p-status')) get('lang-p2p-status').innerText = t.p2p_status;
    if (get('lang-encryption')) get('lang-encryption').innerText = t.encryption;
    // Aktif dil butonunu işaretle
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`lang-${CURRENT_LANG}`);
    if (activeBtn) activeBtn.classList.add('active');
}

// 1b. Bluetooth Durum Kontrolü
async function checkBTStatus() {
    const statusBar = document.getElementById('bt-status-bar');
    const statusText = document.getElementById('bt-status-text');
    if (!statusBar) return;

    if (window.Capacitor && window.Capacitor.Plugins.BluetoothLe) {
        try {
            const Ble = window.Capacitor.Plugins.BluetoothLe;
            const isEnabled = await Ble.isEnabled();

            if (isEnabled.value) {
                statusBar.className = 'status-enabled';
                statusText.innerText = '✅ Bluetooth Aktif ve Hazır';
            } else {
                statusBar.className = 'status-disabled';
                statusText.innerText = '🔴 Bluetooth Kapalı - Lütfen Açın';
            }
        } catch (e) {
            console.error("BT Status check failed", e);
            statusBar.className = 'status-disabled';
            statusText.innerText = '⚠️ Bluetooth Durumu Alınamadı';
        }
    } else {
        // Tarayıcıda test modunda
        statusBar.className = 'status-enabled';
        statusText.innerText = '🖥️ Tarayıcı Test Modu: P2P Aktif';
    }
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
            // Android 12+ ve iOS için Zorunlu İzinler
            try {
                await Ble.initialize();
            } catch (e) { console.log("BT already initialized"); }

            // 1. Önce İzinleri İste (Hem Android Hem iOS için Hayati)
            try {
                await Ble.requestPermissions();
            } catch (e) { console.log('Permission request skipped/failed', e); }

            // 2. Android 12+ için Bluetooth'u Açmasını İste (Prompt)
            try { await Ble.enable(); } catch (e) { }

            // 3. Mevcut işlemleri durdur
            try { await Ble.stopLEScan(); } catch (e) { }

            // Taramayı Başlat (Tüm özellikleri kapsayacak şekilde)
            await Ble.requestLEScan({
                allowDuplicates: false,
                scanMode: 2 // Low Latency (Agresif Tarama Pili Daha Çok Harcar Ama Çabuk Bulur)
            });

            Ble.addListener('onScanResult', (res) => {
                const name = res.device.name || res.device.localName || ("Cihaz_" + res.device.deviceId.substring(0, 6));

                // Aynı cihazı tekrar listeye ekleme
                if (!DISCOVERED_DEVICES.find(d => d.deviceId === res.device.deviceId)) {
                    DISCOVERED_DEVICES.push(res.device);
                    addDeviceToDmList(name, res.rssi, res.device.deviceId);

                    // Cihaz bulursak boş durumu hemen kaldır
                    const emptyState = dmList.querySelector('.empty-state');
                    if (emptyState) emptyState.remove();
                }
            });

            // Tarama süresi: 15 saniye sürsün
            setTimeout(async () => {
                await Ble.stopLEScan();
                if (DISCOVERED_DEVICES.length === 0) {
                    dmList.innerHTML = `<div class="empty-state">
                        <b>Gerçek P2P Cihazı Bulunamadı.</b><br><br>
                        Diğer cihazın Bluetooth ayarlarına girmesini ve <b>uygulamanın açık kalmasını</b> isteyin. İki iPhone'un birbirini görmesi için "Ayarlar > Bluetooth" ekranında olmaları gerekir.
                    </div>`;
                }
            }, 15000);
        } catch (e) {
            console.error("BT Scan Error", e);
            dmList.innerHTML = `<div class="empty-state">
                <b>Tarama Hatası P2P:</b> Bluetooth erişimine veya Konum iznine izin vermediniz.<br>
                Hata Detayı: ${e.message}
            </div>`;
        }


    } else {
        // Browser Test
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
const langOptions = document.getElementById('lang-options');
const chatLangOptions = document.getElementById('chat-lang-options');

function toggleLangMenu(menu) {
    menu.classList.toggle('lang-options-hidden');
}

document.getElementById('lang-menu-btn').onclick = (e) => {
    e.stopPropagation();
    toggleLangMenu(langOptions);
};

document.getElementById('chat-lang-menu-btn').onclick = (e) => {
    e.stopPropagation();
    toggleLangMenu(chatLangOptions);
};

// Menü dışına tıklandığında kapat
window.onclick = () => {
    langOptions.classList.add('lang-options-hidden');
    chatLangOptions.classList.add('lang-options-hidden');
};

loginBtn.onclick = () => {
    const name = usernameInput.value.trim();
    if (!name) return;

    MY_USERNAME = name;
    localStorage.setItem('bitcep_username', name);

    // Show Loading (Premium Transition)
    loadingOverlay.classList.remove('loader-hidden');

    setTimeout(() => {
        loadingOverlay.classList.add('loader-hidden');
        loginOverlay.style.display = 'none';
        startDiscovery();
    }, 1500);
};

btRefreshBtn.onclick = startDiscovery;

document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
    checkBTStatus(); // Bluetooth durumunu kontrol et
    setInterval(checkBTStatus, 5000); // Her 5 saniyede bir guncelle

    const saved = localStorage.getItem('bitcep_username');
    if (saved) {
        MY_USERNAME = saved;
        loginOverlay.style.display = 'none';
        startDiscovery();
    }
});
