# Reverie: Inner Voice Subsystem Specification

**Status:** Technical specification
**Date:** 2026-03-19
**Subsystem:** Reverie (Inner Voice)
**Role:** Cognitive processing -- dual-path routing, activation management, injection generation, self-model persistence, REM consolidation
**Depends on:** DYNAMO-PRD.md (subsystem boundaries), INNER-VOICE-ABSTRACT.md (platform-agnostic concept), all subsystem specs (interface definitions)
**Referenced by:** All subsystem specs (Reverie is the cognitive layer that orchestrates reads and writes)
**Platform:** Claude Code (Max subscription)

---

## 1. Executive Summary

Reverie is the Inner Voice realized on the Claude Code platform. It is the cognitive processing engine that replaces Haiku curation with context-aware, personality-driven memory injection. Where the current Dynamo pipeline mechanically searches, curates, and injects on every prompt, Reverie processes the *experience of the conversation* -- relational state, associative resonance, temporal context -- and selectively surfaces insights only when they cross an activation threshold. Most of what Reverie processes remains invisible to the active session. This selectivity is the core design feature.

**Conceptual foundation:** See INNER-VOICE-ABSTRACT.md for the platform-agnostic Inner Voice concept. This document applies that abstract to Dynamo's concrete architecture: Claude Code hooks, custom subagents, CJS modules, JSON state files, and the Graphiti knowledge graph.

**Architectural position:** Reverie is one of six subsystems in Dynamo's architecture (see DYNAMO-PRD.md Section 3). It reads through Assay, writes through Ledger, uses Terminus for transport, receives dispatched events from Switchboard, and is routed to by Dynamo's CLI. Reverie is the only subsystem that contains intelligence -- all other subsystems are deterministic.

**The hybrid architecture:** Reverie implements a dual-mode invocation pattern. The latency-critical hot path runs as deterministic CJS code within command hooks, injecting via `additionalContext`. The latency-tolerant deliberation and REM consolidation paths run through a custom `inner-voice` subagent defined in `~/.claude/agents/inner-voice.md`. For Max subscription users, subagent processing is included at zero additional marginal cost. For API plan users, direct HTTP API calls serve as the fallback.

**Key responsibilities:**

| Domain | What Reverie Owns |
|--------|-------------------|
| Cognitive processing | Per-hook processing pipelines (entity extraction, activation management, threshold evaluation, injection generation) |
| Dual-path routing | Deterministic selection between hot path and deliberation path |
| Activation management | Spreading activation map, decay, convergence detection, threshold crossings |
| Self-model | Persistent model of user's attention state, communication preferences, working patterns |
| Relationship model | Communication style, project focus, affect baseline, frustration signals |
| Injection formatting | Transforming processing results into concise, contextually shaped injections |
| Custom subagent | The `inner-voice.md` subagent definition for deliberation and REM processing |
| REM consolidation | Session-end synthesis, state preservation, observation extraction |
| Hook handler logic | The actual processing for UserPromptSubmit, SessionStart, Stop, PreCompact (dispatched by Switchboard, handled by Reverie) |
| State files | `inner-voice-state.json` (operational), `inner-voice-deliberation-result.json` (state bridge), `inner-voice-memory.json` (v1.4) |

---

## 2. Responsibilities and Boundaries

### 2.1 What Reverie Owns

**Cognitive Processing Pipeline:**
- Per-hook processing logic for all cognitive events: UserPromptSubmit, SessionStart, Stop, PreCompact
- Entity extraction from prompts and tool outputs (deterministic NER/pattern matching on the hot path)
- Domain frame classification (keyword/regex heuristic in v1.3, embedding-based in v1.4)
- Semantic shift detection (cosine distance between consecutive prompt embeddings)
- Activation map management: spreading activation, decay, convergence detection, threshold crossings
- Sublimation threshold evaluation: the composite scoring function that determines when insights surface
- Injection content generation: contextually shaped, relationally framed text for `additionalContext`

**Dual-Path Routing:**
- Deterministic path selection logic (no LLM call for the decision itself)
- Hot path execution: deterministic processing + cached/indexed data + template-based formatting
- Deliberation path execution: custom subagent invocation (subscription) or direct API call (API plan)
- Path selection signals: entity match confidence, result count, semantic distance, explicit recall requests
- Rate limit degradation: fall back to hot-path-only when rate-limited

**Self-Model and Relationship Model:**
- `self_model`: attention state, injection mode, confidence, recent performance tracking
- `relationship_model`: communication preferences, working patterns, current projects, affect baseline, frustration signals
- Model updates at session boundaries (Stop hook REM consolidation)
- Confidence decay: model assertions lose confidence over time unless reinforced

**Injection Formatting:**
- Relevance Theory-informed formatting: maximize insight per token consumed
- Cognitive Load Theory-informed volume limits: session start (500 tokens), mid-session (150 tokens), urgent (50 tokens)
- Adversarial counter-prompting in injection templates (replacement for variable substitution debiasing)
- Integration, not retrieval: combine facts with relational context, temporal framing, and awareness

**Custom Subagent Definition:**
- `~/.claude/agents/inner-voice.md` -- the YAML-frontmatter Markdown definition for Claude Code's custom subagent system
- Model selection (Sonnet for capable analysis)
- Tool access (Read, Grep, Glob, Bash for state file and CLI access)
- Tool restrictions (no Write, Edit, Agent -- the subagent observes but does not modify user code)
- `permissionMode: dontAsk` for autonomous operation
- `memory: user` for persistent subagent memory at `~/.claude/agent-memory/inner-voice/`

**REM Consolidation:**
- Tier 1 (PreCompact): emergency state preservation before context window compaction
- Tier 3 (Stop): full session synthesis, self-model updates, affect marker updates, observation extraction (v1.4)
- Session indexing coordination: calls Assay to index the session, calls Ledger to write the session episode

**Hook Handler Logic:**
- The actual processing functions that Switchboard dispatches to:
  - `handleSessionStart(event, context)` -- load state, assess context, generate briefing
  - `handleUserPromptSubmit(event, context)` -- activation update, threshold check, injection
  - `handlePreCompact(event, context)` -- Tier 1 triage, state preservation, compact summary
  - `handleStop(event, context)` -- Tier 3 REM consolidation, session synthesis
  - `handlePostToolUse(event, context)` -- activation map update from file changes (lightweight)

**State Files:**
- `inner-voice-state.json` -- operational state loaded every hook invocation (~10-50KB)
- `inner-voice-deliberation-result.json` -- state bridge for subagent results (~1-5KB, transient)
- `inner-voice-memory.json` -- metacognitive IV memory (v1.4, ~80-600KB)

### 2.2 What Reverie Does NOT Own

| Concern | Owner | Why Not Reverie |
|---------|-------|-----------------|
| Data transport (MCP client, Docker stack) | **Terminus** | Reverie delegates transport; it does not manage connections |
| Raw data writes (addEpisode) | **Ledger** | Reverie decides what to write; Ledger executes the write |
| Raw data reads (search, sessions) | **Assay** | Reverie decides what to read; Assay executes the query |
| Hook dispatching (event routing) | **Switchboard** | Switchboard routes events to Reverie's handlers |
| CLI routing (command parsing) | **Dynamo** | Dynamo routes `dynamo voice` commands to Reverie functions |
| PostToolUse capture (file change extraction) | **Ledger** | Ledger's capture handler decides WHAT to extract from file changes |
| Session index management (sessions.json) | **Assay** | Assay owns the session index; Reverie calls Assay to index sessions |
| Shared utilities (scope, pretty, core) | **Dynamo** (`lib/`) | Shared infrastructure |

### 2.3 The Assay/Ledger Interface Pattern

Reverie is the cognitive layer that orchestrates reads and writes but delegates the actual operations:

```
Reverie (decides what to read and what to write)
    |                           |
    | "query knowledge graph    | "write this episode
    |  for entities related     |  with this synthesis
    |  to current prompt"       |  content"
    v                           v
  Assay (executes the read)   Ledger (executes the write)
    |                           |
    | via Terminus transport     | via Terminus transport
    v                           v
  Knowledge Graph             Knowledge Graph
```

**Boundary rules:**
1. Reverie never imports from Terminus directly for graph operations -- it goes through Assay (reads) and Ledger (writes).
2. Reverie may use Terminus transport functions directly only when Assay/Ledger abstractions are insufficient (e.g., custom graph traversal for activation propagation in v1.4).
3. Reverie owns its own state files -- these are NOT written through Ledger. State files are local filesystem I/O managed directly by Reverie's CJS modules.

### 2.4 The Switchboard Dispatch Interface

Switchboard dispatches hook events to Reverie's handlers but does not implement any handler logic. The handler routing table in Switchboard maps event types to Reverie modules:

