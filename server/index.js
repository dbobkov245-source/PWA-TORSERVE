// IGNORE SSL ERRORS (Global Hack for Mirrors)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import fs from 'fs'
import { addTorrent, getAllTorrents, getTorrent, getRawTorrent, removeTorrent } from './torrent.js'
import { db } from './db.js'
import { startWatchdog, getServerState } from './watchdog.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())

// DEBUG USER: Log all requests
app.use((req, res, next) => {
    // Filter out boring static files to keep logs clean
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

// API: TMDB Proxy (DISABLED - OFFLINE MODE)
// ISP blocks are too severe. We return 404 immediately to show 
// the "Beautiful Placeholders" on the client without lag.
app.get('/api/tmdb/search', (req, res) => {
    res.status(404).json({ error: 'Offline Mode (Blocked by ISP)' })
})

app.get('/api/tmdb/image/:size/:path', (req, res) => {
    res.status(404).send('Offline Mode')
})

// ─────────────────────────────────────────────────────────────
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

    // Use raw engine to access createReadStream
    const engine = getRawTorrent(infoHash)
    if (!engine) return res.status(404).send('Torrent not found')

    const file = engine.files?.[fileIndex]
    if (!file) return res.status(404).send('File not found')

    // Detect Content-Type
    const ext = path.extname(file.name).toLowerCase()
    const contentType = mimeMap[ext] || 'application/octet-stream'

    // Synology Cache Path Check
    const downloadPath = process.env.DOWNLOAD_PATH
    if (downloadPath && !fs.existsSync(downloadPath)) {
        console.error(`Cache path not accessible: ${downloadPath}`)
        return res.status(500).send('Cache storage not accessible')
    }

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

        // Smart Progress Tracking
        const duration = parseFloat(req.query.duration) || 0
        const progressTime = duration > 0 ? (start / file.length) * duration : 0

        // Save to DB (Throttled: max once per 10s per file)
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
            await db.write()
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

// Fallback for SPA
app.get('*', (req, res) => {
    if (fs.existsSync(path.join(distPath, 'index.html'))) {
        res.sendFile(path.join(distPath, 'index.html'))
    } else {
        res.send('Frontend not built. Run npm run client:build')
    }
})

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`)

    // Start watchdog in background (non-blocking)
    startWatchdog().catch(err => {
        console.error('[Server] Watchdog failed:', err.message)
    })
})
