/**
 * tmdbClient.js — Unified TMDB Fetcher
 * 
 * 5-Level Cascade (from POSTER_BATTLE_HISTORY.md):
 * 1. Custom Cloudflare Worker (VITE_TMDB_PROXY_URL)
 * 2. Lampa Proxy (apn-latest.onrender.com)
 * 3. CapacitorHttp + Client DoH (bypass DNS poisoning)
 * 4. corsproxy.io (browser fallback)
 * 5. Kinopoisk API (alternative data source)
 * 
 * Features:
 * - Automatic fallback through all levels
 * - Response caching with TTL
 * - Normalized response format
 */

import { CapacitorHttp } from '@capacitor/core'
import { Capacitor } from '@capacitor/core'

// ─── Polyfills ────────────────────────────────────────────────
const timeoutSignal = (ms) => {
    try {
        if (AbortSignal.timeout) return AbortSignal.timeout(ms)
    } catch (e) { /* ignore */ }
    const controller = new AbortController()
    setTimeout(() => controller.abort(), ms)
    return controller.signal
}

// ─── Configuration ─────────────────────────────────────────────
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const KP_API_KEY = import.meta.env.VITE_KP_API_KEY
const CUSTOM_PROXY = import.meta.env.VITE_TMDB_PROXY_URL
const LAMPA_PROXY = 'https://apn-latest.onrender.com'
const KP_PROXY = 'https://cors.kp556.workers.dev:8443'

// Cache configuration
const CACHE_PREFIX = 'tmdb_cache_v1_'
const METADATA_CACHE_PREFIX = 'metadata_v1_' // Consolidated from Poster.jsx
const METADATA_CACHE_LIMIT = 300
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes for search
const DISCOVERY_CACHE_TTL = 10 * 60 * 1000 // 10 minutes for discovery

// ─── Image Mirrors (from Lampa) ────────────────────────────────
// 5 CDN mirrors with automatic failover and ban system
// 5 CDN mirrors with automatic failover and ban system
const IMAGE_MIRRORS = [
    'imagetmdb.com',
    'nl.imagetmdb.com',
    'de.imagetmdb.com',
    'pl.imagetmdb.com',
    'lampa.byskaz.ru/tmdb/img'
]

const PROXY_MODE_KEY = 'tmdb_image_proxy_enabled'

/**
 * Helper to get the base API URL from localStorage or current origin.
 * Essential for Capacitor native platforms where relative paths fail.
 */
function getApiBase() {
    if (typeof window === 'undefined') return ''
    const stored = localStorage.getItem('serverUrl')

    // 🔥 FIX: Check if stored URL is valid and NOT localhost (unless in browser)
    if (stored && stored.includes('://')) {
        const url = new URL(stored)
        if (Capacitor.isNativePlatform() && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
            // Skiping localhost on native - it won't work for proxying
        } else {
            return stored.replace(/\/$/, '')
        }
    }

    // For browser/PWA on same origin as server
    if (window.location.protocol.startsWith('http') && !Capacitor.isNativePlatform()) {
        return window.location.origin
    }

    return ''
}

// Mirror error tracking - auto-ban after 20 errors in 10 seconds
const mirrorStats = {}
IMAGE_MIRRORS.forEach(mirror => {
    mirrorStats[mirror] = { errors: [], banned: false }
})

/**
 * Get current active image mirror (Lampa-style ImageMirror)
 * @returns {string} - Current mirror hostname
 */
export function getCurrentImageMirror() {
    const freeMirrors = IMAGE_MIRRORS.filter(m => !mirrorStats[m].banned)
    const lastMirror = localStorage.getItem('tmdb_img_mirror') || ''

    if (freeMirrors.includes(lastMirror)) {
        return lastMirror
    } else if (freeMirrors.length > 0) {
        localStorage.setItem('tmdb_img_mirror', freeMirrors[0])
        return freeMirrors[0]
    }

    // All mirrors banned - reset and try first
    IMAGE_MIRRORS.forEach(m => { mirrorStats[m].banned = false })
    return IMAGE_MIRRORS[0]
}

/**
 * Report broken image URL - triggers mirror ban after 20 errors in 10s
 * @param {string} url - Failed image URL
 */
