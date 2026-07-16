# Android TV Home Performance Audit — 2026-07-16

## Scope and environment

- Branch: `codex/tv-home-performance`, baseline commit `1b23f81`.
- APK: local debug build from baseline source; Android `versionCode 37`, `versionName 3.17.2`.
- Target: `emulator-5554`, Google Android TV ARM64, 3840×2160, density 640.
- WebView viewport: 960×540 CSS px, DPR 4.
- Existing app data and metadata/image caches were preserved. This matches warm-start user behavior, but network-transfer byte totals are therefore lower bounds.
- No native `TVPlayer` flags were changed.

Artifacts:

- `output/tv-performance/baseline-home.png`
- `output/tv-performance/baseline-bottom.png`

## Baseline

### Android frame and memory metrics

| Scenario | Frames | Janky / deadline-missed | Janky % | p50 | p90 | p95 | Missed vsync | High input latency |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Startup and idle load | 66 | 42 | 63.64% | 21 ms | 105 ms | 150 ms | 6 | 31 |
| 20 rapid Right | 6 | 4 | 66.67% | 150 ms | 350 ms | 350 ms | 2 | 5 |
| 15 Up/Down transitions | 5 | 3 | 60.00% | 32 ms | 250 ms | 250 ms | 0 | 4 |
| Long vertical D-Pad scroll | 26 | 16 | 61.54% | 34 ms | 250 ms | 350 ms | 3 | 19 |

`dumpsys meminfo` after initial load reported 148,147 KiB total PSS and 234,016 KiB total RSS. After the long scroll it reported 141,882 KiB PSS and 200,432 KiB RSS, with 29,573 KiB swap PSS. The process did not show monotonic resident-memory growth during this run; large DOM and image counts remain the primary memory pressure evidence.

### WebView, DOM, requests, and events

Idle state after tier loading:

- 3,107 DOM elements.
- 41 rendered home rows.
- 824 focusable elements.
- 780 movie cards and 780 `<img>` elements.
- 434 decoded/complete images before long scroll; 696 after long scroll.
- Resource Timing retained 167 image resources out of a full 250-entry buffer. Transfer size was zero for retained image entries because app caches were warm.
- 65 WebView console warnings/errors and 29 Chromium SSL errors in the captured logcat window; zero fatal exceptions. Most errors came from certificate/OCSP validation and resilience-cascade fallbacks. One warning reported duplicate `TVPlayer` registration. These are recorded but are outside this performance-only change set.

Runtime counters:

| Scenario | keydown | focus | scroll | RAF requests/callbacks | rect reads | `focus()` | `scrollIntoView()` | storage reads | storage writes | image loads |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 20 rapid Right | 20 | 19 | 1 | 0 / 0 | 15,736 | 19 | 18 | 56,243* | 14,053* | 23 |
| 15 Up/Down | 15 | 15 | 3 | 0 / 0 | 12,376 | 15 | 15 | 3,138 | 780 | 0 |
| Long vertical scroll | 35 | 35 | 6 | 0 / 0 | 28,901 | 35 | 35 | 9,456 | 2,340 | 262 |

`*` The 20-Right storage sample also included 41 seconds of background tier loading. The shorter Up/Down run isolates one React commit and shows exactly one mirror write per rendered movie card.

### React renders

Temporary counters were added to component render bodies, measured in a separate diagnostic APK, then removed before any commit.

| Scenario | HomePanel renders | HomeRow renders | MovieCard renders |
|---|---:|---:|---:|
| Full idle loading cycle | 25 | 662 | 13,240 |
| 20 rapid Right | 14 | 546 (`39 rows × 14`) | 10,920 (`780 cards × 14`) |
| 15 batched Up/Down | 1 | 39 | 780 |

## Confirmed defects

### PERF-01 — Tier-3 fallback timer defeats lazy loading

Evidence:

- `DISCOVERY_CATEGORIES` declares 27 tier-3 rows as “fetch when scrolled into view”.
- `HomePanel` timer runs every 1,600 ms and unconditionally queues the next unloaded tier-3 category, even at `scrollTop=0`.
- Idle page reached 41 rows, 780 cards/images, and 824 focusables without user scrolling.

Root cause: the fallback poller both checks geometry and independently loads the next category. The second action turns lazy loading into time-staggered eager loading.

### PERF-02 — Every focus update rerenders every loaded row and card

Evidence:

- 20 Right caused 14 `HomePanel` renders, 546 row renders, and 10,920 card renders.
- `HomeRow` is not memoized.
- `handleItemClick` and `handleMoreClick` are recreated by `HomePanel` on each render.
- Each card calls `getPosterUrl()` during render, multiplying synchronous image-routing work.

Root cause: focus changes update `focusedItem` in `HomePanel`; unstable handler props plus un-memoized rows propagate each parent render through the complete home tree.

