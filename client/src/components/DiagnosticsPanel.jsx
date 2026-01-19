/**
 * DiagnosticsPanel Component - Debug information display
 * Shows RAM, lag events, active engines, frozen torrents, watchdog status
 */
import { useState, useEffect } from 'react'

const DiagnosticsPanel = ({ serverUrl, onClose }) => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchDiagnostics = async () => {
        setLoading(true)
        setError(null)

        try {
            // Fetch both status and lag-stats
            const [statusRes, lagRes] = await Promise.all([
                fetch(`${serverUrl}/api/status`),
                fetch(`${serverUrl}/api/lag-stats`)
            ])

            if (!statusRes.ok) throw new Error(`Status API: ${statusRes.status}`)
            if (!lagRes.ok) throw new Error(`Lag API: ${lagRes.status}`)

            const statusData = await statusRes.json()
            const lagData = await lagRes.json()

            setData({
                serverStatus: statusData.serverStatus,
                torrentsCount: statusData.torrents?.length || 0,
                lagStats: lagData,
                ram: lagData.recentLags?.[0]?.memory || 'N/A'
            })
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDiagnostics()
        const interval = setInterval(fetchDiagnostics, 5000) // Refresh every 5s
        return () => clearInterval(interval)
    }, [serverUrl])

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-[#181818] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-900 to-gray-900 px-3 py-2 flex items-center justify-between">
                    <h2 className="text-base font-bold flex items-center gap-2">
                        🔧 Diagnostics
                    </h2>
                    <button
                        onClick={onClose}
                        className="bg-black/40 rounded-full p-1.5 text-white hover:bg-black/60 text-sm"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-3 space-y-2">
                    {loading && !data && (
                        <div className="text-center text-gray-400 py-4">
                            <span className="animate-pulse">Loading...</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-900/30 border border-red-700 rounded p-2 text-red-300 text-xs">
                            ❌ Error: {error}
                        </div>
                    )}

                    {data && (
                        <>
                            {/* Server Status - Compact */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-gray-800 rounded p-2">
                                    <div className="text-gray-400 text-[10px] uppercase">Status</div>
                                    <div className="text-sm font-bold">
                                        {data.serverStatus === 'ok' && '🟢 OK'}
                                        {data.serverStatus === 'degraded' && '🟡 Degraded'}
                                        {data.serverStatus === 'circuit_open' && '🔴 Circuit Open'}
                                        {data.serverStatus === 'error' && '🔴 Error'}
                                    </div>
                                </div>
                                <div className="bg-gray-800 rounded p-2">
                                    <div className="text-gray-400 text-[10px] uppercase">Torrents</div>
                                    <div className="text-sm font-bold">{data.torrentsCount}</div>
                                </div>
                            </div>

                            {/* Lag Stats - Compact inline */}
                            <div className="bg-gray-800 rounded p-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">Lag:</span>
                                    <span className="font-mono">
                                        <span className="text-blue-400">{data.lagStats.recentLags || 0}</span> spikes,
                                        <span className="text-yellow-400"> {data.lagStats.avgLag || 0}ms</span> avg,
                                        <span className="text-red-400"> {data.lagStats.maxLag || 0}ms</span> max
                                    </span>
                                </div>
                            </div>

                            {/* Server Info - Compact */}
                            {data.lagStats.server && (
                                <div className="bg-gray-800 rounded p-2">
                                    <div className="grid grid-cols-4 gap-1 text-xs">
                                        <div className="text-center">
                                            <div className="text-gray-500">Up</div>
                                            <div className="text-white font-mono">{Math.floor(data.lagStats.server.uptime / 60)}m</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-gray-500">RAM</div>
                                            <div className="text-white font-mono">{data.lagStats.server.ram?.rss || 0}MB</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-gray-500">Active</div>
                                            <div className="text-green-400 font-mono">{data.lagStats.server.torrents?.active || 0}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-gray-500">Frozen</div>
                                            <div className="text-blue-400 font-mono">{data.lagStats.server.torrents?.frozen || 0}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Refresh button - Compact */}
                            <button
                                onClick={fetchDiagnostics}
                                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded text-sm font-medium transition-colors"
                            >
                                🔄 Refresh
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default DiagnosticsPanel
