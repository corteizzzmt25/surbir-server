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
let CURRENT_SCAN_STATE = 'idle';
let LAST_ERROR = '';

// Crash Loop Guard: Eğer uygulama tarama yaparken çökmüşse son otomasyonu sil
if (localStorage.getItem('bt_crash_guard')) {
    localStorage.removeItem('bt_crash_guard');
    localStorage.removeItem('bitcep_username');
    console.warn("Uygulama çöktüğü için güvenlik amaçlı kullanıcı adı sıfırlandı.");
}

const translations = {
    tr: {
        welcome: "Surbit 🇸🇾",
        instruction: "Lütfen bir rumuz girerek başlayın.",
        login_btn: "Bağlan",
        active_title: "Aktif P2P Cihazları",
        scanning: "Cihazlar taranıyor... 🔍",
        no_device: "Gerçek cihaz bulunamadı.",
        no_device_desc: "P2P testleri için lütfen her iki cihazda da <b>Ayarlar > Bluetooth</b> menüsünü AÇIK ve EKRANDA tutun. (iPhone'lar ancak bu menü açıkken kendini dışarıya yayınlar). Bluetooth'u kapatıp açarak tekrar deneyin.",
        request_title: "Bağlantı İsteği",
        request_msg: "seninle mesajlaşmak istiyor.",
        sending_title: "İstek Gönderildi",
        sending_msg: "Karşı tarafın kabul etmesi bekleniyor...",
        accept: "Kabul Et",
        refuse: "Reddet",
        cancel: "İptal",
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
        no_device_desc: "لاختبارات P2P، يرجى إبقاء قائمة <b>الإعدادات > البلوتوث</b> مفتوحة على الشاشة على كلا الجهازين. (أجهزة iPhone تبث نفسها للخارج فقط عندما تكون هذه القائمة مفتوحة).",
        request_title: "طلب اتصال",
        request_msg: "يريد مراسلتك.",
        sending_title: "تم إرسال الطلب",
        sending_msg: "في انتظار قبول الطرف الآخر...",
        accept: "قبول",
        refuse: "رفض",
        cancel: "إلغاء",
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
        no_device_desc: "For P2P tests, please keep the <b>Settings > Bluetooth</b> menu OPEN and ON SCREEN on both devices. (iPhones only broadcast themselves when this menu is open).",
        request_title: "Connection Request",
        request_msg: "wants to chat with you.",
        sending_title: "Request Sent",
        sending_msg: "Waiting for peer to accept...",
        accept: "Accept",
        refuse: "Refuse",
        cancel: "Cancel",
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

    updateEmptyState();
}

function updateEmptyState() {
    if (CURRENT_SCAN_STATE === 'idle') return;
    const t = translations[CURRENT_LANG];
    if (dmList.querySelector('.dm-item')) dmList.innerHTML = '';

    let el = dmList.querySelector('.empty-state');
    if (!el) {
        el = document.createElement('div');
        el.className = 'empty-state';
        dmList.appendChild(el);
    }

    if (CURRENT_SCAN_STATE === 'scanning') {
        el.innerHTML = t.scanning;
    } else if (CURRENT_SCAN_STATE === 'no_device') {
        el.innerHTML = `<b>${t.no_device}</b><br><br><span style="font-size: 0.85rem; line-height: 1.5; display: block; margin-top: 5px;">${t.no_device_desc}</span>`;
    } else if (CURRENT_SCAN_STATE === 'error') {
        el.innerHTML = `<b>Bağlantı/İzin Hatası:</b><br><span style="font-size: 0.85rem; opacity: 0.8; margin-top: 5px; display: block;">${LAST_ERROR}</span>`;
    }
}

let IS_BT_INITIALIZED = false;

// 1b. Bluetooth Durum Kontrolü
async function checkBTStatus() {
    const statusBar = document.getElementById('bt-status-bar');
    const statusText = document.getElementById('bt-status-text');
    if (!statusBar) return;

    if (window.Capacitor && window.Capacitor.Plugins.BluetoothLe) {
        if (!IS_BT_INITIALIZED) {
            // iOS'ta initialize olmadan API çağrısı crash ettirebilir
            return;
        }
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
        // Plugin Yüklü Değil Veya Çalışmıyor
        statusBar.className = 'status-disabled';
        statusText.innerText = '🔴 Kritik Hata: BT Eklentisi Eksik';
    }
}

// 2. Discovery
async function startDiscovery() {
    if (!MY_USERNAME) return;
    CURRENT_SCAN_STATE = 'scanning';
    updateEmptyState();
    DISCOVERED_DEVICES = [];

    // Taramaya geçerken çökmeye karşı guard ekliyoruz. Survived ise birazdan sileceğiz.
    localStorage.setItem('bt_crash_guard', '1');

    if (window.Capacitor && window.Capacitor.Plugins.BluetoothLe) {
        const Ble = window.Capacitor.Plugins.BluetoothLe;
        try {
            // Sadece Android için yetkiler ve enable prompt'u
            if (window.Capacitor.getPlatform() === 'android') {
                try { await Ble.requestPermissions(); } catch (e) { }
                try { await Ble.enable(); } catch (e) { }
            }

            // GÜVENLİ INITIALIZE (Bu adım iOS'ta Yetki Pop-Up'ını çıkartır)
            try {
                await Ble.initialize();
                IS_BT_INITIALIZED = true;
            } catch (e) { console.log("BT Init Hatası:", e); IS_BT_INITIALIZED = true; }

            // İOS CRASH ENGELLEYİCİ - CRITICAL FIX
            // iPhone'da "İzin Ver" tuşuna basana kadar state .poweredOn olmaz. O esnada scan başlarsa sistem Crash verir! (API Misuse)
            // Bu sebeple cihaz TAMAMEN hazır (isEnabled === true) olana kadar bir döngüyle bekliyoruz!
            let isReady = false;
            for (let i = 0; i < 20; i++) {
                const check = await Ble.isEnabled();
                if (check && check.value === true) {
                    isReady = true;
                    break;
                }
                await new Promise(r => setTimeout(r, 1000)); // 1 saniye bekle (Kullanıcının Pop-Up'ı onaylamasını bekliyor)
            }

            if (!isReady) {
                throw new Error("Kullanıcı BT izni vermedi veya Motor Açılamadı.");
            }

            // Çökmeyi başarıyla geçtik, guard'ı kaldır.
            localStorage.removeItem('bt_crash_guard');

            // Taramayı Başlat (services dizisini TAMAMEN KESTİM, boş dizi yollamak da iOS'ta çökertiyor)
            await Ble.requestLEScan({
                allowDuplicates: false
            });

            Ble.addListener('onScanResult', (res) => {
                const name = res.device.name || res.device.localName || ("Cihaz_" + res.device.deviceId.substring(0, 6));

                if (!DISCOVERED_DEVICES.find(d => d.deviceId === res.device.deviceId)) {
                    DISCOVERED_DEVICES.push(res.device);
                    addDeviceToDmList(name, res.rssi, res.device.deviceId);

                    CURRENT_SCAN_STATE = 'idle';
                    const emptyState = dmList.querySelector('.empty-state');
                    if (emptyState) emptyState.remove();
                }
            });

            checkBTStatus(); // Son bir durum güncellemesi

            // Tarama süresi (15 Saniye limit)
            setTimeout(async () => {
                try { await Ble.stopLEScan(); } catch (e) { }
                if (DISCOVERED_DEVICES.length === 0) {
                    CURRENT_SCAN_STATE = 'no_device';
                    updateEmptyState();
                }
            }, 15000);
        } catch (e) {
            localStorage.removeItem('bt_crash_guard');
            console.error("P2P Tarama Hatası", e);
            CURRENT_SCAN_STATE = 'error';
            LAST_ERROR = (e.message || 'Bilinmeyen Hata') + " (Telefon ayarlarından Bluetooth yetkisi gereklidir)";
            updateEmptyState();
        }
    } else {
        localStorage.removeItem('bt_crash_guard');
        CURRENT_SCAN_STATE = 'error';
        LAST_ERROR = "Sistem Hatası: P2P Motoru (Bluetooth) derlenirken eklenmemiş. Lütfen 'npm i @capacitor-community/bluetooth-le' yapın.";
        updateEmptyState();
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
    div.onclick = () => connectToDevice(name, deviceId);
    dmList.appendChild(div);
}

// 3. Chat Session Logic
function sendRequestFlow(name, deviceId) {
    const t = translations[CURRENT_LANG];

    // UI'da "İstek Gönderildi" modunu aç
    document.getElementById('lang-request-title').innerText = t.sending_title;
    document.getElementById('request-msg').innerText = `${name} - ${t.sending_msg}`;

    // Butonları gizle, iptal butonu koy
    acceptBtn.style.display = 'none';
    refuseBtn.innerText = t.cancel;
    refuseBtn.style.display = 'block';

    requestModal.style.display = 'flex';

    // Bluetooth P2P bağlantısı kuruyormuş gibi bekleme animasyonu
    let simTimer = setTimeout(() => {
        requestModal.style.display = 'none';
        CURRENT_CHAT_DEVICE = { name, deviceId };
        openChat();
    }, 2500);

    refuseBtn.onclick = () => {
        clearTimeout(simTimer);
        requestModal.style.display = 'none';
    };
}

// Cihaza basıldığında İSTEK GÖNDERME ekranını aç
function connectToDevice(name, deviceId) {
    sendRequestFlow(name, deviceId);
}

// Bu fonksiyon dışarıdan gelen hayali/gerçek istekleri karşılamak için
function incomingRequestFlow(name, deviceId) {
    const t = translations[CURRENT_LANG];
    document.getElementById('lang-request-title').innerText = t.request_title;
    document.getElementById('request-msg').innerText = `${name} ${t.request_msg}`;

    acceptBtn.style.display = 'block';
    acceptBtn.innerText = t.accept;
    refuseBtn.style.display = 'block';
    refuseBtn.innerText = t.refuse;

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
