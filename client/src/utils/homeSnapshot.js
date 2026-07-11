const SNAPSHOT_KEY = 'home:snapshot:v2'
const FOCUS_KEY = 'home:focus:v2'
const MAX_STALE_MS = 24 * 60 * 60 * 1000

export function writeHomeSnapshot(rows, now = Date.now()) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ rows, savedAt: now }))
  } catch {
    // Cache writes are best-effort (for example, storage quota may be exhausted).
  }
}

export function readHomeSnapshot(now = Date.now()) {
  try {
    const rawValue = localStorage.getItem(SNAPSHOT_KEY)
    if (rawValue === null) return null

    const value = JSON.parse(rawValue)
    if (!Array.isArray(value?.rows) || !Number.isFinite(value?.savedAt)) return null

    return now - value.savedAt <= MAX_STALE_MS ? value : null
  } catch {
    return null
  }
}

export function writeHomeFocus(value) {
  try {
    localStorage.setItem(FOCUS_KEY, JSON.stringify(value))
  } catch {
    // Focus restoration must not interrupt navigation when storage is unavailable.
  }
}

export function readHomeFocus() {
  try {
    const rawValue = localStorage.getItem(FOCUS_KEY)
    return rawValue === null ? null : JSON.parse(rawValue)
  } catch {
    return null
  }
}
