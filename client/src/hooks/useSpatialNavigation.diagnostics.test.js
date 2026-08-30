// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import SpatialEngine from './useSpatialNavigation'

const makeFocusable = ({ left = 0, top = 0, width = 100, height = 100, id = '' }) => {
    const element = document.createElement('button')
    element.className = 'focusable'
    if (id) element.id = id
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
    SpatialEngine.setDiagnosticsSink(null)
    vi.restoreAllMocks()
})

describe('SpatialEngine diagnostics', () => {
    it('reports what a successful move actually did', () => {
        const first = makeFocusable({ top: 0, id: 'row0' })
        const second = makeFocusable({ top: 300, id: 'row1' })
        SpatialEngine.register('main', first)
        SpatialEngine.register('main', second)
        first.focus()

        const records = []
        SpatialEngine.setDiagnosticsSink(record => records.push(record))

        SpatialEngine.move('ArrowDown')

        expect(records).toHaveLength(1)
        const [record] = records
        expect(record.key).toBe('ArrowDown')
        expect(record.zone).toBe('main')
        expect(record.candidateCount).toBe(2)
        expect(record.currentInZone).toBe(true)
        expect(record.found).toBe(true)
        expect(record.moved).toBe(true)
        expect(record.outcome).toBe('moved')
        expect(record.before).toContain('row0')
        expect(record.after).toContain('row1')
    })

    it('reports the dead end when nothing lies in the pressed direction', () => {
        const only = makeFocusable({ top: 0, id: 'row0' })
        SpatialEngine.register('main', only)
        only.focus()

        const records = []
        SpatialEngine.setDiagnosticsSink(record => records.push(record))

        SpatialEngine.move('ArrowDown')

        expect(records).toHaveLength(1)
        const [record] = records
        expect(record.found).toBe(false)
        expect(record.moved).toBe(false)
        expect(record.outcome).toBe('nudged')
    })

    // This is the shape the TV is suspected to be in: focus parked outside the
    // zone (on <body>), so every press re-targets the same element and the
    // cursor never appears to move.
    it('reports focus sitting outside the zone', () => {
        const first = makeFocusable({ top: 0, id: 'row0' })
        SpatialEngine.register('main', first)
        document.body.focus()

        const records = []
        SpatialEngine.setDiagnosticsSink(record => records.push(record))

        SpatialEngine.move('ArrowDown')

        expect(records).toHaveLength(1)
        expect(records[0].currentInZone).toBe(false)
        expect(records[0].outcome).toBe('entered-from-outside')
    })

    it('stays silent, and unchanged, with no sink installed', () => {
        const first = makeFocusable({ top: 0, id: 'row0' })
        const second = makeFocusable({ top: 300, id: 'row1' })
        SpatialEngine.register('main', first)
        SpatialEngine.register('main', second)
        first.focus()

        expect(() => SpatialEngine.move('ArrowDown')).not.toThrow()
        expect(document.activeElement.id).toBe('row1')
    })
})

describe('SpatialEngine diagnostics — focus lost with its row', () => {
    it('shows the cursor falling back to BODY when its row unmounts', () => {
        const first = makeFocusable({ top: 0, id: 'row0' })
        const doomed = makeFocusable({ top: 300, id: 'doomed' })
        SpatialEngine.register('main', first)
        doomed.focus()
        // A lazy row or a virtualised card can pull the focused node out from
        // under the D-Pad. The browser does not keep focus on a detached node:
        // it drops to <body>, which is the "cursor is nowhere" state.
        doomed.remove()

        const records = []
        SpatialEngine.setDiagnosticsSink(record => records.push(record))

        SpatialEngine.move('ArrowDown')

        expect(records).toHaveLength(1)
        expect(records[0].before).toBe('BODY')
        expect(records[0].currentInZone).toBe(false)
        expect(records[0].outcome).toBe('entered-from-outside')
    })

    it('flags focus that is still attached', () => {
        const first = makeFocusable({ top: 0, id: 'row0' })
        const second = makeFocusable({ top: 300, id: 'row1' })
        SpatialEngine.register('main', first)
        SpatialEngine.register('main', second)
        first.focus()

        const records = []
        SpatialEngine.setDiagnosticsSink(record => records.push(record))
        SpatialEngine.move('ArrowDown')

        expect(records[0].beforeInDom).toBe(true)
    })
})

