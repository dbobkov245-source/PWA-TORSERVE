/**
 * Auto-Downloader Module v2.7.0 - MULTI-SOURCE
 * PWA-TorServe
 *
 * 🆕 v2.7.0 FEATURES:
 * - MULTI-SOURCE: Uses Aggregator (Jacred + RuTracker + future providers)
 * - PARTIAL SUCCESS: Works even if some providers fail
 * - DEDUPLICATION: Results deduplicated by infohash across providers
 *
 * 🆕 v2.6.7 FIXES:
 * - FIX: Translation now returns ARRAY ["Fallout", "Fallout S02"]
 * - FIX: Base name searched first (finds Russian releases like "Фоллаут 2 сезон")
 *
 * 🆕 v2.6.6 FEATURES:
 * - SMART QUERY: Auto-removes quality tags (DV, HDR, HMAX, WEB etc.)
 * - MULTI-VARIANT: Tries multiple query variants for better results
 *
 * 🆕 v2.6.3 OPTIMIZATIONS:
 * - ATOMIC WRITES: Grouped DB updates to prevent race conditions & corruption
 * - LOGIC FIX: lastEpisode is no longer updated by REPACK releases
 */

import { db, safeWrite } from './db.js'
import { search as aggregatorSearch } from './aggregator.js'
import { addTorrent } from './torrent.js'
import { logger } from './utils/logger.js'

const log = logger.child('AutoDownloader')

// Runtime DEBUG toggle
const DEBUG = process.env.AUTO_DL_DEBUG === '1'
const MAX_DOWNLOADS_PER_RULE = 1  // Only download the BEST torrent per episode

// Keywords detection
const BATCH_KEYWORDS = /complete|season|batch|pack|collection|全集|box[\s\.]?set/i
const FIX_KEYWORDS = /repack|proper|rerip|real\.proper|internal/i

// Global blacklist (defaults)
const GLOBAL_BLACKLIST = [
    'camrip', 'cam', 'hdcam',
    'ts', 'hdts', 'telesync',
    'tc', 'telecine',
    'workprint', 'screener',
    'hindi', 'tamil', 'telugu', 'dubbed',
    'linedub', 'korean', 'chinese',
    'sample', 'trailer'
]

// REPACK window (hours)
const REPACK_WINDOW_HOURS = 72  // 3 days

// ────────────────────────────────────────────────────────
// � Query Normalization for Better Search Results
// ────────────────────────────────────────────────────────

/**
 * Normalize search query by removing quality tags, codecs, groups etc.
 * This helps find results on jacred.xyz which doesn't parse these tags.
 * 
 * Examples:
 * - "IT Welcome to Derry S01 HMAX DV HDR WEB" → "Welcome to Derry S01"
 * - "Фоллаут 2" → "Фоллаут 2" (unchanged, but we'll try English too)
 */
function normalizeQuery(query) {
    let normalized = query.trim()

    // Remove quality/codec tags (case insensitive)
    const removeTags = [
        // Quality
        /\b(2160p|1080p|720p|480p|4k|uhd)\b/gi,
        // HDR variants
        /\b(hdr10\+?|hdr|dv|dolby\s*vision|hlg)\b/gi,
        // Codecs
        /\b(hevc|h\.?265|x\.?265|h\.?264|x\.?264|av1|avc)\b/gi,
        // Audio
        /\b(atmos|truehd|dts-?hd|dts|aac|ac3|eac3|flac)\b/gi,
        // Source tags (including standalone WEB)
        /\b(web-?dl|web-?rip|webrip|web|blu-?ray|bdrip|hdtv|dvdrip|hdrip|remux)\b/gi,
        // Streaming services
        /\b(hmax|hbo|netflix|nf|amzn|amazon|atvp|dsnp|disney\+?|hulu|paramount\+?)\b/gi,
        // Release groups (at end)
        /-[a-z0-9]+$/i,
        // Release groups in brackets
        /\[[^\]]+\]$/g,
        // "IT" prefix (often means International)
        /^IT\s+/i,
    ]

    for (const pattern of removeTags) {
        normalized = normalized.replace(pattern, '')
    }

    // Clean up multiple spaces and trim
    normalized = normalized.replace(/\s+/g, ' ').trim()

    // Remove trailing/leading dashes and dots
    normalized = normalized.replace(/^[\s.\-]+|[\s.\-]+$/g, '').trim()

    return normalized
}

