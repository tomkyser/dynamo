# Inner Voice: Architectural Synthesis v2

## Theory Extension & Research Mission Brief

**Date:** 2026-03-18
**Status:** Pre-specification — conceptual synthesis from collaborative discussion
**Purpose:** Synthesizes new architectural theory extending INNER-VOICE-SPEC.md with concepts from a collaborative design session: frame-first pipeline, user-relative definitions, variable substitution debiasing, three-tier memory architecture, REM consolidation, and scalar compute cognitive profile resolution.
**Lineage:** Extends LEDGER-CORTEX-BRIEF.md → LEDGER-CORTEX-ANALYSIS.md → INNER-VOICE-SPEC.md

-----

## 1. Foundational Constraints (Mechanistic Reality)

This architecture is designed within the mechanistic reality of what LLMs are and are not, established through prior research on transformer internals and the limits of statistical language models.

**1.1 No cognition, only interpolation.** LLMs minimize cross-entropy loss over token sequences. Their "reasoning" is cosine similarity in embedding space (lateral association), induction head pattern matching (copy-paste from context), and FFN key-value retrieval (static memory lookup). There is no symbolic logic, no causal modeling, no vertical abstraction. The architecture must never assume capabilities the mechanism does not provide.

**1.2 No extrapolation, only manifold traversal.** The model can generate outputs that fall within the convex hull of its training distribution. It cannot produce points outside that hull. Any output that appears novel is interpolation between known regions of the manifold, not genuine invention. The architecture exploits this by engineering *which* interpolation paths are traversed, not by expecting the model to leave the manifold.

**1.3 No grounding, only distributional representation.** The model learns P(word | context), never P(word | world). It possesses usage patterns, not concepts. The Symbol Grounding Problem (Harnad) is unresolved. The architecture works with distributional representations honestly, never treating them as understanding.

These constraints are non-negotiable. Every design decision in this document has been pressure-tested against them. When the document describes "cognitive" processes, it refers to functional targets for pattern matching and association heuristics to approximate — not claims about actual cognition occurring inside the model.

-----

## 2. Implementation Substrate: Claude Code Native Subagents

**Critical architectural decision:** The Inner Voice runs as a Claude Code native subagent spawned by the hook system, NOT as a tandem API consumer.

**Rationale:**

- Claude Code hooks can spawn subagents with isolated context windows
- Subagents inherit the user's Claude Code subscription cost model rather than requiring separate API billing
- Context isolation between the main session and the Inner Voice subagent is provided natively — no custom sandboxing needed
- The subagent model aligns with the dual-process architecture: the main session IS System 2 (the parent Claude Code process), the Inner Voice IS System 1 (a spawned subagent with its own context, tools, and processing)
- Dramatically reduces implementation complexity versus managing separate API connections, authentication, and response coordination

**Implications for existing spec:**

- The INNER-VOICE-SPEC.md's model selection table (Haiku for hot path, Sonnet for deliberation) needs re-evaluation against subagent model availability and cost structure
- The latency budget may shift — subagent spawn overhead versus API call overhead
- The cost projections ($36-59/month) were based on direct API pricing; subagent cost model may differ significantly under a subscription
- The `claude -p` CLI headless mode approach from the spec's Risk #9 (zero-dependency constraint) may be superseded by native subagent spawning if hooks support it directly

**Open question for research:** What are the exact capabilities, limitations, and cost characteristics of subagents spawned from hooks? Can they maintain persistent state across invocations? What is spawn latency? Can they access the filesystem for state persistence? These questions must be answered empirically before the spec can be finalized.

-----

## 3. The Subjective Attention Problem

### 3.1 Core Thesis

The reason LLM memory systems underperform is not a retrieval problem — it is an attention and presentation problem. Current systems treat conversation as an objective artifact ("the user said X, X contains entities A/B/C, store and retrieve accordingly"). No human experiences conversation that way.

Two people hear the same sentence and attend to different things because their experiential histories make different components salient. The subjective attention point determines both what gets recalled from memory and what gets written to memory. It is the read/write selector for the entire cognitive system.

The Inner Voice must solve this: construct the user's subjective attention point — what this moment means to this user — and use that as the origin for all downstream processing. Retrieval, association, chain propagation, sublimation — all of it flows from a user-relative center of gravity rather than an objective one.

### 3.2 Relationship to Existing Spec

The INNER-VOICE-SPEC.md frames the problem as "context-aware memory injection" and solves it through spreading activation, predictive processing (surprise-based triggers), and relevance theory (injection formatting). These are sound mechanisms but they operate on an objective representation of the conversation. The spec's pipeline is entity-first:

```
Extract entities → Propagate activation → Threshold check → Format injection
```

The subjective attention model requires a fundamentally different pipeline order. The first operation is not entity extraction — it is construction of the user's subjective frame. This is the frame-first pipeline described in Section 4.

-----

## 4. The Frame-First Pipeline

### 4.1 Pipeline Architecture

```
Trigger (hook event with conversation snapshot)
  → Domain classification (which cognitive frames does this trigger activate?)
  → User-relative definition construction (per activated frame)
  → Variable substitution (canonical phrase replaced, working context cleared)
  → Domain-specific recall queries (framed by user-relative definitions)
  → Parallel fan-out across graph + data sources
  → Chain propagation (multi-hop, relevance-pruned)
  → Brute-force evaluation (which chains alter the session's trajectory?)
  → Novelty gate (has the session already addressed this?)
  → Narrative synthesis from surviving chains
  → Variable back-substitution (restore natural language)
  → Sublimation injection into main thread
```

### 4.2 Contrast With Entity-First Pipeline (Current Spec)

|Aspect                  |Entity-First (Current Spec)          |Frame-First (This Extension)                                                          |
|------------------------|-------------------------------------|--------------------------------------------------------------------------------------|
|First operation         |Extract entities from trigger        |Classify which cognitive frames the trigger activates                                 |
|Definition of "relevant"|Graph proximity to mentioned entities|User-relative meaning constructed per domain frame                                    |
|Query origin            |The entities themselves              |The user's experiential relationship to the concept                                   |
|Fan-out strategy        |Single propagation from anchor nodes |Multiple parallel propagations, one per domain frame                                  |
|What reaches synthesis  |Chains ranked by activation score    |Chains from structurally diverse perspectives, ranked by trajectory-altering potential|
|Optimization target     |Retrieval relevance                  |Subjective attention fidelity                                                         |

These pipelines are not interchangeable. The frame-first pipeline wraps around or replaces portions of the entity-first pipeline. The spec's activation map, threshold mechanism, and injection formatting remain valid as downstream components — but the upstream origin of processing changes fundamentally.

### 4.3 User-Relative Definition Construction

When a trigger fires, the Inner Voice does NOT start from the canonical definition and search for user-relevant connections. It performs the reverse:

1. Examines how the structural components of the concept exist in the user's actual history across the knowledge graph and IV memory
1. Weights those components by prominence across the user's domains
1. Constructs a working definition of what the concept means *for this user at this moment*
1. This user-relative definition becomes the origin point for all downstream processing

**Example:** User mentions "negative feedback loop" in a conversation about team dynamics.

The canonical definition (control theory: output fed back to reduce input) is the highest-probability manifold region for that phrase. The user-relative definition might weight toward: recurring interpersonal escalation patterns observed in the user's interaction history, cyclical architectural debt patterns in their codebase, or self-reinforcing productivity blockers they've described across sessions.

The user-relative definition is not a personalized gloss on the canonical meaning. It is a reconstruction of what the concept's *structural components* (cyclicality, escalation, self-reinforcement, damping failure) mean experientially for this specific user.

### 4.4 Variable Substitution as Debiasing Mechanism

After constructing the user-relative definition, the canonical phrase is replaced with a neutral variable in the Inner Voice's working context. The working context is then cleared of the original term.

**Purpose:** The LLM's default behavior is to anchor on the canonical definition — that is the highest-probability region of the manifold for any well-known concept. Instead of prompt engineering *against* this gravitational pull (fighting the model's strongest prior), you remove the mass that creates it.

**Mechanism:**

1. Construct user-relative definition for "negative feedback loop"
1. Replace all instances in working context with a neutral variable (e.g., `PATTERN_α`)
1. Clear any residual canonical framing from the context
1. All downstream processing — fan-out, recall, chain propagation, synthesis — operates on the user-relative definition only
1. The LLM never encounters the token sequence that would pull attention toward the canonical manifold region
1. After synthesis, back-substitute the original phrase for natural language injection into the main thread

**Audit value:** The divergence between canonical meaning and user-relative definition is itself a first-class data artifact. Over time, these divergence patterns map the user's subjective perceptual filter — how their attention systematically differs from the canonical. These patterns become primary inputs to the IV memory layer.

**Validation concern:** How do we verify the variable substitution is actually preventing canonical drift versus producing a user-relative veneer over canonical output? This requires empirical testing and is flagged as an open research question.