export function reportBrokenImage(url) {
    IMAGE_MIRRORS.forEach(mirror => {
        if (url && url.includes(mirror)) {
            const now = Date.now()
            const stats = mirrorStats[mirror]

            stats.errors.push(now)
            // Keep only errors from last 10 seconds
            stats.errors = stats.errors.filter(t => now - t < 10000)

            console.log(`[ImageMirror] ${mirror} errors: ${stats.errors.length}`)

            if (stats.errors.length >= 20) {
                stats.banned = true
                stats.errors = []
                console.warn(`[ImageMirror] BANNED: ${mirror}`)
                // Clear saved mirror to trigger switch
                localStorage.removeItem('tmdb_img_mirror')

                // Check if ALL mirrors are banned
                const allBanned = IMAGE_MIRRORS.every(m => mirrorStats[m].banned)
                if (allBanned) {
                    console.warn('[ImageMirror] 🚨 ALL MIRRORS BANNED! Switching to WSRV.NL Proxy Mode.')
                    localStorage.setItem(PROXY_MODE_KEY, 'true')
                    // Optional: force reload or event to allow UI to update immediately
                    // window.location.reload() 
                }
            }
        }
    })
}

/**
 * Get image URL with automatic cascade (Proxy -> Worker -> Lampa -> Mirror -> wsrv.nl)
 * ARC-01: Multi-layered resilience for images
 * @param {string} path - TMDB image path (e.g., /abcd123.jpg)
 * @param {string} size - Image size (default: w342)
 */
export function getImageUrl(path, size = 'w342') {
    if (!path) return ''
    if (path.startsWith('http')) return path

    const originalUrl = `https://image.tmdb.org/t/p/${size}${path}`
    const apiBase = getApiBase()

    // 1. For Browser (Localhost): Server Proxy is fine and reliable
    if (!Capacitor.isNativePlatform() && apiBase) {
        return `${apiBase}/api/proxy?url=${encodeURIComponent(originalUrl)}`
    }

    // 2. For APK (TV): Use Dynamic Mirror System
    // ARC-01: Check if Proxy Mode (WSRV) is forcibly enabled (due to all mirrors banned)
    const proxyMode = localStorage.getItem(PROXY_MODE_KEY) === 'true'

    if (proxyMode) {
        // Fallback: WSRV Global Proxy
        // Handles "ssl:" for TMDB bypassing
        return `https://wsrv.nl/?url=ssl:image.tmdb.org/t/p/${size}${path}&output=webp`
    }

    // Default: Use active CDN mirror (e.g. imagetmdb.com)
    // This connects to Lampa's mirror system which is fast and resilient in RU
    const mirror = getCurrentImageMirror()
    return `https://${mirror}/t/p/${size}${path}`
}

// ─── Client-Side DoH (Phase 3) ─────────────────────────────────
const dohCache = new Map()

/**
 * Resolve hostname to IP via Google DNS-over-HTTPS
 * Bypasses DNS poisoning where provider returns 127.0.0.1
 */
async function resolveClientIP(hostname) {
    // Check cache first
    const cached = dohCache.get(hostname)
    if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
        return cached.ip
    }

    try {
        // Google DNS-over-HTTPS API
        const res = await fetch(`https://dns.google/resolve?name=${hostname}&type=A`, {
            headers: { 'Accept': 'application/dns-json' }
        })

        if (res.ok) {
            const data = await res.json()
            const ip = data.Answer?.find(r => r.type === 1)?.data

            if (ip && ip !== '127.0.0.1') {
                dohCache.set(hostname, { ip, timestamp: Date.now() })
                console.log(`[DoH] Resolved ${hostname} → ${ip}`)
                return ip
            }
        }
    } catch (e) {
        console.warn('[DoH] Resolution failed:', e.message)
    }

    return null
}

// ─── Cache Utilities ───────────────────────────────────────────
function getCached(endpoint) {
    const key = CACHE_PREFIX + endpoint
    try {
        const cached = localStorage.getItem(key)
        if (cached) {
            const { data, timestamp, ttl } = JSON.parse(cached)
            if (Date.now() - timestamp < ttl) {
                return data
            }
            localStorage.removeItem(key)
        }
    } catch { }
    return null
}

function setCache(endpoint, data, ttl = CACHE_TTL) {
    const key = CACHE_PREFIX + endpoint
    try {
        localStorage.setItem(key, JSON.stringify({
            data,
            timestamp: Date.now(),
            ttl
        }))
    } catch (e) {
        console.warn('[Cache] Failed to save:', e.message)
    }
}

