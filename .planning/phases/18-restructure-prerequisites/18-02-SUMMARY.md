---
phase: 18-restructure-prerequisites
plan: 02
subsystem: infra
tags: [cjs, resolver, module-resolution, deploy-pipeline, circular-deps]

# Dependency graph
requires:
  - phase: 18-01
    provides: lib/resolve.cjs centralized resolver module, lib/dep-graph.cjs cycle detector, circular-deps test
provides:
  - All 23 production files migrated from ad-hoc resolution to centralized lib/resolve.cjs
  - Deploy pipeline (sync.cjs, install.cjs) updated to include lib/ directory
  - Dual-layout bootstrap pattern for dynamo/ root files (deployed to flat layout)
  - Test assertions verify new resolver patterns (no stale resolveCore/resolveSibling/resolveHandlers)
  - boundary.test.cjs verifies lib/ existence and stale resolver function detection
affects: [19-restructure, 20-sqlite, deploy-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns: [dual-layout bootstrap for dynamo/ root files, centralized resolver bootstrap require]

key-files:
  created: []
  modified:
    - dynamo/core.cjs
    - dynamo/dynamo.cjs
    - dynamo/hooks/dynamo-hooks.cjs
    - ledger/search.cjs
    - ledger/episodes.cjs
    - ledger/sessions.cjs
    - ledger/mcp-client.cjs
    - ledger/curation.cjs
    - ledger/hooks/capture-change.cjs
    - ledger/hooks/preserve-knowledge.cjs
    - ledger/hooks/prompt-augment.cjs
    - ledger/hooks/session-start.cjs
    - ledger/hooks/session-summary.cjs
    - switchboard/stages.cjs
    - switchboard/health-check.cjs
    - switchboard/diagnose.cjs
    - switchboard/install.cjs
    - switchboard/sync.cjs
    - switchboard/update.cjs
    - switchboard/update-check.cjs
    - switchboard/verify-memory.cjs
    - switchboard/stack.cjs
    - switchboard/migrate.cjs
    - dynamo/tests/boundary.test.cjs
    - dynamo/tests/switchboard/update.test.cjs
    - dynamo/tests/switchboard/sync.test.cjs
    - dynamo/tests/switchboard/install.test.cjs
    - dynamo/tests/ledger/dispatcher.test.cjs

key-decisions:
  - "Dual-layout bootstrap for dynamo/ root files: dynamo/core.cjs and dynamo/dynamo.cjs use conditional require (fs.existsSync check) since they deploy to flat root of ~/.claude/dynamo/ where ../lib/ would escape the directory"
  - "install.cjs Step 6 changed from deleting lib/ (stale artifact) to verifying lib/ (now required shared substrate)"
  - "SYNC_PAIRS expanded from 3 to 4 entries to include lib/ directory deployment"

patterns-established:
  - "Bootstrap require: depth-1 files use require('../lib/resolve.cjs'), depth-2 files use require('../../lib/resolve.cjs'), dynamo/ root files use dual-layout conditional"
  - "All cross-component requires go through resolve(subsystem, file) pattern"

requirements-completed: [ARCH-02, ARCH-03]

# Metrics
duration: 14min
completed: 2026-03-19
---

# Phase 18 Plan 02: Resolver Migration Summary

**Migrated 23 production files from ad-hoc resolveCore/resolveSibling/resolveHandlers/resolveLedger to centralized lib/resolve.cjs with dual-layout bootstrap, updated deploy pipeline to include lib/, and verified 397 tests pass**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-19T20:40:12Z
- **Completed:** 2026-03-19T20:54:42Z
- **Tasks:** 2
- **Files modified:** 31

## Accomplishments
- Eliminated 23 duplicated resolver functions across all production files, replacing with single centralized lib/resolve.cjs
- Updated deploy pipeline (sync.cjs SYNC_PAIRS and install.cjs copyTree) to deploy lib/ alongside dynamo/, ledger/, switchboard/
- Discovered and fixed dual-layout bootstrap issue for dynamo/ root files that deploy to flat layout at ~/.claude/dynamo/
- Updated 5 test files with new resolver pattern assertions and added lib/ existence + stale resolver detection tests
- Full test suite passes: 397 pass, 0 fail, 1 skip

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate all production files to centralized resolver and update deploy pipeline** - `710ec7a` (feat)
2. **Task 2: Update test assertions and run full regression** - `6ae1048` (test)

**Plan metadata:** (pending)

## Files Created/Modified
- `dynamo/core.cjs` - Replaced resolveLedger() with resolve('ledger', ...), added dual-layout bootstrap
- `dynamo/dynamo.cjs` - Replaced resolveSibling() with resolve(), added dual-layout bootstrap
- `dynamo/hooks/dynamo-hooks.cjs` - Replaced resolveHandlers() with resolve('ledger', 'hooks'), added dual-layout bootstrap
- `ledger/search.cjs` - Replaced resolveCore() with resolve('dynamo', 'core.cjs')
- `ledger/episodes.cjs` - Same pattern as search.cjs
- `ledger/sessions.cjs` - Same pattern
- `ledger/mcp-client.cjs` - Same pattern (part of known cycle with core.cjs)
- `ledger/curation.cjs` - Same pattern
- `ledger/hooks/capture-change.cjs` - Depth-2 bootstrap to resolve.cjs
- `ledger/hooks/preserve-knowledge.cjs` - Depth-2 bootstrap
- `ledger/hooks/prompt-augment.cjs` - Depth-2 bootstrap
- `ledger/hooks/session-start.cjs` - Depth-2 bootstrap
- `ledger/hooks/session-summary.cjs` - Depth-2 bootstrap
- `switchboard/stages.cjs` - Replaced resolveCore() with centralized resolver
- `switchboard/health-check.cjs` - Same pattern
- `switchboard/diagnose.cjs` - Same pattern
- `switchboard/install.cjs` - Replaced resolveCore(), added lib/ copyTree, replaced stale lib/ cleanup with verification
- `switchboard/sync.cjs` - Replaced resolveCore(), added lib/ SYNC_PAIRS entry
- `switchboard/update.cjs` - Replaced resolveCore()
- `switchboard/update-check.cjs` - Same pattern
- `switchboard/verify-memory.cjs` - Same pattern
- `switchboard/stack.cjs` - Same pattern
- `switchboard/migrate.cjs` - Removed unused resolveCore() definition
- `dynamo/tests/boundary.test.cjs` - Added lib/ existence and stale resolver function detection tests
- `dynamo/tests/switchboard/update.test.cjs` - Updated assertion from resolveCore to centralized resolver
- `dynamo/tests/switchboard/sync.test.cjs` - Updated SYNC_PAIRS count from 3 to 4
- `dynamo/tests/switchboard/install.test.cjs` - Updated stale lib/ test to verify lib/ test
- `dynamo/tests/ledger/dispatcher.test.cjs` - Updated resolveHandlers assertions to centralized resolver

## Decisions Made
- **Dual-layout bootstrap for dynamo/ root files:** dynamo/core.cjs and dynamo/dynamo.cjs deploy to the root of ~/.claude/dynamo/ (flat layout), so `../lib/resolve.cjs` would escape the directory in deployed layout. Fixed with conditional require using fs.existsSync to check both `./lib/resolve.cjs` (deployed) and `../lib/resolve.cjs` (repo).
- **install.cjs Step 6 behavior change:** Changed from destructively removing LIVE_DIR/lib/ (was a pre-Phase-12 artifact cleanup) to verifying lib/resolve.cjs exists after deployment. Without this fix, install would deploy lib/ in Step 1 then delete it in Step 6.
- **dynamo/hooks/dynamo-hooks.cjs:** Same dual-layout issue: deployed at ~/.claude/dynamo/hooks/ (depth 1) vs repo at <repo>/dynamo/hooks/ (depth 2). Uses conditional bootstrap checking `../lib/resolve.cjs` (deployed) vs `../../lib/resolve.cjs` (repo).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dual-layout bootstrap for dynamo/ root files**
- **Found during:** Task 2 (test execution revealed MODULE_NOT_FOUND errors in deployed layout)
- **Issue:** dynamo/core.cjs, dynamo/dynamo.cjs, and dynamo/hooks/dynamo-hooks.cjs deploy to different directory depths in deployed vs repo layout. Using a single `../lib/resolve.cjs` path works in repo but fails in deployed.
- **Fix:** Added conditional bootstrap using fs.existsSync to check both possible paths. Each dynamo/ file uses its correct depth for both layouts.
- **Files modified:** dynamo/core.cjs, dynamo/dynamo.cjs, dynamo/hooks/dynamo-hooks.cjs
- **Verification:** Full test suite passes in both layouts (tests verify deployed and repo files)
- **Committed in:** 6ae1048 (Task 2 commit)

**2. [Rule 1 - Bug] install.cjs Step 6 would delete freshly deployed lib/**
- **Found during:** Task 1 (reading install.cjs for migration)
- **Issue:** Step 6 "Clean stale lib/" deleted LIVE_DIR/lib/ unconditionally. After adding lib/ copyTree in Step 1, Step 6 would immediately destroy it.
- **Fix:** Changed Step 6 from destructive cleanup to verification that lib/resolve.cjs was deployed correctly.
- **Files modified:** switchboard/install.cjs
- **Verification:** install.test.cjs updated and passes
- **Committed in:** 710ec7a (Task 1 commit)

**3. [Rule 1 - Bug] sync.test.cjs expected 3 SYNC_PAIRS, now 4**
- **Found during:** Task 2 (full test suite run)
- **Issue:** sync.test.cjs asserted exactly 3 sync pairs but we added a 4th for lib/
- **Fix:** Updated assertion to expect 4 pairs and verify lib label exists
- **Files modified:** dynamo/tests/switchboard/sync.test.cjs
- **Verification:** Test passes
- **Committed in:** 6ae1048 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (3 bugs)
**Impact on plan:** All auto-fixes necessary for correctness. The dual-layout bootstrap issue was the most significant -- it prevented the resolver from working in deployed layout. No scope creep.

## Issues Encountered
- The deployed layout's flat structure for dynamo/ files (core.cjs and dynamo.cjs at root level, not in a subdirectory) means the bootstrap require path differs between layouts. This is the exact problem the resolver solves for cross-component imports, but ironically the resolver bootstrap itself needs the same solution. Resolved with a minimal conditional require.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ARCH-02 (centralized resolver) is fully delivered: all production files use lib/resolve.cjs
- ARCH-03 (circular dependency detection) was delivered in Plan 01 and confirmed working after migration
- Phase 18 is complete -- ready for Phase 19 (six-subsystem restructure)
- lib/ is deployed alongside dynamo/, ledger/, switchboard/ via sync and install
- All 397 tests pass with zero regressions

---
*Phase: 18-restructure-prerequisites*
*Completed: 2026-03-19*
