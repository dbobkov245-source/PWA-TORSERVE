// Security: SSL validation enabled globally (see jacred.js for targeted exceptions)

import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import fs from 'fs'
import fsPromises from 'fs/promises'
import { addTorrent, getAllTorrents, getTorrent, getRawTorrent, removeTorrent, restoreTorrents, prioritizeFile, readahead, boostTorrent, destroyAllTorrents, setSpeedMode, getActiveTorrentsCount, getFrozenTorrentsCount, markTorrentFilesSeen } from './torrent.js'
import { db, safeWrite } from './db.js'
import { startWatchdog, stopWatchdog, getServerState } from './watchdog.js'
import { LagMonitor } from './utils/lag-monitor.js'
import { getRules, addRule, updateRule, deleteRule, updateSettings, checkRules } from './autodownloader.js'
import { parseRange } from './utils/range.js'
import { registerInterval, clearAllIntervals } from './utils/intervals.js'
import { getCacheStats } from './imageCache.js'
import { refreshLocalLibrary, getLocalLibrarySnapshot, getLocalFile, deleteLocalEntry } from './localLibrary.js'

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
const RATE_LIMIT_MAX = 300 // 🔥 v2.4: increased from 60 to handle bulk poster loading

// O6: Use registerInterval for graceful shutdown
let rateLimitCleanupId = null

// Cleanup old entries every 5 minutes
rateLimitCleanupId = registerInterval('rateLimitCleanup', () => {
    const now = Date.now()
    for (const [ip, data] of rateLimitMap.entries()) {
        if (now - data.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
            rateLimitMap.delete(ip)
        }
    }
}, 5 * 60 * 1000)

