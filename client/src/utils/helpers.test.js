/**
 * Unit Tests for helper utilities
 * PWA-TorServe Client Tests
 */

import { describe, it, expect } from 'vitest'
import { cleanTitle, formatSize, formatEta, formatSpeed, organizeFiles, extractQualityBadges, getMaxEpisodeNumber, resolveInitialServerUrl } from './helpers.js'

describe('cleanTitle', () => {
    it('removes common torrent suffixes', () => {
        expect(cleanTitle('Movie.2023.1080p.BluRay')).toContain('Movie')
    })

    it('removes season markers', () => {
        // cleanTitle uses \b word boundary, so S01 must be separate word
        expect(cleanTitle('Fallout S01 1080p')).toBe('Fallout')
    })

    it('removes year from title', () => {
        expect(cleanTitle('Dune 2021 1080p')).toBe('Dune')
    })

    it('handles null/undefined', () => {
        expect(cleanTitle(null)).toBe('')
        expect(cleanTitle(undefined)).toBe('')
        expect(cleanTitle('')).toBe('')
    })
})

describe('formatSize', () => {
    it('formats bytes to KB', () => {
        expect(formatSize(1024)).toBe('1.0 KB')
    })

    it('formats bytes to MB', () => {
        expect(formatSize(1024 * 1024)).toBe('1.0 MB')
    })

    it('formats bytes to GB', () => {
        expect(formatSize(1024 * 1024 * 1024)).toBe('1.0 GB')
    })

    it('handles zero', () => {
        expect(formatSize(0)).toBe('')
    })
})

describe('formatEta', () => {
    it('formats seconds to minutes', () => {
        expect(formatEta(120)).toBe('2м')
    })

    it('formats seconds to hours and minutes', () => {
        expect(formatEta(3720)).toBe('1ч 2м')
    })

    it('handles zero', () => {
        expect(formatEta(0)).toBe('')
    })

    it('formats seconds under 60', () => {
        expect(formatEta(45)).toBe('45с')
    })

    it('handles negative values', () => {
        expect(formatEta(-10)).toBe('')
    })
})

describe('resolveInitialServerUrl', () => {
    it('returns empty string for native app when nothing stored', () => {
        expect(resolveInitialServerUrl({
            isNative: true,
            storedUrl: ''
        })).toBe('')
    })

    it('returns stored server URL for native app', () => {
        expect(resolveInitialServerUrl({
            isNative: true,
            storedUrl: 'http://example.local:3000'
        })).toBe('http://example.local:3000')
    })

    it('returns empty string on web even if stored URL exists', () => {
        expect(resolveInitialServerUrl({
            isNative: false,
            storedUrl: 'http://example.local:3000'
        })).toBe('')
    })
})

describe('formatSpeed', () => {
    it('returns empty for zero', () => {
        expect(formatSpeed(0)).toBe('')
    })

    it('returns empty for falsy', () => {
        expect(formatSpeed(null)).toBe('')
        expect(formatSpeed(undefined)).toBe('')
    })

    it('returns empty for speeds below 1 KB/s', () => {
        expect(formatSpeed(512)).toBe('')
        expect(formatSpeed(1023)).toBe('')
    })

    it('formats KB/s speed', () => {
        expect(formatSpeed(1024)).toBe('1 KB/s')
        expect(formatSpeed(512 * 1024)).toBe('512 KB/s')
    })

    it('formats MB/s speed', () => {
        expect(formatSpeed(1024 * 1024)).toBe('1.0 MB/s')
        expect(formatSpeed(5 * 1024 * 1024)).toBe('5.0 MB/s')
    })
})

describe('organizeFiles', () => {
    it('returns empty for null/empty input', () => {
        expect(organizeFiles(null)).toEqual({ episodes: [], extras: [] })
        expect(organizeFiles([])).toEqual({ episodes: [], extras: [] })
    })

    it('detects S01E01 episodes', () => {
        const files = [
            { name: 'Show.S01E01.mkv', length: 1000 },
            { name: 'Show.S01E02.mkv', length: 1000 },
        ]
        const { episodes, extras } = organizeFiles(files)
        expect(episodes).toHaveLength(2)
        expect(extras).toHaveLength(0)
        expect(episodes[0].episode).toBe(1)
        expect(episodes[1].episode).toBe(2)
    })

    it('sorts episodes by season then episode number', () => {
        const files = [
            { name: 'Show.S02E01.mkv', length: 1000 },
            { name: 'Show.S01E03.mkv', length: 1000 },
            { name: 'Show.S01E01.mkv', length: 1000 },
        ]
        const { episodes } = organizeFiles(files)
        expect(episodes[0].season).toBe(1)
        expect(episodes[0].episode).toBe(1)
        expect(episodes[1].season).toBe(1)
        expect(episodes[1].episode).toBe(3)
        expect(episodes[2].season).toBe(2)
        expect(episodes[2].episode).toBe(1)
    })

    it('moves sample/trailer files to extras', () => {
        const files = [
            { name: 'Show.S01E01.mkv', length: 1000 },
            { name: 'sample.mkv', length: 100 },
            { name: 'trailer.mkv', length: 50 },
        ]
        const { episodes, extras } = organizeFiles(files)
        expect(episodes).toHaveLength(1)
        expect(extras).toHaveLength(2)
    })

    it('moves unnumbered files to extras when episodes exist', () => {
        const files = [
            { name: 'Show.S01E01.mkv', length: 1000 },
            { name: 'extras_behind_scenes.mkv', length: 300 },
        ]
        const { extras } = organizeFiles(files)
        expect(extras.some(f => f.name.includes('extras'))).toBe(true)
    })

    it('falls back to returning all files as episodes if none have numbering', () => {
        const files = [
            { name: 'Movie A.mkv', length: 2000 },
            { name: 'Movie B.mkv', length: 2500 },
        ]
        const { episodes, extras } = organizeFiles(files)
        expect(episodes).toHaveLength(2)
        expect(extras).toHaveLength(0)
    })

    it('handles simple Ep N episode pattern without season marker', () => {
        const files = [
            { name: 'Episode 3.mkv', length: 1000 },
            { name: 'Episode 1.mkv', length: 1000 },
        ]
        const { episodes } = organizeFiles(files)
        expect(episodes).toHaveLength(2)
        expect(episodes[0].episode).toBe(1)
        expect(episodes[1].episode).toBe(3)
    })

    it('attaches season and episode metadata to results', () => {
        const files = [{ name: 'Show.S03E07.mkv', length: 1000 }]
        const { episodes } = organizeFiles(files)
        expect(episodes[0].season).toBe(3)
        expect(episodes[0].episode).toBe(7)
        expect(episodes[0].sortKey).toBe(3 * 1000 + 7)
    })
})

