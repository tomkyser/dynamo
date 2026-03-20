# Architecture: Reverie Integration into Dynamo

**Domain:** Inner Voice cognitive layer integration into six-subsystem Dynamo memory platform
**Researched:** 2026-03-20
**Confidence:** HIGH (based on existing specs + verified Claude Code platform docs + live codebase analysis)
**Milestone:** v1.3-M2 Core Intelligence

---

## 1. Executive Summary

This document specifies how the Reverie subsystem (Inner Voice) integrates with Dynamo's existing six-subsystem architecture. It covers four data flows (hot-path injection, deliberation-path activation, cost tracking, and memory backfill), identifies all new and modified modules with file paths, defines the build order across M2 requirements, and ensures six-subsystem boundary rules are honored throughout.

The integration is a surgical transformation: the hook dispatcher (`cc/hooks/dynamo-hooks.cjs`) gains a mode switch that routes to either classic Ledger handlers or new Reverie handlers. Reverie's CJS modules provide deterministic hot-path processing. Claude Code's custom subagent system provides the deliberation path. A file-based state bridge connects the two. Cost monitoring wraps all LLM-calling paths. The bare `dynamo` CLI shim is a self-contained install-time symlink.

**Key architectural principle:** The dispatcher stays thin. It gains a feature flag check and a new routing table, but all intelligence lives in `subsystems/reverie/`. The boundary rules hold: Ledger writes, Assay reads, Reverie orchestrates both, Switchboard dispatches, Terminus transports.

---

## 2. Integration Points: Existing to New

### 2.1 Hook Dispatcher Modification (cc/hooks/dynamo-hooks.cjs)

The dispatcher is the single integration seam. Currently it routes all events to Ledger handlers. After M2, it conditionally routes cognitive events to Reverie handlers based on `reverie.mode` in config.

**Current routing table (v1.3-M1):**

```
SessionStart      -> subsystems/ledger/hooks/session-start.cjs
UserPromptSubmit  -> subsystems/ledger/hooks/prompt-augment.cjs
PostToolUse       -> subsystems/ledger/hooks/capture-change.cjs
PreCompact        -> subsystems/ledger/hooks/preserve-knowledge.cjs
Stop              -> subsystems/ledger/hooks/session-summary.cjs
```

**M2 routing table (dual-mode):**

```javascript
// Feature flag determines routing
const config = loadConfig();
const mode = config.reverie?.mode || 'classic';

if (mode === 'cortex') {
  // Reverie handlers for cognitive events
  SessionStart      -> subsystems/reverie/handlers/session-start.cjs
  UserPromptSubmit  -> subsystems/reverie/handlers/user-prompt.cjs
  PreCompact        -> subsystems/reverie/handlers/pre-compact.cjs
  Stop              -> subsystems/reverie/handlers/stop.cjs

  // PostToolUse dispatches to BOTH (parallel)
  PostToolUse       -> subsystems/ledger/hooks/capture-change.cjs  (file capture)
                    -> subsystems/reverie/handlers/post-tool-use.cjs (activation update)
} else {
  // Classic mode: existing Ledger handlers (v1.2.1 behavior)
  SessionStart      -> subsystems/ledger/hooks/session-start.cjs
  UserPromptSubmit  -> subsystems/ledger/hooks/prompt-augment.cjs
  PostToolUse       -> subsystems/ledger/hooks/capture-change.cjs
  PreCompact        -> subsystems/ledger/hooks/preserve-knowledge.cjs
  Stop              -> subsystems/ledger/hooks/session-summary.cjs
}
```

**Boundary compliance:** Switchboard (dispatcher) routes events. It does not implement handler logic. The `mode` check adds ~1ms overhead (config read is cached). Ledger's capture-change.cjs remains in Ledger because it decides WHAT to extract from file changes (write-side logic). Reverie's post-tool-use.cjs updates the activation map (cognitive logic).

**New hook registrations for settings-hooks.json:**

```json
{
  "SubagentStart": [
    {
      "matcher": "inner-voice",
      "hooks": [
        {
          "type": "command",
          "command": "node \"$HOME/.claude/dynamo/cc/hooks/dynamo-hooks.cjs\"",
          "timeout": 10
        }
      ]
    }
  ],
  "SubagentStop": [
    {
      "matcher": "inner-voice",
      "hooks": [
        {
          "type": "command",
          "command": "node \"$HOME/.claude/dynamo/cc/hooks/dynamo-hooks.cjs\"",
          "timeout": 10
        }
      ]
    }
  ]
}
```

The dispatcher handles SubagentStart/SubagentStop by checking `agent_type === 'inner-voice'` and routing to Reverie's subagent handlers. These are new events that only fire when the inner-voice custom subagent is spawned/completed.

