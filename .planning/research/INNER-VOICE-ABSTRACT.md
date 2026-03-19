# The Inner Voice: A Platform-Agnostic Cognitive Architecture for AI Memory Systems

**Status:** Conceptual specification
**Date:** 2026-03-19
**Audience:** Anyone building an Inner Voice system on any platform, any provider, any AI substrate
**Scope:** Theoretical foundations, architectural principles, and design patterns -- no implementation specifics

---

## 1. Executive Summary

The Inner Voice is a continuous parallel cognitive process that runs alongside an active AI session, processing at a fundamentally different level of abstraction than the primary conversation. Where the active session processes words, tasks, and sequential logic, the Inner Voice processes the *experience of the conversation itself* -- relational state, associative resonance, temporal context, and the subjective meaning of what is being discussed for this particular user.

The Inner Voice is not an enhanced retrieval system or a smarter formatting layer. It is a dissociated cognitive process that maintains its own evolving models, generates its own predictions, and selectively surfaces insights only when they cross an activation threshold. Most of what it processes remains invisible to the active session. This selectivity -- the mechanism of sublimation -- is not a limitation but the core design feature. It mirrors how human experiential processing works: the subconscious handles vastly more information than consciousness can accommodate, and the bottleneck into awareness exists because unrestricted broadcast would be overwhelming, not informative.

The cognitive science backing is not decorative. Each theory in the foundation maps to a specific mechanical component that would be harder to design correctly without the theoretical framework. The Inner Voice is a composite cognitive model that produces, through the interaction of its components, something qualitatively different from what any single component achieves: the difference between a system that finds relevant information and a system that constructs contextual understanding.

---

## 2. The Problem: Subjective Attention

### 2.1 Why Current AI Memory Systems Underperform

Current AI memory systems treat conversation as an objective artifact. A user says something; the system extracts entities from what was said; it searches a knowledge store for information related to those entities; it formats the results and injects them. This pipeline treats relevance as an objective property of the data. It is not.

Two people hear the same sentence and attend to different things because their experiential histories make different components salient. When a user mentions "negative feedback loop" in a conversation about team dynamics, the system's default behavior is to retrieve the canonical definition (control theory, output fed back to reduce input). But what "negative feedback loop" means for *this user* might be: recurring interpersonal escalation patterns observed in their interaction history, cyclical architectural debt in their codebase, or self-reinforcing productivity blockers they have described across sessions.

The difference between "what the words mean" and "what the words mean for this user" is the subjective attention gap. No amount of retrieval optimization closes this gap because the gap is not in retrieval quality -- it is in the origin point of the query. Current systems start from the objective content. The Inner Voice starts from the user's subjective relationship to that content.

### 2.2 The Subjective Attention Point

The subjective attention point is the user's experiential center of gravity at any given moment in a conversation. It is determined by:

- **Experiential history** -- what this user has worked on, discussed, struggled with, and succeeded at, as captured in the knowledge store
- **Current context** -- what the user is doing right now and how it relates to their history
- **Relational state** -- how the user communicates, what their patterns are, what their current affect signals
- **Associative resonance** -- which concepts in the knowledge store are activated (directly or indirectly) by the current conversation

The Inner Voice constructs this subjective attention point and uses it as the origin for all downstream processing. Retrieval, association, chain propagation, threshold evaluation, and injection formatting all flow from this user-relative center of gravity rather than from the objective content of what was said.

### 2.3 The Integration Function

The Inner Voice's primary function is not retrieval. It is integration.

Any system can search a knowledge store. The value the Inner Voice adds is in combining raw search results with relational context ("the user was frustrated last time they touched this code"), temporal framing ("this decision was made two weeks ago; circumstances may have changed"), and awareness of the user's communication patterns ("this user prefers directness over caveats"). The output is not a list of relevant facts. It is a contextually shaped, temporally aware, relationally framed integration that primes the active session to behave as if it genuinely understands.

This distinction -- integration versus retrieval -- is the design principle that separates the Inner Voice from all simpler architectures. Retrieval answers "what is relevant?" Integration answers "what does this moment mean for this user, given everything the system knows about them?"

---

## 3. Cognitive Theory Foundation

The Inner Voice draws on 15 cognitive theories classified into three tiers based on how directly they inform the mechanical design. PRIMARY theories are load-bearing -- remove any one and the design degrades in a specific, identifiable way. SECONDARY theories provide design constraints and validation checks. TERTIARY and SUPPORTING theories inform future evolution.

### 3.1 PRIMARY Theories (Load-Bearing)

These seven theories each map to a specific mechanical component. They are not metaphors or inspirations -- they are the architectural specification expressed in cognitive science vocabulary.