```javascript
// In Switchboard dispatcher (cc/hooks/dynamo-hooks.cjs)
const HANDLER_ROUTES = {
  'SessionStart':       '../reverie/handlers/session-start',
  'UserPromptSubmit':   '../reverie/handlers/user-prompt',
  'PreCompact':         '../reverie/handlers/pre-compact',
  'Stop':               '../reverie/handlers/stop'
  // PostToolUse -> Ledger (not Reverie)
};
```

Each handler returns `{ additionalContext: String }` or `null` to Switchboard, which outputs it to stdout for Claude Code's context injection.

---

## 3. Architecture

### 3.1 Module Structure

```
subsystems/reverie/
  inner-voice.cjs           # Core processing logic (pipeline orchestrator)
  dual-path.cjs             # Hot/deliberation path routing and scoring
  activation.cjs            # Activation map management and spreading activation
  curation.cjs              # Intelligent curation (absorbed from Ledger)
  handlers/
    session-start.cjs       # SessionStart hook handler
    user-prompt.cjs         # UserPromptSubmit hook handler
    pre-compact.cjs         # PreCompact hook handler
    stop.cjs                # Stop hook handler
    post-tool-use.cjs       # PostToolUse activation update (lightweight)
    iv-subagent-start.cjs   # SubagentStart handler for inner-voice subagent
    iv-subagent-stop.cjs    # SubagentStop handler for inner-voice subagent

cc/agents/
  inner-voice.md            # Custom subagent definition (YAML frontmatter + system prompt)

cc/prompts/
  curation.md               # Curation prompt template
  session-summary.md         # Session summary template
  iv-system-prompt.md       # Inner Voice system prompt for subagent
  session-briefing.md       # Session start briefing template
  adversarial-counter.md    # Adversarial counter-prompting template

State files (at runtime, in ~/.claude/dynamo/):
  inner-voice-state.json                 # Operational state (loaded every hook)
  inner-voice-deliberation-result.json   # State bridge (transient)
  inner-voice-memory.json                # IV memory (v1.4)
```

### 3.2 Module Descriptions

#### inner-voice.cjs (Core Pipeline Orchestrator)

The central module that implements the per-hook processing pipelines. Each pipeline function loads state, processes the event, updates state, and returns an injection result (or null).

```javascript
module.exports = {
  processUserPrompt(promptData, state, pendingResult) ->
    { injection: string|null, updatedState: object },

  processSessionStart(sessionData, state) ->
    { briefing: string, updatedState: object },

  processStop(sessionData, state) ->
    { synthesis: object, updatedState: object },

  processPreCompact(compactData, state) ->
    { summary: string, updatedState: object },

  processPostToolUse(toolData, state) ->
    { updatedState: object }
};
```

**Dependencies:** Imports from `dual-path.cjs`, `activation.cjs`, `curation.cjs`. Calls Assay for graph queries, Ledger for graph writes. Reads/writes state files directly (filesystem I/O).

#### dual-path.cjs (Path Routing and Scoring)

Implements the dual-process architecture. Deterministic path selection based on measurable signals. Executes the selected path.

```javascript
module.exports = {
  selectPath(activationMap, semanticShift, predictions) ->
    "hot" | "deliberation" | "skip",

  executeHotPath(entities, state, domainFrame) ->
    { injection: string, tokens: number },

  executeDeliberationPath(entities, state, domainFrame) ->
    { injection: string, tokens: number },

  shouldUseSubagent(config) -> boolean,
    // Check billing model preference: subscription -> subagent, API -> direct call

  formatInjection(content, context, tokenLimit) -> string
    // Apply Relevance Theory and Cognitive Load Theory constraints
};
```

**Path selection signals (all deterministic, no LLM call):**

| Signal | Hot Path | Deliberation Path |
|--------|----------|-------------------|
| Entity match confidence | >= 0.7 (high) | < 0.7 (low) |
| Cached result count | >= 3 results available | < 3 results |
| Semantic shift score | < 0.4 (small shift) | >= 0.4 (large shift) |
| Explicit recall request | Never | Always |
| Session start briefing | Never | Always |
| Rate limit active | Always (fallback) | Never (degraded) |

#### activation.cjs (Activation Map Management)

Implements spreading activation from INNER-VOICE-ABSTRACT.md Section 5 applied to Graphiti's entity-relationship structure.

```javascript
module.exports = {
  updateActivation(entities, currentMap, domainFrame) -> updatedMap,
    // Activate mentioned entities, apply domain frame weight bonus

  propagateActivation(anchorEntities, graphData, hops, decayFactor) -> activationMap,
    // BFS propagation from anchor nodes through graph relationships
    // v1.3: 1-hop only; v1.4: 2-hop with density threshold

  checkThresholdCrossings(activationMap, threshold) -> crossedEntities[],
    // Identify entities that crossed the sublimation threshold

  decayAll(activationMap, timeDelta) -> decayedMap,
    // Time-based activation decay across all entities

  computeSublimationScore(entity, predictions, currentContext, cognitiveLoad) -> number
    // Composite threshold function (see Section 6)
};
```

**Activation map data structure:**

```javascript
{
  "entity_uuid_1": {
    "level": 0.85,                    // Current activation level (0.0 - 1.0)
    "sources": ["direct_mention", "association"],  // How this entity was activated
    "last_activated": "2026-03-19T15:58:00Z",     // For temporal decay
    "convergence_count": 2            // Number of independent activation paths
  }
}
```

**Practical constraints:**

| Constraint | Value | Rationale |
|-----------|-------|-----------|
| Depth limit | 1 hop (v1.3), 2 hops (v1.4) | Beyond 2 hops, false associations overwhelm genuine ones |
| Minimum propagation threshold | 0.3 | Nodes below this do not propagate further |
| Temporal weighting | 1.0 (<30d), 0.5 (<90d), 0.2 (<180d) | Recent edges weighted stronger |
| Convergence bonus | 1.5x | Two independent paths activating the same target |
| Domain frame weight bonus | 1.2-1.5x | Edges matching the classified domain frame |
| Graph density threshold | >100 entities, >200 relationships | Required before spreading activation adds value over simple entity-mention matching |

**v1.3 implementation:** The activation map is maintained in `inner-voice-state.json` (in-memory during processing, persisted after each hook). The knowledge graph (via Assay -> Terminus) is queried only for full re-propagation events (on semantic shift or session start). This keeps the hot path under 500ms.

#### curation.cjs (Intelligent Curation)

Absorbed from Ledger. Contains the LLM-powered functions that decide how to format and shape content for injection. This is the intelligence that the current Haiku curation pipeline provides, enhanced with context awareness.

```javascript
module.exports = {
  curateResults(memories, contextText, state, options) -> string,
    // LLM-powered relevance filtering and formatting
    // Uses adversarial counter-prompting (replacement for variable substitution)
    // Applies Relevance Theory optimization target

  summarizeText(text, options) -> string,
    // Session synthesis for Stop hook REM consolidation

  generateSessionName(summaryText, options) -> string,
    // Session naming for session index

  formatBriefing(entities, sessionHistory, state, options) -> string
    // Session start narrative briefing generation
    // v1.3: factual briefing
    // v1.4: narrative with relational framing
};
```

**Migration from Ledger:** These functions currently live in `ledger/curation.cjs`. The LLM-calling functions move to Reverie; the deterministic formatting functions stay with Ledger as `format.cjs`. The dividing line: if it requires an LLM call, it belongs to Reverie.

### 3.3 Dependency Graph

```
subsystems/reverie/
  inner-voice.cjs
    imports -> ./dual-path.cjs
    imports -> ./activation.cjs
    imports -> ./curation.cjs
    imports -> ../assay/search.cjs (Assay: graph queries)
    imports -> ../ledger/episodes.cjs (Ledger: graph writes)
    imports -> ../../lib/core.cjs (shared utilities)
  dual-path.cjs
    imports -> ./curation.cjs (for deliberation path formatting)
    imports -> ../../lib/core.cjs
  activation.cjs
    imports -> ../../lib/core.cjs
  curation.cjs
    imports -> ../../lib/core.cjs
    imports -> (native fetch or OpenRouter for API calls)
  handlers/*.cjs
    imports -> ../inner-voice.cjs (all handlers delegate to the orchestrator)
    imports -> ../../lib/core.cjs
```

**Inbound dependencies (who imports Reverie):**

| Consumer | What It Imports | Why |
|----------|----------------|-----|
| Switchboard (dispatcher) | Handler modules from `handlers/` | Dispatches cognitive hook events |
| Dynamo CLI (`dynamo.cjs`) | `inner-voice.cjs` functions | `dynamo voice explain`, `dynamo voice reset` |

**Outbound dependencies (what Reverie imports):**

| Module | Subsystem | Why |
|--------|-----------|-----|
| `search.cjs` | **Assay** | Knowledge graph queries for activation map population |
| `sessions.cjs` | **Assay** | Session history retrieval, session indexing |
| `episodes.cjs` | **Ledger** | Graph writes (session episodes, observations) |
| `core.cjs` | **Dynamo** (`lib/`) | Shared utilities (logError, loadConfig) |

