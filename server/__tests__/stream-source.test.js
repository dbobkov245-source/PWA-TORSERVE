/**
 * Stream source selection tests.
 *
 * Protects against sparse/preallocated files being mistaken for
 * fully downloaded media just because stat.size matches target length.
 */

import { test, expect } from './test-runner.js'

test('shouldServeFileFromDisk rejects sparse files with full logical size', async () => {
    const { shouldServeFileFromDisk } = await import('../streamSource.js')

    const sparseStat = {
        size: 6_836_617_216,
        blocks: 1024 // 512 KiB actually allocated
    }

    expect(shouldServeFileFromDisk(sparseStat, sparseStat.size)).toBe(false)
})

test('shouldServeFileFromDisk accepts fully allocated files', async () => {
    const { shouldServeFileFromDisk } = await import('../streamSource.js')

    const fullStat = {
        size: 4_096,
        blocks: 8
    }

    expect(shouldServeFileFromDisk(fullStat, fullStat.size)).toBe(true)
})

test('shouldServeFileFromDisk falls back to logical size when blocks are unavailable', async () => {
    const { shouldServeFileFromDisk } = await import('../streamSource.js')

    const statWithoutBlocks = {
        size: 2_048
    }

    expect(shouldServeFileFromDisk(statWithoutBlocks, statWithoutBlocks.size)).toBe(true)
})
