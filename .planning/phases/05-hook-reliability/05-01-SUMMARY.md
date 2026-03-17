---
phase: 05-hook-reliability
plan: 01
subsystem: infra
tags: [graphiti, docker, mcp, memory, group_id, scope]

requires:
  - phase: 04-diagnostics
    provides: DIAG-02 root cause — GRAPHITI_GROUP_ID env var in docker-compose.yml overrides all per-request group_id to global

provides:
  - GRAPHITI_GROUP_ID removed from docker-compose.yml and .env
  - MCPClient in graphiti-helper.py uses 5s internal timeout instead of 30s
  - SCOPE_FALLBACK.md documents colon-separator constraint and fallback decision
  - Container rebuilt without group_id override

affects: [05-hook-reliability-02, session-management]

tech-stack:
  added: []
  patterns:
    - "Graphiti group_id must use alphanumeric, dashes, and underscores only — no colons"
    - "Use global scope + content prefix [project-name] for project-scoped memory isolation"
    - "MCPClient timeout at 5s keeps hooks fail-fast instead of hanging until hook-level kill"

key-files:
  created:
    - ~/.claude/graphiti/SCOPE_FALLBACK.md
  modified:
    - ~/.claude/graphiti/docker-compose.yml
    - ~/.claude/graphiti/.env
    - ~/.claude/graphiti/graphiti-helper.py

key-decisions:
  - "Removed GRAPHITI_GROUP_ID from docker-compose.yml AND .env — both sources must be cleared since env_file directive loads .env into container"
  - "Fallback triggered: group_id format project:my-cc-setup rejected by server v1.21.0 (colon not allowed) — using global scope + content prefixing for Plan 02"
  - "Future option: project-my-cc-setup (dash separator) would satisfy server constraints — deferred to future phase"
  - "MCPClient default timeout changed from 30s to 5s — hooks must fail fast to avoid blocking Claude Code sessions"

patterns-established:
  - "Always check both docker-compose.yml environment: section AND .env file for env var overrides"
  - "Graphiti group_id validation: only alphanumeric, dashes, underscores"

requirements-completed: [HOOK-01]

duration: 6min
completed: 2026-03-17
---

# Phase 5 Plan 01: Hook Reliability - Root Cause Fix Summary

**GRAPHITI_GROUP_ID override removed from both docker-compose.yml and .env; MCPClient hardened to 5s timeout; colon-separator constraint discovered and fallback documented**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-17T03:11:49Z
- **Completed:** 2026-03-17T03:17:29Z
- **Tasks:** 2
- **Files modified:** 4 (docker-compose.yml, .env, graphiti-helper.py, + SCOPE_FALLBACK.md created)

## Accomplishments

- Removed `GRAPHITI_GROUP_ID=global` from both `docker-compose.yml` (environment section) and `.env` (env_file source) — container rebuilt and verified clean
- Changed `MCPClient.__init__` signature to `(base_url, timeout=5.0)` and pass timeout to `httpx.Client` — hooks now fail fast in 5s instead of hanging for 30s
- Discovered Graphiti v1.21.0 server-side constraint: `group_id` must contain only alphanumeric characters, dashes, or underscores — colons are rejected
- Documented fallback decision in `SCOPE_FALLBACK.md`: use global scope + `[project-name]` content prefix instead of `project:my-cc-setup` scope
- Verified `health-check.py --json` reports `"healthy": true` after rebuild

## Task Commits

These tasks modified files in `~/.claude/graphiti/` which is outside the project git repository. Changes are tracked via planning artifacts only.

1. **Task 1: Remove GRAPHITI_GROUP_ID and add 5s timeout** - documented in this SUMMARY (infra changes in ~/.claude/graphiti/)
2. **Task 2: Verify scope isolation with diagnose.py and health-check.py** - documented in this SUMMARY (fallback scenario triggered)

**Plan metadata:** (see final docs commit)

## Files Created/Modified

- `~/.claude/graphiti/docker-compose.yml` - Removed line 37: `GRAPHITI_GROUP_ID=${GRAPHITI_GROUP_ID:-global}`
- `~/.claude/graphiti/.env` - Removed `GRAPHITI_GROUP_ID=global` line (was also being loaded via env_file)
- `~/.claude/graphiti/graphiti-helper.py` - MCPClient.__init__ now accepts `timeout: float = 5.0` param, passes to httpx.Client
- `~/.claude/graphiti/SCOPE_FALLBACK.md` - Created: documents colon constraint, fallback decision, Plan 02 implications

## Decisions Made

1. **Remove from both locations**: The `env_file: .env` directive in docker-compose.yml loads the `.env` file into container env. Removing `GRAPHITI_GROUP_ID` from only the `environment:` section was insufficient — had to also remove from `.env`. Verified via `docker inspect graphiti-mcp`.

2. **Fallback triggered by server constraint**: Graphiti v1.21.0 validates `group_id` against pattern `[a-zA-Z0-9_-]+`. The `project:my-cc-setup` format contains a colon, which causes:
   ```
   group_id "project:my-cc-setup" must contain only alphanumeric characters, dashes, or underscores
   ```
   Per CONTEXT.md decision: "do not spend time investigating newer image versions" — fallback to global scope + content prefix.

3. **MCPClient timeout**: Changed signature from `def __init__(self, base_url: str)` to `def __init__(self, base_url: str, timeout: float = 5.0)`. Default callers (`cmd_add_episode`, `cmd_search`) use the 5s default. health-check.py has its own inline httpx.Client and is unaffected.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] GRAPHITI_GROUP_ID also present in .env file**
- **Found during:** Task 1 acceptance check
- **Issue:** Removing from `docker-compose.yml` environment section was insufficient — `env_file: .env` directive loads `.env` directly into container, and `.env` also had `GRAPHITI_GROUP_ID=global`. Docker inspect confirmed the var was still present after first rebuild.
- **Fix:** Removed `GRAPHITI_GROUP_ID=global` line from `.env` as well, then rebuilt container.
- **Files modified:** `~/.claude/graphiti/.env`
- **Verification:** `docker inspect graphiti-mcp` shows no `GRAPHITI_GROUP_ID` in env
- **Committed in:** (infra change, tracked in planning artifacts)

---

**Total deviations:** 1 auto-fixed (1 blocking — env_file source not in original plan scope)
**Impact on plan:** Essential fix — without clearing .env, the container would still receive the override via env_file. No scope creep.

## Issues Encountered

**Stage 8 fallback scenario (expected per CONTEXT.md):** After removing the GRAPHITI_GROUP_ID override, project-scoped episodes fail server-side validation because `project:my-cc-setup` contains a colon which the Graphiti v1.21.0 server rejects. This is the documented fallback scenario — global scope + content prefixing is the accepted resolution for Plan 02.

Container log evidence:
```
services.queue_service - ERROR - group_id "project:my-cc-setup" must contain only alphanumeric characters, dashes, or underscores
```

This means diagnose.py stage 8 remains FAIL (9/10), but per the plan's acceptance criteria this is acceptable when `SCOPE_FALLBACK.md` is present documenting the fallback decision.

## Next Phase Readiness

- Plan 02 (hook error visibility) should use `--scope global` in all write hooks and prefix episode text with `[my-cc-setup]`
- The 5s MCPClient timeout is in place — hooks will fail fast if server is slow
- Container is clean: no GRAPHITI_GROUP_ID override, both containers healthy
- `SCOPE_FALLBACK.md` provides the rationale for Plan 02's scope approach

---
*Phase: 05-hook-reliability*
*Completed: 2026-03-17*
