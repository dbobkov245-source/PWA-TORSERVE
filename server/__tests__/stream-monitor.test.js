import { test, expect } from './test-runner.js'

test('runtime pressure fields preserve V8, external, faults and host pressure', async () => {
    const { buildRuntimePressureFields } = await import('../streamMonitor.js')
    const fields = buildRuntimePressureFields({
        memory: {
            rss: 600 * 1024 * 1024,
            heapUsed: 400 * 1024 * 1024,
            heapTotal: 450 * 1024 * 1024,
            external: 120 * 1024 * 1024,
            arrayBuffers: 90 * 1024 * 1024
        },
        resources: { majorPageFault: 12, minorPageFault: 340 },
        eventLoop: { p99Ms: 220.5, maxMs: 510.25 },
        host: { memAvailableMB: 91, swapUsedMB: 1601, swapInPagesPerSec: 15, swapOutPagesPerSec: 5, majorFaultsPerSec: 4, iowaitPct: 89 }
    })

    expect(fields).toEqual({
        rssMB: 600,
        heapUsedMB: 400,
        heapTotalMB: 450,
        externalMB: 120,
        arrayBuffersMB: 90,
        processMajorFaults: 12,
        processMinorFaults: 340,
        eventLoopP99Ms: 220.5,
        eventLoopMaxMs: 510.25,
        memAvailableMB: 91,
        swapUsedMB: 1601,
        swapInPagesPerSec: 15,
        swapOutPagesPerSec: 5,
        hostMajorFaultsPerSec: 4,
        iowaitPct: 89
    })
})


test('isStreamActive covers open connections and short gaps between player reopens', async () => {
    const { openStream, closeStream, isStreamActive } = await import('../streamMonitor.js')
    const hash = 'e4f7a3d390b3b5045281f18f50a3594599e8283e'
    expect(isStreamActive(hash)).toBe(false)
    openStream(hash.toUpperCase())
    expect(isStreamActive(hash)).toBe(true)
    closeStream(hash.toUpperCase())
    // Players close and reopen on every seek; that gap is still playback.
    expect(isStreamActive(hash, Date.now() + 30000)).toBe(true)
    expect(isStreamActive(hash, Date.now() + 120000)).toBe(false)
})
