/**
 * Badges for a torrent search row, Lampa-style: quality, HDR / Dolby Vision,
 * surround sound, voice-overs, Russian subtitles.
 *
 * jac.red results carry `release` (measured quality, HDR, voices and the
 * ffprobe streams); other trackers only have `tags` guessed from the name.
 */

const QUALITY_FROM_TAG = { '2160p': '4K', '1080p': '1080p', '720p': '720p' }
const MAX_VOICES_SHOWN = 2

function qualityLabel(release, tags) {
    const quality = release?.quality
    if (quality >= 2160) return '4K'
    if (quality >= 1080) return '1080p'
    if (quality >= 720) return '720p'
    if (quality > 0) return 'SD'
    const tag = Object.keys(QUALITY_FROM_TAG).find(t => tags.includes(t))
    return tag ? QUALITY_FROM_TAG[tag] : null
}

function audioLabel(channels) {
    if (channels >= 8) return '7.1'
    if (channels >= 6) return '5.1'
    return null
}

/**
 * @param {{tags?: string[], release?: Object|null}|null} item - a /api/v2/search item
 * @returns {{kind: string, label: string, title?: string}[]}
 */
export function getReleaseBadges(item) {
    if (!item) return []
    const tags = item.tags || []
    const release = item.release || null
    const badges = []

    const quality = qualityLabel(release, tags)
    if (quality) badges.push({ kind: 'quality', label: quality })
    if (release?.hdr || tags.includes('hdr')) badges.push({ kind: 'hdr', label: 'HDR' })
    if (tags.includes('dv')) badges.push({ kind: 'dv', label: 'DV' })

    const audio = audioLabel(release?.audioChannels)
    if (audio) badges.push({ kind: 'audio', label: audio })

    const voices = release?.voices || []
    if (voices.length > 0) {
        const shown = voices.slice(0, MAX_VOICES_SHOWN).join(', ')
        const more = voices.length - MAX_VOICES_SHOWN
        badges.push({
            kind: 'voices',
            label: more > 0 ? `${shown} +${more}` : shown,
            title: voices.join(', ')
        })
    }

    if (release?.subtitleLanguages?.includes('rus')) badges.push({ kind: 'subs', label: 'Суб' })

    return badges
}
