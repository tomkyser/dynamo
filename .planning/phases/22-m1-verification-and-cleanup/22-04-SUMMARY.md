---
phase: 22-m1-verification-and-cleanup
plan: 04
subsystem: docs
tags: [readme, claude-md, project-md, roadmap, codebase-maps, milestone-closure, git-tag]

requires:
  - phase: 22-m1-verification-and-cleanup (plans 01-03)
    provides: Verified M1 deliverables, cleaned re-exports, finalized VERIFICATION.md
provides:
  - Updated README.md with six-subsystem architecture documentation
  - Updated CLAUDE.md template with correct subsystem paths
  - Evolved PROJECT.md with M1 decision records and current metrics
  - Both ROADMAP.md and MASTER-ROADMAP.md showing M1 shipped
  - Git tag v1.3-M1 on dev branch
  - All 7 codebase maps regenerated for six-subsystem layout
affects: [m2-planning, documentation, onboarding]

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - ".planning/codebase/ARCHITECTURE.md"
    - ".planning/codebase/CONCERNS.md"
    - ".planning/codebase/CONVENTIONS.md"
    - ".planning/codebase/INTEGRATIONS.md"
    - ".planning/codebase/STACK.md"
    - ".planning/codebase/STRUCTURE.md"
    - ".planning/codebase/TESTING.md"
  modified:
    - "README.md"
    - "cc/CLAUDE.md.template"
    - ".planning/PROJECT.md"
    - ".planning/ROADMAP.md"
    - "MASTER-ROADMAP.md"
    - "lib/core.cjs"
    - "dynamo/tests/regression.test.cjs"
    - "dynamo/tests/core.test.cjs"

key-decisions:
  - "Fixed loadPrompt path in core.cjs from DYNAMO_DIR/prompts to DYNAMO_DIR/cc/prompts (production bug)"
  - "Updated regression.test.cjs deployed layout checks from old 3-dir to six-subsystem paths"
  - "Codebase maps regenerated inline (no Task tool) rather than via gsd-codebase-mapper agents"

patterns-established: []

requirements-completed: [ARCH-01, ARCH-04, ARCH-05, ARCH-06, DATA-01, DATA-02]

duration: 17min
completed: 2026-03-20
---

# Phase 22 Plan 04: Documentation Refresh and Milestone Closure Summary

**README, CLAUDE.md template, PROJECT.md, roadmaps updated for six-subsystem architecture; 7 codebase maps regenerated; v1.3-M1 tagged on dev branch**

## Performance

- **Duration:** 17 min
- **Started:** 2026-03-20T16:34:56Z
- **Completed:** 2026-03-20T16:51:35Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments

- README.md fully rewritten with six-subsystem Mermaid diagram, accurate directory tree (subsystems/, cc/, lib/), 8-stage health check, 8 sync pairs, 10-step installer, and deployed layout reflecting SQLite session storage
- CLAUDE.md template updated with all 6 subsystems in Component Architecture table, correct hook paths (cc/hooks/), and session storage documentation
- PROJECT.md evolved: M1 marked shipped, 10 new decision records for Phases 18-22, metrics updated to 515 tests / 5,335 LOC, MENH-06/07 noted as removed
- ROADMAP.md shows Phase 22 complete (4/4 plans), v1.3-M1 milestone shipped with date
- MASTER-ROADMAP.md shows M1 SHIPPED with date and summary
- All 7 codebase maps regenerated from scratch reflecting current six-subsystem architecture
- Git tag v1.3-M1 created as annotated tag on dev branch

## Task Commits

Each task was committed atomically:

1. **Task 1: Refresh README.md and CLAUDE.md template** - `e9f1c2d` (docs)
2. **Task 2: Evolve PROJECT.md, update roadmaps, fix stale tests, tag v1.3-M1** - `1caf82d` (docs)
3. **Task 3: Regenerate all 7 codebase maps** - `23b844c` (docs)

## Files Created/Modified

