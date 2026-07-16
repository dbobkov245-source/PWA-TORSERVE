import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(
    path.resolve(import.meta.dirname, '../index.css'),
    'utf8'
)

describe('HomeRow TV layout regressions', () => {
    it('reserves enough trailing space to center the last fixed-width card', () => {
        expect(css).toContain('padding-right: max(32px, calc(50% - 65px))')
    })
})
