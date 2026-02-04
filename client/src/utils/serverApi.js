/**
 * serverApi.js — Client for our own backend (/api/favorites, /api/history, /api/ai-picks)
 *
 * Uses the same serverUrl from localStorage as the rest of the app.
 */

function getServerBase() {
    if (typeof window === 'undefined') return ''
    const stored = localStorage.getItem('serverUrl')
    if (stored && stored.includes('://')) return stored.replace(/\/$/, '')
    if (window.location.protocol.startsWith('http')) return window.location.origin
    return ''
}

/**
 * Convert a server favorite/history entry to TMDB-compatible object
 * so CategoryPage, getPosterUrl, getTitle, etc. all work seamlessly.
 */
export function toTmdbItem(entry) {
    return {
        id: entry.tmdbId,
        poster_path: entry.posterPath,
        backdrop_path: entry.backdropPath,
        vote_average: entry.voteAverage || 0,
        title: entry.title,
        name: entry.title,
        media_type: entry.mediaType || 'movie',
        release_date: entry.year ? `${entry.year}-01-01` : undefined,
        first_air_date: entry.year ? `${entry.year}-01-01` : undefined,
        genre_ids: entry.genreIds || [],
        // Keep original fields for round-trip
        _serverEntry: entry
    }
}

/**
 * Convert a TMDB item to server-compatible favorite/history entry
 */
export function toServerEntry(item) {
    const mediaType = item.media_type === 'tv' || item.name ? 'tv' : 'movie'
    const year = (item.release_date || item.first_air_date || '').slice(0, 4)
    return {
        tmdbId: item.id,
        mediaType,
        title: item.title || item.name || '',
        posterPath: item.poster_path || null,
        backdropPath: item.backdrop_path || null,
        voteAverage: item.vote_average || 0,
        year: year || null,
        genreIds: item.genre_ids || []
    }
}

// ────────────────────────────────────────────────────────
// ❤️ Favorites
// ────────────────────────────────────────────────────────

export async function getFavorites() {
    const res = await fetch(`${getServerBase()}/api/favorites`)
    if (!res.ok) throw new Error('Failed to fetch favorites')
    return res.json()
}

export async function addFavorite(item) {
    const entry = toServerEntry(item)
    const res = await fetch(`${getServerBase()}/api/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
    })
    if (!res.ok) throw new Error('Failed to add favorite')
    return res.json()
}

export async function removeFavorite(tmdbId) {
    const res = await fetch(`${getServerBase()}/api/favorites/${tmdbId}`, {
        method: 'DELETE'
    })
    if (!res.ok) throw new Error('Failed to remove favorite')
    return res.json()
}

// ────────────────────────────────────────────────────────
// 🕒 View History
// ────────────────────────────────────────────────────────

export async function getHistory() {
    const res = await fetch(`${getServerBase()}/api/history`)
    if (!res.ok) throw new Error('Failed to fetch history')
    return res.json()
}

export async function recordHistory(item) {
    const entry = toServerEntry(item)
    const res = await fetch(`${getServerBase()}/api/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
    })
    if (!res.ok) throw new Error('Failed to record history')
    return res.json()
}

export async function removeHistory(tmdbId) {
    const res = await fetch(`${getServerBase()}/api/history/${tmdbId}`, {
        method: 'DELETE'
    })
    if (!res.ok) throw new Error('Failed to remove history')
    return res.json()
}

export async function clearHistory() {
    const res = await fetch(`${getServerBase()}/api/history`, {
        method: 'DELETE'
    })
    if (!res.ok) throw new Error('Failed to clear history')
    return res.json()
}
