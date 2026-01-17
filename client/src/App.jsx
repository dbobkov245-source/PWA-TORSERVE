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
import HomePanel from './components/HomePanel'

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

  // State: Active View (v3.0 Discovery Home)
  const [activeView, setActiveView] = useState('home') // 'home' | 'list'

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
          {/* View Switcher */}
          <div className="flex bg-gray-800 rounded-full p-1">
            <button
              onClick={() => setActiveView('home')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${activeView === 'home' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              title="Главная"
            >
              🏠
            </button>
            <button
              onClick={() => setActiveView('list')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${activeView === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              title="Мои торренты"
            >
              📚
            </button>
          </div>
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

      {/* Home Panel (Discovery) */}
      {activeView === 'home' && (
        <HomePanel
          onSearch={(query) => {
            setSearchQuery(query)
            setActiveView('list')
            setShowSearch(true)
            // Trigger search after state update
            setTimeout(() => searchRuTracker(), 100)
          }}
          onClose={() => setActiveView('list')}
        />
      )}

      {/* Content Grid (My List) */}
      {activeView === 'list' && (
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
      )}

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
