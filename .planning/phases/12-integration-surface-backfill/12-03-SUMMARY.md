---
phase: 12-integration-surface-backfill
plan: 03
subsystem: cli
tags: [cli, history, reset, pulley, circuit, reverie, safety-gate]

# Dependency graph
requires:
  - phase: 12-01-foundation-types
    provides: "LIFECYCLE_DIRS, fragment types, constants for fragment enumeration"
  - phase: 05-sdk-platform
    provides: "Circuit registerCommand API, Pulley CLI routing with output modes"
provides:
  - "createHistoryHandlers factory with 3 timeline handlers (sessions, fragments, consolidations)"
  - "createResetHandlers factory with 3 scoped reset handlers (fragments, self-model, all)"
  - "registerReverieCommands orchestrator registering 6 CLI subcommands via Circuit"
  - "--confirm safety gate pattern for destructive CLI operations"
affects: [12-04, 12-05, 12-06]

# Tech tracking
tech-stack:
  added: []
  patterns: ["process.argv --confirm flag check for destructive CLI operations", "Journal listFragments/listSessions facade for timeline queries"]

key-files:
  created:
    - "modules/reverie/components/cli/history.cjs"
    - "modules/reverie/components/cli/reset.cjs"
    - "modules/reverie/components/cli/register-commands.cjs"
    - "modules/reverie/components/cli/__tests__/history.test.js"
    - "modules/reverie/components/cli/__tests__/reset.test.js"
  modified: []

key-decisions:
  - "process.argv direct check for --confirm since Pulley only parses --json/--raw/--help"
  - "Confirm check happens BEFORE any destructive operation per Pitfall 6 -- no partial resets"

patterns-established:
  - "Destructive CLI operations use _requireConfirm() gate checking process.argv for --confirm flag"
  - "History handlers map Journal fragment data to timeline-specific output formats"
  - "registerReverieCommands orchestrates all handler factories and Circuit registrations"

requirements-completed: [INT-02]

# Metrics
duration: 4min
completed: 2026-03-25
---

# Phase 12 Plan 03: CLI History & Reset Commands Summary

**History timeline handlers (sessions/fragments/consolidations with domain/type filtering) and scoped reset handlers (fragments/self-model/all) with --confirm safety gate per D-03 and D-04**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-25T05:15:50Z
- **Completed:** 2026-03-25T05:20:39Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Three history subcommand handlers: sessions (chronological with REM outcomes), fragments (filterable by domain/type), consolidations (REM event timeline)
- Three reset subcommand handlers: fragments (preserves Self Model), self-model (cold start reinit), all (factory reset)
- All reset commands require explicit --confirm flag per D-04, with CONFIRM_REQUIRED error and usage hint
- registerReverieCommands orchestrator registering all 6 subcommands via Circuit registerCommand
- 28 tests passing across 2 test files (13 history + 15 reset)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create history subcommand handlers (sessions, fragments, consolidations)** - `bfd74b7` (feat)
2. **Task 2: Create reset subcommand handlers with --confirm safety gate** - `d9faae0` (feat)

_Note: TDD tasks with RED-GREEN cycle in each._

## Files Created/Modified
- `modules/reverie/components/cli/history.cjs` - createHistoryHandlers factory with 3 timeline handlers per D-03
- `modules/reverie/components/cli/reset.cjs` - createResetHandlers factory with 3 scoped reset handlers and --confirm gate per D-04
- `modules/reverie/components/cli/register-commands.cjs` - registerReverieCommands orchestrator for all 6 CLI subcommands
- `modules/reverie/components/cli/__tests__/history.test.js` - 13 tests for history handlers, filtering, and registration
- `modules/reverie/components/cli/__tests__/reset.test.js` - 15 tests for reset handlers, confirm gate, and registration

## Decisions Made
- process.argv direct check for --confirm flag since Pulley only parses --json/--raw/--help -- custom flags must be read from process.argv
- Confirm check positioned BEFORE any destructive operation per Pitfall 6 -- no partial resets occur if --confirm is missing
- History fragment output maps raw Journal data to a simplified timeline format (id, type, created, domains, decay_weight, lifecycle)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed async handler tests for --confirm gate**
- **Found during:** Task 2 (reset tests)
- **Issue:** handleResetFragments and handleResetAll are async functions, so even the synchronous confirm-rejection path returns a Promise. Tests called them without await.
- **Fix:** Added async/await to the three non-confirm test cases for async handlers
- **Files modified:** modules/reverie/components/cli/__tests__/reset.test.js
- **Verification:** All 15 reset tests pass
- **Committed in:** d9faae0 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug in tests)
**Impact on plan:** Minor test fix for correct async handling. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all code paths are fully wired with no placeholder data.

## Next Phase Readiness
- All 6 Reverie CLI subcommands registered and functional (history: 3, reset: 3)
- Combined with Plan 02's status/inspect commands, INT-02 CLI surface is complete
- registerReverieCommands ready for integration with Reverie module boot via Circuit

## Self-Check: PASSED

---
*Phase: 12-integration-surface-backfill*
*Completed: 2026-03-25*
