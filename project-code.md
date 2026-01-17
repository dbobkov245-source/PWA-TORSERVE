# PWA-TorServe Project Documentation (Stage 6)

This document contains the entire source code for the PWA-TorServe project.

## Project Metadata
- **Version:** 2.7.0
- **Primary Stack:** Node.js, React, Capacitor, lowdb, torrent-stream

## Project Statistics
- **Total Files:** 41
- **Stage:** 6 (Multi-source, AutoDownloader, TV UI)

## Source Code

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
```text
# PWA-TorServe Docker Image
# Multi-stage build: Client + Server

# ─── Stage 1: Build Client ───
# ─── Stage 1: Client Builder ───
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
# Install ALL dependencies (including devDependencies if needed for build, but usually --only=production is fine if no build steps)
# We use --only=production to avoid dev deps, but we need build tools.
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

### server/index.js
```javascript
// Security: SSL validation enabled globally (see jacred.js for targeted exceptions)

import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import fs from 'fs'
import fsPromises from 'fs/promises'
import { addTorrent, getAllTorrents, getTorrent, getRawTorrent, removeTorrent, restoreTorrents, prioritizeFile, readahead, boostTorrent, destroyAllTorrents, setSpeedMode, getActiveTorrentsCount, getFrozenTorrentsCount } from './torrent.js'
import { db, safeWrite } from './db.js'
import { startWatchdog, stopWatchdog, getServerState } from './watchdog.js'
import { LagMonitor } from './utils/lag-monitor.js'
import { getRules, addRule, updateRule, deleteRule, updateSettings, checkRules } from './autodownloader.js'

// ────────────────────────────────────────────────────────
// 📊 Lag Monitor v2.3: Detect event loop blocking
// Auto-detects production mode for adaptive thresholds
// ────────────────────────────────────────────────────────
const lagMonitor = new LagMonitor()  // v2.3: auto-detects prod/dev
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
const RATE_LIMIT_MAX = 60 // 🔥 v2.3: increased from 30 for diagnostics polling

// ✅ FIX: Сохраняем ID интервала для очистки при shutdown
let rateLimitCleanupId = null

// Cleanup old entries every 5 minutes
rateLimitCleanupId = setInterval(() => {
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

// ────────────────────────────────────────────────────────
// 🏥 v2.3.3: Health Endpoint for monitoring systems
// Compatible with: Home Assistant, Uptime Robot, Kubernetes
// ────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    const state = getServerState()
    const memUsage = process.memoryUsage()
    const ramMB = Math.round(memUsage.rss / 1024 / 1024)

    // Determine health status
    const isHealthy = state.serverStatus === 'ok'
    const isDegraded = state.serverStatus === 'degraded'
    const isUnhealthy = state.serverStatus === 'circuit_open' || state.serverStatus === 'error'

    const healthData = {
        status: isHealthy ? 'healthy' : (isDegraded ? 'degraded' : 'unhealthy'),
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        version: '2.3.3',
        checks: {
            memory: {
                status: ramMB < 800 ? 'pass' : (ramMB < 1000 ? 'warn' : 'fail'),
                rss_mb: ramMB,
                heap_mb: Math.round(memUsage.heapUsed / 1024 / 1024)
            },
            storage: {
                status: state.serverStatus === 'circuit_open' ? 'fail' : 'pass',
                failures: state.storageFailures || 0
            },
            torrents: {
                active: getActiveTorrentsCount(),
                frozen: getFrozenTorrentsCount()
            }
        }
    }

    // Return appropriate HTTP status
    if (isUnhealthy) {
        res.status(503).json(healthData)
    } else if (isDegraded) {
        res.status(200).json(healthData) // 200 with degraded status
    } else {
        res.status(200).json(healthData)
    }
})

// API: Lag Stats (enhanced performance monitoring v2.3)
app.get('/api/lag-stats', (req, res) => {
    const memUsage = process.memoryUsage()
    const stats = lagMonitor.getStats()

    res.json({
        ...stats,
        // 🔥 v2.3: Enhanced server diagnostics
        server: {
            uptime: Math.round(process.uptime()),
            nodeVersion: process.version,
            platform: process.platform,
            pid: process.pid,
            ram: {
                rss: Math.round(memUsage.rss / 1024 / 1024),
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                external: Math.round(memUsage.external / 1024 / 1024)
            },
            torrents: {
                active: getActiveTorrentsCount(),
                frozen: getFrozenTorrentsCount()
            }
        }
    })
})

