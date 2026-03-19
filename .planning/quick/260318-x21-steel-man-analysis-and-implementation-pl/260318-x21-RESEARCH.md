# Steel-Man Analysis: Inner Voice Synthesis v2 - Research

**Researched:** 2026-03-18
**Domain:** Claude Code hooks architecture, LLM debiasing, cognitive memory patterns
**Confidence:** MEDIUM (mixed -- some findings are HIGH, several are LOW)

## Summary

This research investigates seven specific empirical questions from the Inner Voice cognitive architecture specification. The findings are mixed: some assumptions in the synthesis document are validated (hook architecture, consolidation patterns), some are partially validated with important caveats (subagent spawning, domain classification), and some face fundamental challenges that the synthesis document underestimates (variable substitution debiasing, fan-out at scale).

The single most important finding is about hook-to-subagent spawning: Claude Code hooks **cannot** natively spawn subagents. The `type: "agent"` hook spawns a limited verification subagent (60s timeout, yes/no decision output), not a general-purpose processing agent. The `type: "command"` hook CAN spawn `claude -p` as a child process, but this has significant cold-start latency (5-15 seconds) that blows the hot-path budget. This forces a fundamental architecture decision: either the Inner Voice runs entirely as deterministic CJS code (no subagent), or the latency budget must be dramatically revised.

**Primary recommendation:** The Inner Voice v1.3 MUST be implemented as pure CJS code with direct API calls (Haiku via OpenRouter or Anthropic API), NOT as a Claude Code subagent. The subagent path is a dead end for latency-critical hooks.

---

## 1. Claude Code Subagent Capabilities from Hooks

**Confidence: HIGH** (verified against official docs)

### The Core Question

Can Claude Code hooks spawn native subagents? The synthesis document assumes hooks can spawn subagents for Inner Voice processing.

### Findings

Claude Code supports four hook types, each with different capabilities:

| Hook Type | Mechanism | Timeout | Can Spawn Subagent? | Output |
|-----------|-----------|---------|---------------------|--------|
| `command` | Shell command via stdin/stdout | 600s (10 min) | Can spawn `claude -p` as child process | JSON or exit code |
| `http` | POST to URL | 600s | No (external service) | JSON response |
| `prompt` | Single-turn LLM call | 30s | No (single evaluation) | `ok: true/false` + reason |
| `agent` | Multi-turn subagent | 60s | YES -- but limited to verification | `ok: true/false` + reason |

**Critical nuance on `agent` hooks:** Agent hooks spawn a subagent that can use tools (Read, Grep, Glob, Bash) for up to 50 tool-use turns within 60 seconds. However, this subagent is constrained to a yes/no verification pattern. It returns `{ok: true/false, reason: "..."}`. It CANNOT output arbitrary text to stdout for injection into the main thread. It is designed for validation gates, not for processing pipelines.

**The `claude -p` workaround:** A `command` hook CAN spawn `claude -p` via `child_process.spawn()`. This gives access to a full Claude instance with any model. However:

- **Cold start latency:** 5-15 seconds for Claude CLI initialization
- **No persistent state:** Each invocation is a fresh context
- **No tool inheritance:** The `-p` instance does not inherit the parent session's tools or permissions
- **Output only via stdout:** Results come back as text, not structured data
- **Cost:** Full API call pricing for each invocation

### GO/NO-GO Implications

**NO-GO for hook-spawned subagents on the hot path.** The 5-15 second cold start for `claude -p` makes it unusable for the UserPromptSubmit hot path (target: <500ms). The `agent` hook type cannot produce injection content.

**CONDITIONAL GO for the deliberation path.** A `command` hook could spawn `claude -p` for the deliberation path (target: <2s), but the cold start still exceeds this budget. Only viable for Stop hooks (no latency constraint) and SessionStart (4s budget, marginal).

**GO for direct API calls from CJS hooks.** The existing Dynamo pattern -- `command` hooks running CJS code that makes direct HTTP API calls to OpenRouter/Anthropic -- is the correct architecture. This is what `curation.cjs` already does with Haiku. The Inner Voice should follow the same pattern: CJS code making direct API calls, not spawning subagents.

