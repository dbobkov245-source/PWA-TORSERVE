# PWA-TorServe (MediaBox) - Full Project Code v2.3.1

> Полная документация проекта с исходным кодом

**Версия:** 2.3.1  
**Дата:** 2025-12-29  
**Репозиторий:** [github.com/dbobkov245-source/PWA-TORSERVE](https://github.com/dbobkov245-source/PWA-TORSERVE)

---

## 📁 Структура проекта

\`\`\`
PWA-TorServe/
├── server/                    # Node.js Backend
│   ├── index.js              # Express сервер, API endpoints
│   ├── torrent.js            # Torrent-stream менеджер
│   ├── db.js                 # LowDB persistence
│   ├── dbQueue.js            # Write queue для race condition prevention
│   ├── watchdog.js           # Health monitoring, Circuit Breaker
│   ├── autodownloader.js     # Auto-download engine
│   ├── jacred.js             # Jacred mirror search
│   ├── rutracker.js          # RuTracker search
│   └── utils/
│       ├── lag-monitor.js    # Event loop lag detection
│       ├── logger.js         # Structured logging
│       └── doh.js            # DNS-over-HTTPS
├── client/                    # React Frontend (Vite)
│   ├── src/
│   │   ├── App.jsx           # Main application (740 lines)
│   │   ├── main.jsx          # Entry point
│   │   ├── components/
│   │   │   ├── Poster.jsx           # Torrent card с постером
│   │   │   ├── TorrentModal.jsx     # File list modal
│   │   │   ├── SettingsPanel.jsx    # Settings UI
│   │   │   ├── SearchPanel.jsx      # RuTracker search
│   │   │   ├── DiagnosticsPanel.jsx # Server diagnostics
│   │   │   ├── AutoDownloadPanel.jsx # Auto-download rules
│   │   │   └── StatusBanners.jsx    # Status indicators
│   │   └── utils/
│   │       └── helpers.js    # Utility functions
│   ├── public/
│   ├── android/              # Capacitor Android project
│   └── capacitor.config.json # Capacitor config
├── docker-compose.yml         # Docker config
├── Dockerfile                 # Multi-stage build
└── .dockerignore              # Docker ignore
\`\`\`

---

## 🔧 Server Dependencies

\`\`\`json
{
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "lowdb": "^7.0.1",
    "torrent-stream": "^1.2.0"
  }
}
\`\`\`

## 📱 Client Dependencies

\`\`\`json
{
  "dependencies": {
    "@capacitor/app": "^6.0.3",
    "@capacitor/browser": "^6.0.6",
    "@capacitor/core": "^6.2.1",
    "@capacitor/preferences": "^6.0.3",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  }
}
\`\`\`

---

## 🖥️ Server Code

### server/index.js (596 строк)
Express server с API endpoints:
- \`/api/status\` — состояние торрентов
- \`/api/add\` — добавление magnet
- \`/api/delete/:hash\` — удаление торрента
- \`/stream/:hash/:index\` — стриминг файла
- \`/api/lag-stats\` — диагностика (v2.3)
- Rate limiting (60 req/min)

### server/torrent.js (665 строк)
Torrent-stream engine manager:
- Keep-alive для instant resume
- Smart Priority для streaming
- Watchlist (new files detection)
- Status caching (5s TTL v2.3)
- isTorrentCompleted caching (60s TTL v2.3)

### server/utils/lag-monitor.js (75 строк)
Event loop мониторинг v2.3:
- Production: 1000ms interval, 200ms threshold
- Development: 250ms interval, 50ms threshold

### server/watchdog.js (290 строк)
Health monitoring:
- RAM monitoring + NFS Circuit Breaker

---

## 📱 Client Code

### client/src/App.jsx (740 строк)
Main React компонент:
- Capacitor Preferences для Android 9 (v2.3)
- Backspace fix при вводе текста (v2.3)
- Category filtering, Continue Watching
- Deep link support (magnet:)
- TVPlayer native plugin

### Components:
| Component | Lines | Purpose |
|-----------|-------|---------|
| Poster.jsx | 232 | Torrent card с постером |
| DiagnosticsPanel.jsx | 182 | Server diagnostics v2.3 |
| SettingsPanel.jsx | 346 | Settings UI + TV navigation |
| AutoDownloadPanel.jsx | 547 | Auto-download rules |
| StatusBanners.jsx | 141 | Status indicators |
| SearchPanel.jsx | 84 | RuTracker search |
| TorrentModal.jsx | 118 | File list |

---

## 📊 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| \`/api/status\` | GET | Server status + torrents |
| \`/api/health\` | GET | Lightweight health check |
| \`/api/lag-stats\` | GET | Event loop diagnostics |
| \`/api/add\` | POST | Add magnet link |
| \`/api/delete/:hash\` | DELETE | Remove torrent |
| \`/stream/:hash/:index\` | GET | Stream file |

---

## 🔄 Version 2.3.1 (2025-12-29)

**Server:**
- Adaptive LagMonitor (prod: 1000ms/200ms)
- Cache isTorrentCompleted() 60s TTL
- STATUS_CACHE_TTL 5s
- Enhanced /api/lag-stats
- Rate limit 60 req/min

**Client:**
- Android 9 player persistence fix
- Backspace typing fix
- TV navigation for poster test
- Enhanced diagnostics
- MediaBox rebranding

---

## 🚀 Deployment

\`\`\`bash
# Run
docker-compose up -d --build

# Hot-deploy server
docker restart pwa-torserve

# Build APK
cd client && npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
\`\`\`
