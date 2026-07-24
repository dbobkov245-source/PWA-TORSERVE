# PWA-TorServe Debug Execution Log

**Date:** 2026-07-24
**Worktree:** `/Volumes/SSD Storage/PWA-TorServe/.worktrees/full-project-audit`
**Branch:** `codex/full-project-audit`
**Starting commit:** `c64e918685b45de1445999980e349cc118cb5a9f`

## Stage 0 — Provenance and baseline

### Source

- Worktree was clean before debug artifacts were created.
- Recent HEAD: `c64e918 docs: add Antigravity independent audit prompt`.
- Handoff and Gemini round 2 were read completely.
- Handoff takes precedence where Gemini evidence is incomplete.
- `AGENTS.md` references `skills/capacitor-bridge`, `skills/resilience-core`, and
  `skills/tv-navigator`, but those skill directories are absent from both the
  main checkout and candidate worktree. Their documented contracts from
  `AGENTS.md` remain binding.

### Runtime before rebuilding candidate

- Device: `emulator-5554`
- Model: `sdk_google_atv64_arm64`
- Android: `16` / API `36`
- ABI: `arm64-v8a`
- WebView: `150.0.7871.181`
- Package: `com.torserve.pwa`
- APK: `versionName=3.17.2`, `versionCode=37`
- Installed APK `lastUpdateTime`: `2026-07-18 14:39:39`
- Focused activity: `com.torserve.pwa/.MainActivity`
- Installed APK hash did not yet prove correspondence with current HEAD.

### Fresh baseline tests

- Client: `38` files passed, `339/339` tests passed.
- Server: `138/138` tests passed.
- Expected negative-path test logs were present; exit codes were zero.

### Accumulated Logcat baseline

Artifact: `output/debug-2026-07-24/baseline/logcat-before.txt`

- Lines: `21217`
- SHA-256: `7b8e5bcad317ca38fcb2d792f30356301dc767ee8b99a304b40c9c6824f14ed3`
- `[SpatialNav] Active Zone: main -> main`: `1526`
- Native TLS/SNI error pattern lines: `550`
- Server Proxy success pattern lines: `50`
- `FATAL EXCEPTION`: `0`

This is an accumulated pre-debug sample, not a bounded cold-launch interval.
Bounded before/after samples will be captured per bug.

## BUG-01 — ErrorScreen focus trap

Status: fixed and APK-verified.

### Reproduction and root cause

- Candidate APK was forced into server error with temporary
  `http://127.0.0.1:1`; original `CapacitorStorage.xml` was copied inside the
  debug app sandbox without reading or exposing its values.
- Before-fix screenshot:
  `output/debug-2026-07-24/bug-01-error-before.png`.
- App rendered `ErrorScreen` while its zone effect still selected `main`.
- Settings/Retry used plain refs, so zone `error` had no registered elements.
- ErrorScreen also had a local bubbling key handler, competing with the global
  arbiter.

### RED

Command:

```text
./node_modules/.bin/vitest run src/App.errorFocus.test.jsx
```

Result: `2 failed`.

- Expected final App zone `error`, received `main`.
- Expected two registered `error` elements, received no `error` zone.

### Fix

- App maps `serverStatus=error|circuit_open` to zone `error`, behind Settings
  and update-modal priority.
- Settings/Retry register through `useSpatialItem('error', preferredId)`.
- ErrorScreen focuses preferred Settings/Retry id after refs register.
- Removed competing local key handler; global arbiter owns arrows and Enter.
- Error buttons use `focusable`; TV action no longer depends on `onClick`.

### GREEN

- Targeted: `2/2` tests passed.
- Full client suite: `39` files, `341/341` tests passed.
- Targeted ESLint for new test and `StatusBanners.jsx`: exit `0`.
- Production build: PASS.
- Capacitor sync: PASS using local `node_modules/.bin/cap`.
- Android build: `BUILD SUCCESSFUL`.

