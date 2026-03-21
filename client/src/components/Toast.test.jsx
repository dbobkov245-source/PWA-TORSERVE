import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToast } from './Toast'

describe('useToast', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    it('adds a toast and auto-removes it after 4 seconds', () => {
        const { result } = renderHook(() => useToast())
        act(() => { result.current.showToast('Test message', 'warning') })
        expect(result.current.toasts).toHaveLength(1)
        expect(result.current.toasts[0].message).toBe('Test message')
        expect(result.current.toasts[0].type).toBe('warning')
        act(() => { vi.advanceTimersByTime(4000) })
        expect(result.current.toasts).toHaveLength(0)
    })

    it('caps at 3 toasts', () => {
        const { result } = renderHook(() => useToast())
        act(() => {
            result.current.showToast('A', 'info')
            result.current.showToast('B', 'info')
            result.current.showToast('C', 'info')
            result.current.showToast('D', 'info')
        })
        expect(result.current.toasts).toHaveLength(3)
        expect(result.current.toasts[0].message).toBe('B')
    })
})
