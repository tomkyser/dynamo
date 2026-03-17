# Phase 7: Verification and Sync - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Prove the memory system works end-to-end across sessions and projects, then sync all fixes from Phases 4-6 to this repo's publishable artifacts. Two concerns: verification (VRFY-01, VRFY-02) and sync (SYNC-01, SYNC-02).

</domain>

<decisions>
## Implementation Decisions

### Verification scope (VRFY-01: cross-session proof)
- Both canary AND natural session verification:
  1. **Canary test**: Write a unique canary episode to project scope, read it back. Delete after verification.
  2. **Natural session test**: Verify that session-summary.sh stored real session data by retrieving actual session summaries.
- Cross-session proof requires writing in one session and reading in another — the canary write can persist and be checked on next session start

### On-demand verification tool (VRFY-02)
- **Two tools for different use cases:**
  1. **`diagnose.py`** (extended): Add session management stages to existing 10-stage probe. Deep analysis tool for debugging. Stages to add: list-sessions, view-session, backfill-sessions.
  2. **`verify-memory`** (new graphiti-helper.py subcommand): Quick pass/fail for the full pipeline. Tests project scope, global scope, AND session scope write/read round-trips. Also verifies list-sessions and view-session work. ~30 seconds to run.
- verify-memory cleans up canary data after testing by default. Add `--keep` flag to inspect test data.
- User runs `graphiti-helper.py verify-memory` for quick checks, `diagnose.py` for deep investigation.

### Sync strategy (SYNC-01, SYNC-02)
- **Sync script**: `sync-graphiti.sh` in repo root that syncs between `~/.claude/graphiti/` and `graphiti/` in the repo
- **Bidirectional**: Changes can flow either direction (live to repo OR repo to live)
- **Conflict handling**: Script detects when both sides changed since last sync, shows diff, prompts user to choose which version to keep
- **No auto-commit**: Script copies files and shows what changed. User reviews and commits manually.
- **Exclude from sync**: `.venv/`, `__pycache__/`, `sessions.json`, `.env` (secrets), `hook-errors.log`
- **Include in sync**: All scripts, hooks, configs, docs, `.env.example`, `diagnose.py`, `health-check.py`, `SCOPE_FALLBACK.md`

### Publishable artifact scope (SYNC-01)
- Everything except runtime files: all scripts, hooks, configs, documentation, diagnostic tools
- Excluded: `.venv/`, `__pycache__/`, `sessions.json`, `.env`, `hook-errors.log`
- Included: `.env.example` (template), all `.sh` scripts, all `.py` scripts, `config.yaml`, `curation/`, `SCOPE_FALLBACK.md`
- Setup guide: `graphiti/README.md` explaining prerequisites, Docker setup, .env configuration, hook registration, and verification steps

### Installer update (SYNC-01)
- `install.sh` must be updated to copy all new files from Phases 4-6: `diagnose.py`, `health-check.py`, `SCOPE_FALLBACK.md`, `hooks/health-check.sh`
- Install script should match whatever files the sync script considers publishable (same exclusion list)
- Any new files added by verify-memory or diagnose.py extensions also need to be in the installer

### Claude's Discretion
- Sync script implementation details (rsync vs cp, timestamp tracking mechanism)
- How conflict detection works (checksum, mtime, git status)
- diagnose.py stage numbering and naming for new session stages
- verify-memory output format (table, list, pass/fail summary)
- README.md structure and level of detail
- Whether sync script lives in repo root or inside graphiti/

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing diagnostic tools (to extend)
- `~/.claude/graphiti/diagnose.py` -- 10-stage diagnostic probe. Add session management stages.
- `~/.claude/graphiti/health-check.py` -- 6-stage quick health check with canary round-trip.

### Infrastructure (to sync to repo)
- `~/.claude/graphiti/graphiti-helper.py` -- Python bridge with 11 subcommands. Add verify-memory subcommand.
- `~/.claude/graphiti/hooks/` -- 6 hook scripts (capture-change.sh, session-summary.sh, preserve-knowledge.sh, session-start.sh, prompt-augment.sh, health-check.sh)
- `~/.claude/graphiti/docker-compose.yml` -- Docker stack (Graphiti + Neo4j)
- `~/.claude/graphiti/config.yaml` -- Graphiti server config
- `~/.claude/graphiti/curation/prompts.yaml` -- Haiku curation/naming prompts
- `~/.claude/graphiti/SCOPE_FALLBACK.md` -- Scope format documentation

### Repo current state (stale, to be overwritten)
- `graphiti/` -- Pre-Phase-4 copies. All files stale. Missing: diagnose.py, health-check.py, SCOPE_FALLBACK.md, hooks/health-check.sh
- `install.sh` -- Installer script that copies repo files to ~/.claude/graphiti/. Needs updating to copy new files (diagnose.py, health-check.py, SCOPE_FALLBACK.md, hooks/health-check.sh) and any other Phase 4-6 additions

### Prior phase context
- `.planning/phases/04-diagnostics/04-CONTEXT.md` -- Diagnostic approach decisions
- `.planning/phases/05-hook-reliability/05-CONTEXT.md` -- Hook reliability decisions, scope format
- `.planning/phases/06-session-management/06-CONTEXT.md` -- Session management decisions, sessions.json

### Phase 5 scope documentation
- `~/.claude/graphiti/SCOPE_FALLBACK.md` -- Dash separator format resolved

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `diagnose.py`: 10-stage probe with canary write/read, project-scope testing. Foundation for VRFY-02 deep analysis.
- `health-check.py`: 6-stage quick check. Pattern for verify-memory command.
- `graphiti-helper.py` MCPClient class: Reuse for verify-memory canary operations.
- `graphiti-helper.py` session subcommands: `list-sessions`, `view-session`, `backfill-sessions` available for verification.

### Established Patterns
- All CLI tools use argparse with subcommands
- Error output to stderr, success output to stdout
- `GRAPHITI_VERBOSE` env var for detailed output
- Canary pattern: write unique episode, sleep for indexing, read back, compare

### Integration Points
- `graphiti-helper.py` is the single CLI entry point -- verify-memory adds to it
- `diagnose.py` is standalone -- extend with new stages
- Repo `graphiti/` mirrors `~/.claude/graphiti/` minus runtime files

### Drift Analysis (live vs repo)
- Live has 4 files repo lacks: `diagnose.py`, `health-check.py`, `PLAN.md`, `SCOPE_FALLBACK.md`
- Live hooks has 1 file repo lacks: `health-check.sh`
- All shared files have diverged (Phase 4-6 modifications)
- Initial sync will be a bulk overwrite of repo from live

</code_context>

<specifics>
## Specific Ideas

- The sync script should track last-sync timestamp to detect which side changed
- verify-memory should give a clear final line: "PASS: Memory system healthy (X/Y checks passed)" or "FAIL: N issues found"
- README should be written for someone who finds this repo on GitHub and wants to set up the same Graphiti memory system

</specifics>

<deferred>
## Deferred Ideas

### Intelligent Scope Routing (from Phase 6 discussion)
1. **Scope decision engine** -- Analyze prompt intent to decide which scopes to search (project, global, cross-project)
2. **Session preload engine** -- At session start, proactively inject the right context based on session type

Both are hook intelligence enhancements -- candidates for a future "Hook Intelligence" phase.

</deferred>

---

*Phase: 07-verification-and-sync*
*Context gathered: 2026-03-17*