Full project lint remains blocked by pre-existing configuration/source debt:
generated Android bundles are included and existing source violations produce
`330 errors, 5 warnings`. No new BUG-01-file lint errors were reported.

### APK runtime evidence

- APK SHA-256:
  `839957f99384c0c0c33a99379979e96bbb8be88166bbb66b2afe73e205b718c3`
- Package remained `3.17.2` / `37`.
- Three repeated `Left → Right → Up → Down → Enter` cycles remained on
  ErrorScreen; screenshots:
  `bug-01-error-after-cycle-{1,2,3}.png`.
- Retry retained visible focus; no hidden Home/MovieDetail opened.
- Settings opened from server error:
  `bug-01-settings-focus-after.png`.
- Bounded Logcat: `565` lines, `0` `FATAL EXCEPTION`, `0`
  `error -> main` leaks.
- Exact Preferences backup restored. Home returned with `Server OK`;
  `bug-01-home-restored.png`.
- Restored-launch Logcat contained `17` Server OK/proxy-success markers and
  `0` fatal exceptions.

### Changed files

- `client/src/App.jsx`
- `client/src/components/StatusBanners.jsx`
- `client/src/App.errorFocus.test.jsx`

### Remaining risk

- Stable callback/same-zone no-op is intentionally deferred to BUG-03;
  BUG-01 tests still expose redundant `error -> error` activation.

## BUG-02 — Home focus restoration

Status: fixed and APK-verified.

### Reproduction and root cause

- Existing restore lifecycle depended only on `activeMovie`.
- Category/Person open and close did not mark or consume pending restoration.
- Home's lazy-row scroll listener stayed attached to the detached scroller while
  a subview replaced Home, so the newly mounted scroller could not start tier-3
  loading.
- `restoreHomeFocus` restored vertical scroll and item focus but ignored saved
  horizontal scroll.
- Focus callbacks recorded scroll before SpatialEngine/useTVNavigation could
  finish their scroll work.

### RED

Command:

```text
./node_modules/.bin/vitest run src/components/HomePanel.test.jsx
```

Result: `5 failed, 41 passed`.

- Existing Movie test: expected horizontal `77`, received `0`.
- Deep tier-3 Movie Back: expected horizontal `180`, received `0`.
- Category Back: target `Item 3` not focused.
- Person Back: target `Item 3` not focused.
- Lazy tier-3 restore: target row remained a loading placeholder.

### Fix

- Added one `hasActiveSubview` lifecycle for Movie, Category, and Person.
- Rebind lazy-row scroll listener whenever Home returns from a subview.
- Restore `rowId + itemIndex` first, with `preventScroll`, then apply saved
  vertical and horizontal offsets.
- Keep immediate focus snapshot for fast Enter, then update scroll offsets after
  two deterministic animation frames so settled TV scrolling is persisted.
- Retry restoration when display rows, 4K row, or Trakt row mounts.

### GREEN

- HomePanel target: `46/46` passed.
- Related Home/navigation tests: `73/73` passed.
- Full client suite: `39` files, `345/345` passed.
- ESLint for `HomePanel.jsx` and `HomePanel.test.jsx`: exit `0`.
- Production build: PASS.
- Capacitor sync: PASS.
- Android Gradle: `BUILD SUCCESSFUL`.

### APK runtime evidence

- APK SHA-256:
  `05f27bfdbd3379abcd88834e3060a02c6fc7d345555c943c75487a406826235e`
- Package: `3.17.2` / `37`.
- Runtime used Android WebView's local DevTools socket through ADB. Automation
  inspected DOM focus/scroll only; storage and credentials were not read.
- Movie Back: `3/3` exact row/item/vertical/horizontal restoration.
- Category Back: `3/3` exact restoration, entered through real "Показать все".
- Person Back: `3/3` exact restoration, entered through MovieDetail cast card
  for `Ребекка Фергюсон`.