app.use('/api/', (req, res, next) => {
    // 🔥 Skip rate limiting for proxy requests (posters)
    if (req.path.startsWith('/proxy')) {
        return next()
    }

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

// ────────────────────────────────────────────────────────
// M1: Metrics endpoint for monitoring (ADR-001)
// ────────────────────────────────────────────────────────
let activeStreams = 0

app.get('/api/metrics', async (req, res) => {
    const memUsage = process.memoryUsage()
    const imageCache = await getCacheStats()

    res.json({
        engines: getActiveTorrentsCount(),
        frozen: getFrozenTorrentsCount(),
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
        uptimeSec: Math.round(process.uptime()),
        activeStreams,
        imageCache
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

function mergeTorrentAndLocalLibrary(torrents, localItems) {
    const merged = [...torrents]
    const seenHashes = new Set(torrents.map(t => t.infoHash))
    const seenNames = new Set(
        torrents
            .map(t => (t?.name || '').trim().toLowerCase())
            .filter(Boolean)
    )

    for (const item of localItems) {
        const normalizedName = (item?.name || '').trim().toLowerCase()
        if (seenHashes.has(item.infoHash)) continue
        if (normalizedName && seenNames.has(normalizedName)) continue
        merged.push(item)
    }

    return merged
}

// API: Status (with server state)
app.get('/api/status', async (req, res) => {
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
    try {
        await refreshLocalLibrary()
    } catch (err) {
        console.warn('[LocalLibrary] Status refresh failed:', err.message)
    }
    const localItems = getLocalLibrarySnapshot()
    const combined = mergeTorrentAndLocalLibrary(torrents, localItems)

    const status = combined.map(t => ({
        infoHash: t.infoHash,
        name: t.name,
        progress: t.progress,
        isReady: t.isReady,  // ✅ Fix: передаём isReady для правильного отображения в UI
        downloaded: t.downloaded,
        totalSize: t.totalSize,
        downloadSpeed: t.downloadSpeed,
        numPeers: t.numPeers,
        eta: t.eta,
        files: (t.files || []).map(f => ({
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

app.post('/api/library/rescan', async (req, res) => {
    await refreshLocalLibrary(true)
    const items = getLocalLibrarySnapshot()
    res.json({
        success: true,
        count: items.length
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

import { search as aggregatorSearch, getProvidersStatus, getProvidersDiagnostics, getPreflightStats } from './aggregator.js'
import { batchDiscoverQuality, getQualityCacheStats } from './qualityDiscovery.js'

/**
 * POST /api/quality-badges — Batch discover available quality for movies
 * ADR-001 Item 7: Quality Badges on home page (like Lampa)
 * 
 * Request: { titles: ["Movie 1", "Movie 2"] } (max 10)
 * Response: { "Movie 1": ["4K", "HDR"], "Movie 2": ["1080p"] }
 */
app.post('/api/quality-badges', async (req, res) => {
    const { titles } = req.body

    if (!titles || !Array.isArray(titles) || titles.length === 0) {
        return res.status(400).json({ error: 'titles array required' })
    }

    console.log(`[QualityBadges] Batch request: ${titles.length} titles`)
    const startTime = Date.now()

    try {
        const result = await batchDiscoverQuality(titles)
        const ms = Date.now() - startTime
        console.log(`[QualityBadges] Complete in ${ms}ms`)
        res.json(result)
    } catch (err) {
        console.error('[QualityBadges] Error:', err.message)
        res.status(500).json({ error: err.message })
    }
})

/**
 * API v2 Search with envelope response pattern
 * Response format:
 * {
 *   meta: { query, cached, ms, providers: { [name]: { status, count, error? } } },
 *   items: AggregatedSearchItem[]
 * }
 */
app.get('/api/v2/search', async (req, res) => {
    const { query, limit = 100, skipCache } = req.query
    if (!query) {
        return res.status(400).json({ error: 'Query required' })
    }

    const skipCacheFlag = skipCache === '1' || skipCache === 'true'
    console.log(`[API v2] Search: ${query}`)
    const startTime = Date.now()

    try {
        const { results, errors, providers, cached } = await aggregatorSearch(query, { skipCache: skipCacheFlag })

        // Transform providers to StatusMap with enhanced info
        const providersMeta = {}
        for (const [name, data] of Object.entries(providers)) {
            providersMeta[name] = {
                status: data.status,
                count: data.count || 0,
                error: data.error || null,
                durationMs: data.durationMs ?? null
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

// Detailed diagnostics: last status, latency, counters, and circuit info
app.get('/api/providers/diagnostics', (req, res) => {
    const providers = getProvidersDiagnostics()
    res.json({
        providers,
        preflight: getPreflightStats(),
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

// ────────────────────────────────────────────────────────
// ❤️ Favorites API (FAV-01)
// ────────────────────────────────────────────────────────

app.get('/api/favorites', (req, res) => {
    res.json(db.data.favorites || [])
})

app.post('/api/favorites', async (req, res) => {
    const { tmdbId, mediaType, title, posterPath, backdropPath, voteAverage, year, genreIds } = req.body
    if (!tmdbId) return res.status(400).json({ error: 'tmdbId required' })

    // Prevent duplicates
    const exists = db.data.favorites.find(f => f.tmdbId === tmdbId && f.mediaType === mediaType)
    if (exists) return res.json({ status: 'already_exists', item: exists })

    const item = { tmdbId, mediaType, title, posterPath, backdropPath, voteAverage, year, genreIds: genreIds || [], addedAt: Date.now() }
    db.data.favorites.push(item)
    await safeWrite(db)
    res.json({ status: 'added', item })
})

app.delete('/api/favorites/:tmdbId', async (req, res) => {
    const tmdbId = parseInt(req.params.tmdbId, 10)
    const before = db.data.favorites.length
    db.data.favorites = db.data.favorites.filter(f => f.tmdbId !== tmdbId)
    if (db.data.favorites.length === before) return res.status(404).json({ error: 'Not found' })
    await safeWrite(db)
    res.json({ status: 'removed' })
})

// ────────────────────────────────────────────────────────
// 🕒 View History API (HIST-01)
// ────────────────────────────────────────────────────────

app.get('/api/history', (req, res) => {
    // Return sorted by lastWatched desc
    const sorted = [...(db.data.viewHistory || [])].sort((a, b) => b.lastWatched - a.lastWatched)
    res.json(sorted)
})

app.post('/api/history', async (req, res) => {
    const { tmdbId, mediaType, title, posterPath, backdropPath, voteAverage, year, genreIds } = req.body
    if (!tmdbId) return res.status(400).json({ error: 'tmdbId required' })

    // Upsert: update lastWatched if exists, else add
    const idx = db.data.viewHistory.findIndex(h => h.tmdbId === tmdbId && h.mediaType === mediaType)
    const entry = { tmdbId, mediaType, title, posterPath, backdropPath, voteAverage, year, genreIds: genreIds || [], lastWatched: Date.now() }

    if (idx !== -1) {
        db.data.viewHistory[idx] = entry
    } else {
        db.data.viewHistory.push(entry)
        // LRU: keep only last 200
        if (db.data.viewHistory.length > 200) {
            db.data.viewHistory.sort((a, b) => b.lastWatched - a.lastWatched)
            db.data.viewHistory = db.data.viewHistory.slice(0, 200)
        }
    }
    await safeWrite(db)
    res.json({ status: 'recorded', item: entry })
})

app.delete('/api/history/:tmdbId', async (req, res) => {
    const tmdbId = parseInt(req.params.tmdbId, 10)
    const before = db.data.viewHistory.length
    db.data.viewHistory = db.data.viewHistory.filter(h => h.tmdbId !== tmdbId)
    if (db.data.viewHistory.length === before) return res.status(404).json({ error: 'Not found' })
    await safeWrite(db)
    res.json({ status: 'removed' })
})

app.delete('/api/history', async (req, res) => {
    db.data.viewHistory = []
    await safeWrite(db)
    res.json({ status: 'cleared' })
})

// ────────────────────────────────────────────────────────
// 🤖 AI Picks API (AI-01) — Personalized recommendations
// Analyzes viewHistory genres → TMDB discover → exclude watched
// ────────────────────────────────────────────────────────

app.get('/api/ai-picks', async (req, res) => {
    try {
        const history = db.data.viewHistory || []
        if (history.length < 3) {
            return res.json([]) // Not enough data for recommendations
        }

        // 1. Count genre frequencies from history
        const genreCount = {}
        history.forEach(entry => {
            (entry.genreIds || []).forEach(gid => {
                genreCount[gid] = (genreCount[gid] || 0) + 1
            })
        })

        // 2. Sort genres by frequency, take top 3
        const topGenres = Object.entries(genreCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id]) => id)

        if (topGenres.length === 0) {
            return res.json([])
        }

        // 3. Fetch recommendations from TMDB discover
        const watchedIds = new Set(history.map(h => h.tmdbId))
        const genreParam = topGenres.join(',')
        const results = []

        // Fetch 2 pages for more variety
        for (let page = 1; page <= 2; page++) {
            const url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=ru-RU&sort_by=vote_average.desc&vote_count.gte=100&vote_average.gte=7&with_genres=${genreParam}&page=${page}`
            try {
                const response = await smartFetch(url)
                const items = response.data?.results || []
                for (const item of items) {
                    if (!watchedIds.has(item.id) && item.poster_path) {
                        results.push({
                            tmdbId: item.id,
                            mediaType: 'movie',
                            title: item.title || item.name,
                            posterPath: item.poster_path,
                            backdropPath: item.backdrop_path,
                            voteAverage: item.vote_average,
                            year: (item.release_date || '').slice(0, 4),
                            genreIds: item.genre_ids || []
                        })
                    }
                }
            } catch (err) {
                console.warn(`[AI-Picks] TMDB page ${page} failed:`, err.message)
            }
        }

        // Also try TV if user watches TV shows
        const tvEntries = history.filter(h => h.mediaType === 'tv')
        if (tvEntries.length >= 2) {
            const tvGenreCount = {}
            tvEntries.forEach(entry => {
                (entry.genreIds || []).forEach(gid => {
                    tvGenreCount[gid] = (tvGenreCount[gid] || 0) + 1
                })
            })
            const tvTopGenres = Object.entries(tvGenreCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([id]) => id)

            if (tvTopGenres.length > 0) {
                const tvGenreParam = tvTopGenres.join(',')
                const tvUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&language=ru-RU&sort_by=vote_average.desc&vote_count.gte=50&vote_average.gte=7&with_genres=${tvGenreParam}&page=1`
                try {
                    const response = await smartFetch(tvUrl)
                    const items = response.data?.results || []
                    for (const item of items) {
                        if (!watchedIds.has(item.id) && item.poster_path) {
                            results.push({
                                tmdbId: item.id,
                                mediaType: 'tv',
                                title: item.name || item.title,
                                posterPath: item.poster_path,
                                backdropPath: item.backdrop_path,
                                voteAverage: item.vote_average,
                                year: (item.first_air_date || '').slice(0, 4),
                                genreIds: item.genre_ids || []
                            })
                        }
                    }
                } catch (err) {
                    console.warn('[AI-Picks] TMDB TV failed:', err.message)
                }
            }
        }

        // 4. Shuffle and limit
        const shuffled = results.sort(() => Math.random() - 0.5).slice(0, 40)
        res.json(shuffled)
    } catch (err) {
        console.error('[AI-Picks] Error:', err)
        res.status(500).json({ error: 'AI picks generation failed' })
    }
})

// API: Generate M3U Playlist for Video Files
// Helper: sanitize filename for M3U metadata (remove newlines and control chars)
const sanitizeM3U = (str) => str.replace(/[\r\n\x00-\x1f]/g, ' ').trim()

app.get('/playlist.m3u', async (req, res) => {
    // 1. Determine Host (Synology IP or Localhost)
    const host = req.get('host') || `localhost:${PORT}`
    const protocol = req.protocol || 'http'

    // 2. Get All Torrents
    const torrents = getAllTorrents()
    try {
        await refreshLocalLibrary()
    } catch (err) {
        console.warn('[LocalLibrary] Playlist refresh failed:', err.message)
    }
    const localItems = getLocalLibrarySnapshot()
    const combined = mergeTorrentAndLocalLibrary(torrents, localItems)

    let m3u = '#EXTM3U\n'
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.mpg', '.mpeg']

    // 3. Filter & Generate
    for (const torrent of combined) {
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
    const softDelete = req.query.soft === '1' || req.query.soft === 'true'
    const torrent = getTorrent(infoHash) // Get info BEFORE deletion

    // Default behavior is hard delete (destroy engine + delete files).
    // soft=1 keeps engine in frozen keep-alive cache without disk cleanup.
    const success = removeTorrent(infoHash, !softDelete)

    if (success) {
        // 🔥 PHYSICAL DELETION (FILE HYGIENE - ASYNC) 🔥
        if (!softDelete && torrent && torrent.name) {
            const downloadPath = process.env.DOWNLOAD_PATH || './downloads'
            const fullPath = path.join(downloadPath, torrent.name)

            // Fire-and-forget async deletion to avoid blocking the server
            fsPromises.rm(fullPath, { recursive: true, force: true })
                .then(() => console.log(`[File Hygiene] Successfully removed: ${fullPath}`))
                .catch(e => console.error(`[Delete Error] Could not remove ${fullPath}: ${e.message}`))
        }
        res.json({
            success: true,
            mode: softDelete ? 'soft' : 'hard',
            message: softDelete ? 'Torrent removed and frozen for keep-alive' : 'Deletion started asynchronously'
        })
    } else {
        const localDeleted = await deleteLocalEntry(infoHash)
        if (localDeleted) {
            return res.json({
                success: true,
                mode: 'local',
                message: 'Local media deleted'
            })
        }
        res.status(404).json({ error: 'Torrent not found' })
    }
})

// API: Stream
app.get('/stream/:infoHash/:fileIndex', async (req, res) => {
    const { infoHash, fileIndex } = req.params
    const rangeHeader = req.headers.range
    const index = Number.parseInt(fileIndex, 10)
    if (!Number.isInteger(index) || index < 0) {
        return res.status(400).send('Invalid file index')
    }

    const engine = getRawTorrent(infoHash)
    let file = null
    let localDiskPath = null

    if (engine) {
        // 🔥 ACTIVATE TURBO MODE when user starts watching
        boostTorrent(infoHash)

        file = engine.files?.[index]
        if (!file) return res.status(404).send('File not found')

        // Smart Priority: Prioritize this file's first chunks for instant playback
        prioritizeFile(infoHash, index)

        // 📺 Mark files as seen when playback starts (resets new episode counter)
        markTorrentFilesSeen(infoHash)
    } else {
        try {
            await refreshLocalLibrary()
        } catch (err) {
            console.warn('[LocalLibrary] Stream refresh failed:', err.message)
        }
        const localFile = getLocalFile(infoHash, index)
        if (!localFile) return res.status(404).send('Torrent not found')
        file = {
            name: localFile.name,
            length: localFile.length
        }
        localDiskPath = localFile.absPath
    }

    // ────────────────────────────────────────────────────────
    // 🔥 FILESYSTEM FALLBACK: Serve from disk if file is fully downloaded
    // Fixes: after restart with verify:false, torrent-stream engine doesn't
    // know about local files → createReadStream hangs with 0 peers
    // ────────────────────────────────────────────────────────
    const downloadPath = process.env.DOWNLOAD_PATH || './downloads'
    const diskPath = localDiskPath || path.join(downloadPath, file.path)
    let servingFromDisk = Boolean(localDiskPath)
    if (!servingFromDisk) {
        try {
            const stat = fs.statSync(diskPath)
            if (stat.size >= file.length) {
                servingFromDisk = true
                console.log(`[Stream] 📁 Serving from disk: ${file.name} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`)
            }
        } catch (e) { /* file doesn't exist on disk, use torrent-stream */ }
    }

    // Detect Content-Type
    const ext = path.extname(file.name).toLowerCase()
    const contentType = mimeMap[ext] || 'application/octet-stream'

    const parsedRange = rangeHeader ? parseRange(rangeHeader, file.length) : null

    if (rangeHeader && !parsedRange) {
        res.set('Content-Range', `bytes */${file.length}`)
        return res.status(416).send('Invalid Range')
    }

    if (!parsedRange) {
        const head = {
            'Content-Length': file.length,
            'Content-Type': contentType,
        }
        res.writeHead(200, head)

        // Use disk or torrent-stream
        const stream = servingFromDisk
            ? fs.createReadStream(diskPath)
            : file.createReadStream()
        stream.pipe(res)
    } else {
        const { start, end } = parsedRange
        const chunksize = (end - start) + 1

        // 🔥 READAHEAD: Prioritize chunks starting from seek position
        // This ensures smooth playback after seeking
        if (engine && !servingFromDisk) {
            readahead(infoHash, index, start)
        }

        // Smart Progress Tracking
        const duration = parseFloat(req.query.duration) || 0
        const progressTime = duration > 0 ? (start / file.length) * duration : 0

        // 🔥 Debounced DB save (fire-and-forget, no await)
        const trackKey = `${infoHash}_${fileIndex}`
        const now = Date.now()
        const lastUpdate = db.data.progress[trackKey]?.timestamp || 0

        if (engine && now - lastUpdate > 10000) {
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

        // O7: Configurable stream buffer for better 4K streaming on HDD (default 512KB)
        const hwm = parseInt(process.env.STREAM_HIGHWATERMARK) || 1024 * 512

        // Use disk or torrent-stream
        const stream = servingFromDisk
            ? fs.createReadStream(diskPath, { start, end, highWaterMark: hwm })
            : file.createReadStream({ start, end, highWaterMark: hwm })

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

        // M1: Track active streams for /api/metrics
        activeStreams++
        res.on('close', () => { activeStreams--; cleanup() })
        res.on('error', () => { activeStreams--; cleanup() })

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

    // O6: Clear all registered intervals
    clearAllIntervals()

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
