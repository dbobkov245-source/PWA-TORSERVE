import { describe, it, expect } from 'vitest'
import { getAddToastMessage } from './toastMessages.js'

describe('getAddToastMessage', () => {
    it('returns null for playable', () => {
        expect(getAddToastMessage('playable')).toBeNull()
    })
    it('returns null for unchecked', () => {
        expect(getAddToastMessage('unchecked')).toBeNull()
    })
    it('returns null for unknown/undefined', () => {
        expect(getAddToastMessage(undefined)).toBeNull()
        expect(getAddToastMessage('unknown')).toBeNull()
    })
    it('returns warning for risky', () => {
        const result = getAddToastMessage('risky')
        expect(result).not.toBeNull()
        expect(result.type).toBe('warning')
        expect(result.message).toContain('пиров')
    })
    it('returns error for dead', () => {
        const result = getAddToastMessage('dead')
        expect(result).not.toBeNull()
        expect(result.type).toBe('error')
        expect(result.message).toContain('мёртв')
    })
    it('returns error for stalled', () => {
        const result = getAddToastMessage('stalled')
        expect(result).not.toBeNull()
        expect(result.type).toBe('error')
        expect(result.message).toContain('данные')
    })
})
