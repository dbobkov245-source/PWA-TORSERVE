export function parseMagnetLookupQuery(query = {}) {
    const provider = typeof query.provider === 'string' ? query.provider.trim() : ''
    const id = typeof query.id === 'string' ? query.id.trim() : ''

    if (!provider || !id) {
        throw new Error('provider and id are required')
    }

    return { provider, id }
}
