# Dynamo Master Roadmap

**Last updated:** 2026-03-20

v1.3 is the target release. Milestones within v1.3 (numbered 1.3-M1 through 1.3-M7) are iterations building toward v1.3 GA. We do not plan beyond v1.3. The roadmap reflects Dynamo's six-subsystem architecture: **Dynamo** (system wrapper), **Switchboard** (dispatcher/ops), **Ledger** (data construction), **Assay** (data access), **Terminus** (data infrastructure), and **Reverie** (Inner Voice).

> **How to Use This Document:** This is a living document that Claude Code should read to understand what comes next and in what order. When planning future work, consult the milestone assignments and dependency notes to determine what to build next. Requirement IDs (MENH-XX, MGMT-XX, UI-XX, STAB-XX, CORTEX-XX) are indexed in the Requirement Index table below. See DYNAMO-PRD.md for the strategic product requirements and subsystem boundary definitions.

## Architecture Context

Dynamo is built on a six-subsystem architecture. Each subsystem has a defined boundary:

| Subsystem | Role | Boundary Rule |
|-----------|------|--------------|
| **Dynamo** | System wrapper -- CLI router, shared resources (`lib/`), API surface | Routes commands; does not implement subsystem logic |
| **Switchboard** | Dispatcher -- hook routing, install/sync/update lifecycle | Dispatches events to handlers; does not implement handler logic |
| **Ledger** | Data Construction -- episode creation, write-side formatting | Writes data; never reads the knowledge graph |
| **Assay** | Data Access -- search, session queries, entity inspection | Reads data; never writes to the knowledge graph |
| **Terminus** | Data Infrastructure -- MCP transport, Docker stack, health, diagnostics, migrations | Provides the pipe; does not decide what flows through it |
| **Reverie** | Inner Voice -- cognitive processing, dual-path routing, activation management, REM consolidation | Reads through Assay, writes through Ledger; owns all intelligence |

See subsystem specifications in `.planning/research/` for detailed boundary definitions and interface contracts.

## Completed Milestones

<details>
<summary>v1.0 through v1.2.1 (completed)</summary>

- **v1.0 Research and Ranked Report** (Phases 1-3) -- Completed 2026-03-17. Vetted and ranked tools for the Claude Code ecosystem using a 4-gate methodology.
- **v1.1 Fix Memory System** (Phases 4-7) -- Completed 2026-03-17. Diagnosed root causes of silent hook failures, fixed memory persistence, added session management and auto-naming.
- **v1.2 Dynamo Foundation** (Phases 8-11) -- Completed 2026-03-18. Rewrote the Python/Bash foundation to Node/CJS architecture with full feature parity. Established Dynamo/Ledger/Switchboard branding and project structure.
- **v1.2.1 Stabilization and Polish** (Phases 12-17) -- Completed 2026-03-19. Closed all stabilization gaps: directory restructure, component scope refactor, global toggle, legacy removal, comprehensive documentation, CLI integration, update system, architecture capture, Neo4j fix, and dev mode toggles. All 10 STAB requirements shipped.

</details>

## v1.3 Milestone Iterations

Each milestone gates the next: a milestone must prove its value before the next one proceeds.

```
1.3-M1 (Foundation) --- prerequisite for all subsequent milestones
    |
    v
1.3-M2 (Core Intelligence) --- Inner Voice must prove value
    |
    v
1.3-M3 (Management) --- system self-management and visibility
    |
    v
1.3-M4 (Advanced Intelligence) --- advanced IV requires basic IV proven
    |
    v
1.3-M5 (Platform Expansion) --- agent coordination requires stable intelligence layer
    |
    v
1.3-M6 (Dashboard) --- UI requires quality data to display
    |
    v
1.3-M7 (Advanced Capabilities) --- multi-agent requires single-agent proven
```

---

### 1.3-M1: Foundation and Infrastructure Refactor

**Status: SHIPPED** (2026-03-20)
> Shipped 2026-03-20. 5 phases (18-22), 12 plans, all 14 requirements validated. Tagged `v1.3-M1` on dev branch.

**Goal:** Restructure the codebase to the six-subsystem architecture and establish the infrastructure prerequisites for the intelligence layer. Infrastructure ready for Reverie.

**Dependencies:** v1.2.1 (stabilization complete)

