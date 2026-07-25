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

test('getStartPieceIndex maps file offset and seek position to piece number', async () => {
    const { getStartPieceIndex } = await import('../streamSource.js')

    expect(getStartPieceIndex(0, 0, 262144)).toBe(0)
    expect(getStartPieceIndex(0, 262144, 262144)).toBe(1)
    expect(getStartPieceIndex(0, 262143, 262144)).toBe(0)
    expect(getStartPieceIndex(1_048_576, 524288, 262144)).toBe(6)
})

test('getStartPieceIndex is robust to invalid inputs', async () => {
    const { getStartPieceIndex } = await import('../streamSource.js')

    expect(getStartPieceIndex(undefined, 100, 262144)).toBe(0)
    expect(getStartPieceIndex(0, undefined, 262144)).toBe(0)
    expect(getStartPieceIndex(0, 100, 0)).toBe(100)
    expect(getStartPieceIndex(NaN, NaN, 262144)).toBe(0)
})

test('shouldCreateStreamBody skips media reads for HEAD requests', async () => {
    const { shouldCreateStreamBody } = await import('../streamSource.js')

    expect(shouldCreateStreamBody('HEAD')).toBe(false)
    expect(shouldCreateStreamBody('GET')).toBe(true)
})

test('createStreamCleanup destroys the source and accounts closure once', async () => {
    const { createStreamCleanup } = await import('../streamSource.js')
    let destroyCalls = 0
    let closeCalls = 0
    const stream = {
        destroyed: false,
        destroy() {
            destroyCalls++
            this.destroyed = true
        }
    }
    const cleanup = createStreamCleanup(stream, () => { closeCalls++ })

    expect(cleanup()).toBe(true)
    expect(cleanup()).toBe(false)
    expect(destroyCalls).toBe(1)
    expect(closeCalls).toBe(1)
})
