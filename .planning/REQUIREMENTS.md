# Requirements: Dynamo

**Defined:** 2026-03-17
**Last updated:** 2026-03-18
**Core Value:** Every capability must be self-manageable by Claude Code without manual user config file edits

## v1.2 Requirements

Requirements for the CJS architectural rewrite with complete feature parity.

### Foundation

- [x] **FND-01**: CJS shared substrate (core.cjs) with config loading, .env parsing, project detection, output formatting
- [x] **FND-02**: MCP client with SSE parsing for Graphiti JSON-RPC communication
- [x] **FND-03**: Scope constants and validation function rejecting invalid characters (colon constraint)
- [x] **FND-04**: Error logging with 1MB rotation, ISO timestamps, hook name prefix
- [x] **FND-05**: Health guard (once-per-session flag using process.ppid)
- [x] **FND-06**: Shared HTTP utility with explicit timeouts (fetchWithTimeout)
- [x] **FND-07**: Regression test suite covering all 12 v1.1 fixes

### Ledger

- [x] **LDG-01**: Single hook dispatcher (dynamo-hooks.cjs) routing all 5 hook events
- [x] **LDG-02**: SessionStart hook ported to CJS with full parity
- [x] **LDG-03**: UserPromptSubmit hook ported to CJS with full parity
- [x] **LDG-04**: PostToolUse (capture-change) hook ported to CJS with full parity
- [x] **LDG-05**: PreCompact (preserve-knowledge) hook ported to CJS with full parity
- [x] **LDG-06**: Stop (session-summary) hook ported to CJS with full parity
- [x] **LDG-07**: Haiku curation pipeline via OpenRouter with graceful degradation
- [x] **LDG-08**: Session management: list, view, label, backfill, index commands
- [x] **LDG-09**: Two-phase session auto-naming via Haiku
- [x] **LDG-10**: sessions.json format compatibility (read existing, write compatible)

### Switchboard

- [x] **SWB-01**: Health check (6 stages: Docker, Neo4j, API, MCP session, env vars, canary)
- [x] **SWB-02**: Verify-memory end-to-end pipeline test (6 checks including scope round-trip)
- [x] **SWB-03**: Deep diagnostics ported from diagnose.py (13 stages)
- [x] **SWB-04**: CJS installer deploying to ~/.claude/dynamo/, eliminating Python venv
- [x] **SWB-05**: Settings generator for hook registrations pointing to .cjs files
- [x] **SWB-06**: Unified `dynamo <command>` CLI router
- [x] **SWB-07**: Bidirectional sync rewrite (sync-graphiti.sh to CJS)
- [x] **SWB-08**: Stack start/stop commands (Docker compose wrappers)

### Branding

- [x] **BRD-01**: Project renamed to Dynamo with Ledger/Switchboard subsystem identity
- [x] **BRD-02**: Directory restructured to ~/.claude/dynamo/ with lib/ledger/ and lib/switchboard/

### Master Roadmap

- [x] **MRP-01**: Backlog items prioritized and assigned to v1.3-v2.0 milestones
- [x] **MRP-02**: Master Roadmap document created in project root

## v1.2.1 Requirements

Requirements for stabilization and polish of the v1.2 CJS foundation.

### Stabilization

- [ ] **STAB-01**: README and rebranding pass -- README reflects Dynamo identity, repo renamed on GitHub
- [ ] **STAB-02**: Archive legacy Python/Bash system -- tag, branch, and remove from dev/master
- [ ] **STAB-03**: Exhaustive documentation -- architecture, usage, CLI, hooks, config, dev guide
- [ ] **STAB-04**: Dynamo CLI integration in CLAUDE.md -- complete operational instructions for Claude Code
- [ ] **STAB-05**: Update/upgrade system -- version checks, migration, rollback
- [ ] **STAB-06**: Architecture and design decision capture -- deep analysis of v1.0-v1.2 decisions
- [ ] **STAB-07**: Fix Neo4j admin browser connectivity -- port 7475 not accessible
- [ ] **STAB-08**: Directory structure refactor -- dynamo/, ledger/, switchboard/ as root-level directories
- [ ] **STAB-09**: Component scope refactor -- honor Dynamo/Ledger/Switchboard boundaries in code
- [ ] **STAB-10**: Global on/off and dev mode toggles -- disable hooks globally, dev override per-thread

## Future Requirements

Deferred to v1.3+. Tracked but not in current roadmap.

