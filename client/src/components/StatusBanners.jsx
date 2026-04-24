/**
 * Status Banner Components - Error states and loading indicators
 */
import React, { useState, useEffect } from 'react'
import { useSpatialItem } from '../hooks/useSpatialNavigation'

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
 * NOTE: Now includes Settings button for mobile users who need to change server URL
 */
export const ErrorScreen = ({ status, retryAfter, onRetry, onSettings }) => {
    const [countdown, setCountdown] = useState(retryAfter || 300)
    const settingsBtnRef = React.useRef(null)
    const retryBtnRef = React.useRef(null)

    useEffect(() => {
        const target = settingsBtnRef.current || retryBtnRef.current
        target?.focus()
    }, [])

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            if (document.activeElement === settingsBtnRef.current) {
                retryBtnRef.current?.focus()
            } else {
                settingsBtnRef.current?.focus() || retryBtnRef.current?.focus()
            }
        } else if (e.key === 'Enter' || e.key === 'OK') {
            document.activeElement?.click?.()
        }
    }

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
    const title = isCircuitOpen ? 'Storage Unavailable' : 'Ошибка сервера'
    const message = isCircuitOpen
        ? 'NFS/Storage is not responding. The server will retry automatically.'
        : 'Не удалось подключиться к серверу. Проверьте адрес в настройках.'

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6" onKeyDown={handleKeyDown}>
            <div className="bg-red-900/30 border border-red-700 rounded-2xl p-8 max-w-md text-center">
                <div className="text-6xl mb-4">{icon}</div>
                <h1 className="text-2xl font-bold text-red-400 mb-2">{title}</h1>
                <p className="text-gray-300 mb-6">{message}</p>

                <div className="flex flex-col gap-3">
                    {/* Settings button - critical for mobile users */}
                    {onSettings && (
                        <button
                            ref={settingsBtnRef}
                            onClick={onSettings}
                            tabIndex={0}
                            className="bg-blue-600 hover:bg-blue-700 focus:bg-blue-500 focus:ring-4 focus:ring-blue-300 text-white px-6 py-3 rounded-lg font-bold transition-colors outline-none"
                        >
                            ⚙️ Настройки сервера
                        </button>
                    )}

                    <button
                        ref={retryBtnRef}
                        onClick={onRetry}
                        tabIndex={0}
                        className="bg-gray-700 hover:bg-gray-600 focus:bg-gray-500 focus:ring-4 focus:ring-gray-300 text-white px-6 py-3 rounded-lg font-bold transition-colors outline-none"
                    >
                        🔄 Повторить
                    </button>
                </div>

                <p className="text-gray-500 text-sm mt-4">
                    Авто-повтор через {countdown}с
                </p>
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

/**
 * ServerStatusBar - Small indicator showing server health
 */
/**
 * ServerStatusBar - Small indicator showing server health
 */
export const ServerStatusBar = React.forwardRef(({ status, onDiagnosticsClick }, ref) => {
    const getStatusInfo = () => {
        switch (status) {
            case 'ok':
                return { icon: '🟢', text: 'Server OK', color: 'bg-green-900/50 border-green-700 text-green-300' }
            case 'degraded':
                return { icon: '🟡', text: 'High RAM', color: 'bg-yellow-900/50 border-yellow-700 text-yellow-300' }
            case 'circuit_open':
                return { icon: '🔴', text: 'Storage Error', color: 'bg-red-900/50 border-red-700 text-red-300' }
            case 'error':
                return { icon: '🔴', text: 'Server Error', color: 'bg-red-900/50 border-red-700 text-red-300' }
            default:
                return { icon: '⚪', text: 'Connecting...', color: 'bg-gray-800/50 border-gray-600 text-gray-400' }
        }
    }

    const info = getStatusInfo()

    return (
        <button
            ref={ref}
            tabIndex="0"
            onClick={onDiagnosticsClick}
            className={`focusable px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-colors hover:opacity-80 focus:bg-blue-600 focus:text-white ${info.color}`}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    onDiagnosticsClick()
                }
            }}
        >
            <span>{info.icon}</span>
            <span>{info.text}</span>
        </button>
    )
})
