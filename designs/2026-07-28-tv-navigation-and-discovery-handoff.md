# Handoff — peer discovery, TorrServer failover, TV focus (2026-07-26 … 2026-07-28)

Branch: `codex/full-project-audit`, worktree `.worktrees/full-project-audit`.
Pushed through `1c8b0ca`; remote matches local.

---

## 1. What was wrong, and what was actually proven

### BUG-A — "Ускорить через TorrServer" returned 503 ✅ fixed and verified

`torrserver-test` published **no ports at all** (`PortBindings` empty). `TS_URL`
defaults to `http://172.17.0.1:8090` — the docker0 gateway — and nothing listened
there. Measured from inside the app container:

```
172.17.0.1:8090  → FAIL fetch failed
172.17.0.2:8090  → OK MatriX.141.5        (the container IP still answered)
```

That asymmetry is the trap: the sidecar looks healthy from the host while every
call from the app fails.

**Fix (infra, already applied on the NAS):** recreated the container with
`-p 8090:8090 -p 6882:6882/tcp -p 6882:6882/udp`. Command is now in the repo at
`scripts/torrserver-recreate.sh` and on the NAS at
`/volume1/docker/torrserver-test/recreate.sh`.

Verified after restart: `TorrServer failover armed {"available":true,
"version":"MatriX.141.5"}`, and the user drove a real migration at 7.1 MB/s.

### BUG-B — torrents would not add ✅ fixed and verified

Three attempts on the same magnet from the logs:

| time | hash | result |
|---|---|---|
| 09:11:44 | `11796417` | `peers: 0, queued: 0` for 90s → timeout |
| 09:14:02 | `7455c570` | `peers: 0, queued: 0` for 90s → timeout |
| 09:17:15 | `7455c570` | `peers: 2` in 5s → ready in 15s |

Same hash, third try worked — the swarm was alive, **discovery was starved**.
Probing 26 UDP + 14 HTTP trackers from the container found only **2 of the 10**
configured entries still answering. Replaced with 7 measured survivors.

After the fix, the same previously-failing hash: `Engine ready` in **54 ms**.

**Do not edit `PUBLIC_TRACKERS` from reputation.** Re-run the probe:

```bash
docker exec pwa-torserve1 node /app/server/tracker-probe.mjs
```

### DHT bootstrap — benchmark by peers, never by time-to-ready

`bittorrent-dht`'s default bootstrap is 2/3 dead here. A/B on the NAS, 45s lookup
of a live infoHash, run twice in both orders:

| bootstrap | ready | peers found |
|---|---|---|
| default | 2.5s | **0** |
| pinned (transmissionbt + libtorrent) | 7.5–8s | **14** |

The default reaches "ready" fastest *because* most of its bootstrap fails. I
nearly reverted the change over that number. A slow `[DHT] Shared DHT
bootstrapped` line is not by itself a regression.

### Posters going blank ✅ fixed and verified

Read the device's own localStorage over CDP: `tmdb_image_proxy_enabled: "true"`,
122 of 153 images with `naturalWidth === 0`.

`warmupImageMirrors` probed every mirror once, 2s after load, with a **3s
timeout**, and switched to proxy mode if all missed — writing a flag that lasts
**6 hours** and survives restarts. Measured through the WebView, a HEAD of one
92px image takes **1.2–2.3s** with every mirror answering 200. A cold start,
when hundreds of posters compete for the connection, is exactly when that
budget blows.

Fixes: warmup no longer touches proxy mode, its timeout is 8s, mirror bans now
expire after 2 minutes (they previously lasted until the app process restarted),
the permanently dead `lampa.byskaz.ru/tmdb/img` mirror is gone, and
`IMAGE_ROUTE_VERSION` was bumped so the stuck flag clears on upgrade.

After: **0 failed images**, `proxyMode: null`, mirror `nl.imagetmdb.com`.

### Focus highlight on Home ✅ fixed and verified on emulator

Every row kept its own `focusedIndex` and painted a highlight from it
unconditionally, so two or three posters glowed at once; the stale ones did not
respond to the D-Pad because focus had moved on. Rows now light a card only
while focus is really inside them.

The mint ring also was **not** in the card component — it came from
`.focusable:focus` in `index.css` (`box-shadow: 0 0 0 4px rgba(45,212,191,.92)`)
painted on the wrapper, which is why it enclosed the rank numeral and why its
`scale: 1.05` compounded with the card's own. Rows opt out via
`focusRing={false}`.

---

## 2. Still open

### 🔴 The D-Pad deadlock — STILL BROKEN, `5aa3d69` did not fix it

User's report, unchanged after installing the build with `5aa3d69`: cursor
sticks near the top of Home, neither Up nor Down moves it, Left still opens the
sidebar.

**The LazyRow theory did not hold.** Rows below the fold do render as
placeholders with no focusable child, and that does close a loop on paper —
focus cannot move down (no candidate), the page cannot scroll (scrolling follows
focus), the row cannot mount (viewport never reaches it). The fix nudges the
page by 80% of the viewport on a candidate-less vertical move, and widened the
lazy observer margin 300px → 1200px. It changed nothing for the user, so either
the theory is wrong or it is only part of the story. Treat it as an open
question, not as groundwork.

What *is* established, from a CDP session against the emulator's WebView:

