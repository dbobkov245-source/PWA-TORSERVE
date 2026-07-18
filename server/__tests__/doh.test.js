import { test, expect } from './test-runner.js'
import { shouldRejectUnauthorized } from '../utils/doh.js'

test('smartFetch verifies TLS certificates by default', () => {
    expect(shouldRejectUnauthorized({})).toBe(true)
})

test('smartFetch only permits insecure TLS when explicitly requested', () => {
    expect(shouldRejectUnauthorized({ insecure: true })).toBe(false)
})
