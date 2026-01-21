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
import proxyRouter from './routes/proxy.js'

app.use('/api/proxy', proxyRouter)

const TMDB_API_KEY = process.env.TMDB_API_KEY || ''

app.get('/api/tmdb/search', async (req, res) => {
    const { query } = req.query
    if (!query) return res.status(400).json({ error: 'Query required' })

    // Redirect simple search to new proxy if needed, OR keep logic for backward compatibility
    // For now, keeping legacy logic but using smartFetch (which is already implemented)
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
    // Legacy image proxy - keeping for backward compatibility
    // New code should use /api/proxy?url=...
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
// BUG-03: Provider Status API for real-time UI sync
// ─────────────────────────────────────────────────────────────
app.get('/api/providers/status', (req, res) => {
    const status = getProvidersStatus()
    res.json({
        providers: status,
        timestamp: Date.now()
    })
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
