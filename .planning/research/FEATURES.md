# Feature Research: v1.3-M2 Core Intelligence

**Domain:** Cognitive memory architecture -- Inner Voice, dual-path routing, cost monitoring, operational improvements
**Researched:** 2026-03-20
**Confidence:** HIGH (detailed specs exist in REVERIE-SPEC.md and INNER-VOICE-ABSTRACT.md; research validates patterns and identifies M2/M4 boundary)

---

## Capability Areas

M2 delivers six distinct capability areas. Each is analyzed below with table stakes, differentiators, and anti-features. The M2/M4 boundary is explicitly marked: M2 delivers the working foundation; M4 delivers the advanced version.

1. **CORTEX-01: Inner Voice (basic)** -- Cognitive processing replacing Haiku curation
2. **CORTEX-02: Dual-path routing** -- Hot path / deliberation path architecture
3. **CORTEX-03: Cost monitoring** -- Budget tracking and enforcement
4. **MGMT-05: Hooks as primary behavior** -- Dispatcher migration to Reverie
5. **MGMT-10: Modular injection control** -- Feature flag and rollback
6. **Operational improvements** -- Bare CLI, update notes, memory backfill

---

## 1. Inner Voice (CORTEX-01)

### What M2 Delivers vs. What M4 Adds

| Aspect | M2 (basic) | M4 (advanced) |
|--------|-----------|---------------|
| Cognitive theories | 7 PRIMARY (Dual-Process, Global Workspace, Spreading Activation, Predictive Processing, Working Memory, Relevance Theory, Cognitive Load) | + 5 SECONDARY (Attention Schema, Somatic Markers, Default Mode Network, Memory Consolidation, Metacognition) |
| Domain classification | Keyword/regex heuristic (<1ms) | Embedding-based classification (MENH-08) |
| Spreading activation | 1-hop propagation from anchor entities | 2-hop with density threshold |
| Self-model | JSON state file with basic attention tracking | Graph-backed temporal versioning |
| Session briefing | Factual (entities, decisions, context) | Narrative with relational framing |
| REM consolidation | Tier 1 (PreCompact) + Tier 3 basic (Stop) | Full Tier 3 (retroactive eval, observation synthesis, cascade promotion) |
| IV memory | Operational state only (inner-voice-state.json) | Full inner-voice-memory.json with sublimation outcomes |
| Curation | Context-aware with adversarial counter-prompting | + User-relative definitions with compounding |

### Table Stakes (M2 Inner Voice)

Features that must work or the Inner Voice is not functional.

| Feature | Why Expected | Complexity | Subsystem Deps | Notes |
|---------|--------------|------------|----------------|-------|
| **State file lifecycle (load/process/persist)** | Without persistent state, the IV is stateless between prompts -- no better than current Haiku | LOW | Reverie (own), filesystem | Atomic write via temp+rename. JSON parse with corruption recovery to fresh defaults. ~10-50KB file. Pattern proven by session-store.cjs (Phase 21). |
| **Entity extraction from prompts** | The IV needs to know what the user is talking about to activate relevant knowledge | MEDIUM | Reverie, Assay (graph query) | Deterministic NER/pattern matching on hot path. No LLM call. Extract project names, file paths, function names, technical terms. Must handle the "sparse knowledge graph" case gracefully (< 100 entities). |
| **Activation map with decay** | Core data structure that tracks entity relevance across the conversation | MEDIUM | Reverie (own) | In-memory during processing, persisted to state file. Time-based decay (configurable rate). Without decay, stale entities pollute relevance scores forever. |
| **Sublimation threshold evaluation** | The composite scoring function decides when insights surface. Without it, the system either injects everything (overwhelming) or nothing (useless). | MEDIUM | Reverie (own) | `sublimation_score = activation * surprise * relevance * (1 - cognitive_load) * confidence`. All factors must be deterministic or pre-computed. No LLM call for threshold math. |
| **Injection formatting with token limits** | Injections must be concise and contextually shaped. Raw data dumps degrade performance (Cognitive Load Theory). | MEDIUM | Reverie (curation.cjs) | Session start: 500 tokens max. Mid-session: 150 tokens. Urgent: 50 tokens. Template-based on hot path; LLM-formatted on deliberation path. |
| **Self-model persistence across sessions** | The IV must remember what the user was working on, their communication preferences, and working patterns | LOW | Reverie (own) | JSON fields in state file: `self_model` (attention state, injection mode, confidence) and `relationship_model` (prefs, patterns, projects). Cross-session fields survive session boundaries; session-scoped fields reset. |
| **Curation migration from Ledger to Reverie** | LLM-calling functions (curateResults, summarizeText, generateSessionName) must move to Reverie. Ledger keeps deterministic formatting only. | MEDIUM | Reverie, Ledger | Clear dividing line: if it calls an LLM, it belongs to Reverie. Ledger retains `format.cjs` for deterministic output. Must update all import paths in consumers. |
| **Adversarial counter-prompting** | Replaces variable substitution (rejected in Synthesis v2). Prevents canonical drift where the LLM defaults to textbook definitions instead of user-specific meaning. | MEDIUM | Reverie (curation.cjs), cc/prompts/ | Prompt templates include explicit instructions to evaluate from the user's experience, not canonical definitions. The user's graph data is ground truth. |

