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
        downloadSpeed: t.downloadSpeed,
        numPeers: t.numPeers,
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

// API: Generate M3U Playlist for Video Files
app.get('/playlist.m3u', (req, res) => {
    const host = req.headers.host || `localhost:${PORT}`
    const protocol = req.protocol || 'http'
    const torrents = getAllTorrents()
    
    let m3u = '#EXTM3U\n'
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.webm', '.mov']
    
    for (const torrent of torrents) {
        for (const file of torrent.files) {
            const ext = path.extname(file.name).toLowerCase()
            if (videoExtensions.includes(ext)) {
                const duration = -1 // Unknown duration
                m3u += `#EXTINF:${duration},${file.name}\n`
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

// API: Remove Torrent (with File Hygiene)
app.delete('/api/delete/:infoHash', (req, res) => {
    const { infoHash } = req.params
    const torrent = getTorrent(infoHash) // Get info BEFORE deletion

    const success = removeTorrent(infoHash)

    if (success) {
        // 🔥 PHYSICAL DELETION (FILE HYGIENE) 🔥
        if (torrent && torrent.name) {
            const downloadPath = process.env.DOWNLOAD_PATH || './downloads'
            const fullPath = path.join(downloadPath, torrent.name)
            try {
                if (fs.existsSync(fullPath)) {
                    fs.rmSync(fullPath, { recursive: true, force: true })
                    console.log(`[File Hygiene] Deleted: ${fullPath}`)
                }
            } catch (e) {
                console.error(`[File Hygiene] Error deleting files: ${e.message}`)
            }
        }
        res.json({ success: true })
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

    // torrent-stream file object has .createReadStream()
    // but we need to verify if it supports range the same way

    // Synology Cache Path Check
    const downloadPath = process.env.DOWNLOAD_PATH
    if (downloadPath && !fs.existsSync(downloadPath)) {
        // Just log error, don't crash. 
        // Note: WebTorrent might have created the directory if it had permissions.
        // If the volume is unmounted, this check helps.
        console.error(`Cache path not accessible: ${downloadPath}`)
        return res.status(500).send('Cache storage not accessible')
    }

    if (!range) {
        const head = {
            'Content-Length': file.length,
            'Content-Type': 'video/mp4', // Simplification, ideally detect mime
        }
        res.writeHead(200, head)
        file.createReadStream().pipe(res)
    } else {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1
        const chunksize = (end - start) + 1

        // Smart Progress Tracking
        // Formula: (startByte / totalBytes) * duration
        // We assume duration is passed in query or we just store percentage if duration unknown
        // User asked for: (startByte / totalBytes) * duration
        // We'll try to get duration from query param ?duration=SECONDS
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
            'Content-Type': 'video/mp4',
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)

    // Start watchdog in background (non-blocking)
    startWatchdog().catch(err => {
        console.error('[Server] Watchdog failed:', err.message)
    })
})
