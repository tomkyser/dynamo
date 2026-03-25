---
phase: 11-rem-consolidation
plan: 05
subsystem: rem-consolidation
tags: [rem, pipeline, consolidation, editorial, triage, provisional, abort, decay, crash-recovery]

requires:
  - phase: 11-01
    provides: constants (REM_DEFAULTS, CONDITIONING_DEFAULTS), lifecycle directories
  - phase: 11-02
    provides: triage snapshot, heartbeat monitor
  - phase: 11-03
    provides: conditioning updater (EMA, identity floors, diversity), quality evaluator
  - phase: 11-04
    provides: retroactive evaluator (prompt/apply pattern), editorial pass
provides:
  - Full REM pipeline (Tier 3) orchestrating 5-step editorial process with time budget
  - Provisional REM (Tier 2) with tentative promotion marking and abort-and-revert
  - REM consolidator dispatching all 3 tiers plus dormant maintenance and crash recovery
affects: [11-06, phase-12]

tech-stack:
  added: []
  patterns: [prompt-apply-separation, tentative-promotion, abort-and-revert, tier-dispatch, dormant-decay-catchup, crash-recovery-orphan-detection]

key-files:
  created:
    - modules/reverie/components/rem/full-rem.cjs
    - modules/reverie/components/rem/provisional-rem.cjs
    - modules/reverie/components/rem/rem-consolidator.cjs
    - modules/reverie/components/rem/__tests__/full-rem.test.js
    - modules/reverie/components/rem/__tests__/provisional-rem.test.js
    - modules/reverie/components/rem/__tests__/rem-consolidator.test.js
  modified: []

key-decisions:
  - "Full REM accepts llmResponses parameter for prompt/apply separation -- orchestrator never calls LLM directly"
  - "Provisional REM wraps full REM run with state machine (_running, _aborted, _tentativeFragmentIds) for clean lifecycle"
  - "REM consolidator is single entry point for all consolidation -- enforces REM-07 gate"

patterns-established:
  - "Tier dispatch pattern: consolidator routes to correct tier by trigger type"
  - "Tentative promotion with abort-revert: provisional marks tentative, abort rolls back, completion auto-promotes"
  - "Time budget enforcement: pipeline checks elapsed time between steps, returns partial results on timeout"

requirements-completed: [REM-03, REM-07, REM-02]

duration: 6min
completed: 2026-03-25
---

# Phase 11 Plan 05: REM Pipeline & Consolidator Summary

**Full REM 5-step editorial pipeline (Tier 3), provisional REM with tentative promotion and abort-revert (Tier 2), and consolidator dispatching all 3 tiers with dormant maintenance and crash recovery**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-25T03:25:04Z
- **Completed:** 2026-03-25T03:31:12Z
- **Tasks:** 3
- **Files created:** 6

## Accomplishments
- Full REM pipeline orchestrates retroactive evaluation, sublimation triage, editorial pass, conditioning update, and quality evaluation with time budget enforcement per REM-03
- Provisional REM wraps full REM with tentative promotion marking and abort-and-revert per D-03/D-04 -- auto-promotes on completion when no abort occurs
- REM consolidator dispatches to correct tier (Tier 1 triage, Tier 2 provisional, Tier 3 full) and handles dormant maintenance decay catch-up per D-14 plus crash recovery for orphaned working/ fragments per D-15
- 35 new tests passing, 125 total REM component tests across 9 files

## Task Commits

Each task was committed atomically:

1. **Task 1: Full REM pipeline (Tier 3)** - `26069b1` (feat) - TDD: 14 tests
2. **Task 2: Provisional REM (Tier 2)** - `94dca79` (feat) - TDD: 9 tests
3. **Task 3: REM consolidator** - `e27d8fa` (feat) - TDD: 12 tests

## Files Created/Modified
- `modules/reverie/components/rem/full-rem.cjs` - Tier 3 full REM pipeline: 5-step editorial orchestrator with time budget
- `modules/reverie/components/rem/provisional-rem.cjs` - Tier 2 provisional REM with tentative promotion, abort, and auto-promote
- `modules/reverie/components/rem/rem-consolidator.cjs` - Top-level tier dispatch orchestrator with dormant maintenance and crash recovery
- `modules/reverie/components/rem/__tests__/full-rem.test.js` - 14 tests for full REM pipeline
- `modules/reverie/components/rem/__tests__/provisional-rem.test.js` - 9 tests for provisional REM
- `modules/reverie/components/rem/__tests__/rem-consolidator.test.js` - 12 tests for REM consolidator

## Decisions Made
- Full REM accepts a `llmResponses` object parameter containing all pre-computed LLM responses, maintaining the prompt/apply separation established in Plan 04 -- the orchestrator never calls the LLM directly
- Provisional REM uses an internal state machine with `_running`, `_aborted`, and `_tentativeFragmentIds` array for clean lifecycle management
- REM consolidator is the single entry point for all consolidation operations, enforcing REM-07 (nothing enters long-term storage without REM)
- Dormant maintenance uses Journal.list('active') + decay.computeDecay/shouldArchive for retroactive catch-up -- same result as real-time since decay is time-based
- Crash recovery scans working/ fragments by source_session mismatch against currentSessionId to detect orphans from crashed sessions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all components are fully wired with real logic.

## Next Phase Readiness
- All REM pipeline components complete (Plans 01-05): constants, schemas, triage, heartbeat monitor, conditioning updater, quality evaluator, retroactive evaluator, editorial pass, full REM, provisional REM, REM consolidator
- Ready for Plan 06: Mode Manager REM/Dormant mode wiring and hook handler integration

## Self-Check: PASSED

All 6 created files verified on disk. All 3 task commits (26069b1, 94dca79, e27d8fa) verified in git log.

---
*Phase: 11-rem-consolidation*
*Completed: 2026-03-25*
