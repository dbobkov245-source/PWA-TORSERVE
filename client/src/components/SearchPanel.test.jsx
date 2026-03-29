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
    it('uses a stable result action key for result list items, not array index fallback', () => {
        expect(src).not.toContain('key={r.id || i}')
        expect(src).toContain('key={getSearchResultActionKey(r) || i}')
    })

    it('renders search results as keyboard-focusable controls for TV OK/Enter', () => {
        expect(src).toContain('<button')
        expect(src).toContain('type="button"')
    })

    it('passes the whole search result object to the add handler instead of raw id fallback', () => {
        expect(src).not.toContain('onAdd(item.magnet || item.id, item.title)')
        expect(src).toContain('onAdd(item)')
    })
})
