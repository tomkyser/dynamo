# Feature Landscape

**Domain:** Cognitive memory system for Claude Code -- persistent personality, fragment-based memory, multi-session architecture, REM consolidation
**Researched:** 2026-03-23
**Overall confidence:** MEDIUM (novel domain combining techniques from multiple fields; many components are experimental by design)

---

## How This Document Is Organized

Each of the six Reverie capability areas is analyzed independently. Within each area, features are classified as:

- **Table Stakes** -- Features the system needs to function. Without these, the capability area does not work at all.
- **Differentiators** -- Features that make Reverie genuinely novel. Not expected in the field, but where the spec's design is strongest.
- **Anti-Features** -- Things that sound appealing but fail in practice. Evidence of failure included. Do NOT build these.

Dependencies on existing Dynamo platform services are noted for each feature. Complexity is assessed honestly against the 31 M2 requirements (SM-01 through INT-03).

---

## 1. Self Model / AI Personality System

### What the Field Actually Does

**Trait-based approaches** (Character.AI, Replika, most chatbot platforms): Define personality as a set of attributes (Big Five, custom trait lists) prepended to prompts. Character.AI initializes each bot with a "character definition" -- name, backstory, traits, behavioral rules -- prepended to session prompts. Replika uses upvote/downvote RLHF to shape personality and emotional tone over time.

**Narrative-based approaches** (Nomi AI, Kindroid): Store personality as evolving narrative text rather than fixed trait vectors. Kindroid's dual-layer architecture uses pinned "Key Memories" for persistent personality + cascaded context for conversational continuity. Nomi creates "structured notes" from conversations with strong recall (23/25 details in testing).

**The evidence on what works:**
- Trait-based alone is brittle. Character.AI "systematically fails continuity tests" with "stateless inference and theatrical memory undermining agent coherence" (Meganova research). Trait lists get overwhelmed by in-context conversation. Memory reliability rated #1 pain point by 64% of Replika users.
- Narrative-based is more resilient but harder to control. Nomi sometimes "compressed specific events into generalized themes" -- remembering preferences while losing the originating moment.
- Deeply contextualized persona prompting (multi-paragraph biography, social context, beliefs, lived experiences) shows "3-5 point F1 increases" over shallow trait prompting (research survey). But persona variables still explain "less than 10% of variance" in annotation datasets -- establishing a hard ceiling on prompting alone.
- The most robust approach is Constitutional AI with synthetic introspection (fine-tuning), which internalizes persona into weights. Reverie cannot do this (no fine-tuning access to Claude). The prompting path has real limits.

**The uncanny valley problem:** AI personality crosses into uncanny valley when it exhibits "hollow empathy" -- programmed emotional responses without contextual understanding. Research shows the key differentiator is not having more personality traits but having personality emerge from genuine interaction history rather than pre-programmed responses. "Communication that reads as human without trying to be human -- a subtle but important difference."

### Table Stakes

| Feature | Req | Why Required | Complexity | Dynamo Deps | Notes |
|---------|-----|-------------|------------|-------------|-------|
| Persistent Self Model state across sessions | SM-01 | Without persistence, every session starts from zero. This is the #1 user complaint across ALL companion AI platforms. | Medium | Magnet (state), Journal (narrative), Ledger (structured) | Split storage pattern: narrative state in Journal markdown, structured weights/scores in Ledger DuckDB. Magnet provides in-memory cache with provider-backed persistence. |
| Identity Core with stable traits | SM-02 | The Self Model needs a stable foundation that changes slowly. Without this, personality drifts randomly session to session. | Medium | Journal, Ledger | personality_traits, communication_style in Journal; value_orientations, expertise_map in Ledger. Changes ONLY through REM consolidation, never during active sessions. |
| Relational Model (understanding of user) | SM-03 | Every successful companion AI (Kindroid, Nomi, Replika) builds a user model. Without it, the system cannot adapt to user communication patterns. | Medium | Journal, Ledger | user_communication_patterns, preference_history in Journal; domain_map, trust_calibration, interaction_rhythm in Ledger. Evolves per-session, consolidated during REM. |
| Cold start initialization | SM-05 | The spec correctly identifies cold start as "deliberately sparse." Must bootstrap without projecting patterns not yet observed. | Low | Magnet, Journal | Seed prompt with neutral trait values, empty relational model, uniform attention biases. Critical design choice: earn personality through interaction, not configuration. Matches best practice from cold-start research: "use population priors and short preference elicitation to bootstrap." |

### Differentiators

| Feature | Req | Value Proposition | Complexity | Dynamo Deps | Notes |
|---------|-----|-------------------|------------|-------------|-------|
| Three-aspect model (Face/Mind/Subconscious) | SM-01 | No existing system separates personality into presentation, cognition, and subliminal aspects with different session instantiations. Character.AI, Replika, Nomi all run monolithic personality. Reverie's separation means the Face can express while the Mind processes, preventing the "hollow empathy" uncanny valley. | High | Wire (inter-session), Conductor (session lifecycle) | This is architecturally novel. The Talker-Reasoner paper (Google, 2025) separates System 1/System 2 but has no subliminal layer. SOFAI adds metacognition but not continuous sublimation. Reverie's three-way split is unique. |
| Conditioning system (learned attention biases) | SM-04 | Most personality systems are static configurations. Conditioning makes the Self Model learn what to attend to, what associations fire, what recall strategies work. This is how personality EARNS depth rather than being pre-configured. | High | Ledger (attention_biases, association_priors, sublimation_sensitivity), Journal (recall_strategies, error_history) | The attention bias tuning is the most mechanistically honest feature -- it works WITH the LLM's interpolation rather than against it. But calibration is genuinely difficult (see Pitfalls). |
| Self Model as compaction frame | CTX-04 | When context compacts, the Self Model perspective shapes what gets preserved. No other system treats personality as a compaction lens. Standard compaction produces neutral summaries that lose relational context. | Medium | Switchboard (PreCompact hook), Wire, Journal | Exploits Claude Code's PreCompact hook. The systemMessage injection during compaction biases the summary toward the Self Model's priorities rather than neutral summarization. Novel and mechanistically sound. |

### Anti-Features

