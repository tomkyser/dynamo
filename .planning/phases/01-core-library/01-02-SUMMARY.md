---
phase: 01-core-library
plan: 02
subsystem: lib
tags: [paths, root-discovery, registry, cjs, bun-test, tdd]

# Dependency graph
requires:
  - phase: 01-core-library-01
    provides: Result types (ok, err) for error handling in discoverRoot
provides:
  - discoverRoot() for marker-file based root directory discovery
  - createPaths() for computing absolute paths for all 13 Dynamo layout directories
  - getPaths() convenience combining discovery + registry
  - _resetRoot() for test cache clearing
affects: [01-core-library-03, 02-core-services, 03-core-providers, 04-framework]

# Tech tracking
tech-stack:
  added: []
  patterns: [spyOn-based fs mocking for testable filesystem code, module-scope caching with test reset]

key-files:
  created:
    - lib/paths.cjs
    - lib/__tests__/paths.test.js

key-decisions:
  - "Used spyOn(fs, 'existsSync') instead of mock.module('node:fs') because Bun's native fs binding bypasses mock.module interception"
  - "Module-scope caching with _resetRoot() export for test isolation (validated pattern per research D-05)"
  - ".dynamo marker file checked before config.json at each directory level (primary vs fallback)"

patterns-established:
  - "spyOn pattern: Use spyOn on node:fs methods rather than mock.module for Bun native module mocking"
  - "Cache + reset: Module-scope cache with underscore-prefixed reset function for test isolation"
  - "Path registry: Central path computation from a single root, no hardcoded paths"

requirements-completed: [LIB-02]

# Metrics
duration: 3min
completed: 2026-03-22
---

# Phase 01 Plan 02: Path Resolution Summary

**Root discovery via .dynamo marker walking with cached results, plus central path registry computing 13 Dynamo layout locations from discovered root**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-22T23:34:54Z
- **Completed:** 2026-03-22T23:38:12Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- discoverRoot() walks up directory tree from any starting point, finding .dynamo marker (primary) or config.json (fallback), returning Err at filesystem root
- createPaths() computes correct absolute paths for all 13 Dynamo directory layout locations from any root
- getPaths() combines discovery + registry as single convenience call
- Full TDD: 25 paths tests + 38 existing = 63 total lib/ tests, all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Root discovery function with tests** - `87bc6b7` (feat)
2. **Task 2: Path registry (createPaths) with tests** - `02a5ded` (feat)

## Files Created/Modified
- `lib/paths.cjs` - Root discovery (discoverRoot), path registry (createPaths), convenience (getPaths), test helper (_resetRoot)
- `lib/__tests__/paths.test.js` - 25 tests covering root discovery (8 tests) + path registry (15 tests) + getPaths (2 tests)

## Decisions Made
- Used `spyOn(fs, 'existsSync')` instead of `mock.module('node:fs')` because Bun's native fs binding bypasses mock.module interception. This is a pattern-level discovery that affects all future tests mocking node:fs.
- Module-scope caching with `_resetRoot()` for test isolation, as recommended in research (D-05).
- `.dynamo` marker checked before `config.json` at each directory level, establishing clear priority order.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Switched from mock.module to spyOn for fs mocking**
- **Found during:** Task 1 (root discovery tests)
- **Issue:** Plan specified `mock.module('node:fs', ...)` pattern from research, but Bun's native binding for node:fs bypasses mock.module interception entirely -- all mocked existsSync calls returned the real filesystem result
- **Fix:** Used `spyOn(fs, 'existsSync')` which modifies the function on the shared module object directly, working correctly across both test file and paths.cjs
- **Files modified:** `lib/__tests__/paths.test.js`
- **Verification:** All 8 root discovery tests pass with spyOn pattern
- **Committed in:** `87bc6b7` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Mock strategy change was necessary for tests to function. No scope creep. Established a reusable pattern for all future node:fs mocking in this project.

## Issues Encountered
- Plan 02 depends on Plan 01 outputs (lib/result.cjs) which were built by a parallel agent on a different worktree branch. Resolved by checking out lib/ and .dynamo from the sibling worktree branch before starting.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Path resolution system complete, ready for Plan 03 (configuration loader)
- lib/paths.cjs is ready for import by config.cjs (root discovery needed for config file locations)
- All 63 lib/ tests passing, zero npm dependencies

## Self-Check: PASSED

- All created files exist (lib/paths.cjs, lib/__tests__/paths.test.js, 01-02-SUMMARY.md)
- All commit hashes found (87bc6b7, 02a5ded)
- All 63 tests pass across 4 files

---
*Phase: 01-core-library*
*Completed: 2026-03-22*
