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
    filterDiscoveryResults
} from './tmdbClient.js'

// ─── Discovery Categories ──────────────────────────────────────

export const DISCOVERY_CATEGORIES = [
    { id: 'trending', name: 'Тренды', icon: '🔥', fetcher: getTrending },
    { id: 'movies', name: 'Популярные фильмы', icon: '🎬', fetcher: getPopularMovies },
    { id: 'tv', name: 'Сериалы', icon: '📺', fetcher: getPopularTV },
    { id: 'top', name: 'Топ рейтинга', icon: '⭐', fetcher: getTopRated }
]

/**
 * Fetch all discovery categories in parallel
 * @returns {Promise<Object>} { trending: [...], movies: [...], tv: [...], top: [...] }
 */
export async function fetchAllDiscovery() {
    const results = {}

    const promises = DISCOVERY_CATEGORIES.map(async (category) => {
        try {
            const response = await category.fetcher()
            results[category.id] = {
                ...category,
                items: filterDiscoveryResults(response.results || []),
                source: response.source,
                method: response.method
            }
        } catch (e) {
            console.error(`[Discovery] Failed to fetch ${category.id}:`, e)
            results[category.id] = {
                ...category,
                items: [],
                error: e.message
            }
        }
    })

    await Promise.allSettled(promises)
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

    // TMDB poster
    if (item.poster_path) {
        return `https://wsrv.nl/?url=ssl:image.tmdb.org/t/p/${size}${item.poster_path}&output=webp`
    }

    return null
}

/**
 * Get backdrop URL for a discovery item
 */
export function getBackdropUrl(item, size = 'w1280') {
    if (!item) return null

    if (item.backdrop_path) {
        return `https://wsrv.nl/?url=ssl:image.tmdb.org/t/p/${size}${item.backdrop_path}&output=webp`
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

    // For movies, include year
    return year ? `${title} ${year}` : title
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
