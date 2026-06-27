/**
 * Trakt.tv integration — OAuth device flow, scrobble, watched/watchlist sync.
 *
 * All token handling stays server-side (client_secret must never reach the
 * client bundle — SEC-01 / Zero-Cost backend). The client talks only to
 * /api/trakt/*; this router proxies Trakt and persists tokens in db.json.
 *
 * Requires env: TRAKT_CLIENT_ID, TRAKT_CLIENT_SECRET
 * (create an API app at https://trakt.tv/oauth/applications, redirect uri
 *  `urn:ietf:wg:oauth:2.0:oob`).
 */

import express from 'express'
import https from 'node:https'
import { db, safeWrite } from '../db.js'

const router = express.Router()

const TRAKT_BASE = 'https://api.trakt.tv'
const OOB_REDIRECT = 'urn:ietf:wg:oauth:2.0:oob'
const TOKEN_SKEW_MS = 60 * 1000        // refresh this long before actual expiry
const SYNC_TTL_MS = 5 * 60 * 1000      // cache /sync/watched for markers

function creds() {
    return {
        clientId: process.env.TRAKT_CLIENT_ID || '',
        clientSecret: process.env.TRAKT_CLIENT_SECRET || ''
    }
}

function isConfigured() {
    const { clientId, clientSecret } = creds()
    return Boolean(clientId && clientSecret)
}

function apiHeaders(token) {
    const { clientId } = creds()
    const headers = {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': clientId,
        // Trakt sits behind Cloudflare which 403s undici's default UA — send an
        // explicit one (curl/UA-bearing requests succeed, bare node fetch fails).
        'User-Agent': 'PWA-TorServe/1.0'
    }
    if (token) headers['Authorization'] = `Bearer ${token}`
    return headers
}

// Use node's https (OpenSSL TLS) rather than global fetch (undici): Trakt's
// Cloudflare blocks undici's TLS fingerprint (403 / connection reset) while
// curl and node:https pass. Returns a minimal fetch-like { ok, status, json }.
function traktFetch(path, { method = 'GET', body, token } = {}) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null
        const headers = apiHeaders(token)
        if (payload) headers['Content-Length'] = Buffer.byteLength(payload)
        const req = https.request(`${TRAKT_BASE}${path}`, { method, headers }, (res) => {
            let data = ''
            res.on('data', (c) => { data += c })
            res.on('end', () => resolve({
                ok: res.statusCode >= 200 && res.statusCode < 300,
                status: res.statusCode,
                json: async () => (data ? JSON.parse(data) : {})
            }))
        })
        req.on('error', reject)
        if (payload) req.write(payload)
        req.end()
    })
}

/** Persist token payload from an OAuth response into db.data.trakt. */
async function storeTokens(tokenJson) {
    const t = db.data.trakt
    t.accessToken = tokenJson.access_token
    t.refreshToken = tokenJson.refresh_token
    // created_at + expires_in are seconds
    const createdMs = (tokenJson.created_at ? tokenJson.created_at * 1000 : Date.now())
    t.expiresAt = createdMs + (tokenJson.expires_in || 0) * 1000
    t.connected = true
    t.pendingDeviceCode = null
    await safeWrite(db)
}

/** Return a valid access token, refreshing if near expiry. Throws if not connected. */
async function ensureToken() {
    const t = db.data.trakt
    if (!t.connected || !t.accessToken) throw new Error('not_connected')
    if (t.expiresAt && Date.now() < t.expiresAt - TOKEN_SKEW_MS) return t.accessToken

    // Refresh
    const { clientId, clientSecret } = creds()
    const res = await traktFetch('/oauth/token', {
        method: 'POST',
        body: {
            refresh_token: t.refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: OOB_REDIRECT,
            grant_type: 'refresh_token'
        }
    })
    if (!res.ok) {
        // Refresh failed → force re-login
        t.connected = false
        t.accessToken = null
        t.refreshToken = null
        await safeWrite(db)
        throw new Error('refresh_failed')
    }
    await storeTokens(await res.json())
    return db.data.trakt.accessToken
}

// ── Status ────────────────────────────────────────────────
router.get('/status', (req, res) => {
    const t = db.data.trakt
    res.json({
        configured: isConfigured(),
        connected: Boolean(t.connected && t.accessToken),
        slug: t.slug || null,
        watchedCount: (t.watchedTmdbIds || []).length
    })
})

