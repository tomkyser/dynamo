# Requirements: Dynamo v1.0.0

**Defined:** 2026-03-22
**Core Value:** Everything routes through Dynamo — the holistic wrapper via its APIs and interfaces. No component bypasses the patterns and paths Dynamo defines.

## v1 Requirements

### Milestone 1: Platform SDK

#### Core Library

- [x] **LIB-01**: Shared utility patterns (error types, result types, contract patterns)
- [x] **LIB-02**: Path resolution and module identity system
- [x] **LIB-03**: Configuration loader with hierarchical precedence

#### Core Services

- [ ] **SVC-01**: Switchboard — Event bus with actions (fire-and-forget) and filters (interceptable data pipeline), priority ordering
- [ ] **SVC-02**: Commutator — System I/O bus bridging Claude Code hooks to Switchboard events with semantic routing
- [ ] **SVC-03**: Magnet — Centralized state management with provider-backed persistence, session-aware scoping
- [ ] **SVC-04**: Lathe — Filesystem facade over Bun native APIs
- [ ] **SVC-05**: Forge — Git ops, submodule management, branch-aware operations, repo-to-deploy sync
- [ ] **SVC-06**: Conductor — Infrastructure ops (Docker/Compose lifecycle, dependency management)
- [ ] **SVC-07**: Relay — Install/update/sync orchestration with rollback capability
- [ ] **SVC-08**: Wire — MCP server toolkit for inter-session communication via Claude Code Channels
- [ ] **SVC-09**: Assay — Unified search/indexing across all data providers with federated query, provider metadata in results

#### Core Providers

- [ ] **PRV-01**: Ledger — DuckDB embedded database provider with uniform provider interface
- [ ] **PRV-02**: Journal — Flat file markdown provider with uniform provider interface

#### Framework (Armature)

- [ ] **FWK-01**: Service container with IoC (bind/singleton/factory, automatic dependency resolution, contextual binding, scoped resolution, deferred/lazy loading)
- [ ] **FWK-02**: Provider contracts and facade system (import by domain of responsibility or by name)
- [ ] **FWK-03**: Register/boot two-phase lifecycle
- [ ] **FWK-04**: Plugin API contracts (manifest, domain extension, domain introduction, dependency checking, enable/disable toggle)
- [ ] **FWK-05**: Hook definitions and Claude Code integration layer
- [ ] **FWK-06**: Configuration validation (JSON Schema at boot)

#### SDK

- [ ] **SDK-01**: Circuit — Module API (safe export of framework + core services/providers for module consumption, dependency verification)
- [ ] **SDK-02**: Pulley — CLI framework (command routing with subcommands, help generation, structured output: human/JSON/raw)
- [ ] **SDK-03**: Pulley — MCP endpoint surface

#### Platform Infrastructure

- [ ] **INF-01**: Health check and diagnostics system (per-service healthCheck() method, aggregated reporting)
- [ ] **INF-02**: Self-install and self-update via Relay (backup, deploy, migrate, verify, rollback)
- [ ] **INF-03**: Versioning with GitHub Releases API (semver: master releases, dev testing, feature branches)
- [ ] **INF-04**: Git submodule management for plugins/modules/extensions via Forge

### Milestone 2: Reverie Module

#### Self Model

- [ ] **SM-01**: Self Model with three aspects (Face/Mind/Subconscious) persisting across sessions via Magnet + Journal + Ledger
- [ ] **SM-02**: Identity Core — stable personality traits, communication style, value orientations, expertise map, boundaries
- [ ] **SM-03**: Relational Model — user communication patterns, domain map, preference history, trust calibration, interaction rhythm
- [ ] **SM-04**: Conditioning — attention biases, association priors, sublimation sensitivity, recall strategies, error history
- [ ] **SM-05**: Cold start initialization from seed prompt with sparse defaults

#### Fragment Memory Engine

- [ ] **FRG-01**: Fragment schema (YAML frontmatter + fuzzy impressionistic body) stored in Journal
- [ ] **FRG-02**: Five fragment types — experiential, meta-recall, sublimation, consolidation, source-reference
- [ ] **FRG-03**: Multi-angle formation pipeline (attention check, domain fan-out, parallel per-fragment processing, formation group tagging)
- [ ] **FRG-04**: Real-time recall via Assay (retrieval, composite ranking, LLM reconstruction through current Self Model frame)
- [ ] **FRG-05**: Association index in Ledger (domains, entities, associations, attention tags, formation groups, source locators, fragment decay)
- [ ] **FRG-06**: Deterministic decay function (time decay, consolidation protection, access bonus, relevance factor)
- [ ] **FRG-07**: Self-organizing taxonomy (domain creation/merge/split/retire during REM)
- [ ] **FRG-08**: Source-reference model (association chain termini, source locator pointers, experiential relationship to sources)

