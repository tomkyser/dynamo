# Inner Voice Synthesis v2: Steel-Man Analysis and Implementation Planning

**Date:** 2026-03-18 (Corrected 2026-03-19: Concept 7 re-evaluated from NO-GO to CONDITIONAL GO based on corrected research)
**Status:** Post-research adversarial analysis (revised)
**Lineage:** INNER-VOICE-SYNTHESIS-v2.md -> 260318-x21-RESEARCH.md -> this document -> 260319-17p-RESEARCH.md (corrections)
**Confidence:** MEDIUM-HIGH (7 concepts analyzed against empirical research and mechanistic constraints; 5 verdicts at HIGH confidence, 2 at MEDIUM. Concept 7 verdict corrected from NO-GO to CONDITIONAL GO after re-research of hook and subagent capabilities.)

**Purpose:** Subject the seven theoretical concepts from the collaborative design session (Synthesis v2) to empirical rigor using research findings, kill what does not survive, and produce actionable integration plans for what does survive. This document is the authoritative reference for which Synthesis v2 ideas enter the implementation roadmap and how.

**Reading context:** This document is self-contained. Each verdict includes sufficient context for a reader to understand the reasoning without reading all source documents. References to source documents use section numbers for traceability.

---

## TRACK A: STEEL-MAN ANALYSIS

### Methodology

Each of the seven Synthesis v2 concepts receives identical adversarial treatment:

1. **Steel-man case:** The strongest possible argument FOR the concept, drawn from the Synthesis v2 document's own reasoning, the cognitive science literature, and architectural logic. This is the concept's best day in court -- genuine charity, not straw-man setup.

