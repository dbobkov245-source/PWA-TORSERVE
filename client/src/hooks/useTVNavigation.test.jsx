// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTVNavigation } from './useTVNavigation'

const key = (name) => ({ key: name, preventDefault: vi.fn(), stopPropagation: vi.fn() })

afterEach(() => vi.unstubAllGlobals())

describe('useTVNavigation activation', () => {
  it('focuses and centers once without mutating container geometry', () => {
    const scrollTo = vi.fn()
    const container = {
      clientWidth: 1000,
      scrollLeft: 120,
      style: {},
      getBoundingClientRect: () => ({ left: 0, width: 1000 }),
      scrollTo
    }
    const node = {
      offsetWidth: 200,
      focus: vi.fn(),
      closest: vi.fn(() => container),
      getBoundingClientRect: () => ({ left: 700, width: 200 }),
      scrollIntoView: vi.fn()
    }
    let frameCallback
    vi.stubGlobal('requestAnimationFrame', callback => {
      frameCallback = callback
      return 1
    })

    renderHook(() => useTVNavigation({
      itemCount: 1,
      columns: 1,
      itemRefs: { current: [node] },
      initialIndex: 0
    }))

    expect(node.focus).toHaveBeenCalledWith({ preventScroll: true })
    act(() => frameCallback())
    expect(container.style.paddingInline).toBeUndefined()
    expect(scrollTo).toHaveBeenCalledOnce()
    expect(scrollTo).toHaveBeenCalledWith({ left: 420, behavior: 'auto' })
  })

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
