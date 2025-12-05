# PWA-TorServe

**Самовосстанавливающийся torrent-стример для Android TV и мобильных устройств.**

Node.js сервер с torrent-stream + React PWA клиент с Capacitor APK.

## Возможности
- 🎬 Стриминг торрентов через HTTP
- 📱 PWA + Android APK (Capacitor)
- 🛡️ Self-Healing Watchdog (RAM мониторинг, Circuit Breaker)
- 🧹 File Hygiene (автоудаление файлов)
- 📊 4 состояния сервера: ok, degraded, error, circuit_open

---

## Server

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

app.use(cors())
app.use(express.json())

const distPath = path.join(__dirname, '../client/dist')
app.use(express.static(distPath))

// Health Check
app.get('/api/health', (req, res) => {
    const state = getServerState()
    res.json({ serverStatus: state.serverStatus, lastStateChange: state.lastStateChange })
})

// Status
app.get('/api/status', (req, res) => {
    const state = getServerState()
    if (state.serverStatus === 'circuit_open' || state.serverStatus === 'error') {
        res.set('Retry-After', '300')
        return res.status(503).json({ serverStatus: state.serverStatus, lastStateChange: state.lastStateChange, torrents: [] })
    }
    const torrents = getAllTorrents().map(t => ({
        infoHash: t.infoHash, name: t.name, progress: t.progress,
        downloadSpeed: t.downloadSpeed, numPeers: t.numPeers,
        files: t.files.map(f => ({ name: f.name, length: f.length, index: f.index }))
    }))
    res.json({ serverStatus: state.serverStatus, lastStateChange: state.lastStateChange, torrents })
})

// Add Torrent
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

// Remove Torrent + File Hygiene
app.delete('/api/delete/:infoHash', (req, res) => {
    const { infoHash } = req.params
    const torrent = getTorrent(infoHash)
    const success = removeTorrent(infoHash)
    if (success) {
        if (torrent?.name) {
            const downloadPath = process.env.DOWNLOAD_PATH || './downloads'
            const fullPath = path.join(downloadPath, torrent.name)
            try {
                if (fs.existsSync(fullPath)) {
                    fs.rmSync(fullPath, { recursive: true, force: true })
                    console.log(`[File Hygiene] Deleted: ${fullPath}`)
                }
            } catch (e) { console.error(`[File Hygiene] Error: ${e.message}`) }
        }
        res.json({ success: true })
    } else {
        res.status(404).json({ error: 'Torrent not found' })
    }
})

// Stream
app.get('/stream/:infoHash/:fileIndex', async (req, res) => {
    const { infoHash, fileIndex } = req.params
    const range = req.headers.range
    const engine = getRawTorrent(infoHash)
    if (!engine) return res.status(404).send('Torrent not found')
    const file = engine.files?.[fileIndex]
    if (!file) return res.status(404).send('File not found')

    if (!range) {
        res.writeHead(200, { 'Content-Length': file.length, 'Content-Type': 'video/mp4' })
        file.createReadStream().pipe(res)
    } else {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${file.length}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': (end - start) + 1,
            'Content-Type': 'video/mp4',
        })
        file.createReadStream({ start, end }).pipe(res)
    }
})

// SPA Fallback
app.get('*', (req, res) => {
    if (fs.existsSync(path.join(distPath, 'index.html'))) {
        res.sendFile(path.join(distPath, 'index.html'))
    } else {
        res.send('Frontend not built')
    }
})

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
    startWatchdog().catch(err => console.error('[Watchdog] Failed:', err.message))
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
            if (key === magnetURI) return resolve(formatEngine(engine))
        }

        const path = process.env.DOWNLOAD_PATH || './downloads'
        const engine = torrentStream(magnetURI, {
            path, connections: 20, uploads: 0, dht: true, verify: false
        })

        engine.on('ready', () => {
            engines.set(magnetURI, engine)
            engines.set(engine.infoHash, engine)
            resolve(formatEngine(engine))
        })

        setTimeout(() => {
            if (!engines.has(magnetURI)) {
                engine.destroy()
                reject(new Error('Torrent timeout: 60s'))
            }
        }, 60000)
    })
}

export const removeTorrent = (infoHash) => {
    const engine = engines.get(infoHash)
    if (!engine) return false
    engine.destroy()
    engines.delete(infoHash)
    for (const [key, val] of engines.entries()) {
        if (val === engine) engines.delete(key)
    }
    return true
}

export const getTorrent = (infoHash) => {
    const engine = engines.get(infoHash)
    return engine ? formatEngine(engine) : null
}

export const getRawTorrent = (infoHash) => engines.get(infoHash) || null

export const getAllTorrents = () => {
    return Array.from(new Set(engines.values())).map(formatEngine)
}

const formatEngine = (engine) => ({
    infoHash: engine.infoHash,
    name: engine.torrent?.name || 'Unknown',
    progress: 0,
    downloadSpeed: engine.swarm?.downloadSpeed() || 0,
    numPeers: engine.swarm?.wires?.length || 0,
    files: engine.files?.map((f, i) => ({ name: f.name, length: f.length, index: i })) || []
})
```

### `server/watchdog.js`
```javascript
import { db } from './db.js'
import fs from 'fs'

