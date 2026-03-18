---
phase: 12-structural-refactor
plan: 04
subsystem: infra
tags: [cjs, cli, mcp-deregistration, claude-md, dynamo, graphiti]

# Dependency graph
requires:
  - phase: 12-03
    provides: "8 CLI memory commands with toggle gate enforcement"
provides:
  - "Graphiti MCP server deregistered from ~/.claude.json"
  - "CLAUDE.md template updated with Dynamo CLI command reference"
  - "Live ~/.claude/CLAUDE.md updated with Dynamo CLI instructions"
  - "Complete Phase 12 structural refactor verified by user"
affects: [13, 14, all-future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamo CLI commands replace MCP tool calls in CLAUDE.md instructions"

key-files:
  created: []
  modified:
    - "claude-config/CLAUDE.md.template"
    - "~/.claude/CLAUDE.md"
    - "~/.claude.json"

key-decisions:
  - "Used claude mcp remove CLI to deregister Graphiti (preferred over manual JSON editing)"
  - "Preserved all non-memory sections in CLAUDE.md (session start, safeguard markers, document end)"

patterns-established:
  - "Memory instructions reference dynamo CLI commands not MCP tools"
  - "CLAUDE.md template is source of truth for memory system instructions"

requirements-completed: [STAB-10]

# Metrics
duration: 18min
completed: 2026-03-18
---

# Phase 12 Plan 04: MCP Deregistration and CLAUDE.md Update Summary

**Graphiti MCP deregistered, CLAUDE.md template and live file rewritten to use Dynamo CLI commands for all memory operations -- completing the full blackout toggle scope**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-18T18:58:20Z
- **Completed:** 2026-03-18T19:16:45Z
- **Tasks:** 2
- **Files modified:** 3 (1 in-repo, 2 external)

## Accomplishments
- Deregistered Graphiti as a direct MCP server from ~/.claude.json using `claude mcp remove`
- Replaced all `mcp__graphiti__*` tool references with Dynamo CLI command equivalents in both the template and live CLAUDE.md
- Added complete CLI command table (search, remember, recall, edge, forget, clear, toggle, status, health-check)
- Added --format and --scope option documentation
- User verified all 7 Phase 12 success criteria: directory structure, toggle status, help output, MCP deregistration, CLAUDE.md CLI refs, test suite (72 pass), toggle blackout

## Task Commits

Each task was committed atomically:

1. **Task 1: Deregister Graphiti MCP and update CLAUDE.md template** - `5940cd3` (feat)
2. **Task 2: Verify complete Phase 12 structural refactor** - checkpoint:human-verify (user approved)

## Files Created/Modified
- `claude-config/CLAUDE.md.template` - Replaced Graphiti MCP section with Dynamo CLI section (57 insertions, 43 deletions)
- `~/.claude/CLAUDE.md` - Live file updated with same Dynamo CLI instructions
- `~/.claude.json` - Removed mcpServers.graphiti entry via `claude mcp remove`

## Decisions Made
- Used `claude mcp remove --scope user graphiti` CLI command for deregistration (cleaner than manual JSON editing)
- Preserved all non-memory sections in CLAUDE.md (session start instructions, safeguard markers, document end markers)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

**Post-execution note:** User should restart Claude Code sessions to pick up the deregistered MCP server. The `~/.claude.json` change takes effect on next session start.

## Next Phase Readiness
- Phase 12 structural refactor is complete: directory structure, boundaries, toggles, CLI commands, MCP deregistration
- All 3 STAB requirements covered by Phase 12 are done (STAB-08, STAB-09, STAB-10)
- Ready for Phase 13 (Cleanup and Fixes: legacy archive, Neo4j browser)

## Self-Check: PASSED

All 3 modified files verified present. Task commit 5940cd3 verified in git log. Zero mcp__graphiti references in CLAUDE.md confirmed. Dynamo CLI references confirmed present.

---
*Phase: 12-structural-refactor*
*Completed: 2026-03-18*