// ── Start device-code flow ────────────────────────────────
router.post('/device', async (req, res) => {
    if (!isConfigured()) return res.status(400).json({ error: 'trakt_not_configured' })
    try {
        const { clientId } = creds()
        const r = await traktFetch('/oauth/device/code', { method: 'POST', body: { client_id: clientId } })
        if (!r.ok) return res.status(502).json({ error: 'device_code_failed', status: r.status })
        const data = await r.json()
        db.data.trakt.pendingDeviceCode = data.device_code
        await safeWrite(db)
        // Never leak device_code to the client.
        res.json({
            user_code: data.user_code,
            verification_url: data.verification_url,
            expires_in: data.expires_in,
            interval: data.interval
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// ── Poll for authorization ────────────────────────────────
router.post('/device/poll', async (req, res) => {
    if (!isConfigured()) return res.status(400).json({ error: 'trakt_not_configured' })
    const code = db.data.trakt.pendingDeviceCode
    if (!code) return res.json({ status: 'idle' })
    try {
        const { clientId, clientSecret } = creds()
        const r = await traktFetch('/oauth/device/token', {
            method: 'POST',
            body: { code, client_id: clientId, client_secret: clientSecret }
        })
        if (r.status === 200) {
            await storeTokens(await r.json())
            // Best-effort: fetch username + warm watched cache
            refreshSyncCache().catch(() => {})
            return res.json({ status: 'authorized' })
        }
        // 400 pending, 429 slow_down → keep polling; others terminal.
        if (r.status === 400 || r.status === 429) return res.json({ status: 'pending' })
        db.data.trakt.pendingDeviceCode = null
        await safeWrite(db)
        const map = { 404: 'not_found', 409: 'already_used', 410: 'expired', 418: 'denied' }
        res.json({ status: map[r.status] || 'error' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// ── Disconnect ────────────────────────────────────────────
router.post('/disconnect', async (req, res) => {
    db.data.trakt = {
        connected: false, accessToken: null, refreshToken: null, expiresAt: 0,
        pendingDeviceCode: null, slug: null, watchedTmdbIds: [], syncedAt: 0
    }
    await safeWrite(db)
    res.json({ status: 'disconnected' })
})

// ── Scrobble ──────────────────────────────────────────────
// body: { tmdbId, mediaType: 'movie'|'tv', progress: 0..100, action: 'start'|'pause'|'stop' }
router.post('/scrobble', async (req, res) => {
    const { tmdbId, mediaType = 'movie', progress = 0, action = 'stop' } = req.body || {}
    if (!tmdbId) return res.status(400).json({ error: 'tmdbId required' })
    if (!['start', 'pause', 'stop'].includes(action)) return res.status(400).json({ error: 'bad action' })
    try {
        const token = await ensureToken()
        const key = mediaType === 'tv' ? 'show' : 'movie'
        const body = { [key]: { ids: { tmdb: Number(tmdbId) } }, progress: Math.max(0, Math.min(100, progress)) }
        const r = await traktFetch(`/scrobble/${action}`, { method: 'POST', body, token })
        if (!r.ok && r.status !== 409) {
            return res.status(502).json({ error: 'scrobble_failed', status: r.status })
        }
        // A stop at >=80% marks watched on Trakt → refresh marker cache soon.
        if (action === 'stop') refreshSyncCache().catch(() => {})
        res.json({ status: 'ok' })
    } catch (err) {
        const code = err.message === 'not_connected' ? 401 : 500
        res.status(code).json({ error: err.message })
    }
})

/** Pull watched movie tmdb ids into the cache (for poster markers). */
async function refreshSyncCache() {
    const token = await ensureToken()
    const r = await traktFetch('/sync/watched/movies', { token })
    if (!r.ok) return
    const data = await r.json()
    const ids = (data || [])
        .map(entry => entry?.movie?.ids?.tmdb)
        .filter(Boolean)
    db.data.trakt.watchedTmdbIds = ids
    db.data.trakt.syncedAt = Date.now()
    await safeWrite(db)
}

// ── Synced data for the client (watched markers + watchlist row) ──
router.get('/synced', async (req, res) => {
    const t = db.data.trakt
    if (!t.connected) return res.json({ watched: [], watchlist: [] })
    try {
        if (!t.syncedAt || Date.now() - t.syncedAt > SYNC_TTL_MS) {
            await refreshSyncCache()
        }
        const token = await ensureToken()
        // Watchlist (movies) → normalized minimal items for a home row.
        let watchlist = []
        const wl = await traktFetch('/sync/watchlist/movies', { token })
        if (wl.ok) {
            const data = await wl.json()
            watchlist = (data || [])
                .map(e => e.movie)
                .filter(m => m?.ids?.tmdb)
                .map(m => ({ tmdbId: m.ids.tmdb, title: m.title, year: m.year }))
        }
        res.json({ watched: db.data.trakt.watchedTmdbIds || [], watchlist })
    } catch (err) {
        res.json({ watched: db.data.trakt.watchedTmdbIds || [], watchlist: [], error: err.message })
    }
})

export default router
