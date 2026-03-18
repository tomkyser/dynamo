# Ledger Cortex: Exhaustive Research and Roadmap Revision Analysis

**Researched:** 2026-03-18
**Domain:** Multi-agent cognitive memory architecture for Dynamo
**Confidence:** MEDIUM (architecture and feasibility well-understood; cost and production viability carry uncertainty)

---

## Executive Summary

The Ledger Cortex vision proposes transforming Dynamo's Ledger from a hook-driven memory pipeline into a multi-agent cognitive system with four AI agents (Inner Voice, Access Agent, Construction Agent, Infrastructure Agent) coordinating through an inter-agent deliberation protocol. This research investigates all 21 research questions in the brief, validates the technology landscape, stress-tests every major component, and produces a milestone impact recommendation.

**Key finding:** The vision is architecturally sound and the technology exists to build it, but the full vision as described is a 6-12 month effort that would represent the single largest architectural undertaking in Dynamo's history. The critical risk is not feasibility but cost-complexity-value: four persistent headless Claude agents coordinating through deliberation protocols will cost $50-300+/month in API fees at moderate usage, and the engineering complexity introduces failure modes that the current simple pipeline avoids entirely.

**Primary recommendation:** Adopt **Option C (Phased Integration)** with aggressive scoping. Build the Inner Voice as an intelligent curation replacement in v1.3, prove the pattern works within the existing hook architecture, and defer the full multi-agent system to v1.5+. The dual-path architecture (hot path/deliberation path) is the most important design insight in the brief and should be adopted immediately regardless of the overall timeline.

**Second recommendation:** Do NOT build the full four-agent system as described. The Infrastructure Agent as a dedicated headless Claude instance is over-engineered for the problem it solves. PostgreSQL with temporal extensions or keeping Neo4j with disciplined schema management achieves the same goals at a fraction of the cost and complexity.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Deep AND broad**: Exhaustive treatment of all 21 research questions. No question left unaddressed.
- **Both outputs**: Produce a recommendation analysis document with clear reasoning AND a draft revised MASTER-ROADMAP.md as an appendix/companion file.
- **Steel-man then stress-test**: For each major component, first build the strongest possible version of the idea, THEN actively try to break it.

### Claude's Discretion
- Research methodology and section organization
- How to structure the draft roadmap (whether to keep existing version numbering or propose new scheme)

### Deferred Ideas (OUT OF SCOPE)
- Claudia-specific scope (noted for awareness only, not researched as deliverable)
</user_constraints>

---

## Part I: Technology Landscape

### The Synix Three-Layer Insight

The Synix article's core thesis is correct and verified: the agent memory market has fragmented into three complementary layers that no single product addresses:

| Layer | What It Solves | Best-in-Class | OSS Status |
|-------|---------------|---------------|------------|
| **Data Access** | Source connectivity, OAuth, normalization | Hyperspell | Closed-source platform |
| **Knowledge Construction** | Entity extraction, deduplication, temporal tracking | Graphiti (temporal KG), Hindsight (biomimetic memory) | Both open-source |
| **Infrastructure** | ACID, time travel, consistency | Tacnode (Context Lake) | Closed-source |

**Confidence: HIGH** -- Verified through Synix article source analysis, official project documentation, and cross-referencing with multiple independent sources.

### Current Technology Capabilities

#### Claude Agent SDK (verified via official docs)

The Claude Agent SDK provides full programmatic control over Claude Code instances in both Python and TypeScript:

- **Subagents**: Spawn specialized agent instances with isolated context, custom tools, and model selection (haiku/sonnet/opus)
- **Sessions**: Persistent session IDs enable resumption across multiple exchanges
- **Agent Teams**: Experimental feature for multi-session coordination using filesystem-based JSON inbox/outbox
- **Hosting**: Long-running container patterns supported; ~1GiB RAM, 5GiB disk, 1 CPU per instance; no session timeout
- **Hooks**: SDK hooks available for PreToolUse, PostToolUse, Stop, SessionStart, SessionEnd, UserPromptSubmit
- **Key limitation**: Agent Teams are ephemeral -- no persistent identity across sessions, no /resume for teams

#### Graphiti (verified via GitHub + PyPI)

- **Current version**: Available on PyPI as `graphiti-core`
- **Backend**: Neo4j 5.26+, FalkorDB, Kuzu, or Amazon Neptune
- **Key strength**: Bi-temporal schema on every edge (t_created, t_valid, t_invalid, t_expired)
- **Entity resolution**: Two-phase -- deterministic pass (exact match, MinHash) then LLM refinement
- **Search**: 16 search recipes combining BM25, cosine similarity, BFS, and 5 reranker options
- **Cost concern**: Minimum 3+N LLM calls per episode (8+ for typical 5-edge episodes)
- **Already in use by Dynamo**: Graphiti is Dynamo's current knowledge graph backend via Neo4j

#### Hindsight (verified via official docs + GitHub)

- **Repo**: github.com/vectorize-io/hindsight
- **Backend**: Single PostgreSQL instance with pgvector (no external services)
- **Memory types**: World facts, Experiences, Opinions, Observations (auto-synthesized)
- **Retrieval**: 4 parallel strategies (semantic, BM25, graph traversal, temporal) fused via RRF
- **Consolidation**: Background process synthesizes observations from accumulated facts
- **Key API**: retain() / recall() / reflect() with mission/directives/disposition configuration
- **Performance**: 91.4% accuracy on LongMemEval benchmark

#### Claude API Pricing (verified March 2026)

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Best For |
|-------|----------------------|----------------------|----------|
| Haiku 4.5 | $1.00 | $5.00 | High-throughput, curation |
| Sonnet 4.6 | $3.00 | $15.00 | Balanced reasoning |
| Opus 4.6 | $5.00 | $25.00 | Deep reasoning, complex tasks |

**Batch API**: 50% discount. **Prompt caching**: 90% savings on cached reads.

---

## Part II: The 21 Research Questions

### Category A: Feasibility (Questions 1-4)

#### Q1: Can headless Claude Code instances run as persistent/semi-persistent agents?

**Answer: YES, with important caveats.**

**Evidence (HIGH confidence):**
- The Claude Agent SDK (TypeScript: `@anthropic-ai/claude-agent-sdk`, Python: `claude-agent-sdk`) provides full programmatic control
- Four hosting patterns documented officially: Ephemeral Sessions, Long-Running Sessions, Hybrid Sessions, Single Container
- Session resumption is first-class: capture session_id, pass `resume: sessionId` to continue
- Resource requirements per instance: ~1GiB RAM, 5GiB disk, 1 CPU
- Container cost: ~$0.05/hour running (infrastructure only, not API costs)
- Agent Teams: experimental filesystem-based coordination via JSON inboxes at `~/.claude/<teamName>/inboxes/<agentName>.json`

**Critical caveats:**
1. **Agent Teams are ephemeral** -- they exist for a session and disappear. No persistent identity, no cross-session resume for teams. This is a hard limitation for the "always-on agents" model the brief envisions.
2. **Subagents cannot spawn other subagents** -- only one level of nesting. The Inner Voice cannot spawn a Construction Agent as a subagent.
3. **The SDK is designed for task-completion, not daemon processes.** Long-running sessions are supported but the pattern is "process messages, idle, wake on message" not "continuously monitor."
4. **API costs accumulate with every interaction.** A persistent agent that checks in every 30 seconds costs tokens every 30 seconds.

**Implication for Cortex:** The "headless Claude Code instance per layer agent" model is technically possible but impractical as a permanent daemon. A better pattern: **on-demand agent spawning** where agents are instantiated when needed, given context via prompts, and torn down after completing work. Session resumption enables continuity without the cost of persistence.

---

#### Q2: What's the realistic latency budget for inter-agent deliberation?

**Answer: 2-15 seconds per deliberation round, depending on depth.**

**Evidence (MEDIUM confidence):**
- Claude Sonnet API response time for a moderate prompt (~2K tokens in, ~1K out): 1-3 seconds
- Claude Haiku: 0.5-1.5 seconds for equivalent
- Multi-agent deliberation where Agent A calls Agent B which calls Agent C: serial latency compounds (3 x 1-3s = 3-9s minimum)
- Agent SDK subagent invocation adds overhead for context setup: ~0.5-1s
- Filesystem-based message passing (Agent Teams) adds filesystem I/O latency: minimal but polling interval matters

**Practical latency budget:**
| Operation | Expected Latency | Acceptable? |
|-----------|-----------------|-------------|
| Hot path (cached Inner Voice response) | <1s | Yes -- current hook latency |
| Single-agent deliberation (Inner Voice alone) | 1-3s | Yes -- comparable to current Haiku curation |
| Two-agent deliberation (Inner Voice + 1 Layer Agent) | 3-8s | Marginal -- acceptable for writes, not reads |
| Three-agent deliberation (full pipeline) | 5-15s | Too slow for real-time injection; acceptable for background writes |

