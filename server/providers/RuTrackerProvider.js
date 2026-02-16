/**
 * RuTrackerProvider - RuTracker torrent search provider
 * PWA-TorServe Provider Architecture v2.8.1
 * 
 * v2.8.1 FIXES:
 * - FIX-RT-1: Use doh: 'dns-only' — bypass DNS block without breaking TLS
 * - FIX-RT-2: Verify login success by checking response body (not just cookies)
 * - FIX-RT-3: Check HTTP status codes in search response
 * - FIX-RT-4: Log response body snippet on failures for debugging
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

// FIX-RT-1: smartFetch options for tracker connections
const TRACKER_FETCH_OPTS = {
    doh: 'dns-only',  // Bypass DNS blocking, but DON'T substitute IP in TLS
    timeout: 30000,
}

export class RuTrackerProvider extends BaseProvider {
    name = 'rutracker'

    /** @type {'disabled'|'not_configured'|null} */
    disableReason = null

    constructor() {
        super()
        this.sessionCookie = null
        this.currentMirror = RUTRACKER_MIRRORS[0]
        this.login = process.env.RUTRACKER_LOGIN || ''
        this.password = process.env.RUTRACKER_PASSWORD || ''

        if (!this.login || !this.password) {
            // STAB-B2: Skip provider entirely when credentials are missing
            this.enabled = false
            this.disableReason = 'not_configured'
            log.info('RuTracker disabled: RUTRACKER_LOGIN/PASSWORD not set')
        } else {
            this._loadSession()
        }
    }

    isHealthy() {
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

        let hadSuccessfulResponse = false
        let lastError = null

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
                hadSuccessfulResponse = true

                if (results.length > 0) {
                    this.currentMirror = mirror
                    log.info('Search successful', { mirror, count: results.length })
                    return results
                }
                log.warn('Empty results', { mirror })
            } catch (err) {
                lastError = err
                log.warn(`Mirror ${mirror} failed`, { error: err.message })
                this.sessionCookie = null // Reset session for next mirror
            }
        }

        if (!hadSuccessfulResponse && lastError) {
            log.error('All mirrors failed', { error: lastError.message })
            throw new Error(`RuTracker unavailable: ${lastError.message}`)
        }

        log.warn('All mirrors returned empty results', { query })
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
                ...TRACKER_FETCH_OPTS,
                headers: { 'Cookie': this.sessionCookie },
            })

            const match = response.data.match(/magnet:\?xt=urn:btih:[^"'\s]+/)
            return match ? { magnet: match[0] } : { error: 'Magnet not found' }
        } catch {
            return { error: 'Request failed' }
        }
    }

    /**
     * Login to specific mirror
     * FIX-RT-1: doh: 'dns-only'
     * FIX-RT-2: Verify login by checking body, not just cookies
     * @private
     */
    async _loginToMirror(mirror) {
        const postData = `login_username=${encodeURIComponent(this.login)}&login_password=${encodeURIComponent(this.password)}&login=%C2%F5%EE%E4`

        const url = `https://${mirror}/forum/login.php`

        const response = await smartFetch(url, {
            ...TRACKER_FETCH_OPTS,
            method: 'POST',
            body: postData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })

        // FIX-RT-3: Check HTTP status
        if (response.status >= 400) {
            log.error('Login HTTP error', { mirror, status: response.status })
            throw new Error(`Login failed: HTTP ${response.status}`)
        }

        const cookies = response.headers['set-cookie']
        if (!cookies || cookies.length === 0) {
            throw new Error('No cookies received')
        }

        this.sessionCookie = cookies.map(c => c.split(';')[0]).join('; ')

        // FIX-RT-2: Verify login actually succeeded
        // RuTracker returns cookies even on failed login, so check the body
        const body = typeof response.data === 'string' ? response.data : ''

        // Check for known error patterns in response
        if (body.includes('login-form-full') || body.includes('Введённый пароль неверен')) {
            log.error('Login failed: credentials rejected', { mirror })
            this.sessionCookie = null
            throw new Error('Invalid credentials (password rejected)')
        }

        // FIX-RT-4: Log snippet for debugging if body looks like login page
        if (body.includes('<form') && body.includes('login_username') && body.length < 10000) {
            log.warn('Login response looks like login form — session may not be valid', {
                mirror,
                bodySnippet: body.substring(0, 200)
            })
        }

        this._saveSession()
        log.info('Login successful', { mirror, cookieCount: cookies.length })
        return this.sessionCookie
    }

    /**
     * Search on specific mirror
     * FIX-RT-1: doh: 'dns-only'
     * FIX-RT-3: Check HTTP status
     * @private
     */
    async _searchOnMirror(mirror, query) {
        const url = `https://${mirror}/forum/tracker.php?nm=${encodeURIComponent(query)}`

        const response = await smartFetch(url, {
            ...TRACKER_FETCH_OPTS,
            headers: { 'Cookie': this.sessionCookie },
        })

        // FIX-RT-3: Check HTTP status
        if (response.status >= 400) {
            log.error('Search HTTP error', { mirror, status: response.status })
            throw new Error(`Search failed: HTTP ${response.status}`)
        }

        // FIX-RT-4: Check if we got redirected to login page
        const body = typeof response.data === 'string' ? response.data : ''
        if (body.includes('login-form-full') || body.includes('login_username')) {
            log.warn('Search returned login page — session expired', { mirror })
            this.sessionCookie = null
            throw new Error('Session expired (redirected to login)')
        }

        return this._parseResults(body)
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
