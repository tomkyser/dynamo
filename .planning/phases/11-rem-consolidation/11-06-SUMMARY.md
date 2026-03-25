---
phase: 11-rem-consolidation
plan: 06
subsystem: reverie-rem
tags: [rem, consolidation, hooks, lifecycle, heartbeat, triage, tier1, tier2, tier3, mode-manager]

# Dependency graph
requires:
  - phase: 11-rem-consolidation (plans 01-05)
    provides: "All 9 REM components (triage, heartbeat monitor, conditioning updater, quality evaluator, retroactive evaluator, editorial pass, full REM, provisional REM, REM consolidator)"
  - phase: 10-three-session-architecture
    provides: "Session Manager (transitionToRem, completeRem), Mode Manager (requestRem, requestDormant), Wire topology, hook handlers"
provides:
  - "REM lifecycle wired into all 4 lifecycle hooks (SessionStart, UserPromptSubmit, PreCompact, Stop)"
  - "REM-07 gate enforced: Stop hook always transitions through REM before termination"
  - "OPS-04: Dormant maintenance triggered on SessionStart via handleDormantMaintenance"
  - "Heartbeat emission on UserPromptSubmit for Tier 2 idle detection"
  - "Tier 1 triage triggered on PreCompact"
  - "Tier 2 provisional REM triggered via heartbeat:timeout Switchboard event"
  - "Tier 2 abort-and-revert wired via heartbeat:received event"
  - "All 9 REM components created and wired in Reverie module entry point"
affects: [phase-12-taxonomy-governance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fire-and-forget REM operations via .catch() null-guard in hook handlers"
    - "Sequential mode transition: requestRem -> transitionToRem -> handleTier3 -> requestDormant -> completeRem"
    - "Switchboard event wiring for heartbeat timeout/received -> Tier 2 trigger/abort"

key-files:
  created: []
  modified:
    - modules/reverie/hooks/hook-handlers.cjs
    - modules/reverie/hooks/__tests__/hook-handlers.test.js
    - modules/reverie/reverie.cjs

key-decisions:
  - "handleStop REM transition is fire-and-forget: hook returns immediately, Tier 3 runs async on Secondary"
  - "Heartbeat emission added to UserPromptSubmit (not a separate timer) per D-02 existing Wire pattern"
  - "Crash recovery and dormant maintenance are fire-and-forget on SessionStart -- non-fatal for hook response"

patterns-established:
  - "REM lifecycle hook integration: null-guard pattern for backward compat with pre-Phase-11 configurations"
  - "Mode transition chain in Stop: requestRem -> transitionToRem -> handleTier3 (fire-and-forget) -> requestDormant -> completeRem"

requirements-completed: [REM-01, REM-02, REM-03, REM-07, OPS-03, OPS-04]

# Metrics
duration: 5min
completed: 2026-03-25
---

# Phase 11 Plan 06: REM Integration Wiring Summary

**Full REM lifecycle wired into hook handlers and Reverie entry point -- Tier 1/2/3 dispatch, heartbeat emission, crash recovery, dormant maintenance, and REM-07 gate enforcement via mode transition chain**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-25T03:34:39Z
- **Completed:** 2026-03-25T03:39:44Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Hook handlers wired to all 4 REM trigger points: SessionStart (crash recovery + dormant maintenance + heartbeat start), UserPromptSubmit (heartbeat emission), PreCompact (Tier 1 triage), Stop (REM mode transition + Tier 3 fire-and-forget)
- Reverie module entry point creates all 9 REM components in dependency order and passes remConsolidator + heartbeatMonitor to hook handlers
- Switchboard event wiring connects heartbeat timeout to Tier 2 trigger and heartbeat resumption to Tier 2 abort
- REM-07 gate enforced: Stop hook transitions to REM mode instead of direct stop, ensuring every session end passes through REM
- 636 Reverie tests passing with 0 failures (11 new Phase 11 tests added)

## Task Commits

Each task was committed atomically:

1. **Task 1: Hook handler updates -- REM integration into all lifecycle hooks** - `3f35418` (feat)
2. **Task 2: Reverie module entry point -- create and wire all REM components** - `ce1a337` (feat)

## Files Created/Modified
- `modules/reverie/hooks/hook-handlers.cjs` - Added remConsolidator and heartbeatMonitor options; updated handleSessionStart (crash recovery, dormant maintenance, heartbeat start), handleUserPromptSubmit (heartbeat emission), handlePreCompact (Tier 1 triage), handleStop (REM mode transition + Tier 3 fire-and-forget)
- `modules/reverie/hooks/__tests__/hook-handlers.test.js` - Added 11 new Phase 11 tests for all REM hook integration paths
- `modules/reverie/reverie.cjs` - Added requires for all 9 REM components, created them in dependency order, passed to hook handlers, wired heartbeat events to Tier 2 trigger/abort

## Decisions Made
- handleStop REM transition is fire-and-forget: hook returns immediately, Tier 3 runs async on Secondary per Pitfall 6 (hooks must return quickly)
- Heartbeat emission added to UserPromptSubmit handler via Wire topology (not a separate timer), following the existing SNAPSHOT send pattern
- Crash recovery and dormant maintenance are fire-and-forget on SessionStart, non-fatal failures per defensive hook design pattern
- Mode transition fallback: if modeManager not present, falls back to Phase 10 direct sessionManager.stop() behavior

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 11 (REM Consolidation) is complete: all 6 plans executed, all components built and wired
- Full REM lifecycle operational end-to-end: PreCompact -> Tier 1, heartbeat timeout -> Tier 2, Stop -> Tier 3
- Ready for Phase 12 (taxonomy governance, backfill formation, source-reference model)
- 636 Reverie tests passing, no regressions

## Self-Check: PASSED

- All 3 modified files exist on disk
- Both task commits verified (3f35418, ce1a337)
- 636 tests passing across 37 files

---
*Phase: 11-rem-consolidation*
*Completed: 2026-03-25*