| # | Theory | Originator | What It Produces in the System | Why It Is Load-Bearing |
|---|--------|-----------|-------------------------------|----------------------|
| 1 | Dual-Process Theory | Kahneman | The dual-path architecture: fast/automatic (hot path) vs. slow/deliberate (deliberation path) | Without it, every operation requires expensive reasoning. Cost becomes prohibitive. The hot path handles 95% of operations cheaply. |
| 2 | Global Workspace Theory | Baars | The sublimation mechanism: selective broadcast from parallel processing into the active session | Without it, the system either surfaces everything (overwhelming) or requires manual relevance judgments (expensive). Selective broadcast is the mechanism that makes the system useful. |
| 3 | Spreading Activation | Collins & Loftus | Cascading associations: one concept activates related concepts through the knowledge store's relationship structure | Without it, relevance scoring requires per-entity reasoning. Spreading activation provides a continuous, evolving relevance score that emerges from conversation structure rather than from explicit judgments. |
| 4 | Predictive Processing | Friston | The sublimation trigger: surface insights when the conversation surprises the system (deviates from its predictions), not on a schedule | Without it, the system injects on every input (noisy) or on arbitrary triggers (uncalibrated). Surprise-based triggering provides a principled reason to stay silent when the conversation proceeds as expected. |
| 5 | Working Memory Model | Baddeley | The integration function: the Inner Voice acts as the episodic buffer, combining multi-source information into coherent episodes | Without it, the system is a retrieval engine with formatting. The integration function -- binding facts with context, framing, and relational knowledge -- is the primary value add. |
| 6 | Relevance Theory | Sperber & Wilson | The injection quality standard: every surfaced insight must produce cognitive effects that exceed the processing effort it imposes | Without it, there is no optimization target for injection quality. Relevance Theory provides the calculus: maximize insight per unit of attention consumed. |
| 7 | Cognitive Load Theory | Sweller | The injection volume ceiling: hard limits on how much to surface based on the active session's current processing demands | Without it, well-intentioned comprehensive injections degrade performance. This theory sets the hard constraint that all other recommendations must respect. |

#### 3.1.1 Dual-Process Theory (Kahneman)

The mind operates through two systems. System 1 is fast, automatic, intuitive, and associative. System 2 is slow, deliberate, analytical, and rule-based. Most cognition happens in System 1; System 2 engages only when System 1 signals uncertainty.

**What it produces:** The dual-path architecture. A fast, cheap, deterministic path handles the vast majority of operations without invoking expensive reasoning. A slow, intelligent path engages only when the fast path signals uncertainty, complexity, or low confidence. The path selection itself must be deterministic -- System 1 does not reason about whether to engage System 2; it triggers automatically based on measurable signals.

**The cost control insight:** Without the dual-process framework, the designer faces a binary choice: expensive reasoning for everything (financially ruinous) or deterministic processing for everything (unintelligent). The dual-process model resolves this by recognizing that intelligent systems need both, and that most processing can and should stay fast.

**Where the analogy breaks:** System 1 in humans is truly parallel and unconscious; the fast path is sequential and explicit. System 1 in humans learns from experience; the fast path does not inherently learn without explicit feedback mechanisms. The "feeling of knowing" that System 1 produces in humans has no direct equivalent in the fast path.

#### 3.1.2 Global Workspace Theory (Baars)

Consciousness is a shared cognitive resource where information from many specialized unconscious processors is broadcast to all other processors. Many processes operate in parallel and unconsciously, competing for workspace access. Information that wins the competition is broadcast widely, becoming available to all cognitive modules.

**What it produces:** The sublimation mechanism. The Inner Voice's parallel processing -- cascading associations, relational modeling, temporal tracking -- all operate below the surface. Multiple candidate insights compete for access to the active session. Only those crossing the activation threshold are broadcast. The active session's context window is the workspace bottleneck.

**The selectivity insight:** The counter-intuitive core of the Inner Voice is that most of its processing should be invisible. Without this theory, a designer might think comprehensive output is better than selective output. Global Workspace Theory explains why the bottleneck into awareness is a feature: unrestricted broadcast would be overwhelming, not informative.

**Where the analogy breaks:** There are no actual parallel processors -- the Inner Voice simulates parallel streams as sequential steps within a single processing cycle. The "competition" is actually a scoring and ranking step, not genuine competition between independent processors.

#### 3.1.3 Spreading Activation (Collins & Loftus)

Semantic memory is organized as a network of interconnected nodes. When a concept is activated, activation spreads to connected nodes with strength decaying over distance. Activation reaching a threshold triggers conscious recall. Multiple sources can converge (summation), and subthreshold activation primes future retrieval.

**What it produces:** The activation map -- a first-class data structure tracking activation levels across all entities in the knowledge store. Each processing cycle updates activation levels, decays existing activations, and checks for threshold crossings. The key insight is convergent activation: an entity mentioned once in passing gets low activation, but if the conversation circles back to related topics from multiple angles, activation from different paths converges. When the sum crosses the threshold, the entity sublimates -- producing the "this keeps coming up" effect.

**The deterministic relevance insight:** Without spreading activation, determining relevance requires asking "is this entity relevant?" for every piece of knowledge -- an expensive reasoning operation. Spreading activation provides a continuous, evolving relevance score that emerges from conversation structure. The score is deterministic and cheap to compute.

