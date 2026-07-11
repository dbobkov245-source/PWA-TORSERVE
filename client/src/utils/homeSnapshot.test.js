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

it('writes a JSON-safe snapshot without functions or fetchers', () => {
  writeHomeSnapshot([
    {
      id: 'x',
      fetcher: () => Promise.resolve([]),
      items: [{ id: 1, onSelect: () => {} }],
    },
  ], 1000)

  const snapshot = readHomeSnapshot(1000)
  expect(snapshot.rows).toEqual([{ id: 'x', items: [{ id: 1 }] }])
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