describe('SpatialEngine vertical dead end', () => {
    const makeScroller = () => {
        const scroller = document.createElement('div')
        scroller.style.overflowY = 'auto'
        document.body.appendChild(scroller)
        Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: 4000 })
        Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 800 })
        scroller.scrollTop = 500
        return scroller
    }

    // Measured over two device sessions, 434 nudges: scrolling on a dead end
    // never once raised candidateCount. Scrolling the window was a harmless
    // no-op under `h-full` layout; scrolling the real container was worse — it
    // moved content 80% of a screen away from a cursor that stayed put.
    it('does not scroll anything when there is no candidate that way', () => {
        const scroller = makeScroller()
        const only = makeFocusable({ top: 0, id: 'row0' })
        scroller.appendChild(only)
        SpatialEngine.register('main', only)
        only.focus()

        const windowScroll = vi.fn()
        window.scrollBy = windowScroll

        SpatialEngine.move('ArrowDown')

        expect(scroller.scrollTop).toBe(500)
        expect(windowScroll).not.toHaveBeenCalled()
    })

    it('counts what lies above and below, so a dead end can be told from a lost row', () => {
        const middle = makeFocusable({ top: 300, id: 'mid' })
        const above = makeFocusable({ top: 0, id: 'above' })
        const below = makeFocusable({ top: 900, id: 'below' })
        for (const el of [middle, above, below]) SpatialEngine.register('main', el)
        middle.focus()

        const records = []
        SpatialEngine.setDiagnosticsSink(record => records.push(record))
        SpatialEngine.move('ArrowDown')

        expect(records[0].aboveCount).toBe(1)
        expect(records[0].belowCount).toBe(1)
    })

    it('reports zero below at the true end of the list', () => {
        const last = makeFocusable({ top: 900, id: 'last' })
        const above = makeFocusable({ top: 0, id: 'above' })
        SpatialEngine.register('main', last)
        SpatialEngine.register('main', above)
        last.focus()

        const records = []
        SpatialEngine.setDiagnosticsSink(record => records.push(record))
        SpatialEngine.move('ArrowDown')

        // belowCount 0 means the cursor really is at the end — not that a row
        // failed to mount. That is the distinction the last build could not make.
        expect(records[0].outcome).toBe('nudged')
        expect(records[0].belowCount).toBe(0)
        expect(records[0].aboveCount).toBe(1)
    })
})

describe('SpatialEngine recovery from BODY', () => {
    const inViewport = (el, top) => {
        el.getBoundingClientRect = vi.fn(() => ({
            left: 0, right: 100, top, bottom: top + 100, width: 100, height: 100
        }))
        return el
    }

    it('lands on the topmost visible candidate, not whatever registered first', () => {
        // Registration order is session-dependent: on the device this jumped to
        // an arbitrary element and read as a random teleport. 9 times in one
        // traced session, every one of them starting from <body>.
        const offscreen = makeFocusable({ top: 0, id: 'registered-first' })
        inViewport(offscreen, -4000)
        const visible = makeFocusable({ top: 0, id: 'visible' })
        inViewport(visible, 200)

        SpatialEngine.register('main', offscreen)
        SpatialEngine.register('main', visible)
        document.body.focus()

        SpatialEngine.move('ArrowDown')

        expect(document.activeElement.id).toBe('visible')
    })

    it('records that it recovered rather than steered', () => {
        // On the device <body> spans the whole document, so nothing is ever
        // "below" it and findNearest returns null — which is why the old code
        // fell through to elements[0]. happy-dom gives body a zero rect, so the
        // real geometry has to be modelled for this branch to be reached.
        document.body.getBoundingClientRect = vi.fn(() => ({
            left: 0, right: 1920, top: 0, bottom: 6000, width: 1920, height: 6000
        }))
        const only = makeFocusable({ top: 0, id: 'only' })
        inViewport(only, 100)
        SpatialEngine.register('main', only)
        document.body.focus()

        const records = []
        SpatialEngine.setDiagnosticsSink(record => records.push(record))
        SpatialEngine.move('ArrowDown')

        expect(records[0].found).toBe(false)
        expect(records[0].outcome).toBe('entered-from-outside')
        expect(records[0].recovery).toBe('topmost-visible')
        expect(document.activeElement.id).toBe('only')
    })

    it('falls back to the first candidate when none is on screen', () => {
        const a = makeFocusable({ top: 0, id: 'a' })
        inViewport(a, -5000)
        SpatialEngine.register('main', a)
        document.body.focus()

        const records = []
        SpatialEngine.setDiagnosticsSink(record => records.push(record))
        SpatialEngine.move('ArrowDown')

        expect(document.activeElement.id).toBe('a')
        expect(records[0].recovery).toBe('first-registered')
    })
})

describe('SpatialEngine diagnostics cost nothing when off', () => {
    it('does not measure neighbour geometry without a sink installed', () => {
        const current = makeFocusable({ top: 300, id: 'cur' })
        const other = makeFocusable({ top: 600, id: 'other' })
        SpatialEngine.register('main', current)
        SpatialEngine.register('main', other)
        current.focus()

        // Counting neighbours costs a getBoundingClientRect per candidate, on
        // every press. With ~55 candidates on Home that is pure waste on a TV
        // when nobody is listening.
        SpatialEngine.setDiagnosticsSink(null)
        other.getBoundingClientRect.mockClear()
        current.getBoundingClientRect.mockClear()

        SpatialEngine.move('ArrowDown')

        const calls = other.getBoundingClientRect.mock.calls.length
        expect(calls).toBeLessThanOrEqual(1)
    })

    it('still measures them when a sink is listening', () => {
        const current = makeFocusable({ top: 300, id: 'cur' })
        const other = makeFocusable({ top: 600, id: 'other' })
        SpatialEngine.register('main', current)
        SpatialEngine.register('main', other)
        current.focus()

        const records = []
        SpatialEngine.setDiagnosticsSink(record => records.push(record))
        SpatialEngine.move('ArrowDown')

        expect(records[0].belowCount).toBe(1)
    })
})