// API: Speed Mode (eco/balanced/turbo)
app.post('/api/speed-mode', (req, res) => {
    const { mode } = req.body
    if (!['eco', 'balanced', 'turbo'].includes(mode)) {
        return res.status(400).json({ error: 'Invalid mode. Use: eco, balanced, or turbo' })
    }
    const result = setSpeedMode(mode)
    res.json(result)
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
// ─────────────────────────────────────────────────────────────
// 🔍 API v2: Unified Torrent Search (Aggregator + Envelope)
// Stage 5: Client/PWA Improvements
// ─────────────────────────────────────────────────────────────

import { search as aggregatorSearch, getProvidersStatus } from './aggregator.js'

/**
 * API v2 Search with envelope response pattern
 * Response format:
 * {
 *   meta: { query, cached, ms, providers: { [name]: { status, count, error? } } },
 *   items: AggregatedSearchItem[]
 * }
 */
app.get('/api/v2/search', async (req, res) => {
    const { query, limit = 100 } = req.query
    if (!query) {
        return res.status(400).json({ error: 'Query required' })
    }

    console.log(`[API v2] Search: ${query}`)
    const startTime = Date.now()

    try {
        const { results, errors, providers, cached } = await aggregatorSearch(query)

        // Transform providers to StatusMap with enhanced info
        const providersMeta = {}
        for (const [name, data] of Object.entries(providers)) {
            providersMeta[name] = {
                status: data.status,
                count: data.count || 0,
                error: data.error || null
            }
        }

        const limitedResults = results.slice(0, parseInt(limit, 10))

        res.json({
            meta: {
                query,
                cached,
                ms: Date.now() - startTime,
                totalResults: results.length,
                returnedResults: limitedResults.length,
                providers: providersMeta
            },
            items: limitedResults
        })
    } catch (err) {
        console.error('[API v2] Search error:', err)
        res.status(500).json({
            error: 'Search failed',
            details: err.message,
            meta: { query, ms: Date.now() - startTime, providers: {} },
            items: []
        })
    }
})

// ─────────────────────────────────────────────────────────────
// 🔍 API v1: Legacy Jacred Search (DEPRECATED - use /api/v2/search)
// ─────────────────────────────────────────────────────────────

import { searchJacred, getMagnetFromJacred } from './jacred.js'

// DEPRECATED: Search torrents via Jacred only
app.get('/api/rutracker/search', async (req, res) => {
    const { query } = req.query
    if (!query) {
        return res.status(400).json({ error: 'Query required' })
    }

    // Deprecation warning in logs
    console.warn(`[DEPRECATED] /api/rutracker/search called - migrate to /api/v2/search. Query: ${query}`)

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
        await safeWrite(db)
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
    await safeWrite(db)
    console.log(`[DB API] Cleared ALL ${count} torrents from DB`)
    res.json({ success: true, cleared: count })
})

// ─────────────────────────────────────────────────────────────
// 📺 Auto-Downloader API: Manage auto-download rules
// ─────────────────────────────────────────────────────────────

// Get all rules and settings
app.get('/api/autodownload/rules', async (req, res) => {
    try {
        const data = await getRules()
        res.json(data)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// Add new rule
app.post('/api/autodownload/rules', async (req, res) => {
    const { query, resolution, group, season, lastEpisode } = req.body
    if (!query) {
        return res.status(400).json({ error: 'Query (series name) is required' })
    }
    try {
        const rule = await addRule({ query, resolution, group, season, lastEpisode })
        res.json(rule)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// Update rule
app.put('/api/autodownload/rules/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10)
    try {
        const rule = await updateRule(id, req.body)
        res.json(rule)
    } catch (err) {
        res.status(err.message === 'Rule not found' ? 404 : 500).json({ error: err.message })
    }
})

// Delete rule
app.delete('/api/autodownload/rules/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10)
    const deleted = await deleteRule(id)
    if (deleted) {
        res.json({ success: true })
    } else {
        res.status(404).json({ error: 'Rule not found' })
    }
})

// Update global settings (enable/disable, interval)
app.put('/api/autodownload/settings', async (req, res) => {
    try {
        const settings = await updateSettings(req.body)
        res.json(settings)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// Trigger manual check
app.post('/api/autodownload/check', async (req, res) => {
    try {
        const result = await checkRules()
        res.json(result)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// API: Generate M3U Playlist for Video Files
// Helper: sanitize filename for M3U metadata (remove newlines and control chars)
const sanitizeM3U = (str) => str.replace(/[\r\n\x00-\x1f]/g, ' ').trim()

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
                m3u += `#EXTINF:-1,${sanitizeM3U(file.name)}\n`

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
            fsPromises.rm(fullPath, { recursive: true, force: true })
                .then(() => console.log(`[File Hygiene] Successfully removed: ${fullPath}`))
                .catch(e => console.error(`[Delete Error] Could not remove ${fullPath}: ${e.message}`))
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
            safeWrite(db)
        }

        const head = {
            'Content-Range': `bytes ${start}-${end}/${file.length}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': contentType,
        }

        res.writeHead(206, head)

        // CRITICAL: Cleanup stream on client disconnect to prevent resource leaks
        const stream = file.createReadStream({ start, end })

        // ✅ FIX: Функция гарантированной очистки стрима
        const cleanup = () => {
            if (!stream.destroyed) {
                stream.destroy()
            }
        }

        // 🔥 v2.3: Handle stream errors to prevent hanging responses
        stream.on('error', (err) => {
            console.error(`[Stream] Error for ${infoHash}/${fileIndex}:`, err.message)
            cleanup()
            if (!res.headersSent) {
                res.status(500).send('Stream error')
            }
        })

        // ✅ FIX: Очистка при закрытии соединения клиентом
        res.on('close', cleanup)
        res.on('error', cleanup)

        stream.pipe(res)
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

    // ✅ FIX: Очищаем интервал rate limit cleanup
    if (rateLimitCleanupId) {
        clearInterval(rateLimitCleanupId)
        rateLimitCleanupId = null
    }

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
        await safeWrite(db)
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
import fsPromises from 'fs/promises'
import path from 'path'
import { db, safeWrite } from './db.js'

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

// ✅ FIX: Сохраняем ID интервала для очистки при shutdown
let frozenCleanupIntervalId = null

// Cleanup expired frozen torrents every 2 minutes
function startFrozenCleanup() {
    if (frozenCleanupIntervalId) return // Уже запущен

    frozenCleanupIntervalId = setInterval(() => {
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

    console.log('[Keep-Alive] Cleanup interval started')
}

// ✅ FIX: Функция для остановки интервала при shutdown
function stopFrozenCleanup() {
    if (frozenCleanupIntervalId) {
        clearInterval(frozenCleanupIntervalId)
        frozenCleanupIntervalId = null
        console.log('[Keep-Alive] Cleanup interval stopped')
    }
}

// Запускаем очистку при загрузке модуля
startFrozenCleanup()

// ────────────────────────────────────────────────────────
// Persistence: Save/Remove torrents to db.json
// ────────────────────────────────────────────────────────
async function saveTorrentToDB(magnetURI, name) {
    db.data.torrents ||= []
    // Avoid duplicates
    if (!db.data.torrents.find(t => t.magnet === magnetURI)) {
        db.data.torrents.push({ magnet: magnetURI, name, addedAt: Date.now(), completed: false })
        await safeWrite(db)
        console.log('[Persistence] Saved torrent:', name)
    }
}

// Mark torrent as completed in DB (survives restart)
async function markTorrentCompleted(infoHash) {
    const hashLower = infoHash.toLowerCase()
    const torrent = db.data.torrents?.find(t => t.magnet.toLowerCase().includes(hashLower))
    if (torrent && !torrent.completed) {
        torrent.completed = true
        await safeWrite(db)
        console.log('[Persistence] Marked as completed:', torrent.name)
    }
}

// ────────────────────────────────────────────────────────
// 📺 Watchlist: Track seen files to detect new episodes
// ────────────────────────────────────────────────────────
function getNewFilesCount(infoHash, currentFiles) {
    const seenFiles = db.data.seenFiles?.[infoHash] || []
    if (seenFiles.length === 0) {
        // First time seeing this torrent, mark all as seen
        updateSeenFiles(infoHash, currentFiles)
        return 0
    }
    // Count files not in seenFiles
    const newFiles = currentFiles.filter(f => !seenFiles.includes(f.name))
    return newFiles.length
}

function updateSeenFiles(infoHash, currentFiles) {
    db.data.seenFiles ||= {}
    db.data.seenFiles[infoHash] = currentFiles.map(f => f.name)
    safeWrite(db).catch(e => console.warn('[Watchlist] Failed to save seenFiles:', e.message))
}

// ────────────────────────────────────────────────────────
// 🔥 v2.3: Cache for isTorrentCompleted (expensive string search)
// ────────────────────────────────────────────────────────
const completedCache = new Map()  // infoHash -> { value, time }
const COMPLETED_CACHE_TTL = 60000 // 1 minute

// Check if torrent is marked as completed in DB (CACHED)
function isTorrentCompleted(infoHash) {
    const hashLower = infoHash.toLowerCase()

    // Check cache first
    const cached = completedCache.get(hashLower)
    if (cached && Date.now() - cached.time < COMPLETED_CACHE_TTL) {
        return cached.value
    }

    // Expensive search
    const result = db.data.torrents?.some(t =>
        t.magnet.toLowerCase().includes(hashLower) && t.completed === true
    ) || false

    // Cache result
    completedCache.set(hashLower, { value: result, time: Date.now() })

    // 🔥 Limit cache size
    if (completedCache.size > 100) {
        const firstKey = completedCache.keys().next().value
        completedCache.delete(firstKey)
    }

    return result
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
        await safeWrite(db)
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
            // ✅ FIX: Очищаем таймаут при успешном подключении
            if (engine._timeoutId) {
                clearTimeout(engine._timeoutId)
                delete engine._timeoutId
            }

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
            // ✅ FIX: Очищаем таймаут при ошибке
            if (engine._timeoutId) {
                clearTimeout(engine._timeoutId)
                delete engine._timeoutId
            }

            console.error('[Torrent] Engine error:', err.message)
            engine.destroy()
            reject(err)
        })

        // 🔥 STRATEGY 3: Increased Timeout (90s)
        // ✅ FIX: Сохраняем ID таймаута для очистки при успешном подключении
        const timeoutId = setTimeout(() => {
            if (!engines.has(magnetURI)) {
                console.warn('[Torrent] Timeout: no peers found')
                engine.destroy()
                reject(new Error('Torrent timeout: no peers found within 90 seconds'))
            }
        }, 90000)

        // ✅ FIX: Очищаем таймаут при успешном подключении (внутри engine.on('ready'))
        engine._timeoutId = timeoutId
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
    // ✅ FIX: Собираем ключи для удаления отдельно, чтобы избежать race condition
    const keysToDelete = []
    for (const [key, val] of engines.entries()) {
        if (val === engine) keysToDelete.push(key)
    }
    for (const key of keysToDelete) {
        engines.delete(key)
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
const STATUS_CACHE_TTL = 5000 // 🔥 v2.3: increased from 2s to 5s for ARM CPU optimization

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

    // Use async fs for non-blocking I/O (static import at top)

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

    // 📺 Watchlist: count new files since last check
    const currentFiles = engine.files || []
    const newFilesCount = getNewFilesCount(engine.infoHash, currentFiles)

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
        newFilesCount: newFilesCount, // 📺 Watchlist: new episodes since last check
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
// ⚡ Speed Mode: Eco / Balanced / Turbo
// ────────────────────────────────────────────────────────
const SPEED_MODES = {
    eco: 20,
    balanced: 40,
    turbo: 65
}

export const setSpeedMode = (mode) => {
    const connections = SPEED_MODES[mode] || SPEED_MODES.balanced
    const uniqueEngines = new Set(engines.values())

    for (const engine of uniqueEngines) {
        if (engine.swarm) {
            engine.swarm.maxConnections = connections
            console.log(`[SpeedMode] Set ${engine.infoHash?.slice(0, 8)} to ${mode} (${connections} connections)`)
        }
    }

    console.log(`[SpeedMode] Applied ${mode} mode to ${uniqueEngines.size} torrents`)
    return { mode, connections, torrentsAffected: uniqueEngines.size }
}

// ────────────────────────────────────────────────────────
// 🛑 Graceful Shutdown: Destroy all torrents
// ────────────────────────────────────────────────────────
export const destroyAllTorrents = () => {
    // ✅ FIX: Останавливаем интервал очистки frozen torrents
    stopFrozenCleanup()

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

// ────────────────────────────────────────────────────────
// 📊 v2.3: Diagnostics helpers
// ────────────────────────────────────────────────────────
export const getActiveTorrentsCount = () => engines.size
export const getFrozenTorrentsCount = () => frozenTorrents.size

// ────────────────────────────────────────────────────────
// 🛡️ v2.3.3: Graceful Degradation - Memory pressure handling
// ────────────────────────────────────────────────────────

let isDegradedMode = false

/**
 * Enter degraded mode: reduce memory usage
 * - Pause all frozen torrents (destroy them)
 * - Reduce max connections on active torrents
 * - Disable prefetch buffers
 */
export const enterDegradedMode = () => {
    if (isDegradedMode) return { alreadyDegraded: true }

    isDegradedMode = true
    console.log('[Degradation] Entering degraded mode - reducing memory usage')

    let freedCount = 0

    // 1. Clear all frozen torrents (they're just cache)
    for (const [hash, frozen] of frozenTorrents.entries()) {
        try {
            frozen.engine.destroy()
            freedCount++
        } catch (e) { }
    }
    frozenTorrents.clear()
    console.log(`[Degradation] Freed ${freedCount} frozen torrents`)

    // 2. Reduce connections on active torrents (eco mode)
    const uniqueEngines = new Set(engines.values())
    for (const engine of uniqueEngines) {
        if (engine.swarm) {
            engine.swarm.maxConnections = 30 // Minimal connections
        }
    }
    console.log(`[Degradation] Reduced connections on ${uniqueEngines.size} active torrents`)

    // 3. Force garbage collection if available
    if (global.gc) {
        global.gc()
        console.log('[Degradation] Forced garbage collection')
    }

    return {
        freedFrozen: freedCount,
        reducedConnections: uniqueEngines.size,
        mode: 'degraded'
    }
}

/**
 * Exit degraded mode: restore normal operation
 */
export const exitDegradedMode = () => {
    if (!isDegradedMode) return { alreadyNormal: true }

    isDegradedMode = false
    console.log('[Degradation] Exiting degraded mode - restoring normal operation')

    // Restore normal connections (balanced mode)
    const uniqueEngines = new Set(engines.values())
    for (const engine of uniqueEngines) {
        if (engine.swarm) {
            engine.swarm.maxConnections = 55 // Balanced mode default
        }
    }

    return { restoredConnections: uniqueEngines.size, mode: 'normal' }
}

/**
 * Check if currently in degraded mode
 */
export const isInDegradedMode = () => isDegradedMode

```

### server/autodownloader.js
```javascript
/**
 * Auto-Downloader Module v2.7.0 - MULTI-SOURCE
 * PWA-TorServe
 *
 * 🆕 v2.7.0 FEATURES:
 * - MULTI-SOURCE: Uses Aggregator (Jacred + RuTracker + future providers)
 * - PARTIAL SUCCESS: Works even if some providers fail
 * - DEDUPLICATION: Results deduplicated by infohash across providers
 *
 * 🆕 v2.6.7 FIXES:
 * - FIX: Translation now returns ARRAY ["Fallout", "Fallout S02"]
 * - FIX: Base name searched first (finds Russian releases like "Фоллаут 2 сезон")
 *
 * 🆕 v2.6.6 FEATURES:
 * - SMART QUERY: Auto-removes quality tags (DV, HDR, HMAX, WEB etc.)
 * - MULTI-VARIANT: Tries multiple query variants for better results
 *
 * 🆕 v2.6.3 OPTIMIZATIONS:
 * - ATOMIC WRITES: Grouped DB updates to prevent race conditions & corruption
 * - LOGIC FIX: lastEpisode is no longer updated by REPACK releases
 */

import { db, safeWrite } from './db.js'
import { search as aggregatorSearch } from './aggregator.js'
import { addTorrent } from './torrent.js'
import { logger } from './utils/logger.js'

const log = logger.child('AutoDownloader')

// Runtime DEBUG toggle
const DEBUG = process.env.AUTO_DL_DEBUG === '1'
const MAX_DOWNLOADS_PER_RULE = 1  // Only download the BEST torrent per episode

// Keywords detection
const BATCH_KEYWORDS = /complete|season|batch|pack|collection|全集|box[\s\.]?set/i
const FIX_KEYWORDS = /repack|proper|rerip|real\.proper|internal/i

// Global blacklist (defaults)
const GLOBAL_BLACKLIST = [
    'camrip', 'cam', 'hdcam',
    'ts', 'hdts', 'telesync',
    'tc', 'telecine',
    'workprint', 'screener',
    'hindi', 'tamil', 'telugu', 'dubbed',
    'linedub', 'korean', 'chinese',
    'sample', 'trailer'
]

// REPACK window (hours)
const REPACK_WINDOW_HOURS = 72  // 3 days

// ────────────────────────────────────────────────────────
// � Query Normalization for Better Search Results
// ────────────────────────────────────────────────────────

/**
 * Normalize search query by removing quality tags, codecs, groups etc.
 * This helps find results on jacred.xyz which doesn't parse these tags.
 * 
 * Examples:
 * - "IT Welcome to Derry S01 HMAX DV HDR WEB" → "Welcome to Derry S01"
 * - "Фоллаут 2" → "Фоллаут 2" (unchanged, but we'll try English too)
 */
function normalizeQuery(query) {
    let normalized = query.trim()

    // Remove quality/codec tags (case insensitive)
    const removeTags = [
        // Quality
        /\b(2160p|1080p|720p|480p|4k|uhd)\b/gi,
        // HDR variants
        /\b(hdr10\+?|hdr|dv|dolby\s*vision|hlg)\b/gi,
        // Codecs
        /\b(hevc|h\.?265|x\.?265|h\.?264|x\.?264|av1|avc)\b/gi,
        // Audio
        /\b(atmos|truehd|dts-?hd|dts|aac|ac3|eac3|flac)\b/gi,
        // Source tags (including standalone WEB)
        /\b(web-?dl|web-?rip|webrip|web|blu-?ray|bdrip|hdtv|dvdrip|hdrip|remux)\b/gi,
        // Streaming services
        /\b(hmax|hbo|netflix|nf|amzn|amazon|atvp|dsnp|disney\+?|hulu|paramount\+?)\b/gi,
        // Release groups (at end)
        /-[a-z0-9]+$/i,
        // Release groups in brackets
        /\[[^\]]+\]$/g,
        // "IT" prefix (often means International)
        /^IT\s+/i,
    ]

    for (const pattern of removeTags) {
        normalized = normalized.replace(pattern, '')
    }

    // Clean up multiple spaces and trim
    normalized = normalized.replace(/\s+/g, ' ').trim()

    // Remove trailing/leading dashes and dots
    normalized = normalized.replace(/^[\s.\-]+|[\s.\-]+$/g, '').trim()

    return normalized
}

// ────────────────────────────────────────────────────────
// 🌐 RU→EN Translation Dictionary for Popular Titles
// ────────────────────────────────────────────────────────

const RU_EN_TRANSLATIONS = {
    // Popular series
    'фоллаут': 'Fallout',
    'fallout': 'Fallout',
    'ведьмак': 'The Witcher',
    'игра престолов': 'Game of Thrones',
    'дом дракона': 'House of the Dragon',
    'мандалорец': 'The Mandalorian',
    'локи': 'Loki',
    'ванда вижн': 'WandaVision',
    'соколиный глаз': 'Hawkeye',
    'лунный рыцарь': 'Moon Knight',
    'мисс марвел': 'Ms Marvel',
    'женщина халк': 'She Hulk',
    'секретное вторжение': 'Secret Invasion',
    'агата': 'Agatha All Along',
    'звёздные войны': 'Star Wars',
    'звездные войны': 'Star Wars',
    'оби ван': 'Obi-Wan Kenobi',
    'асока': 'Ahsoka',
    'андор': 'Andor',
    'аколит': 'The Acolyte',
    'скелетон крю': 'Skeleton Crew',
    'кольца власти': 'Rings of Power',
    'властелин колец': 'Lord of the Rings',
    'последние из нас': 'The Last of Us',
    'одни из нас': 'The Last of Us',
    'последний из нас': 'The Last of Us',
    'ходячие мертвецы': 'The Walking Dead',
    'очень странные дела': 'Stranger Things',
    'чёрное зеркало': 'Black Mirror',
    'черное зеркало': 'Black Mirror',
    'бумажный дом': 'Money Heist',
    'ла каса де папель': 'Money Heist',
    'во все тяжкие': 'Breaking Bad',
    'лучше звоните солу': 'Better Call Saul',
    'острые козырьки': 'Peaky Blinders',
    'викинги': 'Vikings',
    'корона': 'The Crown',
    'эйфория': 'Euphoria',
    'сукасияние': 'The Shining', // :)
    'сияние': 'The Shining',
    'оно': 'IT',
    'пенниуайз': 'Pennywise',
    'добро пожаловать в дерри': 'Welcome to Derry',
    // Movies
    'дюна': 'Dune',
    'аватар': 'Avatar',
    'мстители': 'Avengers',
    'человек паук': 'Spider-Man',
    'бэтмен': 'Batman',
    'джокер': 'Joker',
    'супермен': 'Superman',
    // Add more as needed
}

/**
 * Translate Russian query to English using dictionary
 * 🆕 v2.6.7: Returns array of variants (with season AND without)
 */
function translateRuToEn(query) {
    const lowerQuery = query.toLowerCase().trim()
    const variants = []

    // Check for exact match first
    if (RU_EN_TRANSLATIONS[lowerQuery]) {
        variants.push(RU_EN_TRANSLATIONS[lowerQuery])
        return variants
    }

    // Check for partial matches (title + season)
    for (const [ru, en] of Object.entries(RU_EN_TRANSLATIONS)) {
        if (lowerQuery.startsWith(ru)) {
            // Always add base English name first (most likely to find results)
            variants.push(en)

            // Extract season/episode info after the title
            const suffix = lowerQuery.slice(ru.length).trim()
            const seasonMatch = suffix.match(/(?:сезон\s*)?(\d+)/i)
            if (seasonMatch) {
                // Also add with season format (e.g., "Fallout S02")
                variants.push(`${en} S${seasonMatch[1].padStart(2, '0')}`)
            }

            return variants
        }
    }

    return []  // Return empty array if no translation found
}

/**
 * Generate query variants to try (for better search coverage)
 * Returns array of queries to try in order
 * 🆕 v2.6.7: Translation returns array of variants
 */
function generateQueryVariants(query) {
    const variants = []
    const normalized = normalizeQuery(query)

    // 1. Try English translations first (most likely to find results)
    const englishTranslations = translateRuToEn(normalized || query)
    if (englishTranslations.length > 0) {
        variants.push(...englishTranslations)
    }

    // 2. Normalized query (without tags)
    if (normalized && normalized !== query && !variants.includes(normalized)) {
        variants.push(normalized)
    }

    // 3. Original query (might work if user entered it correctly)
    if (!variants.includes(query)) {
        variants.push(query)
    }

    // 4. If query has season info, try without it
    const seasonMatch = query.match(/S(\d{1,2})/i) || query.match(/Season\s*(\d+)/i)
    if (seasonMatch) {
        const withoutSeason = normalized
            .replace(/S\d{1,2}/i, '')
            .replace(/Season\s*\d+/i, '')
            .replace(/\s+/g, ' ')
            .trim()
        if (withoutSeason && !variants.includes(withoutSeason)) {
            // Also try English translation without season
            const enWithoutSeason = translateRuToEn(withoutSeason)
            for (const tr of enWithoutSeason) {
                if (!variants.includes(tr)) {
                    variants.push(tr)
                }
            }
            variants.push(withoutSeason)
        }
    }

    // Remove duplicates while preserving order
    return [...new Set(variants)]
}

// ────────────────────────────────────────────────────────
// �📺 Enhanced Title Parser
// ────────────────────────────────────────────────────────

export function parseTorrentTitle(title, sizeFromAPI = 0) {
    const result = {
        title: '',
        season: null,
        episode: 0,
        resolution: '',
        group: '',
        qualityScore: 0,
        sizeGB: sizeFromAPI,
        isHevc: false,
        isBatch: false,
        isRepack: false,
        _raw: title
    }

    let cleanTitle = title.trim()

    // Detect REPACK/PROPER
    result.isRepack = FIX_KEYWORDS.test(cleanTitle)

    // Batch detection
    result.isBatch = BATCH_KEYWORDS.test(cleanTitle)

    // Quality score extraction
    if (/2160p|4k|uhd/i.test(cleanTitle)) {
        result.qualityScore = 4
        result.resolution = '2160p'
    } else if (/1080p/i.test(cleanTitle)) {
        result.qualityScore = 3
        result.resolution = '1080p'
    } else if (/720p/i.test(cleanTitle)) {
        result.qualityScore = 2
        result.resolution = '720p'
    } else if (/480p/i.test(cleanTitle)) {
        result.qualityScore = 1
        result.resolution = '480p'
    }

    // HEVC detection
    result.isHevc = /x265|hevc/i.test(cleanTitle)

    // Size extraction
    if (!result.sizeGB) {
        const sizeMatch = cleanTitle.match(/(\d+(?:\.\d+)?)\s*(GB|GiB)/i)
        if (sizeMatch) {
            result.sizeGB = parseFloat(sizeMatch[1])
        }
    }

    // Release group extraction
    const groupBracketMatch = cleanTitle.match(/^\[([^\]]+)\]/)
    const groupDashMatch = cleanTitle.match(/-([A-Za-z0-9]+)(?:\.[a-z]{2,4})?$/)
    if (groupBracketMatch) {
        result.group = groupBracketMatch[1]
    } else if (groupDashMatch) {
        result.group = groupDashMatch[1]
    }

    // Pattern 1: SxxExx
    const sxxexxMatch = cleanTitle.match(/[\.\s]S(\d{1,2})E(\d{1,3})/i)
    if (sxxexxMatch) {
        result.season = parseInt(sxxexxMatch[1], 10)
        result.episode = parseInt(sxxexxMatch[2], 10)
        const titlePart = cleanTitle.split(/S\d{1,2}E\d{1,3}/i)[0]
        result.title = cleanTitlePart(titlePart)
        return result
    }

    // Pattern 2: Season X Episode Y
    const verboseMatch = cleanTitle.match(/Season\s*(\d+)\s*Episode\s*(\d+)/i)
    if (verboseMatch) {
        result.season = parseInt(verboseMatch[1], 10)
        result.episode = parseInt(verboseMatch[2], 10)
        const titlePart = cleanTitle.split(/Season/i)[0]
        result.title = cleanTitlePart(titlePart)
        return result
    }

    // Pattern 3: Anime style
    const animeMatch = cleanTitle.match(/(.+?)\s*[-–]\s*(\d{1,4})(?:v\d)?(?:\s|$|\[|\()/)
    if (animeMatch) {
        result.episode = parseInt(animeMatch[2], 10)
        result.title = cleanTitlePart(animeMatch[1])
        return result
    }

    // Pattern 4: Episode keyword
    const epMatch = cleanTitle.match(/(.+?)\s*(?:Episode|Ep\.?|E)\s*(\d{1,3})/i)
    if (epMatch) {
        result.episode = parseInt(epMatch[2], 10)
        result.title = cleanTitlePart(epMatch[1])
        return result
    }

    // Pattern 5: Simple number
    const simpleNumberMatch = cleanTitle.match(/(.+?)\s+(\d{1,3})\s+(?:\d{3,4}p|\[|$)/i)
    if (simpleNumberMatch) {
        result.episode = parseInt(simpleNumberMatch[2], 10)
        result.title = cleanTitlePart(simpleNumberMatch[1])
        return result
    }

    // Generic fallback
    result.title = cleanTitlePart(cleanTitle)
    return result
}

function cleanTitlePart(title) {
    return title
        .replace(/^\[([^\]]+)\]\s*/, '')
        .replace(/\./g, ' ')
        .replace(/\s*\([^)]+\)\s*/g, ' ')
        .replace(/\s*\[[^\]]+\]\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

// ────────────────────────────────────────────────────────
// 🔍 Enhanced Rule Matching
// ────────────────────────────────────────────────────────

function matchesRule(parsed, rule) {
    // 1. Blacklist Check
    const globalBlacklist = db.data.autoDownloadSettings?.globalBlacklist || GLOBAL_BLACKLIST
    const ruleBlacklist = rule.excludeKeywords || []
    const combinedBlacklist = [...globalBlacklist, ...ruleBlacklist]

    if (combinedBlacklist.length > 0) {
        const lowerTitle = parsed._raw.toLowerCase()
        const blockedKeyword = combinedBlacklist.find(keyword =>
            lowerTitle.includes(keyword.toLowerCase())
        )
        if (blockedKeyword) {
            if (DEBUG) log.debug('❌ Excluded by keyword', { keyword: blockedKeyword })
            return false
        }
    }

    // 2. Batch detection
    if (parsed.isBatch && rule.lastEpisode > 0) {
        if (DEBUG) log.debug('❌ Batch detected, skipping')
        return false
    }

    // 3. Block REPACKs if no original downloaded yet
    if (parsed.isRepack && rule.lastEpisode === 0) {
        if (DEBUG) log.debug('❌ REPACK not allowed (no original downloaded yet)', { episode: parsed.episode })
        return false
    }

    // 4. Title fuzzy matching
    const queryLower = rule.query.toLowerCase()
    const titleLower = parsed.title.toLowerCase()

    const hasExactMatch =
        queryLower.length > 3 &&
        (titleLower.includes(queryLower) || queryLower.includes(titleLower))

    if (!hasExactMatch) {
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2)
        const titleWords = titleLower.split(/\s+/).filter(w => w.length > 2)

        if (queryWords.length === 0) {
            if (DEBUG) log.debug('❌ Query too short')
            return false
        }

        const matchCount = queryWords.filter(qw =>
            titleWords.some(tw => tw.includes(qw) || qw.includes(tw))
        ).length

        const minMatches = Math.max(1, Math.ceil(queryWords.length * 0.5))

        if (matchCount < minMatches) {
            if (DEBUG) log.debug('❌ Title mismatch')
            return false
        }
    }

    // 5. Quality/Resolution Filters
    if (rule.quality && rule.quality !== 'any') {
        const requiredQuality = {
            '4k': 4, '2160p': 4,
            '1080p': 3, '720p': 2, '480p': 1
        }[rule.quality.toLowerCase()]

        // Strict mode: Allow equal or better quality
        if (rule.strictQuality && requiredQuality) {
            if (parsed.qualityScore < requiredQuality) {
                if (DEBUG) log.debug('❌ Strict quality filter (below minimum)', {
                    required: rule.quality,
                    requiredScore: requiredQuality,
                    gotScore: parsed.qualityScore
                })
                return false
            }
        }
    }

    // 6. Resolution filter (strict: if rule requires resolution, torrent must have it)
    if (rule.resolution && rule.resolution.trim() !== '') {
        if (!parsed.resolution) {
            if (DEBUG) log.debug('❌ Resolution required but not found')
            return false
        }
        if (!parsed.resolution.includes(rule.resolution.toLowerCase())) {
            if (DEBUG) log.debug('❌ Resolution mismatch')
            return false
        }
    }

    // 7. Group Filter
    if (rule.group && rule.group.trim() !== '') {
        if (parsed.group && !parsed.group.toLowerCase().includes(rule.group.toLowerCase())) {
            if (DEBUG) log.debug('❌ Group mismatch')
            return false
        }
    }

    // 8. Season Filter
    if (rule.season && rule.season > 0) {
        if (parsed.season === null) {
            if (DEBUG) log.debug('❌ Season required but not parsed')
            return false
        }
        if (parsed.season !== rule.season) {
            if (DEBUG) log.debug('❌ Season mismatch')
            return false
        }
    }

    // 9. Episode Check with Smart REPACK Handling
    if (parsed.episode > 0 && parsed.episode <= rule.lastEpisode) {
        if (parsed.isRepack) {
            const timestampKey = `${rule.id}_${parsed.episode}`
            const lastDownloadTime = db.data.autoDownloadTimestamps?.[timestampKey] || 0
            const hoursSinceDownload = (Date.now() - lastDownloadTime) / (1000 * 60 * 60)

            if (hoursSinceDownload < REPACK_WINDOW_HOURS) {
                if (DEBUG) log.debug('✅ REPACK allowed (within window)', {
                    hoursSince: Math.round(hoursSinceDownload)
                })
                return true
            } else {
                if (DEBUG) log.debug('❌ REPACK too old', {
                    hoursSince: Math.round(hoursSinceDownload)
                })
                return false
            }
        }

        if (DEBUG) log.debug('❌ Episode too old')
        return false
    }

    if (parsed.episode === 0 && rule.lastEpisode > 0 && !parsed.isBatch) {
        if (DEBUG) log.debug('⚠️ Unknown episode detected, allowing')
    }

    return true
}

// ────────────────────────────────────────────────────────
// 🏆 Smart Candidate Selection
// ────────────────────────────────────────────────────────

function selectBestCandidate(candidates, rule) {
    if (candidates.length === 0) return null
    if (candidates.length === 1) return candidates[0]

    candidates.sort((a, b) => {
        // 1. Quality
        if (b.parsed.qualityScore !== a.parsed.qualityScore) {
            return b.parsed.qualityScore - a.parsed.qualityScore
        }
        // 2. HEVC Preference
        if (rule.preferHevc) {
            if (b.parsed.isHevc !== a.parsed.isHevc) {
                return (b.parsed.isHevc ? 1 : 0) - (a.parsed.isHevc ? 1 : 0)
            }
        }
        // 3. Size
        if (b.parsed.sizeGB !== a.parsed.sizeGB) {
            return b.parsed.sizeGB - a.parsed.sizeGB
        }
        // 4. Non-HEVC Fallback
        if (!rule.preferHevc) {
            if (a.parsed.isHevc !== b.parsed.isHevc) {
                return (a.parsed.isHevc ? 1 : 0) - (b.parsed.isHevc ? 1 : 0)
            }
        }
        return 0
    })

    return candidates[0]
}

// ────────────────────────────────────────────────────────
// 🚀 Main Check Logic
// ────────────────────────────────────────────────────────

export async function checkRules() {
    await db.read()

    const settings = db.data.autoDownloadSettings || { enabled: false }
    const rules = db.data.autoDownloadRules || []

    if (!settings.enabled || rules.length === 0) {
        return { checked: 0, downloaded: 0, errors: 0 }
    }

    db.data.autoDownloadTimestamps ||= {}

    log.info('🔍 Starting auto-download check', { rulesCount: rules.length })

    let downloaded = 0
    let errors = 0
    let totalTorrentsChecked = 0
    const downloadedHashes = new Set(db.data.autoDownloadHistory || [])

    for (const rule of rules) {
        if (!rule.enabled) continue

        try {
            // Generate query variants (normalized, original, without season)
            const queryVariants = generateQueryVariants(rule.query)

            log.info('🔍 Checking rule', {
                query: rule.query,
                variants: queryVariants,
                lastEpisode: rule.lastEpisode
            })

            // Try each query variant until we get results
            let results = []
            let usedQuery = null

            for (const variant of queryVariants) {
                log.info('🔎 Trying query variant', { variant })
                const searchResult = await aggregatorSearch(variant)

                if (searchResult.results && searchResult.results.length > 0) {
                    results = searchResult.results
                    usedQuery = variant
                    log.info('✅ Found results with variant', {
                        variant,
                        count: results.length,
                        providers: Object.keys(searchResult.providers || {})
                    })
                    break
                }

                // Small delay between variants to avoid rate limiting
                await new Promise(r => setTimeout(r, 1000))
            }

            if (results.length === 0) {
                log.warn('⚠️ No results found for any variant', {
                    originalQuery: rule.query,
                    triedVariants: queryVariants
                })
                continue
            }

            log.info('📦 Search results', { usedQuery, count: results.length })

            // Group candidates
            const episodeCandidates = new Map()
            let unknownEpisodeCounter = 0

            for (const torrent of results) {
                totalTorrentsChecked++

                const magnetHash = extractHash(torrent.magnet)
                if (magnetHash && downloadedHashes.has(magnetHash)) {
                    if (DEBUG) log.debug('⏭️ Already downloaded')
                    continue
                }

                const sizeGB = torrent.Size ? parseFloat(torrent.Size) / (1024 ** 3) : 0
                const parsed = parseTorrentTitle(torrent.title, sizeGB)

                if (matchesRule(parsed, rule)) {
                    let episodeKey
                    if (parsed.episode > 0) {
                        episodeKey = `e${parsed.episode}`
                    } else {
                        episodeKey = `unknown_${unknownEpisodeCounter++}`
                    }

                    if (!episodeCandidates.has(episodeKey)) {
                        episodeCandidates.set(episodeKey, [])
                    }
                    episodeCandidates.get(episodeKey).push({ torrent, parsed })
                }
            }

            // Process best candidates
            let downloadsThisRule = 0

            for (const [episodeKey, candidates] of episodeCandidates.entries()) {
                if (downloadsThisRule >= MAX_DOWNLOADS_PER_RULE) break

                const best = selectBestCandidate(candidates, rule)
                if (!best) continue

                log.info('🎯 MATCH FOUND', {
                    title: best.parsed.title,
                    episode: best.parsed.episode,
                    repack: best.parsed.isRepack
                })

                try {
                    await addTorrent(best.torrent.magnet)
                    downloaded++
                    downloadsThisRule++

                    // 🚀 ATOMIC WRITE BLOCK
                    let dbChanged = false

                    // 1. Update lastEpisode (Only for originals)
                    // Prevents REPACKs from incorrectly advancing the episode counter
                    if (best.parsed.episode > 0 && !best.parsed.isRepack) {
                        rule.lastEpisode = Math.max(rule.lastEpisode, best.parsed.episode)
                        dbChanged = true
                    }

                    // 2. Update Timestamp (Only for originals or safety fill)
                    if (best.parsed.episode > 0 && !best.parsed.isRepack) {
                        const timestampKey = `${rule.id}_${best.parsed.episode}`
                        if (!db.data.autoDownloadTimestamps[timestampKey]) {
                            db.data.autoDownloadTimestamps[timestampKey] = Date.now()
                            dbChanged = true
                        }
                    }

                    // 3. Update History
                    const magnetHash = extractHash(best.torrent.magnet)
                    if (magnetHash) {
                        downloadedHashes.add(magnetHash)
                        db.data.autoDownloadHistory = [...downloadedHashes].slice(-500)
                        dbChanged = true
                    }

                    // 4. Perform Atomic Write
                    if (dbChanged) {
                        await safeWrite(db)
                    }

                    log.info('✅ Download started')
                } catch (err) {
                    log.error('❌ Failed to add torrent', { error: err.message })
                    errors++
                }
            }

        } catch (err) {
            log.error('❌ Rule check error', { error: err.message })
            errors++
        }
    }

    log.info('✅ Check complete', { downloaded, errors, torrentsChecked: totalTorrentsChecked })
    return { checked: rules.length, downloaded, errors }
}

/**
 * Extract infohash from magnet link
 * Supports both hex (40 chars) and base32 (32 chars) formats
 */
function extractHash(magnet) {
    if (!magnet) return null
    // Try hex format first (40 chars)
    const hexMatch = magnet.match(/urn:btih:([a-fA-F0-9]{40})/i)
    if (hexMatch) return hexMatch[1].toLowerCase()
    // Try base32 format (32 chars)
    const base32Match = magnet.match(/urn:btih:([A-Z2-7]{32})/i)
    if (base32Match) return base32Match[1].toLowerCase()
    return null
}

// ────────────────────────────────────────────────────────
// 📋 Rule Management API
// ────────────────────────────────────────────────────────

export async function getRules() {
    await db.read()
    return {
        settings: db.data.autoDownloadSettings || {
            enabled: false,
            intervalMinutes: 30,
            globalBlacklist: GLOBAL_BLACKLIST
        },
        rules: db.data.autoDownloadRules || []
    }
}

export async function addRule(rule) {
    await db.read()
    db.data.autoDownloadRules ||= []

    const newRule = {
        id: Date.now(),
        query: rule.query,
        quality: rule.quality || '',
        strictQuality: rule.strictQuality || false,
        preferHevc: rule.preferHevc || false,
        excludeKeywords: rule.excludeKeywords || [],
        resolution: rule.resolution || '',
        group: rule.group || '',
        season: rule.season || 0,
        lastEpisode: rule.lastEpisode || 0,
        enabled: true,
        createdAt: Date.now()
    }

    db.data.autoDownloadRules.push(newRule)
    await safeWrite(db)
    return newRule
}

export async function updateRule(id, updates) {
    await db.read()
    const rules = db.data.autoDownloadRules || []
    const index = rules.findIndex(r => r.id === id)

    if (index === -1) throw new Error('Rule not found')

    rules[index] = { ...rules[index], ...updates }
    await safeWrite(db)
    return rules[index]
}

export async function deleteRule(id) {
    await db.read()
    const before = db.data.autoDownloadRules?.length || 0
    db.data.autoDownloadRules = (db.data.autoDownloadRules || []).filter(r => r.id !== id)

    if (db.data.autoDownloadRules.length < before) {
        await safeWrite(db)
        return true
    }
    return false
}

export async function updateSettings(settings) {
    await db.read()
    db.data.autoDownloadSettings = {
        ...db.data.autoDownloadSettings,
        ...settings
    }
    await safeWrite(db)
    return db.data.autoDownloadSettings
}

```

### server/aggregator.js
```javascript
/**
 * Aggregator - Multi-source torrent search aggregation
 * PWA-TorServe Provider Architecture v2.8.0
 * 
 * Combines results from multiple providers using Promise.allSettled
 * Implements:
 * - Parallel search across all enabled providers
 * - Timeout per provider
 * - Deduplication by infohash
 * - Partial success (returns results even if some providers fail)
 * - Search cache (5 min TTL)
 * - Circuit breaker per provider
 */

import { providerManager } from './providers/index.js'
import { searchCache } from './searchCache.js'
import { logger } from './utils/logger.js'

const log = logger.child('Aggregator')

// Search timeout per provider (ms)
const PROVIDER_TIMEOUT = 30000

// ─────────────────────────────────────────────────────────────
// 🔒 Circuit Breaker: Auto-disable failing providers
// ─────────────────────────────────────────────────────────────
const FAILURE_THRESHOLD = 3        // Failures before opening circuit
const RECOVERY_TIMEOUT = 5 * 60000 // 5 minutes before retry

const circuitBreakers = new Map() // provider -> { failures, openedAt }

function getCircuitState(providerName) {
    if (!circuitBreakers.has(providerName)) {
        circuitBreakers.set(providerName, { failures: 0, openedAt: null })
    }
    return circuitBreakers.get(providerName)
}

function isCircuitOpen(providerName) {
    const state = getCircuitState(providerName)
    if (!state.openedAt) return false

    // Check if recovery timeout passed
    if (Date.now() - state.openedAt > RECOVERY_TIMEOUT) {
        state.failures = 0
        state.openedAt = null
        log.info('Circuit closed (recovery)', { provider: providerName })
        return false
    }
    return true
}

function recordSuccess(providerName) {
    const state = getCircuitState(providerName)
    state.failures = 0
    state.openedAt = null
}

function recordFailure(providerName) {
    const state = getCircuitState(providerName)
    state.failures++

    if (state.failures >= FAILURE_THRESHOLD && !state.openedAt) {
        state.openedAt = Date.now()
        log.warn('Circuit opened', { provider: providerName, failures: state.failures })
    }
}

// ─────────────────────────────────────────────────────────────

/**
 * Search across all enabled providers (with cache)
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @param {boolean} options.skipCache - Skip cache lookup
 * @returns {Promise<{results: Array, errors: Array, providers: Object, cached: boolean}>}
 */
export async function search(query, options = {}) {
    // Check cache first
    if (!options.skipCache) {
        const cached = searchCache.get(query)
        if (cached) {
            log.info('📦 Cache hit', { query, resultsCount: cached.results.length })
            return { ...cached, errors: [], cached: true }
        }
    }

    const providers = providerManager.getEnabled()
        .filter(p => !isCircuitOpen(p.name))

    if (providers.length === 0) {
        log.warn('No available providers')
        return { results: [], errors: ['No available providers'], providers: {}, cached: false }
    }

    log.info('🔍 Aggregated search', { query, providersCount: providers.length })

    // Create search promises with timeout
    const searchPromises = providers.map(async (provider) => {
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), PROVIDER_TIMEOUT)
        )

        try {
            const results = await Promise.race([
                provider.search(query),
                timeoutPromise
            ])
            recordSuccess(provider.name)
            return { provider: provider.name, results, success: true }
        } catch (error) {
            recordFailure(provider.name)
            return { provider: provider.name, error: error.message, success: false }
        }
    })

    // Wait for all providers (partial success allowed)
    const outcomes = await Promise.allSettled(searchPromises)

    // Collect results and errors
    const allResults = []
    const errors = []
    const providerStats = {}

    for (const outcome of outcomes) {
        if (outcome.status === 'fulfilled') {
            const { provider, results, success, error } = outcome.value

            if (success && results) {
                allResults.push(...results)
                providerStats[provider] = { count: results.length, status: 'ok' }
                log.info(`✅ ${provider}`, { count: results.length })
            } else {
                errors.push({ provider, error })
                providerStats[provider] = { count: 0, status: 'error', error }
                log.warn(`❌ ${provider}`, { error })
            }
        } else {
            log.error('Unexpected rejection', outcome.reason)
        }
    }

    // Add skipped providers (circuit open)
    const skipped = providerManager.getEnabled()
        .filter(p => isCircuitOpen(p.name))
    for (const p of skipped) {
        providerStats[p.name] = { count: 0, status: 'circuit_open' }
    }

    // Deduplicate by infohash
    const deduped = deduplicateByInfohash(allResults)

    // Store in cache if we got results
    if (deduped.length > 0) {
        searchCache.set(query, deduped, providerStats)
    }

    log.info('✅ Aggregation complete', {
        totalResults: deduped.length,
        fromProviders: Object.keys(providerStats).length,
        errors: errors.length
    })

    return { results: deduped, errors, providers: providerStats, cached: false }
}

/**
 * Get magnet link for a torrent from specific provider
 */
export async function getMagnet(providerName, id) {
    const provider = providerManager.get(providerName)
    if (!provider) {
        return { error: `Provider not found: ${providerName}` }
    }
    return provider.getMagnet(id)
}

/**
 * Get status of all providers (including circuit state)
 */
export function getProvidersStatus() {
    return providerManager.getAll().map(p => ({
        name: p.name,
        enabled: p.enabled,
        healthy: p.isHealthy(),
        circuitOpen: isCircuitOpen(p.name),
        failures: getCircuitState(p.name).failures
    }))
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
    return searchCache.getStats()
}

/**
 * Reset circuit breaker for a provider
 */
export function resetCircuit(providerName) {
    const state = getCircuitState(providerName)
    state.failures = 0
    state.openedAt = null
    log.info('Circuit reset', { provider: providerName })
}

/**
 * Deduplicate results by infohash
 */
function deduplicateByInfohash(results) {
    const seen = new Map()

    for (const result of results) {
        const hash = extractInfohash(result.magnet)

        if (!hash) {
            seen.set(`nohash_${Math.random()}`, result)
            continue
        }

        const existing = seen.get(hash)
        if (!existing || (result.seeders > existing.seeders)) {
            seen.set(hash, result)
        }
    }

    return Array.from(seen.values())
}

/**
 * Extract infohash from magnet link
 */
function extractInfohash(magnet) {
    if (!magnet) return null

    const hexMatch = magnet.match(/urn:btih:([a-fA-F0-9]{40})/i)
    if (hexMatch) return hexMatch[1].toLowerCase()

    const base32Match = magnet.match(/urn:btih:([A-Z2-7]{32})/i)
    if (base32Match) return base32Match[1].toLowerCase()

    return null
}

```

### server/db.js
```javascript
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { safeWrite } from './dbQueue.js'

// Initialize DB
const defaultData = {
    serverStatus: 'ok',        // 'ok' | 'degraded' | 'error' | 'circuit_open'
    lastStateChange: Date.now(),
    storageFailures: 0,
    progress: {},
    seenFiles: {},             // { [infoHash]: [fileName1, fileName2, ...] } - for new episode detection
    torrents: [],              // Array of { magnet, name, addedAt } for persistence
    // Auto-Downloader
    autoDownloadSettings: {
        enabled: false,
        intervalMinutes: 720  // 12 hours
    },
    autoDownloadRules: [],     // [{ id, query, resolution, group, season, lastEpisode, enabled }]
    autoDownloadHistory: []    // Array of magnet hashes to prevent duplicates
}
const dbPath = process.env.DB_PATH || 'db.json'
const adapter = new JSONFile(dbPath)
const db = new Low(adapter, defaultData)

// Ensure DB is ready and migrate existing data
await db.read()

// Merge defaults with existing data (handles DB migrations)
db.data = { ...defaultData, ...db.data }

// Ensure nested objects are initialized
db.data.progress ||= {}
db.data.seenFiles ||= {}
db.data.autoDownloadSettings ||= { enabled: false, intervalMinutes: 30 }
db.data.autoDownloadRules ||= []
db.data.autoDownloadHistory ||= []

await db.write()

export { db, safeWrite }


```

### server/dbQueue.js
```javascript
/**
 * DB Write Queue - prevents race conditions in LowDB writes
 * 
 * LowDB rewrites entire JSON file on each write.
 * Concurrent writes can corrupt the file.
 * This module serializes all writes through a Promise chain.
 */

let writeQueue = Promise.resolve()
let pendingWrites = 0

/**
 * Safe write to database with serialization
 * @param {object} db - LowDB instance
 * @returns {Promise} - resolves when write is complete
 */
export function safeWrite(db) {
    pendingWrites++

    writeQueue = writeQueue
        .then(() => db.write())
        .then(() => {
            pendingWrites--
        })
        .catch((err) => {
            pendingWrites--
            console.error('[DB] Write failed:', err.message)
            // Don't break the chain - allow subsequent writes
        })

    return writeQueue
}

/**
 * Get number of pending writes (for debugging/monitoring)
 */
export function getPendingWrites() {
    return pendingWrites
}

```

### server/searchCache.js
```javascript
/**
 * Search Cache - Short-lived cache for search results
 * PWA-TorServe Provider Architecture
 * 
 * Reduces load on providers by caching search results for 5-10 minutes.
 * Uses LRU-like eviction when cache is full.
 */

import { logger } from './utils/logger.js'

const log = logger.child('SearchCache')

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000  // 5 minutes
const MAX_CACHE_SIZE = 100          // Max cached queries

class SearchCache {
    constructor() {
        /** @type {Map<string, {results: Array, expires: number, providers: Object}>} */
        this.cache = new Map()
        this.hits = 0
        this.misses = 0
    }

    /**
     * Generate cache key from query
     * @param {string} query
     * @returns {string}
     */
    _key(query) {
        return query.toLowerCase().trim()
    }

    /**
     * Get cached results if available and not expired
     * @param {string} query
     * @returns {{results: Array, providers: Object}|null}
     */
    get(query) {
        const key = this._key(query)
        const cached = this.cache.get(key)

        if (!cached) {
            this.misses++
            return null
        }

        if (Date.now() > cached.expires) {
            this.cache.delete(key)
            this.misses++
            log.debug('Cache expired', { query: key })
            return null
        }

        this.hits++
        log.debug('Cache hit', { query: key, age: Math.round((cached.expires - Date.now()) / 1000) + 's left' })
        return { results: cached.results, providers: cached.providers }
    }

    /**
     * Store search results in cache
     * @param {string} query
     * @param {Array} results
     * @param {Object} providers
     */
    set(query, results, providers) {
        const key = this._key(query)

        // Evict old entries if cache is full
        if (this.cache.size >= MAX_CACHE_SIZE) {
            this._evictOldest()
        }

        this.cache.set(key, {
            results,
            providers,
            expires: Date.now() + CACHE_TTL_MS
        })

        log.debug('Cache set', { query: key, resultsCount: results.length })
    }

    /**
     * Evict oldest entries (LRU-like)
     * @private
     */
    _evictOldest() {
        const now = Date.now()
        let evicted = 0

        // First, remove expired entries
        for (const [key, value] of this.cache) {
            if (now > value.expires) {
                this.cache.delete(key)
                evicted++
            }
        }

        // If still full, remove oldest 10%
        if (this.cache.size >= MAX_CACHE_SIZE) {
            const toRemove = Math.ceil(MAX_CACHE_SIZE * 0.1)
            const keys = Array.from(this.cache.keys()).slice(0, toRemove)
            keys.forEach(k => this.cache.delete(k))
            evicted += toRemove
        }

        if (evicted > 0) {
            log.debug('Cache evicted', { count: evicted })
        }
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear()
        log.info('Cache cleared')
    }

    /**
     * Get cache statistics
     * @returns {Object}
     */
    getStats() {
        const total = this.hits + this.misses
        return {
            size: this.cache.size,
            maxSize: MAX_CACHE_SIZE,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? Math.round((this.hits / total) * 100) + '%' : 'N/A',
            ttlMinutes: CACHE_TTL_MS / 60000
        }
    }
}

// Singleton instance
export const searchCache = new SearchCache()

```

### server/watchdog.js
```javascript
/**
 * Watchdog Module - Self-Healing Architecture
 * PWA-TorServe v2.3.3
 *
 * Features:
 * - Non-blocking async monitoring loop
 * - RAM monitoring with hysteresis (30s delay for degraded)
 * - NFS Circuit Breaker (3 failures → 5min pause)
 * - Automatic counter reset on recovery
 * - 🆕 Graceful Degradation: auto-reduce memory on pressure
 */

import { db, safeWrite } from './db.js'
import fs from 'fs'
import path from 'path'
import { checkRules } from './autodownloader.js'
import { enterDegradedMode, exitDegradedMode } from './torrent.js'

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
let circuitOpenUntil = null           // Timestamp when circuit breaker will retry
let isWatchdogRunning = false
let lastAutoDownloadCheck = 0         // Timestamp of last auto-download check

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

        // 🆕 v2.3.3: Graceful Degradation - auto-reduce memory on pressure
        if (newStatus === 'degraded') {
            const result = enterDegradedMode()
            console.log(`[Watchdog] Degradation applied:`, result)
        }

        // Reset counters on recovery to OK
        if (newStatus === 'ok') {
            db.data.storageFailures = 0
            degradedSince = null

            // 🆕 v2.3.3: Exit degraded mode on recovery
            const result = exitDegradedMode()
            console.log(`[Watchdog] Recovery applied:`, result)
            console.log('[Watchdog] Recovery complete, counters reset')
        }

        await safeWrite(db)
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
            await safeWrite(db)
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
            await safeWrite(db)
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

    // ─── Auto-Downloader Check ───
    await runAutoDownloadCheck()
}

// ─────────────────────────────────────────────────────────────
// 📺 Auto-Downloader Integration
// ─────────────────────────────────────────────────────────────

const runAutoDownloadCheck = async () => {
    const settings = db.data.autoDownloadSettings || { enabled: false, intervalMinutes: 30 }

    if (!settings.enabled) return

    const intervalMs = (settings.intervalMinutes || 30) * 60 * 1000
    const now = Date.now()

    if (now - lastAutoDownloadCheck < intervalMs) return

    lastAutoDownloadCheck = now

    try {
        console.log('[Watchdog] Running auto-download check...')
        const result = await checkRules()
        if (result.downloaded > 0) {
            console.log(`[Watchdog] Auto-downloaded ${result.downloaded} new episode(s)`)
        }
    } catch (err) {
        console.error('[Watchdog] Auto-download check failed:', err.message)
    }
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

    // 🔥 v2.3.2: Reset circuit_open on startup (it persisted from previous session)
    if (db.data.serverStatus === 'circuit_open') {
        console.log('[Watchdog] Detected persisted circuit_open, checking storage...')
        const storageOk = await checkStorage()
        if (storageOk) {
            db.data.serverStatus = 'ok'
            db.data.storageFailures = 0
            circuitOpenUntil = null
            await safeWrite(db)
            console.log('[Watchdog] Storage OK, reset to normal status')
        } else {
            // Storage still broken, keep circuit open with fresh cooldown
            circuitOpenUntil = Date.now() + CONFIG.CIRCUIT_BREAKER_COOLDOWN_MS
            db.data.lastStateChange = Date.now()
            await safeWrite(db)
            console.warn('[Watchdog] Storage still unavailable, circuit remains open')
        }
    }

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

### server/rutracker.js
```javascript
/**
 * RuTracker Search API - LEGACY WRAPPER
 * PWA-TorServe v2.7.0
 * 
 * This module now wraps RuTrackerProvider for backward compatibility.
 * New code should use:
 * - aggregator.search() for multi-source search
 * - RuTrackerProvider directly for RuTracker-only access
 */

import { RuTrackerProvider } from './providers/RuTrackerProvider.js'

// Singleton provider instance for backward compatibility
const _provider = new RuTrackerProvider()

/**
 * Search RuTracker
 * @deprecated Use aggregator.search() for multi-source, or RuTrackerProvider for direct
 * @param {string} query
 * @returns {Promise<{results: Array}|{error: string, results: []}>}
 */
export const searchRuTracker = async (query) => {
    const results = await _provider.search(query)
    if (results.length > 0) {
        return { results }
    }
    return { error: 'No results', results: [] }
}

/**
 * Get magnet link from topic page
 * @param {string} topicId
 * @returns {Promise<{magnet: string}|{error: string}>}
 */
export const getMagnetLink = async (topicId) => {
    return _provider.getMagnet(topicId)
}

```

### server/jacred.js
```javascript
/**
 * Jacred Torrent Search API - LEGACY WRAPPER
 * PWA-TorServe v2.7.0
 * 
 * This module now wraps JacredProvider for backward compatibility.
 * New code should use:
 * - aggregator.search() for multi-source search
 * - JacredProvider directly for Jacred-only access
 * 
 * Security note: SSL validation disabled for Jacred mirrors
 * (see JacredProvider.js for details)
 */

import { JacredProvider } from './providers/JacredProvider.js'

// Singleton provider instance for backward compatibility
const _provider = new JacredProvider()

/**
 * Search torrents via Jacred API
 * @deprecated Use aggregator.search() for multi-source, or JacredProvider for direct
 * @param {string} query
 * @returns {Promise<{results: Array}|{error: string, results: []}>}
 */
export const searchJacred = async (query) => {
    const results = await _provider.search(query)
    if (results.length > 0) {
        return { results }
    }
    return { error: 'No results', results: [] }
}

/**
 * Get magnet from result (already included in search results)
 * @param {string} magnetUrl
 * @returns {Promise<{magnet: string}|{error: string}>}
 */
export const getMagnetFromJacred = async (magnetUrl) => {
    return _provider.getMagnet(magnetUrl)
}

```

### server/providers/BaseProvider.js
```javascript
/**
 * BaseProvider - Abstract base class for torrent search providers
 * PWA-TorServe Provider Architecture
 * 
 * All providers must implement:
 * - search(query) → Promise<SearchResult[]>
 * - getMagnet(id) → Promise<{magnet}|{error}>
 * 
 * SearchResult format:
 * {
 *   id: string,           // Unique identifier (can be guid, topic id, etc.)
 *   title: string,        // Torrent title
 *   size: string,         // Human-readable size (e.g., "1.5 GB")
 *   sizeBytes: number,    // Size in bytes (for sorting/filtering)
 *   seeders: number,      // Number of seeders
 *   tracker: string,      // Tracker name
 *   magnet: string|null,  // Magnet link (if available immediately)
 *   provider: string      // Provider name (for deduplication/logging)
 * }
 */

export class BaseProvider {
    /** Provider name (used in logs and results) */
    name = 'base'

    /** Whether provider is enabled */
    enabled = true

    /** Provider-specific configuration */
    config = {}

    /**
     * Search for torrents
     * @param {string} query - Search query
     * @returns {Promise<Array>} Array of SearchResult objects
     */
    async search(query) {
        throw new Error('search() must be implemented by subclass')
    }

    /**
     * Get magnet link for a specific torrent
     * @param {string} id - Torrent identifier
     * @returns {Promise<{magnet: string}|{error: string}>}
     */
    async getMagnet(id) {
        throw new Error('getMagnet() must be implemented by subclass')
    }

    /**
     * Check if provider is healthy and ready to accept requests
     * @returns {boolean}
     */
    isHealthy() {
        return this.enabled
    }

    /**
     * Normalize result to standard SearchResult format (API v2)
     * @param {Object} raw - Raw result from provider
     * @returns {Object} Normalized SearchResult with dateTs and tags
     */
    normalizeResult(raw) {
        return {
            id: raw.id || String(Math.random()),
            title: raw.title || 'Unknown',
            size: raw.size || 'N/A',
            sizeBytes: raw.sizeBytes || raw.Size || 0,
            dateTs: this.parseDate(raw.date),
            tags: this.extractQualityTags(raw.title),
            seeders: raw.seeders || 0,
            tracker: raw.tracker || this.name,
            magnet: raw.magnet || raw.magnetUrl || null,
            provider: this.name
        }
    }

    /**
     * Parse various date formats to Unix timestamp (milliseconds)
     * Supports: Unix timestamp (seconds), ISO strings, Date objects
     * @param {number|string|Date|null} dateValue
     * @returns {number|null} Unix timestamp in milliseconds, or null
     */
    parseDate(dateValue) {
        if (!dateValue) return null

        // Unix timestamp in seconds (Jacred API format)
        if (typeof dateValue === 'number') {
            // If it looks like seconds (before year 3000), convert to ms
            return dateValue < 32503680000 ? dateValue * 1000 : dateValue
        }

        // ISO string "2025-01-15T12:30:00Z" or other parseable formats
        if (typeof dateValue === 'string') {
            const parsed = Date.parse(dateValue)
            if (!isNaN(parsed)) return parsed
        }

        // Date object
        if (dateValue instanceof Date) {
            return dateValue.getTime()
        }

        return null
    }

    /**
     * Extract quality tags from torrent title
     * Uses strict regex patterns to minimize false positives
     * @param {string} title
     * @returns {string[]} Array of quality tags: ['2160p', '1080p', '720p', 'hevc', 'hdr', 'cam']
     */
    extractQualityTags(title) {
        if (!title) return []

        const tags = []
        const upper = title.toUpperCase()

        // Resolution detection (mutually exclusive, highest wins)
        if (/\b2160[pрPР]\b/.test(title) || /\b4K\b/i.test(title) || /\bUHD\b/i.test(title)) {
            tags.push('2160p')
        } else if (/\b1080[pрPР]\b/.test(title)) {
            tags.push('1080p')
        } else if (/\b720[pрPР]\b/.test(title)) {
            tags.push('720p')
        }

        // Codec detection
        if (/\b(HEVC|H\.?265|x265)\b/i.test(title)) {
            tags.push('hevc')
        }

        // HDR detection (exclude HDRip which is different)
        if (/\bHDR(10)?(\+|Plus)?\b/i.test(title) && !/\bHDRip\b/i.test(title)) {
            tags.push('hdr')
        }

        // Dolby Vision
        if (/\b(DV|Dolby\s*Vision)\b/i.test(title)) {
            tags.push('dv')
        }

        // Low quality indicators
        if (/\b(CAMRip|CAM|HDTS|TS|Telesync|TC)\b/i.test(title)) {
            tags.push('cam')
        }

        return tags
    }
}

/**
 * Format bytes to human-readable string
 * @param {number} bytes
 * @returns {string}
 */
export function formatSize(bytes) {
    if (!bytes) return 'N/A'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let i = 0
    let size = bytes
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024
        i++
    }
    return `${size.toFixed(1)} ${units[i]}`
}

```

### server/providers/ProviderManager.js
```javascript
/**
 * ProviderManager - Registry and coordinator for torrent providers
 * PWA-TorServe Provider Architecture
 * 
 * Manages provider registration, enables/disables, and health status.
 */

import { logger } from '../utils/logger.js'

const log = logger.child('ProviderManager')

class ProviderManager {
    constructor() {
        /** @type {Map<string, import('./BaseProvider.js').BaseProvider>} */
        this.providers = new Map()
    }

    /**
     * Register a provider instance
     * @param {import('./BaseProvider.js').BaseProvider} provider
     */
    register(provider) {
        if (!provider.name) {
            throw new Error('Provider must have a name')
        }

        this.providers.set(provider.name, provider)
        log.info('Provider registered', {
            name: provider.name,
            enabled: provider.enabled
        })
    }

    /**
     * Get provider by name
     * @param {string} name
     * @returns {import('./BaseProvider.js').BaseProvider|undefined}
     */
    get(name) {
        return this.providers.get(name)
    }

    /**
     * Get all enabled and healthy providers
     * @returns {import('./BaseProvider.js').BaseProvider[]}
     */
    getEnabled() {
        return Array.from(this.providers.values())
            .filter(p => p.enabled && p.isHealthy())
    }

    /**
     * Get all registered providers
     * @returns {import('./BaseProvider.js').BaseProvider[]}
     */
    getAll() {
        return Array.from(this.providers.values())
    }

    /**
     * Enable or disable a provider
     * @param {string} name
     * @param {boolean} enabled
     */
    setEnabled(name, enabled) {
        const provider = this.providers.get(name)
        if (provider) {
            provider.enabled = enabled
            log.info('Provider state changed', { name, enabled })
        }
    }

    /**
     * Get status of all providers
     * @returns {Object[]}
     */
    getStatus() {
        return Array.from(this.providers.values()).map(p => ({
            name: p.name,
            enabled: p.enabled,
            healthy: p.isHealthy()
        }))
    }
}

// Singleton instance
export const providerManager = new ProviderManager()

```

### server/providers/index.js
```javascript
/**
 * Provider Index - Exports and auto-registers all providers
 * PWA-TorServe Provider Architecture
 */

export { BaseProvider, formatSize } from './BaseProvider.js'
export { providerManager } from './ProviderManager.js'
export { JacredProvider } from './JacredProvider.js'
export { RuTrackerProvider } from './RuTrackerProvider.js'
export { RutorProvider } from './RutorProvider.js'
export { TorLookProvider } from './TorLookProvider.js'

// Auto-registration of providers
import { providerManager } from './ProviderManager.js'
import { JacredProvider } from './JacredProvider.js'
import { RuTrackerProvider } from './RuTrackerProvider.js'
import { RutorProvider } from './RutorProvider.js'
import { TorLookProvider } from './TorLookProvider.js'

// Register providers on module load
providerManager.register(new JacredProvider())
providerManager.register(new RuTrackerProvider())
providerManager.register(new RutorProvider())
providerManager.register(new TorLookProvider())

```

### server/providers/RuTrackerProvider.js
```javascript
/**
 * RuTrackerProvider - RuTracker torrent search provider
 * PWA-TorServe Provider Architecture v2.7.1
 * 
 * Implements RuTracker search with:
 * - Mirror rotation (rutracker.org, .nl, .net, .cc)
 * - DNS-over-HTTPS bypass for ISP blocking
 * - Cookie-based authentication
 * - HTML parsing via regex (no external deps)
 * - Retry with exponential backoff
 * 
 * Requires RUTRACKER_LOGIN and RUTRACKER_PASSWORD in .env
 */

import https from 'https'
import fs from 'fs'
import path from 'path'
import { BaseProvider } from './BaseProvider.js'
import { logger } from '../utils/logger.js'

const log = logger.child('RuTrackerProvider')

// RuTracker mirrors (in order of preference)
const RUTRACKER_MIRRORS = [
    'rutracker.org',   // Primary
    'rutracker.nl',    // Netherlands mirror  
    'rutracker.net',   // Alternative
]

// ─────────────────────────────────────────────────────────────
// 🌐 DNS-over-HTTPS: Bypass ISP DNS blocking
// ─────────────────────────────────────────────────────────────
const DOH_PROVIDER = process.env.DOH_PROVIDER || 'https://cloudflare-dns.com/dns-query'
const DNS_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

const dnsCache = new Map()

async function resolveIP(hostname) {
    if (dnsCache.has(hostname)) {
        const cached = dnsCache.get(hostname)
        if (Date.now() < cached.expires) {
            log.debug('DoH cache hit', { hostname, ip: cached.ip })
            return cached.ip
        }
        dnsCache.delete(hostname)
    }

    log.info('DoH resolving...', { hostname })
    try {
        const url = `${DOH_PROVIDER}?name=${encodeURIComponent(hostname)}&type=A`
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/dns-json' },
            signal: AbortSignal.timeout(5000)
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()

        if (data.Answer && data.Answer.length > 0) {
            const record = data.Answer.find(r => r.type === 1)
            if (record) {
                const ip = record.data
                log.info('DoH resolved', { hostname, ip })
                dnsCache.set(hostname, { ip, expires: Date.now() + DNS_CACHE_TTL })
                return ip
            }
        }
        log.warn('DoH no A record', { hostname })
    } catch (e) {
        log.warn('DoH failed', { hostname, error: e.message })
    }
    return null
}

// Session persistence file
const SESSION_FILE = path.join(process.cwd(), 'data', 'rutracker-session.json')

export class RuTrackerProvider extends BaseProvider {
    name = 'rutracker'

    constructor() {
        super()
        this.sessionCookie = null
        this.currentMirror = RUTRACKER_MIRRORS[0]
        this.login = process.env.RUTRACKER_LOGIN || ''
        this.password = process.env.RUTRACKER_PASSWORD || ''

        if (!this.login || !this.password) {
            this.enabled = false
            log.warn('RuTracker disabled: RUTRACKER_LOGIN/PASSWORD not set')
        } else {
            // Try to load persisted session
            this._loadSession()
        }
    }

    isHealthy() {
        return this.enabled && Boolean(this.login && this.password)
    }

    /**
     * Load session from file
     * @private
     */
    _loadSession() {
        try {
            if (fs.existsSync(SESSION_FILE)) {
                const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'))
                if (data.cookie && data.expires > Date.now()) {
                    this.sessionCookie = data.cookie
                    this.currentMirror = data.mirror || RUTRACKER_MIRRORS[0]
                    log.info('Session loaded from file', { expires: new Date(data.expires).toISOString() })
                } else {
                    log.debug('Session expired, will re-login')
                }
            }
        } catch (e) {
            log.debug('No saved session', { error: e.message })
        }
    }

    /**
     * Save session to file
     * @private
     */
    _saveSession() {
        try {
            const dir = path.dirname(SESSION_FILE)
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true })
            }
            const data = {
                cookie: this.sessionCookie,
                mirror: this.currentMirror,
                expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
            }
            fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2))
            log.debug('Session saved to file')
        } catch (e) {
            log.warn('Failed to save session', { error: e.message })
        }
    }

    /**
     * Search torrents on RuTracker with mirror fallback
     */
    async search(query) {
        if (!this.isHealthy()) {
            log.debug('Skipping search: not healthy')
            return []
        }

        // Try each mirror
        for (const mirror of RUTRACKER_MIRRORS) {
            log.info('Trying mirror', { mirror })
            try {
                // Login if needed
                if (!this.sessionCookie) {
                    log.debug('Logging in...', { mirror })
                    await this._loginToMirror(mirror)
                }

                log.debug('Searching...', { mirror, query })
                const results = await this._searchOnMirror(mirror, query)
                if (results.length > 0) {
                    this.currentMirror = mirror
                    log.info('Search successful', { mirror, count: results.length })
                    return results
                }
                log.warn('Empty results', { mirror })
            } catch (err) {
                log.warn(`Mirror ${mirror} failed`, { error: err.message })
                this.sessionCookie = null // Reset session for next mirror
            }
        }

        log.error('All mirrors failed')
        return []
    }

    /**
     * Get magnet link from topic page
     */
    async getMagnet(topicId) {
        if (!this.sessionCookie) {
            try {
                await this._loginToMirror(this.currentMirror)
            } catch {
                return { error: 'Login failed' }
            }
        }

        try {
            const options = await this._makeOptions(
                this.currentMirror,
                `/forum/viewtopic.php?t=${topicId}`,
                'GET'
            )
            options.headers['Cookie'] = this.sessionCookie

            return new Promise((resolve) => {
                const req = https.request(options, (res) => {
                    let data = ''
                    res.setEncoding('utf8')
                    res.on('data', chunk => data += chunk)
                    res.on('end', () => {
                        const match = data.match(/magnet:\?xt=urn:btih:[^"'\s]+/)
                        resolve(match ? { magnet: match[0] } : { error: 'Magnet not found' })
                    })
                })
                req.on('error', () => resolve({ error: 'Request failed' }))
                req.end()
            })
        } catch {
            return { error: 'Request failed' }
        }
    }

    /**
     * Create HTTPS options with DoH bypass
     * @private
     */
    async _makeOptions(mirror, path, method = 'GET') {
        const ip = await resolveIP(mirror)

        return {
            hostname: ip || mirror,
            port: 443,
            path: path,
            method: method,
            servername: mirror,
            rejectUnauthorized: true,
            headers: {
                'Host': mirror,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        }
    }

    /**
     * Login to specific mirror
     * @private
     */
    async _loginToMirror(mirror) {
        const postData = `login_username=${encodeURIComponent(this.login)}&login_password=${encodeURIComponent(this.password)}&login=%C2%F5%EE%E4`

        const options = await this._makeOptions(mirror, '/forum/login.php', 'POST')
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded'
        options.headers['Content-Length'] = Buffer.byteLength(postData)

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                const cookies = res.headers['set-cookie']
                if (cookies) {
                    this.sessionCookie = cookies.map(c => c.split(';')[0]).join('; ')
                    this._saveSession() // Persist session
                    log.info('Login successful', { mirror })
                    resolve(this.sessionCookie)
                } else {
                    reject(new Error('No cookies received'))
                }
            })
            req.on('error', reject)
            req.write(postData)
            req.end()
        })
    }

    /**
     * Search on specific mirror
     * @private
     */
    async _searchOnMirror(mirror, query) {
        const options = await this._makeOptions(
            mirror,
            `/forum/tracker.php?nm=${encodeURIComponent(query)}`,
            'GET'
        )
        options.headers['Cookie'] = this.sessionCookie

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = ''
                res.setEncoding('utf8')
                res.on('data', chunk => data += chunk)
                res.on('end', () => {
                    try {
                        resolve(this._parseResults(data))
                    } catch (err) {
                        reject(new Error(`Parse failed: ${err.message}`))
                    }
                })
            })
            req.on('error', reject)
            req.end()
        })
    }

    /**
     * Parse search results HTML
     * @private
     */
    _parseResults(html) {
        const results = []

        const titleRegex = /<a[^>]*class="tLink"[^>]*href="[^"]*t=(\d+)"[^>]*>([^<]+)<\/a>/g
        const sizeRegex = /<td[^>]*class="tor-size"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/g
        const seedRegex = /<b class="seedmed">(\d+)<\/b>/g

        const sizes = [], seeds = []
        let match

        while ((match = sizeRegex.exec(html))) sizes.push(match[1].trim())
        while ((match = seedRegex.exec(html))) seeds.push(parseInt(match[1]))

        let i = 0
        while ((match = titleRegex.exec(html)) && i < 20) {
            const topicId = match[1]
            const title = match[2]
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .trim()

            const sizeStr = sizes[i] || 'N/A'
            let sizeBytes = 0
            const sizeMatch = sizeStr.match(/([\d.]+)\s*(GB|MB|KB|TB)/i)
            if (sizeMatch) {
                const num = parseFloat(sizeMatch[1])
                const unit = sizeMatch[2].toUpperCase()
                const mult = { 'KB': 1024, 'MB': 1024 ** 2, 'GB': 1024 ** 3, 'TB': 1024 ** 4 }
                sizeBytes = num * (mult[unit] || 1)
            }

            results.push(this.normalizeResult({
                id: topicId,
                title,
                size: sizeStr,
                sizeBytes,
                seeders: seeds[i] || 0,
                tracker: 'RuTracker',
                magnet: null
            }))
            i++
        }

        return results
    }
}