- Repeated stable target:
  `rowId=tv_on_the_air`, `itemIndex=3`, `verticalScroll=13466`,
  `horizontalScroll=349`.
- Earlier valid run also restored
  `rowId=tv_airing_today`, `itemIndex=3`, `verticalScroll=13187`,
  `horizontalScroll=57`.
- One automation-only repeat reused an already-focused node, so no browser
  `focus` event fired; it was excluded and rerun with an alternate-focus step.
- Screenshots:
  `output/debug-2026-07-24/bug-02-{prepare-*,verify-home-*}.png`.
- Bounded Logcat: `2755` lines, `0` fatal exceptions, `0` ANRs.

### Changed files

- `client/src/components/HomePanel.jsx`
- `client/src/components/HomePanel.test.jsx`

### Remaining risk

- Runtime exercised a deep loaded tier-3 row. Lazy-row mount restoration is
  covered by real component regression test; forcing that exact network timing
  nine times in APK would make evidence non-deterministic.

## BUG-03 — Stable spatial zone

Status: fixed and APK-verified.

### Reproduction and root cause

- BUG-02 bounded Logcat recorded `70` redundant
  `[SpatialNav] Active Zone: main -> main` messages, normally every five
  seconds with status polling.
- `useSpatialArbiter` returned a new `setActiveZone` function on every render.
  App's zone effect therefore reran after each status update.
- `SpatialEngine.setActiveZone` logged and rebuilt zone sets even when the
  requested zone was already active. Replacing sets also bypassed the normal
  unregister path for stale id-map entries.

### RED

Command:

```text
./node_modules/.bin/vitest run src/hooks/useSpatialNavigation.test.js
```

Result: `4 failed, 2 passed`.

- Callback identity changed after a polling-style rerender.
- App-style effect called `setActiveZone` twice.
- Same-zone activation returned no explicit no-op result.
- Explicit stale-zone pruning was absent.

### Fix

- Memoized the arbiter callback with `useCallback`.
- Same-zone activation now returns `false` before logging or mutation.
- Real transitions return `true`.
- Added explicit `pruneZone`, which removes stale elements through
  `unregister` so zone and id maps stay consistent.
- Focus recovery invokes pruning only at the point where stale cleanup is
  required.

### GREEN

- Targeted lifecycle tests: `6/6` passed.
- Related spatial/error/polling tests: `9/9` passed.
- Full client suite: `39` files, `349/349` passed.
- ESLint for hook and hook test: exit `0`.
- Production build: PASS.
- Capacitor sync: PASS.
- Android Gradle: `BUILD SUCCESSFUL`.

### APK runtime evidence

- Built and installed APK SHA-256 matched exactly:
  `08ef7e5cd292d23ae5590caa182df5edef18219ccd1e934424b6dccfeafd4047`.
- Cold-start idle window in bounded Logcat:
  `19:28:12` through `19:34:34` (over five minutes).
- Initial and final focused card remained identical:
  `Укрытие`, rating `8.2`, year `2023`.
- After-window passive CDP capture observed four `/api/status` requests at
  `5006`, `4998`, and `4999` ms intervals. Polling continued normally.
- `main -> main`: `0`; all zone-transition logs while idle: `0`.
- Fatal exceptions/ANRs: `0`.
- Logcat artifact:
  `output/debug-2026-07-24/bug-03-idle-after.log`
  (`1669` lines, SHA-256
  `8bd5fe16073075aba820c76055354cca749b2265d1a64af0f418e338950a42b3`).
- Screenshots:
  `output/debug-2026-07-24/bug-03-idle-state-{start,end}.png` and
  `bug-03-monitor-status-after-5m.png`.

### Changed files

- `client/src/hooks/useSpatialNavigation.js`
- `client/src/hooks/useSpatialNavigation.test.js`

### Remaining risk

