# 📺 PWA-TorServe
**Self-Healing Streaming Torrent Server for Home**

Listen to audiobooks, watch movies and TV shows **online without full downloading** on Android TV, phone, browser, or any device. Works on Synology NAS, Raspberry Pi, home server, or in Docker. Starts in seconds.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

### ✨ Why PWA-TorServe?
- **Instant Start** — Video plays in 5–10 seconds (even 4K HDR)
- **Self-Healing** — Watchdog + Circuit Breaker + RAM monitoring to prevent crashes
- **Turbo Mode** — Automatically boosts connections during playback
- **Smart Priority** — Prioritizes first video chunks for instant start
- **Native Players** — Vimu, VLC, MX Player launch directly from PWA (Capacitor)
- **TV-Friendly UI** — Netflix-like interface with remote control/focus support
- **Docker-First** — Single `docker-compose up` → ready on NAS

### 🚀 Features
| Feature | Description |
| :--- | :--- |
| 📺 **Streaming** | Stream without full download (torrent-stream + on-demand priority) |
| 🔍 **Search** | Jacred (multi-mirror) + TMDB/Kinopoisk posters |
| 🎬 **Turbo & Priority** | Auto-boost peers + prioritize required chunks for playback start |
| 🖼️ **Posters & Metadata** | TMDB/Kinopoisk with DoH bypass for blocks |
| 📋 **M3U Playlist** | For Kodi, Plex, VLC integration |
| 🧹 **File Hygiene** | Auto-delete files when removing torrents |
| 🛡️ **Watchdog** | RAM/Storage monitoring, auto-pause, circuit breaker |
| ⚡ **PWA + Native** | Installable as an app on Android TV/Phone |

### 🛠 Tech Stack
- **Backend**: Node.js, Express, torrent-stream, lowdb
- **Frontend**: React 19, Vite 7, TailwindCSS 4
- **Mobile/TV**: Capacitor 6 (APK + native intents)
- **DevOps**: Docker multi-stage, docker-compose
- **Bypass**: DoH, insecureAgent, Cloudflare Worker (optional)

### 📦 Installation (1 Minute)
**Docker (Synology / Raspberry Pi / Any NAS)**
```bash
# Create download folder
mkdir -p /volume1/docker/pwa-torserve/downloads

# Start container
docker-compose up -d
```

**Access:** `http://your-nas-ip:3000`

### 📱 Android TV / Mobile Client
1. Open `http://your-nas-ip:3000` in Chrome
2. Tap "Add to Home Screen" (PWA)
3. **Or build native APK:**
   ```bash
   cd client && npm install && npm run build
   npx cap sync
   cd android && ./gradlew assembleDebug
   ```

### ⚡ Usage
1. Open the app
2. Paste **magnet link** → **Add**
3. Wait for metadata (5-10 sec)
4. Press **▶ WATCH** → Video opens in Vimu/VLC/MX Player

### ❓ FAQ
**Q: Does it work on Android TV?**
A: Yes! Use the PWA or build the APK. Supports Vimu/VLC/MX Player via native intents.

**Q: How much RAM is needed?**
A: 512MB–1GB is sufficient. The watchdog prevents OOM issues.

**Q: TMDB is blocked?**
A: Use Cloudflare Worker or Kinopoisk API (see `.env.example`).

---

### 📄 License
MIT License — Free to use, modify, and distribute.

### ❤️ Contribute
If this project helped you, please star it on GitHub!

**Made with ❤️ for home cinema.**