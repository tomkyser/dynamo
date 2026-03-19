# Dynamo Master Roadmap

**Last updated:** 2026-03-19

This document covers the Dynamo project roadmap from v1.2.1 through v2.0. Milestones v1.0 (Research and Ranked Report), v1.1 (Fix Memory System), and v1.2 (Dynamo Foundation) are complete. Requirements are prioritized and assigned to milestones based on dependency analysis and the project's core value: every capability must be self-manageable by Claude Code without manual user config file edits.

> **How to Use This Document:** This is a living document that Claude Code should read to understand what comes next and in what order. When planning future work, consult the milestone assignments and dependency notes to determine what to build next. Requirement IDs (MENH-XX, MGMT-XX, UI-XX, STAB-XX, CORTEX-XX) are indexed in the Requirement Index table below.

## Milestone Overview

| Milestone | Theme | Requirements | Description |
|-----------|-------|:------------:|-------------|
| v1.2.1 | Stabilization and Polish | 10 | **Shipped 2026-03-19.** Closed all gaps from v1.2: rebranding, directory/scope refactor, legacy cleanup, docs, CLI integration, update system, architecture capture, Neo4j fix, dev toggles |
| v1.3 | Intelligent Memory and Modularity | 17 | Inner Voice, dual-path routing, cost monitoring + management modularity. Absorbs MENH-01, MENH-02, MENH-10, MENH-11, MGMT-09. |
| v1.4 | Memory Quality and Agent Foundation | 9 | Advanced Inner Voice, observation synthesis, preferences. Adds CORTEX-04/05/06. MGMT-09 moved to v1.3. |
| v1.5 | Dashboard, Visibility, and Agent Coordination | 10 | UI + agent SDK integration + connector framework. Adds CORTEX-07/08/09. |
| v2.0 | Advanced Capabilities | 4 | Multi-agent deliberation, domain agent framework, cross-platform. Adds CORTEX-10/11. MENH-09 absorbed. |

## Completed Milestones

<details>
<summary>v1.0 through v1.2.1 (completed)</summary>

- **v1.0 Research and Ranked Report** (Phases 1-3) -- Completed 2026-03-17. Vetted and ranked tools for the Claude Code ecosystem using a 4-gate methodology.
- **v1.1 Fix Memory System** (Phases 4-7) -- Completed 2026-03-17. Diagnosed root causes of silent hook failures, fixed memory persistence, added session management and auto-naming.
- **v1.2 Dynamo Foundation** (Phases 8-11) -- Completed 2026-03-18. Rewrote the Python/Bash foundation to Node/CJS architecture with full feature parity. Established Dynamo/Ledger/Switchboard branding and project structure.
- **v1.2.1 Stabilization and Polish** (Phases 12-17) -- Completed 2026-03-19. Closed all stabilization gaps: directory restructure, component scope refactor, global toggle, legacy removal, comprehensive documentation, CLI integration, update system, architecture capture, Neo4j fix, and dev mode toggles. All 10 STAB requirements shipped.

</details>

## Milestone Details

### v1.3 -- Intelligent Memory and Modularity

**Goal:** Make the memory system intelligent through the Inner Voice and dual-path architecture (Ledger Cortex Phase 1), while making the management system modular with self-contained dependency management and on-demand skill loading. The Inner Voice replaces Haiku-only curation with context-aware, personality-driven memory injection. Dual-path routing ensures cost control by routing 95% of operations through a fast, cheap hot path.

**Dependencies:** v1.2.1 (stabilization complete, documentation and CLI integration in place)

#### Ledger Cortex Requirements (new and absorbed)

