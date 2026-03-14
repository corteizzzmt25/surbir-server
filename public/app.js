// ================================================================
//  SURBIT v3.0 - İNTERNET + HİKAYE + MAİL GİRİŞ + FOTOĞRAF
// ================================================================

// ============ STATE ============
let MY_USERNAME = '';
let MY_EMAIL = '';
let MY_PROFILE_PHOTO = '';
let AUTH_TOKEN = localStorage.getItem('surbit_token') || '';
let CURRENT_LANG = localStorage.getItem('surbit_lang') || 'tr';
let DARK_MODE = localStorage.getItem('surbit_dark') === '1';
let CURRENT_CHAT_PEER = null;
let CHAT_HISTORIES = JSON.parse(localStorage.getItem('surbit_chats') || '{}');
let mediaRecorder = null;
let recInterval = null;
let recSeconds = 0;
let camPermGranted = false;
let micPermGranted = false;
let socket = null;
let allStories = [];
let currentStoryIndex = 0;
let storyTimer = null;
let storyMediaData = null;

// ============ ÇEVİRİLER ============
const T = {
    tr: {
        welcome: 'Surbit', instruction: 'Giriş yapın veya kayıt olun',
        login_btn: 'Giriş Yap', register_btn: 'Kayıt Ol',
        encryption: 'Uçtan Uca Şifreli 🔒', header_sub: 'P2P Şifreli Mesajlaşma',
        active_title: 'Bağlantılar', no_conn: 'Henüz bağlantı yok.',
        no_conn_hint: 'Sağ üstteki + butonuna bas.', qr_title: 'Yeni Bağlantı',
        role_title: 'Rol Seç', role_desc: 'Bağlantıyı kim başlatıyor?',
        host_btn: 'QR Oluştur (Ben başlatıyorum)', guest_btn: 'QR Tara (Karşıdan başlatıldı)',
        step1: "Adım 1/2 · Bu QR'ı karşı cihaza okut", host_hint: "Karşı cihaz QR'ı okutunca devam...",
        host_next: "Karşıdan QR Tara", step_g1: 'Adım 1/2 · Karşıdaki ekranı kamerana göster',
        scan_hint: 'QR koda odaklan...', step2: "Adım 2/2 · Karşıdaki cevap QR'ını tara",
        guest_hint: 'Karşı cihaz okuyunca bağlantı kurulacak...', connecting: 'Bağlanıyor...',
        connecting_hint: 'WebRTC Tüneli Kuruluyor', p2p_status: 'Çevrimiçi 🟢',
        placeholder: 'Mesaj yazın...', settings_title: 'Ayarlar',
        settings_profile: 'Profil', settings_appearance: 'Görünüm',
        settings_permissions: 'İzinler', settings_about: 'Hakkında',
        dark_mode: 'Karanlık Mod', perm_camera: 'Kamera İzni Ver',
        perm_mic: 'Mikrofon İzni Ver', settings_enc: 'Uçtan Uca Şifreli',
        perm_granted: '✓ Verildi', perm_denied: '✗ Reddedildi',
        tab_login: 'Giriş', tab_register: 'Kayıt Ol', rec_hint: 'Kaydediliyor...'
    },
    ar: {
        welcome: 'سوربيت', instruction: 'قم بتسجيل الدخول أو إنشاء حساب',
        login_btn: 'دخول', register_btn: 'تسجيل',
        encryption: 'مشفر من طرف إلى طرف 🔒', header_sub: 'رسائل P2P مشفرة',
        active_title: 'الاتصالات', no_conn: 'لا توجد اتصالات بعد.',
        no_conn_hint: 'اضغط زر + في أعلى اليمين.', qr_title: 'اتصال جديد',
        role_title: 'اختر الدور', role_desc: 'من يبدأ الاتصال؟',
        host_btn: 'إنشاء QR (أنا أبدأ)', guest_btn: 'مسح QR (الطرف الآخر بدأ)',
        step1: 'الخطوة 1/2 · اعرض هذا QR للجهاز الآخر', host_hint: 'انتظر حتى يمسح الجهاز الآخر...',
        host_next: 'امسح QR الجهاز الآخر', step_g1: 'الخطوة 1/2 · وجّه الكاميرا نحو الشاشة الأخرى',
        scan_hint: 'ركز على رمز QR...', step2: 'الخطوة 2/2 · امسح QR الرد',
        guest_hint: 'سيتصل الجهاز الآخر عند المسح...', connecting: 'جارٍ الاتصال...',
        connecting_hint: 'إنشاء نفق WebRTC', p2p_status: 'متصل 🟢',
        placeholder: 'اكتب رسالة...', settings_title: 'الإعدادات',
        settings_profile: 'الملف الشخصي', settings_appearance: 'المظهر',
        settings_permissions: 'الأذونات', settings_about: 'حول التطبيق',
        dark_mode: 'الوضع الداكن', perm_camera: 'إذن الكاميرا',
        perm_mic: 'إذن الميكروفون', settings_enc: 'مشفر من طرف لطرف',
        perm_granted: '✓ ممنوح', perm_denied: '✗ مرفوض',
        tab_login: 'دخول', tab_register: 'تسجيل', rec_hint: 'جارٍ التسجيل...'
    },
    en: {
        welcome: 'Surbit', instruction: 'Sign in or create an account',
        login_btn: 'Sign In', register_btn: 'Sign Up',
        encryption: 'End-to-End Encrypted 🔒', header_sub: 'Encrypted P2P Messaging',
        active_title: 'Connections', no_conn: 'No connections yet.',
        no_conn_hint: 'Tap the + button above.', qr_title: 'New Connection',
        role_title: 'Choose Role', role_desc: 'Who initiates the connection?',
        host_btn: "Generate QR (I'm the host)", guest_btn: 'Scan QR (Peer is the host)',
        step1: 'Step 1/2 · Show this QR to the other device', host_hint: 'Waiting for the other device to scan...',
        host_next: "Scan Peer's QR", step_g1: 'Step 1/2 · Point camera at the other screen',
        scan_hint: 'Focus on the QR code...', step2: 'Step 2/2 · Scan the answer QR',
        guest_hint: 'The other device will connect when scanned...', connecting: 'Connecting...',
        connecting_hint: 'Establishing WebRTC Tunnel', p2p_status: 'Online 🟢',
        placeholder: 'Type a message...', settings_title: 'Settings',
        settings_profile: 'Profile', settings_appearance: 'Appearance',
        settings_permissions: 'Permissions', settings_about: 'About',
        dark_mode: 'Dark Mode', perm_camera: 'Camera Permission',
        perm_mic: 'Microphone Permission', settings_enc: 'End-to-End Encrypted',
        perm_granted: '✓ Granted', perm_denied: '✗ Denied',
        tab_login: 'Sign In', tab_register: 'Sign Up', rec_hint: 'Recording...'
    }
};

