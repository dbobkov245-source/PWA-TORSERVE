# PWA-TorServe Project Code

This document contains the complete source code for the PWA-TorServe project, updated with recent performance optimizations (LagMonitor, async disk cache, debounced DB writes, status caching, memory fixes).

## Project Structure

```
PWA-TorServe/
├── package.json
├── docker-compose.yml
├── Dockerfile
├── server/
│   ├── index.js
│   ├── torrent.js
│   ├── watchdog.js
│   ├── db.js
│   ├── jacred.js
│   └── utils/
│       ├── lag-monitor.js
│       ├── logger.js
│       └── doh.js
└── client/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        └── ...
```

## Configuration & Deployment

### package.json
```json
{
  "name": "pwa-torserve",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server/index.js",
    "dev": "node server/index.js",
    "client:install": "cd client && npm install",
    "client:build": "cd client && npm run build"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "lowdb": "^7.0.1",
    "torrent-stream": "^1.2.0"
  }
}
```

### Dockerfile
```dockerfile
# PWA-TorServe Docker Image
# Multi-stage build: Client + Server

# ─── Stage 1: Build Client ───
FROM node:20-slim AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ─── Stage 2: Server Dependency Builder ───
FROM node:20-slim AS server-builder
WORKDIR /app
# Install build tools for native modules (python3, make, g++)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --only=production

# ─── Stage 3: Final Production Image ───
FROM node:20-slim

# Install runtime dependencies (ffmpeg only)
RUN apt-get update && \
    apt-get install -y ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built node_modules from builder
COPY --from=server-builder /app/node_modules ./node_modules
# Copy built client from client-builder
COPY --from=client-builder /app/client/dist ./client/dist
# Copy project files
COPY package*.json ./
COPY server/ ./server/

# Create directories
RUN mkdir -p /app/downloads /app/data && \
    echo '{"serverStatus":"ok","lastStateChange":0,"storageFailures":0,"progress":{}}' > /app/data/db.json

# Expose port
EXPOSE 3000

# Environment defaults
ENV DOWNLOAD_PATH=/app/downloads
ENV DB_PATH=/app/data/db.json
ENV NODE_ENV=production

# Health check (using curl)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start server
CMD ["node", "server/index.js"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  pwa-torserve:
    build: .
    image: pwa-torserve:latest
    container_name: pwa-torserve
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DOWNLOAD_PATH=/app/downloads
      - DB_PATH=/app/data/db.json
    volumes:
      # Persistent data (database, settings)
      - ./data:/app/data
      # Downloads folder (map to your NAS media folder)
      - /volume1/docker/pwa-torserve/downloads:/app/downloads
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## Server Code

### server/index.js
```javascript
// Security: SSL validation enabled globally (see jacred.js for targeted exceptions)

import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import fs from 'fs'
import { addTorrent, getAllTorrents, getTorrent, getRawTorrent, removeTorrent, restoreTorrents, prioritizeFile, readahead, boostTorrent, destroyAllTorrents } from './torrent.js'
import { db } from './db.js'
import { startWatchdog, stopWatchdog, getServerState } from './watchdog.js'
import { LagMonitor } from './utils/lag-monitor.js'

// ────────────────────────────────────────────────────────
// 📊 Lag Monitor: Detect event loop blocking
// ────────────────────────────────────────────────────────
const lagMonitor = new LagMonitor(50) // 50ms threshold
lagMonitor.start()

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())

// ────────────────────────────────────────────────────────
// 🛡️ Rate Limiting (Zero-Dependency)
// 30 requests per minute per IP for /api/* routes
// ────────────────────────────────────────────────────────
const rateLimitMap = new Map()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 30 // requests per window

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now()
    for (const [ip, data] of rateLimitMap.entries()) {
        if (now - data.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
            rateLimitMap.delete(ip)
        }
    }
}, 5 * 60 * 1000)

