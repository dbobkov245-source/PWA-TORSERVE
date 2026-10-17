import { describe, it, expect } from 'vitest'
import { getReleaseBadges } from './releaseBadges.js'

const dune4k = {
    tags: ['2160p', 'hevc', 'hdr', 'dv'],
    release: {
        quality: 2160,
        hdr: true,
        voices: ['Дубляж', 'Сербин', 'Яроцкий'],
        video: { codec: 'hevc', width: 3840, height: 1606 },
        audioChannels: 6,
        audioLanguages: ['rus', 'eng'],
        subtitleLanguages: ['rus', 'eng']
    }
}

const labels = (item) => getReleaseBadges(item).map(b => b.label)

describe('getReleaseBadges', () => {
    it('shows what jac.red knows about a release, in reading order', () => {
        expect(labels(dune4k)).toEqual(['4K', 'HDR', 'DV', '5.1', 'Дубляж, Сербин +1', 'Суб'])
    })

    it('names quality from jac.red even when the release name says nothing', () => {
        expect(labels({ tags: [], release: { quality: 1080, hdr: false, voices: [], video: null, audioChannels: 8, audioLanguages: [], subtitleLanguages: [] } }))
            .toEqual(['1080p', '7.1'])
        expect(labels({ tags: [], release: { quality: 480, hdr: false, voices: [], video: null, audioChannels: 2, audioLanguages: [], subtitleLanguages: [] } }))
            .toEqual(['SD'])
    })

    it('falls back to tags guessed from the name for other trackers', () => {
        expect(labels({ tags: ['1080p', 'hevc', 'hdr'], release: null })).toEqual(['1080p', 'HDR'])
        expect(labels({ tags: [] })).toEqual([])
        expect(labels(null)).toEqual([])
    })

    it('lists every voice in the badge title for the focused row', () => {
        const voices = getReleaseBadges(dune4k).find(b => b.kind === 'voices')
        expect(voices.title).toBe('Дубляж, Сербин, Яроцкий')
    })

    it('only marks subtitles that a Russian viewer can read', () => {
        const engOnly = { ...dune4k, release: { ...dune4k.release, subtitleLanguages: ['eng'] } }
        expect(labels(engOnly)).not.toContain('Суб')
    })
})
