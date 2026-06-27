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
    autoDownloadHistory: [],   // Array of magnet hashes to prevent duplicates
    // Favorites (FAV-01)
    favorites: [],             // [{ tmdbId, mediaType, title, posterPath, backdropPath, voteAverage, year, addedAt }]
    // View History (HIST-01)
    viewHistory: [],           // [{ tmdbId, mediaType, title, posterPath, backdropPath, voteAverage, year, lastWatched, genreIds }]
    // TorrServer failover downloads in progress (resumed on restart)
    tsDownloads: [],           // [{ infoHash, magnet, name }]
    // Trakt.tv OAuth device-flow tokens + sync cache
    trakt: {
        connected: false,
        accessToken: null,
        refreshToken: null,
        expiresAt: 0,          // ms epoch when accessToken expires
        pendingDeviceCode: null,
        slug: null,            // trakt username
        watchedTmdbIds: [],    // cached from /sync/watched for poster markers
        syncedAt: 0
    }
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
db.data.autoDownloadSettings = {
    ...defaultData.autoDownloadSettings,
    ...(db.data.autoDownloadSettings || {})
}
db.data.autoDownloadRules ||= []
db.data.autoDownloadHistory ||= []
db.data.favorites ||= []
db.data.viewHistory ||= []
db.data.tsDownloads ||= []
db.data.trakt = { ...defaultData.trakt, ...(db.data.trakt || {}) }

await db.write()

export { db, safeWrite }
