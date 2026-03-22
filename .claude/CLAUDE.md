# Dynamo — Project Instructions

## What This Is

Dynamo is a self-contained development platform for Claude Code. It provides the core services, providers, framework, and SDK needed to build modules (like Reverie) and plugins that extend Claude Code's capabilities.

Runtime: **Bun**
Language: **CJS** (CommonJS)
Data: **JSON** for structured data, **Markdown** for narrative data

## Canonical Architecture Documents

- `.claude/new-plan.md` — The architecture plan. This is absolute canon.
- `.claude/reverie-spec-v2.md` — The Reverie module specification. Canon.

All implementation decisions must align with these documents. If there is ambiguity, ask — do not assume.

## Versioning System — MANDATORY

**Format:**
- Master (release): `v{major}.{minor}.{patch}` — Tag: `{major}.{minor}.{patch}`
- Development (testing): `dev—{major}.{minor}.{patch}` — Tag: `D.{major}.{minor}.{patch}`
- Feature/Task: `{feature/task}-{milestone}-{phase}-{patch}`

**Rules — non-negotiable:**
1. **The user decides all version increments.** Claude does NOT pick when to bump major, minor, or patch. Ever. If a version bump is needed, ask.
2. **Always push to origin after commits.** Every commit must be followed by `git push`. No exceptions.
3. **Branching strategy:**
   - `master` — release branch. Only receives merges from `dev` when a version is ready for release.
   - `dev` — integration branch. Feature/task branches merge here for the target release version.
   - Feature/task branches — Claude's development work. Named to reflect the work being done. These fold into `dev`.
4. **Never force push to master or dev** without explicit user instruction.

## Architecture Layers (Build Order)

```
Core Library → Core Services + Core Providers (parallel) → Framework (Armature) → SDK (Circuit + Pulley) → Modules (Reverie)
```

### File Structure
```
dynamo/
  lib/                    # Core Library — patterns, types, utilities
  core/
    armature/             # Framework — contracts, interfaces, hooks, plugin API
    services/             # Core Services
    providers/            # Core Providers
    sdk/
      circuit/            # Module API
      pulley/             # CLI, MCP endpoints (user-facing)
    core.cjs              # Core bootstrap
  plugins/                # Plugin directory (git submodules)
  modules/
    reverie/              # Reverie module (git submodule)
  extensions/             # Extension directory (git submodules)
  config.json             # Global config
```

### Core Services
| Service | Domain | Description |
|---------|--------|-------------|
| Commutator | I/O | Shared system I/O bus |
| Magnet | State | Shared system state management |
| Conductor | Infrastructure | MCP server lifecycle, dependency management (Docker stubbed) |
| Forge | Git | Git ops, channel switching, repo→.claude/ sync |
| Lathe | Filesystem | Thin filesystem facade over Bun native APIs |
| Relay | Operations | Install/update/sync |
| Switchboard | Events | Event and I/O dispatcher |
| Wire | Communication | MCP server toolkit for inter-session communication via Claude Code Channels |
| Assay | Search | Unified data search/indexing across all providers |

### Core Providers
| Provider | Domain | Description |
|----------|--------|-------------|
| Ledger | SQL | DuckDB database |
| Journal | Flat File | Markdown file system |

## Engineering Principles

From the architecture plan — these are not suggestions:
- Strict separation of concerns
- Inversion of Control
- Services can do. Providers can supply and receive.
- Collections are contracts between structured data and logic
- Facades define contracts between logic and consumers
- Interfaces define contracts between objects and consumers
- DRY
- Abstraction over lateralization
- Hardcode nothing
- Plan to prevent what caused a problem for the next decade, not to solve the immediate problem
- No SDK scope or lower aspect shall require an LLM API endpoint or integration. Dynamo is built on top of Claude Code within what is natively offered by a Max tier subscription alone.

## Reference Material

External documents for context (not in this repo):
- Discussion transcripts: `~/Library/Mobile Documents/com~apple~CloudDocs/dev/dynamo planning/`
  - Epiphany doc (REVERIE-EPIPHANY-RECORD.md) — literature-as-compass insight
  - Conversation continuity doc — full dialogue reconstruction
  - Inner Voice Synthesis v2 — frame-first pipeline, three-tier memory
- Channels PoC: `~/Library/Mobile Documents/com~apple~CloudDocs/dev/cc-channels-poc/`
  - Wire relay server (Bun) — validated
  - Wire channel MCP server — validated
