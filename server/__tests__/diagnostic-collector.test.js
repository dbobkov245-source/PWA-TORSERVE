import { test, expect } from './test-runner.js'

test('diagnostic collector marks failed endpoints without aborting sample', async () => {
    const { collectPoint } = await import('../../scripts/capture-nas-debug.mjs')
    const fetchImpl = async url => {
        if (url.endsWith('/api/lag-stats')) throw new Error('timeout')
        return { ok: true, json: async () => ({ url }) }
    }

    const point = await collectPoint('http://127.0.0.1:3010', fetchImpl, () => 1234, true)

    expect(point.t).toBe(1234)
    expect(point.metrics.url).toContain('/api/metrics')
    expect(point.system.url).toContain('/api/system')
    expect(point.status.url).toContain('/api/status')
    expect(point.lag.error).toBe('timeout')
    expect(point.endpointDurationMs.status).toBe(0)
})
