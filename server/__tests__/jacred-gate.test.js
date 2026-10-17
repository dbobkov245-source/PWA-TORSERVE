/**
 * jac.red request gate.
 *
 * jac.red answers 429 (retry-after 5s) to a second request from the same IP
 * within about a second. Badge discovery ran two searches at once, up to
 * three requests per film, so half of them waited 5s and missed the 4.5s /
 * 8s timeouts; interactive searches queued behind them (NAS logs 2026-10-17).
 * The gate sends one request at a time, spaced apart, interactive first, and
 * on 429 pauses everything for retry-after.
 */

import assert from 'node:assert/strict'
import { test } from './test-runner.js'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const ok = () => new Response('{}', { status: 200 })
const tooMany = (seconds) => new Response('', { status: 429, headers: { 'retry-after': String(seconds) } })

test('the gate sends one request at a time, spaced apart', async () => {
    const { JacredGate } = await import('../providers/JacredGate.js')
    const gate = new JacredGate({ minIntervalMs: 40 })
    let active = 0
    let maxActive = 0
    const starts = []
    const job = () => gate.schedule(async () => {
        active++; maxActive = Math.max(maxActive, active); starts.push(Date.now())
        await sleep(10)
        active--
        return ok()
    })

    await Promise.all([job(), job(), job()])

    assert.equal(maxActive, 1)
    for (let i = 1; i < starts.length; i++) {
        assert.ok(starts[i] - starts[i - 1] >= 38, `gap ${starts[i] - starts[i - 1]}ms`)
    }
})

test('an interactive search goes ahead of queued badge lookups', async () => {
    const { JacredGate } = await import('../providers/JacredGate.js')
    const gate = new JacredGate({ minIntervalMs: 20 })
    const order = []
    const job = (name, background) => gate.schedule(async () => { order.push(name); return ok() }, { background })

    const all = [job('bg1', true), job('bg2', true), job('bg3', true)]
    await sleep(5)
    all.push(job('user', false))
    await Promise.all(all)

    assert.equal(order[0], 'bg1', 'the request already sent finishes first')
    assert.equal(order[1], 'user')
})

test('a 429 pauses the whole gate for retry-after and retries the same request', async () => {
    const { JacredGate } = await import('../providers/JacredGate.js')
    const gate = new JacredGate({ minIntervalMs: 0 })
    const calls = []
    let first = true
    const limited = gate.schedule(async () => {
        calls.push(['limited', Date.now()])
        if (first) { first = false; return tooMany(0.1) }
        return ok()
    })
    const other = gate.schedule(async () => { calls.push(['other', Date.now()]); return ok() })

    const [a, b] = await Promise.all([limited, other])

    assert.equal(a.status, 200)
    assert.equal(b.status, 200)
    assert.deepEqual(calls.map(([name]) => name), ['limited', 'limited', 'other'])
    assert.ok(calls[1][1] - calls[0][1] >= 95, 'waited retry-after before anything else')
})

test('after its retries a still-limited request gets the 429 back', async () => {
    const { JacredGate } = await import('../providers/JacredGate.js')
    const gate = new JacredGate({ minIntervalMs: 0, maxRetries: 2 })
    let calls = 0
    const response = await gate.schedule(async () => { calls++; return tooMany(0.01) })

    assert.equal(response.status, 429)
    assert.equal(calls, 3)
})

test('a request that throws rejects only its own caller', async () => {
    const { JacredGate } = await import('../providers/JacredGate.js')
    const gate = new JacredGate({ minIntervalMs: 0 })
    const failing = gate.schedule(async () => { throw new Error('socket hang up') })
    const fine = gate.schedule(async () => ok())

    await assert.rejects(failing, /socket hang up/)
    assert.equal((await fine).status, 200)
})
