---
phase: 12-structural-refactor
plan: 02
subsystem: infra
tags: [cjs, toggle, cli, installer, sync, 3-dir-layout]

# Dependency graph
requires:
  - phase: 12-01
    provides: "3 root-level component directories (dynamo/, ledger/, switchboard/)"
provides:
  - "Global on/off toggle mechanism with dev mode override (isEnabled)"
  - "toggle on/off and status CLI commands"
  - "Hook dispatcher toggle gate (silent exit when disabled)"
  - "Installer and sync updated for 3-directory layout with REPO_ROOT"
  - "Generated config includes enabled:true field"
affects: [12-03, 12-04, all-future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isEnabled() with configPath override for testability"
    - "DYNAMO_CONFIG_PATH env var for CLI command testing"
    - "SYNC_PAIRS array for multi-directory sync iteration"

key-files:
  created:
    - "dynamo/tests/toggle.test.cjs"
  modified:
    - "dynamo/core.cjs"
    - "dynamo/config.json"
    - "dynamo/dynamo.cjs"
    - "dynamo/hooks/dynamo-hooks.cjs"
    - "switchboard/install.cjs"
    - "switchboard/sync.cjs"
    - "dynamo/tests/switchboard/install.test.cjs"
    - "dynamo/tests/switchboard/sync.test.cjs"

key-decisions:
  - "isEnabled() accepts configPath param for test isolation, reads deployed config by default"
  - "Toggle CLI uses DYNAMO_CONFIG_PATH env var for testability instead of hardcoded path"
  - "Sync module uses SYNC_PAIRS array with per-pair excludes for clean 3-dir iteration"
  - "Renamed REPO_DIR to REPO_ROOT in both install.cjs and sync.cjs for clarity"

patterns-established:
  - "isEnabled(configPath) pattern: optional override for testing, defaults to deployed config"
  - "SYNC_PAIRS iteration: sync/status/dry-run all aggregate results across 3 directory pairs"
  - "REPO_ROOT naming convention: all switchboard modules use REPO_ROOT for repo root reference"

requirements-completed: [STAB-08, STAB-10]

# Metrics
duration: 5min
completed: 2026-03-18
---

# Phase 12 Plan 02: Toggle Mechanism and 3-Directory Layout Summary

**Global on/off toggle with DYNAMO_DEV override, toggle/status CLI commands, hook dispatcher gate, and installer/sync updated for 3-directory deployment layout**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-18T18:44:47Z
- **Completed:** 2026-03-18T18:49:49Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Implemented isEnabled() in core.cjs with config.enabled check and DYNAMO_DEV=1 override
- Added toggle on/off and status CLI commands to dynamo.cjs
- Inserted toggle gate in hook dispatcher (silent exit 0 when disabled)
- Renamed REPO_DIR to REPO_ROOT and added enabled:true to generated config
- Rewrote sync.cjs run() to iterate over 3 SYNC_PAIRS (dynamo, ledger, switchboard)
- All 294 tests pass (8 toggle + 23 install + 24 sync + 239 existing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement toggle mechanism and CLI commands** - `313c274` (test: RED), `70bcff4` (feat: GREEN)
2. **Task 2: Update installer and sync for 3-directory layout** - `fd52fb1` (feat)

## Files Created/Modified
- `dynamo/core.cjs` - Added isEnabled() function and export
- `dynamo/config.json` - Added "enabled": true field
- `dynamo/dynamo.cjs` - Added toggle, status commands and os require
- `dynamo/hooks/dynamo-hooks.cjs` - Added toggle gate before JSON parse
- `switchboard/install.cjs` - Renamed REPO_DIR to REPO_ROOT, added enabled:true to generateConfig
- `switchboard/sync.cjs` - Renamed REPO_DIR to REPO_ROOT, added SYNC_PAIRS, rewrote run() for 3-pair sync
- `dynamo/tests/toggle.test.cjs` - New: 8 toggle tests (isEnabled, CLI toggle, status, hook gate)
- `dynamo/tests/switchboard/install.test.cjs` - Added 3 tests for REPO_ROOT, 3-dir, enabled field
- `dynamo/tests/switchboard/sync.test.cjs` - Added 4 tests for SYNC_PAIRS, REPO_ROOT, 3-dir layout

## Decisions Made
- isEnabled() accepts optional configPath parameter for test isolation (avoids mocking deployed config)
- Toggle CLI command uses DYNAMO_CONFIG_PATH env var override for testability
- Sync module uses SYNC_PAIRS array with per-pair excludes to cleanly handle 3-dir iteration
- Renamed REPO_DIR to REPO_ROOT in both switchboard modules for clarity after Plan 01 restructure

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Toggle mechanism complete: `dynamo toggle off` disables hooks, `DYNAMO_DEV=1` overrides for dev
- Installer deploys 3-directory layout: dynamo/ + ledger/ + switchboard/ -> ~/.claude/dynamo/
- Sync handles all 3 directory pairs bidirectionally
- Ready for Phase 12 Plan 03 (documentation) and Plan 04 (final integration)

## Self-Check: PASSED

All 10 files verified present. All 3 task commits verified (313c274, 70bcff4, fd52fb1).

---
*Phase: 12-structural-refactor*
*Completed: 2026-03-18*
