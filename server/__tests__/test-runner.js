/**
 * Unit Tests for PWA-TorServe Server
 * 
 * Run with: node --experimental-vm-modules server/__tests__/run-tests.js
 * 
 * Note: These are simple assertion-based tests that work without Jest/Vitest
 *       to avoid npm install requirements on NAS
 */

const tests = []
let passed = 0
let failed = 0

// Test registration helper
function test(name, fn) {
    tests.push({ name, fn })
}

// Assertion helpers
function expect(actual) {
    return {
        toBe: (expected) => {
            if (actual !== expected) {
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
            }
        },
        toEqual: (expected) => {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
            }
        },
        toBeTruthy: () => {
            if (!actual) {
                throw new Error(`Expected truthy value, got ${JSON.stringify(actual)}`)
            }
        },
        toBeFalsy: () => {
            if (actual) {
                throw new Error(`Expected falsy value, got ${JSON.stringify(actual)}`)
            }
        },
        toContain: (expected) => {
            if (!actual.includes(expected)) {
                throw new Error(`Expected "${actual}" to contain "${expected}"`)
            }
        },
        toBeGreaterThan: (expected) => {
            if (actual <= expected) {
                throw new Error(`Expected ${actual} to be greater than ${expected}`)
            }
        },
        toBeNull: () => {
            if (actual !== null) {
                throw new Error(`Expected null, got ${JSON.stringify(actual)}`)
            }
        },
        toBeDefined: () => {
            if (actual === undefined) {
                throw new Error(`Expected value to be defined`)
            }
        }
    }
}

// Run all tests
async function runTests() {
    console.log('\n🧪 PWA-TorServe Test Suite\n')
    console.log('═'.repeat(50))

    for (const { name, fn } of tests) {
        try {
            await fn()
            console.log(`✅ ${name}`)
            passed++
        } catch (err) {
            console.log(`❌ ${name}`)
            console.log(`   └─ ${err.message}`)
            failed++
        }
    }

    console.log('═'.repeat(50))
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${tests.length} total\n`)

    if (failed > 0) {
        process.exit(1)
    }
}

// Export for test files
export { test, expect, runTests }