// ─── Metadata Cache (Consolidated) ────────────────────────────

/**
 * Save enriched metadata to localStorage with LRU eviction
 * Moved from Poster.jsx to unify cache logic
 */
export const saveMetadata = (name, data) => {
    if (!name || !data) return
    // Clean name for key consistency
    const key = METADATA_CACHE_PREFIX + name.toLowerCase().trim()
    const entry = { ...data, timestamp: Date.now() }

    try {
        localStorage.setItem(key, JSON.stringify(entry))

        // LRU Eviction: check cache size periodically (10% chance on write)
        if (Math.random() < 0.1) {
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

                // Remove oldest 20%
                const toRemove = Math.ceil(METADATA_CACHE_LIMIT * 0.2)
                entries.slice(0, toRemove).forEach(e => localStorage.removeItem(e.key))
                console.log(`[Metadata] LRU eviction: removed ${toRemove} entries`)
            }
        }
    } catch (e) {
        console.warn('[Metadata] Failed to save:', e)
    }
}

/**
 * Get cached metadata for a title
 * @param {string} name - Movie/show name
 */
export const getMetadata = (name) => {
    if (!name) return null
    const key = METADATA_CACHE_PREFIX + name.toLowerCase().trim()
    try {
        const cached = localStorage.getItem(key)
        if (cached) {
            return JSON.parse(cached)
        }
    } catch { }
    return null
}

/**
 * Resolve metadata by name (Fetch + Cache + Normalization)
 * "Inversion of Control" for Poster.jsx
 * @param {string} name - Raw title from torrent
 * @returns {Promise<Object|null>}
 */
export const resolveMetadata = async (name) => {
    if (!name) return null

    // 1. Check cache first
    const cleanName = name.replace(/[\._]/g, ' ').trim()
    const cached = getMetadata(cleanName)
    if (cached) return cached

    // 2. Fetch using Unified Client (Cascading)
    try {
        const query = encodeURIComponent(cleanName)
        const response = await tmdbClient(`/search/multi?query=${query}`, {
            searchQuery: cleanName // Enable Kinopoisk fallback
        })

        const result = response.results?.find(r => r.poster_path || r._kp_data?.posterUrlPreview)

        if (result) {
            // 3. Normalize & Enrich
            const isKp = response.source === 'kinopoisk'
            const posterPath = result.poster_path || result._kp_data?.posterUrlPreview
            const backdropPath = result.backdrop_path

            // Generate full URLs using resilience logic
            const posterUrl = isKp
                ? `https://wsrv.nl/?url=${encodeURIComponent(posterPath)}&output=webp`
                : getImageUrl(posterPath, 'w500')

            const backdropUrl = !isKp && backdropPath
                ? getImageUrl(backdropPath, 'w1280')
                : null

            const metadata = {
                poster: posterUrl,
                backdrop: backdropUrl,
                overview: result.overview || null,
                rating: result.vote_average || null,
                year: (result.release_date || result.first_air_date || '').substring(0, 4) || null,
                title: result.title || result.name || cleanName,
                source: response.source,
                id: result.id
            }

            // 4. Save to cache
            saveMetadata(cleanName, metadata)
            return metadata
        }
    } catch (err) {
        console.warn('[metadata] Resolve failed:', err)
    }

    return null
}

// ─── Fetch Strategies ──────────────────────────────────────────

/**
 * Strategy 1: Custom Cloudflare Worker
 */
const getSeparator = (url) => url.includes('?') ? '&' : '?'

/**
 * Strategy 1: Custom Cloudflare Worker
 */
async function tryCustomWorker(endpoint) {
    if (!CUSTOM_PROXY) return null

    try {
        // Worker format: /search/multi?... (Worker adds /3 prefix)
        const separator = getSeparator(endpoint)
        const url = `${CUSTOM_PROXY}${endpoint}${separator}api_key=${TMDB_API_KEY}&language=ru-RU`
        console.log('[TMDB] Trying Custom Worker...')

        const res = await fetch(url, { signal: timeoutSignal(5000) })
        // ... (rest same)
    } catch (e) {
        // ...
    }
    return null
}
// Note: I will apply this pattern to all functions.

/**
 * Strategy 2: Lampa Proxy (apn-latest.onrender.com)
 */