### Differentiators (M2 Inner Voice)

Features that make the Inner Voice meaningfully better than Haiku curation.

| Feature | Value Proposition | Complexity | Subsystem Deps | Notes |
|---------|-------------------|------------|----------------|-------|
| **Semantic shift detection** | The IV injects when the conversation changes topic, not on every prompt. This is the "speak when surprised, not when scheduled" principle from Predictive Processing. Dramatically reduces injection noise. | MEDIUM | Reverie (inner-voice.cjs) | Cosine distance between consecutive prompt embeddings. Threshold: 0.4 (configurable). Depends on embedding availability -- falls back to keyword overlap when embeddings unavailable. |
| **Domain frame classification** | Classifies prompts into engineering/debugging/architecture/social/general frames. Parameterizes activation propagation (matching domain edges get 1.2-1.5x weight bonus). | LOW | Reverie (inner-voice.cjs) | Keyword/regex heuristic for M2 (<1ms). Single dominant frame per prompt. State persisted for PreCompact preservation. Low complexity, high signal. |
| **1-hop spreading activation** | When an entity is activated, its direct neighbors in the knowledge graph get partial activation. Produces the "this keeps coming up" convergent activation pattern without expensive per-entity reasoning. | MEDIUM | Reverie (activation.cjs), Assay (graph query) | BFS propagation from anchor nodes. 1-hop in M2, 2-hop in M4. Convergence bonus (1.5x) when two independent paths activate the same target. Requires Assay to return neighbor entities efficiently. |
| **Explicit recall bypass** | When the user asks "do you remember X?", the sublimation threshold is bypassed entirely. All entities above minimum activation (0.2) are considered. Prevents the false-negative failure mode. | LOW | Reverie (inner-voice.cjs) | Pattern matching on recall-intent phrases. Simple but high-value: prevents the most user-visible failure mode ("do you not remember?"). |
| **Predictions state with surprise factor** | The IV maintains expectations about what the user will do next. Intervention happens only when expectations are violated. Provides a principled reason to stay silent. | MEDIUM | Reverie (inner-voice.cjs) | Expected topic and expected activity tracked in state. Surprise factor = 1 - cosine similarity between entity embedding and predicted topic. Falls back to keyword overlap without embeddings. |

### Anti-Features (M2 Inner Voice)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Multi-frame fan-out** | Classify prompt across multiple domain frames simultaneously for richer activation | Doubles or triples graph queries per prompt. Exceeds 500ms hot path budget. Unproven value at M2 stage. | Single dominant frame in M2. Multi-frame is M4 after MENH-08 (local embeddings). |
| **Full IV memory schema (inner-voice-memory.json)** | Track sublimation outcomes, chain evaluations, cascading tags across sessions | Requires REM consolidation as write gate. Without quality gate, the file accumulates noise. Premature without baseline metrics. | Operational state file tracks basic injection history and self-model. Full IV memory is M4 (CORTEX-04). |
| **Retroactive evaluation** | Re-score earlier processing decisions against the completed session arc | Expensive (multiple LLM calls at session end). Unclear value until basic consolidation proves itself. | Basic session synthesis in M2. Retroactive eval is M4 (CORTEX-04). |
| **User-relative definitions** | Construct per-entity definitions based on user's specific relationship to concepts | Requires compounding across sessions and dense graph data. Premature at M2 graph density. | Direct graph context in injection formatting. User-relative definitions are M4. |
| **Continuous background processing** | Run IV processing between hook events for deeper analysis | Claude Code has no background threads. Hook-based event-driven architecture is the correct design, not a limitation. | Event-driven + persistent state creates the functional equivalent of continuity. |

---

## 2. Dual-Path Routing (CORTEX-02)

### Table Stakes (M2 Dual-Path)