| Requirement | Name | Subsystem | Description |
|-------------|------|-----------|-------------|
| -- | Directory restructure | All | Reorganize from 3-directory layout (`dynamo/`, `ledger/`, `switchboard/`) to six-subsystem architecture (`subsystems/`, `cc/`, `lib/`). Establish the `cc/` platform adapter pattern. |
| MGMT-01 | Dependency management | Switchboard | Self-contained dependency management. Dynamo manages its own dependencies (GSD, Graphiti, etc.). |
| MGMT-08 | Jailbreak protection | Switchboard | Security hardening of the hook system while it is fresh and well-understood. |
| MGMT-11 | SQLite session index | Assay / Terminus | Replace flat-file session index with SQLite for scalable session queries. Terminus owns schema; Assay owns queries. |

**Removed:** MENH-06 (Transport flexibility) and MENH-07 (Model selection) -- Max subscription + Claude Code native subagents eliminates the need for direct Anthropic API transport and separate model routing. Subagent YAML frontmatter provides model selection at zero marginal cost.

---

### 1.3-M2: Core Intelligence

**Goal:** Make the memory system intelligent through the Inner Voice and dual-path architecture. Reverie replaces the classic curation pipeline with context-aware, personality-driven injection. The hybrid architecture uses CJS command hooks for the hot path and custom subagents for deliberation. All LLM operations use native Claude Code subagents (Max subscription) — no external API calls for Dynamo's own operations.

**Dependencies:** 1.3-M1 (six-subsystem architecture in place)

| Requirement | Name | Subsystem | Description |
|-------------|------|-----------|-------------|
| CORTEX-01 | Inner Voice (basic) | Reverie | Semantic shift detection, smart curation replacing classic pipeline, self-model persistence (JSON state file). Implements 7 PRIMARY cognitive theories: Dual-Process, Global Workspace, Spreading Activation (1-hop), Predictive Processing, Working Memory, Relevance Theory, Cognitive Load Theory. Hybrid architecture: CJS hooks for hot path (<500ms) + custom `inner-voice` subagent for deliberation. All LLM ops via native subagents (Max subscription). Absorbs MENH-01, MENH-02, MENH-10, MENH-11, MGMT-09. |
| CORTEX-02 | Dual-path routing | Reverie | Hot path (<500ms, deterministic) and deliberation path (2-10s, subagent or API). Deterministic sublimation threshold: `sublimation_score = activation_level * surprise_factor * relevance_ratio * (1 - cognitive_load_penalty) * confidence_weight`. Target: 95% hot path / 5% deliberation. |
| CORTEX-03 | Cost monitoring | Reverie / Dynamo | Per-operation, per-day, per-month budget tracking with hard enforcement. Degrades to hot-path-only when budget exhausted. Subscription users ~$0.37/day; API users ~$1.98/day. |
| MGMT-05 | Hooks as primary behavior | Switchboard | Hooks replace static CLAUDE.md as the primary behavior mechanism. Switchboard dispatcher routes all events. |
| MGMT-10 | Modular injection control | Switchboard / Reverie | Refined injection control building on v1.2's CJS foundation. Reverie's `reverie.mode` feature flag enables instant rollback to classic curation pipeline. |

**Absorbed requirements:**

| Requirement | Name | Absorbed By | Rationale |
|-------------|------|-------------|-----------|
| MENH-01 | Decision engine | CORTEX-01 | Inner Voice context inference IS the decision engine |
| MENH-02 | Preload engine | CORTEX-01 | Inner Voice narrative briefing IS the preload engine |
| MENH-10 | Dynamic curation depth | CORTEX-02 | Dual-path routing IS dynamic curation depth |
| MENH-11 | Proactive intelligent ingestion | CORTEX-01 | Inner Voice PostToolUse handling IS proactive ingestion |
| MGMT-09 | Human cognition patterns | CORTEX-01 | Inner Voice cognitive architecture IS biomimetic memory patterns |

---

### 1.3-M3: Management and Visibility

**Goal:** Make the system self-managing and visible. On-demand module loading, skill inference, and in-thread visibility of what Dynamo is doing.

**Dependencies:** 1.3-M2 (intelligence layer operational)

| Requirement | Name | Subsystem | Description |
|-------------|------|-----------|-------------|
| MGMT-02 | On-demand modules | Switchboard | Domain-specific on-demand module loading (WPCS, Context7, Playwright). |
| MGMT-03 | Skill inference | Switchboard / Dynamo | Claude Code skill inference and internal use. Makes Claude Code aware of available skills. |
| UI-08 | Inline visibility | Dynamo | In-thread visibility of what Dynamo is doing -- status indicators, memory actions, system state surfaced contextually. |

