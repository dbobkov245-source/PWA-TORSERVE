import { test, expect } from './test-runner.js'

test('selectSearchProviders falls back to circuit-open providers for interactive search when all are open', async () => {
    const { selectSearchProviders } = await import('../aggregator.js')

    const providers = [
        { name: 'jacred' },
        { name: 'rutor' }
    ]

    const selected = selectSearchProviders(providers, {
        isCircuitOpen: () => true,
        allowCircuitProbeOnExhaustion: true
    })

    expect(selected.map((provider) => provider.name)).toEqual(['jacred', 'rutor'])
})

test('selectSearchProviders keeps respecting open circuits for background traffic', async () => {
    const { selectSearchProviders } = await import('../aggregator.js')

    const providers = [
        { name: 'jacred' },
        { name: 'rutor' }
    ]

    const selected = selectSearchProviders(providers, {
        isCircuitOpen: () => true,
        allowCircuitProbeOnExhaustion: false
    })

    expect(selected).toEqual([])
})

test('selectSearchProviders prefers non-open providers when any are available', async () => {
    const { selectSearchProviders } = await import('../aggregator.js')

    const providers = [
        { name: 'jacred' },
        { name: 'rutor' },
        { name: 'rutracker' }
    ]

    const selected = selectSearchProviders(providers, {
        isCircuitOpen: (name) => name !== 'rutracker',
        allowCircuitProbeOnExhaustion: true
    })

    expect(selected.map((provider) => provider.name)).toEqual(['rutracker'])
})
