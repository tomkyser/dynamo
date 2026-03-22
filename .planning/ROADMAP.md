# Roadmap: Dynamo Platform v1.0 -- Milestone 1 (Platform SDK)

## Overview

Milestone 1 delivers the Dynamo platform SDK: the layered foundation that modules like Reverie consume. The build follows a strict bottom-up dependency order -- core library first, then foundational services, then data providers and infrastructure services in parallel, then the framework composition layer, then the SDK and platform infrastructure, and finally the two highest-risk services (Wire and Assay) that depend on nearly everything else. Each phase delivers a coherent, independently testable capability. Cross-milestone dependencies with M2 (Reverie) are accounted for in design but not implemented.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Core Library** - Shared utilities, patterns, path resolution, and configuration loader that everything else imports
- [ ] **Phase 2: Foundational Services** - Event bus, I/O bridge, state management, and filesystem facade that all subsequent services depend on
- [ ] **Phase 3: Data Providers & Infrastructure Services** - Data layer (DuckDB + markdown), git ops, infrastructure management, and install/update orchestration
- [ ] **Phase 4: Framework** - Service container, provider contracts, lifecycle hooks, plugin API contracts, and Claude Code integration layer
- [ ] **Phase 5: SDK & Platform Infrastructure** - Module API, CLI framework, MCP endpoints, health checks, versioning, and self-management
- [ ] **Phase 6: Search & Communication** - Federated search across all providers and multi-session communication via Claude Code Channels

## Phase Details

### Phase 1: Core Library
**Goal**: Establish the pure foundation that every layer imports -- shared patterns, identity system, and configuration loading validated on Bun
**Depends on**: Nothing (first phase)
**Requirements**: LIB-01, LIB-02, LIB-03
**Success Criteria** (what must be TRUE):
  1. Any service or provider can import shared error types, result types, and contract patterns from lib/ without circular dependencies
  2. Path resolution produces correct absolute paths for all Dynamo directory layout locations (lib, core, services, providers, modules, plugins, extensions, config)
  3. Configuration loader reads config.json with hierarchical precedence (defaults < global < project < env < runtime) and returns validated, typed config objects
  4. All lib/ code runs on Bun >= 1.3.10 with bun:test passing -- no node:sqlite or node:test assumptions leak in
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md -- Shared utility patterns: Result types (Ok/Err), contract validation factory, schema validator
- [ ] 01-02-PLAN.md -- Path resolution: root discovery via .dynamo marker, central path registry for all layout directories
- [ ] 01-03-PLAN.md -- Configuration loader: 5-level hierarchical deep merge, env var mapping, schema validation, barrel export

### Phase 2: Foundational Services
**Goal**: Deliver the four services that form the substrate for all other services -- events, I/O bridging, state, and filesystem access
**Depends on**: Phase 1
**Requirements**: SVC-01, SVC-02, SVC-03, SVC-04
**Success Criteria** (what must be TRUE):
  1. Switchboard dispatches actions (fire-and-forget) and filters (interceptable data pipeline) with priority-ordered handler execution and namespaced event names
  2. Commutator bridges Claude Code hook payloads into Switchboard events with semantic routing (e.g., PostToolUse with Write tool routed as file-change, not generic hook)
  3. Magnet stores and retrieves scoped state (global, session, module namespaces) with provider-backed persistence surviving process restart
  4. Lathe performs all filesystem operations (read, write, delete, list, exists, atomic write) through a single facade over Bun native APIs
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: Data Providers & Infrastructure Services
**Goal**: Stand up the data layer (SQL and markdown) and the infrastructure services (git, Docker, install/update) that the framework will compose
**Depends on**: Phase 2
**Requirements**: PRV-01, PRV-02, SVC-05, SVC-06, SVC-07
**Success Criteria** (what must be TRUE):
  1. Ledger provider reads and writes structured data via DuckDB through a uniform provider interface (read/write/query/delete) and handles single-writer concurrency constraints
  2. Journal provider reads and writes markdown files with YAML frontmatter through the same uniform provider interface, supporting frontmatter-based queries
  3. Forge executes git operations (status, commit, branch, submodule add/update/remove) and performs repo-to-deploy sync via Lathe and Bun.spawn
  4. Conductor manages infrastructure lifecycle (DuckDB process health, Docker Compose up/down for MCP servers) and reports dependency status
  5. Relay orchestrates install, update, and sync operations with backup-before-modify and rollback-on-failure semantics
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

