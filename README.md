# 🍿 PWA-TorServe
**Self-hosted torrent streaming gateway for Android TV and home NAS**

> Turns your NAS into a TV-first streaming box with native player handoff, resilient metadata loading, and a cleaner experience than a raw TorServe web UI.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![React](https://img.shields.io/badge/React-19-blue)](https://react.dev) [![Status](https://img.shields.io/badge/Status-Stable-green)](https://github.com/dbobkov245-source/PWA-TORSERVE)

PWA-TorServe is a self-hosted streaming stack built for Android TV, home NAS, and native external players like Vimu, MX Player, and VLC. It searches torrent sources, routes around blocked metadata endpoints, and starts playback from a TV-friendly interface instead of a bare utility panel.

## Why PWA-TorServe?

- **TV-first UX**: D-Pad navigation, focused layouts, deep external-player integration.
- **Resilient metadata**: Multi-layer fallback cascade for TMDB and related sources.
- **Self-hosted workflow**: Run it on your NAS or home server and keep playback under your control.
- **Better than a raw torrent panel**: Product-style interface on top of a torrent streaming backend.

---

## ✨ Highlights

🚀 **Cinematic Experience**
- **Infinite Scroll**: Endless feed of movies and TV shows.
- **Season Selector**: Dedicated UI for browsing TV show seasons.
- **Transform Scrolling**: Silky smooth 60fps navigation on low-end TV boxes.
- **Deep Integration**: Two-way sync with Vimu/MX Player (Auto-play next episode, Resume playback).

🛡️ **Operation "Unstoppable"**
- **5-Level Anti-Censorship Cascade**:
  1. Custom Worker
  2. Public Proxy
  3. **Client-Side DoH** (Bypasses DNS poisoning)
  4. Corsproxy.io
  5. Kinopoisk Fallback

---

## 🚀 Key Features

### 📺 The Interface
- **Remote Control First**: Fully navigable with a standard D-Pad remote.
- **Focus Centering**: Apple TV-style scrolling keeps the active item centered.
- **Dynamic Backdrops**: Background changes instantly as you browse.
- **Smart Metadata**: 4K/HDR/HEVC badges, ratings, and cast info.

### ⚡ The Engine
- **Aggregator**: Searches Jacred, RuTracker, Rutor, and TorLook in parallel.
- **Torrent Stream**: Starts playing in 5-10 seconds without waiting for download.
- **Auto-Boost**: Prioritizes sequential chunks for instant playback.
- **Self-Healing**: Built-in Circuit Breaker and Watchdog prevent crashes.

### 📲 The Client (APK)
- **Native Android TV App**: Built with Capacitor 6.
- **Voice Search**: Integrated with Android Speech Recognition.
- **No Backend Dependency**: Metadata fetching happens entirely on the client (Zero-Cost Architecture).

---

## 🛠 Tech Stack

- **Frontend**: React 19, Vite 7, TailwindCSS 4, Framer Motion
- **Mobile/TV**: Capacitor 6 (Native Java Plugins for Player Integration)
- **Backend**: Node.js, Express, torrent-stream
- **DevOps**: Docker, Docker Compose

---

## 📦 Installation

### Option 1: Docker (Recommended)
Run on your Synology NAS, Raspberry Pi, or VPS.

```bash
# 1. Create directory
mkdir -p pwa-torserve/downloads
cd pwa-torserve

# 2. Download docker-compose.yml
curl -o docker-compose.yml https://raw.githubusercontent.com/dbobkov245-source/PWA-TORSERVE/main/docker-compose.yml

# 3. Start
docker-compose up -d
```

Access at: `http://your-nas-ip:3000`

### Option 2: Android TV Client (APK)
To get the full experience, install the Android TV client.

1. **Download the latest APK from GitHub Releases**:
   [PWA-TorServe Releases](https://github.com/dbobkov245-source/PWA-TORSERVE/releases)

2. **Or build it yourself**:
   ```bash
   cd client
   npm install && npm run build
   npx cap sync
   cd android && ./gradlew assembleDebug
   ```
3. **Install**: Copy the built APK to your TV and install it.

### 🔄 Release Process
For developers maintaining the project, please refer to the [Release Process Guide](docs/RELEASE_PROCESS.md) for detailed instructions on versioning and publishing updates.

---

## 🎮 Usage Guide

1. **Home Screen**: Browse "Trending", "Popular", or "Top Rated".
2. **Search**: Use the onscreen keyboard or **Voice Search** button.
3. **Select**: Click a movie card.
   - For TV Shows: Select a Season first.
4. **Resilience**: If a provider fails (e.g., Rutor), the system auto-switches to others.
5. **Playback**: Click **"Найти торренты"** -> Select a release -> **Play**.
   - *Pro Tip:* If you have Vimu installed, it will auto-mark watched episodes.

---

## 🛡️ Privacy & Security
- **No Tracking**: We don't collect logs.
- **Client-Side Processing**: All metadata requests go directly from your device to TMDB/Proxy.
- **Clean Traffic**: DoH ensures your ISP can't snoop on your DNS requests.

---

## 📄 License
MIT License. Free forever.

Made with ❤️ for the Home Cinema community.