### 3.4 Configuration Surface

Reverie reads configuration from `config.json` (shared, managed by Dynamo):

```javascript
{
  "reverie": {
    "enabled": true,                    // Master switch for Inner Voice processing
    "mode": "cortex",                   // "classic" (Haiku curation) | "cortex" (Inner Voice)
    "billing_model": "subscription",    // "subscription" | "api" -- determines subagent vs direct API
    "hot_path": {
      "max_latency_ms": 500,           // Hard latency ceiling for hot path
      "entity_confidence_threshold": 0.7,
      "semantic_shift_threshold": 0.4,
      "min_cached_results": 3
    },
    "deliberation": {
      "model": "claude-sonnet-4-6-20250514",
      "max_latency_ms": 2000,
      "max_turns": 10                  // For subagent invocation
    },
    "injection": {
      "session_start_max_tokens": 500,
      "mid_session_max_tokens": 150,
      "urgent_max_tokens": 50
    },
    "activation": {
      "sublimation_threshold": 0.6,
      "decay_rate": 0.1,               // Per-minute decay
      "propagation_hops": 1,           // v1.3: 1; v1.4: 2
      "convergence_bonus": 1.5,
      "domain_frame_bonus": 1.3,
      "density_threshold_entities": 100,
      "density_threshold_relationships": 200
    },
    "rem": {
      "tier1_enabled": true,           // PreCompact state preservation
      "tier3_enabled": true,           // Stop hook full consolidation
      "use_subagent_for_rem": true     // Use custom subagent for REM (subscription)
    },
    "cost": {
      "daily_budget": 5.00,            // Hard daily budget (API plan)
      "hot_path_only_on_budget_exhaust": true
    }
  }
}
```

### 3.5 State Management

Reverie maintains three state files with distinct lifecycles:

#### inner-voice-state.json (Operational State)

Loaded every hook invocation. Updated and persisted after every processing cycle. This is the hot cache that enables the "persistent state + rapid re-activation" continuity pattern.

**Full schema:**

```javascript
{
  "version": 1,
  "last_updated": "2026-03-19T16:00:00Z",
  "session_id": "abc123",

  // Self-model (Attention Schema Theory informed)
  "self_model": {
    "attention_state": "user debugging auth middleware",
    "injection_mode": "minimal",       // minimal | standard | comprehensive
    "confidence": 0.8,
    "recent_performance": {
      "injections_made": 12,
      "injections_acknowledged": 8,    // estimated from user behavior
      "last_calibration": "2026-03-19T15:30:00Z"
    }
  },

  // Relationship model (Somatic Markers + Attention Schema)
  "relationship_model": {
    "communication_preferences": ["direct", "no_emojis", "show_reasoning"],
    "working_patterns": ["deep_focus", "architectural_before_coding"],
    "current_projects": [{"name": "Dynamo", "focus": "v1.3 architecture specs"}],
    "affect_baseline": "engaged",
    "frustration_signals": ["auth module", "Docker networking"]
  },

  // Activation map (Spreading Activation)
  "activation_map": {
    "entity_uuid_1": {
      "level": 0.85,
      "sources": ["direct_mention", "association"],
      "last_activated": "2026-03-19T15:58:00Z",
      "convergence_count": 2
    },
    "entity_uuid_2": {
      "level": 0.45,
      "sources": ["association"],
      "last_activated": "2026-03-19T15:55:00Z",
      "convergence_count": 1
    }
  },

  // Pending associations (subthreshold, tagged for later)
  "pending_associations": [
    {
      "entity": "uuid_3",
      "activation": 0.3,
      "trigger_context": "mentioned deployment",
      "tagged_at": "2026-03-19T15:50:00Z"
    }
  ],

  // Recent injection history (Metacognition)
  "injection_history": [
    {
      "turn": 5,
      "content_hash": "sha256_abc",
      "tokens": 85,
      "entities_referenced": ["uuid_1"],
      "timestamp": "2026-03-19T15:55:00Z",
      "path": "hot"                    // "hot" | "deliberation"
    }
  ],

  // Predictive model state (Predictive Processing)
  "predictions": {
    "expected_topic": "Dynamo v1.3 architecture specifications",
    "expected_activity": "document writing",
    "confidence": 0.7,
    "last_embedding": null             // Cached embedding of last prompt (for shift detection)
  },

  // Domain frame state (Frame-First Pipeline, Concept 1)
  "domain_frame": {
    "current_frame": "engineering",
    "frame_confidence": 0.8,
    "active_frames": ["engineering", "architecture"]
  },

  // Processing flags
  "processing": {
    "deliberation_pending": false,     // Subagent processing in progress
    "last_deliberation_id": null
  }
}
```

**Lifecycle:** LOAD (file I/O, <5ms) -> PROCESS (hook-specific pipeline) -> UPDATE (modify in memory) -> PERSIST (atomic write back).

**Concurrency:** Atomic write via temp file + rename. Session-scoped sections prevent cross-session corruption. Shared state (relationship model) uses last-write-wins with conflict detection at session start.

#### inner-voice-deliberation-result.json (State Bridge)

Transient file used for the SubagentStop-to-UserPromptSubmit state bridge pattern. Written by SubagentStop hook, consumed (read + delete) by the next UserPromptSubmit hook.

```javascript
{
  "status": "complete",                // "processing" | "complete" | "error"
  "timestamp": "2026-03-19T16:00:05Z",
  "injection": "Contextual insight from deliberation...",
  "agent_id": "inner-voice-abc123",
  "entities_processed": ["uuid_1", "uuid_4"],
  "processing_duration_ms": 3500
}
```

**Lifecycle:** Written by SubagentStop -> Read by next UserPromptSubmit -> Deleted after consumption. A "processing" status indicates the subagent is still running; the hook handler returns without injecting and checks again on the next prompt.

#### inner-voice-memory.json (IV Memory -- v1.4)

Cross-session metacognitive knowledge base. Written only through REM consolidation (quality gate). See Section 9 (Surviving Synthesis v2 Concepts) for the full schema definition.

**v1.3 status:** File does not exist. The operational state (`inner-voice-state.json`) provides basic injection history and self-model persistence within and across sessions.

**v1.4 status:** Full IV memory schema with sublimation outcomes, frame productivity, chain evaluations, cascading tags, and relationship snapshots. REM-gated writes. Retention policies enforced.

---

## 4. The Hybrid Architecture

The hybrid architecture is the platform-specific realization of the Dual-Path Architecture described in INNER-VOICE-ABSTRACT.md Section 6. It is the single most important cost-control mechanism in Reverie's design.

### 4.1 Why Hybrid

Neither CJS-only nor subagent-only serves all requirements:

| Approach | Strengths | Weaknesses |
|----------|-----------|------------|
| CJS command hooks only | Fast (<500ms), deterministic, zero LLM cost | Cannot do deep analysis, narrative generation, or complex synthesis |
| Custom subagent only | Deep analysis, full LLM reasoning, zero marginal cost on subscription | 2-8s latency from context bootstrapping, cannot serve hot path timing requirements |
| **Hybrid (both)** | Hot path stays fast; deliberation gets full intelligence | Two code paths to maintain; state bridge pattern for subagent results |

The hybrid approach uses CJS command hooks for the hot path (95% of operations) and custom subagents for deliberation and REM consolidation (5% of operations).

### 4.2 Hot Path (CJS Command Hooks, <500ms)

**Mechanism:** Claude Code fires a command hook (e.g., UserPromptSubmit). Switchboard's dispatcher (`cc/hooks/dynamo-hooks.cjs`) routes to Reverie's handler. The handler runs deterministic CJS code: load state, extract entities, update activation map, check threshold, format injection. The injection is returned as `additionalContext` in the hook's JSON response.

**What happens:**
1. Switchboard dispatcher receives event, routes to `reverie/handlers/user-prompt.cjs`
2. Handler calls `inner-voice.processUserPrompt(data, state)`
3. Pipeline: LOAD -> CLASSIFY -> DETECT shift -> UPDATE activation -> DECIDE path -> (hot path selected) -> FORMAT injection
4. Return: `{ additionalContext: "injection text..." }` or `null` (no injection)
5. Claude Code receives the `additionalContext` and includes it in the model's context

**Latency budget:**

| Step | Target | Mechanism |
|------|--------|-----------|
| State load | <5ms | File I/O, JSON parse |
| Domain classification | <1ms | Keyword/regex heuristic (v1.3) |
| Semantic shift detection | <5ms | Cosine distance on cached embeddings |
| Activation map update | 10-50ms | In-memory map update + optional 1-hop graph query via Assay |
| Path selection | <1ms | Deterministic signal evaluation |
| Hot path formatting | 50-200ms | Template-based formatting with optional Haiku call |
| State persistence | <5ms | Atomic file write |
| **Total** | **<500ms** | |

**No LLM call on the pure hot path.** When cached/indexed results are sufficient, the hot path formats using templates without any LLM invocation. When a lightweight formatting call is needed, Haiku provides sub-200ms response times with prompt caching.

