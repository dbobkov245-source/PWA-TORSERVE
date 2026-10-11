# 🍿 PWA-TorServe
**Self-hosted torrent streaming gateway for Android TV and home NAS**

> Turns your NAS into a TV-first streaming box with native player handoff, resilient metadata loading, and a cleaner experience than a raw TorrServer web UI.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![React](https://img.shields.io/badge/React-19-blue)](https://react.dev) [![Status](https://img.shields.io/badge/Status-Stable-green)](https://github.com/dbobkov245-source/PWA-TORSERVE)

PWA-TorServe is a self-hosted streaming stack built for Android TV, home NAS, and native external players like Vimu, MX Player, and VLC. It searches torrent sources, routes around blocked metadata endpoints, and starts playback from a TV-friendly interface instead of a bare utility panel.

## Why PWA-TorServe?

- **TV-first UX**: D-Pad navigation, focused layouts, deep external-player integration.
- **Resilient metadata**: Multi-layer fallback cascade for TMDB and related sources.
- **Two download engines**: A built-in torrent engine, plus an optional TorrServer sidecar that can take over swarms the built-in engine cannot reach.
- **Self-hosted workflow**: Run it on your NAS or home server and keep playback under your control.

---

## ✨ Highlights

🚀 **Cinematic Experience**
- **Infinite Scroll**: Endless feed of movies and TV shows.
- **Season Selector**: Dedicated UI for browsing TV show seasons.
- **Transform Scrolling**: Smooth navigation on low-end TV boxes.
- **Deep Integration**: Two-way sync with Vimu/MX Player (auto-play next episode, resume playback).

🛡️ **Operation "Unstoppable"**: a metadata cascade that keeps working when TMDB is blocked
1. Custom Cloudflare Worker
2. Lampa proxy
3. Server proxy (`/api/proxy`)
4. Native HTTP + client-side DoH (bypasses DNS poisoning; JSON only, never images)
5. Corsproxy.io (browser fallback)
6. Kinopoisk (text-only fallback when every TMDB route is down)

---

## 🚀 Key Features

### 📺 The Interface
- **Remote Control First**: Fully navigable with a standard D-Pad remote.
- **Focus Centering**: Apple TV-style scrolling keeps the active item centered.
- **Dynamic Backdrops**: Background changes instantly as you browse.
- **Smart Metadata**: 4K/HDR/HEVC badges, ratings, and cast info.

### ⚡ The Engine
- **Search**: jac.red (queried by title, as Lampa does) and Rutor out of the box. RuTracker (needs a login), TorLook and Torznab/Jackett are opt-in. Results are ranked by seeders.
- **Streaming**: Playback starts after the first pieces arrive. Sequential priority follows the player, including seeks.
- **Hybrid downloads**: The server moves a download to TorrServer automatically when the built-in engine is stuck:
  - no connected peer 15 s after adding it,
  - zero connected peers for 30 s,
  - or under 800 KB/s after 90 s.

  It never does this past 50% or while you are watching. On demand, **"🚀 Ускорить через TorrServer"** does the same, and is shown only while the built-in engine is below 5 MB/s, because on a healthy swarm it is usually the faster of the two.
- **Self-Healing**: Circuit breaker, stream-stall watchdog, and a bounded disk-write queue, so a swarm faster than your disk cannot exhaust memory.

### 📲 The Client (APK)
- **Native Android TV App**: Built with Capacitor 6.
- **Voice Search**: Integrated with Android speech recognition.
- **LAN Updates**: The app checks your own server for new versions before GitHub.
- **No Backend Dependency for Metadata**: The client fetches metadata itself (Zero-Cost Architecture).

---

## 🛠 Tech Stack

- **Frontend**: React 19, Vite 7, TailwindCSS 4
- **Mobile/TV**: Capacitor 6 (native Java plugin for player integration)
- **Backend**: Node.js, Express, torrent-stream (patched at load time: deeper request pipeline, write backpressure)
- **Optional sidecar**: [TorrServer](https://github.com/YouROK/TorrServer) MatriX
- **DevOps**: Docker, Docker Compose

---

## 📦 Installation

### 1. Server (Docker)
Runs on a Synology NAS, Raspberry Pi, or VPS. The compose file builds the image from source, so clone the repository:

```bash
git clone https://github.com/dbobkov245-source/PWA-TORSERVE.git pwa-torserve
cd pwa-torserve
cp .env.example .env        # server settings, see Configuration below
docker compose up -d --build
```

Before the first start, point the downloads volume in `docker-compose.yml` at your media folder. It defaults to the Synology path `/volume1/docker/pwa-torserve/downloads`.

Open `http://your-nas-ip:3000`. Publish port **6881** (TCP and UDP) for inbound peers. The compose file already maps it.

On Synology, `docker-compose.synology.yml` uses host networking, because DSM hides containers with published UDP ports from its Docker UI. It also carries tuned engine settings.

Client keys (`VITE_TMDB_API_KEY`, `VITE_KP_API_KEY`, `VITE_TMDB_PROXY_URL`) are read from `client/.env` **at build time** and end up inside the bundle. They are optional, because the metadata cascade works without them. Never publish a build that contains your keys (see Privacy & Security).

### 2. TorrServer sidecar (recommended, essential in Russia)
The built-in engine has no protocol encryption and no peer exchange. On many Russian swarms it reaches 0–3 of dozens of peers, while TorrServer connects to 20+. Run TorrServer next to the app:

```bash
docker run -d --name torrserver --restart unless-stopped --memory=320m \
  -p 8090:8090 -p 6882:6882 -p 6882:6882/udp \
  ghcr.io/yourok/torrserver:latest
```

- **Use the `ghcr.io/yourok/torrserver` image.** The Docker Hub `yourok/torrserver` image downloads a glibc binary into a musl base and exits with code 127.
- **Publish both ports.** Without a published 8090, the app cannot reach TorrServer at its default `TS_URL` (`http://172.17.0.1:8090`). Nothing errors: `/api/metrics` just reports `torrServer.available: false` and handover never happens. The player also streams straight from `http://<nas-ip>:8090`. Port 6882 is for inbound peers.
- **TorrServer settings** (web UI at `:8090`): `PeersListenPort` 6882, `UseDisk` off (on crashes MatriX 141.5), `ReaderReadAHead` 95, `CacheSize` 64 MB, `TorrentDisconnectTimeout` 180. Persist its config directory if you recreate the container.
- **Changing TorrServer settings restarts its torrent client and drops every active download**, including ones the app handed over. Change them when nothing is downloading.

### 3. Android TV app (APK)
1. **Download** the latest APK from [GitHub Releases](https://github.com/dbobkov245-source/PWA-TORSERVE/releases) and install it on the TV.
2. **Or build it yourself**:
   ```bash
   cd client
   npm ci && npm run build
   npx cap sync android
   cd android && ./gradlew assembleRelease
   ```
   Release signing reads `client/android/keystore.properties` (`storeFile`, `storePassword`, `keyAlias`, `keyPassword`; gitignored). Keep one keystore forever: an APK signed with a different key, including any `assembleDebug` build, will not install over an existing release.

### 🔄 Releasing
1. Bump the version in **both** `version.json` (repo root, read by GitHub-based updates) and `client/public/version.json` (served by your server), and `versionCode`/`versionName` in `client/android/app/build.gradle`. A test fails if the two JSON files disagree.
2. Build as above, then check the signer: `apksigner verify --print-certs <apk>`.
3. For LAN updates, copy the rebuilt `client/dist` and `pwa-torserve-v<version>.apk` into the server's `client-dist` folder. The app asks `<server>/api/updater/version.json` first, and the server rewrites the download URL to itself when the APK is there.
4. Publish the APK as a GitHub release named `v<version>`, matching the `url` in `version.json`.

---

## ⚙️ Configuration

Server settings are environment variables (`.env` or the compose file). The ones you are most likely to touch:

| Variable | Default | What it does |
|---|---|---|
| `DOWNLOAD_PATH` | `./downloads` | Where files are written |
| `TORRENT_PORT` | `6881` | Inbound peer port (publish it) |
| `TORRENT_CONNECTIONS` | `55` | Peer connections per torrent |
| `TORRENT_MAX_PENDING_WRITE_MB` | `64` | Memory budget for pieces waiting on the disk; the engine pauses requests above it |
| `TS_FAILOVER` | on | `0` disables TorrServer handover entirely |
| `TS_URL` | `http://172.17.0.1:8090` | How the server reaches TorrServer |
| `TS_PUBLIC_PORT` | `8090` | TorrServer port the player is redirected to |
| `TS_BOOST_MAX_SPEED_BPS` | `5242880` (5 MB/s) | Above this native speed the manual boost is hidden and refused |
| `TS_FAILOVER_MIN_SPEED_BPS` | `819200` (800 KB/s) | Automatic handover threshold after the grace period |
| `RUTRACKER_LOGIN` / `RUTRACKER_PASSWORD` | — | Enables RuTracker search |
| `TORLOOK_ENABLED` / `TORZNAB_ENABLED` | off | `1` enables those providers (`TORZNAB_URL`, `TORZNAB_API_KEY` for Jackett) |
| `TRAKT_CLIENT_ID` / `TRAKT_REDIRECT_URI` | — | Trakt sync. Create the app on developer.trakt.tv; new apps have no client secret, set the redirect you registered there |
| `TMDB_API_KEY` | — | Server-side TMDB calls: the `/api/proxy` level of the cascade, server search, picks |
| `DOH_DEBUG` | `0` | `1` logs every DoH lookup (noisy) |

---

## 🧰 Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Ускорить через TorrServer" is missing | The download already runs at 5 MB/s or more, where TorrServer would be slower. It reappears if the speed drops. |
| `/api/metrics` shows `torrServer.available: false` | TorrServer ports are not published (see the sidecar section). |
| The server restarts every minute; `docker inspect` shows `OOMKilled=true` | The container memory limit is too tight for the write budget. Lower `TORRENT_MAX_PENDING_WRITE_MB` or raise the limit. |
| 0 peers on every torrent right after a restart | Check that `TORRENT_PORT` is published. To apply env changes, recreate the container with `docker compose up -d`; `docker restart` keeps the old environment. |
| Everything plays except fresh downloads | Update the server: finished TorrServer downloads are served from disk since v3.18.1. |

---

## 🎮 Usage Guide

1. **Home Screen**: Browse "Trending", "Popular", or "Top Rated".
2. **Search**: Use the onscreen keyboard or the **Voice Search** button.
3. **Select**: Open a movie card. For TV shows, pick a season first.
4. **Playback**: **"Найти торренты"** → pick a release → **Play**. The external player starts as soon as the first pieces arrive.
   - *Pro Tip:* With Vimu, watched episodes are marked automatically, and playback resumes where you stopped.
5. **Slow download?** Open the torrent and press **"🚀 Ускорить через TorrServer"** if it is shown. The download restarts from 0% on TorrServer, which writes the file sequentially, so it cannot reuse the built-in engine's pieces.

---

## 🛡️ Privacy & Security
- **No Tracking**: The project collects no telemetry.
- **Client-Side Metadata**: Metadata requests go from your device to TMDB or the proxies in the cascade.
- **DoH for Lookups**: Metadata hostnames are resolved over DNS-over-HTTPS, bypassing poisoned ISP resolvers.
- **Build keys are public**: Anything in `client/.env` is compiled into the app bundle and readable by whoever has the APK. Published release APKs are built without it. Keep your own keys out of anything you share.

---

## 📄 License
MIT License. Free forever.

Made with ❤️ for the Home Cinema community.
