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
