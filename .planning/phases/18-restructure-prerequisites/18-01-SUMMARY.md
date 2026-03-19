---
phase: 18-restructure-prerequisites
plan: 01
subsystem: infra
tags: [cjs-resolver, dependency-graph, cycle-detection, dual-layout, node-test]

# Dependency graph
requires: []
provides:
  - "lib/resolve.cjs: centralized dual-layout resolver with logical name API"
  - "lib/dep-graph.cjs: dependency graph builder with DFS cycle detection"
  - "circular-deps structural test validating no non-allowlisted cycles"
affects: [18-02-migration, 19-restructure]

# Tech tracking
tech-stack:
  added: []
  patterns: [logical-name-resolver, dfs-cycle-detection, regex-require-extraction, layout-auto-detection]

key-files:
  created:
    - lib/resolve.cjs
    - lib/dep-graph.cjs
    - dynamo/tests/resolve.test.cjs
    - dynamo/tests/dep-graph.test.cjs
    - dynamo/tests/circular-deps.test.cjs
  modified: []

key-decisions:
  - "scope.cjs is standalone (no core.cjs require) -- excluded from allowlist"
  - "install.cjs <-> update.cjs intra-switchboard cycle added to allowlist (deferred require pattern)"
  - "8 subsystem keys in layout map including future paths (assay, terminus, reverie, cc)"

patterns-established:
  - "Logical name API: resolve('subsystem', 'file') replaces all ad-hoc resolveCore/resolveSibling patterns"
  - "Layout auto-detection: check core.cjs at root level to distinguish repo vs deployed"
  - "Structural cycle test: build full require graph, DFS detect cycles, filter via allowlist"

requirements-completed: [ARCH-02, ARCH-03]

# Metrics
duration: 4min
completed: 2026-03-19
---

# Phase 18 Plan 01: Shared Substrate Summary

**Centralized dual-layout resolver and DFS-based circular dependency detector in lib/, with 21 new tests across 3 test files**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-19T20:32:24Z
- **Completed:** 2026-03-19T20:36:52Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments
- Created lib/resolve.cjs with layout auto-detection (repo vs deployed), logical name API for 8 subsystems, and full error context on resolution failures
- Created lib/dep-graph.cjs with regex-based require() extraction (string literals + path.join patterns), recursive graph builder, and DFS cycle detection with allowlist support
- Structural circular-deps.test.cjs validates the entire production codebase has zero non-allowlisted circular require() chains
- All 396 tests pass (395 pass + 1 skipped), up from 375 baseline -- zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create lib/resolve.cjs centralized resolver and its unit tests** - `dd16200` (feat)
2. **Task 2: Create lib/dep-graph.cjs dependency graph module and its tests including circular dependency detection** - `5f0ec6e` (feat)

**Plan metadata:** pending (docs: complete plan)

_Both tasks followed TDD: RED (failing tests) -> GREEN (implementation) -> verification_

## Files Created/Modified
- `lib/resolve.cjs` - Centralized dual-layout resolver with logical name API (resolve('subsystem', 'file'))
- `lib/dep-graph.cjs` - Dependency graph builder (extractRequires, buildGraph) and DFS cycle detector (detectCycles)
- `dynamo/tests/resolve.test.cjs` - 10 unit tests: layout detection, path resolution for 4 subsystems, error handling, cache reset, future subsystem names, directory resolution
- `dynamo/tests/dep-graph.test.cjs` - 10 unit tests: require extraction (string literals, builtins, npm, path.join), graph building with exclusions, cycle detection (simple, acyclic, allowlisted, multi-node)
- `dynamo/tests/circular-deps.test.cjs` - 1 structural test: builds full production graph, detects cycles, validates against 3-entry allowlist

## Decisions Made
- scope.cjs confirmed standalone (does not require core.cjs) -- only 2 core.cjs <-> ledger cycles exist (mcp-client.cjs, sessions.cjs), not 3 as the plan estimated
- Discovered and allowlisted switchboard/install.cjs <-> switchboard/update.cjs intra-component cycle (both use deferred require() to break it at runtime)
- Layout map includes 8 subsystem keys including 4 future paths (assay, terminus, reverie, cc) that will resolve once directories are created in Phase 19

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added install.cjs <-> update.cjs to circular deps allowlist**
- **Found during:** Task 2 (circular-deps.test.cjs)
- **Issue:** Plan only anticipated core.cjs <-> ledger module cycles. The circular-deps test discovered a pre-existing intra-switchboard cycle (install.cjs <-> update.cjs) that uses deferred require() at runtime
- **Fix:** Added the cycle pair to the ALLOWLIST array in circular-deps.test.cjs
- **Files modified:** dynamo/tests/circular-deps.test.cjs
- **Verification:** circular-deps.test.cjs passes with allowlist applied
- **Committed in:** 5f0ec6e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Necessary correction -- the allowlist needed one additional entry for a pre-existing cycle. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- lib/resolve.cjs ready for Plan 02 to migrate all 22 production files from ad-hoc resolveCore/resolveSibling/resolveHandlers to resolve() calls
- lib/dep-graph.cjs and circular-deps.test.cjs will catch any new circular dependencies introduced during migration
- sync.cjs SYNC_PAIRS and install.cjs copyTree updates needed in Plan 02 to deploy lib/ to ~/.claude/dynamo/lib/

## Self-Check: PASSED

All 5 created files verified on disk. Both task commits (dd16200, 5f0ec6e) verified in git log.

---
*Phase: 18-restructure-prerequisites*
*Completed: 2026-03-19*