| Requirement | Name | Source | Rationale |
|-------------|------|--------|-----------|
| CORTEX-01 | Inner Voice (basic) | New | Semantic shift detection, smart curation replacing Haiku pipeline, self-model persistence (basic JSON cache). Absorbs MENH-01, MENH-02, MENH-10, MENH-11 functionality. **Implements 7 PRIMARY cognitive theories:** Dual-Process (Kahneman) -> dual-path architecture; Global Workspace (Baars) -> sublimation mechanism; Spreading Activation (Collins & Loftus) -> basic 1-hop cascading associations; Predictive Processing (Friston) -> semantic shift detection as surprise proxy; Working Memory (Baddeley) -> episodic buffer / integration function; Relevance Theory (Sperber & Wilson) -> injection format optimization; Cognitive Load (Sweller) -> injection volume constraints (500/150/50 token limits). Plus Hebbian Learning (SUPPORTING) for basic edge weight tracking. **Mechanical design:** Event-driven + persistent state architecture (not a compromise -- the correct design; human cognition is also event-driven at the neural level; persistent state + rapid re-activation creates the continuity illusion). Persistent state file (`inner-voice-state.json`) containing self-model, relationship model, activation map, pending associations, injection history, and predictive model state. Processing pipeline per hook: LOAD state -> PROCESS -> UPDATE -> PERSIST. See INNER-VOICE-SPEC.md Section 4 for full mechanical specification. |
| CORTEX-02 | Dual-path routing | New | Hot path (<1s, deterministic search + cached results) and deliberation path (LLM-powered deep reasoning). Deterministic path selection rules. **Deterministic sublimation threshold formula:** `sublimation_score = activation_level * surprise_factor * relevance_ratio * (1 - cognitive_load_penalty) * confidence_weight`. All factors deterministic or pre-computed -- no LLM call for threshold calculation. **Latency budgets:** Hot path target <500ms (deterministic processing + cached state); Deliberation path target <2s (Haiku call with prompt caching); Session start briefing <4s (Sonnet, acceptable for session start). **Target ratio:** 95% hot path / 5% deliberation. See INNER-VOICE-SPEC.md Section 4.4 and 4.8 for threshold mechanism and latency budget details. |
| CORTEX-03 | Cost monitoring | New | Per-agent/day/month budget tracking with hard enforcement. Degrades to hot-path-only when budget exhausted. CLI: `dynamo cost today/month/budget`. |
| MENH-01 | Decision engine -- infer context type | Absorbed by CORTEX-01 | Inner Voice context inference IS the decision engine. Not built separately. |
| MENH-02 | Preload engine -- auto inference and injection | Absorbed by CORTEX-01 | Inner Voice narrative briefing IS the preload engine. Not built separately. |
| MENH-10 | Dynamic curation depth | Absorbed by CORTEX-02 | Dual-path routing IS dynamic curation depth. Hot path for simple lookups, deliberation for deep synthesis. |
| MENH-11 | Proactive intelligent ingestion | Absorbed by CORTEX-01 | Inner Voice's smart PostToolUse handling IS proactive ingestion for v1.3 scope. |
| MGMT-09 | Human cognition patterns as prompt engineering | Moved from v1.4 | Inner Voice cognitive architecture IS this requirement. Biomimetic memory patterns applied to injection. |

#### Remaining Management Requirements (unchanged)

| Requirement | Name | Rationale |
|-------------|------|-----------|
| MENH-06 | Support both API and native Haiku | Removes OpenRouter single-point-of-failure for curation; straightforward transport layer change on CJS. **Enables Graphiti dual-model selection (Sonnet for complex relationship inference, Haiku for simple entity extraction). This is a prerequisite for CORTEX-01/02 model selection per path.** See INNER-VOICE-SPEC.md Section 4.7 for model-to-component mapping. |
| MENH-07 | Support other model choices for curation | Natural extension of MENH-06; once transport is flexible, model selection follows. Now also enables per-path model selection (Haiku for hot, Sonnet for deliberation). **Per-path model selection: Haiku 4.5 for hot path formatting, Sonnet 4.6 for deliberation path reasoning, session start briefing, stop synthesis, and self-model updates.** See INNER-VOICE-SPEC.md Section 4.7 for full model-to-component mapping. |
| MGMT-01 | Self-contained dependency management | Core self-manageability requirement; Dynamo should manage its own dependencies (GSD, Graphiti, etc.) |
| MGMT-02 | Domain-specific on-demand modules | Enables skill loading (WPCS, Context7, Playwright); requires modular injection pattern from v1.2 |
| MGMT-03 | CC skill inference and internal use | Makes Claude Code aware of available skills; builds on MGMT-02's module system |
| MGMT-05 | Hooks replacing CLAUDE.md for dynamic behavior | Architectural evolution -- hooks already exist from v1.2, this makes them the primary behavior mechanism |
| MGMT-08 | Jailbreak/hijacking protection patterns | Security hardening of the hook system; should happen early while the system is well-understood |
| MGMT-10 | Modular injection with better control | Refined injection control building on v1.2's CJS foundation; enables precise capability management |
| MGMT-11 | Session index refactor to SQLite | Replace flat-file session index with SQLite (or similar) to accommodate the depth and breadth of Ledger and Dynamo over time; a proper DB could serve multiple subsystems beyond just Ledger |
| UI-08 | Inline Dynamo visibility in Claude thread | More in-thread visibility of what Dynamo is doing without adding excessive noise; status indicators, memory actions, and system state surfaced contextually |

### v1.4 -- Memory Quality and Agent Foundation