#### Three-Session Architecture

- [ ] **SES-01**: Primary session (Face) — user-facing session with Self Model personality expression via hook-injected context
- [ ] **SES-02**: Secondary session (Mind) — cognitive center managing attention, fragments, recall, taxonomy, Self Model authority
- [ ] **SES-03**: Tertiary session (Subconscious) — continuous sublimation stream with configurable cycle frequency (default 5-10s)
- [ ] **SES-04**: Wire-based inter-session communication (Primary <-> Secondary <-> Tertiary) with urgency levels (background/active/directive/urgent)
- [ ] **SES-05**: Session lifecycle (startup sequence, active operation, compaction handling, clean shutdown)
- [ ] **SES-06**: Subagent usage from Secondary and Tertiary (parallel recall, batch processing, taxonomy maintenance)

#### REM Consolidation

- [ ] **REM-01**: Tier 1 triage on compaction events (fast working state preservation to Journal)
- [ ] **REM-02**: Tier 2 provisional REM on idle timeout (full consolidation flagged tentative)
- [ ] **REM-03**: Tier 3 full REM on explicit session end (deep editorial pass)
- [ ] **REM-04**: Retroactive evaluation of session fragments against completed session arc
- [ ] **REM-05**: Association index editorial pass (entity dedup, weight updates, domain boundary review, taxonomy narrative updates)
- [ ] **REM-06**: Self Model conditioning update (attention biases, recall strategies, error history, identity core review)
- [ ] **REM-07**: Working memory -> long-term memory gate (nothing enters consolidated storage without REM)

#### Primary Context Management

- [ ] **CTX-01**: Continuous Self Model reinjection on every UserPromptSubmit (~800-1800 token budget)
- [ ] **CTX-02**: Referential framing prompt (Primary treats context as reference material, Self Model directives as operating frame)
- [ ] **CTX-03**: Context budget management (4 phases: full -> compressed -> minimal -> compaction advocacy)
- [ ] **CTX-04**: Self Model as compaction frame (PreCompact preserves Self Model perspective, not neutral summary)

#### Operational Modes

- [ ] **OPS-01**: Active mode — full three-session architecture
- [ ] **OPS-02**: Passive mode — Primary + lightweight Secondary only, no Tertiary
- [ ] **OPS-03**: REM mode — post-session consolidation, Secondary only
- [ ] **OPS-04**: Dormant mode — no sessions, scheduled decay maintenance only

#### Module Integration

- [ ] **INT-01**: Hook wiring for 8 Claude Code hooks (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, PreCompact, SubagentStart, SubagentStop)
- [ ] **INT-02**: CLI surface via Pulley (`dynamo reverie status/reset/inspect`)
- [ ] **INT-03**: Reverie installed and managed as git submodule via Forge/Relay

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Extension Layer

- **EXT-01**: Apex extension API for composing plugins + modules
- **EXT-02**: System composition layer (wrapping multiple modules as unified interdependent thing)

### External APIs

- **API-01**: Web/REST API implementation via Pulley contracts
- **API-02**: WebSocket API implementation via Pulley contracts

### Plugin Implementations

- **PLG-01**: Conduit — consolidated connectors for external sources (Google Drive, Dropbox, Slack)
- **PLG-02**: Terminus — ingestion/pipeline (Airbyte, dbt, Dagster)
- **PLG-03**: Library — temporal graph RAG
- **PLG-04**: Vault — storage (MinIO, Apache Iceberg)

### Advanced Reverie Features

- **ADV-01**: Emotional/affective modeling (subjective attention model)
- **ADV-02**: Cross-domain interpolation (multi-domain novel connections)
- **ADV-03**: Memory backfill from historical chat transcripts

## Out of Scope

| Feature | Reason |
|---------|--------|
| LLM API integration below SDK | Architecture principle: no SDK scope or lower aspect shall require LLM API. Dynamo uses Claude Code Max natively. |
| Decorator-based DI | CJS does not support decorators. Options-based injection validated in v0. |
| npm dependency tree for core | Platform core uses Bun/Node built-ins only. DuckDB and MCP SDK are infrastructure deps, not library deps. |
| Global mutable singletons | Destroys testability and dependency tracking. IoC container with explicit resolution instead. |
| Plugin-to-plugin direct imports | Creates unmanaged dependency web. Plugins interact through Armature contracts and Switchboard events. |
| LLM-based error recovery | Violates deterministic routing. Deterministic recovery patterns (retry, rollback, fail with guidance) instead. |
| Multi-tenant/multi-user | Single developer on one machine. No auth layer needed. |
| Web server in v1 | Massive surface area for zero immediate value. Contracts defined in Armature, stub in Pulley, implement when needed. |

