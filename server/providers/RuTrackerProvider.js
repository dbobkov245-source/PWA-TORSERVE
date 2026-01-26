/**
 * RuTrackerProvider - RuTracker torrent search provider
 * PWA-TorServe Provider Architecture v2.7.2
 * 
 * Implements RuTracker search with:
 * - Mirror rotation (rutracker.org, .nl, .net, .cc)
 * - Smart Fetch (DoH + SNI Bypass) for ISP blocking resilience
 * - Cookie-based authentication
 * - HTML parsing via regex (no external deps)
 * 
 * Requires RUTRACKER_LOGIN and RUTRACKER_PASSWORD in .env
 */

import fs from 'fs'
import path from 'path'
import { BaseProvider } from './BaseProvider.js'
import { logger } from '../utils/logger.js'
import { smartFetch } from '../utils/doh.js'

const log = logger.child('RuTrackerProvider')

// RuTracker mirrors (in order of preference)
const RUTRACKER_MIRRORS = [
    'rutracker.org',   // Primary
    'rutracker.nl',    // Netherlands mirror  
    'rutracker.net',   // Alternative
]

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
            // FIX-02: Unblock - Warn only, do not disable
            log.warn('RuTracker: RUTRACKER_LOGIN/PASSWORD not set. Search may fail or return empty results.')
        } else {
            // Try to load persisted session
            this._loadSession()
        }
    }

    isHealthy() {
        // FIX-02: Unblock - Provider is healthy even if no credentials (will attempt guest search or fail gracefully)
        return this.enabled
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
            const url = `https://${this.currentMirror}/forum/viewtopic.php?t=${topicId}`
            const response = await smartFetch(url, {
                headers: { 'Cookie': this.sessionCookie },
                timeout: 30000
            })

            const match = response.data.match(/magnet:\?xt=urn:btih:[^"'\s]+/)
            return match ? { magnet: match[0] } : { error: 'Magnet not found' }
        } catch {
            return { error: 'Request failed' }
        }
    }

    /**
     * Login to specific mirror
     * @private
     */
    async _loginToMirror(mirror) {
        const postData = `login_username=${encodeURIComponent(this.login)}&login_password=${encodeURIComponent(this.password)}&login=%C2%F5%EE%E4`

        const url = `https://${mirror}/forum/login.php`

        const response = await smartFetch(url, {
            method: 'POST',
            body: postData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })

        const cookies = response.headers['set-cookie']
        if (cookies) {
            this.sessionCookie = cookies.map(c => c.split(';')[0]).join('; ')
            this._saveSession() // Persist session
            log.info('Login successful', { mirror })
            return this.sessionCookie
        } else {
            throw new Error('No cookies received')
        }
    }

    /**
     * Search on specific mirror
     * @private
     */
    async _searchOnMirror(mirror, query) {
        const url = `https://${mirror}/forum/tracker.php?nm=${encodeURIComponent(query)}`

        const response = await smartFetch(url, {
            headers: { 'Cookie': this.sessionCookie },
            timeout: 30000
        })

        return this._parseResults(response.data)
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
