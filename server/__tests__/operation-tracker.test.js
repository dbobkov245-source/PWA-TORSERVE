import { test, expect } from './test-runner.js'

test('operation tracker records start and finish with duration', async () => {
    const { createOperationTracker } = await import('../diagnostics/operationTracker.js')
    let now = 1000
    const tracker = createOperationTracker({ now: () => now, maxMarkers: 4 })
    const id = tracker.start('library-scan', { force: true })
    now = 1450
    expect(tracker.finish(id, { status: 'ok' })).toBe(true)
    expect(tracker.activeCount()).toBe(0)
    expect(tracker.drain()).toEqual([
        { t: 1000, id: 'library-scan:1', name: 'library-scan', phase: 'start', force: true },
        { t: 1450, id: 'library-scan:1', name: 'library-scan', phase: 'finish', durationMs: 450, status: 'ok' }
    ])
})

test('operation tracker ignores duplicate finish and bounds markers', async () => {
    const { createOperationTracker } = await import('../diagnostics/operationTracker.js')
    let now = 0
    const tracker = createOperationTracker({ now: () => now, maxMarkers: 2 })
    const first = tracker.start('first')
    now = 1
    tracker.finish(first)
    tracker.start('second')
    expect(tracker.finish(first)).toBe(false)
    expect(tracker.drain()).toEqual([
        { t: 1, id: 'first:1', name: 'first', phase: 'finish', durationMs: 1 },
        { t: 1, id: 'second:2', name: 'second', phase: 'start' }
    ])
})

