// ===================================================================
//  SURBIT P2P - QR KOD TÜNEL SİSTEMİ
//  Bluetooth yok. İnternet yok. Sadece WebRTC + QR Kod.
//  İki cihaz birbirinin QR'ını okuyarak P2P tünel kurar.
// ===================================================================

// ============ DURUM DEĞİŞKENLERİ ============
let MY_USERNAME = '';
let CURRENT_LANG = localStorage.getItem('surbit_lang') || 'tr';
let CURRENT_CHAT_PEER = null;   // { name, conn }
let CHAT_HISTORIES = {};
let peerConnection = null;      // RTCPeerConnection
let dataChannel = null;         // RTCDataChannel
let localStream = null;         // camera stream (scanner için)
let scanInterval = null;        // QR scan interval

// ============ ÇEVİRİLER ============
const T = {
    tr: {
        welcome: 'Surbit',
        instruction: 'Bir rumuz girerek başlayın.',
        login_btn: 'Bağlan',
        encryption: 'QR P2P · Uçtan Uca Şifreli 🔒',
        active_title: 'Bağlantılar',
        no_conn: 'Henüz bağlantı yok.',
        no_conn_hint: 'Sağ üstteki + butonuna bas.',
        qr_title: 'Yeni Bağlantı',
        role_title: 'Rol Seç',
        role_desc: 'Bağlantıyı kim başlatıyor?',
        host_btn: 'QR Oluştur (Ben başlatıyorum)',
        guest_btn: 'QR Tara (Karşıdan başlatıldı)',
        step1: 'Adım 1/2 · Bu QR\'ı karşı cihaza okut',
        host_hint: 'Karşı cihaz QR\'ı okutunca devam edecek...',
        host_next: 'Karşıdan QR Tara',
        step_g1: 'Adım 1/2 · Karşıdaki ekranı kamerana göster',
        scan_hint: 'QR koda odaklan...',
        step2: 'Adım 2/2 · Karşıdaki cevap QR\'ını tara',
        step2_hint: 'Cevap QR\'ına odaklan...',
        step_g2: 'Adım 2/2 · Bu QR\'ı karşı cihaza okut',
        guest_hint: 'Karşı cihaz okuyunca bağlantı kurulacak...',
        connecting: 'Bağlanıyor...',
        connecting_hint: 'WebRTC Tüneli Kuruluyor',
        p2p_status: 'P2P Bağlantısı Aktif 🔒',
        placeholder: 'Mesaj yazın...',
    },
    ar: {
        welcome: 'سوربيت',
        instruction: 'أدخل اسماً مستعاراً للبدء.',
        login_btn: 'اتصال',
        encryption: 'نفق QR · مشفر من طرف إلى طرف 🔒',
        active_title: 'الاتصالات',
        no_conn: 'لا توجد اتصالات بعد.',
        no_conn_hint: 'اضغط زر + في أعلى اليمين.',
        qr_title: 'اتصال جديد',
        role_title: 'اختر الدور',
        role_desc: 'من يبدأ الاتصال؟',
        host_btn: 'إنشاء QR (أنا أبدأ)',
        guest_btn: 'مسح QR (الطرف الآخر بدأ)',
        step1: 'الخطوة 1/2 · اعرض هذا QR للجهاز الآخر',
        host_hint: 'انتظر حتى يمسح الجهاز الآخر...',
        host_next: 'امسح QR الجهاز الآخر',
        step_g1: 'الخطوة 1/2 · وجّه الكاميرا نحو شاشة الجهاز الآخر',
        scan_hint: 'ركز على رمز QR...',
        step2: 'الخطوة 2/2 · امسح QR الرد من الجهاز الآخر',
        step2_hint: 'ركز على QR الرد...',
        step_g2: 'الخطوة 2/2 · اعرض هذا QR للجهاز الآخر',
        guest_hint: 'سيتصل الجهاز الآخر عند المسح...',
        connecting: 'جارٍ الاتصال...',
        connecting_hint: 'إنشاء نفق WebRTC',
        p2p_status: 'اتصال P2P نشط 🔒',
        placeholder: 'اكتب رسالة...',
    },
    en: {
        welcome: 'Surbit',
        instruction: 'Enter a nickname to start.',
        login_btn: 'Connect',
        encryption: 'QR P2P · End-to-End Encrypted 🔒',
        active_title: 'Connections',
        no_conn: 'No connections yet.',
        no_conn_hint: 'Tap the + button above.',
        qr_title: 'New Connection',
        role_title: 'Choose Role',
        role_desc: 'Who is initiating the connection?',
        host_btn: 'Generate QR (I\'m the host)',
        guest_btn: 'Scan QR (Peer is the host)',
        step1: 'Step 1/2 · Show this QR to the other device',
        host_hint: 'Waiting for the other device to scan...',
        host_next: 'Scan Peer\'s QR',
        step_g1: 'Step 1/2 · Point camera at the other screen',
        scan_hint: 'Focus on the QR code...',
        step2: 'Step 2/2 · Scan the answer QR from the other device',
        step2_hint: 'Focus on the answer QR...',
        step_g2: 'Step 2/2 · Show this QR to the other device',
        guest_hint: 'The other device will connect when scanned...',
        connecting: 'Connecting...',
        connecting_hint: 'Establishing WebRTC Tunnel',
        p2p_status: 'P2P Connection Active 🔒',
        placeholder: 'Type a message...',
    }
};

