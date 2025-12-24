/**
 * Auto-Downloader Module
 * PWA-TorServe v2.2
 * 
 * Автоматический поиск и загрузка новых серий сериалов.
 * Использует встроенный regex-парсер (без внешних зависимостей).
 * 
 * Поддерживаемые форматы названий:
 * - Breaking.Bad.S05E16.1080p.BluRay.x264-GROUP
 * - Game of Thrones S08E06 720p WEB-DL
 * - [SubsPlease] One Punch Man - 06 (1080p)
 * - Ванпанчмен - 06 [1080p] [AniLibria]
 * - Сериал (2024) - S01E05
 */

import { db } from './db.js'
import { searchJacred } from './jacred.js'
import { addTorrent } from './torrent.js'
import { logger } from './utils/logger.js'

const log = logger.child('AutoDownloader')

// ────────────────────────────────────────────────────────
// 📺 Title Parser (Zero Dependencies)
// ────────────────────────────────────────────────────────

/**
 * Parse torrent title to extract series info
 * @param {string} title - Torrent title
 * @returns {{ title: string, season: number, episode: number, resolution: string, group: string }}
 */
export function parseTorrentTitle(title) {
    const result = {
        title: '',
        season: 1,
        episode: 0,
        resolution: '',
        group: ''
    }

    // Normalize: remove extra spaces, trim
    let cleanTitle = title.trim()

    // Extract resolution (1080p, 720p, 2160p, 4K, etc.)
    const resolutionMatch = cleanTitle.match(/\b(2160p|1080p|720p|480p|4K|UHD)\b/i)
    if (resolutionMatch) {
        result.resolution = resolutionMatch[1].toLowerCase()
    }

    // Extract release group: [GroupName] or -GROUP at end
    const groupBracketMatch = cleanTitle.match(/^\[([^\]]+)\]/)
    const groupDashMatch = cleanTitle.match(/-([A-Za-z0-9]+)(?:\.[a-z]{2,4})?$/)
    if (groupBracketMatch) {
        result.group = groupBracketMatch[1]
    } else if (groupDashMatch) {
        result.group = groupDashMatch[1]
    }

    // Pattern 1: SxxExx format (Western series)
    // Breaking.Bad.S05E16, Game of Thrones S08E06
    const sxxexxMatch = cleanTitle.match(/[.\s]S(\d{1,2})E(\d{1,3})/i)
    if (sxxexxMatch) {
        result.season = parseInt(sxxexxMatch[1], 10)
        result.episode = parseInt(sxxexxMatch[2], 10)
        // Extract title before SxxExx
        const titlePart = cleanTitle.split(/S\d{1,2}E\d{1,3}/i)[0]
        result.title = cleanTitlePart(titlePart)
        return result
    }

    // Pattern 2: Season X Episode Y (verbose)
    const verboseMatch = cleanTitle.match(/Season\s*(\d+)\s*Episode\s*(\d+)/i)
    if (verboseMatch) {
        result.season = parseInt(verboseMatch[1], 10)
        result.episode = parseInt(verboseMatch[2], 10)
        const titlePart = cleanTitle.split(/Season/i)[0]
        result.title = cleanTitlePart(titlePart)
        return result
    }

    // Pattern 3: Anime style - "Title - 06" or "Title - 06v2"
    // [SubsPlease] One Punch Man - 06 (1080p)
    // Ванпанчмен - 06 [1080p]
    const animeMatch = cleanTitle.match(/(.+?)\s*[-–]\s*(\d{1,4})(?:v\d)?(?:\s|$|\[|\()/)
    if (animeMatch) {
        result.episode = parseInt(animeMatch[2], 10)
        result.title = cleanTitlePart(animeMatch[1])
        return result
    }

    // Pattern 4: Episode at end: "Title Episode 5" or "Title Ep.5"
    const epMatch = cleanTitle.match(/(.+?)\s*(?:Episode|Ep\.?|E)\s*(\d{1,3})/i)
    if (epMatch) {
        result.episode = parseInt(epMatch[2], 10)
        result.title = cleanTitlePart(epMatch[1])
        return result
    }

    // Pattern 5: Just a number at the end (fallback for simple numbering)
    // "Название сериала 05 1080p"
    const simpleNumberMatch = cleanTitle.match(/(.+?)\s+(\d{1,3})\s+(?:\d{3,4}p|\[|$)/i)
    if (simpleNumberMatch) {
        result.episode = parseInt(simpleNumberMatch[2], 10)
        result.title = cleanTitlePart(simpleNumberMatch[1])
        return result
    }

    // Fallback: use full title
    result.title = cleanTitlePart(cleanTitle)
    return result
}

/**
 * Clean title part: remove dots, brackets, extra info
 */
function cleanTitlePart(title) {
    return title
        .replace(/^\[([^\]]+)\]\s*/, '')     // Remove [Group] at start
        .replace(/\./g, ' ')                  // Dots to spaces
        .replace(/\s*\([^)]+\)\s*/g, ' ')    // Remove (year), (1080p), etc.
        .replace(/\s*\[[^\]]+\]\s*/g, ' ')   // Remove [info] blocks
        .replace(/\s+/g, ' ')                 // Multiple spaces to one
        .trim()
}

