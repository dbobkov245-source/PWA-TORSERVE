# Prisma + Audit Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge complete Prisma hybrid Home into `codex/full-project-audit` while preserving every audit fix and measured Android TV performance contract.

**Architecture:** Keep Prisma registry, renderers, snapshot, and logical focus model as Home structure. Reconcile six overlapping files against performance regression tests while merge remains uncommitted, then commit only a green merge. Preserve server audit code; union only server test-runner imports.

**Tech Stack:** React 19, Vitest 3, Testing Library, Vite 7, TailwindCSS 4, Capacitor 6, Java/Gradle Android, Node.js/Express.

## Global Constraints

- Work only in `/Volumes/SSD Storage/PWA-TorServe/.worktrees/full-project-audit` on `codex/full-project-audit`.
- Merge source is `codex/hybrid-discovery-home` at `258e147`.
- No push, PR, deploy, release, NAS/VPS/Docker mutation, dependency upgrade, or generated artifact commit.
- Never change `FLAG_ACTIVITY_SINGLE_TOP`, `FLAG_ACTIVITY_NEW_TASK`, or `FLAG_ACTIVITY_CLEAR_TOP`.
- Every external metadata request must pass through `client/src/utils/tmdbClient.js`.
- DoH/IP-direct is JSON-only; images use mirrors → auto-ban → image proxy/`wsrv.nl`.
- `useTVNavigation({ isActive: false })` must ignore every key.
- First Home poster begins at 32 CSS px; centered and final cards remain within ±1 CSS px.
- Home rows contain at most 20 items; ranked row at most 10.
- Preserve pre-existing root worktree untracked files; do not stage them.
- Use `apply_patch` for manual file edits.

---

## File Map

### Imported Prisma units

- `client/src/components/SwipeHero.jsx`: opens recommendation picker.
- `client/src/components/SwipePicker.jsx`: focus-trapped skip/favorite/open modal.
- `client/src/components/EditorialRow.jsx`: wide discovery cards.
- `client/src/components/RankedRow.jsx`: ordered Top-10 cards.
- `client/src/components/TVRowShell.jsx`: local row focus and centered scroll shell.
- `client/src/utils/homeRows.js`: normalized registry row orchestration helpers.
- `client/src/utils/homeSnapshot.js`: bounded cached Home snapshot validation.

### Manual conflict units

- `client/src/components/HomePanel.jsx`: Prisma orchestrator plus audit tier/memoization contracts.
- `client/src/components/HomePanel.test.jsx`: union Prisma behavior and audit source contracts.
- `client/src/components/HomeRow.jsx`: Prisma poster/shortcut presentation plus audit render/centering contracts.
- `client/src/hooks/useSpatialNavigation.js`: Prisma vertical/banner behavior plus audit active-row horizontal scope.
- `client/src/hooks/useSpatialNavigation.test.js`: union scroll-ownership and row-scope tests.
- `server/__tests__/run-tests.js`: union Trakt and audit test imports.

### Auto-merged but mandatory review units

- `client/src/hooks/useTVNavigation.js`
- `client/src/index.css`
- `client/src/utils/ContentRowsRegistry.js`
- `client/src/utils/discover.js`
- `client/src/utils/tmdbClient.js`
- `client/src/components/MovieTorrentAction.jsx`
- `client/android/app/src/main/java/com/torserve/pwa/TVPlayer.java`

---

### Task 1: Start Green-Controlled Pending Merge

**Files:**
- Merge source: `codex/hybrid-discovery-home`
- Conflict: `client/src/components/HomePanel.jsx`
- Conflict: `client/src/components/HomePanel.test.jsx`
- Conflict: `client/src/components/HomeRow.jsx`
- Conflict: `client/src/hooks/useSpatialNavigation.js`
- Conflict: `client/src/hooks/useSpatialNavigation.test.js`
- Conflict: `server/__tests__/run-tests.js`

**Interfaces:**
- Consumes: clean audit branch at design/plan commits.
- Produces: pending `--no-commit` merge containing both branch trees and exact conflict set.

- [ ] **Step 1: Verify clean branch and both baselines**

Run:

```bash
git status --short --branch
node server/__tests__/run-tests.js
cd client && npm test -- --run
```

