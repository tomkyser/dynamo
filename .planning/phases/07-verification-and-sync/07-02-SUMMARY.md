---
phase: 07-verification-and-sync
plan: 02
subsystem: infra
tags: [rsync, sync, installer, documentation, graphiti]

# Dependency graph
requires:
  - phase: 07-verification-and-sync (plan 01)
    provides: verified memory pipeline with verify-memory subcommand and 13-stage diagnostics
  - phase: 06-session-management
    provides: session management subcommands and auto-naming hooks
  - phase: 05-hook-reliability
    provides: rewritten hooks with error propagation and global scope fallback
  - phase: 04-diagnostics
    provides: diagnose.py and health-check.py diagnostic tools
provides:
  - sync-graphiti.sh for bidirectional file sync with conflict detection
  - All Phase 4-6 fixes synced to repo graphiti/ directory
  - Updated install.sh covering all new files (diagnose.py, health-check.py, SCOPE_FALLBACK.md)
  - graphiti/README.md setup guide for GitHub visitors
affects: [install, deployment, onboarding]

# Tech tracking
tech-stack:
  added: [rsync]
  patterns: [bidirectional-sync-with-conflict-detection, exclude-list-for-secrets]

key-files:
  created:
    - sync-graphiti.sh
    - graphiti/README.md
    - graphiti/diagnose.py
    - graphiti/health-check.py
    - graphiti/SCOPE_FALLBACK.md
    - graphiti/hooks/health-check.sh
  modified:
    - install.sh
    - graphiti/graphiti-helper.py
    - graphiti/hooks/capture-change.sh
    - graphiti/hooks/session-summary.sh
    - graphiti/hooks/preserve-knowledge.sh
    - graphiti/hooks/prompt-augment.sh
    - graphiti/hooks/session-start.sh
    - graphiti/docker-compose.yml
    - graphiti/curation/prompts.yaml
    - .gitignore

key-decisions:
  - "rsync-based sync with --dry-run conflict detection in both directions before executing"
  - "Exclude .env, .venv, __pycache__, sessions.json, hook-errors.log, PLAN.md from sync"
  - "--force flag overrides conflict detection for intentional overwrites"
  - ".last-sync timestamp file tracks last sync time, excluded from git"

patterns-established:
  - "Sync workflow: ./sync-graphiti.sh status -> live-to-repo -> git diff -> git add -p -> commit"
  - "Conflict detection via dual rsync --dry-run before actual sync"

requirements-completed: [SYNC-01, SYNC-02]

# Metrics
duration: 3min
completed: 2026-03-17
---

# Phase 7 Plan 02: Graphiti Sync and Documentation Summary

**Bidirectional sync script with rsync-based conflict detection, full Phase 4-6 file sync to repo, updated installer, and GitHub-facing README**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-17T05:22:00Z
- **Completed:** 2026-03-17T05:26:00Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- Created sync-graphiti.sh with bidirectional sync, conflict detection (dual rsync --dry-run), --force override, and status command
- Synced all Phase 4-6 fixes from live ~/.claude/graphiti/ to repo: diagnose.py, health-check.py, SCOPE_FALLBACK.md, hooks/health-check.sh, plus updated graphiti-helper.py and all rewritten hooks
- Updated install.sh to copy diagnose.py, health-check.py, SCOPE_FALLBACK.md, and chmod new executables
- Wrote graphiti/README.md covering prerequisites, quick start, file structure, hooks, session management, troubleshooting, syncing, and known limitations
- Added graphiti/.last-sync to .gitignore

## Task Commits

Each task was committed atomically:

1. **Task 1: Create sync script, run initial sync, update install.sh, write README** - `3a3be47` (feat)
2. **Task 2: Verify sync completeness and README quality** - checkpoint:human-verify (auto-approved, 12/12 checks passed)

**Plan metadata:** (pending final commit)

## Files Created/Modified
- `sync-graphiti.sh` - Bidirectional sync script with conflict detection, status, --force override
- `graphiti/README.md` - Setup guide for GitHub visitors with prerequisites, quick start, file structure, hooks, troubleshooting
- `graphiti/diagnose.py` - 13-stage diagnostic tool (synced from live)
- `graphiti/health-check.py` - 6-stage health check with canary round-trip (synced from live)
- `graphiti/SCOPE_FALLBACK.md` - Scope format constraint documentation (synced from live)
- `graphiti/hooks/health-check.sh` - Shell wrapper for health-check.py (synced from live)
- `graphiti/graphiti-helper.py` - Updated with all Phase 4-7 subcommands including verify-memory (synced from live)
- `graphiti/hooks/capture-change.sh` - Rewritten with error propagation (synced from live)
- `graphiti/hooks/session-summary.sh` - Rewritten with session indexing and auto-naming (synced from live)
- `graphiti/hooks/preserve-knowledge.sh` - Rewritten with error propagation (synced from live)
- `graphiti/hooks/prompt-augment.sh` - Updated with preliminary naming (synced from live)
- `graphiti/hooks/session-start.sh` - Updated (synced from live)
- `graphiti/docker-compose.yml` - GRAPHITI_GROUP_ID removed (synced from live)
- `graphiti/curation/prompts.yaml` - Session naming prompts (synced from live)
- `install.sh` - Added copy lines for diagnose.py, health-check.py, SCOPE_FALLBACK.md; updated chmod
- `.gitignore` - Added graphiti/.last-sync exclusion

## Decisions Made
- rsync-based sync with dual --dry-run conflict detection: before executing any sync, the script runs rsync --dry-run in both directions; if both produce non-empty file lists, it prints a CONFLICT warning and exits non-zero unless --force is passed
- Exclude list covers secrets (.env), runtime files (sessions.json, hook-errors.log), generated artifacts (.venv, __pycache__), and Graphiti's own docs (PLAN.md)
- .last-sync timestamp file excluded from git to avoid merge noise

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All v1.1 milestone work is complete
- Memory system is verified working end-to-end (Plan 07-01)
- All fixes are synced to the publishable repo (Plan 07-02)
- Future changes to ~/.claude/graphiti/ can be synced with ./sync-graphiti.sh

## Self-Check: PASSED

All 9 files verified present. Commit 3a3be47 verified in git history.

---
*Phase: 07-verification-and-sync*
*Completed: 2026-03-17*