**Where the analogy breaks:** If the knowledge store is sparse (few entities, few relationships), activation has nowhere to spread. Graph density is a prerequisite for the mechanism to add value. False associations (entities sharing names but not meaning) cause irrelevant activation spreading.

#### 3.1.4 Predictive Processing (Friston)

The brain is a prediction engine maintaining a generative model of the world. Only prediction errors -- the difference between expected and actual input -- get propagated for conscious processing. When predictions match reality, processing is minimal.

**What it produces:** The sublimation trigger. Instead of injecting on every input or on every semantic shift, the Inner Voice injects when the conversation deviates from its predictions. The system maintains expectations about what the user will do, and intervention happens only when those expectations are violated. High-confidence violations produce stronger interventions.

**The silence insight:** Predictive processing solves the over-injection problem. A system that injects on every input is noisy and often irrelevant. The predictive model provides a principled reason to stay silent: if the conversation proceeds as expected, there is nothing to say. This dramatically reduces injection frequency while increasing injection quality.

**Where the analogy breaks:** The system sees discrete processing snapshots, not a continuous sensory stream. True surprise computation requires calculating the probability of the observed input under the current model -- potentially an expensive operation. Simpler proxies (semantic distance between consecutive inputs) capture most of the value.

#### 3.1.5 Working Memory Model (Baddeley)

Working memory is a multi-component system: a Central Executive (attention control, coordination), domain-specific buffers (temporary storage), and an Episodic Buffer (limited-capacity integration system that combines information from subsystems and long-term memory into coherent episodes).

