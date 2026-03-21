import { describe, it, expect, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { createSerializedPollTask } from './statusPolling.js'

const src = fs.readFileSync(path.resolve(import.meta.dirname, '../App.jsx'), 'utf8')

describe('createSerializedPollTask', () => {
    it('reuses the in-flight promise and waits for it to settle before starting a new run', async () => {
        let resolveFirstRun
        const task = vi.fn()
            .mockImplementationOnce(() => new Promise((resolve) => {
                resolveFirstRun = resolve
            }))
            .mockResolvedValueOnce('second-run')

        const run = createSerializedPollTask(task)
        const first = run()
        const second = run()

        expect(task).toHaveBeenCalledTimes(1)
        expect(second).toBe(first)

        resolveFirstRun('first-run')
        await first

        await expect(run()).resolves.toBe('second-run')
        expect(task).toHaveBeenCalledTimes(2)
    })
})

describe('App.jsx SSE', () => {
    it('uses EventSource for status updates', () => {
        expect(src).toContain('new EventSource(')
        expect(src).toContain('/api/status/stream')
    })
    it('setInterval for fetchStatus only appears in onerror fallback', () => {
        const setIntervalIdx = src.indexOf('setInterval(fetchStatus')
        const onerrorIdx = src.lastIndexOf('onerror', setIntervalIdx)
        expect(setIntervalIdx).toBeGreaterThan(-1)
        expect(onerrorIdx).toBeGreaterThan(-1)
        expect(onerrorIdx).toBeLessThan(setIntervalIdx)
    })
})
