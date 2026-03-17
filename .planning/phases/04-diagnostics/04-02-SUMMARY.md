---
phase: 04-diagnostics
plan: 02
subsystem: infra
tags: [graphiti, neo4j, mcp, docker, memory, health-check, python]

requires:
  - phase: 04-01
    provides: 10-stage diagnostic probe, DIAG-01/DIAG-02 root cause findings, evidence that canary writes succeed but land in global scope

provides:
  - Reusable 6-stage pipeline health check at ~/.claude/graphiti/health-check.py
  - Shell wrapper at ~/.claude/graphiti/hooks/health-check.sh for CLI and Claude Code invocation
  - Canary write/read round-trip proving end-to-end data flow (or exposing scope override)
  - JSON output mode for programmatic consumption by future tools

affects:
  - 05-hook-reliability (health-check.py will confirm scope isolation once docker-compose.yml GRAPHITI_GROUP_ID is removed)
  - 07-verification (VRFY-02 will reuse health-check.sh as its verification mechanism)

tech-stack:
  added: []
  patterns:
    - "6-stage health check: Docker -> Neo4j -> Graphiti API -> MCP Session -> Environment -> Canary round-trip"
    - "WARN vs FAIL distinction: write-succeeds-but-read-empty is WARN (known DIAG-02 behavior), connection refused is FAIL"
    - "Skip cascade: if Docker fails, neo4j/API/MCP/canary all skip; if MCP fails, canary skips; env vars run independently"

key-files:
  created:
    - ~/.claude/graphiti/health-check.py
    - ~/.claude/graphiti/hooks/health-check.sh
  modified: []

key-decisions:
  - "Canary uses group_id='global' (not project scope) because DIAG-02 confirmed project scope writes land in global anyway — using global makes the canary actually verifiable until Phase 5 fix is applied"
  - "WARN status for canary read-empty: write succeeded + read empty = known DIAG-02 scope override behavior, not a hard failure — healthy field stays true in JSON, human report shows DEGRADED"
  - "Environment vars check runs independently of MCP chain — env can be verified even if Graphiti containers are down"

patterns-established:
  - "Health check pattern: each check returns (status, detail, raw) tuple; SKIP cascade prevents false failures from downstream stages"

requirements-completed: [DIAG-03]

duration: 4min
completed: 2026-03-17
---

# Phase 4 Plan 02: Health Check Summary

**6-stage Graphiti pipeline health check with canary write/read round-trip, available as CLI command and shell wrapper, using httpx inline (no import side effects) and WARN-not-FAIL for known DIAG-02 scope behavior**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-17T02:31:15Z
- **Completed:** 2026-03-17T02:35:00Z
- **Tasks:** 1 of 2 complete (Task 2 is checkpoint:human-verify)
- **Files modified:** 2 (outside project git repo)

## Accomplishments

- Built `~/.claude/graphiti/health-check.py` — streamlined 6-stage pipeline check reusing probe patterns from `diagnose.py` (Plan 01), adapted for ongoing use rather than one-shot diagnostics
- Built `~/.claude/graphiti/hooks/health-check.sh` — thin shell wrapper that delegates to health-check.py, enabling `~/.claude/graphiti/hooks/health-check.sh [--json] [--verbose]` from Claude Code or terminal
- Canary round-trip implemented: generates unique `diag-canary-{8chars}` ID, writes to global scope, waits 2 seconds, reads back; produces WARN (not FAIL) when read returns empty, which is the correct behavior given DIAG-02 finding
- JSON output mode (`--json`) produces structured output with `healthy`, `summary`, and per-stage `status`/`detail` fields for programmatic use in Phase 7

## Task Commits

1. **Task 1: Create health check script and shell wrapper** — files in `~/.claude/graphiti/` (outside project git repo, not committable to project history)

**Plan metadata:** [committed with this SUMMARY]

## Files Created/Modified

- `~/.claude/graphiti/health-check.py` — 6-stage pipeline health check with canary round-trip, --json, --verbose flags
- `~/.claude/graphiti/hooks/health-check.sh` — shell wrapper (4 lines, delegates to health-check.py via exec)

## Decisions Made

- Used `group_id="global"` for canary write/read: since DIAG-02 showed all project-scope writes land in global anyway, using global for the canary is the only way to actually test end-to-end data flow until Phase 5 removes `GRAPHITI_GROUP_ID` from docker-compose.yml
- Canary read returning empty produces WARN, not FAIL: this matches the known DIAG-02 behavior (write queues successfully, entity extraction is async and may not surface in `search_memory_facts` immediately); the health check remains usable without triggering false alarms
- After Phase 5 fix: the canary will need to be re-evaluated — once scope isolation works, the canary should be updated to write to a non-global scope and verify it IS stored there (not in global), making the canary a proper regression test for DIAG-02

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `~/.claude/graphiti/` has no git repository — health-check.py and health-check.sh cannot be committed to the project repo. This is expected (same situation as Plan 01's diagnose.py).

## User Setup Required

None — health check is ready to run. Task 2 (checkpoint:human-verify) asks the user to run the health check and confirm output is correct.

## Next Phase Readiness

- Health check is ready for Phase 7 (VRFY-02) to reuse as `~/.claude/graphiti/hooks/health-check.sh`
- After Phase 5 (Hook Reliability) removes `GRAPHITI_GROUP_ID` from docker-compose.yml, re-run health check — canary round-trip should upgrade from WARN to OK
- The WARN on canary read is expected and correctly describes current pipeline state

---
*Phase: 04-diagnostics*
*Completed: 2026-03-17*