// ============ YARDIMCI ============
const g = (id) => document.getElementById(id);
const set = (id, val) => { const el = g(id); if (el) el.innerText = val; };

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============ DİL ============
window.changeLanguage = (lang) => {
    CURRENT_LANG = lang;
    localStorage.setItem('surbit_lang', lang);
    applyTranslations();
    g('lang-options')?.classList.add('lang-options-hidden');
    g('chat-lang-options')?.classList.add('lang-options-hidden');
};

function applyTranslations() {
    const t = T[CURRENT_LANG];
    set('lang-welcome', t.welcome);
    set('lang-instruction', t.instruction);
    set('lang-encryption', t.encryption);
    set('lang-active-title', t.active_title);
    set('lang-no-conn', t.no_conn);
    set('lang-no-conn-hint', t.no_conn_hint);
    set('lang-connecting', t.connecting);
    set('lang-connecting-hint', t.connecting_hint);
    set('lang-p2p-status', t.p2p_status);
    set('lang-settings-title', t.settings_title);
    set('lang-settings-profile', t.settings_profile);
    set('lang-settings-appearance', t.settings_appearance);
    set('lang-settings-permissions', t.settings_permissions);
    set('lang-settings-about', t.settings_about);
    set('lang-dark-mode', t.dark_mode);
    set('lang-perm-camera', t.perm_camera);
    set('lang-perm-mic', t.perm_mic);
    set('lang-settings-enc', t.settings_enc);
    set('lang-rec-hint', t.rec_hint);
    set('tab-login', t.tab_login);
    set('tab-register', t.tab_register);
    const mi = g('message-input');
    if (mi) mi.placeholder = t.placeholder;
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    g(`lang-${CURRENT_LANG}`)?.classList.add('active');
}

// ============ DARK MODE ============
function applyDarkMode() {
    if (DARK_MODE) { document.body.classList.add('dark'); g('dark-toggle')?.classList.add('on'); }
    else { document.body.classList.remove('dark'); g('dark-toggle')?.classList.remove('on'); }
}
window.toggleDarkMode = () => {
    DARK_MODE = !DARK_MODE;
    localStorage.setItem('surbit_dark', DARK_MODE ? '1' : '0');
    applyDarkMode();
};

