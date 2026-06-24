import { getYear } from './discover.js'
import { isLikelyAccessibleCandidate } from './trackerAccess.js'

function getMediaType(item) {
    return item?.media_type === 'tv' || item?.name || item?.original_name ? 'tv' : 'movie'
}

function getLocalTitle(item) {
    return item?.title || item?.name || ''
}

function getOriginalTitle(item) {
    return item?.original_title || item?.original_name || ''
}

function uniqueQueries(values) {
    const seen = new Set()

    return values.filter((value) => {
        const normalized = value?.trim()
        if (!normalized || seen.has(normalized)) return false
        seen.add(normalized)
        return true
    })
}

function getTopQualityTag(tags = []) {
    const priority = ['2160p', '1080p', '720p', 'hdr', 'dv', 'hevc', 'cam']

    for (const tag of priority) {
        if (tags.includes(tag)) return tag
    }

    return tags[0] || null
}

export function getMovieTorrentKey(item) {
    return `${getMediaType(item)}:${item?.id ?? 'unknown'}`
}

export function buildMovieTorrentQueries(item) {
    const localTitle = getLocalTitle(item)
    const originalTitle = getOriginalTitle(item)
    const year = getYear(item)

    if (getMediaType(item) === 'tv') {
        return uniqueQueries([
            originalTitle,
            localTitle,
            originalTitle ? `${originalTitle} season 1` : '',
            localTitle ? `${localTitle} season 1` : '',
            originalTitle ? `${originalTitle} s01` : '',
            localTitle ? `${localTitle} s01` : ''
        ])
    }

    // Bare title FIRST: providers (jacred) return 0 for year-suffixed queries,
    // so leading with "Title Year" wastes 1-2 sequential round-trips before any
    // result. Bare title yields the full swarm immediately → early-stop on query 1.
    // Year-suffixed kept as a disambiguation fallback for common titles.
    return uniqueQueries([
        originalTitle,
        localTitle,
        year && originalTitle ? `${originalTitle} ${year}` : '',
        year && localTitle ? `${localTitle} ${year}` : ''
    ])
}

// Enough results to render the modal. Stops the sequential query sweep early.
const RAW_PRELOAD_STOP_COUNT = 12

export function shouldStopMovieTorrentPreload(items = []) {
    // Prefer ≥2 verified-accessible candidates. But under RU ISP blocking the
    // preflight marks most torrents dead/risky, so accessibleCount rarely hits 2
    // and the loop would run every query. Fall back to raw count so a healthy
    // first query (e.g. 75 results) early-stops instead of sweeping all queries.
    if (items.length >= RAW_PRELOAD_STOP_COUNT) return true
    const accessibleCount = items.filter(isLikelyAccessibleCandidate).length
    return accessibleCount >= 2
}

export function getMovieTorrentSummary(items = []) {
    if (!items.length) {
        return {
            count: 0,
            bestSeeders: 0,
            bestQuality: null,
            label: 'Ничего не найдено'
        }
    }

    const accessibleItems = items.filter(isLikelyAccessibleCandidate)
    const rankingPool = accessibleItems.length > 0 ? accessibleItems : items
    const bestItem = [...rankingPool].sort((a, b) => (b?.seeders || 0) - (a?.seeders || 0))[0]
    const bestSeeders = bestItem?.seeders || 0
    const bestQuality = getTopQualityTag(bestItem?.tags || [])
    const label = bestQuality
        ? `Найдено ${items.length} · лучший ${bestQuality} · ${bestSeeders} сидов`
        : `Найдено ${items.length} · ${bestSeeders} сидов`

    return {
        count: items.length,
        bestSeeders,
        bestQuality,
        label
    }
}