**What it produces:** The Inner Voice's primary identity as an integration engine. Its core function is not retrieval (the knowledge store's job) or storage (the persistence layer's job). Its core function is binding -- combining raw retrieved facts with current context, relational knowledge, and temporal framing into coherent, useful episodes. The Central Executive maps to the path-selection logic; the Episodic Buffer maps to the Inner Voice itself.

**The integration insight:** This theory reframes the Inner Voice from "a system that retrieves and formats memories" to "a system that integrates multi-source information into coherent episodes." Integration is harder than retrieval and adds more value. A 50-token integration saying "this decision was made two weeks ago, driven by simplicity preference, and the user was frustrated with the alternatives" is more valuable than a 500-token retrieval dump of the full discussion context.

**Where the analogy breaks:** The Episodic Buffer in humans is passive, controlled by the Central Executive. The Inner Voice is both buffer and executive -- it decides what to retrieve, how to integrate, and whether to surface. Capacity limits are artificially imposed by design choice, not by biological constraint.

#### 3.1.6 Relevance Theory (Sperber & Wilson)

Every utterance carries an implicit guarantee that it is worth the listener's processing effort. Relevance is a ratio: cognitive effects (new information, conclusions, revisions produced) divided by processing effort (mental work required to derive those effects). Maximum relevance equals maximum cognitive effects for minimum processing effort.

**What it produces:** The optimization target for injection quality. Every surfaced insight must pass a relevance calculus: "Will this produce cognitive effects that exceed the processing effort?" This directly produces design specifications for injection format (concise, pre-integrated), injection density (maximum insight per token), and the trust resource (repeated irrelevant injections teach the active session to ignore the Inner Voice, actively harming the system).

**The format insight:** Relevance Theory answers the question every other theory leaves open: how much is enough? Spreading activation identifies what is associated. Predictive processing identifies what is surprising. Global Workspace Theory identifies what wins the competition. Relevance Theory specifies the amount and format: maximum cognitive effects, minimum processing effort.

**Where the analogy breaks:** Cognitive effects are hard to measure -- the Inner Voice cannot directly observe whether its injection was useful. Processing effort is measurable but crude (token count is a proxy, but quality matters more than length).

#### 3.1.7 Cognitive Load Theory (Sweller)

Working memory has severe capacity limits. Cognitive load has three types: intrinsic (inherent task complexity), extraneous (caused by poor interface design), and germane (productive processing that builds understanding). Effective communication minimizes extraneous load and maximizes germane load.

**What it produces:** Hard injection volume constraints. During complex tasks, even highly relevant injections add load. The Inner Voice must estimate current cognitive load and adjust injection volume accordingly. Session-start injections can be longer (workspace is empty). Mid-session injections must be shorter (workspace is full of task context). Urgent injections must be extremely concise (interrupting active processing).

**The ceiling insight:** This theory provides the hard constraint that every other theory's recommendations must respect. Spreading activation might identify 50 relevant entities. Global Workspace Theory might select 10. Relevance Theory might format them well. But if injecting all 10 exceeds cognitive capacity, performance degrades. This theory turns "comprehensive memory system" into "surgically precise memory system."

**Where the analogy breaks:** AI "cognitive load" differs from human working memory limits. AI systems do not have the biological 7-plus-or-minus-2 limit. But attention mechanisms degrade with context length (the "lost in the middle" phenomenon), providing an analogous capacity constraint.

### 3.2 SECONDARY Theories (Design Constraints)

These five theories provide design constraints and validation checks. Each maps to a specific capability that enriches the system but is not required for the core architecture to function.

| # | Theory | What It Adds | When It Becomes Relevant |
|---|--------|-------------|------------------------|
| 1 | Attention Schema Theory (Graziano) | Self-model as attention monitor -- the Inner Voice models what the active session is attending to, enabling metacognitive self-correction | After the core architecture is proven; the self-model prevents the "confidently wrong" failure mode |
| 2 | Somatic Marker Hypothesis (Damasio) | Affect/valence tags on knowledge store entities -- emotional associations attached to past experiences bias future processing | After basic functionality is stable; affect metadata shapes injection framing, not content |
| 3 | Default Mode Network | Session boundary processing -- the system's highest-value processing moments are session transitions (start, end), analogous to how the brain's DMN activates during idle moments | Informs session boundary design from the start; full consolidation is a later capability |
| 4 | Memory Consolidation | Two-phase storage: new data as raw episodes (fast capture), periodic synthesis into higher-order patterns (slow consolidation) | After the write pipeline is stable; consolidation is an editorial batch process, not real-time |
| 5 | Metacognition | "Thinking about thinking" -- the Inner Voice tracks its own performance, calibrates confidence, and adjusts behavior based on outcome history | After baseline metrics exist; without metacognition, the system is open-loop |

### 3.3 TERTIARY and SUPPORTING Theories

| Theory | What It Informs | Readiness |
|--------|----------------|-----------|
| Schema Theory (Bartlett, Piaget) | Disposition and context adaptation -- different cognitive frames for different task types (debugging, architecture planning, code review) | Requires the core frame classification mechanism |
| Affect-as-Information (Schwarz) | Processing depth modulation based on inferred emotional state -- terse input might indicate frustration or efficiency | Low confidence in affect detection from text; safe implementation limits modulation to injection framing |
| Hebbian Learning | Entities that co-occur across sessions have their relationship strength increased -- "neurons that fire together wire together" | Lightweight weight tracking from the start; full consolidation integration later |

---

## 4. Architectural Principles

These ten principles are derived directly from the theory foundation. Each is an operational rule that any implementation of the Inner Voice must follow.

| # | Principle | Source Theory | What It Means |
|---|-----------|--------------|--------------|
| 1 | Most processing stays invisible | Global Workspace Theory | Only threshold-crossing content reaches the active session. The Inner Voice processes far more than it surfaces. |
| 2 | Speak when surprised, not when scheduled | Predictive Processing | The system intervenes when the conversation deviates from expectations, not on every input or at fixed intervals. |
| 3 | Integrate, do not retrieve | Working Memory Model | The value add is in combining facts with context, framing, and relational knowledge -- not in finding facts. |
| 4 | Maximize insight per unit of attention consumed | Relevance Theory | Concise, contextually shaped injections. Never dump raw data. Every token must earn its place. |
| 5 | Respect the workspace capacity | Cognitive Load Theory | Hard volume limits that vary by context. Session-start injections can be longer; mid-session injections must be shorter; urgent injections must be minimal. |
| 6 | Model your own attention state | Attention Schema Theory | The system tracks what the active session is focused on. This is the substrate for relevance decisions and the mechanism that prevents confident wrongness. |
| 7 | Session boundaries are premium processing time | Default Mode Network | Invest disproportionate processing effort at session start (briefing) and session end (synthesis). These are the highest-value processing moments. |
| 8 | Fast path first, slow path only when needed | Dual-Process Theory | 95% of operations on the fast deterministic path. Expensive reasoning only when the fast path signals uncertainty. |
| 9 | Associations cascade, they do not search | Spreading Activation | Relevance emerges from graph topology and activation propagation, not from per-entity relevance queries. |
| 10 | Tag experience, use it later | Somatic Markers + Hebbian Learning | Experiential metadata (affect, co-occurrence, outcome) attached to entities shapes future processing. |

---

## 5. The Sublimation Model

### 5.1 How the Inner Voice Selectively Surfaces Insights

Sublimation is the process by which the Inner Voice's internal processing products cross an activation threshold and enter the active session's awareness. It mirrors how human experiential processing works: a person does not consciously decide to recall a relevant memory -- that association fires because the experiential context activated it, and it enters conscious thought only if the activation threshold is met.

What sublimates is not raw facts. It is contextually shaped, relationally framed, temporally aware information. The same underlying fact produces different sublimated content depending on the user's current context, the conversation's trajectory, and the relational state.

### 5.2 The Composite Threshold Function

The sublimation threshold determines when Inner Voice processing surfaces into the active session. It is informed by multiple theories working in concert:

```
sublimation_score(entity) =
    activation_level(entity)                    // from Spreading Activation
  * surprise_factor(entity, predictions)        // from Predictive Processing
  * relevance_ratio(entity, current_context)    // from Relevance Theory
  * (1 - cognitive_load_penalty(current_load))  // from Cognitive Load Theory
  * confidence_weight(entity)                   // from Metacognition
```

**Factor definitions:**

| Factor | Source | Range | What It Measures |
|--------|--------|-------|-----------------|
| Activation level | Spreading Activation | 0.0 - 1.0 | How strongly this entity is activated by conversation context through the knowledge store's relationship structure |
| Surprise factor | Predictive Processing | 0.0 - 1.0 | How unexpected this entity is given the system's current predictions (1.0 = maximally surprising) |
| Relevance ratio | Relevance Theory | 0.0 - 1.0 | Semantic similarity between the entity and the current conversational context |
| Cognitive load penalty | Cognitive Load Theory | 0.0 - 1.0 | Estimated cognitive load on the active session (0.0 = idle, 1.0 = maximum) -- higher load means higher bar for sublimation |
| Confidence weight | Metacognition | 0.0 - 1.0 | The system's confidence in the entity's accuracy and timeliness |

**Key properties:**

1. **All components are deterministic or pre-computed.** No expensive reasoning call is required for threshold calculation. The threshold operates on the fast path.
2. **Multiple signals must converge.** No single factor can force sublimation alone. An entity must be activated, surprising, relevant, and the workspace must have capacity. This prevents false positives from any single dimension.
3. **Threshold adaptation.** If recent injections have been acknowledged by the user, the threshold lowers slightly (the system is performing well). If recent injections were ignored, the threshold raises (the system is being noisy). This metacognitive adjustment is the simplest form of self-correction.

### 5.3 Activation Cascading

Activation does not remain static. When an entity is activated by the conversation, that activation propagates to related entities through the knowledge store's relationship structure, decaying with distance. This produces the cascade effect: a concept mentioned in passing activates nearby concepts, which in turn activate their neighbors. If the conversation then mentions something connected to those distant activations, the convergent activation -- arriving from different paths -- produces a strong signal.

Convergent activation is the key pattern. An entity activated from a single path has modest activation. An entity activated from two or more independent paths has multiplicatively stronger activation. This captures the "this keeps coming up from different angles" pattern that humans experience as an intuition worth voicing.

**Practical constraints on cascading:**

- **Depth limit.** Beyond two hops of propagation, false associations overwhelm genuine ones. Practical implementations should limit propagation to 1-2 hops.
- **Minimum propagation threshold.** Entities with activation below a minimum level do not propagate further. This prevents activation from diffusing into noise.
- **Temporal weighting.** Recent relationships carry stronger activation than old ones. An entity relationship formed yesterday is more relevant than one formed six months ago.
- **Convergence bonus.** When two independent anchor entities both activate the same target entity, the target receives a bonus (typically 1.5x), reflecting the higher signal value of convergent activation.

### 5.4 Temporal Dynamics

The sublimation model is not instantaneous. Entities build activation over time, and the system maintains two temporal categories:

1. **Active sublimation candidates** -- entities currently above threshold or approaching it. These are evaluated for immediate injection.
2. **Tagged-for-later associations** -- entities with subthreshold activation that are building momentum. These are persisted and may cross the threshold in a future processing cycle if the conversation shifts toward them. This captures the human experience of "I was thinking about something earlier and now it is relevant."

---

## 6. The Dual-Path Architecture

### 6.1 Why Two Paths Are Non-Negotiable

The single most important cost-control mechanism in the entire architecture. Without it, every operation requires expensive reasoning. With it, 95% of operations stay fast and cheap while the remaining 5% get genuinely intelligent treatment.

### 6.2 The Fast Path (Hot Path)

**Characteristics:**

- Deterministic processing -- no reasoning calls required
- Uses cached data, indexed results, and pre-computed scores
- Handles entity extraction, activation map updates, threshold calculations, and template-based formatting
- Latency target: sub-second
- Cost: near-zero marginal cost per operation

**When it fires:** The vast majority of processing cycles. The fast path serves all threshold calculations, all activation map updates, all routine injections where cached or indexed results are available.

**What it cannot do:** Generate novel narrative content, resolve conflicts between contradictory information, synthesize patterns across many data points, or construct session-start briefings that require reasoning about the user's state.

### 6.3 The Deliberation Path (Slow Path)

**Characteristics:**

- Invokes reasoning capabilities for genuine intelligence
- Handles narrative generation, conflict resolution, deep synthesis, and session-start briefings
- Latency budget: seconds, not milliseconds
- Cost: significant per invocation, but fired on only a small fraction of processing cycles

**When it fires:** Semantic shift detection (the conversation changed topics significantly), low-confidence entities (the fast path is not sure of relevance), explicit recall requests (the user asks for something the fast path cannot answer), and session-start briefings (where quality justifies higher cost).

### 6.4 Path Selection

Path selection must itself be deterministic. It cannot require reasoning about which path to use -- that would add an expensive operation to every cycle. Selection is based on measurable signals:

- **Entity match confidence** -- high confidence entities use the fast path; low confidence escalates
- **Result count** -- sufficient cached results stay fast; sparse results escalate
- **Semantic distance** -- small shifts stay fast; large shifts escalate
- **Explicit signals** -- user recall requests always escalate

The fast path provides natural graceful degradation. If the deliberation path is unavailable (rate limits, budget exhaustion, infrastructure issues), the fast path continues serving. The system never fails completely -- it degrades from "intelligent" to "functional."

---

## 7. The REM Consolidation Model

### 7.1 The Biological Analog

During sleep, the brain replays experiences non-faithfully -- recombining fragments, testing associations, strengthening coherent connections, pruning those that do not survive reactivation. This process is editorial, not archival. It produces knowledge from experience.

The REM consolidation model maps this process to the Inner Voice's session lifecycle. Session boundaries -- the transitions between active use and idle/termination -- are the analog of sleep. These are the moments where raw session data is transformed into consolidated knowledge.

### 7.2 Three Consolidation Tiers

Consolidation is not uniform. Different lifecycle events provide different processing budgets and different data availability.

**Tier 1: Triage (Context Loss Events)**

The active session's context is about to be compressed or reset. This is an emergency: preserve the Inner Voice's working memory before the forced forgetting event.

- **Operations:** Persist activation map, self-model updates, pending associations, and cascading tags. Generate a concise re-priming summary so the Inner Voice can reconstruct its processing context after the context loss.
- **Budget:** Minimal. Mostly persistence operations with at most one lightweight reasoning call for the re-priming summary.
- **What enters long-term storage:** Nothing. This tier preserves operational state only. Long-term storage requires the editorial processing of higher tiers.

**Tier 2: Provisional Consolidation (Idle/Timeout)**

The user appears to have stopped interacting. The session is probably over but might resume.

- **Operations:** Full consolidation processing flagged as tentative. Session synthesis (what happened, what patterns emerged), self-model updates, and affect marker updates on touched entities.
- **Budget:** Moderate. One reasoning call for synthesis. No latency pressure since the user is not waiting.
- **What enters long-term storage:** Tentative entries that are promoted if the session truly ends, or revised if the user returns.

**Tier 3: Full Consolidation (Session End)**

Clean termination. The full session arc is available for processing.

- **Operations:** Deep editorial pass. Retroactive evaluation (re-scoring earlier processing decisions against the completed session arc -- something irrelevant at the beginning might be the most important insight once you see how the session ended). Observation synthesis (extracting higher-order patterns from the session). Cascade promotion (evaluating and promoting or pruning partial association chains). Self-model and relationship model updates.
- **Budget:** Highest per-session investment. Multiple reasoning calls are justified because the quality of consolidation compounds across all future sessions.
- **What enters long-term storage:** Consolidated observations, refined relationship snapshots, promoted association chains, updated self-model state. All gated by editorial quality checks.

### 7.3 The Working Memory to Long-Term Memory Gate

Nothing enters the Inner Voice's long-term knowledge without passing through consolidation. This is a deliberate design choice with two purposes:

1. **Quality control.** Raw session artifacts are noisy, context-dependent, and often contradictory. Consolidation is the editorial pass that separates signal from noise.
2. **Compounding value.** Consolidated knowledge feeds future sessions. Each consolidation cycle refines the system's models, making future processing more accurate. This creates a virtuous cycle where the system genuinely improves over time.

---

## 8. The Three-Tier Memory Architecture

### 8.1 Overview

The Inner Voice operates across three complementary memory tiers, each serving a distinct purpose.

| Tier | Contents | Purpose | Access Pattern |
|------|----------|---------|---------------|
| Structured Knowledge | Entity-relationship data with temporal edges, facts, typed relationships | "What the system knows about the world and the user" | Shared between the active session and the Inner Voice. Read-heavy. |
| Raw History | Unstructured session transcripts, ingested documents, raw event streams | "Everything that has been observed" | Write-heavy during sessions. Consumed by consolidation processes. |
| Metacognitive Memory | The Inner Voice's own processing products: sublimation outcomes, association chain evaluations, processing pattern observations | "What the Inner Voice has learned about its own processing and the user's attention patterns" | Exclusive to the Inner Voice. Accumulated through REM consolidation. |

### 8.2 The Metacognitive Tier

The metacognitive tier is what distinguishes the Inner Voice from a stateless processing pipeline. It accumulates the Inner Voice's own processing products across sessions:

- **Sublimation outcomes** -- which insights the user engaged with versus ignored. This is direct behavioral feedback on the system's performance.
- **Association chain evaluations** -- which chains were evaluated, which passed, which were rejected and why. Prevents redundant processing and enables retroactive revaluation.
- **Processing pattern observations** -- which cognitive frames have been productive in which contexts, across sessions. Enables the system to improve its frame selection over time.
- **Cascading association tags** -- partial chains that did not reach the sublimation threshold but were building activation. These carry forward across processing cycles, capturing the human experience of "I was thinking about something earlier."
- **Relationship model evolution** -- communication preferences, working patterns, current focus areas. Evolves through consolidation rather than simple overwrites.

### 8.3 The Compounding Effect

Without the metacognitive tier, the Inner Voice is stateless between processing cycles. With it, the system accumulates state that carries forward. This is the closest the architecture can produce to genuine background cognition -- not through continuous processing, but through accumulated state that creates the functional equivalent.

The compounding is concrete. The first time the system processes a concept for a given user, it works from sparse data. The fifth time, it has its own prior processing history, the user's reactions to prior injections about that concept, and new experiential data. The system's understanding of what concepts mean for this user matures iteratively, producing increasingly accurate and useful injections.

---

## 9. Adversarial Analysis

### 9.1 The Strongest Case Against

The Inner Voice is a complex system that adds processing overhead, cost, and failure modes to what could be a simple retrieval pipeline. The complexity must be justified by measurable improvement. The following stress tests examine the most likely failure modes.

### 9.2 Failure Mode Taxonomy

| Failure Mode | Cause | Severity | How It Manifests | Mitigation |
|-------------|-------|----------|-----------------|------------|
| **False positive injection** | Threshold too low; irrelevant insight surfaces | LOW-MEDIUM | Active session receives unhelpful context; user ignores it | Raise threshold through metacognitive adjustment |
| **False negative (under-sublimation)** | Threshold too high; relevant insight not surfaced | MEDIUM | User asks "do you not remember X?" or re-explains context | Lower threshold; provide explicit recall bypass that overrides the threshold entirely |
| **Wrong framing** | Affect misattribution; incorrect relational model | MEDIUM | Injection frames information with wrong tone or context | Update relational model; provide user correction pathway |
| **Stale self-model** | Model not updated after significant changes | HIGH | Persistently wrong injection context; system operates on outdated assumptions | Confidence decay on model assertions over time; periodic recalibration |
| **Over-sublimation** | Injection flooding degrades active session performance | HIGH | Cognitive load exceeds capacity; task performance drops | Hard volume limits per Cognitive Load Theory; dynamic injection budget |
| **Confidently wrong** | Self-model drift with no metacognitive detection | CRITICAL | System is wrong and does not know it is wrong; the monitoring itself relies on the drifted model | Confidence decay; external correction pathway; periodic state review; fallback to simpler processing |
| **Cascading false associations** | Poor knowledge store quality; entity resolution errors | MEDIUM | Irrelevant cascading activations; noise in activation map | Depth limits on propagation; knowledge store quality checks |

### 9.3 The "Confidently Wrong" Problem

The most dangerous failure mode deserves special treatment. It occurs when the self-model has drifted from reality but metacognitive monitoring does not flag it because the monitoring itself relies on the same drifted model. This is the AI equivalent of Dunning-Kruger: the system does not have enough self-awareness to recognize its own incompetence.

**Four mitigations:**

1. **Confidence decay.** Self-model assertions lose confidence over time unless reinforced by new evidence. An assertion not confirmed within a defined period drops from high to medium confidence automatically.
2. **User correction pathway.** Direct user input overrides inferred values. The system must provide a clear mechanism for users to correct its understanding.
3. **Periodic recalibration.** After a defined number of sessions, the system generates a "state of understanding" summary the user can review and correct.
4. **Fallback to simpler processing.** If performance degrades below a baseline, the system reverts to simple retrieval-and-format, disabling the Inner Voice's complex processing until the model is recalibrated.

### 9.4 Stress Test Results

**"Is the parallel process achievable, or is it sequential with the illusion of parallelism?"**

Sequential with the illusion of parallelism. And that is fine. Human "continuous" processing is also an illusion at the neural level -- neurons fire discretely, not continuously. What creates the experience of continuity is persistent state plus rapid re-activation. The Inner Voice replicates this pattern: comprehensive state loaded, processed, updated, and persisted at each processing event. The gap between events is invisible to the user because the state is comprehensive enough to reconstruct the processing context.

**"Does the cognitive metaphor create design clarity or false comfort?"**

Design clarity, definitively. Every theory mapping produces specific, actionable design implications. "The episodic buffer" reframes the core function from retrieval to integration. "Cognitive load" produces hard token limits. "Spreading activation" produces a graph traversal algorithm. The only caveat: the metaphor can create false expectations about capability. The Inner Voice is not conscious. "Emotional context" and "relational state" are computed approximations, not experiences.

**"Is this over-engineered for the actual benefit delivered?"**

The full architecture described here is over-engineered for initial deployment but correctly engineered as a specification. The initial implementation should be a subset -- the fast path, basic spreading activation, session-start briefing, and session-end synthesis -- that proves the pattern works. The full architecture is the target that incremental delivery builds toward.

**"What happens when the knowledge store is sparse?"**

The Inner Voice degrades gracefully. With few entities and relationships, spreading activation has limited reach, convergent activation is rare, and the system behaves more like a simple retrieval engine with better formatting. As the knowledge store grows, the Inner Voice's capabilities compound. The architecture is designed so that sparse-store operation is functional (if unremarkable) and dense-store operation is where the system shines.

---

## 10. Open Questions

These are theoretical questions that any implementation of the Inner Voice must address, regardless of platform.

### 10.1 Activation Threshold Calibration

The composite threshold function defines what factors contribute to sublimation but does not specify the threshold value or the relative weighting of factors. Should the threshold be static (simple but inflexible), adaptive (adjusts based on outcome history), or learned (trained from sublimation outcome data)? The adaptive approach is the most promising for initial deployment; learned thresholds require outcome data that does not exist at launch.

### 10.2 Knowledge Store Density Requirements

At what density does spreading activation begin to add value over simple entity-mention matching? Preliminary analysis suggests a minimum of 100 entities and 200 relationships before multi-hop propagation produces meaningful convergent activation. Below this threshold, simpler matching is sufficient. Any implementation should begin with simple matching and enable spreading activation only after the density threshold is reached.

### 10.3 Self-Model Drift Detection

How does the system detect when its self-model has drifted from reality, given that the detection mechanism relies on the same model? Confidence decay is the most robust approach (time-based rather than model-based), but it is blunt -- all assertions decay, not just wrong ones. More sophisticated approaches (comparing predicted user behavior to observed behavior) require a formal prediction-observation loop that adds complexity.

### 10.4 Evaluation Metrics

What metrics validate that the Inner Voice is working? Proposed:

| Metric | What It Measures | How |
|--------|-----------------|-----|
| Injection relevance rate | Proportion of injections the user references in subsequent interactions | Track injection-to-user-behavior correlation |
| Silence accuracy | Proportion of non-injection decisions that were correct (the system was right to stay silent) | Track when the user explicitly asks for context the system chose not to surface |
| Cost efficiency | Relevance rate per unit of cost spent | Computed from relevance rate and cost tracking |
| Session coherence | Subjective assessment of whether the session felt contextually aware | User feedback or proxy metrics |

### 10.5 The Frame Classification Problem

How does the system determine which cognitive frames a conversational input activates? Keyword matching is fast but low-accuracy. Embedding-based classification is higher-accuracy but adds latency. The initial implementation should use the faster, lower-accuracy approach and upgrade to embedding-based classification once the rest of the architecture is proven.

### 10.6 Emotional Inference Reliability

How reliably can the system infer the user's emotional state from text? Research suggests that affect detection from text is unreliable -- a terse message might indicate frustration, efficiency, or fatigue. Safe implementation limits affect-based modulation to injection framing (how content is presented) rather than fundamental behavior changes (whether to inject at all).

### 10.7 Cross-Session State Concurrency

When multiple active sessions share the same persistent state, how is concurrent access managed? State corruption from simultaneous writes is a real risk. Session-scoped state sections with optimistic locking, or a shared-nothing model where each session maintains independent state with periodic merges during consolidation, are the leading approaches.

---

## Appendix A: Theory-to-Component Traceability Matrix

| Theory | Component | Design Decision | Remove Theory -> System Impact |
|--------|-----------|----------------|-------------------------------|
| Dual-Process | Dual-path architecture | Fast path for 95% of operations | Cost becomes prohibitive; every operation requires reasoning |
| Global Workspace | Sublimation mechanism | Only threshold-crossing content surfaces | System either overwhelms with data or requires manual curation |
| Spreading Activation | Activation map + cascading | Relevance from graph topology | Every entity requires individual relevance judgment (expensive) |
| Predictive Processing | Surprise-based triggering | Inject on deviation, not on schedule | System injects on every input (noisy) or at arbitrary intervals |
| Working Memory | Integration function | Combine facts with context and framing | System outputs raw retrieval results without integration |
| Relevance Theory | Injection quality calculus | Maximize insight per attention unit | No optimization target for injection format and density |
| Cognitive Load | Volume ceiling | Hard limits by context type | Well-intentioned comprehensive injections degrade performance |
| Attention Schema | Self-model | Track active session's focus | No mechanism for metacognitive self-correction |
| Somatic Markers | Affect tagging | Experiential metadata on entities | Loss of emotional/experiential context in injections |
| Default Mode Network | Session boundary processing | Premium processing at transitions | Equal processing investment at all points; missed synthesis opportunities |
| Memory Consolidation | REM model | Editorial transformation of raw data | Knowledge store accumulates raw noise without synthesis |
| Metacognition | Outcome tracking | Performance self-monitoring | Open-loop system that cannot detect or correct its own errors |
| Schema Theory | Frame adaptation | Context-specific processing modes | One-size-fits-all processing regardless of task type |
| Affect-as-Information | Processing depth modulation | Adjust processing based on inferred affect | Uniform processing intensity regardless of user state |
| Hebbian Learning | Edge weight strengthening | Co-occurrence strengthens relationships | Static relationship weights that do not reflect usage patterns |

---

*Specification date: 2026-03-19*
*This document defines the Inner Voice concept independent of any platform, provider, or implementation substrate. It is the conceptual foundation that platform-specific specifications apply to their concrete architectures.*
