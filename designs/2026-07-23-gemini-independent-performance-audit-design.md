# Gemini Independent Performance Audit Design

## Objective

Prepare one self-contained prompt for Gemini Antigravity IDE to perform an independent, evidence-based audit of the optimization work on `codex/full-project-audit`.

Gemini has local repository access and SSH access to the NAS. The audit must determine whether the branch improves, preserves, or degrades Android TV UX compared with `main`.

## Safety boundary

Initial audit is read-only.

Gemini may:

- inspect source, history, existing reports, builds, APKs, logs, and runtime state;
- create temporary local worktrees, local builds, test artifacts, and profiling output;
- use read-only SSH commands on the NAS.

Gemini must not:

- edit project source;
- commit, push, merge, deploy, restart services, or mutate NAS/VPS state;
- install or update dependencies;
- print `.env` contents, credentials, tokens, API keys, or other secrets.

Existing audit reports and current root-cause hypotheses are context, not truth. Gemini must independently reproduce or reject them.

## Comparison protocol

Compare `main` and `codex/full-project-audit` using the same:

- Android TV emulator or device;
- dataset, account state, cache state, network conditions, build type, and test sequence;
- cold-start and warm-start preparation;
- before-tier-3 and after-tier-3 content states.

Required scenarios:

- cold and warm startup;
- single `Up` and `Down`;
- 20 consecutive `Right` transitions;
- 30 alternating `Down`/`Up` transitions at 100, 200, and 350 ms intervals;
- real key-repeat or key-hold behavior;
- navigation coinciding with the five-second status poll;
- Home → Swipe Picker → Detail → Back;
- touch selection and Back behavior.

## Required evidence

Capture:

- `keydown → focusin` latency;
- `focusin → requestAnimationFrame` latency and RAF gaps;
- Long Tasks, style recalculation, layout, and `getBoundingClientRect` cost/count;
- React Profiler commits and render counts for `App`, `HomePanel`, `HomeRow`, and `TVRowShell`;
- row count, DOM node count, image count, focus-zone size, tabbable count, and `tabIndex=-1` count;
- reset and final Android `gfxinfo`, jank ratio, and frame percentiles;
- process-scoped Logcat errors, ANRs, skipped frames, crashes, and WebView console errors;
- network, image-fetch, and image-decode activity correlated with stalls.

Every confirmed finding needs severity, exact reproduction, `file:line`, root cause, measured impact, counterexample or falsification attempt, minimal fix, and regression test. Unsupported language such as “probably” is not accepted.

## Required code review targets

Audit:

- row-local horizontal navigation versus global vertical navigation propagation;
- roving `tabIndex` and logical focus ownership;
- callback/effect stability, especially `setActiveZone`;
- same-zone cleanup behavior;
- full focus-zone scans and geometry scoring;
- competing `scrollIntoView` and `scrollTo` ownership;
- feasibility of `react-window` fixed-size virtualization with logical TV focus.

Primary files:

- `client/src/hooks/useTVNavigation.js`
- `client/src/hooks/useSpatialNavigation.js`
- `client/src/utils/SpatialNavigation.js`
- `client/src/components/HomePanel.jsx`
- `client/src/components/HomeRow.jsx`
- `client/src/components/TVRowShell.jsx`
- `client/src/components/SwipeHero.jsx`
- `client/src/components/SwipePicker.jsx`
- `client/src/utils/ContentRowsRegistry.js`
- `client/src/utils/homeSnapshot.js`
- `client/src/App.jsx`
- `client/src/index.css`

## Feature preservation

Performance recommendations must preserve Prisma features and behavior:

- Swipe Hero;
- Swipe Picker;
- editorial rows;
- ranked rows;
- personal rows;
- Trakt rows;
- D-Pad access, touch selection, Back behavior, and stable return focus.

Removing rows or features is not a valid optimization.

## Deliverable

Gemini returns:

1. verdict: improved, unchanged, or regressed;
2. identical-protocol comparison table for `main` and audit branch;
3. confirmed findings ordered P0/P1/P2;
4. rejected hypotheses and falsification evidence;
5. architecture and runtime root causes separated from symptoms;
6. minimal staged remediation plan;
7. proposed regression and performance tests;
8. explicit stop before implementation.

Any web research must use primary sources or official documentation.
