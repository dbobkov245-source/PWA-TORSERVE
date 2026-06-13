/**
 * discover.js — Client-side Discovery API
 * Uses tmdbClient for fetching with automatic fallback
 * 
 * Categories:
 * - 🔥 Trending (week)
 * - 🎬 Popular Movies
 * - 📺 Popular TV Shows
 * - ⭐ Top Rated
 */

import {
    getTrending,
    getPopularMovies,
    getPopularTV,
    getTopRated,
    filterDiscoveryResults,
    getImageUrl,
    tmdbClient,
    reportBrokenImage
} from './tmdbClient.js'

export { getImageUrl }

// ─── Discovery Categories (Lampa-style) ────────────────────────

// Fetch helpers for new endpoints
const fetchNowPlaying = (page = 1) => tmdbClient(`/movie/now_playing?page=${page}`, { cacheTTL: 10 * 60 * 1000 })
const fetchTrendingDay = (page = 1) => tmdbClient(`/trending/movie/day?page=${page}`, { cacheTTL: 10 * 60 * 1000 })
const fetchUpcoming = (page = 1) => tmdbClient(`/movie/upcoming?page=${page}`, { cacheTTL: 10 * 60 * 1000 })
const fetchTopTV = (page = 1) => tmdbClient(`/tv/top_rated?page=${page}`, { cacheTTL: 10 * 60 * 1000 })
const fetchGenre = (id, page = 1) => tmdbClient(`/discover/movie?with_genres=${id}&sort_by=popularity.desc&language=ru-RU&page=${page}`, { cacheTTL: 60 * 60 * 1000 })

export const DISCOVERY_CATEGORIES = [
    { id: 'now_playing', name: 'Сейчас смотрят', icon: '🎬', fetcher: fetchNowPlaying },
    { id: 'trending_day', name: 'Тренды дня', icon: '📈', fetcher: fetchTrendingDay },
    { id: 'genre_28', name: 'Боевики', icon: '👊', fetcher: (page) => fetchGenre(28, page) },
    { id: 'trending', name: 'Тренды недели', icon: '🔥', fetcher: (page) => getTrending('week', page) },
    { id: 'genre_35', name: 'Комедии', icon: '😂', fetcher: (page) => fetchGenre(35, page) },
    { id: 'upcoming', name: 'Скоро в кино', icon: '📅', fetcher: fetchUpcoming },
    { id: 'movies', name: 'Популярные фильмы', icon: '⭐', fetcher: getPopularMovies },
    { id: 'genre_878', name: 'Фантастика', icon: '👽', fetcher: (page) => fetchGenre(878, page) },
    { id: 'tv', name: 'Популярные сериалы', icon: '📺', fetcher: getPopularTV },
    { id: 'genre_16', name: 'Мультфильмы', icon: '🎨', fetcher: (page) => fetchGenre(16, page) },
    { id: 'top', name: 'Топ фильмов', icon: '🏆', fetcher: getTopRated },
    { id: 'top_tv', name: 'Топ сериалов', icon: '🏆', fetcher: fetchTopTV }
]

/**
 * Fetch a single category with limited pagination (top-up to ~20 items).
 * Pages are sequential round-trips through the cascade, so the cap is kept
 * low — this sits on the home first-paint path.
 * @param {Object} category - Entry from DISCOVERY_CATEGORIES
 * @param {number} maxPages - Max sequential pages (default 2)
 * @returns {Promise<Object>} { ...category, items, source, method }
 */
export async function fetchCategoryWithPages(category, maxPages = 2) {
    let page = 1
    const response = await category.fetcher(page)
    let items = filterDiscoveryResults(response.results || [])
    const source = response.source
    const method = response.method

    while (items.length < 20 && page < maxPages) {
        try {
            page++
            const responseNext = await category.fetcher(page)
            const itemsNext = filterDiscoveryResults(responseNext.results || [])

            // Merge avoiding duplicates
            const existingIds = new Set(items.map(i => i.id))
            const uniqueNewItems = itemsNext.filter(i => !existingIds.has(i.id))

            if (uniqueNewItems.length === 0) break

            items = [...items, ...uniqueNewItems]
        } catch (e2) {
            console.warn(`[Discovery] Page ${page} fetch failed for ${category.id}`, e2)
            break
        }
    }

    return {
        ...category,
        items: items.slice(0, 20),
        fetcher: category.fetcher,
        source,
        method
    }
}

