/**
 * D-Pad trace store tests.
 *
 * The TV fails intermittently across hundreds of presses, so the trace has to
 * survive a long run without growing without bound, and has to be readable off
 * the NAS afterwards.
 */

import { test, expect } from './test-runner.js'

test('records a batch and hands it back in order', async () => {
    const { createDpadTrace } = await import('../dpadTrace.js')
    const trace = createDpadTrace()

    trace.record([{ seq: 1, key: 'ArrowDown' }, { seq: 2, key: 'ArrowDown' }])

    const all = trace.all()
    expect(all.length).toBe(2)
    expect(all[0].seq).toBe(1)
    expect(all[1].seq).toBe(2)
})

test('drops the oldest entries past the limit instead of growing forever', async () => {
    const { createDpadTrace } = await import('../dpadTrace.js')
    const trace = createDpadTrace({ limit: 3 })

    trace.record([{ seq: 1 }, { seq: 2 }])
    trace.record([{ seq: 3 }, { seq: 4 }])

    const all = trace.all()
    expect(all.length).toBe(3)
    expect(all[0].seq).toBe(2)
    expect(all[2].seq).toBe(4)
})

test('ignores anything that is not a list of objects', async () => {
    const { createDpadTrace } = await import('../dpadTrace.js')
    const trace = createDpadTrace()

    expect(trace.record(null)).toBe(0)
    expect(trace.record({ seq: 1 })).toBe(0)
    expect(trace.record(['nope', 42, null])).toBe(0)
    expect(trace.all().length).toBe(0)
})

test('stamps a server receive time so client clock skew cannot hide ordering', async () => {
    const { createDpadTrace } = await import('../dpadTrace.js')
    const trace = createDpadTrace()

    trace.record([{ seq: 1 }])

    expect(typeof trace.all()[0].rxAt).toBe('number')
})

test('forwards each entry to the append sink for durable storage', async () => {
    const { createDpadTrace } = await import('../dpadTrace.js')
    const lines = []
    const trace = createDpadTrace({ append: line => lines.push(line) })

    trace.record([{ seq: 1, key: 'ArrowDown' }, { seq: 2, key: 'ArrowUp' }])

    expect(lines.length).toBe(2)
    expect(JSON.parse(lines[0]).key).toBe('ArrowDown')
})

test('a failing append sink never breaks recording', async () => {
    const { createDpadTrace } = await import('../dpadTrace.js')
    const trace = createDpadTrace({ append: () => { throw new Error('disk full') } })

    expect(trace.record([{ seq: 1 }])).toBe(1)
    expect(trace.all().length).toBe(1)
})

test('clear empties the buffer', async () => {
    const { createDpadTrace } = await import('../dpadTrace.js')
    const trace = createDpadTrace()

    trace.record([{ seq: 1 }])
    trace.clear()

    expect(trace.all().length).toBe(0)
})

test('the file appender rotates instead of growing without bound', async () => {
    const { createFileAppender } = await import('../dpadTrace.js')

    let size = 0
    const writes = []
    const renames = []
    const fakeFs = {
        statSync: () => ({ size }),
        appendFileSync: (_p, line) => { writes.push(line); size += line.length },
        renameSync: (from, to) => { renames.push([from, to]); size = 0 }
    }

    const append = createFileAppender({ path: '/data/t.jsonl', maxBytes: 40, fs: fakeFs })

    append('a'.repeat(30))
    expect(renames.length).toBe(0)

    append('b'.repeat(30))   // pushes past 40 -> rotate before writing
    expect(renames.length).toBe(1)
    expect(renames[0][1]).toBe('/data/t.jsonl.1')
    expect(writes.length).toBe(2)
})

test('the file appender survives a missing file and a failing rename', async () => {
    const { createFileAppender } = await import('../dpadTrace.js')

    const fakeFs = {
        statSync: () => { throw new Error('ENOENT') },
        appendFileSync: () => {},
        renameSync: () => { throw new Error('EBUSY') }
    }

    const append = createFileAppender({ path: '/data/t.jsonl', maxBytes: 10, fs: fakeFs })
    // A fresh file has no size; a stuck rename must not stop recording.
    expect(() => append('x')).not.toThrow()
})
