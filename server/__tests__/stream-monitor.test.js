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