app.use('/api/', (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown'
    const now = Date.now()

    let entry = rateLimitMap.get(ip)
    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        // New window
        entry = { windowStart: now, count: 1 }
        rateLimitMap.set(ip, entry)
    } else {
        entry.count++
    }

    // Set rate limit headers
    res.set('X-RateLimit-Limit', RATE_LIMIT_MAX)
    res.set('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT_MAX - entry.count))
    res.set('X-RateLimit-Reset', Math.ceil((entry.windowStart + RATE_LIMIT_WINDOW_MS) / 1000))

    if (entry.count > RATE_LIMIT_MAX) {
        console.warn(`[RateLimit] Too many requests from ${ip}: ${entry.count}`)
        return res.status(429).json({
            error: 'Too many requests',
            retryAfter: Math.ceil((entry.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000)
        })
    }

    next()
})

// DEBUG: Log all non-static requests
app.use((req, res, next) => {
    if (!req.url.match(/\.(js|css|png|jpg|ico|map)$/)) {
        console.log(`[HTTP] ${req.method} ${req.url}`)
    }
    next()
})

// Serve static frontend
const distPath = path.join(__dirname, '../client/dist')
app.use(express.static(distPath))

// API: Health Check (lightweight)
app.get('/api/health', (req, res) => {
    const state = getServerState()
    res.json({
        serverStatus: state.serverStatus,
        lastStateChange: state.lastStateChange
    })
})

// API: Lag Stats (performance monitoring)
app.get('/api/lag-stats', (req, res) => {
    res.json(lagMonitor.getStats())
})

// API: Status (with server state)
app.get('/api/status', (req, res) => {
    const state = getServerState()

    // Return 503 with Retry-After for critical states
    if (state.serverStatus === 'circuit_open' || state.serverStatus === 'error') {
        res.set('Retry-After', '300') // 5 minutes
        return res.status(503).json({
            serverStatus: state.serverStatus,
            lastStateChange: state.lastStateChange,
            torrents: []
        })
    }

    const torrents = getAllTorrents()
    const status = torrents.map(t => ({
        infoHash: t.infoHash,
        name: t.name,
        progress: t.progress,
        isReady: t.isReady,  // ✅ Fix: передаём isReady для правильного отображения в UI
        downloaded: t.downloaded,
        totalSize: t.totalSize,
        downloadSpeed: t.downloadSpeed,
        numPeers: t.numPeers,
        eta: t.eta,
        fileCount: t.fileCount, // 🔥 Added in memory fix
        files: t.files.map(f => ({
            name: f.name,
            length: f.length,
            index: f.index
        }))
    }))

    res.json({
        serverStatus: state.serverStatus,
        lastStateChange: state.lastStateChange,
        torrents: status
    })
})

// API: TMDB Proxy with DoH bypass
import { smartFetch, insecureAgent } from './utils/doh.js'

const TMDB_API_KEY = process.env.TMDB_API_KEY || ''

app.get('/api/tmdb/search', async (req, res) => {
    const { query } = req.query
    if (!query) return res.status(400).json({ error: 'Query required' })

    try {
        const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=ru-RU`
        const response = await smartFetch(url)
        res.json(response.data)
    } catch (err) {
        console.error('[TMDB] Search error:', err.message)
        res.status(502).json({ error: 'TMDB API unavailable', details: err.message })
    }
})

app.get('/api/tmdb/image/:size/:path', async (req, res) => {
    const { size, path: imagePath } = req.params
    try {
        const url = `https://image.tmdb.org/t/p/${size}/${imagePath}`
        const response = await smartFetch(url, { responseType: 'arraybuffer' })
        res.set('Content-Type', response.headers['content-type'] || 'image/jpeg')
        res.set('Cache-Control', 'public, max-age=86400')
        res.send(response.data)
    } catch (err) {
        console.error('[TMDB] Image error:', err.message)
        res.status(502).send('Image unavailable')
    }
})
// API: Jacred Torrent Search (like Lampa)
// ─────────────────────────────────────────────────────────────

import { searchJacred, getMagnetFromJacred } from './jacred.js'

// Search torrents via Jacred
app.get('/api/rutracker/search', async (req, res) => {
    const { query } = req.query
    if (!query) {
        return res.status(400).json({ error: 'Query required' })
    }

    console.log(`[Jacred] Searching: ${query}`)
    const result = await searchJacred(query)
    res.json(result)
})

// Get magnet link (already in search results, but keeping for compatibility)
app.get('/api/rutracker/magnet/:topicId', async (req, res) => {
    const { topicId } = req.params
    // topicId is actually the magnet URL for Jacred
    const result = await getMagnetFromJacred(decodeURIComponent(topicId))
    res.json(result)
})

// ─────────────────────────────────────────────────────────────
// Debug API: View and manage persisted torrents in DB
// ─────────────────────────────────────────────────────────────

// View all torrents saved in db.json
app.get('/api/db/torrents', async (req, res) => {
    await db.read()
    const torrents = db.data.torrents || []
    res.json({
        count: torrents.length,
        torrents: torrents.map(t => ({
            name: t.name,
            addedAt: t.addedAt,
            magnetPreview: t.magnet.substring(0, 80) + '...'
        }))
    })
})

// Force remove a torrent from DB by partial hash match
app.delete('/api/db/torrents/:hash', async (req, res) => {
    const { hash } = req.params
    await db.read()

    const before = db.data.torrents?.length || 0
    const hashLower = hash.toLowerCase()

    db.data.torrents = (db.data.torrents || []).filter(t => {
        const magnetLower = t.magnet.toLowerCase()
        return !magnetLower.includes(hashLower)
    })

    const removed = before - db.data.torrents.length

    if (removed > 0) {
        await db.write()
        console.log(`[DB API] Force removed ${removed} torrent(s) by hash: ${hash}`)
        res.json({ success: true, removed })
    } else {
        res.status(404).json({ error: 'No matching torrent found in DB', hash })
    }
})

// Clear ALL torrents from DB (nuclear option)
app.delete('/api/db/torrents', async (req, res) => {
    await db.read()
    const count = db.data.torrents?.length || 0
    db.data.torrents = []
    await db.write()
    console.log(`[DB API] Cleared ALL ${count} torrents from DB`)
    res.json({ success: true, cleared: count })
})

// API: Generate M3U Playlist for Video Files
app.get('/playlist.m3u', (req, res) => {
    // 1. Determine Host (Synology IP or Localhost)
    const host = req.get('host') || `localhost:${PORT}`
    const protocol = req.protocol || 'http'

    // 2. Get All Torrents
    const torrents = getAllTorrents()

    let m3u = '#EXTM3U\n'
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.mpg', '.mpeg']

    // 3. Filter & Generate
    for (const torrent of torrents) {
        if (!torrent.files) continue;

        for (const file of torrent.files) {
            const ext = path.extname(file.name).toLowerCase()
            if (videoExtensions.includes(ext)) {
                // Metadata for player
                // Use -1 for live/unknown duration, or try to guess if available
                m3u += `#EXTINF:-1,${file.name}\n`

                // Stream URL: http://<NAS_IP>:3000/stream/<HASH>/<INDEX>
                m3u += `${protocol}://${host}/stream/${torrent.infoHash}/${file.index}\n`
            }
        }
    }

    res.set('Content-Type', 'audio/x-mpegurl')
    res.set('Content-Disposition', 'attachment; filename="playlist.m3u"')
    res.send(m3u)
})

// API: Add Torrent
app.post('/api/add', async (req, res) => {
    const { magnet } = req.body
    if (!magnet) return res.status(400).json({ error: 'Magnet URI required' })

    try {
        const torrent = await addTorrent(magnet)
        res.json({ infoHash: torrent.infoHash, name: torrent.name })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// Map of MIME types
const mimeMap = {
    '.mp4': 'video/mp4',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    '.avi': 'video/avi',
    '.mov': 'video/quicktime',
    '.mpg': 'video/mpeg',
    '.mpeg': 'video/mpeg'
}

// API: Remove Torrent (with File Hygiene)
app.delete('/api/delete/:infoHash', async (req, res) => {
    const { infoHash } = req.params
    const torrent = getTorrent(infoHash) // Get info BEFORE deletion

    const success = removeTorrent(infoHash)

    if (success) {
        // 🔥 PHYSICAL DELETION (FILE HYGIENE - ASYNC) 🔥
        if (torrent && torrent.name) {
            const downloadPath = process.env.DOWNLOAD_PATH || './downloads'
            const fullPath = path.join(downloadPath, torrent.name)

            // Fire-and-forget async deletion to avoid blocking the server
            import('fs/promises').then(fsPromises => {
                fsPromises.rm(fullPath, { recursive: true, force: true })
                    .then(() => console.log(`[File Hygiene] Successfully removed: ${fullPath}`))
                    .catch(e => console.error(`[Delete Error] Could not remove ${fullPath}: ${e.message}`))
            })
        }
        res.json({ success: true, message: 'Deletion started asynchronously' })
    } else {
        res.status(404).json({ error: 'Torrent not found' })
    }
})

// API: Stream
app.get('/stream/:infoHash/:fileIndex', async (req, res) => {
    const { infoHash, fileIndex } = req.params
    const range = req.headers.range

    // 🔥 ACTIVATE TURBO MODE when user starts watching
    boostTorrent(infoHash)

    // Use raw engine to access createReadStream
    const engine = getRawTorrent(infoHash)
    if (!engine) return res.status(404).send('Torrent not found')

    const file = engine.files?.[fileIndex]
    if (!file) return res.status(404).send('File not found')

    // Smart Priority: Prioritize this file's first chunks for instant playback
    prioritizeFile(infoHash, parseInt(fileIndex, 10))

    // Detect Content-Type
    const ext = path.extname(file.name).toLowerCase()
    const contentType = mimeMap[ext] || 'application/octet-stream'

    // Note: Download path check moved to startup (cached)

    if (!range) {
        const head = {
            'Content-Length': file.length,
            'Content-Type': contentType,
        }
        res.writeHead(200, head)
        file.createReadStream().pipe(res)
    } else {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1
        const chunksize = (end - start) + 1

        // 🔥 READAHEAD: Prioritize chunks starting from seek position
        // This ensures smooth playback after seeking
        readahead(infoHash, parseInt(fileIndex, 10), start)

        // Smart Progress Tracking
        const duration = parseFloat(req.query.duration) || 0
        const progressTime = duration > 0 ? (start / file.length) * duration : 0

        // 🔥 Debounced DB save (fire-and-forget, no await)
        const trackKey = `${infoHash}_${fileIndex}`
        const now = Date.now()
        const lastUpdate = db.data.progress[trackKey]?.timestamp || 0

        if (now - lastUpdate > 10000) {
            db.data.progress[trackKey] = {
                timestamp: now,
                position: start,
                progressTime: progressTime,
                percentage: (start / file.length) * 100
            }
            // Fire-and-forget: don't block streaming
            db.write().catch(e => console.warn('[DB] Write failed:', e.message))
        }

        const head = {
            'Content-Range': `bytes ${start}-${end}/${file.length}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': contentType,
        }

        res.writeHead(206, head)
        file.createReadStream({ start, end }).pipe(res)
    }
})

// Fallback for SPA (index.html existence cached at startup)
let indexHtmlExists = false
try {
    indexHtmlExists = fs.existsSync(path.join(distPath, 'index.html'))
} catch (e) { }

app.get('*', (req, res) => {
    if (indexHtmlExists) {
        res.sendFile(path.join(distPath, 'index.html'))
    } else {
        res.send('Frontend not built. Run npm run client:build')
    }
})

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`)

    // Restore saved torrents from db.json
    restoreTorrents().catch(err => {
        console.error('[Server] Restore failed:', err.message)
    })

    // Start watchdog in background (non-blocking)
    startWatchdog().catch(err => {
        console.error('[Server] Watchdog failed:', err.message)
    })
})

// ────────────────────────────────────────────────────────
// 🛑 Graceful Shutdown
// Handles: Docker stop, NAS restart, Ctrl+C
// ────────────────────────────────────────────────────────
let isShuttingDown = false

const gracefulShutdown = async (signal) => {
    if (isShuttingDown) return
    isShuttingDown = true

    console.log(`\n[Shutdown] Received ${signal}, starting graceful shutdown...`)

    // 1. Stop accepting new connections
    server.close(() => {
        console.log('[Shutdown] HTTP server closed')
    })

    // 2. Stop watchdog and lag monitor
    stopWatchdog()
    lagMonitor.stop()

    // 3. Destroy all torrent engines
    destroyAllTorrents()

    // 4. Save DB state
    try {
        await db.write()
        console.log('[Shutdown] Database saved')
    } catch (e) {
        console.error('[Shutdown] DB save failed:', e.message)
    }

    console.log('[Shutdown] Cleanup complete, exiting...')
    process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
```

### server/torrent.js
```javascript
import torrentStream from 'torrent-stream'
import process from 'process'
import fs from 'fs'
import path from 'path'
import { db } from './db.js'

const engines = new Map()

// 🔥 Best Public Trackers (Tier 1 & 2)
const PUBLIC_TRACKERS = [
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://open.stealth.si:80/announce',
    'udp://tracker.torrent.eu.org:451/announce',
    'udp://tracker.tiny-vps.com:6969/announce',
    'udp://tracker.cyberia.is:6969/announce',
    'udp://tracker.moeking.me:6969/announce',
    'udp://p4p.arenabg.com:1337/announce',
    'udp://explodie.org:6969/announce',
    'http://tracker.gbitt.info:80/announce'
]

// ────────────────────────────────────────────────────────
// Keep-Alive: Frozen torrents for instant resume (5 min TTL)
// 🔥 Memory fix: reduced from 30min to 5min, max 3 frozen
// ────────────────────────────────────────────────────────
const frozenTorrents = new Map() // infoHash -> { engine, frozenAt, magnetURI }
const FROZEN_TTL = 5 * 60 * 1000 // 🔥 5 minutes (was 30)
const MAX_FROZEN_TORRENTS = 3    // 🔥 Limit frozen count

// Cleanup expired frozen torrents every 2 minutes
setInterval(() => {
    const now = Date.now()

    // 🔥 Memory fix: destroy oldest if over limit
    while (frozenTorrents.size > MAX_FROZEN_TORRENTS) {
        const oldest = [...frozenTorrents.entries()]
            .sort((a, b) => a[1].frozenAt - b[1].frozenAt)[0]
        if (oldest) {
            console.log(`[Keep-Alive] Over limit, destroying oldest: ${oldest[0]}`)
            oldest[1].engine.destroy()
            frozenTorrents.delete(oldest[0])
        }
    }

    for (const [hash, frozen] of frozenTorrents.entries()) {
        if (now - frozen.frozenAt > FROZEN_TTL) {
            console.log(`[Keep-Alive] Expired, destroying: ${hash}`)
            frozen.engine.destroy()
            frozenTorrents.delete(hash)
        }
    }
}, 2 * 60 * 1000) // Check every 2 minutes

// ────────────────────────────────────────────────────────
// Persistence: Save/Remove torrents to db.json
// ────────────────────────────────────────────────────────
async function saveTorrentToDB(magnetURI, name) {
    db.data.torrents ||= []
    // Avoid duplicates
    if (!db.data.torrents.find(t => t.magnet === magnetURI)) {
        db.data.torrents.push({ magnet: magnetURI, name, addedAt: Date.now(), completed: false })
        await db.write()
        console.log('[Persistence] Saved torrent:', name)
    }
}

// Mark torrent as completed in DB (survives restart)
async function markTorrentCompleted(infoHash) {
    const hashLower = infoHash.toLowerCase()
    const torrent = db.data.torrents?.find(t => t.magnet.toLowerCase().includes(hashLower))
    if (torrent && !torrent.completed) {
        torrent.completed = true
        await db.write()
        console.log('[Persistence] Marked as completed:', torrent.name)
    }
}

// Check if torrent is marked as completed in DB
function isTorrentCompleted(infoHash) {
    const hashLower = infoHash.toLowerCase()
    return db.data.torrents?.some(t =>
        t.magnet.toLowerCase().includes(hashLower) && t.completed === true
    ) || false
}

async function removeTorrentFromDB(infoHash) {
    db.data.torrents ||= []
    const before = db.data.torrents.length
    const hashLower = infoHash.toLowerCase()

    // Case-insensitive match: magnet URI contains infoHash in format urn:btih:HASH
    db.data.torrents = db.data.torrents.filter(t => {
        const magnetLower = t.magnet.toLowerCase()
        const shouldRemove = magnetLower.includes(hashLower)
        if (shouldRemove) {
            console.log('[Persistence] Matching torrent for removal:', t.name)
        }
        return !shouldRemove
    })

    if (db.data.torrents.length < before) {
        await db.write()
        console.log(`[Persistence] Removed ${before - db.data.torrents.length} torrent(s) from DB:`, infoHash)
    } else {
        console.log('[Persistence] WARNING: No torrent found in DB for hash:', infoHash)
    }
}

// Restore all saved torrents on server startup
export async function restoreTorrents() {
    await db.read()
    const saved = db.data.torrents || []
    console.log(`[Persistence] Restoring ${saved.length} torrents...`)

    for (const { magnet, name } of saved) {
        try {
            await addTorrent(magnet, true) // true = skip saving (already in DB)
            console.log(`[Persistence] Restored: ${name}`)
        } catch (err) {
            console.warn(`[Persistence] Failed to restore ${name}: ${err.message}`)
        }
    }
}

export const addTorrent = (magnetURI, skipSave = false) => {
    return new Promise((resolve, reject) => {
        // Simple duplicate check
        for (const [key, engine] of engines.entries()) {
            if (key === magnetURI) {
                console.log('Torrent engine already exists for this magnet')
                return resolve(formatEngine(engine))
            }
        }

        // Check frozen torrents (Keep-Alive: instant resume!)
        for (const [hash, frozen] of frozenTorrents.entries()) {
            if (frozen.magnetURI === magnetURI || magnetURI.includes(hash)) {
                console.log(`[Keep-Alive] Reusing frozen torrent: ${hash}`)
                const engine = frozen.engine
                frozenTorrents.delete(hash)
                engines.set(magnetURI, engine)
                engines.set(engine.infoHash, engine)
                return resolve(formatEngine(engine))
            }
        }

        const path = process.env.DOWNLOAD_PATH || './downloads'
        console.log('[Torrent] Adding magnet, download path:', path)

        // 🔥 STRATEGY 1: Tracker Injection
        let enrichedMagnet = magnetURI
        if (magnetURI.startsWith('magnet:?')) {
            const extraTr = PUBLIC_TRACKERS
                .filter(tr => !magnetURI.includes(encodeURIComponent(tr)))
                .map(tr => `&tr=${encodeURIComponent(tr)}`)
                .join('')
            enrichedMagnet += extraTr
            console.log('[Torrent] Injected', PUBLIC_TRACKERS.length, 'public trackers')
        }

        let engine
        try {
            // 🔥 STRATEGY 2: Eco Mode (20 connections) by default
            engine = torrentStream(enrichedMagnet, {
                path: path,
                connections: 20,       // Eco Mode: RAM-safe limit
                uploads: 0,
                dht: true,             // ✅ DHT enabled
                verify: false,
                tracker: true
            })
        } catch (err) {
            console.error('[Torrent] Failed to create engine:', err.message)
            return reject(err)
        }

        engine.on('ready', () => {
            console.log('[Torrent] Engine ready:', engine.infoHash)

            // ────────────────────────────────────────────────────────
            // Download ALL files + AGGRESSIVE PRIORITIZATION
            // Prioritize first video file immediately for instant playback
            // ────────────────────────────────────────────────────────
            if (engine.files && engine.files.length > 0) {
                let firstVideoIdx = -1
                engine.files.forEach((file, idx) => {
                    file.select()
                    // Find first video file
                    if (firstVideoIdx === -1 && /\.(mp4|mkv|avi|webm|mov)$/i.test(file.name)) {
                        firstVideoIdx = idx
                    }
                })

                // Aggressive priority: immediately prioritize first video
                if (firstVideoIdx >= 0) {
                    console.log(`[Torrent] Auto-prioritizing first video: ${engine.files[firstVideoIdx].name}`)
                    prioritizeFileInternal(engine, firstVideoIdx)
                }
            }

            engines.set(magnetURI, engine)
            engines.set(engine.infoHash, engine)
            
            // 🔄 Invalidate status cache on new torrent
            invalidateStatusCache()

            // Save to DB for persistence (unless restoring)
            if (!skipSave) {
                saveTorrentToDB(magnetURI, engine.torrent?.name || 'Unknown')
            }

            resolve(formatEngine(engine))
        })

        engine.on('error', (err) => {
            console.error('[Torrent] Engine error:', err.message)
            engine.destroy()
            reject(err)
        })

        // 🔥 STRATEGY 3: Increased Timeout (90s)
        setTimeout(() => {
            if (!engines.has(magnetURI)) {
                console.warn('[Torrent] Timeout: no peers found')
                engine.destroy()
                reject(new Error('Torrent timeout: no peers found within 90 seconds'))
            }
        }, 90000)
    })
}

export const removeTorrent = (infoHash, forceDestroy = false) => {
    const engine = engines.get(infoHash)
    if (!engine) return false
    
    // 🔄 Invalidate status cache on torrent removal
    invalidateStatusCache()

    // Find magnetURI for this engine
    let magnetURI = null
    for (const [key, val] of engines.entries()) {
        if (val === engine && key.startsWith('magnet:')) {
            magnetURI = key
            break
        }
    }

    // Remove from active map
    engines.delete(infoHash)
    for (const [key, val] of engines.entries()) {
        if (val === engine) engines.delete(key)
    }

    // Keep-Alive: freeze instead of destroy (unless forced)
    if (!forceDestroy) {
        console.log(`[Keep-Alive] Freezing torrent for 30min: ${infoHash}`)
        frozenTorrents.set(infoHash, {
            engine,
            magnetURI,
            frozenAt: Date.now()
        })
    } else {
        console.log('Destroying torrent:', infoHash)
        engine.destroy(() => {
            console.log('Engine destroyed:', infoHash)
        })
    }

    // 🔥 Memory fix: clear disk cache for this torrent
    diskDownloadCache.delete(infoHash)

    // Remove from persistent storage
    removeTorrentFromDB(infoHash)

    return true
}

export const getTorrent = (infoHash) => {
    const engine = engines.get(infoHash)
    if (engine) return formatEngine(engine)
    return null
}

// Get raw engine for streaming (with createReadStream)
export const getRawTorrent = (infoHash) => {
    return engines.get(infoHash) || null
}

// ────────────────────────────────────────────────────────
// 🚀 Status Cache: Reduce CPU load from frequent polling
// ────────────────────────────────────────────────────────
let statusCache = null
let statusCacheTime = 0
const STATUS_CACHE_TTL = 2000 // 2 seconds

export const getAllTorrents = () => {
    const now = Date.now()
    
    // Return cached result if fresh
    if (statusCache && now - statusCacheTime < STATUS_CACHE_TTL) {
        return statusCache
    }
    
    // Recalculate and cache
    const uniqueEngines = new Set(engines.values())
    statusCache = Array.from(uniqueEngines).map(formatEngine)
    statusCacheTime = now
    
    return statusCache
}

// Invalidate cache when torrents change
export const invalidateStatusCache = () => {
    statusCache = null
    statusCacheTime = 0
}

// ────────────────────────────────────────────────────────
// Calculate actual downloaded bytes from disk (CACHED)
// Uses background updates to avoid blocking event loop
// 🔥 Memory fix: added async dedup to prevent parallel storms
// ────────────────────────────────────────────────────────
const diskDownloadCache = new Map() // infoHash -> { bytes, updatedAt, updating }
const DISK_CACHE_TTL = 30000 // 30 seconds

// Non-blocking: returns cached value, schedules background update
function getDownloadedFromDisk(engine) {
    const infoHash = engine.infoHash
    
    // 🔥 Memory fix: hard cap on cache size
    if (diskDownloadCache.size > 50) {
        console.log('[Memory] Clearing diskDownloadCache (size exceeded 50)')
        diskDownloadCache.clear()
    }
    
    const cached = diskDownloadCache.get(infoHash)
    const now = Date.now()

    // Return cached value if fresh
    if (cached && now - cached.updatedAt < DISK_CACHE_TTL) {
        return cached.bytes
    }

    // 🔥 Memory fix: prevent parallel async updates (async dedup)
    if (!cached?.updating) {
        diskDownloadCache.set(infoHash, {
            bytes: cached?.bytes || 0,
            updatedAt: cached?.updatedAt || 0,
            updating: true
        })

        updateDiskCacheAsync(engine).finally(() => {
            const entry = diskDownloadCache.get(infoHash)
            if (entry) entry.updating = false
        })
    }

    // Return stale cache or 0 while updating
    return cached?.bytes || 0
}

// Background async update (doesn't block event loop)
async function updateDiskCacheAsync(engine) {
    const downloadPath = process.env.DOWNLOAD_PATH || './downloads'
    const infoHash = engine.infoHash

    if (!engine.torrent?.name || !engine.files) {
        diskDownloadCache.set(infoHash, { bytes: 0, updatedAt: Date.now() })
        return
    }

    let totalDownloaded = 0

    // Use async fs for non-blocking I/O
    const fsPromises = await import('fs/promises')

    for (const file of engine.files) {
        try {
            const filePath = path.join(downloadPath, file.path)
            const stats = await fsPromises.stat(filePath)
            const actualBytes = (stats.blocks !== undefined)
                ? stats.blocks * 512
                : stats.size
            totalDownloaded += Math.min(actualBytes, file.length)
        } catch (e) {
            // File doesn't exist or not accessible
        }
    }

    diskDownloadCache.set(infoHash, { bytes: totalDownloaded, updatedAt: Date.now() })
}

const formatEngine = (engine) => {
    const totalSize = engine.files?.reduce((sum, f) => sum + f.length, 0) || 0

    // Get downloaded bytes from different sources
    const diskDownloaded = getDownloadedFromDisk(engine)
    const swarmDownloaded = engine.swarm?.downloaded || 0

    // 🔥 Check if already marked as completed in DB (survives restart)
    const wasCompleted = isTorrentCompleted(engine.infoHash)

    // Determine downloaded bytes:
    // 1. If marked completed in DB → use totalSize
    // 2. If swarm has data → use swarm (active download)
    // 3. Otherwise → use disk (restart scenario, partial download)
    let downloaded
    if (wasCompleted) {
        downloaded = totalSize
    } else if (swarmDownloaded > 0) {
        downloaded = swarmDownloaded
    } else {
        downloaded = diskDownloaded
    }

    // Calculate progress (0-1)
    const progress = totalSize > 0 ? Math.min(downloaded / totalSize, 1) : 0

    // Check if ready (and save completed status if newly completed)
    const isReady = wasCompleted || progress >= 0.99
    if (isReady && !wasCompleted && progress >= 0.99) {
        // Mark as completed in DB (async, fire-and-forget)
        markTorrentCompleted(engine.infoHash)
    }

    // Get download speed
    const downloadSpeed = engine.swarm?.downloadSpeed() || 0

    // Calculate ETA (seconds remaining)
    let eta = null
    if (downloadSpeed > 0 && progress < 1) {
        const remaining = totalSize - downloaded
        eta = Math.round(remaining / downloadSpeed)
    }

    return {
        infoHash: engine.infoHash,
        name: engine.torrent?.name || 'Unknown Torrent',
        progress: progress,
        isReady: isReady,
        downloaded: downloaded,
        totalSize: totalSize,
        downloadSpeed: downloadSpeed,
        uploadSpeed: engine.swarm?.uploadSpeed() || 0,
        numPeers: engine.swarm?.wires?.length || 0,
        eta: eta, // seconds remaining
        // 🔥 Memory fix: only include file count, not full array
        // Full files array available via getTorrent(hash) on demand
        fileCount: engine.files?.length || 0,
        files: engine.files ? engine.files.map((file, index) => ({
            name: file.name,
            length: file.length,
            index: index
            // 🔥 Removed: path (not needed for UI list)
        })) : []
    }
}

// ────────────────────────────────────────────────────────
// Smart Priority: Prioritize specific file for instant playback
// Called when user starts streaming a specific episode
// ────────────────────────────────────────────────────────

// Internal function (accepts engine directly)
function prioritizeFileInternal(engine, fileIndex, byteOffset = 0) {
    const file = engine.files?.[fileIndex]
    if (!file) {
        console.warn('[Priority] File not found:', fileIndex)
        return false
    }

    const pieceLength = engine.torrent?.pieceLength || 262144 // Default 256KB
    const totalPieces = engine.torrent?.pieces?.length || 0

    if (totalPieces === 0 || pieceLength === 0) {
        console.warn('[Priority] No piece info available')
        return false
    }

    // Calculate piece range for this specific file
    const fileStart = (file.offset || 0) + byteOffset
    const fileEnd = (file.offset || 0) + file.length

    const startPiece = Math.floor(fileStart / pieceLength)
    const endPiece = Math.floor(fileEnd / pieceLength)

    // ⚡ AGGRESSIVE PRIORITY: 50MB instead of 15MB for 4K content
    const priorityBytes = Math.min(file.length * 0.1, 50 * 1024 * 1024) // 10% or 50MB
    const priorityPieces = Math.max(1, Math.ceil(priorityBytes / pieceLength))
    const priorityEnd = Math.min(startPiece + priorityPieces, endPiece)

    try {
        engine.select(startPiece, priorityEnd, true) // true = high priority
        console.log(`[Priority] File ${fileIndex}: pieces ${startPiece}-${priorityEnd} (${priorityPieces} pieces, ~${Math.round(priorityBytes / 1024 / 1024)}MB)`)
        return true
    } catch (e) {
        console.warn('[Priority] Selection failed:', e.message)
        return false
    }
}

// Public API: prioritize by infoHash
export function prioritizeFile(infoHash, fileIndex) {
    const engine = engines.get(infoHash)
    if (!engine) {
        console.warn('[Priority] Engine not found:', infoHash)
        return false
    }
    return prioritizeFileInternal(engine, fileIndex)
}

// ────────────────────────────────────────────────────────
// Readahead: Prioritize chunks ahead of seek position
// Called when player seeks to a new position
// ────────────────────────────────────────────────────────
export function readahead(infoHash, fileIndex, byteOffset) {
    const engine = engines.get(infoHash)
    if (!engine) {
        console.warn('[Readahead] Engine not found:', infoHash)
        return false
    }
    console.log(`[Readahead] Seeking to byte ${byteOffset} in file ${fileIndex}`)
    return prioritizeFileInternal(engine, fileIndex, byteOffset)
}

// ────────────────────────────────────────────────────────
// 🔥 Turbo Mode: Boost connections when streaming starts
// ────────────────────────────────────────────────────────
export const boostTorrent = (infoHash) => {
    const engine = engines.get(infoHash)

    // Debug: why boost might not work
    if (!engine) {
        console.warn(`[Turbo] Engine not found for: ${infoHash}`)
        return
    }
    if (!engine.swarm) {
        console.warn(`[Turbo] No swarm for: ${infoHash}`)
        return
    }

    const currentMax = engine.swarm.maxConnections || 0
    console.log(`[Turbo] Current connections: ${engine.swarm.wires?.length || 0}/${currentMax}`)

    // If still in Eco Mode (< 65), boost it!
    if (currentMax < 65) {
        console.log(`[Turbo] 🚀 Boosting connections for ${infoHash}: ${currentMax} -> 65`)
        engine.swarm.maxConnections = 65
        if (engine.discover) engine.discover()
        engine.swarm.resume()
    } else {
        console.log(`[Turbo] Already boosted (${currentMax}), skipping`)
    }
}

// ────────────────────────────────────────────────────────
// 🛑 Graceful Shutdown: Destroy all torrents
// ────────────────────────────────────────────────────────
export const destroyAllTorrents = () => {
    console.log(`[Shutdown] Destroying ${engines.size} active engines...`)

    // Destroy all active engines
    const uniqueEngines = new Set(engines.values())
    for (const engine of uniqueEngines) {
        try {
            engine.destroy()
        } catch (e) {
            console.warn('[Shutdown] Engine destroy failed:', e.message)
        }
    }
    engines.clear()

    // Clear frozen torrents
    console.log(`[Shutdown] Clearing ${frozenTorrents.size} frozen torrents...`)
    for (const [hash, frozen] of frozenTorrents.entries()) {
        try {
            frozen.engine.destroy()
        } catch (e) { }
    }
    frozenTorrents.clear()

    console.log('[Shutdown] All torrents destroyed')
}
```

### server/watchdog.js
```javascript
/**
 * Watchdog Module - Self-Healing Architecture
 * PWA-TorServe v2.1
 * 
 * Features:
 * - Non-blocking async monitoring loop
 * - RAM monitoring with hysteresis (30s delay for degraded)
 * - NFS Circuit Breaker (3 failures → 5min pause)
 * - Automatic counter reset on recovery
 */

import { db } from './db.js'
import fs from 'fs'
import path from 'path'

// ─────────────────────────────────────────────────────────────
// Configuration Constants
// ─────────────────────────────────────────────────────────────

const CONFIG = {
    CHECK_INTERVAL_MS: 30000,           // Main loop interval: 30s
    RAM_OK_THRESHOLD_MB: 800,           // ⬆ Relaxed for 100GB files
    RAM_DEGRADED_THRESHOLD_MB: 1000,    // ⬆ Limit increased to 1GB
    HYSTERESIS_DELAY_MS: 30000,         // 30s delay before degraded
    STORAGE_CHECK_TIMEOUT_MS: 5000,     // 5s timeout for storage check
    CIRCUIT_BREAKER_THRESHOLD: 3,       // 3 failures → circuit open
    CIRCUIT_BREAKER_COOLDOWN_MS: 300000 // 5 minutes cooldown
}

// ─────────────────────────────────────────────────────────────
// State Variables
// ─────────────────────────────────────────────────────────────

let degradedSince = null              // Timestamp when RAM first exceeded threshold
let circuitOpenUntil = null           // Timestamp when circuit breaker retry
let isWatchdogRunning = false

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const getRAMUsageMB = () => {
    const used = process.memoryUsage()
    // Use RSS (Resident Set Size) instead of heapUsed
    // RSS includes buffers, video data, and system resources
    // This is what Android actually sees and may kill the process for
    return Math.round(used.rss / 1024 / 1024)
}

/**
 * Check storage accessibility with timeout
 * Creates directory if it doesn't exist
 * PHYSICAL WRITE TEST: writes .healthcheck file to verify R/W access
 * @returns {Promise<boolean>} true if storage is accessible
 */
const checkStorage = () => {
    return new Promise((resolve) => {
        // Default to ./downloads (relative to app dir) which works on Android Termux
        const downloadPath = process.env.DOWNLOAD_PATH || './downloads'
        const healthFile = path.join(downloadPath, '.healthcheck')

        const timeout = setTimeout(() => {
            console.warn('[Watchdog] Storage check timeout!')
            resolve(false)
        }, CONFIG.STORAGE_CHECK_TIMEOUT_MS)

        // Ensure directory exists first
        fs.mkdir(downloadPath, { recursive: true }, (mkdirErr) => {
            if (mkdirErr && mkdirErr.code !== 'EEXIST') {
                clearTimeout(timeout)
                console.warn(`[Watchdog] Failed to create directory: ${mkdirErr.message}`)
                resolve(false)
                return
            }

            // PHYSICAL WRITE TEST: write timestamp to .healthcheck file
            const testData = `healthcheck:${Date.now()}`
            fs.writeFile(healthFile, testData, (writeErr) => {
                if (writeErr) {
                    clearTimeout(timeout)
                    console.warn(`[Watchdog] Write test failed: ${writeErr.message}`)
                    resolve(false)
                    return
                }

                // Clean up: delete the test file
                fs.unlink(healthFile, (unlinkErr) => {
                    clearTimeout(timeout)
                    if (unlinkErr) {
                        // Non-critical: file was written successfully
                        console.warn(`[Watchdog] Cleanup failed: ${unlinkErr.message}`)
                    }
                    resolve(true)
                })
            })
        })
    })
}

// ─────────────────────────────────────────────────────────────
// State Machine
// ─────────────────────────────────────────────────────────────

/**
 * Update server status with persistence
 * @param {string} newStatus - 'ok' | 'degraded' | 'error' | 'circuit_open'
 */
const updateStatus = async (newStatus) => {
    const currentStatus = db.data.serverStatus

    if (currentStatus !== newStatus) {
        console.log(`[Watchdog] Status change: ${currentStatus} → ${newStatus}`)
        db.data.serverStatus = newStatus
        db.data.lastStateChange = Date.now()

        // Reset counters on recovery to OK
        if (newStatus === 'ok') {
            db.data.storageFailures = 0
            degradedSince = null
            console.log('[Watchdog] Recovery complete, counters reset')
        }

        await db.write()
    }
}

/**
 * Main watchdog check cycle
 */
const performCheck = async () => {
    const now = Date.now()
    const ramMB = getRAMUsageMB()

    // ─── Circuit Breaker Check ───
    if (circuitOpenUntil) {
        if (now < circuitOpenUntil) {
            // Still in cooldown, skip all checks
            const remainingMs = circuitOpenUntil - now
            console.log(`[Watchdog] Circuit open, retry in ${Math.round(remainingMs / 1000)}s`)
            return
        }

        // Cooldown expired, attempt recovery
        console.log('[Watchdog] Circuit breaker: attempting recovery...')
        const storageOk = await checkStorage()

        if (storageOk) {
            circuitOpenUntil = null
            await updateStatus('ok')
            console.log('[Watchdog] Circuit breaker: recovery successful!')
        } else {
            // Retry failed, extend cooldown
            circuitOpenUntil = now + CONFIG.CIRCUIT_BREAKER_COOLDOWN_MS
            // Update lastStateChange so client shows correct elapsed time
            db.data.lastStateChange = now
            await db.write()
            console.warn('[Watchdog] Circuit breaker: recovery failed, extending cooldown')
        }
        return
    }

    // ─── Storage Check ───
    const storageOk = await checkStorage()

    if (!storageOk) {
        db.data.storageFailures = (db.data.storageFailures || 0) + 1
        console.warn(`[Watchdog] Storage failure #${db.data.storageFailures}`)

        if (db.data.storageFailures >= CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
            circuitOpenUntil = now + CONFIG.CIRCUIT_BREAKER_COOLDOWN_MS
            await updateStatus('circuit_open')
            console.error('[Watchdog] Circuit breaker OPEN! Pausing checks for 5 minutes.')
            return
        }
    } else {
        // Storage OK, reset failure counter
        if (db.data.storageFailures > 0) {
            db.data.storageFailures = 0
            await db.write()
        }
    }

    // ─── RAM Check with Hysteresis ───
    if (ramMB > CONFIG.RAM_DEGRADED_THRESHOLD_MB) {
        if (!degradedSince) {
            degradedSince = now
            console.log(`[Watchdog] RAM ${ramMB}MB > threshold, starting hysteresis timer`)
        } else if (now - degradedSince >= CONFIG.HYSTERESIS_DELAY_MS) {
            await updateStatus('degraded')
        }
    } else if (ramMB < CONFIG.RAM_OK_THRESHOLD_MB) {
        // RAM is OK
        if (db.data.serverStatus === 'degraded') {
            await updateStatus('ok')
        }
        degradedSince = null
    }

    // Log current state
    console.log(`[Watchdog] RAM: ${ramMB}MB | Status: ${db.data.serverStatus} | Storage Failures: ${db.data.storageFailures}`)
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Start the async watchdog loop
 */
export const startWatchdog = async () => {
    if (isWatchdogRunning) {
        console.warn('[Watchdog] Already running!')
        return
    }

    isWatchdogRunning = true
    console.log('[Watchdog] Starting async monitoring loop...')

    // Initial check
    try {
        await performCheck()
    } catch (err) {
        console.error('[Watchdog] Initial check failed:', err.message)
    }

    // Non-blocking loop with error recovery
    while (isWatchdogRunning) {
        await sleep(CONFIG.CHECK_INTERVAL_MS)
        try {
            await performCheck()
        } catch (err) {
            // Log error but DON'T crash - watchdog must survive
            console.error('[Watchdog] Check failed, will retry:', err.message)
        }
    }
}

/**
 * Stop the watchdog loop
 */
export const stopWatchdog = () => {
    isWatchdogRunning = false
    console.log('[Watchdog] Stopped')
}

/**
 * Get current server state for API responses
 */
export const getServerState = () => {
    return {
        serverStatus: db.data.serverStatus,
        lastStateChange: db.data.lastStateChange,
        storageFailures: db.data.storageFailures
    }
}
```

### server/utils/lag-monitor.js
```javascript
/**
 * Event Loop Lag Monitor
 * Detects when Node.js event loop is blocked
 * 
 * Usage:
 *   import { LagMonitor } from './utils/lag-monitor.js'
 *   const lagMonitor = new LagMonitor(50) // 50ms threshold
 *   lagMonitor.start()
 */

export class LagMonitor {
    constructor(threshold = 50) {
        this.threshold = threshold
        this.lastCheck = Date.now()
        this.lagEvents = []
        this.intervalId = null
    }

    start() {
        if (this.intervalId) return // Already running

        this.intervalId = setInterval(() => {
            const now = Date.now()
            const expected = 250  // 🔥 Memory fix: 250ms interval instead of 100ms
            const lag = now - this.lastCheck - expected

            if (lag > this.threshold) {
                const event = {
                    timestamp: now,
                    lag: lag,
                    memory: Math.round(process.memoryUsage().rss / 1024 / 1024)
                }

                this.lagEvents.push(event)
                console.warn(`[LagMonitor] Event loop lag: ${lag}ms, RAM: ${event.memory}MB`)

                // 🔥 Memory fix: keep only last 50 events (was 100)
                if (this.lagEvents.length > 50) {
                    this.lagEvents.shift()
                }
            }

            this.lastCheck = now
        }, 250)  // 🔥 Memory fix: 250ms instead of 100ms (4x less allocations)

        console.log('[LagMonitor] Started')
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = null
            console.log('[LagMonitor] Stopped')
        }
    }

    getStats() {
        const now = Date.now()
        const recentLags = this.lagEvents.filter(e =>
            now - e.timestamp < 60000
        )

        return {
            totalLags: this.lagEvents.length,
            recentLags: recentLags.length,
            avgLag: recentLags.length > 0
                ? Math.round(recentLags.reduce((sum, e) => sum + e.lag, 0) / recentLags.length)
                : 0,
            maxLag: recentLags.length > 0
                ? Math.max(...recentLags.map(e => e.lag))
                : 0
        }
    }
}
```

### server/utils/logger.js
```javascript
/**
 * Simple Structured Logger for PWA-TorServe
 * Zero dependencies - works without npm install!
 */

const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
}

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] || LOG_LEVELS.info

/**
 * Format log message with timestamp and level
 */
const formatMessage = (level, module, message, data) => {
    const timestamp = new Date().toISOString()
    const modulePrefix = module ? `[${module}]` : ''
    const dataStr = data && Object.keys(data).length > 0 
        ? ' ' + JSON.stringify(data) 
        : ''
    
    return `[${timestamp}] [${level.toUpperCase()}]${modulePrefix} ${message}${dataStr}`
}

/**
 * Create logger instance optionally bound to a module name
 */
const createLogger = (moduleName = null) => ({
    debug: (message, data = {}) => {
        if (LOG_LEVELS.debug >= currentLevel) {
            console.log(formatMessage('debug', moduleName, message, data))
        }
    },
    
    info: (message, data = {}) => {
        if (LOG_LEVELS.info >= currentLevel) {
            console.log(formatMessage('info', moduleName, message, data))
        }
    },
    
    warn: (message, data = {}) => {
        if (LOG_LEVELS.warn >= currentLevel) {
            console.warn(formatMessage('warn', moduleName, message, data))
        }
    },
    
    error: (message, data = {}) => {
        if (LOG_LEVELS.error >= currentLevel) {
            console.error(formatMessage('error', moduleName, message, data))
        }
    },
    
    child: (module) => createLogger(module)
})

export const logger = createLogger()
```

### server/utils/doh.js
```javascript
import https from 'https';

// --- КОНФИГУРАЦИЯ ---
const DOH_PROVIDER = process.env.DOH_PROVIDER || 'https://cloudflare-dns.com/dns-query';
const CACHE_TTL_MS = 1000 * 60 * 10; // 10 минут
const TIMEOUT_MS = 5000;
const DEBUG = process.env.DOH_DEBUG === 'true';

const dnsCache = new Map();

// Агент с keepAlive и игнорированием SSL (для самоподписанных зеркал)
export const insecureAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    keepAliveMsecs: 10000
});

async function resolveIP(hostname) {
    if (dnsCache.has(hostname)) {
        const cached = dnsCache.get(hostname);
        if (Date.now() < cached.expires) return cached.ip;
        dnsCache.delete(hostname);
    }

    try {
        const url = `${DOH_PROVIDER}?name=${encodeURIComponent(hostname)}&type=A`;

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/dns-json' },
            signal: AbortSignal.timeout(TIMEOUT_MS)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.Answer && data.Answer.length > 0) {
            const record = data.Answer.find(r => r.type === 1); // Type A (IPv4)
            if (record) {
                const ip = record.data;
                if (DEBUG) console.log(`[DoH] Resolved ${hostname} -> ${ip}`);
                if (dnsCache.size > 1000) dnsCache.clear();
                dnsCache.set(hostname, { ip, expires: Date.now() + CACHE_TTL_MS });
                return ip;
            }
        }
    } catch (e) {
        if (DEBUG) console.error(`[DoH] Error resolving ${hostname}: ${e.message}`);
    }
    return null;
}

export async function getSmartConfig(urlStr, baseOptions = {}) {
    let targetUrl;
    try { targetUrl = new URL(urlStr); } catch (e) { throw new Error(`Invalid URL: ${urlStr}`); }

    const ip = await resolveIP(targetUrl.hostname);

    // Мимикрия под браузер
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...(baseOptions.headers || {})
    };

    if (ip) {
        const directUrl = urlStr.replace(targetUrl.hostname, ip);
        headers['Host'] = targetUrl.hostname; // Важно для Cloudflare

        return {
            url: directUrl,
            headers,
            hostname: targetUrl.hostname // Для SNI
        };
    } else {
        return { url: urlStr, headers };
    }
}

// Универсальный fetch с DoH
export async function smartFetch(url, options = {}) {
    const config = await getSmartConfig(url, options);

    const fetchOptions = {
        method: options.method || 'GET',
        headers: config.headers,
        signal: AbortSignal.timeout(options.timeout || 10000)
    };

    const response = await fetch(config.url, fetchOptions);

    // Совместимость с axios-style response
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const isImage = response.headers.get('content-type')?.startsWith('image/');

    let data;
    if (options.responseType === 'arraybuffer' || isImage) {
        data = Buffer.from(await response.arrayBuffer());
    } else if (isJson) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    return {
        data,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
    };
}
```
