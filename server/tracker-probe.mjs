/**
 * tracker-probe.mjs — read-only reachability probe for BT trackers + DHT bootstrap.
 * Run inside the app container: node /app/server/tracker-probe.mjs
 */
import dns from 'dns/promises'
import dgram from 'dgram'
import http from 'http'
import https from 'https'

const TIMEOUT = 6000
const HASH = Buffer.from('7455c570f7866210f2e86559e9e3d9915bfd0ef7', 'hex')
const PEER_ID = Buffer.from('-PW0001-' + '0'.repeat(12))

function connectReq(txid) {
    const b = Buffer.alloc(16)
    b.writeUInt32BE(0x00000417, 0)
    b.writeUInt32BE(0x27101980, 4)
    b.writeUInt32BE(0, 8)
    b.writeUInt32BE(txid >>> 0, 12)
    return b
}

async function probeUdp(host, port) {
    const txid = Math.floor(Math.random() * 0xffffffff)
    let ip = host
    try { ip = (await dns.lookup(host, { family: 4 })).address } catch (e) {
        return { kind: 'udp', url: `udp://${host}:${port}`, ok: false, err: 'dns:' + e.code }
    }
    return new Promise((resolve) => {
        const sock = dgram.createSocket('udp4')
        let done = false
        const t0 = Date.now()
        const finish = (ok, extra = {}) => {
            if (done) return
            done = true
            try { sock.close() } catch {}
            resolve({ kind: 'udp', url: `udp://${host}:${port}`, ip, ok, ms: Date.now() - t0, ...extra })
        }
        const timer = setTimeout(() => finish(false, { err: 'timeout' }), TIMEOUT)
        sock.on('message', (msg) => {
            clearTimeout(timer)
            if (msg.length < 16) return finish(false, { err: 'short' })
            if (msg.readUInt32BE(0) !== 0) return finish(false, { err: 'action' + msg.readUInt32BE(0) })
            if (msg.readUInt32BE(4) !== (txid >>> 0)) return finish(false, { err: 'txid' })
            finish(true)
        })
        sock.on('error', (e) => { clearTimeout(timer); finish(false, { err: e.code || e.message }) })
        sock.send(connectReq(txid), port, ip, (err) => {
            if (err) { clearTimeout(timer); finish(false, { err: err.code || err.message }) }
        })
    })
}

function esc(buf) {
    return Array.from(buf).map((b) => {
        const c = String.fromCharCode(b)
        return /[A-Za-z0-9.\-_~]/.test(c) ? c : '%' + b.toString(16).padStart(2, '0')
    }).join('')
}

function probeHttp(base) {
    const url = `${base}${base.includes('?') ? '&' : '?'}info_hash=${esc(HASH)}&peer_id=${esc(PEER_ID)}` +
        '&port=6881&uploaded=0&downloaded=0&left=1000&compact=1&event=started'
    const mod = url.startsWith('https') ? https : http
    const t0 = Date.now()
    return new Promise((resolve) => {
        const finish = (ok, extra = {}) => resolve({ kind: 'http', url: base, ok, ms: Date.now() - t0, ...extra })
        const req = mod.get(url, { timeout: TIMEOUT }, (res) => {
            const chunks = []
            res.on('data', (c) => chunks.push(c))
            res.on('end', () => {
                const body = Buffer.concat(chunks)
                const txt = body.toString('latin1')
                if (res.statusCode !== 200) return finish(false, { err: 'http' + res.statusCode })
                if (!txt.startsWith('d')) return finish(false, { err: 'notBencode', head: txt.slice(0, 40) })
                const m = txt.match(/5:peers(\d+):/)
                const peerBytes = m ? parseInt(m[1], 10) : 0
                if (/failure reason/.test(txt)) return finish(false, { err: 'failure', head: txt.slice(0, 80) })
                finish(true, { peers: Math.floor(peerBytes / 6) })
            })
        })
        req.on('timeout', () => { req.destroy(); finish(false, { err: 'timeout' }) })
        req.on('error', (e) => finish(false, { err: e.code || e.message }))
    })
}

