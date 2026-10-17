/**
 * Jacred query shape.
 *
 * A bare `Query=F1` makes jac.red match the phrase against release names and
 * returned 2 one-seeder releases literally called "F1 / F1". Lampa adds
 * `title` + `title_original`, which matches the film's title field instead:
 * 74 releases, top one 7187 seeders ("Формула-1 / F1: The Movie"). Measured
 * live 2026-10-11.
 */

import assert from 'node:assert/strict'
import { test } from './test-runner.js'

// The shared jac.red gate spaces requests ~1s apart; these tests run without pauses.
const UNTHROTTLED = { minIntervalMs: 0 }

function jacredResponse(results) {
    return new Response(JSON.stringify({ Results: results }), { status: 200 })
}

const release = (title, seeders) => ({
    Guid: title, Title: title, Size: 1, Seeders: seeders, Tracker: 'rutor',
    MagnetUri: `magnet:?xt=urn:btih:${String(seeders).padStart(40, '0')}`
})

async function withFetch(impl, run) {
    const original = globalThis.fetch
    globalThis.fetch = impl
    try { return await run() } finally { globalThis.fetch = original }
}

test('jacred is asked by title the way Lampa asks it', async () => {
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const urls = []
    const results = await withFetch(async (url) => {
        urls.push(new URL(url))
        return jacredResponse([release('F1 / F1: The Movie (2025) WEB-DL 1080p', 7187)])
    }, () => new JacredProvider(UNTHROTTLED).search('F1'))

    assert.equal(urls.length, 1)
    assert.equal(urls[0].searchParams.get('Query'), 'F1')
    assert.equal(urls[0].searchParams.get('title'), 'F1')
    assert.equal(urls[0].searchParams.get('title_original'), 'F1')
    assert.equal(results[0].seeders, 7187)
})

test('a title search that finds nothing falls back to the bare phrase query', async () => {
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const urls = []
    const results = await withFetch(async (url) => {
        const parsed = new URL(url)
        urls.push(parsed)
        return parsed.searchParams.has('title')
            ? jacredResponse([])
            : jacredResponse([release('Andor S01 1080p', 40)])
    }, () => new JacredProvider(UNTHROTTLED).search('Andor season 1'))

    assert.equal(urls.length, 2)
    assert.equal(urls[1].searchParams.get('title'), null)
    assert.equal(results.length, 1)
})

test('the 50-result cap keeps the best-seeded releases, not the first ones', async () => {
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const many = Array.from({ length: 60 }, (_, i) => release(`F1 rip ${i}`, i))
    const results = await withFetch(async () => jacredResponse(many), () => new JacredProvider(UNTHROTTLED).search('F1'))

    assert.equal(results.length, 50)
    assert.equal(results[0].seeders, 59)
    assert.ok(results.every(r => r.seeders >= 10))
})

// ─── Structured title search + release info (what Lampa reads) ───────────
//
// Fixture: a real jac.red answer for "Dune: Part Two" (2024), trimmed.
// jac.red already knows each release's quality, HDR, voice-overs and the
// ffprobe streams; we used to drop all of it and guess from the title.

import { readFileSync } from 'node:fs'

const dune = JSON.parse(readFileSync(new URL('./fixtures/jacred-dune2-release.json', import.meta.url), 'utf8'))
const [uhdHdr, withCoverArt, sevenOne, noProbe] = dune.Results
const duneContext = { title: 'Дюна: Часть вторая', originalTitle: 'Dune: Part Two', year: 2024, isSerial: false }

test('a movie search sends the film identity in one request, as Lampa does', async () => {
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const urls = []
    await withFetch(async (url) => {
        urls.push(new URL(url))
        return jacredResponse(dune.Results)
    }, () => new JacredProvider(UNTHROTTLED).search('Dune: Part Two', duneContext))

    assert.equal(urls.length, 1)
    const params = urls[0].searchParams
    assert.equal(params.get('Query'), 'Dune: Part Two')
    assert.equal(params.get('title'), 'Дюна: Часть вторая')
    assert.equal(params.get('title_original'), 'Dune: Part Two')
    assert.equal(params.get('year'), '2024')
    assert.equal(params.get('is_serial'), '1')
    assert.equal(params.get('Category[]'), '2000')
})