Expected: clean `codex/full-project-audit`; server `130/130`; client `184/184`.

- [ ] **Step 2: Verify Prisma baseline remains green**

Run from `/Volumes/SSD Storage/PWA-TorServe/.worktrees/hybrid-discovery-home/client`:

```bash
npm test -- --run
npm run build
```

Expected: 35 files, 321 tests passed; Vite build passed.

- [ ] **Step 3: Start merge without committing**

Run:

```bash
git merge --no-ff --no-commit codex/hybrid-discovery-home
git status --short
```

Expected: pending merge; only listed overlap files require manual conflict resolution. Do not run `git commit` yet.

- [ ] **Step 4: Confirm immutable and server audit files were not replaced**

Run:

```bash
git diff -- client/android/app/src/main/java/com/torserve/pwa/TVPlayer.java server/index.js server/streamSource.js server/torrent.js server/utils/doh.js server/utils/range.js
```

Expected: Prisma merge adds no changes to these production files. Existing audit changes remain in index/history.

---

### Task 2: Reconcile TV Navigation

**Files:**
- Modify: `client/src/hooks/useSpatialNavigation.js`
- Modify: `client/src/hooks/useSpatialNavigation.test.js`
- Verify: `client/src/hooks/useTVNavigation.js`
- Test: `client/src/hooks/useTVNavigation.test.jsx`

**Interfaces:**
- Consumes: `.snap-container`, `.focusable`, `SpatialEngine.zones`, `useTVNavigation(options)`.
- Produces: horizontal row-scoped global movement; vertical Prisma movement; local index-based centered scrolling; complete `isActive` contract.

- [ ] **Step 1: Resolve navigation tests as union**

Keep Prisma scroll-ownership test and add audit row-scope test:

```js
it('does not measure cards from other rows during horizontal movement', () => {
    const currentRow = document.createElement('div')
    currentRow.className = 'snap-container'
    const otherRow = document.createElement('div')
    otherRow.className = 'snap-container'
    const current = createFocusable({ left: 32 })
    const next = createFocusable({ left: 178 })
    const otherRowCard = createFocusable({ left: 178, top: 240 })
    currentRow.append(current, next)
    otherRow.append(otherRowCard)
    document.body.append(currentRow, otherRow)
    SpatialEngine.register('main', current)
    SpatialEngine.register('main', next)
    SpatialEngine.register('main', otherRowCard)
    current.focus()

    SpatialEngine.move('ArrowRight')

    expect(document.activeElement).toBe(next)
    expect(otherRowCard.getBoundingClientRect).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Resolve production file to Prisma behavior and verify RED**

Use Prisma `useSpatialNavigation.js` as structural base. Run:

```bash
cd client
npm test -- --run src/hooks/useSpatialNavigation.test.js src/hooks/useTVNavigation.test.jsx
```

Expected: row-scope test FAILS because Prisma version measures all visible zone elements. Scroll-ownership and `isActive` tests pass.

- [ ] **Step 3: Add minimal row-scoped horizontal candidate selection**

Replace candidate construction in `SpatialEngine.move()` with:

```js
const zoneElements = this.zones[this.activeZone] || new Set()
const allZoneElements = Array.from(zoneElements)
const isHorizontal = direction === 'ArrowLeft' || direction === 'ArrowRight'
const currentRow = isHorizontal && zoneElements.has(current)
    ? current.closest?.('.snap-container')
    : null
const candidates = currentRow
    ? Array.from(currentRow.querySelectorAll('.focusable')).filter(element => zoneElements.has(element))
    : allZoneElements
