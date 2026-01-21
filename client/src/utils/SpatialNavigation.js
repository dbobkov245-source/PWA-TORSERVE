/**
 * SpatialNavigation.js
 * Geometric navigation logic for TV interfaces.
 * "Focus is Global, Logic is Local"
 */

/**
 * Find the next focusable element based on geometric position
 * @param {HTMLElement} current - The currently focused element
 * @param {string} direction - 'up', 'down', 'left', 'right'
 * @param {HTMLElement} container - The container to search within (optional)
 * @returns {HTMLElement|null} The best candidate or null
 */
export const findNextFocus = (current, direction, container = document) => {
    if (!current) return null

    const rect = current.getBoundingClientRect()
    const candidates = Array.from(container.querySelectorAll('.focusable'))
        .filter(el => el !== current && isVisible(el))

    let bestCandidate = null
    let minDistance = Infinity

    for (const candidate of candidates) {
        const candidateRect = candidate.getBoundingClientRect()

        if (isValidCandidate(rect, candidateRect, direction)) {
            const distance = getDistance(rect, candidateRect, direction)

            // Weight alignment heavily to prefer straight lines
            const alignment = getAlignmentPenalty(rect, candidateRect, direction)
            const score = distance + alignment

            if (score < minDistance) {
                minDistance = score
                bestCandidate = candidate
            }
        }
    }

    return bestCandidate
}

// Check if candidate is strictly in the direction of movement
const isValidCandidate = (current, candidate, direction) => {
    switch (direction) {
        case 'up': return candidate.bottom <= current.top + 10 // To allow slight overlap
        case 'down': return candidate.top >= current.bottom - 10
        case 'left': return candidate.right <= current.left + 10
        case 'right': return candidate.left >= current.right - 10
    }
    return false
}

// Euclidean distance between closest points or centers
const getDistance = (current, candidate, direction) => {
    // Simple center-to-center distance for now
    const currentCenter = getCenter(current)
    const candidateCenter = getCenter(candidate)

    return Math.sqrt(
        Math.pow(currentCenter.x - candidateCenter.x, 2) +
        Math.pow(currentCenter.y - candidateCenter.y, 2)
    )
}

// Penalize elements that are far off the main axis
const getAlignmentPenalty = (current, candidate, direction) => {
    const currentCenter = getCenter(current)
    const candidateCenter = getCenter(candidate)

    // For vertical movement, penalize horizontal deviation
    if (direction === 'up' || direction === 'down') {
        return Math.abs(currentCenter.x - candidateCenter.x) * 2
    }
    // For horizontal movement, penalize vertical deviation
    return Math.abs(currentCenter.y - candidateCenter.y) * 2
}

const getCenter = (rect) => ({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
})

const isVisible = (el) => {
    return el.offsetParent !== null // Basic visibility check
}
