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
    it('uses react-window FixedSizeList instead of .map() — no manual key management needed', () => {
        // react-window manages keys internally; no .map() with key prop
        expect(src).not.toContain('key={r.id || i}')
        expect(src).not.toContain('.map((r, i)')
        expect(src).toContain('FixedSizeList')
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
