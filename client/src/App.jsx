import { useState, useEffect } from 'react'
import { registerPlugin } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

// Register Custom Java Bridge
const TVPlayer = registerPlugin('TVPlayer')

const TMDB_API_KEY = 'c3bec60e67fabf42dd2202281dcbc9a7'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const cleanTitle = (rawName) => {
  if (!rawName) return ''

  // 1. Initial cleanup: dots, underscores, brackets
  let name = rawName
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .trim()

  // 2. Cut off at Year (e.g. "Movie Title 2023 ...")
  const yearMatch = name.match(/\b(19\d{2}|20\d{2})\b/)
  if (yearMatch) {
    const index = name.indexOf(yearMatch[0])
    name = name.substring(0, index)
  }

  // 3. Remove technical/garbage tags
  const tags = [
    '1080p', '720p', '2160p', '4k', 'WEB-DL', 'WEBRip', 'BluRay', 'HDR',
    'H.264', 'x264', 'HEVC', 'AAC', 'AC3', 'DTS', 'HDTV',
    'rus', 'eng', 'torrent', 'stream', 'dub', 'sub'
  ]

  // Find the earliest occurrence of a tag and cut
  let cutoff = name.length
  const lowerName = name.toLowerCase()
  tags.forEach(tag => {
    // Match strict word boundary so we don't cut "stream" in "Mainstream"
    // actually user asked to remove "stream", usually these are separated by spaces after dot replacement
    const idx = lowerName.indexOf(tag.toLowerCase())
    if (idx !== -1 && idx < cutoff) {
      cutoff = idx
    }
  })

  return name.substring(0, cutoff)
    .replace(/[^\w\s\u0400-\u04FF]/g, '') // remove weird symbols
    .replace(/\s+/g, ' ')
    .trim()
}

// ─────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────