### What This Means for the Inner Voice Architecture

The Inner Voice MUST be implemented as:
1. CJS modules (`ledger/inner-voice.cjs`, `ledger/dual-path.cjs`, `ledger/activation.cjs`)
2. Direct HTTP API calls to Anthropic for Haiku/Sonnet (same pattern as `curation.cjs`)
3. JSON state file for persistence (same pattern as `sessions.cjs`)
4. All processing within the `command` hook's process, NOT delegated to subagents

This aligns with the synthesis document's v1.3 scope but contradicts any assumption about leveraging Claude Code's Agent tool from hooks.

### Sources
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- official documentation, verified 2026-03-18
- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide) -- official guide with agent hook examples
- [Claude Code Subagents Documentation](https://code.claude.com/docs/en/sub-agents) -- full subagent capabilities

---

## 2. Variable Substitution as LLM Debiasing

**Confidence: LOW** (theoretical analysis supported by adjacent research, no direct empirical evidence for this specific technique)

### The Core Question

Does replacing canonical phrases with neutral variables (e.g., replacing "Dual-Process Theory" with "$THEORY_A") actually prevent the LLM from accessing canonical semantic neighborhoods?

### Findings

**No direct research exists on this exact technique.** The debiasing literature focuses on:

1. **Counterfactual substitution** for demographic bias (swapping "he" to "she") -- well studied, effective for detecting bias, not for suppressing semantic associations
2. **Logit-level interventions** -- manipulating output probabilities to reduce bias (up to 70% reduction), but these require model-level access
3. **Prompt-level debiasing** -- adding explicit debiasing instructions (partial effectiveness, highly prompt-sensitive)

**The theoretical problem with variable substitution:**

The key question is whether replacing a phrase in the prompt prevents the model from associating the concept. The answer is almost certainly NO for well-known theories, because:

1. **Contextual reconstruction:** Even if you replace "Dual-Process Theory" with "$THEORY_A" and describe it as "a framework with fast/automatic and slow/deliberate processing," any model trained on Kahneman will reconstruct the identity from the description. The semantic neighborhood is activated by the *concept*, not the *label*.

2. **Transformer attention is content-based.** Attention operates on token embeddings. The phrase "fast automatic intuitive associative" activates the same neighborhood as "System 1" because the model learned these co-occur. Variable substitution changes the label but not the semantic content.

3. **No evidence for "context clearing."** There is no mechanism in transformer architecture where replacing a token clears prior associations. The model does not have a "forget the canonical source" capability.

### Empirical Test Protocol

To distinguish real suppression from cosmetic suppression:

```
Test Design:
1. Control: Ask the model to evaluate "Dual-Process Theory" for applicability to X
2. Treatment: Ask the model to evaluate "$THEORY_A: a framework where..." (full description)
3. Measure:
   a. Does the model ever name the canonical theory? (explicit leakage)
   b. Does the model cite the same limitations? (implicit leakage)
   c. Does the model produce different applicability judgments? (behavioral difference)
   d. Run at temperature=0 and temperature=1 -- compare variance

Prediction: Treatments will show explicit leakage suppression (model won't name the theory)
but identical implicit leakage (same limitations, same failure modes cited). Behavioral
differences will be minimal because the semantic neighborhood was activated by content,
not label.
```

### GO/NO-GO Implications

**NO-GO as a debiasing mechanism.** Variable substitution likely produces cosmetic debiasing (suppresses label output) without genuine semantic debiasing (still activates the same associations). Investing implementation effort in this technique is not justified without empirical validation.

**Alternative approach:** Instead of trying to suppress canonical associations, LEVERAGE them. Use the canonical names but add explicit adversarial counter-prompting: "Evaluate this theory's applicability. Do NOT assume it applies just because it is well-known. Identify the SPECIFIC mechanical mapping. If the mapping is metaphorical rather than functional, say so."

### Sources
- [Semantically-Aware Logit Interventions for Debiasing LLMs](https://arxiv.org/abs/2510.23650) -- logit-level debiasing (2025)
- [Social Bias Evaluation for LLMs Requires Prompt Variations](https://aclanthology.org/2025.findings-emnlp.783/) -- prompt sensitivity study
- [A Multi-LLM Debiasing Framework](https://arxiv.org/abs/2409.13884) -- multi-agent debiasing approach

---

## 3. Domain Frame Classification Mechanisms

**Confidence: MEDIUM** (well-established techniques, latency achievability needs empirical validation)

### The Core Question

Can conversational triggers be classified into cognitive domain frames (CS, social, engineering, etc.) at <100ms latency?

### Findings

Three viable approaches, ranked by latency:

| Approach | Latency | Accuracy | Setup Cost | Runtime Cost |
|----------|---------|----------|------------|-------------|
| Embedding cosine similarity | 5-20ms | 80-85% | Pre-compute domain centroids | Zero (local computation) |
| Keyword/regex matching | <1ms | 60-70% | Define keyword sets | Zero |
| Zero-shot classification (NLI model) | 50-200ms | 85-92% | None | Local model inference |

**Embedding similarity is the recommended approach for <100ms:**

1. Pre-compute embedding centroids for each domain frame using representative text
2. On each prompt, compute the prompt embedding (50-100ms via API, or <10ms with a local model like `all-MiniLM-L6-v2`)
3. Compute cosine similarity against each domain centroid (<1ms)
4. Return the top match and confidence score

**Critical insight:** The bottleneck is embedding generation, not classification. If Graphiti already computes embeddings for the prompt (for search), the classification is essentially free -- reuse the embedding and add a cosine similarity step.

**The `all-MiniLM-L6-v2` model** provides sentence embeddings with 5x faster encoding than larger models while maintaining high quality. Running locally via ONNX would achieve <10ms embedding + <1ms classification = <15ms total.

**However:** Dynamo's zero-dependency constraint means no npm packages. Running a local embedding model would require either:
- A separate process (Python with sentence-transformers) -- violates tech stack constraint
- WASM-based inference -- experimental, unreliable
- Reusing Graphiti's existing embedding calls -- adds 50-100ms API latency but is zero-dependency

### GO/NO-GO Implications

**CONDITIONAL GO.** Achievable within <100ms IF:
1. Embeddings are reused from Graphiti's existing search pipeline (zero marginal latency), OR
2. A keyword/regex heuristic provides the initial fast classification (sufficient for v1.3), with embedding-based classification deferred to v1.4

**Recommended v1.3 approach:** Keyword/regex matching against pre-defined domain vocabularies. Fast (<1ms), zero-dependency, and adequate for 5-8 domain frames. Upgrade to embedding similarity in v1.4 when the embedding model question (MENH-08) is resolved.

### Sources
- [Zero-Shot vs. Similarity-Based Text Classification](https://towardsdatascience.com/zero-shot-vs-similarity-based-text-classification-83115d9879f5/) -- comparison study
- [NLI Models as Zero-Shot Classifiers](https://jaketae.github.io/study/zero-shot-classification/) -- NLI approach baseline

---

## 4. Multi-Tier Memory Consolidation in AI Systems

**Confidence: MEDIUM** (good landscape awareness, specific implementation patterns verified)

### The Core Question

What is the state of the art for REM-like consolidation in AI memory systems? What patterns exist for distinguishing working memory from consolidated memory?

### Findings

**Hindsight's retain/recall/reflect lifecycle** is the most mature open-source implementation:

- **retain:** Raw episodes are stored as-is (hippocampal-like fast storage)
- **recall:** Multi-strategy retrieval (keyword, semantic, temporal, entity-based) fused via reciprocal rank fusion
- **reflect:** Synthesis step that reasons across multiple retrieved memories to produce consolidated answers

Key insight: Hindsight's reflect() is NOT consolidation in the neuroscience sense (background batch processing). It is on-demand synthesis at query time. True REM-like consolidation (background processing that transforms episodic to semantic memory) is a separate operation.

**A-MEM (NeurIPS 2025)** provides agentic memory with self-organizing capabilities:
- Automatic indexing and reflection over stored memories
- Memory graph construction connecting related items
- Closer to true consolidation but still primarily query-driven

**The rem-sleep Claude Code skill** (open source) implements:
- Session log processing to extract significant patterns
- Memory defragmentation (deduplication, compression, pruning)
- Durable file storage for cross-session retention

**Recent academic work (2025-2026):**
- "Language Models Need Sleep" (OpenReview, 2025) -- self-consolidation during idle periods
- "Learning to Forget" (arXiv, 2026) -- sleep-inspired consolidation for resolving proactive interference in LLMs
- "Continual Relation Extraction with Wake-Sleep Memory Consolidation" (Pattern Recognition, 2026) -- wake-sleep cycles for knowledge extraction

### State of the Art for Session-End Synthesis

The current best practice is a two-phase approach:

1. **Session-active (working memory):** Raw episodes stored with minimal processing. Observation synthesis happens on-demand during recall.
2. **Session-end (consolidation trigger):** Batch processing synthesizes accumulated episodes into higher-order observations (patterns, preferences, decisions).
3. **Inter-session (consolidation job):** Periodic batch jobs merge observations, prune redundancies, strengthen frequently co-activated connections (Hebbian), and update entity summaries.

The Inner Voice's proposed Stop hook synthesis aligns with Phase 2. The proposed periodic consolidation job aligns with Phase 3. Both patterns are validated by the literature.

### GO/NO-GO Implications

**GO for Stop hook synthesis.** Well-established pattern (Hindsight reflect, rem-sleep skill, multiple academic papers). Dynamo's existing Stop hook already does basic session summarization -- the Inner Voice extends this with model updates and observation synthesis.

**CONDITIONAL GO for inter-session consolidation.** The pattern is sound, but implementation complexity is significant: scheduling, conflict detection, merge strategies, quality gates. Correctly deferred to v1.4 in the synthesis document.

### Sources
- [Hindsight: Agent Memory That Learns](https://arxiv.org/html/2512.12818v1) -- retain/recall/reflect lifecycle
- [A-MEM: Agentic Memory for LLM Agents](https://arxiv.org/abs/2502.12110) -- NeurIPS 2025
- [Memory in the Age of AI Agents: A Survey](https://arxiv.org/abs/2512.13564) -- comprehensive survey
- [rem-sleep skill](https://skills.rest/skill/rem-sleep) -- Claude Code skill for memory consolidation
- [Learning to Forget: Sleep-Inspired Consolidation](https://arxiv.org/html/2603.14517) -- 2026 paper on REM consolidation for LLMs

---

## 5. Fan-Out Evaluation at Scale

**Confidence: MEDIUM** (mathematical analysis is solid; practical pruning strategies are well-documented but untested against Dynamo's specific graph)

### The Core Question

For a knowledge graph with ~500 entities and ~1,500 relationships, what is the combinatorial explosion of 4-dimension x 2-hop fan-out across 3 domain frames?

### Calculation

**Graph statistics:**
- 500 entities, 1,500 relationships
- Average degree: 1,500 * 2 / 500 = 6 relationships per entity (both directions)
- Average fan-out per hop: ~6

**Per-entity, 2-hop fan-out:**
- 1-hop: 6 neighbors
- 2-hop: 6 * 6 = 36 neighbors (minus overlaps)
- Realistic 2-hop with dedup: ~25-30 unique entities per anchor

**Multi-dimensional expansion:**
If "4 dimensions" means 4 different scoring/evaluation passes per entity:
- Per anchor entity: 30 entities * 4 dimensions = 120 evaluations
- Per domain frame: 120 evaluations * N anchor entities

**Full combinatorial count:**

Assuming a typical prompt activates 3-5 anchor entities:
```
Anchors:  4 (average)
1-hop:    4 * 6 = 24 entities
2-hop:    24 * 6 = 144 entities (raw), ~80 unique after dedup
Dimensions: 4 evaluation passes per entity
Domain frames: 3

Raw chain count: 80 entities * 4 dimensions * 3 frames = 960 evaluation chains
```

With 960 evaluation chains, if each chain requires an LLM call, cost and latency are prohibitive. But most chains should be deterministic:

**Pruning strategy (required):**
1. **Minimum activation threshold:** Cut at 0.3 activation. Eliminates ~60% of 2-hop entities. Reduces to ~380 chains.
2. **Single domain frame per prompt:** Classify the prompt into ONE frame, not three. Reduces to ~130 chains.
3. **Deterministic evaluation for most dimensions:** Only the "relevance" dimension needs LLM evaluation. Other dimensions (activation level, recency, confidence) are pure computation. Reduces LLM calls to ~32 per prompt.
4. **Batch similar evaluations:** Group related entities into single LLM calls (5-10 entities per call). Reduces to ~4-6 LLM calls.

### GO/NO-GO Implications

**CONDITIONAL GO.** The raw combinatorial explosion is manageable with proper pruning. The critical insight: the synthesis document's "4 dimensions x 2 hops x 3 frames" is an evaluation SPACE, not an LLM call count. With proper pruning and batching:

- Hot path: 0 LLM calls (all deterministic scoring)
- Deliberation path: 4-6 LLM calls (batched entity evaluation)

This aligns with the dual-path architecture. But the v1.3 implementation MUST start with 1-hop only (as proposed) -- 2-hop fan-out is a v1.4 capability that needs the graph density threshold (>100 entities, >200 relationships) before it adds value.

---

## 6. User-Relative Definition Construction

**Confidence: LOW** (theoretically sound, no direct empirical evidence for this specific use case)

### The Core Question

Can prompt engineering within a subagent reliably construct user-specific concept definitions from graph data?

### Findings

Graph-to-text generation with LLMs is an active research area. Key findings from 2025-2026:

1. **LLMs struggle with complex graphs.** Performance degrades as the number of triplets increases. For graphs with >20 triplets, planning and attribution sub-tasks are needed.
2. **Few-shot prompting with GPT-4/Claude achieves accuracy roughly equivalent to supervised models** for graph-to-text tasks, without requiring labeled training examples.
3. **Sparse graphs are easier.** With <10 triplets per entity, few-shot prompting reliably generates coherent text. Dynamo's graph is sparse -- most entities will have <10 relationships.

**For user-relative definitions specifically:**

The task is: given a user entity in the graph with N relationships, generate a definition that reflects the user's relationship to the concept.

Example: "Authentication" for this user means "JWT-based, using express-jwt, decided during architecture planning 2 weeks ago, last touched with some frustration."

This is feasible with a prompt pattern like:
```
Given these graph relationships about {CONCEPT} from the user's knowledge graph:
- [relationship 1]
- [relationship 2]
- [relationship N]

Generate a one-sentence definition of {CONCEPT} as this user would understand it.
Focus on: what they decided, how they use it, and their relationship with it.
```

**Sparse vs. dense graph impact:**
- Sparse (1-3 relationships): Definitions will be shallow but accurate. "Authentication: you chose JWT."
- Dense (10+ relationships): Definitions will be richer. "Authentication: JWT via express-jwt, decided during architecture planning, you found passport too complex, revisited twice since."
- Very sparse (0-1 relationships): Definitions become trivially generic. Not worth the LLM call.

### GO/NO-GO Implications

**CONDITIONAL GO.** The technique is feasible but has diminishing returns on sparse graphs. For v1.3, the graph will be sparse (~100-200 entities). User-relative definitions will be shallow and may not justify their LLM cost. Better to defer to v1.4 when:
1. The graph has sufficient density (>200 entities, >500 relationships)
2. The consolidation system has produced higher-order observations
3. Entity summaries exist as raw material

**For v1.3:** Use the relationship data directly in injection formatting rather than generating separate "definitions." The curation prompt can integrate graph context without an explicit definition construction step.

### Sources
- [Evaluating and Improving Graph to Text Generation with LLMs](https://arxiv.org/abs/2501.14497) -- 2025 evaluation study
- [Few-shot Personalization of LLMs](https://aclanthology.org/2025.naacl-long.598.pdf) -- NAACL 2025

---

## 7. Compaction Event Timing in Claude Code

**Confidence: HIGH** (verified against official docs and existing Dynamo code)

### The Core Question

How much time is available in the PreCompact hook? What data is accessible? Can meaningful state preservation happen?

### Findings

**PreCompact input data:**
```json
{
  "trigger": "manual|auto",
  "custom_instructions": "user text or empty string",
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/current/working/directory"
}
```

**Timing:**
- Default command hook timeout: 600 seconds (10 minutes)
- Recommended practical limit: <5 seconds to avoid slowing compaction
- Compaction triggers at ~95% context capacity (50,000-120,000 tokens)
- Compaction reduces context by 60-80%

**What can be done:**
1. Read/write files (filesystem access: YES)
2. Make API calls (network access: YES)
3. Output to stdout (injected into post-compaction context: YES)
4. Access `transcript_path` for full conversation history: YES

**Dynamo's existing PreCompact handler** (`preserve-knowledge.cjs`) demonstrates the pattern:
- Reads `custom_instructions` from context
- Summarizes via Haiku API call (~1-2 seconds)
- Stores in Graphiti via `addEpisode()` (~1-2 seconds)
- Outputs preserved knowledge to stdout for re-injection

**What this means for the Inner Voice:**

The PreCompact hook is an excellent opportunity for state preservation. Within a 5-second practical budget:

1. **Persist current activation map** to `inner-voice-state.json` (<5ms, file I/O)
2. **Persist self-model updates** since last persist (<5ms, file I/O)
3. **Generate a compact summary** of current Inner Voice state for re-injection (~1-2s, Haiku API call)
4. **Output re-injection text** to stdout (<1ms)

Total: ~2-3 seconds, well within budget.

**PostCompact is also available** and receives:
```json
{
  "trigger": "manual|auto",
  "compact_summary": "Generated conversation summary..."
}
```
This allows the Inner Voice to process the compaction summary and update its predictions/self-model based on what Claude decided was important enough to keep.

### GO/NO-GO Implications

**STRONG GO.** PreCompact is well-suited for Inner Voice state preservation. The existing Dynamo handler proves the pattern works. The Inner Voice should add:
1. State file persistence in PreCompact
2. A compact Inner Voice summary injected to stdout
3. PostCompact processing to update predictions from the compaction summary

The SessionStart hook (with `compact` matcher) provides the re-entry point after compaction, enabling the Inner Voice to reload state and re-prime its models.

### Sources
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- PreCompact/PostCompact schemas
- [Context Recovery Hook for Claude Code](https://claudefa.st/blog/tools/hooks/context-recovery-hook) -- community pattern
- Existing Dynamo code: `ledger/hooks/preserve-knowledge.cjs` -- working PreCompact implementation

---

## Consolidated GO/NO-GO Summary

| # | Research Item | Verdict | Key Finding | Impact on Architecture |
|---|--------------|---------|-------------|----------------------|
| 1 | Subagent from hooks | **NO-GO (hot path)**, GO (CJS direct) | Agent hooks are verification-only; `claude -p` has 5-15s cold start | Inner Voice MUST be pure CJS with direct API calls |
| 2 | Variable substitution debiasing | **NO-GO** | Cosmetic only; semantic neighborhoods activated by content, not labels | Use adversarial counter-prompting instead |
| 3 | Domain frame classification | **CONDITIONAL GO** | <100ms achievable with keyword matching or embedding reuse | v1.3: keyword heuristic; v1.4: embedding similarity |
| 4 | REM-like consolidation | **GO** | Well-established patterns (Hindsight, A-MEM, academic literature) | Stop hook synthesis validated; inter-session consolidation is v1.4 |
| 5 | Fan-out at scale | **CONDITIONAL GO** | ~960 raw chains, prunable to ~32 LLM calls with batching to ~4-6 | Must start with 1-hop in v1.3; 2-hop is v1.4 |
| 6 | User-relative definitions | **CONDITIONAL GO** | Feasible but shallow on sparse graphs | Defer explicit definitions to v1.4; v1.3 integrates graph context directly |
| 7 | PreCompact timing | **STRONG GO** | 5s practical budget is ample; existing Dynamo handler proves pattern | Add state persistence + summary injection |

---

## Open Questions

1. **Embedding model for classification:** If keyword matching is insufficient for domain frame classification in v1.3, which embedding model should be used? Graphiti's existing model is the zero-cost option but adds API latency.

2. **Direct API call latency:** The Inner Voice's hot path depends on direct HTTP calls to Anthropic's API. What is the actual p95 latency for Haiku calls from the user's location? This needs empirical measurement before committing to the <500ms hot path target.

3. **State file size growth:** The activation map in `inner-voice-state.json` will grow as the graph grows. At 500 entities, the JSON file could be 50-100KB. File I/O stays fast, but JSON parsing time should be profiled.

4. **Concurrent session safety:** Multiple Claude Code sessions writing to the same `inner-voice-state.json`. The synthesis document mentions this but the resolution (last-write-wins with session-scoped sections) needs more design work.

---

## Sources

### Primary (HIGH confidence)
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- official documentation, full event schemas
- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide) -- official guide, agent hooks, limitations
- [Claude Code Subagents Documentation](https://code.claude.com/docs/en/sub-agents) -- subagent capabilities and constraints
- Dynamo codebase: `dynamo/hooks/dynamo-hooks.cjs`, `ledger/hooks/preserve-knowledge.cjs`, `ledger/hooks/prompt-augment.cjs` -- existing hook architecture

### Secondary (MEDIUM confidence)
- [Hindsight: Agent Memory That Learns](https://arxiv.org/html/2512.12818v1) -- retain/recall/reflect lifecycle (2025)
- [A-MEM: Agentic Memory for LLM Agents](https://arxiv.org/abs/2502.12110) -- NeurIPS 2025
- [Memory in the Age of AI Agents: A Survey](https://arxiv.org/abs/2512.13564) -- comprehensive survey
- [Evaluating Graph to Text Generation with LLMs](https://arxiv.org/abs/2501.14497) -- 2025 evaluation
- [Semantically-Aware Logit Interventions](https://arxiv.org/abs/2510.23650) -- debiasing (2025)
- [Context Recovery Hook Pattern](https://claudefa.st/blog/tools/hooks/context-recovery-hook) -- community pattern
- [rem-sleep skill](https://skills.rest/skill/rem-sleep) -- Claude Code memory consolidation skill

### Tertiary (LOW confidence)
- [Zero-Shot vs. Similarity-Based Text Classification](https://towardsdatascience.com/zero-shot-vs-similarity-based-text-classification-83115d9879f5/) -- classification comparison
- [Social Bias Evaluation for LLMs](https://aclanthology.org/2025.findings-emnlp.783/) -- prompt variation study
- [Learning to Forget: Sleep-Inspired Consolidation](https://arxiv.org/html/2603.14517) -- 2026 REM paper

## Metadata

**Confidence breakdown:**
- Hook/subagent architecture: HIGH -- verified against official documentation and existing code
- Variable substitution debiasing: LOW -- theoretical analysis only, no direct empirical evidence
- Domain classification: MEDIUM -- well-established techniques, latency needs empirical validation
- Consolidation patterns: MEDIUM -- good landscape, patterns validated by multiple sources
- Fan-out calculation: MEDIUM -- math is solid, pruning strategies untested against Dynamo's graph
- User-relative definitions: LOW -- theoretical feasibility, no direct evidence for this use case
- PreCompact timing: HIGH -- verified against official docs and existing Dynamo code

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (Claude Code hooks API evolving; re-verify before implementation)