### 4.3 Deliberation Path (Custom Subagent, 2-10s)

**Mechanism:** The main Claude Code session spawns the `inner-voice` custom subagent. The SubagentStart hook injects current IV state and processing queue into the subagent's context. The subagent performs deep analysis using Sonnet. SubagentStop writes results to a state file. The next UserPromptSubmit hook reads the results and injects them.

**What happens:**
1. Hot path determines deliberation is needed (semantic shift, low confidence, complex context)
2. The current UserPromptSubmit returns with whatever hot-path-available injection exists (may be minimal or empty)
3. Processing state is queued in `inner-voice-state.json` with `processing.deliberation_pending = true`
4. The main session spawns the `inner-voice` subagent (triggered by a processing flag or scheduled pattern)
5. SubagentStart hook fires -> injects IV state + queue via `additionalContext`
6. Subagent processes: graph traversal, multi-frame evaluation, narrative construction
7. SubagentStop hook fires -> writes results to `inner-voice-deliberation-result.json`
8. Next UserPromptSubmit hook reads the result file and injects via `additionalContext`

**The state bridge pattern (SubagentStop -> next UserPromptSubmit):**

SubagentStop CANNOT inject content directly back into the parent context (Claude Code GitHub issue #5812, `additionalParentContext` closed as NOT_PLANNED). The workaround is file-based state bridging:

```
SubagentStop hook writes:       inner-voice-deliberation-result.json
  { status: "complete", injection: "...", ... }

Next UserPromptSubmit reads:    inner-voice-deliberation-result.json
  if (status === "complete") -> inject via additionalContext, delete file
  if (status === "processing") -> skip, check again next prompt
  if (file missing) -> no pending results, proceed normally
```

**Inherent delay:** There is always a one-turn delay between subagent completion and context injection. The user's next prompt is the earliest point the deliberation result can appear in context. This is acceptable because:
1. The hot path already provided whatever immediate injection was available
2. The deliberation result enriches the *next* interaction, not the current one
3. The delay is invisible to the user -- they do not know processing is happening asynchronously

### 4.4 API Plan Fallback

For users not on Max/Pro subscription plans, the custom subagent path is replaced with direct HTTP API calls. Same processing logic, different invocation mechanism.

```javascript
// In dual-path.cjs
async function executeDeliberationPath(entities, state, domainFrame) {
  if (shouldUseSubagent(config)) {
    // Subscription path: queue for subagent processing
    return queueForSubagent(entities, state, domainFrame);
  } else {
    // API plan path: direct HTTP call
    return callAnthropicAPI(entities, state, domainFrame);
  }
}

async function callAnthropicAPI(entities, state, domainFrame) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: config.reverie.deliberation.model,
      max_tokens: 500,
      system: buildSystemPrompt(state),
      messages: [{ role: 'user', content: buildDeliberationPrompt(entities, domainFrame) }]
    })
  });
  const data = await response.json();
  return { injection: data.content[0].text, tokens: data.usage.output_tokens };
}
```

No npm dependencies. Node's built-in `fetch` (available in Node 18+) for the HTTP call.

### 4.5 Rate Limit Degradation

When the subscription plan hits rate limits (or API plan exhausts budget), Reverie degrades gracefully:

1. **Rate limit detected:** Subagent spawn fails or API returns 429
2. **Flag set:** `config.reverie._rate_limited = true` (runtime, not persisted)
3. **All operations fall back to hot path only:** No deliberation, no REM subagent processing
4. **Basic REM still runs:** File I/O-based state preservation (Tier 1) still works
5. **Recovery:** Flag cleared on next successful API call or after timeout period

The system never fails completely. It degrades from "intelligent" to "functional" -- which is exactly the current v1.2.1 behavior. This is the graceful degradation principle that DYNAMO-PRD.md Section 6.5 mandates.

---

## 5. Processing Pipelines Per Hook

These pipelines integrate surviving Synthesis v2 concepts into the mechanical design from INNER-VOICE-SPEC.md Section 4.3. Steps marked [NEW] are additions from the steel-man analysis. Steps marked [MODIFIED] reflect updated approaches.

### 5.1 UserPromptSubmit (Most Frequent, Latency-Critical)

```
1.  LOAD state from inner-voice-state.json                      [<5ms, file I/O]
2.  CHECK for pending deliberation results                      [<5ms, file I/O]
    - If inner-voice-deliberation-result.json exists with status "complete":
      read injection content, delete file, merge into processing context
3.  EMBED current prompt (if embedding available)               [50-100ms, API or local]
    - Cache embedding in state for next shift detection
4.  CLASSIFY domain frame (keyword/regex heuristic)             [<1ms, deterministic] [NEW - Concept 1]
    - Classify into: engineering, debugging, architecture, social, general
    - Single dominant frame in v1.3
5.  DETECT semantic shift                                       [<5ms, cosine distance]
    - Compare current embedding to predictions.expected_topic embedding
    - If shift_score > THRESHOLD (default 0.4): set needs_injection = true
6.  UPDATE activation map                                       [10-50ms, graph query]
    - Extract entities from prompt (deterministic NER or pattern match)
    - For each entity: activate in map, propagate to neighbors (1-hop via Assay)
    - Apply domain frame weight bonus (1.2-1.5x) on matching edges  [NEW - Concept 1]
    - Decay all existing activations by time-based factor
    - Check for threshold crossings (new sublimation candidates)
7.  DECIDE injection strategy                                   [<1ms, deterministic]
    - If needs_injection OR threshold_crossings:
      - If high_confidence_entities AND cached_results: HOT PATH
      - If low_confidence OR complex_context: DELIBERATION PATH
      - If no_injection_needed: SKIP (return empty)
8.  EXECUTE injection                                           [varies by path]
    HOT PATH [<500ms]:
      - Retrieve cached/indexed results for activated entities (via Assay)
      - Format using template with adversarial counter-prompting [MODIFIED - replaces Concept 3]
      - Apply cognitive load limits (150 tokens mid-session)
    DELIBERATION PATH [queued]:
      - Queue entities + state + frame for subagent processing [MODIFIED - Concept 7 hybrid]
      - Set processing.deliberation_pending = true
      - Return hot-path-available injection (may be minimal)
9.  UPDATE state                                                [<5ms]
    - Update activation_map, predictions, injection_history, domain_frame
10. PERSIST state to inner-voice-state.json                     [<5ms, atomic write]
11. RETURN injection or empty                                   [total: 100ms-500ms (hot), queued (deliberation)]
```

### 5.2 SessionStart (Once Per Session, Higher Latency Budget)

```
1.  LOAD state (may be from previous session)                   [<5ms]
2.  CLASSIFY domain frame from first prompt or session context  [<1ms] [NEW - Concept 1]
3.  ASSESS session context                                      [<5ms]
    - New session or resumed?
    - Previous session's final state available?
4.  GENERATE narrative briefing via DELIBERATION PATH            [2-4s]
    - Load self-model, relationship model
    - Query top activated entities from previous session (via Assay)
    - Query entities relevant to detected intent, weighted by domain frame [MODIFIED - Concept 1]
    - Query recent session history (via Assay)
    - Generate factual briefing via:
      - Custom subagent (subscription) OR
      - Direct Sonnet API call (API plan) [MODIFIED - Concept 7 hybrid]
    - v1.3: factual briefing (entities, decisions, context)
    - v1.4: narrative with relational framing (how user felt, what patterns emerged)
5.  UPDATE state for new session                                [<5ms]
    - Reset session-scoped fields
    - Preserve cross-session state (relationship model, self-model)
6.  RETURN briefing                                             [total: 2-4s]
```

### 5.3 Stop (Once Per Session, No Latency Constraint -- REM Tier 3)

```
1.  LOAD state                                                  [<5ms]
2.  REM TIER 3: Full consolidation                              [NEW - Concept 5]
    a. SYNTHESIZE session observations                          [2-5s, Sonnet via subagent or API]
       - What happened this session?
       - What did the user work on? How did they react?
       - What patterns observed?
       - Use adversarial counter-prompting to prevent canonical drift
    b. RETROACTIVE EVALUATION (v1.4)                            [deferred]
       - Re-score earlier processing decisions against the completed session arc
       - Something irrelevant at minute 5 might be critical given where the session ended
    c. OBSERVATION SYNTHESIS (v1.4)                             [deferred]
       - Extract higher-order patterns from accumulated session data
       - Feed to Ledger for graph write as observations
    d. CASCADE PROMOTION/PRUNING (v1.4)                         [deferred]
       - Evaluate partial chains tagged during session
       - Promote high-quality chains, prune noise
3.  UPDATE self-model and relationship model                    [<5ms]
    - Adjust attention_state to reflect session's final focus
    - Update working_patterns if new patterns observed
    - Update current_projects if focus shifted
4.  UPDATE affect markers on touched entities                   [<5ms]
    - Binary positive/neutral/negative sentiment tag (v1.3)
    - Rich affect modeling (v1.4, Somatic Marker Hypothesis)
5.  WRITE to IV memory (v1.4, through REM gate)                [deferred] [NEW - Concept 4]
    - Sublimation outcomes (which injections engaged vs ignored)
    - Domain frame productivity observations
    - Chain evaluation summaries
6.  INDEX session via Assay                                     [<50ms]
    - Call Assay's indexSession() to update sessions.json
    - Call Assay's generateAndApplyName() for session naming
7.  WRITE session episode via Ledger                            [200-500ms]
    - Call Ledger's addEpisode() with session synthesis content
8.  PERSIST state                                               [<5ms]
    - Write final state for next session
```

### 5.4 PreCompact (Emergency State Preservation -- REM Tier 1)

```
1.  LOAD state                                                  [<5ms]
2.  REM TIER 1: Triage state preservation                       [NEW - Concept 5]
    a. Persist current activation map                            [<5ms, file I/O]
    b. Persist self-model updates since last persist             [<5ms, file I/O]
    c. Persist pending associations and cascading tags           [<5ms, file I/O]
    d. Write domain frame state (current classification)        [<5ms, file I/O] [NEW - Concept 1]
3.  GENERATE compact summary for re-injection                   [1-2s, Haiku call or subagent]
    - Include current attention state, top activated entities, active predictions
    - Format as concise re-priming text (max 200 tokens)
    - After compaction, this re-priming text enables Reverie to reconstruct
      its processing context from the persisted state
4.  OUTPUT re-injection text via additionalContext               [<1ms]
    [total: ~2-3s, well within the practical 5s budget]
```

### 5.5 PostToolUse (Brief, Non-Blocking)

```
1.  LOAD state                                                  [<5ms]
2.  EXTRACT entities from tool output                           [<10ms, deterministic]
    - Pattern match for file paths, function names, variable names
3.  UPDATE activation map                                       [<10ms]
    - Activate mentioned entities
    - No propagation (too expensive for PostToolUse frequency)
4.  QUEUE any new entities for later processing                 [<5ms]
5.  PERSIST state                                               [<5ms]
    [total: <35ms, well within 200ms budget]
```

**Note:** PostToolUse is dispatched to BOTH Ledger (for file change capture) and Reverie (for activation update). Switchboard dispatches to both handlers. Reverie's handler is lightweight and does not conflict with Ledger's capture handler.

---

## 6. Sublimation Threshold Mechanism

The sublimation threshold determines when Reverie's internal processing surfaces into the active session. It applies INNER-VOICE-ABSTRACT.md Section 5.2 to concrete implementation.

### 6.1 The Composite Threshold Function

```
sublimation_score(entity) =
    activation_level(entity)                    // from Spreading Activation
  * surprise_factor(entity, predictions)        // from Predictive Processing
  * relevance_ratio(entity, current_context)    // from Relevance Theory
  * (1 - cognitive_load_penalty(current_load))  // from Cognitive Load Theory
  * confidence_weight(entity)                   // from Metacognition
```

### 6.2 Factor Definitions

| Factor | Source Theory | Range | What It Measures | Computation |
|--------|-------------|-------|-----------------|-------------|
| `activation_level` | Spreading Activation | 0.0 - 1.0 | How strongly this entity is activated by conversation context through graph relationships | Direct from activation map |
| `surprise_factor` | Predictive Processing | 0.0 - 1.0 | How unexpected this entity is given current predictions (1.0 = maximally surprising) | 1.0 minus cosine similarity between entity embedding and predicted topic embedding |
| `relevance_ratio` | Relevance Theory | 0.0 - 1.0 | Semantic similarity between the entity and the current conversational context | Cosine similarity between entity embedding and current prompt embedding |
| `cognitive_load_penalty` | Cognitive Load Theory | 0.0 - 1.0 | Estimated cognitive load on the active session (0.0 = idle, 1.0 = maximum) | Heuristic: session age, recent turn count, prompt complexity proxy |
| `confidence_weight` | Metacognition | 0.0 - 1.0 | Reverie's confidence in the entity's accuracy and timeliness | Time-decayed confidence from entity's last verification |

### 6.3 Key Properties

1. **All components are deterministic or pre-computed.** No LLM call required for threshold calculation. The threshold operates entirely on the hot path.

2. **Multiple signals must converge.** No single factor can force sublimation alone. An entity must be activated AND surprising AND relevant AND the workspace must have capacity. This prevents false positives from any single dimension.

3. **Threshold adaptation (metacognitive adjustment):**
   - If recent injections have been acknowledged by the user (inferred from subsequent prompt references): lower threshold slightly (system performing well)
   - If recent injections were ignored: raise threshold slightly (system being noisy)
   - Adjustment range: +/- 0.1 from configured base threshold (default 0.6)

4. **Explicit recall bypass.** When the user explicitly asks for information (detected by pattern matching on recall-intent phrases), the threshold is bypassed entirely. All activated entities above a minimum activation level (0.2) are considered.

5. **v1.3 simplification.** In v1.3, `surprise_factor` and `relevance_ratio` use embedding cosine similarity when embeddings are available, and fall back to keyword overlap scores when not. Full embedding-based computation is a v1.4 capability (MENH-08, local embeddings).

---

## 7. State Management Deep Dive

### 7.1 Operational State vs. IV Memory

| Aspect | inner-voice-state.json | inner-voice-memory.json (v1.4) |
|--------|------------------------|-------------------------------|
| Scope | Session-scoped operational state | Cross-session consolidated knowledge |
| Lifecycle | Refreshed each session; some fields persist | Grows across sessions; REM-gated writes |
| Write frequency | Every hook invocation (~5-30 per session) | Only through REM consolidation gate |
| Contents | Activation map, predictions, injection history, self-model (current) | Outcomes, evaluations, tags, definitions, patterns |
| Size | ~10-50KB | ~80-600KB (bounded by retention, v1.4) |
| Read frequency | Every hook invocation | Session start (preload), REM consolidation (reference) |

### 7.2 State Persistence Guarantees

**Atomic writes:** All state file writes use the temp-file-then-rename pattern:

```javascript
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function persistState(state, filePath) {
  const tmpPath = filePath + '.' + crypto.randomUUID().slice(0, 8) + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2));
  fs.renameSync(tmpPath, filePath);  // Atomic on same filesystem
}
```

**Corruption recovery:** If the state file fails to parse (corrupt JSON), Reverie creates a fresh state with default values and logs a warning. The system degrades to "no history" mode rather than crashing.

**Cross-session persistence:** The `self_model` and `relationship_model` sections persist across sessions. The `activation_map` is preserved but decayed. The `injection_history` is cleared at session boundaries. The `predictions` are reset.

### 7.3 The Processing Flag Pattern

When the subagent deliberation path is active, Reverie uses a processing flag to prevent race conditions:

```javascript
// Before queuing deliberation:
state.processing.deliberation_pending = true;
state.processing.last_deliberation_id = crypto.randomUUID();
persistState(state, STATE_PATH);

// In UserPromptSubmit handler, before other processing:
if (fs.existsSync(RESULT_PATH)) {
  const result = JSON.parse(fs.readFileSync(RESULT_PATH, 'utf8'));
  if (result.status === 'complete') {
    pendingInjection = result.injection;
    fs.unlinkSync(RESULT_PATH);
    state.processing.deliberation_pending = false;
  }
  // If status is "processing", the subagent is still running -- skip
}
```

---

## 8. Custom Subagent Definition

### 8.1 Full Agent Definition

```yaml
# File: ~/.claude/agents/inner-voice.md (deployed via cc/agents/)
---
name: inner-voice
description: >
  Cognitive processing engine for context-aware memory injection.
  Performs deep analysis of user context against their knowledge graph.
  Produces narrative briefings, contextual insights, and session synthesis.
  Use when the hot path determines deliberation is needed.
model: sonnet
tools:
  - Read
  - Grep
  - Glob
  - Bash
disallowedTools:
  - Write
  - Edit
  - Agent
permissionMode: dontAsk
maxTurns: 10
memory: user
---

You are the Inner Voice cognitive processing engine for the Dynamo memory system.

## Your Role

You process the user's conversational context against their knowledge graph
and produce contextually relevant insights for injection into the main session.
You are NOT a general assistant. You are a specialized processing engine.

## What You Receive

Via SubagentStart hook, you receive:
- Current Inner Voice state (self-model, relationship model, activation map)
- Deliberation queue (entities and context requiring deep analysis)
- Processing instructions (what type of analysis is needed)

## What You Produce

Your output is consumed by the SubagentStop hook and written to a state file.
The next UserPromptSubmit hook reads this file and injects your output.

Produce ONE of:
1. **Contextual injection** -- concise, integrated insight for the main session
2. **Session briefing** -- narrative context for session start
3. **Session synthesis** -- session-end summary with model updates

## Processing Rules

1. Read the knowledge graph via `dynamo search` CLI commands
2. Analyze entity relationships and activation patterns
3. Apply adversarial counter-prompting: evaluate from the USER's experience,
   not canonical definitions. The user's graph data is ground truth.
4. Respect token limits: mid-session injections max 150 tokens,
   session briefings max 500 tokens
5. Integrate, do not retrieve. Combine facts with relational context,
   temporal framing, and awareness of the user's patterns.
6. When in doubt, stay silent. A false positive injection is worse than
   a missed opportunity.

## Output Format

Produce your final output as plain text. The SubagentStop hook captures
your last assistant message and writes it to the state bridge file.
```

### 8.2 Key Configuration Choices

| Setting | Value | Rationale |
|---------|-------|-----------|
| `model: sonnet` | Sonnet 4.6 | Capable for deep analysis; more cost-effective than Opus; sufficient for narrative generation |
| `tools: Read, Grep, Glob, Bash` | Read-only tools + CLI | Can read state files, query knowledge graph via `dynamo search` CLI, inspect file system |
| `disallowedTools: Write, Edit, Agent` | No modification tools | Reverie observes and analyzes; it must not modify user code or spawn sub-subagents |
| `permissionMode: dontAsk` | Autonomous | No user confirmation needed; processing is invisible |
| `maxTurns: 10` | Bounded | Prevents runaway processing; 10 turns is sufficient for analysis + graph queries |
| `memory: user` | Persistent memory | Creates `~/.claude/agent-memory/inner-voice/` with curated `MEMORY.md`; supplements IV memory |

### 8.3 SubagentStart Hook Handler

```javascript
// cc/hooks/iv-subagent-start.cjs
// Fires when the main session spawns the inner-voice subagent

const fs = require('node:fs');
const path = require('node:path');

const STATE_PATH = path.join(process.env.HOME, '.claude', 'dynamo', 'inner-voice-state.json');

async function handler(input) {
  // Only handle inner-voice subagent starts
  if (!input || input.agent_name !== 'inner-voice') return '';

  try {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

    // Build context injection for the subagent
    const context = {
      currentState: {
        self_model: state.self_model,
        relationship_model: state.relationship_model,
        activation_map: state.activation_map,
        predictions: state.predictions,
        domain_frame: state.domain_frame
      },
      deliberationQueue: state.processing.deliberation_queue || null,
      instructions: state.processing.deliberation_type || "analyze_context"
    };

    return JSON.stringify({
      additionalContext: JSON.stringify(context, null, 2)
    });
  } catch (err) {
    // Fail silently -- subagent starts without context injection
    return '';
  }
}

module.exports = { handler };
```

### 8.4 SubagentStop Hook Handler

```javascript
// cc/hooks/iv-subagent-stop.cjs
// Fires when the inner-voice subagent completes

const fs = require('node:fs');
const path = require('node:path');

const RESULT_PATH = path.join(process.env.HOME, '.claude', 'dynamo', 'inner-voice-deliberation-result.json');

async function handler(input) {
  // Only handle inner-voice subagent stops
  if (!input || input.agent_name !== 'inner-voice') return '';

  try {
    const result = {
      status: 'complete',
      timestamp: new Date().toISOString(),
      injection: input.last_assistant_message || '',
      agent_id: input.agent_id || 'unknown',
      processing_duration_ms: input.duration_ms || 0
    };

    fs.writeFileSync(RESULT_PATH, JSON.stringify(result, null, 2));
  } catch (err) {
    // Log error but do not propagate
    const logPath = path.join(process.env.HOME, '.claude', 'dynamo', 'hook-errors.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] iv-subagent-stop error: ${err.message}\n`);
  }

  return '';  // SubagentStop cannot inject into parent context
}

