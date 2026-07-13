// @vitest-environment happy-dom

import { beforeEach, expect, it, vi } from 'vitest'
import { readHomeFocus, readHomeSnapshot, writeHomeFocus, writeHomeSnapshot } from './homeSnapshot'

const DAY_MS = 24 * 60 * 60 * 1000

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

it('round-trips a valid snapshot', () => {
  writeHomeSnapshot([{ id: 'x', items: [{ id: 1 }] }], 1000)

  expect(readHomeSnapshot(2000)).toEqual({
    rows: [{ id: 'x', items: [{ id: 1 }] }],
    savedAt: 1000,
  })
})

it('accepts a snapshot at the 24-hour boundary and rejects it after', () => {
  writeHomeSnapshot([{ id: 'x' }], 1000)

  expect(readHomeSnapshot(1000 + DAY_MS)).not.toBeNull()
  expect(readHomeSnapshot(1000 + DAY_MS + 1)).toBeNull()
})

it('rejects snapshots saved in the future', () => {
  writeHomeSnapshot([{ id: 'x' }], 2000)
  expect(readHomeSnapshot(1999)).toBeNull()
})

it('drops every fetcher property regardless of depth or value without mutating rows', () => {
  const rows = [{
    id: 'x',
    fetcher: 'serializable-but-private',
    metadata: {
      label: 'keep',
      fetcher: { endpoint: '/hidden' },
      nested: { fetcher: 42, count: 3 },
    },
    items: [{ id: 1, fetcher: ['hidden'] }],
  }]

  writeHomeSnapshot(rows, 1000)

  expect(readHomeSnapshot(1000).rows).toEqual([{
    id: 'x',
    metadata: { label: 'keep', nested: { count: 3 } },
    items: [{ id: 1 }],
  }])
  expect(rows[0].fetcher).toBe('serializable-but-private')
  expect(rows[0].metadata.nested.fetcher).toBe(42)
})

it('drops nested functions from objects and arrays without null placeholders', () => {
  const callback = () => {}
  const rows = [{
    id: 'x',
    callbacks: [callback, { label: 'keep', onSelect: callback }, 7],
    items: [
      { id: 1, actions: [callback, 'play', callback] },
      callback,
      { id: 2, nested: { callback, value: true } },
    ],
  }]

  writeHomeSnapshot(rows, 1000)

  const snapshot = readHomeSnapshot(1000)
  expect(snapshot.rows).toEqual([{
    id: 'x',
    callbacks: [{ label: 'keep' }, 7],
    items: [
      { id: 1, actions: ['play'] },
      { id: 2, nested: { value: true } },
    ],
  }])
  expect(rows[0].callbacks).toHaveLength(3)
  expect(rows[0].items).toHaveLength(3)
  expect(() => JSON.stringify(snapshot)).not.toThrow()
})

it('returns null for missing or malformed snapshot data', () => {
  expect(readHomeSnapshot()).toBeNull()

  localStorage.setItem('home:snapshot:v2', '{bad')
  expect(readHomeSnapshot()).toBeNull()
})

it('round-trips the focus shape', () => {
  const focus = {
    rowId: 'x',
    itemIndex: 2,
    verticalScroll: 40,
    horizontalScroll: 80,
  }

  writeHomeFocus(focus)

  expect(readHomeFocus()).toEqual(focus)
})

it('returns null for missing or malformed focus data', () => {
  expect(readHomeFocus()).toBeNull()

  localStorage.setItem('home:focus:v2', '{bad')
  expect(readHomeFocus()).toBeNull()
})

it('tolerates storage quota errors when writing snapshot and focus', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Quota exceeded', 'QuotaExceededError')
  })

  expect(() => writeHomeSnapshot([{ id: 'x' }], 1000)).not.toThrow()
  expect(() => writeHomeFocus({
    rowId: 'x',
    itemIndex: 0,
    verticalScroll: 0,
    horizontalScroll: 0,
  })).not.toThrow()
})