// ============ DİL ============
window.changeLanguage = (lang) => {
    CURRENT_LANG = lang;
    localStorage.setItem('surbit_lang', lang);
    applyTranslations();
    g('lang-options').classList.add('lang-options-hidden');
    g('chat-lang-options').classList.add('lang-options-hidden');
};

function g(id) { return document.getElementById(id); }

function applyTranslations() {
    const t = T[CURRENT_LANG];
    const set = (id, val) => { const el = g(id); if (el) el.innerText = val; };

    set('lang-welcome', t.welcome);
    set('lang-instruction', t.instruction);
    set('login-btn', t.login_btn);
    set('lang-encryption', t.encryption);
    set('lang-active-title', t.active_title);
    set('lang-no-conn', t.no_conn);
    set('lang-no-conn-hint', t.no_conn_hint);
    set('lang-qr-title', t.qr_title);
    set('lang-role-title', t.role_title);
    set('lang-role-desc', t.role_desc);
    set('lang-host-btn', t.host_btn);
    set('lang-guest-btn', t.guest_btn);
    set('lang-step1', t.step1);
    set('lang-host-hint', t.host_hint);
    set('lang-host-next', t.host_next);
    set('lang-step-g1', t.step_g1);
    set('lang-scan-hint', t.scan_hint);
    set('lang-step2', t.step2);
    set('lang-step2-hint', t.step2_hint);
    set('lang-step-g2', t.step_g2);
    set('lang-guest-hint', t.guest_hint);
    set('lang-connecting', t.connecting);
    set('lang-connecting-hint', t.connecting_hint);
    set('lang-p2p-status', t.p2p_status);

    const mi = g('message-input');
    if (mi) mi.placeholder = t.placeholder;

    // Aktif dil butonu
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    const ab = g(`lang-${CURRENT_LANG}`);
    if (ab) ab.classList.add('active');
}

// ============ GİRİŞ ============
g('login-btn').onclick = () => {
    const name = g('username-input').value.trim();
    if (!name) { g('username-input').focus(); return; }
    MY_USERNAME = name;
    localStorage.setItem('surbit_username', name);

    const lo = g('loading-overlay');
    lo.classList.remove('loader-hidden');
    setTimeout(() => {
        lo.classList.add('loader-hidden');
        g('login-overlay').style.display = 'none';
    }, 1200);
};

g('username-input').onkeypress = (e) => { if (e.key === 'Enter') g('login-btn').click(); };

// ============ EKRAN GEÇİŞLERİ ============
function showView(id) {
    ['dm-view', 'qr-view', 'chat-view'].forEach(v => {
        const el = g(v);
        if (el) {
            el.classList.remove('view-active');
            el.classList.add('view-hidden');
        }
    });
    const target = g(id);
    if (target) {
        target.classList.remove('view-hidden');
        target.classList.add('view-active');
    }
}

g('new-conn-btn').onclick = () => {
    stopCamera();
    resetQRSteps();
    showView('qr-view');
};

g('back-from-qr').onclick = () => {
    stopCamera();
    closePeer();
    showView('dm-view');
};

g('back-to-dm').onclick = () => {
    showView('dm-view');
};

function showQRStep(id) {
    ['step-role', 'step-host-qr', 'step-guest-scan', 'step-host-scan', 'step-guest-qr', 'step-connecting'].forEach(s => {
        const el = g(s);
        if (el) el.style.display = 'none';
    });
    const target = g(id);
    if (target) target.style.display = 'flex';
}

function resetQRSteps() {
    showQRStep('step-role');
}

// ============ WebRTC ALTYAPI ============
const ICE_SERVERS = { iceServers: [] }; // Tamamen offline çalışır, STUN/TURN sunucusu yok

