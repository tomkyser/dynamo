# Phase 9: Fragment Memory Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 09-fragment-memory-engine
**Areas discussed:** Formation without the Mind, Recall delivery to Primary, Initial domain structure, Fragment type scope

---

## Formation Without the Mind

| Option | Description | Selected |
|--------|-------------|----------|
| Deterministic pipeline | Heuristic attention check, pattern-matching domain fan-out, structured extraction body composition | |
| Simplified LLM evaluation | Inline evaluation during Primary session via additionalContext | |
| Background subagent (evolved) | Turn-scoped fire-and-forget agents processing previous turn | ✓ |

**User's choice:** Background subagent approach, but reframed as an intuitive inner voice — not a simplified Mind, but a different cognitive style entirely. ISFP/INFP (impressionistic, high-perception) vs the full Mind's INTJ/ENTJ (analytical, directive).

**Notes:** User drew the MBTI analogy to clarify the distinction. Single-session mode isn't a degraded Mind — it's a different cognitive personality. The face is guided by background nudges from subagents that pull fragments and shape context, rather than being actively directed by a strategic Mind. This design survives into Phase 10 as the base layer; the Mind adds the analytical layer on top.

**Evolution during discussion:** Originally considered three options (deterministic, inline LLM, deferred batch). User proposed the background subagent approach and reframed it as a cognitive style distinction, which became the final design.

---

## Recall Delivery to Primary

| Option | Description | Selected |
|--------|-------------|----------|
| Passive surfacing | Formation subagents pull fragments and feed nudges via Context Manager. User never explicitly asks. | |
| Explicit recall | User-triggered via CLI/command. Deliberate retrieval. | |
| Hybrid (passive + explicit) | Passive surfacing by default, explicit on demand | ✓ |

**User's choice:** Hybrid — "c"

**Notes:** Maps to two distinct paths in the recall engine: passive (low budget nudges, ~100-200 tokens, shades response) and explicit (full Assay search, composite scoring, richer reconstruction). Both use the same underlying query and scoring engine.

---

## Initial Domain Structure

| Option | Description | Selected |
|--------|-------------|----------|
| 3 domains from Self Model | identity, relational, cognitive — derived from Self Model's three aspects | |
| 4-5 seeded domains | Above plus experiential and technical/domain-specific | |
| No predefined domains | Empty domains table. LLM generates labels organically during formation. | ✓ |

**User's choice:** No predefined domains — explicitly go out of the way to not define any.

**Notes:** This is a foundational design decision connecting back to the user's epiphany about leveraging the LLM's probabilistic prediction as the cognitive mechanism itself. The model's training on psychology, philosophy, and neuroscience literature contains latent understanding of how human cognition categorizes experience. Rather than implementing a classification system, the formation prompt should coax the model into expressing that latent understanding organically. Domain labels are free-text strings the LLM produces; clustering emerges through repetition; convergence happens in REM (Phase 11). The user explicitly rejected any seed set, enum, or starter categories.

**User's framing:** "If we do this right, we need to prompt engineer the LLM to do it on its own. This traces back to my epiphany where it occurred to me that for things like this the best shot we have on paper is coaxing the LLM with what would prompt it down the paths and cognitive patterns established by well known literature on the subject."

---

## Fragment Type Scope for Phase 9

| Option | Description | Selected |
|--------|-------------|----------|
| Experiential only | Minimal scope, just direct impressions | |
| Experiential + source-reference + meta-recall | Three types that naturally emerge from the formation pipeline | ✓ |
| All 5 types | Full spec scope including sublimation and consolidation | |

**User's choice:** Three types, with the caveat that type is an emergent property, not a routing decision.

**Notes:** Fragment type is labeled post-formation based on what the LLM produced, not prescribed before formation. The prompt says "what was this moment to you?" and the output IS experiential. If it reflects on a recalled fragment, that IS meta-recall. Type classification is a tagging step, not a pipeline branch. User emphasized flexibility: "serious changes may be needed once 1.0.0 is ready to test."

---

## Subjective/Relational Prompt Engineering (Cross-Cutting)

This emerged organically during the domain structure discussion and became the most important design principle of the phase.

**User's direction:** Formation prompts must be framed around "you" and drive recursive self-reference. "What aspects of this moment are distinct to *you*?" should lead to the recursion of "you?" → "what does the user mean by 'you'?" → defining what it can about itself by synthesizing injected universal aspects with deeper fragment memories. The framing also drives conditioning: "...are distinct to the user {actual name}" forces relational processing.

**User's key statement:** "Relationships and subjectivity ARE THE KEY and because LLMs are not designed for that we have to really handhold them."

---

## Claude's Discretion

- Formation subagent system prompt exact wording
- Composite scoring weight defaults
- Assay query construction
- Fragment field population from LLM output
- Token budget allocation for nudges vs reconstruction
- Attention check stimulus gating heuristic

## Deferred Ideas

- Transcript-based formation context (Phase 9.1 — Lithograph)
- Active context sculpting (Phase 9.1+)
- Domain convergence (Phase 11 — REM)
- Taxonomy self-organization (Phase 12 — FRG-07)