describe('getMaxEpisodeNumber', () => {
    it('uses episode number from SxxExx instead of season number', () => {
        const files = [
            { name: 'A.Knight.of.the.Seven.Kingdoms.S01E01.mkv', length: 1000 },
            { name: 'A.Knight.of.the.Seven.Kingdoms.S01E04.mkv', length: 1000 },
            { name: 'A.Knight.of.the.Seven.Kingdoms.S01E05.mkv', length: 1000 },
        ]

        expect(getMaxEpisodeNumber(files)).toBe(5)
    })
})

describe('extractQualityBadges', () => {
    it('returns empty for falsy input', () => {
        expect(extractQualityBadges(null)).toEqual([])
        expect(extractQualityBadges('')).toEqual([])
    })

    it('detects 4K / UHD / 2160p', () => {
        expect(extractQualityBadges('Movie.4K.HDR.mkv')[0].label).toBe('4K')
        expect(extractQualityBadges('Movie.2160p.WEB-DL.mkv')[0].label).toBe('4K')
        expect(extractQualityBadges('Movie.UHD.BluRay.mkv')[0].label).toBe('4K')
    })

    it('detects 1080p', () => {
        const badges = extractQualityBadges('Movie.1080p.WEB-DL.mkv')
        expect(badges[0].label).toBe('1080p')
    })

    it('detects 720p', () => {
        const badges = extractQualityBadges('Movie.720p.BluRay.mkv')
        expect(badges[0].label).toBe('720p')
    })

    it('detects Dolby Vision (DV/DoVi)', () => {
        const labels = extractQualityBadges('Movie.1080p.DV.mkv').map(b => b.label)
        expect(labels).toContain('DV')

        const labels2 = extractQualityBadges('Movie.1080p.DoVi.mkv').map(b => b.label)
        expect(labels2).toContain('DV')
    })

    it('detects HDR but not when DV is present (DV takes priority)', () => {
        const labels = extractQualityBadges('Movie.1080p.HDR.mkv').map(b => b.label)
        expect(labels).toContain('HDR')

        const labelsWithDV = extractQualityBadges('Movie.1080p.DV.HDR.mkv').map(b => b.label)
        expect(labelsWithDV).toContain('DV')
        expect(labelsWithDV).not.toContain('HDR')
    })

    it('detects REMUX source', () => {
        const labels = extractQualityBadges('Movie.1080p.REMUX.mkv').map(b => b.label)
        expect(labels).toContain('REMUX')
    })

    it('detects BluRay source (BD)', () => {
        const labels = extractQualityBadges('Movie.1080p.BluRay.x264.mkv').map(b => b.label)
        expect(labels).toContain('BD')
    })

    it('detects WEB-DL source (WEB)', () => {
        const labels = extractQualityBadges('Movie.1080p.WEB-DL.mkv').map(b => b.label)
        expect(labels).toContain('WEB')
    })

    it('detects Atmos audio', () => {
        const labels = extractQualityBadges('Movie.1080p.Atmos.WEB-DL.mkv').map(b => b.label)
        expect(labels).toContain('ATMOS')
    })

    it('caps result at 3 badges', () => {
        const badges = extractQualityBadges('Movie.2160p.DV.REMUX.Atmos.mkv')
        expect(badges.length).toBeLessThanOrEqual(3)
    })

    it('returns correct badge colors for resolution', () => {
        const badges4K = extractQualityBadges('Movie.4K.mkv')
        expect(badges4K[0].color).toBe('bg-amber-500')

        const badges1080 = extractQualityBadges('Movie.1080p.mkv')
        expect(badges1080[0].color).toBe('bg-blue-500')

        const badges720 = extractQualityBadges('Movie.720p.mkv')
        expect(badges720[0].color).toBe('bg-gray-500')
    })

    it('returns no badges for plain name without tags', () => {
        const badges = extractQualityBadges('The Movie')
        expect(badges).toEqual([])
    })
})
