/**
 * Poster Component - Torrent card with dynamic poster loading
 * Stage 6: Added enriched metadata caching (separate from poster cache)
 */
import { useState, useEffect } from 'react'
import { CapacitorHttp } from '@capacitor/core'
import { Capacitor } from '@capacitor/core'
import { cleanTitle, formatSize, formatSpeed, formatEta, getGradient } from '../utils/helpers'

// ─── Metadata Cache ───────────────────────────────────────────
// Separate from poster cache to avoid breaking existing functionality
const METADATA_CACHE_PREFIX = 'metadata_v1_'
const METADATA_CACHE_LIMIT = 300

/**
 * Save enriched metadata to localStorage with LRU eviction
 */
const saveMetadata = (name, data) => {
    const key = METADATA_CACHE_PREFIX + name
    const entry = { ...data, timestamp: Date.now() }

    try {
        localStorage.setItem(key, JSON.stringify(entry))

        // LRU Eviction: check cache size periodically
        const allKeys = Object.keys(localStorage).filter(k => k.startsWith(METADATA_CACHE_PREFIX))
        if (allKeys.length > METADATA_CACHE_LIMIT) {
            // Find oldest entries
            const entries = allKeys.map(k => {
                try {
                    const val = JSON.parse(localStorage.getItem(k))
                    return { key: k, timestamp: val?.timestamp || 0 }
                } catch { return { key: k, timestamp: 0 } }
            })
            entries.sort((a, b) => a.timestamp - b.timestamp)

            // Remove oldest 10%
            const toRemove = Math.ceil(METADATA_CACHE_LIMIT * 0.1)
            entries.slice(0, toRemove).forEach(e => localStorage.removeItem(e.key))
            console.log(`[Metadata] LRU eviction: removed ${toRemove} oldest entries`)
        }
    } catch (e) {
        console.warn('[Metadata] Failed to save:', e)
    }
}

/**
 * Get cached metadata for a title
 * @param {string} name - Cleaned movie/show name
 * @returns {object|null} - Cached metadata or null
 */
export const getMetadata = (name) => {
    const key = METADATA_CACHE_PREFIX + name
    try {
        const cached = localStorage.getItem(key)
        if (cached) {
            return JSON.parse(cached)
        }
    } catch { }
    return null
}

// ─── Poster Component ─────────────────────────────────────────

