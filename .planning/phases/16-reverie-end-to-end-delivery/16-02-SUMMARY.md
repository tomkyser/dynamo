---
phase: 16-reverie-end-to-end-delivery
plan: 02
subsystem: infra
tags: [osascript, terminal-spawn, session-spawner, conductor, macos, applescript]

requires:
  - phase: 10-three-session-architecture
    provides: session-spawner.cjs with Bun.spawn piped stdio pattern
provides:
  - macOS Terminal.app window spawning abstraction (terminal-spawn.cjs)
  - session-spawner.cjs with platform-aware terminal vs piped spawning
  - Temp shell script pattern avoiding multi-layer escaping (Pitfall 6)
affects: [16-reverie-end-to-end-delivery, reverie-session-manager, conductor]

tech-stack:
  added: [osascript, AppleScript Terminal.app integration]
  patterns: [temp-script-intermediary, platform-aware-spawning, options-based-di-for-deps]

key-files:
  created:
    - core/services/conductor/terminal-spawn.cjs
    - core/services/conductor/terminal-spawn.test.cjs
  modified:
    - core/services/conductor/session-spawner.cjs
    - core/services/conductor/conductor.cjs
    - core/services/conductor/__tests__/session-spawner.test.js
    - core/services/conductor/__tests__/conductor.test.js

key-decisions:
  - "Options-based DI (_deps) for terminal-spawn.cjs test isolation instead of mock.module -- consistent with project pattern"
  - "useTerminal flag defaults to process.platform === 'darwin' for automatic macOS detection"
  - "Terminal-spawned sessions report alive=true in health -- real liveness checked via relay /health endpoint"
  - "Conductor forwards useTerminal option to session spawner via init options"

patterns-established:
  - "Temp script intermediary: write .sh to /tmp, run via osascript -- avoids multi-layer escaping"
  - "Platform-aware spawning: useTerminal flag with macOS default, piped fallback for tests and non-macOS"

requirements-completed: [D-02]

duration: 6min
completed: 2026-03-28
---

# Phase 16 Plan 02: Terminal Window Spawning Summary

**macOS Terminal.app window spawning abstraction via osascript with temp shell scripts, integrated into session spawner with platform-aware fallback**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-28T17:50:26Z
- **Completed:** 2026-03-28T17:56:50Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created terminal-spawn.cjs abstraction that writes temp .sh scripts and opens them in visible Terminal.app windows via osascript
- Modified session-spawner.cjs to use terminal windows on macOS (useTerminal flag), with piped stdio fallback for tests and other platforms
- Full backward compatibility -- all 52 existing conductor tests pass without modification to test logic (only useTerminal: false flag added)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create terminal window spawning abstraction** - `73b7b10` (feat - TDD)
2. **Task 2: Modify session spawner to use terminal windows** - `6c51562` (feat)

## Files Created/Modified
- `core/services/conductor/terminal-spawn.cjs` - macOS Terminal.app window spawning via osascript with temp .sh script pattern
- `core/services/conductor/terminal-spawn.test.cjs` - 8 unit tests covering script generation, permissions, osascript invocation, error handling
- `core/services/conductor/session-spawner.cjs` - Added terminal window path with useTerminal flag, temp script cleanup on stop
- `core/services/conductor/conductor.cjs` - Forwards useTerminal option from init to session spawner
- `core/services/conductor/__tests__/session-spawner.test.js` - Added useTerminal: false for backward compatibility
- `core/services/conductor/__tests__/conductor.test.js` - Added useTerminal: false for session lifecycle tests

## Decisions Made
- Used options-based DI (_deps parameter) for terminal-spawn.cjs testability instead of Bun's mock.module() -- consistent with project's validated DI pattern and avoids module cache timing issues
- Terminal-spawned sessions report alive=true in health() since real liveness is checked via relay /health endpoint by the status command -- per D-03 "always clean start" philosophy, the spawner only tracks, it doesn't monitor
- useTerminal defaults to process.platform === 'darwin' so macOS gets visible windows automatically while tests and CI pass useTerminal: false

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated existing tests with useTerminal: false**
- **Found during:** Task 2 (session spawner modification)
- **Issue:** Existing session-spawner.test.js and conductor.test.js failed because process.platform is 'darwin' on this machine, so _useTerminal defaulted to true and the Bun.spawn mock path was bypassed
- **Fix:** Added useTerminal: false to createSessionSpawner options in session-spawner.test.js and to conductor.init options in the session lifecycle describe block of conductor.test.js
- **Files modified:** core/services/conductor/__tests__/session-spawner.test.js, core/services/conductor/__tests__/conductor.test.js
- **Verification:** All 52 conductor tests pass
- **Committed in:** 6c51562 (Task 2 commit)

**2. [Rule 3 - Blocking] Added useTerminal forwarding through conductor.init**
- **Found during:** Task 2 (session spawner modification)
- **Issue:** Conductor creates the session spawner during init() but didn't forward the useTerminal option, so there was no way for conductor tests to control the spawning mode
- **Fix:** Added useTerminal option forwarding from conductor.init options to createSessionSpawner call
- **Files modified:** core/services/conductor/conductor.cjs
- **Verification:** Conductor session lifecycle tests pass with useTerminal: false
- **Committed in:** 6c51562 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes required for existing test compatibility. No scope creep.

## Issues Encountered
- Bun's mock.module() did not reliably intercept require('node:child_process') and require('node:fs') in the module under test -- resolved by using options-based DI (_deps parameter) consistent with project patterns

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all implementations are real (osascript integration, temp script generation, platform detection).

## Next Phase Readiness
- Terminal spawning abstraction ready for use by CLI start command (Plan 03/04)
- Session spawner now opens visible terminal windows on macOS
- Conductor forwards useTerminal option for test control

## Self-Check: PASSED

All 6 files verified present. Both commit hashes (73b7b10, 6c51562) found in git log. 52 tests passing across 3 conductor test files.

---
*Phase: 16-reverie-end-to-end-delivery*
*Completed: 2026-03-28*
