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

describe('focus sitting outside the zone', () => {
    it('moves in the requested direction instead of jumping to the first registered element', () => {
        // The top bar buttons carry .focusable and tabIndex=0 but never call
        // useSpatialItem, so they are not in any zone. Landing on one made
        // every arrow press call elements[0].focus() — the first element
        // registered that session, regardless of direction — so the cursor
        // sat at the top of the screen and neither Up nor Down did anything
        // useful.
        const topBarButton = makeFocusable({ left: 300, top: 0, width: 40, height: 40 })
        const firstRegistered = makeFocusable({ left: 32, top: 900 })
        const justBelowTopBar = makeFocusable({ left: 300, top: 200 })

        SpatialEngine.zones.main = new Set([firstRegistered, justBelowTopBar])
        SpatialEngine.activeZone = 'main'
        topBarButton.focus()

        const nearFocus = vi.spyOn(justBelowTopBar, 'focus')
        const farFocus = vi.spyOn(firstRegistered, 'focus')

        SpatialEngine.move('ArrowDown')

        expect(nearFocus).toHaveBeenCalled()
        expect(farFocus).not.toHaveBeenCalled()
    })

    it('still falls back to a registered element when nothing lies that way', () => {
        const strayFocus = makeFocusable({ left: 300, top: 900, width: 40, height: 40 })
        const above = makeFocusable({ left: 32, top: 100 })

        SpatialEngine.zones.main = new Set([above])
        SpatialEngine.activeZone = 'main'
        strayFocus.focus()

        const focus = vi.spyOn(above, 'focus')
        SpatialEngine.move('ArrowDown')

        expect(focus).toHaveBeenCalled()
    })
})

describe('dead end at a lazy row', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    // The lazy-row theory this block was written for did not survive the device.
    // Across two traced sessions and 434 vertical dead ends, candidateCount never
    // rose once after a scroll — and the user confirmed the dead ends line up
    // with the end of the rows. A dead end is a list edge, so it now does
    // nothing rather than sliding the page out from under the cursor.
    it('does not scroll when nothing is registered further down', () => {
        const current = makeFocusable({ left: 32, top: 300 })
        SpatialEngine.zones.main = new Set([current])
        SpatialEngine.activeZone = 'main'
        current.focus()

        const scrollBy = vi.fn()
        vi.stubGlobal('scrollBy', scrollBy)

        SpatialEngine.move('ArrowDown')

        expect(scrollBy).not.toHaveBeenCalled()
        expect(document.activeElement).toBe(current)
    })

    it('does not scroll on an upward dead end either', () => {
        const current = makeFocusable({ left: 32, top: 300 })
        SpatialEngine.zones.main = new Set([current])
        SpatialEngine.activeZone = 'main'
        current.focus()

        const scrollBy = vi.fn()
        vi.stubGlobal('scrollBy', scrollBy)

        SpatialEngine.move('ArrowUp')

        expect(scrollBy).not.toHaveBeenCalled()
        expect(document.activeElement).toBe(current)
    })

    it('does not scroll when a real candidate exists', () => {
        const current = makeFocusable({ left: 32, top: 300 })
        const below = makeFocusable({ left: 32, top: 600 })
        SpatialEngine.zones.main = new Set([current, below])
        SpatialEngine.activeZone = 'main'
        current.focus()

        const scrollBy = vi.fn()
        vi.stubGlobal('scrollBy', scrollBy)

        SpatialEngine.move('ArrowDown')

        expect(scrollBy).not.toHaveBeenCalled()
    })

    it('leaves horizontal dead ends alone', () => {
        const current = makeFocusable({ left: 32, top: 300 })
        SpatialEngine.zones.main = new Set([current])
        SpatialEngine.activeZone = 'main'
        current.focus()

        const scrollBy = vi.fn()
        vi.stubGlobal('scrollBy', scrollBy)

        SpatialEngine.move('ArrowRight')

        expect(scrollBy).not.toHaveBeenCalled()
    })
})
