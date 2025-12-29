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
                <div className="bg-gradient-to-r from-purple-900 to-gray-900 p-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        🔧 Diagnostics
                    </h2>
                    <button
                        onClick={onClose}
                        className="bg-black/40 rounded-full p-2 text-white hover:bg-black/60"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {loading && !data && (
                        <div className="text-center text-gray-400 py-8">
                            <span className="animate-pulse">Loading...</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
                            ❌ Error: {error}
                        </div>
                    )}

                    {data && (
                        <>
                            {/* Server Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-800 rounded-lg p-4">
                                    <div className="text-gray-400 text-xs uppercase mb-1">Status</div>
                                    <div className="text-xl font-bold">
                                        {data.serverStatus === 'ok' && '🟢 OK'}
                                        {data.serverStatus === 'degraded' && '🟡 Degraded'}
                                        {data.serverStatus === 'circuit_open' && '🔴 Circuit Open'}
                                        {data.serverStatus === 'error' && '🔴 Error'}
                                    </div>
                                </div>
                                <div className="bg-gray-800 rounded-lg p-4">
                                    <div className="text-gray-400 text-xs uppercase mb-1">Torrents</div>
                                    <div className="text-xl font-bold">{data.torrentsCount}</div>
                                </div>
                            </div>

                            {/* Lag Stats */}
                            <div className="bg-gray-800 rounded-lg p-4">
                                <div className="text-gray-400 text-xs uppercase mb-3">Event Loop Lag (last 60s)</div>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-blue-400">{data.lagStats.recentLags || 0}</div>
                                        <div className="text-xs text-gray-500">Spikes</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-yellow-400">{data.lagStats.avgLag || 0}ms</div>
                                        <div className="text-xs text-gray-500">Avg Lag</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-red-400">{data.lagStats.maxLag || 0}ms</div>
                                        <div className="text-xs text-gray-500">Max Lag</div>
                                    </div>
                                </div>
                            </div>

                            {/* Total Lags */}
                            <div className="bg-gray-800 rounded-lg p-4 flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Total Lag Events</span>
                                <span className="font-mono text-lg">{data.lagStats.totalLags || 0}</span>
                            </div>

                            {/* 🔥 v2.3: Enhanced Server Diagnostics */}
                            {data.lagStats.server && (
                                <div className="bg-gray-800 rounded-lg p-4">
                                    <div className="text-gray-400 text-xs uppercase mb-3">Server Info</div>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Uptime:</span>
                                            <span className="text-white font-mono">
                                                {Math.floor(data.lagStats.server.uptime / 60)}m
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">RAM:</span>
                                            <span className="text-white font-mono">
                                                {data.lagStats.server.ram?.rss || 0}MB
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Active:</span>
                                            <span className="text-green-400 font-mono">
                                                {data.lagStats.server.torrents?.active || 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Frozen:</span>
                                            <span className="text-blue-400 font-mono">
                                                {data.lagStats.server.torrents?.frozen || 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between col-span-2">
                                            <span className="text-gray-500">Heap:</span>
                                            <span className="text-white font-mono">
                                                {data.lagStats.server.ram?.heapUsed || 0}/{data.lagStats.server.ram?.heapTotal || 0}MB
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Refresh button */}
                            <button
                                onClick={fetchDiagnostics}
                                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
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
