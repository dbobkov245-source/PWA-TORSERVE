# PWA-TorServe v1.0 Release

**Самовосстанавливающийся torrent-стример для Android TV и мобильных устройств.**

Node.js сервер (Docker) + React PWA клиент (APK) с поддержкой нативных плееров.

---

## 1. Server (Docker)

### `server/index.js`
```javascript
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
    const host = req.get('host') || `localhost:${PORT}`
    const protocol = req.protocol || 'http'
    const torrents = getAllTorrents()
    let m3u = '#EXTM3U\n'
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.mpg', '.mpeg']

    for (const torrent of torrents) {
        if (!torrent.files) continue;
        for (const file of torrent.files) {
            const ext = path.extname(file.name).toLowerCase()
            if (videoExtensions.includes(ext)) {
                m3u += `#EXTINF:-1,${file.name}\n`
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
    const torrent = getTorrent(infoHash)
    const success = removeTorrent(infoHash)

    if (success) {
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
    const engine = getRawTorrent(infoHash)
    if (!engine) return res.status(404).send('Torrent not found')
    const file = engine.files?.[fileIndex]
    if (!file) return res.status(404).send('File not found')

    const downloadPath = process.env.DOWNLOAD_PATH
    if (downloadPath && !fs.existsSync(downloadPath)) {
        console.error(`Cache path not accessible: ${downloadPath}`)
        return res.status(500).send('Cache storage not accessible')
    }

    if (!range) {
        res.writeHead(200, { 'Content-Length': file.length, 'Content-Type': 'video/mp4' })
        file.createReadStream().pipe(res)
    } else {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1
        const chunksize = (end - start) + 1

        const duration = parseFloat(req.query.duration) || 0
        const progressTime = duration > 0 ? (start / file.length) * duration : 0
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`)
    startWatchdog().catch(err => {
        console.error('[Server] Watchdog failed:', err.message)
    })
})
```

### `server/torrent.js`
```javascript
import torrentStream from 'torrent-stream'
import process from 'process'

const engines = new Map()

export const addTorrent = (magnetURI) => {
    return new Promise((resolve, reject) => {
        for (const [key, engine] of engines.entries()) {
            if (key === magnetURI) {
                console.log('Torrent engine already exists for this magnet')
                return resolve(formatEngine(engine))
            }
        }

        const path = process.env.DOWNLOAD_PATH || './downloads'
        console.log('[Torrent] Adding magnet, download path:', path)

        let engine
        try {
            engine = torrentStream(magnetURI, {
                path: path,
                connections: 20,       // 📉 RAM-safe limit
                uploads: 0,
                dht: true,             // ✅ DHT enabled
                verify: false          // ⚡ Faster torrent start
            })
        } catch (err) {
            return reject(err)
        }

        engine.on('ready', () => {
            console.log('[Torrent] Engine ready:', engine.infoHash)
            engines.set(magnetURI, engine)
            engines.set(engine.infoHash, engine)
            resolve(formatEngine(engine))
        })

        engine.on('error', (err) => {
            console.error('[Torrent] Engine error:', err.message)
            engine.destroy()
            reject(err)
        })

        setTimeout(() => {
            if (!engines.has(magnetURI)) {
                engine.destroy()
                reject(new Error('Torrent timeout: no peers found within 60 seconds'))
            }
        }, 60000)
    })
}

export const removeTorrent = (infoHash) => {
    const engine = engines.get(infoHash)
    if (!engine) return false
    console.log('Removing torrent:', infoHash)
    engine.destroy(() => console.log('Engine destroyed:', infoHash))
    engines.delete(infoHash)
    for (const [key, val] of engines.entries()) {
        if (val === engine) engines.delete(key)
    }
    return true
}

export const getTorrent = (infoHash) => {
    const engine = engines.get(infoHash)
    if (engine) return formatEngine(engine)
    return null
}

export const getRawTorrent = (infoHash) => engines.get(infoHash) || null

export const getAllTorrents = () => {
    const uniqueEngines = new Set(engines.values())
    return Array.from(uniqueEngines).map(formatEngine)
}

const formatEngine = (engine) => {
    return {
        infoHash: engine.infoHash,
        name: engine.torrent?.name || 'Unknown Torrent',
        progress: 0,
        downloadSpeed: engine.swarm?.downloadSpeed() || 0,
        uploadSpeed: engine.swarm?.uploadSpeed() || 0,
        numPeers: engine.swarm?.wires?.length || 0,
        files: engine.files ? engine.files.map((file, index) => ({
            name: file.name,
            length: file.length,
            path: file.path,
            index: index
        })) : []
    }
}
```

### `server/watchdog.js`
```javascript
import { db } from './db.js'
import fs from 'fs'
import path from 'path'

const CONFIG = {
    CHECK_INTERVAL_MS: 30000,
    RAM_OK_THRESHOLD_MB: 500,
    RAM_DEGRADED_THRESHOLD_MB: 600,
    HYSTERESIS_DELAY_MS: 30000,
    STORAGE_CHECK_TIMEOUT_MS: 5000,
    CIRCUIT_BREAKER_THRESHOLD: 3,
    CIRCUIT_BREAKER_COOLDOWN_MS: 300000
}

let degradedSince = null
let circuitOpenUntil = null
let isWatchdogRunning = false

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const getRAMUsageMB = () => {
    const used = process.memoryUsage()
    return Math.round(used.rss / 1024 / 1024)
}

const checkStorage = () => {
    return new Promise((resolve) => {
        const downloadPath = process.env.DOWNLOAD_PATH || './downloads'
        const healthFile = path.join(downloadPath, '.healthcheck')
        const timeout = setTimeout(() => {
            console.warn('[Watchdog] Storage check timeout!')
            resolve(false)
        }, CONFIG.STORAGE_CHECK_TIMEOUT_MS)

        fs.mkdir(downloadPath, { recursive: true }, (mkdirErr) => {
            if (mkdirErr && mkdirErr.code !== 'EEXIST') {
                clearTimeout(timeout)
                resolve(false)
                return
            }
            const testData = `healthcheck:${Date.now()}`
            fs.writeFile(healthFile, testData, (writeErr) => {
                if (writeErr) {
                    clearTimeout(timeout)
                    resolve(false)
                    return
                }
                fs.unlink(healthFile, (unlinkErr) => {
                    clearTimeout(timeout)
                    resolve(true)
                })
            })
        })
    })
}

const updateStatus = async (newStatus) => {
    const currentStatus = db.data.serverStatus
    if (currentStatus !== newStatus) {
        console.log(`[Watchdog] Status change: ${currentStatus} → ${newStatus}`)
        db.data.serverStatus = newStatus
        db.data.lastStateChange = Date.now()
        if (newStatus === 'ok') {
            db.data.storageFailures = 0
            degradedSince = null
        }
        await db.write()
    }
}

const performCheck = async () => {
    const now = Date.now()
    const ramMB = getRAMUsageMB()

    if (circuitOpenUntil) {
        if (now < circuitOpenUntil) {
            console.log(`[Watchdog] Circuit open, retry in ${Math.round((circuitOpenUntil - now) / 1000)}s`)
            return
        }
        console.log('[Watchdog] Circuit breaker: attempting recovery...')
        const storageOk = await checkStorage()
        if (storageOk) {
            circuitOpenUntil = null
            await updateStatus('ok')
        } else {
            circuitOpenUntil = now + CONFIG.CIRCUIT_BREAKER_COOLDOWN_MS
            db.data.lastStateChange = now
            await db.write()
        }
        return
    }

    const storageOk = await checkStorage()
    if (!storageOk) {
        db.data.storageFailures = (db.data.storageFailures || 0) + 1
        console.warn(`[Watchdog] Storage failure #${db.data.storageFailures}`)
        if (db.data.storageFailures >= CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
            circuitOpenUntil = now + CONFIG.CIRCUIT_BREAKER_COOLDOWN_MS
            await updateStatus('circuit_open')
            return
        }
    } else {
        if (db.data.storageFailures > 0) {
            db.data.storageFailures = 0
            await db.write()
        }
    }

    if (ramMB > CONFIG.RAM_DEGRADED_THRESHOLD_MB) {
        if (!degradedSince) degradedSince = now
        else if (now - degradedSince >= CONFIG.HYSTERESIS_DELAY_MS) await updateStatus('degraded')
    } else if (ramMB < CONFIG.RAM_OK_THRESHOLD_MB) {
        if (db.data.serverStatus === 'degraded') await updateStatus('ok')
        degradedSince = null
    }

    console.log(`[Watchdog] RAM: ${ramMB}MB | Status: ${db.data.serverStatus}`)
}

