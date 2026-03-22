# Dynamo

## What This Is

A self-contained development platform for Claude Code. Dynamo provides the core services, providers, framework, and SDK needed to build modules (like Reverie) and plugins that extend Claude Code's capabilities. It is similar to a game engine — things built with Dynamo are contained within Dynamo as an ecosystem. Dynamo requires at least one Module to provide users with functionality beyond self-management. Plugins extend core capability; modules consume the platform to deliver user-facing features; extensions compose on top of both.

Runtime: **Bun** | Language: **CJS** | Data: **JSON** (structured), **Markdown** (narrative)

## Core Value

Everything routes through Dynamo. It is the holistic wrapper via its APIs and interfaces — no component bypasses the patterns and paths Dynamo defines. All things integrate at the correct layer, through the correct paths, and in the correct way.

## Requirements

### Validated

(None yet — ship to validate)

### Active

#### Core Library (`lib/`)
- [ ] Shared resources, dependencies, and common utilities
- [ ] Pure library — no feature logic, just patterns and standardization

#### Core Services (`core/services/`)
- [ ] **Commutator** — Shared system I/O bus
- [ ] **Magnet** — Shared system state management
- [ ] **Conductor** — Infrastructure ops (Docker/Compose, dependency management)
- [ ] **Forge** — Git ops, channel switching, repo-to-deploy sync
- [ ] **Lathe** — Filesystem ops (thin facade over Bun native APIs)
- [ ] **Relay** — Install/update/sync operations
- [ ] **Switchboard** — Event and I/O dispatcher
- [ ] **Wire** — MCP server toolkit for inter-session communication via Claude Code Channels
- [ ] **Assay** — Unified data search/indexing across all providers (Tika, consolidated query entry point, provider metadata in results)

#### Core Providers (`core/providers/`)
- [ ] **Ledger** — SQL database (DuckDB)
- [ ] **Journal** — Flat file markdown system

#### Framework (`core/armature/`)
- [ ] Definitions and contracts (abstract classes, interfaces — CJS equivalent)
- [ ] Hook definitions
- [ ] Claude Code integration layer
- [ ] Services and Providers API (import by domain or by name)
- [ ] Plugin API (extend/overwrite core domains, introduce new ones)
- [ ] External API definitions and contracts (CLI, MCP)

#### SDK (`core/sdk/`)
- [ ] **Circuit** — Module API (exports Framework, Core Services & Providers safely)
- [ ] **Pulley** — External APIs (CLI, MCP endpoints — user-facing surface)

#### Platform Infrastructure
- [ ] Git submodule management for plugins, modules, and extensions
- [ ] Global `config.json` with toggles for additions (modules, plugins)
- [ ] Versioning: semver + GitHub Releases API (master: `v{M}.{m}.{p}`, dev: `dev-{M}.{m}.{p}`)
- [ ] Self-management (install, configure, update, troubleshoot) without manual user intervention

### Out of Scope

- **LLM API integrations below SDK scope** — Dynamo is built on Claude Code within what Max subscription offers natively
- **Web/REST/WebSocket APIs** — defined in contracts but deferred from v1 implementation
- **Extension layer (Apex)** — architectural slot exists but builds after modules ship
- **System composition layer** — future consideration for composing multiple modules; architecture shall facilitate but not implement yet
- **Plugin implementations** (Conduit, Terminus, Library, Vault) — plugin API ships in v1, actual plugins are separate repos

## Context

Dynamo is a ground-up rebuild. Prior experimental work (v0, archived at `archive/v0-pre-rewrite`) produced a working 6-subsystem monolith through 6 milestones (~7,081 LOC, 525 tests). That system validated core concepts — hook-based memory, cognitive pipelines, dual-path routing, adversarial framing — but grew organically without proper platform architecture. This rebuild applies the lessons learned to a properly layered system.

**Canonical architecture documents:**
- `.claude/new-plan.md` — The architecture plan. Absolute canon.
- `.claude/reverie-spec-v2.md` — The Reverie module specification. Canon.

**Reference material (not in repo):**
- Discussion transcripts: `~/Library/Mobile Documents/com~apple~CloudDocs/dev/dynamo planning/`
- Channels PoC: `~/Library/Mobile Documents/com~apple~CloudDocs/dev/cc-channels-poc/`
- Old implementation: `archive/v0-pre-rewrite` branch (reference only — no code carries forward)

**Key patterns validated in v0:**
- TDD with `node:test` (zero-framework overhead)
- Options-based dependency injection for test isolation
- Atomic file writes (tmp + rename)
- Adversarial counter-prompting in injection templates
- Deterministic path selection (no LLM for routing decisions)
- Stub-then-replace for multi-phase subsystem builds

## Constraints

- **Runtime**: Bun — all code runs on Bun, CJS format
- **Subscription**: Claude Max tier required — no paid API dependencies below SDK
- **No npm dependencies**: Platform core uses only Bun/Node built-ins (validated in v0)
- **Git submodules**: Plugins, modules, and extensions are separate repos managed as submodules
- **Engineering principles**: Strict separation of concerns, IoC, DRY, abstraction over lateralization, hardcode nothing (see `.claude/new-plan.md` for full list)
- **Build order**: Core Library first → Services + Providers (parallel) → Framework → SDK → then Modules

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Ground-up rebuild vs. incremental refactor | v0 architecture was organically grown; proper layering requires clean foundation | -- Pending |
| Bun over Node.js | Performance, built-in APIs, native TypeScript support (CJS compat) | -- Pending |
| DuckDB for Ledger provider | Embedded analytics DB, no server dependency, SQL interface | -- Pending |
| Git submodules for additions | Decouples plugin/module repos from core while enabling managed updates | -- Pending |
| Two milestones (Platform then Reverie) | SDK must exist before modules can consume it | -- Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-22 after initialization*