- Every row exposes exactly one tab stop; geometry of the rows below is sane
  (`offsetParent` set, `tabIndex` 0, sensible rects).
- `SpatialEngine.activeZone` is `main`, the zone held 553 elements, 33 passed
  the `tabIndex !== -1` filter, and the focused card was in the zone.
- Calling `SpatialEngine.move('ArrowDown')` **directly** found the next row and
  moved focus. Synthetic `keydown` on `window` walked rows 0 → 22.
- With a clean start, physical D-Pad presses also walked 0 → 8, all 8 keys
  observed by a capture-phase listener.

So on the emulator the engine works and the keys arrive. Whatever the TV does
differently has not been captured yet. **Next session must start by measuring on
a real device, not by proposing another mechanism.**

Two false leads already burned, do not repeat them:
- The top bar buttons *are* registered (`App.jsx:196`, `useSpatialItem('main')`).
  I claimed otherwise after grepping only for the `focusable` class.
- A "stuck cursor" I reproduced twice was `GrantPermissionsActivity` swallowing
  the D-Pad after a debug install, not the bug.

### Cosmetic, noted but not fixed

- `[ERROR][TsDownload] Failover download failed {"error":"terminated"}` is logged
  when the *user* deletes a torrent mid-migration. Штатная отмена, но выглядит
  как сбой.
- Four UI suggestions never answered: mint ring consistency in HomeRow /
  EditorialRow, `transition-all duration-300` in HomeRow (animates layout
  properties; 300ms feels sluggish on a remote), low-rating colour only in
  RankedRow, lazy `<img>` mounting instead of full virtualization.

---

## 3. Traps that cost time — read before repeating the work

- **`sudo -S` eats the first line of output.** The `Password:` prompt goes to
  stderr without a newline and prefixes the first stdout line, so a naive
  `grep -v '^Password'` deletes it. This made `pwa-torserve1` look like it did
  not exist. Use `sudo -S -p ''`.
- **A system permissions dialog steals the D-Pad.** A debug install triggers
  `GrantPermissionsActivity`; it sits on top and swallows every key. I
  "reproduced" the stuck cursor twice this way before checking
  `dumpsys window | grep mCurrentFocus`. Pre-grant with
  `adb shell pm grant com.torserve.pwa android.permission.RECORD_AUDIO`.
- **WebView debugging is off in release builds.** To read the device DOM, build
  `assembleDebug`, then:
  ```bash
  adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
  ```
  CDP rejects the WS handshake unless the client suppresses its Origin header
  (`create_connection(..., suppress_origin=True)` with `websocket-client`).
  A debug APK is signed with a different key — uninstall the release first, and
  it will not go to the TV.
- **Push failing with `Permission denied (publickey)` is not a GitHub problem.**
  There was no `~/.ssh/config`, so after a reboot the key was not loaded into the
  agent, even though its passphrase sits in the Keychain. Fixed by adding
  `Host * / UseKeychain yes / AddKeysToAgent yes / IdentityFile ~/.ssh/id_ed25519`.
  Verified with `SSH_AUTH_SOCK= ssh -T git@github.com`, which authenticates with
  no agent at all. One-shot recovery if it ever recurs:
  `ssh-add --apple-load-keychain`.
- **`cat file | ssh "cat > dest"` truncates larger files.** Deploy with
  `base64 -i f | ssh host "base64 -d > /path/f"` and compare `md5`.
- **Dead tracker domains are genuinely dead, not blocked.** `gbitt.info`,
  `tamersunion.org`, `openbittorrent.com` and friends are NXDOMAIN on Cloudflare
  too. And the `198.18.0.x` answers are the Flint router's fake-IP pool for
  VPN policy routing — chasing that is a dead end, because the real IPs behind
  them are ISP-blocked anyway (verified by dialling the IPs directly).

---

## 4. State of the world

**Commits on `codex/full-project-audit` (pushed):**

```
1c8b0ca docs: hand off the discovery and TV focus work
5aa3d69 fix: break the D-Pad deadlock at an unmounted lazy row
4250791 fix: stop warmup from pinning proxy mode for six hours
361bccf fix: let image mirror bans expire
c1d972a fix: keep small-poster rows reachable by the D-Pad
2ab56fa fix: show one focus highlight at a time on Home
```

- **NAS server code == this worktree** (md5 verified for `torrent.js`,
  `tsDownload.js`, `index.js`). Container restarted, `torrServer.available: true`.
- **Client bundle on the NAS** was deployed at an earlier point and is now
  behind the worktree; redeploy if the web UI matters.
- **APK** `pwa-torserve-v3.17.4.apk` (versionCode 39) in the repo root and the
  worktree, signed `cb109e5f19b2c97dd4711920cf32fbc030e1ad5c` — OTA-compatible
  with 3.17.x.
- **No GitHub release for v3.17.4 exists**, but `version.json` already points at
  its download URL, so any TV checking for updates gets a 404. Either publish the
  release or accept manual installs.
- The emulator currently holds a **debug** build (different signature).
- Tests at last run: client 384/384, server 147/147, ESLint clean.

**Deploy recipes:** `scripts/torrserver-recreate.sh` (TorrServer), and for server
files the base64+md5 flow above, then
`docker restart pwa-torserve1`. The app re-probes TorrServer every 30s, so no
restart is needed just to pick the sidecar back up.