/**
 * Fetch all discovery categories in parallel
 * Includes cross-category deduplication to prevent duplicate items
 * @returns {Promise<Object>} { trending: [...], movies: [...], tv: [...], top: [...] }
 */
export async function fetchAllDiscovery() {
    const results = {}
    const seenIds = new Set() // Track seen item IDs for deduplication

    // Fetch all categories in parallel
    const categoryResults = await Promise.all(
        DISCOVERY_CATEGORIES.map(async (category) => {
            try {
                const row = await fetchCategoryWithPages(category)
                return {
                    category,
                    items: row.items,
                    source: row.source,
                    method: row.method
                }
            } catch (e) {
                console.error(`[Discovery] Failed to fetch ${category.id}:`, e)
                return {
                    category,
                    items: [],
                    error: e.message
                }
            }
        })
    )

    // Process results in order, deduplicating across categories
    for (const { category, items, source, method, error } of categoryResults) {
        // Filter out items already seen in previous categories
        const uniqueItems = items.filter(item => {
            if (seenIds.has(item.id)) return false
            seenIds.add(item.id)
            return true
        })

        results[category.id] = {
            ...category,
            items: uniqueItems,
            fetcher: category.fetcher,  // Include fetcher for pagination in CategoryPage
            source,
            method,
            error
        }
    }

    return results
}

/**
 * Fetch a single category
 * @param {string} categoryId - One of: trending, movies, tv, top
 */
export async function fetchCategory(categoryId) {
    const category = DISCOVERY_CATEGORIES.find(c => c.id === categoryId)
    if (!category) {
        console.warn(`[Discovery] Unknown category: ${categoryId}`)
        return { items: [], error: 'Unknown category' }
    }

    try {
        const response = await category.fetcher()
        return {
            ...category,
            items: filterDiscoveryResults(response.results || []),
            source: response.source,
            method: response.method
        }
    } catch (e) {
        console.error(`[Discovery] Failed to fetch ${categoryId}:`, e)
        return { ...category, items: [], error: e.message }
    }
}

/**
 * Get poster URL for a discovery item
 * Handles both TMDB and Kinopoisk sources
 */
export function getPosterUrl(item, size = 'w342') {
    if (!item) return null

    // Kinopoisk items have posterUrlPreview in _kp_data
    if (item._kp_data?.posterUrlPreview) {
        return `https://wsrv.nl/?url=${encodeURIComponent(item._kp_data.posterUrlPreview)}&output=webp`
    }

    // TMDB poster via CDN mirror
    if (item.poster_path) {
        // Use ssl: prefix for TMDB images to avoid mixed content in APK
        const path = `ssl:image.tmdb.org/t/p/${size}${item.poster_path}`
        return getImageUrl(item.poster_path, size)
    }

    return null
}

/**
 * Get backdrop URL for a discovery item
 */
export function getBackdropUrl(item, size = 'w1280') {
    if (!item) return null

    if (item.backdrop_path) {
        const path = `ssl:image.tmdb.org/t/p/${size}${item.backdrop_path}`
        return getImageUrl(item.backdrop_path, size)
    }

    return null
}

/**
 * Get display title for a discovery item
 */
export function getTitle(item) {
    return item?.title || item?.name || item?.original_title || 'Без названия'
}

/**
 * Get year from release date
 */
export function getYear(item) {
    const date = item?.release_date || item?.first_air_date
    return date ? date.substring(0, 4) : null
}

/**
 * Generate search query for torrent lookup
 * Movies: "Title Year"
 * TV Shows: "Title S01" (to find season packs)
 */
export function getSearchQuery(item) {
    const title = getTitle(item)
    const year = getYear(item)
    const mediaType = item?.media_type

    if (mediaType === 'tv') {
        // For TV shows, search for season packs
        return `${title} S01`
    }

    // For movies, use only title (year often breaks search)
    return title
}

export default {
    DISCOVERY_CATEGORIES,
    fetchAllDiscovery,
    fetchCategory,
    getPosterUrl,
    getBackdropUrl,
    getTitle,
    getYear,
    getSearchQuery
}