test('a series search asks for series', async () => {
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const urls = []
    await withFetch(async (url) => {
        urls.push(new URL(url))
        return jacredResponse([release('Andor S01 1080p', 40)])
    }, () => new JacredProvider(UNTHROTTLED).search('Andor', { title: 'Андор', originalTitle: 'Andor', year: 2022, isSerial: true }))

    assert.equal(urls[0].searchParams.get('is_serial'), '2')
    assert.equal(urls[0].searchParams.get('Category[]'), '5000')
})

test('a structured search that finds nothing falls back to the plain title search', async () => {
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const urls = []
    const results = await withFetch(async (url) => {
        const parsed = new URL(url)
        urls.push(parsed)
        return parsed.searchParams.has('year')
            ? jacredResponse([])
            : jacredResponse([release('Dune Part Two 2160p', 12)])
    }, () => new JacredProvider(UNTHROTTLED).search('Dune: Part Two', duneContext))

    assert.equal(urls.length, 2)
    assert.equal(urls[1].searchParams.get('year'), null)
    assert.equal(urls[1].searchParams.get('title'), 'Dune: Part Two')
    assert.equal(results.length, 1)
})

test('the same query with a different film identity is not coalesced into one request', async () => {
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const provider = new JacredProvider(UNTHROTTLED)
    let calls = 0
    await withFetch(async () => {
        calls++
        return jacredResponse([release('Dune 1080p', 5)])
    }, () => Promise.all([
        provider.search('Dune', { title: 'Дюна', originalTitle: 'Dune', year: 2021, isSerial: false }),
        provider.search('Dune', { title: 'Дюна', originalTitle: 'Dune', year: 1984, isSerial: false })
    ]))

    assert.equal(calls, 2)
})

test('release info carries jac.red quality, HDR, voices and ffprobe streams', async () => {
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const [result] = await withFetch(async () => jacredResponse([uhdHdr]),
        () => new JacredProvider(UNTHROTTLED).search('Dune: Part Two', duneContext))

    assert.deepEqual(result.release, {
        quality: 2160,
        hdr: true,
        voices: ['Дубляж', 'Сербин', 'Яроцкий'],
        video: { codec: 'hevc', width: 3840, height: 1606 },
        audioChannels: 6,
        audioLanguages: ['rus', 'eng'],
        subtitleLanguages: ['rus', 'eng']
    })
    for (const tag of ['2160p', 'hdr', 'hevc']) assert.ok(result.tags.includes(tag), tag)
})

test('cover-art streams are not mistaken for the video track; 8 channels is reported', async () => {
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const results = await withFetch(async () => jacredResponse([withCoverArt, sevenOne]),
        () => new JacredProvider(UNTHROTTLED).search('Dune: Part Two', duneContext))
    const byHash = Object.fromEntries(results.map(r => [r.magnet, r]))

    assert.equal(byHash[withCoverArt.MagnetUri].release.video.codec, 'h264')
    assert.equal(byHash[sevenOne.MagnetUri].release.video.codec, 'hevc')
    assert.equal(byHash[sevenOne.MagnetUri].release.audioChannels, 8)
})

test('jac.red quality overrides a resolution guessed from the release name', async () => {
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const mislabelled = { ...release('Dune Part Two 1080p', 3), info: { quality: 2160, videotype: 'sdr', voices: [] } }
    const [result] = await withFetch(async () => jacredResponse([mislabelled]),
        () => new JacredProvider(UNTHROTTLED).search('Dune: Part Two', duneContext))

    assert.ok(result.tags.includes('2160p'))
    assert.ok(!result.tags.includes('1080p'))
    assert.ok(!result.tags.includes('hdr'))
})

test('a release without ffprobe keeps what info knows and no stream details', async () => {
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const [result] = await withFetch(async () => jacredResponse([noProbe]),
        () => new JacredProvider(UNTHROTTLED).search('Dune: Part Two', duneContext))

    // jac.red's 480 is its "not recognised" value (see the next test), so
    // without streams the quality stays unknown.
    assert.equal(result.release.quality, null)
    assert.equal(result.release.video, null)
    assert.equal(result.release.audioChannels, null)
    assert.deepEqual(result.release.subtitleLanguages, [])
})