// ============ RIPPLE ============
function addRipple(e) {
    const el = e.currentTarget; if (!el) return;
    const circle = document.createElement('span');
    const d = Math.max(el.clientWidth, el.clientHeight);
    const rect = el.getBoundingClientRect();
    circle.className = 'ripple-wave';
    circle.style.width = circle.style.height = d + 'px';
    circle.style.left = (e.clientX - rect.left - d / 2) + 'px';
    circle.style.top = (e.clientY - rect.top - d / 2) + 'px';
    el.appendChild(circle);
    setTimeout(() => circle.remove(), 600);
}
function initRipples() {
    document.querySelectorAll('.ripple').forEach(el => el.addEventListener('click', addRipple));
}

// ============ EKRAN GEÇİŞLERİ ============
function showView(id) {
    ['dm-view', 'settings-view', 'chat-view', 'story-view'].forEach(v => {
        const el = g(v);
        if (el) { el.classList.remove('view-active'); el.classList.add('view-hidden'); }
    });
    const t = g(id);
    if (t) { t.classList.remove('view-hidden'); t.classList.add('view-active'); }
}

// ============ AUTH TABS ============
window.switchAuthTab = (tab) => {
    if (tab === 'login') {
        g('form-login').classList.remove('hidden');
        g('form-register').classList.add('hidden');
        g('tab-login').classList.add('active');
        g('tab-register').classList.remove('active');
    } else {
        g('form-login').classList.add('hidden');
        g('form-register').classList.remove('hidden');
        g('tab-login').classList.remove('active');
        g('tab-register').classList.add('active');
    }
};

// ============ API HELPERS ============
async function apiPost(url, body) {
    const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AUTH_TOKEN },
        body: JSON.stringify(body)
    });
    return res.json();
}
async function apiGet(url) {
    const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + AUTH_TOKEN } });
    return res.json();
}
async function apiDelete(url) {
    const res = await fetch(url, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + AUTH_TOKEN } });
    return res.json();
}

// ============ LOGIN ============
window.handleLogin = async () => {
    const email = g('login-email').value.trim();
    const password = g('login-password').value;
    if (!email || !password) { showAuthError('login-error', 'Tüm alanları doldurun.'); return; }
    const data = await apiPost('/api/login', { email, password });
    if (data.error) { showAuthError('login-error', data.error); return; }
    authSuccess(data);
};

window.handleRegister = async () => {
    const email = g('reg-email').value.trim();
    const username = g('reg-username').value.trim();
    const password = g('reg-password').value;
    if (!email || !username || !password) { showAuthError('reg-error', 'Tüm alanları doldurun.'); return; }
    const data = await apiPost('/api/register', { email, username, password });
    if (data.error) { showAuthError('reg-error', data.error); return; }
    authSuccess(data);
};

function showAuthError(id, msg) {
    const el = g(id); if (!el) return;
    el.innerText = msg; el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
}

function authSuccess(data) {
    AUTH_TOKEN = data.token;
    MY_USERNAME = data.user.username;
    MY_EMAIL = data.user.email;
    MY_PROFILE_PHOTO = data.user.profilePhoto || '';
    localStorage.setItem('surbit_token', AUTH_TOKEN);
    localStorage.setItem('surbit_username', MY_USERNAME);
    localStorage.setItem('surbit_email', MY_EMAIL);
    localStorage.setItem('surbit_pp', MY_PROFILE_PHOTO);

    const lo = g('loading-overlay');
    lo.classList.remove('loader-hidden');
    setTimeout(async () => {
        lo.classList.add('loader-hidden');
        g('login-overlay').style.display = 'none';
        updateSettingsProfile();
        connectSocket();
        await requestPermissionsOnStartup();
        loadStories();
    }, 800);
}

// ============ LOGOUT ============
window.handleLogout = () => {
    AUTH_TOKEN = '';
    MY_USERNAME = '';
    MY_EMAIL = '';
    localStorage.removeItem('surbit_token');
    localStorage.removeItem('surbit_username');
    localStorage.removeItem('surbit_email');
    if (socket) { socket.disconnect(); socket = null; }
    g('login-overlay').style.display = 'flex';
    showView('dm-view');
};

// ============ DELETE ACCOUNT ============
window.confirmDeleteAccount = () => g('delete-modal').classList.remove('hidden');
window.closeDeleteModal = () => g('delete-modal').classList.add('hidden');
window.executeDeleteAccount = async () => {
    const data = await apiDelete('/api/account');
    if (data.ok) { closeDeleteModal(); handleLogout(); alert('Hesabınız kalıcı olarak silindi.'); }
    else alert(data.error || 'Hata.');
};

