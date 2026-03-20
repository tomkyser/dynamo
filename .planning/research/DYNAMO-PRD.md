# Dynamo: Product Requirements Document (Claude Code Edition)

**Status:** Strategic specification
**Date:** 2026-03-19
**Platform:** Claude Code (Max subscription)
**Version scope:** v1.3 milestoned delivery

---

## 1. Vision and Purpose

### 1.1 What Dynamo Is

Dynamo is a Claude Code power-user platform for persistent memory and self-management. It transforms ephemeral AI sessions into a continuous, contextually aware experience by maintaining a knowledge graph that accumulates understanding across sessions, projects, and time.

The current system (v1.2.1) provides automatic context injection, prompt augmentation, change tracking, pre-compaction preservation, session summarization, and CLI-based memory operations. It is functional, reliable, and self-managing.

### 1.2 The Evolution

Dynamo evolves from a hook-driven memory pipeline (search, curate, inject) into a six-subsystem cognitive architecture. This evolution is not a rewrite -- it is an incremental transformation where each subsystem emerges from existing code through restructuring, boundary enforcement, and capability addition.

The six subsystems are:

| Subsystem | Role | Current Code Origin |
|-----------|------|-------------------|
| **Dynamo** | System wrapper -- CLI router, shared resources, API surface | `dynamo/dynamo.cjs`, `dynamo/core.cjs`, `config.json`, `VERSION` |
| **Switchboard** | Dispatcher -- hook routing, install/sync/update lifecycle, internal I/O | `dynamo/hooks/dynamo-hooks.cjs`, `switchboard/install.cjs`, `switchboard/sync.cjs`, `switchboard/update.cjs` |
| **Ledger** | Data Construction -- episode creation, data shaping, write operations | `ledger/episodes.cjs`, write-side `ledger/curation.cjs` |
| **Assay** | Data Access -- search, session queries, entity inspection, read operations | `ledger/search.cjs`, `ledger/sessions.cjs` |
| **Terminus** | Data Infrastructure -- MCP transport, Docker stack, health/diagnostics, migrations | `ledger/mcp-client.cjs`, `switchboard/stack.cjs`, `switchboard/health-check.cjs`, `switchboard/diagnose.cjs` |
| **Reverie** | Inner Voice -- cognitive processing, dual-path routing, activation management, REM consolidation | New: `inner-voice.cjs`, `dual-path.cjs`, `activation.cjs` + absorbed `curation.cjs` intelligence |

### 1.3 The Claudia-Aware Design Principle

Dynamo is designed for extensibility. The long-term vision is Claudia: a full personal AI assistant powered by Dynamo, with a unified personality across all surfaces. Every architectural decision in Dynamo supports Claudia's eventual addition without building Claudia-scope functionality prematurely.

**Design for extensibility, build for now.** The connector framework, message envelopes, domain templates, and subsystem interfaces all support future expansion. But only what Dynamo needs today is built.

### 1.4 Core Value

**Every capability must be self-manageable by Claude Code without manual user config file edits.** This is the non-negotiable principle. Install, configure, update, troubleshoot -- all through the `dynamo` CLI or through automated hook processing. The user never edits a JSON config file by hand.

---

## 2. Platform Architecture

### 2.1 The `cc/` Adapter Pattern

Dynamo's architecture separates platform-agnostic subsystem logic from platform-specific integration through the `cc/` directory. This is the platform adapter pattern: `cc/` isolates all Claude Code-specific integration. Future `/web`, `/api`, `/mcp` implementations could be added without touching subsystem logic.

The `cc/` directory contains:

| Directory/File | Purpose |
|---------------|---------|
| `cc/hooks/` | Hook dispatcher + hook event definitions (Claude Code specific) |
| `cc/agents/` | Custom subagent definitions (e.g., `inner-voice.md`) |
| `cc/skills/` | Loadable capability modules (future) |
| `cc/rules/` | Project-specific rule files (future) |
| `cc/prompts/` | Curation, summary, and Inner Voice prompt templates |
| `cc/CLAUDE-TEMPLATE.MD` | Deployed CLAUDE.md template |
| `cc/settings-hooks.json` | Hook definitions for settings.json |
| `cc/dynamo-cc.cjs` | Claude Code-specific integration module |

