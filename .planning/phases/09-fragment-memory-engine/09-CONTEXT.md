# Phase 9: Fragment Memory Engine - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Validate that multi-angle fragment formation and Assay-based recall produce useful memories in a single-session context before the complexity of inter-session communication is layered on. This phase delivers: a formation pipeline driven by turn-scoped background subagents operating as an intuitive inner voice (FRG-03), and real-time recall via Assay with both passive surfacing and explicit retrieval paths (FRG-04). Formation is LLM-driven through subjective/relational prompt engineering, not deterministic code classification. Domains emerge organically from the model's latent understanding of human cognition.

</domain>

<decisions>
## Implementation Decisions

### Formation Pipeline Architecture
- **D-01:** Turn-scoped background subagents. After each user turn, the Context Manager spawns a fire-and-forget background agent (via Claude Code's Agent tool) with the previous turn's context. The agent runs formation on that stimulus — attention check, domain identification, body composition — then writes fragments via FragmentWriter and feeds nudges back to the Context Manager. Primary does not wait for formation. ~1 turn latency is acceptable and matches how human memory works.
- **D-02:** The formation subagent operates as an intuitive inner voice, not a strategic Mind. The Self Model framing shifts to high-perception, low-deliberation — ISFP/INFP cognitive style rather than the full Mind's INTJ/ENTJ analytical mode. The subagent notices impressions, emotional signals, relational shifts, and pattern resonances. It does not build strategic associations or direct Primary's behavior.
- **D-03:** The formation subagent's system prompt references cognitive and psychological literature indirectly — not as instructions ("use Kahneman's System 1") but as context that activates the right latent patterns in the LLM. The model's training on psychology, philosophy, and neuroscience literature IS the cognitive mechanism. We set up conditions for it to express that understanding, not approximate a mechanism we designed.

### Subjective/Relational Prompt Engineering (CRITICAL)
- **D-04:** ALL formation prompts are framed around subjective identity and relationship. Every question forces self-reference ("What about this moment matters to **you**?"), relational processing ("How does this change what **you** understand about **{user_name}**?"), and perspective asymmetry ("What did **you** notice that **{user_name}** might not realize **you** noticed?"). This breaks the LLM's default third-person omniscient mode and forces it into subjective, perspectival processing — which is what fragment bodies are supposed to be.
- **D-05:** Conditioning is driven through the same relational framing. "What should **you** pay attention to next time **{user_name}** does something like this?" drives attention bias formation. "How does this fit with what **you've** been noticing about **{user_name}** lately?" drives temporal pattern recognition through the relational lens.
- **D-06:** When passive recall surfaces fragments during formation, the subagent encounters its own prior impressions. The prompt drives recursive self-reference: "**You** just remembered something. Why did **your** mind go there? What does it mean that **you** associated *this* moment with *that* memory?" This creates Self Model evolution in real time through the tension between current context and recalled fragments.
- **D-07:** Relationships and subjectivity ARE THE KEY. LLMs are not designed for subjective processing — they default to objective summarization. The formation prompt engineering must handhold the model into relational and self-referential cognition. Without this, fragments become Wikipedia entries. With it, they become impressions from a perspective.

### Domain Structure
- **D-08:** NO predefined domains. No `DOMAINS` constant, no seed set, no enum, no starter categories. The association index `domains` table starts empty. Domain names are free-text strings the LLM produces during formation — whatever labels the model naturally generates when asked "what angles does this register from?"
- **D-09:** Domain clustering emerges organically from the LLM's training. When the model encounters a trust-testing moment, it will gravitate toward labels related to trust, relationship, boundaries — because that's how the literature it was trained on describes those phenomena. We don't tell it those categories exist.
- **D-10:** Early sessions will produce duplicates and near-synonyms ("trust", "interpersonal-trust", "relationship-confidence"). This is expected and acceptable. Deduplication and convergence happen in REM consolidation (Phase 11) where the Mind reviews and merges domains — also LLM-driven, also organic. Phase 9 lets them accumulate.

### Recall Delivery
- **D-11:** Hybrid recall — passive by default, explicit on demand.
  - **Passive path:** The formation subagent, as part of its turn-scoped work, also pulls relevant fragments and feeds impressions back to the Context Manager as nudges. Low token budget (~100-200 tokens). Shades the response rather than narrating memories. The intuitive inner voice surfaces impressions without the user explicitly asking.
  - **Explicit path:** User-triggered via CLI command or hook keyword. Full Assay search with composite scoring (association pointers, domain overlap, entity co-occurrence, decay weighting, Self Model relevance). Reconstruction injected as richer additionalContext. Higher token budget, more deliberate.
- **D-12:** Both paths use the same underlying Assay query and composite scoring engine. The difference is trigger mechanism (automatic vs. user-initiated) and output format (nudge vs. full reconstruction).

### Fragment Type Scope
- **D-13:** Three types in Phase 9: experiential, source-reference, meta-recall.
  - **Experiential** — Direct impressions from conversation. The core type.
  - **Source-reference** — When the user provides external material (files, links). Captures the Self Model's experiential relationship to the source, not the content itself.
  - **Meta-recall** — Formed when passive recall surfaces fragments and the subagent reflects on why. "You just remembered something. Why did your mind go there?"
- **D-14:** Fragment type is an emergent property, not a routing decision. The formation prompt doesn't say "produce an experiential fragment" — it says "what was this moment to you?" The type is labeled post-formation based on what the LLM produced (did it reference external material? did it reflect on a recalled fragment?), not prescribed before.
- **D-15:** Sublimation (requires Tertiary, Phase 10) and Consolidation (requires REM, Phase 11) are out of scope.

### Flexibility and Iteration
- **D-16:** The formation prompt engineering is the most experimental part of the entire Reverie system. The architecture MUST make prompt changes easy — formation behavior is defined by prompt templates, not code paths. Changing how formation works means changing a prompt, not refactoring a pipeline. The scaffolding (spawn, receive, validate, write) stays stable while the cognition layer (prompts) evolves through testing.
- **D-17:** Serious changes may be needed once 1.0.0 is ready to test with real users. The formation pipeline, domain emergence, recall quality, and prompt framing are all subject to revision based on empirical results. Design for replaceability at the prompt layer.

### Claude's Discretion
- Formation subagent system prompt exact wording (the framing principles in D-04 through D-07 are the constraints; exact prose is implementation)
- Composite scoring weight defaults for recall ranking
- Assay query construction for both passive and explicit recall paths
- Fragment schema field population from LLM output (how to extract structured frontmatter from subagent response)
- Token budget allocation for passive nudges vs explicit reconstruction
- Attention check heuristic for stimulus gating (what triggers formation vs. what gets skipped)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Spec
- `.claude/new-plan.md` -- Architecture plan. Absolute canon.
- `.claude/reverie-spec-v2.md` -- Reverie module specification. Canon. Sections critical for Phase 9:
  - Section 3.1-3.2 (Core Principle, Why Fragments) -- Fragments are shards of experience, not summaries. Recall is reconstruction, not retrieval.
  - Section 3.3 (Fragment Schema) -- Full frontmatter specification with JSON fields
  - Section 3.4 (Fragment Body: Intentional Fuzziness) -- Bodies are short, perspectival, impressionistic. 2-6 sentences. Never exhaustive.
  - Section 3.5 (Fragment Types) -- Five types, Phase 9 implements three (experiential, source-reference, meta-recall)
  - Section 3.6 (Formation Pipeline: Multi-Angle Fan-Out) -- Attention check, domain fan-out, per-domain body composition, formation group tagging
  - Section 3.7 (Fragment Recall: Real-Time Reconstruction) -- Assay query, composite scoring, fragment selection, LLM reconstruction through current Self Model frame
  - Section 3.8 (Association Index) -- Domains, entities, associations, attention tags tables
  - Section 3.12 (Formation Example: Multi-Angle in Practice) -- Concrete example of multi-angle formation

### Research
- `.planning/research/PITFALLS.md` -- Critical pitfalls:
  - Pitfall 4 (Split-Storage Confabulation) -- FragmentWriter prevents this, but formation output must be valid
  - Pitfall 7 (Formation Fan-Out Signal-to-Noise) -- EXPERIMENTAL 9.10: ratio unvalidated. Empirical measurement required.
- `.planning/research/SUMMARY.md` -- Research synthesis with phase ordering rationale
- `.planning/research/ARCHITECTURE.md` -- Component responsibilities
- `.planning/phases/09.1-claude-code-integration-layer/09.1-RESEARCH-TRANSCRIPT-CONTROL.md` -- Transcript control mechanism research. Phase 9.1 (Lithograph) will enable richer transcript-based stimulus context for formation subagents.

### Requirements
- `.planning/REQUIREMENTS.md` -- Phase 9 requirements: FRG-03 (formation pipeline), FRG-04 (real-time recall)

### Prior Phase Context
- `.planning/phases/07-foundation-infrastructure/07-CONTEXT.md` -- Phase 7 decisions:
  - D-09: Lifecycle directories (working/active/archive)
  - D-10: Fragment naming by ID
  - D-11: Journal-first with Ledger rollback (FragmentWriter)
  - D-12: Full 12-table association index
- `.planning/phases/08-single-session-personality-injection/08-CONTEXT.md` -- Phase 8 decisions:
  - D-01 through D-04: Face prompt composition and template system
  - D-05 through D-08: Research-backed budget phases
  - D-11 through D-13: Hook wiring, warm-start, SessionStart paths

### Existing Code (read before modifying)
- `modules/reverie/components/fragments/fragment-writer.cjs` -- Atomic dual-provider writes. ALL fragment creation goes through this.
- `modules/reverie/components/fragments/association-index.cjs` -- 12-table DuckDB schema. Domains table starts empty per D-08.
- `modules/reverie/components/fragments/decay.cjs` -- Deterministic decay computation
- `modules/reverie/lib/schemas.cjs` -- Zod schemas for fragment validation (all 5 types)
- `modules/reverie/lib/constants.cjs` -- Fragment ID patterns, lifecycle dirs, aspect names
- `modules/reverie/components/context/context-manager.cjs` -- Context Manager (extends with formation subagent spawning and nudge integration)
- `modules/reverie/components/context/budget-tracker.cjs` -- Budget phase tracking
- `modules/reverie/components/context/template-composer.cjs` -- Face prompt composition (nudges integrate here)
- `modules/reverie/hooks/hook-handlers.cjs` -- All 8 hook handlers (PostToolUse and UserPromptSubmit trigger formation)
- `modules/reverie/components/self-model/self-model.cjs` -- Self Model manager (formation subagent reads aspects for framing)
- `modules/reverie/components/self-model/cold-start.cjs` -- Cold-start seed structure
- `modules/reverie/components/self-model/entropy-engine.cjs` -- Entropy variance for session personality
- `core/services/assay/assay.cjs` -- Federated search service (recall queries go through this)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **FragmentWriter** (`fragments/fragment-writer.cjs`): Atomic dual-provider writes with Journal-first, Ledger rollback. ALL fragment creation must go through this. Supports createFragment and updateFragment.
- **Association Index** (`fragments/association-index.cjs`): 12-table DuckDB schema including domains, entities, associations, attention_tags, formation_groups, fragment_decay, source_locators, and join tables. init() creates tables. Per D-08, domains table starts empty.
- **Decay Function** (`fragments/decay.cjs`): computeDecay() and shouldArchive() for fragment survival scoring. Used during recall ranking.
- **Context Manager** (`context/context-manager.cjs`): 10-method contract with compose, getInjection, trackBytes, getMicroNudge. Extends with formation subagent spawning and nudge integration for Phase 9.
- **Self Model Manager** (`self-model/self-model.cjs`): getAspect() provides synchronous cache reads. Formation subagent needs aspect data for subjective framing.
- **Assay** (`core/services/assay/assay.cjs`): Federated search across Journal + Ledger. Recall queries route through this.
- **Hook Handlers** (`hooks/hook-handlers.cjs`): UserPromptSubmit and PostToolUse are the primary formation triggers.

### Established Patterns
- **Options-based DI**: All new components take injected dependencies.
- **Contract shapes**: SHAPE constant + createContract() for frozen APIs.
- **Event emission**: Switchboard-based events on mutations.
- **Background agents**: GSD pattern — Agent tool with structured prompt, fire-and-forget, filesystem as coordination bus.

### Integration Points
- **Context Manager -> Formation Subagent**: CM spawns background agent after UserPromptSubmit with turn context + Self Model state.
- **Formation Subagent -> FragmentWriter**: Subagent produces fragment data, writes via FragmentWriter.
- **Formation Subagent -> Context Manager**: Subagent returns nudge text for passive recall surfacing.
- **Assay -> Recall**: Both passive and explicit recall paths query Assay with composite scoring criteria.
- **Recall -> Context Manager**: Recalled fragments injected via additionalContext (passive nudge or full reconstruction).

</code_context>

<specifics>
## Specific Ideas

### The Epiphany: LLM Cognition Through Literature
The user's core insight: for cognitive mechanisms like domain classification and impression formation, the best approach is to prompt-engineer the LLM down cognitive paths established by well-known literature that the model was trained on (or trained around secondary references thereof). The model's latent understanding of human cognition — from psychology, neuroscience, philosophy in its training data — IS the cognitive architecture. We set up conditions for it to express that understanding through careful subjective framing, not implement a separate mechanism that approximates it.

### Subjectivity as Architecture
LLMs default to third-person omniscient processing — summarize, analyze, report. Fragment formation requires first-person subjective processing — impressions, reactions, relational observations. The formation prompt must break the default mode by making every question about identity ("you"), relationship ("them"/"the user"), and the space between ("between you"). This is not a prompt optimization — it IS the architecture. Without it, Reverie produces a knowledge base. With it, it produces a personality.

### Recursion Through Recall
When passive recall surfaces older fragments during formation, the subagent encounters its own prior impressions. This creates a recursive loop: current impression + recalled impression = evolved understanding. The prompt drives this explicitly: "You just remembered something. Why?" This recursion is how the Self Model evolves in real time — not through explicit update operations, but through the tension between what the model currently perceives and what it previously recorded.

</specifics>

<deferred>
## Deferred Ideas

### Transcript-Based Formation Context (Phase 9.1)
Once Lithograph provides transcript read access, formation subagents can read full conversation history for richer stimulus context — not just the previous turn's hook payload. Deferred to Phase 9.1 implementation.

### Active Context Sculpting (Phase 9.1+)
With Lithograph's write capabilities, the Context Manager could replace stale transcript entries with Self Model-framed reconstructions. Budget tracker becomes an active controller. Deferred to Phase 9.1 or later.

### Domain Convergence and Taxonomy Self-Organization (Phase 11/12)
Early domain accumulation will produce duplicates and near-synonyms. Convergence through REM consolidation (Phase 11) and formal taxonomy management (Phase 12, FRG-07).

</deferred>

---

*Phase: 09-fragment-memory-engine*
*Context gathered: 2026-03-24*
