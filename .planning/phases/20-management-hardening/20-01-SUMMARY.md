---
phase: 20-management-hardening
plan: 01
subsystem: infra
tags: [node-version, health-check, install, dependency-verification]

# Dependency graph
requires:
  - phase: 19-layout-migration
    provides: resolver-based imports, six-subsystem layout
provides:
  - stageNodeVersion() function in stages.cjs
  - 7-stage health-check pipeline (was 6)
  - Dependency check step in install pipeline
affects: [management-hardening, switchboard, terminus]

# Tech tracking
tech-stack:
  added: []
  patterns: [process.version major-version parsing, WARN-only install gate]

key-files:
  created: []
  modified:
    - subsystems/terminus/stages.cjs
    - subsystems/terminus/health-check.cjs
    - subsystems/switchboard/install.cjs
    - dynamo/tests/switchboard/stages.test.cjs
    - dynamo/tests/switchboard/health-check.test.cjs
    - dynamo/tests/switchboard/install.test.cjs

key-decisions:
  - "stageNodeVersion appended at HEALTH_STAGE_DEFS index 6 with dependsOn: [] to avoid shifting existing indices"
  - "Install dependency check uses WARN (never FAIL) to avoid blocking emergency deployments"
  - "Node.js version check uses process.version parsing, not node:test smoke test"

patterns-established:
  - "Independent health-check stages use dependsOn: [] and always run regardless of cascade failures"
  - "Install pre-flight checks as Step 0 before file operations"

requirements-completed: [MGMT-01]

# Metrics
duration: 5min
completed: 2026-03-20
---

# Phase 20 Plan 01: Node.js Version Verification Summary

**stageNodeVersion() function with minMajor=22 default, wired as 7th health-check stage and Step 0 install dependency check**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-20T02:35:22Z
- **Completed:** 2026-03-20T02:40:18Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added `stageNodeVersion()` async function returning OK for Node.js >= 22 and FAIL with actionable remediation URL for older versions
- Expanded health-check pipeline from 6 to 7 stages with Node.js Version running independently (no dependencies)
- Added dependency check as the first step (Step 0) in the install pipeline with WARN-only behavior
- Updated all test assertions for new counts (16 exports, 14 STAGE_NAMES, 7 HEALTH_STAGES, 7 health-check stages)
- Added dedicated stageNodeVersion tests (OK, FAIL, minMajor override)
- Full test suite green: 447 tests, 0 failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Add stageNodeVersion to stages.cjs and dependency check step to install.cjs** - `0dd9dce` (feat)
2. **Task 2: Wire stageNodeVersion into health-check.cjs and update all tests** - `a93ae92` (feat)

## Files Created/Modified
- `subsystems/terminus/stages.cjs` - Added stageNodeVersion function, updated STAGE_NAMES (14 entries), HEALTH_STAGES (7 entries), exports (16 keys)
- `subsystems/terminus/health-check.cjs` - Added stageNodeVersion to imports, 7th HEALTH_STAGE_DEFS entry, updated comments
- `subsystems/switchboard/install.cjs` - Added Step 0 dependency check before file copy with WARN-only behavior
- `dynamo/tests/switchboard/stages.test.cjs` - Updated export/count assertions, added stageNodeVersion describe block
- `dynamo/tests/switchboard/health-check.test.cjs` - Updated all mocks for 7 stages, cascade tests, summary counts, added Node.js Version stage test
- `dynamo/tests/switchboard/install.test.cjs` - Added dependency check step tests (existence, ordering, WARN-only)

## Decisions Made
- stageNodeVersion placed at the END of HEALTH_STAGE_DEFS (index 6) with `dependsOn: []` to avoid shifting existing stage indices
- Install dependency check uses WARN status on version mismatch (never FAIL) per locked decision to avoid blocking emergency deployments
- Version check parses process.version for major version only -- no node:test smoke test (per research recommendation)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- stageNodeVersion is available for any future diagnostic pipeline
- Health-check now reports 7 stages including Node.js version status
- Install pipeline validates dependencies before file operations
- Ready for Plan 02 (MGMT-08a/MGMT-08b: dispatcher validation and boundary markers)

## Self-Check: PASSED

All 7 files verified on disk. Both task commits (0dd9dce, a93ae92) verified in git log.

---
*Phase: 20-management-hardening*
*Completed: 2026-03-20*
