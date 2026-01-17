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

// ─── Configuration ─────────────────────────────────────────────
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY
const KP_API_KEY = import.meta.env.VITE_KP_API_KEY
const CUSTOM_PROXY = import.meta.env.VITE_TMDB_PROXY_URL
const LAMPA_PROXY = 'https://apn-latest.onrender.com'
const KP_PROXY = 'https://cors.kp556.workers.dev:8443'

// Cache configuration
const CACHE_PREFIX = 'tmdb_cache_v1_'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes for search
const DISCOVERY_CACHE_TTL = 10 * 60 * 1000 // 10 minutes for discovery

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

// ─── Fetch Strategies ──────────────────────────────────────────

/**
 * Strategy 1: Custom Cloudflare Worker
 */
async function tryCustomWorker(endpoint) {
    if (!CUSTOM_PROXY) return null

    try {
        // Worker format: /search/multi?... (Worker adds /3 prefix)
        const url = `${CUSTOM_PROXY}${endpoint}&api_key=${TMDB_API_KEY}&language=ru-RU`
        console.log('[TMDB] Trying Custom Worker...')

        const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
        if (res.ok) {
            const data = await res.json()
            console.log('[TMDB] ✅ Custom Worker success')
            return { results: data.results || [], source: 'tmdb', method: 'custom_worker' }
        }
    } catch (e) {
        console.warn('[TMDB] Custom Worker failed:', e.message)
    }
    return null
}

/**
 * Strategy 2: Lampa Proxy (apn-latest.onrender.com)
 */
async function tryLampaProxy(endpoint) {
    try {
        const targetUrl = `https://api.themoviedb.org/3${endpoint}&api_key=${TMDB_API_KEY}&language=ru-RU`
        const url = `${LAMPA_PROXY}/${targetUrl}`
        console.log('[TMDB] Trying Lampa Proxy...')

        const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
        if (res.ok) {
            const data = await res.json()
            console.log('[TMDB] ✅ Lampa Proxy success')
            return { results: data.results || [], source: 'tmdb', method: 'lampa_proxy' }
        }
    } catch (e) {
        console.warn('[TMDB] Lampa Proxy failed:', e.message)
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

        let targetUrl
        let headers = {}

        if (ip) {
            // DoH resolved — use IP directly with Host header
            targetUrl = `https://${ip}/3${endpoint}&api_key=${TMDB_API_KEY}&language=ru-RU`
            headers = { 'Host': hostname }
            console.log('[TMDB] Trying CapacitorHttp + DoH...')
        } else {
            // Fallback to direct (might work with VPN)
            targetUrl = `https://${hostname}/3${endpoint}&api_key=${TMDB_API_KEY}&language=ru-RU`
            console.log('[TMDB] Trying CapacitorHttp direct...')
        }

        const response = await CapacitorHttp.get({
            url: targetUrl,
            headers,
            connectTimeout: 5000,
            readTimeout: 5000
        })

        if (response.data?.results) {
            console.log('[TMDB] ✅ CapacitorHttp success')
            return { results: response.data.results, source: 'tmdb', method: ip ? 'capacitor_doh' : 'capacitor_direct' }
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
        const targetUrl = `https://api.themoviedb.org/3${endpoint}&api_key=${TMDB_API_KEY}&language=ru-RU`
        const url = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
        console.log('[TMDB] Trying corsproxy.io...')

        const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
        if (res.ok) {
            const data = await res.json()
            console.log('[TMDB] ✅ corsproxy.io success')
            return { results: data.results || [], source: 'tmdb', method: 'corsproxy' }
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
            signal: AbortSignal.timeout(6000)
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

    // Try all strategies in order
    let result = null

    result = await tryCustomWorker(endpoint)
    if (result?.results?.length) {
        if (useCache) setCache(endpoint, result, cacheTTL)
        return result
    }

    result = await tryLampaProxy(endpoint)
    if (result?.results?.length) {
        if (useCache) setCache(endpoint, result, cacheTTL)
        return result
    }

    result = await tryCapacitorWithDoH(endpoint)
    if (result?.results?.length) {
        if (useCache) setCache(endpoint, result, cacheTTL)
        return result
    }

    result = await tryCorsProxy(endpoint)
    if (result?.results?.length) {
        if (useCache) setCache(endpoint, result, cacheTTL)
        return result
    }

    // Kinopoisk fallback (only for search queries)
    if (searchQuery) {
        result = await tryKinopoisk(searchQuery)
        if (result?.results?.length) {
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
export async function getTrending(timeWindow = 'week') {
    const endpoint = `/trending/all/${timeWindow}?`
    return tmdbClient(endpoint, { cacheTTL: DISCOVERY_CACHE_TTL })
}

/**
 * Get popular movies
 */
export async function getPopularMovies() {
    const endpoint = '/movie/popular?'
    return tmdbClient(endpoint, { cacheTTL: DISCOVERY_CACHE_TTL })
}

/**
 * Get popular TV shows
 */
export async function getPopularTV() {
    const endpoint = '/tv/popular?'
    return tmdbClient(endpoint, { cacheTTL: DISCOVERY_CACHE_TTL })
}

/**
 * Get top rated movies
 */
export async function getTopRated() {
    const endpoint = '/movie/top_rated?'
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