| Feature | Why Expected | Complexity | Subsystem Deps | Notes |
|---------|--------------|------------|----------------|-------|
| **Deterministic path selection** | The decision of hot vs. deliberation must itself be cheap. If path selection requires an LLM call, you add expensive overhead to every single operation. | LOW | Reverie (dual-path.cjs) | Signal-based: entity confidence >= 0.7 -> hot. Cached results >= 3 -> hot. Semantic shift >= 0.4 -> deliberation. Explicit recall -> always deliberation. Session start -> always deliberation. |
| **Hot path under 500ms** | The fast path is the primary cost-control mechanism. If it exceeds 500ms, the user notices latency on every prompt. | HIGH | Reverie, Assay, filesystem | Tightest constraint in the system. Budget: state load (<5ms) + domain classify (<1ms) + shift detect (<5ms) + activation update (10-50ms) + path select (<1ms) + format (50-200ms) + persist (<5ms). Graph queries via Assay are the bottleneck. |
| **Deliberation via custom subagent (subscription)** | Max subscription users get subagent processing at zero marginal cost. This is the primary cost advantage. | HIGH | Reverie, cc/agents/inner-voice.md, Switchboard (dispatch) | Custom subagent defined in YAML frontmatter markdown. Sonnet model. Read-only tools (Read, Grep, Glob, Bash). `permissionMode: dontAsk`. `maxTurns: 10`. SubagentStart/SubagentStop hook handlers for state injection and result capture. |
| **Deliberation via direct API (API plan)** | Users without Max subscription need a fallback. Direct HTTP API call to Anthropic serves the same function. | MEDIUM | Reverie (dual-path.cjs), Terminus (config) | Node built-in `fetch` (Node 18+). No npm dependencies. Same processing logic, different invocation mechanism. |
| **State bridge pattern (SubagentStop -> UserPromptSubmit)** | SubagentStop CANNOT inject into parent context (GitHub issue #5812, closed NOT_PLANNED). File-based state bridge is the only option. | MEDIUM | Reverie (handlers/), filesystem | SubagentStop writes `inner-voice-deliberation-result.json`. Next UserPromptSubmit reads, injects, deletes. Inherent one-turn delay is acceptable (hot path already provided immediate injection). |
| **Rate limit degradation** | When subscription hits rate limits or API exhausts budget, the system must not crash. It must degrade to hot-path-only (current v1.2.1 behavior). | LOW | Reverie (dual-path.cjs) | Runtime flag `_rate_limited` set on 429 or spawn failure. Cleared on next success or timeout. System degrades from "intelligent" to "functional" -- never fails completely. |

### Differentiators (M2 Dual-Path)

| Feature | Value Proposition | Complexity | Subsystem Deps | Notes |
|---------|-------------------|------------|----------------|-------|
| **95/5 hot/deliberation split** | 95% of operations stay fast and cheap. Only genuinely complex situations get expensive reasoning. This is the core economic insight from Dual-Process Theory. | LOW | Reverie (dual-path.cjs) | Not a hard enforcement -- it's a design target achieved by tuning the path selection thresholds. Monitor actual split ratio and adjust thresholds if deliberation exceeds 10%. |
| **Skip path** | When the IV determines no injection is needed, it returns null/empty. This is the silence mechanism from Predictive Processing -- the system does not speak unless it has something worth saying. | LOW | Reverie (dual-path.cjs, inner-voice.cjs) | Third option alongside hot and deliberation. Applies when no threshold crossings and no semantic shift detected. Critical for reducing injection noise. |
| **Processing flag for deliberation deconfliction** | Prevents race conditions when deliberation is in-flight while new prompts arrive | LOW | Reverie (state file) | `processing.deliberation_pending = true` in state. UserPromptSubmit checks before queuing new deliberation. Simple boolean flag eliminates the concurrency hazard. |

### Anti-Features (M2 Dual-Path)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Nested subagents** | Have the IV subagent spawn sub-subagents for parallel analysis | Claude Code does not support nested subagents. Even if it did, it would be expensive and complex to coordinate. | All processing serialized within single subagent context (maxTurns: 10 is sufficient). |
| **Background deliberation polling** | Continuously poll for deliberation results instead of waiting for next prompt | No background threads in hooks. Polling wastes resources and adds complexity. | One-turn delay via state bridge is invisible to the user and architecturally clean. |
| **Deliberation on every prompt** | Use deliberation path for all prompts to maximize quality | Eliminates the cost advantage of dual-path. Would cost ~$6-8/day on API plan for zero quality gain on routine prompts. | Deliberation fires only on semantic shift, low confidence, or explicit recall. |

---

## 3. Cost Monitoring (CORTEX-03)

### Table Stakes (M2 Cost Monitoring)

| Feature | Why Expected | Complexity | Subsystem Deps | Notes |
|---------|--------------|------------|----------------|-------|
| **Per-operation cost tracking** | Every LLM call (curation, deliberation, synthesis) must log its token usage and estimated cost | LOW | Reverie, Dynamo (lib/) | Attach model pricing lookup table (Haiku, Sonnet input/output rates). Each LLM call returns `{ text, tokens_in, tokens_out, cost_estimate }`. Pricing table in config.json, updatable without code changes. |
| **Daily cost accumulator** | Running total of today's spend. Persisted to survive process restarts. | LOW | Dynamo (lib/), filesystem | JSON file: `cost-tracking.json` with `{ date: "2026-03-20", total: 1.23, operations: [...] }`. Reset daily. Atomic writes. Simple append-log pattern. |
| **Budget enforcement** | Hard daily budget cap that blocks deliberation path when exhausted | LOW | Reverie (dual-path.cjs), Dynamo (config) | Check budget before executing deliberation path. If exhausted, force hot-path-only. `config.reverie.cost.daily_budget = 5.00`. Binary check: spend >= budget -> hot-path-only. No complex logic needed. |
| **Graceful degradation on budget exhaust** | When budget is hit, system continues functioning on hot path instead of failing | LOW | Reverie (dual-path.cjs) | Same degradation as rate limiting. User sees "hot-path-only mode" in state, not an error. |

### Differentiators (M2 Cost Monitoring)

| Feature | Value Proposition | Complexity | Subsystem Deps | Notes |
|---------|-------------------|------------|----------------|-------|
| **Per-operation breakdown** | Users can see which operations cost the most (deliberation vs. session briefing vs. curation). Enables informed tuning. | LOW | Dynamo (lib/) | Each operation logs type, model, tokens, and cost. `dynamo cost` CLI command reads and summarizes. |
| **Monthly cost tracking** | Running monthly total alongside daily. Users compare against subscription cost ($200/month Max) to assess value. | LOW | Dynamo (lib/) | Extend daily accumulator with monthly rollup field. |
| **Subscription vs. API cost visibility** | Show what the user WOULD pay on API plan even when on subscription. Makes subscription value tangible. | LOW | Reverie | Track theoretical API cost alongside actual cost. Display both in `dynamo cost` output. |
| **Hot-path-only cost warning** | When budget forces hot-path-only, inform the user via injection or CLI. | LOW | Reverie (dual-path.cjs) | One-line injection: "Dynamo operating in hot-path-only mode (daily budget reached)." Not disruptive. |

### Anti-Features (M2 Cost Monitoring)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-time cost dashboard** | Visual dashboard showing cost breakdown in real time | M6 capability. Building a web UI for cost monitoring before the cost tracking data is proven and stable is premature. | CLI command `dynamo cost` provides the data. Dashboard is M6 (UI-02). |
| **Per-session cost attribution** | Track cost per individual Claude Code session | Sessions overlap, share state files, and session boundaries are fuzzy. Attribution is unreliable. | Per-day and per-operation attribution is reliable and actionable. |
| **Automatic model downgrade** | Auto-switch from Sonnet to Haiku when budget is tight | Mixing models mid-session creates inconsistent injection quality. Binary hot-path-only is cleaner. | Budget enforcement degrades to hot-path-only. No partial degradation. |
| **External monitoring integration** | Send cost data to Datadog, Langfuse, or other observability platforms | Adds external dependencies. Dynamo is self-contained by design constraint. | JSON file + CLI command. Export if needed later. |

---

## 4. Hooks as Primary Behavior (MGMT-05)

### Table Stakes (M2 Hooks)

| Feature | Why Expected | Complexity | Subsystem Deps | Notes |
|---------|--------------|------------|----------------|-------|
| **Dispatcher routes to Reverie handlers** | Current dispatcher routes to Ledger hooks. M2 must route cognitive events (SessionStart, UserPromptSubmit, PreCompact, Stop) to Reverie handlers instead. | MEDIUM | Switchboard (dispatcher), Reverie (handlers/) | Update `HANDLER_ROUTES` table in `dynamo-hooks.cjs`. PostToolUse dispatches to BOTH Ledger (file change capture) and Reverie (activation update). Clear routing table documented in REVERIE-SPEC Section 2.4. |
| **Reverie handler interface compatibility** | Each Reverie handler must return `{ additionalContext: String }` or `null`. Same contract the dispatcher expects today. | LOW | Reverie (handlers/), Switchboard | Existing contract stays. Handlers change, interface does not. |
| **PostToolUse dual dispatch** | PostToolUse must go to both Ledger (capture-change.cjs for file change extraction) and Reverie (post-tool-use.cjs for activation map update). | LOW | Switchboard (dispatcher) | Dispatcher calls both handlers sequentially. Reverie handler is lightweight (<35ms). |
| **Backward compatibility during migration** | While migrating handler functions, existing behavior must not break. If Reverie handler fails, fall back to classic behavior. | MEDIUM | Switchboard (dispatcher) | Try Reverie handler first. On error, fall back to Ledger handler. Log error. Remove fallback once Reverie is proven (controlled by `reverie.mode`). |

### Differentiators (M2 Hooks)

| Feature | Value Proposition | Complexity | Subsystem Deps | Notes |
|---------|-------------------|------------|----------------|-------|
| **Cognitive processing replaces mechanical search** | Current pipeline: search -> curate -> inject on every prompt. Reverie pipeline: load state -> classify -> detect shift -> update activation -> decide -> format. Fundamentally different quality of output. | HIGH | Reverie (all modules) | The entire inner-voice.cjs pipeline is the differentiator. It is not a better version of Haiku curation -- it is a different architecture that produces contextually aware, relationally framed, selectively surfaced insights. |
| **SubagentStart/SubagentStop hook handlers** | New hook types for the inner-voice custom subagent. Inject IV state into subagent context on start; capture results on stop. | MEDIUM | Reverie (handlers/iv-subagent-start.cjs, iv-subagent-stop.cjs), Switchboard | Register new hook types in settings.json. Dispatcher recognizes SubagentStart/SubagentStop events filtered by `agent_name === 'inner-voice'`. |

### Anti-Features (M2 Hooks)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Remove CLAUDE.md entirely** | If hooks handle all behavior, CLAUDE.md is redundant | CLAUDE.md still serves as human-readable documentation and provides context for the LLM that hooks cannot inject. Hooks inject `additionalContext`; CLAUDE.md provides baseline instructions. | Hooks become PRIMARY behavior mechanism. CLAUDE.md remains as supplementary documentation and baseline instruction set. |
| **Dynamic hook registration** | Register/unregister hooks at runtime without install | Adds complexity to settings.json management. Current install-time registration is reliable and well-tested. | Install-time registration via `dynamo install`. Feature flag (`reverie.mode`) provides runtime behavior switching without hook changes. |

---

## 5. Modular Injection Control (MGMT-10)

### Table Stakes (M2 Injection Control)

| Feature | Why Expected | Complexity | Subsystem Deps | Notes |
|---------|--------------|------------|----------------|-------|
| **`reverie.mode` feature flag** | Instant rollback from Inner Voice to classic Haiku curation. If Reverie degrades quality, one config change reverts. This eliminates catastrophic risk. | LOW | Switchboard (dispatcher), Dynamo (config) | `config.reverie.mode`: `"cortex"` (Inner Voice) or `"classic"` (Haiku curation). Check in dispatcher before routing. `dynamo config set reverie.mode classic` for rollback. |
| **`reverie.enabled` master switch** | Separate from global Dynamo toggle. Disables all Reverie processing while keeping basic memory search/inject working. | LOW | Reverie, Switchboard | `config.reverie.enabled`: true/false. When false, dispatcher routes to Ledger handlers (v1.2.1 behavior). |
| **CLI commands for mode switching** | `dynamo voice mode cortex`, `dynamo voice mode classic`, `dynamo voice status` | LOW | Dynamo (CLI router), Reverie | Thin CLI wrappers around config reads/writes. Status shows current mode, activation map size, recent injection count, cost today. |

### Differentiators (M2 Injection Control)

| Feature | Value Proposition | Complexity | Subsystem Deps | Notes |
|---------|-------------------|------------|----------------|-------|
| **`dynamo voice reset`** | Clear self-model and relationship model, forcing Reverie to rebuild from graph data. Addresses the "confidently wrong" failure mode. | LOW | Reverie (inner-voice.cjs) | Deletes or reinitializes specific sections of inner-voice-state.json. Preserves activation map and injection history. User correction pathway. |
| **`dynamo voice explain`** | Show current IV state: what it thinks the user is working on, active domain frame, top activated entities, recent injection stats. Transparency into the cognitive layer. | LOW | Reverie | Read and format inner-voice-state.json for human consumption. Valuable for debugging and trust-building. |

### Anti-Features (M2 Injection Control)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Per-hook mode switching** | Enable Reverie for SessionStart but not UserPromptSubmit | Fragments the cognitive pipeline. The IV's value comes from the integrated processing across all hooks, not individual hooks. | All-or-nothing via `reverie.mode`. If the pipeline is wrong, the whole pipeline is wrong. |
| **Gradual rollout (percentage-based)** | Route X% of prompts through Reverie, rest through classic | Single-user system. There is no population to A/B test against. | Manual switching via feature flag. User evaluates quality themselves. |

---

## 6. Operational Improvements

### 6a. Bare CLI Invocation

**Current state:** Users must type `node ~/.claude/dynamo/dynamo.cjs` or use the `dynamo` command only because CLAUDE.md instructs the LLM to run it that way. There is no system-level `dynamo` command available from an arbitrary terminal.

| Feature | Category | Complexity | Notes |
|---------|----------|------------|-------|
| **Symlink in PATH** | Table Stake | LOW | During `dynamo install`, create symlink: `ln -sf ~/.claude/dynamo/dynamo.cjs ~/.local/bin/dynamo` (or `/usr/local/bin/dynamo`). The shebang `#!/usr/bin/env node` already exists in dynamo.cjs. Ensure file has execute permission (`chmod +x`). Must detect which bin directory is in PATH. |
| **Shell alias as fallback** | Table Stake | LOW | If symlink creation fails (permissions), add alias to shell profile. `alias dynamo='node ~/.claude/dynamo/dynamo.cjs'`. Detect zsh (`.zshrc`) vs bash (`.bashrc`). |
| **`dynamo install` creates the shim** | Table Stake | LOW | Part of the install pipeline. Switchboard concern. Verify PATH inclusion during health-check. |
| **`dynamo uninstall` removes the shim** | Table Stake | LOW | Clean removal. Switchboard concern. |

**Anti-features:**
- **npm global install**: Would require publishing to npm registry. Dynamo is not an npm package -- it is deployed from a git repo via `dynamo install`. Adding npm distribution adds maintenance burden for no value to a single-user system.
- **Custom shell plugin**: Overkill. A symlink or alias achieves the same effect with zero maintenance.

### 6b. Update Notes Workflow

**Current state:** Dynamo has `dynamo check-update` and `dynamo update` but no changelog or update notes. Users have no visibility into what changed between versions. GSD provides a model: fetch changelog from GitHub, display entries between installed and latest versions, ask for confirmation.

| Feature | Category | Complexity | Notes |
|---------|----------|------------|-------|
| **CHANGELOG.md maintained in repo** | Table Stake | LOW | Keep Changelog format. Entries added per milestone or significant change. Manual authorship (not auto-generated from commits). GSD uses this pattern. |
| **`dynamo check-update` shows what's new** | Table Stake | LOW | Fetch CHANGELOG.md from GitHub raw URL. Parse entries between installed and latest version. Display before update confirmation. Same pattern as GSD's update workflow. |
| **`dynamo update` confirms before installing** | Table Stake | LOW | Display changelog diff, then ask for confirmation (for human-initiated updates). Claude Code-initiated updates can auto-confirm. |
| **Version-tagged release notes** | Differentiator | LOW | When `dynamo update` completes, show concise summary of changes. Milestone tags on dev branch already exist (v1.3-M1, etc.). |

**Anti-features:**
- **Auto-generated changelog from git commits**: Dynamo's commit messages are development artifacts, not user-facing documentation. "Fix input validation edge case" is meaningless to users. Curated changelog entries are better.
- **Conventional Commits enforcement**: Adds developer friction for minimal benefit in a single-developer project. The changelog is hand-written because the audience is a specific user, not a public community.

### 6c. Intelligent Memory Backfill

**Current state:** `dynamo session backfill` names unnamed sessions via Haiku. The broader need is ingesting historical Claude Code chat transcripts into the knowledge graph so the IV has rich context from day one.

| Feature | Category | Complexity | Notes |
|---------|----------|------------|-------|
| **Transcript discovery** | Table Stake | MEDIUM | Claude Code stores transcripts in `~/.claude/projects/*/`. Discover transcript files, parse JSON/JSONL format, extract conversation turns. Handle multiple transcript formats across Claude Code versions. |
| **Selective ingestion** | Table Stake | MEDIUM | Not every transcript is worth ingesting. Apply heuristics: skip very short sessions, skip sessions with no substantive content (just slash commands). Let user choose which projects to backfill. |
| **Entity extraction from transcripts** | Table Stake | HIGH | Each transcript must be processed to extract entities, decisions, patterns. LLM-assisted extraction (Sonnet via subagent or API). Expensive for large histories. Batch processing with progress tracking. |
| **Duplicate detection** | Table Stake | MEDIUM | Transcripts may overlap with existing graph data. Check entity names against existing graph before writing. Skip or merge duplicates. |
| **Progress tracking and resumability** | Differentiator | MEDIUM | Track which transcripts have been processed. Allow interruption and resumption. Store processing state in SQLite or JSON. |
| **Cost estimation before ingestion** | Differentiator | LOW | Estimate token count and cost before processing. Display to user for confirmation. Large histories could cost $5-20 on API plan. |

**Anti-features:**
- **Automatic backfill on install**: Expensive, time-consuming, and unsupervised. User must opt in and confirm cost.
- **Real-time re-ingestion**: Re-processing old transcripts after graph changes. The graph is append-only with temporal edges; re-ingestion creates duplicates.
- **Transcript modification**: Backfill reads transcripts; it never modifies them. Claude Code's transcript files are not Dynamo's to change.

---

## Feature Dependencies

```
reverie.mode feature flag (MGMT-10)
    └── required by ──> Dispatcher routing to Reverie (MGMT-05)
                             └── required by ──> All Inner Voice processing (CORTEX-01)
                                                      └── required by ──> Dual-path routing (CORTEX-02)
                                                                               └── required by ──> Cost monitoring (CORTEX-03)

State file lifecycle (CORTEX-01)
    └── required by ──> Activation map (CORTEX-01)
    └── required by ──> Sublimation threshold (CORTEX-01)
    └── required by ──> Self-model persistence (CORTEX-01)
    └── required by ──> State bridge pattern (CORTEX-02)

Custom subagent definition (CORTEX-02)
    └── required by ──> Deliberation path (CORTEX-02)
    └── required by ──> Session start briefing (CORTEX-01)
    └── required by ──> REM consolidation Tier 3 (CORTEX-01)

Per-operation cost tracking (CORTEX-03)
    └── required by ──> Daily budget enforcement (CORTEX-03)
    └── required by ──> Rate limit degradation (CORTEX-02)

Bare CLI invocation ──independent──> Update notes workflow ──independent──> Memory backfill
    (all independent of Inner Voice features)
```

### Dependency Notes

- **MGMT-10 is the foundation.** The feature flag must exist before the dispatcher routes to Reverie, because without rollback capability, a broken Reverie takes down the entire memory system.
- **CORTEX-01 core (state + activation + threshold) must precede CORTEX-02 routing.** The dual-path router consumes activation map and sublimation scores produced by the core pipeline.
- **CORTEX-02 must precede CORTEX-03.** Cost monitoring tracks costs generated by the dual-path execution. Without the paths, there is nothing to monitor.
- **Custom subagent is a shared dependency.** Deliberation path, session briefing, and REM consolidation all use the inner-voice subagent. It must be defined and tested before any of them.
- **Operational improvements are independent.** Bare CLI, update notes, and memory backfill have no dependency on the Inner Voice. They can be built in parallel or sequenced freely.

---

## M2 Definition (What "Good Enough for M2" Looks Like)

### Launch With (M2)

- [x] Feature flag (`reverie.mode`) with instant rollback to classic curation
- [x] Dispatcher routes cognitive events to Reverie handlers
- [x] State file lifecycle with atomic writes and corruption recovery
- [x] Entity extraction (deterministic NER/pattern matching)
- [x] Activation map with decay and 1-hop propagation
- [x] Sublimation threshold evaluation (composite scoring, all deterministic)
- [x] Domain frame classification (keyword/regex heuristic)
- [x] Semantic shift detection (with embedding fallback to keyword overlap)
- [x] Hot path execution under 500ms
- [x] Deliberation path via custom subagent (subscription) and direct API (API plan)
- [x] State bridge pattern for subagent results
- [x] Rate limit and budget degradation to hot-path-only
- [x] Per-operation cost tracking with daily budget enforcement
- [x] Injection formatting with Cognitive Load Theory token limits
- [x] Self-model and relationship model persistence
- [x] Adversarial counter-prompting in curation prompts
- [x] REM Tier 1 (PreCompact state preservation) and Tier 3 basic (Stop synthesis)
- [x] Bare CLI invocation via symlink
- [x] CHANGELOG.md with update notes in check-update/update workflow

### Add After M2 Proves Value (M3-M4)

- [ ] Inline visibility of what Dynamo is doing (UI-08, M3)
- [ ] Narrative briefings with relational framing (CORTEX-04, M4)
- [ ] 5 SECONDARY cognitive theories (CORTEX-04, M4)
- [ ] Full IV memory schema with REM-gated writes (CORTEX-04, M4)
- [ ] 2-hop spreading activation with density threshold (CORTEX-04, M4)
- [ ] Embedding-based domain classification (MENH-08, M4)
- [ ] Retroactive evaluation at session end (CORTEX-04, M4)
- [ ] Observation synthesis batch jobs (CORTEX-05, M4)
- [ ] Graph-backed self-model evolution (CORTEX-06, M4)
- [ ] Memory backfill from historical transcripts (complex, schedule as M2 stretch or M3)

### Future Consideration (M5+)

- [ ] Multi-frame fan-out (M4 with MENH-08)
- [ ] User-relative definitions with compounding (M4)
- [ ] Agent coordination and subagent spawning (CORTEX-07, M5)
- [ ] Connector framework for external sources (CORTEX-09, M5)
- [ ] Cost dashboard in web UI (UI-02, M6)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Milestone |
|---------|------------|---------------------|----------|-----------|
| Feature flag + rollback (MGMT-10) | HIGH | LOW | **P0** | M2 (first) |
| Dispatcher routing to Reverie (MGMT-05) | HIGH | MEDIUM | **P0** | M2 (second) |
| State file lifecycle | HIGH | LOW | **P0** | M2 |
| Entity extraction | HIGH | MEDIUM | **P1** | M2 |
| Activation map + decay | HIGH | MEDIUM | **P1** | M2 |
| Sublimation threshold | HIGH | MEDIUM | **P1** | M2 |
| Hot path execution | HIGH | HIGH | **P1** | M2 |
| Deliberation path (subagent) | HIGH | HIGH | **P1** | M2 |
| State bridge pattern | MEDIUM | MEDIUM | **P1** | M2 |
| Semantic shift detection | HIGH | MEDIUM | **P1** | M2 |
| Domain frame classification | MEDIUM | LOW | **P2** | M2 |
| Per-operation cost tracking | MEDIUM | LOW | **P2** | M2 |
| Daily budget enforcement | MEDIUM | LOW | **P2** | M2 |
| Injection formatting + limits | HIGH | MEDIUM | **P1** | M2 |
| Self-model persistence | MEDIUM | LOW | **P2** | M2 |
| REM Tier 1 + Tier 3 basic | MEDIUM | MEDIUM | **P2** | M2 |
| Bare CLI invocation | MEDIUM | LOW | **P2** | M2 |
| CHANGELOG.md + update notes | LOW | LOW | **P3** | M2 |
| Explicit recall bypass | MEDIUM | LOW | **P2** | M2 |
| `dynamo voice explain` | LOW | LOW | **P3** | M2 |
| `dynamo voice reset` | LOW | LOW | **P3** | M2 |
| Memory backfill | MEDIUM | HIGH | **P3** | M2 stretch / M3 |

**Priority key:**
- **P0**: Must be built first (dependency foundation)
- **P1**: Core M2 value -- the features that make the Inner Voice work
- **P2**: Expected quality-of-life features for M2
- **P3**: Nice to have in M2, deferrable without undermining the milestone

---

## Competitor/Comparable Feature Analysis

| Feature | Zep/Graphiti | Mem0 | Cognee | Dynamo M2 Approach |
|---------|-------------|------|--------|-------------------|
| Memory storage | Temporal knowledge graph | Vector + graph hybrid | Graph-based with semantic layers | Graphiti knowledge graph (existing) |
| Memory curation | No curation (raw storage) | LLM-based extraction | LLM summarization | Context-aware Inner Voice with sublimation threshold |
| Dual-process routing | No (single path) | No (single path) | No (single path) | Deterministic hot/deliberation split (unique) |
| Cost control | No built-in | Token-based limits | No built-in | Per-operation tracking with budget enforcement |
| Activation spreading | No | No | No | 1-hop spreading activation from anchor entities (unique) |
| Self-model | No | Basic user preferences | No | Attention state, communication prefs, working patterns, affect baseline |
| Rollback mechanism | N/A (library, not system) | No | No | Feature flag with instant rollback to classic curation |
| Platform integration | SDK/API | SDK/API | SDK/API | Deep Claude Code hook integration (native, not SDK) |

The dual-process architecture with deterministic hot path, spreading activation, and sublimation threshold is unique to Dynamo. No comparable system implements cognitive-theory-informed selective injection with cost-aware dual-path routing.

---

## Sources

- [ICLR 2026 Workshop: MemAgents](https://openreview.net/pdf?id=U51WxL382H) -- Memory for LLM-Based Agentic Systems
- [Serokell: Design Patterns for Long-Term Memory](https://serokell.io/blog/design-patterns-for-long-term-memory-in-llm-powered-architectures) -- Architectural patterns
- [Arxiv: Memory for Autonomous LLM Agents](https://arxiv.org/html/2603.07670) -- Memory mechanisms survey (March 2026)
- [Arxiv: Spreading Activation for KG-RAG](https://arxiv.org/abs/2512.15922) -- Implementation validation for spreading activation
- [Langfuse: Token and Cost Tracking](https://langfuse.com/docs/observability/features/token-and-cost-tracking) -- Cost attribution patterns
- [LiteLLM: Spend Tracking](https://docs.litellm.ai/docs/proxy/cost_tracking) -- Budget enforcement patterns
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- Official hook documentation
- [GitHub Issue #5812](https://github.com/anthropics/claude-code/issues/5812) -- SubagentStop context bridge limitation (NOT_PLANNED)
- [Zep: Temporal Knowledge Graph](https://arxiv.org/html/2501.13956v1) -- Graphiti's own architecture paper
- [Mem0: Production-Ready AI Agents](https://arxiv.org/html/2504.19413v1) -- Memory architecture comparison
- [Conventional Changelog](https://github.com/conventional-changelog/conventional-changelog) -- Release notes automation
- [GitHub: Automatically Generated Release Notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes) -- Release notes patterns
- Internal: REVERIE-SPEC.md (1,463 lines, detailed platform-specific specification)
- Internal: INNER-VOICE-ABSTRACT.md (platform-agnostic cognitive architecture)
- Internal: MASTER-ROADMAP.md (M2 requirements and dependency chain)

---
*Feature research for: v1.3-M2 Core Intelligence*
*Researched: 2026-03-20*
*Confidence: HIGH -- detailed specs exist; research validates feasibility of all M2 capabilities; M2/M4 boundary clearly defined*