// ────────────────────────────────────────────────────────
// 🌐 RU→EN Translation Dictionary for Popular Titles
// ────────────────────────────────────────────────────────

const RU_EN_TRANSLATIONS = {
    // Popular series
    'фоллаут': 'Fallout',
    'fallout': 'Fallout',
    'ведьмак': 'The Witcher',
    'игра престолов': 'Game of Thrones',
    'дом дракона': 'House of the Dragon',
    'мандалорец': 'The Mandalorian',
    'локи': 'Loki',
    'ванда вижн': 'WandaVision',
    'соколиный глаз': 'Hawkeye',
    'лунный рыцарь': 'Moon Knight',
    'мисс марвел': 'Ms Marvel',
    'женщина халк': 'She Hulk',
    'секретное вторжение': 'Secret Invasion',
    'агата': 'Agatha All Along',
    'звёздные войны': 'Star Wars',
    'звездные войны': 'Star Wars',
    'оби ван': 'Obi-Wan Kenobi',
    'асока': 'Ahsoka',
    'андор': 'Andor',
    'аколит': 'The Acolyte',
    'скелетон крю': 'Skeleton Crew',
    'кольца власти': 'Rings of Power',
    'властелин колец': 'Lord of the Rings',
    'последние из нас': 'The Last of Us',
    'одни из нас': 'The Last of Us',
    'последний из нас': 'The Last of Us',
    'ходячие мертвецы': 'The Walking Dead',
    'очень странные дела': 'Stranger Things',
    'чёрное зеркало': 'Black Mirror',
    'черное зеркало': 'Black Mirror',
    'бумажный дом': 'Money Heist',
    'ла каса де папель': 'Money Heist',
    'во все тяжкие': 'Breaking Bad',
    'лучше звоните солу': 'Better Call Saul',
    'острые козырьки': 'Peaky Blinders',
    'викинги': 'Vikings',
    'корона': 'The Crown',
    'эйфория': 'Euphoria',
    'сукасияние': 'The Shining', // :)
    'сияние': 'The Shining',
    'оно': 'IT',
    'пенниуайз': 'Pennywise',
    'добро пожаловать в дерри': 'Welcome to Derry',
    // Movies
    'дюна': 'Dune',
    'аватар': 'Avatar',
    'мстители': 'Avengers',
    'человек паук': 'Spider-Man',
    'бэтмен': 'Batman',
    'джокер': 'Joker',
    'супермен': 'Superman',
    // Add more as needed
}

/**
 * Translate Russian query to English using dictionary
 * 🆕 v2.6.7: Returns array of variants (with season AND without)
 */
function translateRuToEn(query) {
    const lowerQuery = query.toLowerCase().trim()
    const variants = []

    // Check for exact match first
    if (RU_EN_TRANSLATIONS[lowerQuery]) {
        variants.push(RU_EN_TRANSLATIONS[lowerQuery])
        return variants
    }

    // Check for partial matches (title + season)
    for (const [ru, en] of Object.entries(RU_EN_TRANSLATIONS)) {
        if (lowerQuery.startsWith(ru)) {
            // Always add base English name first (most likely to find results)
            variants.push(en)

            // Extract season/episode info after the title
            const suffix = lowerQuery.slice(ru.length).trim()
            const seasonMatch = suffix.match(/(?:сезон\s*)?(\d+)/i)
            if (seasonMatch) {
                // Also add with season format (e.g., "Fallout S02")
                variants.push(`${en} S${seasonMatch[1].padStart(2, '0')}`)
            }

            return variants
        }
    }

    return []  // Return empty array if no translation found
}

/**
 * Generate query variants to try (for better search coverage)
 * Returns array of queries to try in order
 * 🆕 v2.6.7: Translation returns array of variants
 */
