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

// ─── Film identity (title / original title / year / type) ────────────────

test('parseSearchContext reads the film identity from the search request', async () => {
    const { parseSearchContext } = await import('../searchContext.js')

    expect(parseSearchContext({ query: 'Dune', title: 'Дюна', original_title: 'Dune', year: '2021', is_serial: '1' }))
        .toEqual({ title: 'Дюна', originalTitle: 'Dune', year: 2021, isSerial: false })
    expect(parseSearchContext({ title: 'Андор', is_serial: '2' }))
        .toEqual({ title: 'Андор', originalTitle: null, year: null, isSerial: true })
})

test('parseSearchContext ignores a request without a title and malformed fields', async () => {
    const { parseSearchContext } = await import('../searchContext.js')

    expect(parseSearchContext({ query: 'Dune' })).toBeNull()
    expect(parseSearchContext({ year: '2021', is_serial: '1' })).toBeNull()
    expect(parseSearchContext({ title: 'Дюна', year: '20x1', is_serial: 'yes' }))
        .toEqual({ title: 'Дюна', originalTitle: null, year: null, isSerial: false })
})

test('a film identity gets its own cache entry; a plain query keeps its old key', async () => {
    const { searchCacheKey } = await import('../searchContext.js')
    const dune2021 = { title: 'Дюна', originalTitle: 'Dune', year: 2021, isSerial: false }
    const dune1984 = { ...dune2021, year: 1984 }

    expect(searchCacheKey('Dune', null)).toBe('Dune')
    expect(searchCacheKey('Dune', dune2021) === searchCacheKey('Dune', dune1984)).toBe(false)
    expect(searchCacheKey('Dune', dune2021) === 'Dune').toBe(false)
})

test('search hands the film identity to every provider', async () => {
    const { search } = await import('../aggregator.js')
    const { providerManager } = await import('../providers/index.js')
    const seen = []
    const fake = {
        name: 'fake', enabled: true, isHealthy: () => true,
        search: async (query, context, options) => { seen.push({ query, context, options }); return [] }
    }
    const original = providerManager.providers
    providerManager.providers = new Map([['fake', fake]])
    try {
        const context = { title: 'Дюна', originalTitle: 'Dune', year: 2021, isSerial: false }
        await search('Dune', { skipCache: true, skipCacheWrite: true, context })
        await search('Dune', { skipCache: true, skipCacheWrite: true, context, background: true })
        expect(seen).toEqual([
            { query: 'Dune', context, options: { background: false } },
            { query: 'Dune', context, options: { background: true } }
        ])
    } finally {
        providerManager.providers = original
    }
})

test('deduplication keeps jac.red release info when another tracker has more seeders', async () => {
    const { deduplicateByInfohash } = await import('../aggregator.js')
    const magnet = 'magnet:?xt=urn:btih:5ef1461522b909f825ce478dd7eccfdcfddd52d6'
    const release = { quality: 2160, hdr: true, voices: ['Дубляж'] }

    const [kept] = deduplicateByInfohash([
        { magnet, seeders: 100, provider: 'jacred', release },
        { magnet, seeders: 300, provider: 'rutor' }
    ])

    expect(kept.seeders).toBe(300)
    expect(kept.provider).toBe('rutor')
    expect(kept.release).toEqual(release)

    const [keptFirst] = deduplicateByInfohash([
        { magnet, seeders: 300, provider: 'rutor' },
        { magnet, seeders: 100, provider: 'jacred', release }
    ])
    expect(keptFirst.seeders).toBe(300)
    expect(keptFirst.release).toEqual(release)
})
