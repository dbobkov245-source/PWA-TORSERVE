/**
 * RuTrackerProvider - RuTracker torrent search provider
 * PWA-TorServe Provider Architecture v2.7.1
 * 
 * Implements RuTracker search with:
 * - Mirror rotation (rutracker.org, .nl, .net, .cc)
 * - DNS-over-HTTPS bypass for ISP blocking
 * - Cookie-based authentication
 * - HTML parsing via regex (no external deps)
 * - Retry with exponential backoff
 * 
 * Requires RUTRACKER_LOGIN and RUTRACKER_PASSWORD in .env
 */

import https from 'https'
import fs from 'fs'
import path from 'path'
import { BaseProvider } from './BaseProvider.js'
import { logger } from '../utils/logger.js'

const log = logger.child('RuTrackerProvider')

// RuTracker mirrors (in order of preference)
const RUTRACKER_MIRRORS = [
    'rutracker.org',   // Primary
    'rutracker.nl',    // Netherlands mirror  
    'rutracker.net',   // Alternative
]

// ─────────────────────────────────────────────────────────────
// 🌐 DNS-over-HTTPS: Bypass ISP DNS blocking
// ─────────────────────────────────────────────────────────────
const DOH_PROVIDER = process.env.DOH_PROVIDER || 'https://cloudflare-dns.com/dns-query'
const DNS_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

const dnsCache = new Map()

async function resolveIP(hostname) {
    if (dnsCache.has(hostname)) {
        const cached = dnsCache.get(hostname)
        if (Date.now() < cached.expires) {
            log.debug('DoH cache hit', { hostname, ip: cached.ip })
            return cached.ip
        }
        dnsCache.delete(hostname)
    }

    log.info('DoH resolving...', { hostname })
    try {
        const url = `${DOH_PROVIDER}?name=${encodeURIComponent(hostname)}&type=A`
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/dns-json' },
            signal: AbortSignal.timeout(5000)
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()

        if (data.Answer && data.Answer.length > 0) {
            const record = data.Answer.find(r => r.type === 1)
            if (record) {
                const ip = record.data
                log.info('DoH resolved', { hostname, ip })
                dnsCache.set(hostname, { ip, expires: Date.now() + DNS_CACHE_TTL })
                return ip
            }
        }
        log.warn('DoH no A record', { hostname })
    } catch (e) {
        log.warn('DoH failed', { hostname, error: e.message })
    }
    return null
}

// Session persistence file
const SESSION_FILE = path.join(process.cwd(), 'data', 'rutracker-session.json')

export class RuTrackerProvider extends BaseProvider {
    name = 'rutracker'

    constructor() {
        super()
        this.sessionCookie = null
        this.currentMirror = RUTRACKER_MIRRORS[0]
        this.login = process.env.RUTRACKER_LOGIN || ''
        this.password = process.env.RUTRACKER_PASSWORD || ''

        if (!this.login || !this.password) {
            this.enabled = false
            log.warn('RuTracker disabled: RUTRACKER_LOGIN/PASSWORD not set')
        } else {
            // Try to load persisted session
            this._loadSession()
        }
    }

    isHealthy() {
        return this.enabled && Boolean(this.login && this.password)
    }

    /**
     * Load session from file
     * @private
     */
    _loadSession() {
        try {
            if (fs.existsSync(SESSION_FILE)) {
                const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'))
                if (data.cookie && data.expires > Date.now()) {
                    this.sessionCookie = data.cookie
                    this.currentMirror = data.mirror || RUTRACKER_MIRRORS[0]
                    log.info('Session loaded from file', { expires: new Date(data.expires).toISOString() })
                } else {
                    log.debug('Session expired, will re-login')
                }
            }
        } catch (e) {
            log.debug('No saved session', { error: e.message })
        }
    }

