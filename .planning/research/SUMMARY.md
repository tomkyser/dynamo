# Project Research Summary

**Project:** Dynamo v1.0 M2 — Reverie Module
**Domain:** Cognitive memory system for Claude Code — persistent personality, fragment-based episodic memory, three-session architecture, REM consolidation
**Researched:** 2026-03-23
**Confidence:** MEDIUM (novel domain; 13 EXPERIMENTAL flags in spec; many components unvalidated at production scale)

---

## Executive Summary

Reverie is a genuinely novel system. There is no production analog that combines personality persistence, fragment-based episodic memory, continuous background processing, and multi-session cognitive architecture in a single Claude Code module. The closest approximations — Kindroid's dual-layer narrative memory, Google's Talker-Reasoner, SOFAI's fast/slow/meta split — each implement one or two of Reverie's pillars, not all of them together. This novelty is both the value proposition and the primary risk: there is no battle-tested playbook to follow.

The recommended approach is to build in strict dependency order, treating each phase as validation of assumptions before committing to the next. The Self Model and fragment schema must come first because every other component depends on them. Single-session personality injection should be validated before three-session orchestration is attempted. Three-session operation must be proven stable before sublimation and REM are added. The spec contains 13 experimental flags precisely because the interactions between these layers cannot be predicted — they must be measured. The build order must enforce this empirical discipline.

The top risks are not implementation complexity — they are architectural decisions with irreversible consequences. DuckDB single-writer coordination, the data format for fragment frontmatter (JSON vs YAML), the write coordinator's lack of retry logic, and the referential framing prompt's calibration between relational deference and technical autonomy are all decisions that, if wrong, require rewrites rather than patches. These must be resolved in early phases, not deferred to integration. Additionally, the three-session Claude Max resource constraint (EXPERIMENTAL 9.4) is a go/no-go gate: if Max subscription cannot sustain three concurrent Claude Code sessions reliably, Passive mode becomes the default and the Tertiary session becomes a v2 feature.

---

## Key Findings

### Recommended Stack

**From STACK.md — Overall confidence: HIGH**

The existing Dynamo platform stack is entirely sufficient for Reverie. The recommendation is zero new npm dependencies. Every Reverie capability maps onto existing platform services or can be built from Bun/Node built-ins. This is not a simplification — it is the correct architectural decision based on direct analysis of what each capability actually requires.

**Core technologies consumed by Reverie:**
- Wire (relay, channel, protocol, queue, write-coordinator): Inter-session communication infrastructure — validated in PoC with multi-session integration tests; urgency levels, subagent tool inheritance, and dual transport already built
- Journal (frontmatter.cjs + journal.cjs): Fragment storage and Self Model narrative state — the existing YAML frontmatter parser was designed for the Reverie fragment schema; however, the query() method only matches top-level fields, which is a gap requiring routing through Ledger/Assay for nested queries
- Ledger (DuckDB via @duckdb/node-api): Association index, Self Model structured state, decay tracking — the 12+ table association index is the most complex data structure in M2; all writes route through Wire's write coordinator
- Assay: Federated fragment retrieval across Journal + Ledger — the composite ranking approach (association scores + content matching + decay weighting + Self Model relevance) replaces vector embedding libraries
- Magnet, Conductor, Switchboard, Commutator, Lathe: All consumed as-is with no modifications needed beyond normal extension patterns

**Critical stack decisions:**
- Token counting: Character-based heuristic (Math.ceil(text.length / 4)) — official Anthropic tokenizer is documented as inaccurate for Claude 3+ models; API-based counting violates the no-API-below-SDK constraint; the 4-phase budget system uses wide enough boundaries that heuristic estimation is sufficient
- Prompt engineering: No library — XML tag structure, per-turn reinjection, referential framing, and adversarial defense are all pure prompt craft, with patterns verified against official Anthropic documentation