```

### server/providers/TorLookProvider.js
```javascript
/**
 * TorLookProvider - TorLook.info torrent search provider
 * PWA-TorServe Provider Architecture
 * 
 * TorLook is a torrent aggregator/metasearch engine
 * Implements HTML parsing, no authentication required
 */

import https from 'https'
import { BaseProvider } from './BaseProvider.js'
import { logger } from '../utils/logger.js'

const log = logger.child('TorLookProvider')

const TORLOOK_HOST = 'torlook.info'

export class TorLookProvider extends BaseProvider {
    name = 'torlook'

    /**
     * Search torrents on TorLook
     */
    async search(query) {
        log.info('🔍 Starting search', { query })

        try {
            const results = await this._doSearch(query)
            if (results.length > 0) {
                log.info('✅ Search successful', { count: results.length })
            } else {
                log.warn('Empty results')
            }
            return results
        } catch (err) {
            log.warn('Search failed', { error: err.message })
            return []
        }
    }

    /**
     * Get magnet (already in search results)
     */
    async getMagnet(magnetUrl) {
        if (magnetUrl && magnetUrl.startsWith('magnet:')) {
            return { magnet: magnetUrl }
        }
        return { error: 'No magnet link' }
    }

    /**
     * Do search request
     * @private
     */
    _doSearch(query) {
        return new Promise((resolve, reject) => {
            // TorLook search URL: /search/query/
            const searchPath = `/search/${encodeURIComponent(query)}/`

            const options = {
                hostname: TORLOOK_HOST,
                port: 443,
                path: searchPath,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html',
                    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
                },
                timeout: 15000
            }

            const req = https.request(options, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`))
                    return
                }

                let data = ''
                res.setEncoding('utf8')

                res.on('data', chunk => data += chunk)
                res.on('end', () => {
                    try {
                        const results = this._parseResults(data)
                        resolve(results)
                    } catch (err) {
                        reject(new Error(`Parse failed: ${err.message}`))
                    }
                })
            })

            req.on('error', reject)
            req.on('timeout', () => {
                req.destroy()
                reject(new Error('Timeout'))
            })

            req.end()
        })
    }

    /**
     * Parse TorLook search results HTML
     * @private
     */
    _parseResults(html) {
        const results = []

        // TorLook results are in divs with class "item"
        // Each contains: title, size, seeds, magnet link

        // Match torrent items
        const itemRegex = /<div[^>]*class="[^"]*item[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi

        let itemMatch
        while ((itemMatch = itemRegex.exec(html)) !== null && results.length < 25) {
            const itemHtml = itemMatch[1]

            // Extract magnet link
            const magnetMatch = itemHtml.match(/href="(magnet:\?xt=urn:btih:[^"]+)"/i)
            if (!magnetMatch) continue

            const magnet = magnetMatch[1].replace(/&amp;/g, '&')

            // Extract title
            const titleMatch = itemHtml.match(/<a[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/a>/i) ||
                itemHtml.match(/<a[^>]*href="[^"]*"[^>]*title="([^"]+)"/i)
            if (!titleMatch) continue

            const title = titleMatch[1]
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .trim()

            // Extract size
            const sizeMatch = itemHtml.match(/>(\d+(?:\.\d+)?\s*(?:GB|MB|KB|TB))</i)
            const sizeStr = sizeMatch ? sizeMatch[1] : 'N/A'

            // Parse size to bytes
            let sizeBytes = 0
            const sizeNumMatch = sizeStr.match(/([\d.]+)\s*(GB|MB|KB|TB)/i)
            if (sizeNumMatch) {
                const num = parseFloat(sizeNumMatch[1])
                const unit = sizeNumMatch[2].toUpperCase()
                const mult = { 'KB': 1024, 'MB': 1024 ** 2, 'GB': 1024 ** 3, 'TB': 1024 ** 4 }
                sizeBytes = num * (mult[unit] || 1)
            }

            // Extract seeders
            const seedMatch = itemHtml.match(/<span[^>]*class="[^"]*seed[^"]*"[^>]*>(\d+)<\/span>/i)
            const seeders = seedMatch ? parseInt(seedMatch[1]) : 0

            results.push(this.normalizeResult({
                id: magnet,
                title,
                size: sizeStr,
                sizeBytes,
                seeders,
                tracker: 'TorLook',
                magnet
            }))
        }

        return results
    }
}

```

### server/providers/JacredProvider.js
```javascript
/**
 * JacredProvider - Jacred torrent search provider
 * PWA-TorServe Provider Architecture
 * 
 * Implements Jacred API search with:
 * - Mirror rotation
 * - User-Agent rotation
 * - Retry with exponential backoff
 * - Rate limiting (429) handling
 * 
 * Security note: SSL validation disabled for Jacred mirrors
 * (see header comments in original jacred.js for explanation)
 */

import https from 'https'
import http from 'http'
import { BaseProvider, formatSize } from './BaseProvider.js'
import { logger } from '../utils/logger.js'
import { withRetry, retryPredicates } from '../utils/retry.js'

const log = logger.child('JacredProvider')

// Jacred mirrors (only working ones)
const JACRED_MIRRORS = [
    { host: 'jacred.xyz', port: 443, protocol: 'https' },
    { host: 'jacred.xyz', port: 80, protocol: 'http' },
]

// User-Agent rotation to avoid rate limiting
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
]

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export class JacredProvider extends BaseProvider {
    name = 'jacred'

    constructor() {
        super()
        this.currentMirror = JACRED_MIRRORS[0].host
    }

    /**
     * Search torrents via Jacred API
     * @param {string} query
     * @returns {Promise<Array>} Normalized SearchResult[]
     */
    async search(query) {
        log.info('🔍 Starting search', { query, mirrorsCount: JACRED_MIRRORS.length })

        for (let i = 0; i < JACRED_MIRRORS.length; i++) {
            const mirror = JACRED_MIRRORS[i]
            const mirrorId = `${mirror.protocol}://${mirror.host}:${mirror.port}`
            log.info('Trying mirror', { mirror: mirrorId, attempt: i + 1 })

            try {
                const data = await withRetry(() => this._doSearch(mirror, query), {
                    maxRetries: 3,
                    baseDelayMs: 5000,
                    shouldRetry: (err) => {
                        if (err.message.includes('Rate limited')) return true
                        return retryPredicates.transient(err)
                    },
                    onRetry: (err, attempt, delay) => {
                        log.warn('Mirror retry', { mirror: mirrorId, attempt, delay: Math.round(delay), error: err.message })
                    }
                })

                if (data && data.length > 0) {
                    this.currentMirror = mirror.host
                    log.info('✅ Mirror connected', { mirror: mirrorId, resultsCount: data.length })
                    return data
                } else {
                    log.warn('Mirror returned empty results', { mirror: mirrorId })
                }
            } catch (err) {
                log.warn('❌ Mirror failed', { mirror: mirrorId, error: err.message })
            }

            if (i < JACRED_MIRRORS.length - 1) {
                await sleep(500)
            }
        }

        log.error('❌ All mirrors failed', { query, triedMirrors: JACRED_MIRRORS.length })
        return []
    }

    /**
     * Get magnet from result (already included in search results)
     * @param {string} magnetUrl
     * @returns {Promise<{magnet: string}|{error: string}>}
     */
    async getMagnet(magnetUrl) {
        if (magnetUrl && magnetUrl.startsWith('magnet:')) {
            return { magnet: magnetUrl }
        }
        return { error: 'No magnet link' }
    }

    /**
     * Do search request to specific mirror
     * @private
     */
    _doSearch(mirror, query, redirectCount = 0) {
        const MAX_REDIRECTS = 3

        return new Promise((resolve, reject) => {
            const searchPath = `/api/v2.0/indexers/all/results?apikey=&Query=${encodeURIComponent(query)}`

            const options = {
                hostname: mirror.host,
                port: mirror.port,
                path: searchPath,
                method: 'GET',
                rejectUnauthorized: false,
                headers: {
                    'User-Agent': getRandomUserAgent(),
                    'Accept': 'application/json'
                },
                timeout: 15000
            }

            const protocol = mirror.protocol === 'https' ? https : http

            const req = protocol.request(options, (res) => {
                // Handle redirects
                if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
                    if (redirectCount >= MAX_REDIRECTS) {
                        reject(new Error('Too many redirects'))
                        return
                    }

                    try {
                        const redirectUrl = new URL(res.headers.location, `${mirror.protocol}://${mirror.host}`)
                        const newMirror = {
                            host: redirectUrl.hostname,
                            port: redirectUrl.port || (redirectUrl.protocol === 'https:' ? 443 : 80),
                            protocol: redirectUrl.protocol.replace(':', '')
                        }
                        log.debug('Following redirect', { to: redirectUrl.href })
                        resolve(this._doSearch(newMirror, query, redirectCount + 1))
                    } catch (e) {
                        reject(new Error(`Invalid redirect: ${res.headers.location}`))
                    }
                    return
                }

                // Handle rate limiting
                if (res.statusCode === 429) {
                    const retryAfter = parseInt(res.headers['retry-after'] || '5', 10)
                    reject(new Error(`Rate limited (retry after ${retryAfter}s)`))
                    return
                }

                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`))
                    return
                }

                let data = ''
                res.setEncoding('utf8')

                res.on('data', chunk => data += chunk)
                res.on('end', () => {
                    try {
                        if (data.trim().startsWith('<')) {
                            reject(new Error('Received HTML instead of JSON (possible Cloudflare block)'))
                            return
                        }

                        const json = JSON.parse(data)
                        const results = (json.Results || json.results || []).slice(0, 50).map(r =>
                            this.normalizeResult({
                                id: r.Guid || r.guid || Math.random().toString(36),
                                title: r.Title || r.title || 'Unknown',
                                size: formatSize(r.Size || r.size || 0),
                                sizeBytes: r.Size || r.size || 0,
                                date: r.PublishDate || r.publishDate || null,  // API v2: date support
                                seeders: r.Seeders || r.seeders || 0,
                                tracker: r.Tracker || r.tracker || 'Unknown',
                                magnet: r.MagnetUri || r.magnetUri || r.Link || r.link || null
                            })
                        )
                        resolve(results)
                    } catch (err) {
                        reject(new Error('Parse error: ' + err.message))
                    }
                })
            })

            req.on('error', reject)
            req.on('timeout', () => {
                req.destroy()
                reject(new Error('Timeout'))
            })

            req.end()
        })
    }
}

```

### server/providers/RutorProvider.js
```javascript
/**
 * RutorProvider - Rutor.info torrent search provider
 * PWA-TorServe Provider Architecture
 * 
 * Implements Rutor search with:
 * - Mirror rotation (rutor.info, rutor.is)
 * - HTML parsing via regex (no external deps)
 * - No authentication required (public tracker)
 * - Magnet links directly in search results
 */

import https from 'https'
import http from 'http'
import { BaseProvider, formatSize } from './BaseProvider.js'
import { logger } from '../utils/logger.js'

const log = logger.child('RutorProvider')

// Rutor mirrors
const RUTOR_MIRRORS = [
    { host: 'rutor.info', protocol: 'http', port: 80 },
    { host: 'rutor.is', protocol: 'http', port: 80 },
]

export class RutorProvider extends BaseProvider {
    name = 'rutor'

    constructor() {
        super()
        this.currentMirror = RUTOR_MIRRORS[0]
    }

    /**
     * Search torrents on Rutor with mirror fallback
     */
    async search(query) {
        log.info('🔍 Starting search', { query, mirrorsCount: RUTOR_MIRRORS.length })

        for (const mirror of RUTOR_MIRRORS) {
            const mirrorId = `${mirror.protocol}://${mirror.host}`
            log.info('Trying mirror', { mirror: mirrorId })

            try {
                const results = await this._doSearch(mirror, query)
                if (results.length > 0) {
                    this.currentMirror = mirror
                    log.info('✅ Search successful', { mirror: mirrorId, count: results.length })
                    return results
                }
                log.warn('Empty results', { mirror: mirrorId })
            } catch (err) {
                log.warn(`Mirror failed`, { mirror: mirrorId, error: err.message })
            }
        }

        log.error('All mirrors failed')
        return []
    }

    /**
     * Get magnet (already in search results)
     */
    async getMagnet(magnetUrl) {
        if (magnetUrl && magnetUrl.startsWith('magnet:')) {
            return { magnet: magnetUrl }
        }
        return { error: 'No magnet link' }
    }

    /**
     * Do search request to specific mirror
     * @private
     */
    _doSearch(mirror, query) {
        return new Promise((resolve, reject) => {
            // Rutor search URL format: /search/0/0/000/0/{query}
            const searchPath = `/search/0/0/000/0/${encodeURIComponent(query)}`

            const options = {
                hostname: mirror.host,
                port: mirror.port,
                path: searchPath,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html',
                    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
                },
                timeout: 15000
            }

            const protocol = mirror.protocol === 'https' ? https : http

            const req = protocol.request(options, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`))
                    return
                }

                let data = ''
                res.setEncoding('utf8')

                res.on('data', chunk => data += chunk)
                res.on('end', () => {
                    try {
                        const results = this._parseResults(data)
                        resolve(results)
                    } catch (err) {
                        reject(new Error(`Parse failed: ${err.message}`))
                    }
                })
            })

            req.on('error', reject)
            req.on('timeout', () => {
                req.destroy()
                reject(new Error('Timeout'))
            })

            req.end()
        })
    }

    /**
     * Parse Rutor search results HTML
     * @private
     */
    _parseResults(html) {
        const results = []

        // Rutor HTML structure:
        // <tr class="gai"...> or <tr class="tum"...>
        // Contains: magnet link, title, size, seeders

        // Match table rows with torrent data
        const rowRegex = /<tr[^>]*class="(?:gai|tum)"[^>]*>([\s\S]*?)<\/tr>/gi

        let rowMatch
        while ((rowMatch = rowRegex.exec(html)) !== null && results.length < 30) {
            const rowHtml = rowMatch[1]

            // Extract magnet link
            const magnetMatch = rowHtml.match(/href="(magnet:\?xt=urn:btih:[^"]+)"/i)
            if (!magnetMatch) continue

            const magnet = magnetMatch[1]
                .replace(/&amp;/g, '&')

            // Extract title from the last link before size
            // Pattern: <a href="/torrent/...">Title</a>
            const titleMatch = rowHtml.match(/<a[^>]*href="\/torrent\/\d+[^"]*"[^>]*>([^<]+)<\/a>/i)
            if (!titleMatch) continue

            const title = titleMatch[1]
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .trim()

            // Extract size (format: "1.5 GB" or "500 MB")
            const sizeMatch = rowHtml.match(/>(\d+(?:\.\d+)?\s*(?:GB|MB|KB|TB))</i)
            const sizeStr = sizeMatch ? sizeMatch[1] : 'N/A'

            // Parse size to bytes
            let sizeBytes = 0
            const sizeNumMatch = sizeStr.match(/([\d.]+)\s*(GB|MB|KB|TB)/i)
            if (sizeNumMatch) {
                const num = parseFloat(sizeNumMatch[1])
                const unit = sizeNumMatch[2].toUpperCase()
                const mult = { 'KB': 1024, 'MB': 1024 ** 2, 'GB': 1024 ** 3, 'TB': 1024 ** 4 }
                sizeBytes = num * (mult[unit] || 1)
            }

            // Extract seeders (green number in span)
            const seedMatch = rowHtml.match(/<span[^>]*class="[^"]*green[^"]*"[^>]*>(\d+)<\/span>/i)
            const seeders = seedMatch ? parseInt(seedMatch[1]) : 0

            results.push(this.normalizeResult({
                id: magnet, // Use magnet as ID
                title,
                size: sizeStr,
                sizeBytes,
                seeders,
                tracker: 'Rutor',
                magnet
            }))
        }

        return results
    }
}

```

### server/utils/logger.js
```javascript
/**
 * Simple Structured Logger for PWA-TorServe
 * Zero dependencies - works without npm install!
 * 
 * Features:
 * - Timestamps in ISO format
 * - Log levels (debug/info/warn/error)
 * - Configurable via LOG_LEVEL env variable
 * - Module context support
 * 
 * Usage:
 *   import { logger } from './utils/logger.js'
 *   logger.info('Server started', { port: 3000 })
 *   logger.error('Failed to connect', { error: err.message })
 * 
 * Or with module context:
 *   const log = logger.child('Torrent')
 *   log.info('Added torrent', { hash: '...' })
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
 * ✅ FIX: Исправлена логика проверки уровней логирования
 */
const createLogger = (moduleName = null) => ({
    debug: (message, data = {}) => {
        if (currentLevel <= LOG_LEVELS.debug) {  // ✅ FIX: было LOG_LEVELS.debug >= currentLevel
            console.log(formatMessage('debug', moduleName, message, data))
        }
    },

    info: (message, data = {}) => {
        if (currentLevel <= LOG_LEVELS.info) {  // ✅ FIX
            console.log(formatMessage('info', moduleName, message, data))
        }
    },

    warn: (message, data = {}) => {
        if (currentLevel <= LOG_LEVELS.warn) {  // ✅ FIX
            console.warn(formatMessage('warn', moduleName, message, data))
        }
    },

    error: (message, data = {}) => {
        if (currentLevel <= LOG_LEVELS.error) {  // ✅ FIX
            console.error(formatMessage('error', moduleName, message, data))
        }
    },

    /**
     * Create child logger with module context
     * @param {string} module - Module name for log prefix
     * @returns {Object} Logger instance with module context
     */
    child: (module) => createLogger(module)
})

export const logger = createLogger()

```

### server/utils/retry.js
```javascript
/**
 * Retry Utility with Exponential Backoff
 * PWA-TorServe v2.3.3
 *
 * Usage:
 *   const result = await withRetry(() => fetchData(), { maxRetries: 3 })
 */

/**
 * Execute async function with retry logic
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.baseDelayMs - Base delay in ms (default: 1000)
 * @param {number} options.maxDelayMs - Maximum delay cap (default: 10000)
 * @param {Function} options.shouldRetry - Custom retry condition (default: always retry)
 * @param {Function} options.onRetry - Callback on each retry (optional)
 * @returns {Promise<any>} Result of the function
 */
export const withRetry = async (fn, options = {}) => {
    const {
        maxRetries = 3,
        baseDelayMs = 1000,
        maxDelayMs = 10000,
        shouldRetry = () => true,
        onRetry = null
    } = options

    let lastError

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn(attempt)
        } catch (error) {
            lastError = error

            // Check if we should retry
            if (attempt >= maxRetries || !shouldRetry(error, attempt)) {
                throw error
            }

            // Calculate delay with exponential backoff + jitter
            const exponentialDelay = baseDelayMs * Math.pow(2, attempt)
            const jitter = Math.random() * 200 // 0-200ms jitter
            const delay = Math.min(exponentialDelay + jitter, maxDelayMs)

            if (onRetry) {
                onRetry(error, attempt + 1, delay)
            }

            await sleep(delay)
        }
    }

    throw lastError
}

/**
 * Sleep utility
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Common retry predicates
 */
export const retryPredicates = {
    // Retry on network errors
    networkError: (error) => {
        const networkCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN']
        return networkCodes.includes(error.code)
    },

    // Retry on HTTP 5xx errors
    serverError: (error) => {
        return error.statusCode >= 500 && error.statusCode < 600
    },

    // Retry on rate limiting (429)
    rateLimited: (error) => {
        return error.statusCode === 429
    },

    // Combined: network + server errors
    transient: (error) => {
        return retryPredicates.networkError(error) ||
               retryPredicates.serverError(error) ||
               retryPredicates.rateLimited(error)
    }
}

```

### server/utils/lag-monitor.js
```javascript
/**
 * Event Loop Lag Monitor v2.3
 * Detects when Node.js event loop is blocked
 * 
 * v2.3: Adaptive settings for production (less sensitive, less overhead)
 * 
 * Usage:
 *   import { LagMonitor } from './utils/lag-monitor.js'
 *   const lagMonitor = new LagMonitor()  // Auto-detects prod/dev
 *   lagMonitor.start()
 */

export class LagMonitor {
    constructor(threshold = null) {
        // 🔥 v2.3: Adaptive settings based on environment
        const isProd = process.env.NODE_ENV === 'production'
        
        // Production: less sensitive (200ms threshold, 1s interval)
        // Development: more sensitive for debugging (50ms threshold, 250ms interval)
        this.threshold = threshold ?? (isProd ? 200 : 50)
        this.checkInterval = isProd ? 1000 : 250
        
        this.lastCheck = Date.now()
        this.lagEvents = []
        this.intervalId = null
        this.isProd = isProd
    }

    start() {
        if (this.intervalId) return // Already running

        this.intervalId = setInterval(() => {
            const now = Date.now()
            // 🔥 v2.3: expected = interval + 50ms tolerance for I/O delays
            const expected = this.checkInterval + 50
            const lag = now - this.lastCheck - expected

            if (lag > this.threshold) {
                const event = {
                    timestamp: now,
                    lag: lag,
                    memory: Math.round(process.memoryUsage().rss / 1024 / 1024)
                }

                this.lagEvents.push(event)
                
                // 🔥 v2.3: Only log warnings in dev, or critical lags (>1s) in prod
                if (!this.isProd || lag > 1000) {
                    console.warn(`[LagMonitor] Event loop lag: ${lag}ms, RAM: ${event.memory}MB`)
                }

                // Keep only last 50 events
                if (this.lagEvents.length > 50) {
                    this.lagEvents.shift()
                }
            }

            this.lastCheck = now
        }, this.checkInterval)

        console.log(`[LagMonitor] Started (${this.isProd ? 'prod' : 'dev'} mode: ${this.checkInterval}ms interval, ${this.threshold}ms threshold)`)
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

### client/package.json
```json
{
  "name": "client",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@capacitor-community/speech-recognition": "^6.0.1",
    "@capacitor/app": "^6.0.3",
    "@capacitor/browser": "^6.0.6",
    "@capacitor/core": "^6.2.1",
    "@capacitor/preferences": "^6.0.3",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@capacitor/android": "^6.2.1",
    "@capacitor/cli": "^6.2.1",
    "@eslint/js": "^9.39.1",
    "@tailwindcss/postcss": "^4.1.17",
    "@types/react": "^19.2.5",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "autoprefixer": "^10.4.22",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "postcss": "^8.5.6",
    "tailwindcss": "^4.1.17",
    "vite": "^7.2.4"
  }
}

```

### client/vite.config.js
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})

```

### client/public/manifest.json
```json
{
    "name": "MediaBox",
    "short_name": "MediaBox",
    "description": "Home Media Streaming Server",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#141E30",
    "theme_color": "#00c6ff",
    "icons": [
        {
            "src": "/icon-192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
        },
        {
            "src": "/icon-512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
        }
    ]
}
```

### client/index.html
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>client</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

```

### client/src/main.jsx
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

```

### client/src/App.jsx
```jsx
/**
 * PWA-TorServe - Main Application
 * Refactored for maintainability - components extracted to /components
 */
import { useState, useEffect } from 'react'
import { registerPlugin } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

// Components
import Poster from './components/Poster'
import { DegradedBanner, ErrorScreen, BufferingBanner, ServerStatusBar } from './components/StatusBanners'
import DiagnosticsPanel from './components/DiagnosticsPanel'
import SettingsPanel from './components/SettingsPanel'
import SearchPanel from './components/SearchPanel'
import TorrentModal from './components/TorrentModal'
import AutoDownloadPanel from './components/AutoDownloadPanel'

// Helpers
import { cleanTitle } from './utils/helpers'

// Register Custom Java Bridge
const TVPlayer = registerPlugin('TVPlayer')

// Constants
const PLAYERS = [
  { id: 'net.gtvbox.videoplayer', name: 'Vimu Player (Рекомендуем)' },
  { id: 'org.videolan.vlc', name: 'VLC for Android' },
  { id: 'com.mxtech.videoplayer.ad', name: 'MX Player' },
  { id: '', name: 'System Chooser (Спрашивать всегда)' }
]

const CATEGORIES = [
  { id: 'all', name: 'Все', icon: '📚' },
  { id: 'movie', name: 'Фильмы', icon: '🎬' },
  { id: 'series', name: 'Сериалы', icon: '📺' },
  { id: 'music', name: 'Музыка', icon: '🎵' },
  { id: 'other', name: 'Другое', icon: '📁' }
]

// ─────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────

function App() {
  // State: Server & Settings
  const [serverUrl, setServerUrl] = useState(() => {
    if (Capacitor.isNativePlatform()) {
      return localStorage.getItem('serverUrl') || 'http://192.168.1.70:3000'
    }
    return ''
  })

  // 🔥 v2.3: Use Capacitor Preferences for Android 9 compatibility
  const [preferredPlayer, setPreferredPlayer] = useState('net.gtvbox.videoplayer')
  const [prefsLoaded, setPrefsLoaded] = useState(false)

  const [tmdbProxyUrl, setTmdbProxyUrl] = useState(
    localStorage.getItem('tmdbProxyUrl') || ''
  )

  // Load preferences on mount (async for Capacitor Preferences)
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const { value } = await Preferences.get({ key: 'preferredPlayer' })
          if (value) {
            console.log('[Prefs] Loaded player:', value)
            setPreferredPlayer(value)
          }
        } else {
          const stored = localStorage.getItem('preferredPlayer')
          if (stored) setPreferredPlayer(stored)
        }
      } catch (e) {
        console.warn('[Prefs] Failed to load:', e)
      } finally {
        setPrefsLoaded(true)
      }
    }
    loadPreferences()
  }, [])

  // State: Torrents
  const [torrents, setTorrents] = useState([])
  const [magnet, setMagnet] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // State: UI
  const [showSettings, setShowSettings] = useState(false)
  const [showServerInput, setShowServerInput] = useState(false)
  const [selectedTorrent, setSelectedTorrent] = useState(null)
  const [buffering, setBuffering] = useState(null)
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  // State: Server Health
  const [serverStatus, setServerStatus] = useState('ok')
  const [lastStateChange, setLastStateChange] = useState(null)
  const [retryAfter, setRetryAfter] = useState(null)

  // State: Sorting & Filtering
  const [sortBy, setSortBy] = useState(localStorage.getItem('sortBy') || 'name')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // State: Search (API v2 with provider status)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchProviders, setSearchProviders] = useState({})  // Provider health status
  const [searchLoading, setSearchLoading] = useState(false)

  // State: Auto-Download
  const [showAutoDownload, setShowAutoDownload] = useState(false)

  // State: Last Played (for auto-continue)
  const [lastPlayed, setLastPlayed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lastPlayed')) || null
    } catch { return null }
  })

  // ─── Helpers ───
  const getCategory = (torrent) => {
    const files = torrent.files || []
    const videos = files.filter(f => /\.(mp4|mkv|avi|webm|mov)$/i.test(f.name))
    const audio = files.filter(f => /\.(mp3|flac|m4a|ogg|wav)$/i.test(f.name))

    if (audio.length > 0 && videos.length === 0) return 'music'
    if (videos.length > 1) return 'series'
    if (videos.length === 1) return 'movie'
    return 'other'
  }

  const getFilteredAndSortedTorrents = () => {
    let result = [...torrents]

    if (categoryFilter !== 'all') {
      result = result.filter(t => getCategory(t) === categoryFilter)
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name': return (a.name || '').localeCompare(b.name || '')
        case 'size':
          const sizeA = a.files?.reduce((sum, f) => sum + (f.length || 0), 0) || 0
          const sizeB = b.files?.reduce((sum, f) => sum + (f.length || 0), 0) || 0
          return sizeB - sizeA
        case 'peers': return (b.numPeers || 0) - (a.numPeers || 0)
        default: return 0
      }
    })

    return result
  }

  const displayTorrents = getFilteredAndSortedTorrents()

  // ─── Settings Handlers ───
  // 🔥 v2.3: Use Capacitor Preferences for Android 9 compatibility
  const savePreferredPlayer = async (playerId) => {
    setPreferredPlayer(playerId)
    try {
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key: 'preferredPlayer', value: playerId })
        console.log('[Prefs] Saved player:', playerId)
      } else {
        localStorage.setItem('preferredPlayer', playerId)
      }
    } catch (e) {
      console.warn('[Prefs] Failed to save:', e)
      localStorage.setItem('preferredPlayer', playerId) // Fallback
    }
  }

  const saveSortBy = (sort) => {
    setSortBy(sort)
    localStorage.setItem('sortBy', sort)
  }

  const handleServerUrlChange = (url, save = false) => {
    setServerUrl(url)
    if (save) {
      localStorage.setItem('serverUrl', url)
      setShowSettings(false)
      fetchStatus()
    }
  }

  const handleTmdbProxyUrlChange = (url, save = false) => {
    setTmdbProxyUrl(url)
    if (save) {
      localStorage.setItem('tmdbProxyUrl', url)
    }
  }

  // ─── API Helpers ───
  const getApiUrl = (path) => {
    if (serverUrl) {
      const base = serverUrl.replace(/\/$/, '')
      return `${base}${path}`
    }
    return path
  }

  const fetchStatus = async () => {
    try {
      const res = await fetch(getApiUrl('/api/status'))
      if (res.status === 503) {
        setRetryAfter(300)
      }
      const data = await res.json()
      setServerStatus(data.serverStatus || 'ok')
      setLastStateChange(data.lastStateChange || null)
      setTorrents(data.torrents || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching status:', err)
      if (torrents.length === 0) {
        setError(`Connection Error: ${err.message}`)
      }
    }
  }

  // ─── Torrent Actions ───
  const addMagnet = async (magnetLink) => {
    if (!magnetLink) return
    setLoading(true)
    try {
      await fetch(getApiUrl('/api/add'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnet: magnetLink })
      })
      setMagnet('')
      fetchStatus()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addTorrent = (e) => {
    e.preventDefault()
    addMagnet(magnet)
  }

  const deleteTorrent = async (infoHash) => {
    if (!confirm('Remove this torrent?')) return
    try {
      await fetch(getApiUrl(`/api/delete/${infoHash}`), { method: 'DELETE' })
      setSelectedTorrent(null)
      fetchStatus()
    } catch (err) {
      alert('Delete failed')
    }
  }

  const getStreamUrl = (infoHash, fileIndex) => {
    if (serverUrl) {
      return `${serverUrl.replace(/\/$/, '')}/stream/${infoHash}/${fileIndex}`
    }
    return `${window.location.protocol}//${window.location.host}/stream/${infoHash}/${fileIndex}`
  }

  const copyUrl = (infoHash, fileIndex) => {
    const url = getStreamUrl(infoHash, fileIndex)
    navigator.clipboard?.writeText(url)
      .then(() => alert('URL copied!'))
      .catch(() => alert('Failed to copy'))
  }

  // ─── Playback ───
  const handlePlay = async (infoHash, fileIndex, fileName) => {
    const streamUrl = getStreamUrl(infoHash, fileIndex)
    const title = cleanTitle(fileName)
    const pkg = preferredPlayer

    // 🎥 Save lastPlayed for Continue feature
    const torrent = torrents.find(t => t.infoHash === infoHash)
    if (torrent) {
      const videoFiles = torrent.files?.filter(f => /\.(mp4|mkv|avi|webm|mov)$/i.test(f.name)) || []
      const currentIdx = videoFiles.findIndex(f => f.index === fileIndex)
      const nextFile = videoFiles[currentIdx + 1]
      const playData = {
        infoHash,
        fileIndex,
        fileName,
        torrentName: torrent.name,
        nextFile: nextFile ? { index: nextFile.index, name: nextFile.name } : null,
        timestamp: Date.now()
      }
      localStorage.setItem('lastPlayed', JSON.stringify(playData))
      setLastPlayed(playData)
    }

    console.log(`[Play] URL: ${streamUrl} | Package: ${pkg} | Title: ${title}`)

    if (pkg && Capacitor.isNativePlatform()) {
      try {
        const { installed } = await TVPlayer.isPackageInstalled({ package: pkg })
        if (!installed) {
          const playerName = PLAYERS.find(p => p.id === pkg)?.name || pkg
          alert(`${playerName} не установлен. Выберите другой плеер в настройках.`)
          return
        }
      } catch (e) {
        console.warn('[Play] isPackageInstalled check failed:', e)
      }
    }

    setBuffering({ name: title, progress: 10 })
    setSelectedTorrent(null)

    try {
      await TVPlayer.play({ url: streamUrl, package: pkg, title: title })
      setBuffering(null)
    } catch (e) {
      console.error(`[Play] Failed with ${pkg}, trying system chooser...`)
      try {
        await TVPlayer.play({ url: streamUrl, package: "", title: title })
        setBuffering(null)
      } catch (err) {
        setBuffering(null)
        alert("Error launching player: " + err.message)
      }
    }
  }

  const handlePlayAll = async (torrent, startIndex = 0) => {
    const videoFiles = torrent.files?.filter(f =>
      /\.(mp4|mkv|avi|webm|mov)$/i.test(f.name)
    ) || []

    if (videoFiles.length <= 1) {
      const file = videoFiles[0] || torrent.files?.[0]
      if (file) handlePlay(torrent.infoHash, file.index, file.name)
      return
    }

    const pkg = preferredPlayer
    const title = cleanTitle(torrent.name)
    const urls = videoFiles.map(f => getStreamUrl(torrent.infoHash, f.index))
    const names = videoFiles.map(f => cleanTitle(f.name) || f.name)

    console.log(`[PlayAll] ${urls.length} files | Package: ${pkg}`)

    if (pkg && Capacitor.isNativePlatform()) {
      try {
        const { installed } = await TVPlayer.isPackageInstalled({ package: pkg })
        if (!installed) {
          const playerName = PLAYERS.find(p => p.id === pkg)?.name || pkg
          alert(`${playerName} не установлен. Выберите другой плеер в настройках.`)
          return
        }
      } catch (e) {
        console.warn('[PlayAll] isPackageInstalled check failed:', e)
      }
    }

    setBuffering({ name: `${title} (${urls.length} files)`, progress: 10 })
    setSelectedTorrent(null)

    try {
      await TVPlayer.playList({
        package: pkg,
        title: title,
        urls: urls,
        names: names,
        startIndex: startIndex
      })
      setBuffering(null)
    } catch (e) {
      console.error('[PlayAll] Playlist failed, falling back to single play:', e)
      setBuffering(null)
      handlePlay(torrent.infoHash, videoFiles[startIndex]?.index || 0, videoFiles[startIndex]?.name)
    }
  }

  // ─── Search (API v2 with Aggregator) ───
  const searchRuTracker = async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setSearchResults([])
    setSearchProviders({})
    try {
      // API v2: Uses Aggregator with envelope response
      const res = await fetch(getApiUrl(`/api/v2/search?query=${encodeURIComponent(searchQuery)}&limit=100`))
      const data = await res.json()
      setSearchResults(data.items || [])
      setSearchProviders(data.meta?.providers || {})

      // Log search stats
      if (data.meta) {
        console.log(`[Search] ${data.meta.totalResults} results in ${data.meta.ms}ms (cached: ${data.meta.cached})`)
      }
    } catch (err) {
      console.error('[Search] Error:', err)
      setError('Ошибка поиска: ' + err.message)
    } finally {
      setSearchLoading(false)
    }
  }

  const addFromSearch = async (magnetOrId, title) => {
    setSearchLoading(true)
    try {
      if (magnetOrId && magnetOrId.startsWith('magnet:')) {
        await addMagnet(magnetOrId)
        setShowSearch(false)
        setSearchResults([])
        setSearchQuery('')
      } else {
        const res = await fetch(getApiUrl(`/api/rutracker/magnet/${encodeURIComponent(magnetOrId)}`))
        const data = await res.json()
        if (data.magnet) {
          await addMagnet(data.magnet)
          setShowSearch(false)
          setSearchResults([])
          setSearchQuery('')
        } else {
          setError('Не удалось получить magnet-ссылку')
        }
      }
    } catch (err) {
      setError('Ошибка: ' + err.message)
    } finally {
      setSearchLoading(false)
    }
  }

  // ─── Effects ───
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)

    // Warmup external services
    const warmUpTargets = ['https://apn-latest.onrender.com/ping']
    warmUpTargets.forEach(url => fetch(url, { method: 'HEAD', mode: 'no-cors' }).catch(() => { }))

    return () => clearInterval(interval)
  }, [serverUrl])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const handleAppUrlOpen = async (event) => {
      if (event.url?.startsWith('magnet:')) {
        addMagnet(event.url)
      }
    }
    CapacitorApp.addListener('appUrlOpen', handleAppUrlOpen)
    return () => CapacitorApp.removeAllListeners()
  }, [serverUrl])

  useEffect(() => {
    const handleBack = () => {
      if (selectedTorrent) {
        setSelectedTorrent(null)
      } else if (showSettings) {
        setShowSettings(false)
      } else {
        CapacitorApp.exitApp()
      }
    }

    const backListener = CapacitorApp.addListener('backButton', () => {
      console.log('Native Back Button')
      handleBack()
    })

    const keyListener = (e) => {
      // 🔥 v2.3: Don't intercept backspace when typing in input/textarea
      const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)

      if (e.key === 'Escape' || e.keyCode === 10009) {
        handleBack()
      } else if (e.key === 'Backspace' && !isTyping) {
        // Only trigger back on Backspace if NOT typing
        handleBack()
      }
    }
    window.addEventListener('keydown', keyListener)

    return () => {
      backListener.then(h => h.remove())
      window.removeEventListener('keydown', keyListener)
    }
  }, [selectedTorrent, showSettings])

  // ─── Render: Critical Error ───
  if (serverStatus === 'circuit_open' || serverStatus === 'error') {
    return <ErrorScreen status={serverStatus} retryAfter={retryAfter} onRetry={fetchStatus} />
  }

  // ─── Render ───
  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans selection:bg-red-500 selection:text-white pb-20">

      {/* Navbar */}
      <div className="sticky top-0 z-30 bg-[#141414]/90 backdrop-blur-md px-6 py-4 flex justify-between items-center shadow-lg border-b border-gray-800">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
          PWA-TorServe
        </h1>
        <div className="flex gap-3 items-center">
          <ServerStatusBar status={serverStatus} onDiagnosticsClick={() => setShowDiagnostics(true)} />
          <button onClick={() => setShowAutoDownload(true)} className="p-2 hover:bg-gray-800 rounded-full transition-colors" title="Авто-загрузка">📺</button>
          <button onClick={fetchStatus} className="p-2 hover:bg-gray-800 rounded-full transition-colors">🔄</button>
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-gray-800 rounded-full transition-colors">⚙️</button>
        </div>
      </div>

      {/* Diagnostics Modal */}
      {showDiagnostics && (
        <DiagnosticsPanel
          serverUrl={getApiUrl('')}
          onClose={() => setShowDiagnostics(false)}
        />
      )}

      {/* Auto-Download Panel */}
      {showAutoDownload && (
        <AutoDownloadPanel
          serverUrl={getApiUrl('')}
          torrents={torrents}
          onClose={() => setShowAutoDownload(false)}
        />
      )}

      {/* Status Banner */}
      {serverStatus === 'degraded' && <DegradedBanner lastStateChange={lastStateChange} />}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          preferredPlayer={preferredPlayer}
          onPlayerChange={savePreferredPlayer}
          serverUrl={serverUrl}
          onServerUrlChange={handleServerUrlChange}
          tmdbProxyUrl={tmdbProxyUrl}
          onTmdbProxyUrlChange={handleTmdbProxyUrlChange}
          torrents={torrents}
        />
      )}

      {/* Content Grid */}
      <div className="px-6 py-4">

        {/* Continue Watching Banner */}
        {lastPlayed?.nextFile && torrents.find(t => t.infoHash === lastPlayed.infoHash) && (
          <div className="mb-6 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-purple-300 uppercase tracking-wide mb-1">▶ Continue Watching</div>
                <div className="text-white font-bold truncate">{cleanTitle(lastPlayed.torrentName)}</div>
                <div className="text-gray-400 text-sm truncate">Next: {cleanTitle(lastPlayed.nextFile.name)}</div>
              </div>
              <button
                onClick={() => handlePlay(
                  lastPlayed.infoHash,
                  lastPlayed.nextFile.index,
                  lastPlayed.nextFile.name
                )}
                className="ml-4 bg-purple-600 hover:bg-purple-500 px-5 py-3 rounded-lg font-bold text-white flex items-center gap-2 transition-colors"
              >
                ▶ Play Next
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-200">My List</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-full text-sm font-bold transition-transform hover:scale-105"
            >
              🔍 Поиск
            </button>
            {!showServerInput && (
              <button
                onClick={() => setShowServerInput(true)}
                className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-full text-sm font-bold border border-gray-600 transition-transform hover:scale-105"
              >
                + Magnet
              </button>
            )}
          </div>
        </div>

        {/* Search Panel */}
        {showSearch && (
          <SearchPanel
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearch={searchRuTracker}
            onClose={() => { setShowSearch(false); setSearchResults([]); setSearchProviders({}) }}
            onAddTorrent={addFromSearch}
            searchResults={searchResults}
            searchLoading={searchLoading}
            providers={searchProviders}
          />
        )}

        {/* Magnet Input */}
        {showServerInput && (
          <form onSubmit={addTorrent} className="mb-6">
            <div className="flex gap-2">
              <input
                value={magnet}
                onChange={(e) => setMagnet(e.target.value)}
                placeholder="Вставьте Magnet-ссылку..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                type="submit"
                disabled={loading || !magnet}
                className="bg-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '...' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => setShowServerInput(false)}
                className="bg-gray-800 px-4 rounded-lg"
              >
                ✕
              </button>
            </div>
          </form>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-3 pt-1 px-1 -mx-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#141414] focus:outline-none
                ${categoryFilter === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}
              `}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Sort Buttons */}
        <div className="flex gap-2 mb-6 text-xs px-1 -mx-1">
          <span className="text-gray-500 self-center">Сортировка:</span>
          {[{ id: 'name', label: 'Имя' }, { id: 'size', label: 'Размер' }, { id: 'peers', label: 'Пиры' }].map(s => (
            <button
              key={s.id}
              onClick={() => saveSortBy(s.id)}
              className={`
                px-3 py-1 rounded transition-all
                focus:ring-2 focus:ring-blue-400 focus:outline-none
                ${sortBy === s.id
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-800/50 text-gray-500 hover:text-white'}
              `}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Torrent Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {displayTorrents.map(t => (
            <Poster
              key={t.infoHash}
              name={t.name}
              progress={t.progress || 0}
              peers={t.numPeers || 0}
              isReady={t.isReady}
              size={t.files?.reduce((sum, f) => sum + (f.length || 0), 0) || 0}
              downloadSpeed={t.downloadSpeed || 0}
              downloaded={t.downloaded || 0}
              eta={t.eta || 0}
              newFilesCount={t.newFilesCount || 0}
              onClick={() => setSelectedTorrent(t)}
            />
          ))}

          {/* Empty State */}
          {displayTorrents.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center text-gray-600">
              <div className="text-6xl mb-4">{categoryFilter === 'all' ? '🍿' : CATEGORIES.find(c => c.id === categoryFilter)?.icon}</div>
              <p className="text-lg">{categoryFilter === 'all' ? 'Your list is empty.' : 'Нет торрентов в этой категории'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Torrent Modal */}
      {selectedTorrent && (
        <TorrentModal
          torrent={selectedTorrent}
          onClose={() => setSelectedTorrent(null)}
          onPlay={handlePlay}
          onPlayAll={handlePlayAll}
          onCopyUrl={copyUrl}
          onDelete={deleteTorrent}
        />
      )}

      {/* Buffering Overlay */}
      {buffering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-pulse">⏳</div>
            <h2 className="text-xl font-bold text-white mb-2">Буферизация...</h2>
            <p className="text-gray-400">{buffering.name}</p>
            <div className="mt-4 w-48 h-2 bg-gray-700 rounded-full overflow-hidden mx-auto">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${buffering.progress || 10}%` }}
              />
            </div>
            <button
              onClick={() => setBuffering(null)}
              className="mt-6 text-gray-500 hover:text-white"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

```

### client/src/App.css
```text
#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}

```

### client/src/index.css
```text
@import "tailwindcss";

/* ─────────────────────────────────────────────────────────────
   PWA-TorServe - TV-First Design System
   ───────────────────────────────────────────────────────────── */

/* Prevent horizontal overflow */
html,
body {
  overflow-x: hidden;
  width: 100%;
  max-width: 100vw;
}

#root {
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
}

/* ─────────────────────────────────────────────────────────────
   TV Focus States (D-Pad Navigation)
   ───────────────────────────────────────────────────────────── */

/* Remove default focus outline */
*:focus {
  outline: none;
}

/* TV-Friendly Focus Ring */
.tv-focusable:focus,
.tv-card:focus,
button:focus,
[tabindex]:focus {
  outline: none;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.8);
  transform: scale(1.02);
  transition: all 0.15s ease-out;
}

/* Card Focus - Netflix Style */
.tv-card {
  transition: all 0.2s ease-out;
  cursor: pointer;
}

.tv-card:focus {
  transform: scale(1.08);
  box-shadow: 0 0 0 4px white, 0 8px 30px rgba(0, 0, 0, 0.5);
  z-index: 10;
  position: relative;
}

.tv-card:hover {
  transform: scale(1.05);
}

/* Primary Button Focus */
.tv-btn-primary:focus {
  transform: scale(1.05);
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.8), 0 4px 20px rgba(34, 197, 94, 0.4);
}