---

### 1.3-M4: Advanced Intelligence

**Goal:** Elevate Inner Voice to full capability with narrative briefings, relationship modeling, metacognitive self-correction, local embeddings, and preference persistence.

**Dependencies:** 1.3-M3 (management and visibility operational); 1.3-M2 (basic Inner Voice proven)

| Requirement | Name | Subsystem | Description |
|-------------|------|-----------|-------------|
| CORTEX-04 | Inner Voice (advanced) | Reverie | Narrative briefings at session start with relational framing. Relationship modeling (user patterns, frustrations, communication style). Implements 5 SECONDARY theories: Attention Schema Theory, Somatic Marker Hypothesis, Default Mode Network, Memory Consolidation, Metacognition. Full IV memory schema (`inner-voice-memory.json`) with REM-gated writes. |
| CORTEX-05 | Enhanced Construction | Reverie / Ledger | Observation synthesis (batch job, not persistent agent). Consolidation runs, improved entity deduplication, conflict detection. |
| CORTEX-06 | IV persistence (advanced) | Reverie | Cross-session continuity via graph-backed self-model evolution. JSON cache for hot path reads. Replaces JSON-only persistence with Graphiti temporal versioning. |
| MENH-08 | Local embeddings | Terminus | Native or local text embedding model. Removes dependency on external embedding APIs; enables full frame-first pipeline with embedding-based classification. |
| MGMT-06 | Global preferences | Assay / Ledger | Global Claude Code preferences stored in and retrieved from the knowledge graph. |
| MGMT-07 | Project preferences | Assay / Ledger | Project-scoped preferences. Natural pair with MGMT-06. |

---

### 1.3-M5: Platform Expansion

**Goal:** Expand the platform with memory synthesis/export, inference capabilities, alternative storage backends, agent coordination, and a connector framework.

**Dependencies:** 1.3-M4 (advanced intelligence stable)

| Requirement | Name | Subsystem | Description |
|-------------|------|-----------|-------------|
| MENH-03 | Memory synthesis and export | Reverie / Assay | Produces shareable knowledge artifacts from accumulated memory. Requires Inner Voice context typing. |
| MENH-04 | Memory inference | Reverie / Assay | Moves from storage to comprehension. Enhanced by CORTEX-05 observation synthesis. |
| MENH-05 | Flat file support | Terminus | Alternative storage backend for users who cannot run Docker/Neo4j. Broadens accessibility. |
| CORTEX-07 | Agent coordination | Reverie / Dynamo | On-demand spawning of specialized subagents for deep recall operations. CLI: `dynamo agent status/spawn/stop/logs`. |
| CORTEX-08 | Access Agent (basic) | Assay | Codebase indexer for background ingestion of full repo (scheduled batch job, not persistent agent). |
| CORTEX-09 | Connector framework | Dynamo | Pluggable source interface (connect/poll/fetch/getSchema). v1.3 connectors: FileSystem, Session, Graphiti. Claudia-aware: future connectors (iMessage, Email) added without architectural change. |

---

### 1.3-M6: Dashboard and UI

**Goal:** Provide a visual interface for browsing, managing, and understanding the knowledge graph and memory system.

**Dependencies:** 1.3-M5 (quality data available; stable API surface)

| Requirement | Name | Subsystem | Description |
|-------------|------|-----------|-------------|
| UI-01 | Global/Session/Project/Task views | Dashboard | Core navigation structure for the web dashboard. |
| UI-02 | Modular dashboard | Dashboard | Main landing page with insightful widgets. |
| UI-03 | Preload control | Dashboard | Visual control for Inner Voice / preload engine. |
| UI-04 | Memory system config | Dashboard | Settings interface for memory parameters. |
| UI-05 | Asset management | Dashboard | Browse and manage stored knowledge artifacts. |
| UI-06 | Memory CRUD | Dashboard | Direct manipulation of memories through the UI. |
| MGMT-04 | TweakCC | Dashboard / Dynamo | Claude Code behavior overrides. Ships with dashboard for cohesive UX. |

---

### 1.3-M7: Advanced Capabilities

**Goal:** Multi-agent reasoning and Claudia-aware extensibility. These capabilities require a fully mature, proven single-agent system.

**Dependencies:** 1.3-M6 (stable, visible, well-understood system)

