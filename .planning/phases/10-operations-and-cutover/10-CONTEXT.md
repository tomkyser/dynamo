# Phase 10: Operations and Cutover - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the operational tooling (health check, diagnostics, verify-memory, installer, sync, stack commands) under a unified `dynamo` CLI router, deploy via CJS installer, and retire the Python/Bash system. Phase 10 delivers a fully self-contained CJS system with no Python dependencies.

</domain>

<decisions>
## Implementation Decisions

### CLI commands and UX
- Single entry point: `dynamo.cjs` routes all subcommands (matches GSD gsd-tools.cjs pattern)
- Available commands: health-check, diagnose, verify-memory, sync, start, stop, test, session, install, help
- Invoked as `node ~/.claude/dynamo/dynamo.cjs <cmd>` — shell alias or CLAUDE.md reference makes it convenient. No PATH changes or symlinks needed.
- Output style: GSD-style dual — JSON internally via core.cjs output() helper, `--pretty` flag for human-friendly formatted output
- Help system: both `dynamo help` and `dynamo --help` show available commands with one-line descriptions. `dynamo <cmd> --help` shows command-specific usage.
- `dynamo version` reads from VERSION file

### Installer and cutover
- Installer is a CJS subcommand: `dynamo install` routed to `lib/switchboard/install.cjs`
- Deploys: copies dynamo/ tree to ~/.claude/dynamo/, generates config.json from .env values, registers MCP server, updates settings.json hook paths to CJS
- Retirement: installer renames graphiti/ to graphiti-legacy/ and removes Python .venv in one step
- Settings.json backed up to settings.json.bak before any changes (hard requirement from Phase 9)
- Post-install: automatically runs `dynamo health-check` after deployment. Failures print actionable messages but don't roll back.
- Rollback path: `dynamo rollback` restores settings.json.bak and renames graphiti-legacy/ back to graphiti/

### Sync scope
- `dynamo sync` synchronizes dynamo/ (repo) <-> ~/.claude/dynamo/ (live) only. Docker files in graphiti/ handled by installer, not sync.
- Implementation: pure Node.js fs operations (readdirSync, copyFileSync, statSync). No rsync dependency. Aligns with zero-dependency principle.
- Conflict detection preserved: compare both directions, warn if both sides changed, require --force to overwrite
- Same interface as current: `dynamo sync live-to-repo`, `dynamo sync repo-to-live`, `dynamo sync status`
- Supports --dry-run and --force flags

### Diagnostics depth
- Full parity: all 13 diagnostic stages ported from diagnose.py to CJS
- Stage 9 replaced: Python venv check becomes CJS module integrity check (verify all .cjs modules load without error)
- Updated 13 stages: Docker, Neo4j, Graphiti API, MCP session, env vars, .env file, hook registrations, hook files, CJS modules, MCP tool call, search round-trip, episode write, canary write/read
- Shared stages module: `lib/switchboard/stages.cjs` exports all 13 stage functions. health-check.cjs uses 6, diagnose.cjs uses all 13. No code duplication.
- verify-memory is a separate command (not a mode of diagnose) — tests live pipeline (write->read round-trip, scope isolation, curation pipeline). Three test entry points honored (Phase 8 decision).

### Claude's Discretion
- Exact stage timeout values for each diagnostic stage
- Internal error message phrasing and formatting
- How the --pretty formatter is structured
- Exclude list for sync (carry forward current excludes, adjust for CJS)
- Whether `dynamo rollback` is a full subcommand or a flag on install

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Python/Bash port sources
- `graphiti/health-check.py` — 6-stage health check (553 LOC), primary port source for health-check.cjs
- `graphiti/diagnose.py` — 13-stage diagnostics (23K LOC), primary port source for diagnose.cjs
- `graphiti/graphiti-helper.py` — verify-memory command logic, session management (944 LOC)
- `graphiti/start-graphiti.sh` — Docker stack start with health wait loop (port to CJS)
- `graphiti/stop-graphiti.sh` — Docker stack stop (port to CJS)
- `sync-graphiti.sh` — Bidirectional sync with conflict detection (177 LOC, port to CJS)
- `install.sh` — Current installer (92 LOC, replace with CJS)

### CJS foundation (Phase 8+9 substrate)
- `dynamo/lib/core.cjs` — Shared substrate: loadConfig, loadEnv, output(), error(), log, healthGuard, fetchWithTimeout
- `dynamo/lib/ledger/mcp-client.cjs` — MCPClient class + parseSSE for Graphiti JSON-RPC
- `dynamo/lib/ledger/scope.cjs` — Scope constants and validation
- `dynamo/lib/ledger/sessions.cjs` — Session management: list, view, label, backfill, index
- `dynamo/hooks/dynamo-hooks.cjs` — Dispatcher routing all 5 hook events

### GSD CLI pattern (reference implementation)
- `~/.claude/get-shit-done/bin/gsd-tools.cjs` — CLI router pattern, subcommand dispatch, output formatting

### Configuration and settings
- `dynamo/config.json` — Dynamo configuration
- `claude-config/settings-hooks.json` — Current hook definitions template
- `~/.claude/settings.json` — Hook registrations (will be updated by installer)
- `graphiti/.env` — Environment variables (will be read during install for config generation)

### Requirements
- `.planning/REQUIREMENTS.md` §SWB-01 through SWB-08 — All 8 Switchboard requirements for this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `core.cjs` output() helper: JSON internally, @file: for large output — direct use for all CLI command output
- `core.cjs` loadConfig/loadEnv: already handle config.json and .env parsing — reuse in installer and diagnostics
- `core.cjs` fetchWithTimeout: HTTP client with AbortSignal — reuse for health checks and MCP probing
- `mcp-client.cjs` MCPClient: Graphiti communication — reuse in verify-memory and diagnostic stages 10-13
- `scope.cjs` validateGroupId: scope format enforcement — reuse in verify-memory scope isolation test
- `sessions.cjs`: full session management — wire directly into `dynamo session` subcommand

### Established Patterns
- GSD router pattern (gsd-tools.cjs): parse argv[2] as subcommand, switch/case dispatch to handler functions
- CJS hook I/O: JSON on stdin, exit 0/2 — already working in dynamo-hooks.cjs
- child_process.execSync for Docker commands (start/stop/ps) — proven in core.cjs

### Integration Points
- `~/.claude/settings.json` — Installer updates hook paths from Python/Bash to CJS
- `~/.claude/graphiti/docker-compose.yml` — Stack start/stop target (stays in graphiti/, not moved)
- `~/.claude/dynamo/` — Deployment target for installer
- `dynamo/lib/switchboard/` — Empty directory waiting for all Phase 10 modules

</code_context>

<specifics>
## Specific Ideas

- Follow GSD gsd-tools.cjs router pattern exactly for dynamo.cjs — proven, familiar, consistent
- The three-tier diagnostic depth (health-check 6 stages, diagnose 13 stages, verify-memory 6 pipeline checks) gives users the right tool for each situation
- Installer doing retirement in one step keeps the cutover atomic — no lingering dual-system state
- Pure Node.js sync (no rsync) is consistent with zero-dependency philosophy and gives full control over conflict detection logic

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-operations-and-cutover*
*Context gathered: 2026-03-17*