function createPeerConnection(onIceDone, onMessage) {
    closePeer();
    peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // ICE toplandıktan sonra tetiklenir
    peerConnection.onicecandidate = () => { };
    peerConnection.onicegatheringstatechange = () => {
        if (peerConnection.iceGatheringState === 'complete') {
            onIceDone(peerConnection.localDescription);
        }
    };

    peerConnection.ondatachannel = (event) => {
        dataChannel = event.channel;
        setupDataChannel(onMessage);
    };

    peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
            onConnectionEstablished();
        } else if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
            handleDisconnect();
        }
    };

    return peerConnection;
}

function setupDataChannel(onMessage) {
    dataChannel.onopen = () => {
        console.log('DataChannel open');
        onConnectionEstablished();
    };
    dataChannel.onmessage = (evt) => {
        try {
            const msg = JSON.parse(evt.data);
            onMessage(msg);
        } catch (e) { }
    };
    dataChannel.onclose = () => handleDisconnect();
}

function closePeer() {
    if (dataChannel) { try { dataChannel.close(); } catch (e) { } dataChannel = null; }
    if (peerConnection) { try { peerConnection.close(); } catch (e) { } peerConnection = null; }
}

// ============ HOST AKIŞI ============
// HOST: Offer oluştur → QR göster → Answer QR okut → Bağlan
window.startAsHost = async () => {
    showQRStep('step-host-qr');

    const pc = createPeerConnection(async (localDesc) => {
        // ICE toplandı, Offer'ı QR'a yaz
        const offerStr = JSON.stringify({ sdp: localDesc.sdp, type: localDesc.type, from: MY_USERNAME });
        await generateQR('qr-canvas', offerStr);
    }, receiveMessage);

    // DataChannel oluştur (HOST açar)
    dataChannel = pc.createDataChannel('chat', { ordered: true });
    setupDataChannel(receiveMessage);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
};

// HOST: Adım 2 - Answer QR'ı tara
window.hostStep2 = () => {
    showQRStep('step-host-scan');
    startScanner('scan-video2', 'scan-canvas2', async (data) => {
        stopCamera('scan-video2');
        try {
            const answer = JSON.parse(data);
            CURRENT_CHAT_PEER = { name: answer.from || 'Karşı Taraf', conn: null };
            showQRStep('step-connecting');
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (e) {
            console.error('Answer parse error', e);
            alert('QR okunamadı, tekrar deneyin.');
            showQRStep('step-host-scan');
        }
    });
};

// ============ GUEST AKIŞI ============
// GUEST: Offer QR oku → Answer QR göster → Bağlan
window.startAsGuest = () => {
    showQRStep('step-guest-scan');
    startScanner('scan-video', 'scan-canvas', async (data) => {
        stopCamera('scan-video');
        try {
            const offer = JSON.parse(data);
            CURRENT_CHAT_PEER = { name: offer.from || 'Karşı Taraf', conn: null };

            const pc = createPeerConnection(async (localDesc) => {
                // Answer ICE toplandı, QR'a yaz
                const answerStr = JSON.stringify({ sdp: localDesc.sdp, type: localDesc.type, from: MY_USERNAME });
                showQRStep('step-guest-qr');
                await generateQR('qr-canvas2', answerStr);
            }, receiveMessage);

            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

        } catch (e) {
            console.error('Offer parse error', e);
            alert('QR okunamadı, tekrar deneyin.');
            showQRStep('step-guest-scan');
        }
    });
};

// ============ QR KOD OLUŞTUR ============
async function generateQR(canvasId, text) {
    const canvas = g(canvasId);
    if (!canvas) return;
    try {
        await QRCode.toCanvas(canvas, text, {
            width: 220,
            margin: 2,
            color: { dark: '#0f172a', light: '#ffffff' },
            errorCorrectionLevel: 'L'
        });
    } catch (e) {
        console.error('QR generate error', e);
    }
}

// ============ QR KOD TARA (KAMERA) ============
async function startScanner(videoId, canvasId, onFound) {
    const video = g(videoId);
    const canvas = g(canvasId);
    if (!video || !canvas) return;

    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } },
            audio: false
        });
        video.srcObject = localStream;
        await video.play();

        const ctx = canvas.getContext('2d');

        if (scanInterval) clearInterval(scanInterval);
        scanInterval = setInterval(() => {
            if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert'
            });
            if (code && code.data && code.data.includes('"sdp"')) {
                clearInterval(scanInterval);
                scanInterval = null;
                onFound(code.data);
            }
        }, 200);
    } catch (e) {
        console.error('Camera error', e);
        alert('Kamera açılamadı. Kamera iznini kontrol edin.');
    }
}

function stopCamera(videoId) {
    if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
    if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
    }
    // Her iki video elementini temizle
    ['scan-video', 'scan-video2'].forEach(id => {
        const el = g(id);
        if (el) { el.srcObject = null; }
    });
}

