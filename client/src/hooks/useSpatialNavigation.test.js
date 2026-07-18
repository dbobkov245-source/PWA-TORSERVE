// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import SpatialEngine from './useSpatialNavigation'

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
    document.body.replaceChildren()
    SpatialEngine.zones = {}
    SpatialEngine.idMap = {}
    SpatialEngine.activeZone = 'main'
    vi.restoreAllMocks()
})

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