/* Danger Button Focus */
.tv-btn-danger:focus {
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.8);
}

/* ─────────────────────────────────────────────────────────────
   Netflix Grid Layout
   ───────────────────────────────────────────────────────────── */

.netflix-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
  padding: 1rem;
}

/* Larger cards on TV (big screens) */
@media (min-width: 1280px) {
  .netflix-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 2rem;
    padding: 2rem;
  }
}

/* ─────────────────────────────────────────────────────────────
   Torrent Card
   ───────────────────────────────────────────────────────────── */

.torrent-card {
  aspect-ratio: 16 / 10;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.torrent-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);
  opacity: 0;
  transition: opacity 0.2s;
}

.torrent-card:focus::before,
.torrent-card:hover::before {
  opacity: 1;
}

.torrent-card-title {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.torrent-card-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: #94a3b8;
}

.torrent-card-progress {
  height: 6px;
  background: #334155;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.torrent-card-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #22c55e 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* Ready state - green glow */
.torrent-card.ready {
  border-color: #22c55e;
}

.torrent-card.ready::before {
  background: #22c55e;
  opacity: 1;
}

/* ─────────────────────────────────────────────────────────────
   Details Modal (Full Screen on TV)
   ───────────────────────────────────────────────────────────── */

.details-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(8px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease-out;
}

.details-modal {
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border-radius: 24px;
  padding: 3rem;
  max-width: 700px;
  width: 90%;
  text-align: center;
  border: 1px solid #334155;
}

.details-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.details-progress-container {
  margin: 2rem 0;
}

.details-progress-bar {
  height: 12px;
  background: #334155;
  border-radius: 6px;
  overflow: hidden;
}

.details-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #22c55e 100%);
  border-radius: 6px;
  transition: width 0.3s ease;
}

