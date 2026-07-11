// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useTVNavigation } from './useTVNavigation'

const key = (name) => ({ key: name, preventDefault: vi.fn(), stopPropagation: vi.fn() })

describe('useTVNavigation activation', () => {
  it('ignores every key while inactive', () => {
    const onSelect = vi.fn()
    const itemRefs = { current: [] }
    const { result } = renderHook(() => useTVNavigation({
      itemCount: 3, columns: 3, itemRefs, initialIndex: 0, onSelect, isActive: false
    }))
    act(() => result.current.containerProps.onKeyDown(key('ArrowRight')))
    act(() => result.current.containerProps.onKeyDown(key('Enter')))
    expect(result.current.focusedIndex).toBe(0)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('moves and selects while active', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useTVNavigation({
      itemCount: 3, columns: 3, itemRefs: { current: [] }, initialIndex: 0, onSelect, isActive: true
    }))
    act(() => result.current.containerProps.onKeyDown(key('ArrowRight')))
    act(() => result.current.containerProps.onKeyDown(key('Enter')))
    expect(result.current.focusedIndex).toBe(1)
    expect(onSelect).toHaveBeenCalledWith(1)
  })
})