### Memory Enhancement
- **MENH-01**: Decision engine -- infer global, project, and session level context type
- **MENH-02**: Preload engine -- auto inference and injection after user prompt
- **MENH-03**: Memory synthesis and export
- **MENH-04**: Memory inference and understanding
- **MENH-05**: Flat file support in addition to Graph DB
- **MENH-06**: Support both API and native Claude Code Haiku (proxy/workaround)
- **MENH-07**: Support other model choices for curation
- **MENH-08**: Support native or local text embedding model
- **MENH-09**: Council-style AI agent deliberation
- **MENH-10**: Dynamic curation depth -- adjust raw memory vs synthesized/summarized based on inferred user intent
- **MENH-11**: Proactive intelligent ingestion -- intelligently decide what to store, why it matters, and how it relates to scope

### Management Enhancement
- **MGMT-01**: Self-contained dependency management (Codeman, GSD, Memory System)
- **MGMT-02**: Domain-specific on-demand modules/skills/agents (WPCS, Context7, Playwright, Creative Writing)
- **MGMT-03**: CC skill inference and internal use
- **MGMT-04**: TweakCC integration for Claude Code overrides
- **MGMT-05**: Hooks replacing CLAUDE.md for dynamic behavior management
- **MGMT-06**: Global CC preferences through memories
- **MGMT-07**: Project CC preferences through memories
- **MGMT-08**: Jailbreak/hijacking protection patterns
- **MGMT-09**: Human cognition patterns applied as prompt engineering
- **MGMT-10**: Modular injection with better control through CJS
- **MGMT-11**: Session index refactor to SQLite -- replace flat-file session index with proper DB for depth and breadth over time

### UI
- **UI-01**: Global, Session, Project, Task views
- **UI-02**: Modular and insightful dashboard
- **UI-03**: Preload control
- **UI-04**: Memory system config
- **UI-05**: Asset management and browser
- **UI-06**: Memory CRUD operations
- **UI-07**: Memory with desktop app and mobile
- **UI-08**: Inline Dynamo visibility in Claude thread -- status indicators, memory actions, system state surfaced contextually

## Out of Scope

| Feature | Reason |
|---------|--------|
| New memory features in v1.2 | Foundation first -- parity before enhancement |
| UI/dashboard in v1.2 | Requires stable CJS substrate; deferred to v1.4+ |
| Domain skills in v1.2 | Requires modular injection pattern to mature; deferred to v1.3+ |
| ESM modules | CJS is the standard in this ecosystem (GSD, existing hooks, package.json) |
| npm dependencies beyond js-yaml | Node.js built-ins cover all needs; zero bloat philosophy |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 8 | Complete |
| FND-02 | Phase 8 | Complete |
| FND-03 | Phase 8 | Complete |
| FND-04 | Phase 8 | Complete |
| FND-05 | Phase 8 | Complete |
| FND-06 | Phase 8 | Complete |
| FND-07 | Phase 8 | Complete |
| LDG-01 | Phase 9 | Complete |
| LDG-02 | Phase 9 | Complete |
| LDG-03 | Phase 9 | Complete |
| LDG-04 | Phase 9 | Complete |
| LDG-05 | Phase 9 | Complete |
| LDG-06 | Phase 9 | Complete |
| LDG-07 | Phase 9 | Complete |
| LDG-08 | Phase 9 (09-02) | Complete |
| LDG-09 | Phase 9 (09-02) | Complete |
| LDG-10 | Phase 9 (09-02) | Complete |
| SWB-01 | Phase 10 | Complete |
| SWB-02 | Phase 10 (10-02) | Complete |
| SWB-03 | Phase 10 | Complete |
| SWB-04 | Phase 10 | Complete |
| SWB-05 | Phase 10 | Complete |
| SWB-06 | Phase 10 | Complete |
| SWB-07 | Phase 10 | Complete |
| SWB-08 | Phase 10 | Complete |
| BRD-01 | Phase 8 | Complete |
| BRD-02 | Phase 8 | Complete |
| MRP-01 | Phase 11 | Complete |
| MRP-02 | Phase 11 | Complete |

**v1.2 Coverage:**
- v1.2 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

### v1.2.1

| Requirement | Phase | Status |
|-------------|-------|--------|
| STAB-01 | TBD | Pending |
| STAB-02 | TBD | Pending |
| STAB-03 | TBD | Pending |
| STAB-04 | TBD | Pending |
| STAB-05 | TBD | Pending |
| STAB-06 | TBD | Pending |
| STAB-07 | TBD | Pending |
| STAB-08 | TBD | Pending |
| STAB-09 | TBD | Pending |
| STAB-10 | TBD | Pending |

**v1.2.1 Coverage:**
- v1.2.1 requirements: 10 total
- Mapped to phases: 0
- Unmapped: 10 (awaiting milestone start)

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-18 after v1.2.1 scoping*
