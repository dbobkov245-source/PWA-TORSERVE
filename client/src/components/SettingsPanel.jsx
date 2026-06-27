import { useState, useEffect, useRef, useCallback } from 'react'
import { App } from '@capacitor/app'
import { useSpatialItem } from '../hooks/useSpatialNavigation'
import { cleanTitle } from '../utils/helpers'
import { getLayerStatus } from '../utils/tmdbClient'
import { getTraktStatus, startTraktDevice, pollTraktDevice, disconnectTrakt } from '../utils/traktApi'

const TABS = [
    { id: 'general', name: 'Основные', icon: '⚙️' },
    { id: 'search', name: 'Поиск и кэш', icon: '🧹' },
    { id: 'status', name: 'Сервер', icon: '📊' },
    { id: 'posters', name: 'Постеры', icon: '🖼️' }
]

const SpeedButton = ({ mode, active, disabled, onClick }) => {
    const spatialRef = useSpatialItem('settings')
    return (
        <button
            ref={spatialRef}
            disabled={disabled}
            onClick={onClick}
            className={`focusable flex-1 p-2 rounded-lg border text-center transition-all disabled:opacity-50 ${active ? 'bg-green-600 border-green-500 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400'
                }`}
        >
            <div className="font-bold text-xs">{mode.name}</div>
            <div className="text-[10px] opacity-70">{mode.desc}</div>
        </button>
    )
}

const TraktSection = () => {
    const connectRef = useSpatialItem('settings')
    const [status, setStatus] = useState(null) // {configured, connected, slug, watchedCount}
    const [device, setDevice] = useState(null) // {user_code, verification_url}
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState('')
    const pollTimer = useRef(null)

    const refresh = useCallback(() => {
        getTraktStatus().then(setStatus).catch(() => setStatus({ configured: false, connected: false }))
    }, [])

    useEffect(() => {
        refresh()
        return () => { if (pollTimer.current) clearInterval(pollTimer.current) }
    }, [refresh])

    const startPolling = useCallback((intervalSec) => {
        if (pollTimer.current) clearInterval(pollTimer.current)
        pollTimer.current = setInterval(async () => {
            try {
                const r = await pollTraktDevice()
                if (r.status === 'authorized') {
                    clearInterval(pollTimer.current); pollTimer.current = null
                    setDevice(null); setMsg('✅ Trakt подключён'); refresh()
                } else if (r.status && r.status !== 'pending') {
                    clearInterval(pollTimer.current); pollTimer.current = null
                    setDevice(null); setMsg(`Не удалось: ${r.status}`)
                }
            } catch { /* keep polling */ }
        }, Math.max(2, intervalSec || 5) * 1000)
    }, [refresh])

    const connect = useCallback(async () => {
        setBusy(true); setMsg('')
        try {
            const d = await startTraktDevice()
            setDevice(d)
            startPolling(d.interval)
        } catch (e) {
            setMsg('Ошибка. Проверь TRAKT_CLIENT_ID/SECRET на сервере.')
        } finally { setBusy(false) }
    }, [startPolling])

    const disconnect = useCallback(async () => {
        setBusy(true)
        try { await disconnectTrakt(); setMsg('Отключено'); setDevice(null) } catch { /* ignore */ }
        finally { setBusy(false); refresh() }
    }, [refresh])

    return (
        <section className="pt-4 border-t border-white/10">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">🎬 Trakt.tv синхронизация</label>

            {status && !status.configured && (
                <div className="text-xs text-yellow-500/80 bg-yellow-900/10 border border-yellow-700/30 rounded-lg p-3">
                    Trakt не настроен на сервере. Задай <code>TRAKT_CLIENT_ID</code> и <code>TRAKT_CLIENT_SECRET</code> (создай приложение на trakt.tv/oauth/applications, redirect uri <code>urn:ietf:wg:oauth:2.0:oob</code>).
                </div>
            )}

            {status?.configured && status.connected && (
                <div className="space-y-2">
                    <div className="text-sm text-green-400">✅ Подключено{status.slug ? ` — ${status.slug}` : ''} · просмотрено: {status.watchedCount}</div>
                    <button ref={connectRef} onClick={disconnect} disabled={busy}
                        className="focusable w-full py-3 bg-red-900/10 text-red-400 rounded-xl font-bold text-sm border border-red-900/30 hover:bg-red-900/20 transition-all disabled:opacity-50">
                        Отключить Trakt
                    </button>
                </div>
            )}

            {status?.configured && !status.connected && !device && (
                <button ref={connectRef} onClick={connect} disabled={busy}
                    className="focusable w-full py-3 bg-red-600/20 text-red-300 rounded-xl font-bold text-sm border border-red-500/30 hover:bg-red-600/30 transition-all disabled:opacity-50">
                    {busy ? 'Подождите…' : 'Подключить Trakt'}
                </button>
            )}

            {device && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center space-y-2">
                    <div className="text-xs text-gray-400">Открой на телефоне/ПК:</div>
                    <div className="text-sm text-blue-400 font-mono">{device.verification_url}</div>
                    <div className="text-xs text-gray-400">и введи код:</div>
                    <div className="text-3xl font-black tracking-widest text-white">{device.user_code}</div>
                    <div className="text-[11px] text-gray-500 animate-pulse">Ожидаю подтверждения…</div>
                </div>
            )}

            {msg && <div className="text-xs text-gray-400 mt-2">{msg}</div>}
        </section>
    )
}

