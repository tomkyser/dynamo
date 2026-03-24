# Dynamo

## What This Is

A self-contained development platform for Claude Code. Dynamo provides the core services, providers, framework, and SDK needed to build modules (like Reverie) and plugins that extend Claude Code's capabilities. It is similar to a game engine — things built with Dynamo are contained within Dynamo as an ecosystem. Dynamo requires at least one Module to provide users with functionality beyond self-management. Plugins extend core capability; modules consume the platform to deliver user-facing features; extensions compose on top of both.

Runtime: **Bun** | Language: **CJS** | Data: **JSON** (structured), **Markdown** (narrative)

## Core Value

Everything routes through Dynamo. It is the holistic wrapper via its APIs and interfaces — no component bypasses the patterns and paths Dynamo defines. All things integrate at the correct layer, through the correct paths, and in the correct way.

## Requirements

### Validated

#### Core Library (`lib/`) — Validated in Phase 1: Core Library
- [x] Shared resources, dependencies, and common utilities
- [x] Pure library — no feature logic, just patterns and standardization

#### Core Services — Validated in Phases 2, 3, 3.1, 3.2
- [x] **Switchboard** — Event and I/O dispatcher
- [x] **Commutator** — Shared system I/O bus
- [x] **Magnet** — Shared system state management
- [x] **Lathe** — Filesystem ops (thin facade over Bun native APIs)
- [x] **Forge** — Git ops, channel switching, repo-to-deploy sync
- [x] **Conductor** — Infrastructure ops (Docker/Compose, dependency management)
- [x] **Relay** — Install/update/sync operations
- [x] **Wire** — MCP server toolkit for inter-session communication via Claude Code Channels
- [x] **Assay** — Federated search across all data providers (provider metadata in results, capability-based routing)

#### Core Providers — Validated in Phase 3
- [x] **Ledger** — SQL database (DuckDB with bun:sqlite fallback)
- [x] **Journal** — Flat file markdown system

### Active

## Current Milestone: v1.0 M2 Reverie Module

**Goal:** Build the first module on the Dynamo platform — Reverie delivers persistent, evolving AI memory through a three-session architecture with fragment-based recall, Self Model personality, and REM consolidation.

**Target features:**
- Self Model with three aspects (Face/Mind/Subconscious), Identity Core, Relational Model, Conditioning
- Fragment Memory Engine (5 types, multi-angle formation, real-time recall, association index, decay)
- Three-Session Architecture (Primary/Secondary/Tertiary via Wire with urgency-level messaging)
- REM Consolidation (tiered: compaction triage, idle provisional, full session-end, editorial pass)
- Primary Context Management (Self Model injection, referential framing, 4-phase budget, compaction framing)
- Operational Modes (Active/Passive/REM/Dormant)
- Module Integration (8 Claude Code hooks, CLI surface via Pulley, submodule management)

### Validated (continued)

#### Framework (`core/armature/`) — Validated in Phase 4: Framework
- [x] IoC container with singleton/factory lifetimes, tagged bindings, domain aliases, topological sort
- [x] Facade generator with before/after/around hook points, method override, domain metadata
- [x] Hook definitions for all 8 Claude Code hook types with declarative wiring registry
- [x] Services and Providers API (import by domain alias or by name via container)
- [x] Plugin API (manifest validation, dependency checking, enable/disable, discovery)
- [x] Two-phase lifecycle orchestrator (register/boot with topological ordering, reverse shutdown)
- [x] Bootstrap entry point (`core/core.cjs`) registering all 9 services + 2 providers

#### SDK (`core/sdk/`) — Validated in Phase 5: SDK & Platform Infrastructure
- [x] **Circuit** — Module API with facade-only access, dependency verification, event proxy namespacing, lib re-exports
- [x] **Pulley** — CLI framework with command routing, help generation, output formatting (human/JSON/raw), MCP server with 6 platform tools

#### Platform Infrastructure — Validated in Phase 5: SDK & Platform Infrastructure
- [x] Git submodule management for plugins, modules, and extensions (via Relay + Forge)
- [x] Health aggregation with dependency chain analysis and diagnostic formatting
- [x] Versioning: semver + GitHub Releases API (master: `v{M}.{m}.{p}`, dev: `dev-{M}.{m}.{p}`)
- [x] Self-management (install, configure, update, troubleshoot) via platform CLI commands

#### Bootstrap Integration — Validated in Phase 6: Bootstrap Integration Fixes
- [x] All service/provider deps[] match mapDeps (deterministic boot order via Kahn's algorithm)
- [x] Magnet persistence wired via json-provider (lathe + statePath injected through lifecycle)
- [x] forge.pull() implemented as optional contract method (unblocks `dynamo update`)
- [x] Assay receives initialized Ledger and Journal facades after full bootstrap

### Out of Scope

- **LLM API integrations below SDK scope** — Dynamo is built on Claude Code within what Max subscription offers natively
- **Web/REST/WebSocket APIs** — defined in contracts but deferred from v1 implementation
- **Extension layer (Apex)** — architectural slot exists but builds after modules ship
- **System composition layer** — future consideration for composing multiple modules; architecture shall facilitate but not implement yet
- **Plugin implementations** (Conduit, Terminus, Library, Vault) — plugin API ships in v1, actual plugins are separate repos

## Context

Dynamo is a ground-up rebuild. Prior experimental work (v0, archived at `archive/v0-pre-rewrite`) produced a working 6-subsystem monolith through 6 milestones (~7,081 LOC, 525 tests). That system validated core concepts — hook-based memory, cognitive pipelines, dual-path routing, adversarial framing — but grew organically without proper platform architecture. This rebuild applies the lessons learned to a properly layered system.

**Current state (after Milestone 1):**
- 9 services, 2 providers, 1 framework, 1 SDK — all wired through IoC container
- 9,932 LOC source, 11,394 LOC tests (52 source files, 45 test files)
- 851 tests passing, 0 failures
- Platform is consumable: Circuit exports services safely, Pulley exposes CLI + MCP surface
- Next: Milestone 2 (Reverie) builds the first module on top of this platform

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
| Ground-up rebuild vs. incremental refactor | v0 architecture was organically grown; proper layering requires clean foundation | ✓ Good — clean layering delivered in 8 phases |
| Bun over Node.js | Performance, built-in APIs, native TypeScript support (CJS compat) | ✓ Good — bun:test, bun:sqlite, Bun.spawn all validated |
| DuckDB for Ledger provider | Embedded analytics DB, no server dependency, SQL interface | ✓ Good — bun:sqlite fallback proven, DuckDB backend ready |
| Git submodules for additions | Decouples plugin/module repos from core while enabling managed updates | ✓ Good — Relay manages submodule lifecycle |
| Two milestones (Platform then Reverie) | SDK must exist before modules can consume it | ✓ Good — M1 delivers consumable SDK, M2 can build on it |
| Wire moved to Phase 3.1 | Channels API maturity concerns overruled by frontier value | ✓ Good — validated with multi-session integration test |
| deps[] must match mapDeps | Boot order bugs from implicit registration ordering | ✓ Good — Kahn's algorithm now deterministic for all services |
| Options-based DI over decorator DI | CJS does not support decorators; v0 validated options pattern | ✓ Good — clean, testable, zero framework overhead |

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
*Last updated: 2026-03-24 — Phase 7 (Foundation Infrastructure) complete — module skeleton, JSON frontmatter, write coordinator, schemas, Self Model, FragmentWriter (958 tests)*
