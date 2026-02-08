/**
 * Utility helpers for PWA-TorServe
 */

/**
 * Clean torrent/file name for display and poster search
 * Removes technical tags, year suffixes, season markers, and garbage characters
 */
export const cleanTitle = (rawName) => {
    if (!rawName) return ''

    // 1. Базовая чистка: точки, нижние подчеркивания, скобки
    let name = rawName
        .replace(/\./g, ' ')
        .replace(/_/g, ' ')
        .replace(/\[.*?\]/g, '') // Удаляем содержимое квадратных скобок
        .replace(/\(.*?\)/g, '') // Удаляем содержимое круглых скобок
        .trim()

    // 2. 🔥 ВАЖНО: Обрезаем по Сезону (S01, s01e01), если года нет
    // Это спасет "IT Welcome to Derry S01..." -> "IT Welcome to Derry"
    const seasonMatch = name.match(/\b(S\d{2}|s\d{2})\b/i)
    if (seasonMatch) {
        const index = name.indexOf(seasonMatch[0])
        name = name.substring(0, index)
    }

    // 3. Обрезаем по Году (как и было)
    const yearMatch = name.match(/\b(19\d{2}|20\d{2})\b/)
    if (yearMatch) {
        const index = name.indexOf(yearMatch[0])
        name = name.substring(0, index)
    }

    // 4. 🔥 Дополненный список мусорных тегов
    const tags = [
        // Качество и рипы
        '1080p', '720p', '2160p', '4k', 'WEB-DL', 'WEBRip', 'BluRay', 'HDR',
        'H.264', 'H264', 'x264', 'x265', 'HEVC', 'AAC', 'AC3', 'DTS', 'HDTV', 'DV', 'DoVi',
        'SDR', 'BDRemux', 'Remux', 'TYMBLER', 'AKTEP', 'SOFCJ',
        'CHDRip', 'HDRip', 'DVDRip', 'BDRip', 'CAMRip', 'TS', 'TC',
        'DD5', 'DD51', 'DD', 'Atmos',
        // Версии и расширения
        'v2', 'v3', 'v4', 'mkv', 'avi', 'mp4',
        // Языки и прочее
        'rus', 'eng', 'torrent', 'stream', 'dub', 'sub', 'extended',
        // Стриминги
        'HMAX', 'ATVP', 'AMZN', 'NF', 'DSNP', 'HULU', 'OKKO', 'OM'
    ]

    // Удаляем теги (на случай если они стоят ДО сезона/года)
    tags.forEach(tag => {
        // Удаляем тег как отдельное слово
        const regex = new RegExp(`\\b${tag}\\b`, 'gi')
        name = name.replace(regex, '')
    })

    return name
        .replace(/[^\w\s\u0400-\u04FF:\-]/g, '') // Оставляем буквы, цифры, двоеточие и дефис
        .replace(/\s+/g, ' ') // Убираем двойные пробелы
        .trim()
}

/**
 * Format bytes to human readable size
 */
export const formatSize = (bytes) => {
    if (!bytes) return ''
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let i = 0
    let size = bytes
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024
        i++
    }
    return `${size.toFixed(1)} ${units[i]}`
}

/**
 * Format download speed (bytes/sec to human readable)
 */
export const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec || bytesPerSec < 1024) return ''
    const kbps = bytesPerSec / 1024
    if (kbps < 1024) return `${kbps.toFixed(0)} KB/s`
    return `${(kbps / 1024).toFixed(1)} MB/s`
}

/**
 * Format ETA (seconds to human readable)
 */
export const formatEta = (seconds) => {
    if (!seconds || seconds <= 0) return ''
    if (seconds < 60) return `${seconds}с`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}м`
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}ч ${mins}м`
}

/**
 * Generate gradient based on string hash (for fallback poster background)
 */
export const getGradient = (str) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
    const h1 = Math.abs(hash % 360)
    const h2 = Math.abs((hash * 13) % 360)
    return `linear-gradient(135deg, hsl(${h1}, 70%, 20%), hsl(${h2}, 80%, 15%))`
}

/**
 * Smart File Organizer for Torrents
 * Separates Episodes from Extras/Samples and sorts Episodes by SxxExx
 */
