import fsPromises from 'fs/promises'
import { pathToFileURL } from 'url'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function timedFetchJson(url, fetchImpl, now = Date.now) {
    const startedAt = now()
    try {
        const response = await fetchImpl(url, { signal: AbortSignal.timeout(5000) })
        if (!response.ok) {
            return {
                data: { error: `HTTP ${response.status}` },
                durationMs: Math.max(0, now() - startedAt)
            }
        }
        return {
            data: await response.json(),
            durationMs: Math.max(0, now() - startedAt)
        }
    } catch (error) {
        return {
            data: { error: error.message },
            durationMs: Math.max(0, now() - startedAt)
        }
    }
}

export async function collectPoint(baseUrl, fetchImpl = fetch, now = Date.now, includeStatus = false) {
    const [metrics, system, lag, status] = await Promise.all([
        timedFetchJson(`${baseUrl}/api/metrics`, fetchImpl, now),
        timedFetchJson(`${baseUrl}/api/system`, fetchImpl, now),
        timedFetchJson(`${baseUrl}/api/lag-stats`, fetchImpl, now),
        includeStatus
            ? timedFetchJson(`${baseUrl}/api/status`, fetchImpl, now)
            : Promise.resolve({ data: null, durationMs: null })
    ])

    return {
        t: now(),
        metrics: metrics.data,
        system: system.data,
        lag: lag.data,
        status: status.data,
        endpointDurationMs: {
            metrics: metrics.durationMs,
            system: system.durationMs,
            lag: lag.durationMs,
            status: status.durationMs
        }
    }
}

export async function captureRun({ baseUrl, label, durationSec, outputPath, fetchImpl = fetch }) {
    const points = []
    const startedAt = Date.now()
    const deadline = startedAt + durationSec * 1000
    let sampleIndex = 0

    while (Date.now() < deadline) {
        points.push(await collectPoint(baseUrl, fetchImpl, Date.now, sampleIndex % 15 === 0))
        sampleIndex++
        await sleep(2000)
    }

    const timelineResult = await timedFetchJson(
        `${baseUrl}/api/session-timeline?limit=900`,
        fetchImpl
    )
    const result = {
        label,
        startedAt,
        finishedAt: Date.now(),
        points,
        timeline: timelineResult.data
    }

    await fsPromises.writeFile(outputPath, JSON.stringify(result, null, 2))
    return result
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
    const [baseUrl, label, durationText, outputPath] = process.argv.slice(2)
    const durationSec = Number(durationText)

    if (!baseUrl || !label || !Number.isFinite(durationSec) || durationSec <= 0 || !outputPath) {
        console.error('Usage: node scripts/capture-nas-debug.mjs <base-url> <label> <duration-sec> <output-json>')
        process.exit(2)
    }

    await captureRun({ baseUrl, label, durationSec, outputPath })
}
