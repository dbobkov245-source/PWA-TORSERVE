/**
 * Auto-Download Panel v3
 * UI for managing auto-download rules (series tracking)
 * 
 * Features:
 * - Pick from loaded torrents
 * - TV remote (D-pad) full navigation support
 * - Focus trap to prevent background scrolling
 * - Proper tabIndex on all interactive elements
 */

import { useState, useEffect, useRef } from 'react'
import { useSpatialItem } from '../hooks/useSpatialNavigation'
import { cleanTitle, getMaxEpisodeNumber } from '../utils/helpers'

// TV Remote focusable button — registered in spatial navigation
function FocusableButton({ onClick, disabled, className, children, autoFocus }) {
    const spatialRef = useSpatialItem('auto-download')
    return (
        <button
            ref={spatialRef}
            onClick={onClick}
            disabled={disabled}
            autoFocus={autoFocus}
            className={`
                focusable
                focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
                focus:outline-none focus:scale-105 transition-all
                ${className}
            `}
        >
            {children}
        </button>
    )
}

// Focusable input registered in spatial navigation
function FocusableInput({ className, ...props }) {
    const spatialRef = useSpatialItem('auto-download')
    return <input ref={spatialRef} className={`focusable ${className}`} {...props} />
}

// Focusable select registered in spatial navigation
function FocusableSelect({ className, children, ...props }) {
    const spatialRef = useSpatialItem('auto-download')
    return <select ref={spatialRef} className={`focusable ${className}`} {...props}>{children}</select>
}