// ============ SOCKET.IO ============
function connectSocket() {
    if (socket) socket.disconnect();
    socket = io({ transports: ['websocket', 'polling'] });
    socket.on('connect', () => {
        socket.emit('authenticate', { token: AUTH_TOKEN });
    });
    socket.on('authenticated', (data) => {
        console.log('Socket authenticated:', data.user.username);
    });
    socket.on('auth_error', (data) => {
        console.error('Socket auth error:', data.error);
    });
    socket.on('online_users', (users) => {
        updateOnlineUsers(users);
    });
    socket.on('chat_message', (msg) => {
        receiveSocketMessage(msg);
    });
    socket.on('new_story', (story) => {
        allStories.unshift(story);
        renderStories();
    });
    socket.on('delete_story', ({ id }) => {
        allStories = allStories.filter(s => s.id !== id);
        renderStories();
    });
}

function updateOnlineUsers(users) {
    const dmList = g('dm-list');
    const filtered = users.filter(u => u !== MY_USERNAME);
    if (filtered.length === 0 && dmList.querySelector('.empty-state')) return;
    // Keep existing items, add new ones
    filtered.forEach(name => {
        if (!document.querySelector(`.dm-item[data-peer="${CSS.escape(name)}"]`)) {
            addToDmList(name, true);
        }
    });
}

// ============ NAVİGASYON ============
document.addEventListener('DOMContentLoaded', () => {
    applyDarkMode();
    applyTranslations();
    initRipples();

    g('search-user-btn').onclick = () => openSearchModal();
    g('settings-btn').onclick = () => { updateSettingsProfile(); showView('settings-view'); };
    g('back-from-settings').onclick = () => showView('dm-view');
    g('back-to-dm').onclick = () => showView('dm-view');

    g('send-btn').onclick = (e) => { addRipple(e); handleSend(); };
    g('message-input').onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };
    g('mic-btn').onclick = startVoiceRec;
    g('rec-stop-btn').onclick = stopVoiceRec;

    g('lang-menu-btn').onclick = (e) => { e.stopPropagation(); g('lang-options').classList.toggle('lang-options-hidden'); };
    g('chat-lang-menu-btn').onclick = (e) => { e.stopPropagation(); g('chat-lang-options').classList.toggle('lang-options-hidden'); };
    window.onclick = () => { g('lang-options')?.classList.add('lang-options-hidden'); g('chat-lang-options')?.classList.add('lang-options-hidden'); };

    // Username availability check
    let checkTimer;
    g('reg-username')?.addEventListener('input', () => {
        clearTimeout(checkTimer);
        const u = g('reg-username').value.trim();
        const ck = g('username-check');
        if (u.length < 3) { ck.innerText = ''; return; }
        checkTimer = setTimeout(async () => {
            const data = await apiGet('/api/check-username/' + encodeURIComponent(u));
            if (data.available) { ck.innerText = '✓ Bu isim kullanılabilir'; ck.className = 'username-check-msg available'; }
            else { ck.innerText = '✗ Bu isim alınmış'; ck.className = 'username-check-msg taken'; }
        }, 500);
    });

    // Login with Enter key
    g('login-password')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
    g('reg-password')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleRegister(); });

    // Auto-login from saved token
    const savedToken = localStorage.getItem('surbit_token');
    const savedUsername = localStorage.getItem('surbit_username');
    const savedEmail = localStorage.getItem('surbit_email');
    if (savedToken && savedUsername) {
        AUTH_TOKEN = savedToken;
        MY_USERNAME = savedUsername;
        MY_EMAIL = savedEmail || '';
        MY_PROFILE_PHOTO = localStorage.getItem('surbit_pp') || '';
        g('login-overlay').style.display = 'none';
        updateSettingsProfile();
        connectSocket();
        setTimeout(() => { requestPermissionsOnStartup(); loadStories(); }, 500);
    }
});

// ============ AYARLAR - PROFIL ============
function updateSettingsProfile() {
    set('settings-display-name', MY_USERNAME || '—');
    set('settings-display-email', MY_EMAIL || '—');
    const av = g('settings-avatar-initial');
    const ppImg = g('settings-pp-img');
    if (MY_PROFILE_PHOTO) {
        ppImg.src = MY_PROFILE_PHOTO;
        ppImg.style.display = 'block';
        if (av) av.style.display = 'none';
    } else {
        ppImg.style.display = 'none';
        if (av) { av.style.display = 'flex'; av.innerText = (MY_USERNAME || 'S')[0].toUpperCase(); }
    }
}

