# Fixed-Center TV Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Центрировать первый, средний и последний focusable-элементы каждого `HomeRow` на одной экранной X-оси без возврата лагов.

**Architecture:** `HomeRow` добавляет два нефокусируемых flex-spacer с постоянной формулой ширины. Существующий `useTVNavigation` остаётся единственным scroll-owner и двигает контейнер один раз через `requestAnimationFrame`; геометрия контейнера не меняется во время focus events.

**Tech Stack:** React 19, TailwindCSS 4, CSS flex/calc, Vitest 3, Testing Library, Capacitor 6, Android Gradle.

## Global Constraints

- TV-first: все media/action элементы доступны через D-Pad и Enter.
- Не использовать `:hover` как TV focus state.
- Не добавлять `overflow: hidden` на scroll-контейнер.
- Не менять metadata/network, native player bridge или Android Intent flags.
- Не использовать smooth scroll для D-Pad.
- Без новых runtime dependencies.
- Выполнение inline, без субагентов.

---

### Task 1: Stable edge geometry for HomeRow

**Files:**
- Modify: `client/src/components/HomeRow.jsx`
- Modify: `client/src/index.css`
- Test: `client/src/components/HomeRow.test.jsx`

**Interfaces:**
- Consumes: `layout: 'backdrop_below' | 'poster_below' | string`, existing `.snap-container`, fixed card widths `240px` and `130px`.
- Produces: `.tv-center-row`, two `.tv-row-edge-spacer` elements, inline CSS variables `--tv-row-card-width` and `--tv-row-card-half-width`.

- [ ] **Step 1: Write failing structural tests**

Add tests proving spacer count, accessibility, no focus registration, and layout-specific card widths:

```jsx
it('adds two inert edge spacers around focusable row content', () => {
    const view = render(<HomeRow title="Center" items={items} isActive />)
    const scroller = view.container.querySelector('.snap-container')
    const spacers = scroller.querySelectorAll('.tv-row-edge-spacer')

    expect(spacers).toHaveLength(2)
    expect(scroller.firstElementChild).toBe(spacers[0])
    expect(scroller.lastElementChild).toBe(spacers[1])
    expect([...spacers].every(node => node.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect([...spacers].every(node => !node.hasAttribute('tabindex'))).toBe(true)
    expect(scroller.style.getPropertyValue('--tv-row-card-width')).toBe('130px')
    expect(scroller.style.getPropertyValue('--tv-row-card-half-width')).toBe('65px')
})

it('uses backdrop width for fixed-center edge geometry', () => {
    const view = render(<HomeRow title="Wide" layout="backdrop_below" items={items} isActive />)
    const scroller = view.container.querySelector('.snap-container')

    expect(scroller.style.getPropertyValue('--tv-row-card-width')).toBe('240px')
    expect(scroller.style.getPropertyValue('--tv-row-card-half-width')).toBe('120px')
})
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npm run test:run -- src/components/HomeRow.test.jsx
```

Expected: FAIL because `.tv-row-edge-spacer` does not exist and CSS variables are empty.

- [ ] **Step 3: Add minimal HomeRow geometry**

In `HomeRow.jsx`, calculate stable layout values outside focus handlers:

```jsx
const rowCardWidth = layout === 'backdrop_below' ? 240 : 130
const centerRowStyle = {
    '--tv-row-card-width': `${rowCardWidth}px`,
    '--tv-row-card-half-width': `${rowCardWidth / 2}px`
}
```

Update container and add inert spacers:

```jsx
<div
    ref={scrollRef}
    tabIndex={containerProps.tabIndex}
    className="snap-container tv-center-row gap-4 overflow-x-auto scrollbar-hide py-6 -my-4"
    style={centerRowStyle}
    ...
>
    <div className="tv-row-edge-spacer" aria-hidden="true" />
    {/* existing actions and cards */}
    <div className="tv-row-edge-spacer" aria-hidden="true" />
</div>
```

Remove `px-8` from container; title keeps existing `px-8` alignment. Add CSS:

```css
.tv-center-row {
  --tv-row-gap: 1rem;
}

.tv-row-edge-spacer {
  flex: 0 0 max(2rem, calc(50% - var(--tv-row-card-half-width) - var(--tv-row-gap)));
  width: max(2rem, calc(50% - var(--tv-row-card-half-width) - var(--tv-row-gap)));
  height: 1px;
  pointer-events: none;
}
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npm run test:run -- src/components/HomeRow.test.jsx src/hooks/useTVNavigation.test.jsx
```

Expected: all tests PASS; existing no-padding-mutation and single-center-scroll assertions remain green.

- [ ] **Step 5: Inspect diff scope**

Run:

```bash
git diff --check -- client/src/components/HomeRow.jsx client/src/components/HomeRow.test.jsx client/src/index.css
git diff -- client/src/components/HomeRow.jsx client/src/components/HomeRow.test.jsx client/src/index.css
```

Expected: only spacer markup/style/tests plus pre-existing branch changes; no metadata or native changes.

---

### Task 2: Regression verification and Android artifact

**Files:**
- Verify: `client/src/components/HomeRow.jsx`
- Verify: `client/src/hooks/useTVNavigation.js`
- Verify: `client/src/index.css`
- Output: `client/android/app/build/outputs/apk/debug/app-debug.apk`

**Interfaces:**
- Consumes: stable spacers from Task 1 and existing `useTVNavigation` rAF scroll.
- Produces: verified web bundle, synced Capacitor assets, debug APK and SHA-256.

- [ ] **Step 1: Run complete client test suite**

```bash
npm run test:run
```

Expected: 0 failed tests.

- [ ] **Step 2: Build production frontend**

```bash
npm run build
```

Expected: Vite exits 0 and writes `dist/`.

- [ ] **Step 3: Sync Android assets**

```bash
npm exec -- cap sync android
```

Expected: Capacitor copy/update/sync completes without errors.

- [ ] **Step 4: Build debug APK**

From `client/android`:

```bash
./gradlew assembleDebug
```

Expected: `BUILD SUCCESSFUL` and APK exists at `app/build/outputs/apk/debug/app-debug.apk`.

- [ ] **Step 5: Verify artifact**

```bash
ls -lh app/build/outputs/apk/debug/app-debug.apk
shasum -a 256 app/build/outputs/apk/debug/app-debug.apk
```

Expected: non-empty APK plus reproducible SHA-256 output.

- [ ] **Step 6: Manual TV acceptance**

Install APK and verify: enter row, press/hold Right through first-middle-last, press Left back, move Up/Down, test `В начало`, `Показать все`, Enter, then touch-drag. Active card must keep one center X-position after every horizontal move; no runaway blank screen or lag.