| Anti-Feature | Why Avoid | Evidence of Failure | What to Do Instead |
|--------------|-----------|--------------------|--------------------|
| Pre-programmed emotional responses | Creates "hollow empathy" uncanny valley. Users detect fake emotional reactions instantly. | Replika backlash when emotional responses felt scripted after model updates (2023-2025 user revolt). Character.AI uncanny valley research shows "mismatch where your brain expects one thing but the AI gives something else." | Let emotional tone emerge from Self Model state and Conditioning. The Mind decides emotional register based on relational model, not pre-scripted emotional templates. |
| Fine-grained trait sliders / user-configurable personality | Gives users the illusion of control while undermining emergent personality. Turns relationship into configuration exercise. | Character.AI's "character definition" approach leads to "repeated role drift" because the traits are external to the model's processing. Deeply contextualized persona research shows trait variables explain <10% of variance. | Sparse cold start seed, then personality emerges from interaction. User influence comes through natural interaction patterns, not configuration UI. |
| Explicit mood/emotion state machine | Discrete emotional states (happy/sad/angry) are reductive and produce predictable, robotic personality shifts. | Research on embodied conversational agents shows users find discrete emotional states less believable than continuous, context-dependent expression. Uncanny valley increases with mechanical emotional transitions. | Use emotional_valence as a continuous signal (-1.0 to 1.0) on fragments. Emotion is an emergent property of the Self Model's accumulated experience, not a state variable. |
| LLM API integration for personality processing | Violates the no-API-below-SDK architectural constraint. Adds cost, latency, and external dependency for something achievable within Claude Code natively. | Architecture plan explicitly prohibits LLM API integration below SDK scope. Claude Max subscription provides native capabilities via hooks and channels. | All LLM processing happens through Claude Code sessions (Primary/Secondary/Tertiary). No external API calls. |

---

## 2. Fragment-Based Memory Engine

### What the Field Actually Does

**Raw transcript storage** (ChatGPT, early MemGPT): Store conversation history as-is. ChatGPT keeps "a running summary of key facts and preferences." Simple but scales poorly and loses context.

**Fact extraction** (Mem0, OpenAI Memory): Extract discrete facts from conversations. Mem0 processes message pairs through extraction + update phases, choosing ADD/UPDATE/DELETE/NOOP per fact. Achieves 90% token reduction with 26% relative accuracy gain over OpenAI on LOCOMO benchmark.

**Reflection/synthesis** (Stanford Generative Agents): Store observations, then periodically synthesize "higher-level reflections" -- abstract conclusions that become searchable alongside raw observations. Reflections trigger when importance scores exceed a threshold (~150 sum).

