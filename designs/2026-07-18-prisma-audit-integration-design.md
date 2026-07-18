# Prisma + Audit Integration Design

## Status

Approved by user on 2026-07-18.

## Context

Prisma-inspired hybrid Home was not deleted. It remains complete in
`codex/hybrid-discovery-home` at `258e147`. Recent debugging and performance
work continued independently in `codex/tv-home-performance`, followed by the
full audit in `codex/full-project-audit`.

Both lines start from `1b23f81` and modify the same Home and navigation files:

- Prisma branch: 35 client test files, 321 tests passing, Vite build passing;
- audit branch: 29 client test files, 184 tests passing, 130 server tests
  passing, Vite/Capacitor/Gradle passing;
- audit branch also includes measured TV performance changes and confirmed
  server/security fixes.

Choosing either branch alone loses valid work from the other. Integration must
preserve both behavior sets.

## Goal

Restore the complete Prisma hybrid Home on top of all audit and TV performance
fixes:

- Swipe Hero and focus-trapped Swipe Picker;
- editorial discovery cards;
- ranked Top-10 row;
- personalized and poster rows;
- registry-driven composition;
- cached snapshot and focus/scroll restoration;
- viewport-bounded, centered, TV-first navigation;
- bounded lazy loading and memoized row rendering.

## Non-Goals

- No server deployment, NAS/VPS change, push, PR, release, or APK publication.
- No changes to `FLAG_ACTIVITY_SINGLE_TOP`, `FLAG_ACTIVITY_NEW_TASK`, or
  `FLAG_ACTIVITY_CLEAR_TOP`.
- No dependency upgrade or torrent-engine replacement.
- No broad remediation of audit risks such as API authentication, `SEC-01`, or
  legacy dependency migration in this integration. Confirmed audit defects are
  already fixed; newly reproduced integration regressions are in scope.
- No pixel-for-pixel Prisma clone.
- No variable-size virtualization.

## Selected Approach

Merge `codex/hybrid-discovery-home` into `codex/full-project-audit`, then resolve
overlapping client files manually. This keeps the audit branch as the
integration branch and retains its server history unchanged.

Rejected alternatives:

1. Rebase work on the Prisma branch and replay audit/performance commits. This
   risks omitting one of more than 30 independent fixes.
2. Reimplement Prisma manually. This duplicates validated work and creates
   behavioral drift.

## Architecture

### Home composition

`ContentRowsRegistry` remains the source of truth for row identity, order,
layout, source, tier, cache TTL, and fetcher. `HomePanel` remains an orchestrator
and does not absorb row-specific rendering rules.

Renderers remain isolated:

- `SwipeHero` and `SwipePicker`;
- `EditorialRow`;
- `RankedRow`;
- `HomeRow` for poster and personal rows;
- `TVRowShell` for shared TV row behavior.

### Metadata and images

All external metadata requests pass through `tmdbClient.js`. Integration must
not introduce direct component-level metadata `fetch()` calls.

JSON and image paths remain isolated:

- JSON: custom worker → Lampa → server proxy → native CapacitorHttp/DoH →
  browser proxy → text-only Kinopoisk fallback;
- images: TMDB mirrors → image auto-ban → server/image proxy where applicable →
  `wsrv.nl`;
- DoH and IP-direct paths are never used for images.

### Navigation

Navigation state is logical, not dependent on DOM focus survival:

- active row ID;
- focused item index;
- horizontal row offset;
- vertical Home offset;
- originating row/card restored after detail or modal return.

Local row navigation ignores all input when `isActive` is false. Global
`SpatialNavigation` coordinates toolbar, sidebar, Home rows, detail, and modal
boundaries.

Critical TV performance contracts from the debug branch remain mandatory:

- Home rows constrained to viewport width;
- first poster begins at 32 CSS px;
- focused card centers within ±1 CSS px once centering is possible;
- last card centers within ±1 CSS px;
- horizontal geometry scans stay inside the active row;
- focus never leaves viewport;
- unchanged rows remain memoized during lazy loading;
- image mirror state is not rewritten when unchanged;
- tier-three rows do not eagerly load before user vertical intent;
- resume row uses actual row width for final-card centering.

## Data Flow

1. Read and validate the latest Home snapshot from `localStorage`.
2. Render valid cached rows immediately.
3. Load tier-one registry entries with metadata concurrency at most three.
4. Build Swipe candidates from cached or newly loaded normalized items.
5. Start tier-two work after the first interactive frame.
6. Start tier-three rows only through vertical intent, observer, or bounded
   fallback; tier-three concurrency remains one.
7. Replace rows in place without resetting active row, focused index, or scroll.
8. Persist bounded normalized snapshots and navigation state.