**Verified platform support:** Claude Code supports SubagentStart and SubagentStop hook events with matcher filtering by agent name. SubagentStart receives `{ session_id, transcript_path, cwd, hook_event_name, agent_id, agent_type }`. SubagentStop receives `{ session_id, transcript_path, cwd, permission_mode, hook_event_name, stop_hook_active, agent_id, agent_type, agent_transcript_path, last_assistant_message }`. SubagentStart hooks can inject context into the subagent via structured JSON output with `hookSpecificOutput.additionalContext`. SubagentStop hooks cannot inject into the parent context (confirmed: GitHub issue #5812 closed NOT_PLANNED).

### 2.2 Hook Output Format Consideration

**Discovery:** The current dispatcher uses raw `process.stdout.write()` for injection, intercepted and wrapped in boundary markers. Claude Code also supports structured JSON output with `hookSpecificOutput.additionalContext`. For M2, Reverie handlers should return structured data that the dispatcher formats appropriately.

**Current pattern (Ledger handlers):**
```javascript
// Handler writes directly to stdout
process.stdout.write('[RELEVANT MEMORY]\n\n' + curated);
// Dispatcher wraps in boundary markers
```

**M2 pattern (Reverie handlers):**
```javascript
// Handler returns structured result
return { additionalContext: injection, metadata: { path: 'hot', tokens: 85 } };
// Dispatcher formats for output (boundary markers for backward compat)
```

This is a refinement, not a breaking change. The dispatcher already intercepts stdout. Reverie handlers return data instead of writing to stdout, and the dispatcher formats it. Classic-mode handlers continue using stdout. Both paths produce the same external output.

**SubagentStart output format:** SubagentStart hooks must output structured JSON to stdout for `additionalContext` injection:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "SubagentStart",
    "additionalContext": "serialized IV state for subagent context"
  }
}
```

### 2.3 Ledger Interface (Write-Side)

Reverie calls Ledger for graph writes. No Ledger modifications required -- Reverie uses the existing `addEpisode()` API.

**Existing interface (unchanged):**
```javascript
const { addEpisode } = require(resolve('ledger', 'episodes.cjs'));
await addEpisode(content, scope, { hookName: 'reverie-stop' });
```

**What Reverie writes through Ledger:**
- Session synthesis episodes (Stop handler, REM Tier 3)
- Pre-compact preservation episodes (PreCompact handler, REM Tier 1)

**Boundary compliance:** Reverie decides WHAT to write. Ledger executes the write. Reverie never imports from Terminus directly for graph writes.

### 2.4 Assay Interface (Read-Side)

Reverie calls Assay for graph reads. No Assay modifications required -- Reverie uses the existing `combinedSearch()` and session APIs.

**Existing interface (unchanged):**
```javascript
const { combinedSearch } = require(resolve('assay', 'search.cjs'));
const results = await combinedSearch(query, scope, { hookName: 'reverie-prompt' });

const { indexSession, generateAndApplyName } = require(resolve('assay', 'sessions.cjs'));
```

**What Reverie reads through Assay:**
- Entity search results for activation map population (UserPromptSubmit, SessionStart)
- Session history for briefing generation (SessionStart)
- Entity relationship data for 1-hop propagation (activation.cjs)

**Boundary compliance:** Reverie decides WHAT to read. Assay executes the query. Assay never writes.

### 2.5 Curation Migration (Ledger to Reverie)

The LLM-calling functions in `subsystems/ledger/curation.cjs` move to `subsystems/reverie/curation.cjs`. Deterministic formatting functions stay in Ledger.

**Functions moving to Reverie:**
- `curateResults()` -- LLM-powered relevance filtering
- `summarizeText()` -- LLM-powered session synthesis
- `generateSessionName()` -- LLM-powered session naming
- `callHaiku()` -- low-level LLM call wrapper

**Functions staying in Ledger:**
- `addEpisode()` (episodes.cjs -- unchanged)
- `extractContent()` (episodes.cjs -- unchanged)

**The dividing line:** If it calls an LLM, it belongs to Reverie (cognitive processing). If it formats data or writes to the graph, it belongs to Ledger (data construction).

**Migration approach:** Phase the migration. First, Reverie's curation.cjs wraps Ledger's existing functions (re-exports with cost-tracking integration). Second, move the actual code and update imports. The classic-mode route to Ledger's handlers still needs these functions, so the Ledger originals remain available during the transition. Once `reverie.mode: cortex` is proven, Ledger's LLM functions can be removed (they become dead code in classic-mode-removed future).

### 2.6 Config.json Extension

The existing `dynamo/config.json` gains a `reverie` section. The `loadConfig()` function in `lib/core.cjs` already uses spread merging with defaults, so new config sections need defaults added.

**New config section:**
```json
{
  "reverie": {
    "enabled": true,
    "mode": "classic",
    "billing_model": "subscription",
    "hot_path": {
      "max_latency_ms": 500,
      "entity_confidence_threshold": 0.7,
      "semantic_shift_threshold": 0.4,
      "min_cached_results": 3
    },
    "deliberation": {
      "model": "claude-sonnet-4-6-20250514",
      "max_latency_ms": 2000,
      "max_turns": 10
    },
    "injection": {
      "session_start_max_tokens": 500,
      "mid_session_max_tokens": 150,
      "urgent_max_tokens": 50
    },
    "activation": {
      "sublimation_threshold": 0.6,
      "decay_rate": 0.1,
      "propagation_hops": 1,
      "convergence_bonus": 1.5,
      "density_threshold_entities": 100,
      "density_threshold_relationships": 200
    },
    "cost": {
      "daily_budget_dollars": 5.00,
      "monthly_budget_dollars": 100.00,
      "hot_path_only_on_budget_exhaust": true,
      "tracking_file": "cost-tracker.json"
    }
  }
}
```

**Startup behavior:** `reverie.mode` defaults to `"classic"` on first install. The user (or Claude) switches to `"cortex"` after Reverie is validated. This is the instant rollback mechanism (MGMT-10).

### 2.7 CLI Router Extension (dynamo.cjs)

The CLI router gains new commands for Reverie management:

```javascript
case 'voice': {
  const reverie = require(resolve('reverie', 'inner-voice.cjs'));
  const subCmd = restArgs[0];
  switch (subCmd) {
    case 'status':   // Show IV state summary
    case 'explain':  // Explain last injection decision
    case 'reset':    // Reset self-model and relationship model
    case 'mode':     // Get/set reverie.mode (classic/cortex)
    default: error('Usage: dynamo voice <status|explain|reset|mode>');
  }
  break;
}

