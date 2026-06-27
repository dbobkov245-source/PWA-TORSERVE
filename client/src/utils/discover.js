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
const fetchTVGenre = (id, page = 1) => tmdbClient(`/discover/tv?with_genres=${id}&sort_by=popularity.desc&language=ru-RU&page=${page}`, { cacheTTL: 60 * 60 * 1000 })
const fetchByLanguage = (lang, page = 1) => tmdbClient(`/discover/movie?with_original_language=${lang}&sort_by=popularity.desc&vote_count.gte=50&language=ru-RU&page=${page}`, { cacheTTL: 60 * 60 * 1000 })
const fetchByYearRange = (gte, lte, page = 1) => tmdbClient(`/discover/movie?primary_release_date.gte=${gte}-01-01&primary_release_date.lte=${lte}-12-31&sort_by=popularity.desc&vote_count.gte=100&language=ru-RU&page=${page}`, { cacheTTL: 60 * 60 * 1000 })

// `tier` controls home-load timing (HomePanel): 1 = immediate, 2 = short delay,
// 3 = lazy (fetch only when the row scrolls into view). Keeps NAS/cascade calm.
export const DISCOVERY_CATEGORIES = [
    // ── Tier 1: load immediately (above the fold) ──
    { id: 'now_playing', name: 'Сейчас смотрят', icon: '🎬', tier: 1, fetcher: fetchNowPlaying },
    { id: 'trending_day', name: 'Тренды дня', icon: '📈', tier: 1, fetcher: fetchTrendingDay },
    { id: 'genre_28', name: 'Боевики', icon: '👊', tier: 1, fetcher: (page) => fetchGenre(28, page) },
    { id: 'trending', name: 'Тренды недели', icon: '🔥', tier: 1, fetcher: (page) => getTrending('week', page) },
    { id: 'genre_35', name: 'Комедии', icon: '😂', tier: 1, fetcher: (page) => fetchGenre(35, page) },
    { id: 'movies', name: 'Популярные фильмы', icon: '⭐', tier: 1, fetcher: getPopularMovies },
    // ── Tier 2: load after a short delay ──
    { id: 'genre_878', name: 'Фантастика', icon: '👽', tier: 2, fetcher: (page) => fetchGenre(878, page) },
    { id: 'genre_27', name: 'Ужасы', icon: '👻', tier: 2, fetcher: (page) => fetchGenre(27, page) },
    { id: 'genre_18', name: 'Драмы', icon: '🎭', tier: 2, fetcher: (page) => fetchGenre(18, page) },
    { id: 'genre_53', name: 'Триллеры', icon: '🔪', tier: 2, fetcher: (page) => fetchGenre(53, page) },
    { id: 'tv', name: 'Популярные сериалы', icon: '📺', tier: 2, fetcher: getPopularTV },
    { id: 'genre_16', name: 'Мультфильмы', icon: '🎨', tier: 2, fetcher: (page) => fetchGenre(16, page) },
    { id: 'upcoming', name: 'Скоро в кино', icon: '📅', tier: 2, fetcher: fetchUpcoming },
    { id: 'top', name: 'Топ фильмов', icon: '🏆', tier: 2, fetcher: getTopRated },
    // ── Tier 3: lazy — fetch when scrolled into view ──
    { id: 'genre_10749', name: 'Мелодрамы', icon: '💕', tier: 3, fetcher: (page) => fetchGenre(10749, page) },
    { id: 'genre_80', name: 'Криминал', icon: '🚔', tier: 3, fetcher: (page) => fetchGenre(80, page) },
    { id: 'genre_9648', name: 'Детективы', icon: '🕵️', tier: 3, fetcher: (page) => fetchGenre(9648, page) },
    { id: 'genre_12', name: 'Приключения', icon: '🗺️', tier: 3, fetcher: (page) => fetchGenre(12, page) },
    { id: 'genre_14', name: 'Фэнтези', icon: '🧙', tier: 3, fetcher: (page) => fetchGenre(14, page) },
    { id: 'genre_10751', name: 'Семейные', icon: '👨‍👩‍👧', tier: 3, fetcher: (page) => fetchGenre(10751, page) },
    { id: 'genre_99', name: 'Документальные', icon: '🎥', tier: 3, fetcher: (page) => fetchGenre(99, page) },
    { id: 'genre_36', name: 'Исторические', icon: '🏛️', tier: 3, fetcher: (page) => fetchGenre(36, page) },
    { id: 'genre_10752', name: 'Военные', icon: '🎖️', tier: 3, fetcher: (page) => fetchGenre(10752, page) },
    { id: 'genre_37', name: 'Вестерны', icon: '🤠', tier: 3, fetcher: (page) => fetchGenre(37, page) },
    { id: 'genre_10402', name: 'Музыкальные', icon: '🎵', tier: 3, fetcher: (page) => fetchGenre(10402, page) },
    { id: 'lang_ru', name: 'Русское кино', icon: '🇷🇺', tier: 3, fetcher: (page) => fetchByLanguage('ru', page) },
    { id: 'lang_ko', name: 'Корейское кино', icon: '🇰🇷', tier: 3, fetcher: (page) => fetchByLanguage('ko', page) },
    { id: 'anime_tv', name: 'Аниме', icon: '🍥', tier: 3, fetcher: (page) => fetchTVGenre(16, page) },
    { id: 'decade_2020', name: 'Кино 2020-х', icon: '🆕', tier: 3, fetcher: (page) => fetchByYearRange(2020, 2029, page) },
    { id: 'decade_2010', name: 'Кино 2010-х', icon: '📀', tier: 3, fetcher: (page) => fetchByYearRange(2010, 2019, page) },
    { id: 'decade_2000', name: 'Кино 2000-х', icon: '💿', tier: 3, fetcher: (page) => fetchByYearRange(2000, 2009, page) },
    { id: 'decade_1990', name: 'Кино 90-х', icon: '📼', tier: 3, fetcher: (page) => fetchByYearRange(1990, 1999, page) },
    { id: 'top_tv', name: 'Топ сериалов', icon: '🏆', tier: 3, fetcher: fetchTopTV }
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