function generateQueryVariants(query) {
    const variants = []
    const normalized = normalizeQuery(query)

    // 1. Try English translations first (most likely to find results)
    const englishTranslations = translateRuToEn(normalized || query)
    if (englishTranslations.length > 0) {
        variants.push(...englishTranslations)
    }

    // 2. Normalized query (without tags)
    if (normalized && normalized !== query && !variants.includes(normalized)) {
        variants.push(normalized)
    }

    // 3. Original query (might work if user entered it correctly)
    if (!variants.includes(query)) {
        variants.push(query)
    }

    // 4. If query has season info, try without it
    const seasonMatch = query.match(/S(\d{1,2})/i) || query.match(/Season\s*(\d+)/i)
    if (seasonMatch) {
        const withoutSeason = normalized
            .replace(/S\d{1,2}/i, '')
            .replace(/Season\s*\d+/i, '')
            .replace(/\s+/g, ' ')
            .trim()
        if (withoutSeason && !variants.includes(withoutSeason)) {
            // Also try English translation without season
            const enWithoutSeason = translateRuToEn(withoutSeason)
            for (const tr of enWithoutSeason) {
                if (!variants.includes(tr)) {
                    variants.push(tr)
                }
            }
            variants.push(withoutSeason)
        }
    }

    // Remove duplicates while preserving order
    return [...new Set(variants)]
}

// ────────────────────────────────────────────────────────
// 📦 Size Helpers
// ────────────────────────────────────────────────────────

function parseSizeStringToBytes(sizeStr) {
    if (!sizeStr || typeof sizeStr !== 'string') return 0
    const normalized = sizeStr.replace(',', '.').trim()
    const match = normalized.match(/([\d.]+)\s*(GB|MB|KB|TB)/i)
    if (!match) return 0

    const num = parseFloat(match[1])
    const unit = match[2].toUpperCase()
    const mult = { 'KB': 1024, 'MB': 1024 ** 2, 'GB': 1024 ** 3, 'TB': 1024 ** 4 }
    return num * (mult[unit] || 1)
}

/**
 * Extract size in GB from normalized or raw provider result
 * Uses sizeBytes when available, falls back to parsing size string.
 */
export function getSizeGBFromResult(result) {
    if (!result) return 0
    if (typeof result.sizeBytes === 'number' && result.sizeBytes > 0) {
        return result.sizeBytes / (1024 ** 3)
    }
    if (typeof result.Size === 'number' && result.Size > 0) {
        return result.Size / (1024 ** 3)
    }

    const sizeStr =
        (typeof result.size === 'string' && result.size) ||
        (typeof result.Size === 'string' && result.Size) ||
        ''

    const bytes = parseSizeStringToBytes(sizeStr)
    return bytes > 0 ? bytes / (1024 ** 3) : 0
}

// ────────────────────────────────────────────────────────
// 📺 Enhanced Title Parser
// ────────────────────────────────────────────────────────

