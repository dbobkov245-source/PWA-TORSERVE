/**
 * Utility helpers for PWA-TorServe
 */

/**
 * Clean torrent/file name for display and poster search
 * Removes technical tags, year suffixes, and garbage characters
 */
export const cleanTitle = (rawName) => {
    if (!rawName) return ''

    // 1. Initial cleanup: dots, underscores, brackets
    let name = rawName
        .replace(/\./g, ' ')
        .replace(/_/g, ' ')
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .trim()

    // 2. Cut off at Year (e.g. "Movie Title 2023 ...")
    const yearMatch = name.match(/\b(19\d{2}|20\d{2})\b/)
    if (yearMatch) {
        const index = name.indexOf(yearMatch[0])
        name = name.substring(0, index)
    }

    // 3. Remove technical/garbage tags
    const tags = [
        '1080p', '720p', '2160p', '4k', 'WEB-DL', 'WEBRip', 'BluRay', 'HDR',
        'H.264', 'x264', 'HEVC', 'AAC', 'AC3', 'DTS', 'HDTV',
        'rus', 'eng', 'torrent', 'stream', 'dub', 'sub'
    ]

    // Find the earliest occurrence of a tag and cut
    let cutoff = name.length
    const lowerName = name.toLowerCase()
    tags.forEach(tag => {
        const idx = lowerName.indexOf(tag.toLowerCase())
        if (idx !== -1 && idx < cutoff) {
            cutoff = idx
        }
    })

    return name.substring(0, cutoff)
        .replace(/[^\w\s\u0400-\u04FF]/g, '') // remove weird symbols
        .replace(/\s+/g, ' ')
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
