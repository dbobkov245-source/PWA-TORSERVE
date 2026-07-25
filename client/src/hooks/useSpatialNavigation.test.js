// @vitest-environment happy-dom
import React, { useEffect } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SpatialEngine, {
    useSpatialArbiter,
    useSpatialItem
} from './useSpatialNavigation'

const makeFocusable = ({ left, top = 0, width = 100, height = 100 }) => {
    const element = document.createElement('button')
    element.className = 'focusable'
    document.body.appendChild(element)
    Object.defineProperty(element, 'offsetParent', {
        configurable: true,
        value: document.body
    })
    element.getBoundingClientRect = vi.fn(() => ({
        left,
        right: left + width,
        top,
        bottom: top + height,
        width,
        height
    }))
    element.scrollIntoView = vi.fn()
    return element
}

afterEach(() => {
    cleanup()
    document.body.replaceChildren()
    SpatialEngine.zones = {}
    SpatialEngine.idMap = {}
    SpatialEngine.activeZone = 'main'
    vi.restoreAllMocks()
})

const ArbiterHarness = ({ pollTick, identities }) => {
    const { setActiveZone } = useSpatialArbiter()
    identities.push(setActiveZone)

    useEffect(() => {
        setActiveZone('main')
    }, [setActiveZone])

    return React.createElement('span', null, pollTick)
}

const SpatialItemHarness = () => {
    const itemRef = useSpatialItem('main', 'temporary-item')
    return React.createElement('button', { ref: itemRef }, 'Temporary')
}

describe('SpatialEngine scroll ownership', () => {
    it('moves horizontal focus without starting a competing scroll', () => {
        const current = makeFocusable({ left: 0 })
        const next = makeFocusable({ left: 200 })
        const focus = vi.spyOn(next, 'focus')
        SpatialEngine.zones.main = new Set([current, next])
        current.focus()

        SpatialEngine.move('ArrowRight')

        expect(focus).toHaveBeenCalledWith({ preventScroll: true })
        expect(next.scrollIntoView).not.toHaveBeenCalled()
    })

    it('does not measure cards from other rows during horizontal movement', () => {
        const currentRow = document.createElement('div')
        currentRow.className = 'snap-container'
        const otherRow = document.createElement('div')
        otherRow.className = 'snap-container'
        const current = makeFocusable({ left: 32 })
        const next = makeFocusable({ left: 178 })
        const otherRowCard = makeFocusable({ left: 178, top: 240 })
        currentRow.append(current, next)
        otherRow.append(otherRowCard)
        document.body.append(currentRow, otherRow)

        SpatialEngine.register('main', current)
        SpatialEngine.register('main', next)
        SpatialEngine.register('main', otherRowCard)
        current.focus()

        SpatialEngine.move('ArrowRight')

        expect(document.activeElement).toBe(next)
        expect(otherRowCard.getBoundingClientRect).not.toHaveBeenCalled()
    })
})

describe('SpatialEngine zone lifecycle', () => {
    it('keeps setActiveZone callback identity stable across polling rerenders', () => {
        const identities = []
        const setZone = vi.spyOn(SpatialEngine, 'setActiveZone')
        const view = render(React.createElement(ArbiterHarness, { pollTick: 0, identities }))

        view.rerender(React.createElement(ArbiterHarness, { pollTick: 1, identities }))

        expect(identities[0]).toBe(identities.at(-1))
        expect(setZone).toHaveBeenCalledTimes(1)
    })

    it('treats same-zone activation as a no-op without pruning or losing focus', () => {
        const active = makeFocusable({ left: 0 })
        const stale = makeFocusable({ left: 200 })
        SpatialEngine.register('main', active)
        SpatialEngine.register('main', stale)
        stale.remove()
        active.focus()
        const log = vi.spyOn(console, 'log').mockImplementation(() => {})

        const changed = SpatialEngine.setActiveZone('main')

        expect(changed).toBe(false)
        expect(SpatialEngine.zones.main.has(stale)).toBe(true)
        expect(document.activeElement).toBe(active)
        expect(log).not.toHaveBeenCalled()
    })

    it('prunes disconnected zone and id references explicitly', () => {
        const stale = makeFocusable({ left: 0 })
        SpatialEngine.register('main', stale, 'stale-item')
        stale.remove()

        const removed = SpatialEngine.pruneZone?.('main')

        expect(removed).toBe(1)
        expect(SpatialEngine.zones.main.has(stale)).toBe(false)
        expect(SpatialEngine.idMap.main['stale-item']).toBeUndefined()
    })

    it('switches main to modal and back while unregistering unmounted items', () => {
        const view = render(React.createElement(SpatialItemHarness))
        const temporary = view.getByRole('button', { name: 'Temporary' })
        expect(SpatialEngine.zones.main.has(temporary)).toBe(true)

        expect(SpatialEngine.setActiveZone('modal')).toBe(true)
        expect(SpatialEngine.activeZone).toBe('modal')
        expect(SpatialEngine.setActiveZone('main')).toBe(true)
        expect(SpatialEngine.activeZone).toBe('main')

        view.unmount()
        expect(SpatialEngine.zones.main.has(temporary)).toBe(false)
        expect(SpatialEngine.idMap.main['temporary-item']).toBeUndefined()
    })
})