case 'cost': {
  const costTracker = require(resolve('reverie', 'cost-tracker.cjs'));
  const subCmd = restArgs[0];
  switch (subCmd) {
    case 'today':    // Show today's cost breakdown
    case 'month':    // Show monthly cost summary
    case 'budget':   // Get/set budget limits
    case 'reset':    // Reset cost counters
    default: error('Usage: dynamo cost <today|month|budget|reset>');
  }
  break;
}

case 'backfill': {
  const backfill = require(resolve('reverie', 'backfill.cjs'));
  await backfill.run(restArgs, pretty);
  break;
}
```

---

## 3. New Modules (subsystems/reverie/)

### 3.1 Complete Module Map

```
subsystems/reverie/
  inner-voice.cjs            # Core pipeline orchestrator
  dual-path.cjs              # Hot/deliberation path routing and scoring
  activation.cjs             # Activation map management, spreading activation
  curation.cjs               # Intelligent curation (migrated from Ledger)
  cost-tracker.cjs           # Per-operation/day/month budget tracking (CORTEX-03)
  backfill.cjs               # Memory backfill from past transcripts
  handlers/
    session-start.cjs        # SessionStart handler (cortex mode)
    user-prompt.cjs          # UserPromptSubmit handler (cortex mode)
    pre-compact.cjs          # PreCompact handler (cortex mode)
    stop.cjs                 # Stop handler (cortex mode)
    post-tool-use.cjs        # PostToolUse activation update (lightweight)
    subagent-start.cjs       # SubagentStart handler (inner-voice only)
    subagent-stop.cjs        # SubagentStop handler (inner-voice only)

cc/agents/
  inner-voice.md             # Custom subagent definition (YAML frontmatter)

cc/prompts/
  iv-system-prompt.md        # Inner Voice system prompt for deliberation
  session-briefing.md        # Session start briefing template
  adversarial-counter.md     # Adversarial counter-prompting template
  (existing prompts curation.md, session-summary.md, etc. remain)

State files (runtime, in ~/.claude/dynamo/):
  inner-voice-state.json     # Operational state (~10-50KB)
  inner-voice-deliberation-result.json  # State bridge (transient, ~1-5KB)
  cost-tracker.json          # Cost accumulator (persistent)