test('quality comes from the probed video track, not jac.red\'s 480 placeholder', async () => {
    // Seen live on the NAS 2026-10-17: "WEB-DL (1080p)" and a 4K release both
    // had info.quality 480 while their ffprobe said 1920x1080 and 3840x1600.
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const probed = (title, width, height, seeders) => ({
        ...release(title, seeders),
        info: { quality: 480, videotype: 'sdr', voices: ['Дубляж'] },
        ffprobe: [{ codec_type: 'video', codec_name: 'h264', width, height }]
    })
    const results = await withFetch(async () => jacredResponse([
        probed('Dune Part Two WEB-DL (1080p)', 1920, 1080, 4863),
        probed('Dune Part Two 4K HEVC', 3840, 1600, 900),
        probed('Dune Part Two scope 1080p', 1920, 800, 300),
        probed('Dune Part Two DVDRip', 720, 304, 20)
    ]), () => new JacredProvider(UNTHROTTLED).search('Dune: Part Two', duneContext))

    assert.deepEqual(results.map(r => r.release.quality), [1080, 2160, 1080, 480])
    assert.ok(results[0].tags.includes('1080p'))
    assert.ok(results[1].tags.includes('2160p'))
    assert.ok(!results[1].tags.includes('1080p'))
})

test('a result without info or ffprobe has no release block', async () => {
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const [result] = await withFetch(async () => jacredResponse([release('Some film 720p', 9)]),
        () => new JacredProvider(UNTHROTTLED).search('Some film'))

    assert.equal(result.release, null)
    assert.ok(result.tags.includes('720p'))
})

// ─── Mirrors ─────────────────────────────────────────────────────────────
//
// jacred.xyz has been dead since ~March 2026 and hangs ~10s on connect. An
// empty answer from jac.red used to fall through to it, so every film with no
// releases took 11-15s: past the 4.5s badge and 8s search timeouts, and three
// such films in a row opened jacred's circuit for all searches (seen live
// 2026-10-17: "The Odyssey", "Resident Evil" badges empty, jacred circuit_open).

test('an empty answer from a working mirror is final; the next mirror is only for errors', async () => {
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const hosts = []
    const results = await withFetch(async (url) => {
        hosts.push(new URL(url).hostname)
        return jacredResponse([])
    }, () => new JacredProvider(UNTHROTTLED).search('Clayface', { title: 'Клэйфейс', originalTitle: 'Clayface', year: 2026, isSerial: false }))

    assert.deepEqual(results, [])
    assert.ok(hosts.length > 0)
    assert.ok(hosts.every(host => host === 'jac.red'), `asked ${hosts.join(', ')}`)
})

test('a failing mirror still falls back to the next one', async () => {
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const hosts = []
    const results = await withFetch(async (url) => {
        const host = new URL(url).hostname
        hosts.push(host)
        if (host === 'jac.red') return new Response('bad gateway', { status: 502 })
        return jacredResponse([release('Dune 1080p', 5)])
    }, () => new JacredProvider(UNTHROTTLED).search('Dune'))

    assert.ok(hosts.includes('jacred.xyz'))
    assert.equal(results.length, 1)
})

// ─── Background (badge) searches ─────────────────────────────────────────

const clayface = { title: 'Клэйфейс', originalTitle: 'Clayface', year: 2026, isSerial: false }

test('a badge lookup asks by identity and title only; the phrase fallback is for users', async () => {
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const count = async (options) => {
        let requests = 0
        await withFetch(async () => { requests++; return jacredResponse([]) },
            () => new JacredProvider(UNTHROTTLED).search('Clayface', clayface, options))
        return requests
    }

    assert.equal(await count({ background: true }), 2)
    assert.equal(await count({ background: false }), 3)
})

test('a rate-limited badge lookup fails instead of reporting no releases', async () => {
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const limited = async () => new Response('', { status: 429, headers: { 'retry-after': '0' } })

    await assert.rejects(
        withFetch(limited, () => new JacredProvider(UNTHROTTLED).search('Clayface', clayface, { background: true })),
        /Rate limited/
    )
    const interactive = await withFetch(limited,
        () => new JacredProvider(UNTHROTTLED).search('Clayface', clayface))
    assert.deepEqual(interactive, [])
})

test('requests go through the gate with their lane', async () => {
    const { JacredProvider } = await import('../providers/JacredProvider.js')
    const lanes = []
    const gate = { schedule: (fn, { background }) => { lanes.push(background); return fn() } }
    await withFetch(async () => jacredResponse([release('Dune 1080p', 5)]), async () => {
        await new JacredProvider({ gate }).search('Dune', null, { background: true })
        await new JacredProvider({ gate }).search('Dune')
    })

    assert.deepEqual(lanes, [true, false])
})