- WebView Resource Timing retained only the cold-start status request, so the
  continuing cadence was measured with CDP network events after the idle
  window. The preceding five-plus-minute Logcat window independently verifies
  absence of same-zone churn and runtime failures.

## BUG-04 — Native direct-IP DoH

Status: fixed and APK-verified.

### Reproduction and root cause

- Baseline accumulated `150` native TLS exception lines while also recording
  `50` successful Server Proxy responses.
- Phase 2 started Server Proxy and native Capacitor direct-IP work together
  through `Promise.any`.
- The native request used `https://<resolved-ip>/...` plus an HTTP `Host`
  header. The header is sent after TLS negotiation and cannot provide the
  hostname needed for SNI/certificate selection.
- Capacitor 6 exposes no native `AbortSignal`, so a Server Proxy winner could
  not cancel the already-started native handshake.

### RED

Command:

```text
./node_modules/.bin/vitest run src/utils/tmdbClient.nativeFallback.test.js
```

Result: `2 failed, 1 passed`.

- Server Proxy succeeded, but `CapacitorHttp.get` still ran.
- After a simulated `HANDSHAKE_FAILURE_ON_CLIENT_HELLO`, the next request
  repeated the same IP URL and returned `capacitor_doh`.
- Existing poster isolation assertion already passed.

### Fix

- Phase 2 is now strict waterfall: Server Proxy, then native fallback only
  when the proxy did not return valid metadata.
- First native SNI/handshake failure opens a session-long direct-IP circuit.
- Once open, native fallback keeps the TMDB hostname in the URL, preserving
  TLS SNI and certificate verification; it does not resolve/retry the IP URL.
- Remaining cascade order stays
  Worker/Lampa → Server Proxy → Capacitor → Corsproxy → Kinopoisk.
- No TLS-verification bypass or `rejectUnauthorized` option was added.
- Image mirrors/proxy/wsrv logic remains independent of native DoH.

### GREEN

- Targeted native fallback tests: `3/3` passed.
- Combined TMDB routing/cache/image tests: `20/20` passed.
- Full client suite: `40` files, `352/352` passed.
- ESLint for implementation and new test: exit `0`.
- Production build: PASS.
- Capacitor sync: PASS.
- Android Gradle: `BUILD SUCCESSFUL`.

### APK runtime evidence

- Built and installed APK SHA-256 matched exactly:
  `70fb87f03d7f313a54274b3842bac5f04b6112f733f47ee381d5cb9b54b3a535`.
- Cold Home load reached `Server OK`; TMDB metadata and poster grids were
  visibly populated after the upper Lampa attempt produced no valid winner.
- Bounded Logcat: `755` lines, SHA-256
  `972171ace1e2cacca3f59c70cbb08af8b10644a8a9e16acdb0cdcbd6757a43e8`.
- Server Proxy successes: `12`.
- `Trying CapacitorHttp + DoH`: `0`.
- TLS/SNI failure signatures: `0`.
- Fatal exceptions/ANRs: `0`.
- Log:
  `output/debug-2026-07-24/bug-04-cold-home.log`.
- Screenshot:
  `output/debug-2026-07-24/bug-04-home-after.png`
  (SHA-256
  `99c4ad0ad19087653a8389fc12304e4482786feb293091ab4b0c64402dd91b98`).

### Changed files

- `client/src/utils/tmdbClient.js`
- `client/src/utils/tmdbClient.nativeFallback.test.js`

### Remaining risk

- Runtime did not deliberately break the working Server Proxy on the user's
  configured server. The lower-layer failure sequence and one-time SNI breaker
  are deterministic in component-level network tests; APK acceptance proves
  the production cold-load path no longer starts that lower layer after proxy
  success.

## BUG-06 — Initial focus and visual consistency

Status: fixed and APK-verified for MovieDetail/TorrentModal; UpdateModal
verified with real DOM/SpatialEngine tests.

### Reproduction and root cause