async function tryLampaProxy(endpoint) {
    try {
        const separator = getSeparator(endpoint)
        const targetUrl = `https://api.themoviedb.org/3${endpoint}${separator}api_key=${TMDB_API_KEY}&language=ru-RU`
        const url = `${LAMPA_PROXY}/${targetUrl}`
        console.log('[TMDB] Trying Lampa Proxy...')

        const res = await fetch(url, { signal: timeoutSignal(8000) })
        if (res.ok) {
            const data = await res.json()
            console.log('[TMDB] ✅ Lampa Proxy success')
            return { ...data, source: 'tmdb', method: 'lampa_proxy' }
        }
    } catch (e) {
        console.warn('[TMDB] Lampa Proxy failed:', e.message)
    }
    return null
}

/**
 * Strategy 2b (NEW): Self-Hosted Unified Proxy (Lampa Pattern v4.0)
 * Uses /api/proxy endpoint on our own server (which uses DoH)
 */
async function tryServerProxy(endpoint) {
    try {
        const separator = getSeparator(endpoint)
        const targetUrl = `https://api.themoviedb.org/3${endpoint}${separator}api_key=${TMDB_API_KEY}&language=ru-RU`
        // Use absolute URL for the proxy
        const apiBase = getApiBase()
        const proxyUrl = `${apiBase}/api/proxy?url=${encodeURIComponent(targetUrl)}`
        console.log('[TMDB] Trying Server Proxy:', proxyUrl)

        const res = await fetch(proxyUrl, { signal: timeoutSignal(8000) })
        if (res.ok) {
            const data = await res.json()
            console.log('[TMDB] ✅ Server Proxy success')
            return { ...data, source: 'tmdb', method: 'server_proxy' }
        }
    } catch (e) {
        console.warn('[TMDB] Server Proxy failed:', e.message)
    }
    return null
}

/**
 * Strategy 3: CapacitorHttp with Client-Side DoH
 * Only works on native Android platform
 */
async function tryCapacitorWithDoH(endpoint) {
    if (!Capacitor.isNativePlatform()) return null

    try {
        const hostname = 'api.themoviedb.org'
        const ip = await resolveClientIP(hostname)
        const separator = getSeparator(endpoint)

        let targetUrl
        let headers = {}

        if (ip) {
            // DoH resolved — use IP directly with Host header
            targetUrl = `https://${ip}/3${endpoint}${separator}api_key=${TMDB_API_KEY}&language=ru-RU`
            headers = { 'Host': hostname }
            console.log('[TMDB] Trying CapacitorHttp + DoH...')
        } else {
            // Fallback to direct (might work with VPN)
            targetUrl = `https://${hostname}/3${endpoint}${separator}api_key=${TMDB_API_KEY}&language=ru-RU`
            console.log('[TMDB] Trying CapacitorHttp direct...')
        }

        const response = await CapacitorHttp.get({
            url: targetUrl,
            headers,
            connectTimeout: 5000,
            readTimeout: 5000
        })

        if (response.data) {
            console.log('[TMDB] ✅ CapacitorHttp success')
            return { ...response.data, source: 'tmdb', method: ip ? 'capacitor_doh' : 'capacitor_direct' }
        }
    } catch (e) {
        console.warn('[TMDB] CapacitorHttp failed:', e.message)
    }
    return null
}

/**
 * Strategy 4: corsproxy.io (browser fallback)
 */
async function tryCorsProxy(endpoint) {
    try {
        const separator = getSeparator(endpoint)
        const targetUrl = `https://api.themoviedb.org/3${endpoint}${separator}api_key=${TMDB_API_KEY}&language=ru-RU`
        const url = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
        console.log('[TMDB] Trying corsproxy.io...')

        const res = await fetch(url, { signal: timeoutSignal(6000) })
        if (res.ok) {
            const data = await res.json()
            console.log('[TMDB] ✅ corsproxy.io success')
            return { ...data, source: 'tmdb', method: 'corsproxy' }
        }
    } catch (e) {
        console.warn('[TMDB] corsproxy.io failed:', e.message)
    }
    return null
}

/**
 * Strategy 5: Kinopoisk API (alternative data source)
 */
