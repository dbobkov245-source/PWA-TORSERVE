import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useTVNavigation } from './useTVNavigation'

describe('TV navigation bounds and activation', () => {
    it('keeps focus clamped when a list shrinks and then grows', () => {
        const { result, rerender } = renderHook(({ itemCount }) => useTVNavigation({ itemCount, initialIndex: 4 }), { initialProps: { itemCount: 5 } })
        rerender({ itemCount: 2 })
        expect(result.current.focusedIndex).toBe(1)
        rerender({ itemCount: 5 })
        expect(result.current.focusedIndex).toBe(1)
        rerender({ itemCount: 0 })
        expect(result.current.isFocused(0)).toBe(false)
    })

    it('ignores every key and does not focus elements while inactive', () => {
        const focus = vi.fn(), onSelect = vi.fn(), onBack = vi.fn()
        const { result } = renderHook(() => useTVNavigation({ itemCount: 2, initialIndex: 0, isActive: false, itemRefs: { current: [{ focus }] }, onSelect, onBack }))
        for (const key of ['Enter', ' ', 'Escape', 'Backspace', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight']) {
            const event = { key, preventDefault: vi.fn(), stopPropagation: vi.fn() }
            act(() => result.current.handleKeyDown(event))
            expect(event.preventDefault).not.toHaveBeenCalled()
        }
        expect(onSelect).not.toHaveBeenCalled()
        expect(onBack).not.toHaveBeenCalled()
        expect(focus).not.toHaveBeenCalled()
    })
})
