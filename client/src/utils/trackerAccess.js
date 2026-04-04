export function magnetHasExplicitTrackers(magnet = '') {
    return typeof magnet === 'string' && /(?:\?|&)tr=/i.test(magnet)
}

export function trackerLabelSuggestsRestrictedSwarm(trackerLabel = '') {
    return /(?:^|[\s,])(kinozal|nnmclub|rutracker)(?:$|[\s,])/i.test(trackerLabel)
}

export function isRestrictedTrackerCandidate(itemOrMagnet, trackerLabel = '') {
    if (itemOrMagnet && typeof itemOrMagnet === 'object') {
        return !magnetHasExplicitTrackers(itemOrMagnet.magnet || '') &&
            trackerLabelSuggestsRestrictedSwarm(itemOrMagnet.tracker || '')
    }

    return !magnetHasExplicitTrackers(itemOrMagnet || '') &&
        trackerLabelSuggestsRestrictedSwarm(trackerLabel)
}

export function isLikelyAccessibleCandidate(item) {
    const status = item?.playabilityStatus
    const peers = item?.preflight?.peers || 0
    const seeders = item?.seeders || 0

    if (status === 'playable') return true
    if (status === 'stalled' || status === 'dead') return false
    if (status === 'risky') return peers > 0
    if (isRestrictedTrackerCandidate(item)) return false

    return seeders > 0
}
