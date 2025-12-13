/**
 * Status Banner Components - Error states and loading indicators
 */
import { useState, useEffect } from 'react'

/**
 * DegradedBanner - Shows when server is in degraded mode (high memory)
 */
export const DegradedBanner = ({ lastStateChange }) => {
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

/**
 * ErrorScreen - Full-screen error for circuit breaker / critical errors
 */
export const ErrorScreen = ({ status, retryAfter, onRetry }) => {
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

/**
 * BufferingBanner - Shows loading progress when starting playback
 */
export const BufferingBanner = ({ name, progress }) => {
    if (!name) return null

    return (
        <div className="fixed top-16 left-0 right-0 z-50 mx-4">
            <div className="bg-blue-900/95 backdrop-blur-md border border-blue-500 rounded-xl p-4 shadow-2xl animate-pulse">
                <div className="flex items-center gap-3">
                    <div className="animate-spin">
                        <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <div className="font-bold text-white">Buffering...</div>
                        <div className="text-sm text-blue-200 truncate">{name}</div>
                    </div>
                    {progress > 0 && (
                        <div className="text-blue-300 font-mono">{progress}%</div>
                    )}
                </div>
            </div>
        </div>
    )
}