### PERF-03 — Image URL calculation writes localStorage during render

Evidence:

- One batched Up/Down commit caused exactly 780 storage writes for 780 cards.
- `getPosterUrl()` → `getImageUrl()` → `getCurrentImageMirror()` always executes `localStorage.setItem('tmdb_img_mirror', preferredMirror)` even when the stored value already matches.

Root cause: read-only URL calculation has an unconditional synchronous persistence side effect.

### PERF-04 — Horizontal navigation measures the complete home DOM

Evidence:

- 20 Right caused 15,736 bounding-rect reads; 15 Up/Down caused 12,376.
- `SpatialEngine.move()` passes all 824 visible zone elements to `findNearest()` for every direction.
- Horizontal neighbors exist in the current `.snap-container`; other rows cannot be valid horizontal destinations.

Root cause: navigation candidate scope is global even when direction and row structure permit a small local set.

### NAV-01 — Home row width escapes viewport; focus scroll moves the whole panel

Evidence:

- Viewport width: 960 CSS px.
- Focused row: `clientWidth=scrollWidth=3114`, so it cannot scroll itself.
- Outer app wrapper: `clientWidth=960`, `scrollWidth=3118`, `scrollLeft=2158` after 20 Right.
- Focused card center was x=859 instead of required x=480 ±1.
- Screenshot shows every row shifted left together.

Root cause: flex content lacks `min-width: 0`. Long row content establishes a 3,114 px minimum width and `scrollIntoView()` scrolls the outer hidden wrapper. `scrollIntoView()` also lacks `inline: 'center'`, and row end spacing is insufficient to center the last card.

## Hypotheses not confirmed for changes

- Duplicate global navigation listeners: code has multiple specialized `keydown` handlers, but cleanup functions exist and event counts matched injected key counts. No duplicate move processing was observed.
- Uncancelled RAF/timers: interaction counters saw no application RAF requests in tested Right/Up/Down paths. The left-edge RAF is one-shot; timer cleanup exists. Tier-3 timer behavior is a logic defect, not a leak.
- Backdrop decode/blur: no backdrop was rendered by current `HomePanel` markup despite backdrop state updates. No focused fix justified.
- Virtualization: current DOM size proves over-rendering, but timer correction and memoization are lower-risk first steps. `react-window` should be reconsidered only if post-fix DOM/frame metrics remain outside targets.
- Image layout shift: cards use fixed width plus `aspect-ratio`; no geometry jump was observed during loading.

## Baseline test/build state

- `npm run build`: passed.
- `npm exec -- cap sync android`: passed.
- `./gradlew assembleDebug`: passed.
- `npm run test:run`: 168/172 tests passed; four pre-existing failures:
  - three `MovieTorrentAction` tests expect an exact accessible name that now includes summary text;
  - one `serverApi` test expects `192.168.1.70`, while implementation uses `192.168.8.203`.

These failures predate this branch and are outside the audit scope.

## Implemented isolated fixes

1. Added `min-w-0` to the Home content flex child so every `.snap-container` owns its horizontal overflow instead of widening the whole app.
2. Centered horizontal `scrollIntoView()` and added enough trailing row padding to center the final `Ещё` card.
3. Restricted horizontal spatial-navigation candidates to the active `.snap-container`.
4. Removed the timer's unconditional next-tier-3 load; the timer now only checks whether lazy placeholders are near the viewport.
5. Memoized `HomeRow`, stabilized item/more callbacks, and made the more callback read `rowsByIdRef` so streamed category state does not invalidate every existing row.
6. Avoided rewriting `tmdb_img_mirror` when the preferred mirror is already selected.
7. Gated tier-3 loading on real vertical movement; the first 14 tier-1/2 rows now remain the complete idle working set.
8. Used separate trailing-space rules for 130 px discovery cards and 200 px Continue Watching cards.

No dependency, native player flag, server, Docker, or infrastructure changes were made. Virtualization was not added: after correcting idle loading and render propagation, the lower-risk fixes met the interaction profile targets without changing focus semantics.

## Post-fix Android profile

The final APK was rebuilt, installed with existing app data intact, and exercised through ADB and WebView CDP using the same 960×540 CSS viewport.

### Frame-time comparison

| Scenario | Baseline p50 / p90 / p95 | Post-fix p50 / p90 / p95 | Baseline jank | Post-fix jank |
|---|---:|---:|---:|---:|
| 20 rapid Right | 150 / 350 / 350 ms | 17 / 26 / 27 ms | 4/6 (66.67%) | 3/62 (4.84%) |
| 15 alternating Up/Down | 32 / 250 / 250 ms | 17 / 17 / 25 ms | 3/5 (60.00%) | 2/34 (5.88%) |
| Long 35×Down scroll with lazy loading | 34 / 250 / 350 ms | 26 / 32 / 32 ms | 16/26 (61.54%) | 5/120 (4.17%) |

