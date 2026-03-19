---
phase: 16-tech-debt-cleanup
plan: 01
subsystem: docs, config, deployment
tags: [cli-reference, settings-hooks, dynamo-install, path-resolution, tech-debt]

# Dependency graph
requires:
  - phase: 15-update-system
    provides: check-update, update, rollback commands implemented in switchboard
provides:
  - Updated CLI reference docs reflecting Phase 15 commands
  - Clean settings-hooks.json without stale MCP permissions
  - Dual-layout path resolution in CLI router (repo + deployed)
  - Live deployment at ~/.claude/dynamo/ with all Phase 15 commands working
affects: [documentation, deployment, settings]

# Tech tracking
tech-stack:
  added: []
  patterns: [resolveSibling dual-layout path resolution in dynamo.cjs]

key-files:
  created: []
  modified:
    - README.md
    - claude-config/CLAUDE.md.template
    - claude-config/settings-hooks.json
    - dynamo/dynamo.cjs

key-decisions:
  - "Dual-layout resolveSibling() helper checks repo path first, falls back to deployed path -- consistent with install.cjs resolveCore() pattern"
  - "Removed entire permissions block from settings-hooks.json rather than individual entries -- Graphiti MCP is deregistered, no permissions needed"
  - "Cleaned stale mcp__graphiti__ entries from live settings.json post-deploy since mergeSettings is additive and doesn't remove old entries"

patterns-established:
  - "resolveSibling(): all dynamo.cjs require() calls for sibling dirs (switchboard/, ledger/) use dual-path resolution"

requirements-completed: [STAB-01, STAB-03, STAB-04, STAB-05, STAB-10]

# Metrics
duration: 5min
completed: 2026-03-18
---

# Phase 16 Plan 01: Tech Debt Cleanup Summary

**Closed all 6 v1.2.1 audit gaps: Phase 15 commands in docs, stale MCP permissions removed, dual-layout router fix, clean deployment to live**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-19T02:08:15Z
- **Completed:** 2026-03-19T02:13:16Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- README.md and CLAUDE.md.template CLI reference tables now include check-update, update, and updated rollback/install descriptions
- settings-hooks.json cleaned of all 9 stale mcp__graphiti__ permission entries (7 allow + 2 ask)
- CLI router (dynamo.cjs) fixed with resolveSibling() for dual-layout path resolution so all commands work from deployed path
- Live deployment at ~/.claude/dynamo/ contains all Phase 15 commands and clean settings

## Task Commits

Each task was committed atomically:

1. **Task 1: Update README.md and CLAUDE.md.template CLI tables** - `12cb04d` (docs)
2. **Task 2: Remove stale mcp__graphiti__ permissions** - `6d01e1b` (fix)
3. **Task 3: Deploy current code to live via dynamo install** - `7a5cd28` (fix)

## Files Created/Modified
- `README.md` - CLI reference table updated with check-update, update commands and corrected rollback/install descriptions
- `claude-config/CLAUDE.md.template` - CLI table, Updating Dynamo section, and Checking Version section updated for Phase 15 commands
- `claude-config/settings-hooks.json` - Removed entire permissions block (9 stale mcp__graphiti__ entries)
- `dynamo/dynamo.cjs` - Added resolveSibling() dual-layout helper, replaced all 14 hardcoded path.join(__dirname, '..', ...) requires

## Decisions Made
- Used resolveSibling() pattern (check repo layout first, fall back to deployed) consistent with install.cjs resolveCore() pattern
- Removed entire permissions block rather than individual entries since Graphiti MCP is deregistered
- Cleaned live settings.json of accumulated stale permissions post-deploy

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed CLI router path resolution for deployed layout**
- **Found during:** Task 3 (Deploy to live)
- **Issue:** dynamo.cjs used path.join(__dirname, '..', 'switchboard', ...) which resolves to ~/.claude/switchboard/ in deployed layout instead of ~/.claude/dynamo/switchboard/. All switchboard and ledger commands failed from deployed path (FLOW-01).
- **Fix:** Added resolveSibling() helper that checks repo path first, falls back to deployed path. Replaced all 14 hardcoded require() calls.
- **Files modified:** dynamo/dynamo.cjs
- **Verification:** check-update works from both repo and deployed paths
- **Committed in:** 7a5cd28 (Task 3 commit)

**2. [Rule 1 - Bug] Cleaned stale mcp__graphiti__ permissions from live settings.json**
- **Found during:** Task 3 (Deploy to live)
- **Issue:** Previous dynamo install runs had accumulated 9 stale mcp__graphiti__ permission entries in ~/.claude/settings.json. mergeSettings is additive, so removing from template doesn't remove from deployed settings.
- **Fix:** Post-deploy script filtered mcp__graphiti__ entries from settings.json allow and ask arrays
- **Files modified:** ~/.claude/settings.json (live, not repo)
- **Verification:** grep confirms zero mcp__graphiti__ entries in deployed settings.json
- **Committed in:** 7a5cd28 (part of Task 3 commit -- the fix ensured the deploy verification passed)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both auto-fixes were necessary to achieve the plan's acceptance criteria. The path resolution bug was the root cause of FLOW-01. The stale permissions cleanup was necessary because the additive merge pattern doesn't remove old entries. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All v1.2.1 audit gaps (INT-01, INT-02, INT-03, FLOW-01, FLOW-02, FLOW-03) are now closed
- Deployment is clean and current
- Ready for v1.2.1 milestone release or v1.3 planning

---
*Phase: 16-tech-debt-cleanup*
*Completed: 2026-03-18*