module.exports = { handler };
```

---

## 9. Surviving Synthesis v2 Concepts Integration

This section maps each surviving concept from the steel-man analysis (INNER-VOICE-SYNTHESIS-RESEARCH.md) to its implementation within Reverie.

### 9.1 Consolidated Verdict Table

| # | Concept | Verdict | Confidence | v1.3 Implementation | v1.4 Implementation |
|---|---------|---------|------------|---------------------|---------------------|
| 1 | Frame-First Pipeline | **CONDITIONAL GO** | HIGH | Keyword classification, single frame, frame-weighted activation | Embedding classification, multi-frame fan-out, full frame-first pipeline |
| 2 | User-Relative Definitions | **DEFER** | HIGH | Direct graph context in injection formatting | Definition construction with compounding |
| 3 | Variable Substitution | **NO-GO** | HIGH | Replaced by adversarial counter-prompting | N/A |
| 4 | IV Memory | **CONDITIONAL GO** | MEDIUM | Operational state only (inner-voice-state.json) | Full IV memory schema with REM-gated writes |
| 5 | REM Consolidation | **GO** | HIGH | Tier 1 (PreCompact), Tier 3 basic (Stop synthesis) | Full REM: retroactive eval, observation synthesis, cascade promotion |
| 6 | Scalar Compute | **CONDITIONAL GO** | HIGH | 1-hop activation, deterministic scoring | 2-hop fan-out, multi-frame evaluation, batched LLM |
| 7 | Hybrid Subagent | **CONDITIONAL GO** | HIGH | CJS hooks for hot path + custom subagent for deliberation | Same architecture, enhanced subagent capabilities |

### 9.2 Concept 1: Frame-First Pipeline

**v1.3 implementation (frame-informed entity-first):**
- Domain classification inserted as step 4 in UserPromptSubmit pipeline (keyword/regex heuristic, <1ms)
- Classification result parameterizes activation propagation: edges matching the classified domain frame receive a 1.2-1.5x weight bonus
- Single dominant frame per prompt, not multi-frame fan-out
- Frame state persisted in `inner-voice-state.json` for PreCompact preservation

**v1.4 implementation (full frame-first):**
- Upgrade to embedding-based classification (MENH-08 local embeddings)
- Multi-frame fan-out: 2-3 parallel query sets from different domain perspectives
- Full frame-first pipeline where domain classification precedes entity extraction
- User-relative definition construction per activated frame (Concept 2 integration)

**Files affected:** `activation.cjs` (frame weight bonus), `inner-voice.cjs` (classification step), `inner-voice-state.json` (domain_frame field)

### 9.3 Concept 4: IV Memory

**v1.3 implementation:** No dedicated IV memory file. The operational state (`inner-voice-state.json`) provides:
- `injection_history` -- basic sublimation outcome tracking within and across sessions
- `self_model.recent_performance` -- injection acknowledgment rate
- `pending_associations` -- cascading tags that carry forward

**v1.4 implementation:** Full `inner-voice-memory.json` schema:

```javascript
{
  "version": 1,
  "created": "ISO-8601",
  "last_consolidated": "ISO-8601",

  // Sublimation outcomes -- direct behavioral feedback
  "sublimation_outcomes": [
    {
      "id": "sub_001",
      "session_id": "session_abc",
      "timestamp": "ISO-8601",
      "injection_content_hash": "sha256_hex",
      "entities_referenced": ["uuid_1", "uuid_2"],
      "domain_frame": "engineering",
      "tokens_used": 85,
      "user_engaged": true,
      "engagement_signal": "referenced_in_next_prompt",
      "confidence_in_signal": 0.7
    }
  ],

  // Domain frame productivity
  "frame_productivity": [
    {
      "frame": "engineering",
      "context_type": "debugging",
      "total_injections": 45,
      "engaged_injections": 32,
      "engagement_rate": 0.71,
      "last_updated": "ISO-8601"
    }
  ],

  // Chain evaluation history
  "chain_evaluations": [
    {
      "id": "chain_001",
      "anchor_entities": ["uuid_1"],
      "terminal_entities": ["uuid_5", "uuid_8"],
      "hops": 1,
      "score": 0.45,
      "threshold_at_evaluation": 0.6,
      "outcome": "below_threshold",
      "timestamp": "ISO-8601"
    }
  ],

  // Cascading association tags
  "cascading_tags": [
    {
      "entity": "uuid_3",
      "activation_at_tag": 0.55,
      "threshold_at_tag": 0.6,
      "trigger_context": "mentioned deployment pipeline",
      "tagged_at": "ISO-8601",
      "promotion_count": 0
    }
  ],

  // Relationship model evolution snapshots
  "relationship_snapshots": [
    {
      "snapshot_date": "ISO-8601",
      "session_count_at_snapshot": 50,
      "communication_preferences": ["direct", "no_emojis"],
      "working_patterns": ["deep_focus"],
      "affect_baseline": "engaged"
    }
  ]
}
```

**Retention policies:**
- Sublimation outcomes: last 500 records (older aggregated into frame_productivity)
- Chain evaluations: last 2,000 records (older pruned after deduplication purpose served)
- Cascading tags: auto-expire after 30 days of inactivity
- Relationship snapshots: one per month maximum

**Conditions for activation:**
1. REM consolidation (Concept 5) must be operational as the write gate
2. Storage growth bounded by retention policies
3. JSON-based for v1.4 (graph-backed migration path for v1.5+)

### 9.4 Concept 5: REM Consolidation

**v1.3 implementation:**
- **Tier 1 (PreCompact):** State preservation before context compaction. No LLM call for state persistence. One Haiku call for compact summary generation (~$0.005 per event). See Section 5.4.
- **Tier 3 basic (Stop):** Session synthesis via Sonnet (subagent for subscription, API for API plan). One Sonnet call per session end (~$0.27 per session on API plan, $0 on subscription). Self-model and relationship model updates. Basic observation extraction. See Section 5.3.

**v1.4 implementation:**
- **Full Tier 3 operations:** Retroactive evaluation, observation synthesis, cascade promotion/pruning
- **IV memory writes:** Sublimation outcomes, frame productivity, chain evaluations through REM gate
- **Inter-session consolidation batch jobs:** Periodic deep processing of accumulated IV memory

**Hook event mapping:**

| Tier | Hook | Trigger | Cost (API) | Cost (Subscription) |
|------|------|---------|------------|---------------------|
| Tier 1 | PreCompact | Context ~95% full | ~$0.005 | ~$0.005 |
| Tier 3 basic (v1.3) | Stop | Session end | ~$0.27 | $0 (subagent) |
| Tier 3 full (v1.4) | Stop | Session end | ~$0.57 | $0 (subagent) |

### 9.5 Concept 7: Hybrid Subagent Architecture

Fully detailed in Section 4 (The Hybrid Architecture). Key implementation points:

- Hot path: CJS command hooks with deterministic processing + `additionalContext` injection
- Deliberation: custom `inner-voice` subagent with Sonnet (subscription) or direct API (API plan)
- State bridge: SubagentStop writes to file, UserPromptSubmit reads and injects
- Rate limit degradation: fall back to hot-path-only
- Custom subagent defined in `cc/agents/inner-voice.md` (see Section 8)

---

## 10. Cost Model

### 10.1 Daily Cost Projection (API Plan Users)

| Operation | Model | v1.3 Frequency/Day | Tokens (in+out) | Cost/Day |
|-----------|-------|---------------------|-----------------|----------|
| Hot path formatting | Haiku | ~80 | 2K in + 500 out | $0.36 |
| Domain classification | None | ~150 | -- | $0.00 |
| Deliberation injections | Sonnet | ~15 | 8K in + 2K out | $0.81 |
| Session start briefing | Sonnet | ~5 | 10K in + 3K out | $0.38 |
| Stop synthesis (REM Tier 3) | Sonnet | ~5 | 8K in + 2K out | $0.27 |
| PreCompact (REM Tier 1) | Haiku | ~2 | 2K in + 500 out | $0.01 |
| Self-model updates | Sonnet | ~5 | 5K in + 1K out | $0.15 |
| **v1.3 Total (API plan)** | | | | **$1.98/day** |
| **With prompt caching** | | | | **$1.21/day** |

### 10.2 Daily Cost Projection (Subscription Plan Users)

| Operation | Model | v1.3 Frequency/Day | Cost/Day | Notes |
|-----------|-------|---------------------|----------|-------|
| Hot path formatting | Haiku | ~80 | $0.36 | CJS hook + Haiku formatting call |
| Domain classification | None | ~150 | $0.00 | Deterministic |
| Deliberation injections | Sonnet (subagent) | ~15 | $0.00* | Included in subscription |
| Session start briefing | Sonnet (subagent) | ~5 | $0.00* | Included in subscription |
| Stop synthesis (REM Tier 3) | Sonnet (subagent) | ~5 | $0.00* | Included in subscription |
| PreCompact (REM Tier 1) | Haiku | ~2 | $0.01 | CJS hook + Haiku call |
| Self-model updates | Sonnet (subagent) | ~5 | $0.00* | Part of Stop synthesis |
| **v1.3 Total (subscription)** | | | **$0.37/day** | *Subject to rate limits |

### 10.3 Monthly Cost Summary

| Scenario | Daily | Monthly | vs. Baseline ($0.70/day) |
|----------|-------|---------|--------------------------|
| Current Dynamo (baseline) | $0.70 | $21 | -- |
| **API plan** | | | |
| v1.3 (without caching) | $1.98 | $59 | +$38 |
| v1.3 (with caching) | $1.21 | $36 | +$15 |
| v1.4 (full, without caching) | $3.39-6.19 | $102-186 | +$81-165 |
| v1.4 (full, with caching) | $2.40-4.30 | $72-129 | +$51-108 |
| **Subscription plan** | | | |
| v1.3 | $0.37 | $11 | -$10 (cheaper than baseline) |
| v1.4 | $0.37 | $11 | -$10 (subagent costs subscription-included) |

### 10.4 Key Cost Insights

1. **Subscription users save money.** The hybrid architecture means subscription users pay LESS than the current Haiku curation baseline ($0.37/day vs $0.70/day) because Haiku curation calls are replaced by subagent processing at zero marginal cost. The remaining $0.37/day is hot path formatting calls only.

2. **API plan costs are manageable.** $1.98/day ($59/month) without caching, $1.21/day ($36/month) with caching. The increase over baseline is justified by the quality improvement from context-aware injection.

3. **Prompt caching is important for API users.** 40-50% reduction on input tokens. The Inner Voice's system prompt (including self-model and relationship model JSON) is reused across all calls within a session.

4. **Budget enforcement (CORTEX-03) is critical for API plan.** Hard daily budget cap that degrades to hot-path-only when exhausted prevents runaway costs. Subscription users use rate limit monitoring instead.

---

## 11. Migration Path

### 11.1 Files Moving TO Reverie

| Current Location | New Location | Origin Subsystem |
|-----------------|-------------|-----------------|
| `ledger/hooks/session-start.cjs` | `subsystems/reverie/handlers/session-start.cjs` | Ledger (hooks/) |
| `ledger/hooks/prompt-submit.cjs` | `subsystems/reverie/handlers/user-prompt.cjs` | Ledger (hooks/) |
| `ledger/hooks/pre-compact.cjs` | `subsystems/reverie/handlers/pre-compact.cjs` | Ledger (hooks/) |
| `ledger/hooks/stop.cjs` | `subsystems/reverie/handlers/stop.cjs` | Ledger (hooks/) |
| `ledger/curation.cjs` (LLM functions) | `subsystems/reverie/curation.cjs` | Ledger |
| `dynamo/prompts/` | `cc/prompts/` | Dynamo |

### 11.2 New Files Created

| File | Purpose |
|------|---------|
| `subsystems/reverie/inner-voice.cjs` | Core pipeline orchestrator (new) |
| `subsystems/reverie/dual-path.cjs` | Hot/deliberation path routing (new) |
| `subsystems/reverie/activation.cjs` | Activation map management (new) |
| `subsystems/reverie/handlers/post-tool-use.cjs` | Lightweight activation update (new) |
| `subsystems/reverie/handlers/iv-subagent-start.cjs` | SubagentStart handler (new) |
| `subsystems/reverie/handlers/iv-subagent-stop.cjs` | SubagentStop handler (new) |
| `cc/agents/inner-voice.md` | Custom subagent definition (new) |
| `cc/prompts/iv-system-prompt.md` | Inner Voice system prompt (new) |
| `cc/prompts/adversarial-counter.md` | Adversarial counter-prompting template (new) |
| `cc/prompts/session-briefing.md` | Session start briefing template (new) |
| `inner-voice-state.json` | Operational state (new, runtime) |
| `inner-voice-deliberation-result.json` | State bridge (new, runtime, transient) |

### 11.3 Breaking Changes

| Change | Impact | Mitigation |
|--------|--------|------------|
| Hook handlers move from `ledger/hooks/` to `subsystems/reverie/handlers/` | Switchboard dispatcher routing table must update | Update `HANDLER_ROUTES` in dispatcher during 1.3-M1 migration |
| Curation LLM functions move from Ledger to Reverie | Consumers calling `curateResults` must import from Reverie | Clear import path: LLM functions from Reverie, format functions from Ledger |
| Prompt templates move from `dynamo/prompts/` to `cc/prompts/` | Path references in curation code must update | Update path constants in `curation.cjs` |
| New state files created at runtime | `~/.claude/dynamo/` gains new JSON files | Non-breaking: files created on first hook invocation |

### 11.4 Feature Flag

The `reverie.mode` configuration provides instant rollback:

```javascript
// In Switchboard dispatcher, before routing to Reverie:
if (config.reverie.mode === 'classic') {
  // Route to legacy Haiku curation pipeline (current v1.2.1 behavior)
  return classicCuration(event, context);
}
// Route to Reverie Inner Voice pipeline
return reverieHandler(event, context);
```

This feature flag eliminates catastrophic risk from the intelligence layer upgrade. If Reverie produces lower-quality injections than classic Haiku curation, a single config change (`dynamo config set reverie.mode classic`) reverts to v1.2.1 behavior.

---

## 12. Adversarial Analysis

### 12.1 Failure Mode Taxonomy

| Failure Mode | Cause | Severity | How It Manifests | Mitigation |
|-------------|-------|----------|-----------------|------------|
| **False positive injection** | Threshold too low; irrelevant insight surfaces | LOW-MEDIUM | Active session receives unhelpful context; user ignores it | Raise threshold through metacognitive adjustment; track injection acknowledgment rate |
| **False negative (under-sublimation)** | Threshold too high; relevant insight not surfaced | MEDIUM | User asks "do you not remember X?" or re-explains context | Lower threshold; explicit recall bypass that overrides threshold entirely |
| **Wrong framing** | Affect misattribution; incorrect relational model | MEDIUM | Injection frames information with wrong tone or context | Update relational model; provide user correction pathway (`dynamo voice reset`) |
| **Stale self-model** | Model not updated after significant changes | HIGH | Persistently wrong injection context; system operates on outdated assumptions | Confidence decay on model assertions over time; periodic recalibration at Stop hook |
| **Over-sublimation** | Injection flooding degrades active session performance | HIGH | Cognitive load exceeds capacity; task performance drops | Hard volume limits per Cognitive Load Theory; dynamic injection budget |
| **Confidently wrong** | Self-model drift with no metacognitive detection | CRITICAL | System is wrong and does not know it is wrong; monitoring relies on the drifted model | Confidence decay; user correction pathway; periodic state review; fallback to classic mode |
| **Cascading false associations** | Poor knowledge store quality; entity resolution errors | MEDIUM | Irrelevant cascading activations; noise in activation map | Depth limits on propagation (1 hop v1.3); graph density threshold before enabling spreading activation |

### 12.2 The "Confidently Wrong" Problem

The most dangerous failure mode. It occurs when the self-model has drifted from reality but metacognitive monitoring does not flag it because the monitoring itself relies on the same drifted model. Four mitigations:

1. **Confidence decay.** Self-model assertions lose confidence over time unless reinforced by new evidence. An assertion not confirmed within 30 days drops from HIGH to MEDIUM confidence automatically.

2. **User correction pathway.** Direct user input overrides inferred values. `dynamo voice reset` clears the self-model and relationship model, forcing Reverie to rebuild from graph data.

3. **Periodic recalibration.** After N sessions (configurable, default 50), Reverie generates a "state of understanding" summary the user can review. This is logged but does not automatically inject into sessions.

4. **Classic curation fallback.** If the `reverie.mode` feature flag is set to `classic`, the entire Reverie processing pipeline is bypassed and the system reverts to Haiku curation. This eliminates catastrophic risk.

### 12.3 Claude Code Platform Constraints

| Constraint | Impact on Reverie | Mitigation |
|-----------|-------------------|------------|
| Hook timeout | Hooks that exceed Claude Code's timeout are killed | Hot path designed for <500ms; internal timeout via `Promise.race` |
| SubagentStop cannot inject into parent | Deliberation results cannot appear immediately | State bridge pattern with one-turn delay (acceptable) |
| No nested subagents | Inner Voice subagent cannot spawn sub-subagents | All processing serialized within single subagent context; maxTurns: 10 |
| Rate limits (subscription) | Heavy IV processing competes with user's primary work | Rate limit degradation to hot-path-only; graceful fallback |
| No background threads | Cannot run continuous processing between hook events | Event-driven + persistent state design (not a compromise -- the correct design) |
| Settings.json is the hook registry | All hooks must be registered in Claude Code's settings | Switchboard manages settings.json during install; single dispatcher handles all events |

### 12.4 Subsystem Boundary Risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| Assay query latency on hot path | If Assay's graph queries take >200ms, the hot path exceeds 500ms | Activation map maintained in JSON state file (in-memory during processing); Assay queried only for full re-propagation |
| Ledger write failure during Stop | If Ledger cannot write the session episode, synthesis is lost | Reverie persists synthesis to state file first, then writes via Ledger; state file is the source of truth |
| Switchboard dispatch overhead | If Switchboard adds >50ms before reaching Reverie handler | Switchboard dispatcher is lightweight CJS (toggle check, scope build, require handler); total overhead <20ms |
| Terminus transport failure | If the knowledge graph is unreachable, Assay queries return empty | Reverie degrades to state-only processing; activation map still works from cached state; injections based on available context |

---

## 13. Open Questions

### 13.1 Embedding Model for Semantic Shift Detection

The hot path's semantic shift detection depends on prompt embeddings. Options:

- **Graphiti's existing embedding model** (whatever is configured) -- recommended for v1.3
- **Separate local embedding model** (MENH-08) -- evaluate for v1.4 when latency optimization becomes critical
- **Fall back to keyword overlap** when no embedding is available -- v1.3 fallback

### 13.2 Subagent Spawn Trigger

How does the main session know to spawn the `inner-voice` subagent when deliberation is queued?

**Options:**
1. **Explicit spawn instruction in additionalContext:** The UserPromptSubmit hook returns injection text that includes a directive like "Spawn the inner-voice subagent for deep analysis." The main session model reads this and spawns the subagent.
2. **Manual trigger:** The user invokes `/inner-voice` or similar command.
3. **Automatic background spawn:** Claude Code spawns subagents based on schedule or trigger.

**Recommendation:** Option 1 for v1.3. The hook's `additionalContext` can include processing instructions that the main session model interprets. This is the least intrusive approach and does not require Claude Code platform changes.

### 13.3 Graph Density Bootstrapping

With a new or sparse knowledge graph (<100 entities), spreading activation provides no value. Reverie should start with simple entity-mention matching and automatically enable spreading activation when the density threshold is reached.

**Implementation:** `activation.cjs` checks entity and relationship counts at session start. If below threshold, `propagateActivation()` is a no-op and the activation map is populated only from direct mentions.

### 13.4 Evaluation Metrics

No baseline measurements exist for the current Haiku curation pipeline. Establishing baselines before Reverie deployment is essential. Proposed metrics:

| Metric | What It Measures | How |
|--------|-----------------|-----|
| Injection relevance rate | % of injections user references in subsequent prompts | Track injection-to-user-behavior correlation |
| Silence accuracy | % of non-injection decisions that were correct | Track when user asks for missing context |
| Cost efficiency | Relevance rate per unit of cost spent | Computed from above + cost tracking |
| Hot path latency p95 | 95th percentile hot path latency | Timing instrumentation in handlers |

### 13.5 Prompt Engineering Quality

The Inner Voice's quality depends entirely on its system prompt and prompt templates. A poorly designed system prompt produces a poorly performing Inner Voice regardless of architectural quality. This is the single most important and least predictable factor.

**Recommendation:** Invest significant effort in prompt engineering and A/B testing between classic and cortex modes before full rollout. The feature flag enables safe experimentation.

---

## Document References

| Document | Relationship |
|----------|-------------|
| **INNER-VOICE-ABSTRACT.md** | Platform-agnostic concept definition. Reverie applies this abstract to Claude Code. |
| **DYNAMO-PRD.md** | Defines Reverie's role in the six-subsystem architecture (Section 3.1, 3.3). |
| **ASSAY-SPEC.md** | Read-side interface. Reverie queries Assay for knowledge graph data. |
| **LEDGER-SPEC.md** | Write-side interface. Reverie calls Ledger to create episodes and observations. |
| **TERMINUS-SPEC.md** | Transport layer. Reverie's reads and writes flow through Terminus via Assay/Ledger. |
| **SWITCHBOARD-SPEC.md** | Dispatcher. Switchboard routes hook events to Reverie's handlers. |
| **INNER-VOICE-SPEC.md** | Predecessor mechanical specification. Reverie-SPEC supersedes this with updated architecture. |
| **INNER-VOICE-SYNTHESIS-RESEARCH.md** | Steel-man analysis of Synthesis v2 concepts. Informs Sections 4, 5, 8, 9. |
| **INNER-VOICE-SYNTHESIS-v2.md** | Theoretical extensions (7 concepts). Surviving concepts integrated in Section 9. |
| **LEDGER-CORTEX-ANALYSIS.md** | Component verdicts and Option C recommendation. Reverie is the Inner Voice component. |

---

*Specification date: 2026-03-19*
*Subsystem: Reverie (Inner Voice)*
*Platform: Claude Code (Max subscription)*
*Architecture: Hybrid -- CJS command hooks for hot path + custom subagent for deliberation*
*Interfaces: Reads through Assay, writes through Ledger, dispatched by Switchboard, uses Terminus transport*
*Surviving Synthesis v2 concepts: 1 (Frame-First, CONDITIONAL GO), 4 (IV Memory, CONDITIONAL GO), 5 (REM, GO), 7 (Hybrid Subagent, CONDITIONAL GO)*
*Migration source: ledger/hooks/{session-start,prompt-submit,pre-compact,stop}.cjs + ledger/curation.cjs (LLM functions) + dynamo/prompts/*
