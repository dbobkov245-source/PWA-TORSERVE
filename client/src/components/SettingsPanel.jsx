import { useState, useEffect } from 'react'
import { useSpatialItem } from '../hooks/useSpatialNavigation'
import { cleanTitle } from '../utils/helpers'

const TABS = [
    { id: 'general', name: 'Основные', icon: '⚙️' },
    { id: 'search', name: 'Поиск и кэш', icon: '🧹' }
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

const SettingsTabButton = ({ tab, active, onClick }) => {
    const spatialRef = useSpatialItem('settings')
    return (
        <button
            ref={spatialRef}
            onClick={onClick}
            className={`focusable w-full flex flex-col items-center justify-center py-4 gap-1 transition-all ${active ? 'bg-purple-600 text-white shadow-xl' : 'bg-transparent text-gray-500 hover:text-gray-300'}`}
        >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[11px] font-bold uppercase tracking-tight">{tab.name}</span>
        </button>
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
    const [speedMode, setSpeedModeState] = useState(localStorage.getItem('speedMode') || 'balanced')
    const [speedLoading, setSpeedLoading] = useState(false)

    useEffect(() => {
        setActiveTab(initialTab)
    }, [initialTab])

    // Spatial Refs
    const closeBtnRef = useSpatialItem('settings')
    const serverInputRef = useSpatialItem('settings')
    const proxyInputRef = useSpatialItem('settings')
    const clearCacheRef = useSpatialItem('settings')
    const generalTabRef = useSpatialItem('settings')
    const searchTabRef = useSpatialItem('settings')

    const cacheCount = Object.keys(localStorage).filter(k => k.startsWith('tmdb_cache_') || k.startsWith('metadata_')).length

    const handleClearCache = () => {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('tmdb_cache_') || k.startsWith('metadata_'))
        keys.forEach(k => localStorage.removeItem(k))
        alert(`Очищено ${keys.length} записей кэша. Перезагрузите приложение.`)
        window.location.reload()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 flex items-center justify-between border-b border-white/10">
                    <div className="flex gap-4">
                        <button
                            ref={generalTabRef}
                            tabIndex="0"
                            onClick={() => setActiveTab('general')}
                            className={`focusable text-sm font-bold transition-opacity flex items-center gap-2 ${activeTab === 'general' ? 'text-white' : 'text-white/50'}`}
                        >
                            <span>⚙️</span> Основные
                        </button>
                        <button
                            ref={searchTabRef}
                            tabIndex="0"
                            onClick={() => setActiveTab('search')}
                            className={`focusable text-sm font-bold transition-opacity flex items-center gap-2 ${activeTab === 'search' ? 'text-white' : 'text-white/50'}`}
                        >
                            <span>🧹</span> Поиск и кэш
                        </button>
                    </div>
                    <button ref={closeBtnRef} tabIndex="0" onClick={onClose} className="focusable text-gray-400 hover:text-white px-2 text-xl">✕</button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {/* --- GENERAL TAB --- */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-fade-in">
                            <section>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">⚡ Скорость загрузки</label>
                                <div className="flex gap-2">
                                    {[{ id: 'eco', name: '🌱 Eco', desc: '20 peers' }, { id: 'balanced', name: '⚖️ Balance', desc: '40 peers' }, { id: 'turbo', name: '🚀 Turbo', desc: '65 peers' }].map(m => (
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

                            <section>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">🖥️ Адрес сервера</label>
                                <input
                                    ref={serverInputRef}
                                    value={serverUrl}
                                    onChange={e => onServerUrlChange(e.target.value, false)}
                                    onBlur={e => onServerUrlChange(e.target.value, true)}
                                    className="focusable w-full bg-gray-800 text-sm text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-blue-500 outline-none transition-colors"
                                    placeholder="http://192.168.x.x:3000"
                                />
                            </section>
                        </div>
                    )}

                    {/* --- SEARCH & CACH TAB --- */}
                    {activeTab === 'search' && (
                        <div className="space-y-6 animate-fade-in">
                            <section>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">🛡️ TMDB Proxy (Обход блокировок)</label>
                                <input
                                    ref={proxyInputRef}
                                    value={tmdbProxyUrl}
                                    onChange={e => onTmdbProxyUrlChange(e.target.value, false)}
                                    onBlur={e => onTmdbProxyUrlChange(e.target.value, true)}
                                    className="focusable w-full bg-gray-800 text-sm text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-purple-500 outline-none transition-colors"
                                    placeholder="Пусто для авто-выбора"
                                />
                                <p className="text-[10px] text-gray-500 mt-2 italic">Используйте это, если не грузятся обложки фильмов. Оставьте пустым для авто-настройки.</p>
                            </section>

                            <section className="pt-4 border-t border-white/5">
                                <button
                                    ref={clearCacheRef}
                                    onClick={handleClearCache}
                                    className="focusable w-full bg-red-900/10 text-red-400 p-4 rounded-xl border border-red-900/30 text-sm flex items-center justify-center gap-3 hover:bg-red-900/20 transition-all font-bold"
                                >
                                    <span>🗑️</span> Очистить кэш ({cacheCount})
                                </button>
                                <p className="text-[10px] text-gray-500 mt-3 text-center">Удаляет сохраненные описания и картинки чтобы освободить место.</p>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default SettingsPanel

