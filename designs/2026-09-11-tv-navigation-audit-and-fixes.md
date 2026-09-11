# TV navigation audit and fixes — 2026-09-11

Worktree: `.worktrees/full-project-audit`, branch `codex/full-project-audit`.
Base commit: `918294aab1202549693aa656fd3345f4338f4870`.
Release version: 3.18.1 (`versionCode 46`).

## Confirmed defects and changes

- Late Home rows focused their initial card, even while inactive. Row hooks now preserve another owner's DOM focus, cancel obsolete scroll frames, and report focus to Home only while the row actually owns it.
- Disabled buttons remained spatial candidates. Repeated arrows kept selecting a button that browsers refuse to focus. Candidate filtering now excludes disabled, hidden and inert targets.
- Global horizontal movement disabled native scrolling for every row. Rows without a local scroll handler, including Continue Watching, moved focus offscreen. Only explicitly marked local navigation containers suppress global horizontal scrolling.
- Up from a horizontally scrolled Continue Watching row skipped the adjacent movie row for a more horizontally aligned header. This was reproduced in Chromium. Vertical movement from Home rows now prefers the nearest row before comparing horizontal alignment.
- TVRowShell and Continue Watching handled Enter locally and then allowed the global arbiter to activate the same item again. Local activation stops propagation; repeat Enter events do not trigger repeated actions.
- Home's left-edge fallback and PersonDetail's up-edge fallback sampled focus after another window listener had already moved it. Capture-phase sampling, current-zone checks and cancellation of pending frames prevent false edge actions and delayed jumps.
- Native select controls lost their vertical arrows and Enter to global navigation. Those keys now retain native behavior; horizontal arrows can leave the select.
- DOM Escape/Backspace and Android Back used different routing. Both now use the existing topmost-handler registry, while Backspace in text fields retains editing behavior. Auto Download, Swipe Picker and Update Modal register their Back behavior.
- Swipe Picker leaked Up/Down to the underlying page. It now consumes both keys.
- Torrent delete confirmation shared the modal zone with underlying action buttons. Explicit focus scopes contain navigation, including when a downloading update has no buttons. Cancel/Back returns focus to Delete.
- Global Enter could activate the old screen after the active zone changed. It now checks that the active element belongs to the permitted zone and scope.
- A pending recovery retry could reactivate an old zone after a newer modal opened. Zone revisions cancel those stale retries.

## Validation

On the original source, the 25 added regression cases failed for their intended reasons. After the fixes, in the actual worktree:

- Vitest: **51 files, 438 tests passed**.
- ESLint over `client/src`: exit 0; only the existing outdated browser-data advisory.
- Vite production build: exit 0, 95 modules transformed.
- `git diff --check`: clean.

During the initial 2026-09-10 browser investigation, a fixture using the actual row components and spatial engine confirmed:

- Right skips a disabled button.
- A late row preserves focus on the existing control.
- Enter increments selection once.
- Eight Right presses in Continue Watching reach index 8 and keep the card visible, with horizontal scroll advanced.
- The failing Up transition was reproduced, then corrected to enter the adjacent movie row.
- Nine Right presses in the managed movie row reach Card 10 and keep it visible.

The temporary investigation copy was cleared during the pause. The patch was restored into the real worktree on 2026-09-11, with the red/green regression run, full tests, lint and build repeated there.

## APK validation

- Capacitor Android sync: passed; five plugins detected.
- Gradle `assembleRelease`: passed.
- APK package: `com.torserve.pwa`, version `3.18.1` (`46`).
- APK signature verified with v1 and v2 schemes. Release certificate SHA-1 remains `cb109e5f19b2c97dd4711920cf32fbc030e1ad5c`, matching v3.17.4.
- APK SHA-256: `ef9c203c0e7e1938213fed45d25f102ca2e8435e2f1059e3e2ad72e4531cdce9`.

A physical TV was not connected through ADB. After installation, check rapid horizontal repeats, Up/Down between differently scrolled rows, lazy loading with the menu open, Cancel/Back in overlays, and return from the external player.
