#!/usr/bin/env node
/**
 * test_providers.js — Smoke test for all torrent providers
 * STAB-C: Runs a search on each provider and reports status
 *
 * Usage: node server/test_providers.js [query]
 * Default query: "dune"
 */

import { providerManager } from './providers/index.js'

const query = process.argv[2] || 'dune'

async function main() {
    console.log(`=== Provider Smoke Test (query: "${query}") ===\n`)

    const all = providerManager.getAll()
    let passed = 0
    let skipped = 0
    let failed = 0

    for (const provider of all) {
        const name = provider.name.padEnd(12)

        // Check if provider is disabled/not_configured
        if (!provider.enabled) {
            const reason = provider.disableReason || 'disabled'
            console.log(`  ⏭️  ${name} SKIPPED (${reason})`)
            skipped++
            continue
        }

        const start = Date.now()
        try {
            const results = await provider.search(query)
            const ms = Date.now() - start

            if (results.length > 0) {
                console.log(`  ✅ ${name} ok       count=${results.length}  (${ms}ms)`)
                // Show first result as sample
                const first = results[0]
                console.log(`     └─ "${first.title.substring(0, 60)}..." seeders=${first.seeders} magnet=${first.magnet ? 'yes' : 'no'}`)
                passed++
            } else {
                console.log(`  ⚪ ${name} empty    count=0  (${ms}ms)`)
                passed++ // empty is not a failure
            }
        } catch (err) {
            const ms = Date.now() - start
            console.log(`  ❌ ${name} error    ${err.message}  (${ms}ms)`)
            failed++
        }
    }

    console.log(`\n--- Summary: ${passed} ok, ${skipped} skipped, ${failed} failed ---`)
    console.log(`    Total providers: ${all.length}`)
    console.log(`    Enabled: ${all.filter(p => p.enabled).length}`)
    console.log(`    Disabled: ${all.filter(p => !p.enabled).length}`)

    // Show env hints for disabled providers
    const disabled = all.filter(p => !p.enabled)
    if (disabled.length > 0) {
        console.log('\n--- Enable hints ---')
        for (const p of disabled) {
            if (p.name === 'torlook') {
                console.log(`  ${p.name}: set TORLOOK_ENABLED=1`)
            } else if (p.name === 'rutracker') {
                console.log(`  ${p.name}: set RUTRACKER_LOGIN and RUTRACKER_PASSWORD`)
            } else if (p.name === 'torznab') {
                console.log(`  ${p.name}: set TORZNAB_ENABLED=1, TORZNAB_URL, TORZNAB_API_KEY`)
            }
        }
    }

    process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
    console.error('Fatal:', err.message)
    process.exit(1)
})
