import { describe, expect, it } from 'vitest'
import { pushBackHandler, dispatchSystemBack, getBackHandlerCount } from './backButton.js'

describe('backButton registry', () => {
    it('topmost handler consumes the press, LIFO order', () => {
        const calls = []
        const un1 = pushBackHandler(() => { calls.push('bottom'); return true })
        const un2 = pushBackHandler(() => { calls.push('top'); return true })

        dispatchSystemBack(() => calls.push('fallback'))
        expect(calls).toEqual(['top'])

        un2(); un1()
    })

    it('non-consuming handler passes control down, then to fallback', () => {
        const calls = []
        const un = pushBackHandler(() => { calls.push('peek'); return false })

        dispatchSystemBack(() => calls.push('fallback'))
        expect(calls).toEqual(['peek', 'fallback'])
        un()
    })

    it('unsubscribe removes handler; fallback runs when stack empty', () => {
        const calls = []
        const un = pushBackHandler(() => { calls.push('h'); return true })
        un()
        expect(getBackHandlerCount()).toBe(0)

        dispatchSystemBack(() => calls.push('fallback'))
        expect(calls).toEqual(['fallback'])
    })

    it('throwing handler does not break the chain', () => {
        const calls = []
        const un1 = pushBackHandler(() => { calls.push('ok'); return true })
        const un2 = pushBackHandler(() => { throw new Error('boom') })

        dispatchSystemBack(() => calls.push('fallback'))
        expect(calls).toEqual(['ok'])
        un1(); un2()
    })
})
