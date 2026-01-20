/**
 * Unit Tests for helper utilities
 * PWA-TorServe Client Tests
 */

import { describe, it, expect } from 'vitest'
import { cleanTitle, formatSize, formatEta } from './helpers.js'

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
})