async function tryKinopoisk(query) {
    if (!KP_API_KEY || !query) return null

    try {
        const url = `${KP_PROXY}/https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(query)}`
        console.log('[TMDB] Trying Kinopoisk fallback...')

        const res = await fetch(url, {
            headers: { 'X-API-KEY': KP_API_KEY },
            signal: timeoutSignal(6000)
        })

        if (res.ok) {
            const data = await res.json()
            // Map KP response to TMDB-like format
            const results = (data.films || []).map(film => ({
                id: film.filmId,
                title: film.nameRu || film.nameEn,
                name: film.nameRu || film.nameEn,
                original_title: film.nameEn,
                poster_path: film.posterUrlPreview,
                backdrop_path: null,
                overview: film.description || '',
                vote_average: film.rating || film.ratingKinopoisk,
                release_date: film.year ? `${film.year}-01-01` : null,
                first_air_date: film.year ? `${film.year}-01-01` : null,
                media_type: film.type === 'TV_SERIES' ? 'tv' : 'movie',
                genre_ids: [], // KP doesn't provide genre IDs in search
                _kp_data: film // Keep original for metadata
            }))

            console.log('[TMDB] ✅ Kinopoisk success')
            return { results, source: 'kinopoisk', method: 'kinopoisk' }
        }
    } catch (e) {
        console.warn('[TMDB] Kinopoisk failed:', e.message)
    }
    return null
}

// ─── Main Client Function ──────────────────────────────────────

/**
 * Fetch from TMDB with automatic fallback cascade
 * 
 * @param {string} endpoint - TMDB API endpoint (e.g., '/search/multi?query=...')
 * @param {Object} options - Additional options
 * @param {boolean} options.useCache - Enable caching (default: true)
 * @param {number} options.cacheTTL - Cache TTL in ms (default: 5 min)
 * @param {string} options.searchQuery - Query for Kinopoisk fallback
 * @returns {Promise<{results: Array, source: string, method: string}>}
 */
export async function tmdbClient(endpoint, options = {}) {
    const {
        useCache = true,
        cacheTTL = CACHE_TTL,
        searchQuery = null
    } = options

    // Check cache first
    if (useCache) {
        const cached = getCached(endpoint)
        if (cached) {
            console.log('[TMDB] Cache hit for:', endpoint.slice(0, 50))
            return cached
        }
    }

    // Helper to check if response is valid (works for search, credits, videos)
    const isValidResponse = (r) => r && (
        r.results?.length || // search, trending, videos
        r.cast?.length ||    // credits (cast)
        r.crew?.length ||    // credits (crew)
        r.id                 // single item details
    )

    // Try all strategies in order
    let result = null

    result = await tryCustomWorker(endpoint)
    if (isValidResponse(result)) {
        if (useCache) setCache(endpoint, result, cacheTTL)
        return result
    }

    result = await tryLampaProxy(endpoint)
    if (isValidResponse(result)) {
        if (useCache) setCache(endpoint, result, cacheTTL)
        return result
    }

    result = await tryServerProxy(endpoint)
    if (isValidResponse(result)) {
        if (useCache) setCache(endpoint, result, cacheTTL)
        return result
    }

    result = await tryCapacitorWithDoH(endpoint)
    if (isValidResponse(result)) {
        if (useCache) setCache(endpoint, result, cacheTTL)
        return result
    }

    result = await tryCorsProxy(endpoint)
    if (isValidResponse(result)) {
        if (useCache) setCache(endpoint, result, cacheTTL)
        return result
    }

    // Kinopoisk fallback (only for search queries)
    if (searchQuery) {
        result = await tryKinopoisk(searchQuery)
        if (isValidResponse(result)) {
            if (useCache) setCache(endpoint, result, cacheTTL)
            return result
        }
    }

    console.warn('[TMDB] All strategies failed for:', endpoint)
    return { results: [], source: 'none', method: 'failed' }
}

// ─── Convenience Methods ───────────────────────────────────────

/**
 * Search for movies/TV shows
 */
export async function searchMulti(query) {
    const endpoint = `/search/multi?query=${encodeURIComponent(query)}`
    return tmdbClient(endpoint, { searchQuery: query })
}

/**
 * Get trending content
 */
export async function getTrending(timeWindow = 'week', page = 1) {
    const endpoint = `/trending/all/${timeWindow}?page=${page}`
    return tmdbClient(endpoint, { cacheTTL: DISCOVERY_CACHE_TTL })
}

/**
 * Get popular movies
 */
export async function getPopularMovies(page = 1) {
    const endpoint = `/movie/popular?page=${page}`
    return tmdbClient(endpoint, { cacheTTL: DISCOVERY_CACHE_TTL })
}