const PosterTestItem = ({ torrent, onClick }) => {
    const spatialRef = useSpatialItem('settings')
    const title = cleanTitle(torrent.name) || torrent.name
    return (
        <button
            ref={spatialRef}
            tabIndex="0"
            onClick={() => onClick(title)}
            className="focusable w-full text-left p-2.5 bg-gray-800 hover:bg-gray-750 rounded text-xs truncate border border-gray-700 mb-1 focus:bg-blue-600 focus:text-white transition-colors"
        >
            🎬 {title}
        </button>
    )
}

// Mini multi-series sparkline for the playback session timeline.
// Each series is normalized to its own max so dips/spikes are visible
// regardless of absolute scale. Newest sample is on the right.
const MiniGraph = ({ samples = [], series = [], height = 64 }) => {
    if (!samples.length) {
        return <div className="text-xs text-gray-500 bg-white/5 rounded-lg p-3">Нет данных сессии. Запусти воспроизведение и обнови статус.</div>
    }
    const W = 300
    const H = height
    const n = samples.length
    const line = (key, color) => {
        const vals = samples.map(s => Number(s[key]) || 0)
        const max = Math.max(...vals, 0.0001)
        const pts = vals.map((v, i) => {
            const x = n === 1 ? W : (i / (n - 1)) * W
            const y = H - (v / max) * (H - 4) - 2
            return `${x.toFixed(1)},${y.toFixed(1)}`
        }).join(' ')
        return <polyline key={key} points={pts} fill="none" stroke={color} strokeWidth="1.5" />
    }
    return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
            <rect x="0" y="0" width={W} height={H} fill="rgba(255,255,255,0.03)" rx="6" />
            {series.map(s => line(s.key, s.color))}
        </svg>
    )
}

