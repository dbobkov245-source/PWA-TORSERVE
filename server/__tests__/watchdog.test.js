/**
 * Watchdog Module Tests
 * Tests for server/watchdog.js
 */

import { test, expect } from './test-runner.js'

// ─────────────────────────────────────────────────────────────
// Watchdog API Tests
// ─────────────────────────────────────────────────────────────

test('watchdog exports required functions', async () => {
    const watchdog = await import('../watchdog.js')

    expect(typeof watchdog.getServerState).toBe('function')
    expect(typeof watchdog.startWatchdog).toBe('function')
    expect(typeof watchdog.stopWatchdog).toBe('function')
})

test('getServerState returns valid state object', async () => {
    const { getServerState } = await import('../watchdog.js')
    const state = getServerState()

    expect(state).toBeDefined()
    expect(typeof state.serverStatus).toBe('string')
    expect(typeof state.lastStateChange).toBe('number')
})

test('serverStatus is valid value', async () => {
    const { getServerState } = await import('../watchdog.js')
    const state = getServerState()

    const validStatuses = ['ok', 'degraded', 'error', 'circuit_open']
    expect(validStatuses.includes(state.serverStatus)).toBe(true)
})

// ─────────────────────────────────────────────────────────────
// RAM Helper Test
// ─────────────────────────────────────────────────────────────

test('process.memoryUsage returns valid data', () => {
    const mem = process.memoryUsage()

    expect(mem.heapUsed).toBeGreaterThan(0)
    expect(mem.heapTotal).toBeGreaterThan(0)
    expect(mem.rss).toBeGreaterThan(0)
})
