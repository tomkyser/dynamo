---
phase: 14-deployment-readiness-architecture-compliance
plan: 01
subsystem: integration
tags: [exciter, hooks, switchboard, settings-json, cli, bootstrap]

requires:
  - phase: 12-integration-surface-backfill
    provides: Exciter service with hook registry, settings-manager, agent-manager
  - phase: 12.1-platform-launch-readiness
    provides: Module discovery, Exciter skill-manager, bootstrap step 7.5d
provides:
  - Idempotent wireToSwitchboard via _wiredTypes Set in hooks.cjs
  - Post-module-registration Exciter re-wire (bootstrap step 7.6)
  - Settings.json auto-generation for all 8 hook types (bootstrap step 7.7)
  - Hook dispatch mode in bin/dynamo.cjs for Claude Code invocation
  - readJson/writeJson implementation on Lathe service
affects: [14-02, 14-03, reverie-module-hooks, claude-code-integration]

tech-stack:
  added: []
  patterns: [idempotent-wiring, hook-dispatch-entry-point, stdin-json-stdout-json]

key-files:
  created: []
  modified:
    - core/armature/hooks.cjs
    - core/core.cjs
    - bin/dynamo.cjs
    - core/services/lathe/lathe.cjs
    - core/services/exciter/__tests__/exciter.test.js

key-decisions:
  - "_wiredTypes Set tracks already-wired hook types for idempotent wireToSwitchboard"
  - "Bootstrap step 7.6 calls exciterFacade.start() after module registration to wire module hooks"
  - "Bootstrap step 7.7 generates settings.json entries for all 8 hook types on every boot"
  - "Hook dispatch reads Bun.stdin.stream() and routes through Commutator"
  - "Lathe readJson/writeJson implemented as synchronous fs operations for settings-manager compatibility"

patterns-established:
  - "Idempotent wiring: _wiredTypes Set prevents duplicate Switchboard handler registration"
  - "Hook entry point: bin/dynamo.cjs hook <HookType> reads stdin JSON, returns stdout JSON"

requirements-completed: [INT-01, PLT-03]

duration: 4min
completed: 2026-03-27
---

# Phase 14 Plan 01: Exciter Bootstrap Timing & Hook Entry Point Summary

**Idempotent hook wiring via _wiredTypes Set, post-module-registration Exciter re-wire in bootstrap, settings.json auto-generation for all 8 hook types, and hook dispatch CLI mode in bin/dynamo.cjs**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-27T17:03:41Z
- **Completed:** 2026-03-27T17:08:01Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- wireToSwitchboard is now idempotent via _wiredTypes Set -- safe to call multiple times
- Bootstrap step 7.6 re-wires Exciter hooks after module registration completes (fixes timing gap)
- Bootstrap step 7.7 generates settings.json entries for all 8 Claude Code hook types on every boot
- bin/dynamo.cjs has a hook dispatch mode that Claude Code invokes via settings.json hook entries
- Lathe service now implements readJson/writeJson (were optional but required by settings-manager)

## Task Commits

Each task was committed atomically:

1. **Task 1: Make wireToSwitchboard idempotent and add post-registration re-wire to bootstrap** - `4c237a7` (feat)
2. **Task 2: Add hook dispatch mode to bin/dynamo.cjs entry point** - `2b89bbf` (feat)
3. **Deviation fix: Implement readJson/writeJson on Lathe service** - `f1c0646` (fix)

## Files Created/Modified
- `core/armature/hooks.cjs` - Added _wiredTypes Set for idempotent wireToSwitchboard
- `core/core.cjs` - Added bootstrap steps 7.6 (Exciter re-wire) and 7.7 (settings.json generation)
- `core/services/exciter/__tests__/exciter.test.js` - 3 new tests for post-registration re-wire behavior
- `bin/dynamo.cjs` - Added handleHook() function and hook mode detection
- `core/services/lathe/lathe.cjs` - Implemented readJson/writeJson optional methods

## Decisions Made
- _wiredTypes Set tracks already-wired hook types so wireToSwitchboard can be safely called multiple times without duplicating Switchboard handlers
- Bootstrap step 7.6 re-calls exciterFacade.start() after module discovery (step 7.5d) to wire hooks registered by modules during registration
- Bootstrap step 7.7 generates settings.json entries on every boot; deduplication in settings-manager prevents duplicate entries
- Hook dispatch mode reads from Bun.stdin.stream() and routes through Commutator.ingest() for standard event dispatch
- Lathe readJson/writeJson use synchronous fs operations (readFileSync/writeFileSync) matching settings-manager's synchronous call pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Implemented readJson/writeJson on Lathe service**
- **Found during:** Task 2 (hook dispatch mode integration)
- **Issue:** Settings-manager calls lathe.readJson() and lathe.writeJson(), but Lathe only declared these as optional in LATHE_SHAPE without implementing them. Bootstrap step 7.7 triggered the error in the SDK integration test.
- **Fix:** Added readJson() and writeJson() implementations using synchronous fs.readFileSync/fs.writeFileSync to Lathe service
- **Files modified:** core/services/lathe/lathe.cjs
- **Verification:** SDK integration test (core/sdk/__tests__/integration.test.js) passes, full suite 2349/2350 pass (1 pre-existing float precision failure in recall-engine)
- **Committed in:** f1c0646

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for correctness -- settings-manager cannot function without readJson/writeJson on the Lathe facade. No scope creep.

## Issues Encountered
- Pre-existing floating-point precision failure in modules/reverie/components/recall/__tests__/recall-engine.test.js (0.8889999998842592 vs 0.8889999999999999) -- not related to this plan's changes, out of scope

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Hook wiring pipeline is now production-correct: modules register hooks during step 7.5d, Exciter re-wires at step 7.6, settings.json generated at step 7.7
- bin/dynamo.cjs hook dispatch mode ready for Claude Code invocation
- Phase 14 Plan 02 can proceed with backfill CLI migration and status metrics wiring

---
## Self-Check: PASSED

- All 5 modified files exist on disk
- All 3 task commits (4c237a7, 2b89bbf, f1c0646) found in git log
- No stubs or placeholder data detected

---
*Phase: 14-deployment-readiness-architecture-compliance*
*Completed: 2026-03-27*
