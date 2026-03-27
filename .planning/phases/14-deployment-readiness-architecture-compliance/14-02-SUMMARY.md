---
phase: 14-deployment-readiness-architecture-compliance
plan: 02
subsystem: cli
tags: [pulley, cli, flags, process-argv, tech-debt]

# Dependency graph
requires:
  - phase: 12-integration-surface-backfill
    provides: "Backfill CLI and reset CLI with process.argv reads"
  - phase: 05-sdk-platform-infrastructure
    provides: "Pulley CLI framework with parseArgs routing"
provides:
  - "Pulley full flag passthrough to all command handlers"
  - "Backfill CLI reading --dry-run/--limit/--batch-size from Pulley flags"
  - "Reset CLI reading --confirm from Pulley flags"
  - "Test coverage proving status Wire.query() returns real values"
affects: [cli, pulley, reverie-module]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Pulley defines all known flags in parseArgs and passes full values to handlers"]

key-files:
  created: []
  modified:
    - "core/sdk/pulley/pulley.cjs"
    - "modules/reverie/components/cli/register-commands.cjs"
    - "modules/reverie/components/cli/reset.cjs"
    - "modules/reverie/components/cli/__tests__/reset.test.js"
    - "modules/reverie/components/cli/__tests__/status.test.js"

key-decisions:
  - "Defined --dry-run, --confirm, --limit, --batch-size as explicit parseArgs options rather than relying on strict:false unknown flag parsing (strict:false treats all unknowns as booleans, losing string values)"
  - "Status Wire.query() code is correctly wired -- the 0 default is for empty data, not a stub"

patterns-established:
  - "Pulley flag passthrough: define all known flags in parseArgs options, pass full values to handlers"

requirements-completed: [INT-02]

# Metrics
duration: 3min
completed: 2026-03-27
---

# Phase 14 Plan 02: CLI Flag Passthrough Summary

**Migrated backfill and reset CLI from process.argv to Pulley flags parameter; verified status Wire.query() data path with targeted tests**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-27T17:03:43Z
- **Completed:** 2026-03-27T17:07:37Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Pulley now passes full parsed values to all command handlers, enabling CLI commands to work in both direct CLI and programmatic invocation contexts
- Backfill CLI reads --dry-run, --limit, --batch-size from Pulley flags parameter instead of process.argv
- Reset CLI reads --confirm from Pulley flags parameter instead of process.argv
- Three new tests prove status domain_count and association_index_size return real values from Wire.query() when data exists
- All 140 tests pass across Pulley and CLI test suites

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Pulley flag passthrough and migrate backfill + reset CLI** - `1a5f005` (feat) + reverie submodule `bae8c5c`
2. **Task 2: Verify status.cjs Wire.query() data path and add test coverage** - `7a833f4` (test) + reverie submodule `bb8fdab`

## Files Created/Modified
- `core/sdk/pulley/pulley.cjs` - Added --dry-run, --confirm, --limit, --batch-size to parseArgs options; passes full values to handlers
- `modules/reverie/components/cli/register-commands.cjs` - Backfill handler reads flags['dry-run'], flags.limit, flags['batch-size'] instead of process.argv
- `modules/reverie/components/cli/reset.cjs` - _requireConfirm accepts flags parameter; all 3 handlers pass flags to it
- `modules/reverie/components/cli/__tests__/reset.test.js` - Tests use flags parameter instead of process.argv manipulation
- `modules/reverie/components/cli/__tests__/status.test.js` - Three new tests for Wire.query() data path coverage

## Decisions Made
- Defined --dry-run, --confirm, --limit, --batch-size as explicit parseArgs options because strict:false treats all unknown flags as booleans (losing string values like --limit 10)
- Status Wire.query() code confirmed as correctly wired -- the audit's "hardcoded 0" characterization was incorrect; it is a default for empty data, not a stub

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] parseArgs strict:false does not capture string values for unknown flags**
- **Found during:** Task 1
- **Issue:** Plan noted that parseArgs with strict:false might not capture unknown flags properly. Testing confirmed: `--limit 10` with strict:false produces `{ limit: true }` (boolean) not `{ limit: '10' }` (string). The value '10' becomes a positional argument.
- **Fix:** Defined --dry-run, --confirm, --limit, --batch-size as explicit typed options in Pulley's parseArgs config (plan's alternative approach B)
- **Files modified:** core/sdk/pulley/pulley.cjs
- **Verification:** `bun test core/sdk/pulley` passes; parseArgs correctly produces `{ limit: '10', 'batch-size': '5' }` with typed definitions
- **Committed in:** 1a5f005

**2. [Rule 1 - Bug] Reset tests used process.argv manipulation which no longer applies**
- **Found during:** Task 1
- **Issue:** Reset tests manipulated process.argv to simulate --confirm flag, but the implementation now reads from the flags parameter
- **Fix:** Replaced setConfirmFlag/restoreArgv helpers with flagsWith() helper that returns proper flags objects
- **Files modified:** modules/reverie/components/cli/__tests__/reset.test.js
- **Verification:** All reset tests pass with flags-based approach
- **Committed in:** 1a5f005 (reverie submodule bae8c5c)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes were anticipated by the plan as contingencies. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CLI handlers now work in both direct CLI and programmatic invocation contexts (MCP tools, tests, other services)
- Zero process.argv references remain in CLI handlers
- Status Wire.query() data path verified with explicit test coverage

## Self-Check: PASSED

All files verified present, all commits found in git log.

---
*Phase: 14-deployment-readiness-architecture-compliance*
*Completed: 2026-03-27*
