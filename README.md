# 🍿 PWA-TorServe v4.0
**The Ultimate Self-Hosted Streaming Gateway**

> *Turns your NAS into a private Netflix-class streaming service.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![React](https://img.shields.io/badge/React-19-blue)](https://react.dev) [![Status](https://img.shields.io/badge/Status-Stable-green)](https://github.com/bobmark/pwa-torserve)

PWA-TorServe is a **middleware** that bridges the gap between torrent networks and your TV. It aggregates search results, bypasses censorship, and streams content directly to your favorite player (Vimu, MX Player, VLC) with a **premium cinematic interface**.

---

## ✨ What's New in v4.0?

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
curl -o docker-compose.yml https://raw.githubusercontent.com/bobmark/pwa-torserve/main/docker-compose.yml

# 3. Start
docker-compose up -d
```

Access at: `http://your-nas-ip:3000`

### Option 2: Android TV Client (APK)
To get the full experience (Voice Search, Deep Player Integration), install the APK.

1. **Build it yourself**:
   ```bash
   cd client
   npm install && npm run build
   npx cap sync
   cd android && ./gradlew assembleDebug
   ```
2. **Install**: Copy `app-debug.apk` to your TV and install.

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