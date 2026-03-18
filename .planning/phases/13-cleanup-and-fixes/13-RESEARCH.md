# Phase 13: Cleanup and Fixes - Research

**Researched:** 2026-03-18
**Domain:** Legacy artifact removal, Docker port configuration, git archival
**Confidence:** HIGH

## Summary

Phase 13 is a housekeeping phase with two distinct workstreams: (1) archiving and removing the legacy Python/Bash system that was replaced by the CJS rewrite in v1.2, and (2) fixing the Neo4j admin browser connectivity by remapping the Bolt port in docker-compose.yml. Both are well-understood operations with clear success criteria.

The legacy `graphiti/` directory contains 3 Python files, 6 Bash hook scripts, 2 Bash orchestration scripts, plus config files -- all superseded by the CJS codebase in `dynamo/`, `ledger/`, and `switchboard/`. The root-level `install.sh` and `sync-graphiti.sh` were replaced by `switchboard/install.cjs` and `switchboard/sync.cjs` in Phase 10. The legacy archive already exists at `~/.claude/graphiti-legacy/` (populated during Phase 10's installer cutover).

The Neo4j browser fix is a one-line change: `"7688:7687"` becomes `"7687:7687"` in `ledger/graphiti/docker-compose.yml`. Port 7687 is verified free on the host. The Neo4j browser at `localhost:7475` defaults to `bolt://localhost:7687` -- the current `7688` external mapping breaks this default.

**Primary recommendation:** Tag the legacy state, `git rm` all legacy files, fix the docker-compose port, restart Docker using the toggle-off/toggle-on pattern, then scan and clean stale references in active documentation.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Create git tag `v1.2-legacy-archive` on current commit before any deletions -- marks the last state with legacy files
- Verify `~/.claude/graphiti-legacy/` already exists with the legacy files (populated in a previous step)
- After tagging, `git rm` all legacy files from the repo
- Tag is permanent and browsable on GitHub -- sufficient for historical reference
- Remove the entire `graphiti/` directory (3 Python files, 6 Bash hooks, 2 Bash scripts, configs)
- Remove root-level `install.sh` (replaced by `switchboard/install.cjs` in Phase 10)
- Remove root-level `sync-graphiti.sh` (replaced by `switchboard/sync.cjs` in Phase 10)
- **DO NOT touch** `ledger/graphiti/*.sh` -- these are NEW Phase 12 scripts (Docker start/stop)
- Scan codebase for stale references to old paths (`graphiti/hooks/`, `install.sh`, `sync-graphiti.sh`, Python/Bash file names) and clean them up in docs, comments, and configs
- Root cause: Neo4j browser defaults to `bolt://localhost:7687` but Bolt port is mapped to 7688 externally (`7688:7687` in docker-compose)
- Fix: Remap Bolt to standard port `7687:7687` in docker-compose -- browser works out of the box
- Keep HTTP port as-is: `7475:7474` -- already works, avoids conflicts
- After fix: Neo4j browser at `localhost:7475` auto-connects to `bolt://localhost:7687`
- Use Dynamo toggle for safe restart: `dynamo toggle off` -> restart Docker -> verify -> `dynamo toggle on`
- Hooks exit silently during downtime -- no errors in other Claude threads
- Auto-deploy updated docker-compose via `dynamo sync` after the repo change
- This matches the toggle-off -> change -> toggle-on pattern established in Phase 12

### Claude's Discretion
- Order of operations within the cleanup (tag first vs files first)
- Exact grep patterns for stale reference scanning
- How to verify `~/.claude/graphiti-legacy/` contents (listing vs checksumming)
- Docker restart sequencing details

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STAB-02 | Archive legacy Python/Bash system -- tag, branch, and remove from dev/master | Git tagging pattern, `git rm` for directory removal, stale reference scan findings, legacy archive verification |
| STAB-07 | Fix Neo4j admin browser connectivity -- port 7475 not accessible | Docker port mapping change (`7688:7687` -> `7687:7687`), toggle-based safe restart, sync deployment to live |

</phase_requirements>

## Standard Stack

This phase does not introduce new libraries or dependencies. It uses existing project tooling.

### Core Tools
| Tool | Purpose | Why Standard |
|------|---------|--------------|
| `git tag` | Create `v1.2-legacy-archive` tag | Built-in git, permanent reference |
| `git rm -r` | Remove legacy directory and files | Properly tracks deletion in git history |
| `docker compose` | Restart Neo4j stack after port change | Already used via `switchboard/stack.cjs` |
| `dynamo toggle` | Safe restart pattern (off/on) | Established Phase 12 pattern, prevents hook errors during downtime |
| `dynamo sync` | Deploy updated docker-compose to live | Established sync mechanism from `ledger/` to `~/.claude/dynamo/ledger/` |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `dynamo status` | Verify toggle state before/after | Confirm toggle off before restart, on after |
| `dynamo health-check` | Verify stack health post-restart | Confirm Neo4j and MCP server are healthy |
| `curl http://localhost:7475` | Verify Neo4j browser accessibility | Final acceptance test for STAB-07 |

## Architecture Patterns

### Legacy File Inventory (Files to Remove)

```
graphiti/                          # ENTIRE directory -- git rm -r
  ├── .env.example
  ├── .last-sync
  ├── config.yaml
  ├── curation/
  │   └── prompts.yaml (?)
  ├── diagnose.py                  # 23KB Python -- replaced by switchboard/diagnose.cjs
  ├── docker-compose.yml           # Duplicate -- authoritative copy is ledger/graphiti/
  ├── graphiti-helper.py           # 35KB Python -- replaced by ledger/*.cjs modules
  ├── health-check.py              # 20KB Python -- replaced by switchboard/health-check.cjs
  ├── hooks/
  │   ├── capture-change.sh        # Replaced by ledger/hooks/capture-change.cjs
  │   ├── health-check.sh          # Replaced by switchboard/health-check.cjs
  │   ├── preserve-knowledge.sh    # Replaced by ledger/hooks/preserve-knowledge.cjs
  │   ├── prompt-augment.sh        # Replaced by ledger/hooks/prompt-augment.cjs
  │   ├── session-start.sh         # Replaced by ledger/hooks/session-start.cjs
  │   └── session-summary.sh       # Replaced by ledger/hooks/session-summary.cjs
  ├── README.md
  ├── requirements.txt
  ├── SCOPE_FALLBACK.md
  ├── start-graphiti.sh            # Replaced by ledger/graphiti/start-graphiti.sh + switchboard/stack.cjs
  └── stop-graphiti.sh             # Replaced by ledger/graphiti/stop-graphiti.sh + switchboard/stack.cjs

install.sh                         # Root-level -- replaced by switchboard/install.cjs
sync-graphiti.sh                   # Root-level -- replaced by switchboard/sync.cjs
```

### Files to KEEP (DO NOT TOUCH)
```
ledger/graphiti/                   # Phase 12 Docker infra -- KEEP
  ├── .env.example
  ├── config.yaml
  ├── docker-compose.yml           # MODIFY (port change only)
  ├── start-graphiti.sh            # KEEP (Phase 12 script)
  └── stop-graphiti.sh             # KEEP (Phase 12 script)
```

### Pattern: Toggle-Based Safe Restart

```
1. dynamo toggle off          # Hooks exit silently, CLI commands disabled
2. [Make changes]             # Edit docker-compose.yml
3. dynamo sync                # Push to ~/.claude/dynamo/ledger/graphiti/
4. docker compose down        # Stop old stack (uses ~/.claude/graphiti/ path)
5. docker compose up -d       # Start with new port mapping
6. [Wait for healthy]         # Health check loop
7. dynamo toggle on           # Re-enable hooks and CLI
8. dynamo health-check        # Verify everything works
```

### Pattern: Git Tag Before Destructive Change

```bash
# Tag current state (before any deletions)
git tag v1.2-legacy-archive

# Then remove files
git rm -r graphiti/
git rm install.sh
git rm sync-graphiti.sh

# Commit the removal
git commit -m "..."
```

### Docker Port Change

Single line in `ledger/graphiti/docker-compose.yml`:

```yaml
# Before:
      - "7688:7687"

# After:
      - "7687:7687"
```

**Why this works:** The Neo4j browser (served at HTTP port 7474, mapped to 7475 on host) defaults to connecting via Bolt to `bolt://localhost:7687`. When Bolt is mapped to 7688 externally, the browser cannot find the Bolt endpoint. Remapping to standard 7687 resolves this.

**What does NOT change:**
- `NEO4J_URI=bolt://neo4j:7687` in docker-compose (internal Docker network, always port 7687)
- `config.yaml` Neo4j URI (also internal)
- HTTP port `7475:7474` (already works)
- MCP port `8100:8000` (unrelated)
- Docker volumes (data preserved -- `down` without `-v` keeps volumes)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Docker restart | Manual docker compose commands | `dynamo start`/`dynamo stop` via `switchboard/stack.cjs` | Has health wait, proper compose file path, error handling |
| File sync to deployed location | Manual cp commands | `dynamo sync` | Handles 3-directory sync pairs, excludes, conflict detection |
| Toggle management | Manual config.json edits | `dynamo toggle on/off` | Atomic, tested, other hooks respect it |
| Legacy archive verification | Manual file comparison | `ls ~/.claude/graphiti-legacy/` listing | Files were already copied by Phase 10 installer |

## Common Pitfalls

### Pitfall 1: Deleting ledger/graphiti/ Instead of graphiti/
**What goes wrong:** The `ledger/graphiti/` directory contains the NEW Phase 12 Docker infra scripts. Deleting it destroys the active Docker configuration.
**Why it happens:** Both directories have similar names and contain docker-compose.yml, start/stop scripts.
**How to avoid:** Use explicit full paths: `git rm -r graphiti/` (no leading `ledger/`). Verify with `git status` before commit. CONTEXT.md explicitly warns: "DO NOT touch `ledger/graphiti/*.sh`".
**Warning signs:** If `git status` shows deletions in `ledger/graphiti/`, something is wrong.

### Pitfall 2: Docker Compose Path Discrepancy
**What goes wrong:** The switchboard code (`stack.cjs`, `stages.cjs`) references `~/.claude/graphiti/docker-compose.yml` for Docker operations, but `dynamo sync` deploys to `~/.claude/dynamo/ledger/graphiti/docker-compose.yml`. These are different paths.
**Why it happens:** Phase 12 restructured the repo but left Docker infra at the original deployed location (`~/.claude/graphiti/`). The `stack.cjs` GRAPHITI_DIR constant still points there.
**How to avoid:** The docker-compose at `~/.claude/graphiti/docker-compose.yml` is the one Docker is actually running from. After `dynamo sync`, the updated file lands at `~/.claude/dynamo/ledger/graphiti/`, but `dynamo start/stop` uses the `~/.claude/graphiti/` path. **The fix must update BOTH locations**, or update via the path that stack.cjs actually uses.
**Warning signs:** After sync + restart, if Neo4j browser still doesn't work at 7475, check which docker-compose file is actually being used.

**CRITICAL FINDING:** The `switchboard/stack.cjs` file (line 20) defines:
```javascript
const GRAPHITI_DIR = path.join(os.homedir(), '.claude', 'graphiti');
```
This means `dynamo start/stop` operates on `~/.claude/graphiti/docker-compose.yml`, NOT the synced `~/.claude/dynamo/ledger/graphiti/docker-compose.yml`. The docker-compose change in the repo will sync to `~/.claude/dynamo/ledger/graphiti/` via `dynamo sync`, but `dynamo start/stop` will still read the OLD docker-compose at `~/.claude/graphiti/`. **The docker-compose at `~/.claude/graphiti/` must ALSO be updated** (either manually, or by fixing the GRAPHITI_DIR path in stack.cjs, or by copying the file).

### Pitfall 3: Forgetting to Stop Before Port Remap
**What goes wrong:** Changing the port mapping while containers are running has no effect -- Docker port mappings are set at container creation time.
**Why it happens:** Assuming config changes apply dynamically.
**How to avoid:** Always `docker compose down` before `up -d`. The toggle-off pattern handles this correctly.
**Warning signs:** After restart, `docker ps` still shows `7688:7687` mapping.

### Pitfall 4: Data Volume Loss
**What goes wrong:** Running `docker compose down -v` instead of `docker compose down` destroys the Neo4j data volumes, losing the entire knowledge graph.
**Why it happens:** Adding `-v` flag by accident.
**How to avoid:** Always use `docker compose down` (no `-v`). The `switchboard/stack.cjs stop()` function correctly uses `down` without `-v`.
**Warning signs:** After restart, knowledge graph is empty.

### Pitfall 5: Stale References in Planning Docs
**What goes wrong:** 72 markdown files in `.planning/` reference legacy paths. Updating all of them is massive scope creep.
**Why it happens:** The `.planning/` directory contains historical records from v1.0 and v1.1 phases.
**How to avoid:** Distinguish between **active documentation** (README.md, `.planning/codebase/` files that describe current state) and **historical records** (milestone phases, context files, plans, summaries). Only update active documentation. Historical records should preserve what was true at the time.
**Warning signs:** Phase 13 scope expanding into documentation overhaul territory (that's Phase 14's STAB-01/STAB-03).

### Pitfall 6: Tag on Wrong Branch
**What goes wrong:** Creating the tag on master instead of dev, or on a detached HEAD.
**Why it happens:** Branch confusion.
**How to avoid:** Verify current branch (`git branch --show-current`) before tagging. Tag should be on `dev` since that's the development branch.

## Code Examples

### Git Tagging and Removal
```bash
# Source: git documentation, standard workflow

# 1. Verify on dev branch
git branch --show-current  # should output: dev

# 2. Create archive tag
git tag v1.2-legacy-archive

# 3. Remove legacy files
git rm -r graphiti/
git rm install.sh
git rm sync-graphiti.sh

# 4. Verify only intended files are staged for deletion
git status
# Should show:
#   deleted: graphiti/* (all files)
#   deleted: install.sh
#   deleted: sync-graphiti.sh
# Should NOT show:
#   deleted: ledger/graphiti/* (these must remain)

# 5. Commit
git commit -m "..."
```

### Docker-Compose Port Change
```yaml
# Source: ledger/graphiti/docker-compose.yml line 7
# Before:
      - "7688:7687"
# After:
      - "7687:7687"
```

### Toggle-Based Restart Sequence
```bash
# Source: Phase 12 established pattern, CONTEXT.md

# 1. Disable (hooks exit silently in all threads)
node ~/.claude/dynamo/dynamo.cjs toggle off

# 2. Stop Docker stack
node ~/.claude/dynamo/dynamo.cjs stop
# OR: docker compose -f ~/.claude/graphiti/docker-compose.yml down

# 3. Update the deployed docker-compose.yml
# Option A: via sync (lands at ~/.claude/dynamo/ledger/graphiti/)
node ~/.claude/dynamo/dynamo.cjs sync
# Option B: also copy to ~/.claude/graphiti/ where stack.cjs looks
cp ~/.claude/dynamo/ledger/graphiti/docker-compose.yml ~/.claude/graphiti/docker-compose.yml
# OR: direct copy from repo
# cp ledger/graphiti/docker-compose.yml ~/.claude/graphiti/docker-compose.yml

# 4. Start Docker stack with new port mapping
node ~/.claude/dynamo/dynamo.cjs start

# 5. Re-enable
node ~/.claude/dynamo/dynamo.cjs toggle on

# 6. Verify
node ~/.claude/dynamo/dynamo.cjs health-check
curl -sf http://localhost:7475 && echo "Neo4j browser accessible"
```

### Stale Reference Scan Patterns
```bash
# Source: CONTEXT.md discretion area

# Patterns to search for in docs/comments/configs (excluding graphiti/ itself and .planning/milestones/):
grep -rn "graphiti/hooks/" --include="*.md" --include="*.cjs" --exclude-dir="graphiti" --exclude-dir=".planning/milestones"
grep -rn "install\.sh" --include="*.md" --include="*.cjs" --exclude-dir="graphiti" --exclude-dir=".planning/milestones"
grep -rn "sync-graphiti" --include="*.md" --include="*.cjs" --exclude-dir="graphiti" --exclude-dir=".planning/milestones"
grep -rn "graphiti-helper\.py" --include="*.md" --include="*.cjs" --exclude-dir="graphiti" --exclude-dir=".planning/milestones"
grep -rn "diagnose\.py" --include="*.md" --include="*.cjs" --exclude-dir="graphiti" --exclude-dir=".planning/milestones"
grep -rn "health-check\.py" --include="*.md" --include="*.cjs" --exclude-dir="graphiti" --exclude-dir=".planning/milestones"
grep -rn "\.venv/bin/python" --include="*.md" --include="*.cjs" --exclude-dir="graphiti" --exclude-dir=".planning/milestones"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Python/Bash hooks (`graphiti/hooks/*.sh`) | CJS hooks (`ledger/hooks/*.cjs`) via `dynamo-hooks.cjs` | Phase 9 (v1.2) | All hook functionality ported to CJS |
| `graphiti-helper.py` CLI bridge | `ledger/*.cjs` modules + `dynamo` CLI | Phase 8-10 (v1.2) | Single unified CLI, no Python dependency |
| `install.sh` Bash installer | `switchboard/install.cjs` | Phase 10 (v1.2) | CJS installer with Python retirement |
| `sync-graphiti.sh` Bash sync | `switchboard/sync.cjs` | Phase 10 (v1.2) | 3-directory sync with conflict detection |
| Direct MCP server access | CLI-wrapped MCP via `dynamo` commands | Phase 12 (v1.2.1) | Full toggle control over all memory access |
| Neo4j Bolt at host port 7688 | Standard port 7687 (this phase) | Phase 13 | Browser auto-connects, no manual config |

## Stale Reference Analysis

### Active Documentation (SHOULD update in this phase)
| File | References | Action |
|------|------------|--------|
| `README.md` | Entire file describes legacy Python/Bash system | **Note only** -- full README rewrite is STAB-01 (Phase 14). Phase 13 should NOT rewrite the README. At most, add a deprecation notice pointing to `dynamo` CLI. |
| `.planning/codebase/STRUCTURE.md` | Lines 13-30 describe `graphiti/` directory layout | **Note only** -- codebase docs describe pre-v1.2 state. Phase 14 (STAB-03) owns documentation overhaul. |
| `.planning/codebase/*.md` | Multiple files reference legacy Python/Bash | **Note only** -- same as above, Phase 14 scope. |
| `.planning/RETROSPECTIVE.md` | Line 63 mentions `sync-graphiti.sh` | Historical record -- do NOT modify. |
| `.planning/REQUIREMENTS.md` | Line 42 mentions `sync-graphiti.sh` | Historical context in requirement description -- do NOT modify. |

### Code Files (SHOULD update in this phase)
| File | References | Action |
|------|------------|--------|
| `dynamo/core.cjs` | Lines 82, 112 -- comments mentioning "ported from Python graphiti-helper.py" | **Discretionary** -- these are provenance comments, not functional references. Could update to past tense or remove. |

### Historical Records (DO NOT modify)
All files under `.planning/milestones/`, `.planning/phases/` (prior phases), `.planning/research/` -- these are historical records of what was true at the time. Modifying them rewrites history.

## Critical Finding: Docker Compose Deployment Path

**Confidence: HIGH** (verified by reading source code)

There is a path discrepancy between where `dynamo sync` deploys the docker-compose file and where `dynamo start/stop` reads it:

| Operation | Path Used |
|-----------|-----------|
| `dynamo sync` deploys to | `~/.claude/dynamo/ledger/graphiti/docker-compose.yml` |
| `dynamo start/stop` reads from | `~/.claude/graphiti/docker-compose.yml` |

The `switchboard/stack.cjs` line 20 defines `GRAPHITI_DIR = path.join(os.homedir(), '.claude', 'graphiti')`. The sync pairs in `switchboard/sync.cjs` line 34 map `ledger/` to `~/.claude/dynamo/ledger/`.

**This means `dynamo sync` alone is NOT sufficient to deploy the port change.** The docker-compose at `~/.claude/graphiti/` must also be updated. Options:
1. Manually copy the file after sync: `cp ~/.claude/dynamo/ledger/graphiti/docker-compose.yml ~/.claude/graphiti/docker-compose.yml`
2. Copy directly from repo: `cp ledger/graphiti/docker-compose.yml ~/.claude/graphiti/docker-compose.yml`
3. Fix `GRAPHITI_DIR` in `stack.cjs` and `stages.cjs` to point to `~/.claude/dynamo/ledger/graphiti/` (scope creep -- but would be correct long-term)

**Recommendation:** Use option 2 (direct copy from repo) as the simplest approach. Do NOT change stack.cjs paths in this phase -- that's a broader refactor concern.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` (v24.13.1) |
| Config file | None needed -- uses `--test` flag |
| Quick run command | `node --test dynamo/tests/*.test.cjs` |
| Full suite command | `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STAB-02 | Legacy files removed from repo | smoke | `test ! -d graphiti/ && test ! -f install.sh && test ! -f sync-graphiti.sh && echo PASS` | N/A -- filesystem check |
| STAB-02 | Git tag exists | smoke | `git tag -l v1.2-legacy-archive \| grep -q v1.2-legacy-archive && echo PASS` | N/A -- git check |
| STAB-02 | Legacy archive accessible | smoke | `ls ~/.claude/graphiti-legacy/graphiti-helper.py && echo PASS` | N/A -- filesystem check |
| STAB-02 | ledger/graphiti/ untouched | smoke | `test -f ledger/graphiti/docker-compose.yml && test -f ledger/graphiti/start-graphiti.sh && echo PASS` | N/A -- filesystem check |
| STAB-07 | Bolt port remapped to 7687 | smoke | `grep '"7687:7687"' ledger/graphiti/docker-compose.yml && echo PASS` | N/A -- grep check |
| STAB-07 | Neo4j browser accessible | integration | `curl -sf http://localhost:7475 > /dev/null && echo PASS` | N/A -- live service check |
| STAB-07 | Stack health after restart | integration | `node ~/.claude/dynamo/dynamo.cjs health-check --format json` | Reuses existing health-check |
| ALL | Existing tests still pass | regression | `node --test dynamo/tests/*.test.cjs` | Yes -- 94 tests |

### Sampling Rate
- **Per task commit:** `node --test dynamo/tests/*.test.cjs` (quick regression)
- **Per wave merge:** Full suite + manual Neo4j browser verification
- **Phase gate:** Full suite green + Neo4j browser accessible at localhost:7475

### Wave 0 Gaps
None -- existing test infrastructure covers all phase requirements. Phase 13 does not add new CJS code, so no new test files are needed. Verification is primarily smoke tests (file existence/absence) and live service checks.

## Open Questions

1. **Should README.md get a minimal update in Phase 13?**
   - What we know: The README entirely describes the legacy system being removed. After Phase 13, it will reference files that no longer exist.
   - What's unclear: Whether to add a brief deprecation note or leave the full rewrite to Phase 14 (STAB-01).
   - Recommendation: Add a single-line notice at the top of README.md: "This README is being updated. The system has been rewritten to CJS. See `dynamo --help` for current usage." Leave full rewrite to Phase 14.

2. **Should `.planning/codebase/` files be updated?**
   - What we know: These files (STRUCTURE.md, ARCHITECTURE.md, etc.) describe the pre-v1.2 codebase and are heavily stale.
   - What's unclear: Whether Phase 13 cleanup scope includes these planning docs.
   - Recommendation: Leave to Phase 14 (STAB-03 exhaustive documentation). These files are not consulted by the running system.

3. **How should the deployed docker-compose at `~/.claude/graphiti/` be updated?**
   - What we know: `dynamo sync` won't update this path. `stack.cjs` reads from this path.
   - What's unclear: Whether to fix `stack.cjs` GRAPHITI_DIR or use a manual copy.
   - Recommendation: Direct copy from repo (`cp ledger/graphiti/docker-compose.yml ~/.claude/graphiti/docker-compose.yml`). Do not modify stack.cjs in this phase.

## Sources

### Primary (HIGH confidence)
- Direct source code audit: `ledger/graphiti/docker-compose.yml`, `switchboard/stack.cjs`, `switchboard/sync.cjs`, `switchboard/stages.cjs`
- Direct filesystem verification: `~/.claude/graphiti-legacy/` (exists with legacy files), `~/.claude/graphiti/` (deployed Docker infra), port 7687 (verified free via `lsof`)
- Docker container inspection: `docker ps` confirms current `7688:7687` mapping
- Phase 12 CONTEXT.md: Deployment layout decisions, toggle pattern

### Secondary (MEDIUM confidence)
- [Neo4j Browser Connection Docs](https://neo4j.com/docs/browser/operations/dbms-connection/) -- confirms default Bolt URL is `bolt://localhost:7687`
- [Neo4j Ports Documentation](https://neo4j.com/docs/operations-manual/current/configuration/ports/) -- port 7687 is standard Bolt port

### Tertiary (LOW confidence)
- None -- all findings verified against source code or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new tools, all existing project tooling
- Architecture: HIGH -- verified by reading source code, filesystem, Docker state
- Pitfalls: HIGH -- all pitfalls derived from verified code analysis (especially the GRAPHITI_DIR path discrepancy)
- Neo4j fix: HIGH -- verified root cause (port mapping), verified port 7687 is free, confirmed by Neo4j docs

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable -- no fast-moving dependencies)
