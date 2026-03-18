---
phase: 13-cleanup-and-fixes
plan: 01
subsystem: infra
tags: [git-tag, legacy-removal, cleanup, archival]

# Dependency graph
requires:
  - phase: 12-structural-refactor
    provides: CJS rewrite that replaced all Python/Bash functionality
  - phase: 10-switchboard
    provides: switchboard/install.cjs and switchboard/sync.cjs replacements
provides:
  - Clean repository with only CJS-based Dynamo system (no legacy Python/Bash)
  - Git tag v1.2-legacy-archive for historical reference
affects: [13-cleanup-and-fixes, documentation]

# Tech tracking
tech-stack:
  added: []
  patterns: [git-tag-before-destructive-change]

key-files:
  created: []
  modified: []

key-decisions:
  - "Tagged v1.2-legacy-archive on dev branch before any deletions for permanent historical reference"
  - "Removed untracked graphiti/.last-sync file to fully clean the directory after git rm"

patterns-established:
  - "Git tag as archive marker: Create annotated tag before destructive operations for historical recovery"

requirements-completed: [STAB-02]

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 13 Plan 01: Legacy Archive and Removal Summary

**Git tag v1.2-legacy-archive created, then graphiti/ directory plus root-level install.sh and sync-graphiti.sh removed from repo (3106 lines deleted)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T20:19:54Z
- **Completed:** 2026-03-18T20:22:23Z
- **Tasks:** 2
- **Files modified:** 20 (all deletions)

## Accomplishments
- Created git tag `v1.2-legacy-archive` on commit `7332efc` for permanent historical reference
- Removed entire `graphiti/` directory: 3 Python files, 6 Bash hook scripts, docker-compose duplicate, configs, README
- Removed root-level `install.sh` (replaced by `switchboard/install.cjs`) and `sync-graphiti.sh` (replaced by `switchboard/sync.cjs`)
- Verified `ledger/graphiti/` Phase 12 infrastructure remains completely intact
- Verified legacy archive at `~/.claude/graphiti-legacy/` is accessible
- Full regression test suite passes (94/94 tests, 0 failures)

## Task Commits

Each task was committed atomically:

1. **Task 1: Verify legacy archive and create git tag** - no file commit (git tag `v1.2-legacy-archive` is the artifact)
2. **Task 2: Remove all legacy files from repository** - `8a0c185` (remove)

**Plan metadata:** `d7da8a1` (docs: complete plan)

## Files Created/Modified
- `graphiti/` - Entire directory removed (18 files: .env.example, README.md, SCOPE_FALLBACK.md, config.yaml, curation/prompts.yaml, diagnose.py, docker-compose.yml, graphiti-helper.py, health-check.py, hooks/capture-change.sh, hooks/health-check.sh, hooks/preserve-knowledge.sh, hooks/prompt-augment.sh, hooks/session-start.sh, hooks/session-summary.sh, requirements.txt, start-graphiti.sh, stop-graphiti.sh)
- `install.sh` - Removed (legacy Bash installer)
- `sync-graphiti.sh` - Removed (legacy Bash sync script)

## Decisions Made
- Tagged `v1.2-legacy-archive` on the dev branch before any deletions, preserving the exact commit state with all legacy files for historical browsability
- Cleaned up untracked `graphiti/.last-sync` file (sync timestamp from old system) to fully remove the directory from the working tree

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed untracked graphiti/.last-sync file**
- **Found during:** Task 2 (Remove all legacy files)
- **Issue:** `git rm -r graphiti/` only removes tracked files. The untracked `.last-sync` file (a sync timestamp) kept the directory from being fully removed, causing the `test ! -d graphiti/` verification to fail.
- **Fix:** Manually removed `graphiti/.last-sync` and the now-empty directory with `rm` and `rmdir`.
- **Files modified:** graphiti/.last-sync (untracked, deleted)
- **Verification:** `test ! -d graphiti/` now passes
- **Committed in:** Not committed (untracked file, never in git)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor cleanup of an untracked file that prevented full directory removal. No scope creep.

## Issues Encountered
None beyond the deviation noted above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Repository is clean of all legacy Python/Bash artifacts
- Phase 12 infrastructure (`ledger/graphiti/`) is intact and unaffected
- Ready for Plan 02 (Neo4j browser fix) which modifies `ledger/graphiti/docker-compose.yml`
- Git tag `v1.2-legacy-archive` available for historical reference if needed

## Self-Check: PASSED

- FOUND: `.planning/phases/13-cleanup-and-fixes/13-01-SUMMARY.md`
- FOUND: commit `8a0c185` (remove legacy files)
- FOUND: git tag `v1.2-legacy-archive`

---
*Phase: 13-cleanup-and-fixes*
*Completed: 2026-03-18*