**Platform enhancements needed (not new dependencies):**
- Wire write coordinator: Add retry logic with exponential backoff and write-ahead journaling; current implementation drops failed writes silently
- Commutator: Hook systemMessage injection for UserPromptSubmit and PreCompact output paths
- Assay: Verify nested frontmatter query routing works for fragment retrieval patterns Reverie requires

### Expected Features

**From FEATURES.md — Overall confidence: MEDIUM**

Features are classified across six capability domains: Self Model, Fragment Memory Engine, Three-Session Architecture, Context Management, REM Consolidation, and Operational Modes.

**Must have (table stakes — system does not function without these):**
- Persistent Self Model state (SM-01): Journal narrative + Ledger structured weights + Magnet in-memory cache; the #1 user complaint across all companion AI is losing personality between sessions
- Identity Core with stable traits (SM-02): Changes only through REM, never during active sessions; slow change is the design
- Fragment schema with structured headers and fuzzy bodies (FRG-01): The interface contract for the entire memory system; must be strict enough for indexing, loose enough for impressionistic bodies
- Association index in Ledger (FRG-05): ~12 DuckDB tables; the retrieval infrastructure without which recall devolves to full-text search against impressionistic text
- Deterministic decay function (FRG-06): No LLM involved; purely computational Ebbinghaus-based forgetting; prevents unbounded fragment store growth
- Wire-based inter-session communication with urgency levels (SES-04): Already built and validated; background/active/directive/urgent levels already implemented in Wire
- Continuous Self Model reinjection on every UserPromptSubmit (CTX-01): Validated pattern from Claude-Mem (45ms p95 hook execution); without this, personality decays as context fills
- Tier 1 triage on compaction events (REM-01): Fast filesystem writes of working state on PreCompact hook; cheapest and most critical REM tier
- Tier 3 full REM on session end (REM-03): Nothing enters long-term storage without passing through REM (spec REM-07)
- Hook wiring for all 8 Claude Code hook types (INT-01): The entire Reverie integration surface

**Should have (differentiators — where Reverie is genuinely novel):**
- Three-aspect model: Face/Mind/Subconscious (SM-01): No existing system separates personality into presentation, cognition, and subliminal aspects; this architectural split prevents the "hollow empathy" uncanny valley
- Multi-angle formation fan-out (FRG-03): 1-3 fragments per stimulus from different Self Model angles; no other memory system does this; HIGH RISK if signal-to-noise ratio is poor
- Reconstruction-based recall, not retrieval (FRG-04): Fragments synthesized through current Self Model frame; this is how human memory actually works (Bartlett 1932); HIGH RISK if fragment selection quality is poor
- Referential framing prompt (CTX-02): Primary treats its context as reference material subordinate to Self Model directives; most technically challenging prompt engineering in the system; EXPERIMENTAL
- Self-organizing taxonomy (FRG-07): Domains emerge from fragment accumulation, refined during REM; requires multiple sessions to become meaningful
- Tier 2 provisional REM on idle timeout (REM-02): Speculative consolidation when user walks away; covers ambiguous session endings that never get Tier 3
- Self Model conditioning update during REM (REM-06): How the Self Model evolves; accumulates gradually across sessions

**Defer to v2:**
- Emotional/affective modeling (ADV-01): Spec marks as DEFERRED (9.12)
- Cross-domain interpolation / "Nehalem problem" (ADV-02): Parked for empirical exploration (9.13)
- Memory backfill from historical transcripts (ADV-03): Enriches but not required for initial operation
- Subagent delegation from Secondary/Tertiary (SES-06): Can be added once base three-session architecture is stable

**Anti-features — do not build these:**
- Pre-programmed emotional responses: Creates "hollow empathy" uncanny valley (Replika 2023-2025 user revolt)
- Verbatim transcript storage alongside fragments: Context pollution, defeats the fragment philosophy
- LLM importance scoring per memory: Prohibitive cost at formation rates; use deterministic scoring instead
- Graph database for associations: Explicitly replaced in rewrite; DuckDB relational tables are sufficient
- Vector embedding similarity as sole retrieval mechanism: Misses structural and temporal relationships; adds massive dependency
- Nested JSON structures in hook payloads: Claude Code issue #17804 (closed "Not Planned") triggers false positive injection detection