export function parseTorrentTitle(title, sizeFromAPI = 0) {
    const result = {
        title: '',
        season: null,
        episode: 0,
        resolution: '',
        group: '',
        qualityScore: 0,
        sizeGB: sizeFromAPI,
        isHevc: false,
        isBatch: false,
        isRepack: false,
        _raw: title
    }

    let cleanTitle = title.trim()

    // Detect REPACK/PROPER
    result.isRepack = FIX_KEYWORDS.test(cleanTitle)

    // Batch detection
    result.isBatch = BATCH_KEYWORDS.test(cleanTitle)

    // Quality score extraction
    if (/2160p|4k|uhd/i.test(cleanTitle)) {
        result.qualityScore = 4
        result.resolution = '2160p'
    } else if (/1080p/i.test(cleanTitle)) {
        result.qualityScore = 3
        result.resolution = '1080p'
    } else if (/720p/i.test(cleanTitle)) {
        result.qualityScore = 2
        result.resolution = '720p'
    } else if (/480p/i.test(cleanTitle)) {
        result.qualityScore = 1
        result.resolution = '480p'
    }

    // HEVC detection
    result.isHevc = /x265|hevc/i.test(cleanTitle)

    // Size extraction
    if (!result.sizeGB) {
        const sizeMatch = cleanTitle.match(/(\d+(?:\.\d+)?)\s*(GB|GiB)/i)
        if (sizeMatch) {
            result.sizeGB = parseFloat(sizeMatch[1])
        }
    }

    // Release group extraction
    const groupBracketMatch = cleanTitle.match(/^\[([^\]]+)\]/)
    const groupDashMatch = cleanTitle.match(/-([A-Za-z0-9]+)(?:\.[a-z]{2,4})?$/)
    if (groupBracketMatch) {
        result.group = groupBracketMatch[1]
    } else if (groupDashMatch) {
        result.group = groupDashMatch[1]
    }

    // Pattern 1: SxxExx
    const sxxexxMatch = cleanTitle.match(/[\.\s]S(\d{1,2})E(\d{1,3})/i)
    if (sxxexxMatch) {
        result.season = parseInt(sxxexxMatch[1], 10)
        result.episode = parseInt(sxxexxMatch[2], 10)
        const titlePart = cleanTitle.split(/S\d{1,2}E\d{1,3}/i)[0]
        result.title = cleanTitlePart(titlePart)
        return result
    }

    // Pattern 2: Season X Episode Y
    const verboseMatch = cleanTitle.match(/Season\s*(\d+)\s*Episode\s*(\d+)/i)
    if (verboseMatch) {
        result.season = parseInt(verboseMatch[1], 10)
        result.episode = parseInt(verboseMatch[2], 10)
        const titlePart = cleanTitle.split(/Season/i)[0]
        result.title = cleanTitlePart(titlePart)
        return result
    }

    // Pattern 3: Anime style
    const animeMatch = cleanTitle.match(/(.+?)\s*[-–]\s*(\d{1,4})(?:v\d)?(?:\s|$|\[|\()/)
    if (animeMatch) {
        result.episode = parseInt(animeMatch[2], 10)
        result.title = cleanTitlePart(animeMatch[1])
        return result
    }

    // Pattern 4: Episode keyword
    const epMatch = cleanTitle.match(/(.+?)\s*(?:Episode|Ep\.?|E)\s*(\d{1,3})/i)
    if (epMatch) {
        result.episode = parseInt(epMatch[2], 10)
        result.title = cleanTitlePart(epMatch[1])
        return result
    }

    // Pattern 5: Simple number
    const simpleNumberMatch = cleanTitle.match(/(.+?)\s+(\d{1,3})\s+(?:\d{3,4}p|\[|$)/i)
    if (simpleNumberMatch) {
        result.episode = parseInt(simpleNumberMatch[2], 10)
        result.title = cleanTitlePart(simpleNumberMatch[1])
        return result
    }

    // Pattern 6: Season pack without explicit episode
    const seasonOnlyMatch = cleanTitle.match(/(?:^|[\.\s])S(\d{1,2})(?!E\d{1,3})(?:[\.\s]|$)/i)
    if (seasonOnlyMatch) {
        result.season = parseInt(seasonOnlyMatch[1], 10)
        result.episode = 0
        result.isBatch = true
        const titlePart = cleanTitle.split(/(?:^|[\.\s])S\d{1,2}(?!E\d{1,3})(?:[\.\s]|$)/i)[0]
        result.title = cleanTitlePart(titlePart)
        return result
    }

    // Generic fallback
    result.title = cleanTitlePart(cleanTitle)
    return result
}

function cleanTitlePart(title) {
    return title
        .replace(/^\[([^\]]+)\]\s*/, '')
        .replace(/\./g, ' ')
        .replace(/\s*\([^)]+\)\s*/g, ' ')
        .replace(/\s*\[[^\]]+\]\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

// ────────────────────────────────────────────────────────
// 🔍 Enhanced Rule Matching
// ────────────────────────────────────────────────────────

function matchesRule(parsed, rule) {
    // 1. Blacklist Check
    const globalBlacklist = db.data.autoDownloadSettings?.globalBlacklist || GLOBAL_BLACKLIST
    const ruleBlacklist = rule.excludeKeywords || []
    const combinedBlacklist = [...globalBlacklist, ...ruleBlacklist]

    if (combinedBlacklist.length > 0) {
        const lowerTitle = parsed._raw.toLowerCase()
        const blockedKeyword = combinedBlacklist.find(keyword =>
            lowerTitle.includes(keyword.toLowerCase())
        )
        if (blockedKeyword) {
            if (DEBUG) log.debug('❌ Excluded by keyword', { keyword: blockedKeyword })
            return false
        }
    }

    // 2. Batch detection
    if (parsed.isBatch && rule.lastEpisode > 0) {
        if (DEBUG) log.debug('❌ Batch detected, skipping')
        return false
    }

    // 3. Block REPACKs if no original downloaded yet
    if (parsed.isRepack && rule.lastEpisode === 0) {
        if (DEBUG) log.debug('❌ REPACK not allowed (no original downloaded yet)', { episode: parsed.episode })
        return false
    }

    // 4. Title fuzzy matching
    const queryLower = rule.query.toLowerCase()
    const titleLower = parsed.title.toLowerCase()

    const hasExactMatch =
        queryLower.length > 3 &&
        (titleLower.includes(queryLower) || queryLower.includes(titleLower))

    if (!hasExactMatch) {
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2)
        const titleWords = titleLower.split(/\s+/).filter(w => w.length > 2)

        if (queryWords.length === 0) {
            if (DEBUG) log.debug('❌ Query too short')
            return false
        }

        const matchCount = queryWords.filter(qw =>
            titleWords.some(tw => tw.includes(qw) || qw.includes(tw))
        ).length

        const minMatches = Math.max(1, Math.ceil(queryWords.length * 0.5))

        if (matchCount < minMatches) {
            if (DEBUG) log.debug('❌ Title mismatch')
            return false
        }
    }

    // 5. Quality/Resolution Filters
    if (rule.quality && rule.quality !== 'any') {
        const requiredQuality = {
            '4k': 4, '2160p': 4,
            '1080p': 3, '720p': 2, '480p': 1
        }[rule.quality.toLowerCase()]

        // Strict mode: Allow equal or better quality
        if (rule.strictQuality && requiredQuality) {
            if (parsed.qualityScore < requiredQuality) {
                if (DEBUG) log.debug('❌ Strict quality filter (below minimum)', {
                    required: rule.quality,
                    requiredScore: requiredQuality,
                    gotScore: parsed.qualityScore
                })
                return false
            }
        }
    }

    // 6. Resolution filter (strict: if rule requires resolution, torrent must have it)
    if (rule.resolution && rule.resolution.trim() !== '') {
        if (!parsed.resolution) {
            if (DEBUG) log.debug('❌ Resolution required but not found')
            return false
        }
        if (!parsed.resolution.includes(rule.resolution.toLowerCase())) {
            if (DEBUG) log.debug('❌ Resolution mismatch')
            return false
        }
    }

    // 7. Group Filter
    if (rule.group && rule.group.trim() !== '') {
        if (parsed.group && !parsed.group.toLowerCase().includes(rule.group.toLowerCase())) {
            if (DEBUG) log.debug('❌ Group mismatch')
            return false
        }
    }

    // 8. Season Filter
    if (rule.season && rule.season > 0) {
        if (parsed.season === null) {
            if (DEBUG) log.debug('❌ Season required but not parsed')
            return false
        }
        if (parsed.season !== rule.season) {
            if (DEBUG) log.debug('❌ Season mismatch')
            return false
        }
    }

    // 9. Episode Check with Smart REPACK Handling
    if (parsed.episode > 0 && parsed.episode <= rule.lastEpisode) {
        if (parsed.isRepack) {
            const timestampKey = `${rule.id}_${parsed.episode}`
            const lastDownloadTime = db.data.autoDownloadTimestamps?.[timestampKey] || 0
            const hoursSinceDownload = (Date.now() - lastDownloadTime) / (1000 * 60 * 60)

            if (hoursSinceDownload < REPACK_WINDOW_HOURS) {
                if (DEBUG) log.debug('✅ REPACK allowed (within window)', {
                    hoursSince: Math.round(hoursSinceDownload)
                })
                return true
            } else {
                if (DEBUG) log.debug('❌ REPACK too old', {
                    hoursSince: Math.round(hoursSinceDownload)
                })
                return false
            }
        }

        if (DEBUG) log.debug('❌ Episode too old')
        return false
    }

    if (parsed.episode === 0 && rule.lastEpisode > 0 && !parsed.isBatch) {
        if (DEBUG) log.debug('⚠️ Unknown episode detected, allowing')
    }

    return true
}

