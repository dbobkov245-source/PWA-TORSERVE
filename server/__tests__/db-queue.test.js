import assert from 'node:assert/strict'
import { test } from './test-runner.js'
import { safeWrite, getPendingWrites } from '../dbQueue.js'

test('safeWrite rejects a failed operation while a later queued write succeeds', async () => {
    const error = Object.assign(new Error('no space left on device'), { code: 'ENOSPC' })
    const writes = []
    const failed = safeWrite({ write: async () => { writes.push('failed'); throw error } })
    const succeeded = safeWrite({ write: async () => { writes.push('success') } })
    assert.equal(getPendingWrites(), 2)
    const results = await Promise.allSettled([failed, succeeded])
    assert.equal(results[0].status, 'rejected')
    assert.equal(results[0].reason, error)
    assert.equal(results[1].status, 'fulfilled')
    assert.deepEqual(writes, ['failed', 'success'])
    assert.equal(getPendingWrites(), 0)
})