### Architecture Approach

**From ARCHITECTURE.md — Overall confidence: HIGH (based on direct source code analysis of all platform services)**

Reverie integrates with the Dynamo platform through Circuit's Module API — a single manifest declaration and registerFn callback. Internal components communicate through direct function calls orchestrated by the Session Manager, not through Switchboard (which is platform-level only). The options-based DI pattern validated in v0 applies throughout: each component receives exactly what it needs as constructor arguments, enabling unit testing with mocks and integration testing with real platform facades.

**Major components and their responsibilities:**
1. Self Model Manager: Load/save/version Identity Core, Relational Model, and Conditioning state; reads on boot from Journal + Ledger, writes only through REM, continuous Magnet cache during sessions
2. Fragment Engine: Formation pipeline (attention check gate -> domain fan-out -> per-domain composition), recall orchestration (Assay query -> composite ranking -> LLM reconstruction in Secondary), and the association-index abstraction over Ledger's 12+ tables
3. Session Manager: Three-session lifecycle orchestrator; spawns Secondary and Tertiary via Bun.spawn (not Conductor, which owns infrastructure ops); enforces Primary <-> Secondary <-> Tertiary topology; handles health monitoring via wire:session-lost events
4. REM Consolidator: Three-tier dispatch (Tier 1 on PreCompact, Tier 2 on idle timeout, Tier 3 on Stop); retroactive evaluation, meta-fragment creation, editorial pass, conditioning update, fragment promotion from working/ to active/
5. Context Manager: UserPromptSubmit hook handler; reads pre-prepared state file written by Secondary; budget phase determination (1-4); referential framing prompt composition; outputs via Commutator registerOutput pattern
6. Mode Manager: Four-mode state machine (Active/Passive/REM/Dormant); transitions driven by lifecycle hooks and resource detection at startup