.details-status {
  font-size: 1.25rem;
  margin-top: 0.75rem;
}

.details-status.ready {
  color: #22c55e;
}

.details-status.loading {
  color: #fbbf24;
}

.details-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2.5rem;
}

.details-btn-watch {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
  padding: 1.25rem 2rem;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.details-btn-watch:focus {
  transform: scale(1.05);
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.6), 0 8px 30px rgba(34, 197, 94, 0.3);
}

.details-btn-delete {
  background: transparent;
  color: #ef4444;
  font-size: 1rem;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  border: 2px solid #ef4444;
  cursor: pointer;
  transition: all 0.2s;
}

.details-btn-delete:focus {
  background: #ef4444;
  color: white;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.5);
}

.details-back {
  margin-top: 2rem;
  font-size: 0.875rem;
  color: #64748b;
}

/* ─────────────────────────────────────────────────────────────
   Mobile Optimizations
   ───────────────────────────────────────────────────────────── */

@media (max-width: 640px) {
  .netflix-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 0.75rem;
  }

  .torrent-card {
    aspect-ratio: auto;
    padding: 1rem;
  }

  .details-modal {
    padding: 2.5rem;
    /* Larger padding */
    border-radius: 24px;
    max-width: 95%;
    /* Use more screen width */
    border: 2px solid #475569;
  }

  .details-title {
    font-size: 2rem;
    /* Larger title */
    margin-bottom: 2rem;
  }

  .details-progress-bar {
    height: 20px;
    /* Thicker bar */
  }

  .details-btn-watch {
    font-size: 1.75rem;
    /* Hugo watch button */
    padding: 1.5rem 3rem;
    width: 100%;
    /* Full width */
    margin-bottom: 1rem;
  }

  .details-btn-delete {
    font-size: 1.25rem;
    padding: 1.25rem;
    width: 100%;
  }

  .details-back {
    font-size: 1.25rem;
    /* Larger hint */
    margin-top: 2rem;
    opacity: 0.8;
  }
}

/* ─────────────────────────────────────────────────────────────
   Animations
   ───────────────────────────────────────────────────────────── */

.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Removed pulse-ready animation to prevent visual conflict with focus state */

/* ─────────────────────────────────────────────────────────────
   Header & Settings
   ───────────────────────────────────────────────────────────── */

.header-btn:focus {
  transform: scale(1.2);
  color: white;
}

.settings-panel {
  max-width: 500px;
  margin: 0 auto 2rem;
}
```

### client/src/utils/helpers.js
```javascript
/**
 * Utility helpers for PWA-TorServe
 */

/**
 * Clean torrent/file name for display and poster search
 * Removes technical tags, year suffixes, season markers, and garbage characters
 */
