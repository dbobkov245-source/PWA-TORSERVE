import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const src = fs.readFileSync(
    path.resolve(import.meta.dirname, './HomePanel.jsx'),
    'utf8'
)

describe('HomePanel startup regressions', () => {
    it('renders loaded discovery rows without waiting for every tier-1 request', () => {
        expect(src).not.toContain('{!loading && DISCOVERY_CATEGORIES.map')
        expect(src).toContain('{DISCOVERY_CATEGORIES.map')
    })

    it('keeps home quality badge discovery capped to visible rows', () => {
        expect(src).toContain('const MAX_HOME_QUALITY_TITLES = 12')
    })

    it('does not rely only on IntersectionObserver for tier-3 lazy rows', () => {
        expect(src).toContain('homeScrollRef')
        expect(src).toContain('queueLazyLoad')
        expect(src).toContain('checkLazyRowsNearViewport')
        expect(src).toContain('setInterval')
        expect(src).toContain('data-category-id')
    })
})