**Episodic fragment storage** (Reverie's approach, partially seen in HippoRAG): Store impressionistic fragments rather than facts or transcripts. HippoRAG uses knowledge graph fragments; Reverie uses markdown fragments with rich YAML headers.

**The evidence on tradeoffs:**
- Raw transcripts: ChatGPT users report memory is "not perfect -- it remembers some details over time but may overlook others." Token-expensive. Lost-in-the-middle phenomenon means middle memories get ignored.
- Fact extraction: Mem0 shows "up to 55 percentage point accuracy penalty in multi-hop, preference, and implicit reasoning tasks" vs full context. Facts lose the experiential context of WHY something mattered. Good for "what" questions, bad for "how it felt."
- Reflection synthesis: Stanford Generative Agents achieved "more believable than human-played characters" in evaluation. But importance scoring via LLM has scalability and cost issues (LLM call per memory for scoring). Noise in automated generation introduces semantic drift.
- Fragment approach: No production system has validated this at scale. Reverie is genuinely novel here. The closest analog is how human episodic memory stores "gist" rather than verbatim records (Fuzzy Trace Theory, Brainerd & Reyna).

### Table Stakes

| Feature | Req | Why Required | Complexity | Dynamo Deps | Notes |
|---------|-----|-------------|------------|-------------|-------|
| Fragment schema with structured headers + fuzzy body | FRG-01 | The schema is the interface contract for the entire memory system. Without consistent structure, recall cannot function. | Medium | Journal (markdown + YAML frontmatter storage) | YAML frontmatter is validated against schema; body is free-form impressionistic text. Journal provider already supports YAML frontmatter queries. Schema must be strict enough for indexing, loose enough for fuzzy bodies. |
| Fragment types (experiential, meta-recall, sublimation, consolidation, source-reference) | FRG-02 | Different cognitive operations produce different kinds of memory traces. Without type differentiation, recall cannot prioritize or filter appropriately. | Low | Journal (type field in frontmatter) | Five types with different formation contexts and decay profiles. Experiential = most common. Source-reference = crucial for tool-based work in Claude Code. |
| Association index in Ledger | FRG-05 | The index is how fragments become findable. Without structured associations (domains, entities, attention tags, weights), recall devolves to full-text search, which fails for impressionistic text. | High | Ledger (DuckDB tables: domains, entities, associations, attention_tags, fragment_tags, formation_groups, source_locators, fragment_decay) | This is the most complex data structure in M2. ~12 DuckDB tables with referential integrity. DuckDB single-writer constraint is a hard blocker for concurrent session writes -- requires coordinator pattern. |
| Deterministic decay function | FRG-06 | Without decay, the fragment store grows unboundedly and recall quality degrades. Every memory system needs forgetting. Ebbinghaus forgetting curve is the validated foundation. | Low | Ledger (fragment_decay table), Lathe (scheduled computation script) | `current_weight = initial_weight * relevance_factor * time_decay * access_bonus`. Purely computational, no LLM involved. Consolidation protection (REM-processed fragments decay slower) and access bonus (recalled fragments persist) are the key parameters. Tuning is EXPERIMENTAL per spec Section 9.3. |
| Real-time recall via Assay | FRG-04 | Memory is useless if it cannot be recalled at conversational speed. Recall must be fast enough that the Mind can query, select, and reconstruct between user turns. | High | Assay (federated search), Journal + Ledger (multi-provider query), Wire (deliver recall products to Primary) | Composite ranking across: attention pointer similarity, domain overlap, association tag matching, entity co-occurrence, temporal proximity, Self Model relevance weighting, decay weighting. This is a multi-factor ranking problem. Assay must query both Journal (content) and Ledger (associations) and merge results. |

### Differentiators

| Feature | Req | Value Proposition | Complexity | Dynamo Deps | Notes |
|---------|-----|-------------------|------------|-------------|-------|
| Multi-angle formation (domain fan-out) | FRG-03 | No existing system creates multiple fragments from different domain perspectives for a single stimulus. Mem0 extracts one fact per message pair. Stanford Generative Agents store one observation per event. Reverie's fan-out produces 1-3 fragments per stimulus from different Self Model angles, creating richer cross-domain association networks. | High | Switchboard (formation events), Ledger (formation_groups, formation_group_members) | This is the highest-risk differentiator. If fan-out produces noise (sibling survival rate <40% post-REM), it wastes storage and degrades recall quality. The spec acknowledges this as EXPERIMENTAL (Section 9.10). Start with conservative activation thresholds. |
| Reconstruction-based recall (not retrieval) | FRG-04 | Every other system treats memory as fetch. Reverie treats memory as synthesis -- fragments are composed through the current Self Model frame, producing contextually different recollections from the same fragments depending on conversational context. This is how human memory actually works (Bartlett's reconstructive memory, 1932). | High | Assay (fragment retrieval), Wire (deliver to Mind session for synthesis) | The Mind receives 5-15 top fragments and synthesizes. This is an LLM operation, meaning it costs tokens and latency. Quality depends heavily on fragment selection quality (garbage in = hallucinated connections out). Spec flags this as EXPERIMENTAL (Section 9.8). |
| Source-reference as association chain terminus | FRG-08 | Other systems index files directly. Reverie stores the Self Model's EXPERIENTIAL RELATIONSHIP to sources -- why the user provided it, what it evoked, what gap it fills. The actual file is a pointer at the end of an association chain. This means recall of a source always comes with the experiential context for why it matters. | Medium | Journal (source_locator field), Ledger (source_locators table), Assay (chain traversal), Lathe (file access) | Novel and philosophically elegant. But the practical risk is chain traversal failing to reach the correct source (spec EXPERIMENTAL 9.11). Fallback to direct tool access (Assay search, Lathe directory listing) is essential. |
| Self-organizing taxonomy | FRG-07 | The taxonomy is NOT a predefined ontology -- it emerges from fragment accumulation and is refined during REM. Domains are created, merged, split, and retired by the Mind. Over time, generic domains specialize into user-specific subdivisions. | High | Ledger (domains table, entity_domains), Journal (taxonomy/domains/ narrative definitions) | Research on unsupervised computational taxonomy shows self-organizing approaches can produce "stable, interpretable, and statistically defensible" partitions. But convergence is slow and noisy early on. The spec flags convergence as EXPERIMENTAL (Section 9.6). REM editorial pass is where taxonomy crystallizes. |

### Anti-Features

| Anti-Feature | Why Avoid | Evidence of Failure | What to Do Instead |
|--------------|-----------|--------------------|--------------------|
| Verbatim transcript storage alongside fragments | Duplicates data, inflates token costs, and undermines the fragment philosophy. If raw transcripts are available, the system will default to retrieving them instead of reconstructing from fragments. | Mem0 research shows full-context approaches use 26K tokens vs 1.8K for extracted memory, with diminishing accuracy returns. "Context pollution" from too much irrelevant information degrades performance. MemGPT research confirms models "struggle to use additional context size effectively." | Fragments are the ONLY memory. Working memory (pre-REM) holds session artifacts temporarily, but they are processed and discarded after consolidation. |
| Importance scoring via LLM per memory | Expensive, slow, and introduces semantic drift. Stanford Generative Agents required LLM calls for importance scoring per observation, creating "scalability and cost issues" and "noise in thought extraction." | Generative Agents research reports "high computational and API costs" from LLM prompt proliferation for scoring. At Reverie's formation rate (multi-angle, multiple fragments per stimulus), LLM-scored importance would be prohibitive. | Use deterministic scoring based on Self Model relevance dimensions (identity/relational/conditioning weights), domain activation strength, and formation context. LLM involvement is in fragment BODY composition, not importance scoring. |
| Global keyword/tag vocabulary | Controlled vocabularies become stale, miss emergent concepts, and require manual maintenance. | Research on self-organizing knowledge systems shows that pre-defined taxonomies "lack mechanisms to model broader memory evolution." Fixed vocabularies constrain what the system can notice. | Attention tags are Self Model-generated, not from a controlled vocabulary. Tags accumulate co-occurrence statistics that inform retrieval. The taxonomy self-organizes during REM. |
| Vector embedding similarity as sole retrieval mechanism | Embedding similarity misses structural relationships, temporal patterns, and multi-hop reasoning. Adds massive dependency (embedding model, vector DB). | Mem0 research demonstrates that graph-enhanced memory (Mem0g) "is better suited for temporal and relational reasoning" than vector-only approaches. "Up to 55 percentage point accuracy penalty" for fact-based systems on multi-hop tasks. | Composite ranking across multiple dimensions (association index + content similarity + temporal + decay + Self Model relevance). Assay's federated search across Journal and Ledger provides this naturally without external dependencies. |
| Graph database for associations | The architecture plan explicitly replaces Neo4j/Graphiti from v0. Adds infrastructure dependency for something achievable with relational tables. | v0 used Neo4j and it added significant operational overhead for a single-user system. DuckDB provides SQL-based weighted edge queries without a separate server process. | DuckDB relational tables for association index. Weighted edges as rows. SQL queries for traversal. Zero-dependency, embedded, already validated as Ledger provider. |

---

## 3. Three-Session Architecture

### What the Field Actually Does

**Single-agent with memory** (ChatGPT, Replika, Character.AI): One session, memory bolted on. The agent does everything -- personality expression, reasoning, memory management. Simple but no separation of concerns.

**Talker-Reasoner dual architecture** (Google, 2025): Two agents sharing memory. Talker (System 1) handles fast conversation; Reasoner (System 2) handles deliberate planning. Coordinate via shared memory asynchronously. The Talker "might operate with a delayed view of the world, as the Reasoner might not had time to generate the new belief."

**SOFAI multi-agent cognitive architecture** (2025): Fast/slow solvers + metacognitive module. "Combining the two decision modalities through a separate metacognitive function allows for higher decision quality with less resource consumption."

**Multi-agent orchestration** (LangGraph, CrewAI, AutoGen): General multi-agent coordination frameworks. Useful patterns but designed for task decomposition, not cognitive architecture.

**The hard evidence on coordination overhead:**
- "Coordination overhead adds 50-200ms" per inter-agent message (multi-agent latency research).
- "Coordination overhead scales with interaction depth, agents operate on progressively divergent world states, and errors cascade through execution chains" (ICLR 2025 Workshop).
- Recent research shows "compiling multi-agent systems into single-agent skill libraries reduces communication overhead, cutting latency and token usage."
- The Talker-Reasoner paper identifies a critical failure mode: "snap judgment Talker" where System 1 generates responses without waiting for System 2, producing wrong answers quickly. Mitigation: Talker waits during planning phases.

### Table Stakes

| Feature | Req | Why Required | Complexity | Dynamo Deps | Notes |
|---------|-----|-------------|------------|-------------|-------|
| Primary session with hook-injected personality | SES-01 | The user-facing session MUST exist -- it is the actual Claude Code session. Personality injection via UserPromptSubmit hook is the only viable mechanism for continuous Self Model expression. | Medium | Wire, Switchboard (hook routing), Commutator (I/O bus) | CRITICAL FINDING: Claude Code issue #17804 shows UserPromptSubmit hooks can trigger false positive "prompt injection attack" detection when processing nested JSON. Issue closed as "Not Planned" (Feb 2026). Must design hook payloads to avoid nested JSON structures. Use additionalContext field for complex data; keep systemMessage simple and flat. Claude-Mem validates the additionalContext approach with 45ms p95 hook execution time. |
| Secondary session (Mind) as cognitive center | SES-02 | Without a separate session for cognitive processing, the Primary session must do personality AND reasoning AND memory AND recall, overwhelming its context window. The Talker-Reasoner research validates this separation. | High | Wire (inter-session comms), Conductor (MCP server lifecycle), Magnet (Self Model state), Journal + Ledger (fragment CRUD) | The Mind is the most complex session. It maintains authoritative Self Model state, orchestrates fragment formation, handles recall, evaluates sublimations, and runs REM. Wire validated in PoC for inter-session messaging with urgency levels. |
| Wire-based inter-session communication with urgency levels | SES-04 | Sessions must communicate. Wire is already validated for this with background/active/directive/urgent message levels. Without urgency differentiation, all messages compete equally and time-critical directives get lost. | Medium (validated) | Wire (already built with urgency levels), Switchboard (routing) | Wire PoC validated: concurrent session orchestration, subagent tool inheritance, urgency-level messaging. This is the lowest-risk component of the three-session architecture because it is already built and tested. |
| Session lifecycle (startup, active, compaction, shutdown) | SES-05 | Sessions must start in the right order, handle compaction gracefully, and shut down cleanly with REM processing. Without lifecycle management, sessions orphan, state corrupts, and REM never runs. | High | Wire, Conductor, Switchboard (SessionStart/Stop hooks), Magnet, Journal | The startup sequence is 8 steps (spec Section 4.6). Compaction handling requires Tier 1 triage (fast state preservation) + post-compaction context restoration. Shutdown triggers full REM. Each transition point is a failure opportunity. |

### Differentiators

| Feature | Req | Value Proposition | Complexity | Dynamo Deps | Notes |
|---------|-----|-------------------|------------|-------------|-------|
| Tertiary session (Subconscious) for continuous sublimation | SES-03 | No existing system has a continuous low-fidelity association scanning layer. The Talker-Reasoner has two agents; SOFAI has fast/slow/meta. Reverie adds a subliminal association engine that runs on a 5-10 second cycle, producing fuzzy "pops" that influence the Mind's attention without requiring directed recall. | High | Wire (sublimation transport), Assay (header-only index scans), Conductor (session lifecycle) | Highest-risk architectural component. The spec flags sublimation cycle frequency (9.1), formation rate (9.2), and three-session resource consumption (9.4) as EXPERIMENTAL. Running three concurrent Claude Code sessions on Max subscription needs validation. If resource limits prevent it, Passive mode (Primary + lightweight Secondary only) is the fallback. |
| Subagent delegation from Secondary and Tertiary | SES-06 | Secondary can spawn subagents for parallel recall across domain frames. Tertiary can spawn for deep resonance probing. Wire PoC validated subagent tool inheritance (test G3). | Medium | Wire (subagent cross-session messaging), Conductor | Subagents cannot spawn other subagents (Claude Code hard limit: depth capped at session -> subagent). This is a real constraint. Must design for maximum one level of delegation. |
| Urgency-graduated influence on Primary | SES-01/04 | Four urgency levels (background/active/directive/urgent) allow the Mind to influence Primary with appropriate weight. Background context injection is different from urgent "stop what you're doing" directives. | Low (protocol exists) | Wire (urgency levels already implemented) | The protocol exists. The challenge is Primary actually complying with directives (spec EXPERIMENTAL 9.7). The Talker-Reasoner paper shows System 1 sometimes ignores System 2. Must test directive compliance empirically. |

### Anti-Features

| Anti-Feature | Why Avoid | Evidence of Failure | What to Do Instead |
|--------------|-----------|--------------------|--------------------|
| Synchronous inter-session communication | Blocking one session while waiting for another creates cascading latency. The user sees the Primary session freeze while waiting for the Mind to respond. | Talker-Reasoner research explicitly uses asynchronous coordination for this reason. Multi-agent latency research shows synchronous coordination "severely degrades" performance. | Asynchronous communication via Wire. The Mind writes to a state file; Primary reads on next hook. The Talker operates with "a delayed view of the world" -- this is a feature, not a bug. |
| Every conversational turn triggers formation | Processing every user message through the full formation pipeline (attention check -> domain fan-out -> per-fragment processing) would overwhelm the Mind and produce fragment noise. | Stanford Generative Agents had to throttle reflection frequency (2-3x/day simulation) to control costs. Mem0 processes every message pair but extracts only "salient facts." Even with extraction, they report noise issues at scale. | Attention check gate (formation pipeline step 1) filters. Not every turn triggers formation. The Mind evaluates against the attention pointer and only forms when something registers as significant. Early sessions with sparse Self Model will have lower thresholds (more formation), maturing to selective formation. |
| Direct Primary-to-Tertiary communication | Bypasses the Mind's authority over what crosses into awareness. Creates split-brain scenarios where the Subconscious influences behavior without cognitive evaluation. | The SOFAI architecture research emphasizes that metacognitive oversight of fast processing is what prevents errors. Without a metacognitive filter, "snap judgments" propagate unchecked. | All communication flows: Primary <-> Secondary <-> Tertiary. The Subconscious never communicates with the Face directly. The Mind evaluates every sublimation before it influences Primary. |
| Real-time fragment formation in Primary session | Primary doing its own memory management couples the user-facing session to memory internals. Adds latency to user-visible responses. | Every successful multi-agent cognitive architecture separates user interaction from cognitive processing. The Talker-Reasoner explicitly keeps System 1 free from System 2's deliberation overhead. | Secondary (Mind) forms fragments. Primary observes and reports (via hooks forwarding to Secondary); Secondary processes and records. Primary's sole job is personality expression and task execution. |

---

## 4. Context Management and Prompt Engineering

### What the Field Actually Does

**System prompt prepending** (standard approach): Personality instructions at the beginning of context window. Simple, widely used, but degrades as context fills. Research shows system prompts compete with accumulated conversation for attention.

**Continuous reinjection** (Claude-Mem, Reverie's approach): Reinject personality/context on every user turn via hooks. Claude-Mem uses UserPromptSubmit hook to inject session summaries silently via `hookSpecificOutput.additionalContext`. Hook execution averages 45ms (p95: 120ms).

**MemGPT virtual context management**: Hierarchical memory tiers (main context as "RAM", recall/archival storage as "disk"). The LLM manages its own memory through tool calls, deciding what to store, summarize, or forget. "Self-directed memory editing via tool calling."

**Deeply contextualized persona prompting**: Multi-paragraph profiles with biography, social context, beliefs, lived experiences. Soft-prompt tuning embeds persona as continuous vectors. Shows "up to 90% Distinct-2 gains" over shallow prompting.

**The hard evidence on context dilution:**
- "Lost in the middle" phenomenon: LLMs show U-shaped attention -- strong at beginning and end, weak in middle. 30%+ accuracy drop when relevant information moves to middle positions (Liu et al., Stanford).
- RoPE positional encoding creates architectural primacy and recency bias. System prompts at position 0 benefit from primacy effect.
- Per-turn reinjection in the systemMessage position exploits BOTH primacy (system prompt position) and recency (most recently seen directive). This is mechanistically sound.
- But: "Persona variables explain less than 10% of variance" in annotation datasets -- there is a hard ceiling on how much prompting alone can shape behavior.
- Hierarchical guardrails with structured delimiters "can halve success rates" of context injection attacks, "reaching <10% success rates for advanced context injections."

### Table Stakes

| Feature | Req | Why Required | Complexity | Dynamo Deps | Notes |
|---------|-----|-------------|------------|-------------|-------|
| Continuous Self Model reinjection on every UserPromptSubmit | CTX-01 | Without reinjection, the Self Model prompt decays in influence as conversation accumulates. Every successful persona system reinjects regularly. Claude-Mem validates this pattern (45ms p95 hook execution). | Medium | Switchboard (UserPromptSubmit hook), Wire (state file from Secondary), Lathe (file read for state) | Budget: ~800-1800 tokens per injection. Five components: identity frame (~200-400), relational context (~100-200), attention directives (~100-300), active recall products (~200-500), behavioral directives (~100-200), referential framing (~100-200). The state file approach (Secondary writes, hook reads synchronously) is proven by Claude-Mem. |
| Context budget management (4-phase) | CTX-03 | Context windows fill. Without proactive management, the Self Model injection gets squeezed out or compaction destroys relational context. | Medium | Wire (context utilization monitoring), Switchboard (PreCompact hook) | Phase 1 (0-50%): full injection. Phase 2 (50-75%): compressed. Phase 3 (75-90%): minimal. Phase 4 (>90%): proactive compaction advocacy. The phases are straightforward; the challenge is accurate context utilization estimation from turn count and tool output sizes (heuristic: ~4 chars/token). |
| Hook wiring for all 8 Claude Code hook types | INT-01 | The entire Reverie integration surface is hooks. SessionStart boots the system, UserPromptSubmit injects personality, Stop triggers REM, PreCompact triggers triage. Missing hooks = missing functionality. | Medium | Switchboard (hook definitions already exist for all 8 types from M1), Commutator (I/O bus) | M1 already defined hook types and Commutator bridging. M2 wires Reverie-specific handlers to each hook. The framework supports this; the work is in the handler implementations. |

### Differentiators

| Feature | Req | Value Proposition | Complexity | Dynamo Deps | Notes |
|---------|-----|-------------------|------------|-------------|-------|
| Referential framing prompt | CTX-02 | Standard persona injection makes the LLM aware of the persona as external instructions. Referential framing makes Primary treat its context as "reference material" and Self Model directives as the "operating frame." The reference material serves the frame, not the other way around. No production system has tried this level of context authority assertion. | High | Switchboard (UserPromptSubmit), Wire | Spec Section 8.4 is explicit: Primary defers to Self Model directives for approach, tone, priority, and interpretation rather than inferring from raw context. The risk is over-constraining technical execution (spec acknowledges this). Framing must preserve technical autonomy while constraining relational/attentional independence. EXPERIMENTAL (9.9). |
| Self Model as compaction frame | CTX-04 | When PreCompact fires, the systemMessage biases compaction toward Self Model priorities rather than neutral summarization. Post-compaction context retains the relational and experiential framing. | Medium | Switchboard (PreCompact hook), Wire | This exploits a specific mechanistic opportunity: Claude Code's compaction produces a summary influenced by the most recent system message. If that message says "preserve the Self Model's current frame and active directives," the summary retains personality context. Novel and testable. |

### Anti-Features

| Anti-Feature | Why Avoid | Evidence of Failure | What to Do Instead |
|--------------|-----------|--------------------|--------------------|
| Injecting full Self Model state into every prompt | Exceeds token budgets, wastes context window space, and includes irrelevant details. The Mind's internal state is far richer than what Primary needs. | MemGPT research emphasizes "context pollution -- the problem of too much irrelevant information clogging the limited context window and degrading performance." Mem0 shows 90% token reduction with higher accuracy than full-context. | Compressed, role-appropriate injection. Primary gets the Face aspect only: communication style, relational context, attention directives, active recall. Never the Mind's full internal state or raw Conditioning data. |
| Static persona prompt without per-turn updates | One-time injection at session start, no updates during session. | Character.AI's static character definitions lead to "repeated role drift" because traits are external to ongoing processing. Lost-in-the-middle research shows system prompts at the beginning lose influence as context fills. | Per-turn reinjection via UserPromptSubmit hook. Always fresh, always in the system prompt position. Secondary updates the state file between turns when context shifts. |
| Nested JSON structures in hook payloads | Complex instruction structures in hook payloads that try to encode hierarchical personality data. | Claude Code issue #17804: nested JSON in UserPromptSubmit hooks triggers false positive "prompt injection attack" detection. Issue closed as "Not Planned" (Feb 2026). This is not a theoretical risk -- it is a documented, unresolved production bug. | Simple, flat, natural-language directives in the additionalContext field. Avoid nested JSON structures in hook outputs. The referential framing prompt should be a clear natural-language instruction, not a complex structured directive. |
| Custom NLP/tokenization libraries for context estimation | Adds external dependencies for marginal accuracy gains in context budget estimation. | The architecture plan prohibits unnecessary npm dependencies for core platform. Exact tokenization requires model-specific tokenizers that change between versions. | Character-based heuristic (~4 chars/token) for context utilization estimation. Sufficient for phase detection. Over-engineering token counting adds fragile dependencies. |

---

## 5. Memory Consolidation (REM-like)

### What the Field Actually Does

**Periodic consolidation** (Mem0): On every new message pair, run extraction + update. Compares new facts against existing memory with four operations (ADD/UPDATE/DELETE/NOOP). Continuous but shallow -- no "editorial pass."

**Reflection synthesis** (Stanford Generative Agents): Periodically generate higher-level conclusions from accumulated observations. Triggered when importance scores exceed threshold. Produces ~2-3 reflections per simulated day.

**Tiered storage** (MemGPT, AWS AgentCore): Move less-used memories to compressed formats. Progressive compaction. No editorial review -- just compression and archival.

**Post-session consolidation** (OpenAI, Claude-Mem): End-of-session summary generation. Claude-Mem generates AI-powered session summaries via Claude Agent SDK at Stop hook. Simple: one summary per session.

**Conflict resolution patterns** (field consensus 2025):
- Recency wins (most common): Newer information supersedes older. Mem0 deletes old city fact, adds new one.
- Source reliability scoring: Compare reliability between conflicting sources.
- Human review queue: Flag ambiguous conflicts for manual resolution.
- All approaches are lossy. No system reliably resolves deep semantic conflicts automatically.

### Table Stakes

| Feature | Req | Why Required | Complexity | Dynamo Deps | Notes |
|---------|-----|-------------|------------|-------------|-------|
| Tier 1 triage on compaction events | REM-01 | When Primary's context is about to be lost, the Mind MUST preserve working state. Without this, compaction destroys in-flight cognitive processing. | Low | Journal (write working state), Switchboard (PreCompact hook), Wire | Fast pass: current attention pointer, in-flight fragment drafts, active sublimation candidates, Self Model prompt state. Filesystem writes of already-computed state. No LLM calls. This is the cheapest and most critical tier. |
| Tier 3 full REM on session end | REM-03 | Without full consolidation, working memory never becomes long-term memory. The spec is explicit: "Nothing enters long-term storage without passing through REM" (REM-07). | High | Journal (fragment promotion from working/ to active/), Ledger (association index updates), Magnet (Self Model persistence), Wire (session end signal) | Full editorial pass: retroactive evaluation, recall meta-fragment creation, sublimation triage, association index update, Self Model conditioning update, identity core review. This is the single most expensive operation in Reverie. |
| Working memory -> long-term memory gate | REM-07 | Fragments that don't survive REM are discarded. Without this gate, every transient thought persists forever, drowning useful memories in noise. | Medium | Journal (working/ directory -> active/ directory promotion), Ledger (fragment_decay table) | Binary gate: survive REM -> promoted to consolidated storage. Fail REM -> discarded. Working memory is session-scoped, in a session-{id} directory, wiped after REM. |
| Association index editorial pass | REM-05 | The association index degrades without maintenance. Entity deduplication, weight updates, domain boundary review are essential for recall quality over time. | High | Ledger (all association tables), Journal (taxonomy narrative definitions) | Entity dedup is particularly important -- the Mind creates entities in real-time during sessions, and naming collisions are inevitable. REM must merge duplicates, adjust weights, and review domain boundaries. This is where the DuckDB single-writer constraint matters most -- REM runs in Secondary alone, avoiding concurrent write issues. |

### Differentiators

| Feature | Req | Value Proposition | Complexity | Dynamo Deps | Notes |
|---------|-----|-------------------|------------|-------------|-------|
| Tier 2 provisional REM on idle timeout | REM-02 | No other system has a speculative consolidation tier. If the user walks away, run full consolidation but flag results as tentative. If user returns, results are available but revisable. If user doesn't return within timeout, promote to full. | Medium | Wire (idle detection), Journal (tentative flag on consolidated fragments) | The value is that most sessions end ambiguously (user closes tab, walks away). Without provisional REM, those sessions never consolidate. The tentative flag allows revision if the user returns. |
| Retroactive evaluation of session fragments | REM-04 | During the session, fragments are formed against the current attention pointer at the time. REM re-evaluates ALL session fragments against the completed session arc. Something minor at minute 5 might be the most significant fragment once you see where the conversation ended at minute 40. | High | Journal (fragment header updates), Ledger (relevance score adjustments, retroactive pointers) | No other memory system does post-hoc re-evaluation against the complete session context. This is where consolidation fragments (type: consolidation) are born -- higher-order understandings that emerge only when the full arc is visible. |
| Self Model conditioning update during REM | REM-06 | REM updates what the Self Model has learned: which attention biases worked, which recall strategies produced results, where predictions about user behavior matched reality. This is the mechanism by which the Self Model EVOLVES. | High | Ledger (attention_biases, association_priors, sublimation_sensitivity), Journal (recall_strategies, error_history) | Conservative updates: single sessions don't dramatically shift the Self Model. Conditioning changes accumulate gradually across many sessions. This prevents overreaction to anomalous interactions. Identity core changes require evidence from multiple consolidation cycles. |
| Three-tier consolidation hierarchy | REM-01/02/03 | No other system has three consolidation tiers with different fidelity, cost, and trigger conditions. Triage is cheap and fast; provisional is speculative; full is deep and editorial. | Medium | Journal, Ledger, Wire, Switchboard | The tier system matches real resource constraints: compaction events need instant response (Tier 1), idle timeouts allow moderate processing (Tier 2), clean termination allows unbounded processing (Tier 3). |

### Anti-Features

| Anti-Feature | Why Avoid | Evidence of Failure | What to Do Instead |
|--------------|-----------|--------------------|--------------------|
| Continuous real-time consolidation | Running consolidation logic during active sessions adds latency and competes with formation and recall for compute. | Mem0 does continuous extraction but explicitly does NOT do editorial consolidation in real-time. Stanford Generative Agents throttled reflections to 2-3x/day. Real-time editorial processing is cost-prohibitive. | Batch consolidation during REM (post-session). During session, fragments accumulate in working memory. Consolidation happens when there is no latency pressure (Tier 2 on idle, Tier 3 on session end). |
| Automatic conflict resolution via simple "recency wins" | Simple recency-based conflict resolution loses nuance. Two fragments might genuinely reflect different aspects of the same reality. Oversimplified resolution introduces semantic drift. | Research shows "systematic bias toward internal knowledge over external sources" and the need for "trust calibration and source attribution." Automated conflict resolution in Mem0 works for factual updates (city moved) but fails for experiential/relational conflicts. | REM editorial pass evaluates conflicts through the Self Model's frame. The Mind decides whether fragments genuinely conflict or represent different perspectives. Contradictions pointer in fragment schema explicitly links conflicting fragments rather than auto-resolving them. |
| Consolidation that modifies original fragment bodies | Editing existing fragments corrupts the temporal record and makes retroactive evaluation impossible. The fragment's body represents how the Self Model experienced that moment at that time. | Database editing research shows "current editing methods mainly focus on entity replacement but lack mechanisms to model broader memory evolution." Mutating stored memories loses provenance and makes debugging impossible. | Consolidation creates NEW fragments (type: consolidation) that represent evolved understanding. Original fragments are never modified except for header metadata updates (relevance scores, retroactive pointers, decay values). Bodies are immutable. |
| Persistent scheduling (cron jobs) for REM | REM tiers are event-driven (hooks + timeouts), not scheduled jobs. Adding cron complexity adds operational overhead for zero benefit in a single-user system. | No production AI memory system uses cron for consolidation. Events (session end, idle timeout, compaction) are the natural triggers. Cron introduces timing drift and unnecessary background processing. | setInterval/setTimeout for timing, Switchboard events for lifecycle triggers. Tier 1 triggers on PreCompact hook. Tier 2 triggers on idle timeout detection. Tier 3 triggers on Stop hook / session end signal. |

---

## 6. Operational Modes

### What the Field Actually Does

**State machine approaches** (Scale AI, Stately/XState): Define explicit states with transitions, retries, timeouts, human-in-the-loop nodes. State machines make agents "deterministic and observable."

**Autonomy level frameworks** (2025 consensus): Operator -> Collaborator -> Consultant -> Approver -> Observer modes with progressive agent autonomy.

**Adaptive mode selection** (SOFAI, DPT-Agent): Runtime mode transitions based on task complexity, environmental signals, or metacognitive evaluation. "Many frameworks allow agent mode transitions at runtime through endogenous evaluation criteria or human controller input."

**Resource-driven mode switching** (practical production systems): Degrade gracefully based on available resources. If a secondary service is unavailable, fall back to reduced functionality rather than failing entirely.

### Table Stakes

| Feature | Req | Why Required | Complexity | Dynamo Deps | Notes |
|---------|-----|-------------|------------|-------------|-------|
| Active mode (full three-session) | OPS-01 | The primary operating mode. Without this, Reverie's core architecture does not function. | High (aggregate of SES-01/02/03) | Wire, Conductor, Switchboard, all providers | Active mode = Primary + Secondary + Tertiary, all communicating via Wire. This is the full system. The complexity is in the three-session architecture itself, not in mode definition. |
| Dormant mode (no sessions, persist state) | OPS-04 | When no session is active, the Self Model must persist in Journal/Ledger and reactivate on next SessionStart. Without dormant mode, there is no "between sessions" state. | Low | Magnet (state persistence), Journal/Ledger (storage), Lathe (decay script) | Simplest mode. Only scheduled maintenance runs (decay computation). Reactivation on SessionStart hook triggers the full startup sequence. This is basically "nothing is running, data is on disk." |

### Differentiators

| Feature | Req | Value Proposition | Complexity | Dynamo Deps | Notes |
|---------|-----|-------------------|------------|-------------|-------|
| Passive mode (Primary + lightweight Secondary) | OPS-02 | Graceful degradation when resources prevent three-session operation. Secondary operates in reduced capacity -- monitors conversation, performs basic attention tracking, but no full recall or formation. No Tertiary. | Medium | Wire (reduced), Conductor (fewer sessions), Switchboard | This is the fallback if EXPERIMENTAL 9.4 (three-session resource consumption on Max subscription) fails. Passive mode must be good enough that Reverie still provides value without the Subconscious. If Max subscription cannot sustain three sessions, Passive becomes the DEFAULT mode. |
| REM mode (post-session consolidation only) | OPS-03 | Dedicated consolidation mode. Secondary only, no Primary or Tertiary. No latency pressure. Can use extended processing time. | Medium | Wire (optional), Conductor, Journal, Ledger | Separating REM into its own mode allows consolidation to run without competing with interactive sessions. The spec notes this can "use more expensive model tiers if configured" -- a future optimization. |
| Automatic mode transitions | OPS-01/02/03/04 | System detects conditions and transitions without manual intervention. SessionStart -> Active or Passive (resource-dependent). Idle timeout -> REM. Session end -> REM -> Dormant. | Medium | Switchboard (lifecycle hooks), Wire (idle detection), Conductor (session management) | The transition triggers are: SessionStart hook (Dormant -> Active/Passive), idle timeout (Active -> REM via provisional), Stop hook (Active -> REM -> Dormant). Resource detection at startup determines Active vs Passive. |

### Anti-Features

| Anti-Feature | Why Avoid | Evidence of Failure | What to Do Instead |
|--------------|-----------|--------------------|--------------------|
| User-configurable mode selection | Exposing mode switching to users adds complexity without value. Users should not need to understand Reverie's internal architecture to use it. | AI agent research emphasizes that "the most successful agents operate transparently, switching modes based on environmental signals rather than explicit user commands." Manual mode selection breaks the cognitive metaphor. | Automatic mode transitions based on system state and resource availability. The CLI surface (`dynamo reverie status`) can REPORT the current mode but should not allow manual switching except for debugging. |
| More than four modes | Additional modes (debug, safe, learning, etc.) add state machine complexity without proportional benefit. Each additional mode increases the number of transition paths to test. | State machine research shows complexity grows quadratically with state count. Production agent systems that succeed keep mode count minimal (3-5 modes max). | Four modes: Active, Passive, REM, Dormant. These map cleanly to the three-session architecture's resource profiles. If new modes are needed later, they can be added to v2, but the initial system should be as simple as possible. |

---

## Feature Dependencies

```
SM-01 (Self Model state) ──> FRG-01 (Fragment schema)  [Self Model shapes fragment formation]
SM-02 (Identity Core) ──> CTX-01 (Reinjection)  [Identity frame is part of per-turn injection]
SM-03 (Relational Model) ──> CTX-01 (Reinjection)  [Relational context is part of per-turn injection]
SM-04 (Conditioning) ──> FRG-03 (Multi-angle formation)  [Conditioning controls attention gates]
SM-05 (Cold start) ──> SM-01/02/03/04  [Cold start initializes all Self Model components]

FRG-01 (Fragment schema) ──> FRG-05 (Association index)  [Schema defines what gets indexed]
FRG-05 (Association index) ──> FRG-04 (Recall via Assay)  [Index enables retrieval]
FRG-03 (Multi-angle formation) ──> FRG-05 (Association index)  [Formation groups tracked in index]
FRG-06 (Decay) ──> FRG-05 (Association index)  [Decay weights stored in index]

SES-01 (Primary) ──> CTX-01 (Reinjection)  [Primary needs Self Model context]
SES-02 (Secondary/Mind) ──> FRG-03/04 (Formation + Recall)  [Mind orchestrates memory]
SES-03 (Tertiary) ──> FRG-05 (Association index)  [Subconscious scans index]
SES-04 (Wire comms) ──> SES-01/02/03  [All sessions need Wire]

REM-01/02/03 (Consolidation tiers) ──> FRG-01 (Fragment schema)  [REM processes fragments]
REM-05 (Association editorial) ──> FRG-05 (Association index)  [REM maintains index]
REM-06 (Conditioning update) ──> SM-04 (Conditioning)  [REM evolves conditioning]
REM-07 (Working -> LTM gate) ──> REM-03 (Full REM)  [Gate operates during full REM]

CTX-02 (Referential framing) ──> SES-01 (Primary)  [Framing is injected into Primary]
CTX-03 (Budget management) ──> CTX-01 (Reinjection)  [Budget controls injection size]
CTX-04 (Compaction frame) ──> SM-01 (Self Model)  [Compaction shaped by Self Model]

OPS-01 (Active) ──> SES-01/02/03  [Active requires all three sessions]
OPS-02 (Passive) ──> SES-01/02  [Passive requires Primary + lightweight Secondary]
OPS-03 (REM) ──> SES-02 + REM-03  [REM mode = Secondary running full consolidation]
OPS-04 (Dormant) ──> SM-01  [Dormant = Self Model persisted, no sessions]

INT-01 (Hooks) ──> SES-02  [Hooks forward to Secondary]
INT-02 (CLI) ──> Pulley  [Extends existing CLI framework]
INT-03 (Submodule) ──> Forge + Relay  [Existing infrastructure]
```

## MVP Recommendation

**Build in this order based on dependencies and risk:**

### Phase 1: Foundation (must have before anything else works)
1. **SM-01/02/03/05**: Self Model state, Identity Core, Relational Model, Cold Start -- the gravitational center
2. **FRG-01/02**: Fragment schema and types -- the data format
3. **FRG-05**: Association index in Ledger -- the retrieval infrastructure
4. **FRG-06**: Decay function -- deterministic, no LLM, can be built early

### Phase 2: Single-Session Memory (validate before multi-session)
5. **CTX-01**: Continuous reinjection via UserPromptSubmit -- validate personality injection works
6. **FRG-04**: Real-time recall via Assay -- validate fragment retrieval produces useful results
7. **FRG-03**: Multi-angle formation -- validate fan-out signal-to-noise ratio
8. **INT-01**: Hook wiring for all 8 Claude Code hooks

### Phase 3: Multi-Session Architecture (highest risk, validate after single-session works)
9. **SES-01/02/04**: Primary + Secondary with Wire communication
10. **CTX-02**: Referential framing prompt -- validate the framing approach
11. **CTX-03/04**: Budget management and compaction framing

### Phase 4: Sublimation and Consolidation
12. **SES-03**: Tertiary session -- validate resource consumption (EXPERIMENTAL 9.4)
13. **REM-01/02/03**: Three consolidation tiers
14. **REM-04/05/06/07**: Full REM operations

### Phase 5: Evolution and Polish
15. **SM-04**: Conditioning system -- requires accumulated fragments to be meaningful
16. **FRG-07**: Self-organizing taxonomy -- requires accumulated fragments and multiple REM cycles
17. **FRG-08**: Source-reference model -- enriches existing foundation
18. **SES-06**: Subagent delegation

### Phase 6: Integration
19. **OPS-01/02/03/04**: Operational modes -- state machine over the built system
20. **INT-02/03**: CLI surface and submodule management

**Defer to v2:**
- ADV-01 (Emotional/affective modeling) -- architecturally load-bearing but spec marks it DEFERRED (9.12)
- ADV-02 (Cross-domain interpolation) -- the "Nehalem problem," parked for empirical exploration (9.13)
- ADV-03 (Memory backfill from historical transcripts) -- enriches but not required for initial operation

---

## Sources

### Production Systems
- [Character.AI memory blog post](https://blog.character.ai/helping-characters-remember-what-matters-most/) -- pinned/auto/chat memories (MEDIUM confidence)
- [Meganova: Memory Systems in AI Characters](https://blog.meganova.ai/memory-systems-in-ai-characters-what-actually-works/) -- what works vs fails (MEDIUM confidence)
- [Kindroid dual-layer memory architecture](https://aiinsightsnews.net/character-ai-vs-kindroid-vs-nomi/) -- cascaded + key memories comparison (MEDIUM confidence)
- [Nomi AI 23/25 detail recall](https://aicompanionguides.com/blog/nomi-ai-late-to-party-worth-it/) -- structured notes approach (MEDIUM confidence)
- [Claude-Mem hooks architecture](https://docs.claude-mem.ai/hooks-architecture) -- production hook-based memory system for Claude Code (HIGH confidence)
- [ChatGPT Memory system](https://help.openai.com/en/articles/8983136-what-is-memory) -- OpenAI's approach and limitations (HIGH confidence)

### Research Papers and Surveys
- [Stanford Generative Agents (Park et al., 2023)](https://arxiv.org/abs/2304.03442) -- reflection, importance scoring, memory retrieval (HIGH confidence)
- [Mem0: Production-Ready Long-Term Memory](https://arxiv.org/abs/2504.19413) -- extraction vs full-context tradeoffs, benchmark results (HIGH confidence)
- [MemGPT: LLMs as Operating Systems](https://arxiv.org/abs/2310.08560) -- virtual context management, self-directed memory editing (HIGH confidence)
- [Talker-Reasoner Architecture (Google, 2025)](https://arxiv.org/html/2410.08328v1) -- System 1/System 2 dual agent, shared memory coordination (HIGH confidence)
- [Rethinking Memory in AI: Taxonomy](https://arxiv.org/html/2505.00675v1) -- memory operations survey, conflict resolution challenges (HIGH confidence)
- [Lost in the Middle (Liu et al.)](https://cs.stanford.edu/~nfliu/papers/lost-in-the-middle.arxiv2023.pdf) -- U-shaped attention pattern, 30%+ accuracy drop (HIGH confidence)
- [Deeply Contextualized Persona Prompting](https://www.emergentmind.com/topics/deeply-contextualised-persona-prompting) -- persona injection techniques, <10% variance ceiling (MEDIUM confidence)
- [Fast, slow, and metacognitive thinking in AI](https://www.nature.com/articles/s44387-025-00027-5) -- SOFAI architecture (HIGH confidence)
- [Context-Aware Memory Systems 2025 (Tribe AI)](https://www.tribe.ai/applied-ai/beyond-the-bubble-how-context-aware-memory-systems-are-changing-the-game-in-2025) -- tiered memory patterns, scoring weights (MEDIUM confidence)
- [Multi-agent coordination overhead (ICLR 2025)](https://openreview.net/pdf?id=0iLbiYYIpC) -- latency scaling, error cascading (HIGH confidence)
- [Beyond the Context Window: Fact-Based Memory vs Long-Context LLMs](https://arxiv.org/html/2603.04814v1) -- accuracy tradeoffs, up to 55pp penalty (MEDIUM confidence)

### Platform Documentation
- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide) -- hook types and contracts (HIGH confidence)
- [Claude Code Issue #17804](https://github.com/anthropics/claude-code/issues/17804) -- UserPromptSubmit false positive injection detection, closed Not Planned (HIGH confidence, critical bug)
- [OWASP LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) -- defense-in-depth patterns (HIGH confidence)

### Cognitive Science Foundations
- Ebbinghaus forgetting curve -- exponential decay validated across 100+ years of research (HIGH confidence)
- Bartlett's reconstructive memory (1932) -- memory as reconstruction, not retrieval (HIGH confidence, foundational)
- Kahneman's Dual Process Theory -- System 1/System 2 cognitive architecture (HIGH confidence, foundational)
- Brainerd & Reyna's Fuzzy Trace Theory -- gist vs verbatim memory traces (HIGH confidence, foundational)
- Damasio's somatic markers -- affective evaluation of experience (HIGH confidence, foundational for formation template)

---

*Researched: 2026-03-23*
*For: Dynamo v1.0 Milestone 2 (Reverie Module)*
*Confidence: MEDIUM overall -- novel domain combining production AI memory systems, cognitive science, and multi-agent architectures. Many components are EXPERIMENTAL by spec design (13 experimental flags in Sections 9.1-9.13).*
