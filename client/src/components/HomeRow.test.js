import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(
    path.resolve(import.meta.dirname, '../index.css'),
    'utf8'
)
const homeRowSrc = fs.readFileSync(
    path.resolve(import.meta.dirname, './HomeRow.jsx'),
    'utf8'
)
const resumeRowSrc = fs.readFileSync(
    path.resolve(import.meta.dirname, './ContinueWatchingRow.jsx'),
    'utf8'
)

describe('HomeRow TV layout regressions', () => {
    it('reserves enough trailing space to center the last fixed-width card', () => {
        expect(css).toContain('padding-right: max(32px, calc(50% - 65px))')
    })

    it('uses each row card width when centering its final card', () => {
        expect(homeRowSrc).toContain('snap-container home-row-cards')
        expect(resumeRowSrc).toContain('snap-container resume-row-cards')
        expect(css).toContain('.home-row-cards')
        expect(css).toContain('.resume-row-cards')
        expect(css).toContain('padding-right: max(32px, calc(50% - 100px))')
    })
})