The final samples reported zero missed vsync and zero slow UI-thread frames. Absolute emulator frame times vary with network/cache activity; the before/after tail-latency and deadline-miss reductions were repeatable across candidate builds.

### Runtime-work comparison

| Scenario | Rect reads baseline → final | Storage reads baseline → final | Storage writes baseline → final |
|---|---:|---:|---:|
| 20 rapid Right | 15,736 → 487 (−96.9%) | 56,243* → 113 | 14,053* → 0 |
| 15 alternating Up/Down | 12,376 → 6,926 (−44.0%) | 3,138 → 75 (−97.6%) | 780 → 0 |
| Long 35×Down scroll | 28,901 → 19,849 (−31.3%) | 9,456 → 1,832 (−80.6%) | 2,340 → 2 |

`*` As noted in the baseline section, background eager tier-3 loading overlapped that first baseline sample. A separate pre-final long-scroll candidate exposed 50,552 storage reads while new categories streamed in; stabilizing `handleMoreClick` reduced the same full-load path to 1,902 reads (−96.2%) and jank from 12.20% to 1.05%.

### Idle DOM, images, and memory

After the same idle period at the top of Home:

| Metric | Baseline | Post-fix | Change |
|---|---:|---:|---:|
| DOM elements | 3,107 | 1,432 | −53.9% |
| Focusables | 824 | 299 | −63.7% |
| Movie cards / images | 780 / 780 | 280 / 280 | −64.1% |
| Home rows | 41 | 41 | unchanged: unloaded tier-3 rows remain lightweight placeholders |

After 50 seconds idle, only the 14 tier-1/2 rows were materialized; 15 Down movements then grew the catalog from 280 to 400 cards, proving the tier-3 queue activates on vertical navigation. After the intentional full traversal, 800 cards/images were loaded and 702 were decoded. Final memory was 133,956 KiB PSS, 209,172 KiB RSS, and 11,946 KiB swap PSS. This does not establish a memory improvement: baseline/post-fix cache and network states differ, while the full traversal deliberately materializes almost the same catalog. The important idle-memory pressure proxy—the initial card/image count—fell by 64%.

The final process accumulated 115 WebView warning/error log lines during the longer full audit and zero fatal exceptions. They remained certificate/SSL and resilience-cascade fallback messages; the performance fixes introduced no new console-error class.

## Regression matrix

| Check | Result |
|---|---|
| First card starts at 32 CSS px | Pass: measured x=32 |
| Early cards move toward center | Pass |
| Focused horizontal card stays on center axis | Pass: card center 478, row center 478 |
| Final card centers within ±1 px | Pass: discovery 478 vs 478; 200 px Continue Watching 478 vs 478 |
| Focus remains in viewport | Pass in Right, alternating rows, and long scroll |
| Up/Down chooses correct row | Pass: recorded 15-event alternating row sequence |
| Enter opens selected film | Pass: selected card opened MovieDetail actions |
| Android Back returns to Home | Pass |
| Touch horizontal scroll | Pass: 200 px gesture produced 203 px scroll |
| Mouse/click selection | Pass: click opened the named second movie |
| Inactive rows ignore horizontal D-Pad | Pass: focused-unit test proves other-row cards are not measured or selected |
| Rapid/held-style Right creates no animation queue | Pass: scroll settled at 2,539 px and stayed unchanged for the last 1 s of sampling |
| Images cause no layout jump | Pass: 799 non-focused cards stayed 130×195 px across 728 loaded and 71 pending images; only the focused card had the intentional transform |

Screenshots:

- `output/tv-performance/final-home.png`
- `output/tv-performance/final-bottom.png`

## Final verification

- Independent read-only review found two important edge cases (Continue Watching width and pre-scroll tier-3 activation); both received RED tests, fixes, Android measurements, and separate commits before this verification.
- Focused performance/regression tests: 22/22 passed, including behavioral no-scroll/then-scroll tier-3 loading.
- ESLint on the six added/changed regression-test files: passed.
- Project-wide `npm run lint`: existing configuration scans generated Android assets and reports 508 pre-existing/generated problems; this branch did not broaden scope to repair that baseline.
- `npm run test:run`: 179/183 passed. The same four pre-existing failures remain: three stale exact accessible-name expectations in `MovieTorrentAction.test.jsx`, and one stale native default LAN IP in `serverApi.test.js`.
- `npm run build`: passed.
- `npm exec -- cap sync android`: passed.
- `./gradlew assembleDebug`: passed.
- Debug APK: `client/android/app/build/outputs/apk/debug/app-debug.apk`.
- APK SHA-256: `7b584965cc1727ecfed21d4e5f0242f9699bb9088e571810dac914e67f3d8b79`.

No remote push, PR, release, deployment, or publication was performed. Existing unrelated untracked files were not modified or staged.
