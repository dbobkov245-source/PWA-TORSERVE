/**
 * Auto-downloader helper tests
 */

import { test, expect } from './test-runner.js'
import { getSizeGBFromResult } from '../autodownloader.js'

test('getSizeGBFromResult uses sizeBytes when available', () => {
    const result = getSizeGBFromResult({ sizeBytes: 2 * 1024 ** 3 })
    expect(result).toBe(2)
})

test('getSizeGBFromResult parses size string', () => {
    const result = getSizeGBFromResult({ size: '1024 MB' })
    expect(result).toBe(1)
})

test('getSizeGBFromResult returns 0 on unknown size', () => {
    const result = getSizeGBFromResult({ size: 'N/A' })
    expect(result).toBe(0)
})
