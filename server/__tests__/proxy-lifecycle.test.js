import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { test } from './test-runner.js'
import { loadRoute, responseStream, tick } from './route-harness.js'
import { shouldSkipProxyWrite } from '../routes/proxy.js'

async function setup({ resolvedIP = null } = {}) {
    const request = new EventEmitter()
    request.end = () => {}
    request.destroy = () => { queueMicrotask(() => request.emit('error', new Error('socket hang up'))) }
    let requestArgs, reply, resolveFallback
    let fallbackCalls = 0
    const fallback = new Promise(resolve => { resolveFallback = resolve })
    const transport = { request: (...args) => { requestArgs = args; reply = args.at(-1); return request } }
    const res = responseStream()
    const { handler } = await loadRoute('../routes/proxy.js', "router.get('/', async", {
        withTmdbApiKey: url => url, ALLOWED_DOMAINS: ['api.themoviedb.org'],
        attemptAmsterdamProxy: async () => false, isImageRequest: () => false,
        WSRV_PROXIED_HOSTS: new Set(), shouldSkipProxyWrite,
        getSmartConfig: async () => ({ resolvedIP, hostname: 'api.themoviedb.org', headers: { Host: 'api.themoviedb.org', 'User-Agent': 'fixture-agent' } }),
        https: transport, http: transport,
        smartFetch: () => { fallbackCalls++; return fallback }
    })
    await handler({ query: { url: 'https://api.themoviedb.org/3/movie/1' }, headers: {} }, res)
    return { request, requestArgs, reply, res, resolveFallback, get fallbackCalls() { return fallbackCalls } }
}

test('proxy timeout followed by socket error keeps the first successful fallback', async () => {
    const fixture = await setup()
    fixture.request.emit('timeout')
    await tick()
    fixture.resolveFallback({ status: 200, data: Buffer.from('{"title":"Recovered"}'), headers: { 'content-type': 'application/json' } })
    await tick()
    assert.equal(fixture.res.statusCode, 200)
    assert.equal(fixture.res.body(), '{"title":"Recovered"}')
    assert.equal(fixture.fallbackCalls, 1)
})

test('proxy retains timeout and headers when DoH has no resolved IP', async () => {
    const fixture = await setup()
    const options = typeof fixture.requestArgs[0] === 'string' ? fixture.requestArgs[1] : fixture.requestArgs[0]
    assert.equal(options.timeout, 20000)
    assert.equal(options.headers['User-Agent'], 'fixture-agent')
    fixture.res.destroy()
})

test('proxy ignores a late direct response while fallback is pending', async () => {
    const fixture = await setup()
    fixture.request.emit('timeout')
    const upstream = new PassThrough()
    upstream.statusCode = 200
    upstream.headers = { 'content-type': 'application/json' }
    fixture.reply(upstream)
    upstream.end('stale direct payload')
    await tick()
    fixture.resolveFallback({ status: 200, data: Buffer.from('fallback payload'), headers: {} })
    await tick()
    assert.equal(fixture.res.body(), 'fallback payload')
})