/**
 * Get popular TV shows
 */
export async function getPopularTV(page = 1) {
    const endpoint = `/tv/popular?page=${page}`
    return tmdbClient(endpoint, { cacheTTL: DISCOVERY_CACHE_TTL })
}

/**
 * Get top rated movies
 */
export async function getTopRated(page = 1) {
    const endpoint = `/movie/top_rated?page=${page}`
    return tmdbClient(endpoint, { cacheTTL: DISCOVERY_CACHE_TTL })
}

/**
 * Get movie/TV credits (cast and crew)
 * @param {number} id - TMDB ID
 * @param {string} type - 'movie' or 'tv'
 * @returns {Promise<{cast: Array, crew: Array}>}
 */
export async function getCredits(id, type = 'movie') {
    const endpoint = `/${type}/${id}/credits?`
    try {
        const result = await tmdbClient(endpoint, { cacheTTL: DISCOVERY_CACHE_TTL })
        console.log('[tmdbClient] getCredits result:', result)
        // Credits API returns cast/crew directly, not in results wrapper
        return {
            cast: result.cast || result.results?.cast || [],
            crew: result.crew || result.results?.crew || [],
            source: result.source,
            method: result.method
        }
    } catch (err) {
        console.error('[tmdbClient] getCredits error:', err)
        return { cast: [], crew: [] }
    }
}

/**
 * Get movie/TV videos (trailers, teasers)
 * @param {number} id - TMDB ID
 * @param {string} type - 'movie' or 'tv'
 * @returns {Promise<{results: Array}>}
 */
export async function getVideos(id, type = 'movie') {
    const endpoint = `/${type}/${id}/videos?`
    return tmdbClient(endpoint, { cacheTTL: DISCOVERY_CACHE_TTL })
}

/**
 * Get movie/TV recommendations
 * @param {number} id - TMDB ID
 * @param {string} type - 'movie' or 'tv'
 * @returns {Promise<{results: Array}>}
 */
export async function getRecommendations(id, type = 'movie') {
    const endpoint = `/${type}/${id}/recommendations?`
    return tmdbClient(endpoint, { cacheTTL: DISCOVERY_CACHE_TTL })
}

/**
 * Get full details (including seasons for TV)
 * @param {number} id - TMDB ID
 * @param {string} type - 'movie' or 'tv'
 */
export async function getDetails(id, type = 'movie') {
    const endpoint = `/${type}/${id}?append_to_response=external_ids`
    return tmdbClient(endpoint, { cacheTTL: DISCOVERY_CACHE_TTL })
}

/**
 * Get season details (episodes)
 * @param {number} tvId - TV Show ID
 * @param {number} seasonNumber - Season Number
 */
export async function getSeasonDetails(tvId, seasonNumber) {
    const endpoint = `/tv/${tvId}/season/${seasonNumber}?`
    return tmdbClient(endpoint, { cacheTTL: DISCOVERY_CACHE_TTL })
}

/**
 * Получить детали персоны (био, дата рождения и т.д.)
 */
export async function getPersonDetails(personId) {
    return tmdbClient(`/person/${personId}`, { cacheTTL: DISCOVERY_CACHE_TTL })
}

/**
 * Получить фильмографию персоны (фильмы + сериалы)
 * Сортировка по популярности по умолчанию
 */
export async function getPersonCredits(personId) {
    const data = await tmdbClient(`/person/${personId}/combined_credits`, { cacheTTL: DISCOVERY_CACHE_TTL })

    // Сортировка по популярности (desc) и фильтрация пустых постеров
    if (data.cast) {
        data.cast = data.cast
            .filter(item => item.poster_path) // Убираем без постеров
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    }

    return data
}

/**
 * Получить контент по жанру
 */
export async function getDiscoverByGenre(genreId, type = 'movie', page = 1) {
    const endpoint = `/discover/${type}?with_genres=${genreId}&page=${page}&sort_by=popularity.desc`
    return tmdbClient(endpoint, { cacheTTL: DISCOVERY_CACHE_TTL })
}

/**
 * Filter results: remove people, items without posters
 */
export function filterDiscoveryResults(results) {
    return results.filter(item =>
        item.media_type !== 'person' &&
        (item.poster_path || item._kp_data?.posterUrlPreview)
    )
}

export default tmdbClient
