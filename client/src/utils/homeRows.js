import {
    fetchTraktDiscovery,
    getDetails,
    getRecommendations,
    getTrending
} from './tmdbClient.js'
import { DISCOVERY_CATEGORIES } from './discover.js'

/**
 * Remove items already shown in a higher-priority row.
 * Row order and the winning item's position remain stable.
 */
export function softDedupeRows(rows) {
    const seen = new Set()

    return rows.map(row => ({
        ...row,
        items: (row.items || []).filter(item => {
            if (!item?.id || seen.has(item.id)) return false
            seen.add(item.id)
            return true
        })
    }))
}

/**
 * Build a compact, unique swipe deck from already loaded home rows.
 */
export function buildSwipeCandidates(rows, watchedIds = new Set()) {
    const seen = new Set()

    return rows
        .flatMap(row => row.items || [])
        .filter(item => {
            if (!item?.id || watchedIds.has(item.id) || seen.has(item.id)) return false
            seen.add(item.id)
            return true
        })
        .slice(0, 30)
}

/**
 * Exclude watched and already-present titles from personalized results.
 */
export function filterPersonalItems(
    items,
    watchedIds = new Set(),
    excludedIds = new Set()
) {
    return (items || [])
        .filter(item => item?.id && !watchedIds.has(item.id) && !excludedIds.has(item.id))
        .slice(0, 20)
}

/**
 * Enrich a ranked slice with a two-worker pool while retaining source order
 * and the original rank even if detail responses complete out of order.
 */
export async function enrichRankedItems(
    items,
    from = 0,
    count = 3,
    getDetailsImpl = getDetails
) {
    const output = [...items]
    const indexes = output.map((_, index) => index).slice(from, from + count)
    let cursor = 0

    await Promise.all(Array.from({ length: Math.min(2, indexes.length) }, async () => {
        while (cursor < indexes.length) {
            const index = indexes[cursor++]
            const item = output[index]
            const detail = await getDetailsImpl(item.id, item.media_type || 'movie')
            output[index] = { ...item, ...detail, rank: item.rank }
        }
    }))

    return output
}

/**
 * Compose native hybrid rows with the legacy TMDB discovery catalog.
 */
export function createHybridRows({ getHistory }) {
    return [
        {
            id: 'now_watching',
            title: 'Сейчас смотрят',
            icon: '▶',
            layout: 'editorial',
            source: 'tmdb',
            tier: 1,
            order: 20,
            cacheTTL: 10 * 60 * 1000,
            fetcher: () => getTrending('day')
        },
        {
            id: 'trakt_trending',
            title: 'Сегодня в тренде',
            icon: '🔥',
            layout: 'ranked',
            source: 'trakt',
            tier: 1,
            order: 30,
            cacheTTL: 15 * 60 * 1000,
            fetcher: async () => {
                const trakt = await fetchTraktDiscovery('trending', 'movies')
                if (!trakt.results?.length) {
                    return { ...(await getTrending('day')), source: 'tmdb' }
                }

                return {
                    ...trakt,
                    results: await enrichRankedItems(trakt.results, 0, 3)
                }
            }
        },
        {
            id: 'for_you',
            title: 'Для вас',
            icon: '✨',
            layout: 'personal',
            source: 'personal',
            tier: 2,
            order: 40,
            cacheTTL: 6 * 60 * 60 * 1000,
            fetcher: async () => {
                const seed = (await getHistory()).find(item => item.tmdbId)
                if (!seed) return { results: [], source: 'personal' }
                return getRecommendations(
                    seed.tmdbId,
                    seed.mediaType || 'movie',
                    6 * 60 * 60 * 1000
                )
            }
        },
        ...DISCOVERY_CATEGORIES.map((row, index) => ({
            ...row,
            title: row.name,
            layout: 'poster',
            source: 'tmdb',
            order: 100 + index * 10
        }))
    ]
}