export default function AutoDownloadPanel({ serverUrl, torrents = [], onClose }) {
    const [settings, setSettings] = useState({ enabled: false, intervalMinutes: 720 })
    const [rules, setRules] = useState([])
    const [loading, setLoading] = useState(false)
    const [checking, setChecking] = useState(false)
    const [lastResult, setLastResult] = useState(null)
    const [showPicker, setShowPicker] = useState(false)

    // Form state for new rule
    const [newRule, setNewRule] = useState({
        query: '',
        resolution: '2160',
        group: '',
        lastEpisode: 0
    })

    // Refs for focus management
    const panelRef = useRef(null)
    const closeBtnRef = useSpatialItem('auto-download')

    const getApiUrl = (path) => serverUrl ? `${serverUrl}${path}` : path

    // Extract series from loaded torrents
    const getSeriesFromTorrents = () => {
        return torrents
            .filter(t => {
                const videos = t.files?.filter(f => /\.(mp4|mkv|avi|webm|mov)$/i.test(f.name)) || []
                return videos.length > 1
            })
            .map(t => {
                const videos = t.files?.filter(f => /\.(mp4|mkv|avi|webm|mov)$/i.test(f.name)) || []
                const maxEpisode = getMaxEpisodeNumber(videos)

                const resMatch = t.name.match(/\b(2160p?|1080p?|720p?)\b/i)
                const resolution = resMatch ? resMatch[1].replace('p', '') : ''

                return {
                    name: t.name,
                    episodeCount: videos.length,
                    lastEpisode: maxEpisode,
                    resolution
                }
            })
    }

    const seriesList = getSeriesFromTorrents()

    // Prevent background scrolling when panel is open
    useEffect(() => {
        // Lock body scroll
        const originalStyle = window.getComputedStyle(document.body).overflow
        document.body.style.overflow = 'hidden'
        document.documentElement.style.overflow = 'hidden'

        return () => {
            document.body.style.overflow = originalStyle
            document.documentElement.style.overflow = ''
        }
    }, [])

    // Close on Escape/Backspace only — spatial engine handles arrow navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' || e.key === 'Backspace' || e.keyCode === 10009) {
                e.preventDefault()
                e.stopPropagation()
                if (showPicker) {
                    setShowPicker(false)
                } else {
                    onClose()
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown, true)
        return () => window.removeEventListener('keydown', handleKeyDown, true)
    }, [showPicker, onClose])

    // Fetch rules and settings
    const fetchRules = async () => {
        setLoading(true)
        try {
            const res = await fetch(getApiUrl('/api/autodownload/rules'))
            const data = await res.json()
            setSettings(data.settings || { enabled: false, intervalMinutes: 720 })
            setRules(data.rules || [])
        } catch (err) {
            console.error('[AutoDownload] Fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRules()
    }, [serverUrl])

    // Toggle global enable/disable
    const toggleEnabled = async () => {
        try {
            const res = await fetch(getApiUrl('/api/autodownload/settings'), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !settings.enabled })
            })
            const data = await res.json()
            setSettings(data)
        } catch (err) {
            console.error('[AutoDownload] Toggle error:', err)
        }
    }

    // Update interval
    const updateInterval = async (minutes) => {
        try {
            const res = await fetch(getApiUrl('/api/autodownload/settings'), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ intervalMinutes: parseInt(minutes, 10) })
            })
            const data = await res.json()
            setSettings(data)
        } catch (err) {
            console.error('[AutoDownload] Interval error:', err)
        }
    }

    // Add new rule
    const addRule = async () => {
        if (!newRule.query.trim()) return
        try {
            const res = await fetch(getApiUrl('/api/autodownload/rules'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRule)
            })
            await res.json()
            setNewRule({ query: '', resolution: '2160', group: '', lastEpisode: 0 })
            fetchRules()
        } catch (err) {
            console.error('[AutoDownload] Add rule error:', err)
        }
    }

    // Add rule from torrent picker
    const addFromTorrent = (series) => {
        setNewRule({
            query: cleanTitle(series.name) || series.name.replace(/\./g, ' ').split(/[-\[\(]/)[0].trim(),
            resolution: series.resolution || '2160',
            group: '',
            lastEpisode: series.lastEpisode
        })
        setShowPicker(false)
    }

    // Delete rule
    const deleteRule = async (id) => {
        if (!confirm('Удалить это правило?')) return
        try {
            await fetch(getApiUrl(`/api/autodownload/rules/${id}`), { method: 'DELETE' })
            fetchRules()
        } catch (err) {
            console.error('[AutoDownload] Delete error:', err)
        }
    }

    // Toggle rule enabled
    const toggleRule = async (rule) => {
        try {
            await fetch(getApiUrl(`/api/autodownload/rules/${rule.id}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !rule.enabled })
            })
            fetchRules()
        } catch (err) {
            console.error('[AutoDownload] Toggle rule error:', err)
        }
    }

    // Manual check
    const runCheck = async () => {
        setChecking(true)
        setLastResult(null)
        try {
            const res = await fetch(getApiUrl('/api/autodownload/check'), { method: 'POST' })
            const data = await res.json()
            setLastResult(data)
            fetchRules()
        } catch (err) {
            console.error('[AutoDownload] Check error:', err)
            setLastResult({ error: err.message })
        } finally {
            setChecking(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                ref={panelRef}
                className="bg-gray-900 rounded-2xl w-full max-w-xl max-h-[75vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        📺 Авто-загрузка сериалов
                    </h2>
                    <button
                        ref={closeBtnRef}
                        onClick={onClose}
                        className="focusable text-gray-400 hover:text-white text-2xl p-2 rounded-lg focus:ring-4 focus:ring-blue-500 focus:outline-none"

                    >
                        ✕
                    </button>
                </div>

                {/* Content - scrollable */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Global Settings */}
                    <div className="bg-gray-800/50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <div className="font-bold text-white">Автоматическая проверка</div>
                                <div className="text-sm text-gray-400">
                                    Поиск новых серий каждые {settings.intervalMinutes >= 60
                                        ? `${Math.round(settings.intervalMinutes / 60)} ч`
                                        : `${settings.intervalMinutes} мин`}
                                </div>
                            </div>
                            <FocusableButton
                                onClick={toggleEnabled}
                                className={`w-14 h-8 rounded-full transition-colors relative ${settings.enabled ? 'bg-green-600' : 'bg-gray-600'
                                    }`}
                            >
                                <div className={`absolute w-6 h-6 bg-white rounded-full top-1 transition-all ${settings.enabled ? 'left-7' : 'left-1'
                                    }`} />
                            </FocusableButton>
                        </div>

                        {/* Interval Selector */}
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                            <span className="text-gray-400">Интервал:</span>
                            {[
                                { value: 360, label: '6 ч' },
                                { value: 720, label: '12 ч' },
                                { value: 1440, label: '24 ч' }
                            ].map(opt => (
                                <FocusableButton
                                    key={opt.value}
                                    onClick={() => updateInterval(opt.value)}
                                    className={`px-3 py-1 rounded ${settings.intervalMinutes === opt.value
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
            
                                >
                                    {opt.label}
                                </FocusableButton>
                            ))}
                        </div>
                    </div>

                    {/* Manual Check Button */}
                    <FocusableButton
                        onClick={runCheck}
                        disabled={checking}
                        className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"

                    >
                        {checking ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                Проверяем...
                            </>
                        ) : (
                            <>🔍 Проверить сейчас</>
                        )}
                    </FocusableButton>

                    {/* Last Result */}
                    {lastResult && (
                        <div className={`rounded-xl p-3 text-sm ${lastResult.downloaded > 0
                            ? 'bg-green-900/50 text-green-300'
                            : lastResult.error
                                ? 'bg-red-900/50 text-red-300'
                                : 'bg-gray-800 text-gray-400'
                            }`}>
                            {lastResult.error
                                ? `❌ Ошибка: ${lastResult.error}`
                                : lastResult.downloaded > 0
                                    ? `✅ Найдено и добавлено: ${lastResult.downloaded} серий`
                                    : '✓ Новых серий не найдено'
                            }
                        </div>
                    )}

                    {/* Add New Rule */}
                    <div className="bg-gray-800/50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-white">➕ Добавить сериал</h3>
                            {seriesList.length > 0 && (
                                <FocusableButton
                                    onClick={() => setShowPicker(!showPicker)}
                                    className="bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 px-3 py-1 rounded-lg text-sm"
            
                                >
                                    📋 Выбрать ({seriesList.length})
                                </FocusableButton>
                            )}
                        </div>

                        {/* Picker Modal */}
                        {showPicker && (
                            <div className="mb-4 bg-gray-700/50 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                                <div className="text-sm text-gray-400 mb-2">Выберите сериал:</div>
                                {seriesList.map((series, idx) => (
                                    <FocusableButton
                                        key={idx}
                                        onClick={() => addFromTorrent(series)}
                                        className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-lg p-3"
                                        autoFocus={idx === 0}
                                    >
                                        <div className="font-medium text-white truncate">{series.name}</div>
                                        <div className="text-xs text-gray-400">
                                            {series.episodeCount} серий • Последняя: {series.lastEpisode}
                                            {series.resolution && ` • ${series.resolution}p`}
                                        </div>
                                    </FocusableButton>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <FocusableInput
                                value={newRule.query}
                                onChange={(e) => setNewRule({ ...newRule, query: e.target.value })}
                                placeholder="Название сериала..."
                                className="col-span-2 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <FocusableSelect
                                value={newRule.resolution}
                                onChange={(e) => setNewRule({ ...newRule, resolution: e.target.value })}
                                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Любое качество</option>
                                <option value="2160">4K (2160p)</option>
                                <option value="1080">1080p</option>
                                <option value="720">720p</option>
                            </FocusableSelect>
                            <FocusableInput
                                type="number"
                                min="0"
                                value={newRule.lastEpisode}
                                onChange={(e) => setNewRule({ ...newRule, lastEpisode: parseInt(e.target.value, 10) || 0 })}
                                placeholder="Последняя серия"
                                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <FocusableButton
                            onClick={addRule}
                            disabled={!newRule.query.trim()}
                            className="mt-3 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2 rounded-lg"
    
                        >
                            Добавить
                        </FocusableButton>
                    </div>

                    {/* Rules List */}
                    <div className="space-y-2">
                        <h3 className="font-bold text-white">📋 Мои сериалы ({rules.length})</h3>
                        {loading ? (
                            <div className="text-center text-gray-500 py-8">Загрузка...</div>
                        ) : rules.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                                Добавьте сериал для отслеживания
                            </div>
                        ) : (
                            rules.map((rule) => (
                                <div
                                    key={rule.id}
                                    className={`bg-gray-800 rounded-xl p-3 flex items-center gap-3 ${!rule.enabled ? 'opacity-50' : ''
                                        }`}
                                >
                                    <FocusableButton
                                        onClick={() => toggleRule(rule)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${rule.enabled ? 'bg-green-600' : 'bg-gray-600'
                                            }`}
                
                                    >
                                        {rule.enabled ? '✓' : '○'}
                                    </FocusableButton>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white truncate">{rule.query}</div>
                                        <div className="text-xs text-gray-400">
                                            {rule.resolution && `${rule.resolution}p • `}
                                            Серия: {rule.lastEpisode}
                                        </div>
                                    </div>
                                    <FocusableButton
                                        onClick={() => deleteRule(rule.id)}
                                        className="text-red-500 hover:text-red-400 p-2 text-xl"
                
                                    >
                                        🗑️
                                    </FocusableButton>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
