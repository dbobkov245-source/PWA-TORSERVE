/**
 * TMDB Genre Map — Hardcoded dictionary
 * Avoids extra API calls to /genre/movie/list
 * 
 * Source: https://developers.themoviedb.org/3/genres/get-movie-list
 */

// Movie genres
export const MOVIE_GENRES = {
    28: 'Боевик',
    12: 'Приключения',
    16: 'Мультфильм',
    35: 'Комедия',
    80: 'Криминал',
    99: 'Документальный',
    18: 'Драма',
    10751: 'Семейный',
    14: 'Фэнтези',
    36: 'История',
    27: 'Ужасы',
    10402: 'Музыка',
    9648: 'Детектив',
    10749: 'Мелодрама',
    878: 'Фантастика',
    10770: 'Телефильм',
    53: 'Триллер',
    10752: 'Военный',
    37: 'Вестерн'
}

// TV genres (some overlap with movies)
export const TV_GENRES = {
    10759: 'Экшн и Приключения',
    16: 'Мультфильм',
    35: 'Комедия',
    80: 'Криминал',
    99: 'Документальный',
    18: 'Драма',
    10751: 'Семейный',
    10762: 'Детский',
    9648: 'Детектив',
    10763: 'Новости',
    10764: 'Реалити',
    10765: 'Фантастика и Фэнтези',
    10766: 'Мыльная опера',
    10767: 'Ток-шоу',
    10768: 'Война и Политика',
    37: 'Вестерн'
}

// Combined genres (prioritizes movie names for overlaps)
export const GENRES = { ...TV_GENRES, ...MOVIE_GENRES }

/**
 * Convert genre IDs array to names
 * @param {number[]} ids - Array of genre IDs
 * @returns {string[]} Array of genre names
 */
export const getGenreNames = (ids) => {
    if (!ids || !Array.isArray(ids)) return []
    return ids.map(id => GENRES[id]).filter(Boolean)
}

/**
 * Get first N genre names as a string
 * @param {number[]} ids - Array of genre IDs
 * @param {number} limit - Max genres to show (default: 2)
 * @returns {string} Comma-separated genre names
 */
export const formatGenres = (ids, limit = 2) => {
    return getGenreNames(ids).slice(0, limit).join(', ')
}

/**
 * Get genre names for a movie/tv item
 * Handles both genre_ids (list) and genres (detail)
 * @param {Object} item - Movie/TV item
 * @returns {string[]} Array of genre names
 */
/**
 * Get genre objects for a movie/tv item
 * @param {Object} item - Movie/TV item
 * @returns {Array<{id: number, name: string}>} Array of genre objects
 */
export const getGenreObjectsForItem = (item) => {
    if (!item) return []

    // If item has genre_ids (common in list responses)
    if (item.genre_ids && Array.isArray(item.genre_ids)) {
        return item.genre_ids
            .map(id => ({ id, name: GENRES[id] }))
            .filter(g => g.name)
    }

    // If item has genres array (common in detail responses)
    // TMDB returns objects { id, name }
    if (item.genres && Array.isArray(item.genres)) {
        return item.genres.map(g => ({
            id: g.id,
            name: g.name || GENRES[g.id]
        })).filter(g => g.name)
    }

    return []
}

export const getGenresForItem = (item) => {
    if (!item) return []

    const objects = getGenreObjectsForItem(item)
    return objects.map(g => g.name)
}

export default GENRES
