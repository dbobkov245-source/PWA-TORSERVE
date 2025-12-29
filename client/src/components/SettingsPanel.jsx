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
