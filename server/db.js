import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

// Initialize DB
const defaultData = { progress: {} }
const adapter = new JSONFile('db.json')
const db = new Low(adapter, defaultData)

// Ensure DB is ready
await db.read()
db.data ||= defaultData
await db.write()

export { db }
