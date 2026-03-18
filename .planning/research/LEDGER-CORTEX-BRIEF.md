# Ledger Cortex: Research Brief

**Date:** 2026-03-18
**Status:** Pre-research — awaiting GSD research mission
**Origin:** Discussion with user about evolving Dynamo's Ledger into a multi-agent cognitive memory system, informed by Synix article analysis of 8 agent memory architectures.

## Strategic Context: Dynamo → Claudia

Dynamo is the structured platform and meta-architecture that provides control and functionality through its children systems (Ledger, Switchboard, Core). Everything Dynamo builds is designed to be extensible.

**Claudia** is the long-term vision: a full personal AI assistant powered by Dynamo, with a unified personality across all surfaces (Dashboard, Claude Code, Desktop Claude, mobile). Claudia manages personal intelligence (iMessages, email, calendar, bank, files, contacts, chat histories), external intelligence (Reddit, GitHub, markets, web sources), scheduled tasks, finance, cooking, groceries (with browser automation), home automation, notification management, and file system curation — all backed by Dynamo's Ledger as the universal memory layer.

**This research is scoped to Dynamo, not Claudia.** The Ledger Cortex must be valuable on its own within Dynamo's Claude Code context first. But every architectural decision should be **Claudia-aware**: designed so that the patterns, protocols, and infrastructure naturally extend to support Claudia when that project begins.

### The Claudia-Aware Design Principle

| Component | Dynamo v1 Scope | Claudia Extension |
|-----------|----------------|-------------------|
| Inner Voice | Ledger's cognitive layer within CC sessions | Becomes Claudia herself — the unified personality |
| Access Agent | Sources Dynamo already touches (code repos, file system, session history) | Expands to 14+ personal sources + external intelligence |
| Deliberation protocol | Coordinates three memory layer agents | Coordinates domain agents (Finance, Calendar, Home, etc.) |
| Infrastructure layer | Single-surface (Claude Code) | Multi-surface sync (Dashboard, CC, Desktop, mobile) |
| Agent naming | Technical names (Access Agent, Construction Agent) | Human names (each agent gets a persona) |
| Dashboard | Not in Dynamo scope | Claudia's primary visual surface — generates data visualizations on demand |

### Domain Agents (Claudia-scope, not Dynamo-scope)

Each domain gets a named agent specialist that Claudia directs. These are NOT part of the Ledger Cortex research, but the Cortex architecture must support their eventual addition:

- Personal Intelligence: iMessages, Discord, Email, Notes, Calendar, Slack, Bank, Bills, Recipes, Contacts, Code repos, File systems, AI chat histories, Apple Notes
- External Intelligence: Reddit, GitHub, Financial Markets, user-managed web sources
- Intelligence Processing: On-demand data visualization (Grafana/Superset-style, built by Claudia)
- Scheduled Tasks, File System Curation, Notification Management, Email Management, Calendar Management, Finance Management, Cooking/Groceries (browser automation), Home Automation

The Ledger Cortex's connector framework, deliberation protocol, and agent lifecycle management must be designed so domain agents plug in without architectural changes.

---

## Vision Statement

Transform Dynamo's Ledger from a hook-driven memory pipeline (search → curate → inject) into a **multi-agent cognitive cortex** — a living system with dedicated AI agents managing distinct memory layers, coordinated by an Inner Voice agent that mimics human subconscious memory behavior. This positions Dynamo as the platform backbone for Claudia and any future extension.

## The Insight

The Synix article identifies three memory layers that the market treats as competing approaches:
1. **Data Access** — source normalization and ingestion (Hyperspell model)
2. **Knowledge Construction** — extraction, deduplication, temporal tracking (Graphiti/Hindsight model)
3. **Infrastructure** — ACID transactions, time travel, consistency (Tacnode model)

The Ledger Cortex vision treats these as **complementary layers that need intelligent orchestration**, not competing paradigms. Each layer gets a dedicated agent (headless Claude Code instance) as its manager, empowered with specialized tooling (LangGraph, Cortex, Memory Graph, etc.).

## Architecture Overview

### The Inner Voice

**NOTE: This component demands its own full academic-level treatment to define properly. What follows is the architectural framing; a dedicated specification document should be produced before implementation.**

The Inner Voice is NOT an enhanced retrieval agent or smarter curation layer. It is a **continuous parallel cognitive process** — a dissociated mental process that runs simultaneously alongside the active conversation, processing at a fundamentally different level of abstraction than the main session.

**The Dual-Process Model:**

A human engaged in conversation has two cognitive processes running in parallel:
1. **Active cognition** — the actual words being said, the task being performed, the sequential logic of the exchange
2. **Experiential processing** — the mind processing the *situation being experienced*, framed by passive and active associations spanning emotion and circumstance. This process defines both how information is contextualized AND what sublimates through into the train of thought or gets tagged for later relation via cascading memory associations.

