/**
 * SettingsPanel Component - App configuration UI
 */
import { useState } from 'react'
import { CapacitorHttp } from '@capacitor/core'
import { Capacitor } from '@capacitor/core'

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
    onTmdbProxyUrlChange
}) => {
    const [showAdvanced, setShowAdvanced] = useState(false)

    const handleClearCache = () => {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('poster_'))
        keys.forEach(k => localStorage.removeItem(k))
        alert(`Очищено ${keys.length} постеров. Перезагрузите приложение.`)
        window.location.reload()
    }

    const handleTestPoster = async () => {
        const testName = 'The Beekeeper'
        const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${import.meta.env.VITE_TMDB_API_KEY}&query=${encodeURIComponent(testName)}&language=ru-RU`

        let msg = `🧪 Тест постера: "${testName}"\n\n`

        // Test 1: CapacitorHttp (native)
        if (Capacitor.isNativePlatform()) {
            try {
                msg += '1️⃣ CapacitorHttp: '
                const response = await CapacitorHttp.get({ url: searchUrl })
                if (response.data?.results?.length > 0) {
                    const r = response.data.results[0]
                    msg += `✅ Найдено: ${r.title || r.name}\n`
                } else {
                    msg += `❌ Нет результатов\n`
                }
            } catch (e) {
                msg += `❌ Ошибка: ${e.message}\n`
            }
        } else {
            msg += '1️⃣ CapacitorHttp: ⏭️ пропущен (не Android)\n'
        }

        // Test 2: corsproxy.io
        try {
            msg += '2️⃣ corsproxy.io: '
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(searchUrl)}`
            const res = await fetch(proxyUrl)
            if (res.ok) {
                const data = await res.json()
                if (data.results?.length > 0) {
                    const r = data.results[0]
                    msg += `✅ Найдено: ${r.title || r.name}\n`
                } else {
                    msg += `❌ Нет результатов\n`
                }
            } else {
                msg += `❌ HTTP ${res.status}\n`
            }
        } catch (e) {
            msg += `❌ Ошибка: ${e.message}\n`
        }

        alert(msg)
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

                {/* Test Poster Button */}
                <button
                    onClick={handleTestPoster}
                    className="mt-2 text-blue-400 text-sm hover:text-blue-300 flex items-center gap-2"
                >
                    🧪 Тест (Direct)
                </button>
            </div>
        </div>
    )
}

export default SettingsPanel
