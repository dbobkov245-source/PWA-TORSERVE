/**
 * ContentRowsRegistry - Lampa-style registry for Home Page rows
 * Allows decoupled registration of content sources.
 */

class ContentRowsRegistry {
    constructor() {
        this.rows = []
        this.initialized = false
    }

    /**
     * Register a new row or list of rows
     * @param {Object|Array} config 
     * @param {string} config.id - Unique ID (e.g. 'trending')
     * @param {string} config.title - Display title
     * @param {string} config.type - 'list' | 'hero' | 'continue'
     * @param {Function} config.fetcher - Async function returning { items: [] }
     * @param {number} config.order - Display order (default: 100)
     */
    add(config) {
        const items = Array.isArray(config) ? config : [config]

        items.forEach(row => {
            const existing = this.rows.find(r => r.id === row.id)
            if (existing) {
                console.warn(`[Registry] Overwriting row: ${row.id}`)
                Object.assign(existing, row)
            } else {
                this.rows.push({
                    order: 100,
                    ...row
                })
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
            type: 'list',
            fetcher: cat.fetcher,
            order: (index + 1) * 10
        }))

        this.add(defaultRows)
        this.initialized = true
        console.log(`[Registry] Initialized with ${defaultRows.length} rows`)
    }
}

export const contentRowsRegistry = new ContentRowsRegistry()