### 2.2 Target Directory Structure

```
dynamo/claude-code/               # BASE PLATFORM
  lib/                            # Shared substrate
    core.cjs                      # Configuration, paths, utilities
    scope.cjs                     # Scope constants and validation
    pretty.cjs                    # Human-readable output formatters
  shared/                         # Exposed resources for subsystems
    config.json                   # Runtime configuration
    VERSION                       # Semantic version
  health/                         # Top-level health command delegation
  migrations/                     # Migration scripts (Terminus-managed)
  cc/                             # Claude Code platform adapter
    hooks/                        # dynamo-hooks.cjs dispatcher + definitions
    agents/                       # inner-voice.md subagent definition
    skills/                       # (future: loadable capability modules)
    rules/                        # (future: project-specific rules)
    prompts/                      # Curation, summary, IV prompt templates
    CLAUDE-TEMPLATE.MD            # Deployed CLAUDE.md template
    settings-hooks.json           # Hook definitions for settings.json
    dynamo-cc.cjs                 # CC-specific integration
  subsystems/
    switchboard/                  # install, sync, update, update-check
    assay/                        # search, sessions (read operations)
    ledger/                       # episodes, format (write operations)
    terminus/                     # mcp-client, stack, health-check, diagnose, verify-memory, stages, migrate
    reverie/                      # inner-voice, dual-path, activation, curation (cognitive processing)
  dynamo.cjs                      # CLI router entry point
```

### 2.3 Shared Substrate

The `lib/` directory contains modules shared across all subsystems:

- **core.cjs** -- Configuration loading, path resolution, utility functions, re-exports for backward compatibility
- **scope.cjs** -- Scope constants and validation (currently in `ledger/scope.cjs`, moves to shared)
- **pretty.cjs** -- Human-readable output formatters (currently in `switchboard/pretty.cjs`, moves to shared)

These modules follow the zero-external-dependency constraint: pure Node.js built-ins + CJS. No npm, no package.json.

---

## 3. Subsystem Overview

### 3.1 Subsystem Responsibilities and Boundaries

| Subsystem | Owns | Does NOT Own |
|-----------|------|-------------|
| **Dynamo** | CLI router, shared resources (lib/, shared/), API surface, command parsing and routing, MCP server registration | Subsystem-internal logic, hook handling, data operations |
| **Switchboard** | Hook dispatcher (routes events to handlers), install/sync/update/toggle lifecycle, settings.json management, event routing | What hook handlers DO with events (handlers belong to their subsystems), data transport, data access, data construction |
| **Ledger** | Episode creation (addEpisode), write-side data formatting, PostToolUse capture handler (decides WHAT to capture) | Search (Assay), session queries (Assay), MCP transport (Terminus), hook dispatching (Switchboard), cognitive processing (Reverie) |
| **Assay** | Combined/fact/node search, session listing/viewing/labeling/backfill, entity and edge inspection | Writing data (Ledger), transport (Terminus), cognitive processing (Reverie), curation/formatting for injection (Reverie) |
| **Terminus** | MCP client (JSON-RPC transport), Docker stack lifecycle, 6-stage health check, 13-stage diagnostics, pipeline verification, migration harness | What data to write (Ledger), what data to read (Assay), when to read/write (Reverie/Switchboard), CLI routing (Dynamo) |
| **Reverie** | Cognitive processing pipeline, dual-path routing, activation map management, self-model and relationship model, injection formatting, Inner Voice state files, custom subagent definition, REM consolidation, hook handler logic for cognitive events | Data transport (Terminus), raw data writes (Ledger), raw data reads (Assay), hook dispatching (Switchboard), CLI routing (Dynamo) |

### 3.2 Interface Pattern

The data flow between subsystems follows strict directional rules:

```
                     Dynamo (CLI/API entry point)
                       |
                       | routes commands to subsystems
                       v
              Switchboard (Dispatcher)
              |         |         |
              | events  | events  | lifecycle ops
              v         v         v
          Reverie    Ledger    [install/sync/update]
          |     |      |
     reads|     |writes|writes
          v     v      v
         Assay       Terminus (transport)
          |            ^   ^
     reads|            |   |
          +------------+   |
                           |
                    Knowledge Graph
```

**Boundary rules:**