### 4.5 Domain-Specific Recall

The domain filter classifies which cognitive frames the trigger activates. Each frame provides a self-reflective framing nudge — a recall prompt that bootstraps a given domain's focus and context before querying data sources.

The recall prompt is not a search filter. It is a *perspective shift*. When the CS recall prompt activates, the Inner Voice subagent is effectively repositioning itself in embedding space before formulating the query. The same trigger produces genuinely different queries because the framing context changes what "relevant" means.

**Example continued:** "Negative feedback loop" with three activated frames:

|Frame      |Recall Prompt Focus                                   |Query Direction                                                    |
|-----------|------------------------------------------------------|-------------------------------------------------------------------|
|CS         |Feedback mechanisms, control theory, error propagation|Cyclical failure patterns in user's project history                |
|Social     |Interpersonal escalation, communication breakdown     |Recurring friction in user's interaction history                   |
|Engineering|System stability, damping, convergence failure        |Oscillating or divergent behavior in user's architectural decisions|

Three structurally diverse query sets from one trigger. The synthesis layer receives perspectives converging on the same moment from different angles. Where perspectives converge on the same underlying pattern through different paths, that is a high-activation signal.

**Mechanistic honesty:** This exploits the LLM legitimately. You are not asking for extrapolation. You are asking the model to interpolate from *multiple different starting positions* on the manifold, producing different interpolation paths that converge on the same trigger from different directions. The synthesis step has structurally diverse inputs rather than variations on the same retrieval.

### 4.6 The Fan-Out (Brute-Force Parallel Evaluation)

From each domain-specific recall query, the Inner Voice decomposes into multiple simultaneous graph queries exploring different association dimensions:

1. **Direct relationships** — one-hop connections from trigger-relevant entities
1. **Temporal neighborhood** — what was active around the same time as relevant entities
1. **Structural similarity** — entities sharing relationship *types* but not direct connections
1. **Trajectory intersection** — relevance to the *direction* the conversation has been moving
1. **Additional dimensions** as the graph and domain warrant — depth beyond four is architecturally supported and encouraged as the graph matures

Each query targets available data tiers:

- **Graphiti** (knowledge graph) — structured relationships, entities, temporal edges
- **Data lake** (Infrastructure layer) — raw unstructured history
- **IV memory** (metacognitive tier) — the Inner Voice's own processing history and user-relative models

### 4.7 The Cognitive Profile Resolution: Scalar Compute

The question "whose cognitive patterns does the Inner Voice model?" was explored across five candidates (average human, gifted human, child, specific user, purpose-built). Each fails for reasons rooted in the mechanistic constraints of Section 1.

**Resolution:** The Inner Voice does not model any human cognitive archetype. It exploits what LLMs have that biology doesn't — unbounded parallel evaluation.

A human subconscious runs association chains through hardware with hard constraints: serial bottlenecks on conscious access, ~7±2 working memory chunks, fatigue decay, emotional interference. The process is massively parallel but the output channel into consciousness is narrow. Sublimation exists because the bandwidth into awareness can't carry everything.

The Inner Voice has no such bottleneck. It runs association chains across multiple domain frames simultaneously, evaluates all chains against relevance criteria, ranks them, and surfaces only what crosses threshold. It achieves selective sublimation through **brute-force evaluation at scale** — not because it is smarter, but because it can be exhaustive where biology must be selective.

The user's own weighted domain history emerges as the effective cognitive profile over time. The Inner Voice's association patterns are not prescribed by archetype — they are shaped by the actual topology of this user's conceptual relationships as evidenced by accumulated interaction.

**Analogy:** Core 2 Duo → Nehalem. Brute-force parallelization is the Core 2 Duo move — faster execution of the same lateral-only heuristics. Valuable, real, but the ceiling is the same ceiling. The architecture should be designed to absorb the "Nehalem shift" (improved model capabilities, potential cross-domain interpolation techniques) when it arrives, while building on what is achievable today.

-----

## 5. Three-Tier Memory Architecture

### 5.1 Overview

|Tier                            |Contains                                                           |Serves                                                                                                                  |
|--------------------------------|-------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------|
|Knowledge Graph (Graphiti/Neo4j)|Structured entity-relationship data, temporal edges, facts         |Shared between main session and Inner Voice. "What the system knows about the world and the user."                      |
|Data Lake (Infrastructure Layer)|Raw unstructured history, session transcripts, ingested documents  |Higher volume, lower structure. "Everything that's been observed."                                                      |
|IV Memory (Metacognitive Layer) |The Inner Voice's own processing products and user-attention models|Exclusive to the Inner Voice. "What the IV knows about its own processing and the user's subjective attention patterns."|

