import { useState, useEffect } from 'react'
import { registerPlugin, CapacitorHttp } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

// Register Custom Java Bridge
const TVPlayer = registerPlugin('TVPlayer')



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

// Format file size
const formatSize = (bytes) => {
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

// Format download speed
const formatSpeed = (bytesPerSec) => {
  if (!bytesPerSec || bytesPerSec < 1024) return ''
  const kbps = bytesPerSec / 1024
  if (kbps < 1024) return `${kbps.toFixed(0)} KB/s`
  return `${(kbps / 1024).toFixed(1)} MB/s`
}

// Format ETA (seconds to human readable)
const formatEta = (seconds) => {
  if (!seconds || seconds <= 0) return ''
  if (seconds < 60) return `${seconds}с`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}м`
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}ч ${mins}м`
}

const Poster = ({ name, onClick, progress, peers, isReady, size, downloadSpeed, downloaded, eta }) => {
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
        let result = null
        const query = encodeURIComponent(cleanedName)
        const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
        const KP_API_KEY = import.meta.env.VITE_KP_API_KEY

        // 1️⃣ Lampa Proxy (apn-latest.onrender.com) — обходит блокировки без VPN!
        if (!result) {
          try {
            const lampaProxy = 'https://apn-latest.onrender.com/'
            const tmdbPath = `api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${query}&language=ru-RU`
            const lampaUrl = lampaProxy + tmdbPath
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

        // 2️⃣ Fallback: CapacitorHttp (Android, требует VPN/DNS)
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

        // 3️⃣ Fallback: corsproxy.io (браузер)
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

        // 4️⃣ Fallback: Кинопоиск API (альтернатива TMDB)
        let kpPoster = null
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
                console.log('[Poster] Kinopoisk Found:', cleanedName, kpFilm.nameRu || kpFilm.nameEn)
              }
            }
          } catch (kpErr) {
            console.warn('[Poster] Kinopoisk failed:', kpErr)
          }
        }

        // Сохраняем постер (TMDB через wsrv.nl или Кинопоиск напрямую)
        if (result) {
          const directUrl = `https://wsrv.nl/?url=ssl:image.tmdb.org/t/p/w500${result.poster_path}&output=webp`
          localStorage.setItem(cacheKey, directUrl)
          setBgImage(directUrl)
          console.log('[Poster] Found:', cleanedName, result.title || result.name)
        } else if (kpPoster) {
          const kpUrl = `https://wsrv.nl/?url=${encodeURIComponent(kpPoster)}&output=webp`
          localStorage.setItem(cacheKey, kpUrl)
          setBgImage(kpUrl)
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
            {downloadSpeed > 0 && (
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

  // TMDB Proxy URL (как в Lampa) - если пусто, используется стандартный механизм
  const [tmdbProxyUrl, setTmdbProxyUrl] = useState(
    localStorage.getItem('tmdbProxyUrl') || ''
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

  // New: Sorting & Categories
  const [sortBy, setSortBy] = useState(localStorage.getItem('sortBy') || 'name')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [buffering, setBuffering] = useState(null) // { name, progress }

  // New: RuTracker Search
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Categories definition
  const CATEGORIES = [
    { id: 'all', name: 'Все', icon: '📚' },
    { id: 'movie', name: 'Фильмы', icon: '🎬' },
    { id: 'series', name: 'Сериалы', icon: '📺' },
    { id: 'music', name: 'Музыка', icon: '🎵' },
    { id: 'other', name: 'Другое', icon: '📁' }
  ]

  // Auto-detect category based on files
  const getCategory = (torrent) => {
    const files = torrent.files || []
    const videos = files.filter(f => /\.(mp4|mkv|avi|webm|mov)$/i.test(f.name))
    const audio = files.filter(f => /\.(mp3|flac|m4a|ogg|wav)$/i.test(f.name))

    if (audio.length > 0 && videos.length === 0) return 'music'
    if (videos.length > 1) return 'series'
    if (videos.length === 1) return 'movie'
    return 'other'
  }

  // Filter and sort torrents
  const getFilteredAndSortedTorrents = () => {
    let result = [...torrents]

    // Filter by category
    if (categoryFilter !== 'all') {
      result = result.filter(t => getCategory(t) === categoryFilter)
    }

    // Sort
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

  const savePreferredPlayer = (playerId) => {
    setPreferredPlayer(playerId)
    localStorage.setItem('preferredPlayer', playerId)
  }

  const saveSortBy = (sort) => {
    setSortBy(sort)
    localStorage.setItem('sortBy', sort)
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

  // Effect: Polling + Warmup
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)

    // Warmup external services (Render.com cold start prevention)
    const warmUpTargets = ['https://apn-latest.onrender.com/ping']
    warmUpTargets.forEach(url => fetch(url, { method: 'HEAD', mode: 'no-cors' }).catch(() => { }))

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

  // Logic: RuTracker Search
  const searchRuTracker = async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setSearchResults([])
    try {
      const res = await fetch(getApiUrl(`/api/rutracker/search?query=${encodeURIComponent(searchQuery)}`))
      const data = await res.json()
      setSearchResults(data.results || [])
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
      // Jacred returns magnet directly in search results
      if (magnetOrId && magnetOrId.startsWith('magnet:')) {
        await addMagnet(magnetOrId)
        setShowSearch(false)
        setSearchResults([])
        setSearchQuery('')
      } else {
        // Fallback: try to get magnet via API
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

  // Logic: Play single file
  const handlePlay = async (infoHash, fileIndex, fileName) => {
    const streamUrl = getStreamUrl(infoHash, fileIndex)
    const title = cleanTitle(fileName)
    const pkg = preferredPlayer

    console.log(`[Play] URL: ${streamUrl} | Package: ${pkg} | Title: ${title}`)

    // Check if selected player is installed (skip for system chooser)
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

    // Show buffering banner
    setBuffering({ name: title, progress: 10 })
    setSelectedTorrent(null) // Close modal

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

  // Logic: Play All (playlist for series)
  const handlePlayAll = async (torrent, startIndex = 0) => {
    const videoFiles = torrent.files?.filter(f =>
      /\.(mp4|mkv|avi|webm|mov)$/i.test(f.name)
    ) || []

    if (videoFiles.length <= 1) {
      // Single file, use normal play
      const file = videoFiles[0] || torrent.files?.[0]
      if (file) handlePlay(torrent.infoHash, file.index, file.name)
      return
    }

    const pkg = preferredPlayer
    const title = cleanTitle(torrent.name)
    const urls = videoFiles.map(f => getStreamUrl(torrent.infoHash, f.index))
    const names = videoFiles.map(f => cleanTitle(f.name) || f.name)

    console.log(`[PlayAll] ${urls.length} files | Package: ${pkg}`)

    // Check if selected player is installed
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

    // Show buffering banner
    setBuffering({ name: `${title} (${urls.length} files)`, progress: 10 })
    setSelectedTorrent(null) // Close modal

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

                {/* TMDB Proxy URL (как в Lampa) */}
                <label className="text-gray-400 text-sm mb-2 block mt-4">TMDB API Proxy (опционально)</label>
                <div className="flex gap-2">
                  <input
                    value={tmdbProxyUrl}
                    onChange={e => setTmdbProxyUrl(e.target.value)}
                    onBlur={e => {
                      localStorage.setItem('tmdbProxyUrl', e.target.value)
                    }}
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
              onClick={() => {
                const keys = Object.keys(localStorage).filter(k => k.startsWith('poster_'))
                keys.forEach(k => localStorage.removeItem(k))
                alert(`Очищено ${keys.length} постеров. Перезагрузите приложение.`)
                window.location.reload()
              }}
              className="mt-4 text-red-400 text-sm hover:text-red-300 flex items-center gap-2"
            >
              🗑️ Очистить кэш постеров ({Object.keys(localStorage).filter(k => k.startsWith('poster_')).length} шт.)
            </button>

            {/* Test Poster Button (Direct with VITE keys) */}
            <button
              onClick={async () => {
                const testName = 'The Beekeeper'
                const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${import.meta.env.VITE_TMDB_API_KEY}&query=${encodeURIComponent(testName)}&language=ru-RU`

                let msg = `🧪 Тест постера: "${testName}"\n\n`

                // Test 1: CapacitorHttp (native)
                if (Capacitor.isNativePlatform()) {
                  try {
                    msg += '1️⃣ CapacitorHttp: '
                    const response = await CapacitorHttp.get({ url: searchUrl })
                    if (response.data?.results?.length > 0) {
                      const r = response.data.results[0]
                      msg += `✅ Найдено: ${r.title || r.name}\n`
                    } else {
                      msg += `❌ Нет результатов\n`
                    }
                  } catch (e) {
                    msg += `❌ Ошибка: ${e.message}\n`
                  }
                } else {
                  msg += '1️⃣ CapacitorHttp: ⏭️ пропущен (не Android)\n'
                }

                // Test 2: corsproxy.io
                try {
                  msg += '2️⃣ corsproxy.io: '
                  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(searchUrl)}`
                  const res = await fetch(proxyUrl)
                  if (res.ok) {
                    const data = await res.json()
                    if (data.results?.length > 0) {
                      const r = data.results[0]
                      msg += `✅ Найдено: ${r.title || r.name}\n`
                    } else {
                      msg += `❌ Нет результатов\n`
                    }
                  } else {
                    msg += `❌ HTTP ${res.status}\n`
                  }
                } catch (e) {
                  msg += `❌ Ошибка: ${e.message}\n`
                }

                alert(msg)
              }}
              className="mt-2 text-blue-400 text-sm hover:text-blue-300 flex items-center gap-2"
            >
              🧪 Тест (Direct)
            </button>
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="px-6 py-4">
        {/* Add Button */}
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

        {/* RuTracker Search Panel */}
        {showSearch && (
          <div className="mb-6 p-4 bg-gray-900 rounded-xl border border-purple-600/50 animate-fade-in">
            <div className="flex gap-2 mb-4">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchRuTracker()}
                placeholder="Поиск на RuTracker..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                autoFocus
              />
              <button
                onClick={searchRuTracker}
                disabled={searchLoading}
                className="bg-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50"
              >
                {searchLoading ? '...' : '🔍'}
              </button>
              <button
                onClick={() => { setShowSearch(false); setSearchResults([]) }}
                className="bg-gray-800 px-4 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {searchResults.map((r, i) => (
                  <div
                    key={r.id || i}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{r.title}</div>
                      <div className="text-xs text-gray-400 flex gap-3 mt-1">
                        <span>📀 {r.size}</span>
                        <span className="text-green-400">⬆ {r.seeders}</span>
                        {r.tracker && <span className="text-purple-400">{r.tracker}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => addFromSearch(r.magnet || r.id, r.title)}
                      disabled={searchLoading}
                      className="ml-3 bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-sm font-bold disabled:opacity-50"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            )}

            {searchLoading && (
              <div className="text-center text-gray-400 py-4">
                <span className="animate-pulse">Поиск...</span>
              </div>
            )}
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
          {displayTorrents.map(t => (
            <Poster
              key={t.infoHash}
              name={t.name}
              progress={t.progress}
              peers={t.numPeers}
              size={t.totalSize || t.files?.reduce((sum, f) => sum + (f.length || 0), 0) || 0}
              downloaded={t.downloaded || 0}
              downloadSpeed={t.downloadSpeed || 0}
              eta={t.eta || 0}
              isReady={t.progress >= 1 || (t.progress === 0 && t.files?.length > 0)}
              onClick={() => setSelectedTorrent(t)}
            />
          ))}

          {displayTorrents.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center text-gray-600">
              <div className="text-6xl mb-4">{categoryFilter === 'all' ? '🍿' : CATEGORIES.find(c => c.id === categoryFilter)?.icon}</div>
              <p className="text-lg">{categoryFilter === 'all' ? 'Your list is empty.' : 'Нет торрентов в этой категории'}</p>
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
                {/* Play button */}
                <button
                  autoFocus
                  onClick={() => {
                    const video = selectedTorrent.files?.find(f => /\.(mp4|mkv|avi|mov|webm)$/i.test(f.name)) || selectedTorrent.files?.[0]
                    if (video) handlePlay(selectedTorrent.infoHash, video.index, video.name)
                    else alert("No video files recognized")
                  }}
                  className="w-full bg-white text-black py-4 rounded font-bold hover:bg-gray-200 focus:bg-yellow-400 text-lg transition-colors flex items-center justify-center gap-2"
                >
                  ▶ Play
                </button>

                {/* Play All button - only show if multiple video files */}
                {selectedTorrent.files?.filter(f => /\.(mp4|mkv|avi|mov|webm)$/i.test(f.name)).length > 1 && (
                  <button
                    onClick={() => handlePlayAll(selectedTorrent)}
                    className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 focus:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                  >
                    📺 Play All ({selectedTorrent.files?.filter(f => /\.(mp4|mkv|avi|mov|webm)$/i.test(f.name)).length} episodes)
                  </button>
                )}

                {/* Episode List - TV Remote Friendly (no scroll container) */}
                {selectedTorrent.files?.filter(f => /\.(mp4|mkv|avi|mov|webm)$/i.test(f.name)).length > 1 && (
                  <div className="bg-gray-900 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-gray-800 text-gray-400 text-sm font-medium">
                      📋 Выбор серии ({selectedTorrent.files?.filter(f => /\.(mp4|mkv|avi|mov|webm)$/i.test(f.name)).length})
                    </div>
                    {selectedTorrent.files
                      ?.filter(f => /\.(mp4|mkv|avi|mov|webm)$/i.test(f.name))
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .slice(0, 20) // Limit to 20 to avoid huge lists
                      .map((file, idx) => (
                        <button
                          key={file.index}
                          onClick={() => handlePlay(selectedTorrent.infoHash, file.index, file.name)}
                          className="w-full px-3 py-3 text-left border-t border-gray-800 hover:bg-gray-800 focus:bg-blue-600 focus:text-white focus:outline-none transition-colors flex items-center gap-3"
                        >
                          <span className="text-blue-400 font-mono text-sm w-8 focus:text-white">{idx + 1}</span>
                          <span className="flex-1 text-sm text-gray-300 truncate">{cleanTitle(file.name) || file.name}</span>
                          <span className="text-xs text-gray-500">{formatSize(file.length)}</span>
                        </button>
                      ))}
                  </div>
                )}

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