// ────────────────────────────────────────────────────────
// 🏆 Smart Candidate Selection
// ────────────────────────────────────────────────────────

function selectBestCandidate(candidates, rule) {
    if (candidates.length === 0) return null
    if (candidates.length === 1) return candidates[0]

    candidates.sort((a, b) => {
        // 1. Quality
        if (b.parsed.qualityScore !== a.parsed.qualityScore) {
            return b.parsed.qualityScore - a.parsed.qualityScore
        }
        // 2. HEVC Preference
        if (rule.preferHevc) {
            if (b.parsed.isHevc !== a.parsed.isHevc) {
                return (b.parsed.isHevc ? 1 : 0) - (a.parsed.isHevc ? 1 : 0)
            }
        }
        // 3. Size
        if (b.parsed.sizeGB !== a.parsed.sizeGB) {
            return b.parsed.sizeGB - a.parsed.sizeGB
        }
        // 4. Non-HEVC Fallback
        if (!rule.preferHevc) {
            if (a.parsed.isHevc !== b.parsed.isHevc) {
                return (a.parsed.isHevc ? 1 : 0) - (b.parsed.isHevc ? 1 : 0)
            }
        }
        return 0
    })

    return candidates[0]
}

// ────────────────────────────────────────────────────────
// 🚀 Main Check Logic
// ────────────────────────────────────────────────────────

