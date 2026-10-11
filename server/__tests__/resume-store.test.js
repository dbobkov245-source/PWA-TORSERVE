/**
 * Shared resume positions: stop on one TV, continue on the other.
 *
 * Positions used to live only in each TV's localStorage, so the second TV
 * never saw where the first one stopped. Both TVs talk to the same NAS, so the
 * NAS keeps one record per torrent file; the newest write wins, and finishing
 * leaves a tombstone so a stale copy from the other TV cannot resurrect it.
 */

import assert from 'node:assert/strict'
import { test } from './test-runner.js'

const KEY = `${'a'.repeat(40)}:0`
const entry = (position, updatedAt) => ({
    infoHash: 'a'.repeat(40), fileIndex: 0, fileName: 'Runner.mkv', torrentName: 'Runner',
    tmdbId: 1, mediaType: 'movie', position, duration: 7200000, updatedAt
})

test('a position saved on one TV is what the other TV gets back', async () => {
    const { applyResumeChange, listResume } = await import('../resumeStore.js')
    const state = { entries: {}, tombstones: {} }

    assert.equal(applyResumeChange(state, KEY, { entry: entry(600000, 1000) }), true)

    const { entries } = listResume(state)
    assert.equal(entries.length, 1)
    assert.equal(entries[0].position, 600000)
})

test('an older write from the other TV does not overwrite a newer position', async () => {
    const { applyResumeChange, listResume } = await import('../resumeStore.js')
    const state = { entries: {}, tombstones: {} }
    applyResumeChange(state, KEY, { entry: entry(900000, 2000) })

    assert.equal(applyResumeChange(state, KEY, { entry: entry(300000, 1000) }), false)
    assert.equal(listResume(state).entries[0].position, 900000)
})

test('finishing leaves a tombstone that blocks an older copy from coming back', async () => {
    const { applyResumeChange, listResume } = await import('../resumeStore.js')
    const state = { entries: {}, tombstones: {} }
    applyResumeChange(state, KEY, { entry: entry(600000, 1000) })

    assert.equal(applyResumeChange(state, KEY, { deletedAt: 2000 }), true)
    assert.equal(applyResumeChange(state, KEY, { entry: entry(600000, 1500) }), false)
    assert.deepEqual(listResume(state).entries, [])
    assert.equal(listResume(state).tombstones[KEY], 2000)
})

test('watching again after finishing is newer than the tombstone and wins', async () => {
    const { applyResumeChange, listResume } = await import('../resumeStore.js')
    const state = { entries: {}, tombstones: {} }
    applyResumeChange(state, KEY, { deletedAt: 2000 })

    assert.equal(applyResumeChange(state, KEY, { entry: entry(400000, 3000) }), true)
    assert.equal(listResume(state).entries[0].position, 400000)
    assert.equal(listResume(state).tombstones[KEY], undefined)
})

test('malformed keys and records are rejected', async () => {
    const { applyResumeChange } = await import('../resumeStore.js')
    const state = { entries: {}, tombstones: {} }

    assert.throws(() => applyResumeChange(state, '../etc:0', { entry: entry(1, 1) }), /key/)
    assert.throws(() => applyResumeChange(state, KEY, { entry: { ...entry(1, 1), position: -5 } }), /position/)
    assert.throws(() => applyResumeChange(state, KEY, { entry: { ...entry(1, 1), infoHash: 'b'.repeat(40) } }), /key/)
    assert.throws(() => applyResumeChange(state, KEY, {}), /entry or deletedAt/)
})

test('the store keeps the newest 100 positions and forgets tombstones after 60 days', async () => {
    const { applyResumeChange, pruneResume, listResume } = await import('../resumeStore.js')
    const state = { entries: {}, tombstones: {} }
    for (let i = 0; i < 105; i++) {
        const hash = i.toString(16).padStart(40, '0')
        applyResumeChange(state, `${hash}:0`, { entry: { ...entry(600000, 1000 + i), infoHash: hash } })
    }
    const day = 24 * 3600 * 1000
    state.tombstones[`${'c'.repeat(40)}:0`] = 1
    state.tombstones[`${'d'.repeat(40)}:0`] = 100 * day

    pruneResume(state, 100 * day)

    const { entries, tombstones } = listResume(state)
    assert.equal(entries.length, 100)
    assert.equal(entries.at(-1).updatedAt, 1005)
    assert.deepEqual(Object.keys(tombstones), [`${'d'.repeat(40)}:0`])
})

test('deleting a torrent tombstones every file of it', async () => {
    const { applyResumeChange, tombstoneTorrent, listResume } = await import('../resumeStore.js')
    const state = { entries: {}, tombstones: {} }
    applyResumeChange(state, `${'a'.repeat(40)}:0`, { entry: entry(600000, 1000) })
    applyResumeChange(state, `${'a'.repeat(40)}:3`, { entry: { ...entry(600000, 1000), fileIndex: 3 } })

    tombstoneTorrent(state, 'A'.repeat(40), 5000)

    assert.deepEqual(listResume(state).entries, [])
    assert.equal(Object.keys(listResume(state).tombstones).length, 2)
})
