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

## Planned isolated fixes

1. Restore per-row horizontal sizing and center alignment.
2. Restrict horizontal geometry search to current row.
3. Stop unconditional tier-3 idle loading while retaining geometry polling fallback.
4. Memoize rows after stabilizing parent handlers.
5. Avoid redundant mirror persistence during URL calculation.
6. Rebuild APK, repeat identical profiles, and retain only measured improvements.

