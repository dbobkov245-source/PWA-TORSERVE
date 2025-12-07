/**
 * Jacred Torrent Search API
 * Использует публичные Jacred сервисы (как в Lampa)
 */

import https from 'https'
import http from 'http'

// List of Jacred mirrors (try in order)
const JACRED_MIRRORS = [
    'jacred.xyz',
    'jacred.pro',
    'jac.red'
]

let currentMirror = JACRED_MIRRORS[0]

/**
 * Search torrents via Jacred API
 */
export const searchJacred = async (query) => {
    const results = []

    for (const mirror of JACRED_MIRRORS) {
        try {
            const data = await doSearch(mirror, query)
            if (data && data.length > 0) {
                currentMirror = mirror
                console.log(`[Jacred] Using mirror: ${mirror}`)
                return { results: data }
            }
        } catch (err) {
            console.warn(`[Jacred] Mirror ${mirror} failed:`, err.message)
        }
    }

    return { error: 'All mirrors failed', results: [] }
}

/**
 * Do search request to specific mirror
 */
const doSearch = (mirror, query) => {
    return new Promise((resolve, reject) => {
        // Jacred uses Jackett-compatible API
        const searchPath = `/api/v2.0/indexers/all/results?apikey=&Query=${encodeURIComponent(query)}`

        const options = {
            hostname: mirror,
            port: 443,
            path: searchPath,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            },
            timeout: 10000
        }

        const req = https.request(options, (res) => {
            let data = ''
            res.setEncoding('utf8')

            res.on('data', chunk => data += chunk)
            res.on('end', () => {
                try {
                    const json = JSON.parse(data)
                    // Jackett returns { Results: [...] }
                    const results = (json.Results || json.results || []).slice(0, 20).map(r => ({
                        id: r.Guid || r.guid || Math.random().toString(36),
                        title: r.Title || r.title || 'Unknown',
                        size: formatSize(r.Size || r.size || 0),
                        seeders: r.Seeders || r.seeders || 0,
                        tracker: r.Tracker || r.tracker || 'Unknown',
                        magnet: r.MagnetUri || r.magnetUri || r.Link || r.link || null,
                        magnetUrl: r.MagnetUri || r.magnetUri || r.Link || r.link || null
                    }))
                    resolve(results)
                } catch (err) {
                    reject(new Error('Parse error: ' + err.message))
                }
            })
        })

        req.on('error', reject)
        req.on('timeout', () => {
            req.destroy()
            reject(new Error('Timeout'))
        })

        req.end()
    })
}

/**
 * Format bytes to human readable
 */
const formatSize = (bytes) => {
    if (!bytes) return 'N/A'
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
 * Get magnet from result (already included in search results)
 */
export const getMagnetFromJacred = async (magnetUrl) => {
    // Magnet is already in the search result, just return it
    if (magnetUrl && magnetUrl.startsWith('magnet:')) {
        return { magnet: magnetUrl }
    }
    return { error: 'No magnet link' }
}