export const cleanTitle = (rawName) => {
    if (!rawName) return ''

    // 1. Базовая чистка: точки, нижние подчеркивания, скобки
    let name = rawName
        .replace(/\./g, ' ')
        .replace(/_/g, ' ')
        .replace(/\[.*?\]/g, '') // Удаляем содержимое квадратных скобок
        .replace(/\(.*?\)/g, '') // Удаляем содержимое круглых скобок
        .trim()

    // 2. 🔥 ВАЖНО: Обрезаем по Сезону (S01, s01e01), если года нет
    // Это спасет "IT Welcome to Derry S01..." -> "IT Welcome to Derry"
    const seasonMatch = name.match(/\b(S\d{2}|s\d{2})\b/i)
    if (seasonMatch) {
        const index = name.indexOf(seasonMatch[0])
        name = name.substring(0, index)
    }

    // 3. Обрезаем по Году (как и было)
    const yearMatch = name.match(/\b(19\d{2}|20\d{2})\b/)
    if (yearMatch) {
        const index = name.indexOf(yearMatch[0])
        name = name.substring(0, index)
    }

    // 4. 🔥 Дополненный список мусорных тегов
    const tags = [
        // Качество и рипы
        '1080p', '720p', '2160p', '4k', 'WEB-DL', 'WEBRip', 'BluRay', 'HDR',
        'H.264', 'H264', 'x264', 'x265', 'HEVC', 'AAC', 'AC3', 'DTS', 'HDTV', 'DV', 'DoVi',
        'SDR', 'BDRemux', 'Remux', 'TYMBLER', 'AKTEP', 'SOFCJ',
        'CHDRip', 'HDRip', 'DVDRip', 'BDRip', 'CAMRip', 'TS', 'TC',
        'DD5', 'DD51', 'DD', 'Atmos',
        // Версии и расширения
        'v2', 'v3', 'v4', 'mkv', 'avi', 'mp4',
        // Языки и прочее
        'rus', 'eng', 'torrent', 'stream', 'dub', 'sub', 'extended',
        // Стриминги
        'HMAX', 'ATVP', 'AMZN', 'NF', 'DSNP', 'HULU', 'OKKO', 'OM'
    ]

    // Удаляем теги (на случай если они стоят ДО сезона/года)
    tags.forEach(tag => {
        // Удаляем тег как отдельное слово
        const regex = new RegExp(`\\b${tag}\\b`, 'gi')
        name = name.replace(regex, '')
    })

    return name
        .replace(/[^\w\s\u0400-\u04FF:\-]/g, '') // Оставляем буквы, цифры, двоеточие и дефис
        .replace(/\s+/g, ' ') // Убираем двойные пробелы
        .trim()
}

/**
 * Format bytes to human readable size
 */
export const formatSize = (bytes) => {
    if (!bytes) return ''
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let i = 0
    let size = bytes
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024
        i++
    }
    return `${size.toFixed(1)} ${units[i]}`
}

/**
 * Format download speed (bytes/sec to human readable)
 */
export const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec || bytesPerSec < 1024) return ''
    const kbps = bytesPerSec / 1024
    if (kbps < 1024) return `${kbps.toFixed(0)} KB/s`
    return `${(kbps / 1024).toFixed(1)} MB/s`
}

/**
 * Format ETA (seconds to human readable)
 */
export const formatEta = (seconds) => {
    if (!seconds || seconds <= 0) return ''
    if (seconds < 60) return `${seconds}с`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}м`
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}ч ${mins}м`
}

/**
 * Generate gradient based on string hash (for fallback poster background)
 */
export const getGradient = (str) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
    const h1 = Math.abs(hash % 360)
    const h2 = Math.abs((hash * 13) % 360)
    return `linear-gradient(135deg, hsl(${h1}, 70%, 20%), hsl(${h2}, 80%, 15%))`
}

```

### client/src/hooks/useTVNavigation.js
```javascript
/**
 * useTVNavigation - Universal TV Remote Navigation Hook
 * Stage 6.2: Handles D-pad navigation for lists and grids
 * 
 * @param {Object} options
 * @param {number} options.itemCount - Total number of items
 * @param {number} options.columns - Number of columns (1 for vertical list, >1 for grid)
 * @param {function} options.onSelect - Callback when Enter/OK pressed (receives index)
 * @param {function} options.onBack - Callback when Escape/Back pressed
 * @param {React.RefObject[]} options.itemRefs - Array of refs for scrollIntoView
 * @param {boolean} options.loop - Whether to loop at edges (default: false)
 * @param {boolean} options.trapFocus - Prevent focus from leaving (default: true)
 */
import { useState, useCallback, useEffect } from 'react'

export const useTVNavigation = ({
    itemCount,
    columns = 1,
    onSelect,
    onBack,
    itemRefs,
    loop = false,
    trapFocus = true,
    initialIndex = -1
}) => {
    const [focusedIndex, setFocusedIndex] = useState(initialIndex)

    // Calculate grid navigation
    const rows = Math.ceil(itemCount / columns)

    const handleKeyDown = useCallback((e) => {
        if (itemCount === 0) return

        let newIndex = focusedIndex
        let handled = false

        switch (e.key) {
            case 'ArrowDown':
                if (columns === 1) {
                    // Vertical list: move down by 1
                    if (focusedIndex < itemCount - 1) {
                        newIndex = focusedIndex + 1
                        handled = true
                    } else if (loop) {
                        newIndex = 0
                        handled = true
                    } else if (trapFocus) {
                        handled = true // Prevent default but don't change index
                    }
                } else {
                    // Grid: move down by columns
                    if (focusedIndex + columns < itemCount) {
                        newIndex = focusedIndex + columns
                        handled = true
                    } else if (trapFocus) {
                        handled = true
                    }
                }
                break

            case 'ArrowUp':
                if (columns === 1) {
                    // Vertical list: move up by 1
                    if (focusedIndex > 0) {
                        newIndex = focusedIndex - 1
                        handled = true
                    } else if (loop) {
                        newIndex = itemCount - 1
                        handled = true
                    }
                } else {
                    // Grid: move up by columns
                    if (focusedIndex - columns >= 0) {
                        newIndex = focusedIndex - columns
                        handled = true
                    }
                }
                break

            case 'ArrowRight':
                if (columns > 1) {
                    // Grid: move right
                    const currentCol = focusedIndex % columns
                    if (currentCol < columns - 1 && focusedIndex < itemCount - 1) {
                        newIndex = focusedIndex + 1
                        handled = true
                    }
                }
                break

            case 'ArrowLeft':
                if (columns > 1) {
                    // Grid: move left
                    const currentCol = focusedIndex % columns
                    if (currentCol > 0) {
                        newIndex = focusedIndex - 1
                        handled = true
                    }
                }
                break

            case 'Enter':
            case ' ':
                if (focusedIndex >= 0 && onSelect) {
                    e.preventDefault()
                    onSelect(focusedIndex)
                    return
                }
                break

            case 'Escape':
            case 'Backspace':
                if (onBack) {
                    e.preventDefault()
                    onBack()
                    return
                }
                break
        }

        if (handled) {
            e.preventDefault()
            if (newIndex !== focusedIndex && newIndex >= 0 && newIndex < itemCount) {
                setFocusedIndex(newIndex)
            }
        }
    }, [focusedIndex, itemCount, columns, loop, trapFocus, onSelect, onBack])

    // Scroll into view when focused index changes
    useEffect(() => {
        if (focusedIndex >= 0 && itemRefs?.current?.[focusedIndex]) {
            itemRefs.current[focusedIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            })
        }
    }, [focusedIndex, itemRefs])

    // Focus the element when index changes
    useEffect(() => {
        if (focusedIndex >= 0 && itemRefs?.current?.[focusedIndex]) {
            itemRefs.current[focusedIndex].focus()
        }
    }, [focusedIndex, itemRefs])

    // Reset focus when item count changes and current index is out of bounds
    useEffect(() => {
        if (focusedIndex >= itemCount) {
            setFocusedIndex(Math.max(0, itemCount - 1))
        }
    }, [itemCount, focusedIndex])

    return {
        focusedIndex,
        setFocusedIndex,
        handleKeyDown,
        // Helper for binding to container
        containerProps: {
            onKeyDown: handleKeyDown,
            tabIndex: 0
        },
        // Helper for checking if item is focused
        isFocused: (index) => focusedIndex === index
    }
}

export default useTVNavigation

```

### client/src/components/StatusBanners.jsx
```jsx
/**
 * Status Banner Components - Error states and loading indicators
 */
import { useState, useEffect } from 'react'

/**
 * DegradedBanner - Shows when server is in degraded mode (high memory)
 */
export const DegradedBanner = ({ lastStateChange }) => {
    const [elapsed, setElapsed] = useState(0)

    useEffect(() => {
        if (!lastStateChange) return
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - lastStateChange) / 1000))
        }, 1000)
        return () => clearInterval(interval)
    }, [lastStateChange])

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
    }

    return (
        <div className="bg-yellow-600/90 text-yellow-100 p-4 rounded-lg mb-6 border border-yellow-500 animate-pulse mx-4">
            <div className="flex items-center gap-3">
                <span className="text-2xl">❄️</span>
                <div>
                    <div className="font-bold text-lg">Cooling Down</div>
                    <div className="text-sm opacity-90">
                        High memory usage detected. Service may be slower.
                        <span className="ml-2 font-mono">{formatTime(elapsed)}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * ErrorScreen - Full-screen error for circuit breaker / critical errors
 */
export const ErrorScreen = ({ status, retryAfter, onRetry }) => {
    const [countdown, setCountdown] = useState(retryAfter || 300)

    useEffect(() => {
        if (countdown <= 0) {
            onRetry()
            return
        }
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
        return () => clearTimeout(timer)
    }, [countdown, onRetry])

    const isCircuitOpen = status === 'circuit_open'
    const icon = isCircuitOpen ? '🔌' : '⚠️'
    const title = isCircuitOpen ? 'Storage Unavailable' : 'Server Error'
    const message = isCircuitOpen
        ? 'NFS/Storage is not responding. The server will retry automatically.'
        : 'A critical error occurred. Please wait for recovery.'

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
            <div className="bg-red-900/30 border border-red-700 rounded-2xl p-8 max-w-md text-center">
                <div className="text-6xl mb-4">{icon}</div>
                <h1 className="text-2xl font-bold text-red-400 mb-2">{title}</h1>
                <p className="text-gray-300 mb-6">{message}</p>
                <button
                    onClick={onRetry}
                    className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                >
                    Retry Now
                </button>
            </div>
        </div>
    )
}

/**
 * BufferingBanner - Shows loading progress when starting playback
 */
export const BufferingBanner = ({ name, progress }) => {
    if (!name) return null

    return (
        <div className="fixed top-16 left-0 right-0 z-50 mx-4">
            <div className="bg-blue-900/95 backdrop-blur-md border border-blue-500 rounded-xl p-4 shadow-2xl animate-pulse">
                <div className="flex items-center gap-3">
                    <div className="animate-spin">
                        <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <div className="font-bold text-white">Buffering...</div>
                        <div className="text-sm text-blue-200 truncate">{name}</div>
                    </div>
                    {progress > 0 && (
                        <div className="text-blue-300 font-mono">{progress}%</div>
                    )}
                </div>
            </div>
        </div>
    )
}

/**
 * ServerStatusBar - Small indicator showing server health
 */