### 5.2 The IV Memory Layer (New — Not in Current Spec)

The INNER-VOICE-SPEC.md has `inner-voice-state.json` containing self-model, relationship model, activation map, and injection history. This is operational state — it tracks *current processing context*.

The IV memory layer is fundamentally different. It is a **metacognitive knowledge base** that accumulates the Inner Voice's own processing products across sessions:

**Contents:**

- **User-relative definitions** — constructed per concept, refined over time through the REM cycle. How the user's experiential history redefines canonical concepts. These are the most valuable artifacts the IV produces.
- **Divergence patterns** — systematic differences between canonical and user-relative meaning. These map the user's subjective perceptual filter and evolve as the filter itself shifts.
- **Chain evaluation history** — which association chains were evaluated, which passed, which were rejected and why. Prevents redundant processing. Enables retroactive revaluation during REM.
- **Sublimation outcomes** — which injections the user engaged with versus ignored. Direct behavioral feedback on IV performance. Feeds metacognitive self-correction.
- **Domain frame productivity** — which frames have been most useful in which contexts, across sessions. Enables the domain filter to improve over time.
- **Cascading association tags** — partial chains that did not reach sublimation threshold but were building activation. These carry forward across trigger cycles. A chain that scored 0.6 against a 0.7 threshold on one trigger might score 0.85 on the next trigger if the session shifts toward the relevant topic. The IV remembers it was thinking about this and picks up the chain rather than rediscovering it.
- **Relationship model** — communication preferences, working patterns, current focus areas. (Exists in current spec's state file but evolves here through REM consolidation rather than simple overwrites.)

### 5.3 The Compounding Effect

Without IV memory, the Inner Voice is stateless between trigger cycles. With it, the IV accumulates processing state that carries forward. This is the closest the architecture can produce to genuine background cognition — not through continuous processing, but through accumulated state that creates the functional equivalent.

The user-relative definition model specifically compounds: the first time the IV constructs a definition for a concept, it works from sparse data. The fifth time, it has its own prior definitions, the user's reactions to sublimations based on those definitions, and new experiential data. The definition matures iteratively.

-----

## 6. The REM Consolidation Model

### 6.1 The Biological Analog

During sleep, REM replays experiences non-faithfully — recombining fragments, testing associations between the day's events and existing long-term memory, strengthening coherent connections, pruning those that don't survive reactivation. It is editorial, not archival.

### 6.2 Three Consolidation Tiers

Claude Code sessions end through three hookable events, each triggering a different consolidation level:

**Tier 1: Triage (on compaction event)**

- The session is not over but the context window is full and about to compact or reset.
- Fast pass: preserve IV working memory before the main thread's context is wiped. User-relative definitions constructed in the about-to-be-lost context, live cascading association tags, and current domain frame state are written to IV memory.
- Post-compaction, the IV's model survives. Its next sublimation injection can subtly reestablish the subjective attention frame that the main session lost, providing continuity across a forced forgetting event.
- **Cost model:** Cheap. Mostly filesystem writes of already-computed state. Minimal or no LLM calls.

**Tier 2: Provisional REM (on idle timeout)**

- The user walked away. The session is probably over but might resume.
- Full consolidation processing but flagged as tentative. If the user returns, provisional results are available but subject to revision. If they don't return, promote to full consolidation.
- **Cost model:** Moderate. One Sonnet-class LLM call for synthesis. Acceptable because there is no latency pressure.

**Tier 3: Full REM (on explicit session end)**

- Clean termination. Full session arc available.
- Deep editorial pass with no time pressure. Sonnet or Opus justified because cost is per-session and the quality of consolidation compounds across all future sessions.
- **Cost model:** Higher per-invocation but amortized across all future sessions that benefit from the refined models.

### 6.3 REM Operations

During the active session, the IV produces artifacts at speed — user-relative definitions, variable substitutions, divergence patterns, chain evaluations, sublimation outcomes. All live in working memory, hot and session-scoped.

REM processes these artifacts without latency pressure:

**Retroactive evaluation.** During the session, chains were evaluated against *current* context at the moment they were generated. REM evaluates them against the *completed session arc*. Something irrelevant at minute five might be the most important association once you see where the conversation ended at minute forty. Biology does this — you process the significance of a conversation after the conversation, often while sleeping, and wake up with a new understanding of what actually mattered.

**Definition refinement.** User-relative definitions constructed during the session are evaluated against outcomes. Did sublimations based on this definition land or get ignored? Strengthen, revise, or tag as unreliable. Next session starts from refined priors, not from scratch.

**Observation synthesis.** The LEDGER-CORTEX-ANALYSIS.md recommended observation synthesis as a periodic batch job. REM *is* that batch job — triggered by actual new experiential data rather than a cron schedule, with the full session context still warm.

**Cascade promotion.** Partial chains tagged during the session are evaluated in full-session context. Some get promoted to IV long-term memory as persistent association candidates. Others are pruned.

### 6.4 Working Memory → Long-Term Memory Gate

Nothing enters long-term IV memory without passing through REM consolidation. Two distinct temporal layers:

- **Working memory:** Hot during the session. Wiped after REM processes it. Fast, messy, session-scoped.
- **Consolidated memory:** Persists across sessions. Represents the IV's evolved models. Slow to change, editorially refined.

The REM process is the gate between them.

-----

## 7. Open Questions

### Resolved by This Discussion

1. ~Whose cognitive profile does the IV model?~ → No archetype. Scalar compute parallelization substitutes for vertical abstraction. The user's weighted domain history becomes the cognitive profile emergently.
1. ~Is the IV an enhanced retrieval agent?~ → No. It is a parallel cognitive process (implemented as a native subagent) that constructs the user's subjective attention point and processes the *experience* of the conversation.
1. ~How does the IV avoid anchoring to canonical definitions?~ → Variable substitution after user-relative definition construction. Context clearing removes the canonical attractor.
1. ~API cost structure?~ → Lean on Claude Code native subagents spawned from hooks. Subscription model rather than per-call API billing.

### Open — Requires Research

1. **Subagent capabilities from hooks.** What exactly can a subagent spawned from a CC hook do? Persistent state access? Filesystem? Spawn latency? Model selection? These are empirical questions.
1. **Domain filter mechanism.** How does the filter classify triggers across domains? Embedding similarity against domain-representative vectors is the leading candidate. Needs prototype testing.
1. **Suppression validation.** How to verify variable substitution actually prevents canonical drift versus producing cosmetic user-relative framing over canonical output.
1. **Activation threshold tuning.** Static, adaptive, or learned from sublimation outcome history? The spec's composite threshold function (Section 4.4) provides the formula; the parameter values need empirical calibration.
1. **Cross-domain interpolation.** Can the multi-frame fan-out reliably produce functionally novel connections by interpolating between distant manifold regions? Whiteboard-grade problem requiring empirical exploration. Not blocking for v1.3.
1. **IV memory schema.** Concrete data model for the metacognitive tier — structures, indices, retention/decay policies, storage format.
1. **Emotional/affective attention modeling.** The subjective attention model is incomplete without affective weighting. Deferred but architecturally load-bearing.
1. **REM cost under subagent model.** How does the consolidation cost profile change when running as a subagent versus direct API calls?

-----

## 8. Relationship to Existing Documents

This synthesis extends and does not replace:

|Document                           |Relationship                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
|-----------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|LEDGER-CORTEX-BRIEF.md             |Vision and strategic context. Unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
|LEDGER-CORTEX-ANALYSIS.md          |Adversarial analysis and phased delivery recommendation. Unchanged. The frame-first pipeline and REM model are additive to Option C, not a replacement.                                                                                                                                                                                                                                                                                                                                                  |
|INNER-VOICE-SPEC.md                |The primary document this extends. The spec's cognitive theory survey, mechanical design, state schema, threshold mechanism, failure mode taxonomy, and implementation pathway remain valid. This synthesis adds: the frame-first pipeline (wraps the entity-first pipeline), user-relative definitions, variable substitution, the three-tier memory architecture with IV metacognitive layer, the REM consolidation model, the cognitive profile resolution, and the subagent implementation substrate.|
|MASTER-ROADMAP-DRAFT-v1.3-cortex.md|Requires updates based on research findings. The frame-first pipeline and IV memory layer may affect CORTEX-01 scope and the v1.3/v1.4 boundary.                                                                                                                                                                                                                                                                                                                                                         |

-----

*Synthesis v2 produced: 2026-03-18*
*Source: Collaborative discussion extending INNER-VOICE-SPEC.md with frame-first pipeline, user-relative definitions, variable substitution debiasing, three-tier memory architecture, REM consolidation model, and scalar compute cognitive profile resolution.*