### Phase 4: Framework
**Goal**: Compose services and providers into a coherent platform through Armature -- the IoC container, lifecycle, contracts, and integration layer that modules and plugins will consume
**Depends on**: Phase 3
**Requirements**: FWK-01, FWK-02, FWK-03, FWK-04, FWK-05, FWK-06
**Success Criteria** (what must be TRUE):
  1. Service container resolves dependencies via IoC (bind/singleton/factory) with automatic dependency resolution, contextual binding, scoped lifetimes, and deferred/lazy loading
  2. Provider facades allow importing providers by domain of responsibility (e.g., "sql", "files") or by name (e.g., "ledger", "journal"), and enforce uniform provider interface contracts
  3. Register/boot two-phase lifecycle completes without errors -- all services register bindings first, then boot in dependency order with access to resolved services
  4. Plugin API contracts define manifest schema, domain extension/introduction points, dependency checking, and enable/disable toggle -- validated by loading a minimal test plugin manifest
  5. Claude Code hook definitions map all 8 hook types into Switchboard events, and the integration layer correctly routes hook payloads through Commutator
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD

### Phase 5: SDK & Platform Infrastructure
**Goal**: Make the platform consumable -- Circuit exports the framework safely for modules, Pulley provides CLI and MCP surface, and infrastructure services handle health, versioning, and self-management
**Depends on**: Phase 4
**Requirements**: SDK-01, SDK-02, SDK-03, INF-01, INF-02, INF-03, INF-04
**Success Criteria** (what must be TRUE):
  1. Circuit module API exports framework capabilities (services, providers, Switchboard, Magnet) with dependency verification -- a module can import Circuit and access all platform services without bypassing Armature contracts
  2. Pulley CLI routes commands with subcommands (e.g., `dynamo status`, `dynamo health`), generates help text, and outputs in three formats (human-readable, JSON, raw)
  3. Pulley MCP endpoint surface exposes platform operations as MCP tools that Claude Code sessions can invoke
  4. Health check aggregates per-service healthCheck() results into a single diagnostic report, and the diagnostics system identifies which service or dependency is degraded
  5. Self-install and self-update via Relay complete end-to-end (backup, deploy, migrate, verify, rollback on failure) and versioning integrates with GitHub Releases API for semver tracking
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

### Phase 6: Search & Communication
**Goal**: Deliver the two highest-risk, highest-dependency services that complete the platform -- federated search across all data providers and multi-session communication for Reverie
**Depends on**: Phase 5
**Requirements**: SVC-08, SVC-09
**Success Criteria** (what must be TRUE):
  1. Assay executes federated queries across Ledger (SQL) and Journal (markdown frontmatter) providers, returning merged results with provider metadata identifying the source of each result
  2. Assay supports provider-specific query optimization (SQL queries to Ledger, frontmatter scans to Journal) rather than lowest-common-denominator queries
  3. Wire establishes MCP-based communication channels between concurrent Claude Code sessions with transport abstraction (Channels transport + HTTP relay fallback)
  4. Wire supports urgency-level messaging (background, active, directive, urgent) designed for Reverie's three-session architecture, validated by a multi-session integration test
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD
- [ ] 06-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Library | 0/3 | Planned | - |
| 2. Foundational Services | 0/3 | Not started | - |
| 3. Data Providers & Infrastructure Services | 0/3 | Not started | - |
| 4. Framework | 0/3 | Not started | - |
| 5. SDK & Platform Infrastructure | 0/3 | Not started | - |
| 6. Search & Communication | 0/3 | Not started | - |