    /**
     * Save session to file
     * @private
     */
    _saveSession() {
        try {
            const dir = path.dirname(SESSION_FILE)
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true })
            }
            const data = {
                cookie: this.sessionCookie,
                mirror: this.currentMirror,
                expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
            }
            fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2))
            log.debug('Session saved to file')
        } catch (e) {
            log.warn('Failed to save session', { error: e.message })
        }
    }

    /**
     * Search torrents on RuTracker with mirror fallback
     */
    async search(query) {
        if (!this.isHealthy()) {
            log.debug('Skipping search: not healthy')
            return []
        }

        // Try each mirror
        for (const mirror of RUTRACKER_MIRRORS) {
            log.info('Trying mirror', { mirror })
            try {
                // Login if needed
                if (!this.sessionCookie) {
                    log.debug('Logging in...', { mirror })
                    await this._loginToMirror(mirror)
                }

                log.debug('Searching...', { mirror, query })
                const results = await this._searchOnMirror(mirror, query)
                if (results.length > 0) {
                    this.currentMirror = mirror
                    log.info('Search successful', { mirror, count: results.length })
                    return results
                }
                log.warn('Empty results', { mirror })
            } catch (err) {
                log.warn(`Mirror ${mirror} failed`, { error: err.message })
                this.sessionCookie = null // Reset session for next mirror
            }
        }

        log.error('All mirrors failed')
        return []
    }

    /**
     * Get magnet link from topic page
     */
    async getMagnet(topicId) {
        if (!this.sessionCookie) {
            try {
                await this._loginToMirror(this.currentMirror)
            } catch {
                return { error: 'Login failed' }
            }
        }

        try {
            const options = await this._makeOptions(
                this.currentMirror,
                `/forum/viewtopic.php?t=${topicId}`,
                'GET'
            )
            options.headers['Cookie'] = this.sessionCookie

            return new Promise((resolve) => {
                const req = https.request(options, (res) => {
                    let data = ''
                    res.setEncoding('utf8')
                    res.on('data', chunk => data += chunk)
                    res.on('end', () => {
                        const match = data.match(/magnet:\?xt=urn:btih:[^"'\s]+/)
                        resolve(match ? { magnet: match[0] } : { error: 'Magnet not found' })
                    })
                })
                req.on('error', () => resolve({ error: 'Request failed' }))
                req.end()
            })
        } catch {
            return { error: 'Request failed' }
        }
    }

    /**
     * Create HTTPS options with DoH bypass
     * @private
     */
    async _makeOptions(mirror, path, method = 'GET') {
        const ip = await resolveIP(mirror)

        return {
            hostname: ip || mirror,
            port: 443,
            path: path,
            method: method,
            servername: mirror,
            rejectUnauthorized: true,
            headers: {
                'Host': mirror,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        }
    }

    /**
     * Login to specific mirror
     * @private
     */
    async _loginToMirror(mirror) {
        const postData = `login_username=${encodeURIComponent(this.login)}&login_password=${encodeURIComponent(this.password)}&login=%C2%F5%EE%E4`

        const options = await this._makeOptions(mirror, '/forum/login.php', 'POST')
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded'
        options.headers['Content-Length'] = Buffer.byteLength(postData)

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                const cookies = res.headers['set-cookie']
                if (cookies) {
                    this.sessionCookie = cookies.map(c => c.split(';')[0]).join('; ')
                    this._saveSession() // Persist session
                    log.info('Login successful', { mirror })
                    resolve(this.sessionCookie)
                } else {
                    reject(new Error('No cookies received'))
                }
            })
            req.on('error', reject)
            req.write(postData)
            req.end()
        })
    }

    /**
     * Search on specific mirror
     * @private
     */
    async _searchOnMirror(mirror, query) {
        const options = await this._makeOptions(
            mirror,
            `/forum/tracker.php?nm=${encodeURIComponent(query)}`,
            'GET'
        )
        options.headers['Cookie'] = this.sessionCookie

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = ''
                res.setEncoding('utf8')
                res.on('data', chunk => data += chunk)
                res.on('end', () => {
                    try {
                        resolve(this._parseResults(data))
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
     * Parse search results HTML
     * @private
     */
    _parseResults(html) {
        const results = []

        const titleRegex = /<a[^>]*class="tLink"[^>]*href="[^"]*t=(\d+)"[^>]*>([^<]+)<\/a>/g
        const sizeRegex = /<td[^>]*class="tor-size"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/g
        const seedRegex = /<b class="seedmed">(\d+)<\/b>/g

        const sizes = [], seeds = []
        let match

        while ((match = sizeRegex.exec(html))) sizes.push(match[1].trim())
        while ((match = seedRegex.exec(html))) seeds.push(parseInt(match[1]))

        let i = 0
        while ((match = titleRegex.exec(html)) && i < 20) {
            const topicId = match[1]
            const title = match[2]
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .trim()

            const sizeStr = sizes[i] || 'N/A'
            let sizeBytes = 0
            const sizeMatch = sizeStr.match(/([\d.]+)\s*(GB|MB|KB|TB)/i)
            if (sizeMatch) {
                const num = parseFloat(sizeMatch[1])
                const unit = sizeMatch[2].toUpperCase()
                const mult = { 'KB': 1024, 'MB': 1024 ** 2, 'GB': 1024 ** 3, 'TB': 1024 ** 4 }
                sizeBytes = num * (mult[unit] || 1)
            }

            results.push(this.normalizeResult({
                id: topicId,
                title,
                size: sizeStr,
                sizeBytes,
                seeders: seeds[i] || 0,
                tracker: 'RuTracker',
                magnet: null
            }))
            i++
        }

        return results
    }
}
