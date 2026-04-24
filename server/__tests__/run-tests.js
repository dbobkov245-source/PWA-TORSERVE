/**
 * PWA-TorServe Test Entry Point
 * 
 * Run: node server/__tests__/run-tests.js
 */

import { runTests } from './test-runner.js'

// Import all test files (they register tests on import)
await import('./logger.test.js')
await import('./torrent.test.js')
await import('./watchdog.test.js')
await import('./range.test.js')
await import('./autodownloader.test.js')
await import('./providers-parsing.test.js')
await import('./aggregator.test.js')
await import('./searchCache.test.js')
await import('./local-library.test.js')
await import('./statusResponse.test.js')
await import('./deployment-config.test.js')
await import('./stream-source.test.js')
await import('./request-meta.test.js')
await import('./file-path.test.js')
await import('./db-torrent-delete.test.js')
await import('./search-magnet.test.js')
await import('./magnet-preflight.test.js')
await import('./proxy.test.js')

// Run all registered tests
await runTests()
