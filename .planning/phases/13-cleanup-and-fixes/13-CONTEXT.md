# Phase 13: Cleanup and Fixes - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove all legacy Python/Bash artifacts from the repo (the old pre-CJS system) and fix the Neo4j admin browser so the knowledge graph is accessible for visual inspection. All CJS replacements shipped in earlier phases — this is pure cleanup and a Docker config fix.

</domain>

<decisions>
## Implementation Decisions

### Legacy archival method
- Create git tag `v1.2-legacy-archive` on current commit before any deletions — marks the last state with legacy files
- Verify `~/.claude/graphiti-legacy/` already exists with the legacy files (populated in a previous step)
- After tagging, `git rm` all legacy files from the repo
- Tag is permanent and browsable on GitHub — sufficient for historical reference

### Cleanup scope
- Remove the entire `graphiti/` directory (3 Python files, 6 Bash hooks, 2 Bash scripts, configs)
- Remove root-level `install.sh` (replaced by `switchboard/install.cjs` in Phase 10)
- Remove root-level `sync-graphiti.sh` (replaced by `switchboard/sync.cjs` in Phase 10)
- **DO NOT touch** `ledger/graphiti/*.sh` — these are NEW Phase 12 scripts (Docker start/stop)
- Scan codebase for stale references to old paths (`graphiti/hooks/`, `install.sh`, `sync-graphiti.sh`, Python/Bash file names) and clean them up in docs, comments, and configs

### Neo4j browser fix
- Root cause: Neo4j browser defaults to `bolt://localhost:7687` but Bolt port is mapped to 7688 externally (`7688:7687` in docker-compose)
- Fix: Remap Bolt to standard port `7687:7687` in docker-compose — browser works out of the box
- Keep HTTP port as-is: `7475:7474` — already works, avoids conflicts
- After fix: Neo4j browser at `localhost:7475` auto-connects to `bolt://localhost:7687`

### Disruption handling
- Use Dynamo toggle for safe restart: `dynamo toggle off` → restart Docker → verify → `dynamo toggle on`
- Hooks exit silently during downtime — no errors in other Claude threads
- Auto-deploy updated docker-compose via `dynamo sync` after the repo change
- This matches the toggle-off → change → toggle-on pattern established in Phase 12

### Claude's Discretion
- Order of operations within the cleanup (tag first vs files first)
- Exact grep patterns for stale reference scanning
- How to verify `~/.claude/graphiti-legacy/` contents (listing vs checksumming)
- Docker restart sequencing details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 12 context (directory structure decisions)
- `.planning/phases/12-structural-refactor/12-CONTEXT.md` — New 3-directory layout, toggle mechanism, CLI-wrapped MCP, import boundaries

### Requirements
- `.planning/REQUIREMENTS.md` §STAB-02 — Archive legacy Python/Bash system
- `.planning/REQUIREMENTS.md` §STAB-07 — Fix Neo4j admin browser connectivity

### Docker infrastructure
- `ledger/graphiti/docker-compose.yml` — Current Neo4j and Graphiti MCP service definitions, port mappings to modify

### Deployed infrastructure
- `~/.claude/dynamo/ledger/graphiti/docker-compose.yml` — Deployed copy that must also be updated via sync

### Current codebase (files to remove)
- `graphiti/` — Entire legacy directory (Python, Bash hooks, Bash scripts)
- `install.sh` — Legacy Bash installer (replaced by `switchboard/install.cjs`)
- `sync-graphiti.sh` — Legacy Bash sync (replaced by `switchboard/sync.cjs`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `switchboard/sync.cjs`: Bidirectional sync with SYNC_PAIRS — will push updated docker-compose to deployed location
- `dynamo/core.cjs` `isEnabled()`: Toggle gate for safe restart pattern
- `dynamo/dynamo.cjs` `toggle`/`status` commands: Control toggle during Docker restart

### Established Patterns
- Toggle-off → change → toggle-on pattern: Used during Phase 12 restructure, reuse for Docker restart
- `dynamo sync`: Pushes repo changes to deployed `~/.claude/dynamo/` — handles the docker-compose deployment

### Integration Points
- `ledger/graphiti/docker-compose.yml` → deployed `~/.claude/dynamo/ledger/graphiti/docker-compose.yml` (via sync)
- Any references to legacy paths in `.planning/`, `CLAUDE.md`, or code comments need cleanup

</code_context>

<specifics>
## Specific Ideas

- The toggle system built in Phase 12 gets its second real-world use here (first was during Phase 12's own restructure) — validates the disruption-safe workflow
- Tag `v1.2-legacy-archive` serves as a clean historical bookmark on GitHub for anyone who needs to reference the original Python/Bash implementation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-cleanup-and-fixes*
*Context gathered: 2026-03-18*