1. **Ledger does NOT read.** All read operations go through Assay.
2. **Assay does NOT write.** All write operations go through Ledger.
3. **Reverie reads through Assay and writes through Ledger.** Reverie is the cognitive layer that decides what to read and what to write, but it delegates the actual operations to the appropriate subsystem.
4. **Switchboard dispatches but does not handle.** Switchboard routes hook events to handlers, but the handler logic lives in the owning subsystem (Reverie owns cognitive hooks, Ledger owns capture hooks).
5. **Terminus is stateless transport.** It provides the pipe between subsystems and the knowledge graph. It does not decide what flows through the pipe.

### 3.3 The Six Subsystems

#### Dynamo (System Wrapper)

The orchestration layer. Dynamo owns the CLI entry point (`dynamo.cjs`), shared resources (`lib/`, `shared/`), and command routing. It is the public API surface -- all user commands enter through Dynamo and are routed to the appropriate subsystem.

Dynamo also owns the MCP server registration (registering the Graphiti MCP server with Claude Code) and configuration management (generating `config.json` from environment variables).

#### Switchboard (Dispatcher and Operations)

Switchboard has two responsibilities:

1. **Hook dispatching.** When Claude Code sends a hook event (SessionStart, UserPromptSubmit, PostToolUse, PreCompact, Stop), Switchboard's dispatcher (`dynamo-hooks.cjs`) receives the event, checks the toggle gate, detects the project, builds the scope, and routes to the appropriate handler in the owning subsystem.

2. **System lifecycle operations.** Install (deploy files, generate config, merge settings, register MCP, retire legacy, health check), sync (bidirectional content-based comparison between repo and deployment), update (backup, pull, migrate, verify, auto-rollback), and toggle (enable/disable the entire system).

**Key distinction:** Switchboard dispatches events but does not implement the handler logic. The handler for UserPromptSubmit lives in Reverie (cognitive processing), not in Switchboard. Switchboard is the nervous system; the organs (subsystems) process the signals.

#### Ledger (Data Construction)

Ledger narrows from its current broad scope (all memory operations) to data construction only. It owns:

- **Episode creation** -- `addEpisode(content, scope, metadata)` creates knowledge graph episodes through Terminus transport
- **PostToolUse capture** -- the handler that decides what to extract from file changes and calls `addEpisode`
- **Write-side formatting** -- minimal data shaping before write (not the intelligent curation -- that moves to Reverie)

#### Assay (Data Access)

Assay is a new subsystem created by splitting read operations out of Ledger. It owns:

- **Search** -- combined, fact, and node search across the knowledge graph
- **Session management** -- session listing, viewing, labeling, backfill
- **Entity inspection** -- entity and edge detail retrieval

Assay is a pure read layer. It never modifies the knowledge graph. All write operations go through Ledger.

#### Terminus (Data Infrastructure)

Terminus owns all data infrastructure. It is the pipe between subsystems and the knowledge graph:

- **MCP client** -- JSON-RPC transport to the Graphiti MCP server, SSE parsing, timeout handling
- **Docker stack** -- start with health wait, stop with graceful shutdown
- **Health monitoring** -- 6-stage health check (Docker, Neo4j, API, MCP, env, canary)
- **Diagnostics** -- 13-stage deep system inspection
- **Pipeline verification** -- end-to-end memory pipeline testing
- **Migrations** -- version comparison, sequential execution, boundary filtering

Terminus is stateless. It provides transport functions that Ledger and Assay call; it provides health/diagnostic functions that Switchboard/Dynamo call. It does not decide what data flows through it.

#### Reverie (Inner Voice)

Reverie is the cognitive processing engine. It replaces the classic curation pipeline with context-aware, personality-driven memory injection. See INNER-VOICE-ABSTRACT.md for the platform-agnostic concept definition.

Reverie owns:

- **Cognitive processing pipeline** -- the per-hook processing logic (entity extraction, activation management, threshold evaluation, injection generation)
- **Dual-path routing** -- deterministic path selection between hot path and deliberation path
- **Activation map management** -- spreading activation, decay, convergence detection
- **Self-model and relationship model** -- persistent models of the user's attention state, communication preferences, and working patterns
- **Injection formatting** -- transforming processing results into concise, contextually shaped injections
- **Custom subagent definition** -- the `inner-voice.md` subagent for deliberation path processing
- **REM consolidation** -- session-end synthesis, state preservation, observation extraction
- **Hook handler logic** -- the actual processing for UserPromptSubmit, SessionStart, Stop, PreCompact (dispatched by Switchboard, handled by Reverie)

