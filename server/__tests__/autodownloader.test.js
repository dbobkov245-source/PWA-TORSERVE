/**
 * Auto-downloader helper tests
 */

import { test, expect } from './test-runner.js'
import { getSizeGBFromResult, parseTorrentTitle } from '../autodownloader.js'

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

test('parseTorrentTitle treats season-only release as batch pack, not episode 1', () => {
    const parsed = parseTorrentTitle('A.Knight.of.the.Seven.Kingdoms.S01.2160p.WEB-DL.DV.HDR')

    expect(parsed.title).toBe('A Knight of the Seven Kingdoms')
    expect(parsed.season).toBe(1)
    expect(parsed.episode).toBe(0)
    expect(parsed.isBatch).toBe(true)
})