Home rows contain at most 20 media items; ranked rows contain at most 10.
Larger future surfaces must use fixed-size virtualization with overscan of at
least three rows.

## Failure Handling

- Row failures remain isolated and cannot remove successful neighboring rows.
- A failed refresh retains the last valid stale snapshot.
- Trakt discovery failure falls back to TMDB trending while preserving ranked
  presentation.
- Invalid cached rows are discarded without breaking other cached rows.
- Empty personal, 4K, watchlist, or Swipe candidate sets hide their optional
  surfaces.
- Image failure advances only through the image fallback chain and never changes
  metadata provider health.
- Back closes Swipe/detail/subview before leaving Home and restores originating
  focus.
- Technical errors are logged with row/provider identity; raw exception text is
  not shown in Home UI.

## Merge Strategy

The merge must not accept all conflicts from either side. Six overlap zones
require behavior-level reconciliation:

1. `HomePanel.jsx`: preserve Prisma registry/renderers/snapshot flow and audit
   tier gating, memoization, stable props, and active-row state.
2. `HomeRow.jsx`: preserve Prisma shortcuts/card variants and audit viewport,
   centering, row-local geometry, and image-write guards.
3. `useSpatialNavigation.js`: preserve Prisma modal/row integration and audit
   active-zone geometry constraints.
4. `useTVNavigation.js`: preserve the complete `isActive` contract and local
   trap/loop behavior.
5. `discover.js`: preserve Prisma normalized row sources and current resilience
   behavior.
6. `tmdbClient.js`: preserve Prisma adapters/cache changes and audit image/TLS
   traffic assumptions without adding direct metadata fetches.

Non-overlapping server audit fixes remain byte-for-byte unchanged unless a
failing integration test proves a dependency.

## Test-Driven Integration

Start the merge with `--no-commit`. Tests imported from both branches provide
the first RED state while the merge is pending. Resolve conflicts only far
enough to run focused tests, confirm each failure represents a missing contract,
then implement the smallest reconciliation. Create the merge commit only after
all imported tests are green.

For any integration regression not covered by imported tests, add a focused
test, run it against the incomplete merged behavior, and confirm the expected
RED result before changing production code.

Required behavior groups:

1. Registry order, layout selection, source, tier, and fetcher.
2. Swipe skip/favorite/open/Back and focus trap.
3. Editorial/ranked rendering and Trakt fallback.
4. Snapshot validation, stale restore, and navigation restoration.
5. `isActive=false` ignores all local D-Pad input.
6. Horizontal focus measures only the active row.
7. Viewport width and first/final card centering.
8. Memoized rows do not rerender during unrelated lazy loads.
9. Tier-three rows wait for vertical intent.
10. Unchanged image mirror state is not rewritten.
11. No external metadata call bypasses `tmdbClient.js`.
12. Audit contracts: strict Range, HEAD without body, abort cleanup, TLS secure
    default, torrent alias eviction, stable torrent action name, and complete
    Android player result.

Each independent post-merge regression receives a RED test commit and a GREEN
fix commit. No unrelated cleanup is bundled with conflict resolution.

## Verification

Automated gates:

- full server suite;
- full client suite containing both Prisma and audit tests;
- source-only ESLint, with pre-existing debt reported separately;
- Vite production build;
- Capacitor Android sync;
- Gradle debug APK build;
- `git diff --check` and clean worktree.

Emulator gates:

- 20 rapid Right presses;
- 15 rapid Down and 15 rapid Up presses;
- long vertical scroll and key repeat;
- first item at 32 px;
- centered focused and final cards within ±1 px;
- focus inside viewport;
- correct Up/Down row selection;
- Enter opens selected item;
- Back restores Home/focus;
- touch opens selected card;
- Swipe modal skip/favorite/open/Back;
- `dumpsys gfxinfo` frame p50/p90/p95 and jank percentage;
- WebView console check for unhandled errors.

## Commit Structure

1. Green merge commit preserving both branch histories and imported tests.
2. One RED test commit and one GREEN fix commit per uncovered integration
   regression.
3. Final test/diagnostic updates where needed.
4. Updated audit/integration report.

No generated APK, build assets, captures, credentials, or local data are
committed.

## Acceptance Criteria

Integration is complete only when:

- complete Prisma Home is visible and D-Pad accessible;
- all confirmed audit fixes remain present;
- Prisma and audit client tests pass together;
- all server tests pass;
- Vite, Capacitor, and Gradle complete successfully;
- TV centering and viewport contracts pass automated and emulator checks;
- no new metadata request bypasses `tmdbClient.js`;
- no immutable TVPlayer flag changes;
- remaining lint/security/performance debt is measured and reported, not hidden;
- integration branch remains local and unpushed.
