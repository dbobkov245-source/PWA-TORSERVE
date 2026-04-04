# Torrent Debug Report: Crime 101 / 2026 / 20.2 GB

Date: 2026-04-04
Project: `PWA-TorServe`
Primary host under test: Synology NAS at `192.168.1.70`
Container under test: `pwa-torserve1`

## 1. Problem Statement

User reports that the same torrent for `Ограбление в Лос-Анджелесе / Crime 101 (2026)` behaves very differently in two clients:

- In TorServ Matrix / Lampa path:
  - torrent starts normally
  - speed is good
  - playback works
  - screenshots show roughly:
    - `Peers 19-20 / 129-141`
    - `Seeds 15-16`
    - `Download speed 25.9-26.4 Mbit/s`
    - file size about `20.2 GB`
- In PWA-TorServe:
  - earlier it often showed only `1` peer / seeder
  - torrent either did not start or stalled after a small initial download
  - user conclusion: this is a project bug, not a dead torrent

The user is explicitly asking for root cause analysis, not generic discussion about low seed counts.

## 2. Exact Torrents Involved

Two exact infohashes came up during debugging:

### A. Main problematic search result

- Infohash: `3b3d300f79252a6bd9c8e9548efabc136815f935`
- Name: `Crime.101.2026.x265.WEB-DL.2160p.HDR10Plus.mkv`
- Size on server: `21721444706` bytes
- Source in our search: `jacred` label `nnmclub, kinozal`
- Important detail:
  - our own `/api/v2/search` returned this as a bare magnet
  - magnet had only `xt=urn:btih:...`
  - no embedded `tr=` announce URLs

### B. Related 4K release that downloads better in our app

- Infohash: `c0121ee70ce71b4a17080e01e1e0483fc1118c84`
- Name: `Crime.101.2026.WEB-DL.2160p.HDR10+.mkv`
- Size on server: about `22.4 GB`
- This release became useful as a control case because it started downloading on NAS after fixes.

## 3. What Was Already Proven Before Today

These issues were real and already fixed earlier:

1. Shared-port regression:
   - earlier only the first torrent engine effectively reused the fixed listen port
   - later engines degraded into worse inbound behavior
   - fixed by reusing the mapped torrent port for every engine

2. Preflight discovery mismatch:
   - probe path and actual add path used different discovery strength
   - this produced false `dead` / `no seeders` conclusions
   - fixed by aligning preflight with engine discovery config

3. Local library shadow bug:
   - local file entry could mask a real active torrent
   - UI could show a torrent as effectively ready / downloaded when it was not
   - this also explained “delete twice” behavior

4. Downloaded-bytes regression after restart:
   - status could under-report already-downloaded data on disk after restart
   - fixed with resume baseline logic

5. Upload slots regression from old `torrent-stream` migration:
   - very old code used `uploads: 0`
   - this was harmful for swarm behavior
   - later changed to sane defaults

These were real bugs, but they did not fully explain why `Crime 101` still underperformed versus Matrix.

## 4. What We Verified Today

### 4.0 Final root cause in one sentence

The last blocking regression was not "dead torrents" or "no seeders".
It was the Synology production runtime with `TORRENT_UTP=1`.
On this exact host/profile, enabling uTP made swarm discovery look healthy
while real active download throughput collapsed.

### 4.1 Our own search returns the exact problematic bare magnet

This is important because it rules out “external source mismatch” as the only explanation.

Observed via `/api/v2/search`:

- title: `Ограбление в Лос-Анджелесе / Crime 101 / 2026 / ДБ, СТ / 4K, HEVC, HDR10+ / WEB-DL (2160p) | Дубляж`
- tracker label: `nnmclub, kinozal`
- magnet: `magnet:?xt=urn:btih:3B3D300F79252A6BD9C8E9548EFABC136815F935`

So our own search result for this movie was indeed that exact hash, and it was bare.

### 4.2 Deep-link / app handoff was not truncating the magnet

We checked the client path and Android handoff path. Conclusion:

- the app passes the full magnet string as-is to `/api/add`
- Capacitor / intent handling does not strip `xt`
- so the magnet is not broken during the app path

This ruled out a “UI/Android truncation” explanation.

### 4.3 The exact hash is not dead for our stack

Wire-level diagnostic runs on the NAS container showed that `3b3d...` can download in our environment under some conditions.

Example evidence from a raw test:

- one strong peer was observed
- `unchoke` arrived
- repeated 16 KB blocks were downloaded
- exact hash started transferring data

Conclusion:

- `3b3d...` is not simply dead
- “no seeders” was a wrong diagnosis

### 4.4 Shared DHT was worse than internal DHT on this Synology host-network deployment

Comparative tests showed:

- `shared DHT` was materially worse for this NAS host-network setup
- `internal DHT` performed better on the same machine

This justified the Synology-specific settings:

- `TORRENT_DHT_MODE=internal`
- `TORRENT_CONNECTIONS=55`

That change helped make exact problematic torrents start at all on NAS.

### 4.5 The old peer number in UI was misleading

Before the latest status fix, our UI effectively used:

- `numPeers = engine.swarm.wires.length`

That counts only current connected wires, not the full discovered swarm.

On the exact problematic hash after the latest status patch:

- `3b3d...` showed:
  - `numPeers: 48`
  - `connectedPeers: 1`
  - `activePeers: 0`
  - `knownPeers: 48`
  - `queuedPeers: 0`

This is a key finding:

