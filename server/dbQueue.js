/**
 * DB Write Queue - prevents race conditions in LowDB writes
 * 
 * LowDB rewrites entire JSON file on each write.
 * Concurrent writes can corrupt the file.
 * This module serializes all writes through a Promise chain.
 */

let writeQueue = Promise.resolve()
let pendingWrites = 0

/**
 * Safe write to database with serialization
 * @param {object} db - LowDB instance
 * @returns {Promise} - resolves when write is complete
 */
export function safeWrite(db) {
    pendingWrites++

    const operation = writeQueue
        .then(() => db.write())
        .finally(() => {
            pendingWrites--
        })

    // Recover only the queue tail. The caller still sees its own write failure.
    writeQueue = operation.catch(err => console.error('[DB] Write failed:', err.message))
    return operation
}

/**
 * Get number of pending writes (for debugging/monitoring)
 */
export function getPendingWrites() {
    return pendingWrites
}
