import { test, expect } from './test-runner.js'

test('system pressure parser exposes MemAvailable and swap usage in MB', async () => {
    const { parseMeminfo } = await import('../diagnostics/systemPressure.js')
    const result = parseMeminfo([
        'MemTotal:        1870848 kB',
        'MemFree:           65536 kB',
        'MemAvailable:      93184 kB',
        'SwapTotal:       3220480 kB',
        'SwapFree:        1581056 kB'
    ].join('\n'))

    expect(result).toEqual({
        memTotalMB: 1827,
        memFreeMB: 64,
        memAvailableMB: 91,
        swapTotalMB: 3145,
        swapFreeMB: 1544,
        swapUsedMB: 1601
    })
})

test('system pressure delta reports swap, major faults and iowait rates', async () => {
    const { computePressureDelta } = await import('../diagnostics/systemPressure.js')
    const previous = {
        vmstat: { pswpin: 100, pswpout: 200, pgmajfault: 20 },
        cpu: { user: 100, nice: 0, system: 50, idle: 500, iowait: 20, irq: 0, softirq: 0, steal: 0 }
    }
    const current = {
        vmstat: { pswpin: 130, pswpout: 210, pgmajfault: 28 },
        cpu: { user: 120, nice: 0, system: 60, idle: 550, iowait: 50, irq: 0, softirq: 0, steal: 0 }
    }

    expect(computePressureDelta(previous, current, 2000)).toEqual({
        swapInPagesPerSec: 15,
        swapOutPagesPerSec: 5,
        majorFaultsPerSec: 4,
        iowaitPct: 27.27
    })
})