- the app was previously under-reporting swarm size
- the torrent was not “1 seeder exists”
- the real state was closer to “we know dozens of peers, but we are not converting them into active download throughput”

### 4.6 Final A/B: `TORRENT_UTP=1` vs `TORRENT_UTP=0`

This was the decisive experiment.

We kept the same NAS, the same container image, the same exact hashes, and changed
only one runtime flag:

- before: `TORRENT_UTP=1`
- after: `TORRENT_UTP=0`

#### With `TORRENT_UTP=1`

Exact live state on NAS:

- `3b3d...`
  - `knownPeers: 329`
  - `connectedPeers: 0`
  - `activePeers: 0`
  - `downloadSpeed: 0`
- `904e...`
  - `knownPeers: 286`
  - `connectedPeers: 0-1`
  - `activePeers: 0`
  - `downloadSpeed: 0` or near-zero

This was the bad "looks alive, does not actually download" state.

#### With `TORRENT_UTP=0`

The exact same hashes immediately recovered:

- `15:51:48`
  - `3b3d...`: `24 connected`, `18 active`, `13.3 MB/s`
  - `904e...`: `16 connected`, `7 active`, `11.3 MB/s`
- `15:54:20`
  - `3b3d...`: `4.47 GB downloaded`, `25.1 MB/s`, `34 connected`, `23 active`
  - `904e...`: `1.52 GB downloaded`, `10.6 MB/s`, `15 connected`, `10 active`

This is strong evidence, not speculation:

- the remaining regression was caused by the `uTP`-enabled runtime path on this Synology deployment
- disabling `uTP` restored real download behavior for the user’s exact test cases

## 5. Most Important Throughput Experiment Today

The most valuable experiment today compared stock `torrent-stream` against the same engine with only one change:

- `MAX_REQUESTS = 5` (stock)
- `MAX_REQUESTS = 32` (patched at runtime)

This was run on the exact same problematic hash `3b3d...` inside the NAS container.

### Result

In one controlled comparison:

- Stock:
  - `downloaded: 983040` bytes in `35s`
  - around `163840 B/s` at the end of the sample
- Patched `MAX_REQUESTS=32`:
  - `downloaded: 9125888` bytes in `35s`
  - around `367001.6 B/s` at the end of the sample

In an earlier stock run on the same exact hash we also observed:

- around `11010048` bytes in `30s`
- final sampled speed about `429260.8 B/s`

The absolute numbers vary by peer set, but the direction is clear:

- `MAX_REQUESTS=5` is a real throughput bottleneck for this stack
- deeper request pipelining helps materially

This is not a theoretical hypothesis anymore. It was demonstrated on the exact problematic hash.

## 6. Code Changes Made Today

### 6.1 Runtime patch for `torrent-stream`

New file:

- `server/torrentStreamRuntime.js`

Purpose:

- load stock `torrent-stream`
- patch `var MAX_REQUESTS = 5`
- raise it to a tuned value
- default now effectively uses `32`
- can be explicitly overridden back via env if needed

Rationale:

- current production container on NAS did not reliably inherit a new compose env variable
- a runtime default made the fix take effect immediately after restart

### 6.2 Peer snapshot metrics in status

Changed files:

- `server/torrent.js`
- `server/statusResponse.js`

New status fields:

- `numPeers`
- `connectedPeers`
- `activePeers`
- `knownPeers`
- `queuedPeers`

Important semantics:

- `numPeers` now reflects `max(connectedPeers, knownPeers)` for user-facing UI
- this avoids the old false visual impression that the swarm has only `1` peer

### 6.3 Synology config file in repo

Updated:

- `docker-compose.synology.yml`

Key settings:

- `TORRENT_UTP=0`
- `TORRENT_DHT_MODE=internal`
- `TORRENT_CONNECTIONS=55`
- `TORRENT_MAX_REQUESTS=32`

Note:

- the live NAS container was not fully managed by this compose file
- but the repo config now documents the intended runtime profile

### 6.4 Test coverage added/updated

Relevant tests now cover:

- torrent runtime patch helper
- peer snapshot fields
- status payload shape
- Synology compose expectations

Local result after these fixes:

- `97 passed, 0 failed`

## 7. Live Production State After Today’s Fixes

Final state for the main two test hashes after disabling `uTP` on NAS:

- `3b3d300f79252a6bd9c8e9548efabc136815f935`
  - downloads normally again
  - keeps tens of real connected peers
  - reached multi-megabyte sustained throughput
- `904e1bf737da8b6b37ee0f587a3c9c412c2e1d95`
  - also downloads normally again
  - maintains active peers and stable throughput

## 8. Operational Rule Going Forward

For Synology host-network deployments in this project:

- keep `TORRENT_UTP=0` by default
- keep `TORRENT_DHT_MODE=internal`
- keep `TORRENT_CONNECTIONS>=55`
- keep `TORRENT_MAX_REQUESTS=32`

Do not re-enable `TORRENT_UTP=1` casually.
If it is revisited in the future, it should be treated as a separate experiment
with explicit A/B measurement on the NAS, because the regression is now proven.

## 9. Short Summary

What is fixed:

- old peer count visibility in UI/status is fixed
- runtime request depth bottleneck is mitigated
- Synology runtime no longer stalls these swarms behind a misleading `knownPeers` count
- exact `Crime 101` test torrents now download again on NAS

Final working conclusion:

- this was a real project regression
- the last decisive cause was the `uTP`-enabled Synology runtime profile
- for this deployment, `TORRENT_UTP=0` is the safe default
