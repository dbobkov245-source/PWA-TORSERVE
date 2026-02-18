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

// Run all registered tests
await runTests()
