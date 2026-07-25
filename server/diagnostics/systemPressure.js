import fs from 'fs'

const KB_PER_MB = 1024
const round2 = value => Math.round(value * 100) / 100

function nonNegativeDelta(current, previous) {
    return Math.max(0, Number(current || 0) - Number(previous || 0))
}

export function parseMeminfo(text = '') {
    const values = {}
    for (const line of String(text).split('\n')) {
        const match = line.match(/^([A-Za-z_()]+):\s+(\d+)\s+kB$/)
        if (match) values[match[1]] = Number(match[2])
    }

    const toMB = key => Math.round((values[key] || 0) / KB_PER_MB)
    const swapTotalMB = toMB('SwapTotal')
    const swapFreeMB = toMB('SwapFree')

    return {
        memTotalMB: toMB('MemTotal'),
        memFreeMB: toMB('MemFree'),
        memAvailableMB: toMB('MemAvailable'),
        swapTotalMB,
        swapFreeMB,
        swapUsedMB: Math.max(0, swapTotalMB - swapFreeMB)
    }
}

export function parseVmstat(text = '') {
    const values = {}
    for (const line of String(text).split('\n')) {
        const match = line.match(/^(pswpin|pswpout|pgmajfault)\s+(\d+)$/)
        if (match) values[match[1]] = Number(match[2])
    }
    return {
        pswpin: values.pswpin || 0,
        pswpout: values.pswpout || 0,
        pgmajfault: values.pgmajfault || 0
    }
}

export function parseCpuStat(text = '') {
    const line = String(text).split('\n').find(value => value.startsWith('cpu ')) || ''
    const values = line.trim().split(/\s+/).slice(1).map(Number)
    const [user = 0, nice = 0, system = 0, idle = 0, iowait = 0, irq = 0, softirq = 0, steal = 0] = values
    return { user, nice, system, idle, iowait, irq, softirq, steal }
}

export function computePressureDelta(previous, current, elapsedMs) {
    if (!previous || !current || elapsedMs <= 0) {
        return { swapInPagesPerSec: 0, swapOutPagesPerSec: 0, majorFaultsPerSec: 0, iowaitPct: 0 }
    }

    const seconds = elapsedMs / 1000
    const cpuKeys = ['user', 'nice', 'system', 'idle', 'iowait', 'irq', 'softirq', 'steal']
    const cpuTotalDelta = cpuKeys.reduce(
        (sum, key) => sum + nonNegativeDelta(current.cpu[key], previous.cpu[key]),
        0
    )
    const iowaitDelta = nonNegativeDelta(current.cpu.iowait, previous.cpu.iowait)

    return {
        swapInPagesPerSec: round2(nonNegativeDelta(current.vmstat.pswpin, previous.vmstat.pswpin) / seconds),
        swapOutPagesPerSec: round2(nonNegativeDelta(current.vmstat.pswpout, previous.vmstat.pswpout) / seconds),
        majorFaultsPerSec: round2(nonNegativeDelta(current.vmstat.pgmajfault, previous.vmstat.pgmajfault) / seconds),
        iowaitPct: cpuTotalDelta > 0 ? round2((iowaitDelta / cpuTotalDelta) * 100) : 0
    }
}

export function createSystemPressureReader({ readFileSync = fs.readFileSync, now = Date.now } = {}) {
    let previous = null
    let previousAt = 0

    return function readSystemPressure() {
        const sampledAt = now()
        try {
            const meminfo = parseMeminfo(readFileSync('/proc/meminfo', 'utf8'))
            const current = {
                vmstat: parseVmstat(readFileSync('/proc/vmstat', 'utf8')),
                cpu: parseCpuStat(readFileSync('/proc/stat', 'utf8'))
            }
            const rates = computePressureDelta(previous, current, sampledAt - previousAt)
            previous = current
            previousAt = sampledAt
            return { ...meminfo, ...rates }
        } catch {
            return null
        }
    }
}

