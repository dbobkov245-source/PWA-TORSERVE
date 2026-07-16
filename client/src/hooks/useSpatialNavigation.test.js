import { beforeEach, describe, expect, it, vi } from 'vitest'
import SpatialEngine from './useSpatialNavigation'

const createFocusable = ({ left, top = 0, width = 130, height = 195 }) => {
    const element = document.createElement('button')
    element.className = 'focusable'
    Object.defineProperty(element, 'offsetParent', {
        configurable: true,
        get: () => element.parentElement
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

describe('SpatialEngine TV navigation', () => {
    beforeEach(() => {
        document.body.innerHTML = ''
        SpatialEngine.zones = {}
        SpatialEngine.idMap = {}
        SpatialEngine.activeZone = 'test'
    })

    it('centers the focused card along the horizontal axis', () => {
        const row = document.createElement('div')
        row.className = 'snap-container'
        const current = createFocusable({ left: 32 })
        const next = createFocusable({ left: 178 })
        row.append(current, next)
        document.body.append(row)

        SpatialEngine.register('test', current)
        SpatialEngine.register('test', next)
        current.focus()

        SpatialEngine.move('ArrowRight')

        expect(document.activeElement).toBe(next)
        expect(next.scrollIntoView).toHaveBeenCalledWith({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        })
    })

    it('does not measure cards from other rows during horizontal movement', () => {
        const currentRow = document.createElement('div')
        currentRow.className = 'snap-container'
        const otherRow = document.createElement('div')
        otherRow.className = 'snap-container'
        const current = createFocusable({ left: 32 })
        const next = createFocusable({ left: 178 })
        const otherRowCard = createFocusable({ left: 178, top: 240 })
        currentRow.append(current, next)
        otherRow.append(otherRowCard)
        document.body.append(currentRow, otherRow)

        SpatialEngine.register('test', current)
        SpatialEngine.register('test', next)
        SpatialEngine.register('test', otherRowCard)
        current.focus()

        SpatialEngine.move('ArrowRight')

        expect(document.activeElement).toBe(next)
        expect(otherRowCard.getBoundingClientRect).not.toHaveBeenCalled()
    })
})