// Profile photo
window.pickProfilePhoto = () => g('pp-file-input').click();
window.profilePhotoChosen = async (ev) => {
    const file = ev.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
        MY_PROFILE_PHOTO = reader.result;
        localStorage.setItem('surbit_pp', MY_PROFILE_PHOTO);
        updateSettingsProfile();
        await apiPost('/api/profile-photo', { photo: MY_PROFILE_PHOTO });
    };
    reader.readAsDataURL(file);
    ev.target.value = '';
};

// ============ İZİNLER ============
window.requestCameraPermission = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(t => t.stop());
        camPermGranted = true;
    } catch (e) { camPermGranted = false; }
    updatePermBadge('camera-perm-badge', camPermGranted);
};
window.requestMicPermission = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        micPermGranted = true;
    } catch (e) { micPermGranted = false; }
    updatePermBadge('mic-perm-badge', micPermGranted);
};
window.requestNotifPermission = async () => {
    try {
        const p = await Notification.requestPermission();
        updatePermBadge('notif-perm-badge', p === 'granted');
    } catch (e) { updatePermBadge('notif-perm-badge', false); }
};
function updatePermBadge(id, granted) {
    const badge = g(id); if (!badge) return;
    const t = T[CURRENT_LANG];
    badge.className = 'perm-badge ' + (granted ? 'green' : 'red');
    badge.innerText = granted ? t.perm_granted : t.perm_denied;
}
async function requestPermissionsOnStartup() {
    try { const s = await navigator.mediaDevices.getUserMedia({ video: true }); s.getTracks().forEach(t => t.stop()); camPermGranted = true; } catch (e) { camPermGranted = false; }
    updatePermBadge('camera-perm-badge', camPermGranted);
    try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach(t => t.stop()); micPermGranted = true; } catch (e) { micPermGranted = false; }
    updatePermBadge('mic-perm-badge', micPermGranted);
}

// ============ DM LİSTESİ ============
function addToDmList(name, online) {
    const dmList = g('dm-list');
    const empty = dmList.querySelector('.empty-state');
    if (empty) empty.remove();
    // Check if already exists
    if (document.querySelector(`.dm-item[data-peer="${CSS.escape(name)}"]`)) return;
    const div = document.createElement('div');
    div.className = 'dm-item ripple';
    div.dataset.peer = name;
    div.innerHTML = `
        <div class="dm-avatar">${name[0].toUpperCase()}</div>
        <div>
            <div class="dm-name">${escapeHtml(name)}</div>
            <div class="dm-status">${online ? 'Çevrimiçi 🟢' : 'Çevrimdışı 🔴'}</div>
        </div>
    `;
    div.onclick = (e) => { addRipple(e); openChat(name); };
    dmList.appendChild(div);
}

// ============ SOHBET ============
function openChat(name) {
    CURRENT_CHAT_PEER = { name };
    g('chat-with-name').innerText = name;
    const av = g('chat-peer-avatar');
    if (av) av.innerText = name[0].toUpperCase();
    g('message-input').disabled = false;
    g('send-btn').disabled = false;
    g('message-input').placeholder = T[CURRENT_LANG].placeholder;
    const md = g('messages');
    md.innerHTML = '';
    (CHAT_HISTORIES[name] || []).forEach(m => {
        if (m.type === 'audio') appendAudioMessage(m.content, m.time, m.isMe);
        else if (m.type === 'image') appendImageMessage(m.content, m.time, m.isMe);
        else appendMessage(m.sender, m.text || m.content, m.time, m.isMe);
    });
    showView('chat-view');
    setTimeout(() => g('message-input').focus(), 300);
}


function receiveSocketMessage(msg) {
    if (!msg) return;
    const name = msg.fromUsername;
    const time = msg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (!document.querySelector(`.dm-item[data-peer="${CSS.escape(name)}"]`)) addToDmList(name, true);
    if (msg.type === 'audio') {
        saveChatMsg(name, { type: 'audio', content: msg.content, time, isMe: false });
        if (CURRENT_CHAT_PEER?.name === name) appendAudioMessage(msg.content, time, false);
    } else if (msg.type === 'image') {
        saveChatMsg(name, { type: 'image', content: msg.content, time, isMe: false });
        if (CURRENT_CHAT_PEER?.name === name) appendImageMessage(msg.content, time, false);
    } else {
        saveChatMsg(name, { sender: name, text: msg.content, time, isMe: false });
        if (CURRENT_CHAT_PEER?.name === name) appendMessage(name, msg.content, time, false);
    }
}