**Implication for Cortex:** The dual-path architecture is essential. The hot path must serve reads in <1s. Deliberation path (involving multiple agents) is only viable for writes, conflict resolution, and background processing.

---

#### Q3: Can Graphiti and Hindsight coexist in the Construction layer?

**Answer: YES, but they solve different problems and should NOT be run simultaneously on the same data.**

**Evidence (HIGH confidence):**

| Aspect | Graphiti | Hindsight |
|--------|----------|-----------|
| **Backend** | Neo4j (graph DB) | PostgreSQL + pgvector |
| **Strength** | Temporal knowledge graph with bi-temporal edges, entity deduplication | Biomimetic memory with observation synthesis, 4-strategy retrieval |
| **Weakness** | High LLM cost per ingestion, no observation synthesis | No explicit graph structure, limited entity resolution |
| **API model** | Graph CRUD with search recipes | retain/recall/reflect lifecycle |
| **Best for** | Structured entity/relationship tracking | Experience accumulation and pattern synthesis |

**Coexistence strategies:**

1. **Complementary roles (RECOMMENDED):** Use Graphiti for structured entity/relationship knowledge (the "what is true" graph) and Hindsight for experiential memory and pattern synthesis (the "what have I learned" layer). They feed different needs -- Graphiti powers active recall ("who works at company X?") while Hindsight powers intuitions ("you seem frustrated, last time this happened you...").

2. **Sequential pipeline:** Graphiti ingests and structures, Hindsight reflects on the structured output. This avoids dual-write consistency issues.

3. **Single choice:** Pick one. Graphiti is already integrated with Dynamo via Neo4j. Hindsight's single-PostgreSQL architecture is simpler but requires a new integration.

**Critical concern:** Running both means two storage backends (Neo4j + PostgreSQL), two LLM extraction pipelines, and two sets of consistency guarantees to manage. The complexity cost is real.

