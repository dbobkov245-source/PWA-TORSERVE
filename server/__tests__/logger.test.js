/**
 * Logger Module Tests
 * Tests for server/utils/logger.js
 */

import { test, expect } from './test-runner.js'

// ─────────────────────────────────────────────────────────────
// Logger Tests
// ─────────────────────────────────────────────────────────────

test('logger.child creates module-specific logger', async () => {
    const { logger } = await import('../utils/logger.js')
    const childLogger = logger.child('TestModule')

    expect(childLogger).toBeDefined()
    expect(typeof childLogger.info).toBe('function')
    expect(typeof childLogger.error).toBe('function')
    expect(typeof childLogger.warn).toBe('function')
    expect(typeof childLogger.debug).toBe('function')
})

test('logger has all required methods', async () => {
    const { logger } = await import('../utils/logger.js')

    expect(typeof logger.info).toBe('function')
    expect(typeof logger.error).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.child).toBe('function')
})

test('logger.info does not throw', async () => {
    const { logger } = await import('../utils/logger.js')

    // Should not throw
    logger.info('Test message', { key: 'value' })
    expect(true).toBe(true)
})

test('logger.error does not throw', async () => {
    const { logger } = await import('../utils/logger.js')

    // Should not throw
    logger.error('Test error', { errorCode: 500 })
    expect(true).toBe(true)
})