export async function checkRules() {
    await db.read()

    const settings = db.data.autoDownloadSettings || { enabled: false }
    const rules = db.data.autoDownloadRules || []

    if (!settings.enabled || rules.length === 0) {
        return { checked: 0, downloaded: 0, errors: 0 }
    }

    db.data.autoDownloadTimestamps ||= {}

    log.info('🔍 Starting auto-download check', { rulesCount: rules.length })

    let downloaded = 0
    let errors = 0
    let totalTorrentsChecked = 0
    const downloadedHashes = new Set(db.data.autoDownloadHistory || [])

    for (const rule of rules) {
        if (!rule.enabled) continue

        try {
            // Generate query variants (normalized, original, without season)
            const queryVariants = generateQueryVariants(rule.query)

            log.info('🔍 Checking rule', {
                query: rule.query,
                variants: queryVariants,
                lastEpisode: rule.lastEpisode
            })

            // Try each query variant until we get results
            let results = []
            let usedQuery = null

            for (const variant of queryVariants) {
                log.info('🔎 Trying query variant', { variant })
                const searchResult = await aggregatorSearch(variant, { background: true })

                if (searchResult.results && searchResult.results.length > 0) {
                    results = searchResult.results
                    usedQuery = variant
                    log.info('✅ Found results with variant', {
                        variant,
                        count: results.length,
                        providers: Object.keys(searchResult.providers || {})
                    })
                    break
                }

                // Small delay between variants to avoid rate limiting
                await new Promise(r => setTimeout(r, 1000))
            }

            if (results.length === 0) {
                log.warn('⚠️ No results found for any variant', {
                    originalQuery: rule.query,
                    triedVariants: queryVariants
                })
                continue
            }

            log.info('📦 Search results', { usedQuery, count: results.length })

            // Group candidates
            const episodeCandidates = new Map()
            let unknownEpisodeCounter = 0

            for (const torrent of results) {
                totalTorrentsChecked++

                const magnetHash = extractHash(torrent.magnet)
                if (magnetHash && downloadedHashes.has(magnetHash)) {
                    if (DEBUG) log.debug('⏭️ Already downloaded')
                    continue
                }

                const sizeGB = getSizeGBFromResult(torrent)
                const parsed = parseTorrentTitle(torrent.title, sizeGB)

                if (matchesRule(parsed, rule)) {
                    let episodeKey
                    if (parsed.episode > 0) {
                        episodeKey = `e${parsed.episode}`
                    } else {
                        episodeKey = `unknown_${unknownEpisodeCounter++}`
                    }

                    if (!episodeCandidates.has(episodeKey)) {
                        episodeCandidates.set(episodeKey, [])
                    }
                    episodeCandidates.get(episodeKey).push({ torrent, parsed })
                }
            }

            // Process best candidates
            let downloadsThisRule = 0

            for (const [episodeKey, candidates] of episodeCandidates.entries()) {
                if (downloadsThisRule >= MAX_DOWNLOADS_PER_RULE) break

                const best = selectBestCandidate(candidates, rule)
                if (!best) continue

                log.info('🎯 MATCH FOUND', {
                    title: best.parsed.title,
                    episode: best.parsed.episode,
                    repack: best.parsed.isRepack
                })

                try {
                    await addTorrent(best.torrent.magnet)
                    downloaded++
                    downloadsThisRule++

                    // 🚀 ATOMIC WRITE BLOCK
                    let dbChanged = false

                    // 1. Update lastEpisode (Only for originals)
                    // Prevents REPACKs from incorrectly advancing the episode counter
                    if (best.parsed.episode > 0 && !best.parsed.isRepack) {
                        rule.lastEpisode = Math.max(rule.lastEpisode, best.parsed.episode)
                        dbChanged = true
                    }

                    // 2. Update Timestamp (Only for originals or safety fill)
                    if (best.parsed.episode > 0 && !best.parsed.isRepack) {
                        const timestampKey = `${rule.id}_${best.parsed.episode}`
                        if (!db.data.autoDownloadTimestamps[timestampKey]) {
                            db.data.autoDownloadTimestamps[timestampKey] = Date.now()
                            dbChanged = true
                        }
                    }

                    // 3. Update History
                    const magnetHash = extractHash(best.torrent.magnet)
                    if (magnetHash) {
                        downloadedHashes.add(magnetHash)
                        db.data.autoDownloadHistory = [...downloadedHashes].slice(-500)
                        dbChanged = true
                    }

                    // 4. Perform Atomic Write
                    if (dbChanged) {
                        await safeWrite(db)
                    }

                    log.info('✅ Download started')
                } catch (err) {
                    log.error('❌ Failed to add torrent', { error: err.message })
                    errors++
                }
            }

        } catch (err) {
            log.error('❌ Rule check error', { error: err.message })
            errors++
        }
    }

    log.info('✅ Check complete', { downloaded, errors, torrentsChecked: totalTorrentsChecked })
    return { checked: rules.length, downloaded, errors }
}