Reverie implements the hybrid architecture: CJS command hooks for the latency-critical hot path (deterministic processing + `additionalContext` injection) and custom subagents for the latency-tolerant deliberation and REM consolidation paths.

---

## 4. User Value Proposition

### 4.1 Current Value (v1.2.1)

What Dynamo provides today:

- **Automatic context injection** -- every session starts with relevant preferences, project context, and recent session summaries from the knowledge graph
- **Prompt augmentation** -- every user prompt is enriched with semantically relevant memories before the AI processes it
- **Change tracking** -- file edits are captured as episodes for later retrieval
- **Pre-compaction preservation** -- before context compression, key knowledge is extracted and re-injected
- **Session summarization** -- session-end summaries stored in both project and session scopes
- **CLI memory operations** -- search, store, recall, inspect, and manage knowledge graph data
- **Full self-management** -- install, update, sync, diagnose, and troubleshoot through the CLI

### 4.2 v1.3 Value (Target)

What Dynamo will provide with the six-subsystem architecture and Reverie:

- **Intelligent context injection** -- the Inner Voice replaces mechanical curation with context-aware, personality-driven injection. Injections are timed by surprise (semantic shift detection), not by schedule. Content is integrated with relational context, not formatted as search results.
- **Dual-path architecture** -- 95% of operations stay on the fast, deterministic hot path. Subagent-powered reasoning fires only when genuine complexity demands it.
- **Self-model persistence** -- the system maintains an evolving model of the user's attention state, communication preferences, and working patterns across sessions.
- **Session-start briefings** -- narrative context (factual in v1.3, relational in later milestones) that primes the AI session to behave as if it genuinely remembers.
- **Session-end synthesis** -- REM consolidation that transforms raw session data into consolidated knowledge, improving future sessions.
- **Operational monitoring** -- subagent spawn tracking with rate limit awareness and graceful degradation.

### 4.3 Future Value (Post-v1.3)

Capabilities that the architecture supports but that are delivered in later milestones:

- **Narrative briefings** with relational framing (how the user felt about past work, not just what they did)
- **Relationship modeling** -- the system adapts its communication based on accumulated understanding of the user's patterns
- **Observation synthesis** -- automatic pattern extraction from accumulated knowledge ("user consistently refactors toward single-responsibility after initial implementation")
- **Agent coordination** -- on-demand spawning of specialized subagents for deep recall operations
- **Connector framework** -- pluggable data source integration for codebase indexing and (eventually) personal data sources
- **Visual dashboard** -- web-based interface for browsing, managing, and understanding the knowledge graph

---

## 5. Feature Roadmap

The roadmap uses v1.3 as the sole planned version with milestoned iterations (1.3-M1 through 1.3-M7). Each milestone gates the next: a milestone must prove its value before the next one proceeds. See MASTER-ROADMAP.md for full requirement details.

### 5.1 Milestone Structure

| Milestone | Theme | Key Deliverables |
|-----------|-------|-----------------|
| **1.3-M1** | Foundation and Infrastructure Refactor | Directory restructure to 6-subsystem architecture; transport flexibility (MENH-06/07); dependency management (MGMT-01); jailbreak protection (MGMT-08); SQLite session index (MGMT-11) |
| **1.3-M2** | Core Intelligence | Inner Voice basic (CORTEX-01); dual-path routing (CORTEX-02); operational monitoring (CORTEX-03); hooks as primary behavior (MGMT-05); modular injection control (MGMT-10) |
| **1.3-M3** | Management and Visibility | On-demand modules (MGMT-02); skill inference (MGMT-03); inline visibility (UI-08) |
| **1.3-M4** | Advanced Intelligence | Inner Voice advanced (CORTEX-04); enhanced construction (CORTEX-05); IV persistence advanced (CORTEX-06); local embeddings (MENH-08); global/project preferences (MGMT-06/07) |
| **1.3-M5** | Platform Expansion | Memory synthesis/export (MENH-03); memory inference (MENH-04); flat file support (MENH-05); agent coordination (CORTEX-07); access agent (CORTEX-08); connector framework (CORTEX-09) |
| **1.3-M6** | Dashboard and UI | Dashboard suite (UI-01 through UI-06); TweakCC (MGMT-04) |
| **1.3-M7** | Advanced Capabilities | Multi-agent deliberation (CORTEX-10); domain agent framework (CORTEX-11) |

