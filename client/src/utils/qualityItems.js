/**
 * Which posters get quality badges, and how a poster is described to the
 * server. Badges are keyed by the film (TMDB type + id): two films with the
 * same title no longer share one badge.
 */

import { buildMovieTorrentContext } from './searchContext.js'

// The row in focus: one poster behind the focus and what the screen shows ahead.
const FOCUS_BEFORE = 1
const FOCUS_AFTER = 7
// Other rows: the posters visible without scrolling.
const VISIBLE_PER_ROW = 7

const getMediaType = (item) =>
    item?.media_type === 'tv' || item?.name || item?.original_name ? 'tv' : 'movie'

/** `${type}:${id}`, or null for a poster without a TMDB id. */
export function qualityItemKey(item) {
    if (item?.id === undefined || item?.id === null || item?.id === '') return null
    return `${getMediaType(item)}:${item.id}`
}

/** The film as /api/quality-badges takes it, or null when it cannot be described. */
export function buildQualityRequestItem(item) {
    const key = qualityItemKey(item)
    const context = key ? buildMovieTorrentContext(item) : null
    return context ? { key, ...context } : null
}

/** Badges for a poster; title keys come from answers before keys existed. */
export function getItemBadges(badges, item) {
    if (!badges || !item) return []
    const key = qualityItemKey(item)
    return (key && badges[key])
        || badges[item.title || item.name]
        || badges[item.original_title || item.original_name]
        || []
}

/**
 * Posters to fetch badges for, most visible first: the focused poster, the
 * visible part of its row, then the first posters of every row top to bottom.
 * @param {{rows: Array<{id: string, items: Object[]}>, focusedItem: Object|null,
 *   focusedRowId: string|null, focusedIndex: number, max: number}} options
 * @returns {Object[]} posters, each film once
 */
export function selectQualityItems({ rows = [], focusedItem = null, focusedRowId = null, focusedIndex = -1, max }) {
    const selected = []
    const seen = new Set()
    const push = (item) => {
        const key = qualityItemKey(item)
        if (!key || seen.has(key) || selected.length >= max) return
        seen.add(key)
        selected.push(item)
    }

    push(focusedItem)

    const focusedRow = rows.find(row => row?.id === focusedRowId)
    if (focusedRow && focusedIndex >= 0) {
        const items = focusedRow.items || []
        const from = Math.max(0, focusedIndex - FOCUS_BEFORE)
        items.slice(from, focusedIndex + FOCUS_AFTER + 1).forEach(push)
    }

    for (const row of rows) {
        (row?.items || []).slice(0, VISIBLE_PER_ROW).forEach(push)
        if (selected.length >= max) break
    }
    return selected
}
