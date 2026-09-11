// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTVNavigation } from './useTVNavigation'

const key = (name) => ({ key: name, preventDefault: vi.fn(), stopPropagation: vi.fn() })

afterEach(() => { vi.unstubAllGlobals(); document.body.replaceChildren() })

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
    const node = document.createElement('button')
    document.body.append(node)
    vi.spyOn(node, 'focus')
    node.closest = vi.fn(() => container)
    node.getBoundingClientRect = () => ({ left: 700, width: 200 })
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

  it('clamps the logical focus when the item count shrinks', () => {
    const { result, rerender } = renderHook(
      ({ itemCount }) => useTVNavigation({
        itemCount,
        columns: Math.max(itemCount, 1),
        itemRefs: { current: [] },
        initialIndex: 2
      }),
      { initialProps: { itemCount: 3 } }
    )

    rerender({ itemCount: 1 })

    expect(result.current.focusedIndex).toBe(0)
    expect(result.current.isFocused(0)).toBe(true)
  })
})
