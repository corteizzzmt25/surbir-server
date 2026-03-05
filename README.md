# BitChat - Offline Local Network Chat

This is a premium communication app designed to work on local networks (LAN/WLAN) without needing an internet connection.

## How it works
1. Start the server on one computer.
2. Other devices on the same WiFi/Network connect to that computer's IP address.
3. Chat in real-time instantly.

## Quick Start
1. `npm install`
2. `npm start`
3. Visit `http://localhost:3000`

---
### Architecture
- Express (Web server)
- WS (WebSockets for real-time)
- PWA (Service Worker for offline assets)
- Glassmorphism UI (Vanilla CSS/JS)
