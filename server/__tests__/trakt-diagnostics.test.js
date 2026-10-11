/**
 * Trakt failures must be visible, and a transient one must not sign you out.
 *
 * 2026-10-11: the server had silently lost its Trakt session (`connected:false`,
 * no username, 0 watched) and nothing in the logs said when or why; every
 * scrobble since was dropped without a trace. And a refresh hitting a 5xx or a
 * Cloudflare hiccup wiped the tokens exactly like a revoked grant.
 */

import assert from 'node:assert/strict'
import { test } from './test-runner.js'
import { loadRoute, responseStream } from './route-harness.js'

test('only a rejected grant signs out; server or network trouble keeps the tokens', async () => {
    const { classifyRefreshFailure } = await import('../routes/trakt.js')
    assert.equal(classifyRefreshFailure(400), 'signed_out')
    assert.equal(classifyRefreshFailure(401), 'signed_out')
    assert.equal(classifyRefreshFailure(403), 'signed_out')
    assert.equal(classifyRefreshFailure(429), 'retry')
    assert.equal(classifyRefreshFailure(500), 'retry')
    assert.equal(classifyRefreshFailure(503), 'retry')
})

test('/status tells the client why Trakt is not working', async () => {
    const lastError = { reason: 'device_code_failed', status: 401, at: 123 }
    const db = { data: { trakt: { connected: false, accessToken: null, slug: null, watchedTmdbIds: [], lastError } } }
    const { handler } = await loadRoute('../routes/trakt.js', "router.get('/status'", { db, isConfigured: () => true })
    const res = responseStream()
    await handler({}, res)
    const body = JSON.parse(res.body())
    assert.deepEqual(body.lastError, lastError)
    assert.equal(body.connected, false)
})

test('every Trakt failure path records and logs its reason', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync(new URL('../routes/trakt.js', import.meta.url), 'utf8')
    for (const reason of ['refresh_rejected', 'device_code_failed', 'scrobble_dropped', 'disconnected', 'discovery_failed']) {
        assert.ok(src.includes(`'${reason}'`), `missing noteTraktError('${reason}')`)
    }
})

test('a new Trakt app needs only a client id: no secret is sent when none is set', async () => {
    const { buildTraktTokenBody } = await import('../routes/trakt.js')
    const body = buildTraktTokenBody({ code: 'abc' }, { TRAKT_CLIENT_ID: 'id1' })
    assert.deepEqual(body, { code: 'abc', client_id: 'id1' })
})

test('the legacy secret and a configured redirect are sent when set', async () => {
    const { buildTraktTokenBody } = await import('../routes/trakt.js')
    const env = { TRAKT_CLIENT_ID: 'id1', TRAKT_CLIENT_SECRET: 's', TRAKT_REDIRECT_URI: 'https://example.org/cb' }
    const body = buildTraktTokenBody({ grant_type: 'refresh_token' }, env, { withRedirect: true })
    assert.deepEqual(body, { grant_type: 'refresh_token', client_id: 'id1', client_secret: 's', redirect_uri: 'https://example.org/cb' })
})

test('Trakt counts as configured with a client id alone', async () => {
    const { isTraktConfigured } = await import('../routes/trakt.js')
    assert.equal(isTraktConfigured({ TRAKT_CLIENT_ID: 'id1' }), true)
    assert.equal(isTraktConfigured({}), false)
})
