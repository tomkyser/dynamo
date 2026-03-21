---
phase: quick
plan: 260320-ue0
subsystem: infra
tags: [deploy, install, sync, version, switchboard]

requires: []
provides:
  - "Correct VERSION file (1.3.0)"
  - "Repo-aware install via .repo-path dotfile"
  - "Content-based sync diffTrees for same-size files"
affects: [switchboard, install, sync, deploy]

tech-stack:
  added: []
  patterns:
    - "resolveRepoRoot pattern: check .git, then .repo-path dotfile, then fallback"
    - "Content comparison in diffTrees via Buffer.compare for same-size files"

key-files:
  created: []
  modified:
    - dynamo/VERSION
    - subsystems/switchboard/install.cjs
    - subsystems/switchboard/sync.cjs
    - dynamo/tests/switchboard/install.test.cjs
    - dynamo/tests/switchboard/sync.test.cjs

key-decisions:
  - "resolveRepoRoot checks .git first (repo), then .repo-path dotfile (deployed), then falls back to relative path"
  - "diffTrees content comparison only runs when sizes match and dst mtime >= src (fast path preserved)"
  - "Buffer.compare used for byte-level comparison (same pattern as existing detectConflicts)"

patterns-established:
  - "resolveRepoRoot: canonical way to find the real git repo from any execution context"

requirements-completed: []

duration: 2min
completed: 2026-03-20
---

# Quick Task 260320-ue0: Fix VERSION File and Sync Chicken-and-Egg Summary

**Updated VERSION to 1.3.0, fixed install REPO_ROOT resolution via .repo-path dotfile, and added content-based byte comparison to sync diffTrees**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-21T02:56:14Z
- **Completed:** 2026-03-21T02:58:26Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- VERSION file updated from 0.1.0 to 1.3.0 -- `dynamo version` now reports correctly
- `resolveRepoRoot()` added to install.cjs: detects whether running from repo (.git) or deployed copy (.repo-path), resolving the correct source directory for file copying
- `diffTrees()` in sync.cjs now accepts optional srcDir/dstDir params and performs Buffer.compare on same-size files, catching content changes that mtime alone misses
- 8 new tests added across both modules covering all fix scenarios

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix VERSION file and install chicken-and-egg** - `061a7d3` (fix)
2. **Task 2: Fix sync diffTrees to use content comparison** - `db6c13e` (fix)
3. **Task 3: Integration smoke test** - verification only, no code changes

## Files Created/Modified
- `dynamo/VERSION` - Updated from 0.1.0 to 1.3.0
- `subsystems/switchboard/install.cjs` - Added resolveRepoRoot() function, reordered LIVE_DIR/REPO_ROOT, exported new function
- `subsystems/switchboard/sync.cjs` - Extended diffTrees with optional srcDir/dstDir params for content comparison, updated all call sites
- `dynamo/tests/switchboard/install.test.cjs` - Added 3 resolveRepoRoot tests
- `dynamo/tests/switchboard/sync.test.cjs` - Added 5 content-comparison diffTrees tests

## Decisions Made
- resolveRepoRoot checks .git existence first (fast, reliable for repo context), falls back to .repo-path dotfile (for deployed context), then to original relative path (ultimate fallback)
- diffTrees byte comparison only triggers on the "same size, dst newer/equal mtime" case -- different sizes and newer src mtime still use the fast path without file reads
- Backward compatibility preserved: calling diffTrees without srcDir/dstDir retains original mtime-only behavior

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Task Readiness
- Deployment pipeline is now self-consistent: install copies from repo, sync detects real changes, version reports correctly
- `dynamo install` followed by `dynamo sync status` will now correctly show changes when content differs

## Self-Check: PASSED

All 5 files verified present. Both task commits (061a7d3, db6c13e) verified in git log.

---
*Quick Task: 260320-ue0*
*Completed: 2026-03-20*