```

### 3.2 Module Descriptions and Interfaces

#### inner-voice.cjs (Core Pipeline Orchestrator)

Central module implementing per-hook processing pipelines. All handlers delegate to this module.

```javascript
module.exports = {
  processUserPrompt(promptData, state, pendingResult, options) ->
    { injection: string|null, updatedState: object },

  processSessionStart(sessionData, state, options) ->
    { briefing: string, updatedState: object },

  processStop(sessionData, state, options) ->
    { synthesis: object, updatedState: object },

  processPreCompact(compactData, state, options) ->
    { summary: string, updatedState: object },

  processPostToolUse(toolData, state, options) ->
    { updatedState: object },

  loadState(options) -> object,
  persistState(state, options) -> void,
  getDefaultState() -> object
};
```

**Dependencies:** `dual-path.cjs`, `activation.cjs`, `curation.cjs`, `cost-tracker.cjs`, Assay (`search.cjs`), Ledger (`episodes.cjs`), `lib/core.cjs`.

#### dual-path.cjs (Path Routing and Scoring)

Deterministic path selection. No LLM call for the decision itself.

```javascript
module.exports = {
  selectPath(activationMap, semanticShift, predictions, config) ->
    'hot' | 'deliberation' | 'skip',

  executeHotPath(entities, state, domainFrame, options) ->
    { injection: string, tokens: number },

  queueDeliberation(entities, state, domainFrame, options) ->
    { queued: boolean, fallbackInjection: string|null },

  shouldUseSubagent(config) -> boolean,

  formatInjection(content, context, tokenLimit) -> string
};
```

**Path selection signals (all deterministic):**

| Signal | Hot Path | Deliberation Path |
|--------|----------|-------------------|
| Entity match confidence | >= 0.7 | < 0.7 |
| Cached result count | >= 3 | < 3 |
| Semantic shift score | < 0.4 | >= 0.4 |
| Explicit recall request | Never | Always |
| Session start briefing | Never | Always |
| Rate limit / budget exhausted | Always (fallback) | Never |

#### activation.cjs (Activation Map Management)

Spreading activation from the Abstract applied to Graphiti's entity-relationship structure.

```javascript
module.exports = {
  updateActivation(entities, currentMap, domainFrame, options) -> updatedMap,
  propagateActivation(anchorEntities, graphData, hops, decayFactor) -> activationMap,
  checkThresholdCrossings(activationMap, threshold) -> crossedEntities[],
  decayAll(activationMap, timeDelta) -> decayedMap,
  computeSublimationScore(entity, predictions, currentContext, cognitiveLoad) -> number,
  classifyDomainFrame(promptText) -> { frame: string, confidence: number }
};
```

**v1.3 constraints:** 1-hop propagation only. Keyword/regex domain classification. Graph density check before enabling spreading activation (falls back to direct-mention-only below 100 entities / 200 relationships).

#### cost-tracker.cjs (CORTEX-03: Cost Monitoring)

Per-operation, per-day, per-month budget tracking with hard enforcement.

```javascript
module.exports = {
  trackOperation(operation, model, inputTokens, outputTokens, options) -> void,
  getTodayCost(options) -> { total: number, breakdown: object },
  getMonthCost(options) -> { total: number, breakdown: object },
  isBudgetExhausted(options) -> boolean,
  getBudgetStatus(options) -> { daily: object, monthly: object },
  resetCounters(scope, options) -> void
};
```

**Storage:** `cost-tracker.json` in `~/.claude/dynamo/`. Keyed by date (`YYYY-MM-DD`) for daily rollover. Monthly totals computed by summing daily entries.

**Enforcement:** Every LLM-calling function checks `isBudgetExhausted()` before making the call. If exhausted, falls back to hot-path-only.

**Pricing data:** Hardcoded cost-per-token table for known models (Haiku, Sonnet). Updated via config or migration when prices change.

#### backfill.cjs (Memory Backfill)

Batch processing of past chat transcripts to populate the knowledge graph retroactively.

```javascript
module.exports = {
  run(args, pretty, options) -> { processed: number, errors: number },
  discoverTranscripts(projectDir, options) -> transcriptPaths[],
  processTranscript(transcriptPath, options) -> { entities: number, episodes: number },
  estimateCost(transcriptPaths, options) -> { estimatedCost: number, tokenEstimate: number }
};
```

**Data source:** Claude Code transcript files at `~/.claude/projects/{project}/{sessionId}.jsonl`. Each line is a JSON entry with role, content, tool calls, etc.

**Processing model:** Batch job using subagent or direct API. Reads transcripts, extracts entities and relationships, writes episodes through Ledger. Cost-tracked through `cost-tracker.cjs`.

#### handlers/*.cjs (Hook Handlers)

Each handler follows the same pattern: load state, delegate to inner-voice.cjs pipeline, persist state, return injection (or null).

```javascript
// Pattern for handlers/user-prompt.cjs
module.exports = async function handleUserPrompt(ctx, options = {}) {
  const iv = require(resolve('reverie', 'inner-voice.cjs'));
  const costTracker = require(resolve('reverie', 'cost-tracker.cjs'));

  // Cost gate: if budget exhausted, degrade to minimal hot-path
  const budgetExhausted = costTracker.isBudgetExhausted(options);

  const state = iv.loadState(options);
  const pendingResult = checkPendingDeliberation(options);
  const { injection, updatedState } = iv.processUserPrompt(
    ctx, state, pendingResult, { ...options, budgetExhausted }
  );
  iv.persistState(updatedState, options);

  return injection ? { additionalContext: injection } : null;
};
```

**SubagentStart handler:** Reads IV state, serializes relevant sections (self_model, relationship_model, activation_map, predictions, domain_frame, deliberation_queue), returns structured JSON with `additionalContext`.

**SubagentStop handler:** Reads `last_assistant_message` from input, writes to `inner-voice-deliberation-result.json` state bridge file. Returns empty (cannot inject into parent).

---

## 4. Data Flow Diagrams

### 4.1 Hot-Path Injection (UserPromptSubmit, <500ms)

This is the 95% path. Deterministic CJS processing with no LLM call on the pure fast path.

```
User types prompt
  |
  v
Claude Code fires UserPromptSubmit hook
  |
  v
cc/hooks/dynamo-hooks.cjs (dispatcher)
  | [toggle gate, input validation, boundary markers]
  | [check config.reverie.mode]
  |
  v  (mode === 'cortex')
subsystems/reverie/handlers/user-prompt.cjs
  |
  +-- 1. Load inner-voice-state.json                          [<5ms]
  |
  +-- 2. Check inner-voice-deliberation-result.json           [<5ms]
  |      (if exists and status=complete: consume + delete)
  |
  +-- 3. Classify domain frame (keyword/regex)                [<1ms]
  |
  +-- 4. Detect semantic shift (cosine or keyword overlap)    [<5ms]
  |
  +-- 5. Update activation map                                [10-50ms]
  |      +-- Extract entities from prompt (pattern match)
  |      +-- Activate in map, propagate 1-hop via Assay
  |      +-- Apply domain frame weight bonus
  |      +-- Decay existing activations
  |      +-- Check threshold crossings
  |
  +-- 6. Select path (deterministic)                          [<1ms]
  |      entity_confidence >= 0.7 AND cached_results >= 3
  |      AND semantic_shift < 0.4 => HOT PATH
  |
  +-- 7. Execute hot path                                     [50-200ms]
  |      +-- Retrieve cached/indexed results via Assay
  |      +-- Format using template (no LLM) OR Haiku (<200ms)
  |      +-- Apply cognitive load limits (150 tokens mid-session)
  |      +-- Track cost via cost-tracker.cjs
  |
  +-- 8. Persist updated state                                [<5ms]
  |
  +-- 9. Return { additionalContext: "injection..." }
  |
  v
