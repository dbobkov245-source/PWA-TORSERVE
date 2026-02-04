/**
 * Range parsing tests
 */

import { test, expect } from './test-runner.js'
import { parseRange } from '../utils/range.js'

test('parseRange handles standard range', () => {
    const result = parseRange('bytes=0-99', 1000)
    expect(result).toEqual({ start: 0, end: 99 })
})

test('parseRange handles open-ended range', () => {
    const result = parseRange('bytes=100-', 1000)
    expect(result).toEqual({ start: 100, end: 999 })
})

test('parseRange handles suffix range', () => {
    const result = parseRange('bytes=-200', 1000)
    expect(result).toEqual({ start: 800, end: 999 })
})

test('parseRange rejects invalid ranges', () => {
    expect(parseRange('bytes=1000-1001', 1000)).toBeNull()
    expect(parseRange('bytes=500-400', 1000)).toBeNull()
    expect(parseRange('bytes=abc-def', 1000)).toBeNull()
})