/**
 * Extract infohash from magnet link
 * Supports both hex (40 chars) and base32 (32 chars) formats
 */
function extractHash(magnet) {
    if (!magnet) return null
    // Try hex format first (40 chars)
    const hexMatch = magnet.match(/urn:btih:([a-fA-F0-9]{40})/i)
    if (hexMatch) return hexMatch[1].toLowerCase()
    // Try base32 format (32 chars)
    const base32Match = magnet.match(/urn:btih:([A-Z2-7]{32})/i)
    if (base32Match) return base32Match[1].toLowerCase()
    return null
}

// ────────────────────────────────────────────────────────
// 📋 Rule Management API
// ────────────────────────────────────────────────────────

export async function getRules() {
    await db.read()
    return {
        settings: db.data.autoDownloadSettings || {
            enabled: false,
            intervalMinutes: 30,
            globalBlacklist: GLOBAL_BLACKLIST
        },
        rules: db.data.autoDownloadRules || []
    }
}

export async function addRule(rule) {
    await db.read()
    db.data.autoDownloadRules ||= []

    const newRule = {
        id: Date.now(),
        query: rule.query,
        quality: rule.quality || '',
        strictQuality: rule.strictQuality || false,
        preferHevc: rule.preferHevc || false,
        excludeKeywords: rule.excludeKeywords || [],
        resolution: rule.resolution || '',
        group: rule.group || '',
        season: rule.season || 0,
        lastEpisode: rule.lastEpisode || 0,
        enabled: true,
        createdAt: Date.now()
    }

    db.data.autoDownloadRules.push(newRule)
    await safeWrite(db)
    return newRule
}

export async function updateRule(id, updates) {
    await db.read()
    const rules = db.data.autoDownloadRules || []
    const index = rules.findIndex(r => r.id === id)

    if (index === -1) throw new Error('Rule not found')

    rules[index] = { ...rules[index], ...updates }
    await safeWrite(db)
    return rules[index]
}

export async function deleteRule(id) {
    await db.read()
    const before = db.data.autoDownloadRules?.length || 0
    db.data.autoDownloadRules = (db.data.autoDownloadRules || []).filter(r => r.id !== id)

    if (db.data.autoDownloadRules.length < before) {
        await safeWrite(db)
        return true
    }
    return false
}

export async function updateSettings(settings) {
    await db.read()
    db.data.autoDownloadSettings = {
        ...db.data.autoDownloadSettings,
        ...settings
    }
    await safeWrite(db)
    return db.data.autoDownloadSettings
}
