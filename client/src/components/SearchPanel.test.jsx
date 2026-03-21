/**
 * SearchPanel code-quality regression tests.
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const src = fs.readFileSync(
    path.resolve(import.meta.dirname, './SearchPanel.jsx'),
    'utf8'
)

describe('SearchPanel', () => {
    it('uses stable magnet-based key for result list items, not array index fallback', () => {
        // key={r.id || i} relies on index when id is missing — breaks on sort/reorder
        // key={r.magnet || r.id} is stable across re-sorts
        expect(src).not.toContain('key={r.id || i}')
        expect(src).toContain('key={r.magnet')
    })
    it('passes full item object to onAdd (not just magnet+title)', () => {
        expect(src).toContain('onAdd(item)')
        expect(src).not.toContain("onAdd(item.magnet || item.id, item.title)")
    })
    it('imports FixedSizeList from react-window for virtualized rendering', () => {
        expect(src).toContain("from 'react-window'")
        expect(src).toContain('FixedSizeList')
    })
})
