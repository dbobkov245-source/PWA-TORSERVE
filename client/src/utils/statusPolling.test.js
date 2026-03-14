import { describe, it, expect, vi } from 'vitest'
import { createSerializedPollTask } from './statusPolling.js'

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
