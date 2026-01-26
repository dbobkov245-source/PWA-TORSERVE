import React, { useState, useEffect } from 'react'
import { App } from '@capacitor/app'
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

const DiagnosticsPanel = ({ serverUrl, tmdbProxyUrl, torrents, onClose }) => {
    // State
    const [logs, setLogs] = useState([])
    const [mode, setMode] = useState('status') // status, logs, posters
    const [statusData, setStatusData] = useState(null)
    const [statusLoading, setStatusLoading] = useState(false)
    const [testResult, setTestResult] = useState(null)
    const [testLoading, setTestLoading] = useState(false)

    // Refs
    const closeBtnRef = useSpatialItem('modal')
    const refreshBtnRef = useSpatialItem('modal')
    // FIXED: Added missing ref to prevent runtime crash
    const modeServerRef = useSpatialItem('modal')
    const modePosterRef = useSpatialItem('modal')

    // Removed unused refs: modeStatusRef, modeLogsRef

    // Add logging
    useEffect(() => {
        const originalLog = console.log
        const originalError = console.error

        const formatLog = (type, args) => {
            const msg = args.map(a =>
                typeof a === 'object' ? JSON.stringify(a) : String(a)
            ).join(' ')
            setLogs(prev => [`[${type}] ${msg}`, ...prev].slice(0, 50))
        }

        console.log = (...args) => {
            formatLog('INFO', args)
            originalLog.apply(console, args)
        }
        console.error = (...args) => {
            formatLog('ERROR', args)
            originalError.apply(console, args)
        }

        return () => {
            console.log = originalLog
            console.error = originalError
        }
    }, [])

    // Fetch on open
    useEffect(() => {
        if (!serverUrl) return
        fetch(`${serverUrl}/api/lag-stats`)
            .then(r => r.json())
            .then(data => {
                console.log('Diagnostics Loaded', data)
            })
            .catch(e => console.error('Diag Load Error', e))
    }, [serverUrl, mode])

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
        if (mode === 'status') fetchStatus()
    }, [mode])

    // --- Poster Test Logic ---
    // NAV-02/NAV-06: Focus Trap & BackButton
    useEffect(() => {
        const previousActive = document.activeElement

        // Trap focus inside (Safe default: Close Button)
        requestAnimationFrame(() => {
            if (closeBtnRef.current) closeBtnRef.current.focus()
            else if (modePosterRef.current) modePosterRef.current.focus()
        })

        // NAV-06: Capacitor Back Button Listener (Fixed Cleanup)
        let listenerHandle
        const setupListener = async () => {
            listenerHandle = await App.addListener('backButton', () => {
                onClose()
            })
        }
        setupListener()

        return () => {
            if (listenerHandle) listenerHandle.remove()
            // Restore focus on unmount
            if (previousActive && typeof previousActive.focus === 'function') {
                previousActive.focus()
            }
        }
    }, [])

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
                // Extended timeout for TV network
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 10000)

                const res = await fetch(url, { signal: controller.signal })
                clearTimeout(timeoutId)

                if (res.ok) {
                    const d = await res.json()
                    const found = parser ? parser(d) : true
                    results.push({ name, status: found ? '✅' : '⚠️', detail: typeof found === 'string' ? found : 'Online' })
                } else {
                    results.push({ name, status: '❌', detail: `HTTP ${res.status}` })
                }
            } catch (e) {
                results.push({ name, status: '❌', detail: e.name === 'AbortError' ? 'Timeout' : e.message })
            }
        }

        try {
            // 1. Check TMDB Direct
            await check('TMDB API (Direct)', `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${query}`, d => d.total_results > 0)

            // 2. Check TMDB Proxy
            if (CUSTOM_PROXY) {
                await check('Custom Proxy', `${CUSTOM_PROXY}/3/search/movie?api_key=${TMDB_API_KEY}&query=${query}`, d => d.total_results > 0)
            }

            // 3. Check Image Mirrors
            for (const mirror of IMAGE_MIRRORS) {
                await check(`Img: ${mirror}`, `https://${mirror}/t/p/w92/8uO0gUM8aNqYLs1OsTBQiXu0fEv.jpg`, () => true)
            }

            // 4. Check Kinopoisk
            await check('Kinopoisk Proxy', `${KP_PROXY}/api/v2.1/films/search-by-keyword?keyword=${query}`, d => d.films?.length > 0)

        } catch (err) {
            console.error('Test Suite Failed', err)
            results.push({ name: 'Critical', status: '❌', detail: err.message })
        } finally {
            console.log('Test Finished', results)
            setTestResult({ name: testName, results })
            setTestLoading(false)
        }
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