| Requirement | Name | Subsystem | Description |
|-------------|------|-----------|-------------|
| CORTEX-10 | Multi-agent deliberation | Reverie / Dynamo | Typed message envelopes with correlation tracking, priority-based routing, domain tagging. Enables multi-agent reasoning between Inner Voice, Construction, and Access components. Absorbs MENH-09. |
| CORTEX-11 | Domain agent framework | Dynamo | Claudia-aware extensibility: pluggable domain agents, domain-specific extraction templates, disposition configuration per domain. Designs the interface; domain agents themselves are Claudia-scope. |

---

## Deferred Items

Items with no assigned target version. To be evaluated after v1.3 GA based on priority and value assessment.

| Requirement | Name | Reason for Deferral |
|-------------|------|-------------------|
| UI-07 | Desktop/mobile interface | Requires web dashboard (1.3-M6) as foundation and stable API surface. Cross-platform UI is a significant effort that should be evaluated once the web dashboard proves its value. |

---

## Requirement Index

All requirements are assigned to a 1.3-M* milestone, marked as shipped, absorbed, or deferred.

| Requirement ID | Name | Milestone | Status/Notes |
|----------------|------|-----------|-------------|
| STAB-01 | README and rebranding pass | v1.2.1 | Shipped 2026-03-19 |
| STAB-02 | Archive legacy Python/Bash | v1.2.1 | Shipped 2026-03-19 |
| STAB-03 | Exhaustive documentation | v1.2.1 | Shipped 2026-03-19 |
| STAB-04 | Dynamo CLI integration in CLAUDE.md | v1.2.1 | Shipped 2026-03-19 |
| STAB-05 | Update/upgrade system | v1.2.1 | Shipped 2026-03-19 |
| STAB-06 | Architecture/decision capture | v1.2.1 | Shipped 2026-03-19 |
| STAB-07 | Fix Neo4j admin browser | v1.2.1 | Shipped 2026-03-19 |
| STAB-08 | Directory structure refactor | v1.2.1 | Shipped 2026-03-19 |
| STAB-09 | Component scope refactor | v1.2.1 | Shipped 2026-03-19 |
| STAB-10 | Global on/off and dev mode toggles | v1.2.1 | Shipped 2026-03-19 |
| MENH-01 | Decision engine | 1.3-M2 | Absorbed by CORTEX-01 |
| MENH-02 | Preload engine | 1.3-M2 | Absorbed by CORTEX-01 |
| MENH-03 | Memory synthesis and export | 1.3-M5 | |
| MENH-04 | Memory inference | 1.3-M5 | Enhanced by CORTEX-05 |
| MENH-05 | Flat file support | 1.3-M5 | |
| MENH-06 | Transport flexibility | Removed | Max subscription + subagents eliminates need |
| MENH-07 | Model selection | Removed | Subagent YAML frontmatter provides native model selection |
| MENH-08 | Local embeddings | 1.3-M4 | |
| MENH-09 | Council-style deliberation | 1.3-M7 | Absorbed by CORTEX-10 |
| MENH-10 | Dynamic curation depth | 1.3-M2 | Absorbed by CORTEX-02 |
| MENH-11 | Proactive intelligent ingestion | 1.3-M2 | Absorbed by CORTEX-01 |
| MGMT-01 | Dependency management | 1.3-M1 | |
| MGMT-02 | On-demand modules | 1.3-M3 | |
| MGMT-03 | Skill inference | 1.3-M3 | |
| MGMT-04 | TweakCC | 1.3-M6 | |
| MGMT-05 | Hooks as primary behavior | 1.3-M2 | |
| MGMT-06 | Global preferences | 1.3-M4 | |
| MGMT-07 | Project preferences | 1.3-M4 | |
| MGMT-08 | Jailbreak protection | 1.3-M1 | |
| MGMT-09 | Human cognition patterns | 1.3-M2 | Absorbed by CORTEX-01 |
| MGMT-10 | Modular injection control | 1.3-M2 | |
| MGMT-11 | SQLite session index | 1.3-M1 | |
| UI-01 | Global/Session/Project/Task views | 1.3-M6 | |
| UI-02 | Modular dashboard | 1.3-M6 | |
| UI-03 | Preload control | 1.3-M6 | |
| UI-04 | Memory system config | 1.3-M6 | |
| UI-05 | Asset management | 1.3-M6 | |
| UI-06 | Memory CRUD | 1.3-M6 | |
| UI-07 | Desktop/mobile | Deferred | Requires web dashboard foundation |
| UI-08 | Inline visibility | 1.3-M3 | |
| CORTEX-01 | Inner Voice (basic) | 1.3-M2 | Hybrid architecture: CJS hooks + custom subagent; 7 PRIMARY theories |
| CORTEX-02 | Dual-path routing | 1.3-M2 | Deterministic sublimation threshold; 95/5 hot/deliberation split |
| CORTEX-03 | Operational monitoring | 1.3-M2 | Subagent spawn tracking and rate limit degradation |
| CORTEX-04 | Inner Voice (advanced) | 1.3-M4 | Narrative briefings, relationship modeling; 5 SECONDARY theories |
| CORTEX-05 | Enhanced Construction | 1.3-M4 | Observation synthesis, consolidation |
| CORTEX-06 | IV persistence (advanced) | 1.3-M4 | Graph-backed self-model evolution |
| CORTEX-07 | Agent coordination | 1.3-M5 | On-demand subagent spawning |
| CORTEX-08 | Access Agent (basic) | 1.3-M5 | Codebase indexer, background ingestion |
| CORTEX-09 | Connector framework | 1.3-M5 | Pluggable source interface, Claudia-aware |
| CORTEX-10 | Multi-agent deliberation | 1.3-M7 | Typed message envelopes, coordination; absorbs MENH-09 |
| CORTEX-11 | Domain agent framework | 1.3-M7 | Claudia-aware extensibility |