## Cross-Milestone Dependencies

| M1 Component | M2 Dependency | Impact |
|--------------|---------------|--------|
| Wire (SVC-08) | Three-session architecture (SES-01 through SES-06) | Wire must support concurrent session orchestration with urgency-level messaging |
| Ledger (PRV-01) | Association index (FRG-05), Self Model structured state | DuckDB single-writer constraint requires coordinator pattern for multi-session writes |
| Assay (SVC-09) | Fragment recall (FRG-04), sublimation index scans (SES-03) | Federated search must support Journal frontmatter + Ledger association queries |
| Magnet (SVC-03) | Self Model persistence (SM-01) | State must persist across session boundaries with provider backing |
| Switchboard (SVC-01) | Hook event routing (INT-01) | Must support all 8 Claude Code hook types with semantic enrichment |
| Conductor (SVC-06) | Session lifecycle (SES-05) | MCP server lifecycle management for Wire relay and channel sessions |
| Journal (PRV-02) | Fragment storage (FRG-01), Self Model narrative state (SM-02/03/04) | Markdown provider must support YAML frontmatter queries |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LIB-01 | Phase 1 | Complete |
| LIB-02 | Phase 1 | Complete |
| LIB-03 | Phase 1 | Complete |
| SVC-01 | Phase 2 | Pending |
| SVC-02 | Phase 2 | Pending |
| SVC-03 | Phase 2 | Pending |
| SVC-04 | Phase 2 | Pending |
| SVC-05 | Phase 3 | Pending |
| SVC-06 | Phase 3 | Pending |
| SVC-07 | Phase 3 | Pending |
| SVC-08 | Phase 6 | Pending |
| SVC-09 | Phase 6 | Pending |
| PRV-01 | Phase 3 | Pending |
| PRV-02 | Phase 3 | Pending |
| FWK-01 | Phase 4 | Pending |
| FWK-02 | Phase 4 | Pending |
| FWK-03 | Phase 4 | Pending |
| FWK-04 | Phase 4 | Pending |
| FWK-05 | Phase 4 | Pending |
| FWK-06 | Phase 4 | Pending |
| SDK-01 | Phase 5 | Pending |
| SDK-02 | Phase 5 | Pending |
| SDK-03 | Phase 5 | Pending |
| INF-01 | Phase 5 | Pending |
| INF-02 | Phase 5 | Pending |
| INF-03 | Phase 5 | Pending |
| INF-04 | Phase 5 | Pending |
| SM-01 | M2 TBD | Pending |
| SM-02 | M2 TBD | Pending |
| SM-03 | M2 TBD | Pending |
| SM-04 | M2 TBD | Pending |
| SM-05 | M2 TBD | Pending |
| FRG-01 | M2 TBD | Pending |
| FRG-02 | M2 TBD | Pending |
| FRG-03 | M2 TBD | Pending |
| FRG-04 | M2 TBD | Pending |
| FRG-05 | M2 TBD | Pending |
| FRG-06 | M2 TBD | Pending |
| FRG-07 | M2 TBD | Pending |
| FRG-08 | M2 TBD | Pending |
| SES-01 | M2 TBD | Pending |
| SES-02 | M2 TBD | Pending |
| SES-03 | M2 TBD | Pending |
| SES-04 | M2 TBD | Pending |
| SES-05 | M2 TBD | Pending |
| SES-06 | M2 TBD | Pending |
| REM-01 | M2 TBD | Pending |
| REM-02 | M2 TBD | Pending |
| REM-03 | M2 TBD | Pending |
| REM-04 | M2 TBD | Pending |
| REM-05 | M2 TBD | Pending |
| REM-06 | M2 TBD | Pending |
| REM-07 | M2 TBD | Pending |
| CTX-01 | M2 TBD | Pending |
| CTX-02 | M2 TBD | Pending |
| CTX-03 | M2 TBD | Pending |
| CTX-04 | M2 TBD | Pending |
| OPS-01 | M2 TBD | Pending |
| OPS-02 | M2 TBD | Pending |
| OPS-03 | M2 TBD | Pending |
| OPS-04 | M2 TBD | Pending |
| INT-01 | M2 TBD | Pending |
| INT-02 | M2 TBD | Pending |
| INT-03 | M2 TBD | Pending |

**Coverage (Milestone 1):**
- M1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

**Coverage (Milestone 2):**
- M2 requirements: 31 total
- Mapped to phases: 0 (roadmap pending -- ships after M1)
- Unmapped: 31

---
*Requirements defined: 2026-03-22*
*Last updated: 2026-03-22 after M1 roadmap phase mapping*