- MovieDetail registered its actions in `detail` but never selected a preferred
  action, leaving `document.activeElement` on `body` after real navigation.
- UpdateModal registered `modal` actions but never requested focus and did not
  restore the previously focused element.
- TorrentModal used generic recovery inside a later animation frame, without a
  stable preferred id.
- Focus rings mixed blue/yellow/white/red across screens instead of one
  high-contrast TV focus indicator.
- Targeted lint also exposed an existing MovieDetail conditional hook after an
  early return.

### RED

Command:

```text
./node_modules/.bin/vitest run src/components/MovieDetail.test.jsx \
  src/components/TorrentModal.test.jsx \
  src/components/UpdateModal.test.jsx
```

Result: `5 failed, 5 passed`.

- MovieDetail did not focus its primary torrent action.
- TorrentModal left the prior background action focused.
- UpdateModal normal, forced, and retry states all left prior focus active.

### Fix

- MovieDetail registers/focuses preferred id `detail-torrents` after ref
  registration.
- UpdateModal uses `update-install`, refocuses it when retry UI remounts, and
  restores the connected prior element on unmount.
- TorrentModal uses deterministic preferred id `torrent-close`; delete
  confirmation directly focuses `delete-confirm-cancel`.
- No new modal zone or competing navigation handler was introduced.
- Global `.focusable:focus` uses one mint ring
  (`rgba(45, 212, 191, 0.92)`) while retaining each action's contrast.
- MovieDetail hooks now execute unconditionally; dead loading state/imports
  were removed and effect dependencies made explicit.

### GREEN

- Targeted Detail/Torrent/Update focus tests: `10/10` passed.
- Related modal/spatial/error tests: `18/18` passed.
- Full client suite: `41` files, `357/357` passed.
- ESLint for all BUG-06 component/test files: exit `0`.
- Production build: PASS.
- Capacitor sync: PASS.
- Android Gradle: `BUILD SUCCESSFUL`.

### APK runtime evidence

- Built and installed APK SHA-256 matched exactly:
  `e9e41e54cd0a667d82b31a4ba93f996227984606b3c294dcc32a4827f6e7002c`.
- Real Home → MovieDetail navigation immediately focused
  `Торренты · 63`; screenshot confirms the mint ring.
- System Back restored the exact Home target:
  `rowId=tv_on_the_air`, `itemIndex=3`, vertical `13466`, horizontal `349`.
- A real existing torrent card opened TorrentModal without add/play/delete;
  initial focus was `✕`.
- System Back restored the previous torrent poster (`Andor`, 4K/DV/HDR).
- Bounded Logcat: `1067` lines; one expected `detail-torrents` and one
  `torrent-close` focus marker; `0` fatal exceptions/ANRs.
- Log SHA-256:
  `0a1ef1fc11d8cfda05c0de3460a65453aa1a6eca33f2e2e9de9e9b7731c3bea7`.
- Screenshots:
  `output/debug-2026-07-24/bug-06-verify-detail-focus-1.png` and
  `bug-06-verify-torrent-focus-1.png`.

### Changed files

- `client/src/components/MovieDetail.jsx`
- `client/src/components/MovieDetail.test.jsx`
- `client/src/components/TorrentModal.jsx`
- `client/src/components/TorrentModal.test.jsx`
- `client/src/components/UpdateModal.jsx`
- `client/src/components/UpdateModal.test.jsx`
- `client/src/index.css`

### Remaining risk

- A production UpdateModal was not forced by mutating app/update storage.
  Normal, forced-single-button, download-error retry, and prior-focus restore
  use the real DOM and SpatialEngine in regression tests. Runtime acceptance
  covers both safely reachable production focus surfaces.

## BUG-05 — Performance A/B

Status: pending.

## BUG-07 — Android resume

Status: pending.

## BUG-08 — Playback durability design

Status: pending; no server API implementation authorized.
