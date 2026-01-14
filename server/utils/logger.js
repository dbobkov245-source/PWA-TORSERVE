/**
 * Simple Structured Logger for PWA-TorServe
 * Zero dependencies - works without npm install!
 * 
 * Features:
 * - Timestamps in ISO format
 * - Log levels (debug/info/warn/error)
 * - Configurable via LOG_LEVEL env variable
 * - Module context support
 * 
 * Usage:
 *   import { logger } from './utils/logger.js'
 *   logger.info('Server started', { port: 3000 })
 *   logger.error('Failed to connect', { error: err.message })
 * 
 * Or with module context:
 *   const log = logger.child('Torrent')
 *   log.info('Added torrent', { hash: '...' })
 */

const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
}

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] || LOG_LEVELS.info

/**
 * Format log message with timestamp and level
 */
const formatMessage = (level, module, message, data) => {
    const timestamp = new Date().toISOString()
    const modulePrefix = module ? `[${module}]` : ''
    const dataStr = data && Object.keys(data).length > 0 
        ? ' ' + JSON.stringify(data) 
        : ''
    
    return `[${timestamp}] [${level.toUpperCase()}]${modulePrefix} ${message}${dataStr}`
}

/**
 * Create logger instance optionally bound to a module name
 * ✅ FIX: Исправлена логика проверки уровней логирования
 */
const createLogger = (moduleName = null) => ({
    debug: (message, data = {}) => {
        if (currentLevel <= LOG_LEVELS.debug) {  // ✅ FIX: было LOG_LEVELS.debug >= currentLevel
            console.log(formatMessage('debug', moduleName, message, data))
        }
    },

    info: (message, data = {}) => {
        if (currentLevel <= LOG_LEVELS.info) {  // ✅ FIX
            console.log(formatMessage('info', moduleName, message, data))
        }
    },

    warn: (message, data = {}) => {
        if (currentLevel <= LOG_LEVELS.warn) {  // ✅ FIX
            console.warn(formatMessage('warn', moduleName, message, data))
        }
    },

    error: (message, data = {}) => {
        if (currentLevel <= LOG_LEVELS.error) {  // ✅ FIX
            console.error(formatMessage('error', moduleName, message, data))
        }
    },

    /**
     * Create child logger with module context
     * @param {string} module - Module name for log prefix
     * @returns {Object} Logger instance with module context
     */
    child: (module) => createLogger(module)
})

export const logger = createLogger()
