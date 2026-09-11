import React from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import TVRowShell from './components/TVRowShell'
import SpatialEngine, { useSpatialArbiter } from './hooks/useSpatialNavigation'
import { pushBackHandler } from './utils/backButton'

afterEach(() => {
    cleanup()
    document.body.replaceChildren()
    SpatialEngine.zones = {}
    SpatialEngine.idMap = {}
    SpatialEngine.activeZone = 'main'
    vi.restoreAllMocks()
})
function Arbiter() { useSpatialArbiter(); return null }
const rowProps = { id: 'row', title: 'Row', items: [{ id: 1 }, { id: 2 }], renderItem: item => <span>{item.id}</span> }
const rect = (left, top, width, height) => ({ left, top, right: left + width, bottom: top + height, width, height })
function button(left, disabled = false) {
    const node = document.createElement('button')
    node.className = 'focusable'
    node.disabled = disabled
    node.tabIndex = 0
    document.body.append(node)
    Object.defineProperty(node, 'offsetParent', { value: document.body })
    node.getBoundingClientRect = () => rect(left, 0, 80, 80)
    node.scrollIntoView = vi.fn()
    SpatialEngine.register('main', node)
    return node
}
it('late inactive row preserves sidebar focus', () => {
    const sidebar = button(0)
    sidebar.focus()
    SpatialEngine.activeZone = 'sidebar'
    render(<TVRowShell {...rowProps} isActive={false} />)
    expect(document.activeElement).toBe(sidebar)
})
it('late active row preserves another row focus and saved position', () => {
    const first = render(<TVRowShell {...rowProps} />)
    const current = first.container.querySelector('.focusable')
    const onFocusChange = vi.fn()
    render(<TVRowShell {...rowProps} id="later" onFocusChange={onFocusChange} />)
    expect(document.activeElement).toBe(current)
    expect(onFocusChange).not.toHaveBeenCalled()
})
it('one Enter selects once with the global arbiter mounted', () => {
    const onSelect = vi.fn()
    const view = render(<><Arbiter /><TVRowShell {...rowProps} onSelect={onSelect} /></>)
    fireEvent.keyDown(view.container.querySelector('.focusable'), { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledTimes(1)
})
it('holding Enter does not repeatedly activate a card', () => {
    const onSelect = vi.fn()
    const view = render(<><Arbiter /><TVRowShell {...rowProps} onSelect={onSelect} /></>)
    const card = view.container.querySelector('.focusable')
    fireEvent.keyDown(card, { key: 'Enter' })
    fireEvent.keyDown(card, { key: 'Enter', repeat: true })
    expect(onSelect).toHaveBeenCalledTimes(1)
})
it('disabled button does not block the next enabled button', () => {
    const current = button(0)
    const disabled = button(100, true)
    // Model the browser refusing focus; happy-dom accepts disabled.focus().
    disabled.focus = vi.fn()
    const enabled = button(200)
    current.focus()
    SpatialEngine.move('ArrowRight')
    expect(document.activeElement).toBe(enabled)
})
it('horizontal navigation reveals an offscreen item without a local scroll owner', () => {
    const current = button(0)
    const next = button(2000)
    const focus = vi.spyOn(next, 'focus')
    current.focus()
    SpatialEngine.move('ArrowRight')
    expect(document.activeElement).toBe(next)
    const scrollAllowed = focus.mock.calls.some(args => !args[0]?.preventScroll)
    expect(scrollAllowed || next.scrollIntoView.mock.calls.length > 0).toBe(true)
})
it('DOM Back closes the topmost registered overlay', () => {
    const local = vi.fn(() => true)
    const remove = pushBackHandler(local)
    try {
        render(<Arbiter />)
        fireEvent.keyDown(window, { key: 'Escape' })
        expect(local).toHaveBeenCalledOnce()
    } finally { remove() }
})
it('native select keeps vertical arrow and Enter defaults', () => {
    render(<Arbiter />)
    const select = document.createElement('select')
    select.innerHTML = '<option>1080</option><option>2160</option>'
    document.body.append(select)
    select.focus()
    expect(fireEvent.keyDown(select, { key: 'ArrowDown' })).toBe(true)
    expect(fireEvent.keyDown(select, { key: 'Enter' })).toBe(true)
})
it('delayed recovery cannot switch back from a newer modal', () => {
    vi.useFakeTimers()
    try {
        SpatialEngine.recoverFocus('main')
        const background = button(0)
        const modal = button(100)
        SpatialEngine.unregister('main', modal)
        SpatialEngine.register('modal', modal)
        SpatialEngine.setActiveZone('modal')
        modal.focus()
        act(() => vi.advanceTimersByTime(200))
        expect(SpatialEngine.activeZone).toBe('modal')
        expect(document.activeElement).not.toBe(background)
    } finally { vi.useRealTimers() }
})
it('nested confirmation contains arrow navigation', () => {
    const background = button(0)
    const scope = document.createElement('div')
    scope.setAttribute('data-tv-focus-scope', 'main')
    document.body.append(scope)
    const cancel = button(100)
    scope.append(cancel)
    cancel.focus()
    SpatialEngine.move('ArrowLeft')
    expect(document.activeElement).not.toBe(background)
})
it('Enter cannot activate the old screen when a new zone owns navigation', () => {
    render(<Arbiter />)
    const old = button(0)
    const click = vi.fn()
    old.addEventListener('click', click)
    old.focus()
    SpatialEngine.setActiveZone('search')
    fireEvent.keyDown(old, { key: 'Enter' })
    expect(click).not.toHaveBeenCalled()
})
it('an empty scope cannot expose buttons behind a downloading update', () => {
    const old = button(0)
    const scope = document.createElement('div')
    scope.setAttribute('data-tv-focus-scope', 'main')
    document.body.append(scope)
    SpatialEngine.move('ArrowDown')
    expect(document.activeElement).not.toBe(old)
})
it('Up from a scrolled row does not skip the adjacent row for an aligned header', () => {
    const header = button(604)
    header.getBoundingClientRect = () => rect(604, 88, 101, 24)
    const near = button(272)
    near.getBoundingClientRect = () => rect(272, 180, 130, 110)
    const current = button(756)
    current.getBoundingClientRect = () => rect(756, 374, 200, 112)
    for (const [node, top] of [[near, 132], [current, 326]]) {
        const row = document.createElement('section')
        row.className = 'home-row'
        row.getBoundingClientRect = () => rect(240, top, 800, 170)
        document.body.append(row)
        row.append(node)
    }
    current.focus()
    SpatialEngine.move('ArrowUp')
    expect(document.activeElement).toBe(near)
})
