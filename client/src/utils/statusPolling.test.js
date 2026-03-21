import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const src = fs.readFileSync(path.resolve(import.meta.dirname, '../App.jsx'), 'utf8')

describe('App.jsx SSE', () => {
    it('uses EventSource for status updates', () => {
        expect(src).toContain('new EventSource(')
        expect(src).toContain('/api/status/stream')
    })
    it('setInterval for fetchStatus only appears in onerror fallback', () => {
        const setIntervalIdx = src.indexOf('setInterval(fetchStatus')
        const onerrorIdx = src.lastIndexOf('onerror', setIntervalIdx)
        expect(setIntervalIdx).toBeGreaterThan(-1)
        expect(onerrorIdx).toBeGreaterThan(-1)
        expect(onerrorIdx).toBeLessThan(setIntervalIdx)
    })
})