// ============ BAĞLANTI KURULDU ============
function onConnectionEstablished() {
    stopCamera();
    if (!CURRENT_CHAT_PEER) return;
    const name = CURRENT_CHAT_PEER.name;

    // DM listesine ekle (eğer yoksa)
    const existingItems = document.querySelectorAll('.dm-item');
    let alreadyExists = false;
    existingItems.forEach(item => {
        if (item.dataset.peer === name) alreadyExists = true;
    });

    if (!alreadyExists) {
        addToDmList(name);
    }

    // Sohbeti aç
    openChat(name);
}

function handleDisconnect() {
    if (!CURRENT_CHAT_PEER) return;
    console.log('Peer disconnected');
    // Statüyü güncelle ama sohbet geçmişini koru
}

// ============ DM LİSTESİ ============
function addToDmList(name) {
    const dmList = g('dm-list');
    const empty = dmList.querySelector('.empty-state');
    if (empty) empty.remove();

    const div = document.createElement('div');
    div.className = 'dm-item';
    div.dataset.peer = name;
    div.innerHTML = `
        <div class="dm-avatar">${name[0].toUpperCase()}</div>
        <div class="dm-info">
            <div class="dm-name">${name}</div>
            <div class="dm-status">P2P Bağlı 🔒</div>
        </div>
    `;
    div.onclick = () => openChat(name);
    dmList.appendChild(div);
}

// ============ SOHBET ============
function openChat(name) {
    g('chat-with-name').innerText = name;
    const mi = g('message-input');
    const sb = g('send-btn');
    mi.disabled = false;
    sb.disabled = false;
    mi.placeholder = T[CURRENT_LANG].placeholder;

    const messagesDiv = g('messages');
    messagesDiv.innerHTML = '';

    if (CHAT_HISTORIES[name]) {
        CHAT_HISTORIES[name].forEach(m => appendMessage(m.sender, m.text, m.time, m.isMe));
    }

    showView('chat-view');
    setTimeout(() => { mi.focus(); }, 300);
}

function receiveMessage(msg) {
    if (!msg || !msg.text) return;
    const name = CURRENT_CHAT_PEER ? CURRENT_CHAT_PEER.name : 'Karşı Taraf';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const m = { sender: name, text: msg.text, time, isMe: false };

    if (!CHAT_HISTORIES[name]) CHAT_HISTORIES[name] = [];
    CHAT_HISTORIES[name].push(m);

    if (g('chat-with-name').innerText === name) {
        appendMessage(m.sender, m.text, m.time, false);
    }
}

function handleSend() {
    if (!dataChannel || dataChannel.readyState !== 'open') {
        alert('Bağlantı kesildi.');
        return;
    }
    const text = g('message-input').value.trim();
    if (!text) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const name = CURRENT_CHAT_PEER ? CURRENT_CHAT_PEER.name : '';

    try {
        dataChannel.send(JSON.stringify({ text, from: MY_USERNAME }));
    } catch (e) {
        alert('Mesaj gönderilemedi.');
        return;
    }

    const m = { sender: MY_USERNAME, text, time, isMe: true };
    if (!CHAT_HISTORIES[name]) CHAT_HISTORIES[name] = [];
    CHAT_HISTORIES[name].push(m);
    appendMessage(MY_USERNAME, text, time, true);

    g('message-input').value = '';
    g('message-input').focus();
}

function appendMessage(sender, text, time, isMe) {
    const messagesDiv = g('messages');
    const div = document.createElement('div');
    div.className = `message ${isMe ? 'sent' : 'received'}`;
    div.innerHTML = `
        <div class="msg-bubble">${escapeHtml(text)}</div>
        <div class="msg-time" style="text-align:${isMe ? 'right' : 'left'}">${time}</div>
    `;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

g('send-btn').onclick = handleSend;
g('message-input').onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };

// ============ DİL MENÜSÜ ============
const langOptions = g('lang-options');
const chatLangOptions = g('chat-lang-options');

g('lang-menu-btn').onclick = (e) => {
    e.stopPropagation();
    langOptions.classList.toggle('lang-options-hidden');
};

g('chat-lang-menu-btn').onclick = (e) => {
    e.stopPropagation();
    chatLangOptions.classList.toggle('lang-options-hidden');
};

window.onclick = () => {
    langOptions.classList.add('lang-options-hidden');
    chatLangOptions.classList.add('lang-options-hidden');
};

// ============ BAŞLAT ============
document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();

    const saved = localStorage.getItem('surbit_username');
    if (saved) {
        MY_USERNAME = saved;
        g('login-overlay').style.display = 'none';
    }
});