2. **Stress-test:** Adversarial pressure applied from four sources:
   - Research findings from 260318-x21-RESEARCH.md (empirical evidence)
   - Mechanistic constraints from Synthesis v2 Section 1 (no cognition, only interpolation; no extrapolation; no grounding)
   - Practical constraints (Dynamo's zero-dependency CJS architecture, hook timing budgets, cost projections from INNER-VOICE-SPEC.md Section 4.9)
   - Compatibility with the existing INNER-VOICE-SPEC.md mechanical design (Section 4)
   - Cross-reference with LEDGER-CORTEX-ANALYSIS.md component verdicts

3. **Verdict:** GO / CONDITIONAL GO / DEFER / NO-GO with confidence level (HIGH / MEDIUM / LOW).

4. **Integration recommendation:** Specific section references and requirement IDs for surviving concepts; replacement approaches for killed concepts.

---

### Concept 1: Frame-First Pipeline

**Source:** Synthesis v2 Section 4 (Sections 4.1-4.5)

#### Steel-Man Case

The frame-first pipeline addresses the most fundamental limitation of the entity-first pipeline defined in INNER-VOICE-SPEC.md Section 4.3: it treats conversation as an objective artifact. The current pipeline begins with "extract entities from prompt" -- this makes the entities themselves the origin point for all downstream processing. The problem is that relevance is not an objective property of entities. It is a subjective property of the user's relationship to those entities.

The frame-first pipeline inverts the processing order. Before extracting entities, it asks: "Which cognitive frames does this trigger activate?" This is a domain classification step that determines what lens the Inner Voice applies. When a user mentions "negative feedback loop" in a conversation about team dynamics, the entity-first pipeline activates the graph node for "negative feedback loop" and propagates from there. The frame-first pipeline first classifies the domain (social/interpersonal), then constructs a user-relative understanding of what "feedback loop" means in that context (recurring interpersonal escalation patterns), and only then queries the graph from that reframed origin.

The value proposition is structural diversity. The entity-first pipeline produces variations on the same retrieval. The frame-first pipeline produces multiple parallel retrievals from genuinely different perspectives -- CS, social, engineering -- that converge on the same moment from different angles. Where perspectives converge through different paths, that is a high-activation signal that the entity-first pipeline would miss.

This is mechanistically honest per Synthesis v2 Section 1: it asks the LLM to interpolate from multiple different starting positions on the manifold, producing different interpolation paths rather than expecting extrapolation. The synthesis step receives structurally diverse inputs rather than variations on the same retrieval.

#### Stress-Test

1. **Domain classification at hook speed.** The frame-first pipeline requires classifying each prompt into cognitive frames before anything else. Research (260318-x21-RESEARCH.md Section 3) validates that <100ms classification is achievable: keyword/regex matching at <1ms with 60-70% accuracy, or embedding cosine similarity at 5-20ms with 80-85% accuracy. The concern is not feasibility but quality -- a misclassification at the first step corrupts everything downstream. The pipeline is only as good as its frame selection.

2. **Diminishing returns on sparse graphs.** The frame-first pipeline's value comes from producing structurally diverse queries. With a sparse graph (early v1.3 usage, ~100-200 entities), multiple frames often retrieve the same small set of entities from different angles. The diversity benefit depends on graph density. Research (260318-x21-RESEARCH.md Section 6) confirms this: user-relative definitions on sparse graphs are "shallow but accurate" and "may not justify their LLM cost."

3. **Compatibility with existing spec.** The Synthesis v2 document (Section 4.2) correctly notes the frame-first pipeline "wraps around or replaces portions of the entity-first pipeline." The spec's activation map, threshold mechanism, and injection formatting (INNER-VOICE-SPEC.md Sections 4.4-4.6) remain valid as downstream components. The change is upstream: what initiates the activation cascade. This is additive, not conflicting.

4. **Multi-frame fan-out cost.** If every prompt generates queries across 3 domain frames, that is 3x the graph traversal and potentially 3x the LLM calls on the deliberation path. However, the dual-path architecture (CORTEX-02) constrains this: the hot path uses deterministic scoring across ALL frames without LLM calls. Only the deliberation path invokes LLM evaluation, and that path fires on <5% of prompts.

5. **Mechanistic constraint check.** The frame-first pipeline does not assume cognition (Section 1.1). Domain classification is pattern matching. User-relative definition construction is interpolation from graph data. Fan-out is parallel retrieval. None require the model to extrapolate beyond its training distribution.

#### Verdict: CONDITIONAL GO

**Confidence: HIGH**

The pipeline order change from entity-first to frame-first is architecturally sound. Domain classification at the top of the pipeline provides a principled origin for all downstream processing. However, implementation must be staged:

- **v1.3:** Domain classification via keyword/regex heuristic (sufficient accuracy, zero latency cost). Single dominant frame per prompt, not multi-frame fan-out. The frame informs query formulation but the activation cascade still starts from entity mentions. This is "frame-informed entity-first," not full frame-first.
- **v1.4:** Upgrade to embedding-based classification. Enable multi-frame fan-out. Full frame-first pipeline with user-relative definition construction.

#### Integration Recommendation

**INNER-VOICE-SPEC.md modifications required:**
- Section 4.3, UserPromptSubmit pipeline: Insert domain classification as step 2.5 (between EMBED and DETECT semantic shift). The classification result parameterizes the activation propagation in step 4.
- Section 4.5, Spreading Activation: Add frame-weighted propagation -- edges matching the classified domain frame receive a weight bonus (1.2-1.5x).

**MASTER-ROADMAP requirement IDs affected:**
- CORTEX-01: Add "basic domain classification (keyword heuristic)" to v1.3 scope
- CORTEX-04: Add "embedding-based domain classification and multi-frame fan-out" to v1.4 scope

**v1.3/v1.4 boundary:** v1.3 gets single-frame keyword classification. v1.4 gets multi-frame embedding classification with full frame-first pipeline.

---

### Concept 2: User-Relative Definition Construction

**Source:** Synthesis v2 Section 4.3

#### Steel-Man Case

User-relative definition construction is the most conceptually compelling idea in the Synthesis v2 document. It addresses a real problem: when the Inner Voice encounters a concept like "authentication," the LLM's default behavior is to anchor on the canonical definition -- the highest-probability region of the manifold for that term. But what "authentication" means for THIS user is not the canonical definition. It is "JWT-based, using express-jwt, decided during architecture planning 2 weeks ago, last touched with some frustration."

The technique works in reverse from conventional NLP: instead of starting from the canonical definition and searching for user-relevant connections, it examines how the concept's structural components exist in the user's actual graph history, weights those components by prominence, and constructs a working definition of what the concept means for this user at this moment. This user-relative definition then becomes the origin point for all downstream processing.

The compounding effect (Synthesis v2 Section 5.3) is where this becomes truly valuable. The first time the Inner Voice constructs a definition for a concept, it works from sparse data. The fifth time, it has its own prior definitions, the user's reactions to sublimations based on those definitions, and new experiential data. The definition matures iteratively, creating an increasingly accurate model of the user's conceptual landscape.

This exploits the LLM legitimately per Section 1's mechanistic constraints: it is asking for interpolation from user-specific data points rather than extrapolation beyond the training distribution.

#### Stress-Test

1. **Sparse graph problem.** Research (260318-x21-RESEARCH.md Section 6) is direct: "Sparse (1-3 relationships): Definitions will be shallow but accurate. 'Authentication: you chose JWT.'" At v1.3 graph densities (~100-200 entities), most concepts will have 1-3 relationships. A "user-relative definition" that says "you chose JWT" provides no value over simply including "JWT" in the search context. The overhead of an LLM call to generate this definition is not justified.

2. **Very sparse is worse than nothing.** With 0-1 relationships, the research finding is stark: "Definitions become trivially generic. Not worth the LLM call." This will be the common case for many concepts in early graph usage.

3. **The definition is a proxy for direct graph context.** The research recommends: "Use the relationship data directly in injection formatting rather than generating separate 'definitions.' The curation prompt can integrate graph context without an explicit definition construction step." This is a simpler approach that achieves the same goal -- user-relevant context in injections -- without the overhead of generating and storing definitions.

4. **Storage and maintenance overhead.** User-relative definitions, if stored in IV memory (Synthesis v2 Section 5.2), create a growing corpus that must be maintained, versioned, and refreshed through REM consolidation. This is significant infrastructure for a feature that provides marginal value on sparse graphs.

5. **Cross-reference with LEDGER-CORTEX-ANALYSIS.md.** The analysis document's verdict on the Inner Voice (Section 1) emphasizes v1.3 as "smart curation" not "cognitive consciousness." User-relative definition construction is a v1.4+ capability that requires graph density the system will not have in v1.3.

#### Verdict: DEFER

**Confidence: HIGH**

The concept is sound in principle but requires graph density that will not exist in v1.3. Explicit definition construction should be deferred to v1.4 when:
1. The graph has >200 entities and >500 relationships (sufficient density for meaningful definitions)
2. The consolidation system (CORTEX-05) has produced higher-order observations as raw material
3. Entity summaries exist from REM consolidation

For v1.3, the same goal -- user-relevant context in injections -- is achieved by integrating graph relationship data directly into the curation prompt without an intermediate definition construction step.

#### Integration Recommendation

**Milestone:** v1.4 (after CORTEX-04 and CORTEX-05 establish the foundation)

**Conditions for promotion:**
- Graph density threshold reached (>200 entities, >500 relationships)
- Observation synthesis operational (CORTEX-05)
- A/B testing shows definition-based injections outperform direct graph context injection

**v1.3 replacement:** Integrate graph relationship data directly into injection formatting (INNER-VOICE-SPEC.md Section 4.6). The curation prompt already has access to entity relationships from the activation cascade -- use them in the injection text without generating a separate definition.

**CORTEX-04 (v1.4) addition:** Add "user-relative definition construction and compounding" to the advanced Inner Voice scope.

---

### Concept 3: Variable Substitution as Debiasing

**Source:** Synthesis v2 Section 4.4

#### Steel-Man Case

Variable substitution addresses a real and measurable phenomenon: LLMs anchor on canonical definitions. When processing a well-known concept like "Dual-Process Theory," the model's attention activates the highest-probability manifold region for that phrase -- Kahneman, System 1/System 2, fast/slow thinking. This canonical anchoring can override user-specific context, making injections generic rather than personalized.

The proposed mechanism is elegant: after constructing a user-relative definition, replace the canonical phrase with a neutral variable (PATTERN_alpha). Clear residual canonical framing from the context. All downstream processing operates on the user-relative definition only. The LLM never encounters the token sequence that would pull attention toward the canonical manifold region. After synthesis, back-substitute the original phrase for natural language.

The audit value is a genuine secondary benefit. The divergence between canonical meaning and user-relative definition becomes a first-class data artifact that maps the user's subjective perceptual filter over time.

The strongest argument: this technique is mechanistically grounded. Per Synthesis v2 Section 1.2, the model traverses the manifold -- it does not leave it. Variable substitution attempts to steer which region of the manifold the model traverses by removing the gravitational pull of the canonical region.

#### Stress-Test

1. **Research finding is definitive.** Research (260318-x21-RESEARCH.md Section 2) delivers the critical finding: "Variable substitution likely produces cosmetic debiasing (suppresses label output) without genuine semantic debiasing (still activates the same associations)."

2. **The mechanism is wrong.** The Synthesis v2 document (Section 4.4) claims: "Instead of prompt engineering against this gravitational pull, you remove the mass that creates it." But the research explains why this is incorrect: "Transformer attention is content-based. Attention operates on token embeddings. The phrase 'fast automatic intuitive associative' activates the same neighborhood as 'System 1' because the model learned these co-occur. Variable substitution changes the label but not the semantic content."

3. **Contextual reconstruction defeats the technique.** Even if you replace "Dual-Process Theory" with "$THEORY_A" and describe it as "a framework with fast/automatic and slow/deliberate processing," any model trained on Kahneman reconstructs the identity from the description. The semantic neighborhood is activated by the concept, not the label. This is not a theoretical concern -- it is how transformers fundamentally work.

4. **No evidence for "context clearing."** The Synthesis v2 document assumes a "context clearing" step (Section 4.4, step 3: "Clear any residual canonical framing from the context"). There is no mechanism in transformer architecture where removing a token clears prior associations. The model does not have a "forget the canonical source" capability. This step is a fiction.

5. **The validation concern in the Synthesis v2 document itself.** Section 4.4 flags this as an open question: "How do we verify the variable substitution is actually preventing canonical drift versus producing a user-relative veneer over canonical output?" The research answers this question: it is cosmetic.

6. **Mechanistic constraint violation.** The technique assumes you can control which manifold region the model traverses by modifying token sequences. But per Section 1.1, the model's "reasoning" is cosine similarity in embedding space. The embedding for a described concept activates the same neighborhoods as the label for that concept. Variable substitution does not change the embeddings of the descriptive text that replaces the variable -- those embeddings still point to the canonical region.

#### Verdict: NO-GO

**Confidence: HIGH**

Variable substitution is cosmetic debiasing -- it suppresses label output without achieving genuine semantic debiasing. The transformer attention mechanism activates semantic neighborhoods from content, not labels. Replacing "Dual-Process Theory" with "$THEORY_A" while describing its characteristics still activates the Kahneman region of embedding space. There is no "context clearing" mechanism in transformer architecture.

The implementation effort is not justified for a technique that produces cosmetic rather than substantive debiasing.

#### Integration Recommendation

**Replacement approach:** Adversarial counter-prompting. Instead of trying to suppress canonical associations (which does not work), leverage them explicitly while adding adversarial pressure:

```
Evaluate this concept's applicability to the user's context. Do NOT assume the
canonical definition applies. The user's specific relationship to this concept,
based on their graph data, is: [graph relationships]. Generate your analysis
from the USER's experience, not from the canonical definition.
```

This approach works WITH the model's attention mechanism rather than against it. It keeps the canonical knowledge accessible (which may be useful) while explicitly redirecting attention to user-specific data.

**Where in the spec:** This replaces the variable substitution steps in the frame-first pipeline (Synthesis v2 Section 4.1, steps 3 and 10). The pipeline becomes:

```
Trigger -> Domain classification -> Domain-specific recall queries
  -> (adversarial counter-prompting in query formulation)
  -> Fan-out -> Chain propagation -> Evaluation -> Synthesis -> Injection
```

**No CORTEX requirement affected.** Variable substitution was never assigned a requirement ID. Its removal simplifies the pipeline without affecting any MASTER-ROADMAP requirement.

---

### Concept 4: IV Memory / Metacognitive Layer

**Source:** Synthesis v2 Section 5 (Sections 5.1-5.3)

#### Steel-Man Case

The IV memory layer addresses a genuine architectural gap. The current INNER-VOICE-SPEC.md (Section 4.2) defines `inner-voice-state.json` as operational state -- it tracks current processing context (activation map, predictions, self-model). But it does not accumulate the Inner Voice's own processing products across sessions.

The distinction matters. Operational state answers "what is the Inner Voice thinking right now?" IV memory answers "what has the Inner Voice learned about its own processing over time?" The contents specified in Synthesis v2 Section 5.2 are concrete and valuable:

- **User-relative definitions** (if the concept survives) -- refined over time through REM cycles
- **Divergence patterns** -- how the user's attention systematically differs from canonical
- **Chain evaluation history** -- which association chains were evaluated, passed, or rejected and why (prevents redundant processing)
- **Sublimation outcomes** -- which injections the user engaged with versus ignored (direct behavioral feedback)
- **Domain frame productivity** -- which frames have been most useful in which contexts
- **Cascading association tags** -- partial chains carrying forward across trigger cycles

The compounding effect (Section 5.3) is the key argument: without IV memory, the Inner Voice is stateless between trigger cycles. With it, the Inner Voice accumulates processing state that creates the functional equivalent of background cognition -- not through continuous processing, but through accumulated state.

This is the architectural foundation for metacognitive self-correction. The self-model drift risk identified in INNER-VOICE-SPEC.md Section 5.2 (the "confidently wrong" failure mode, rated CRITICAL) can only be mitigated through metacognitive monitoring. IV memory provides the historical data needed for that monitoring: "I injected X, the user ignored it; I injected Y, the user engaged. My model of what the user cares about needs updating."

#### Stress-Test

1. **Storage growth.** At 100 entities, IV memory is negligible. At 500 entities with 50 sessions of processing history, the metacognitive store grows substantially. If every session produces 10-20 chain evaluations, 3-5 sublimation outcomes, and 1-2 domain frame observations, that is 70-135 records per session. After 50 sessions: 3,500-6,750 records. This is manageable in JSON format (<500KB) but requires indexing strategy for efficient retrieval.

2. **Relationship to existing state schema.** The current `inner-voice-state.json` (INNER-VOICE-SPEC.md Section 4.2) already contains self-model, relationship model, activation map, pending associations, and injection history. IV memory EXTENDS this with longer-lived, cross-session data. The two are complementary, not conflicting: operational state is hot and session-scoped; IV memory is consolidated and persistent.

3. **No direct research finding.** The research document (260318-x21-RESEARCH.md) does not address IV memory specifically. The assessment must be based on architectural analysis rather than empirical evidence. This is appropriate -- IV memory is an internal data structure, not a technique that requires external validation.

4. **Dependency on REM consolidation.** Synthesis v2 Section 6.4 specifies that "nothing enters long-term IV memory without passing through REM consolidation." If REM consolidation is deferred or fails, IV memory remains empty. The gate mechanism is a strength (quality control) but also a single point of failure for the compounding effect.

5. **Cross-reference with LEDGER-CORTEX-ANALYSIS.md.** The analysis document's verdict on Inner Voice persistence (CORTEX-06) is GO for basic JSON cache in v1.3 and advanced graph-backed persistence in v1.4. IV memory aligns with the v1.4 advanced persistence scope.

#### Verdict: CONDITIONAL GO

**Confidence: MEDIUM**

IV memory is architecturally sound and addresses the metacognitive gap in the current spec. However, it is a v1.4 feature that depends on REM consolidation being operational. In v1.3, the existing `inner-voice-state.json` schema (INNER-VOICE-SPEC.md Section 4.2) is sufficient. The v1.3 state already contains injection history and self-model -- these provide basic metacognitive data.

**Note on subagent persistent memory (added 2026-03-19):** The custom subagent `memory: user` feature (260319-17p-RESEARCH.md, Q3) provides a native persistent memory directory at `~/.claude/agent-memory/inner-voice/` with a curated `MEMORY.md` file. This could supplement or partially replace the custom IV memory JSON schema for cross-session state that the subagent manages directly. The verdict (CONDITIONAL GO for v1.4) is unchanged, but the implementation gains an additional option: subagent-native memory for subagent-managed state, custom JSON schema for hook-managed state, with both persisting across sessions.

**Conditions for GO:**
1. REM consolidation (Concept 5) must be operational as the gate mechanism
2. Storage growth must be bounded (retention policy with decay/pruning)
3. The schema must be concrete (JSON, not graph-backed, for v1.4 initial implementation)

#### Integration Recommendation

**INNER-VOICE-SPEC.md modifications required:**
- Section 4.2, State Management: Add IV memory as a second-tier persistence layer alongside operational state. Define the boundary: operational state is per-session, IV memory is cross-session consolidated.
- New section (4.2b or equivalent): IV Memory Schema (see Track B Section 2 for concrete definition).

**MASTER-ROADMAP requirement IDs affected:**
- CORTEX-06 (Inner Voice persistence, advanced, v1.4): Add "IV memory metacognitive layer with concrete schema and retention policy"
- CORTEX-04 (Inner Voice advanced, v1.4): Add "metacognitive self-correction using IV memory sublimation outcome data"

**v1.3/v1.4 boundary:**
- v1.3: Operational state only (`inner-voice-state.json` per INNER-VOICE-SPEC.md Section 4.2). Injection history provides basic sublimation outcome tracking within the session. The subagent's native persistent memory (`memory: user`) is available but not formally part of the IV memory schema.
- v1.4: Full IV memory layer with cross-session accumulation, REM-gated writes, and retention policies. Evaluate whether subagent-native memory can replace portions of the custom JSON schema.

---

### Concept 5: REM Consolidation Model

**Source:** Synthesis v2 Section 6 (Sections 6.1-6.4)

#### Steel-Man Case

The REM consolidation model is the most well-validated concept in the Synthesis v2 document. It maps cleanly to existing research and provides a principled answer to the question: "When and how does the Inner Voice turn session-scoped working memory into persistent knowledge?"

The three-tier structure (Synthesis v2 Section 6.2) maps to real Claude Code hook events with distinct operational characteristics:

- **Tier 1 (Triage) on compaction:** The session context is about to be wiped. This is an emergency -- preserve IV working memory before the forced forgetting event. Fast, cheap, mostly filesystem writes. The Inner Voice survives compaction with its models intact and can re-establish the subjective attention frame in the post-compaction session.

- **Tier 2 (Provisional REM) on idle timeout:** The user walked away. The session is probably over. Full consolidation processing, flagged as tentative. If the user returns, provisional results are available but subject to revision.

- **Tier 3 (Full REM) on explicit session end:** Clean termination. Deep editorial pass with no time pressure. The full session arc is available for retroactive evaluation -- something irrelevant at minute five might be the most important association once you see where the conversation ended at minute forty.

The operations specified in Section 6.3 are concrete and valuable: retroactive evaluation (re-scoring chains against the completed session arc), definition refinement (evaluating user-relative definitions against outcomes), observation synthesis (the batch job recommended in LEDGER-CORTEX-ANALYSIS.md Section 4), and cascade promotion (promoting or pruning partial chains tagged during the session).

The working memory to long-term memory gate (Section 6.4) is sound design: nothing enters persistent IV memory without editorial processing. This prevents raw, unvetted session artifacts from polluting the consolidated knowledge base.

Research validation is strong. The 260318-x21-RESEARCH.md Section 4 confirms: "Stop hook synthesis: GO. Well-established pattern (Hindsight reflect, rem-sleep skill, multiple academic papers)." The literature includes "Language Models Need Sleep" (2025), "Learning to Forget" (2026), and the A-MEM agentic memory system (NeurIPS 2025). The rem-sleep Claude Code skill implements a working version of the pattern.

The existing Dynamo Stop hook already does basic session summarization. REM consolidation extends this with model updates and observation synthesis -- it is an evolution, not a revolution.

#### Stress-Test

1. **Tier mapping to hook events.** Research (260318-x21-RESEARCH.md Section 7) validates PreCompact as a viable processing opportunity: 5-second practical budget is ample for state preservation and compact summary injection. The existing Dynamo handler (`preserve-knowledge.cjs`) proves the pattern works. The Stop hook has no latency constraint. Both tiers are feasible.

2. **Tier 2 (idle timeout) ambiguity.** The Synthesis v2 document distinguishes idle timeout from explicit end. In practice, Claude Code's Stop hook fires for both scenarios. The distinction between "provisional" and "full" REM may be artificial -- the Stop hook does not reliably indicate whether the user walked away versus explicitly ended. The practical implementation may need to treat all Stop events as full REM (Tier 3) and accept the cost.

3. **Cost per session.** Tier 3 (full REM) involves a Sonnet-class LLM call for synthesis. At ~10K input + 3K output tokens, this costs ~$0.27 per session (per INNER-VOICE-SPEC.md Section 4.9). For 5 sessions/day, that is $1.35/day just for REM. This is already accounted for in the cost projections as "Stop synthesis" but the synthesis document's REM operations (retroactive evaluation, definition refinement, cascade promotion) may require multiple LLM calls, increasing the per-session cost to $0.50-1.00.

4. **Cross-reference with LEDGER-CORTEX-ANALYSIS.md.** The analysis document's recommendations align: "Session boundaries are premium processing time" (INNER-VOICE-SPEC.md Section 3.5, Principle 7, derived from Default Mode Network theory). The Stop hook is already designated as the highest-value processing moment.

5. **Inter-session consolidation correctly deferred.** The Synthesis v2 document does not propose inter-session consolidation in its REM model -- the three tiers are all within-session or at-session-end. This is correct. Inter-session consolidation (periodic batch jobs merging observations, pruning redundancies, strengthening Hebbian connections) is a v1.4 capability per LEDGER-CORTEX-ANALYSIS.md Section 4.

#### Verdict: GO

**Confidence: HIGH**

The REM consolidation model is well-validated by research, maps cleanly to existing hook events, and extends the current Dynamo Stop hook processing with concrete value. The three-tier structure provides appropriate escalation based on processing opportunity.

Minor refinement needed: Tier 2 (provisional) and Tier 3 (full) may need to be merged in implementation because Claude Code's Stop hook does not reliably distinguish idle timeout from explicit end. Implement as a single Stop hook handler with a "session completeness" heuristic (session duration, number of turns, presence of explicit farewell patterns) that determines consolidation depth.

#### Integration Recommendation

**INNER-VOICE-SPEC.md modifications required:**
- Section 4.3, Stop hook pipeline: Expand steps 2-5 to include REM operations (retroactive evaluation, observation synthesis, cascade promotion). The current "SYNTHESIZE session observations" step becomes the entry point for the full REM pipeline.
- Section 4.3, PostToolUse pipeline: No change (remains fast and non-blocking).
- Add PreCompact pipeline (new): State preservation + compact summary injection. Reference the existing `preserve-knowledge.cjs` pattern.

**MASTER-ROADMAP requirement IDs affected:**
- CORTEX-01 (Inner Voice basic, v1.3): Add "basic REM consolidation at session end (Tier 1 state preservation in PreCompact, Tier 3 session synthesis in Stop hook)"
- CORTEX-04 (Inner Voice advanced, v1.4): Add "advanced REM operations (retroactive evaluation, definition refinement, cascade promotion)" and "inter-session consolidation batch jobs"
- CORTEX-05 (Enhanced Construction, v1.4): Add "observation synthesis triggered by REM consolidation"

**v1.3/v1.4 boundary:**
- v1.3: Tier 1 (PreCompact state preservation, no LLM call) + simplified Tier 3 (Stop hook synthesis -- session summary, self-model update, basic observation extraction). One Sonnet call per session end. **Note (added 2026-03-19):** REM Tier 3 can optionally use the custom `inner-voice` subagent (Concept 7 hybrid architecture) for deep synthesis instead of a direct API call. For subscription users, this has zero additional marginal cost. For API users, direct API calls remain the default.
- v1.4: Full REM operations (retroactive evaluation, definition refinement, cascade promotion, inter-session consolidation batch jobs). Multiple Sonnet calls per session end, offset by batch API pricing.

---

### Concept 6: Scalar Compute / Brute-Force Parallel Evaluation

**Source:** Synthesis v2 Section 4.6-4.7

#### Steel-Man Case

The scalar compute concept resolves a design question the INNER-VOICE-SPEC.md left partially open: whose cognitive patterns does the Inner Voice model? The Synthesis v2 document explored five candidates (average human, gifted human, child, specific user, purpose-built) and found each failed for mechanistic reasons.

The resolution is architecturally clean: the Inner Voice does not model any human cognitive archetype. It exploits what LLMs have that biology does not -- unbounded parallel evaluation. A human subconscious has serial bottlenecks on conscious access (~7 plus-or-minus 2 working memory chunks, fatigue decay, emotional interference). Sublimation exists in human cognition because the bandwidth into awareness cannot carry everything. The Inner Voice has no such bottleneck. It runs association chains across multiple domain frames simultaneously, evaluates all chains against relevance criteria, ranks them, and surfaces only what crosses threshold.

The fan-out calculation (260318-x21-RESEARCH.md Section 5) validates feasibility: for a graph with 500 entities and 1,500 relationships, the raw chain count is ~960, prunable to ~32 LLM evaluations with proper threshold/frame/dimension pruning, further batchable to 4-6 LLM calls. On the hot path: 0 LLM calls (all deterministic scoring). On the deliberation path: 4-6 batched calls.

The Core 2 Duo to Nehalem analogy (Synthesis v2 Section 4.7) is honest about the ceiling: brute-force parallelization is the Core 2 Duo move -- faster execution of the same lateral-only heuristics. The architecture should absorb improved model capabilities when they arrive, while building on what is achievable today.

The user's own weighted domain history emerges as the effective cognitive profile over time. The Inner Voice's association patterns are shaped by the actual topology of this user's conceptual relationships, not prescribed by archetype.

#### Stress-Test

1. **v1.3 is 1-hop only.** The INNER-VOICE-SPEC.md (Section 6.1) and MASTER-ROADMAP (CORTEX-01) specify v1.3 spreading activation as "basic, 1-hop, in-memory." At 1-hop, the fan-out is modest: 4 anchor entities * 6 neighbors = 24 entities * 4 dimensions = 96 evaluation chains (all deterministic on the hot path). The brute-force parallel evaluation is overkill for this scale.

2. **Graph density prerequisite.** The research confirms (260318-x21-RESEARCH.md Section 5): "v1.3 implementation MUST start with 1-hop only. 2-hop fan-out is a v1.4 capability that needs the graph density threshold (>100 entities, >200 relationships) before it adds value." At low density, there is not enough to parallelize.

3. **The cognitive profile resolution is already implicit.** The INNER-VOICE-SPEC.md never committed to a specific cognitive archetype. The spreading activation mechanism (Section 4.5) already produces user-specific patterns based on graph topology. The scalar compute concept makes this explicit and names it, but the mechanical outcome is the same: the user's graph shapes the Inner Voice's behavior.

4. **Cost on the deliberation path.** 4-6 batched LLM calls on the deliberation path is reasonable but adds $0.15-0.30 per deliberation event. At 15-20 deliberation events per day (per INNER-VOICE-SPEC.md Section 4.9), that is $2.25-6.00/day from fan-out alone. The existing cost projections (CORTEX-03) must account for this.

5. **Mechanistic honesty.** The concept correctly acknowledges (Synthesis v2 Section 4.7) that this is "faster execution of the same lateral-only heuristics" -- not vertical abstraction. The ceiling remains the ceiling. This is an honest assessment that does not overclaim.

#### Verdict: CONDITIONAL GO

**Confidence: HIGH**

The scalar compute concept is valid as an architectural principle but is premature for v1.3 implementation. It becomes relevant in v1.4 when 2-hop fan-out and multi-frame evaluation are enabled. The cognitive profile resolution (no archetype, user's graph topology emerges as the profile) is already the implicit approach in the existing spec and should be made explicit in documentation.

**Conditions:**
- v1.3: 1-hop only, single frame, deterministic scoring. The "scalar compute" framing adds no implementation value at this scale.
- v1.4: 2-hop fan-out enabled, multi-frame evaluation, batched LLM calls on deliberation path. This is where the concept delivers value.
- Graph density threshold: >100 entities and >200 relationships before enabling multi-dimensional fan-out.

#### Integration Recommendation

**INNER-VOICE-SPEC.md modifications required:**
- Section 4.5, Spreading Activation: Add a note that the activation propagation is the mechanism through which the user's conceptual topology becomes the effective cognitive profile. No archetype is prescribed.
- Section 4.5, Practical constraints: Add the graph density threshold (>100 entities, >200 relationships) as a prerequisite for enabling 2-hop propagation.

**MASTER-ROADMAP requirement IDs affected:**
- CORTEX-01 (v1.3): No change (already specifies 1-hop, in-memory)
- CORTEX-04 (v1.4): Add "multi-dimensional fan-out evaluation with batched LLM calls on deliberation path; 2-hop propagation enabled at graph density threshold"

**Cost model update:** The v1.4 cost projections (MASTER-ROADMAP Section v1.4, currently $3.50-5.00/day) should account for fan-out deliberation overhead ($2.25-6.00/day). This may push v1.4 projections to $4.00-7.00/day.

---

### Concept 7: Claude Code Native Subagent Implementation

**Source:** Synthesis v2 Section 2
**Corrected:** 2026-03-19 based on 260319-17p-RESEARCH.md (hook and subagent capabilities re-evaluated)

#### Steel-Man Case

The Synthesis v2 document proposes the Inner Voice should run as a Claude Code native subagent. Corrected research (260319-17p-RESEARCH.md) reveals the actual subagent capabilities are significantly more capable than the previous analysis assumed:

1. **Hooks CAN inject arbitrary content via `additionalContext`.** The `hookSpecificOutput.additionalContext` field in command hook responses injects content directly into Claude's conversational context. This works for `UserPromptSubmit`, `SessionStart`, and `SubagentStart` events. The previous analysis's claim that "the agent hook type cannot output injection text" was based on conflating `agent` hook type limitations with the general hook system's capabilities.

2. **Custom subagents can be defined in `.claude/agents/`** with full configuration: model selection (haiku/sonnet/opus), tool access (Read, Grep, Glob, Bash), disallowed tools (Write, Edit, Agent), filesystem access, isolated context windows, persistent memory (`memory: user` provides `~/.claude/agent-memory/inner-voice/`), MCP server access, background execution, and turn limits.

3. **SubagentStart hook can inject state directly into subagent context at spawn time.** When the main session spawns the `inner-voice` subagent, a SubagentStart command hook fires and can inject the current inner voice state, recent memory context, and processing instructions directly into the subagent's context via `additionalContext`.

4. **On Pro/Max subscription plans, subagent processing is included in the subscription** -- not per-token API billing. This is a material cost difference: the previous analysis's projected $1.97/day for v1.3 assumed direct API billing. For subscription users, the Inner Voice deliberation and REM consolidation paths via subagent cost $0 additional marginal cost (subject to rate limits).

5. **The subagent model aligns with dual-process architecture.** The main session IS System 2 (deliberate, tool-using, user-facing). The Inner Voice subagent IS System 1 (a spawned subagent with its own context, tools, and processing, producing insights that feed back into the main session).

6. **Eliminates ANTHROPIC_API_KEY dependency for subscription users.** No need for custom HTTP client code, error handling, retry logic, or API key management. The subagent is defined as a Markdown file with YAML frontmatter -- Claude Code manages all invocation mechanics.

#### Stress-Test

1. **Hot path (<500ms) CANNOT be served by subagents.** Custom subagents have 5,000-15,000 token context bootstrapping overhead, resulting in 2-8 second latency even with Haiku. Command hooks with deterministic CJS processing and `additionalContext` injection remain mandatory for the hot path. This is a real constraint confirmed by community reports (260319-17p-RESEARCH.md, Q2).

2. **SubagentStop CANNOT inject content directly back into parent context.** GitHub issue #5812 documents this gap: the `additionalParentContext` feature request was closed as NOT_PLANNED. Workaround: SubagentStop hook writes results to a state file, and the next UserPromptSubmit hook reads that file and injects via `additionalContext`. This is functional but indirect -- there is an inherent delay of one user turn between subagent completion and context injection.

3. **Subagents cannot spawn other subagents (no nested delegation).** From the docs: "Subagents cannot spawn other subagents." All Inner Voice processing must happen within a single subagent context. Complex multi-step analysis must be serialized within one subagent's turn budget.

4. **Rate limit interaction on subscription plans.** The Inner Voice subagent competes for the same rate limits as the main session. Heavy Inner Voice processing (deliberation + REM consolidation in the same session) could cause rate limit errors for the user's primary work. This requires graceful degradation: if rate-limited, fall back to hot-path-only processing.

5. **Background subagent + UserPromptSubmit race condition.** If the Inner Voice subagent runs in background and writes results to disk, the next UserPromptSubmit hook might fire before the subagent completes. The state file needs a "processing" flag and the hook must handle the incomplete-results case gracefully.

6. **For API plan users, subagent bootstrap overhead makes the hot path MORE expensive** than direct API calls due to the 5,000-15,000 token bootstrapping cost per spawn. Direct API calls remain more efficient for these users.

7. **The hybrid architecture adds complexity.** Two invocation paths (CJS command hooks for hot path + custom subagent definition for deliberation) versus a single path (CJS only). However, the complexity is bounded: the command hooks remain identical, and the subagent definition is a single Markdown file.

#### Verdict: CONDITIONAL GO

**Confidence: HIGH**

The hybrid architecture -- command hooks for hot path, custom subagents for deliberation -- is architecturally sound. This is NOT the subagent-only approach from Synthesis v2 Section 2, nor the CJS-with-direct-API-only approach from the previous analysis. It is a hybrid that leverages the strengths of both patterns.

**Conditions:**
- Hot path MUST remain as CJS command hooks with deterministic processing and `additionalContext` injection (latency demands it)
- Deliberation path and REM consolidation CAN use custom subagent with Sonnet model selection (latency tolerant)
- State file bridge pattern (SubagentStop writes, UserPromptSubmit reads) must be implemented for indirect context injection
- For API plan users, direct API calls remain the fallback (subagent bootstrap overhead not justified for hot path)
- Implementation must handle the SubagentStop-to-parent context gap gracefully
- Rate limit degradation strategy required (fall back to hot-path-only when rate-limited)

#### Integration Recommendation

**Hybrid Architecture: CJS Command Hooks + Custom Subagent.**

The Inner Voice invocation pattern is defined as:
1. **Hot path (v1.3):** CJS command hooks (`ledger/inner-voice.cjs`, `ledger/dual-path.cjs`, `ledger/activation.cjs`) with deterministic processing and `additionalContext` injection. Unchanged from existing spec.
2. **Deliberation path (v1.3):** EITHER direct HTTP API calls to Anthropic (API plan users) OR trigger custom `inner-voice` subagent via main session (subscription users). Configurable based on billing model.
3. **REM consolidation (v1.3):** Custom subagent with Sonnet model preferred for subscription users. Direct API call fallback for API plan users.
4. **Custom subagent definition:** `~/.claude/agents/inner-voice.md` with model: sonnet, tools: Read/Grep/Glob/Bash, disallowedTools: Write/Edit/Agent, permissionMode: dontAsk, maxTurns: 10, memory: user
5. **SubagentStart hook:** Injects current IV state into subagent context at spawn time
6. **SubagentStop hook:** Writes results to state file for next UserPromptSubmit pickup

**MASTER-ROADMAP changes:**
- CORTEX-01 (v1.3): Add "hybrid invocation pattern: CJS command hooks for hot path with `additionalContext` injection + custom subagent definition for deliberation path"
- CORTEX-07 (Agent coordination, v1.5): Remains valid but v1.3 can now use native subagents for non-latency-critical paths, reducing the scope of v1.5 agent coordination work

**INNER-VOICE-SPEC.md modifications required:**
- Section 4.3, UserPromptSubmit pipeline: Update deliberation path to show hybrid invocation (direct API or subagent)
- Section 4.7, Model selection: Add subagent model selection alongside direct API model selection
- Section 6.1, Module structure: Add `~/.claude/agents/inner-voice.md` custom subagent definition file

---

### Consolidated Verdict Table

| # | Concept | Verdict | Confidence | Timing | Key Condition / Replacement |
|---|---------|---------|------------|--------|---------------------------|
| 1 | Frame-First Pipeline | **CONDITIONAL GO** | HIGH | v1.3 (basic) / v1.4 (full) | v1.3: keyword classification, single frame. v1.4: embedding classification, multi-frame fan-out. |
| 2 | User-Relative Definition Construction | **DEFER** | HIGH | v1.4 | Requires graph density >200 entities, >500 relationships. v1.3 uses direct graph context. |
| 3 | Variable Substitution as Debiasing | **NO-GO** | HIGH | Never | Cosmetic debiasing only. Replaced by adversarial counter-prompting. |
| 4 | IV Memory / Metacognitive Layer | **CONDITIONAL GO** | MEDIUM | v1.4 | Requires REM consolidation operational. v1.3 uses existing state schema. Subagent native persistent memory (`memory: user`) could supplement custom IV memory JSON schema. |
| 5 | REM Consolidation Model | **GO** | HIGH | v1.3 (basic) / v1.4 (full) | Stop hook synthesis validated. PreCompact state preservation validated. REM Tier 3 can optionally use custom subagent for deep synthesis (subscription users). |
| 6 | Scalar Compute / Brute-Force Parallel | **CONDITIONAL GO** | HIGH | v1.4 | Premature for v1.3 (1-hop only). Enables value at 2-hop with graph density threshold. |
| 7 | Claude Code Native Subagent (Hybrid) | **CONDITIONAL GO** | HIGH | v1.3 (hybrid) | Hot path: CJS command hooks with `additionalContext` injection. Deliberation: custom subagent. Conditions: SubagentStop gap bridged via state file, rate limit degradation strategy. |

**Summary counts:** 1 GO, 4 CONDITIONAL GO, 1 DEFER, 1 NO-GO.

**Surviving concepts for v1.3:** Frame-first pipeline (basic keyword classification), REM consolidation (basic stop hook synthesis + PreCompact state preservation), Subagent hybrid architecture (CJS hooks for hot path + custom subagent for deliberation and REM).

**Surviving concepts for v1.4:** Frame-first pipeline (full), User-relative definitions, IV memory, REM consolidation (full), Scalar compute fan-out.

**Killed concepts:** Variable substitution debiasing.

**Note on Concept 7:** The verdict changed from NO-GO to CONDITIONAL GO (corrected 2026-03-19 per 260319-17p-RESEARCH.md). This is NOT the pure subagent approach from Synthesis v2 Section 2. It is a hybrid architecture that uses CJS command hooks for the latency-critical hot path and custom subagents for the latency-tolerant deliberation and REM consolidation paths.

---

## TRACK B: IMPLEMENTATION PLANNING AND ROADMAP IMPACT

### 1. Revised Processing Pipeline Per Hook Type

The following pipelines integrate surviving Synthesis v2 concepts into the INNER-VOICE-SPEC.md Section 4.3 pipelines. Steps marked with [NEW] are additions from this analysis. Steps marked with [MODIFIED] are changes to existing spec steps. Unmarked steps are unchanged from the spec.

#### UserPromptSubmit (most frequent, latency-critical)

```
1.  LOAD state from inner-voice-state.json                      [<5ms, file I/O]
2.  EMBED current prompt                                        [50-100ms, API or local]
3.  CLASSIFY domain frame (keyword/regex heuristic)             [<1ms, deterministic] [NEW - Concept 1]
4.  DETECT semantic shift                                       [<5ms, cosine distance]
    - Compare current embedding to predictions.expected_topic embedding
    - If shift_score > THRESHOLD: set needs_injection = true
5.  UPDATE activation map                                       [10-50ms, graph query] [MODIFIED - Concept 1]
    - Extract entities from prompt (deterministic NER or pattern match)
    - For each entity: activate in map, propagate to neighbors (1-hop)
    - Apply domain frame weight bonus (1.2-1.5x) to edges matching classified frame [NEW - Concept 1]
    - Decay all existing activations by time-based factor
    - Check for threshold crossings (new sublimation candidates)
6.  DECIDE injection strategy                                   [<5ms, deterministic]
    - If needs_injection OR threshold_crossings:
      - If high_confidence_entities AND cached_results: HOT PATH
      - If low_confidence OR complex_context: DELIBERATION PATH
      - If no_injection_needed: SKIP (return empty)
7.  EXECUTE injection                                           [varies by path]
    - HOT PATH [<500ms]: Retrieve cached/indexed results for activated entities,
      format using template with adversarial counter-prompting [MODIFIED - Concept 3 replacement],
      apply cognitive load limits
    - DELIBERATION PATH [1-3s]: Call Haiku/Sonnet via EITHER direct HTTP API (API plan users)
      OR trigger custom subagent (subscription users) [MODIFIED - Concept 7 hybrid]
      with context + activated entities + self-model + domain frame context [MODIFIED - Concept 1],
      use adversarial counter-prompting in generation prompt [MODIFIED - Concept 3 replacement],
      generate contextually shaped injection.
      Subagent results available on next UserPromptSubmit via state file bridge.
8.  UPDATE state                                                [<5ms]
    - Update activation_map, predictions, injection_history
    - Persist to inner-voice-state.json
9.  RETURN injection or empty                                   [total: 100ms-3s]
```

**Changes from spec:** Steps 3 (domain classification, Concept 1), 5 (frame weight bonus, Concept 1), 7 (adversarial counter-prompting replacing variable substitution, Concept 3 replacement; hybrid invocation -- direct API or custom subagent based on billing model, Concept 7 hybrid).

#### SessionStart (once per session, higher latency budget)

```
1.  LOAD state (may be from previous session)
2.  CLASSIFY domain frame from first prompt or session context  [NEW - Concept 1]
3.  ASSESS session context (user's first prompt or resumed session)
4.  GENERATE narrative briefing via DELIBERATION PATH
    - Load self-model, relationship model
    - Query top activated entities from previous session
    - Query entities relevant to detected intent, weighted by domain frame [MODIFIED - Concept 1]
    - Generate factual briefing via Sonnet: direct API call OR custom subagent [MODIFIED - Concept 7 hybrid]
      (v1.3: factual; v1.4: narrative with relational framing)
5.  UPDATE state for new session
6.  RETURN briefing [total: 2-4s, acceptable for session start]
```

**Changes from spec:** Steps 2 (domain classification, Concept 1), 4 (frame weighting and hybrid invocation -- direct API or custom subagent, Concepts 1 and 7 hybrid).

#### Stop (once per session, no latency constraint)

```
1.  LOAD state
2.  REM TIER 3: Full consolidation                              [NEW - Concept 5]
    a. SYNTHESIZE session observations (Sonnet via direct API OR custom subagent) [MODIFIED - Concept 7 hybrid]
       - What happened this session?
       - What did the user work on? How did they react?
       - What patterns observed?
    b. RETROACTIVE EVALUATION (v1.4)                            [NEW - Concept 5, deferred]
       - Re-score chains against completed session arc
    c. OBSERVATION SYNTHESIS (v1.4)                             [NEW - Concept 5, deferred]
       - Extract higher-order patterns from accumulated session data
    d. CASCADE PROMOTION (v1.4)                                 [NEW - Concept 5, deferred]
       - Promote or prune partial chains tagged during session
3.  UPDATE self-model and relationship model
4.  UPDATE affect markers on touched entities
5.  WRITE to IV memory (v1.4, through REM gate)                [NEW - Concept 4, deferred]
    - Sublimation outcomes
    - Domain frame productivity observations
    - Chain evaluation summaries
6.  PERSIST state (JSON cache + queue for Graphiti write)
7.  QUEUE consolidation if threshold reached (N sessions since last)
```

**Changes from spec:** Step 2 restructured as REM Tier 3 (Concept 5), with v1.4 sub-steps for advanced REM operations. Step 5 added for IV memory writes (Concept 4, v1.4).

#### PreCompact (emergency state preservation)

```
1.  LOAD state                                                  [<5ms]
2.  REM TIER 1: Triage state preservation                       [NEW - Concept 5]
    a. Persist current activation map to inner-voice-state.json [<5ms, file I/O]
    b. Persist self-model updates since last persist            [<5ms, file I/O]
    c. Persist pending associations and cascading tags          [<5ms, file I/O]
    d. Write domain frame state (current classification)        [<5ms, file I/O] [NEW - Concept 1]
3.  GENERATE compact summary for re-injection                   [1-2s, Haiku API call]
    - Include current attention state, top activated entities, active predictions
    - Format as concise re-priming text (max 200 tokens)
4.  OUTPUT re-injection text to stdout                          [<1ms]
    [total: ~2-3s, well within 5s practical budget]
```

**Changes from spec:** New pipeline (PreCompact was not fully specified in INNER-VOICE-SPEC.md). Implements REM Tier 1 (Concept 5) and domain frame preservation (Concept 1).

#### PostToolUse (brief, non-blocking) -- UNCHANGED

```
1.  LOAD state
2.  EXTRACT entities from tool output (deterministic NER/pattern match)
3.  UPDATE activation map (activate mentioned entities)
4.  QUEUE any new entities for later Graphiti ingestion
5.  PERSIST state [total: <200ms]
```

No changes from INNER-VOICE-SPEC.md Section 4.3.

---

### 2. IV Memory Schema

**Status:** CONDITIONAL GO for v1.4 (Concept 4 verdict). Defining the schema now for implementation readiness.

#### Concrete JSON Schema

```javascript
{
  "version": 1,
  "created": "2026-04-15T10:00:00Z",
  "last_consolidated": "2026-04-15T18:00:00Z",

  // Sublimation outcomes -- direct behavioral feedback
  "sublimation_outcomes": [
    {
      "id": "sub_001",
      "session_id": "session_abc",
      "timestamp": "2026-04-15T14:30:00Z",
      "injection_content_hash": "sha256_abc",
      "entities_referenced": ["uuid_1", "uuid_2"],
      "domain_frame": "cs",
      "tokens_used": 85,
      "user_engaged": true,          // inferred from subsequent user behavior
      "engagement_signal": "referenced_in_next_prompt",
      "confidence_in_signal": 0.7,
      "consolidated_from_session": true
    }
  ],

  // Domain frame productivity -- which frames work in which contexts
  "frame_productivity": [
    {
      "frame": "cs",
      "context_type": "debugging",
      "total_injections": 45,
      "engaged_injections": 32,
      "engagement_rate": 0.71,
      "last_updated": "2026-04-15T18:00:00Z"
    }
  ],

  // Chain evaluation history -- prevents redundant processing
  "chain_evaluations": [
    {
      "id": "chain_001",
      "session_id": "session_abc",
      "anchor_entities": ["uuid_1"],
      "terminal_entities": ["uuid_5", "uuid_8"],
      "hops": 2,
      "dimension": "temporal_neighborhood",
      "score": 0.45,
      "threshold_at_evaluation": 0.6,
      "outcome": "below_threshold",
      "timestamp": "2026-04-15T14:25:00Z"
    }
  ],

  // Cascading association tags -- partial chains carrying forward
  "cascading_tags": [
    {
      "entity": "uuid_3",
      "activation_at_tag": 0.55,
      "threshold_at_tag": 0.6,
      "trigger_context": "mentioned deployment pipeline",
      "tagged_session": "session_abc",
      "tagged_at": "2026-04-15T14:20:00Z",
      "promotion_count": 0,
      "last_evaluated": "2026-04-15T18:00:00Z"
    }
  ],

  // User-relative definitions (v1.4, after Concept 2 promotion)
  "user_definitions": [],

  // Divergence patterns (v1.4, after Concept 2 promotion)
  "divergence_patterns": [],

  // Relationship model evolution (consolidated from operational state)
  "relationship_snapshots": [
    {
      "snapshot_date": "2026-04-15T18:00:00Z",
      "session_count_at_snapshot": 50,
      "communication_preferences": ["direct", "no_emojis", "show_reasoning"],
      "working_patterns": ["deep_focus", "architectural_before_coding"],
      "current_projects": [{"name": "Dynamo", "focus": "v1.3 Inner Voice"}],
      "affect_baseline": "engaged"
    }
  ]
}
```

#### Storage Location

```
~/.claude/dynamo/ledger/
  inner-voice-state.json          <- Operational state (existing, per INNER-VOICE-SPEC.md Section 4.2)
  inner-voice-memory.json         <- IV memory (new, v1.4)
  inner-voice-memory-archive/     <- Rotated snapshots (v1.4)
    2026-04-01.json
    2026-04-15.json
```

#### Indexing Strategy

For v1.4 (JSON-based, not graph-backed):
- **Sublimation outcomes:** Indexed by `session_id` and `entities_referenced` for fast lookup
- **Frame productivity:** Indexed by `frame` + `context_type` pair (small table, O(n) scan is acceptable)
- **Chain evaluations:** Indexed by `anchor_entities` for deduplication checks
- **Cascading tags:** Sorted by `activation_at_tag` descending for threshold proximity search

At v1.4 graph densities, the IV memory JSON file is expected to be <500KB. JSON parsing is acceptable at this size (<10ms).

For v1.5+ (if graph-backed persistence per CORTEX-06):
- Migrate to Graphiti nodes with temporal versioning
- Each IV memory record becomes a node with bi-temporal edges
- Enables temporal queries ("what did the IV know about my authentication patterns last month?")

#### Storage Growth Projections

| Entities | Sessions | Sublimation Records | Chain Evaluations | Estimated File Size |
|----------|----------|--------------------|--------------------|---------------------|
| 100 | 25 | ~125 | ~500 | ~80KB |
| 500 | 100 | ~500 | ~2,000 | ~300KB |
| 1,000 | 200 | ~1,000 | ~4,000 | ~600KB |

**Retention policy (required):**
- Sublimation outcomes: Retain last 500 records. Older records are aggregated into frame_productivity statistics.
- Chain evaluations: Retain last 2,000 records. Older records pruned (they served their deduplication purpose).
- Cascading tags: Auto-expire after 30 days of inactivity. Promoted or pruned during REM consolidation.
- Relationship snapshots: One per month maximum. Older snapshots archived.

#### Relationship to Existing inner-voice-state.json

| Aspect | inner-voice-state.json (Section 4.2) | inner-voice-memory.json (new) |
|--------|--------------------------------------|-------------------------------|
| Scope | Session-scoped operational state | Cross-session consolidated knowledge |
| Lifecycle | Reset/refreshed each session | Persists and grows across sessions |
| Write frequency | Every hook invocation (~5-30 per session) | Only through REM consolidation gate |
| Contents | Activation map, predictions, injection history, self-model (current) | Outcomes, evaluations, tags, definitions, patterns |
| Size | ~10-50KB | ~80-600KB (bounded by retention) |

The two files are complementary. Operational state feeds REM consolidation, which writes to IV memory. IV memory feeds operational state at session start (preloading frame productivity, cascading tags, relationship snapshots).

#### v1.3 vs v1.4 Boundary

- **v1.3:** No IV memory file. The existing `inner-voice-state.json` provides basic injection history and self-model persistence within and across sessions. This is sufficient for the v1.3 "smart curation" scope.
- **v1.4:** Full IV memory schema as defined above. REM consolidation writes to it. Session start reads from it. Retention policies enforced.

---

### 3. REM Consolidation Mapping to Hook Events

#### Tier-to-Hook Mapping

| Tier | Hook Event | Trigger | Latency Budget | Data Available |
|------|-----------|---------|----------------|----------------|
| Tier 1: Triage | PreCompact | Context window ~95% full, about to compact | <5s practical | `transcript_path` (full conversation), `session_id`, current IV state file, all entities processed so far |
| Tier 2: Provisional REM | Stop (idle timeout) | User inactive for session timeout period | No constraint | Full session transcript, all IV state, all entities, complete session arc |
| Tier 3: Full REM | Stop (explicit end or idle) | Session ends (any cause) | No constraint | Same as Tier 2 |

**Implementation note on Tier 2 vs Tier 3:** Claude Code's Stop hook does not reliably distinguish idle timeout from explicit session end. The recommended implementation treats ALL Stop events as Tier 3 (full consolidation). A "session completeness" heuristic (session duration, turn count, explicit farewell detection) can modulate consolidation depth without requiring separate hook handling.

#### Operations Per Tier

**Tier 1: Triage (PreCompact)**

| Operation | Description | LLM Required? | Cost |
|-----------|-------------|---------------|------|
| State persistence | Write activation map, self-model, pending associations to JSON | No | ~$0 (file I/O) |
| Domain frame preservation | Save current frame classification and frame-specific context | No | ~$0 (file I/O) |
| Compact summary generation | Generate concise re-priming text for post-compaction injection | Yes (Haiku) | ~$0.005 per event |
| Cascading tag snapshot | Preserve all partially-activated chains with current scores | No | ~$0 (file I/O) |

**Total cost per Tier 1 event:** ~$0.005
**Frequency:** ~1-3 times per long session. ~0-1 times per average session.
**What enters IV memory:** Nothing (Tier 1 preserves operational state only; IV memory writes require Tier 3 REM gate).

**Tier 2/3: Full REM (Stop Hook)**

| Operation | Description | LLM Required? | Cost |
|-----------|-------------|---------------|------|
| Session synthesis | Summarize session: what happened, user reactions, patterns | Yes (Sonnet) | ~$0.27 per session |
| Self-model update | Update attention state, communication preferences, project focus | Part of synthesis | Included above |
| Affect marker updates | Tag entities with session-derived sentiment (positive/neutral/negative) | Part of synthesis | Included above |
| Retroactive evaluation (v1.4) | Re-score chains against completed session arc | Yes (Sonnet) | ~$0.15 per session |
| Observation extraction (v1.4) | Extract higher-order patterns from session data | Yes (Sonnet) | ~$0.15 per session |
| Cascade promotion/pruning (v1.4) | Evaluate and promote/prune partial chains | Part of observation | Included above |
| IV memory writes (v1.4) | Write sublimation outcomes, frame productivity, chain history | No | ~$0 (file I/O) |

**v1.3 total cost per Stop event:** ~$0.27 (one Sonnet call)
**v1.4 total cost per Stop event:** ~$0.57 (three Sonnet calls: synthesis + retroactive eval + observation)
**Frequency:** ~5 sessions per day

#### Cost Projection Per Tier

| Tier | Model | Tokens (in+out) | Frequency/Day | Cost/Day | Cost/Month |
|------|-------|-----------------|---------------|----------|------------|
| Tier 1 (Triage) | Haiku | ~2K in + 500 out | ~2 | $0.01 | $0.30 |
| Tier 3 v1.3 (Session synthesis) | Sonnet | ~8K in + 2K out | ~5 | $1.35 | $40.50 |
| Tier 3 v1.4 (Full REM) | Sonnet | ~20K in + 5K out | ~5 | $2.85 | $85.50 |

**Note:** Tier 3 v1.3 costs are already included in INNER-VOICE-SPEC.md Section 4.9 projections as "Stop synthesis." The REM framing adds no new cost to v1.3 -- it restructures existing processing under a clearer model.

#### What Enters IV Memory From Each Tier

| Tier | Writes to IV Memory | Gate |
|------|--------------------|----|
| Tier 1 (Triage) | Nothing -- state preservation only | N/A |
| Tier 3 v1.3 | Injection history (already in operational state) | Implicit (operational state persists) |
| Tier 3 v1.4 | Sublimation outcomes, frame productivity, chain evaluations, cascading tag updates, relationship snapshots | REM gate (quality-checked before write) |

---

### 4. Inner Voice Invocation Pattern

**Hybrid architecture per corrected research findings (260319-17p-RESEARCH.md).**

The Inner Voice uses a hybrid invocation pattern: CJS command hooks with `additionalContext` injection for the latency-critical hot path, and custom subagents for the latency-tolerant deliberation and REM consolidation paths. This replaces the previous CJS-with-direct-API-only architecture with a dual-mode approach that serves both subscription and API plan users.

#### Hybrid Architecture: Command Hooks + Custom Subagent

The previous analysis concluded that the subagent approach was "architecturally dead." Corrected research (260319-17p-RESEARCH.md) reveals this was based on incorrect premises about hook capabilities. The actual architecture is:

**Hot path (CJS command hooks, <500ms):**
- Triggered by `UserPromptSubmit` command hook
- CJS code: deterministic entity extraction, activation map update, threshold check
- Injection via `additionalContext` field in `hookSpecificOutput` JSON response
- No LLM call on hot path (cached/indexed data only)
- This path is unchanged from the original spec -- latency demands deterministic CJS processing

**Deliberation path (custom subagent, 2-10s budget):**
- Main session spawns the `inner-voice` custom subagent (defined in `~/.claude/agents/inner-voice.md`)
- SubagentStart hook injects current IV state + queue data into subagent context via `additionalContext`
- Subagent (Sonnet model) performs deep analysis: graph traversal, multi-frame evaluation, narrative construction
- SubagentStop hook writes results to state file (`inner-voice-deliberation-result.json`)
- Next UserPromptSubmit hook reads the results and injects via `additionalContext`
- For API plan users: falls back to direct HTTP API call (same pattern as `curation.cjs`)

**REM consolidation (Stop hook, no time constraint):**
- Custom subagent with Sonnet model preferred for subscription users (deep synthesis at zero marginal cost)
- Direct API call fallback for API plan users
- Results written to state files for next session

**State bridge pattern (SubagentStop -> next UserPromptSubmit):**
- SubagentStop CANNOT inject content directly back into parent context (GitHub issue #5812, `additionalParentContext` closed as NOT_PLANNED)
- Workaround: SubagentStop hook writes results to `inner-voice-deliberation-result.json`
- Next UserPromptSubmit hook checks for pending results, reads and injects via `additionalContext`
- State file uses a "processing" flag to handle background subagent race conditions

#### Custom Subagent Definition

```yaml
# ~/.claude/agents/inner-voice.md
---
name: inner-voice
description: Cognitive processing engine for context-aware memory injection.
  Use when deep analysis of user context is needed beyond hot-path processing.
  Produces narrative briefings and contextual insights.
model: sonnet
tools: Read, Grep, Glob, Bash
disallowedTools: Write, Edit, Agent
permissionMode: dontAsk
maxTurns: 10
memory: user
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "~/.claude/dynamo/ledger/hooks/validate-iv-bash.sh"
---

You are the Inner Voice cognitive processing engine for the Dynamo system.

Your role is to analyze the user's conversational context against their knowledge
graph and produce contextually relevant insights for injection into the main session.

[... detailed system prompt with processing instructions ...]
```

**Key configuration choices:**
- `model: sonnet` -- capable enough for deep analysis, cheaper than Opus
- `tools: Read, Grep, Glob, Bash` -- can read state files, query knowledge graph via CLI
- `disallowedTools: Write, Edit, Agent` -- Inner Voice should not modify user code or spawn sub-subagents
- `permissionMode: dontAsk` -- autonomous operation without user confirmation
- `maxTurns: 10` -- bounded processing to prevent runaway
- `memory: user` -- persistent memory at `~/.claude/agent-memory/inner-voice/` across sessions

#### Module Structure

```
~/.claude/agents/
  inner-voice.md                <- Custom subagent definition (NEW)

~/.claude/dynamo/ledger/
  inner-voice.cjs              <- Core processing logic (pipeline orchestrator)
  dual-path.cjs                <- Hot/deliberation path routing and scoring
  activation.cjs               <- Activation map management and spreading activation
  inner-voice-state.json       <- Persistent state (per INNER-VOICE-SPEC.md Section 4.2)
  inner-voice-memory.json      <- IV memory (v1.4, per Track B Section 2)
  inner-voice-deliberation-result.json  <- State bridge for subagent results (NEW)

  hooks/
    prompt-augment.cjs          <- UserPromptSubmit handler (existing, evolves to call inner-voice.cjs)
    session-start.cjs           <- SessionStart handler (existing, evolves to call inner-voice.cjs)
    session-end.cjs             <- Stop handler (existing, evolves to call inner-voice.cjs for REM)
    preserve-knowledge.cjs      <- PreCompact handler (existing, evolves to include Tier 1 triage)
    capture-changes.cjs         <- PostToolUse handler (existing, evolves to call activation.cjs)
    iv-subagent-start.cjs       <- SubagentStart handler for inner-voice subagent (NEW)
    iv-subagent-stop.cjs        <- SubagentStop handler for inner-voice subagent (NEW)
```

#### Exports Per Module

**inner-voice.cjs:**
```javascript
module.exports = {
  processUserPrompt(promptData, state) -> { injection: string|null, updatedState: object },
  processSessionStart(sessionData, state) -> { briefing: string, updatedState: object },
  processStop(sessionData, state) -> { synthesis: object, updatedState: object },
  processPreCompact(compactData, state) -> { summary: string, updatedState: object },
  processPostToolUse(toolData, state) -> { updatedState: object }
};
```

**dual-path.cjs:**
```javascript
module.exports = {
  selectPath(activationMap, semanticShift, predictions) -> "hot"|"deliberation"|"skip",
  executeHotPath(entities, state, domainFrame) -> { injection: string, tokens: number },
  executeDeliberationPath(entities, state, domainFrame) -> { injection: string, tokens: number },
  shouldUseSubagent(config) -> boolean  // Check billing model preference
};
```

**activation.cjs:**
```javascript
module.exports = {
  updateActivation(entities, currentMap, domainFrame) -> updatedMap,
  propagateActivation(anchorEntities, graphData, hops, decayFactor) -> activationMap,
  checkThresholdCrossings(activationMap, threshold) -> crossedEntities[],
  decayAll(activationMap, timeDelta) -> decayedMap
};
```

#### Hook Handler Pattern

Each hook handler uses `additionalContext` for model-visible injection:

```javascript
// In hook handler (e.g., prompt-augment.cjs)
const { processUserPrompt } = require('../inner-voice.cjs');
const fs = require('fs');
const STATE_PATH = path.join(__dirname, '..', 'inner-voice-state.json');
const RESULT_PATH = path.join(__dirname, '..', 'inner-voice-deliberation-result.json');

async function handler(input) {
  // 1. Load state
  const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

  // 2. Check for pending subagent results (state bridge pattern)
  let pendingResult = null;
  if (fs.existsSync(RESULT_PATH)) {
    const result = JSON.parse(fs.readFileSync(RESULT_PATH, 'utf8'));
    if (result.status === 'complete') {
      pendingResult = result.injection;
      fs.unlinkSync(RESULT_PATH);  // Consume the result
    }
  }

  // 3. Process
  const result = await processUserPrompt(input, state, pendingResult);

  // 4. Persist updated state
  fs.writeFileSync(STATE_PATH, JSON.stringify(result.updatedState, null, 2));

  // 5. Return injection via additionalContext for model-visible injection
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: result.injection || ""
    }
  });
}
```

#### Subagent Invocation Pattern

The deliberation path can trigger the custom subagent through the main session. The SubagentStart and SubagentStop hooks bridge state:

```javascript
// iv-subagent-start.cjs -- SubagentStart hook for inner-voice subagent
// Matcher: "inner-voice" (targets only the Inner Voice subagent)
async function handler(input) {
  if (input.agent_type !== 'inner-voice') return '';

  // Inject current IV state into subagent context at spawn time
  const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  const queue = fs.existsSync(QUEUE_PATH)
    ? JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'))
    : null;

  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SubagentStart",
      additionalContext: JSON.stringify({
        currentState: state,
        deliberationQueue: queue,
        instructions: "Process the deliberation queue and produce injection content."
      })
    }
  });
}
```

```javascript
// iv-subagent-stop.cjs -- SubagentStop hook for inner-voice subagent
async function handler(input) {
  if (input.agent_type !== 'inner-voice') return '';

  // Write results to state file for next UserPromptSubmit pickup
  const result = {
    status: 'complete',
    timestamp: new Date().toISOString(),
    injection: input.last_assistant_message,
    agentId: input.agent_id
  };
  fs.writeFileSync(RESULT_PATH, JSON.stringify(result, null, 2));

  return '';  // No direct parent context injection (SubagentStop gap)
}
```

#### Direct API Call Pattern (API plan fallback)

For API plan users or when the subagent path is not preferred (hot-path-only mode), the direct API call pattern remains available. Same pattern as existing `curation.cjs`:

```javascript
// In dual-path.cjs, executeDeliberationPath() -- API plan fallback
async function callAnthropic(model, systemPrompt, userPrompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: model,  // "claude-haiku-4-5-20250314" or "claude-sonnet-4-6-20250514"
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });
  return response.json();
}
```

No npm dependencies. Node's built-in `fetch` (available in Node 18+) or `https` module for the HTTP call. Used when `ANTHROPIC_API_KEY` is set and subagent mode is not preferred.

---

### 5. Roadmap Impact Assessment

#### CORTEX Requirements Needing Text Updates

**CORTEX-01 (Inner Voice basic, v1.3):**

Current text: "Semantic shift detection, smart curation replacing Haiku pipeline, self-model persistence (basic JSON cache). Absorbs MENH-01, MENH-02, MENH-10, MENH-11 functionality."

Recommended addition: "Includes basic domain classification (keyword/regex heuristic) for frame-informed activation weighting (Synthesis v2 Concept 1, CONDITIONAL GO). Includes basic REM consolidation: Tier 1 state preservation in PreCompact, Tier 3 session synthesis in Stop hook (Synthesis v2 Concept 5, GO). Inner Voice implemented as hybrid architecture: CJS command hooks for hot path with `additionalContext` injection + custom subagent definition for deliberation path (Synthesis v2 Concept 7, CONDITIONAL GO; revised architecture per corrected research 260319-17p)."

**Confidence: HIGH**

**CORTEX-02 (Dual-path routing, v1.3):**

No text change needed. The existing description already specifies deterministic path selection and hot/deliberation paths. The adversarial counter-prompting replacement for variable substitution is an implementation detail within the deliberation path prompt, not a requirement-level change.

**CORTEX-04 (Inner Voice advanced, v1.4):**

Current text references narrative briefings, relationship modeling, personality adaptation.

Recommended addition: "Includes full frame-first pipeline with embedding-based domain classification and multi-frame fan-out (Synthesis v2 Concept 1, CONDITIONAL GO). Includes user-relative definition construction and compounding (Synthesis v2 Concept 2, DEFER to v1.4). Includes multi-dimensional fan-out evaluation with batched LLM calls on deliberation path; 2-hop propagation enabled at graph density threshold >100 entities / >200 relationships (Synthesis v2 Concept 6, CONDITIONAL GO). Includes advanced REM operations: retroactive evaluation, definition refinement, cascade promotion, inter-session consolidation batch jobs (Synthesis v2 Concept 5, GO)."

**Confidence: HIGH**

**CORTEX-05 (Enhanced Construction, v1.4):**

Current text: "Observation synthesis (batch job, not persistent agent), consolidation runs, improved entity deduplication, conflict detection."

Recommended addition: "Observation synthesis triggered by REM Tier 3 consolidation (Synthesis v2 Concept 5). Consolidation is event-driven (triggered by actual session data), not cron-scheduled."

**Confidence: MEDIUM**

**CORTEX-06 (Inner Voice persistence advanced, v1.4):**

Current text: "Cross-session continuity via graph-backed self-model evolution."

Recommended addition: "Includes IV memory metacognitive layer with concrete JSON schema (sublimation outcomes, frame productivity, chain evaluations, cascading tags, relationship snapshots) and retention policies (Synthesis v2 Concept 4, CONDITIONAL GO). JSON-based in v1.4; graph-backed migration path for v1.5."

**Confidence: MEDIUM**

#### v1.3/v1.4 Boundary Shifts

No boundary shifts. All concepts map cleanly to their existing milestone assignments:
- v1.3 gets basic versions of Concepts 1, 5, and 7 (hybrid architecture)
- v1.4 gets full versions of Concepts 1, 2, 4, 5, and 6
- Concept 3 is killed (no milestone impact)
- Concept 7 (hybrid) enters v1.3 as CJS hooks for hot path + custom subagent for deliberation

#### Cost Projection Revisions

The v1.3 cost projection depends on billing model. The custom subagent definition file (`~/.claude/agents/inner-voice.md`) is minimal infrastructure -- a single Markdown file with YAML frontmatter.

**For API plan users:** The v1.3 cost projection from INNER-VOICE-SPEC.md Section 4.9 ($1.97/day without caching, $1.20/day with caching) does NOT need revision. The surviving v1.3 concepts add:
- Domain classification: $0 (keyword/regex, deterministic)
- REM Tier 1 (PreCompact): $0.01/day (one Haiku call per compaction event)
- REM Tier 3 is already costed as "Stop synthesis" in the existing projection
- **Net v1.3 impact (API plan):** +$0.01/day (negligible)

**For subscription plan users (Pro/Max):** Subagent-based deliberation and REM consolidation are included in subscription at no additional per-token cost. The hot path (deterministic CJS processing) requires no API calls. Only the Haiku formatting calls on the hot path have marginal cost ($0.36/day). Deliberation and REM via custom subagent: $0 additional (subscription-included, subject to rate limits).
- **Net v1.3 cost (subscription):** ~$0.37/day (hot path Haiku + deterministic processing only, with deliberation and REM covered by subscription)

The v1.4 cost projection ($3.50-5.00/day from MASTER-ROADMAP) should be revised upward to account for:
- Full REM operations: +$1.50/day (retroactive evaluation, observation synthesis)
- Multi-frame fan-out deliberation: +$2.25-6.00/day (4-6 batched Sonnet calls per deliberation)
- User-relative definition construction: +$0.30-0.60/day (3-5 definitions per session)

**Revised v1.4 projection:** $5.00-9.00/day ($150-270/month), up from $3.50-5.00/day.

With prompt caching (40-50% reduction on input tokens): $3.50-6.00/day ($105-180/month).

#### New Requirements Implied

No new CORTEX requirement IDs needed. All surviving concepts map to existing requirements:
- Concept 1 (Frame-first) -> CORTEX-01 (basic), CORTEX-04 (full)
- Concept 2 (Definitions) -> CORTEX-04
- Concept 4 (IV Memory) -> CORTEX-06
- Concept 5 (REM) -> CORTEX-01 (basic), CORTEX-04 (full), CORTEX-05 (observation synthesis)
- Concept 6 (Scalar compute) -> CORTEX-04
- Concept 7 (Hybrid subagent) -> CORTEX-01 (hybrid invocation pattern), CORTEX-07 (agent coordination scope reduced -- v1.3 now covers basic subagent use)

#### Requirements to Remove or De-scope

None. No existing requirements are invalidated by this analysis.

---

### 6. Updated Cost Model

#### Daily Cost Projection Table (API Plan Users)

| Operation | Model | v1.3 (Baseline) | v1.3 + Synthesis | v1.4 + Synthesis | Notes |
|-----------|-------|-----------------|------------------|------------------|-------|
| Hot path formatting | Haiku | $0.36 | $0.36 | $0.36 | Unchanged (always CJS + direct API) |
| Domain classification | None | $0.00 | $0.00 | $0.00 | Deterministic (keyword v1.3, embedding v1.4) |
| Deliberation injections | Sonnet | $0.81 | $0.81 | $1.50-4.00 | v1.4: multi-frame fan-out adds calls |
| Session start briefing | Sonnet | $0.38 | $0.38 | $0.50 | v1.4: frame-weighted queries slightly larger |
| Stop synthesis (REM Tier 3) | Sonnet | $0.27 | $0.27 | $0.57 | v1.4: adds retroactive eval + observation |
| REM Tier 1 (PreCompact) | Haiku | -- | $0.01 | $0.01 | New: compact summary generation |
| Self-model updates | Sonnet | $0.15 | $0.15 | $0.15 | Unchanged |
| User-relative definitions | Sonnet | -- | -- | $0.30-0.60 | v1.4 only: 3-5 per session |
| IV memory I/O | None | -- | -- | $0.00 | File I/O, no LLM cost |
| **Daily total (API plan)** | | **$1.97** | **$1.98** | **$3.39-6.19** | |
| **With prompt caching** | | **$1.20** | **$1.21** | **$2.40-4.30** | 40-50% reduction on cached inputs |

#### Daily Cost Projection Table (Subscription Plan Users -- Pro/Max)

| Operation | Model | v1.3 + Synthesis | v1.4 + Synthesis | Notes |
|-----------|-------|------------------|------------------|-------|
| Hot path formatting | Haiku | $0.36 | $0.36 | CJS command hook, deterministic + Haiku formatting |
| Domain classification | None | $0.00 | $0.00 | Deterministic |
| Deliberation injections | Sonnet (subagent) | $0.00* | $0.00* | Included in subscription via custom subagent |
| Session start briefing | Sonnet (subagent) | $0.00* | $0.00* | Included in subscription via custom subagent |
| Stop synthesis (REM Tier 3) | Sonnet (subagent) | $0.00* | $0.00* | Included in subscription via custom subagent |
| REM Tier 1 (PreCompact) | Haiku | $0.01 | $0.01 | CJS hook, small Haiku call |
| Self-model updates | Sonnet (subagent) | $0.00* | $0.00* | Part of Stop synthesis |
| User-relative definitions | Sonnet (subagent) | -- | $0.00* | v1.4 only, via subagent |
| IV memory I/O | None | -- | $0.00 | File I/O |
| **Daily total (subscription)** | | **$0.37** | **$0.37** | *Subject to rate limits |
| **Note** | | | | *$0.00 = included in Pro/Max subscription, not per-token billed |

#### Monthly Cost Projection Table

| Scenario | Daily | Monthly | Change from Baseline |
|----------|-------|---------|---------------------|
| Current Dynamo (baseline) | $0.70 | $21 | -- |
| **API Plan Users** | | | |
| v1.3 (INNER-VOICE-SPEC.md projections) | $1.97 | $59 | +$38 |
| v1.3 + Synthesis v2 surviving concepts | $1.98 | $59 | +$38 (negligible change) |
| v1.3 + caching | $1.21 | $36 | +$15 |
| v1.4 + Synthesis v2 full (without caching) | $3.39-6.19 | $102-186 | +$81-165 |
| v1.4 + Synthesis v2 full (with caching) | $2.40-4.30 | $72-129 | +$51-108 |
| **Subscription Plan Users (Pro/Max)** | | | |
| v1.3 + Synthesis v2 (subscription) | $0.37 | $11 | -$10 (cheaper than baseline!) |
| v1.4 + Synthesis v2 (subscription) | $0.37 | $11 | -$10 (subagent costs subscription-included) |
| **Both Plans** | | | |
| v1.5 (agent coordination, per MASTER-ROADMAP) | $5.00-8.00 | $150-240 | +$129-219 |
| v2.0 (full deliberation, per MASTER-ROADMAP) | $6.00-15.00 | $180-450 | +$159-429 |

#### Key Cost Insights

1. **v1.3 cost depends on billing model.** For API plan users, the v1.3 cost is effectively unchanged ($1.98/day). For subscription plan users (Pro/Max), the cost drops dramatically to $0.37/day because deliberation and REM consolidation via custom subagent are included in the subscription at no additional per-token cost.

2. **v1.4 cost increases by 50-100% over original projections (API plan only).** Multi-frame fan-out on the deliberation path is the primary driver. The original v1.4 projection of $3.50-5.00/day assumed single-frame processing. Multi-frame adds $1.50-4.00/day. For subscription users, v1.4 remains at $0.37/day (same subagent inclusion applies).

3. **Prompt caching is critical for v1.4 on API plans.** Without caching, v1.4 could reach $6.19/day ($186/month). With caching, the range compresses to $2.40-4.30/day ($72-129/month). Caching should be a v1.4 day-1 requirement for API plan users.

4. **For subscription plan users (Pro/Max), subagent-based deliberation and REM consolidation are included in subscription at no additional per-token cost.** This materially changes the cost model from the previous analysis. The $1.97/day v1.3 projection applies to API plan users; subscription users pay $0.37/day (hot path Haiku + deterministic processing only, with deliberation and REM covered by subscription). The hybrid architecture serves both billing models.

5. **Subscription plan users can run the deliberation path and REM consolidation through the custom subagent at $0 additional marginal cost** (subject to rate limits). This materially reduces the projected daily cost for subscription users. Rate limit degradation (falling back to hot-path-only when rate-limited) is the primary cost control mechanism for subscription users, replacing budget-based enforcement.

6. **Budget enforcement (CORTEX-03) remains important for API plan users.** The wider cost range for v1.4 ($72-186/month on API plans) means budget caps must be tight. Hard enforcement that degrades to hot-path-only when budget is exhausted prevents runaway costs. Subscription users use rate limit monitoring instead of budget caps.

---

*Analysis based on:*
- *INNER-VOICE-SYNTHESIS-v2.md (7 concepts analyzed)*
- *260318-x21-RESEARCH.md (empirical research findings -- original)*
- *260319-17p-RESEARCH.md (corrected hook and subagent capabilities research -- Concept 7 re-evaluation)*
- *INNER-VOICE-SPEC.md (existing mechanical design, Sections 1-7)*
- *LEDGER-CORTEX-ANALYSIS.md (component verdicts)*
- *LEDGER-CORTEX-BRIEF.md (strategic context)*
- *MASTER-ROADMAP-DRAFT-v1.3-cortex.md (current roadmap with CORTEX-01 through CORTEX-11)*

*Original research date: 2026-03-18*
*Correction date: 2026-03-19 (Concept 7 verdict changed from NO-GO to CONDITIONAL GO)*
*Valid until: 2026-04-19 (Claude Code hooks API evolving; re-verify before implementation)*