## Guiding Principles

- **Build foundational capabilities first.** The intelligence layer (Inner Voice, dual-path routing) must exist before features that depend on it. 1.3-M1 establishes the infrastructure that 1.3-M2's Inner Voice requires.
- **Memory quality before UI.** Displaying memories in a dashboard is only valuable if those memories are high quality. 1.3-M4's advanced intelligence must mature before 1.3-M6 builds visual interfaces on top of them.
- **Security early, ambition late.** Jailbreak protection (MGMT-08) belongs in 1.3-M1 while the hook system is fresh and well-understood. Multi-agent deliberation (CORTEX-10) belongs in 1.3-M7 where research time and mature infrastructure are available.
- **Self-manageability is non-negotiable.** Every milestone must maintain the core value that Claude Code can install, configure, update, and troubleshoot Dynamo without manual user intervention.
- **Pair related requirements within milestones.** MENH-06 and MENH-07 (transport flexibility then model selection) are natural pairs in 1.3-M1. MGMT-06 and MGMT-07 (global then project preferences) are natural pairs in 1.3-M4.
- **Prove before scaling.** The Inner Voice must demonstrably improve memory quality in 1.3-M2 before investing in multi-agent coordination in 1.3-M7. Each milestone gates the next.
- **Agents are expensive; functions are cheap.** Default to deterministic CJS functions. Escalate to LLM agents only when reasoning genuinely adds value.
- **Dual-path is non-negotiable.** Every memory operation must route through the hot path (fast, cheap, deterministic) or deliberation path (slow, expensive, intelligent). No operation should use the deliberation path by default.
- **Hybrid architecture.** CJS command hooks for hot path (deterministic, <500ms) + custom subagents for deliberation path (intelligent, 2-10s). All LLM operations use native subagents (Max subscription) at zero marginal cost. External API calls reserved for Graphiti infrastructure only.
- **Six-subsystem boundary integrity.** Respect read/write/transport/dispatch/cognition/system boundaries. Ledger does not read. Assay does not write. Reverie delegates both. Switchboard dispatches but does not handle.
- **Claudia-aware, not Claudia-scoped.** Design interfaces for extensibility (connector framework, message envelopes, domain templates) but only build what Dynamo needs now.
- **Platform adapter pattern.** The `cc/` directory isolates all Claude Code specifics. Subsystem logic is platform-agnostic where possible. Future platforms (`/web`, `/api`, `/mcp`) can be added without touching subsystem logic.

---
*Master Roadmap created: 2026-03-18*
*Last updated: 2026-03-20 -- v1.3-M1 shipped; milestoned delivery continues (1.3-M2 through 1.3-M7)*
*Architecture: Six-subsystem model (Dynamo, Switchboard, Ledger, Assay, Terminus, Reverie)*
*Source: DYNAMO-PRD.md, subsystem specifications, INNER-VOICE-SPEC.md, INNER-VOICE-SYNTHESIS-RESEARCH.md*