The Inner Voice IS process #2. The main Claude session IS process #1. They run in parallel.

| | Main Session | Inner Voice |
|---|---|---|
| **Processes** | Words, tasks, code, instructions | The *experience* — emotional context, relational state, associative resonance |
| **Frame** | What is being said/done | What is being *felt*, what this *means* relationally, what associations are firing |
| **Output** | Responses, tool calls, code | Selective sublimation — only what crosses an activation threshold enters the main thread |
| **Temporal** | Sequential, turn-by-turn | Continuous, parallel, maintaining its own evolving state |
| **Memory access** | Active recall (directed queries) | Cascading associations — one memory triggers another triggers another, tagged for relevance |

**The Sublimation Model:**

The Inner Voice processes *everything* in the conversation continuously. Most of that processing stays internal to the Inner Voice's own state. Only products that cross a relevance/activation threshold **sublimate** into the main thread's context. This mirrors how human subconscious memory works:

- A human doesn't consciously decide "I should recall that my friend lost their job" — that association *fires* because the emotional/relational context activated it, and it sublimates into conscious thought only if the activation threshold is met
- What sublimates isn't raw facts — it's contextually shaped, emotionally weighted, relationally framed
- Some things don't sublimate now but get **tagged for later** — cascading associations that might fire later when the conversation shifts
- The Inner Voice maintains awareness of what it has surfaced, what it is holding, and what it has deprioritized

**Operational Modes:**

- **Preconscious loading** (session start): Assess user, intent, emotional/relational context. Generate a narrative briefing that primes the main session to behave as if it remembers — not a fact dump, but an experiential frame.
- **Continuous experiential processing** (throughout session): Maintain parallel awareness of the conversation. Process each exchange not for its literal content but for its emotional, relational, and associative dimensions. Update internal state continuously.
- **Selective sublimation** (threshold-driven): When associative activation crosses threshold, inject contextually shaped intuitions into the main thread. Include the memory map (where the information lives) so the main session can do targeted active recall if needed.
- **Cascading association tagging** (background): Tag associations that haven't reached sublimation threshold but are building activation. These may fire later as conversation context shifts.
- **Active recall direction** (on-demand): When the main session explicitly needs deep retrieval, the Inner Voice knows WHERE to look and which layer agents to involve.
- **Relational modeling** (continuous): Maintains a model of its relationship with the user — patterns, frustrations, communication style, current emotional state. This model shapes HOW sublimated content is framed.

**Key design principle:** The Inner Voice speaks TO the Claude session. It is the sole interface between the Ledger team and the parent thread. The main session never sees raw database results — it sees contextually shaped, experientially framed, selectively sublimated injections. Most of what the Inner Voice processes remains below the surface.