// DHT bootstrap: send a find_node query, expect a bencoded reply
async function probeDht(host, port) {
    let ip = host
    try { ip = (await dns.lookup(host, { family: 4 })).address } catch (e) {
        return { kind: 'dht', url: `${host}:${port}`, ok: false, err: 'dns:' + e.code }
    }
    const q = Buffer.from('d1:ad2:id20:abcdefghij01234567896:target20:abcdefghij0123456789e1:q9:find_node1:t2:aa1:y1:qe')
    return new Promise((resolve) => {
        const sock = dgram.createSocket('udp4')
        let done = false
        const t0 = Date.now()
        const finish = (ok, extra = {}) => {
            if (done) return
            done = true
            try { sock.close() } catch {}
            resolve({ kind: 'dht', url: `${host}:${port}`, ip, ok, ms: Date.now() - t0, ...extra })
        }
        const timer = setTimeout(() => finish(false, { err: 'timeout' }), TIMEOUT)
        sock.on('message', (m) => { clearTimeout(timer); finish(m.length > 8 && m[0] === 0x64, { bytes: m.length }) })
        sock.on('error', (e) => { clearTimeout(timer); finish(false, { err: e.code || e.message }) })
        sock.send(q, port, ip, (err) => { if (err) { clearTimeout(timer); finish(false, { err: err.code || err.message }) } })
    })
}

const UDP = [
    ['open.stealth.si', 80], ['tracker.torrent.eu.org', 451], ['explodie.org', 6969],
    ['tracker.opentrackr.org', 1337], ['open.demonii.com', 1337], ['tracker.openbittorrent.com', 6969],
    ['open.tracker.cl', 1337], ['tracker.dler.org', 6969], ['exodus.desync.com', 6969],
    ['tracker1.bt.moack.co.kr', 80], ['opentracker.i2p.rocks', 6969], ['tracker.theoks.net', 6969],
    ['retracker.lanta-net.ru', 2710], ['bt.ktrackers.com', 6666], ['tracker.bittor.pw', 1337],
    ['tracker.dump.cl', 6969], ['tracker.srv00.com', 6969], ['tracker.filemail.com', 6969],
    ['tracker.tryhackx.org', 6969], ['open.free-tracker.ga', 6969], ['tracker.qu.ax', 6969],
    ['isk.richardsw.club', 6969], ['tracker.gmi.gd', 6969], ['retracker.spark-rostov.ru', 80],
    ['bt.rer.lol', 2710], ['tracker.gigantino.net', 6969],
]

const HTTP = [
    'https://tracker.tamersunion.org:443/announce',
    'http://tracker.gbitt.info:80/announce',
    'https://tracker.gbitt.info:443/announce',
    'http://bt.okmp3.ru:2710/announce',
    'https://tracker.lilithraws.org:443/announce',
    'https://opentracker.i2p.rocks:443/announce',
    'http://t.overflow.biz:6969/announce',
    'https://tracker.yemekyedim.com:443/announce',
    'http://open.acgnxtracker.com:80/announce',
    'https://tr.burnabyhighstar.com:443/announce',
    'http://tracker.mywaifu.best:6969/announce',
    'https://trackers.mlsub.net:443/announce',
    'http://retracker.hotplug.ru:2710/announce',
    'https://tracker.zhuqiy.top:443/announce',
]

const DHT = [
    ['router.bittorrent.com', 6881], ['dht.transmissionbt.com', 6881], ['router.utorrent.com', 6881],
    ['dht.libtorrent.org', 25401], ['router.bitcomet.com', 6881], ['dht.aelitis.com', 6881],
]

async function pool(items, fn, size = 8) {
    const out = []
    let i = 0
    await Promise.all(Array.from({ length: size }, async () => {
        while (i < items.length) {
            const item = items[i++]
            out.push(await fn(item))
        }
    }))
    return out
}

const udpRes = await pool(UDP, ([h, p]) => probeUdp(h, p))
const httpRes = await pool(HTTP, (u) => probeHttp(u))
const dhtRes = await pool(DHT, ([h, p]) => probeDht(h, p), 6)

const all = [...udpRes, ...httpRes, ...dhtRes]
for (const r of all.filter((r) => r.ok)) console.log('OK  ', JSON.stringify(r))
for (const r of all.filter((r) => !r.ok)) console.log('FAIL', JSON.stringify(r))
console.log(JSON.stringify({
    summary: {
        udpOk: udpRes.filter((r) => r.ok).length, udpTotal: udpRes.length,
        httpOk: httpRes.filter((r) => r.ok).length, httpTotal: httpRes.length,
        dhtOk: dhtRes.filter((r) => r.ok).length, dhtTotal: dhtRes.length
    }
}))
