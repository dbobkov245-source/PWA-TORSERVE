/**
 * ContentRowsRegistry - Lampa-style registry for Home Page rows
 * Allows decoupled registration of content sources.
 */

const LAYOUTS = new Set(['editorial', 'ranked', 'poster', 'personal'])

export function normalizeRow(config) {
    if (!config?.id || !config?.title || typeof config.fetcher !== 'function') {
        throw new Error('Row requires id, title, and fetcher')
    }

    const layout = config.layout || 'poster'
    if (!LAYOUTS.has(layout)) {
        throw new Error(`Unsupported row layout: ${layout}`)
    }

    return {
        icon: '🎬',
        source: 'tmdb',
        tier: 3,
        order: 100,
        cacheTTL: 60 * 60 * 1000,
        ...config,
        layout
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
            source: cat.source ?? 'tmdb',
            tier: cat.tier ?? 3,
            cacheTTL: cat.cacheTTL ?? 60 * 60 * 1000,
            fetcher: cat.fetcher,
            order: (index + 1) * 10
        }))

        this.add(defaultRows)
        this.initialized = true
        console.log(`[Registry] Initialized with ${defaultRows.length} rows`)
    }
}

export const contentRowsRegistry = new ContentRowsRegistry()
