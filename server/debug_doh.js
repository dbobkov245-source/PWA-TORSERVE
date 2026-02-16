#!/usr/bin/env node
/**
 * debug_doh.js — Diagnostic script for DoH (DNS-over-HTTPS) subsystem
 * STAB-C: Validates DoH resolution works for all tracker hostnames
 *
 * Usage: node server/debug_doh.js
 */

import { resolveIP, getProviderStatus } from './utils/doh.js'

const HOSTNAMES = [
    'jacred.xyz',
    'rutracker.org',
    'rutracker.nl',
    'rutor.info',
    'rutor.is',
    'torlook.info',
    'api.themoviedb.org',
]

async function main() {
    console.log('=== DoH Diagnostic ===\n')

    let passed = 0
    let failed = 0

    for (const hostname of HOSTNAMES) {
        try {
            const ip = await resolveIP(hostname)
            if (ip) {
                console.log(`  ✅ ${hostname} -> ${ip}`)
                passed++
            } else {
                console.log(`  ⚠️  ${hostname} -> null (all providers failed)`)
                failed++
            }
        } catch (err) {
            console.log(`  ❌ ${hostname} -> ERROR: ${err.message}`)
            failed++
        }
    }

    console.log('\n--- DoH Provider Status ---')
    const status = getProviderStatus()
    for (const [name, state] of Object.entries(status)) {
        const icon = state.available ? '🟢' : '🔴'
        console.log(`  ${icon} ${name}: available=${state.available}, failures=${state.failures}, circuitOpen=${state.circuitOpen}`)
    }

    console.log(`\n--- Summary: ${passed} passed, ${failed} failed ---`)
    process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
    console.error('Fatal:', err.message)
    process.exit(1)
})