const CONFIG = {
    CHECK_INTERVAL_MS: 30000,
    RAM_OK_THRESHOLD_MB: 500,
    RAM_DEGRADED_THRESHOLD_MB: 600,
    HYSTERESIS_DELAY_MS: 30000,
    STORAGE_CHECK_TIMEOUT_MS: 5000,
    CIRCUIT_BREAKER_THRESHOLD: 3,
    CIRCUIT_BREAKER_COOLDOWN_MS: 300000
}

let degradedSince = null, circuitOpenUntil = null, isRunning = false

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const getRAMUsageMB = () => Math.round(process.memoryUsage().rss / 1024 / 1024)

const checkStorage = () => new Promise((resolve) => {
    const path = process.env.DOWNLOAD_PATH || './downloads'
    const timeout = setTimeout(() => resolve(false), CONFIG.STORAGE_CHECK_TIMEOUT_MS)
    fs.access(path, fs.constants.R_OK | fs.constants.W_OK, (err) => {
        if (err) {
            fs.mkdir(path, { recursive: true }, (e) => {
                clearTimeout(timeout)
                resolve(!e)
            })
        } else {
            clearTimeout(timeout)
            resolve(true)
        }
    })
})

const updateStatus = async (status) => {
    if (db.data.serverStatus !== status) {
        db.data.serverStatus = status
        db.data.lastStateChange = Date.now()
        if (status === 'ok') { db.data.storageFailures = 0; degradedSince = null }
        await db.write()
    }
}

const performCheck = async () => {
    const now = Date.now(), ramMB = getRAMUsageMB()

    if (circuitOpenUntil) {
        if (now < circuitOpenUntil) return
        if (await checkStorage()) { circuitOpenUntil = null; await updateStatus('ok') }
        else { circuitOpenUntil = now + CONFIG.CIRCUIT_BREAKER_COOLDOWN_MS; db.data.lastStateChange = now; await db.write() }
        return
    }

    if (!(await checkStorage())) {
        db.data.storageFailures = (db.data.storageFailures || 0) + 1
        if (db.data.storageFailures >= CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
            circuitOpenUntil = now + CONFIG.CIRCUIT_BREAKER_COOLDOWN_MS
            await updateStatus('circuit_open')
            return
        }
    } else if (db.data.storageFailures > 0) {
        db.data.storageFailures = 0
        await db.write()
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
    if (isRunning) return
    isRunning = true
    try { await performCheck() } catch (e) { console.error('[Watchdog]', e.message) }
    while (isRunning) {
        await sleep(CONFIG.CHECK_INTERVAL_MS)
        try { await performCheck() } catch (e) { console.error('[Watchdog]', e.message) }
    }
}

export const stopWatchdog = () => { isRunning = false }

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

const defaultData = { serverStatus: 'ok', lastStateChange: Date.now(), storageFailures: 0, progress: {} }
const db = new Low(new JSONFile('db.json'), defaultData)
await db.read()
db.data = { ...defaultData, ...db.data }
db.data.progress ||= {}
await db.write()

export { db }
```

---

## Client

### `client/src/App.jsx`
```jsx
import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

const DegradedBanner = ({ lastStateChange }) => {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!lastStateChange) return
    const i = setInterval(() => setElapsed(Math.floor((Date.now() - lastStateChange) / 1000)), 1000)
    return () => clearInterval(i)
  }, [lastStateChange])
  return (
    <div className="bg-yellow-600/90 text-yellow-100 p-4 rounded-lg mb-6 border border-yellow-500 animate-pulse">
      <div className="flex items-center gap-3">
        <span className="text-2xl">❄️</span>
        <div>
          <div className="font-bold">Cooling Down</div>
          <div className="text-sm">High memory usage. {Math.floor(elapsed/60)}m {elapsed%60}s</div>
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
        <button onClick={onRetry} className="mt-6 bg-red-600 text-white px-6 py-3 rounded-lg font-bold">
          Retry Now
        </button>
      </div>
    </div>
  )
}