### 5.2 Milestone Dependencies

```
1.3-M1 (Foundation) --- prerequisite for all subsequent milestones
    |
    v
1.3-M2 (Core Intelligence) --- Inner Voice must prove value
    |
    v
1.3-M3 (Management) --- parallel with M4, gates M5
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

### 5.3 Deferred Items

Items with no assigned target version, to be evaluated after v1.3:

- **UI-07** (Desktop/mobile interface) -- requires web dashboard as foundation
- Items the user may choose to defer during execution based on priority and value assessment

---

## 6. Non-Functional Requirements

### 6.1 Latency

| Operation | Target | Mechanism |
|-----------|--------|-----------|
| Hot path (UserPromptSubmit) | <500ms | Deterministic processing + cached state + `additionalContext` injection |
| Deliberation path | <2s | Custom subagent (Max subscription) |
| Session start briefing | <4s | Custom subagent with Sonnet model (acceptable for session start) |
| PostToolUse capture | <200ms | Deterministic entity extraction, activation update, queue |
| Stop synthesis (REM Tier 3) | <10s | No user-facing latency; quality over speed |

### 6.2 Cost

Dynamo targets the Claude Code Max subscription exclusively. All Dynamo-native LLM operations use native Claude Code subagents at zero marginal cost. The only external API costs are Graphiti's own infrastructure (embeddings, entity extraction) which runs inside the Docker stack — these are infrastructure costs, not Dynamo operational costs.

| Component | Cost | Notes |
|-----------|------|-------|
| Dynamo operations | $0/day | All LLM via native subagents (subscription) |
| Graphiti infrastructure | Variable | Embeddings + entity extraction via OpenRouter; managed through Graphiti config |

**Design principle:** Do not use external API endpoints for native Dynamo systems when Claude Code subscription features serve the same function.

### 6.3 Self-Manageability

Every operation must be performable by Claude Code without manual user intervention:

| Operation | Mechanism |
|-----------|-----------|
| Install | `dynamo install` -- 6-step automated deployment |
| Update | `dynamo update` -- backup, pull, migrate, verify, auto-rollback |
| Configure | Hook-driven automation + `dynamo config` CLI |
| Troubleshoot | `dynamo health-check`, `dynamo diagnose`, `dynamo verify-memory` |
| Enable/disable | `dynamo toggle on/off` with graceful degradation |

### 6.4 Zero External Dependencies

- No npm, no package.json -- pure Node.js built-ins + CJS
- No external build tools or compilation steps
- Docker required only for Graphiti/Neo4j (the knowledge graph backend)
- All file operations use `node:fs`, all paths use `node:path`, all tests use `node:test`

### 6.5 Security

- **Jailbreak/hijacking protection** (MGMT-08) -- hardened hook system
- **Toggle gate** -- global on/off that silences all hooks and memory commands
- **Graceful degradation** -- if infrastructure is down, hooks exit cleanly; Claude Code continues normally
- **Dev mode override** -- `DYNAMO_DEV=1` bypasses global toggle for the current process only

### 6.6 Testing

- **374+ tests** as of v1.2.1, using `node:test` built-in framework
- **tmpdir isolation** -- all tests use temporary directories; no shared state or side effects
- **Options-based test isolation** -- stage/module functions accept parameter overrides for test injection
- **Full suite command:** `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs`

---

## 7. Constraints and Principles

### 7.1 Non-Negotiable Constraints

| Constraint | Rationale |
|-----------|-----------|
| **Dual-path is non-negotiable** | Every memory operation routes through hot path (fast, cheap) or deliberation path (slow, intelligent). No operation uses deliberation by default. |
| **Prove before scaling** | Each milestone gates the next. The Inner Voice must demonstrably improve memory quality before investing in multi-agent coordination. |
| **Claude Code (Max subscription) as the platform** | Minimize additional API dependence. Use native features (agents, subagents, hooks, skills) as the platform. API-based LLM calls limited to underlying infrastructure only. |
| **Zero external dependencies** | No npm, no package.json. Pure Node.js built-ins + CJS. |
| **Self-manageability** | Every capability manageable by Claude Code without manual config file edits. |

### 7.2 Architectural Principles

| Principle | What It Means |
|-----------|--------------|
| **Agents are expensive; functions are cheap** | Default to deterministic CJS functions. Escalate to LLM agents only when reasoning genuinely adds value. |
| **Hybrid architecture for cost optimization** | CJS command hooks for hot path (deterministic, <500ms) + custom subagents for deliberation path (intelligent, 2-10s). |
| **Six-subsystem boundary integrity** | Respect read/write/transport/dispatch/cognition/system boundaries. Ledger does not read. Assay does not write. Reverie delegates both. |
| **Claudia-aware, not Claudia-scoped** | Design interfaces for extensibility (connector framework, message envelopes, domain templates) but only build what Dynamo needs now. |
| **Platform adapter pattern** | `cc/` isolates all Claude Code specifics. Subsystem logic is platform-agnostic where possible. |
| **Build foundational capabilities first** | The intelligence layer must exist before features that depend on it. |
| **Memory quality before UI** | Dashboard is only valuable if the data it displays is high quality. |
| **Security early, ambition late** | Jailbreak protection in early milestones. Multi-agent deliberation in later milestones. |
| **Pair related requirements within milestones** | MENH-06 and MENH-07 (transport + model selection) together. MGMT-06 and MGMT-07 (global + project preferences) together. |

---

## 8. Success Metrics

### 8.1 Quality Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| **Injection relevance rate** | Percentage of injections the user references in subsequent prompts | >60% (v1.3), >75% (v1.4) |
| **Silence accuracy** | Percentage of non-injection decisions that were correct (user did not ask for missing context) | >90% |
| **Session coherence** | Subjective assessment: does the session feel contextually aware? | Measurable improvement over baseline |

### 8.2 Performance Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| **Hot path latency p95** | 95th percentile latency for UserPromptSubmit hot path | <500ms |
| **Deliberation path latency p95** | 95th percentile latency for deliberation processing | <2s |
| **Subagent spawns per session** | Average subagent invocations per session | Within daily cap (default: 20/day) |

### 8.3 Operational Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| **Test count** | Total automated tests | Maintain >374; increase proportionally with new code |
| **Self-management success rate** | Percentage of install/update/sync operations that complete without manual intervention | >99% |
| **Graceful degradation rate** | Percentage of infrastructure failures that degrade gracefully (no user-visible error) | 100% |

### 8.4 Rollback Mechanism

**Feature flag: classic vs. cortex mode.** If the Inner Voice produces lower-quality injections than the current classic curation pipeline, a feature flag (`dynamo config set reverie.mode classic`) instantly reverts to the v1.2.1 behavior. This eliminates catastrophic risk from the intelligence layer upgrade.

---

## Document References

| Document | Relationship |
|----------|-------------|
| **INNER-VOICE-ABSTRACT.md** | Platform-agnostic concept definition for the Inner Voice. Reverie applies this abstract to the Claude Code platform. |
| **MASTER-ROADMAP.md** | Full requirement index and milestone assignments. This PRD summarizes; the roadmap details. |
| **INNER-VOICE-SPEC.md** | Mechanical specification for Inner Voice processing pipelines, state schemas, and model selection. |
| **INNER-VOICE-SYNTHESIS-RESEARCH.md** | Steel-man analysis of Synthesis v2 concepts with GO/NO-GO verdicts. |
| **LEDGER-CORTEX-ANALYSIS.md** | Adversarial analysis of Cortex components with go/no-go verdicts and Option C recommendation. |
| **LEDGER-CORTEX-BRIEF.md** | Strategic vision document. Claudia context. |

---

*PRD created: 2026-03-19*
*Platform: Claude Code (Max subscription)*
*Architecture: Six-subsystem model (Dynamo, Switchboard, Ledger, Assay, Terminus, Reverie)*
*Delivery model: v1.3 milestoned iterations (1.3-M1 through 1.3-M7)*
