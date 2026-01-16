/**
 * Provider Index - Exports and auto-registers all providers
 * PWA-TorServe Provider Architecture
 */

export { BaseProvider, formatSize } from './BaseProvider.js'
export { providerManager } from './ProviderManager.js'
export { JacredProvider } from './JacredProvider.js'
export { RuTrackerProvider } from './RuTrackerProvider.js'
export { RutorProvider } from './RutorProvider.js'
export { TorLookProvider } from './TorLookProvider.js'

// Auto-registration of providers
import { providerManager } from './ProviderManager.js'
import { JacredProvider } from './JacredProvider.js'
import { RuTrackerProvider } from './RuTrackerProvider.js'
import { RutorProvider } from './RutorProvider.js'
import { TorLookProvider } from './TorLookProvider.js'

// Register providers on module load
providerManager.register(new JacredProvider())
providerManager.register(new RuTrackerProvider())
providerManager.register(new RutorProvider())
providerManager.register(new TorLookProvider())
