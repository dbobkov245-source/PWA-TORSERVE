import { getYear } from './discover.js'

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

    return uniqueQueries([
        year && originalTitle ? `${originalTitle} ${year}` : '',
        year && localTitle ? `${localTitle} ${year}` : '',
        originalTitle,
        localTitle
    ])
}

export function shouldStopMovieTorrentPreload(items = []) {
    const seededCount = items.filter((item) => (item?.seeders || 0) > 0).length
    return items.length >= 5 || seededCount >= 2
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

    const bestItem = [...items].sort((a, b) => (b?.seeders || 0) - (a?.seeders || 0))[0]
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
