import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { safeWrite } from './dbQueue.js'

// Initialize DB
const defaultData = {
    serverStatus: 'ok',        // 'ok' | 'degraded' | 'error' | 'circuit_open'
    lastStateChange: Date.now(),
    storageFailures: 0,
    progress: {},
    seenFiles: {},             // { [infoHash]: [fileName1, fileName2, ...] } - for new episode detection
    torrents: [],              // Array of { magnet, name, addedAt } for persistence
    // Auto-Downloader
    autoDownloadSettings: {
        enabled: false,
        intervalMinutes: 720  // 12 hours
    },
    autoDownloadRules: [],     // [{ id, query, resolution, group, season, lastEpisode, enabled }]
    autoDownloadHistory: []    // Array of magnet hashes to prevent duplicates
}
const dbPath = process.env.DB_PATH || 'db.json'
const adapter = new JSONFile(dbPath)
const db = new Low(adapter, defaultData)

// Ensure DB is ready and migrate existing data
await db.read()

// Merge defaults with existing data (handles DB migrations)
db.data = { ...defaultData, ...db.data }

// Ensure nested objects are initialized
db.data.progress ||= {}
db.data.seenFiles ||= {}
db.data.autoDownloadSettings ||= { enabled: false, intervalMinutes: 30 }
db.data.autoDownloadRules ||= []
db.data.autoDownloadHistory ||= []

await db.write()

export { db, safeWrite }

