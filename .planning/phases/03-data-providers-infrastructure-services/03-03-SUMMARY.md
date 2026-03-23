---
phase: 03-data-providers-infrastructure-services
plan: 03
subsystem: git
tags: [bun-spawn, git-cli, submodules, file-sync, forge]

# Dependency graph
requires:
  - phase: 02-foundational-services
    provides: "Lathe filesystem facade, Switchboard event bus, service factory pattern"
provides:
  - "Forge git operations service (status, commit, branch, tag, log, resetTo)"
  - "Submodule management (add, update, remove)"
  - "Repo-to-deploy file sync via Lathe"
  - "Git event emission (git:committed, git:tagged) via Switchboard"
affects: [03-05-relay, 04-framework-armature]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Bun.spawnSync for CLI execution with GIT_TERMINAL_PROMPT=0 and stdin:ignore", "protocol.file.allow=always for local submodule operations"]

key-files:
  created:
    - core/services/forge/forge.cjs
    - core/services/forge/__tests__/forge.test.js
  modified: []

key-decisions:
  - "Used stdout inspection alongside stderr for git commit 'nothing to commit' detection -- git puts this message in stdout not stderr"
  - "Added -c protocol.file.allow=always to submodule commands for local file:// transport security"
  - "Sync operation is async (uses Lathe readFile/writeFile which are async) while all git operations are synchronous via Bun.spawnSync"

patterns-established:
  - "Git CLI wrapping: _runGit helper centralizes Bun.spawnSync with security env vars"
  - "Event emission on git state changes: commit and tag emit via Switchboard for downstream consumers"

requirements-completed: [SVC-05]

# Metrics
duration: 3min
completed: 2026-03-23
---

# Phase 3 Plan 3: Forge Git Operations Service Summary

**Git CLI wrapper via Bun.spawnSync with submodule management, repo-to-deploy sync, and event emission through Switchboard**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-23T03:22:32Z
- **Completed:** 2026-03-23T03:25:58Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Forge service wraps git CLI via Bun.spawnSync with GIT_TERMINAL_PROMPT=0 and stdin:ignore to prevent credential prompt hangs
- Full git operations: status (--porcelain parsing), commit, branch, tag, log, resetTo
- Submodule lifecycle management: add, update, remove with protocol.file.allow=always for local repos
- Recursive directory sync via Lathe for repo-to-deploy file copy
- Event emission (git:committed, git:tagged) via Switchboard for downstream consumers
- 24 tests covering contract validation, lifecycle, git ops, submodules, sync, and event emission

## Task Commits

Each task was committed atomically:

1. **Task 1: Forge service tests (RED phase)** - `29ab7f7` (test)
2. **Task 2: Forge service implementation (GREEN phase)** - `7d1df3b` (feat)

## Files Created/Modified
- `core/services/forge/forge.cjs` - Forge service factory with git CLI operations, submodule management, and file sync
- `core/services/forge/__tests__/forge.test.js` - 24 tests using real tmpdir git repos and mock switchboard

## Decisions Made
- Used stdout inspection alongside stderr for detecting "nothing to commit" from git -- git places this message in stdout (exit code 1) rather than stderr
- Added `-c protocol.file.allow=always` to submodule commands because modern git blocks file:// transport by default (security feature CVE-2022-39253)
- Sync operation is async (Lathe readFile/writeFile are Promise-based) while all other Forge operations are synchronous via Bun.spawnSync

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed commit NOTHING_TO_COMMIT detection**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** Git commit on clean repo returns exit code 1 with "nothing to commit" in stdout, not stderr. The _runGit helper only captured stderr for error messages.
- **Fix:** Extended _runGit to capture stdout in error context; commit method checks both stderr message and stdout for "nothing to commit" pattern.
- **Files modified:** core/services/forge/forge.cjs
- **Verification:** Test "returns Err(NOTHING_TO_COMMIT) on clean repo" passes
- **Committed in:** 7d1df3b (Task 2 commit)

**2. [Rule 3 - Blocking] Fixed submodule file:// protocol blocked by git security**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** Modern git (2.38+) blocks file:// transport by default for submodule operations due to CVE-2022-39253. Tests using local bare repos as submodule sources failed.
- **Fix:** Added `-c protocol.file.allow=always` to submoduleAdd and submoduleUpdate git commands.
- **Files modified:** core/services/forge/forge.cjs
- **Verification:** All three submodule tests pass (add, update, remove)
- **Committed in:** 7d1df3b (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## Known Stubs
None. All methods are fully implemented and tested.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Forge is ready for Relay (Plan 05) to orchestrate for install/update/sync operations
- Forge is ready for Armature (Phase 4) to use for plugin/module submodule management
- All 216 tests pass across the full suite with zero regressions

## Self-Check: PASSED

- FOUND: core/services/forge/forge.cjs
- FOUND: core/services/forge/__tests__/forge.test.js
- FOUND: .planning/phases/03-data-providers-infrastructure-services/03-03-SUMMARY.md
- FOUND: commit 29ab7f7
- FOUND: commit 7d1df3b

---
*Phase: 03-data-providers-infrastructure-services*
*Completed: 2026-03-23*
