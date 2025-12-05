import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

// Initialize DB
const defaultData = {
    serverStatus: 'ok',        // 'ok' | 'degraded' | 'error' | 'circuit_open'
    lastStateChange: Date.now(),
    storageFailures: 0,
    progress: {}
}
const adapter = new JSONFile('db.json')
const db = new Low(adapter, defaultData)

// Ensure DB is ready and migrate existing data
await db.read()

// Merge defaults with existing data (handles DB migrations)
db.data = { ...defaultData, ...db.data }

// Ensure nested objects are initialized
db.data.progress ||= {}

await db.write()

export { db }