export const startWatchdog = async () => {
    if (isWatchdogRunning) return
    isWatchdogRunning = true
    try { await performCheck() } catch (err) {}
    while (isWatchdogRunning) {
        await sleep(CONFIG.CHECK_INTERVAL_MS)
        try { await performCheck() } catch (err) {}
    }
}

export const stopWatchdog = () => { isWatchdogRunning = false }

export const getServerState = () => ({
    serverStatus: db.data.serverStatus,
    lastStateChange: db.data.lastStateChange,
    storageFailures: db.data.storageFailures
})
```

### `server/db.js`
```javascript
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

const defaultData = {
    serverStatus: 'ok',
    lastStateChange: Date.now(),
    storageFailures: 0,
    progress: {}
}
const dbPath = process.env.DB_PATH || 'db.json'
const adapter = new JSONFile(dbPath)
const db = new Low(adapter, defaultData)

await db.read()
db.data = { ...defaultData, ...db.data }
db.data.progress ||= {}
await db.write()

export { db }
```

### `Dockerfile`
```dockerfile
FROM node:20-slim AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-slim AS server-builder
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-slim
RUN apt-get update && apt-get install -y ffmpeg curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=server-builder /app/node_modules ./node_modules
COPY --from=client-builder /app/client/dist ./client/dist
COPY package*.json ./
COPY server/ ./server/
RUN mkdir -p /app/downloads /app/data && \
    echo '{"serverStatus":"ok","lastStateChange":0,"storageFailures":0,"progress":{}}' > /app/data/db.json
