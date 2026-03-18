---
phase: 12-structural-refactor
plan: 03
subsystem: infra
tags: [cjs, cli, mcp, memory-commands, toggle-gate, graphiti]

# Dependency graph
requires:
  - phase: 12-01
    provides: "3 root-level component directories (dynamo/, ledger/, switchboard/)"
  - phase: 12-02
    provides: "Global on/off toggle mechanism with dev mode override (isEnabled)"
provides:
  - "8 new CLI memory commands (search, remember, recall, edge, forget, clear + toggle/status from Plan 02)"
  - "Toggle gate enforcement on all memory commands (requireEnabled)"
  - "Format output support (--format json|raw|text) for all memory commands"
  - "Scope support (--scope) for scoped memory operations"
  - "Destructive guard on clear (--confirm required)"
  - "Full MCP tool parity via CLI (all 9 tools have CLI equivalents)"
affects: [12-04, all-future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "extractFlag/getPositionalArgs for CLI argument parsing"
    - "formatOutput for tri-mode output (json/raw/text)"
    - "requireEnabled toggle gate with DYNAMO_CONFIG_PATH env var for test isolation"

key-files:
  created: []
  modified:
    - "dynamo/dynamo.cjs"
    - "dynamo/tests/router.test.cjs"

key-decisions:
  - "requireEnabled() respects DYNAMO_CONFIG_PATH env var for test isolation, consistent with toggle CLI command pattern from Plan 02"
  - "Memory commands use lazy require() inside switch cases to avoid loading ledger modules unless needed"
  - "formatOutput uses stderr for human-readable text, stdout for json/raw -- matches existing output() pattern"

patterns-established:
  - "extractFlag(args, flag): reusable flag value extraction for CLI commands"
  - "getPositionalArgs(args): skip --flag value pairs, return positional args"
  - "formatOutput(data, format, humanText): tri-mode output for all memory commands"
  - "requireEnabled(): toggle gate check before any memory operation"

requirements-completed: [STAB-10]

# Metrics
duration: 3min
completed: 2026-03-18
---

# Phase 12 Plan 03: CLI Memory Commands Summary

**All 9 MCP tool equivalents as CLI commands with toggle gate enforcement, --format json|raw|text output, and --scope support for full Dynamo blackout toggle**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-18T18:52:17Z
- **Completed:** 2026-03-18T18:55:49Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added 6 new CLI memory commands (search, remember, recall, edge, forget, clear) completing full MCP tool parity
- Every memory command checks isEnabled() and errors with clear message when disabled
- All commands support --format json|raw|text and --scope parameter
- 32 new router tests covering command existence, toggle gate, help text, and error handling
- Full test suite: 316 pass, 0 fail, 1 skipped (Docker)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add CLI memory commands with toggle gate and format support** - `9478ee4` (feat)
2. **Task 2: Update router tests and run full verification** - `a0e5e4b` (test)

## Files Created/Modified
- `dynamo/dynamo.cjs` - Added 6 memory command switch cases, helper functions (extractFlag, getPositionalArgs, formatOutput, requireEnabled), updated help text and COMMAND_HELP
- `dynamo/tests/router.test.cjs` - Added 32 tests: command existence, ledger module requires, toggle gate on all 6 commands, command-specific help, error handling for missing args, destructive guard

## Decisions Made
- requireEnabled() respects DYNAMO_CONFIG_PATH env var for test isolation (consistent with toggle CLI command pattern from Plan 02)
- Memory commands use lazy require() inside switch cases to avoid loading ledger modules at startup
- formatOutput sends human-readable text to stderr, json/raw to stdout -- matches existing output() pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added DYNAMO_CONFIG_PATH support to requireEnabled()**
- **Found during:** Task 2 (writing toggle gate tests)
- **Issue:** requireEnabled() called isEnabled() without config path override, making it impossible to test the toggle gate with a temp disabled config
- **Fix:** requireEnabled() now reads DYNAMO_CONFIG_PATH env var and passes it to isEnabled(), consistent with toggle CLI command pattern from Plan 02
- **Files modified:** dynamo/dynamo.cjs
- **Verification:** All 6 toggle gate tests pass with temp disabled config
- **Committed in:** a0e5e4b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Necessary for testability. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 9 MCP tool equivalents now available as CLI commands
- Toggle blackout is complete: when disabled, neither hooks nor CLI memory commands execute
- Ready for Plan 04 (final integration/documentation)

## Self-Check: PASSED

All 2 files verified present. All 2 task commits verified (9478ee4, a0e5e4b).

---
*Phase: 12-structural-refactor*
*Completed: 2026-03-18*
