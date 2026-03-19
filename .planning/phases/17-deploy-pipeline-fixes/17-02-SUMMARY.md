---
phase: 17-deploy-pipeline-fixes
plan: 02
subsystem: testing
tags: [regression-tests, neo4j, documentation, branding]

# Dependency graph
requires:
  - phase: 17-deploy-pipeline-fixes (17-01)
    provides: resolveHandlers() in dynamo-hooks.cjs, MCP deregistration in install.cjs, CLAUDE.md template deployment
provides:
  - Regression tests using correct DYNAMO_DIR-based paths (no stale lib/ references)
  - Dispatcher test with resolveHandlers() dual-layout assertion
  - Install test with MCP deregistration, CLAUDE.md template, and stale lib/ cleanup assertions
  - Correct Neo4j Bolt port 7687 in all documentation files
affects: [17-deploy-pipeline-fixes (17-03)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "collectAllCjsFiles() scans root non-recursively then recurses into production subdirs only"
    - "Branding check allows shebang on line 1 with identity block on line 2"

key-files:
  created: []
  modified:
    - dynamo/tests/regression.test.cjs
    - dynamo/tests/ledger/dispatcher.test.cjs
    - dynamo/tests/switchboard/install.test.cjs
    - README.md
    - .planning/codebase/ARCHITECTURE.md
    - .planning/codebase/STACK.md
    - .planning/research/ARCHITECTURE.md

key-decisions:
  - "collectAllCjsFiles() scans DYNAMO_DIR root non-recursively + hooks/, ledger/, switchboard/ recursively to avoid scanning test/migration files"
  - "Branding test tolerates shebang on line 1 -- checks line 2 for '// Dynamo >' identity block when shebang present"
  - "Dispatcher resolveHandlers() test expected to fail until 17-03 deploys updated code (documented in 17-01-SUMMARY)"

patterns-established:
  - "Production file scanning: root-level non-recursive + explicit production subdirectory recursion"
  - "Shebang-aware branding: CLI entry points use #!/usr/bin/env node on line 1, branding on line 2"

requirements-completed: [STAB-03, STAB-04]

# Metrics
duration: 5min
completed: 2026-03-19
---

# Phase 17 Plan 02: Test Fixes and Documentation Port Corrections Summary

**Regression tests fixed to use DYNAMO_DIR-based paths, dispatcher/install tests updated with Phase 17 assertions, Neo4j port corrected from 7688 to 7687 across all docs**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-19T04:03:14Z
- **Completed:** 2026-03-19T04:08:25Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- All regression tests now reference the current deployed layout (DYNAMO_DIR root + ledger/ + switchboard/) instead of the stale lib/ directory
- Dispatcher test asserts resolveHandlers() dual-layout pattern; install test verifies no MCP registration, defensive deregistration, CLAUDE.md template deployment, and lib/ cleanup
- README Mermaid diagram and all codebase documentation corrected from port 7688 to 7687 to match actual docker-compose.yml mapping

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix regression.test.cjs -- replace lib/ paths with current layout** - `acbb66f` (fix)
2. **Task 2: Update dispatcher.test.cjs and install.test.cjs with Phase 17 assertions** - `daf5590` (test)
3. **Task 3: Fix README Mermaid port and codebase documentation** - `71ce1d3` (fix)
4. **Auto-fix: Regression test scanning excludes test files** - `aa590e9` (fix)

## Files Created/Modified
- `dynamo/tests/regression.test.cjs` - Replaced LIB_DIR with SCAN_DIRS, added collectAllCjsFiles(), fixed branding test shebang handling
- `dynamo/tests/ledger/dispatcher.test.cjs` - Removed stale HANDLERS_DIR_LEGACY, added resolveHandlers() assertion
- `dynamo/tests/switchboard/install.test.cjs` - Replaced MCP registration test with deregistration check, added CLAUDE.md and lib/ cleanup assertions
- `README.md` - Fixed Mermaid diagram Neo4j port :7475/:7688 -> :7475/:7687
- `.planning/codebase/ARCHITECTURE.md` - Fixed Neo4j Bolt port 7688 -> 7687
- `.planning/codebase/STACK.md` - Fixed Neo4j Bolt port 7688 -> 7687
- `.planning/research/ARCHITECTURE.md` - Fixed Neo4j Bolt port 7688 -> 7687

## Decisions Made
- collectAllCjsFiles() scans DYNAMO_DIR root non-recursively + hooks/, ledger/, switchboard/ recursively to avoid including test files in production code scans
- Branding test tolerates shebang on line 1 (dynamo.cjs is a CLI entry point with #!/usr/bin/env node) and checks line 2 for identity block
- Dispatcher resolveHandlers() test is expected to fail against deployed file until 17-03 deploys updated code -- this is documented and intentional

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed collectAllCjsFiles() scanning test files as production code**
- **Found during:** Task 1 (regression test verification)
- **Issue:** Replacing LIB_DIR with SCAN_DIRS caused DYNAMO_DIR root scan to recurse into tests/ directory, finding .catch() patterns in test files and failing the DIAG-01 regression test
- **Fix:** Rewrote collectAllCjsFiles() to scan root level non-recursively, then recurse only into production subdirectories (hooks/, ledger/, switchboard/)
- **Files modified:** dynamo/tests/regression.test.cjs
- **Verification:** All 15 regression tests pass
- **Committed in:** aa590e9

**2. [Rule 1 - Bug] Fixed branding test not handling shebang in dynamo.cjs**
- **Found during:** Task 1 (regression test verification)
- **Issue:** dynamo.cjs starts with #!/usr/bin/env node (shebang), not "// Dynamo >", but has branding on line 2. The old LIB_DIR scan never included dynamo.cjs; the new root scan did.
- **Fix:** Updated branding check to allow shebang on line 1 with "// Dynamo >" on line 2
- **Files modified:** dynamo/tests/regression.test.cjs
- **Verification:** Branding test passes with all production .cjs files
- **Committed in:** aa590e9

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes necessary for correctness. The plan's SCAN_DIRS approach was correct but didn't account for test file inclusion or shebang lines at root level. No scope creep.

## Issues Encountered
- Dispatcher resolveHandlers() test fails against deployed file (18/19 pass) -- this is expected until 17-03 deploys the updated dispatcher. Documented in 17-01-SUMMARY.md.
- Plan verification script for install.test.cjs had a false positive (`iSrc.includes('claude mcp add')` matched the negative assertion text itself) -- verified with corrected checks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All test files corrected and ready for deployment in 17-03
- Documentation port corrections are already committed and will deploy with the repo
- Dispatcher resolveHandlers() test will pass once 17-03 runs `dynamo install`

## Self-Check: PASSED

All 8 files verified present. All 4 commits verified in git log.

---
*Phase: 17-deploy-pipeline-fixes*
*Completed: 2026-03-19*