const Poster = ({ name, onClick, progress, peers, isReady, size, downloadSpeed, downloaded, eta, newFilesCount }) => {
    const [bgImage, setBgImage] = useState(null)
    const cleanedName = cleanTitle(name)

    useEffect(() => {
        if (!cleanedName) return

        const cacheKey = `poster_v3_${cleanedName}` // Existing poster cache - DO NOT CHANGE
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
            setBgImage(cached)
            return
        }

        const fetchPoster = async () => {
            try {
                let result = null
                const query = encodeURIComponent(cleanedName)
                const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
                const KP_API_KEY = import.meta.env.VITE_KP_API_KEY
                const CUSTOM_PROXY = import.meta.env.VITE_TMDB_PROXY_URL

                // 1️⃣ Custom Cloudflare Worker (приоритетный, ваш личный прокси)
                if (!result && CUSTOM_PROXY) {
                    try {
                        // Worker format: /search/multi?api_key=...&query=... (Worker adds /3 prefix)
                        const proxyUrl = `${CUSTOM_PROXY}/search/multi?api_key=${TMDB_API_KEY}&query=${query}&language=ru-RU`
                        console.log('[Poster] Custom Proxy:', cleanedName)

                        const res = await fetch(proxyUrl)
                        if (res.ok) {
                            const data = await res.json()
                            result = data.results?.find(r => r.poster_path)
                        }
                    } catch (customErr) {
                        console.warn('[Poster] Custom proxy failed:', customErr)
                    }
                }

                // 2️⃣ Lampa Proxy (apn-latest.onrender.com) — fallback
                if (!result) {
                    try {
                        // Lampa proxy expects: https://proxy/https://api.themoviedb.org/...
                        const targetUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${query}&language=ru-RU`
                        const lampaUrl = `https://apn-latest.onrender.com/${targetUrl}`
                        console.log('[Poster] Lampa Proxy:', cleanedName)

                        const res = await fetch(lampaUrl)
                        if (res.ok) {
                            const data = await res.json()
                            result = data.results?.find(r => r.poster_path)
                        }
                    } catch (lampaErr) {
                        console.warn('[Poster] Lampa proxy failed:', lampaErr)
                    }
                }

                // 3️⃣ Fallback: CapacitorHttp (Android, требует VPN/DNS)
                if (!result && Capacitor.isNativePlatform()) {
                    try {
                        const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${query}&language=ru-RU`
                        console.log('[Poster] Native Search:', cleanedName)
                        const response = await CapacitorHttp.get({ url: searchUrl })
                        if (response.data && response.data.results) {
                            result = response.data.results.find(r => r.poster_path)
                        }
                    } catch (nativeErr) {
                        console.warn('[Poster] Native request failed:', nativeErr)
                    }
                }

                // 4️⃣ Fallback: corsproxy.io (браузер)
                if (!result) {
                    try {
                        const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${query}&language=ru-RU`
                        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(searchUrl)}`
                        console.log('[Poster] CorsProxy:', cleanedName)
                        const res = await fetch(proxyUrl)
                        if (res.ok) {
                            const data = await res.json()
                            result = data.results?.find(r => r.poster_path)
                        }
                    } catch (proxyErr) {
                        console.warn('[Poster] CorsProxy failed:', proxyErr)
                    }
                }

                // 5️⃣ Fallback: Кинопоиск API (альтернатива TMDB)
                let kpPoster = null
                let kpData = null
                if (!result && KP_API_KEY) {
                    try {
                        const kpProxy = 'https://cors.kp556.workers.dev:8443/'
                        const kpUrl = `${kpProxy}https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${query}`
                        console.log('[Poster] Kinopoisk:', cleanedName)

                        const res = await fetch(kpUrl, {
                            headers: { 'X-API-KEY': KP_API_KEY }
                        })
                        if (res.ok) {
                            const data = await res.json()
                            const kpFilm = data.films?.find(f => f.posterUrlPreview)
                            if (kpFilm) {
                                kpPoster = kpFilm.posterUrlPreview
                                kpData = kpFilm
                                console.log('[Poster] Kinopoisk Found:', cleanedName, kpFilm.nameRu || kpFilm.nameEn)
                            }
                        }
                    } catch (kpErr) {
                        console.warn('[Poster] Kinopoisk failed:', kpErr)
                    }
                }

                // ─── Save poster + enriched metadata ───
                if (result) {
                    const directUrl = `https://wsrv.nl/?url=ssl:image.tmdb.org/t/p/w500${result.poster_path}&output=webp`
                    localStorage.setItem(cacheKey, directUrl)
                    setBgImage(directUrl)
                    console.log('[Poster] Found:', cleanedName, result.title || result.name)

                    // 🆕 Save enriched metadata (Stage 6)
                    const backdropUrl = result.backdrop_path
                        ? `https://wsrv.nl/?url=ssl:image.tmdb.org/t/p/w1280${result.backdrop_path}&output=webp`
                        : null

                    saveMetadata(cleanedName, {
                        poster: directUrl,
                        backdrop: backdropUrl,
                        overview: result.overview || null,
                        rating: result.vote_average || null,
                        year: (result.release_date || result.first_air_date || '').substring(0, 4) || null,
                        title: result.title || result.name || cleanedName,
                        source: 'tmdb'
                    })

                } else if (kpPoster) {
                    const kpUrl = `https://wsrv.nl/?url=${encodeURIComponent(kpPoster)}&output=webp`
                    localStorage.setItem(cacheKey, kpUrl)
                    setBgImage(kpUrl)

                    // 🆕 Save Kinopoisk metadata (Stage 6)
                    if (kpData) {
                        saveMetadata(cleanedName, {
                            poster: kpUrl,
                            backdrop: null, // KP doesn't provide backdrop in search
                            overview: kpData.description || null,
                            rating: kpData.rating || kpData.ratingKinopoisk || null,
                            year: kpData.year ? String(kpData.year) : null,
                            title: kpData.nameRu || kpData.nameEn || cleanedName,
                            source: 'kinopoisk'
                        })
                    }
                } else {
                    console.log('[Poster] Not found:', cleanedName)
                }
            } catch (err) {
                console.warn('[Poster] Error:', cleanedName, err)
            }
        }

        // Рандомная задержка (0-2 сек) чтобы не бомбить API при загрузке списка
        const timer = setTimeout(fetchPoster, Math.random() * 2000)
        return () => clearTimeout(timer)
    }, [cleanedName])

    return (
        <button
            onClick={onClick}
            className={`
          relative group aspect-[2/3] rounded-xl overflow-hidden shadow-xl
          transition-all duration-300
          focus:scale-105 focus:ring-4 focus:ring-blue-500 focus:z-20 outline-none
          hover:scale-105
          bg-gray-800
        `}
            style={{ background: !bgImage ? getGradient(name) : undefined }}
        >
            {/* If we have an image, show it. Otherwise show decorative gradient elements. */}
            {bgImage ? (
                <img
                    src={bgImage}
                    alt={name}
                    className="w-full h-full object-cover transition-opacity duration-500"
                    onError={() => setBgImage(null)} // Revert to gradient on load error
                />
            ) : (
                <>
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-10 -left-10 w-24 h-24 bg-black/20 rounded-full blur-xl pointer-events-none" />
                    <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                        <h3 className="text-gray-100 font-bold text-lg leading-snug drop-shadow-lg line-clamp-4 font-sans tracking-wide">
                            {cleanedName || name}
                        </h3>
                    </div>
                </>
            )}

            {/* Overlay for Stats */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/10 flex flex-col justify-end p-3 text-left">
                {/* Status Badge */}
                <div className="absolute top-2 right-2 flex gap-1">
                    {newFilesCount > 0 && (
                        <span className="bg-purple-500 text-white text-[10px] font-black tracking-wider px-2 py-0.5 rounded shadow-sm animate-pulse">
                            🆕 {newFilesCount} NEW
                        </span>
                    )}
                    {isReady ? (
                        <span className="bg-green-500 text-white text-[10px] font-black tracking-wider px-2 py-0.5 rounded shadow-sm">READY</span>
                    ) : (
                        <span className="bg-yellow-500 text-black text-[10px] font-black tracking-wider px-2 py-0.5 rounded shadow-sm">{Math.round(progress * 100)}%</span>
                    )}
                </div>

                {/* Footer Stats */}
                <div className="text-xs text-gray-400 flex flex-col gap-1 mt-auto">
                    {/* Download progress info */}
                    {!isReady && downloaded > 0 && (
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-blue-400">
                                {formatSize(downloaded)} / {formatSize(size)}
                            </span>
                            {eta > 0 && (
                                <span className="text-yellow-400">⏱ {formatEta(eta)}</span>
                            )}
                        </div>
                    )}

                    {/* Stats row */}
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>
                            {peers}
                        </span>
                        {isReady && size > 0 && (
                            <span className="text-gray-500">{formatSize(size)}</span>
                        )}
                        {!isReady && downloadSpeed > 0 && (
                            <span className="text-green-400">↓{formatSpeed(downloadSpeed)}</span>
                        )}
                    </div>

                    {/* Progress bar */}
                    {!isReady && progress > 0 && (
                        <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div style={{ width: `${progress * 100}%` }} className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300" />
                        </div>
                    )}
                </div>
            </div>
        </button>
    )
}

export default Poster