const elements = candidates.filter(element =>
    document.body.contains(element) &&
    element.offsetParent !== null &&
    element.tabIndex !== -1
)
```

Keep Prisma scroll ownership:

```js
next.focus({ preventScroll: true })
if (direction === 'ArrowUp' || direction === 'ArrowDown') {
    next.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' })
}
```

- [ ] **Step 4: Verify local hook contract**

Confirm `useTVNavigation` parameter destructuring ends with:

```js
export const useTVNavigation = ({
    itemCount,
    columns = 1,
    onSelect,
    onBack,
    itemRefs,
    loop = false,
    trapFocus = true,
    initialIndex = -1,
    isActive = true
}) => {
```

Confirm first line of key handler remains:

```js
if (!isActive || itemCount === 0) return
```

- [ ] **Step 5: Run focused tests to verify GREEN**

Run:

```bash
cd client
npm test -- --run src/hooks/useSpatialNavigation.test.js src/hooks/useTVNavigation.test.jsx
```

Expected: both test files pass; other-row rect mock untouched; inactive hook does not move or select.

---

### Task 3: Reconcile Prisma Row Rendering with Audit Performance

**Files:**
- Modify: `client/src/components/HomeRow.jsx`
- Modify: `client/src/components/HomeRow.test.jsx`
- Preserve: `client/src/components/HomeRow.render.test.jsx`
- Preserve: `client/src/components/HomeRow.test.js`
- Modify: `client/src/index.css`
- Verify: `client/src/components/TVRowShell.jsx`
- Test: `client/src/components/TVRowShell.test.jsx`

**Interfaces:**
- Consumes: normalized media items, `useTVNavigation`, `TVRowShell`, quality/watched state.
- Produces: Prisma poster row and shortcuts with memoized rendering, touch support, 32 px leading edge, centerable tail.

- [ ] **Step 1: Use Prisma HomeRow and imported tests as structural base**

Preserve `RowAction`, `В начало`, backdrop/poster variants, local navigation props, and `TVRowShell` integration. Keep current audit tests instead of deleting them.

- [ ] **Step 2: Run row tests to verify RED performance contracts**

Run:

```bash
cd client
npm test -- --run \
  src/components/HomeRow.test.jsx \
  src/components/HomeRow.render.test.jsx \
  src/components/HomeRow.test.js \
  src/components/TVRowShell.test.jsx
```

Expected: `HomeRow.render.test.jsx` FAILS because unadapted Prisma `HomeRow` is not memoized. Prisma row behavior tests pass.

- [ ] **Step 3: Restore memoized row boundary**

Add `memo` to the React import. Change component declaration from
`const HomeRow = forwardRef((` to `const HomeRow = memo(forwardRef((`, and
change its matching final `})` to `}))`. Keep:

```js
HomeRow.displayName = 'HomeRow'
export default HomeRow
```

All callbacks passed by `HomePanel` must remain stable so `memo` can skip unchanged rows.

- [ ] **Step 4: Preserve fixed centering geometry**

Poster scroll container must retain Prisma local navigation and inert edge spacers:

```jsx
<div
    ref={scrollRef}
    tabIndex={containerProps.tabIndex}
    className="snap-container tv-center-row gap-4 overflow-x-auto scrollbar-hide py-6 -my-4"
    style={centerRowStyle}
    onKeyDown={handleKeyDown}
    onScroll={handleScroll}
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
>
    <div className="tv-row-edge-spacer tv-row-leading-spacer" aria-hidden="true" />

    {showStart && (
        <RowAction
            index={startIndex}
            registerItem={registerItem}
            focused={isFocused(startIndex)}
            label="В начало"
            icon="←"
            onClick={goToStart}
            onFocus={() => setFocusedIndex(startIndex)}
        />
    )}

    {items.map((item, index) => (
        <MovieCard
            key={item.id || index}
            item={item}
            index={index + mediaOffset}
            layout={layout}
            registerItem={registerItem}
            onItemClick={onItemClick}
            onFocus={() => {
                setFocusedIndex(index + mediaOffset)
                onFocusChange?.(item, index, categoryId, scrollRef.current?.scrollLeft || 0)
            }}
            imageErrors={imageErrors}
            qualityBadges={qualityBadges}
            watched={watchedIds?.has(item.id)}
            focused={isFocused(index + mediaOffset)}
        />
    ))}

    {onMoreClick && (
        <RowAction
            index={moreIndex}
            registerItem={registerItem}
            focused={isFocused(moreIndex)}
            label="Показать все"
            icon="→"
            onClick={() => onMoreClick(categoryId)}
            onFocus={() => setFocusedIndex(moreIndex)}
        />
    )}

    <div className="tv-row-edge-spacer tv-row-trailing-spacer" aria-hidden="true" />
</div>
```

CSS must contain:

```css
.tv-center-row {
  --tv-row-gap: 1rem;
}

.tv-row-leading-spacer {
  flex: 0 0 1rem;
  width: 1rem;
}

.tv-row-trailing-spacer {
  flex: 0 0 max(2rem, calc(50% - var(--tv-row-card-half-width) - var(--tv-row-gap)));
  width: max(2rem, calc(50% - var(--tv-row-card-half-width) - var(--tv-row-gap)));
}
```

Tailwind `gap-4` adds the second `1rem`, so leading spacer places first media card at exactly 32 CSS px. Keep audit `resume-row-cards` on `ContinueWatchingRow`; its 200 px cards use separate trailing geometry.

- [ ] **Step 5: Verify row tests GREEN**

Run same four focused test files.

Expected: all pass; first item and final-card contracts retained; unchanged rows do not rerender.

---

### Task 4: Reconcile Prisma Home Orchestration with Bounded Lazy Loading

**Files:**
- Modify: `client/src/components/HomePanel.jsx`
- Modify: `client/src/components/HomePanel.test.jsx`
- Preserve: `client/src/components/HomePanel.lazy.test.jsx`
- Verify: `client/src/utils/ContentRowsRegistry.js`
- Verify: `client/src/utils/homeRows.js`
- Verify: `client/src/utils/homeSnapshot.js`

**Interfaces:**
- Consumes: registry rows, snapshot, renderers, history/favorites/Trakt, stable parent setters.
- Produces: ordered hybrid Home, optional rows, bounded tiers, isolated failures, stable row props, restored focus/scroll.

- [ ] **Step 1: Resolve HomePanel and test conflict to Prisma structure**

Keep Prisma imports and render paths for:

```js
SwipeHero
SwipePicker
EditorialRow
RankedRow
HomeRow
ContentRowsRegistry
buildHybridRows
readHomeSnapshot
writeHomeSnapshot
```

Merge audit tests into Prisma `HomePanel.test.jsx`; keep `HomePanel.lazy.test.jsx` as a separate focused test.

- [ ] **Step 2: Run focused tests to verify RED**

Run:

```bash
cd client
npm test -- --run \
  src/components/HomePanel.test.jsx \
  src/components/HomePanel.lazy.test.jsx \
  src/utils/ContentRowsRegistry.test.js \
  src/utils/homeRows.test.js \
  src/utils/homeSnapshot.test.js
```

Expected: Prisma registry/snapshot tests pass; audit idle tier-three or memoization contract fails before adaptation.

- [ ] **Step 3: Gate tier-three work on vertical intent**

Add persistent interaction gate:

```js
const lazyInteractionStartedRef = useRef(false)

const queueLazyLoad = useCallback((row) => {
    if (!lazyInteractionStartedRef.current) return
    if (!row?.id) return
    // retain Prisma retry, loaded, empty, in-flight, and queued checks
    queuedLazyIdsRef.current.add(row.id)
    pendingLazyIdsRef.current.push(row.id)
    drainLazyQueue()
}, [drainLazyQueue])
```

Scroll listener:

```js
const handleScroll = () => {
    if (!lazyInteractionStartedRef.current) {
        if (scroller.scrollTop <= 0) return
        lazyInteractionStartedRef.current = true
    }
    checkLazyRowsNearViewport()
}
```

Fallback interval:

```js
const id = setInterval(() => {
    if (lazyInteractionStartedRef.current) checkLazyRowsNearViewport()
}, 1600)
```

- [ ] **Step 4: Restore stable callbacks and viewport boundary**

Use stable handlers:

```js
const handleItemClick = useCallback((item) => {
    setPickerOpen(false)
    setActiveMovie(item)
}, [setActiveMovie])

const handleMoreClick = useCallback((rowId) => {
    const row = rowsByIdRef.current[rowId]
    if (row) setActiveCategory(row)
}, [setActiveCategory])
```

Main content wrapper must include `min-w-0`:

```jsx
<div className={`min-w-0 flex-1 relative transition-all duration-300 ease-out ${showSidebar ? 'translate-x-64 pointer-events-none' : 'translate-x-0'}`}>
```

- [ ] **Step 5: Verify Home orchestration GREEN**

Run same five focused test files.

Expected: all pass; registry order and snapshot behavior preserved; tier-three fetch count remains tier-one-only until simulated vertical scroll.

---

### Task 5: Preserve Metadata, Trakt, and Audit Contracts

**Files:**
- Review: `client/src/utils/tmdbClient.js`
- Review: `client/src/utils/discover.js`
- Review: `client/src/utils/ContentRowsRegistry.js`
- Modify: `server/__tests__/run-tests.js`
- Verify: `server/routes/trakt.js`
- Verify: `server/__tests__/trakt-discovery.test.js`
- Verify: `client/src/components/MovieTorrentAction.jsx`
- Verify: `client/src/utils/serverApi.test.js`
- Verify: `client/src/utils/tvplayer-source.test.js`
- Verify: `client/android/app/src/main/java/com/torserve/pwa/TVPlayer.java`

**Interfaces:**
- Consumes: TMDB resilience cascade, image mirror state, server Trakt proxy, audit test runner.
- Produces: Prisma metadata rows without direct metadata fetch, image isolation, complete server suite union, unchanged audit fixes.

- [ ] **Step 1: Union server test-runner imports**

End of `server/__tests__/run-tests.js` must include both branches:

```js
await import('./ts-download.test.js')
await import('./proxy.test.js')
await import('./system-pressure.test.js')
await import('./stream-monitor.test.js')
await import('./operation-tracker.test.js')
await import('./diagnostic-collector.test.js')
await import('./doh.test.js')
await import('./trakt-discovery.test.js')
```

- [ ] **Step 2: Verify image mirror write guard survived auto-merge**

`getCurrentImageMirror()` must contain:

```js
if (freeMirrors.includes(preferredMirror)) {
    if (lastMirror !== preferredMirror) {
        localStorage.setItem('tmdb_img_mirror', preferredMirror)
    }
    return preferredMirror
}
```

- [ ] **Step 3: Verify audit client fixes survived**

Required snippets:

```jsx
// MovieTorrentAction.jsx
aria-label={buttonLabel}
```

```java
// TVPlayer.java, data == null branch
ret.put("position", -1);
ret.put("duration", -1);
ret.put("finished", false);
```

Do not alter any Intent flags.

- [ ] **Step 4: Verify no new component metadata bypass**

Run:

```bash
/Applications/ChatGPT.app/Contents/Resources/rg -n "fetch\\s*\\(" \
  client/src/components/EditorialRow.jsx \
  client/src/components/RankedRow.jsx \
  client/src/components/SwipeHero.jsx \
  client/src/components/SwipePicker.jsx \
  client/src/utils/homeRows.js
```

Expected: no matches.

- [ ] **Step 5: Run metadata and audit focused tests**

Run:

```bash
node server/__tests__/run-tests.js
cd client
npm test -- --run \
  src/utils/tmdbClient.test.js \
  src/utils/tmdbClient.imageProxy.test.js \
  src/utils/discover.test.js \
  src/components/MovieTorrentAction.test.jsx \
  src/utils/serverApi.test.js \
  src/utils/tvplayer-source.test.js
```

Expected: server total increases by imported Trakt tests with 0 failures; all listed client tests pass.

---

### Task 6: Complete Merge and Automated Verification

**Files:**
- All merged source/test files
- Create merge commit only after gates pass

**Interfaces:**
- Consumes: resolved pending merge.
- Produces: green merge commit containing complete Prisma and audit histories.

- [ ] **Step 1: Confirm no conflict markers or unmerged entries**

Run:

```bash
git diff --check
git diff --name-only --diff-filter=U
/Applications/ChatGPT.app/Contents/Resources/rg -n '^(<<<<<<<|=======|>>>>>>>)' client server
```

Expected: no output from unmerged/conflict-marker checks; `git diff --check` exits 0.

- [ ] **Step 2: Run full test suites**

Run:

```bash
node server/__tests__/run-tests.js
cd client && npm test -- --run
```

Expected: 0 server failures; 0 client failures; combined client count includes Prisma and audit tests.

- [ ] **Step 3: Run source-only lint and record debt**

Run:

```bash
cd client && ./node_modules/.bin/eslint src public
```

Expected: command may remain nonzero only for documented pre-existing debt. Compare exact error/warning counts with audit baseline `51/5`; integration must not add new errors in changed files.

- [ ] **Step 4: Build web and Android**

Run sequentially:

```bash
cd client
npm run build
npm exec -- cap sync android
cd android
ANDROID_HOME=/Users/bobmark/Library/Android/sdk ./gradlew assembleDebug
```

Expected: Vite, Capacitor sync, and Gradle `BUILD SUCCESSFUL`.

- [ ] **Step 5: Commit green merge**

Run:

```bash
git status --short
git commit -m "merge: restore Prisma home with audit fixes"
```

Expected: two-parent merge commit; clean index after commit; no generated assets staged.

---

### Task 7: Emulator Verification and Integration Report

**Files:**
- Modify: `designs/2026-07-18-full-project-audit.md`
- APK output only: `client/android/app/build/outputs/apk/debug/app-debug.apk`

**Interfaces:**
- Consumes: green merged debug APK.
- Produces: measured Prisma TV regression evidence and updated local report.

- [ ] **Step 1: Install final debug APK and clear old gfx stats**

Run:

```bash
/Users/bobmark/Library/Android/sdk/platform-tools/adb install -r client/android/app/build/outputs/apk/debug/app-debug.apk
/Users/bobmark/Library/Android/sdk/platform-tools/adb shell dumpsys gfxinfo com.torserve.pwa reset
```

Expected: install success; stats reset.

- [ ] **Step 2: Verify Prisma surfaces and TV commands**

Using emulator input/WebView inspection:

```text
Home shows Swipe Hero, editorial row, ranked row, and poster rows.
Enter on Swipe Hero opens Swipe Picker.
Left skips; Right favorites and advances; Enter opens detail; Back restores Hero focus.
20 Right reaches final/action card without leaving viewport.
15 Down then 15 Up selects correct rows and returns Home toolbar.
Enter opens selected movie; Back returns Home; touch opens visible card.
```

Expected: every command works without unhandled WebView error.

- [ ] **Step 3: Measure geometry**

Inspect DOM rectangles in CSS pixels:

```js
const viewportCenter = window.innerWidth / 2
const focused = document.activeElement.getBoundingClientRect()
({
  firstLeft: document.querySelector('.tv-center-row .tv-card')?.getBoundingClientRect().left,
  centerError: focused.left + focused.width / 2 - viewportCenter,
  inViewport: focused.left >= 0 && focused.right <= window.innerWidth
})
```

Expected: `firstLeft === 32`; `Math.abs(centerError) <= 1` after center threshold and for final card; `inViewport === true`.

- [ ] **Step 4: Capture gfxinfo**

Run after scripted D-Pad sequence:

```bash
/Users/bobmark/Library/Android/sdk/platform-tools/adb shell dumpsys gfxinfo com.torserve.pwa
```

Record total/janky frames and p50/p90/p95. Compare with prior audit: 21 frames, 9 janky, p50 27 ms, p90 53 ms, p95 65 ms. Do not claim improvement unless measured.

- [ ] **Step 5: Update report with exact results**

Append a `Prisma restoration integration` subsection. Copy values verbatim from merge hash, test output, build output, DOM geometry inspection, and gfxinfo. Include these exact keys with measured values: `Merge commit`, `Server tests`, `Client tests`, `Vite`, `Capacitor`, `Gradle`, `Prisma surfaces`, `First-card left`, `Center error`, `Gfxinfo`, and `Remaining blockers`.

Verify no placeholder text remains:

```bash
/Applications/ChatGPT.app/Contents/Resources/rg -n 'TBD|TODO|PLACEHOLDER' designs/2026-07-18-full-project-audit.md
```

Expected: no matches.

- [ ] **Step 6: Commit report and verify final state**

Run:

```bash
git add designs/2026-07-18-full-project-audit.md
git commit -m "docs: record Prisma integration verification"
git status --short --branch
git diff --check codex/full-project-audit^..HEAD
```

Expected: report commit succeeds; branch clean; no push/deploy performed.