**Relevant theoretical frameworks for the specification document:**
- Dual-process theory (Kahneman's System 1/System 2)
- Global Workspace Theory (Baars) — consciousness as selective spotlight over subconscious processing
- Spreading activation networks — associative memory where one node activates neighbors
- Predictive processing — the brain as a prediction engine that surfaces only prediction errors

In Dynamo scope, the Inner Voice is the Ledger's cognitive layer. In Claudia scope, it becomes Claudia herself.

### Layer Agents

Each layer is managed by a dedicated headless Claude Code instance with specialized tooling:

**Access Agent** (Data Access Layer)
- Unified source ingestion pipeline — "hoover up whatever the user directs"
- Normalize heterogeneous data: files, APIs, email, calendar, receipts, docs, chat logs, code repos, bookmarks
- Route ingested data to the Construction Agent with metadata
- Handle re-crawling, source monitoring, schema understanding
- Draws from BI pipeline patterns (ETL/ELT)
- Potential tooling: Hyperspell-v2 or similar, custom connectors
- **Claudia-aware:** Connector framework must be pluggable — v1 handles code/file/session sources, but the interface supports adding iMessage, bank, email connectors later without architectural change

**Construction Agent** (Knowledge Construction Layer)
- Extract entities, relationships, and temporal facts from ingested data
- Deduplicate, resolve conflicts, version facts
- Track bi-temporal relationships (when was it true, when did we learn it)
- Consolidation runs: periodically re-evaluate the graph, compress, identify patterns
- Powered by: Graphiti + Hindsight (or similar consolidation system)
- Potential tooling: LangGraph, Cortex, Memory Graph
- **Claudia-aware:** Must handle radically different domains (code architecture vs. grocery lists vs. financial transactions) without domain-specific hardcoding

**Infrastructure Agent** (Infrastructure Layer)
- ACID guarantees across all memory operations
- Time travel queries ("what did we know last Tuesday?")
- Schema evolution and migration
- Consistency enforcement
- Potential tooling: OSS alternative to Tacnode, PostgreSQL with temporal extensions, or purpose-built
- **Claudia-aware:** Must support multi-surface sync (single writer, multiple readers) for eventual Dashboard/Desktop/mobile access

### Inter-Agent Deliberation

The agents don't just pass data through a pipeline — they reason together:
- Access Agent ingests a bank statement → Construction Agent resolves against existing financial entities → Infrastructure Agent ensures ACID write
- Construction Agent detects conflict ("employer changed but no resignation event") → queries Access Agent for corroborating signals before committing
- Inner Voice observes that the user hasn't mentioned a project in weeks → signals Construction Agent to deprioritize those entities in consolidation

**Claudia-aware:** The deliberation protocol must support adding domain agents (Finance, Calendar, Home) as deliberation participants without protocol changes.

### Dual-Path Architecture (Cost Control)

| Path | When | Who | Latency | Cost |
|------|------|-----|---------|------|
| Hot path | Most reads, intuitions | Inner Voice + cached indexes | <1s | Minimal |
| Deliberation path | Writes, conflicts, deep recall | Inner Voice + Layer Agent(s) | 2-10s | Full agent cost |

Most interactions stay on the hot path. Layer agents only spin up for ingestion, conflict resolution, and deep recall. This prevents "lighting money on fire."

## Relationship to Current Dynamo Architecture

### What stays
- **Switchboard** — Management/ops. Untouched. Still owns hook registration, diagnostics, sync, stack, CLI. (Claudia-aware: Switchboard eventually expands to manage domain agents, but that's Claudia-scope.)
- **Core substrate** — Shared foundation. Extends to support agent lifecycle management.
- **Hook system** — Still the integration mechanism with Claude Code. But hooks now feed the Inner Voice rather than directly calling search/curate functions.
- **Graphiti/Neo4j** — Stays as the knowledge graph backend. Becomes one tool in the Construction Agent's toolbox. **Near-term improvement:** Enable dual-model selection (Sonnet or Haiku) so Graphiti can choose the appropriate model based on task complexity (e.g., Haiku for simple entity extraction, Sonnet for complex relationship inference).
- **Dynamo CLI** — Still the user-facing interface. Routes to Switchboard for management, to Inner Voice for memory operations.

### What transforms
- **Ledger** — Evolves from a function-calling pipeline to an agent-managed cognitive system.
- **Curation pipeline** — Subsumed by the Inner Voice's intuition generation. Haiku curation becomes one technique the Inner Voice might use, not the entire approach.
- **Session hooks** — Still fire, but their handlers evolve from "search → curate → inject" to "feed Inner Voice → Inner Voice generates injection."
- **Search/episodes/sessions modules** — Become tools available to the Layer Agents rather than directly called by hooks.

### What's new
- Inner Voice Agent (personality, consciousness, relational modeling)
- Access Agent (unified source ingestion, BI-style pipeline)
- Construction Agent (knowledge building with Graphiti + Hindsight)
- Infrastructure Agent (ACID, time travel, consistency)
- Inter-agent deliberation protocol
- Agent lifecycle management (spawn, warm, teardown)
- Dual-path routing (hot vs. deliberation)

## Requirements Impact

### Existing requirements absorbed by this vision

| Requirement | Current Milestone | How Absorbed |
|-------------|-------------------|--------------|
| MENH-01 (Decision engine) | v1.3 | Inner Voice's context inference |
| MENH-02 (Preload engine) | v1.3 | Inner Voice's preconscious loading |
| MENH-04 (Memory inference) | v1.4 | Inner Voice's long-term recollection + Construction Agent |
| MENH-09 (Council-style deliberation) | v2.0 | Inter-agent deliberation protocol |
| MENH-10 (Dynamic curation depth) | v1.3 | Inner Voice's intuition generation |
| MENH-11 (Proactive ingestion) | v1.3 | Access Agent |
| MGMT-09 (Human cognition patterns) | v1.4 | Inner Voice's cognitive architecture |

### Existing requirements still independent

| Requirement | Current Milestone | Why Independent |
|-------------|-------------------|-----------------|
| MENH-03 (Synthesis/export) | v1.4 | Output format, not architecture |
| MENH-05 (Flat file support) | v1.4 | Infrastructure Agent could support this |
| MENH-06/07 (Transport/model flexibility) | v1.3 | Still needed for all agents. **Immediate action:** Enable Graphiti dual-model selection (Sonnet/Haiku based on task complexity) as part of MENH-06/07 work |
| MENH-08 (Local embeddings) | v1.4 | Infrastructure concern |
| MGMT-* (most) | v1.3-v1.4 | Switchboard-scoped, unaffected |
| UI-* (all) | v1.5 | Visualization layer, orthogonal |
| STAB-* (remaining) | v1.2.1 | Foundation work, prerequisite |

### New requirements introduced

These need to be researched and scoped:

1. **Inner Voice agent design** — personality engineering, cognitive loop, injection protocol
2. **Access Agent design** — pluggable connector framework, data normalization, routing logic
3. **Construction Agent design** — Graphiti + Hindsight integration, consolidation strategy
4. **Infrastructure Agent design** — ACID guarantees, temporal queries, OSS stack selection
5. **Inter-agent deliberation protocol** — message format, coordination model, conflict resolution, extensible for future domain agents
6. **Headless CC instance management** — spawning, warm/cold state, lifecycle, cost monitoring
7. **Dual-path routing** — hot path caching, deliberation triggers, latency budget
8. **BI-style ingestion pipeline** — pluggable source connectors, ETL/ELT patterns, schema mapping
9. **Inner Voice persistence** — self-model storage, relationship model evolution, cross-session continuity
10. **Cost model** — per-session cost projections, optimization strategies, model selection per agent

## Research Questions

### Feasibility
1. Can headless Claude Code instances run as persistent/semi-persistent agents? What are the API/SDK options?
2. What's the realistic latency budget for inter-agent deliberation?
3. Can Graphiti and Hindsight coexist in the Construction layer? What's the integration surface?
4. What OSS options exist for the Infrastructure layer (ACID + time travel + semantic)?

### Architecture
5. What orchestration framework best fits? LangGraph vs. simpler message-passing vs. custom?
6. How should the Inner Voice monitor conversation flow? Hook snapshots vs. streaming vs. periodic summary?
7. What triggers an intuition injection? Time-based? Semantic shift? Tool use patterns?
8. How does the Inner Voice persist its self-model and relationship model?

### Cost and Scale
9. What does this cost per session/day/month at realistic usage patterns?
10. Which agents need full Claude reasoning vs. smaller/fine-tuned models?
11. Where can deterministic pipelines replace LLM inference without losing capability?
12. How does the BI-style ingestion pipeline handle high-volume sources without runaway costs?

### Integration
13. How does this fit within Dynamo's existing Ledger/Switchboard/Core boundaries?
14. What changes to the hook system are needed?
15. How does the Dynamo CLI evolve to support agent management?
16. What's the migration path from current Ledger to Cortex architecture?

### Domain Breadth (Claudia-aware)
17. How does the system handle radically different domains (code vs. groceries vs. finance)?
18. Does the Construction Agent need domain-specific extraction strategies, or can it be domain-agnostic?
19. How does the Inner Voice's personality adapt across domain contexts?
20. What interface must the deliberation protocol expose for future domain agents to plug in?
21. What does the connector interface look like so new source types (iMessage, bank API, etc.) can be added without architectural changes?

## Milestone Impact Assessment (To Be Determined by Research)

**Option A: New milestone (v1.3 becomes Ledger Cortex)**
- Rewrite v1.3 requirements to reflect the cortex architecture
- Absorbs MENH-01, 02, 04, 09, 10, 11 and MGMT-09
- v1.4/v2.0 requirements shift accordingly
- Pro: Clean architectural pivot point. Con: Delays other v1.3 items.

**Option B: New milestone inserted (v1.3 stays, Cortex becomes v1.6 or v2.0)**
- Keep v1.3 Intelligence and Modularity as incremental improvements
- Cortex becomes the major architectural evolution later
- Pro: Incremental progress continues. Con: May build throwaway work in v1.3.

**Option C: Phased integration across milestones**
- Inner Voice prototype in v1.3 (replaces MENH-01/02)
- Layer Agents in v1.4 (replaces MENH-04/09)
- Full Cortex in v2.0
- Pro: Gradual evolution. Con: May compromise the unified vision.

**Recommendation:** Research should produce enough clarity to make this decision. The brief leans toward Option A (clean pivot) but the research may reveal feasibility constraints that favor Option C.

## Relationship to Claudia (Separate Project)

The Ledger Cortex is Dynamo-scoped work. Claudia is a separate, much larger project that will be built ON TOP of Dynamo. The relationship:

```
Claudia (Personal AI Assistant — separate project)
  └── Powered by Dynamo (Platform)
        ├── Ledger Cortex (memory spine — this research)
        ├── Switchboard (management — exists)
        └── Core (substrate — exists)
```

Claudia's full scope includes:
- Multi-surface UI (Dashboard, Desktop, Mobile)
- 14+ personal data source integrations
- External intelligence monitoring (Reddit, GitHub, markets)
- Domain management (Finance, Calendar, Home, Cooking, Groceries)
- Browser automation for task execution
- Notification management and spam reduction
- File system curation and organization
- Scheduled task engine
- On-demand data visualization generation

None of this is in scope for this research. But the Cortex architecture must not preclude any of it.

---
*This brief is input for GSD research mission. It should be consumed by the research phase to produce a comprehensive technical analysis with clear go/no-go recommendations and milestone impact assessment.*
