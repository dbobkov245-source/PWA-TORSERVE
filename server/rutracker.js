/**
 * RuTracker Search API
 * Парсинг поиска RuTracker через HTTP
 * 🆕 v2.3.3: Added retry logic with exponential backoff
 */

import https from 'https'
import http from 'http'
import { withRetry, retryPredicates } from './utils/retry.js'

// RuTracker credentials from .env
const RUTRACKER_LOGIN = process.env.RUTRACKER_LOGIN || ''
const RUTRACKER_PASSWORD = process.env.RUTRACKER_PASSWORD || ''

let sessionCookie = null

/**
 * Login to RuTracker and get session cookie
 */
const login = async () => {
    if (!RUTRACKER_LOGIN || !RUTRACKER_PASSWORD) {
        throw new Error('RUTRACKER_LOGIN and RUTRACKER_PASSWORD must be set in .env')
    }

    return new Promise((resolve, reject) => {
        const postData = `login_username=${encodeURIComponent(RUTRACKER_LOGIN)}&login_password=${encodeURIComponent(RUTRACKER_PASSWORD)}&login=%C2%F5%EE%E4`

        const options = {
            hostname: 'rutracker.cc',
            port: 443,
            path: '/forum/login.php',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }

        const req = https.request(options, (res) => {
            const cookies = res.headers['set-cookie']
            if (cookies) {
                sessionCookie = cookies.map(c => c.split(';')[0]).join('; ')
                console.log('[RuTracker] Login successful')
                resolve(sessionCookie)
            } else {
                reject(new Error('Login failed - no cookies received'))
            }
        })

        req.on('error', reject)
        req.write(postData)
        req.end()
    })
}

/**
 * Raw search request (used by retry wrapper)
 */
const doSearchRequest = (query) => {
    return new Promise((resolve, reject) => {
        const searchUrl = `/forum/tracker.php?nm=${encodeURIComponent(query)}`

        const options = {
            hostname: 'rutracker.cc',
            port: 443,
            path: searchUrl,
            method: 'GET',
            headers: {
                'Cookie': sessionCookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }

        const req = https.request(options, (res) => {
            let data = ''
            res.setEncoding('utf8')

            res.on('data', chunk => data += chunk)
            res.on('end', () => {
                try {
                    const results = parseSearchResults(data)
                    resolve(results)
                } catch (err) {
                    reject(new Error(`Parse failed: ${err.message}`))
                }
            })
        })

        req.on('error', reject)
        req.end()
    })
}

/**
 * Search RuTracker with retry logic
 */
export const searchRuTracker = async (query) => {
    // Ensure we're logged in
    if (!sessionCookie) {
        try {
            await withRetry(() => login(), {
                maxRetries: 2,
                baseDelayMs: 1000,
                onRetry: (err, attempt, delay) => {
                    console.log(`[RuTracker] Login retry #${attempt} after ${Math.round(delay)}ms: ${err.message}`)
                }
            })
        } catch (err) {
            console.error('[RuTracker] Login failed after retries:', err.message)
            return { error: 'Login failed', results: [] }
        }
    }

    try {
        const results = await withRetry(() => doSearchRequest(query), {
            maxRetries: 3,
            baseDelayMs: 1000,
            shouldRetry: (err) => {
                // Retry on network errors or if session expired
                if (retryPredicates.networkError(err)) return true
                if (err.message.includes('Parse failed')) return false // Don't retry parse errors
                return true
            },
            onRetry: (err, attempt, delay) => {
                console.log(`[RuTracker] Search retry #${attempt} after ${Math.round(delay)}ms: ${err.message}`)
                // Reset session on auth errors
                if (err.message.includes('Login') || err.message.includes('cookie')) {
                    sessionCookie = null
                }
            }
        })
        return { results }
    } catch (err) {
        console.error('[RuTracker] Search failed after retries:', err.message)
        return { error: err.message, results: [] }
    }
}

/**
 * Parse search results HTML
 */
const parseSearchResults = (html) => {
    const results = []

    // Simple regex-based parsing (works without cheerio)
    // Match torrent rows: <a class="tLink" href="/forum/viewtopic.php?t=ID">TITLE</a>
    const titleRegex = /<a[^>]*class="tLink"[^>]*href="[^"]*t=(\d+)"[^>]*>([^<]+)<\/a>/g
    // Match size: <td class="tor-size"...>SIZE</td>
    const sizeRegex = /<td[^>]*class="tor-size"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/g
    // Match seeders: <b class="seedmed">NUM</b>
    const seedRegex = /<b class="seedmed">(\d+)<\/b>/g

    let titleMatch, i = 0
    const sizes = []
    const seeds = []

    // Collect all sizes
    let sizeMatch
    while ((sizeMatch = sizeRegex.exec(html)) !== null) {
        sizes.push(sizeMatch[1].trim())
    }

    // Collect all seeders
    let seedMatch
    while ((seedMatch = seedRegex.exec(html)) !== null) {
        seeds.push(parseInt(seedMatch[1]))
    }

    // Match titles with topic IDs
    while ((titleMatch = titleRegex.exec(html)) !== null && i < 20) {
        const topicId = titleMatch[1]
        const title = titleMatch[2]
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim()

        results.push({
            id: topicId,
            title: title,
            size: sizes[i] || 'N/A',
            seeders: seeds[i] || 0,
            magnetUrl: `https://rutracker.cc/forum/viewtopic.php?t=${topicId}`
        })
        i++
    }

    return results
}

/**
 * Get magnet link from topic page
 */
export const getMagnetLink = async (topicId) => {
    if (!sessionCookie) {
        try {
            await login()
        } catch (err) {
            return { error: 'Login failed' }
        }
    }

    return new Promise((resolve) => {
        const options = {
            hostname: 'rutracker.cc',
            port: 443,
            path: `/forum/viewtopic.php?t=${topicId}`,
            method: 'GET',
            headers: {
                'Cookie': sessionCookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }

        const req = https.request(options, (res) => {
            let data = ''
            res.setEncoding('utf8')

            res.on('data', chunk => data += chunk)
            res.on('end', () => {
                // Extract magnet link: magnet:?xt=urn:btih:HASH...
                const magnetMatch = data.match(/magnet:\?xt=urn:btih:[^"'\s]+/)
                if (magnetMatch) {
                    resolve({ magnet: magnetMatch[0] })
                } else {
                    resolve({ error: 'Magnet not found' })
                }
            })
        })

        req.on('error', () => resolve({ error: 'Request failed' }))
        req.end()
    })
}