- `README.md` - Six-subsystem architecture documentation (Mermaid diagram, directory tree, install steps, sync pairs)
- `cc/CLAUDE.md.template` - Updated component architecture table, health-check stage count, session storage docs
- `.planning/PROJECT.md` - M1 decision records, shipped status, updated metrics
- `.planning/ROADMAP.md` - Phase 22 complete, M1 milestone shipped
- `MASTER-ROADMAP.md` - M1 SHIPPED status with date
- `lib/core.cjs` - Fixed loadPrompt path (cc/prompts instead of prompts)
- `dynamo/tests/regression.test.cjs` - Updated deployed layout paths for six-subsystem architecture
- `dynamo/tests/core.test.cjs` - Fixed VERSION file path (dynamo/VERSION instead of root)
- `.planning/codebase/ARCHITECTURE.md` - Fresh architecture map
- `.planning/codebase/CONCERNS.md` - Fresh concerns map
- `.planning/codebase/CONVENTIONS.md` - Fresh conventions map
- `.planning/codebase/INTEGRATIONS.md` - Fresh integrations map
- `.planning/codebase/STACK.md` - Fresh stack map (includes node:sqlite)
- `.planning/codebase/STRUCTURE.md` - Fresh structure map
- `.planning/codebase/TESTING.md` - Fresh testing map

## Decisions Made

- Fixed `loadPrompt` in `lib/core.cjs` -- path was `DYNAMO_DIR/prompts/` but prompts moved to `DYNAMO_DIR/cc/prompts/` during Phase 19 restructure. Production bug found during Task 2 test verification.
- Updated `regression.test.cjs` to check six-subsystem deployed paths instead of old 3-dir layout (ledger/, switchboard/, hooks/ at root)
- Updated `core.test.cjs` VERSION path from root to `dynamo/VERSION`
- Codebase maps regenerated inline (sequential 4-pass approach) since Task tool unavailable in executor context

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed loadPrompt path in core.cjs**
- **Found during:** Task 2 (test verification)
- **Issue:** `loadPrompt()` looked in `DYNAMO_DIR/prompts/` but prompts are now at `DYNAMO_DIR/cc/prompts/` after Phase 19 restructure
- **Fix:** Changed path from `path.join(DYNAMO_DIR, 'prompts', ...)` to `path.join(DYNAMO_DIR, 'cc', 'prompts', ...)`
- **Files modified:** `lib/core.cjs`
- **Verification:** `core.test.cjs` loadPrompt test now passes
- **Committed in:** `1caf82d`

**2. [Rule 1 - Bug] Fixed regression.test.cjs stale deployed layout paths**
- **Found during:** Task 2 (test verification)
- **Issue:** regression.test.cjs checked for `ledger/`, `switchboard/`, `hooks/` at `~/.claude/dynamo/` root and `core.cjs`/`VERSION` at root -- all moved by Phase 19
- **Fix:** Updated SCAN_DIRS and collectAllCjsFiles to use `subsystems/`, `cc/`, `lib/` paths; updated Directory Structure test to check `subsystems/*`, `cc/hooks`, `cc/prompts`, `lib`; updated VERSION path to `dynamo/VERSION`; updated core.cjs reads to `lib/core.cjs`
- **Files modified:** `dynamo/tests/regression.test.cjs`, `dynamo/tests/core.test.cjs`
- **Verification:** Full test suite passes (514 pass, 0 fail, 1 skip = 515 total)
- **Committed in:** `1caf82d`

---

**Total deviations:** 2 auto-fixed (2 bugs -- stale paths from Phase 19 restructure)
**Impact on plan:** Both fixes necessary for test suite to pass. No scope creep.

## Issues Encountered

None beyond the auto-fixed stale path bugs.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- v1.3-M1 milestone fully closed: all documentation current, tag created, roadmaps updated
- All 7 codebase maps are fresh and accurate for M2 planning
- 515 tests passing with 0 failures
- Infrastructure ready for Reverie (M2): six-subsystem architecture in place, `subsystems/reverie/` stub exists
- MASTER-ROADMAP.md shows M2 as next milestone with full requirements table

## Self-Check: PASSED

All 16 files verified present. All 3 task commits verified in git log.

---
*Phase: 22-m1-verification-and-cleanup*
*Completed: 2026-03-20*