**Recommendation:** Keep Graphiti as the primary knowledge graph (it's already integrated). Adopt Hindsight's *patterns* (observation synthesis, biomimetic memory types, multi-strategy retrieval) as design inspiration for enhancing the Inner Voice, rather than running Hindsight as a separate system.

---

#### Q4: What OSS options exist for the Infrastructure layer (ACID + time travel + semantic)?

**Answer: Several options exist; PostgreSQL with temporal extensions is the most practical.**

**Evidence (HIGH confidence):**

| Option | ACID | Time Travel | Semantic | OSS | Production Ready |
|--------|------|-------------|----------|-----|-----------------|
| **PostgreSQL + pg_bitemporal + pgvector** | Native | Via extension | Via pgvector | Yes | HIGH |
| **PostgreSQL 17+ (temporal PK/UK)** | Native | Uni-temporal (native) | Via pgvector | Yes | HIGH |
| **temporal_tables extension** | Native PG | Via extension | Combine with pgvector | Yes | MEDIUM |
| **Tacnode Context Lake** | Yes | Native (23h default) | Native | **No (closed-source)** | UNKNOWN |
| **Neo4j (existing)** | ACID transactions | Manual (via Graphiti bi-temporal edges) | Via embeddings | Yes | HIGH |
| **Letta (PostgreSQL-based)** | Yes | Version-controlled blocks | N/A | Yes | MEDIUM |

**Recommendation:** Do not introduce a new database. Dynamo already runs Neo4j for Graphiti. The "Infrastructure Agent" concern (ACID, time travel, consistency) is better solved by:
1. Relying on Neo4j's existing ACID transaction support
2. Leveraging Graphiti's bi-temporal model for time travel (already built-in)
3. Adding explicit schema migration tooling for evolution
4. If a relational store is needed for non-graph data (session index, config, etc.), SQLite is already planned for MGMT-11

**The Infrastructure Agent as a dedicated headless Claude instance is the weakest component of the vision.** ACID transactions and time travel are deterministic operations that should be handled by database configuration and tooling, not by an LLM reasoning about them.

---

### Category B: Architecture (Questions 5-8)

#### Q5: What orchestration framework best fits?

**Answer: Custom message-passing is sufficient; LangGraph adds complexity without proportional value for Dynamo's use case.**

**Evidence (MEDIUM confidence):**

| Framework | Fit | Why |
|-----------|-----|-----|
| **LangGraph** | Poor-to-medium | Python-only, DAG-based, designed for complex multi-step pipelines. Dynamo is CJS/Node. Would require Python subprocess or a language bridge. Massive dependency. |
| **Claude Agent SDK (subagents)** | Good | Already Node-compatible, handles agent spawning, context isolation, tool restrictions, model selection. Built-in. |
| **Claude Agent Teams** | Medium | Filesystem-based coordination via JSON inboxes. Experimental, ephemeral. |
| **Custom message-passing** | Best for Dynamo | CJS module that spawns SDK agents on demand, passes context via prompts, collects results. Zero new dependencies. Fits Dynamo's "zero npm dependencies" constraint. |

**Recommendation:** Use the Claude Agent SDK directly from Node.js (the TypeScript SDK is npm-installable as `@anthropic-ai/claude-agent-sdk`). This is a real npm dependency, which conflicts with Dynamo's zero-dependency constraint. However, the alternative is reimplementing agent orchestration from scratch.

**Alternative:** Use `claude -p` (CLI headless mode) invoked via Node.js `child_process.spawn()`. This preserves the zero-dependency constraint while still getting headless Claude execution. Results come back via stdout. This is how Dynamo already works with its Haiku curation pipeline (via OpenRouter HTTP calls).

**The honest answer:** For v1.3 scope, the orchestration "framework" is simply: the hook system feeds context to a curation function that decides whether to use Haiku (fast path) or Sonnet (deep path). That's the dual-path architecture. Full multi-agent orchestration is v1.5+ territory.

---

#### Q6: How should the Inner Voice monitor conversation flow?

**Answer: Hook snapshots, augmented with semantic shift detection.**

**Evidence (HIGH confidence -- based on Dynamo's existing architecture):**

Dynamo already has five hook events that fire during a Claude Code session:
1. **SessionStart** -- fires once at session beginning
2. **UserPromptSubmit** -- fires on every user message
3. **PostToolUse** -- fires after file changes
4. **PreCompact** -- fires before context window compression
5. **Stop** -- fires at session end

These hooks ARE the monitoring mechanism. The Inner Voice doesn't need to "monitor" conversation flow separately -- it receives snapshots at each hook event.

**Enhancement strategy:**
| Current Behavior | Inner Voice Enhancement |
|-----------------|------------------------|
| SessionStart: search + curate + inject | SessionStart: generate narrative briefing with relational context |
| UserPromptSubmit: search + curate + inject | UserPromptSubmit: assess semantic shift, decide if intuition injection needed |
| PostToolUse: capture changes | PostToolUse: feed Construction Agent for knowledge extraction |
| PreCompact: preserve knowledge | PreCompact: generate compressed self-model for continuity |
| Stop: summarize session | Stop: update relationship model, synthesize observations |

**Key insight:** The hook system is the right integration point. The Inner Voice is NOT a separate monitoring process -- it IS the upgraded hook handler. This is a critical architectural simplification over the brief's description.

---

#### Q7: What triggers an intuition injection?

**Answer: Semantic shift detection on UserPromptSubmit, with configurable sensitivity.**

**Evidence (MEDIUM confidence -- design recommendation, not verified implementation):**

Triggers should be multi-signal:

1. **Semantic shift** (primary): Embedding comparison between current prompt and recent context. When cosine similarity drops below threshold, the topic has shifted and memories about the new topic should surface.

2. **Entity mention** (secondary): Named entity recognition on the user prompt. When a known entity appears (person, project, tool), relevant facts surface.

3. **Temporal trigger** (tertiary): Time-based patterns. "It's Monday, and you have a standup" or "You haven't mentioned project X in 2 weeks."

4. **Tool use patterns** (quaternary): When Claude starts reading auth.py, the Inner Voice knows this is the authentication module and surfaces relevant decisions/history.

5. **Explicit recall** (always): User says "remember" or "what do you know about" -- always triggers deep recall.

**What should NOT trigger injection:**
- Every single UserPromptSubmit. The current system already injects on every prompt, and this is noisy. The Inner Voice should be selective.
- Time-based polling (e.g., every 30 seconds). This is expensive and the hook system already provides event-driven triggers.

**Recommended implementation:**
```
on UserPromptSubmit:
  embedding = embed(user_prompt)
  shift_score = cosine_distance(embedding, last_context_embedding)
  entities = extract_entities(user_prompt)

  if shift_score > THRESHOLD or entities_match_known:
    memories = search(entities + user_prompt)
    if memories.relevance > MIN_RELEVANCE:
      inject(curate(memories))

  update last_context_embedding
```

---

#### Q8: How does the Inner Voice persist its self-model and relationship model?

**Answer: Structured JSON in the knowledge graph, updated at session boundaries.**

**Evidence (MEDIUM confidence -- design recommendation):**

The self-model and relationship model should be stored as structured data, not free-form text:

**Self-model (what the Inner Voice knows about itself):**
```json
{
  "last_updated": "2026-03-18T16:00:00Z",
  "communication_style": "direct, technical, anticipates needs",
  "known_strengths": ["code architecture", "debugging workflow"],
  "known_gaps": ["financial domain", "cooking preferences"],
  "recent_context": "User is focused on Dynamo v1.2.1 stabilization",
  "emotional_read": "engaged, productive, occasional frustration with complexity"
}
```

**Relationship model (what it knows about the user):**
```json
{
  "patterns": ["prefers architectural thinking before coding", "values honesty over diplomacy"],
  "frustrations": ["verbose output", "losing context across sessions"],
  "working_style": "deep focus sessions, expects proactive suggestions",
  "communication_preferences": ["no emojis", "direct language", "show reasoning"],
  "current_projects": [{"name": "Dynamo", "status": "v1.2.1 stabilization"}],
  "long_term_themes": ["personal AI assistant (Claudia)", "developer productivity"]
}
```

**Storage options:**
1. **Graphiti nodes** (RECOMMENDED): Store as dedicated entity nodes in the knowledge graph. Leverages existing infrastructure. Queryable via Graphiti search.
2. **JSON file in Dynamo config**: Simple flat file at `~/.claude/dynamo/ledger/inner-voice-state.json`. Fast reads, no DB dependency for hot path.
3. **Both**: JSON file for hot path reads, Graphiti for versioned history. JSON is the cache, Graphiti is the source of truth.

**Update lifecycle:**
- **SessionStart**: Load self-model and relationship model from cache (JSON file)
- **Session ongoing**: Accumulate observations in memory
- **Stop hook**: Update both models based on session observations, write to Graphiti, update cache

---

### Category C: Cost and Scale (Questions 9-12)

#### Q9: What does this cost per session/day/month at realistic usage patterns?

**Answer: $2-15/day for moderate usage under the full Cortex vision; $0.50-3/day with the phased approach.**

**Cost model (MEDIUM confidence -- estimates based on published pricing):**

**Assumptions for "moderate developer usage":**
- 4-6 Claude Code sessions per day
- Average session length: 30 minutes
- Average prompts per session: 20-40
- Average context size: 10-50K tokens per interaction

**Current Dynamo cost (baseline):**
| Operation | Model | Frequency | Tokens | Cost/day |
|-----------|-------|-----------|--------|----------|
| Haiku curation (per prompt) | Haiku 4.5 | ~150/day | ~2K in + 500 out | ~$0.30 + $0.38 = **$0.68** |
| Session naming | Haiku 4.5 | ~5/day | ~500 in + 100 out | **<$0.01** |
| **Total baseline** | | | | **~$0.70/day** |

**Full Cortex vision cost (all four agents active):**
| Agent | Model | Invocations/day | Avg tokens (in+out) | Cost/day |
|-------|-------|-----------------|---------------------|----------|
| Inner Voice (hot path) | Haiku 4.5 | ~150 | 3K in + 1K out | **$0.45 + $0.75 = $1.20** |
| Inner Voice (deliberation) | Sonnet 4.6 | ~20 | 10K in + 3K out | **$0.60 + $0.90 = $1.50** |
| Access Agent | Sonnet 4.6 | ~5 | 20K in + 5K out | **$0.30 + $0.38 = $0.68** |
| Construction Agent | Sonnet 4.6 | ~30 | 5K in + 2K out | **$0.45 + $0.90 = $1.35** |
| Infrastructure Agent | Haiku 4.5 | ~30 | 2K in + 500 out | **$0.06 + $0.08 = $0.14** |
| Deliberation overhead | Sonnet 4.6 | ~10 | 15K in + 5K out | **$0.45 + $0.75 = $1.20** |
| **Total full Cortex** | | | | **~$6.07/day** |

**Monthly projection:**
| Scenario | Daily | Monthly |
|----------|-------|---------|
| Current Dynamo | $0.70 | $21 |
| Phased approach (Inner Voice only) | $1.50-3.00 | $45-90 |
| Full Cortex (moderate) | $5-8 | $150-240 |
| Full Cortex (heavy usage) | $10-15 | $300-450 |

**With prompt caching (90% savings on cached reads):**
System prompts, self-models, and relationship models can be cached. This could reduce input token costs by 40-60%, bringing the full Cortex down to $3-5/day.

**Key insight:** The phased approach (Inner Voice with dual-path) is 2-4x current cost. The full Cortex is 7-10x current cost. The incremental value per dollar drops sharply after the Inner Voice.

---

#### Q10: Which agents need full Claude reasoning vs. smaller models?

**Answer: Only the Inner Voice and Construction Agent need reasoning. Infrastructure and Access can be deterministic or Haiku.**

| Agent | Recommended Model | Reasoning |
|-------|------------------|-----------|
| **Inner Voice (hot path)** | Haiku 4.5 | Speed is critical. Curation and simple injection. |
| **Inner Voice (deep)** | Sonnet 4.6 | Narrative generation, relational modeling, complex decisions |
| **Access Agent** | Haiku 4.5 or deterministic | Data normalization is mostly structural. LLM only for ambiguous schemas. |
| **Construction Agent** | Sonnet 4.6 | Entity extraction, deduplication, and conflict resolution require reasoning |
| **Infrastructure Agent** | **None (deterministic)** | ACID transactions, schema migration, and time travel are deterministic database operations |

**Key insight:** The Infrastructure Agent should NOT be an LLM agent at all. It should be a set of well-tested CJS functions that perform database operations. Using Claude to decide whether to commit a transaction is like using GPT-4 to check if a file exists.

---

#### Q11: Where can deterministic pipelines replace LLM inference?

**Answer: At least 40-60% of the envisioned system can be deterministic.**

| Operation | Current (LLM) | Can Be Deterministic? | How |
|-----------|--------------|----------------------|-----|
| Entity extraction from code | LLM (Graphiti) | Partially -- AST parsing for code, LLM for natural language | Use tree-sitter for code entities, LLM for prose |
| Deduplication | LLM (Graphiti 2nd pass) | Partially -- MinHash/fuzzy match catches most | Keep LLM for ambiguous cases only |
| Session naming | Haiku | Yes (with heuristics) | But current approach works well and is cheap |
| ACID transaction management | Proposed LLM agent | **Fully deterministic** | Database operations are code, not reasoning |
| Schema migration | Proposed LLM agent | **Fully deterministic** | Migration scripts, not AI decisions |
| Time travel queries | Proposed LLM agent | **Fully deterministic** | SQL with temporal parameters |
| Data normalization | Proposed LLM agent | Mostly | Format detection + template-based transforms |
| Curation/injection formatting | Haiku | Partially | Template-based formatting with LLM polish |
| Semantic shift detection | Proposed LLM | **Fully deterministic** | Embedding cosine distance threshold |
| Entity mention detection | Proposed LLM | **Fully deterministic** | Pattern matching against known entity index |

**Recommendation:** Apply the "LLM as fallback" pattern: try deterministic first, escalate to LLM only when deterministic fails or returns low confidence.

---

#### Q12: How does the BI-style ingestion pipeline handle high-volume sources without runaway costs?

**Answer: Batch processing with smart deduplication and cost gates.**

**Design pattern (MEDIUM confidence):**

```
Source → Change Detection → Batch → Classify → Extract → Deduplicate → Store
         (deterministic)    (queue)  (Haiku)   (Sonnet) (deterministic) (DB)
```

**Cost control mechanisms:**
1. **Change detection first**: Only process what's new. Git diff for code, file modification timestamps for documents, API pagination cursors for external sources.
2. **Batch accumulation**: Don't process every change in real-time. Accumulate changes over a window (5 min, 1 hour, or until idle) and batch-process.
3. **Classification gate**: Use Haiku (cheapest) to classify whether content is worth extracting. Most code changes are not knowledge-worthy.
4. **Cost budget**: Hard limit per day/month. When budget exhausted, queue for batch API (50% discount) or defer.
5. **Deduplication before LLM**: Deterministic dedup (hash comparison, MinHash) removes duplicates before expensive LLM extraction.

**Realistic throughput:**
- 50 file changes/day: ~$0.50 in extraction costs
- 200 file changes/day: ~$2.00 in extraction costs
- 1000 changes/day (repo-wide refactor): ~$10 but should be batched as single event

**For Claudia-scale sources (future):**
- Email: 50-100 emails/day = ~$1-3/day for extraction
- Messages: Hundreds/day = batch processing essential, $2-5/day
- **Cost gate is critical**: Without it, a chatty Slack workspace could generate $50+/day in API calls

---

### Category D: Integration (Questions 13-16)

#### Q13: How does this fit within Dynamo's existing Ledger/Switchboard/Core boundaries?

**Answer: Cleanly, if the Inner Voice is positioned as a Ledger evolution, not a separate system.**

**Current boundaries (verified):**
- **Dynamo (Core)**: Orchestration, CLI routing, config, shared utilities (`core.cjs`, `dynamo.cjs`)
- **Ledger**: Memory -- hooks, curation, search, episodes, sessions, knowledge graph
- **Switchboard**: Management -- health checks, diagnostics, sync, install, stack

**Where Cortex components belong:**

| Component | Boundary | Rationale |
|-----------|----------|-----------|
| Inner Voice | **Ledger** | It IS the evolved curation pipeline. Replaces `curation.cjs` |
| Access Agent | **Ledger** | Data ingestion is a memory concern |
| Construction Agent | **Ledger** | Knowledge extraction is a memory concern |
| Infrastructure Agent | **Core** (if it exists) | Database management is cross-cutting, but... |
| Agent lifecycle | **Core** | Spawning/managing agents is an orchestration concern |
| Deliberation protocol | **Core** | Cross-agent coordination is orchestration |
| Dual-path routing | **Ledger** | Routing decisions are part of the memory pipeline |
| Agent management CLI | **Dynamo CLI** | `dynamo agent status`, `dynamo agent spawn`, etc. |
| Agent health monitoring | **Switchboard** | Health and diagnostics is Switchboard's domain |

**Key principle:** The Cortex doesn't create a fourth top-level system. It evolves Ledger and adds agent management capabilities to Core/Switchboard.

---

#### Q14: What changes to the hook system are needed?

**Answer: Minimal structural changes; the hooks become thin dispatchers that feed the Inner Voice.**

**Current hook flow:**
```
Hook fires → search Graphiti → curate with Haiku → inject result
```

**Cortex hook flow:**
```
Hook fires → Inner Voice decides action → [hot path: cached response | deliberation path: agent coordination] → inject result
```

**Specific changes:**

| Hook | Current | Cortex Change |
|------|---------|---------------|
| SessionStart | Search + curate + inject | Inner Voice generates narrative briefing |
| UserPromptSubmit | Search + curate + inject | Inner Voice assesses semantic shift, decides injection |
| PostToolUse | Capture change event | Feed to Construction Agent (or queue for batch) |
| PreCompact | Preserve knowledge | Inner Voice generates compressed state for continuity |
| Stop | Summarize session | Inner Voice updates self-model and relationship model |

**Structural changes needed:**
1. Hook dispatcher (`dynamo-hooks.cjs`) gains a routing layer: "should this go to hot path or deliberation path?"
2. New module: `ledger/inner-voice.cjs` -- the Inner Voice logic
3. New module: `ledger/dual-path.cjs` -- hot/deliberation path routing
4. Existing modules (`search.cjs`, `curation.cjs`, `episodes.cjs`) become tools available to the Inner Voice rather than directly called by hooks
5. No changes to hook registration mechanism or Switchboard

---

#### Q15: How does the Dynamo CLI evolve to support agent management?

**Answer: New command group under `dynamo agent` and enhanced `dynamo status`.**

**Proposed CLI additions:**

```bash
# Agent lifecycle
dynamo agent status          # Show which agents are active/idle/stopped
dynamo agent spawn <type>    # Manually spawn an agent (for testing/debugging)
dynamo agent stop <id>       # Stop a running agent
dynamo agent logs <id>       # View agent's recent activity

# Inner Voice
dynamo voice briefing        # Generate a briefing now (for testing)
dynamo voice model           # Show current self-model and relationship model
dynamo voice intuition       # Trigger an intuition check

# Cost monitoring
dynamo cost today            # Show today's API usage and cost
dynamo cost month            # Show monthly cost breakdown by agent
dynamo cost budget set <$>   # Set daily/monthly cost budget
dynamo cost budget status    # Show budget utilization

# Enhanced status
dynamo status                # Now includes: agent status, cost, last injection
```

**Implementation:** These would be new routes in `dynamo.cjs` (the CLI router) with corresponding modules. The `dynamo agent` commands depend on the agent lifecycle management system (Core scope). The `dynamo cost` commands are a new Switchboard capability.

---

#### Q16: What's the migration path from current Ledger to Cortex architecture?

**Answer: Incremental evolution, not big-bang replacement. Three migration phases.**

**Phase M1: Inner Voice (v1.3 scope)**
1. Create `ledger/inner-voice.cjs` alongside existing curation
2. Add dual-path routing in hook dispatcher
3. Inner Voice uses existing search/curation as tools
4. Feature flag: `dynamo config set ledger.mode classic|cortex`
5. Old and new paths coexist; user can switch back

**Phase M2: Enhanced Construction (v1.4 scope)**
1. Background ingestion pipeline for PostToolUse events
2. Entity extraction using existing Graphiti + enhanced deduplication
3. Observation synthesis (inspired by Hindsight's pattern)
4. No new database; uses existing Neo4j/Graphiti

**Phase M3: Full Agent Coordination (v1.5+ scope)**
1. Claude Agent SDK integration for on-demand agent spawning
2. Deliberation protocol between Inner Voice and Construction Agent
3. Access Agent for source ingestion beyond Claude Code context
4. Cost monitoring and budget enforcement

**Rollback strategy:** Feature flag at every phase. `ledger.mode = classic` restores the current pipeline at any point. No destructive migrations.

---

### Category E: Domain Breadth -- Claudia-aware (Questions 17-21)

#### Q17: How does the system handle radically different domains?

**Answer: Schema-agnostic entity extraction with domain-specific extraction templates.**

**The problem:** Code architecture entities (functions, modules, dependencies) look nothing like grocery items (ingredients, recipes, stores) or financial entities (accounts, transactions, balances).

**The solution pattern:**
```
Domain detection → Template selection → Entity extraction → Universal graph storage
```

1. **Domain detection**: Classify incoming data's domain (code, finance, personal, etc.) using either source metadata or lightweight LLM classification
2. **Template selection**: Each domain has extraction templates that tell the LLM what entities and relationships to look for
3. **Entity extraction**: Domain-specific templates produce domain-specific entities, but all stored in the same graph with domain labels
4. **Universal storage**: Graphiti's schema supports arbitrary entity types and relationship types -- no domain-specific database schemas needed

**For Dynamo v1 (code domain only):** This is largely moot. The system only handles code repos, file systems, and session history. Domain detection is unnecessary -- everything is code context.

**Claudia-aware design:** The extraction template system must be pluggable. A `templates/` directory with `code.yaml`, `finance.yaml`, `personal.yaml`, etc. New domains = new templates, not new code.

---

#### Q18: Does the Construction Agent need domain-specific extraction strategies?

**Answer: Yes for extraction, no for storage/retrieval.**

**Domain-specific (extraction):**
- **Code**: AST parsing, dependency resolution, function signatures -- partially deterministic via tree-sitter
- **Finance**: Transaction categorization, account resolution, recurring payment detection
- **Personal**: Contact resolution, event extraction, preference inference

**Domain-agnostic (storage and retrieval):**
- All domains produce the same primitive: `(Entity) --[Relationship]--> (Entity)` with temporal metadata
- Graph queries work identically regardless of domain
- Search/retrieval is embedding-based and domain-agnostic

**For Dynamo v1:** Only code domain extraction needed. Design the interface so domain strategies can be added.

---

#### Q19: How does the Inner Voice's personality adapt across domain contexts?

**Answer: Disposition configuration per domain context, not per domain agent.**

Borrowing from Hindsight's reflect() API design:
- **Mission**: "You are Dynamo's memory system helping a developer" (Dynamo) vs. "You are Claudia, a personal AI assistant" (Claudia)
- **Directives**: Hard rules per domain ("Never share financial data in code context")
- **Disposition**: Soft traits that shift by context (more precise in code, more empathetic in personal)

**For Dynamo v1:** Single disposition -- technical, direct, developer-focused. The personality system doesn't need to be multi-domain yet, but the configuration structure should support it.

---

#### Q20: What interface must the deliberation protocol expose for future domain agents?

**Answer: Message-based protocol with typed envelopes.**

**Minimum viable protocol:**
```typescript
interface AgentMessage {
  from: string;          // agent ID
  to: string;            // agent ID or "broadcast"
  type: "request" | "response" | "observation" | "conflict";
  domain: string;        // "code" | "finance" | "personal" | etc.
  payload: any;          // domain-specific content
  correlation_id: string; // links request/response pairs
  timestamp: string;
  priority: "hot" | "normal" | "background";
}
```

**Protocol guarantees:**
1. Any agent can send to any other agent (no forced topology)
2. Messages are typed -- agents can ignore message types they don't handle
3. Correlation IDs enable request-response tracking
4. Priority determines routing (hot path vs. background queue)
5. Domain field enables domain-specific routing rules

**For Dynamo v1:** The protocol only needs to support Inner Voice <-> Construction Agent communication. But the envelope structure should be designed for N agents.

---

#### Q21: What does the connector interface look like for new source types?

**Answer: Pluggable connector with a standard interface.**

```typescript
interface SourceConnector {
  id: string;
  name: string;
  domain: string;

  // Lifecycle
  connect(config: ConnectorConfig): Promise<void>;
  disconnect(): Promise<void>;

  // Data access
  poll(): Promise<ChangeSet>;           // Check for new/changed data
  fetch(ref: DataReference): Promise<RawData>; // Fetch specific item

  // Metadata
  getSchema(): SchemaDescription;        // What entities this source produces
  getCapabilities(): ConnectorCapabilities; // What operations supported
}

interface ChangeSet {
  changes: Array<{
    type: "created" | "modified" | "deleted";
    ref: DataReference;
    metadata: Record<string, any>;
    timestamp: string;
  }>;
  cursor: string;  // For pagination/resumption
}
```

**For Dynamo v1 connectors:**
- `FileSystemConnector`: Watches file changes via `fs.watch` or git diff
- `SessionConnector`: Hooks already handle this
- `GraphitiConnector`: Direct graph queries

**Claudia-scope connectors (future):**
- `IMMessageConnector`, `EmailConnector`, `CalendarConnector`, `BankConnector`, etc.
- Each implements the same interface; the Access Agent doesn't care about implementation details

---

## Part III: Adversarial Deliberation

### Component 1: Inner Voice

**Steel-man (strongest argument FOR):**

The Inner Voice is the single most impactful component. Current Dynamo injects raw search results curated by Haiku into every prompt. This is blunt -- it doesn't understand context, doesn't remember the relationship across sessions, and treats every injection the same regardless of what the user is doing. An Inner Voice that generates narrative briefings, understands when to stay silent, and maintains a model of the user-system relationship would transform the memory experience from "database lookup" to "AI that remembers."

The Inner Voice directly addresses the biggest user pain point: context loss across sessions. It also provides the integration point that all other Cortex components flow through, making it the natural first component to build.

**Stress-test (actively trying to break it):**

1. **Latency risk**: If the Inner Voice adds >2s to every prompt, the user will disable it. The current Haiku curation takes ~1s. Can the Inner Voice's hot path stay under 1s? Only if most decisions are cached/deterministic.

2. **Quality risk**: The Inner Voice's output quality depends on the prompt engineering for its system prompt. A poorly tuned Inner Voice that injects irrelevant "memories" is worse than the current dumb-but-reliable curation. There's a valley of mediocrity between "simple search" and "truly intelligent injection."

3. **Complexity risk**: The self-model and relationship model must be maintained. If they drift from reality (stale data, wrong inferences), the Inner Voice becomes confidently wrong -- the worst kind of failure mode.

4. **Cost risk**: Running Sonnet for the deep path on every session start and every semantic shift could 2-3x the current cost. Is the quality improvement worth $45-90/month?

5. **Debugging risk**: When the Inner Voice makes a bad injection, how does the user diagnose it? The current pipeline is transparent (search results → curation → injection). The Inner Voice adds a reasoning layer that's harder to debug.

**Verdict: GO with conditions.**
- Condition 1: Hot path MUST stay under 1s (use Haiku + caching)
- Condition 2: Feature flag for rollback to classic curation
- Condition 3: `dynamo voice explain` command shows WHY the last injection was made
- Condition 4: Start simple -- v1.3 Inner Voice is "smart curation" not "cognitive consciousness"
- Risk level: MEDIUM

---

### Component 2: Access Agent

**Steel-man:**

A unified ingestion pipeline that "hoovers up" data from heterogeneous sources is the backbone of any serious memory system. Without it, the knowledge graph only knows what Claude Code's hooks happen to capture during sessions. An Access Agent could proactively ingest the broader context -- the entire codebase, not just files touched during sessions; documentation, not just code; external references the user mentions.

**Stress-test:**

1. **Scope creep risk**: "Hoover up whatever the user directs" is an unbounded requirement. A file system watcher on a large monorepo could generate thousands of events/day. Without aggressive filtering, the Access Agent becomes a cost sinkhole.

2. **Necessity question**: For Dynamo v1 (Claude Code context only), what does the Access Agent ingest that hooks don't already capture? File changes are captured by PostToolUse. Session context is captured by SessionStart/Stop. The Access Agent adds value only for proactive ingestion of things not touched during sessions -- but is that needed in v1?

3. **Connector maintenance burden**: Each source connector (file system, git, APIs) must be maintained, updated, and tested. For Dynamo's team size (one developer + Claude), this is a significant maintenance surface.

4. **The Hyperspell lesson**: Hyperspell spent its entire engineering effort on the data access problem and still only has ~15 connectors after 2+ years. Building connectors is grunt work, not innovation.

**Verdict: DEFER to v1.4+ (or Claudia-scope).**
- For Dynamo v1, the hook system IS the Access Agent. PostToolUse captures file changes; SessionStart/Stop captures session boundaries.
- The first connector worth building is a "codebase indexer" that ingests the full repo (not just touched files) on a schedule. This is a background batch job, not a persistent agent.
- Do NOT build this as a dedicated headless Claude instance. A CJS module with a cron-like scheduler is sufficient.
- Risk level: LOW (because deferral avoids risk)

---

### Component 3: Construction Agent

**Steel-man:**

The Construction Agent is where raw data becomes knowledge. Entity extraction, deduplication, temporal tracking, and consolidation are the hard problems. Graphiti handles the mechanics but the Construction Agent provides the judgment: "Is this a new entity or an update to an existing one? Is this fact contradicted by something we already know? Should these two entities be merged?" This judgment layer is where LLM reasoning genuinely adds value over deterministic processing.

**Stress-test:**

1. **Already done by Graphiti**: Graphiti already does entity extraction, deduplication (two-phase), and temporal tracking. What does wrapping it in a "Construction Agent" add? The brief implies it adds consolidation runs and conflict resolution, but Graphiti's deduplication already resolves most conflicts.

2. **Cost amplification**: Graphiti already uses 3-8+ LLM calls per episode. Adding a Construction Agent layer means ADDITIONAL LLM calls on top. This is the most expensive part of the pipeline.

3. **Latency cascade**: If the Construction Agent must run for every PostToolUse event, it adds significant latency to the write path. Batch processing is essential but adds complexity.

4. **Hindsight's observation synthesis is the real value**: The most compelling feature is automatic observation synthesis (Hindsight's pattern). But this can be implemented as a scheduled batch job that runs Graphiti queries + LLM synthesis, not as a persistent agent.

**Verdict: BUILD THE CAPABILITY, NOT THE AGENT.**
- Enhance Graphiti integration with observation synthesis (batch job, not persistent agent)
- Add conflict detection and resolution logic as a CJS module
- The "Construction Agent" is a set of functions, not a headless Claude instance
- Schedule consolidation runs periodically (daily, or after N ingestion events)
- Risk level: MEDIUM (Graphiti integration complexity)

---

### Component 4: Infrastructure Agent

**Steel-man:**

ACID transactions, time travel queries, schema evolution, and consistency enforcement are critical for a system that other AI agents depend on. If the knowledge graph becomes inconsistent, every downstream decision is compromised. A dedicated Infrastructure Agent ensures these concerns are never forgotten.

**Stress-test:**

1. **LLMs should not manage databases**: This is the strongest critique in the entire analysis. ACID transactions are deterministic. Schema migration is deterministic. Time travel queries are deterministic. Using an LLM to reason about these operations is like using a painter to do arithmetic -- the tool is wrong for the job.

2. **Neo4j already provides ACID**: Dynamo's existing Neo4j instance provides ACID transactions. Graphiti's bi-temporal model provides time travel. What does an Infrastructure Agent add?

3. **Cost for zero value**: Every LLM call to "ensure ACID compliance" costs tokens. The database already ensures ACID compliance. The agent adds cost without adding capability.

4. **Complexity for negative value**: Adding an agent between the application and the database introduces a new failure mode. If the Infrastructure Agent crashes or reasons incorrectly, database operations may fail or corrupt data. The direct database access pattern is more reliable.

**Verdict: NO-GO as an agent. YES as tooling.**
- Database management should be deterministic CJS code, not an LLM agent
- Build: migration scripts, backup/restore commands, consistency checks as CLI tools
- Build: `dynamo db migrate`, `dynamo db backup`, `dynamo db check`
- Do NOT build: a headless Claude instance that manages the database
- Risk level: NEGATIVE (the agent would introduce more risk than it mitigates)

---

### Component 5: Deliberation Protocol

**Steel-man:**

Inter-agent deliberation enables sophisticated reasoning that no single agent can achieve. The Access Agent knows what data is available; the Construction Agent knows what's in the graph; the Inner Voice knows what the user needs. When these agents reason together, the system produces better results than any individual agent.

**Stress-test:**

1. **When would three agents actually need to deliberate?** The brief gives one example: "Construction Agent detects conflict, queries Access Agent for corroborating signals." But this can be implemented as a function call, not inter-agent deliberation. The Construction Agent calls `searchRawData(query)` -- it doesn't need to have a conversation with the Access Agent.

2. **Latency makes real-time deliberation impractical**: Multi-round deliberation between three agents takes 5-15 seconds. This is acceptable only for rare background operations, not the common path.

3. **Complexity vs. value curve**: For every deliberation scenario the brief describes, there's a simpler implementation that achieves 90% of the value at 10% of the complexity. "Agent A calls function B" is simpler than "Agent A sends message to Agent B, which reasons about it and responds."

4. **The Claude Agent Teams limitation**: Teams are ephemeral -- no cross-session persistence. So the "agents that reason together" model requires spawning a new team for each deliberation, which means re-establishing context each time.

**Verdict: DEFER. Build function calls, not deliberation.**
- For Dynamo v1, inter-component communication is function calls between CJS modules
- Design the message envelope (Q20) now for future extensibility
- Actual multi-agent deliberation is v2.0 territory when the value is proven
- Risk level: HIGH if built now (complexity, cost, latency); LOW if deferred

---

### Component 6: Dual-Path Architecture

**Steel-man:**

The dual-path architecture (hot path for reads, deliberation path for writes/conflicts) is the critical cost-control mechanism. Without it, every memory operation involves expensive multi-agent reasoning. With it, 95% of operations stay fast and cheap while only complex operations invoke the full pipeline.

**Stress-test:**

1. **Path selection accuracy**: How does the system decide which path? If it uses an LLM to decide... that's another LLM call on every operation, defeating the purpose. The path selection must be deterministic.

2. **Cache staleness**: The hot path relies on cached/indexed data. If the cache is stale, the hot path returns outdated information. Cache invalidation ("the two hard problems in CS") applies here.

3. **Path escalation**: Sometimes a hot path query should escalate to deliberation ("I found partial results but they might be incomplete"). This requires a feedback mechanism.

**Verdict: STRONG GO. This is the most important design insight in the entire brief.**
- The dual-path architecture should be the FIRST thing implemented
- Hot path: deterministic search + cached results (current pipeline, enhanced)
- Deliberation path: LLM-powered deep reasoning (used sparingly)
- Path selection: deterministic rules (entity match confidence, result count, freshness)
- Cache invalidation: event-driven (PostToolUse triggers cache update for affected entities)
- Risk level: LOW (this is fundamentally sound)

---

## Part IV: Requirements Impact Validation

### Existing Requirements Claimed to Be Absorbed

| Requirement | Brief's Claim | Validation | Verdict |
|-------------|--------------|------------|---------|
| **MENH-01** (Decision engine) | Absorbed by Inner Voice context inference | **VALID** -- The Inner Voice's semantic shift detection and context-aware injection IS the decision engine | Absorbed |
| **MENH-02** (Preload engine) | Absorbed by Inner Voice preconscious loading | **VALID** -- Narrative briefing at SessionStart IS the evolved preload engine | Absorbed |
| **MENH-04** (Memory inference) | Absorbed by Inner Voice + Construction Agent | **PARTIALLY VALID** -- Memory inference is broader than just the Cortex. Synthesis/export (MENH-03) is related but independent | Absorbed if scoped correctly |
| **MENH-09** (Council-style deliberation) | Absorbed by inter-agent deliberation | **VALID** -- This IS the multi-agent deliberation requirement | Absorbed |
| **MENH-10** (Dynamic curation depth) | Absorbed by Inner Voice intuition generation | **VALID** -- The Inner Voice's decision about injection depth IS dynamic curation | Absorbed |
| **MENH-11** (Proactive ingestion) | Absorbed by Access Agent | **PARTIALLY VALID** -- The Access Agent is overkill for v1.3 proactive ingestion. A simpler "smart ingestion" module covers MENH-11 | Absorbed conceptually, not by Agent |
| **MGMT-09** (Human cognition patterns) | Absorbed by Inner Voice cognitive architecture | **VALID** -- The Inner Voice IS human cognition patterns applied to memory | Absorbed |

**Summary:** 5 of 7 are cleanly absorbed. 2 (MENH-04, MENH-11) are partially absorbed -- the Cortex vision exceeds what these requirements ask for.

### New Requirements Introduced (Validation)

| # | Proposed Requirement | Scope | Necessary for v1.3? | Complexity |
|---|---------------------|-------|---------------------|------------|
| 1 | Inner Voice agent design | Core | **YES** | HIGH |
| 2 | Access Agent design | Deferred | No -- hooks suffice for v1 | MEDIUM |
| 3 | Construction Agent design | Partial | Enhance Graphiti, not new agent | MEDIUM |
| 4 | Infrastructure Agent design | **NO** | Deterministic tooling, not agent | LOW |
| 5 | Deliberation protocol | Deferred | Function calls suffice for v1 | HIGH |
| 6 | Headless CC instance management | Partial | Agent SDK for Inner Voice only | MEDIUM |
| 7 | Dual-path routing | **YES** | Critical cost control | MEDIUM |
| 8 | BI-style ingestion pipeline | Deferred | PostToolUse hooks suffice for v1 | HIGH |
| 9 | Inner Voice persistence | **YES** | Self-model + relationship model | MEDIUM |
| 10 | Cost model | **YES** | Budget enforcement | LOW |

**v1.3-essential new requirements: 4 of 10** (Inner Voice, dual-path routing, Inner Voice persistence, cost model)

---

## Part V: Milestone Impact Analysis

### Option A: v1.3 Becomes Ledger Cortex (Clean Pivot)

**What it means:** Rewrite v1.3 entirely to deliver the full Cortex architecture. Absorb 7 existing requirements, introduce 10 new ones.

**Risk assessment:**
- v1.3 currently has 14 requirements across intelligence AND modularity (MGMT-01 through MGMT-11, MENH-01 through MENH-11, UI-08)
- Only 6-7 of these are absorbed by Cortex. The remaining 7 (MGMT-01, MGMT-02, MGMT-03, MGMT-05, MGMT-08, MGMT-10, MGMT-11) are untouched
- Full Cortex is a 3-6 month effort minimum (4 agents, deliberation protocol, dual-path, persistence, cost monitoring)
- This delays all other v1.3 work by months

**Throwaway work in current v1.3:** NONE -- v1.3 hasn't been built yet. But it delays v1.3's management improvements (MGMT-*) indefinitely.

**Verdict: NOT RECOMMENDED.** Too large, too risky, delays critical management work.

### Option B: Insert Cortex as Later Milestone (v1.3 Stays Incremental)

**What it means:** Keep v1.3 as planned. Insert Cortex as v1.6 or v2.0 after the current roadmap.

**Risk assessment:**
- v1.3 builds MENH-01 (decision engine) and MENH-02 (preload engine) incrementally
- If Cortex is planned for v1.6, MENH-01/02 implementations become throwaway when replaced by Inner Voice
- But MENH-01/02 are small, focused features -- the throwaway cost is low
- Advantage: incremental progress continues, user gets value sooner

**Throwaway work:** MENH-01, MENH-02, MENH-10, MENH-11 implementations would be partially replaced. Estimated throwaway: 2-3 weeks of work.

**Verdict: VIABLE but suboptimal.** Building MENH-01/02 knowing they'll be replaced is wasteful if the Cortex timeline is near.

### Option C: Phased Integration Across Milestones

**What it means:** Distribute Cortex components across existing milestones, starting with the highest-value components.

**Proposed distribution:**

| Milestone | Cortex Component | What Gets Built |
|-----------|-----------------|-----------------|
| **v1.3** | Inner Voice (basic) + Dual-path | Smart curation replacing Haiku pipeline; hot/deliberation path routing; semantic shift detection; self-model persistence |
| **v1.3** | Cost monitoring | Budget tracking and enforcement |
| **v1.4** | Enhanced Construction | Observation synthesis; improved entity extraction; consolidation batch jobs |
| **v1.4** | Inner Voice (advanced) | Narrative briefings; relationship modeling; cross-session continuity |
| **v1.5** | Agent coordination | Claude Agent SDK integration; on-demand agent spawning for deep recall |
| **v1.5** | Access Agent (basic) | Codebase indexer; scheduled background ingestion |
| **v2.0** | Full deliberation | Multi-agent reasoning; domain agent framework |
| **v2.0** | Claudia-aware interfaces | Connector framework; multi-domain extraction |

**Throwaway work:** MENH-01/02 are built AS the Inner Voice, not as separate features that get replaced. Zero throwaway.

**Verdict: STRONGLY RECOMMENDED.** This is the right approach because:
1. Highest-value component (Inner Voice) ships first
2. Each milestone is independently valuable
3. No throwaway work
4. Cost scales gradually with capability
5. The vision stays intact but de-risked through incremental delivery
6. Management requirements (MGMT-*) proceed in parallel

---

### Recommended Revised Roadmap Structure

#### v1.2.1 -- Stabilization and Polish (UNCHANGED)
Phases 12-15. Currently in progress. Complete as planned.

#### v1.3 -- Intelligence Layer (REVISED)

**Theme change:** "Intelligence and Modularity" becomes "Intelligent Memory and Modularity"

**Absorbed into v1.3 from Cortex:**
- MENH-01 (Decision engine) -- implemented AS Inner Voice context inference
- MENH-02 (Preload engine) -- implemented AS Inner Voice narrative briefing
- MENH-10 (Dynamic curation depth) -- implemented AS dual-path routing
- MENH-11 (Proactive ingestion) -- implemented AS smart ingestion in PostToolUse
- MGMT-09 moves FROM v1.4 to v1.3 -- implemented AS Inner Voice personality/cognition

**New Cortex requirements added to v1.3:**
- **CORTEX-01**: Inner Voice (basic) -- semantic shift detection, smart curation, self-model persistence
- **CORTEX-02**: Dual-path routing -- hot path (deterministic+cached) and deliberation path (LLM-powered)
- **CORTEX-03**: Cost monitoring -- budget tracking per agent/day/month with enforcement

**Remains in v1.3 (management):**
- MENH-06, MENH-07 (transport/model flexibility)
- MGMT-01, MGMT-02, MGMT-03, MGMT-05, MGMT-08, MGMT-10, MGMT-11
- UI-08

**Total v1.3 requirements:** ~17 (increased from 14, but 5 absorptions mean net +3 scope items)

#### v1.4 -- Memory Quality and Agent Foundation (REVISED)

**Theme change:** "Memory Quality and Preferences" expands to include Cortex construction layer

**Added to v1.4 from Cortex:**
- **CORTEX-04**: Inner Voice (advanced) -- narrative briefings, relationship modeling, personality adaptation
- **CORTEX-05**: Enhanced Construction -- observation synthesis, consolidation batch jobs, improved deduplication
- **CORTEX-06**: Inner Voice persistence -- cross-session continuity, self-model evolution

**Remains in v1.4:**
- MENH-03 (synthesis/export), MENH-04 (inference -- now enhanced by Cortex), MENH-05 (flat file), MENH-08 (local embeddings)
- MGMT-06, MGMT-07 (preferences)
- MGMT-09 moved to v1.3

#### v1.5 -- Dashboard, Visibility, and Agent Coordination (REVISED)

**Theme expansion:** Dashboard + Cortex agent coordination

**Added to v1.5 from Cortex:**
- **CORTEX-07**: Agent coordination -- Claude Agent SDK integration, on-demand spawning for deep recall
- **CORTEX-08**: Access Agent (basic) -- codebase indexer, scheduled background ingestion
- **CORTEX-09**: Connector framework -- pluggable interface for source types

**Remains in v1.5:** All UI-* requirements, MGMT-04

#### v2.0 -- Advanced Capabilities (REVISED)

**Added to v2.0 from Cortex:**
- **CORTEX-10**: Multi-agent deliberation protocol -- message envelopes, coordination, conflict resolution
- **CORTEX-11**: Domain agent framework -- Claudia-aware extensibility for future domain agents
- MENH-09 (Council-style deliberation) -- absorbed by CORTEX-10

**Remains in v2.0:** UI-07 (desktop/mobile)

---

## Part VI: Risk Register

| # | Risk | Impact | Probability | Mitigation |
|---|------|--------|-------------|------------|
| 1 | Inner Voice quality regression vs. current curation | User disables system | MEDIUM | Feature flag for classic mode; A/B test |
| 2 | Cost escalation beyond budget | Unexpected bills | HIGH | Cost monitoring (CORTEX-03) as day-1 feature; hard budget caps |
| 3 | Latency regression on hot path | User-visible delay | MEDIUM | <1s requirement on hot path; deterministic path selection |
| 4 | Neo4j + Graphiti scaling limits | Graph performance degrades with data volume | LOW | Monitor graph size; prune old data; consider alternative backends at scale |
| 5 | Claude Agent SDK breaking changes | Agent coordination fails | MEDIUM | Pin SDK versions; abstract behind Dynamo interfaces |
| 6 | Over-engineering: building full multi-agent before proving Inner Voice | Wasted effort on unused complexity | HIGH | Phase C approach enforces prove-then-expand |
| 7 | Self-model/relationship model drift | Inner Voice makes wrong assumptions | MEDIUM | Periodic reset/recalibration; user correction mechanism |
| 8 | Observation synthesis produces low-quality patterns | Misleading knowledge in graph | MEDIUM | Confidence scoring on observations; human review mechanism |
| 9 | Zero-dependency constraint conflict with Agent SDK | Can't use SDK without npm dependency | HIGH | Use `claude -p` CLI headless mode instead of SDK import |
| 10 | Scope creep: Cortex vision expands during implementation | Timeline slip | HIGH | Strict phase gates; each milestone is independently shippable |

---

## Part VII: Go/No-Go Summary

| Component | Verdict | Conditions | Timing |
|-----------|---------|-----------|--------|
| **Inner Voice (basic)** | **GO** | <1s hot path, feature flag, debug commands | v1.3 |
| **Dual-path architecture** | **STRONG GO** | Deterministic path selection, cache invalidation | v1.3 |
| **Cost monitoring** | **GO** | Budget caps with hard enforcement | v1.3 |
| **Inner Voice (advanced)** | **GO** | After basic proves value | v1.4 |
| **Enhanced Construction** | **GO** | Batch jobs, not persistent agent | v1.4 |
| **Access Agent** | **CONDITIONAL GO** | Only as scheduled batch job, not persistent agent | v1.5 |
| **Agent coordination (SDK)** | **CONDITIONAL GO** | Only after Inner Voice + Construction proven | v1.5 |
| **Infrastructure Agent** | **NO-GO** | Build as deterministic tooling instead | Never (as agent) |
| **Full deliberation protocol** | **DEFER** | Function calls first, protocol later | v2.0 |
| **Domain agent framework** | **DEFER** | Claudia-scope, not Dynamo-scope | v2.0 |

---

## Part VIII: Draft Revised MASTER-ROADMAP.md

Below is the proposed revision to the Master Roadmap incorporating Cortex components via Option C (phased integration). Changes from the current roadmap are marked with `[CORTEX]`.

---

### Draft: Revised MASTER-ROADMAP.md

```markdown
# Dynamo Master Roadmap

**Last updated:** 2026-03-18

This document covers the Dynamo project roadmap from v1.2.1 through v2.0.
Milestones v1.0 (Research), v1.1 (Memory Fix), and v1.2 (Foundation) are complete.

> **Ledger Cortex Integration:** The Ledger Cortex vision (multi-agent cognitive
> memory) is integrated across milestones via phased delivery. Core insight: the
> Inner Voice + dual-path architecture ships in v1.3; agent coordination and
> domain extensibility scale in v1.5-v2.0.

## Milestone Overview

| Milestone | Theme | Requirements | Description |
|-----------|-------|:------------:|-------------|
| v1.2.1 | Stabilization and Polish | 10 | Close gaps from v1.2 |
| v1.3 | Intelligent Memory and Modularity | ~17 | Inner Voice, dual-path routing, cost monitoring + management modularity |
| v1.4 | Memory Quality and Agent Foundation | ~9 | Advanced Inner Voice, observation synthesis, preferences |
| v1.5 | Dashboard, Visibility, and Agent Coordination | ~10 | UI + agent SDK integration + connector framework |
| v2.0 | Advanced Capabilities | ~4 | Multi-agent deliberation, domain agent framework, cross-platform |

## Milestone Details

### v1.2.1 -- Stabilization and Polish [UNCHANGED]

[Current v1.2.1 content remains exactly as-is]

### v1.3 -- Intelligent Memory and Modularity [REVISED]

**Goal:** Make the memory system intelligent through the Inner Voice and dual-path
architecture (Ledger Cortex Phase 1), while making the management system modular.
The Inner Voice replaces Haiku-only curation with context-aware, personality-driven
memory injection. Dual-path routing ensures cost control.

**Dependencies:** v1.2.1 (stabilization complete)

**[CORTEX] New/absorbed requirements:**

| Requirement | Name | Source | Rationale |
|-------------|------|--------|-----------|
| CORTEX-01 | Inner Voice (basic) | New | Semantic shift detection, smart curation, self-model persistence |
| CORTEX-02 | Dual-path routing | New | Hot path (<1s, deterministic) and deliberation path (LLM-powered) |
| CORTEX-03 | Cost monitoring | New | Per-agent/day/month budget tracking with enforcement |
| MENH-01 | Decision engine | Absorbed by CORTEX-01 | Inner Voice context inference IS the decision engine |
| MENH-02 | Preload engine | Absorbed by CORTEX-01 | Inner Voice narrative briefing IS the preload engine |
| MENH-10 | Dynamic curation depth | Absorbed by CORTEX-02 | Dual-path routing IS dynamic curation |
| MENH-11 | Proactive ingestion | Absorbed by CORTEX-01 | Smart PostToolUse handling IS proactive ingestion |
| MGMT-09 | Human cognition patterns | Moved from v1.4 | Inner Voice cognitive architecture IS this requirement |

**Remaining management requirements (unchanged):**

| Requirement | Name | Rationale |
|-------------|------|-----------|
| MENH-06 | Support both API and native Haiku | Transport flexibility for all agents |
| MENH-07 | Support other model choices | Model selection per path/agent |
| MGMT-01 | Self-contained dependency management | Core self-manageability |
| MGMT-02 | Domain-specific on-demand modules | Skill loading |
| MGMT-03 | CC skill inference | Skill awareness |
| MGMT-05 | Hooks replacing CLAUDE.md | Dynamic behavior |
| MGMT-08 | Jailbreak protection | Security |
| MGMT-10 | Modular injection control | Injection refinement |
| MGMT-11 | Session index refactor to SQLite | Data management |
| UI-08 | Inline Dynamo visibility | In-thread feedback |

### v1.4 -- Memory Quality and Agent Foundation [REVISED]

**Goal:** Elevate memory quality through synthesis, comprehension, and the advanced
Inner Voice. Observation synthesis (inspired by Hindsight) automatically identifies
patterns across accumulated knowledge. The Inner Voice gains narrative briefings,
relationship modeling, and cross-session continuity.

**Dependencies:** v1.3 (Inner Voice basic + dual-path operational)

**[CORTEX] New requirements:**

| Requirement | Name | Source | Rationale |
|-------------|------|--------|-----------|
| CORTEX-04 | Inner Voice (advanced) | New | Narrative briefings, relationship modeling, personality |
| CORTEX-05 | Enhanced Construction | New | Observation synthesis, consolidation batch jobs |
| CORTEX-06 | Inner Voice persistence | New | Cross-session continuity, self-model evolution |

**Remaining requirements:**

| Requirement | Name | Rationale |
|-------------|------|-----------|
| MENH-03 | Memory synthesis and export | Output format |
| MENH-04 | Memory inference | Enhanced by CORTEX-05 |
| MENH-05 | Flat file support | Alternative backend |
| MENH-08 | Local embeddings | Privacy/latency |
| MGMT-06 | Global CC preferences | Preference storage |
| MGMT-07 | Project CC preferences | Preference storage |

**Removed from v1.4:** MGMT-09 (moved to v1.3 as Inner Voice component)

### v1.5 -- Dashboard, Visibility, and Agent Coordination [REVISED]

**Goal:** Visual insight via dashboard plus Cortex agent coordination. The Claude
Agent SDK enables on-demand agent spawning for deep recall. A basic Access Agent
provides scheduled codebase ingestion. The connector framework establishes the
pluggable interface for future data sources.

**Dependencies:** v1.4 (memory quality + Inner Voice advanced)

**[CORTEX] New requirements:**

| Requirement | Name | Source | Rationale |
|-------------|------|--------|-----------|
| CORTEX-07 | Agent coordination | New | SDK integration, on-demand spawning |
| CORTEX-08 | Access Agent (basic) | New | Codebase indexer, background ingestion |
| CORTEX-09 | Connector framework | New | Pluggable source interface |

**Remaining UI requirements (unchanged):**

| Requirement | Name | Rationale |
|-------------|------|-----------|
| UI-01 through UI-06 | Dashboard views | Visual insight |
| MGMT-04 | TweakCC integration | UI-adjacent |

### v2.0 -- Advanced Capabilities [REVISED]

**Goal:** Full multi-agent deliberation and Claudia-aware extensibility.

| Requirement | Name | Source | Rationale |
|-------------|------|--------|-----------|
| CORTEX-10 | Multi-agent deliberation | New | Message protocol, coordination |
| CORTEX-11 | Domain agent framework | New | Claudia-aware extensibility |
| MENH-09 | Council-style deliberation | Absorbed by CORTEX-10 | This IS the multi-agent deliberation |
| UI-07 | Desktop/mobile | Existing | Cross-platform |

## Guiding Principles [UPDATED]

[Original principles remain, plus:]

- **Prove before scaling.** The Inner Voice must demonstrably improve memory quality
  in v1.3 before investing in multi-agent coordination in v1.5. Each Cortex component
  must justify its cost and complexity through measured improvement.
- **Agents are expensive; functions are cheap.** Default to deterministic CJS functions.
  Escalate to LLM agents only when reasoning genuinely adds value. The Infrastructure
  Agent is deterministic tooling, not an LLM agent.
- **Dual-path is non-negotiable.** Every memory operation must route through the
  hot path (fast, cheap, deterministic) or deliberation path (slow, expensive, intelligent).
  No operation should use the deliberation path by default.
- **Claudia-aware, not Claudia-scoped.** Design interfaces for extensibility (connector
  framework, message envelopes, domain templates) but only build what Dynamo needs now.
```

---

## Sources

### Primary (HIGH confidence)
- [Claude Agent SDK Official Docs](https://platform.claude.com/docs/en/agent-sdk/overview) -- SDK architecture, subagents, hosting, sessions
- [Claude Agent SDK Subagents](https://platform.claude.com/docs/en/agent-sdk/subagents) -- Subagent creation, lifecycle, communication
- [Claude Code Custom Subagents](https://code.claude.com/docs/en/sub-agents) -- Filesystem-based agents, persistent memory, agent teams
- [Claude Agent SDK Hosting](https://platform.claude.com/docs/en/agent-sdk/hosting) -- Container patterns, resource requirements, deployment
- [Claude API Pricing](https://platform.claude.com/docs/en/about-claude/pricing) -- Token costs as of March 2026
- [Graphiti GitHub](https://github.com/getzep/graphiti) -- Temporal KG architecture, Neo4j integration
- [Hindsight Documentation](https://hindsight.vectorize.io/) -- Memory types, retrieval strategies, reflect API
- [Hindsight GitHub](https://github.com/vectorize-io/hindsight) -- PostgreSQL+pgvector architecture

### Secondary (MEDIUM confidence)
- [Synix: Agent Memory Systems Analysis](https://synix.dev/articles/agent-memory-systems/) -- Eight architecture comparison (verified against official repos)
- [Tacnode Blog](https://tacnode.io/post/ai-agent-memory-architecture-explained) -- Three-layer memory architecture
- [Neo4j Blog on Graphiti](https://neo4j.com/blog/developer/graphiti-knowledge-graph-memory/) -- Production knowledge graph patterns
- [VentureBeat on Hindsight](https://venturebeat.com/data/with-91-accuracy-open-source-hindsight-agentic-memory-provides-20-20-vision) -- Benchmark results

### Tertiary (LOW confidence -- needs validation)
- Cost model projections (based on published pricing but usage assumptions are estimates)
- LangGraph assessment (based on documentation review, not hands-on testing)
- Hyperspell capabilities (closed-source platform, claims unverified)
- Agent Teams ephemeral limitation (based on community reports, may change in future SDK versions)

---

## Metadata

**Confidence breakdown:**
- Technology landscape: HIGH -- official docs verified
- Architecture patterns: MEDIUM -- design recommendations, not proven implementations
- Cost model: MEDIUM -- based on published pricing but usage is estimated
- Feasibility: HIGH -- SDK capabilities verified via official documentation
- Roadmap impact: MEDIUM -- depends on scope discipline during implementation

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (30 days -- Claude Agent SDK is evolving rapidly; re-verify before implementation)
