const SNAPSHOT_KEY = 'home:snapshot:v2'
const FOCUS_KEY = 'home:focus:v2'
const MAX_STALE_MS = 24 * 60 * 60 * 1000
const OMIT_VALUE = Symbol('omit-snapshot-value')

/**
 * Creates a JSON-ready copy without executable callbacks or row fetchers.
 * A sentinel lets arrays remove function entries instead of serializing them as null.
 *
 * @param {*} value
 * @returns {*}
 */
function sanitizeSnapshotValue(value) {
  if (typeof value === 'function') return OMIT_VALUE

  if (Array.isArray(value)) {
    return value.reduce((sanitizedValues, item) => {
      const sanitizedItem = sanitizeSnapshotValue(item)
      if (sanitizedItem !== OMIT_VALUE) sanitizedValues.push(sanitizedItem)
      return sanitizedValues
    }, [])
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((sanitizedObject, [key, item]) => {
      if (key === 'fetcher') return sanitizedObject

      const sanitizedItem = sanitizeSnapshotValue(item)
      if (sanitizedItem !== OMIT_VALUE) sanitizedObject[key] = sanitizedItem
      return sanitizedObject
    }, {})
  }

  return value
}

export function writeHomeSnapshot(rows, now = Date.now()) {
  try {
    const sanitizedRows = sanitizeSnapshotValue(rows)
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ rows: sanitizedRows, savedAt: now }))
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

    const age = now - value.savedAt
    return age >= 0 && age <= MAX_STALE_MS ? value : null
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
