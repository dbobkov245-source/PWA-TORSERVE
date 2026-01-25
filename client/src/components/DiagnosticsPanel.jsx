import React, { useState, useEffect } from 'react'
import { useSpatialItem } from '../hooks/useSpatialNavigation'
import { cleanTitle } from '../utils/helpers'

const PosterTestItem = ({ torrent, onClick }) => {
    const spatialRef = useSpatialItem('modal')
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

const DiagnosticsPanel = ({ serverUrl, tmdbProxyUrl, onClose, torrents = [] }) => {
    // State
    const [mode, setMode] = useState('poster') // 'server' | 'poster'
    const [statusData, setStatusData] = useState(null)
    const [statusLoading, setStatusLoading] = useState(false)
    const [testResult, setTestResult] = useState(null)
    const [testLoading, setTestLoading] = useState(false)

    // Refs
    const closeBtnRef = useSpatialItem('modal')
    const refreshBtnRef = useSpatialItem('modal')
    const modeServerRef = useSpatialItem('modal')
    const modePosterRef = useSpatialItem('modal')

    // --- Server Stats Logic ---
    const fetchStatus = async () => {
        setStatusLoading(true)
        try {
            const [sRes, lRes] = await Promise.all([
                fetch(`${serverUrl}/api/status`).catch(e => ({ ok: false })),
                fetch(`${serverUrl}/api/lag-stats`).catch(e => ({ ok: false }))
            ])
            const sData = sRes.ok ? await sRes.json() : {}
            const lData = lRes.ok ? await lRes.json() : {}
            setStatusData({
                server: sData.serverStatus || 'N/A',
                ram: lData.server?.ram?.rss || 'N/A',
                uptime: lData.server?.uptime || 0,
                lags: lData.totalLags || 0,
                active: lData.server?.torrents?.active || 0,
                frozen: lData.server?.torrents?.frozen || 0
            })
        } catch (e) { console.error(e) }
        finally { setStatusLoading(false) }
    }

    useEffect(() => {
        if (mode === 'server') fetchStatus()
    }, [mode])

    // --- Poster Test Logic ---
    const runPosterTest = async (testName) => {
        setTestLoading(true)
        setTestResult(null)

        const query = encodeURIComponent(testName)
        const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || "c3bec60e67fabf42dd2202281dcbc9a7"
        const CUSTOM_PROXY = tmdbProxyUrl || import.meta.env.VITE_TMDB_PROXY_URL || ''
        const KP_PROXY = 'https://cors.kp556.workers.dev:8443'
        const IMAGE_MIRRORS = ['imagetmdb.com', 'nl.imagetmdb.com', 'lampa.byskaz.ru/tmdb/img']

        let results = []
        const check = async (name, url, parser) => {
            try {
                const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
                if (res.ok) {
                    const d = await res.json()
                    const found = parser ? parser(d) : true
                    results.push({ name, status: found ? '✅' : '⚠️', detail: typeof found === 'string' ? found : 'Online' })
                } else results.push({ name, status: '❌', detail: `HTTP ${res.status}` })
            } catch (e) { results.push({ name, status: '❌', detail: e.message }) }
        }

        // 1. Standard Checks
        await Promise.all([
            check('Direct TMDB', `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${query}&language=ru-RU`, d => d.results?.[0]?.title),
            CUSTOM_PROXY ? check('Custom Worker', `${CUSTOM_PROXY.replace(/\/$/, '')}/search/multi?api_key=${TMDB_API_KEY}&query=${query}&language=ru-RU`, d => d.results?.[0]?.title) : Promise.resolve(),
            check('Lampa Proxy', `https://apn-latest.onrender.com/https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${query}&language=ru-RU`, d => d.results?.[0]?.title),
            check('corsproxy.io', `https://corsproxy.io/?${encodeURIComponent('https://api.themoviedb.org/3/search/multi?api_key=' + TMDB_API_KEY + '&query=' + query)}`, d => d.results?.[0]?.title),
            check('Кинопоиск', `${KP_PROXY}/https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${query}`, d => d.films?.[0]?.nameRu)
        ])

        // 2. Additional Checks
        results.push({ name: 'Capacitor', status: '📡', detail: 'Native Mode' })

        if (serverUrl) {
            const targetUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${query}&language=ru-RU`
            await check('Server Proxy', `${serverUrl.replace(/\/$/, '')}/api/proxy?url=${encodeURIComponent(targetUrl)}`, d => d.results?.[0]?.title)
        }

        await check('WSRV Proxy', `https://images.weserv.nl/?url=${encodeURIComponent('https://image.tmdb.org/t/p/w92/or1MPoTbbZ6FbZ6Cc0ArvpfCneA.jpg')}&output=json`)

        // 3. Image Mirrors
        const imgCheck = await Promise.all(IMAGE_MIRRORS.map(async m => {
            try {
                await fetch(`https://${m}/t/p/w92/or1MPoTbbZ6FbZ6Cc0ArvpfCneA.jpg`, { method: 'HEAD', mode: 'no-cors', signal: AbortSignal.timeout(3000) })
                return { name: m, status: '✅' }
            } catch { return { name: m, status: '❌' } }
        }))
        imgCheck.forEach(r => results.push({ ...r, detail: 'Mirror' }))

        setTestResult({ name: testName, results })
        setTestLoading(false)
    }

    const formatUptime = (s) => {
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
        return `${h}h ${m}m`
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900/60 to-purple-900/60 p-4 flex items-center justify-between border-b border-white/10">
                    <div className="flex gap-4">
                        <button ref={modePosterRef} tabIndex="0" onClick={() => setMode('poster')} className={`focusable text-sm font-bold transition-opacity ${mode === 'poster' ? 'text-white' : 'text-white/50'}`}>🖼️ Постеры</button>
                        <button ref={modeServerRef} tabIndex="0" onClick={() => setMode('server')} className={`focusable text-sm font-bold transition-opacity ${mode === 'server' ? 'text-white' : 'text-white/50'}`}>📊 Сервер</button>
                    </div>
                    <button ref={closeBtnRef} tabIndex="0" onClick={onClose} className="focusable text-gray-400 hover:text-white px-2">✕</button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                    {mode === 'server' && (
                        <div className="space-y-4">
                            {statusLoading ? <div className="text-center animate-pulse">Загрузка...</div> : (
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5"><div className="text-[10px] text-gray-500 font-bold">STATUS</div><div className={`text-xl font-mono ${statusData?.server === 'ok' ? 'text-green-400' : 'text-yellow-400'}`}>{statusData?.server?.toUpperCase()}</div></div>
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5"><div className="text-[10px] text-gray-500 font-bold">RAM</div><div className="text-xl font-mono">{statusData?.ram} MB</div></div>
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5"><div className="text-[10px] text-gray-500 font-bold">UPTIME</div><div className="text-xl font-mono">{formatUptime(statusData?.uptime)}</div></div>
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5"><div className="text-[10px] text-gray-500 font-bold">ACTIVE</div><div className="text-xl font-mono text-blue-400">{statusData?.active}</div></div>
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5"><div className="text-[10px] text-gray-500 font-bold">FROZEN</div><div className="text-xl font-mono text-purple-400">{statusData?.frozen}</div></div>
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/5"><div className="text-[10px] text-gray-500 font-bold">LAGS</div><div className={`text-xl font-mono ${statusData?.lags > 0 ? 'text-red-400' : 'text-green-400'}`}>{statusData?.lags}</div></div>
                                </div>
                            )}
                            <button ref={refreshBtnRef} tabIndex="0" onClick={fetchStatus} className="focusable w-full py-3 bg-blue-600/20 text-blue-400 rounded-xl font-bold text-sm border border-blue-500/30">Обновить статус</button>
                        </div>
                    )}

                    {mode === 'poster' && (
                        <div className="space-y-4">
                            <div className="max-h-32 overflow-y-auto border border-white/10 rounded-xl bg-black/20 p-1">
                                {torrents.map(t => <PosterTestItem key={t.infoHash} torrent={t} onClick={runPosterTest} />)}
                                {torrents.length === 0 && <div className="text-center text-xs text-gray-500 py-4">Нет торрентов</div>}
                            </div>

                            {testLoading && <div className="text-center text-xs text-blue-400 animate-pulse">Тестируем 6 методов...</div>}

                            {testResult && (
                                <div className="bg-black/40 rounded-xl border border-white/10 p-3 text-[11px] space-y-1">
                                    <div className="font-bold text-gray-300 border-b border-white/10 pb-1 mb-1">{testResult.name}</div>
                                    {testResult.results.map((r, i) => (
                                        <div key={i} className="flex justify-between items-center">
                                            <span className={`${r.status === '✅' ? 'text-green-400' : 'text-red-400'}`}>{r.status} {r.name}</span>
                                            <span className="text-gray-500 truncate max-w-[120px]">{r.detail}</span>
                                        </div>
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

export default DiagnosticsPanel