// ────────────────────────────────────────────────────────
// 🔍 Rule Matching
// ────────────────────────────────────────────────────────

/**
 * Check if parsed torrent matches a rule
 * @param {object} parsed - Parsed torrent info
 * @param {object} rule - Auto-download rule
 * @returns {boolean}
 */
function matchesRule(parsed, rule) {
    // Title match (fuzzy: includes the query)
    const queryLower = rule.query.toLowerCase()
    const titleLower = parsed.title.toLowerCase()
    
    if (!titleLower.includes(queryLower) && !queryLower.includes(titleLower)) {
        // Try matching individual words (at least 2 must match)
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2)
        const titleWords = titleLower.split(/\s+/).filter(w => w.length > 2)
        const matchCount = queryWords.filter(qw => 
            titleWords.some(tw => tw.includes(qw) || qw.includes(tw))
        ).length
        if (matchCount < Math.min(2, queryWords.length)) {
            return false
        }
    }

    // Resolution filter (if specified)
    if (rule.resolution && parsed.resolution) {
        if (!parsed.resolution.includes(rule.resolution.toLowerCase())) {
            return false
        }
    }

    // Group filter (if specified)
    if (rule.group && parsed.group) {
        if (!parsed.group.toLowerCase().includes(rule.group.toLowerCase())) {
            return false
        }
    }

    // Season filter (if specified)
    if (rule.season && parsed.season !== rule.season) {
        return false
    }

    // Episode must be newer than last downloaded
    if (parsed.episode <= rule.lastEpisode) {
        return false
    }

    return true
}

// ────────────────────────────────────────────────────────
// 🚀 Main Check Logic
// ────────────────────────────────────────────────────────

/**
 * Check all rules and download new episodes
 * @returns {Promise<{checked: number, downloaded: number, errors: number}>}
 */