EXPOSE 3000
ENV DOWNLOAD_PATH=/app/downloads
ENV DB_PATH=/app/data/db.json
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD curl -f http://localhost:3000/api/health || exit 1
CMD ["node", "server/index.js"]
```

### `docker-compose.yml`
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

## 2. Client (APK)

### `client/src/App.jsx`
```jsx
import { useState, useEffect } from 'react'
import { registerPlugin } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App as CapacitorApp } from '@capacitor/app'

const TVPlayer = registerPlugin('TVPlayer')

const DegradedBanner = ({ lastStateChange }) => {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!lastStateChange) return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - lastStateChange) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [lastStateChange])
  return (
    <div className="bg-yellow-600/90 text-yellow-100 p-4 rounded-lg mb-6 border border-yellow-500 animate-pulse">
      <div className="flex items-center gap-3">
        <span className="text-2xl">❄️</span>
        <div>
          <div className="font-bold">Cooling Down</div>
          <div className="text-sm">High memory usage detected. Service may be slower.</div>
        </div>
      </div>
    </div>
  )
}

const ErrorScreen = ({ status, retryAfter, onRetry }) => {
  const [countdown, setCountdown] = useState(retryAfter || 300)
  useEffect(() => {
    if (countdown <= 0) { onRetry(); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="bg-red-900/30 border border-red-700 rounded-2xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">{status === 'circuit_open' ? '🔌' : '⚠️'}</div>
        <h1 className="text-2xl font-bold text-red-400 mb-2">
          {status === 'circuit_open' ? 'Storage Unavailable' : 'Server Error'}
        </h1>
        <div className="bg-gray-800 rounded-lg p-4 mt-4">
          <div className="text-3xl font-mono text-white">
            {Math.floor(countdown/60)}:{String(countdown%60).padStart(2,'0')}
          </div>
        </div>
        <button onClick={onRetry} className="mt-6 bg-red-600 text-white px-6 py-3 rounded-lg font-bold">Retry Now</button>
      </div>
    </div>
  )
}

function App() {
  useEffect(() => {
    console.log('App Started. Version: v1.0.0 (Release)')
  }, [])

  const defaultUrl = Capacitor.isNativePlatform()
    ? (localStorage.getItem('serverUrl') || 'http://192.168.1.70:3000')
    : ''

  const [serverUrl, setServerUrl] = useState(defaultUrl)
  const [torrents, setTorrents] = useState([])
  const [magnet, setMagnet] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showServerInput, setShowServerInput] = useState(false)
  const [selectedTorrent, setSelectedTorrent] = useState(null)
  const [preferredPlayer, setPreferredPlayer] = useState(localStorage.getItem('preferredPlayer') || 'system')
  const [serverStatus, setServerStatus] = useState('ok')
  const [lastStateChange, setLastStateChange] = useState(null)
  const [retryAfter, setRetryAfter] = useState(null)

  useEffect(() => {
    if (selectedTorrent) {
      setTimeout(() => {
        const watchBtn = document.querySelector('.details-btn-watch')
        if (watchBtn) watchBtn.focus()
      }, 300)
    }
  }, [selectedTorrent])

  const getApiUrl = (path) => serverUrl ? `${serverUrl.replace(/\/$/, '')}${path}` : path
  const savePreferredPlayer = (player) => { setPreferredPlayer(player); localStorage.setItem('preferredPlayer', player) }
  const saveServerUrl = (url) => { setServerUrl(url); localStorage.setItem('serverUrl', url); setShowSettings(false); fetchStatus() }

  const fetchStatus = async () => {
    try {
      const res = await fetch(getApiUrl('/api/status'))
      if (res.status === 503) setRetryAfter(parseInt(res.headers.get('Retry-After')) || 300)
      const data = await res.json()
      setServerStatus(data.serverStatus || 'ok')
      setLastStateChange(data.lastStateChange)
      setTorrents(data.torrents || [])
      setError(null)
      if (data.serverStatus === 'ok') setRetryAfter(null)
    } catch (e) {
      if (!torrents.length) setError(`Connection Error: ${e.message}`)
    }
  }

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const listener = CapacitorApp.addListener('appUrlOpen', async (event) => {
      if (event.url?.startsWith('magnet:')) {
        setMagnet(event.url); addTorrent({ preventDefault: () => {} })
      }
    })
    return () => listener.then(h => h.remove())
  }, [serverUrl])

  useEffect(() => {
    fetchStatus()
    const i = setInterval(fetchStatus, 5000)
    return () => clearInterval(i)
  }, [serverUrl])

  const addTorrent = async (e) => {
    if (e.preventDefault) e.preventDefault()
    if (!magnet) return
    setLoading(true); setError(null)
    try {
      const res = await fetch(getApiUrl('/api/add'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnet })
      })
      if (!res.ok) throw new Error(await res.text())
      setMagnet(''); fetchStatus()
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const deleteTorrent = async (infoHash) => {
    if (!confirm('Remove?')) return
    await fetch(getApiUrl(`/api/delete/${infoHash}`), { method: 'DELETE' })
    fetchStatus()
  }

  const getStreamUrl = (infoHash, fileIndex) => {
    if (serverUrl) return `${serverUrl.replace(/\/$/, '')}/stream/${infoHash}/${fileIndex}`
    return `${window.location.protocol}//${window.location.host}/stream/${infoHash}/${fileIndex}`
  }

  const handlePlay = async (infoHash, fileIndex) => {
    const streamUrl = getStreamUrl(infoHash, fileIndex)
    const pkg = "net.gtvbox.videoplayer" // Vimu
    try {
        await TVPlayer.play({ url: streamUrl, package: pkg })
    } catch (e) {
        try { await TVPlayer.play({ url: streamUrl, package: "" }) }
        catch (err) { alert("Error launching player: " + err.message) }
    }
  }

  const copyStreamUrl = (infoHash, fileIndex) => {
      const url = getStreamUrl(infoHash, fileIndex)
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => alert('Copied!'))
      else prompt('Copy this URL:', url)
  }

  useEffect(() => {
      const bl = CapacitorApp.addListener('backButton', () => {
          if (selectedTorrent) setSelectedTorrent(null)
          else if (showSettings) setShowSettings(false)
          else CapacitorApp.minimizeApp()
      })
      const kl = (e) => { if (e.key === 'Escape' || e.key === 'Backspace') {
          if (selectedTorrent) setSelectedTorrent(null)
          else if (showSettings) setShowSettings(false)
      }}
      window.addEventListener('keydown', kl)
      return () => { bl.then(h=>h.remove()); window.removeEventListener('keydown', kl) }
  }, [selectedTorrent, showSettings])

  if (serverStatus === 'circuit_open' || serverStatus === 'error')
    return <ErrorScreen status={serverStatus} retryAfter={retryAfter || 300} onRetry={fetchStatus} />

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 font-sans overflow-x-hidden max-w-full">
      <div className="flex justify-between items-center mb-6 pl-4 pr-4">
        <h1 className="text-3xl font-bold text-blue-500">PWA-TorServe (v1.0.0)</h1>
        <div className="flex gap-4">
          <button onClick={fetchStatus} className="text-gray-400 hover:text-white">🔄</button>
          <button onClick={() => setShowSettings(!showSettings)} className="text-gray-400 hover:text-white">⚙️</button>
        </div>
      </div>

      {serverStatus === 'degraded' && <DegradedBanner lastStateChange={lastStateChange} />}

      {showSettings && (
        <div className="mb-6 p-4 bg-gray-800 rounded border border-gray-700 space-y-4">
            <div>
                <label className="text-sm text-gray-400">Server URL</label>
                 <button onClick={() => setShowServerInput(!showServerInput)} className="ml-2 text-xs bg-gray-700 px-2 py-1 rounded">Edit</button>
                 {showServerInput && (
                    <input type="text" defaultValue={serverUrl} onBlur={(e) => saveServerUrl(e.target.value)}
                    className="w-full p-2 mt-2 rounded bg-gray-900 border border-gray-600 text-white" />
                 )}
                 <p className="text-xs text-gray-500 mt-1">{serverUrl || 'Web Mode'}</p>
            </div>
            {Capacitor.isNativePlatform() && (
                <div>
                   <label className="block text-sm text-gray-400 mb-2">Video Player</label>
                   <div className="grid grid-cols-1 gap-2">
                       {[{id:'system',name:'System'},{id:'vimu',name:'Vimu'},{id:'vlc',name:'VLC'}].map(p => (
                           <button key={p.id} onClick={() => savePreferredPlayer(p.id)}
                            className={`p-2 rounded border text-left ${preferredPlayer===p.id ? 'bg-blue-600 border-blue-400' : 'bg-gray-700 border-gray-600'}`}>
                               {p.name} {preferredPlayer===p.id && '✅'}
                           </button>
                       ))}
                   </div>
                </div>
            )}
        </div>
      )}

      <div className="flex justify-center mb-8">
        {!showServerInput && <button onClick={() => setShowServerInput(true)} className="bg-blue-600 px-6 py-3 rounded-full font-bold shadow-lg">➕ Add Magnet Link</button>}
      </div>

      {showServerInput && (
        <form onSubmit={addTorrent} className="mb-8 max-w-2xl mx-auto flex gap-2 bg-gray-800 p-4 rounded-xl border border-gray-700">
          <input type="text" value={magnet} onChange={(e) => setMagnet(e.target.value)} placeholder="Paste Magnet..." className="flex-1 p-3 rounded bg-gray-900 border border-gray-600 text-white" autoFocus />
          <button type="submit" disabled={loading} className="bg-blue-600 px-6 py-3 rounded font-bold">{loading?'...':'Add'}</button>
          <button type="button" onClick={() => setShowServerInput(false)} className="px-4 py-3 text-gray-400">✕</button>
        </form>
      )}

      {error && <div className="text-red-500 text-center mb-4 bg-red-900/20 p-2 rounded">{error}</div>}

      <div className="netflix-grid">
        {torrents.map((t) => (
            <button key={t.infoHash} onClick={() => setSelectedTorrent(t)} className={`torrent-card tv-card ${t.progress >= 1 || t.files.length ? 'ready' : ''}`}>
               <div className="text-4xl mb-2">🎬</div>
               <div className="torrent-card-title">{t.name}</div>
               <div className="torrent-card-status"><span>{t.progress >= 1 ? '✅ Ready' : `⏳ ${Math.round(t.progress*100)}%`}</span></div>
               <div className="torrent-card-progress"><div className="torrent-card-progress-bar" style={{width: `${Math.max(t.progress*100, 5)}%`}} /></div>
            </button>
        ))}
      </div>

      {selectedTorrent && (
        <div className="details-overlay" onClick={() => setSelectedTorrent(null)}>
          <div className="details-modal" onClick={e => e.stopPropagation()}>
            <h2 className="details-title">{selectedTorrent.name}</h2>
            <button className="details-btn-watch tv-btn-primary" onClick={() => {
                const vid = selectedTorrent.files?.find(f => ['.mp4','.mkv'].some(x=>f.name.endsWith(x))) || selectedTorrent.files?.[0]
                if(vid) handlePlay(selectedTorrent.infoHash, vid.index, vid.name)
            }}>▶ WATCH</button>
            <button className="details-btn-delete mt-2" onClick={() => {
                 const vid = selectedTorrent.files?.[0]
                 if(vid) copyStreamUrl(selectedTorrent.infoHash, vid.index)
            }}>📋 Copy Link</button>
            <button className="details-btn-delete tv-btn-danger mt-4" onClick={() => deleteTorrent(selectedTorrent.infoHash)}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
```

### `client/android/app/src/main/java/com/torserve/pwa/TVPlayer.java`
```java
package com.torserve.pwa;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TVPlayer")
public class TVPlayer extends Plugin {

    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");
        String packageName = call.getString("package");

        if (url == null) {
            call.reject("URL is required");
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(Uri.parse(url), "video/*");
            
            if (packageName != null && !packageName.isEmpty()) {
                intent.setPackage(packageName);
            }

            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Error launching player: " + e.getMessage());
        }
    }
}
```

### `client/android/app/src/main/java/com/torserve/pwa/MainActivity.java`
```java
package com.torserve.pwa;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TVPlayer.class);
        super.onCreate(savedInstanceState);
    }
}
```
