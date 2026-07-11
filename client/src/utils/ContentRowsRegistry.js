/**
 * ContentRowsRegistry - Lampa-style registry for Home Page rows
 * Allows decoupled registration of content sources.
 */

const LAYOUTS = new Set(['editorial', 'ranked', 'poster', 'personal'])
const DEFAULT_CACHE_TTL = 60 * 60 * 1000

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0
}

export function normalizeRow(config) {
    if (!isNonEmptyString(config?.id)) {
        throw new Error('Row id must be a non-empty string')
    }
    if (!isNonEmptyString(config.title)) {
        throw new Error('Row title must be a non-empty string')
    }
    if (typeof config.fetcher !== 'function') {
        throw new Error('Row fetcher must be a function')
    }

    const icon = config.icon === undefined ? '🎬' : config.icon
    const layout = config.layout === undefined ? 'poster' : config.layout
    const source = config.source === undefined ? 'tmdb' : config.source
    const tier = config.tier === undefined ? 3 : config.tier
    const order = config.order === undefined ? 100 : config.order
    const cacheTTL = config.cacheTTL === undefined ? DEFAULT_CACHE_TTL : config.cacheTTL

    if (!LAYOUTS.has(layout)) {
        throw new Error(`Unsupported row layout: ${layout}`)
    }
    if (!isNonEmptyString(source)) {
        throw new Error('Row source must be a non-empty string')
    }
    if (!Number.isInteger(tier) || tier < 1 || tier > 3) {
        throw new Error('Row tier must be an integer from 1 to 3')
    }
    if (!Number.isFinite(order)) {
        throw new Error('Row order must be a finite number')
    }
    if (!Number.isFinite(cacheTTL) || cacheTTL < 0) {
        throw new Error('Row cacheTTL must be a finite non-negative number')
    }

    return {
        ...config,
        icon,
        layout,
        source,
        tier,
        order,
        cacheTTL
    }
}

export class ContentRowsRegistry {
    constructor() {
        this.rows = []
        this.initialized = false
    }

    /**
     * Register a new row or list of rows
     * @param {Object|Array} config 
     * @param {string} config.id - Unique ID (e.g. 'trending')
     * @param {string} config.title - Display title
     * @param {'editorial'|'ranked'|'poster'|'personal'} config.layout - Row presentation
     * @param {Function} config.fetcher - Async function returning { items: [] }
     * @param {number} config.order - Display order (default: 100)
     */
    add(config) {
        const items = Array.isArray(config) ? config : [config]

        items.forEach(row => {
            const normalizedRow = normalizeRow(row)
            const existing = this.rows.find(r => r.id === normalizedRow.id)
            if (existing) {
                console.warn(`[Registry] Overwriting row: ${normalizedRow.id}`)
                Object.assign(existing, normalizedRow)
            } else {
                this.rows.push(normalizedRow)
            }
        })

        this.sort()
    }

    sort() {
        this.rows.sort((a, b) => a.order - b.order)
    }

    getAll() {
        return this.rows
    }

    /**
     * Get row by ID
     */
    get(id) {
        return this.rows.find(r => r.id === id)
    }

    /**
     * Initialize default Discovery rows
     * (Imported dynamically to avoid cycle deps if needed, 
     * but for now we inject the discovery array)
     */
    init(discoveryCategories) {
        if (this.initialized) return

        // Map legacy DISCOVERY_CATEGORIES to Registry format
        const defaultRows = discoveryCategories.map((cat, index) => ({
            id: cat.id,
            title: cat.name,
            icon: cat.icon,
            layout: 'poster',
            source: cat.source,
            tier: cat.tier,
            cacheTTL: cat.cacheTTL,
            fetcher: cat.fetcher,
            order: (index + 1) * 10
        }))

        this.add(defaultRows)
        this.initialized = true
        console.log(`[Registry] Initialized with ${defaultRows.length} rows`)
    }
}

export const contentRowsRegistry = new ContentRowsRegistry()
