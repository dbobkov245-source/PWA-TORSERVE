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

Status: pending.

## BUG-04 — Native direct-IP DoH

Status: pending.

## BUG-06 — Initial focus and visual consistency

Status: pending.

## BUG-05 — Performance A/B

Status: pending.

## BUG-07 — Android resume

Status: pending.

## BUG-08 — Playback durability design

Status: pending; no server API implementation authorized.