function handleSend() {
    const text = g('message-input').value.trim();
    if (!text) return;
    const name = CURRENT_CHAT_PEER?.name || '';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Try P2P first, then Socket

    if (socket?.connected) {
        socket.emit('chat_message', { toUsername: name, type: 'text', content: text });
    }

    appendMessage(MY_USERNAME, text, time, true);
    saveChatMsg(name, { sender: MY_USERNAME, text, time, isMe: true });
    g('message-input').value = '';
    g('message-input').focus();
}

function saveChatMsg(name, msg) {
    if (!CHAT_HISTORIES[name]) CHAT_HISTORIES[name] = [];
    CHAT_HISTORIES[name].push(msg);
    try { localStorage.setItem('surbit_chats', JSON.stringify(CHAT_HISTORIES)); } catch (e) { }
}

function appendMessage(sender, text, time, isMe) {
    const md = g('messages');
    const div = document.createElement('div');
    div.className = `message ${isMe ? 'sent' : 'received'}`;
    div.innerHTML = `<div class="msg-bubble">${escapeHtml(text)}<div class="msg-meta"><span class="msg-time">${time}</span>${isMe ? '<span class="msg-tick">✓✓</span>' : ''}</div></div>`;
    md.appendChild(div);
    md.scrollTop = md.scrollHeight;
}
function appendAudioMessage(src, time, isMe) {
    const md = g('messages');
    const div = document.createElement('div');
    div.className = `message ${isMe ? 'sent' : 'received'}`;
    // Generate random waveform bars
    let bars = '';
    for (let i = 0; i < 28; i++) {
        const h = Math.floor(Math.random() * 20) + 5;
        bars += `<div class="voice-bar" style="height:${h}px;"></div>`;
    }
    const uid = 'voice_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    div.innerHTML = `<div class="msg-bubble"><div class="voice-msg">
        <button class="voice-play-btn" onclick="playVoice('${uid}', this)">▶</button>
        <div class="voice-waveform" id="wf_${uid}">${bars}</div>
        <span class="voice-duration">0:${String(recSeconds || 0).padStart(2, '0')}</span>
        </div><div class="msg-meta"><span class="msg-time">${time}</span>${isMe ? '<span class="msg-tick">✓✓</span>' : ''}</div>
        <audio id="${uid}" src="${src}" preload="metadata"></audio>
    </div>`;
    md.appendChild(div); md.scrollTop = md.scrollHeight;
}

window.playVoice = (id, btn) => {
    const audio = document.getElementById(id);
    if (!audio) return;
    const wf = document.getElementById('wf_' + id);
    if (audio.paused) {
        audio.play();
        btn.innerHTML = '❚❚';
        // Animate waveform
        let barIdx = 0;
        const bars = wf?.querySelectorAll('.voice-bar') || [];
        const animInterval = setInterval(() => {
            bars.forEach((b, i) => b.classList.toggle('active', i <= barIdx));
            barIdx++;
            if (barIdx >= bars.length) clearInterval(animInterval);
        }, audio.duration ? (audio.duration * 1000 / bars.length) : 100);
        audio.onended = () => {
            btn.innerHTML = '▶';
            clearInterval(animInterval);
            bars.forEach(b => b.classList.remove('active'));
        };
    } else {
        audio.pause();
        audio.currentTime = 0;
        btn.innerHTML = '▶';
    }
};

function appendImageMessage(src, time, isMe) {
    const md = g('messages');
    const div = document.createElement('div');
    div.className = `message ${isMe ? 'sent' : 'received'}`;
    div.innerHTML = `<div class="msg-bubble msg-image-bubble"><img src="${src}" class="msg-image" onclick="openFullImage(this.src)"><div class="msg-meta"><span class="msg-time">${time}</span>${isMe ? '<span class="msg-tick">✓✓</span>' : ''}</div></div>`;
    md.appendChild(div); md.scrollTop = md.scrollHeight;
}
window.openFullImage = (src) => {
    const overlay = document.createElement('div');
    overlay.className = 'fullscreen-image-overlay';
    overlay.innerHTML = `<img src="${src}"><button onclick="this.parentElement.remove()">✕</button>`;
    document.body.appendChild(overlay);
};

// ============ SES KAYIT ============
let micStream = null, audioChunks = [];
async function startVoiceRec(e) {
    addRipple(e);
    if (mediaRecorder?.state === 'recording') return;
    try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        mediaRecorder = new MediaRecorder(micStream);
        mediaRecorder.ondataavailable = (ev) => { if (ev.data.size > 0) audioChunks.push(ev.data); };
        mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            sendAudioMsg(blob);
            micStream.getTracks().forEach(t => t.stop()); micStream = null;
        };
        mediaRecorder.start();
        recSeconds = 0; g('rec-time').innerText = '00:00';
        g('recorder-bar').classList.remove('hidden');
        g('chat-footer').style.display = 'none';
        recInterval = setInterval(() => {
            recSeconds++;
            g('rec-time').innerText = String(Math.floor(recSeconds / 60)).padStart(2, '0') + ':' + String(recSeconds % 60).padStart(2, '0');
        }, 1000);
    } catch (e) { alert('Mikrofon erişimi reddedildi: ' + e.message); }
}
function stopVoiceRec() {
    if (mediaRecorder?.state === 'recording') mediaRecorder.stop();
    clearInterval(recInterval);
    g('recorder-bar').classList.add('hidden');
    g('chat-footer').style.display = 'flex';
}
function sendAudioMsg(blob) {
    const reader = new FileReader();
    reader.onload = () => {
        const b64 = reader.result;
        const name = CURRENT_CHAT_PEER?.name || '';
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (socket?.connected) socket.emit('chat_message', { toUsername: name, type: 'audio', content: b64 });
        appendAudioMessage(b64, time, true);
        saveChatMsg(name, { type: 'audio', content: b64, time, isMe: true });
    };
    reader.readAsDataURL(blob);
}

// ============ FOTOĞRAF GÖNDER ============
window.openPhotoMenu = () => { g('photo-menu').classList.remove('hidden'); g('photo-menu-backdrop').classList.remove('hidden'); };
window.closePhotoMenu = () => { g('photo-menu').classList.add('hidden'); g('photo-menu-backdrop').classList.add('hidden'); };
window.photoFromGallery = () => { g('gallery-input').click(); closePhotoMenu(); };
window.photoFromCamera = () => { g('camera-input').click(); closePhotoMenu(); };
window.galleryPhotoChosen = (event) => {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        const b64 = reader.result;
        const name = CURRENT_CHAT_PEER?.name || '';
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (socket?.connected) socket.emit('chat_message', { toUsername: name, type: 'image', content: b64 });
        appendImageMessage(b64, time, true);
        saveChatMsg(name, { type: 'image', content: b64, time, isMe: true });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
};

// ============ HİKAYELER ============
async function loadStories() {
    try {
        const data = await apiGet('/api/stories');
        if (Array.isArray(data)) { allStories = data; renderStories(); }
    } catch (e) { console.error('Story load error:', e); }
}

function renderStories() {
    const list = g('stories-list');
    // Keep the add button, remove rest
    const items = list.querySelectorAll('.story-item:not(.my-story)');
    items.forEach(el => el.remove());

    // Group by author
    const grouped = {};
    allStories.forEach(s => {
        if (!grouped[s.authorUsername]) grouped[s.authorUsername] = [];
        grouped[s.authorUsername].push(s);
    });
    const myCount = (grouped[MY_USERNAME] || []).length;
    set('my-story-count', String(myCount));

    Object.keys(grouped).forEach(author => {
        const div = document.createElement('div');
        div.className = 'story-item';
        div.innerHTML = `
            <div class="story-avatar-wrap has-story">
                <div class="story-avatar">${author[0].toUpperCase()}</div>
            </div>
            <div class="story-name">${escapeHtml(author)}</div>
        `;
        div.onclick = () => openStoryViewer(author);
        list.appendChild(div);
    });
}

window.openStoryComposer = () => {
    storyMediaData = null;
    g('story-text-input').value = '';
    g('story-preview-wrap').style.display = 'none';
    g('story-composer').classList.remove('hidden');
};
window.closeStoryComposer = () => g('story-composer').classList.add('hidden');
window.storyPickPhoto = () => g('story-photo-input').click();
window.storyPhotoSelected = (ev) => {
    const file = ev.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        storyMediaData = reader.result;
        g('story-preview-img').src = storyMediaData;
        g('story-preview-img').style.display = 'block';
        g('story-preview-wrap').style.display = 'block';
    };
    reader.readAsDataURL(file);
    ev.target.value = '';
};
window.submitStory = async () => {
    const text = g('story-text-input').value.trim();
    if (!storyMediaData && !text) { showAuthError('story-error', 'Bir metin veya fotoğraf gerekli.'); return; }
    const body = { text, media: storyMediaData || '', mediaType: storyMediaData ? 'image' : 'text' };
    const data = await apiPost('/api/stories', body);
    if (data.error) { showAuthError('story-error', data.error); return; }
    closeStoryComposer();
    loadStories();
};

// Story Viewer
let currentStoryAuthor = '';
let currentStoryList = [];
let currentStoryIdx = 0;

function openStoryViewer(author) {
    currentStoryAuthor = author;
    currentStoryList = allStories.filter(s => s.authorUsername === author);
    if (!currentStoryList.length) return;
    currentStoryIdx = 0;
    showView('story-view');
    displayStory();
}
function displayStory() {
    const s = currentStoryList[currentStoryIdx]; if (!s) { closeStoryViewer(); return; }
    set('sv-username', s.authorUsername);
    g('sv-avatar').innerText = s.authorUsername[0].toUpperCase();
    const ago = Math.round((Date.now() - s.createdAt) / 60000);
    set('sv-time', ago < 60 ? `${ago}dk önce` : `${Math.round(ago / 60)}sa önce`);

    g('sv-img').style.display = 'none';
    g('sv-video').style.display = 'none';
    g('sv-text').style.display = 'none';

    if (s.mediaType === 'image' && s.media) { g('sv-img').src = s.media; g('sv-img').style.display = 'block'; }
    if (s.text) { g('sv-text').innerText = s.text; g('sv-text').style.display = 'block'; }

    g('sv-delete-btn').style.display = s.authorUsername === MY_USERNAME ? 'block' : 'none';

    // Progress bar
    const fill = g('story-progress-fill');
    fill.style.transition = 'none';
    fill.style.width = '0%';
    setTimeout(() => { fill.style.transition = 'width 6s linear'; fill.style.width = '100%'; }, 50);
    clearTimeout(storyTimer);
    storyTimer = setTimeout(() => nextStory(), 6000);
}
window.nextStory = () => {
    clearTimeout(storyTimer);
    currentStoryIdx++;
    if (currentStoryIdx >= currentStoryList.length) closeStoryViewer();
    else displayStory();
};
window.prevStory = () => {
    clearTimeout(storyTimer);
    if (currentStoryIdx > 0) { currentStoryIdx--; displayStory(); }
    else displayStory(); // restart current
};
window.closeStoryViewer = () => {
    clearTimeout(storyTimer);
    showView('dm-view');
};
window.deleteCurrentStory = async () => {
    const s = currentStoryList[currentStoryIdx]; if (!s) return;
    await apiDelete('/api/stories/' + s.id);
    allStories = allStories.filter(st => st.id !== s.id);
    renderStories();
    closeStoryViewer();
};

// ============ KULLANICI ARAMA ============
let searchTimer;
function openSearchModal() {
    g('search-modal').classList.remove('hidden');
    g('search-user-input').value = '';
    g('search-results').innerHTML = '<div class="search-empty">Kullanıcı adı yazarak arayın</div>';
    setTimeout(() => g('search-user-input').focus(), 200);
    // Bind search input
    g('search-user-input').oninput = () => {
        clearTimeout(searchTimer);
        const q = g('search-user-input').value.trim();
        if (q.length < 2) {
            g('search-results').innerHTML = '<div class="search-empty">En az 2 karakter yazın</div>';
            return;
        }
        searchTimer = setTimeout(async () => {
            const results = await apiGet('/api/search-user/' + encodeURIComponent(q));
            const container = g('search-results');
            if (!Array.isArray(results) || results.length === 0) {
                container.innerHTML = '<div class="search-empty">Kullanıcı bulunamadı</div>';
                return;
            }
            container.innerHTML = results.map(u => {
                const avatarContent = u.profilePhoto
                    ? `<img src="${u.profilePhoto}" alt="">`
                    : u.username[0].toUpperCase();
                return `<div class="search-item" onclick="selectSearchUser('${escapeHtml(u.username)}')">
                    <div class="search-avatar">${avatarContent}</div>
                    <div class="search-name">${escapeHtml(u.username)}</div>
                </div>`;
            }).join('');
        }, 400);
    };
}

window.closeSearchModal = () => g('search-modal').classList.add('hidden');

window.selectSearchUser = (username) => {
    closeSearchModal();
    if (!document.querySelector(`.dm-item[data-peer="${CSS.escape(username)}"]`)) {
        addToDmList(username, true);
    }
    openChat(username);
};
