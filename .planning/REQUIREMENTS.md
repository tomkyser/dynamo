# Requirements: Dynamo v1.3-M1

**Defined:** 2026-03-19
**Core Value:** Every capability must be self-manageable by Claude Code without manual user config file edits

## v1.3-M1 Requirements

Requirements for Foundation and Infrastructure Refactor. Each maps to roadmap phases.

### Architecture

- [x] **ARCH-01**: Codebase organized into six-subsystem directory structure (`subsystems/`, `cc/`, `lib/`)
- [x] **ARCH-02**: All dual-layout resolution paths centralized into single resolver module in `lib/`
- [x] **ARCH-03**: Static circular dependency detection test validates all require() chains across subsystems
- [x] **ARCH-04**: Unified layout mapping module serves as single source of truth for sync, install, and deploy paths
- [x] **ARCH-05**: Sync system operates correctly with new six-subsystem directory layout
- [x] **ARCH-06**: Install and deploy pipeline operates correctly with new layout (settings.json references `cc/hooks/`)
- [x] **ARCH-07**: All existing tests pass after restructure (374+ green)

### Management

- [x] **MGMT-01**: Install and health-check verify Node.js minimum version and Graphiti dependency status
- [x] **MGMT-08a**: Hook dispatcher validates JSON structure and enforces field length limits on all input
- [x] **MGMT-08b**: `additionalContext` injection includes boundary markers to prevent prompt injection bleed

### Data Infrastructure

- [x] **DATA-01**: Session data stored in SQLite via `node:sqlite` DatabaseSync API
- [x] **DATA-02**: Session query functions maintain identical interface (listSessions, viewSession, labelSession, etc.)
- [x] **DATA-03**: One-time migration converts existing `sessions.json` to SQLite database
- [x] **DATA-04**: Graceful fallback to JSON file if `node:sqlite` is unavailable

## Future Requirements

Deferred to subsequent milestones. Tracked but not in current roadmap.

### Intelligence (1.3-M2)

- **CORTEX-01**: Inner Voice basic -- semantic shift detection, smart curation, self-model persistence
- **CORTEX-02**: Dual-path routing -- hot path (<500ms) and deliberation path (2-10s)
- **CORTEX-03**: Cost monitoring -- per-operation budget tracking with hard enforcement
- **MGMT-05**: Hooks as primary behavior -- hooks replace static CLAUDE.md
- **MGMT-10**: Modular injection control -- refined injection with feature flag rollback

### Removed from Roadmap

- **MENH-06**: Transport flexibility -- removed. Max subscription + subagents eliminates need for direct Anthropic API transport.
- **MENH-07**: Model selection -- removed. Subagent YAML frontmatter provides native model selection at zero marginal cost.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Reverie handler migration | M2 deliverable -- create stub directory only, handlers stay in ledger/hooks/ |
| curation.cjs LLM function split | M2 deliverable -- functions stay in current file until Reverie exists |
| ESM migration | Doubles effort, CJS is the ecosystem standard |
| @anthropic-ai/sdk or better-sqlite3 | Violates zero-npm-dependency constraint |
| Dynamic handler registration | Adds latency, no value when subscriber list is known at build time |
| Test file relocation | Update require paths incrementally, don't move test files |
| Direct Anthropic API calls | Max subscription + subagents eliminates need (MENH-06/07 removed) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARCH-01 | Phase 19 | Complete |
| ARCH-02 | Phase 18 | Complete |
| ARCH-03 | Phase 18 | Complete |
| ARCH-04 | Phase 19 | Complete |
| ARCH-05 | Phase 19 | Complete |
| ARCH-06 | Phase 19 | Complete |
| ARCH-07 | Phase 19 | Complete |
| MGMT-01 | Phase 20 | Complete |
| MGMT-08a | Phase 20 | Complete |
| MGMT-08b | Phase 20 | Complete |
| DATA-01 | Phase 21 | Complete |
| DATA-02 | Phase 21 | Complete |
| DATA-03 | Phase 21 | Complete |
| DATA-04 | Phase 21 | Complete |

**Coverage:**
- v1.3-M1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after roadmap creation*