function App() {
  const defaultUrl = Capacitor.isNativePlatform() ? (localStorage.getItem('serverUrl') || 'http://192.168.1.88:3000') : ''
  const [serverUrl, setServerUrl] = useState(defaultUrl)
  const [torrents, setTorrents] = useState([])
  const [magnet, setMagnet] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [expanded, setExpanded] = useState({})
  const [serverStatus, setServerStatus] = useState('ok')
  const [lastStateChange, setLastStateChange] = useState(null)
  const [retryAfter, setRetryAfter] = useState(null)

  const getApiUrl = (path) => serverUrl ? `${serverUrl.replace(/\/$/, '')}${path}` : path
  const getStreamUrl = (infoHash, fileIndex) => {
    if (serverUrl) return `${serverUrl.replace(/\/$/, '')}/stream/${infoHash}/${fileIndex}`
    return `${location.protocol}//${location.host}/stream/${infoHash}/${fileIndex}`
  }

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
    } catch (e) { if (!torrents.length) setError(`Connection Error: ${e.message}`) }
  }

  useEffect(() => {
    fetchStatus()
    const i = setInterval(fetchStatus, 5000)
    return () => clearInterval(i)
  }, [serverUrl])

  const addTorrent = async (e) => {
    e.preventDefault()
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

  const handlePlay = async (infoHash, fileIndex) => {
    const url = getStreamUrl(infoHash, fileIndex)
    if (Capacitor.isNativePlatform()) {
      try { await Browser.open({ url, windowName: '_system' }) }
      catch { window.open(url, '_blank') }
    } else window.open(url, '_blank')
  }

  if (serverStatus === 'circuit_open' || serverStatus === 'error') {
    return <ErrorScreen status={serverStatus} retryAfter={retryAfter || 300} onRetry={fetchStatus} />
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 overflow-x-hidden">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-500">PWA-TorServe</h1>
        <div className="flex gap-4">
          <button onClick={fetchStatus} className="text-gray-400 hover:text-white">🔄</button>
          <button onClick={() => setShowSettings(!showSettings)} className="text-gray-400 hover:text-white">⚙️</button>
        </div>
      </div>

      {serverStatus === 'degraded' && <DegradedBanner lastStateChange={lastStateChange} />}

      {showSettings && (
        <div className="mb-6 p-4 bg-gray-800 rounded border border-gray-700">
          <input type="text" defaultValue={serverUrl}
            onBlur={(e) => { setServerUrl(e.target.value); localStorage.setItem('serverUrl', e.target.value); setShowSettings(false) }}
            placeholder="http://192.168.1.88:3000"
            className="w-full p-2 rounded bg-gray-900 border border-gray-600 text-white" />
        </div>
      )}

      <form onSubmit={addTorrent} className="mb-8 max-w-2xl mx-auto flex gap-2">
        <input type="text" value={magnet} onChange={(e) => setMagnet(e.target.value)}
          placeholder="Paste Magnet URI..." className="flex-1 p-3 rounded bg-gray-800 border border-gray-700 text-white" />
        <button type="submit" disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded font-bold disabled:opacity-50">
          {loading ? '...' : 'Add'}
        </button>
      </form>

      {error && <div className="text-red-500 text-center mb-4 bg-red-900/20 p-2 rounded">{error}</div>}

      <div className="grid gap-4 max-w-4xl mx-auto">
        {torrents.map((t) => (
          <div key={t.infoHash} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-start mb-2 cursor-pointer" onClick={() => setExpanded(p => ({...p, [t.infoHash]: !p[t.infoHash]}))}>
              <h2 className="text-xl font-semibold truncate flex-1">
                <span className="text-gray-500 text-sm mr-2">{expanded[t.infoHash] ? '▼' : '▶'}</span>
                {t.name}
              </h2>
              <div className="text-right text-sm text-gray-400">
                {(t.downloadSpeed / 1024 / 1024).toFixed(2)} MB/s • {t.numPeers} peers
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${t.progress * 100}%` }} />
            </div>
            {expanded[t.infoHash] && (
              <div className="space-y-2">
                {t.files.map((f) => (
                  <div key={f.index} className="bg-gray-700/50 p-3 rounded">
                    <div className="mb-2">
                      <div className="truncate text-sm">{f.name}</div>
                      <div className="text-xs text-gray-400">{(f.length / 1024 / 1024).toFixed(0)} MB</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { navigator.clipboard.writeText(getStreamUrl(t.infoHash, f.index)); alert('Copied!') }}
                        className="flex-1 bg-gray-600 text-white px-3 py-2 rounded text-sm font-bold">📋 Copy</button>
                      <button onClick={() => handlePlay(t.infoHash, f.index)}
                        className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm font-bold">▶️ Play</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-700 flex justify-end">
              <button onClick={() => deleteTorrent(t.infoHash)} className="text-red-400 text-sm">Remove</button>
            </div>
          </div>
        ))}
        {!torrents.length && (
          <div className="text-center text-gray-500 p-8 bg-gray-800/50 rounded-lg border border-gray-700 border-dashed">
            No torrents. Add a magnet link.
          </div>
        )}
      </div>
    </div>
  )
}

export default App
```

### `client/src/index.css`
```css
@import "tailwindcss";

html, body { overflow-x: hidden; width: 100%; max-width: 100vw; }
#root { min-height: 100vh; width: 100%; overflow-x: hidden; }

@media (max-width: 640px) {
  .p-4 { padding: 0.75rem; }
  .text-3xl { font-size: 1.5rem; }
  .text-xl { font-size: 1rem; }
  .flex.gap-2 { flex-wrap: wrap; }
  .flex.gap-2 > button { flex: 1 1 auto; min-width: 60px; }
}

.animate-fade-in { animation: fadeIn 0.2s ease-out; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
```

---

## Запуск

```bash
# Сервер
cd server && npm install && node index.js

# Клиент (билд)
cd client && npm install && npm run build

# APK
cd client && npx cap sync android && cd android && ./gradlew assembleDebug
```

**APK:** `client/android/app/build/outputs/apk/debug/app-debug.apk`
