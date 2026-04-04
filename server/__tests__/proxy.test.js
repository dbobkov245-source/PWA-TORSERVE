import { test, expect } from './test-runner.js'
import { shouldSkipProxyWrite } from '../routes/proxy.js'

test('shouldSkipProxyWrite blocks writes after the response is settled', () => {
    expect(shouldSkipProxyWrite({
        headersSent: false,
        writableEnded: false,
        destroyed: false
    }, true)).toBe(true)
})

test('shouldSkipProxyWrite blocks writes after headers are already sent', () => {
    expect(shouldSkipProxyWrite({
        headersSent: true,
        writableEnded: false,
        destroyed: false
    }, false)).toBe(true)
})

test('shouldSkipProxyWrite allows the first upstream response write', () => {
    expect(shouldSkipProxyWrite({
        headersSent: false,
        writableEnded: false,
        destroyed: false
    }, false)).toBe(false)
})
