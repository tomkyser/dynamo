---
phase: 09-hook-migration
plan: 03
subsystem: hooks
tags: [dispatcher, hooks, cjs, integration-tests, graceful-degradation, session-lifecycle]

# Dependency graph
requires:
  - phase: 09-hook-migration
    provides: curation.cjs (callHaiku, curateResults, summarizeText, generateSessionName), episodes.cjs (addEpisode, extractContent), search.cjs (combinedSearch, searchFacts), sessions.cjs (indexSession, generateAndApplyName)
  - phase: 08-foundation-branding
    provides: core.cjs (loadEnv, detectProject, healthGuard, logError), scope.cjs (SCOPE)
provides:
  - dynamo-hooks.cjs: single stdin-based dispatcher routing all 5 hook events
  - session-start.cjs: SessionStart handler with combinedSearch + curateResults
  - prompt-augment.cjs: UserPromptSubmit handler with memory search + preliminary session naming
  - capture-change.cjs: PostToolUse handler filtering Write/Edit/MultiEdit for episode capture
  - preserve-knowledge.cjs: PreCompact handler with summarize + re-inject pattern
  - session-summary.cjs: Stop handler with budget-based timeout, dual-scope Graphiti writes, refined naming
  - 17 new tests (10 structural + 7 integration pipe-through)
affects: [09-04 switchover, 10-operations]

# Tech tracking
tech-stack:
  added: []
  patterns: [stdin-buffered-dispatcher, budget-based-timeout, infinite-loop-guard-flag-file, two-phase-session-naming, graceful-exit-0]

key-files:
  created:
    - dynamo/hooks/dynamo-hooks.cjs
    - dynamo/lib/ledger/hooks/session-start.cjs
    - dynamo/lib/ledger/hooks/prompt-augment.cjs
    - dynamo/lib/ledger/hooks/capture-change.cjs
    - dynamo/lib/ledger/hooks/preserve-knowledge.cjs
    - dynamo/lib/ledger/hooks/session-summary.cjs
    - dynamo/tests/dispatcher.test.cjs
    - dynamo/tests/integration.test.cjs
  modified: []

key-decisions:
  - "Dispatcher builds ctx object (project, scope) before routing -- handlers receive enriched context"
  - "Stop handler uses budget-based timeout (25s budget, 5s buffer) with priority ordering: summarize > Graphiti write > auto-name > index"
  - "Stop handler has dual infinite loop guard: stop_hook_active flag + temp file flag using process.ppid"
  - "All handlers exit 0 even on error -- graceful degradation never blocks Claude Code"

patterns-established:
  - "Stdin dispatcher pattern: buffer stdin, parse JSON, switch on hook_event_name, require handler"
  - "Budget-based timeout: const remaining = () => budget - (Date.now() - startMs) with priority gates"
  - "Flag file guard: os.tmpdir() + process.ppid for preventing re-entrant hook execution"
  - "Handler composition: thin orchestrators composing Plan 01/02 library modules"

requirements-completed: [LDG-01, LDG-02, LDG-03, LDG-04, LDG-05, LDG-06]

# Metrics
duration: 5min
completed: 2026-03-17
---

# Phase 9 Plan 03: Dispatcher and Hook Handlers Summary

**Stdin-based CJS dispatcher routing all 5 hook events to thin handler modules composing library functions, with budget-based Stop timeout, infinite loop guards, and 157 tests passing**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-17T19:55:00Z
- **Completed:** 2026-03-17T20:01:37Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Built dynamo-hooks.cjs dispatcher (55 LOC) with stdin buffering, 5s timeout guard, loadEnv early, and switch-based routing to 5 handler modules
- Built all 5 hook handlers as thin orchestrators composing Plan 01/02 library modules (curation, episodes, search, sessions)
- Stop handler implements budget-based timeout (25s budget, priority ordering) and dual infinite loop guard (stop_hook_active + temp flag file) per regression test 10 contract
- Prompt-augment handler implements preliminary session naming (two-phase naming contract from regression test 11)
- 17 new tests: 10 structural (dispatcher verification, handler exports) + 7 integration (pipe-through all events + unknown + invalid JSON)
- Full suite: 157 tests pass, 0 fail across all modules

## Task Commits

Each task was committed atomically:

1. **Task 1: Create dispatcher and 5 hook handler modules** - `040d256` (feat)
2. **Task 2: Create dispatcher and integration tests** - `20d216c` (test)

## Files Created/Modified
- `dynamo/hooks/dynamo-hooks.cjs` - Single entry point dispatcher, stdin buffering, event routing (55 LOC)
- `dynamo/lib/ledger/hooks/session-start.cjs` - SessionStart: parallel combinedSearch + curateResults (69 LOC)
- `dynamo/lib/ledger/hooks/prompt-augment.cjs` - UserPromptSubmit: memory search + preliminary naming (81 LOC)
- `dynamo/lib/ledger/hooks/capture-change.cjs` - PostToolUse: Write/Edit/MultiEdit episode capture (32 LOC)
- `dynamo/lib/ledger/hooks/preserve-knowledge.cjs` - PreCompact: summarize + re-inject knowledge (43 LOC)
- `dynamo/lib/ledger/hooks/session-summary.cjs` - Stop: budget timeout, dual-scope writes, refined naming (96 LOC)
- `dynamo/tests/dispatcher.test.cjs` - 10 structural tests for dispatcher and handler exports (92 LOC)
- `dynamo/tests/integration.test.cjs` - 7 pipe-through integration tests via child_process.spawn (107 LOC)

## Decisions Made
- Dispatcher builds enriched ctx object (project name, scope) before routing to handlers -- handlers don't need to compute scope themselves
- Stop handler uses budget-based timeout with priority ordering (summarize + Graphiti > auto-name > sessions.json index) to fit within 30s Claude Code timeout
- Dual infinite loop guard for Stop handler: checks stop_hook_active boolean first, then temp flag file using process.ppid as secondary defense
- All handlers follow graceful degradation pattern: try/catch with logError, always exit 0

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 5 hook handlers operational, ready for Plan 04 (settings switchover) to wire into Claude Code hooks configuration
- Dispatcher deployed to both repo dynamo/ and live ~/.claude/dynamo/
- Full test suite (157 tests) provides regression safety net for switchover

## Self-Check: PASSED

- FOUND: all 8 created files (6 handler/dispatcher + 2 test files)
- FOUND: .planning/phases/09-hook-migration/09-03-SUMMARY.md
- FOUND: 040d256 (Task 1 commit)
- FOUND: 20d216c (Task 2 commit)

---
*Phase: 09-hook-migration*
*Completed: 2026-03-17*