const SettingsPanel = ({
    serverUrl,
    onServerUrlChange,
    tmdbProxyUrl,
    onTmdbProxyUrlChange,
    torrents = [],
    onClose,
    initialTab = 'general'
}) => {
    const [activeTab, setActiveTab] = useState(initialTab)

    // General State
    const [speedMode, setSpeedModeState] = useState(localStorage.getItem('speedMode') || 'balanced')
    const [speedLoading, setSpeedLoading] = useState(false)

    // Status State
    const [statusData, setStatusData] = useState(null)
    const [statusLoading, setStatusLoading] = useState(false)
    const [providerDiagnostics, setProviderDiagnostics] = useState([])
    const [diagnosticsError, setDiagnosticsError] = useState(null)

    // Playback monitor State (NAS load + per-stream delivery + session graph)
    const [systemData, setSystemData] = useState(null)
    const [streamMetrics, setStreamMetrics] = useState([])
    const [timeline, setTimeline] = useState([])

    // Poster Test State
    const [testResult, setTestResult] = useState(null)
    const [testLoading, setTestLoading] = useState(false)

    useEffect(() => {
        setActiveTab(initialTab)
    }, [initialTab])

    // Fetch Status when entering Status tab
    useEffect(() => {
        if (activeTab === 'status') fetchStatus()
    }, [activeTab])

    // Spatial Refs
    const closeBtnRef = useSpatialItem('settings')
    const serverInputRef = useSpatialItem('settings')
    const proxyInputRef = useSpatialItem('settings')
    const clearCacheRef = useSpatialItem('settings')

    // Tabs
    const generalTabRef = useSpatialItem('settings')
    const searchTabRef = useSpatialItem('settings')
    const statusTabRef = useSpatialItem('settings')
    const postersTabRef = useSpatialItem('settings')
    const refreshStatusRef = useSpatialItem('settings')
    const diagnosticsSectionRef = useSpatialItem('settings')
    const bypassSectionRef = useSpatialItem('settings')

    // Scroll container — auto-scroll focused child into view (TV D-pad fix)
    const scrollContainerRef = useRef(null)
    const handleContentFocus = useCallback((e) => {
        const el = e.target
        const container = scrollContainerRef.current
        if (!el || !container) return
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, [])

    // --- Actions ---

    const handleClearCache = () => {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('tmdb_cache_') || k.startsWith('metadata_'))
        keys.forEach(k => localStorage.removeItem(k))
        alert(`Очищено ${keys.length} записей кэша. Перезагрузите приложение.`)
        window.location.reload()
    }

    const fetchStatus = async () => {
        setStatusLoading(true)
        try {
            const [sRes, lRes, dRes, sysRes, tlRes] = await Promise.all([
                fetch(`${serverUrl}/api/status`).catch(e => ({ ok: false })),
                fetch(`${serverUrl}/api/lag-stats`).catch(e => ({ ok: false })),
                fetch(`${serverUrl}/api/providers/diagnostics`).catch(e => ({ ok: false })),
                fetch(`${serverUrl}/api/system`).catch(e => ({ ok: false })),
                fetch(`${serverUrl}/api/session-timeline?limit=180`).catch(e => ({ ok: false }))
            ])
            const sData = sRes.ok ? await sRes.json() : {}
            const lData = lRes.ok ? await lRes.json() : {}
            const dData = dRes.ok ? await dRes.json() : null
            const sysData = sysRes.ok ? await sysRes.json() : null
            const tlData = tlRes.ok ? await tlRes.json() : null
            setStatusData({
                server: sData.serverStatus || 'N/A',
                ram: lData.server?.ram?.rss || 'N/A',
                uptime: lData.server?.uptime || 0,
                lags: lData.totalLags || 0,
                active: lData.server?.torrents?.active || 0,
                frozen: lData.server?.torrents?.frozen || 0
            })
            setProviderDiagnostics(Array.isArray(dData?.providers) ? dData.providers : [])
            setDiagnosticsError(dRes.ok ? null : 'Endpoint недоступен')
            setSystemData(sysData)
            setStreamMetrics(Array.isArray(sData.streams) ? sData.streams : [])
            setTimeline(Array.isArray(tlData?.samples) ? tlData.samples : [])
        } catch (e) { console.error(e) }
        finally { setStatusLoading(false) }
    }

    const runPosterTest = async (testName) => {
        setTestLoading(true)
        setTestResult(null)

        const query = encodeURIComponent(testName)
        const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || ""
        const CUSTOM_PROXY = tmdbProxyUrl || import.meta.env.VITE_TMDB_PROXY_URL || ''
        const LAMPA_PROXY = 'https://apn-latest.onrender.com'
        const KP_PROXY = 'https://cors.kp556.workers.dev:8443'
        const CORS_PROXY = 'https://corsproxy.io/?'
        const CDN_MIRROR = 'https://imagetmdb.com'
        const KP_API_KEY = import.meta.env.VITE_KP_API_KEY || ''
        const WSRV_PROXY = 'https://wsrv.nl/?url='

        let results = []
        // Extended check with optional headers support
        const check = async (name, url, parser, headers = {}) => {
            try {
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 10000)
                const res = await fetch(url, { signal: controller.signal, headers })
                clearTimeout(timeoutId)

                if (res.ok) {
                    const d = await res.json().catch(() => null)
                    const found = parser ? parser(d) : true
                    results.push({ name, status: found ? '✅' : '⚠️', detail: typeof found === 'string' ? found : 'Online' })
                } else {
                    results.push({ name, status: '❌', detail: `HTTP ${res.status}` })
                }
            } catch (e) {
                // Check for DNS poisoning (redirect to localhost)
                const isPoisoned = e.message?.includes('127.0.0.1') || e.message?.includes('0.0.0.0')
                results.push({
                    name,
                    status: isPoisoned ? '🚫' : '❌',
                    detail: isPoisoned ? 'DNS POISONING!' : (e.name === 'AbortError' ? 'Timeout' : e.message)
                })
            }
        }

        try {
            // 1. Custom Worker (user's proxy) — формат БЕЗ /3 (Worker добавляет сам)
            if (CUSTOM_PROXY) {
                await check('Custom Worker', `${CUSTOM_PROXY}/search/movie?api_key=${TMDB_API_KEY}&query=${query}&language=ru-RU`, d => d?.total_results > 0 ? d.results[0]?.title : false)
            }

            // 2. Lampa Proxy — требует ПОЛНЫЙ URL после /
            const lampaTarget = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${query}&language=ru-RU`
            await check('Lampa Proxy', `${LAMPA_PROXY}/${lampaTarget}`, d => d?.total_results > 0 ? d.results[0]?.title : false)

            // 3. CapacitorHttp (direct, may be DNS poisoned)
            await check('CapacitorHttp', `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${query}`, d => d?.total_results > 0 ? d.results[0]?.title : false)

            // 4. corsproxy.io
            await check('corsproxy.io', `${CORS_PROXY}https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${query}`, d => d?.total_results > 0 ? d.results[0]?.title : false)

            // 5. Kinopoisk — требует X-API-KEY заголовок!
            await check('Кинопоиск', `${KP_PROXY}/https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${query}`, d => d?.films?.length > 0 ? d.films[0]?.nameRu || d.films[0]?.nameEn : false, { 'X-API-KEY': KP_API_KEY })

            // --- IMAGE MIRRORS ---
            results.push({ name: '── Зеркала изображений ──', status: '', detail: '' })

            // 6. Original TMDB (may be blocked)
            await check('image.tmdb.org', 'https://image.tmdb.org/t/p/w92/8uO0gUM8aNqYLs1OsTBQiXu0fEv.jpg', () => 'OK')

            // 7. CDN Mirror (imagetmdb.com)  
            await check('imagetmdb.com', `${CDN_MIRROR}/t/p/w92/8uO0gUM8aNqYLs1OsTBQiXu0fEv.jpg`, () => 'OK')

            // 8. StaticTMDB (statictmdb.com)
            await check('statictmdb.com', 'https://statictmdb.com/t/p/w92/8uO0gUM8aNqYLs1OsTBQiXu0fEv.jpg', () => 'OK')

            // 9. StaticIM (staticim.net)
            await check('staticim.net', 'https://staticim.net/t/p/w92/8uO0gUM8aNqYLs1OsTBQiXu0fEv.jpg', () => 'OK')

            // 10. WSRV Proxy (image proxy)
            await check('wsrv.nl', `${WSRV_PROXY}https://image.tmdb.org/t/p/w92/8uO0gUM8aNqYLs1OsTBQiXu0fEv.jpg`, () => 'OK')

            // 11. Server Proxy (NAS) — LAN IP, работает даже при мёртвом DNS
            if (serverUrl) {
                await check('Server Proxy (НАС)', `${serverUrl}/api/proxy?url=${encodeURIComponent('https://image.tmdb.org/t/p/w92/8uO0gUM8aNqYLs1OsTBQiXu0fEv.jpg')}`, () => 'OK')
            }

            // Summary line
            const working = results.filter(r => r.status === '✅').length
            const total = results.filter(r => r.status !== '').length
            const poisoned = results.filter(r => r.status === '🚫').length
            let summary = `💡 ${working}/${total} работают`
            if (poisoned > 0) summary += ` | DNS Poison → 1.1.1.1`
            results.push({ name: '', status: '', detail: summary })

        } catch (err) {
            results.push({ name: 'Critical', status: '❌', detail: err.message })
        } finally {
            setTestResult({ name: testName, results })
            setTestLoading(false)
        }
    }

    const formatUptime = (s) => {
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
        return `${h}h ${m}m`
    }

    const formatLastSeen = (ts) => {
        if (!ts) return 'never'
        const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
        if (diffSec < 60) return `${diffSec}s`
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`
        if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`
        return `${Math.floor(diffSec / 86400)}d`
    }

    const formatMs = (ms) => {
        if (ms === null || ms === undefined) return '-'
        return `${Math.round(ms)} ms`
    }

    const providerStatusMeta = (status, circuitOpen) => {
        if (circuitOpen) return { icon: '🔒', text: 'circuit', cls: 'text-gray-400' }
        switch (status) {
            case 'ok': return { icon: '✅', text: 'ok', cls: 'text-green-400' }
            case 'empty': return { icon: '⚪', text: 'empty', cls: 'text-gray-300' }
            case 'timeout': return { icon: '⏱️', text: 'timeout', cls: 'text-yellow-400' }
            case 'error': return { icon: '❌', text: 'error', cls: 'text-red-400' }
            default: return { icon: '○', text: status || 'never', cls: 'text-gray-500' }
        }
    }

    const cacheCount = Object.keys(localStorage).filter(k => k.startsWith('tmdb_cache_') || k.startsWith('metadata_')).length

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 flex items-center justify-between border-b border-white/10">
                    <div className="flex gap-2 overflow-x-auto overflow-y-visible py-1 pl-1">
                        <button ref={generalTabRef} onClick={() => setActiveTab('general')} className={`focusable shrink-0 text-sm font-bold px-3 py-1.5 rounded-full transition-all focus:ring-2 focus:ring-blue-500 ${activeTab === 'general' ? 'bg-blue-600 text-white' : 'text-white/50 hover:bg-white/5'}`}>⚙️ Основные</button>
                        <button ref={searchTabRef} onClick={() => setActiveTab('search')} className={`focusable shrink-0 text-sm font-bold px-3 py-1.5 rounded-full transition-all focus:ring-2 focus:ring-blue-500 ${activeTab === 'search' ? 'bg-blue-600 text-white' : 'text-white/50 hover:bg-white/5'}`}>🧹 Поиск</button>
                        <button ref={statusTabRef} onClick={() => setActiveTab('status')} className={`focusable shrink-0 text-sm font-bold px-3 py-1.5 rounded-full transition-all focus:ring-2 focus:ring-blue-500 ${activeTab === 'status' ? 'bg-blue-600 text-white' : 'text-white/50 hover:bg-white/5'}`}>📊 Статус</button>
                        <button ref={postersTabRef} onClick={() => setActiveTab('posters')} className={`focusable shrink-0 text-sm font-bold px-3 py-1.5 rounded-full transition-all focus:ring-2 focus:ring-blue-500 ${activeTab === 'posters' ? 'bg-blue-600 text-white' : 'text-white/50 hover:bg-white/5'}`}>🖼️ Постеры</button>
                    </div>
                    <button ref={closeBtnRef} onClick={onClose} className="focusable shrink-0 text-gray-400 hover:text-white px-2 text-xl ml-2 focus:ring-2 focus:ring-blue-500 rounded">✕</button>
                </div>

                {/* Content Area */}
                <div ref={scrollContainerRef} onFocus={handleContentFocus} className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-10">
                    {/* --- GENERAL TAB --- */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-fade-in">
                            <section>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">⚡ Скорость загрузки</label>
                                <div className="flex gap-2">
                                    {[{ id: 'eco', name: '🌱 Eco', desc: '30 peers' }, { id: 'balanced', name: '⚖️ Balance', desc: '55 peers' }, { id: 'turbo', name: '🚀 Turbo', desc: '100 peers' }].map(m => (
                                        <SpeedButton
                                            key={m.id}
                                            mode={m}
                                            active={speedMode === m.id}
                                            disabled={speedLoading}
                                            onClick={async () => {
                                                setSpeedLoading(true)
                                                try {
                                                    const res = await fetch(`${serverUrl || ''}/api/speed-mode`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ mode: m.id })
                                                    })
                                                    if (res.ok) {
                                                        setSpeedModeState(m.id)
                                                        localStorage.setItem('speedMode', m.id)
                                                    }
                                                } catch (e) { console.error(e) } finally { setSpeedLoading(false) }
                                            }}
                                        />
                                    ))}
                                </div>
                            </section>

                            <TraktSection />
                        </div>
                    )}

                    {/* --- SEARCH & CACHE TAB --- */}
                    {activeTab === 'search' && (
                        <div className="space-y-6 animate-fade-in">
                            <section>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">🛡️ TMDB Proxy</label>
                                <input
                                    ref={proxyInputRef}
                                    tabIndex="0"
                                    value={tmdbProxyUrl}
                                    onChange={e => onTmdbProxyUrlChange(e.target.value, false)}
                                    onBlur={e => onTmdbProxyUrlChange(e.target.value, true)}
                                    className="focusable w-full bg-gray-800 text-sm text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-purple-500 outline-none transition-colors"
                                    placeholder="Пусто для авто-выбора"
                                />
                                <p className="text-[10px] text-gray-500 mt-2 italic">Для обхода блокировок загрузки обложек.</p>
                            </section>

                            <section className="pt-4 border-t border-white/5">
                                <button
                                    ref={clearCacheRef}
                                    onClick={handleClearCache}
                                    className="focusable w-full bg-red-900/10 text-red-400 p-4 rounded-xl border border-red-900/30 text-sm flex items-center justify-center gap-3 hover:bg-red-900/20 transition-all font-bold"
                                >
                                    <span>🗑️</span> Очистить кэш ({cacheCount})
                                </button>
                            </section>
                        </div>
                    )}

                    {/* --- STATUS TAB --- */}
                    {activeTab === 'status' && (
                        <div className="space-y-6 animate-fade-in">
                            <section>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">🖥️ Адрес сервера</label>
                                <input
                                    ref={serverInputRef}
                                    tabIndex="0"
                                    value={serverUrl}
                                    onChange={e => onServerUrlChange(e.target.value, false)}
                                    onBlur={e => onServerUrlChange(e.target.value, true)}
                                    className="focusable w-full bg-gray-800 text-sm text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-blue-500 outline-none transition-colors"
                                    placeholder="http://192.168.x.x:3000"
                                />
                            </section>

                            <div className="pt-4 border-t border-white/10 pb-4">
                                {statusLoading ? <div className="text-center animate-pulse text-gray-500 py-4">Загрузка данных...</div> : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5"><div className="text-[10px] text-gray-500 font-bold uppercase">Status</div><div className={`text-xl font-mono ${statusData?.server === 'ok' ? 'text-green-400' : 'text-yellow-400'}`}>{statusData?.server?.toUpperCase()}</div></div>
                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5"><div className="text-[10px] text-gray-500 font-bold uppercase">RAM</div><div className="text-xl font-mono">{statusData?.ram} MB</div></div>
                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5"><div className="text-[10px] text-gray-500 font-bold uppercase">Uptime</div><div className="text-xl font-mono">{formatUptime(statusData?.uptime)}</div></div>
                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5"><div className="text-[10px] text-gray-500 font-bold uppercase">Lags</div><div className={`text-xl font-mono ${statusData?.lags > 0 ? 'text-red-400' : 'text-green-400'}`}>{statusData?.lags}</div></div>
                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5"><div className="text-[10px] text-gray-500 font-bold uppercase">Active</div><div className="text-xl font-mono text-blue-400">{statusData?.active}</div></div>
                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5"><div className="text-[10px] text-gray-500 font-bold uppercase">Frozen</div><div className="text-xl font-mono text-purple-400">{statusData?.frozen}</div></div>
                                    </div>
                                )}
                                <button
                                    ref={refreshStatusRef}
                                    onClick={fetchStatus}
                                    className="focusable w-full mt-4 py-3 bg-blue-600/20 text-blue-400 rounded-xl font-bold text-sm border border-blue-500/30 hover:bg-blue-600/30 transition-colors"
                                >
                                    Обновить статус
                                </button>
                            </div>

                            {/* --- PLAYBACK MONITOR (NAS load + delivery + session graph) --- */}
                            <section className="pt-4 border-t border-white/10">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">🎥 Мониторинг воспроизведения</label>

                                {/* NAS system load */}
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="text-[10px] text-gray-500 font-bold uppercase">CPU / ядро</div>
                                        <div className={`text-xl font-mono ${systemData?.loadPerCore > 0.9 ? 'text-red-400' : systemData?.loadPerCore > 0.6 ? 'text-yellow-400' : 'text-green-400'}`}>{systemData?.loadPerCore ?? '—'}</div>
                                        <div className="text-[10px] text-gray-600">load1 {systemData?.load1 ?? '—'} · {systemData?.cpuCores ?? '?'}c</div>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="text-[10px] text-gray-500 font-bold uppercase">Чтение диска</div>
                                        <div className="text-xl font-mono text-blue-400">{systemData?.diskReadMBs != null ? `${systemData.diskReadMBs}` : '—'}<span className="text-xs text-gray-500"> MB/s</span></div>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="text-[10px] text-gray-500 font-bold uppercase">RAM НАС</div>
                                        <div className="text-xl font-mono">{systemData?.ramUsedMB ?? '—'}<span className="text-xs text-gray-500">/{systemData?.ramTotalMB ?? '—'}</span></div>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="text-[10px] text-gray-500 font-bold uppercase">Активн. стримов</div>
                                        <div className="text-xl font-mono text-purple-400">{systemData?.activeStreams ?? 0}</div>
                                    </div>
                                </div>

                                {/* Per-stream delivery */}
                                {streamMetrics.length > 0 && (
                                    <div className="space-y-2 mb-3">
                                        {streamMetrics.map((s) => (
                                            <div key={s.infoHash} className="bg-white/5 rounded-xl border border-white/10 p-3 text-xs">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="font-mono text-white truncate">{s.fileName || s.infoHash.slice(0, 8)}</div>
                                                    <div className={`font-mono ${s.active ? 'text-green-400' : 'text-gray-500'}`}>{s.active ? '▶' : '⏸'} {s.fromDisk ? 'диск' : 'торрент'}</div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 mt-2 text-[11px] text-gray-300">
                                                    <div>Отдача<br /><span className={`font-mono ${s.active && s.throughputMBs < 1 ? 'text-red-400' : 'text-white'}`}>{s.throughputMBs} MB/s</span></div>
                                                    <div>Reopen<br /><span className={`font-mono ${s.reopenCount > 20 ? 'text-yellow-400' : 'text-white'}`}>{s.reopenCount}</span></div>
                                                    <div>Stall<br /><span className={`font-mono ${s.stallCount > 0 ? 'text-red-400' : 'text-white'}`}>{s.stallCount}</span></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Session timeline graph */}
                                <MiniGraph
                                    samples={timeline}
                                    series={[
                                        { key: 'cpuPct', color: '#f87171' },
                                        { key: 'diskReadMBs', color: '#60a5fa' },
                                        { key: 'streamMBs', color: '#4ade80' }
                                    ]}
                                />
                                <div className="flex gap-4 mt-2 text-[10px] text-gray-400">
                                    <span><span className="text-red-400">●</span> CPU%</span>
                                    <span><span className="text-blue-400">●</span> Диск MB/s</span>
                                    <span><span className="text-green-400">●</span> Отдача MB/s</span>
                                </div>
                                <div className="text-[10px] text-gray-600 mt-1">Фриз = провал зелёной (отдача) при росте красной (CPU) или провале синей (диск).</div>
                            </section>

                            <section ref={diagnosticsSectionRef} tabIndex="0" className="focusable pt-4 border-t border-white/10 outline-none focus:ring-1 focus:ring-blue-500/30 rounded-xl">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">🧪 Диагностика источников</label>
                                {providerDiagnostics.length === 0 ? (
                                    <div className="text-xs text-gray-500 bg-white/5 rounded-xl border border-white/5 p-3">
                                        {diagnosticsError || 'Нет данных по источникам. Выполните поиск и обновите статус.'}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {providerDiagnostics.map((provider) => {
                                            const d = provider.diagnostics || {}
                                            const meta = providerStatusMeta(d.lastStatus, provider.circuitOpen)
                                            return (
                                                <div key={provider.name} className="bg-white/5 rounded-xl border border-white/10 p-3 text-xs">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="font-mono text-white">{provider.name}</div>
                                                        <div className={`font-mono ${meta.cls}`}>{meta.icon} {meta.text}</div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-gray-300">
                                                        <div>latency: <span className="font-mono">{formatMs(d.lastDurationMs)}</span></div>
                                                        <div>last: <span className="font-mono">{formatLastSeen(d.lastRunAt)}</span></div>
                                                        <div>ok: <span className="font-mono text-green-400">{d.totalSuccess || 0}</span></div>
                                                        <div>empty: <span className="font-mono text-gray-300">{d.totalEmpty || 0}</span></div>
                                                        <div>errors: <span className="font-mono text-red-400">{d.totalError || 0}</span></div>
                                                        <div>fails: <span className="font-mono">{provider.failures || 0}</span></div>
                                                    </div>
                                                    {d.lastError && (
                                                        <div className="mt-2 text-[10px] text-red-300 break-all">
                                                            {d.lastError}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </section>

                            {/* ANTI-07: Bypass Layers Status */}
                            <section ref={bypassSectionRef} tabIndex="0" className="focusable pt-4 border-t border-white/10 outline-none focus:ring-1 focus:ring-blue-500/30 rounded-xl">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">🛡️ TMDB Bypass слои</label>
                                <div className="flex flex-wrap gap-2">
                                    {getLayerStatus().map(layer => (
                                        <span
                                            key={layer.name}
                                            className={`px-2 py-1 rounded text-xs font-mono ${layer.available
                                                ? 'bg-green-900/30 text-green-400 border border-green-700/50'
                                                : 'bg-red-900/30 text-red-400 border border-red-700/50'
                                                }`}
                                        >
                                            {layer.available ? '🟢' : '🔴'} {layer.name}
                                            {layer.circuit.failures > 0 && ` (${layer.circuit.failures})`}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Красный = circuit breaker открыт (слой временно отключён)</p>
                            </section>
                        </div>
                    )}

                    {/* --- POSTERS TAB --- */}
                    {activeTab === 'posters' && (
                        <div className="space-y-3 animate-fade-in">
                            <div className="max-h-28 overflow-y-auto border border-white/10 rounded-xl bg-black/20 p-2 custom-scrollbar">
                                {torrents.map(t => <PosterTestItem key={t.infoHash} torrent={t} onClick={runPosterTest} />)}
                                {torrents.length === 0 && <div className="text-center text-xs text-gray-500 py-4">Нет торрентов для теста</div>}
                            </div>

                            {testLoading && <div className="text-center text-[10px] text-blue-400 animate-pulse">Тестируем...</div>}

                            {testResult && (
                                <div className="bg-black/40 rounded-xl border border-white/10 p-2 text-[9px] leading-tight">
                                    <div className="font-bold text-gray-300 text-[10px] mb-1">🔍 {testResult.name}</div>
                                    {testResult.results.map((r, i) => (
                                        r.status === '' && r.name ? (
                                            <div key={i} className="text-gray-500 text-[8px] mt-1 mb-0.5 border-t border-white/5 pt-1">{r.name}</div>
                                        ) : r.status === '' && !r.name ? (
                                            <div key={i} className="text-blue-400 text-[10px] font-medium mt-1 pt-1 border-t border-white/10">{r.detail}</div>
                                        ) : (
                                            <div key={i} className="flex justify-between items-center">
                                                <span className={r.status === '✅' ? 'text-green-400' : 'text-red-400'}>{r.status} {r.name}</span>
                                                <span className="text-gray-500 truncate max-w-[100px]">{r.detail}</span>
                                            </div>
                                        )
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default SettingsPanel