Dispatcher wraps in boundary markers, outputs to stdout
  |
  v
Claude Code injects into model context
```

**Total latency budget: 100-500ms** (well within 15s hook timeout)

### 4.2 Deliberation-Path Activation (UserPromptSubmit -> Subagent -> next UserPromptSubmit)

This is the 5% path. Fires when the hot path determines deliberation is needed.

```
UserPromptSubmit (turn N)
  |
  v
handlers/user-prompt.cjs
  | [steps 1-6 same as hot path]
  | [step 6: selectPath() returns 'deliberation']
  |
  +-- 7a. Queue deliberation in state                         [<5ms]
  |       state.processing.deliberation_pending = true
  |       state.processing.deliberation_queue = { entities, frame, context }
  |
  +-- 7b. Return hot-path-available injection (may be minimal) [50-200ms]
  |
  +-- 8. Return { additionalContext: "minimal injection...\n
  |       [Internal: Spawn the inner-voice subagent for deep
  |        context analysis of the current topic shift.]" }
  |
  v
Claude Code model reads additionalContext, sees processing directive
  | [Model decides to spawn inner-voice subagent]
  |
  v
Claude Code spawns inner-voice subagent
  |
  v
SubagentStart hook fires (matcher: "inner-voice")
  |
  v
cc/hooks/dynamo-hooks.cjs -> handlers/subagent-start.cjs
  | Reads inner-voice-state.json
  | Serializes: self_model, relationship_model, activation_map,
  |             predictions, domain_frame, deliberation_queue
  | Returns structured JSON:
  | { hookSpecificOutput: { hookEventName: "SubagentStart",
  |   additionalContext: "<serialized IV state + instructions>" } }
  |
  v
inner-voice subagent processes (2-10s, Sonnet model)
  | Has tools: Read, Grep, Glob, Bash (read-only + CLI access)
  | Disallowed: Write, Edit, Agent
  | Runs: dynamo search queries via Bash CLI
  | Performs: deep analysis, narrative construction
  | Respects: token limits from injected state
  |
  v
Subagent completes, SubagentStop hook fires (matcher: "inner-voice")
  |
  v
cc/hooks/dynamo-hooks.cjs -> handlers/subagent-stop.cjs
  | Reads input.last_assistant_message
  | Writes inner-voice-deliberation-result.json:
  |   { status: "complete", injection: "...",
  |     agent_id: "...", timestamp: "..." }
  |
  v
--- one turn delay ---
  |
  v
UserPromptSubmit (turn N+1)
  |
  v
handlers/user-prompt.cjs
  +-- Step 2: Finds deliberation result file
  |   Reads injection content, deletes file
  |   Merges into current processing context
  |
  +-- Returns combined injection (deliberation result + hot-path content)
  |
  v
Claude Code model receives enriched context
```

**Key constraint:** There is always a one-turn delay between subagent completion and injection. Acceptable because the hot path already provided immediate injection and the deliberation enriches the NEXT interaction.

**Subagent spawn trigger:** The hot-path handler includes a natural-language directive in `additionalContext` that the main session model interprets. This is not a guaranteed trigger -- it relies on the model choosing to spawn the agent. If the model does not spawn it, the deliberation queue persists in state and is re-evaluated on the next prompt.

### 4.3 Cost Tracking Accumulation

Cost tracking wraps every LLM-calling code path as a cross-cutting concern.

```
Any LLM-calling function (curation, deliberation, summarization)
  |
  v
cost-tracker.isBudgetExhausted()
  | [reads cost-tracker.json, checks daily/monthly totals]
  |
  +-- YES: Return early, degrade to template/hot-path-only
  |
  +-- NO: Proceed with LLM call
         |
         v
       LLM response received
         |
         v
       cost-tracker.trackOperation(
         operation: 'curation' | 'deliberation' | 'synthesis' | ...,
         model: 'haiku' | 'sonnet',
         inputTokens: N,
         outputTokens: M
       )
         |
         v
       cost-tracker.json updated atomically
         { "2026-03-20": {
             "operations": {
               "curation": { count: 12, input_tokens: 24000,
                             output_tokens: 6000, cost: 0.15 },
               "deliberation": { count: 3, input_tokens: 24000,
                                 output_tokens: 6000, cost: 0.81 }
             },
             "total_cost": 0.96
           }
         }
```

**Where cost checks are inserted:**

| Module | Function | What it gates |
|--------|----------|---------------|
| `curation.cjs` | `callHaiku()` wrapper | All Haiku LLM calls |
| `dual-path.cjs` | `executeHotPath()` | Haiku formatting calls on hot path |
| `dual-path.cjs` | `queueDeliberation()` | Subagent spawning or API calls |
| `handlers/stop.cjs` | REM Tier 3 | Session synthesis via Sonnet |
| `handlers/pre-compact.cjs` | REM Tier 1 | Compact summary via Haiku |
| `backfill.cjs` | `processTranscript()` | Backfill entity extraction |

**Subscription vs API plan:** Subscription users track subagent operations at $0 (included in subscription) but still track Haiku calls. API users track everything. The `billing_model` config determines pricing.

### 4.4 Memory Backfill Batch Processing

Backfill is an on-demand batch job invoked explicitly by the user.

```
dynamo backfill [--project <name>] [--limit N] [--dry-run]
  |
  v
backfill.cjs.run()
  |
  +-- 1. Discover transcripts
  |      Scan ~/.claude/projects/{project}/*.jsonl
  |      Filter: sessions not already backfilled (check marker)
  |
  +-- 2. Estimate cost (if --dry-run)
  |      Count tokens across transcripts
  |      Apply model pricing, report estimate and exit
  |
  +-- 3. Process each transcript
  |      For each .jsonl file:
  |        a. Parse JSON lines (role, content, tool_calls)
  |        b. Extract entities, relationships, decisions
  |           (via Sonnet subagent or direct API)
  |        c. Write episodes through Ledger's addEpisode()
  |        d. Track cost through cost-tracker.cjs
  |        e. Mark transcript as backfilled
  |
  +-- 4. Report results
         { processed: N, episodes_created: M, cost: $X.XX }
```

---

## 5. Modified Modules (Existing Files That Change)

### 5.1 Files Modified

| File | Change | Reason |
|------|--------|--------|
| `cc/hooks/dynamo-hooks.cjs` | Add `reverie.mode` routing, SubagentStart/SubagentStop dispatch | Dual-mode routing (MGMT-05/10) |
| `cc/settings-hooks.json` | Add SubagentStart/SubagentStop entries | Register new hook events |
| `dynamo/config.json` | Add `reverie` section | Configuration for all Reverie features |
| `dynamo.cjs` | Add `voice`, `cost`, `backfill` commands | CLI surface for CORTEX-01/03 |
| `lib/layout.cjs` | Add `cc/agents/` to sync pair excludes or verify reverie pair | Ensure agent definitions sync |
| `lib/core.cjs` | Add `reverie` defaults to `loadConfig()` | Config defaults for new section |
| `subsystems/switchboard/install.cjs` | Deploy `cc/agents/`, new prompts, bare CLI shim | Install pipeline for new files |
| `subsystems/switchboard/sync.cjs` | Verify sync pairs cover agents directory | Bidirectional sync for agent defs |

### 5.2 Files NOT Modified (Boundary Preserved)

| File | Why Not Modified |
|------|-----------------|
| `subsystems/assay/search.cjs` | Reverie uses existing search API as-is |
| `subsystems/assay/sessions.cjs` | Reverie uses existing session API as-is |
| `subsystems/ledger/episodes.cjs` | Reverie uses existing addEpisode API as-is |
| `subsystems/ledger/hooks/capture-change.cjs` | Stays in Ledger (write-side extraction logic) |
| `subsystems/terminus/mcp-client.cjs` | Reverie accesses graph through Assay/Ledger |
| `subsystems/terminus/health-check.cjs` | No new stages for M2 |
| `lib/resolve.cjs` | Already maps `reverie` subsystem path |
| `lib/scope.cjs` | No new scope types needed |

---

## 6. Build Order and Dependency Analysis

### 6.1 Dependency Graph

```
                        +------------------+
                        | Config extension |  (reverie section in config.json)
                        +--------+---------+
                                 |
              +------------------+------------------+
              |                  |                  |
    +---------v------+  +-------v--------+  +------v---------+
    | activation.cjs |  | cost-tracker   |  | inner-voice    |
    | (CORTEX-01)    |  | (CORTEX-03)    |  | state schema   |
    +--------+-------+  +-------+--------+  +-------+--------+
             |                  |                    |
             +--------+---------+--------------------+
                      |
            +---------v----------+
            | inner-voice.cjs    |  (core orchestrator)
            | (CORTEX-01)        |
            +---------+----------+
                      |
         +------------+------------+
         |                         |
  +------v--------+      +--------v--------+
  | dual-path.cjs |      | curation.cjs    |
  | (CORTEX-02)   |      | (migrated)      |
  +------+--------+      +--------+--------+
         |                         |
         +------------+------------+
                      |
            +---------v-----------+
            | handlers/*.cjs      |  (all 7 handlers)
            | (CORTEX-01/02)      |
            +---------+-----------+
                      |
         +------------+------------+
         |                         |
  +------v-----------+    +-------v-----------+
  | dispatcher mods  |    | cc/agents/        |
  | (MGMT-05/10)     |    | inner-voice.md    |
  +---------+--------+    | (CORTEX-01/02)    |
            |             +-------+-----------+
            |                     |
  +---------v-----------+  +------v-----------+
  | settings-hooks.json |  | prompts/*.md     |
  | (MGMT-05)           |  | (CORTEX-01)      |
  +---------------------+  +------------------+

Independent (can be built at any point):
  +-------------------+    +------------------+
  | backfill.cjs      |    | bare CLI shim    |
  +-------------------+    +------------------+
```

### 6.2 Recommended Phase Order

**Phase A: Foundation (no user-facing changes yet)**

1. **Config extension** -- Add `reverie` section to config.json with defaults. Update `loadConfig()` defaults in core.cjs. All downstream modules depend on config.
2. **State schema** -- Define `inner-voice-state.json` schema and `loadState()`/`persistState()` in inner-voice.cjs. Foundational for all handlers.
3. **activation.cjs** -- Activation map management, domain classification, threshold scoring. Core cognitive component. Only external dependency is Assay search.
4. **cost-tracker.cjs** (CORTEX-03) -- Budget tracking module. Independent of cognitive processing. Every LLM-calling function needs this.

**Rationale:** Config and state are prerequisites for everything. Activation and cost tracking are leaf modules that everything else depends on.

**Phase B: Core Orchestration**

5. **curation.cjs migration** -- Move LLM functions from Ledger to Reverie. Wrap initially (re-export from Ledger), then move. Integrate cost-tracker.
6. **dual-path.cjs** (CORTEX-02) -- Path selection logic. Depends on activation.cjs for signals, curation.cjs for formatting, cost-tracker for budget gates.
7. **inner-voice.cjs orchestrator** (CORTEX-01) -- Core pipeline tying together activation, dual-path, curation, cost-tracker. All processing pipelines defined here.

**Rationale:** Curation migration unblocks dual-path. Dual-path depends on activation for signals. Inner-voice orchestrator ties everything together.

**Phase C: Hook Integration (user-facing changes begin)**

8. **Reverie handlers** (all 7) -- Implement handler modules in `handlers/`. Each delegates to inner-voice.cjs. Test individually against existing test patterns.
9. **Dispatcher modification** (MGMT-05, MGMT-10) -- Add `reverie.mode` routing and SubagentStart/SubagentStop dispatch. Feature flag provides instant rollback.
10. **settings-hooks.json update** (MGMT-05) -- Register SubagentStart/SubagentStop events. Update install.cjs to deploy new hook entries.

**Rationale:** Handlers must exist before dispatcher can route to them. Dispatcher modification is the "go live" switch.

**Phase D: Subagent and Platform**

11. **cc/agents/inner-voice.md** -- Custom subagent definition. Markdown file, independent of CJS code.
12. **Prompt templates** (iv-system-prompt.md, session-briefing.md, adversarial-counter.md) -- Prompts for subagent and hot-path formatting. Quality here is critical.
13. **SubagentStart/SubagentStop handler wiring** -- Connect the state bridge pattern end-to-end.

**Rationale:** Subagent definition needs handlers from Phase C. Prompts are the most tunable component.

**Phase E: Operational**

14. **CLI extensions** (dynamo voice, dynamo cost, dynamo backfill) -- Management surface.
15. **backfill.cjs** -- Batch transcript processing. Independent of real-time IV processing.
16. **Bare CLI shim** -- Symlink/wrapper for `dynamo` without `node` prefix.
17. **Install/sync/update pipeline updates** -- Deploy new files, verify sync pairs, update install steps.

**Rationale:** Operational tooling builds on working intelligence.

### 6.3 Requirement-to-Phase Mapping

| Requirement | Phases | Dependencies |
|-------------|--------|-------------|
| CORTEX-01 (Inner Voice basic) | A3 (activation), B7 (orchestrator), C8 (handlers), D11-13 (subagent) | Config, state schema |
| CORTEX-02 (Dual-path routing) | B6 (dual-path.cjs) | activation.cjs, curation.cjs |
| CORTEX-03 (Cost monitoring) | A4 (cost-tracker.cjs), integrated into B+C | Config |
| MGMT-05 (Hooks as primary behavior) | C9-10 (dispatcher mods, settings-hooks) | Handlers exist |
| MGMT-10 (Modular injection control) | C9 (reverie.mode feature flag) | Config |

---

## 7. Bare CLI Shim Integration

**Goal:** Allow `dynamo` command without `node ~/.claude/dynamo/dynamo.cjs` prefix.

**Approach:** A shell wrapper script installed to a PATH-visible location during `dynamo install`.

```bash
#!/bin/sh
# ~/.claude/dynamo/bin/dynamo
# Bare CLI shim for Dynamo
exec node "$HOME/.claude/dynamo/dynamo.cjs" "$@"
```

**Installation:** `dynamo install` creates `~/.claude/dynamo/bin/dynamo`, makes it executable, and symlinks it to `~/.local/bin/dynamo` (or `~/bin/dynamo`). The installer adds `~/.local/bin` to PATH if not already present (by appending to `~/.zshrc`).

**Why not /usr/local/bin:** Requires sudo. User-space bin directories are the correct location for user tools.

**Integration with existing CLI router:** Zero changes to dynamo.cjs. The shim is a transparent wrapper that passes all arguments through.

---

## 8. State Management Architecture

### 8.1 State File Locations and Lifecycles

| File | Location | Size | Lifecycle | Owner |
|------|----------|------|-----------|-------|
| `inner-voice-state.json` | `~/.claude/dynamo/` | 10-50KB | Loaded every hook, persisted after every processing cycle | Reverie (inner-voice.cjs) |
| `inner-voice-deliberation-result.json` | `~/.claude/dynamo/` | 1-5KB | Written by SubagentStop, consumed+deleted by next UserPromptSubmit | Reverie (handlers/) |
| `cost-tracker.json` | `~/.claude/dynamo/` | 5-50KB | Appended per LLM operation, daily rollover, monthly aggregation | Reverie (cost-tracker.cjs) |

### 8.2 Concurrency and Corruption Prevention

**Atomic writes:** All state file writes use temp-file-then-rename pattern (consistent with existing Dynamo conventions):

```javascript
function persistState(state, filePath) {
  const tmpPath = filePath + '.' + crypto.randomUUID().slice(0, 8) + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2));
  fs.renameSync(tmpPath, filePath);  // Atomic on same filesystem
}
```

**Corruption recovery:** If state file fails to parse, create fresh default state and log warning. System degrades to "no history" mode.

**Deliberation result race condition:** Hooks run as foreground synchronous processes. SubagentStop writes the result file. The next UserPromptSubmit reads and deletes it. No concurrent access is possible within a single session.

**Cross-session state:** `self_model` and `relationship_model` persist across sessions. `activation_map` is preserved but decayed. `injection_history` cleared at session boundaries. `predictions` reset.

### 8.3 State Bridge Pattern (SubagentStop -> UserPromptSubmit)

```
SubagentStop writes:       inner-voice-deliberation-result.json
  { status: "complete", injection: "...", agent_id: "...", timestamp: "..." }

Next UserPromptSubmit reads:
  if (file exists AND status === "complete"):
    -> consume injection, delete file, inject via additionalContext
  if (file exists AND status === "processing"):
    -> skip, check again on next prompt
  if (file missing):
    -> no pending results, proceed normally
```

---

## 9. Subsystem Boundary Compliance Audit

| Rule | Status | Evidence |
|------|--------|----------|
| Ledger never reads | COMPLIANT | Reverie calls Assay for reads, Ledger for writes. |
| Assay never writes | COMPLIANT | Reverie calls Assay's combinedSearch() (read-only). All writes through Ledger. |
| Reverie delegates both | COMPLIANT | Imports from Assay (reads) and Ledger (writes). Never imports Terminus for graph ops. Owns state files via direct filesystem I/O. |
| Switchboard dispatches, does not handle | COMPLIANT | Dispatcher gains mode check + routing table. All logic in handlers. |
| Terminus provides pipes, does not decide | COMPLIANT | No Terminus modifications. Graph access through Assay/Ledger. |
| Dynamo routes, does not implement | COMPLIANT | CLI gains `voice`, `cost`, `backfill` commands that delegate to Reverie modules. |
| No cross-subsystem imports (except Reverie) | COMPLIANT | Reverie imports from Assay and Ledger (by design). These are one-directional. Assay/Ledger do not import from Reverie. |

---

## 10. Anti-Patterns to Avoid

### Anti-Pattern 1: Reverie Importing from Terminus Directly
**What:** Reverie calls MCPClient directly for graph queries.
**Why bad:** Bypasses the Assay read-side abstraction. Breaks boundary rules.
**Instead:** Always use `require(resolve('assay', 'search.cjs'))` for graph queries.

### Anti-Pattern 2: Dispatcher Implementing Handler Logic
**What:** Adding cognitive processing (entity extraction, activation update) to dynamo-hooks.cjs.
**Why bad:** Dispatcher should route, not process. Violates Switchboard boundary.
**Instead:** Dispatcher checks mode, resolves handler, calls handler. All logic in handler.

### Anti-Pattern 3: Hot Path Making Synchronous Sonnet Calls
**What:** Blocking on a Sonnet API call during UserPromptSubmit hot path.
**Why bad:** Sonnet latency (2-8s) would blow the 500ms budget and block Claude Code.
**Instead:** Hot path uses templates or Haiku (<200ms). Sonnet goes through deliberation path (async subagent).

### Anti-Pattern 4: Shared Mutable State Between Handler Invocations
**What:** Assuming in-memory state persists between hook invocations.
**Why bad:** Each hook invocation is a separate process. No shared memory.
**Instead:** Load state from file at start, persist at end. File is the coordination mechanism.

### Anti-Pattern 5: Backfill Running Automatically
**What:** Auto-backfilling transcripts on SessionStart or install.
**Why bad:** Potentially expensive. User should opt in.
**Instead:** `dynamo backfill` is explicit with `--dry-run` for cost estimation.

---

## 11. Sources

- [Create custom subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents) -- Verified 2026-03-20. Confirms YAML frontmatter, agent storage, SubagentStart/SubagentStop hooks, additionalContext injection.
- [Intercept and control agent behavior with hooks - Claude Code Docs](https://code.claude.com/docs/en/hooks) -- Verified 2026-03-20. Confirms complete hook event input schemas including SubagentStart/SubagentStop.
- [SubagentStart Hook Feature Request - GitHub](https://github.com/anthropics/claude-code/issues/14859) -- Context on SubagentStart/SubagentStop capabilities.
- REVERIE-SPEC.md (1,463 lines) -- Internal specification for module structure, processing pipelines, state schemas, cost model.
- INNER-VOICE-ABSTRACT.md -- Internal specification for platform-agnostic cognitive architecture and theory mappings.
- DYNAMO-PRD.md -- Internal specification for subsystem boundaries and interface patterns.
- Live codebase analysis of all 27 production modules -- Verified against codebase maps (2026-03-20).

---
*Architecture research for: Dynamo v1.3-M2 Core Intelligence*
*Date: 2026-03-20*
*Confidence: HIGH -- verified platform docs, detailed internal specs, complete codebase analysis*