export const organizeFiles = (files) => {
    if (!files || files.length === 0) return { episodes: [], extras: [] }

    const episodes = []
    const extras = []

    // Regex for SxxExx pattern (e.g. S01E01, s1e1, 1x01)
    const seasonEpisodeRegex = /(?:s|season|^)?\s*(\d{1,2})\s*(?:e|x|episode|^)\s*(\d{1,2})/i
    // Regex for simple Episode pattern (e.g. Episode 1, Ep 1) if no season detected
    const episodeRegex = /(?:e|ep|episode)\s*(\d{1,3})/i

    // Keywords identifying junk/extras
    const extraKeywords = ['sample', 'trailer', 'promo', 'featurette', 'extra', 'bonus', 'interview', 'behind the scenes']

    files.forEach(file => {
        const nameLower = file.name.toLowerCase()

        // 1. Detect Extras
        if (extraKeywords.some(kw => nameLower.includes(kw))) {
            extras.push(file)
            return
        }

        // 2. Detect Season/Episode
        const seMatch = file.name.match(seasonEpisodeRegex)

        if (seMatch) {
            // Found SxxExx
            const season = parseInt(seMatch[1], 10)
            const episode = parseInt(seMatch[2], 10)
            episodes.push({
                ...file,
                season,
                episode,
                sortKey: season * 1000 + episode // Simple sort key (S01E01 = 1001)
            })
        } else {
            // Try just Episode number
            const epMatch = file.name.match(episodeRegex)
            if (epMatch) {
                const episode = parseInt(epMatch[1], 10)
                episodes.push({
                    ...file,
                    season: 1, // Assume S1 if unknown
                    episode,
                    sortKey: 1000 + episode
                })
            } else {
                // No numbering found - classify as Extra if it's not clearly the main movie
                // If the torrent has many files and this one has no number, it's likely extra
                // BUT if it's a single file torrent, it's the movie. 
                // Since this function is usually for lists, we treat unnumbered as extras 
                // unless it looks very much like a video file and we have no other episodes.
                extras.push(file)
            }
        }
    })

    // If we have NO episodes detected but have "extras", it might be that the regex failed 
    // or it's just a list of movies (e.g. invalid series pack). 
    // In that case, move everything to "episodes" and sort alphabetically.
    if (episodes.length === 0 && extras.length > 0) {
        return {
            episodes: extras.sort((a, b) => a.name.localeCompare(b.name)),
            extras: []
        }
    }

    // Sort Episodes by Season/Episode
    episodes.sort((a, b) => {
        if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey
        return a.name.localeCompare(b.name)
    })

    // Sort Extras alphabetically
    extras.sort((a, b) => a.name.localeCompare(b.name))

    return { episodes, extras }
}

/**
 * Extract quality badges from torrent/file name
 * Returns array of badge objects with label and color
 * ADR-001 Item 7: Quality Badges на постерах
 */
export const extractQualityBadges = (name) => {
    if (!name) return []
    const nameLower = name.toLowerCase()
    const badges = []

    // Resolution badges (priority order)
    if (/\b(2160p|4k|uhd)\b/i.test(name)) {
        badges.push({ label: '4K', color: 'bg-amber-500' })
    } else if (/\b1080p\b/i.test(name)) {
        badges.push({ label: '1080p', color: 'bg-blue-500' })
    } else if (/\b720p\b/i.test(name)) {
        badges.push({ label: '720p', color: 'bg-gray-500' })
    }

    // HDR badges
    if (/\b(dolby\.?vision|dv|dovi)\b/i.test(name)) {
        badges.push({ label: 'DV', color: 'bg-purple-600' })
    } else if (/\bhdr10\+?\b/i.test(name)) {
        badges.push({ label: 'HDR10', color: 'bg-orange-500' })
    } else if (/\bhdr\b/i.test(name) && !/\bhdr10\b/i.test(name)) {
        badges.push({ label: 'HDR', color: 'bg-orange-500' })
    }

    // Source badges
    if (/\b(remux|bdremux)\b/i.test(name)) {
        badges.push({ label: 'REMUX', color: 'bg-teal-600' })
    } else if (/\bbluray\b/i.test(name)) {
        badges.push({ label: 'BD', color: 'bg-indigo-500' })
    } else if (/\bweb-?dl\b/i.test(name)) {
        badges.push({ label: 'WEB', color: 'bg-sky-600' })
    }

    // Audio badges
    if (/\batmos\b/i.test(name)) {
        badges.push({ label: 'ATMOS', color: 'bg-pink-600' })
    }

    // Limit to 3 badges max
    return badges.slice(0, 3)
}