export const ServerStatusBar = ({ status, onDiagnosticsClick }) => {
    const getStatusInfo = () => {
        switch (status) {
            case 'ok':
                return { icon: '🟢', text: 'Server OK', color: 'bg-green-900/50 border-green-700 text-green-300' }
            case 'degraded':
                return { icon: '🟡', text: 'High RAM', color: 'bg-yellow-900/50 border-yellow-700 text-yellow-300' }
            case 'circuit_open':
                return { icon: '🔴', text: 'Storage Error', color: 'bg-red-900/50 border-red-700 text-red-300' }
            case 'error':
                return { icon: '🔴', text: 'Server Error', color: 'bg-red-900/50 border-red-700 text-red-300' }
            default:
                return { icon: '⚪', text: 'Connecting...', color: 'bg-gray-800/50 border-gray-600 text-gray-400' }
        }
    }

    const info = getStatusInfo()

    return (
        <button
            onClick={onDiagnosticsClick}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-colors hover:opacity-80 ${info.color}`}
        >
            <span>{info.icon}</span>
            <span>{info.text}</span>
        </button>
    )
}

```

### client/src/components/SettingsPanel.jsx
```jsx
/**
 * SettingsPanel Component - App configuration UI
 */
import { useState } from 'react'
import { CapacitorHttp } from '@capacitor/core'
import { Capacitor } from '@capacitor/core'
import { cleanTitle } from '../utils/helpers'

// Player list
const PLAYERS = [
    { id: 'net.gtvbox.videoplayer', name: 'Vimu Player (Рекомендуем)' },
    { id: 'org.videolan.vlc', name: 'VLC for Android' },
    { id: 'com.mxtech.videoplayer.ad', name: 'MX Player' },
    { id: '', name: 'System Chooser (Спрашивать всегда)' }
]

const SettingsPanel = ({
    preferredPlayer,
    onPlayerChange,
    serverUrl,
    onServerUrlChange,
    tmdbProxyUrl,
    onTmdbProxyUrlChange,
    torrents = []
}) => {
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [showPosterTest, setShowPosterTest] = useState(false)
    const [testResult, setTestResult] = useState(null)
    const [testLoading, setTestLoading] = useState(false)
    const [speedMode, setSpeedModeState] = useState(localStorage.getItem('speedMode') || 'balanced')
    const [speedLoading, setSpeedLoading] = useState(false)

    const handleClearCache = () => {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('poster_'))
        keys.forEach(k => localStorage.removeItem(k))
        alert(`Очищено ${keys.length} постеров. Перезагрузите приложение.`)
        window.location.reload()
    }

    const runPosterTest = async (testName) => {
        setTestLoading(true)
        setTestResult(null)

        const query = encodeURIComponent(testName)
        const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || ''
        const KP_API_KEY = import.meta.env.VITE_KP_API_KEY || ''
        const CUSTOM_PROXY = import.meta.env.VITE_TMDB_PROXY_URL || ''

        let results = []

        // 1️⃣ Custom Cloudflare Worker
        if (CUSTOM_PROXY) {
            try {
                const proxyUrl = `${CUSTOM_PROXY}/search/multi?api_key=${TMDB_API_KEY}&query=${query}&language=ru-RU`
                const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) })
                if (res.ok) {
                    const data = await res.json()
                    const r = data.results?.find(x => x.poster_path)
                    results.push({ name: 'Custom Worker', status: r ? '✅' : '⚠️', detail: r?.title || r?.name || 'Нет постеров' })
                } else {
                    results.push({ name: 'Custom Worker', status: '❌', detail: `HTTP ${res.status}` })
                }
            } catch (e) {
                results.push({ name: 'Custom Worker', status: '❌', detail: e.message })
            }
        } else {
            results.push({ name: 'Custom Worker', status: '⏭️', detail: 'не настроен' })
        }

        // 2️⃣ Lampa Proxy
        try {
            const targetUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${query}&language=ru-RU`
            const lampaUrl = `https://apn-latest.onrender.com/${targetUrl}`
            const res = await fetch(lampaUrl, { signal: AbortSignal.timeout(15000) })
            if (res.ok) {
                const data = await res.json()
                const r = data.results?.find(x => x.poster_path)
                results.push({ name: 'Lampa Proxy', status: r ? '✅' : '⚠️', detail: r?.title || r?.name || 'Нет постеров' })
            } else {
                results.push({ name: 'Lampa Proxy', status: '❌', detail: `HTTP ${res.status}` })
            }
        } catch (e) {
            results.push({ name: 'Lampa Proxy', status: '❌', detail: e.message })
        }

        // 3️⃣ CapacitorHttp (native Android)
        if (Capacitor.isNativePlatform()) {
            try {
                const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${query}&language=ru-RU`
                const response = await CapacitorHttp.get({ url: searchUrl })
                if (response.data?.results?.length > 0) {
                    const r = response.data.results.find(x => x.poster_path)
                    results.push({ name: 'CapacitorHttp', status: r ? '✅' : '⚠️', detail: r?.title || r?.name || 'Нет постеров' })
                } else {
                    results.push({ name: 'CapacitorHttp', status: '⚠️', detail: 'Пустой ответ' })
                }
            } catch (e) {
                if (e.message?.includes('127.0.0.1')) {
                    results.push({ name: 'CapacitorHttp', status: '🚫', detail: 'DNS POISONING!' })
                } else {
                    results.push({ name: 'CapacitorHttp', status: '❌', detail: e.message })
                }
            }
        } else {
            results.push({ name: 'CapacitorHttp', status: '⏭️', detail: 'только Android' })
        }

        // 4️⃣ corsproxy.io
        try {
            const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${query}&language=ru-RU`
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(searchUrl)}`
            const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) })
            if (res.ok) {
                const data = await res.json()
                const r = data.results?.find(x => x.poster_path)
                results.push({ name: 'corsproxy.io', status: r ? '✅' : '⚠️', detail: r?.title || r?.name || 'Нет постеров' })
            } else {
                results.push({ name: 'corsproxy.io', status: '❌', detail: `HTTP ${res.status}` })
            }
        } catch (e) {
            results.push({ name: 'corsproxy.io', status: '❌', detail: e.message })
        }

        // 5️⃣ Kinopoisk API
        if (KP_API_KEY) {
            try {
                const kpProxy = 'https://cors.kp556.workers.dev:8443/'
                const kpUrl = `${kpProxy}https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${query}`
                const res = await fetch(kpUrl, {
                    headers: { 'X-API-KEY': KP_API_KEY },
                    signal: AbortSignal.timeout(8000)
                })
                if (res.ok) {
                    const data = await res.json()
                    const kp = data.films?.find(f => f.posterUrlPreview)
                    results.push({ name: 'Кинопоиск', status: kp ? '✅' : '⚠️', detail: kp?.nameRu || kp?.nameEn || 'Нет постеров' })
                } else {
                    results.push({ name: 'Кинопоиск', status: '❌', detail: `HTTP ${res.status}` })
                }
            } catch (e) {
                results.push({ name: 'Кинопоиск', status: '❌', detail: e.message })
            }
        } else {
            results.push({ name: 'Кинопоиск', status: '⏭️', detail: 'нет API ключа' })
        }

        setTestResult({ name: testName, results })
        setTestLoading(false)
    }

    const cacheCount = Object.keys(localStorage).filter(k => k.startsWith('poster_')).length

    return (
        <div className="mx-6 mb-6 p-6 bg-gray-900 rounded-xl border border-gray-800 shadow-2xl animate-fade-in relative z-20">
            <h2 className="text-xl font-bold mb-4 text-gray-200">Settings</h2>

            {/* Player Selection */}
            <div className="mb-6">
                <label className="text-gray-400 text-sm mb-3 block">Default Video Player</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {PLAYERS.map(p => (
                        <button
                            key={p.id}
                            onClick={() => onPlayerChange(p.id)}
                            className={`
                p-4 rounded-lg border text-left transition-all
                ${preferredPlayer === p.id
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg scale-[1.02]'
                                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}
              `}
                        >
                            <div className="font-bold">{p.name}</div>
                            <div className="text-xs opacity-75 mt-1">{p.id || 'System Default'}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Speed Mode Toggle */}
            <div className="mb-6">
                <label className="text-gray-400 text-sm mb-3 block">⚡ Speed Mode</label>
                <div className="grid grid-cols-3 gap-2">
                    {[{ id: 'eco', name: '🌱 Eco', desc: '20 peers' }, { id: 'balanced', name: '⚖️ Balance', desc: '40 peers' }, { id: 'turbo', name: '🚀 Turbo', desc: '65 peers' }].map(m => (
                        <button
                            key={m.id}
                            disabled={speedLoading}
                            onClick={async () => {
                                setSpeedLoading(true)
                                try {
                                    const baseUrl = serverUrl || ''
                                    const res = await fetch(`${baseUrl}/api/speed-mode`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ mode: m.id })
                                    })
                                    if (res.ok) {
                                        setSpeedModeState(m.id)
                                        localStorage.setItem('speedMode', m.id)
                                    }
                                } catch (e) {
                                    console.error('Speed mode error:', e)
                                } finally {
                                    setSpeedLoading(false)
                                }
                            }}
                            className={`p-3 rounded-lg border text-center transition-all disabled:opacity-50 ${speedMode === m.id
                                ? 'bg-green-600 border-green-500 text-white'
                                : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                                }`}
                        >
                            <div className="font-bold text-sm">{m.name}</div>
                            <div className="text-xs opacity-75 mt-1">{m.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Advanced Section */}
            <div className="border-t border-gray-800 pt-4">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-gray-500 text-sm hover:text-white flex items-center gap-2"
                >
                    {showAdvanced ? '▼' : '▶'} Advanced: Server Connection
                </button>

                {showAdvanced && (
                    <div className="mt-3 animate-fade-in">
                        {/* Server URL */}
                        <label className="text-gray-400 text-sm mb-2 block">Server URL</label>
                        <div className="flex gap-2">
                            <input
                                value={serverUrl}
                                onChange={e => onServerUrlChange(e.target.value, false)}
                                onBlur={e => onServerUrlChange(e.target.value, true)}
                                placeholder="http://192.168.1.70:3000"
                                className="bg-gray-800 text-white px-4 py-2 rounded flex-1 border border-gray-700 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">Change only if moving to a new server IP.</p>

                        {/* TMDB Proxy URL */}
                        <label className="text-gray-400 text-sm mb-2 block mt-4">TMDB API Proxy (опционально)</label>
                        <div className="flex gap-2">
                            <input
                                value={tmdbProxyUrl}
                                onChange={e => onTmdbProxyUrlChange(e.target.value, false)}
                                onBlur={e => onTmdbProxyUrlChange(e.target.value, true)}
                                placeholder="https://your-proxy.com/3"
                                className="bg-gray-800 text-white px-4 py-2 rounded flex-1 border border-gray-700 focus:border-purple-500 outline-none"
                            />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                            Обход блокировки TMDB. Формат: <code>https://proxy/3</code>
                        </p>
                        <p className="text-xs text-gray-600">
                            🔗 Примеры: api.themoviedb.org, tmdb.apps.lol, apitmdb.example.com
                        </p>
                    </div>
                )}

                {/* Clear Poster Cache Button */}
                <button
                    onClick={handleClearCache}
                    className="mt-4 text-red-400 text-sm hover:text-red-300 flex items-center gap-2"
                >
                    🗑️ Очистить кэш постеров ({cacheCount} шт.)
                </button>

                {/* TV-Friendly Poster Test */}
                <button
                    onClick={() => setShowPosterTest(!showPosterTest)}
                    className="mt-2 text-blue-400 text-sm hover:text-blue-300 flex items-center gap-2"
                >
                    🧪 Тест постеров {showPosterTest ? '▼' : '▶'}
                </button>

                {showPosterTest && (
                    <div className="mt-3 p-4 bg-gray-800 rounded-lg border border-gray-700 animate-fade-in">
                        <p className="text-gray-400 text-sm mb-3">Выберите фильм для теста:</p>

                        {/* Torrent List - TV-friendly buttons with D-pad navigation */}
                        <div className="max-h-48 overflow-y-auto space-y-2 mb-4" role="listbox">
                            {torrents.length === 0 ? (
                                <p className="text-gray-500 text-sm">Нет загруженных торрентов</p>
                            ) : (
                                torrents.map((t, idx) => (
                                    <button
                                        key={t.infoHash}
                                        tabIndex={0}
                                        autoFocus={idx === 0}
                                        onClick={() => runPosterTest(cleanTitle(t.name) || t.name)}
                                        disabled={testLoading}
                                        className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 focus:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg transition-all text-sm truncate disabled:opacity-50"
                                        onKeyDown={(e) => {
                                            if (e.key === 'ArrowDown') {
                                                e.preventDefault()
                                                e.target.nextElementSibling?.focus()
                                            } else if (e.key === 'ArrowUp') {
                                                e.preventDefault()
                                                e.target.previousElementSibling?.focus()
                                            }
                                        }}
                                    >
                                        🎬 {cleanTitle(t.name) || t.name}
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Loading State */}
                        {testLoading && (
                            <div className="text-center py-4">
                                <span className="animate-pulse text-blue-400">⏳ Тестирование...</span>
                            </div>
                        )}

                        {/* Test Results */}
                        {testResult && (
                            <div className="mt-4 p-3 bg-gray-900 rounded-lg border border-gray-600">
                                <h4 className="font-bold text-white mb-2 text-sm">
                                    🎬 "{testResult.name}"
                                </h4>
                                <div className="space-y-1">
                                    {testResult.results.map((r, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs">
                                            <span>{r.status}</span>
                                            <span className="text-gray-400">{r.name}:</span>
                                            <span className="text-gray-300 truncate">{r.detail}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-3">
                                    💡 Все ❌ → VPN | DNS Poison → 1.1.1.1
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default SettingsPanel

```

### client/src/components/DiagnosticsPanel.jsx
```jsx
/**
 * DiagnosticsPanel Component - Debug information display
 * Shows RAM, lag events, active engines, frozen torrents, watchdog status
 */
import { useState, useEffect } from 'react'

const DiagnosticsPanel = ({ serverUrl, onClose }) => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchDiagnostics = async () => {
        setLoading(true)
        setError(null)

        try {
            // Fetch both status and lag-stats
            const [statusRes, lagRes] = await Promise.all([
                fetch(`${serverUrl}/api/status`),
                fetch(`${serverUrl}/api/lag-stats`)
            ])

            if (!statusRes.ok) throw new Error(`Status API: ${statusRes.status}`)
            if (!lagRes.ok) throw new Error(`Lag API: ${lagRes.status}`)

            const statusData = await statusRes.json()
            const lagData = await lagRes.json()

            setData({
                serverStatus: statusData.serverStatus,
                torrentsCount: statusData.torrents?.length || 0,
                lagStats: lagData,
                ram: lagData.recentLags?.[0]?.memory || 'N/A'
            })
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDiagnostics()
        const interval = setInterval(fetchDiagnostics, 5000) // Refresh every 5s
        return () => clearInterval(interval)
    }, [serverUrl])

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-[#181818] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-900 to-gray-900 p-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        🔧 Diagnostics
                    </h2>
                    <button
                        onClick={onClose}
                        className="bg-black/40 rounded-full p-2 text-white hover:bg-black/60"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {loading && !data && (
                        <div className="text-center text-gray-400 py-8">
                            <span className="animate-pulse">Loading...</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
                            ❌ Error: {error}
                        </div>
                    )}

                    {data && (
                        <>
                            {/* Server Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-800 rounded-lg p-4">
                                    <div className="text-gray-400 text-xs uppercase mb-1">Status</div>
                                    <div className="text-xl font-bold">
                                        {data.serverStatus === 'ok' && '🟢 OK'}
                                        {data.serverStatus === 'degraded' && '🟡 Degraded'}
                                        {data.serverStatus === 'circuit_open' && '🔴 Circuit Open'}
                                        {data.serverStatus === 'error' && '🔴 Error'}
                                    </div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-4">
                                    <div className="text-gray-400 text-xs uppercase mb-1">Torrents</div>
                                    <div className="text-xl font-bold">{data.torrentsCount}</div>
                                </div>
                            </div>

                            {/* Lag Stats */}
                            <div className="bg-gray-800 rounded-lg p-4">
                                <div className="text-gray-400 text-xs uppercase mb-3">Event Loop Lag (last 60s)</div>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-blue-400">{data.lagStats.recentLags || 0}</div>
                                        <div className="text-xs text-gray-500">Spikes</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-yellow-400">{data.lagStats.avgLag || 0}ms</div>
                                        <div className="text-xs text-gray-500">Avg Lag</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-red-400">{data.lagStats.maxLag || 0}ms</div>
                                        <div className="text-xs text-gray-500">Max Lag</div>
                                    </div>
                                </div>
                            </div>

                            {/* Total Lags */}
                            <div className="bg-gray-800 rounded-lg p-4 flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Total Lag Events</span>
                                <span className="font-mono text-lg">{data.lagStats.totalLags || 0}</span>
                            </div>

                            {/* 🔥 v2.3: Enhanced Server Diagnostics */}
                            {data.lagStats.server && (
                                <div className="bg-gray-800 rounded-lg p-4">
                                    <div className="text-gray-400 text-xs uppercase mb-3">Server Info</div>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Uptime:</span>
                                            <span className="text-white font-mono">
                                                {Math.floor(data.lagStats.server.uptime / 60)}m
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">RAM:</span>
                                            <span className="text-white font-mono">
                                                {data.lagStats.server.ram?.rss || 0}MB
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Active:</span>
                                            <span className="text-green-400 font-mono">
                                                {data.lagStats.server.torrents?.active || 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Frozen:</span>
                                            <span className="text-blue-400 font-mono">
                                                {data.lagStats.server.torrents?.frozen || 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between col-span-2">
                                            <span className="text-gray-500">Heap:</span>
                                            <span className="text-white font-mono">
                                                {data.lagStats.server.ram?.heapUsed || 0}/{data.lagStats.server.ram?.heapTotal || 0}MB
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Refresh button */}
                            <button
                                onClick={fetchDiagnostics}
                                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
                            >
                                🔄 Refresh
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default DiagnosticsPanel

```

### client/src/components/AutoDownloadPanel.jsx
```jsx
/**
 * Auto-Download Panel v3
 * UI for managing auto-download rules (series tracking)
 * 
 * Features:
 * - Pick from loaded torrents
 * - TV remote (D-pad) full navigation support
 * - Focus trap to prevent background scrolling
 * - Proper tabIndex on all interactive elements
 */

import { useState, useEffect, useRef } from 'react'

// TV Remote focusable button component with tabIndex
function FocusableButton({ onClick, disabled, className, children, autoFocus, tabIndex = 0 }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            autoFocus={autoFocus}
            tabIndex={disabled ? -1 : tabIndex}
            className={`
                focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
                focus:outline-none focus:scale-105 transition-all
                ${className}
            `}
        >
            {children}
        </button>
    )
}

export default function AutoDownloadPanel({ serverUrl, torrents = [], onClose }) {
    const [settings, setSettings] = useState({ enabled: false, intervalMinutes: 720 })
    const [rules, setRules] = useState([])
    const [loading, setLoading] = useState(false)
    const [checking, setChecking] = useState(false)
    const [lastResult, setLastResult] = useState(null)
    const [showPicker, setShowPicker] = useState(false)

    // Form state for new rule
    const [newRule, setNewRule] = useState({
        query: '',
        resolution: '2160',
        group: '',
        lastEpisode: 0
    })

    // Refs for focus management
    const panelRef = useRef(null)
    const firstFocusableRef = useRef(null)

    const getApiUrl = (path) => serverUrl ? `${serverUrl}${path}` : path

    // Extract series from loaded torrents
    const getSeriesFromTorrents = () => {
        return torrents
            .filter(t => {
                const videos = t.files?.filter(f => /\.(mp4|mkv|avi|webm|mov)$/i.test(f.name)) || []
                return videos.length > 1
            })
            .map(t => {
                const videos = t.files?.filter(f => /\.(mp4|mkv|avi|webm|mov)$/i.test(f.name)) || []
                let maxEpisode = 0

                videos.forEach(f => {
                    const match = f.name.match(/[ES](\d{1,3})|[-–]\s*(\d{1,3})(?:\s|$|\[|\()/i)
                    if (match) {
                        const ep = parseInt(match[1] || match[2], 10)
                        if (ep > maxEpisode) maxEpisode = ep
                    }
                })

                const resMatch = t.name.match(/\b(2160p?|1080p?|720p?)\b/i)
                const resolution = resMatch ? resMatch[1].replace('p', '') : ''

                return {
                    name: t.name,
                    episodeCount: videos.length,
                    lastEpisode: maxEpisode,
                    resolution
                }
            })
    }

    const seriesList = getSeriesFromTorrents()

    // Prevent background scrolling when panel is open
    useEffect(() => {
        // Lock body scroll
        const originalStyle = window.getComputedStyle(document.body).overflow
        document.body.style.overflow = 'hidden'
        document.documentElement.style.overflow = 'hidden'

        return () => {
            document.body.style.overflow = originalStyle
            document.documentElement.style.overflow = ''
        }
    }, [])

    // D-pad / Arrow key navigation handler
    useEffect(() => {
        const getFocusableElements = () => {
            return Array.from(panelRef.current?.querySelectorAll(
                'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]'
            ) || [])
        }

        const handleKeyDown = (e) => {
            const key = e.key
            const keyCode = e.keyCode

            // ESC or Back button to close
            if (key === 'Escape' || key === 'Backspace' || keyCode === 10009) {
                e.preventDefault()
                e.stopPropagation()
                if (showPicker) {
                    setShowPicker(false)
                } else {
                    onClose()
                }
                return
            }

            // Arrow keys / D-pad navigation
            if (key === 'ArrowUp' || key === 'ArrowDown' || keyCode === 38 || keyCode === 40) {
                e.preventDefault()
                e.stopPropagation()

                const focusable = getFocusableElements()
                if (!focusable.length) return

                const currentIndex = focusable.indexOf(document.activeElement)
                let nextIndex

                if (key === 'ArrowDown' || keyCode === 40) {
                    nextIndex = currentIndex < focusable.length - 1 ? currentIndex + 1 : 0
                } else {
                    nextIndex = currentIndex > 0 ? currentIndex - 1 : focusable.length - 1
                }

                focusable[nextIndex]?.focus()
                focusable[nextIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
                return
            }

            // Left/Right for horizontal navigation
            if (key === 'ArrowLeft' || key === 'ArrowRight' || keyCode === 37 || keyCode === 39) {
                // Allow default behavior for inputs
                if (document.activeElement?.tagName === 'INPUT') {
                    return
                }
                e.preventDefault()
                e.stopPropagation()
            }

            // Tab key - focus trap
            if (key === 'Tab') {
                e.preventDefault()
                e.stopPropagation()

                const focusable = getFocusableElements()
                if (!focusable.length) return

                const currentIndex = focusable.indexOf(document.activeElement)
                let nextIndex

                if (e.shiftKey) {
                    nextIndex = currentIndex > 0 ? currentIndex - 1 : focusable.length - 1
                } else {
                    nextIndex = currentIndex < focusable.length - 1 ? currentIndex + 1 : 0
                }

                focusable[nextIndex]?.focus()
            }
        }

        // Block ALL scroll events from reaching background
        const blockScroll = (e) => {
            e.preventDefault()
            e.stopPropagation()
        }

        // Capture phase to intercept before anything else
        window.addEventListener('keydown', handleKeyDown, true)
        document.addEventListener('scroll', blockScroll, true)

        // Focus first element
        setTimeout(() => {
            firstFocusableRef.current?.focus()
        }, 50)

        return () => {
            window.removeEventListener('keydown', handleKeyDown, true)
            document.removeEventListener('scroll', blockScroll, true)
        }
    }, [showPicker, onClose])

    // Fetch rules and settings
    const fetchRules = async () => {
        setLoading(true)
        try {
            const res = await fetch(getApiUrl('/api/autodownload/rules'))
            const data = await res.json()
            setSettings(data.settings || { enabled: false, intervalMinutes: 720 })
            setRules(data.rules || [])
        } catch (err) {
            console.error('[AutoDownload] Fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRules()
    }, [serverUrl])

    // Toggle global enable/disable
    const toggleEnabled = async () => {
        try {
            const res = await fetch(getApiUrl('/api/autodownload/settings'), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !settings.enabled })
            })
            const data = await res.json()
            setSettings(data)
        } catch (err) {
            console.error('[AutoDownload] Toggle error:', err)
        }
    }

    // Update interval
    const updateInterval = async (minutes) => {
        try {
            const res = await fetch(getApiUrl('/api/autodownload/settings'), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ intervalMinutes: parseInt(minutes, 10) })
            })
            const data = await res.json()
            setSettings(data)
        } catch (err) {
            console.error('[AutoDownload] Interval error:', err)
        }
    }

    // Add new rule
    const addRule = async () => {
        if (!newRule.query.trim()) return
        try {
            const res = await fetch(getApiUrl('/api/autodownload/rules'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRule)
            })
            await res.json()
            setNewRule({ query: '', resolution: '2160', group: '', lastEpisode: 0 })
            fetchRules()
        } catch (err) {
            console.error('[AutoDownload] Add rule error:', err)
        }
    }

    // Add rule from torrent picker
    const addFromTorrent = (series) => {
        setNewRule({
            query: series.name.replace(/\./g, ' ').split(/[-\[\(]/)[0].trim(),
            resolution: series.resolution || '2160',
            group: '',
            lastEpisode: series.lastEpisode
        })
        setShowPicker(false)
    }

    // Delete rule
    const deleteRule = async (id) => {
        if (!confirm('Удалить это правило?')) return
        try {
            await fetch(getApiUrl(`/api/autodownload/rules/${id}`), { method: 'DELETE' })
            fetchRules()
        } catch (err) {
            console.error('[AutoDownload] Delete error:', err)
        }
    }

    // Toggle rule enabled
    const toggleRule = async (rule) => {
        try {
            await fetch(getApiUrl(`/api/autodownload/rules/${rule.id}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !rule.enabled })
            })
            fetchRules()
        } catch (err) {
            console.error('[AutoDownload] Toggle rule error:', err)
        }
    }

    // Manual check
    const runCheck = async () => {
        setChecking(true)
        setLastResult(null)
        try {
            const res = await fetch(getApiUrl('/api/autodownload/check'), { method: 'POST' })
            const data = await res.json()
            setLastResult(data)
            fetchRules()
        } catch (err) {
            console.error('[AutoDownload] Check error:', err)
            setLastResult({ error: err.message })
        } finally {
            setChecking(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                ref={panelRef}
                className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        📺 Авто-загрузка сериалов
                    </h2>
                    <FocusableButton
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-2xl p-2 rounded-lg"
                        tabIndex={0}
                    >
                        ✕
                    </FocusableButton>
                </div>

                {/* Content - scrollable */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Global Settings */}
                    <div className="bg-gray-800/50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <div className="font-bold text-white">Автоматическая проверка</div>
                                <div className="text-sm text-gray-400">
                                    Поиск новых серий каждые {settings.intervalMinutes >= 60
                                        ? `${Math.round(settings.intervalMinutes / 60)} ч`
                                        : `${settings.intervalMinutes} мин`}
                                </div>
                            </div>
                            <FocusableButton
                                ref={firstFocusableRef}
                                onClick={toggleEnabled}
                                className={`w-14 h-8 rounded-full transition-colors relative ${settings.enabled ? 'bg-green-600' : 'bg-gray-600'
                                    }`}
                                tabIndex={0}
                            >
                                <div className={`absolute w-6 h-6 bg-white rounded-full top-1 transition-all ${settings.enabled ? 'left-7' : 'left-1'
                                    }`} />
                            </FocusableButton>
                        </div>

                        {/* Interval Selector */}
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                            <span className="text-gray-400">Интервал:</span>
                            {[
                                { value: 360, label: '6 ч' },
                                { value: 720, label: '12 ч' },
                                { value: 1440, label: '24 ч' }
                            ].map(opt => (
                                <FocusableButton
                                    key={opt.value}
                                    onClick={() => updateInterval(opt.value)}
                                    className={`px-3 py-1 rounded ${settings.intervalMinutes === opt.value
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                    tabIndex={0}
                                >
                                    {opt.label}
                                </FocusableButton>
                            ))}
                        </div>
                    </div>

                    {/* Manual Check Button */}
                    <FocusableButton
                        onClick={runCheck}
                        disabled={checking}
                        className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                        tabIndex={0}
                    >
                        {checking ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                Проверяем...
                            </>
                        ) : (
                            <>🔍 Проверить сейчас</>
                        )}
                    </FocusableButton>

                    {/* Last Result */}
                    {lastResult && (
                        <div className={`rounded-xl p-3 text-sm ${lastResult.downloaded > 0
                            ? 'bg-green-900/50 text-green-300'
                            : lastResult.error
                                ? 'bg-red-900/50 text-red-300'
                                : 'bg-gray-800 text-gray-400'
                            }`}>
                            {lastResult.error
                                ? `❌ Ошибка: ${lastResult.error}`
                                : lastResult.downloaded > 0
                                    ? `✅ Найдено и добавлено: ${lastResult.downloaded} серий`
                                    : '✓ Новых серий не найдено'
                            }
                        </div>
                    )}

                    {/* Add New Rule */}
                    <div className="bg-gray-800/50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-white">➕ Добавить сериал</h3>
                            {seriesList.length > 0 && (
                                <FocusableButton
                                    onClick={() => setShowPicker(!showPicker)}
                                    className="bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 px-3 py-1 rounded-lg text-sm"
                                    tabIndex={0}
                                >
                                    📋 Выбрать ({seriesList.length})
                                </FocusableButton>
                            )}
                        </div>

                        {/* Picker Modal */}
                        {showPicker && (
                            <div className="mb-4 bg-gray-700/50 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                                <div className="text-sm text-gray-400 mb-2">Выберите сериал:</div>
                                {seriesList.map((series, idx) => (
                                    <FocusableButton
                                        key={idx}
                                        onClick={() => addFromTorrent(series)}
                                        className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg p-3"
                                        tabIndex={0}
                                        autoFocus={idx === 0}
                                    >
                                        <div className="font-medium text-white truncate">{series.name}</div>
                                        <div className="text-xs text-gray-400">
                                            {series.episodeCount} серий • Последняя: {series.lastEpisode}
                                            {series.resolution && ` • ${series.resolution}p`}
                                        </div>
                                    </FocusableButton>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <input
                                value={newRule.query}
                                onChange={(e) => setNewRule({ ...newRule, query: e.target.value })}
                                placeholder="Название сериала..."
                                tabIndex={0}
                                className="col-span-2 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <select
                                value={newRule.resolution}
                                onChange={(e) => setNewRule({ ...newRule, resolution: e.target.value })}
                                tabIndex={0}
                                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Любое качество</option>
                                <option value="2160">4K (2160p)</option>
                                <option value="1080">1080p</option>
                                <option value="720">720p</option>
                            </select>
                            <input
                                type="number"
                                min="0"
                                value={newRule.lastEpisode}
                                onChange={(e) => setNewRule({ ...newRule, lastEpisode: parseInt(e.target.value, 10) || 0 })}
                                placeholder="Последняя серия"
                                tabIndex={0}
                                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <FocusableButton
                            onClick={addRule}
                            disabled={!newRule.query.trim()}
                            className="mt-3 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2 rounded-lg"
                            tabIndex={0}
                        >
                            Добавить
                        </FocusableButton>
                    </div>

                    {/* Rules List */}
                    <div className="space-y-2">
                        <h3 className="font-bold text-white">📋 Мои сериалы ({rules.length})</h3>
                        {loading ? (
                            <div className="text-center text-gray-500 py-8">Загрузка...</div>
                        ) : rules.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                                Добавьте сериал для отслеживания
                            </div>
                        ) : (
                            rules.map((rule) => (
                                <div
                                    key={rule.id}
                                    className={`bg-gray-800 rounded-xl p-3 flex items-center gap-3 ${!rule.enabled ? 'opacity-50' : ''
                                        }`}
                                >
                                    <FocusableButton
                                        onClick={() => toggleRule(rule)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${rule.enabled ? 'bg-green-600' : 'bg-gray-600'
                                            }`}
                                        tabIndex={0}
                                    >
                                        {rule.enabled ? '✓' : '○'}
                                    </FocusableButton>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white truncate">{rule.query}</div>
                                        <div className="text-xs text-gray-400">
                                            {rule.resolution && `${rule.resolution}p • `}
                                            Серия: {rule.lastEpisode}
                                        </div>
                                    </div>
                                    <FocusableButton
                                        onClick={() => deleteRule(rule.id)}
                                        className="text-red-500 hover:text-red-400 p-2 text-xl"
                                        tabIndex={0}
                                    >
                                        🗑️
                                    </FocusableButton>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

```

### client/src/components/Poster.jsx
```jsx
/**
 * Poster Component - Torrent card with dynamic poster loading
 * Stage 6: Added enriched metadata caching (separate from poster cache)
 */
import { useState, useEffect } from 'react'
import { CapacitorHttp } from '@capacitor/core'
import { Capacitor } from '@capacitor/core'
import { cleanTitle, formatSize, formatSpeed, formatEta, getGradient } from '../utils/helpers'

// ─── Metadata Cache ───────────────────────────────────────────
// Separate from poster cache to avoid breaking existing functionality
const METADATA_CACHE_PREFIX = 'metadata_v1_'
const METADATA_CACHE_LIMIT = 300

/**
 * Save enriched metadata to localStorage with LRU eviction
 */
const saveMetadata = (name, data) => {
    const key = METADATA_CACHE_PREFIX + name
    const entry = { ...data, timestamp: Date.now() }

    try {
        localStorage.setItem(key, JSON.stringify(entry))

        // LRU Eviction: check cache size periodically
        const allKeys = Object.keys(localStorage).filter(k => k.startsWith(METADATA_CACHE_PREFIX))
        if (allKeys.length > METADATA_CACHE_LIMIT) {
            // Find oldest entries
            const entries = allKeys.map(k => {
                try {
                    const val = JSON.parse(localStorage.getItem(k))
                    return { key: k, timestamp: val?.timestamp || 0 }
                } catch { return { key: k, timestamp: 0 } }
            })
            entries.sort((a, b) => a.timestamp - b.timestamp)

            // Remove oldest 10%
            const toRemove = Math.ceil(METADATA_CACHE_LIMIT * 0.1)
            entries.slice(0, toRemove).forEach(e => localStorage.removeItem(e.key))
            console.log(`[Metadata] LRU eviction: removed ${toRemove} oldest entries`)
        }
    } catch (e) {
        console.warn('[Metadata] Failed to save:', e)
    }
}

/**
 * Get cached metadata for a title
 * @param {string} name - Cleaned movie/show name
 * @returns {object|null} - Cached metadata or null
 */
export const getMetadata = (name) => {
    const key = METADATA_CACHE_PREFIX + name
    try {
        const cached = localStorage.getItem(key)
        if (cached) {
            return JSON.parse(cached)
        }
    } catch { }
    return null
}

// ─── Poster Component ─────────────────────────────────────────

const Poster = ({ name, onClick, progress, peers, isReady, size, downloadSpeed, downloaded, eta, newFilesCount }) => {
    const [bgImage, setBgImage] = useState(null)
    const cleanedName = cleanTitle(name)

    useEffect(() => {
        if (!cleanedName) return

        const cacheKey = `poster_v3_${cleanedName}` // Existing poster cache - DO NOT CHANGE
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
            setBgImage(cached)
            return
        }

        const fetchPoster = async () => {
            try {
                let result = null
                const query = encodeURIComponent(cleanedName)
                const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
                const KP_API_KEY = import.meta.env.VITE_KP_API_KEY
                const CUSTOM_PROXY = import.meta.env.VITE_TMDB_PROXY_URL

                // 1️⃣ Custom Cloudflare Worker (приоритетный, ваш личный прокси)
                if (!result && CUSTOM_PROXY) {
                    try {
                        // Worker format: /search/multi?api_key=...&query=... (Worker adds /3 prefix)
                        const proxyUrl = `${CUSTOM_PROXY}/search/multi?api_key=${TMDB_API_KEY}&query=${query}&language=ru-RU`
                        console.log('[Poster] Custom Proxy:', cleanedName)

                        const res = await fetch(proxyUrl)
                        if (res.ok) {
                            const data = await res.json()
                            result = data.results?.find(r => r.poster_path)
                        }
                    } catch (customErr) {
                        console.warn('[Poster] Custom proxy failed:', customErr)
                    }
                }

                // 2️⃣ Lampa Proxy (apn-latest.onrender.com) — fallback
                if (!result) {
                    try {
                        // Lampa proxy expects: https://proxy/https://api.themoviedb.org/...
                        const targetUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${query}&language=ru-RU`
                        const lampaUrl = `https://apn-latest.onrender.com/${targetUrl}`
                        console.log('[Poster] Lampa Proxy:', cleanedName)

                        const res = await fetch(lampaUrl)
                        if (res.ok) {
                            const data = await res.json()
                            result = data.results?.find(r => r.poster_path)
                        }
                    } catch (lampaErr) {
                        console.warn('[Poster] Lampa proxy failed:', lampaErr)
                    }
                }

                // 3️⃣ Fallback: CapacitorHttp (Android, требует VPN/DNS)
                if (!result && Capacitor.isNativePlatform()) {
                    try {
                        const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${query}&language=ru-RU`
                        console.log('[Poster] Native Search:', cleanedName)
                        const response = await CapacitorHttp.get({ url: searchUrl })
                        if (response.data && response.data.results) {
                            result = response.data.results.find(r => r.poster_path)
                        }
                    } catch (nativeErr) {
                        console.warn('[Poster] Native request failed:', nativeErr)
                    }
                }

                // 4️⃣ Fallback: corsproxy.io (браузер)
                if (!result) {
                    try {
                        const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${query}&language=ru-RU`
                        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(searchUrl)}`
                        console.log('[Poster] CorsProxy:', cleanedName)
                        const res = await fetch(proxyUrl)
                        if (res.ok) {
                            const data = await res.json()
                            result = data.results?.find(r => r.poster_path)
                        }
                    } catch (proxyErr) {
                        console.warn('[Poster] CorsProxy failed:', proxyErr)
                    }
                }

                // 5️⃣ Fallback: Кинопоиск API (альтернатива TMDB)
                let kpPoster = null
                let kpData = null
                if (!result && KP_API_KEY) {
                    try {
                        const kpProxy = 'https://cors.kp556.workers.dev:8443/'
                        const kpUrl = `${kpProxy}https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${query}`
                        console.log('[Poster] Kinopoisk:', cleanedName)

                        const res = await fetch(kpUrl, {
                            headers: { 'X-API-KEY': KP_API_KEY }
                        })
                        if (res.ok) {
                            const data = await res.json()
                            const kpFilm = data.films?.find(f => f.posterUrlPreview)
                            if (kpFilm) {
                                kpPoster = kpFilm.posterUrlPreview
                                kpData = kpFilm
                                console.log('[Poster] Kinopoisk Found:', cleanedName, kpFilm.nameRu || kpFilm.nameEn)
                            }
                        }
                    } catch (kpErr) {
                        console.warn('[Poster] Kinopoisk failed:', kpErr)
                    }
                }

                // ─── Save poster + enriched metadata ───
                if (result) {
                    const directUrl = `https://wsrv.nl/?url=ssl:image.tmdb.org/t/p/w500${result.poster_path}&output=webp`
                    localStorage.setItem(cacheKey, directUrl)
                    setBgImage(directUrl)
                    console.log('[Poster] Found:', cleanedName, result.title || result.name)

                    // 🆕 Save enriched metadata (Stage 6)
                    const backdropUrl = result.backdrop_path
                        ? `https://wsrv.nl/?url=ssl:image.tmdb.org/t/p/w1280${result.backdrop_path}&output=webp`
                        : null

                    saveMetadata(cleanedName, {
                        poster: directUrl,
                        backdrop: backdropUrl,
                        overview: result.overview || null,
                        rating: result.vote_average || null,
                        year: (result.release_date || result.first_air_date || '').substring(0, 4) || null,
                        title: result.title || result.name || cleanedName,
                        source: 'tmdb'
                    })

                } else if (kpPoster) {
                    const kpUrl = `https://wsrv.nl/?url=${encodeURIComponent(kpPoster)}&output=webp`
                    localStorage.setItem(cacheKey, kpUrl)
                    setBgImage(kpUrl)

                    // 🆕 Save Kinopoisk metadata (Stage 6)
                    if (kpData) {
                        saveMetadata(cleanedName, {
                            poster: kpUrl,
                            backdrop: null, // KP doesn't provide backdrop in search
                            overview: kpData.description || null,
                            rating: kpData.rating || kpData.ratingKinopoisk || null,
                            year: kpData.year ? String(kpData.year) : null,
                            title: kpData.nameRu || kpData.nameEn || cleanedName,
                            source: 'kinopoisk'
                        })
                    }
                } else {
                    console.log('[Poster] Not found:', cleanedName)
                }
            } catch (err) {
                console.warn('[Poster] Error:', cleanedName, err)
            }
        }

        // Рандомная задержка (0-2 сек) чтобы не бомбить API при загрузке списка
        const timer = setTimeout(fetchPoster, Math.random() * 2000)
        return () => clearTimeout(timer)
    }, [cleanedName])

    return (
        <button
            onClick={onClick}
            className={`
          relative group aspect-[2/3] rounded-xl overflow-hidden shadow-xl
          transition-all duration-300
          focus:scale-105 focus:ring-4 focus:ring-blue-500 focus:z-20 outline-none
          hover:scale-105
          bg-gray-800
        `}
            style={{ background: !bgImage ? getGradient(name) : undefined }}
        >
            {/* If we have an image, show it. Otherwise show decorative gradient elements. */}
            {bgImage ? (
                <img
                    src={bgImage}
                    alt={name}
                    className="w-full h-full object-cover transition-opacity duration-500"
                    onError={() => setBgImage(null)} // Revert to gradient on load error
                />
            ) : (
                <>
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-10 -left-10 w-24 h-24 bg-black/20 rounded-full blur-xl pointer-events-none" />
                    <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                        <h3 className="text-gray-100 font-bold text-lg leading-snug drop-shadow-lg line-clamp-4 font-sans tracking-wide">
                            {cleanedName || name}
                        </h3>
                    </div>
                </>
            )}

            {/* Overlay for Stats */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/10 flex flex-col justify-end p-3 text-left">
                {/* Status Badge */}
                <div className="absolute top-2 right-2 flex gap-1">
                    {newFilesCount > 0 && (
                        <span className="bg-purple-500 text-white text-[10px] font-black tracking-wider px-2 py-0.5 rounded shadow-sm animate-pulse">
                            🆕 {newFilesCount} NEW
                        </span>
                    )}
                    {isReady ? (
                        <span className="bg-green-500 text-white text-[10px] font-black tracking-wider px-2 py-0.5 rounded shadow-sm">READY</span>
                    ) : (
                        <span className="bg-yellow-500 text-black text-[10px] font-black tracking-wider px-2 py-0.5 rounded shadow-sm">{Math.round(progress * 100)}%</span>
                    )}
                </div>

                {/* Footer Stats */}
                <div className="text-xs text-gray-400 flex flex-col gap-1 mt-auto">
                    {/* Download progress info */}
                    {!isReady && downloaded > 0 && (
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-blue-400">
                                {formatSize(downloaded)} / {formatSize(size)}
                            </span>
                            {eta > 0 && (
                                <span className="text-yellow-400">⏱ {formatEta(eta)}</span>
                            )}
                        </div>
                    )}

                    {/* Stats row */}
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>
                            {peers}
                        </span>
                        {isReady && size > 0 && (
                            <span className="text-gray-500">{formatSize(size)}</span>
                        )}
                        {!isReady && downloadSpeed > 0 && (
                            <span className="text-green-400">↓{formatSpeed(downloadSpeed)}</span>
                        )}
                    </div>

                    {/* Progress bar */}
                    {!isReady && progress > 0 && (
                        <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div style={{ width: `${progress * 100}%` }} className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300" />
                        </div>
                    )}
                </div>
            </div>
        </button>
    )
}

export default Poster

```

### client/src/components/TorrentModal.jsx
```jsx
/**
 * TorrentModal Component - File list and playback controls
 * Stage 6.4: Fixed episode list navigation - proper focus chain
 */
import { useState, useEffect, useRef } from 'react'
import { cleanTitle, formatSize } from '../utils/helpers'
import { getMetadata } from './Poster'

const RatingBadge = ({ rating }) => {
    if (!rating || rating === 0) return null
    const color = rating >= 7 ? 'bg-green-600' : rating >= 5 ? 'bg-yellow-600' : 'bg-red-600'
    return (
        <span className={`${color} text-white text-sm font-bold px-2 py-0.5 rounded`}>
            ⭐ {typeof rating === 'number' ? rating.toFixed(1) : rating}
        </span>
    )
}

const TorrentModal = ({
    torrent,
    onClose,
    onPlay,
    onPlayAll,
    onCopyUrl,
    onDelete
}) => {
    const [showFullOverview, setShowFullOverview] = useState(false)
    const [metadata, setMetadata] = useState(null)
    const [episodesExpanded, setEpisodesExpanded] = useState(false)

    // Refs
    const playBtnRef = useRef(null)
    const playAllBtnRef = useRef(null)
    const episodeListRef = useRef(null)
    const episodeRefs = useRef([])
    const expandBtnRef = useRef(null)
    const copyBtnRef = useRef(null)
    const deleteBtnRef = useRef(null)

    useEffect(() => {
        if (torrent?.name) {
            const cached = getMetadata(cleanTitle(torrent.name))
            if (cached) setMetadata(cached)
        }
    }, [torrent?.name])

    if (!torrent) return null

    const videoFiles = torrent.files?.filter(f => /\.(mp4|mkv|avi|mov|webm)$/i.test(f.name)) || []
    const sortedVideos = [...videoFiles].sort((a, b) => a.name.localeCompare(b.name))
    const firstVideo = videoFiles[0] || torrent.files?.[0]
    const cleanedName = cleanTitle(torrent.name)

    const backdropStyle = metadata?.backdrop
        ? { backgroundImage: `url(${metadata.backdrop})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { background: 'linear-gradient(135deg, #1e3a8a 0%, #1f2937 100%)' }

    const INITIAL_EPISODES = 8
    const visibleEpisodes = episodesExpanded ? sortedVideos : sortedVideos.slice(0, INITIAL_EPISODES)
    const hasMoreEpisodes = sortedVideos.length > INITIAL_EPISODES && !episodesExpanded

    // Navigation handlers
    const handlePlayKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (videoFiles.length > 1) {
                playAllBtnRef.current?.focus()
            } else if (copyBtnRef.current) {
                copyBtnRef.current.focus()
            }
        }
    }

    const handlePlayAllKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            // Focus first episode in list
            if (episodeRefs.current[0]) {
                episodeRefs.current[0].focus()
            } else {
                copyBtnRef.current?.focus()
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            playBtnRef.current?.focus()
        }
    }

    const handleEpisodeKeyDown = (e, idx) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (idx < visibleEpisodes.length - 1) {
                episodeRefs.current[idx + 1]?.focus()
            } else if (hasMoreEpisodes) {
                expandBtnRef.current?.focus()
            } else {
                copyBtnRef.current?.focus()
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (idx > 0) {
                episodeRefs.current[idx - 1]?.focus()
            } else {
                playAllBtnRef.current?.focus() || playBtnRef.current?.focus()
            }
        } else if (e.key === 'Enter') {
            e.preventDefault()
            const file = sortedVideos[idx]
            if (file) onPlay(torrent.infoHash, file.index, file.name)
        }
    }

    const handleExpandKeyDown = (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault()
            const lastIdx = visibleEpisodes.length - 1
            if (lastIdx >= 0) episodeRefs.current[lastIdx]?.focus()
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            copyBtnRef.current?.focus()
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setEpisodesExpanded(true)
            // Focus first newly visible episode after expand
            setTimeout(() => {
                if (episodeRefs.current[INITIAL_EPISODES]) {
                    episodeRefs.current[INITIAL_EPISODES].focus()
                }
            }, 50)
        }
    }

    const handleCopyKeyDown = (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (hasMoreEpisodes) {
                expandBtnRef.current?.focus()
            } else if (episodeRefs.current.length > 0) {
                episodeRefs.current[visibleEpisodes.length - 1]?.focus()
            } else if (playAllBtnRef.current) {
                playAllBtnRef.current.focus()
            } else {
                playBtnRef.current?.focus()
            }
        } else if (e.key === 'ArrowRight') {
            e.preventDefault()
            deleteBtnRef.current?.focus()
        }
    }

    const handleDeleteKeyDown = (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault()
            copyBtnRef.current?.focus()
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            copyBtnRef.current?.focus()
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-[#181818] rounded-2xl w-full max-w-lg max-h-[85vh] shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Fixed Header */}
                <div
                    className="h-32 shrink-0 relative flex items-end overflow-hidden rounded-t-2xl"
                    style={backdropStyle}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 bg-black/50 rounded-full w-8 h-8 text-white 
                                   hover:bg-black/70 focus:ring-2 focus:ring-white focus:outline-none"
                    >✕</button>
                    <div className="relative z-10 p-4 w-full">
                        <div className="flex gap-2 mb-1">
                            <RatingBadge rating={metadata?.rating} />
                            {metadata?.year && <span className="bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded">{metadata.year}</span>}
                        </div>
                        <h2 className="text-lg font-bold text-white drop-shadow-lg line-clamp-2">{metadata?.title || cleanedName}</h2>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                    {metadata?.overview && (
                        <div className="mb-3">
                            <p className={`text-xs text-gray-400 ${showFullOverview ? '' : 'line-clamp-2'}`}>{metadata.overview}</p>
                            {metadata.overview.length > 80 && (
                                <button onClick={() => setShowFullOverview(!showFullOverview)} className="text-purple-400 text-xs">{showFullOverview ? '← Свернуть' : 'Ещё →'}</button>
                            )}
                        </div>
                    )}

                    {/* Play button */}
                    <button
                        ref={playBtnRef}
                        autoFocus
                        onClick={() => firstVideo && onPlay(torrent.infoHash, firstVideo.index, firstVideo.name)}
                        onKeyDown={handlePlayKeyDown}
                        className="w-full bg-white text-black py-3 rounded font-bold focus:bg-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:outline-none mb-2"
                    >▶ Play</button>

                    {/* Play All */}
                    {videoFiles.length > 1 && (
                        <button
                            ref={playAllBtnRef}
                            onClick={() => onPlayAll(torrent)}
                            onKeyDown={handlePlayAllKeyDown}
                            className="w-full bg-blue-600 text-white py-2 rounded font-bold focus:bg-blue-500 focus:ring-2 focus:ring-blue-400 focus:outline-none mb-2"
                        >📺 Play All ({videoFiles.length})</button>
                    )}

                    {/* Episode List */}
                    {videoFiles.length > 1 && (
                        <div ref={episodeListRef} className="bg-gray-900 rounded-lg overflow-hidden mb-2">
                            <div className="px-3 py-2 bg-gray-800 text-gray-400 text-sm flex items-center justify-between">
                                <span>📋 Серии ({videoFiles.length})</span>
                            </div>

                            <div className="max-h-[28vh] overflow-y-auto">
                                {visibleEpisodes.map((file, idx) => (
                                    <button
                                        key={file.index}
                                        ref={el => episodeRefs.current[idx] = el}
                                        onClick={() => onPlay(torrent.infoHash, file.index, file.name)}
                                        onKeyDown={(e) => handleEpisodeKeyDown(e, idx)}
                                        className="w-full px-3 py-2 text-left border-t border-gray-800 
                                                   hover:bg-gray-800 focus:bg-blue-600 focus:text-white focus:outline-none 
                                                   flex items-center gap-2 text-sm"
                                    >
                                        <span className="text-blue-400 font-mono text-xs w-5">{idx + 1}</span>
                                        <span className="flex-1 text-gray-300 truncate">{cleanTitle(file.name) || file.name}</span>
                                        <span className="text-xs text-gray-500">{formatSize(file.length)}</span>
                                    </button>
                                ))}

                                {hasMoreEpisodes && (
                                    <button
                                        ref={expandBtnRef}
                                        onClick={() => setEpisodesExpanded(true)}
                                        onKeyDown={handleExpandKeyDown}
                                        className="w-full px-3 py-2 text-center text-purple-400 text-sm border-t border-gray-800
                                                   hover:bg-gray-800 focus:bg-purple-900 focus:text-white focus:outline-none"
                                    >▼ Ещё {sortedVideos.length - INITIAL_EPISODES} серий</button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Fixed Footer */}
                <div className="shrink-0 p-4 pt-2 flex gap-2 border-t border-gray-800">
                    <button
                        ref={copyBtnRef}
                        onClick={() => firstVideo && onCopyUrl(torrent.infoHash, firstVideo.index)}
                        onKeyDown={handleCopyKeyDown}
                        className="flex-1 bg-gray-800 text-gray-300 py-2.5 rounded font-medium focus:ring-2 focus:ring-gray-400 focus:outline-none text-sm"
                    >📋 Copy</button>
                    <button
                        ref={deleteBtnRef}
                        onClick={() => onDelete(torrent.infoHash)}
                        onKeyDown={handleDeleteKeyDown}
                        className="flex-1 bg-red-900/50 text-red-400 py-2.5 rounded font-medium focus:ring-2 focus:ring-red-400 focus:outline-none text-sm"
                    >🗑 Delete</button>
                </div>
            </div>
        </div>
    )
}

export default TorrentModal

```

### client/src/components/SearchPanel.jsx
```jsx
/**
 * SearchPanel Component - Unified Search UI (API v2)
 * Stage 6: TV Navigation Hook, Enhanced Provider Status, Accessibility
 */

import { useState, useEffect, useRef } from 'react'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import { useTVNavigation } from '../hooks/useTVNavigation'

// ─── Helper Functions ─────────────────────────────────────────

const formatRelativeDate = (timestamp) => {
    if (!timestamp) return null
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return 'только что'
    if (minutes < 60) return `${minutes} мин`
    if (hours < 24) return `${hours} ч`
    if (days < 7) return `${days} дн`
    return new Date(timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

const getProviderInfo = (status, count) => {
    if (count > 0) return { icon: '✅', style: 'bg-green-900/40 text-green-400 border-green-500/40', label: 'OK' }
    switch (status) {
        case 'ok': return { icon: '✅', style: 'bg-green-900/30 text-green-400 border-green-500/30', label: 'OK' }
        case 'timeout': return { icon: '⏱️', style: 'bg-yellow-900/40 text-yellow-400 border-yellow-500/40', label: 'Timeout' }
        case 'circuit_open': return { icon: '🔒', style: 'bg-gray-800/50 text-gray-500 border-gray-600/30', label: 'Disabled' }
        case 'error': return { icon: '❌', style: 'bg-red-900/40 text-red-400 border-red-500/40', label: 'Error' }
        default: return { icon: '○', style: 'bg-gray-800/30 text-gray-400 border-gray-600/30', label: 'Unknown' }
    }
}

const getTagStyle = (tag) => {
    const styles = {
        '2160p': 'bg-purple-900/50 text-purple-300 border-purple-500/30',
        '1080p': 'bg-blue-900/50 text-blue-300 border-blue-500/30',
        '720p': 'bg-gray-700/50 text-gray-300 border-gray-500/30',
        'hevc': 'bg-green-900/50 text-green-300 border-green-500/30',
        'hdr': 'bg-yellow-900/50 text-yellow-300 border-yellow-500/30',
        'dv': 'bg-pink-900/50 text-pink-300 border-pink-500/30',
        'cam': 'bg-red-900/50 text-red-300 border-red-500/30'
    }
    return styles[tag] || 'bg-gray-700/50 text-gray-400 border-gray-500/30'
}

// ─── Main Component ───────────────────────────────────────────

const SearchPanel = ({
    searchQuery,
    onSearchQueryChange,
    onSearch,
    onClose,
    onAddTorrent,
    searchResults,
    searchLoading,
    providers = {}
}) => {
    const [activeFilters, setActiveFilters] = useState([])
    const [sortBy, setSortBy] = useState('seeders')
    const [isListening, setIsListening] = useState(false)
    const [voiceAvailable, setVoiceAvailable] = useState(false)
    const [providerTooltip, setProviderTooltip] = useState(null)

    // Refs for navigation
    const inputRef = useRef(null)
    const micBtnRef = useRef(null)
    const searchBtnRef = useRef(null)
    const closeBtnRef = useRef(null)
    const resultRefs = useRef([])

    // Filter and sort
    const filteredResults = searchResults.filter(r => {
        if (activeFilters.length === 0) return true
        return activeFilters.every(filter => (r.tags || []).includes(filter))
    })

    const sortedResults = [...filteredResults].sort((a, b) => {
        switch (sortBy) {
            case 'seeders': return (b.seeders || 0) - (a.seeders || 0)
            case 'size': return (b.sizeBytes || 0) - (a.sizeBytes || 0)
            case 'date': return (b.dateTs || 0) - (a.dateTs || 0)
            default: return 0
        }
    })

    const availableTags = [...new Set(searchResults.flatMap(r => r.tags || []))]
    const filterOptions = ['2160p', '1080p', '720p', 'hevc', 'hdr'].filter(t => availableTags.includes(t))

    // Provider status analysis
    const providerEntries = Object.entries(providers)
    const allFailed = providerEntries.length > 0 && providerEntries.every(([, data]) =>
        data.status === 'error' || data.status === 'timeout' || data.status === 'circuit_open'
    )

    // TV Navigation for results
    const { focusedIndex, handleKeyDown: handleResultsKeyDown, isFocused } = useTVNavigation({
        itemCount: sortedResults.length,
        columns: 1,
        onSelect: (idx) => {
            const r = sortedResults[idx]
            if (r) onAddTorrent(r.magnet || r.id, r.title)
        },
        onBack: onClose,
        itemRefs: resultRefs,
        trapFocus: true
    })

    // Voice recognition
    useEffect(() => {
        const checkVoice = async () => {
            try {
                const { available } = await SpeechRecognition.available()
                setVoiceAvailable(available)
                if (available) await SpeechRecognition.requestPermissions()
            } catch { setVoiceAvailable(false) }
        }
        checkVoice()
    }, [])

    // Reset refs when results change
    useEffect(() => {
        resultRefs.current = []
    }, [searchResults, activeFilters])

    const startVoiceSearch = async () => {
        if (!voiceAvailable) {
            const query = prompt('🎤 Введите запрос:')
            if (query?.trim()) {
                onSearchQueryChange(query.trim())
                setTimeout(() => onSearch(), 200)
            }
            return
        }

        try {
            setIsListening(true)
            const result = await SpeechRecognition.start({
                language: 'ru-RU', maxResults: 1,
                prompt: 'Произнесите название', partialResults: false, popup: true
            })
            setIsListening(false)

            if (result.matches?.[0]) {
                const transcript = result.matches[0].trim()
                if (transcript) {
                    onSearchQueryChange(transcript)
                    setTimeout(() => onSearch(), 300)
                }
            }
        } catch { setIsListening(false) }
    }

    const toggleFilter = (filter) => {
        setActiveFilters(prev => prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter])
    }

    // Input and button navigation
    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            onSearch()
        } else if (e.key === 'ArrowRight' && e.target.selectionStart === e.target.value.length) {
            e.preventDefault()
            micBtnRef.current?.focus()
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (sortedResults.length > 0) resultRefs.current[0]?.focus()
        }
    }

    const handleBtnKeyDown = (e, prevRef, nextRef) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault()
            prevRef?.current?.focus()
        } else if (e.key === 'ArrowRight' && nextRef) {
            e.preventDefault()
            nextRef.current?.focus()
        } else if (e.key === 'ArrowDown' && sortedResults.length > 0) {
            e.preventDefault()
            resultRefs.current[0]?.focus()
        }
    }

    return (
        <div className="mb-6 p-4 bg-gray-900 rounded-xl border border-purple-600/50">
            {/* Search Row */}
            <div className="flex gap-2 mb-4">
                <input
                    ref={inputRef}
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Поиск торрентов..."
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 
                               focus:ring-2 focus:ring-purple-500 outline-none"
                    autoFocus
                    aria-label="Поиск торрентов"
                />
                <button
                    ref={micBtnRef}
                    onClick={startVoiceSearch}
                    onKeyDown={(e) => handleBtnKeyDown(e, inputRef, searchBtnRef)}
                    className={`px-4 py-3 rounded-lg font-bold focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:outline-none
                               ${isListening ? 'bg-red-600 focus:ring-red-400 animate-pulse' : 'bg-gray-700 focus:ring-purple-400'}`}
                    aria-label="Голосовой поиск"
                >🎤</button>
                <button
                    ref={searchBtnRef}
                    onClick={onSearch}
                    onKeyDown={(e) => handleBtnKeyDown(e, micBtnRef, closeBtnRef)}
                    disabled={searchLoading}
                    className="bg-purple-600 px-6 py-3 rounded-lg font-bold disabled:opacity-50 
                               focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-400 focus:outline-none"
                    aria-label="Искать"
                >{searchLoading ? '...' : '🔍'}</button>
                <button
                    ref={closeBtnRef}
                    onClick={onClose}
                    onKeyDown={(e) => handleBtnKeyDown(e, searchBtnRef, null)}
                    className="bg-gray-800 px-4 rounded-lg focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-400 focus:outline-none"
                    aria-label="Закрыть поиск"
                >✕</button>
            </div>

            {/* Provider Status with Tooltips */}
            {providerEntries.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 text-xs">
                    {providerEntries.map(([name, data]) => {
                        const info = getProviderInfo(data.status, data.count || 0)
                        const hasError = data.status === 'error' || data.status === 'timeout'

                        return (
                            <button
                                key={name}
                                onClick={() => hasError && setProviderTooltip(providerTooltip === name ? null : name)}
                                className={`px-2 py-1 rounded-full border ${info.style} 
                                           ${hasError ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
                                           focus:outline-none focus:ring-1 focus:ring-white/50`}
                                aria-label={`${name}: ${info.label}`}
                            >
                                {info.icon} {name}
                                {data.count > 0 && <span className="ml-1">({data.count})</span>}
                            </button>
                        )
                    })}

                    {/* Tooltip for error details */}
                    {providerTooltip && providers[providerTooltip]?.error && (
                        <div className="w-full mt-1 p-2 bg-red-900/30 border border-red-500/30 rounded text-red-300 text-xs">
                            ⚠️ {providerTooltip}: {providers[providerTooltip].error}
                        </div>
                    )}
                </div>
            )}

            {/* All Sources Failed Banner */}
            {allFailed && !searchLoading && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-center">
                    <div className="text-red-400 font-medium">⚠️ Все источники недоступны</div>
                    <p className="text-xs text-red-300/70 mt-1">Проверьте интернет-соединение или настройки VPN</p>
                </div>
            )}

            {/* Filters & Sort */}
            {searchResults.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    {filterOptions.length > 0 && (
                        <>
                            {filterOptions.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleFilter(tag)}
                                    className={`px-2.5 py-1 rounded-full text-xs border 
                                               focus:ring-2 focus:ring-purple-400 focus:outline-none
                                               ${activeFilters.includes(tag)
                                            ? 'bg-purple-600 text-white border-purple-400'
                                            : 'bg-gray-800/50 text-gray-400 border-gray-600/50'}`}
                                    aria-pressed={activeFilters.includes(tag)}
                                    aria-label={`Фильтр ${tag}`}
                                >{tag.toUpperCase()}</button>
                            ))}
                            {activeFilters.length > 0 && (
                                <button onClick={() => setActiveFilters([])} className="text-xs text-gray-500" aria-label="Сбросить фильтры">✕</button>
                            )}
                        </>
                    )}
                    <div className="flex-1" />
                    {['seeders', 'size', 'date'].map(opt => (
                        <button
                            key={opt}
                            onClick={() => setSortBy(opt)}
                            className={`px-2.5 py-1 rounded text-xs focus:ring-2 focus:ring-purple-400 focus:outline-none
                                       ${sortBy === opt ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                            aria-pressed={sortBy === opt}
                        >{opt === 'seeders' ? '⬆' : opt === 'size' ? '📦' : '📅'}</button>
                    ))}
                </div>
            )}

            {/* Results count */}
            {searchResults.length > 0 && (
                <div className="text-xs text-gray-500 mb-2">{sortedResults.length} результатов</div>
            )}

            {/* Results with TV Navigation */}
            {sortedResults.length > 0 && (
                <div
                    className="max-h-[50vh] overflow-y-auto space-y-2 pr-1"
                    onKeyDown={handleResultsKeyDown}
                >
                    {sortedResults.map((r, i) => (
                        <div
                            key={r.id || i}
                            ref={el => resultRefs.current[i] = el}
                            tabIndex={0}
                            className={`flex items-start justify-between p-3 bg-gray-800 rounded-lg cursor-pointer
                                       focus:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:outline-none
                                       ${isFocused(i) ? 'ring-2 ring-purple-500 bg-gray-700' : ''}`}
                            onClick={() => onAddTorrent(r.magnet || r.id, r.title)}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate">{r.title}</div>
                                <div className="text-xs text-gray-400 flex flex-wrap gap-x-3 mt-1">
                                    <span>📀 {r.size}</span>
                                    <span className="text-green-400">⬆ {r.seeders}</span>
                                    {r.tracker && <span className="text-purple-400">{r.tracker}</span>}
                                    {r.dateTs && <span className="text-gray-500">{formatRelativeDate(r.dateTs)}</span>}
                                </div>
                                {r.tags?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {r.tags.map(tag => (
                                            <span key={tag} className={`px-1.5 py-0.5 rounded text-[10px] border ${getTagStyle(tag)}`}>{tag.toUpperCase()}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onAddTorrent(r.magnet || r.id, r.title) }}
                                className="ml-2 bg-green-600 px-2.5 py-1 rounded text-xs font-bold opacity-70 hover:opacity-100"
                                tabIndex={-1}
                                aria-label={`Добавить ${r.title}`}
                            >+</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty states */}
            {searchResults.length > 0 && sortedResults.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                    <button onClick={() => setActiveFilters([])} className="text-purple-400">Сбросить фильтры</button>
                </div>
            )}

            {!searchLoading && searchResults.length === 0 && providerEntries.length > 0 && !allFailed && (
                <div className="text-center text-gray-500 py-6">🔍 Ничего не найдено</div>
            )}

            {searchLoading && (
                <div className="text-center text-gray-400 py-6">
                    <div className="text-3xl mb-2 animate-bounce">🔍</div>
                    <span className="animate-pulse">Поиск...</span>
                </div>
            )}

            {isListening && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="text-center">
                        <div className="text-7xl mb-4 animate-pulse">🎤</div>
                        <p className="text-xl text-white">Говорите...</p>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SearchPanel

```