const Poster = ({ name, onClick, progress, peers, isReady }) => {
  const [bgImage, setBgImage] = useState(null)
  const cleanedName = cleanTitle(name)

  // Gradient generator for fallback (Beautiful Offline UI)
  const getGradient = (str) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
    const h1 = Math.abs(hash % 360)
    const h2 = Math.abs((hash * 13) % 360)
    return `linear-gradient(135deg, hsl(${h1}, 70%, 20%), hsl(${h2}, 80%, 15%))`
  }

  useEffect(() => {
    if (!cleanedName) return

    const cacheKey = `poster_v3_${cleanedName}` // Bump cache version
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      setBgImage(cached)
      return
    }

    const fetchPoster = async () => {
      try {
        const TMDB_API_KEY = 'c3bec60e67fabf42dd2202281dcbc9a7'
        let result = null

        // 1. Try Client-Side Search (Bypass Server)
        // We use api.allorigins.win to avoid CORS issues and bypass local blocking
        try {
          const tmdbUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanedName)}&language=ru-RU`
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(tmdbUrl)}`

          console.log('[Poster] Client Search:', proxyUrl)
          const res = await fetch(proxyUrl)
          if (res.ok) {
            const data = await res.json()
            result = data.results?.find(r => r.poster_path)
          }
        } catch (e) {
          console.warn('[Poster] Client Search Failed:', e)
        }

        // 2. Fallback to Server (only if client search failed, though server is likely offline)
        if (!result) {
          let baseUrl = ''
          if (Capacitor.isNativePlatform()) {
            baseUrl = localStorage.getItem('serverUrl') || 'http://192.168.1.70:3000'
          }
          baseUrl = baseUrl.replace(/\/$/, '')
          const apiUrl = `${baseUrl}/api/tmdb/search?query=${encodeURIComponent(cleanedName)}`
          console.log('[Poster] Fetching Meta (Server Fallback):', apiUrl) // Added console log for clarity
          const res = await fetch(apiUrl)
          if (res.ok) {
            const data = await res.json()
            result = data.results?.find(r => r.poster_path)
          }
        }

        // 3. If we found a poster (either way), show it via wsrv.nl
        if (result) {
          const directUrl = `https://wsrv.nl/?url=ssl:image.tmdb.org/t/p/w500${result.poster_path}&output=webp`
          localStorage.setItem(cacheKey, directUrl)
          setBgImage(directUrl)
        }
      } catch (err) {
        console.warn('Poster Fetch Fail:', err)
      }
    }

    fetchPoster()
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
          {isReady ? (
            <span className="bg-green-500 text-white text-[10px] font-black tracking-wider px-2 py-0.5 rounded shadow-sm">READY</span>
          ) : (
            <span className="bg-yellow-500 text-black text-[10px] font-black tracking-wider px-2 py-0.5 rounded shadow-sm">{Math.round(progress * 100)}%</span>
          )}
        </div>

        {/* Footer Stats */}
        <div className="text-xs text-gray-400 flex items-center gap-2 mt-auto">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>
            {peers}
          </span>
          {!isReady && (
            <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div style={{ width: `${progress * 100}%` }} className="h-full bg-blue-500" />
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

const DegradedBanner = ({ lastStateChange }) => {
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

const ErrorScreen = ({ status, retryAfter, onRetry }) => {
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

// ─────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────

function App() {
  // Constants
  const PLAYERS = [
    { id: 'net.gtvbox.videoplayer', name: 'Vimu Player (Рекомендуем)' },
    { id: 'org.videolan.vlc', name: 'VLC for Android' },
    { id: 'com.mxtech.videoplayer.ad', name: 'MX Player' },
    { id: '', name: 'System Chooser (Спрашивать всегда)' }
  ];

  // State
  const [serverUrl, setServerUrl] = useState(() => {
    if (Capacitor.isNativePlatform()) {
      return localStorage.getItem('serverUrl') || 'http://192.168.1.70:3000'
    }
    return ''
  })

  const [preferredPlayer, setPreferredPlayer] = useState(
    localStorage.getItem('preferredPlayer') || 'net.gtvbox.videoplayer'
  )

  const [torrents, setTorrents] = useState([])
  const [magnet, setMagnet] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showServerInput, setShowServerInput] = useState(false)
  const [selectedTorrent, setSelectedTorrent] = useState(null)

  const [serverStatus, setServerStatus] = useState('ok')
  const [lastStateChange, setLastStateChange] = useState(null)
  const [retryAfter, setRetryAfter] = useState(null)

  const savePreferredPlayer = (playerId) => {
    setPreferredPlayer(playerId)
    localStorage.setItem('preferredPlayer', playerId)
  }

  const saveServerUrl = (url) => {
    setServerUrl(url)
    localStorage.setItem('serverUrl', url)
    setShowSettings(false)
    fetchStatus()
  }

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

  // Effect: Polling
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [serverUrl])

  // Effect: Magnet Handler
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

  // Logic: Add Torrent
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

  // ─── Hardware Back Button & Keyboard Handling ───
  useEffect(() => {
    const handleBack = () => {
      if (selectedTorrent) {
        setSelectedTorrent(null)
      } else if (showSettings) {
        setShowSettings(false)
      } else {
        // Use exitApp instead of minimize for better TV UX
        CapacitorApp.exitApp()
      }
    }

    const backListener = CapacitorApp.addListener('backButton', () => {
      console.log('Native Back Button')
      handleBack()
    })

    const keyListener = (e) => {
      // 27=Esc, 8=Backspace, 10009=TV Back
      if (e.key === 'Escape' || e.key === 'Backspace' || e.keyCode === 10009) {
        handleBack()
      }
    }
    window.addEventListener('keydown', keyListener)

    return () => {
      backListener.then(h => h.remove())
      window.removeEventListener('keydown', keyListener)
    }
  }, [selectedTorrent, showSettings])

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

  // Logic: Play
  const handlePlay = async (infoHash, fileIndex, fileName) => {
    const streamUrl = getStreamUrl(infoHash, fileIndex)
    const pkg = preferredPlayer // Use stored preference

    console.log(`[Play] URL: ${streamUrl} | Package: ${pkg}`)

    try {
      await TVPlayer.play({ url: streamUrl, package: pkg })
    } catch (e) {
      console.error(`[Play] Failed with ${pkg}, trying system chooser...`)
      try {
        await TVPlayer.play({ url: streamUrl, package: "" })
      } catch (err) {
        alert("Error launching player: " + err.message)
      }
    }
  }

  const copyUrl = (infoHash, fileIndex) => {
    const url = getStreamUrl(infoHash, fileIndex)
    navigator.clipboard?.writeText(url)
      .then(() => alert('URL copied!'))
      .catch(() => alert('Failed to copy'))
  }

  // Render: Critical Error
  if (serverStatus === 'circuit_open' || serverStatus === 'error') {
    return <ErrorScreen status={serverStatus} retryAfter={retryAfter} onRetry={fetchStatus} />
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans selection:bg-red-500 selection:text-white pb-20">

      {/* Navbar */}
      <div className="sticky top-0 z-30 bg-[#141414]/90 backdrop-blur-md px-6 py-4 flex justify-between items-center shadow-lg border-b border-gray-800">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
          PWA-TorServe
        </h1>
        <div className="flex gap-4">
          <button onClick={fetchStatus} className="p-2 hover:bg-gray-800 rounded-full transition-colors">🔄</button>
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-gray-800 rounded-full transition-colors">⚙️</button>
        </div>
      </div>

      {/* Status Banner */}
      {serverStatus === 'degraded' && <DegradedBanner lastStateChange={lastStateChange} />}

      {/* Settings Panel */}
      {showSettings && (
        <div className="mx-6 mb-6 p-6 bg-gray-900 rounded-xl border border-gray-800 shadow-2xl animate-fade-in relative z-20">
          <h2 className="text-xl font-bold mb-4 text-gray-200">Settings</h2>

          <div className="mb-6">
            <label className="text-gray-400 text-sm mb-3 block">Default Video Player</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PLAYERS.map(p => (
                <button
                  key={p.id}
                  onClick={() => savePreferredPlayer(p.id)}
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

          <div className="border-t border-gray-800 pt-4">
            <button
              onClick={() => setShowServerInput(!showServerInput)}
              className="text-gray-500 text-sm hover:text-white flex items-center gap-2"
            >
              {showServerInput ? '▼' : '▶'} Advanced: Server Connection
            </button>

            {showServerInput && (
              <div className="mt-3 animate-fade-in">
                <label className="text-gray-400 text-sm mb-2 block">Server URL</label>
                <div className="flex gap-2">
                  <input
                    value={serverUrl}
                    onChange={e => setServerUrl(e.target.value)}
                    onBlur={e => saveServerUrl(e.target.value)}
                    placeholder="http://192.168.1.70:3000"
                    className="bg-gray-800 text-white px-4 py-2 rounded flex-1 border border-gray-700 focus:border-blue-500 outline-none"
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">Change only if moving to a new server IP.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="px-6 py-4">
        {/* Add Button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-200">My List</h2>
          {!showServerInput && (
            <button
              onClick={() => setShowServerInput(true)}
              className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-full text-sm font-bold border border-gray-600 transition-transform hover:scale-105"
            >
              + Add Magnet
            </button>
          )}
        </div>

        {/* Input Form */}
        {showServerInput && (
          <form onSubmit={addTorrent} className="mb-8 flex gap-2 animate-fade-in">
            <input
              value={magnet}
              onChange={e => setMagnet(e.target.value)}
              placeholder="Paste magnet link..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
            />
            <button disabled={loading} className="bg-blue-600 px-6 py-3 rounded-lg font-bold">
              {loading ? 'Adding...' : 'Add'}
            </button>
            <button type="button" onClick={() => setShowServerInput(false)} className="bg-gray-800 px-4 rounded-lg">✕</button>
          </form>
        )}

        {error && <div className="bg-red-900/50 text-red-200 p-4 rounded-lg mb-6 border border-red-800">{error}</div>}

        {/* The GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {torrents.map(t => (
            <Poster
              key={t.infoHash}
              name={t.name}
              progress={t.progress}
              peers={t.numPeers}
              isReady={t.progress >= 1 || t.files?.length > 0}
              onClick={() => setSelectedTorrent(t)}
            />
          ))}

          {torrents.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center text-gray-600">
              <div className="text-6xl mb-4">🍿</div>
              <p className="text-lg">Your list is empty.</p>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedTorrent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedTorrent(null)}>
          <div className="bg-[#181818] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="h-32 bg-gradient-to-br from-blue-900 to-gray-900 p-6 flex items-end relative">
              <button onClick={() => setSelectedTorrent(null)} className="absolute top-4 right-4 bg-black/40 rounded-full p-2 text-white hover:bg-black/60 transition-colors">✕</button>
              <h2 className="text-2xl font-bold leading-tight shadow-black drop-shadow-lg line-clamp-2">{cleanTitle(selectedTorrent.name)}</h2>
            </div>

            <div className="p-6">
              <div className="text-sm text-gray-400 mb-6 font-mono break-all text-xs border-l-2 border-gray-700 pl-3">
                {selectedTorrent.name}
              </div>

              <div className="space-y-3">
                <button
                  autoFocus
                  onClick={() => {
                    const video = selectedTorrent.files?.find(f => /\.(mp4|mkv|avi|mov)$/i.test(f.name)) || selectedTorrent.files?.[0]
                    if (video) handlePlay(selectedTorrent.infoHash, video.index, video.name)
                    else alert("No video files recognized")
                  }}
                  className="w-full bg-white text-black py-4 rounded font-bold hover:bg-gray-200 focus:bg-yellow-400 text-lg transition-colors flex items-center justify-center gap-2"
                >
                  ▶ Play
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const video = selectedTorrent.files?.[0]
                      if (video) copyUrl(selectedTorrent.infoHash, video.index)
                    }}
                    className="flex-1 bg-gray-800 text-gray-300 py-3 rounded font-medium hover:bg-gray-700"
                  >
                    Copy Link
                  </button>
                  <button
                    onClick={() => deleteTorrent(selectedTorrent.infoHash)}
                    className="flex-1 bg-gray-800 text-red-400 py-3 rounded font-medium hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