**Goal:** Elevate the quality of stored memories through synthesis, comprehension, and alternative storage backends, while enabling intelligent persistence of user preferences at both global and project scopes. The advanced Inner Voice gains narrative briefings, relationship modeling, and cross-session continuity. Observation synthesis (inspired by Hindsight's reflect pattern) automatically identifies patterns across accumulated knowledge.

**Dependencies:** v1.3 (Inner Voice basic + dual-path operational, intelligence layer and modular injection operational)

#### Ledger Cortex Requirements (new)

| Requirement | Name | Source | Rationale |
|-------------|------|--------|-----------|
| CORTEX-04 | Inner Voice (advanced) | New | Narrative briefings at session start, relationship modeling (user patterns, frustrations, communication style), personality adaptation across contexts. **Implements 5 SECONDARY cognitive theories:** Attention Schema Theory (Graziano) -> full self-model as attention monitor with metacognitive capabilities; Somatic Marker Hypothesis (Damasio) -> affect/valence tagging on knowledge graph entities; Default Mode Network -> session boundary consolidation processing (background batch jobs); Memory Consolidation -> observation synthesis via Hindsight-inspired reflect pattern; Metacognition -> feedback-based self-correction and threshold adjustment. **Plus TERTIARY theories:** Schema Theory (Bartlett, Piaget) -> disposition/context adaptation ("debugging schema," "architecture planning schema" with different injection strategies). Note: Affect-as-Information (Schwarz, TERTIARY, LOW confidence) maps to processing depth modulation but should not be a primary v1.4 deliverable due to unreliable affect detection from text. |
| CORTEX-05 | Enhanced Construction | New | Observation synthesis (batch job, not persistent agent), consolidation runs, improved entity deduplication, conflict detection. Enhances Graphiti integration. |
| CORTEX-06 | Inner Voice persistence (advanced) | New | Cross-session continuity via graph-backed self-model evolution. Self-model and relationship model stored as Graphiti nodes with temporal versioning. JSON cache for hot path reads. Replaces v1.3's JSON-only persistence with graph-backed state, enabling temporal queries on self-model history. |

#### Remaining Requirements

| Requirement | Name | Rationale |
|-------------|------|-----------|
| MENH-03 | Memory synthesis and export | Requires MENH-01's context typing (now via Inner Voice) to know what to synthesize; produces shareable knowledge artifacts |
| MENH-04 | Memory inference and understanding | Builds on Inner Voice intelligence; moves from storage to comprehension. Enhanced by CORTEX-05 observation synthesis. |
| MENH-05 | Flat file support alongside Graph DB | Alternative storage backend for users who cannot run Docker/Neo4j; broadens accessibility |
| MENH-08 | Native or local text embedding model | Removes dependency on external embedding APIs; improves latency and privacy |
| MGMT-06 | Global CC preferences through memories | Requires v1.3's decision engine (now Inner Voice) to correctly scope preference storage |
| MGMT-07 | Project CC preferences through memories | Same dependency as MGMT-06 but project-scoped; natural pair |

### v1.5 -- Dashboard, Visibility, and Agent Coordination

**Goal:** Provide users with visual insight into what Dynamo knows and does through a modular web dashboard, while integrating Cortex agent coordination capabilities. The Claude Agent SDK enables on-demand agent spawning for deep recall operations. A basic Access Agent provides scheduled codebase ingestion beyond what session hooks capture. The connector framework establishes the pluggable interface for future data sources (Claudia-aware).

**Dependencies:** v1.4 (memory quality + Inner Voice advanced + observation synthesis stable enough to display and coordinate)

#### Ledger Cortex Requirements (new)

| Requirement | Name | Source | Rationale |
|-------------|------|--------|-----------|
| CORTEX-07 | Agent coordination | New | Claude Agent SDK integration for on-demand agent spawning. Used for deep recall operations requiring multi-step reasoning. CLI: `dynamo agent status/spawn/stop/logs`. |
| CORTEX-08 | Access Agent (basic) | New | Codebase indexer for background ingestion of full repo (not just files touched in sessions). Scheduled batch job, not persistent agent. |
| CORTEX-09 | Connector framework | New | Pluggable source interface (connect/poll/fetch/getSchema). v1.5 connectors: FileSystem, Session, Graphiti. Claudia-scope connectors (iMessage, Email, etc.) added later without architectural change. |

#### Remaining UI Requirements (unchanged)

| Requirement | Name | Rationale |
|-------------|------|-----------|
| UI-01 | Global, Session, Project, Task views | Core navigation structure; must exist before specialized views |
| UI-02 | Modular and insightful dashboard | Main landing page; requires UI-01's view structure |
| UI-03 | Preload control | Visual control for preload engine (now Inner Voice); requires that engine to exist (v1.3) |
| UI-04 | Memory system config | Settings interface for memory parameters; requires stable memory system (v1.4) |
| UI-05 | Asset management and browser | Browse and manage stored knowledge artifacts; requires MENH-03's export (v1.4) |
| UI-06 | Memory CRUD operations | Direct manipulation of memories; requires mature memory system with quality controls (v1.4) |
| MGMT-04 | TweakCC integration | UI-adjacent tool for Claude Code behavior overrides; ships with dashboard for cohesive UX |

### v2.0 -- Advanced Capabilities

**Goal:** Deliver ambitious features that require significant research, architectural decisions, and a fully mature infrastructure. Multi-agent deliberation protocol enables sophisticated inter-agent reasoning. The domain agent framework provides Claudia-aware extensibility for future domain agents (Finance, Calendar, Home, etc.).

**Dependencies:** v1.5 (stable, visible, well-understood system with agent coordination operational)

| Requirement | Name | Source | Rationale |
|-------------|------|--------|-----------|
| CORTEX-10 | Multi-agent deliberation protocol | New | Typed message envelopes with correlation tracking, priority-based routing, domain tagging. Enables multi-agent reasoning between Inner Voice, Construction, and Access components. |
| CORTEX-11 | Domain agent framework | New | Claudia-aware extensibility: pluggable domain agents, domain-specific extraction templates, disposition configuration per domain. Designs the interface; domain agents themselves are Claudia-scope. |
| MENH-09 | Council-style AI agent deliberation | Absorbed by CORTEX-10 | CORTEX-10 IS the multi-agent deliberation requirement. MENH-09 absorbed. |
| UI-07 | Memory with desktop app and mobile | Existing | Cross-platform UI; requires v1.5's web dashboard as foundation and stable API surface |

## Requirement Index

| Requirement ID | Name | Milestone | Notes |
|----------------|------|-----------|-------|
| STAB-01 | README and rebranding pass | v1.2.1 | Shipped v1.2.1 (2026-03-19) |
| STAB-02 | Archive legacy Python/Bash system | v1.2.1 | Shipped v1.2.1 (2026-03-19) |
| STAB-03 | Exhaustive documentation | v1.2.1 | Shipped v1.2.1 (2026-03-19) |
| STAB-04 | Dynamo CLI integration in CLAUDE.md | v1.2.1 | Shipped v1.2.1 (2026-03-19) |
| STAB-05 | Update/upgrade system | v1.2.1 | Shipped v1.2.1 (2026-03-19) |
| STAB-06 | Architecture and design decision capture | v1.2.1 | Shipped v1.2.1 (2026-03-19) |
| STAB-07 | Fix Neo4j admin browser connectivity | v1.2.1 | Shipped v1.2.1 (2026-03-19) |
| STAB-08 | Directory structure refactor | v1.2.1 | Shipped v1.2.1 (2026-03-19) |
| STAB-09 | Component scope refactor | v1.2.1 | Shipped v1.2.1 (2026-03-19) |
| STAB-10 | Global on/off and dev mode toggles | v1.2.1 | Shipped v1.2.1 (2026-03-19) |
| MENH-01 | Decision engine -- infer context type | v1.3 | Absorbed by CORTEX-01 |
| MENH-02 | Preload engine -- auto inference and injection | v1.3 | Absorbed by CORTEX-01 |
| MENH-03 | Memory synthesis and export | v1.4 | |
| MENH-04 | Memory inference and understanding | v1.4 | Enhanced by CORTEX-05 |
| MENH-05 | Flat file support alongside Graph DB | v1.4 | |
| MENH-06 | Support both API and native Haiku | v1.3 | Prerequisite for CORTEX-01/02 dual-model selection |
| MENH-07 | Support other model choices for curation | v1.3 | Prerequisite for CORTEX-01/02 dual-model selection |
| MENH-08 | Native or local text embedding model | v1.4 | |
| MENH-09 | Council-style AI agent deliberation | v2.0 | Absorbed by CORTEX-10 |
| MENH-10 | Dynamic curation depth | v1.3 | Absorbed by CORTEX-02 |
| MENH-11 | Proactive intelligent ingestion | v1.3 | Absorbed by CORTEX-01 |
| MGMT-01 | Self-contained dependency management | v1.3 | |
| MGMT-02 | Domain-specific on-demand modules | v1.3 | |
| MGMT-03 | CC skill inference and internal use | v1.3 | |
| MGMT-04 | TweakCC integration | v1.5 | |
| MGMT-05 | Hooks replacing CLAUDE.md for dynamic behavior | v1.3 | |
| MGMT-06 | Global CC preferences through memories | v1.4 | |
| MGMT-07 | Project CC preferences through memories | v1.4 | |
| MGMT-08 | Jailbreak/hijacking protection patterns | v1.3 | |
| MGMT-09 | Human cognition patterns as prompt engineering | v1.3 | Moved from v1.4; absorbed by Inner Voice |
| MGMT-10 | Modular injection with better control | v1.3 | |
| MGMT-11 | Session index refactor to SQLite | v1.3 | |
| UI-01 | Global, Session, Project, Task views | v1.5 | |
| UI-02 | Modular and insightful dashboard | v1.5 | |
| UI-03 | Preload control | v1.5 | |
| UI-04 | Memory system config | v1.5 | |
| UI-05 | Asset management and browser | v1.5 | |
| UI-06 | Memory CRUD operations | v1.5 | |
| UI-07 | Memory with desktop app and mobile | v2.0 | |
| UI-08 | Inline Dynamo visibility in Claude thread | v1.3 | |
| CORTEX-01 | Inner Voice (basic) | v1.3 | Smart curation, semantic shift detection, self-model; 7 PRIMARY theories mapped |
| CORTEX-02 | Dual-path routing | v1.3 | Hot path + deliberation path; deterministic sublimation threshold formula |
| CORTEX-03 | Cost monitoring | v1.3 | Budget tracking and enforcement |
| CORTEX-04 | Inner Voice (advanced) | v1.4 | Narrative briefings, relationship modeling; 5 SECONDARY + 2 TERTIARY theories mapped |
| CORTEX-05 | Enhanced Construction | v1.4 | Observation synthesis, consolidation |
| CORTEX-06 | Inner Voice persistence (advanced) | v1.4 | Graph-backed self-model evolution; replaces JSON-only with Graphiti temporal versioning |
| CORTEX-07 | Agent coordination | v1.5 | Claude Agent SDK, on-demand spawning |
| CORTEX-08 | Access Agent (basic) | v1.5 | Codebase indexer, background ingestion |
| CORTEX-09 | Connector framework | v1.5 | Pluggable source interface |
| CORTEX-10 | Multi-agent deliberation protocol | v2.0 | Typed message envelopes, coordination |
| CORTEX-11 | Domain agent framework | v2.0 | Claudia-aware extensibility |

## Guiding Principles

- **Build foundational capabilities first.** The intelligence layer (Inner Voice, dual-path routing) must exist before features that depend on it. v1.3 establishes the smart substrate that v1.4's quality improvements and v1.5's dashboard both require.
- **Memory quality before UI.** Displaying memories in a dashboard is only valuable if those memories are high quality. v1.4's synthesis, comprehension, and preference persistence must mature before v1.5 builds visual interfaces on top of them.
- **Security early, ambition late.** Jailbreak protection (MGMT-08) belongs in v1.3 while the hook system is fresh and well-understood. Multi-agent deliberation (CORTEX-10) belongs in v2.0 where research time and mature infrastructure are available.
- **Self-manageability is non-negotiable.** Every milestone must maintain the core value that Claude Code can install, configure, update, and troubleshoot Dynamo without manual user intervention. Dependency management (MGMT-01) in v1.3 reinforces this principle early.
- **Pair related requirements within milestones.** MENH-06 and MENH-07 (transport flexibility then model selection) are natural pairs in v1.3. MGMT-06 and MGMT-07 (global then project preferences) are natural pairs in v1.4. Pairing reduces context-switching cost and enables shared infrastructure.
- **Prove before scaling.** The Inner Voice must demonstrably improve memory quality in v1.3 before investing in multi-agent coordination in v1.5. Each Cortex component must justify its cost and complexity through measured improvement.
- **Agents are expensive; functions are cheap.** Default to deterministic CJS functions. Escalate to LLM agents only when reasoning genuinely adds value. The Infrastructure Agent is deterministic tooling, not an LLM agent.
- **Dual-path is non-negotiable.** Every memory operation must route through the hot path (fast, cheap, deterministic) or deliberation path (slow, expensive, intelligent). No operation should use the deliberation path by default.
- **Claudia-aware, not Claudia-scoped.** Design interfaces for extensibility (connector framework, message envelopes, domain templates) but only build what Dynamo needs now. Every architectural decision should support Claudia's eventual addition without building Claudia-scope functionality prematurely.

---
*Master Roadmap created: 2026-03-18*
*Last updated: 2026-03-19 -- v1.2.1 shipped, milestone marked complete*
*Source: .planning/research/LEDGER-CORTEX-ANALYSIS.md + .planning/research/INNER-VOICE-SPEC.md*