export async function checkRules() {
    await db.read()
    
    const settings = db.data.autoDownloadSettings || { enabled: false }
    const rules = db.data.autoDownloadRules || []

    if (!settings.enabled || rules.length === 0) {
        log.debug('Auto-downloader disabled or no rules', { enabled: settings.enabled, rulesCount: rules.length })
        return { checked: 0, downloaded: 0, errors: 0 }
    }

    log.info('Starting auto-download check', { rulesCount: rules.length })

    let downloaded = 0
    let errors = 0
    const downloadedHashes = new Set(db.data.autoDownloadHistory || [])

    for (const rule of rules) {
        if (!rule.enabled) continue

        try {
            log.debug('Checking rule', { query: rule.query })
            const { results, error } = await searchJacred(rule.query)

            if (error || !results?.length) {
                log.warn('Search failed or empty', { query: rule.query, error })
                continue
            }

            for (const torrent of results) {
                // Skip if already downloaded
                const magnetHash = extractHash(torrent.magnet)
                if (magnetHash && downloadedHashes.has(magnetHash)) {
                    continue
                }

                const parsed = parseTorrentTitle(torrent.title)
                
                if (matchesRule(parsed, rule)) {
                    log.info('Match found!', { 
                        title: parsed.title, 
                        episode: parsed.episode, 
                        torrent: torrent.title 
                    })

                    try {
                        await addTorrent(torrent.magnet)
                        downloaded++

                        // Update rule's last episode
                        rule.lastEpisode = Math.max(rule.lastEpisode, parsed.episode)
                        
                        // Track downloaded hash
                        if (magnetHash) {
                            downloadedHashes.add(magnetHash)
                        }

                        log.info('Downloaded new episode', { 
                            title: rule.query, 
                            episode: parsed.episode 
                        })
                    } catch (err) {
                        log.error('Failed to add torrent', { error: err.message })
                        errors++
                    }
                }
            }
        } catch (err) {
            log.error('Rule check failed', { query: rule.query, error: err.message })
            errors++
        }
    }

    // Save updated rules and history
    db.data.autoDownloadHistory = [...downloadedHashes].slice(-500) // Keep last 500
    await db.write()

    log.info('Auto-download check complete', { downloaded, errors })
    return { checked: rules.length, downloaded, errors }
}

/**
 * Extract infohash from magnet link
 */
function extractHash(magnet) {
    if (!magnet) return null
    const match = magnet.match(/urn:btih:([a-fA-F0-9]{40})/i)
    return match ? match[1].toLowerCase() : null
}

// ────────────────────────────────────────────────────────
// 📋 Rule Management API
// ────────────────────────────────────────────────────────

/**
 * Get all auto-download rules
 */
export async function getRules() {
    await db.read()
    return {
        settings: db.data.autoDownloadSettings || { enabled: false, intervalMinutes: 30 },
        rules: db.data.autoDownloadRules || []
    }
}

/**
 * Add new auto-download rule
 */
export async function addRule(rule) {
    await db.read()
    db.data.autoDownloadRules ||= []
    
    const newRule = {
        id: Date.now(),
        query: rule.query,
        resolution: rule.resolution || '',
        group: rule.group || '',
        season: rule.season || 0,
        lastEpisode: rule.lastEpisode || 0,
        enabled: true,
        createdAt: Date.now()
    }
    
    db.data.autoDownloadRules.push(newRule)
    await db.write()
    
    log.info('Added rule', { query: newRule.query })
    return newRule
}

/**
 * Update existing rule
 */
export async function updateRule(id, updates) {
    await db.read()
    const rules = db.data.autoDownloadRules || []
    const index = rules.findIndex(r => r.id === id)
    
    if (index === -1) {
        throw new Error('Rule not found')
    }
    
    rules[index] = { ...rules[index], ...updates }
    await db.write()
    
    log.info('Updated rule', { id, updates })
    return rules[index]
}

/**
 * Delete rule
 */
export async function deleteRule(id) {
    await db.read()
    const before = db.data.autoDownloadRules?.length || 0
    db.data.autoDownloadRules = (db.data.autoDownloadRules || []).filter(r => r.id !== id)
    
    if (db.data.autoDownloadRules.length < before) {
        await db.write()
        log.info('Deleted rule', { id })
        return true
    }
    return false
}

/**
 * Update global settings
 */
export async function updateSettings(settings) {
    await db.read()
    db.data.autoDownloadSettings = {
        ...db.data.autoDownloadSettings,
        ...settings
    }
    await db.write()
    log.info('Updated settings', settings)
    return db.data.autoDownloadSettings
}