**Key architectural constraints resolved by research:**
- DuckDB single-writer constraint: Satisfied by design — Secondary is the sole Ledger writer; Primary and Tertiary never write to Ledger; subagent writes route through the same Wire write coordinator queue
- Journal write contention: Non-issue by design — each fragment gets a unique file path; session-scoped working directories prevent collision; atomic Bun.write semantics
- Session spawning: Belongs in Session Manager using Bun.spawn, not Conductor (Conductor's domain is Docker/infrastructure, not Claude Code sessions)
- Hook systemMessage injection: Context Manager reads a state file written by Secondary between turns; the hook cannot do real-time Wire queries (synchronous constraint)

### Critical Pitfalls

**From PITFALLS.md — Overall confidence: HIGH for critical pitfalls; MEDIUM for moderate/minor**

**Top pitfalls with architectural consequences:**

1. **Write coordinator lacks retry logic (Pitfall 1)** — Wire's write-coordinator.cjs drops failed DuckDB writes silently (emit write:failed and move on). During burst formation events (multi-domain fan-out + sublimation cycle firing simultaneously), writes can fail and the association index silently diverges from Journal fragments. Prevention: redesign write coordinator with exponential backoff retry + write-ahead journaling + batch window instead of 10ms polling loop. Must be resolved before any Reverie code writes to Ledger.

2. **Memory confabulation from split-storage inconsistency (Pitfall 4)** — Journal (filesystem) and Ledger (DuckDB) have no cross-system transactional guarantees. A fragment pruned in Journal but whose Ledger entries survive will produce confabulated recall — the LLM interpolates plausible but fictional memories from orphaned association metadata. Prevention: soft-delete (move to archive/, never hard-delete), FragmentWriter abstraction that treats Journal + Ledger writes as a logical unit with rollback, consistency audit during every REM cycle.

3. **JSON vs YAML frontmatter decision (Pitfall 15)** — Bun has no built-in YAML parser. The architecture specifies JSON for structured data. Using YAML frontmatter requires a parser that handles 20+ fields including nested objects. The platform constraint points to JSON. This decision is irreversible once fragments are written. Prevention: use JSON frontmatter, not YAML, aligning with the platform data format convention.

4. **Personality prompt erosion (Pitfall 2)** — At 50K+ tokens of tool output, a 1,200 token Self Model injection represents less than 2.5% of context. Personality directives drown in raw material. The spec's "minimal injection at 75-90% utilization" is counter-productive — injection should get larger, not smaller, as context pressure increases. Also: start compression at 30% utilization (not 50%), because the threat is the ratio of raw material to Self Model framing, not total token count.

5. **Compaction destroys Self Model frame (Pitfall 5)** — Research documents 46% constraint retention after compaction. The PreCompact hook's framing injection is a suggestion to the model, not a guarantee. Post-compaction recovery requires: robust Tier 1 triage (full Face prompt checkpointed to Journal), post-compaction full reinjection on the next UserPromptSubmit, and proactive compaction at 70% utilization (before auto-compaction at 83.5% takes over).

6. **Session startup latency (Pitfall 6)** — Cold-start sequence (Wire -> spawn Secondary -> load Self Model -> compose Face prompt -> send to Primary) takes 3-6 seconds. The user's first turn has no personality injection. Prevention: persist the final Face prompt from each session to a known file path; inject from this cache on SessionStart hook before Secondary is ready; start sessions in parallel; use Passive mode as startup fallback.

---

## Implications for Roadmap

Based on combined research, the FEATURES.md dependency graph and MVP recommendation map onto six phases. Phases are ordered by hard dependencies, risk gate logic, and the principle that experimental components must be validated before dependent components are built on top of them.

### Phase 1: Foundation Infrastructure

**Rationale:** Two critical architectural decisions must be resolved before any Reverie feature is built: the frontmatter data format (JSON, not YAML) and the write coordinator's data integrity guarantees. Building on a write coordinator that drops data silently, or a frontmatter parser that breaks on edge cases, means every subsequent phase inherits corrupted foundations. This phase also builds the FragmentWriter abstraction (the Journal + Ledger atomic unit) and the Self Model data schema — the gravitational center that every other component references.

**Delivers:** Wire write coordinator with retry logic + write-ahead journaling; JSON frontmatter decision validated; fragment schema (zod-validated); Self Model state schema; FragmentWriter abstraction; association index table definitions in Ledger; decay function (deterministic, no LLM); cold start initialization.

**Addresses features:** FRG-01 (fragment schema), FRG-05 (association index), FRG-06 (decay), SM-01/02/03/05 (Self Model foundation), FRG-02 (fragment types).

**Avoids pitfalls:** Pitfall 1 (write coordinator data loss), Pitfall 4 (confabulation from split-storage), Pitfall 15 (YAML parsing fragility), Pitfall 16 (IoC registration order — two-phase boot validated here).

**Research flag:** STANDARD PATTERNS. The write coordinator enhancement and schema definitions are well-specified in research. No additional research-phase needed.

---

### Phase 2: Single-Session Personality Injection

**Rationale:** Before adding the complexity of three-session orchestration, validate that the core personality injection mechanism actually works — that continuous Self Model reinjection via UserPromptSubmit hooks produces measurable personality persistence across turns at different context utilization levels. This is the empirical validation gate. If personality injection fails or degrades unacceptably, the entire architecture needs rethinking before three sessions are added on top.

**Delivers:** UserPromptSubmit hook handler with state file read and systemMessage injection; 4-phase context budget manager; in-memory state cache (no per-hook file reads); hook latency instrumentation; personality persistence test harness that measures expression markers at turns 5, 20, 50, 100; PreToolUse selective gating (skip read-only tools); warm-start face prompt cache from prior session.

**Addresses features:** CTX-01 (continuous reinjection), CTX-03 (budget management), INT-01 (hook wiring for UserPromptSubmit and PreToolUse).

**Avoids pitfalls:** Pitfall 2 (personality erosion — injection sizing strategy decided here), Pitfall 6 (startup latency — warm cache built here), Pitfall 11 (hook latency — in-memory cache and selective gating implemented here).

**Research flag:** STANDARD PATTERNS for hook wiring and state file pattern (validated by Claude-Mem). NEEDS RESEARCH on the injection size at high context utilization — PITFALLS research contradicts the spec's "minimal injection at 75-90%"; this needs empirical measurement in this phase before Phase 4 is designed.

---

### Phase 3: Fragment Memory Engine (Single Session)

**Rationale:** Fragment formation and recall in a single-session context validates the memory system independently of multi-session orchestration. Secondary session not yet involved — this phase runs all formation and recall logic from the Primary session's hook handlers, routing through Assay to the Journal + Ledger backends established in Phase 1. The multi-angle formation fan-out signal-to-noise ratio must be measured here before it is exposed to Secondary's processing load.

**Delivers:** Formation pipeline (attention check gate, domain fan-out, per-domain body composition); association index writes through FragmentWriter abstraction; Assay-based recall with composite ranking (attention pointer, domain overlap, entity co-occurrence, decay weighting, Self Model relevance); recall reconstruction in the Primary session (LLM operation); working memory directory management; PostToolUse batch notification (not per-tool-call); fragment formation rate metrics.

**Addresses features:** FRG-03 (multi-angle formation), FRG-04 (recall via Assay), FRG-05 (association index population), INT-01 (PostToolUse, PreCompact, Stop hook wiring).

**Avoids pitfalls:** Pitfall 8 (sublimation message volume — design patterns set here), Pitfall 9 (fragment growth — budget per session and meta-recall selectivity decided here), Pitfall 12 (Switchboard event storm — event coalescing and error boundaries implemented here).

**Research flag:** NEEDS RESEARCH. Formation fan-out signal-to-noise ratio (EXPERIMENTAL 9.10) and recall reconstruction quality (EXPERIMENTAL 9.8) have no validated production references. Requires empirical measurement during this phase before Phase 4 is planned in detail.

---

### Phase 4: Three-Session Architecture

**Rationale:** The three-session architecture is the highest architectural risk in M2 (Channels API research preview, resource consumption unknown, coordination overhead real). It should be built only after single-session memory is validated. The Session Manager's session spawning via Bun.spawn, Wire topology enforcement, urgency-level message dispatch, and startup sequence optimization are all built here. The Tertiary session's resource consumption must be validated against Claude Max subscription limits (EXPERIMENTAL 9.4) — if it fails, Passive mode becomes the default and the roadmap adjusts.

**Delivers:** Session Manager with Bun.spawn for Secondary and Tertiary; Wire topology enforcement (Primary <-> Secondary <-> Tertiary only); parallel session startup; priority-aware subscriber dispatch in Wire; sublimation batching (one message per cycle, not per candidate); adaptive sublimation cycle frequency; Channels API meta key validation; ACK protocol for critical message types (context-injection, directive); Self Model state checkpoint every 5 turns; Passive mode as startup and fallback; resource consumption measurement harness.

**Addresses features:** SES-01/02/03/04 (three-session architecture), OPS-01/02 (Active and Passive modes), CTX-02 (referential framing — built in Secondary and injected via Context Manager).

**Avoids pitfalls:** Pitfall 3 (Channels API instability and message loss), Pitfall 6 (startup latency — parallel spawn and warm cache), Pitfall 8 (sublimation overwhelms Wire), Pitfall 10 (referential framing breaks technical tasks — dual-mode framing built here).

**Research flag:** NEEDS RESEARCH. The Channels API contract stability, Claude Max concurrent session resource limits, and referential framing calibration are all areas where documented uncertainty requires additional investigation before building.

---

### Phase 5: REM Consolidation

**Rationale:** Consolidation depends on a working fragment store (Phase 3), a functioning three-session architecture (Phase 4), and accurate association index data. Building REM on top of a stable foundation means the editorial pass operates on real accumulated data, not synthetic test data. Tier 1 triage must be built alongside the compaction handling work (partially initiated in Phase 2), but Tier 2 and Tier 3 are Phase 5 work.

**Delivers:** REM Consolidator orchestrator with three-tier dispatch; Tier 1 triage (fast state preservation on PreCompact); Tier 2 provisional REM on idle timeout; Tier 3 full REM on session end (retroactive evaluation, meta-fragment creation, sublimation triage, association index editorial pass, conditioning update, fragment promotion from working/ to active/); working memory cleanup; fragment budget enforcement per session; REM time-boxing (120 second cap for Tier 3); consistency audit (Journal-Ledger reconciliation); Self Model conditioning update with trait floor constraints.

**Addresses features:** REM-01/02/03/04/05/06/07 (all consolidation tiers), SM-04 (conditioning), OPS-03/04 (REM mode, Dormant mode).

**Avoids pitfalls:** Pitfall 5 (compaction destroys Self Model frame — Tier 1 robustness and post-compaction full reinjection), Pitfall 7 (taxonomy unbounded growth — hard caps and archive strategy), Pitfall 9 (REM creates more fragments than it removes — budget enforcement), Pitfall 13 (trait collapse — trait floor constraints in conditioning update).

**Research flag:** STANDARD PATTERNS for Tier 1 and Tier 3 (spec is explicit). NEEDS RESEARCH on decay constant tuning (EXPERIMENTAL 9.3) and conditioning update calibration (EXPERIMENTAL 9.6). Recommend building a simulation harness for decay before live deployment.

---

### Phase 6: Integration Surface and Operational Modes

**Rationale:** CLI surface, submodule management, self-organizing taxonomy, source-reference model, and subagent delegation are all additive capabilities on top of a working system. They should be built last, when the core architecture is stable enough that the integration surface has something reliable to expose.

**Delivers:** Operational mode state machine (Active/Passive/REM/Dormant with automatic transitions); CLI commands via Pulley (reverie status, reverie inspect, reverie history); self-organizing taxonomy with hard caps (100 domains max, 200 entities per domain, 10K association edges); source-reference model (experiential relationship storage, not direct file indexing); submodule install/update via Forge + Relay; materialized views for sublimation query performance.

**Addresses features:** OPS-01/02/03/04 (all operational modes), INT-02/03 (CLI and submodule), FRG-07 (self-organizing taxonomy), FRG-08 (source-reference), SES-06 (subagent delegation).

**Avoids pitfalls:** Pitfall 7 (taxonomy growth — caps and archive built here), Pitfall 14 (subagent depth limit — 3 concurrent max enforced here).

**Research flag:** STANDARD PATTERNS for CLI and submodule integration. NEEDS RESEARCH on self-organizing taxonomy convergence (EXPERIMENTAL 9.6) — may require user feedback loop analysis from Phase 5 data.

---

### Phase Ordering Rationale

- Phases 1-2 first: Foundation integrity and single-session validation are prerequisites for everything. Building multi-session orchestration on top of a write coordinator that drops data silently would produce undebuggable failures.
- Phase 3 before Phase 4: Formation and recall must prove signal quality in single-session context before the complexity of inter-session communication is added. The fan-out signal-to-noise ratio is the critical unknown.
- Phase 4 as risk gate: Three-session resource consumption on Claude Max (EXPERIMENTAL 9.4) is a go/no-go decision. If Passive mode becomes the default, Phase 5 and Phase 6 adjust accordingly (Tertiary-dependent features defer to v2).
- Phase 5 after validated data: REM consolidation editing real accumulated fragments produces qualitatively different results than editing synthetic data. Phase 4 must run long enough to generate meaningful fragments before Phase 5 is built.
- Phase 6 last: Operational modes, CLI, and taxonomy can only be specified precisely once the behaviors they expose are stable.

---

### Research Flags

**Needs research-phase during planning:**
- Phase 3: Formation fan-out signal-to-noise ratio (EXPERIMENTAL 9.10); recall reconstruction quality (EXPERIMENTAL 9.8)
- Phase 4: Channels API contract stability; Claude Max concurrent session limits; referential framing dual-mode calibration (EXPERIMENTAL 9.9)
- Phase 5: Decay constant tuning (EXPERIMENTAL 9.3); conditioning update calibration; REM time-boxing thresholds

**Standard patterns (skip research-phase):**
- Phase 1: Write coordinator design, schema definition, zod validation — all well-specified in research
- Phase 2: Hook wiring, state file pattern — validated by Claude-Mem production system
- Phase 6: CLI integration, submodule management — established Dynamo patterns

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies confirmed by comprehensive analysis. Existing stack validated against all six capability areas. The only uncertainty is DuckDB/Bun version compatibility (already documented with known working versions). |
| Features | MEDIUM | Table stakes are well-specified. Differentiators are architecturally sound but experimentally unvalidated. 13 EXPERIMENTAL flags in the spec reflect honest uncertainty about novel combinations. The MVP phasing recommendation in FEATURES.md is trustworthy. |
| Architecture | HIGH | Based on direct source code analysis of all platform services. Wire message types already defined for Reverie use cases. Component boundaries are clear. Session spawning approach (Session Manager via Bun.spawn, not Conductor) is the key clarification this research surfaced. |
| Pitfalls | HIGH (critical) / MEDIUM (moderate) | Critical pitfalls (write coordinator, confabulation, YAML fragility, compaction) are grounded in documented behaviors and code analysis. Moderate pitfalls (taxonomy growth, sublimation volume) are architectural projections that need measurement during implementation. |

**Overall confidence:** MEDIUM

This is the correct confidence level for a novel system. The platform layer (Dynamo M1) is HIGH confidence. The Reverie module's integration patterns are HIGH confidence. The cognitive architecture interactions — how personality injection, fragment formation, sublimation, and REM interact at scale over many sessions — are genuinely EXPERIMENTAL. The roadmap must treat Phases 3-5 as discovery phases, not delivery phases.

### Gaps to Address

- **Decay constant tuning (EXPERIMENTAL 9.3):** Research recommends a simulation harness to generate synthetic fragment histories and visualize survival curves before live deployment. This should be built in Phase 5 planning, not discovered during production use.
- **Three-session Claude Max resource consumption (EXPERIMENTAL 9.4):** No documented data on how much rate limit three concurrent Claude Code sessions consume on a Max subscription. Must be measured in Phase 4. Passive mode specification must be completed (what exactly does "lightweight Secondary" mean?) before Phase 4 starts.
- **Referential framing calibration (EXPERIMENTAL 9.9):** The boundary between "relational deference" and "technical autonomy" cannot be specified in advance — it must be discovered empirically. Phase 4 must include test scenarios where the technically correct answer conflicts with relational directives.
- **Sublimation cycle economics (EXPERIMENTAL 9.1/9.2):** The 5-10 second cycle frequency and formation rate thresholds are guesses. Recommend starting at 15-second cycle frequency and measuring actual query latency against real data before reducing to 5 seconds.
- **Personality injection size at high context utilization:** PITFALLS research argues that injection should get larger at 75-90% utilization, not smaller (as the spec specifies). This contradiction must be resolved empirically in Phase 2's test harness before Phase 4 is designed.

---

## Sources

### Primary (HIGH confidence)
- Dynamo v0 archive (`archive/v0-pre-rewrite`) — validated patterns: options-based DI, test isolation, CJS throughout, zero npm deps for core
- Channels PoC (`~/dev/cc-channels-poc/`) — validated Wire relay + MCP channel server on Bun; multi-session integration tests
- Reverie spec v2 (`reverie-spec-v2.md`) — canonical fragment schema, Self Model structure, session architecture, 13 EXPERIMENTAL flags
- Journal `frontmatter.cjs` + `journal.cjs` source code — verified parser capabilities and query method limitations
- Wire `write-coordinator.cjs` source code — verified lack of retry logic
- Circuit `circuit.cjs` + `event-proxy.cjs` — verified module API constraints and dependency declaration requirements
- [Anthropic Prompting Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) — XML tags, role prompting, long context, agentic patterns
- [Claude Code Channels Reference](https://code.claude.com/docs/en/channels-reference) — channel contract, meta key naming, notification format, delivery semantics
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) — hook execution model, return formats, timing constraints
- [DuckDB Concurrency Documentation](https://duckdb.org/docs/stable/connect/concurrency) — single-writer constraint, multi-process access rules
- [Anthropic Token Counting docs](https://platform.claude.com/docs/en/build-with-claude/token-counting) — confirms no accurate local tokenizer for Claude 3+
- [Claude Code Issue #17804](https://github.com/anthropics/claude-code/issues/17804) — UserPromptSubmit false positive injection detection, closed "Not Planned"
- [Stanford Generative Agents (Park et al., 2023)](https://arxiv.org/abs/2304.03442) — reflection, importance scoring, memory retrieval
- [Mem0: Production-Ready Long-Term Memory](https://arxiv.org/abs/2504.19413) — extraction vs full-context tradeoffs, benchmark results
- [Talker-Reasoner Architecture (Google, 2025)](https://arxiv.org/html/2410.08328v1) — System 1/System 2 dual agent, shared memory coordination
- [Lost in the Middle (Liu et al.)](https://cs.stanford.edu/~nfliu/papers/lost-in-the-middle.arxiv2023.pdf) — U-shaped attention pattern
- [Fast, slow, and metacognitive thinking in AI (SOFAI)](https://www.nature.com/articles/s44387-025-00027-5) — three-layer cognitive architecture
- [Multi-agent coordination overhead (ICLR 2025)](https://openreview.net/pdf?id=0iLbiYYIpC) — latency scaling, error cascading
- [Claude-Mem hooks architecture](https://docs.claude-mem.ai/hooks-architecture) — production hook-based memory system, 45ms p95 hook execution validated
- [Facts as First-Class Objects](https://arxiv.org/html/2603.17781v1) — compaction destroys 60% of facts; 46% constraint retention post-compaction

### Secondary (MEDIUM confidence)
- [Kindroid dual-layer memory architecture](https://aiinsightsnews.net/character-ai-vs-kindroid-vs-nomi/) — cascaded + key memories comparison
- [Meganova: Memory Systems in AI Characters](https://blog.meganova.ai/memory-systems-in-ai-characters-what-actually-works/) — what works vs fails in production
- [Claude Code Agent Teams docs](https://code.claude.com/docs/en/agent-teams) — concurrent session management, rate limit implications
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) — v1.27.x stable, Bun support confirmed
- [DuckDB Node.js Neo client docs](https://duckdb.org/docs/stable/clients/node_neo/overview) — @duckdb/node-api usage

### Tertiary (LOW confidence — needs validation)
- Red Teaming LLMs multi-turn safety degradation claim (15 turns to guardrail erosion) — single paper, unverified for this architecture
- Deeply Contextualized Persona Prompting (<10% variance ceiling) — methodology needs review for applicability to Reverie's approach
- Taxonomy convergence estimates — projected from architecture, not observed data

---

*Research completed: 2026-03-23*
*Ready for roadmap: yes*
