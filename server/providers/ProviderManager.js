/**
 * ProviderManager - Registry and coordinator for torrent providers
 * PWA-TorServe Provider Architecture
 * 
 * Manages provider registration, enables/disables, and health status.
 */

import { logger } from '../utils/logger.js'

const log = logger.child('ProviderManager')

class ProviderManager {
    constructor() {
        /** @type {Map<string, import('./BaseProvider.js').BaseProvider>} */
        this.providers = new Map()
    }

    /**
     * Register a provider instance
     * @param {import('./BaseProvider.js').BaseProvider} provider
     */
    register(provider) {
        if (!provider.name) {
            throw new Error('Provider must have a name')
        }

        this.providers.set(provider.name, provider)
        log.info('Provider registered', {
            name: provider.name,
            enabled: provider.enabled
        })
    }

    /**
     * Get provider by name
     * @param {string} name
     * @returns {import('./BaseProvider.js').BaseProvider|undefined}
     */
    get(name) {
        return this.providers.get(name)
    }

    /**
     * Get all enabled and healthy providers
     * @returns {import('./BaseProvider.js').BaseProvider[]}
     */
    getEnabled() {
        return Array.from(this.providers.values())
            .filter(p => p.enabled && p.isHealthy())
    }

    /**
     * Get all registered providers
     * @returns {import('./BaseProvider.js').BaseProvider[]}
     */
    getAll() {
        return Array.from(this.providers.values())
    }

    /**
     * Enable or disable a provider
     * @param {string} name
     * @param {boolean} enabled
     */
    setEnabled(name, enabled) {
        const provider = this.providers.get(name)
        if (provider) {
            provider.enabled = enabled
            log.info('Provider state changed', { name, enabled })
        }
    }

    /**
     * Get status of all providers
     * @returns {Object[]}
     */
    getStatus() {
        return Array.from(this.providers.values()).map(p => ({
            name: p.name,
            enabled: p.enabled,
            healthy: p.isHealthy()
        }))
    }
}

// Singleton instance
export const providerManager = new ProviderManager()
