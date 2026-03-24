# Phase 11: REM Consolidation - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the three-tier consolidation pipeline that gates all fragment promotion from working memory to long-term storage, evolves the Self Model through conditioning updates, and maintains association index integrity. This phase delivers: Tier 1 triage on compaction events (REM-01), Tier 2 provisional REM on idle timeout via heartbeat (REM-02), Tier 3 full REM on session end (REM-03), retroactive evaluation of session fragments (REM-04), association index editorial pass with LLM-driven domain dedup (REM-05), Self Model conditioning updates with EMA accumulation and trait floors (REM-06, SM-04), working-to-long-term memory gate (REM-07), and REM + Dormant operational modes (OPS-03, OPS-04).

</domain>

<decisions>
## Implementation Decisions

### Tiered Trigger Model
- **D-01:** Tier 1 triage on PreCompact events snapshots Mind state only — attention pointer, completed fragments in working/, active sublimation candidates, Self Model prompt state. No tracking of in-flight formation subagents. Formation subagents are fire-and-forget; their output lands in working/ whenever they finish. Keeps Tier 1 fast and synchronous (filesystem writes only, no LLM calls per spec §5.2).
- **D-02:** Tier 2 provisional REM triggers via heartbeat-based detection. Primary sends periodic heartbeats to Secondary via Wire. When heartbeats stop, Secondary initiates Tier 2. This distinguishes dead sessions (heartbeat stops but session process still exists) from idle users (heartbeat continues but no hook events) from genuine session end (Stop hook fires). More robust than simple inactivity timers.
- **D-03:** If user returns mid-Tier-2 (heartbeats resume or new hook events arrive), abort and revert. Cancel provisional REM immediately, discard all tentative promotions, fragments stay in working/. Session continues as if Tier 2 never started. Clean state over partial consolidation.
- **D-04:** Tier 2 auto-promotes on completion. Once provisional REM finishes processing, results ARE the consolidation — no separate promotion step, no second timer. If user returns after Tier 2 completes, they get a fresh session that benefits from consolidated state.
- **D-05:** Tier 3 full REM triggers on explicit session end (Stop hook). No time pressure. Deep editorial pass with complete session arc available. Per spec §5.2.

### REM Editorial Pipeline
- **D-06:** Retroactive evaluation is LLM-driven. Mind (Secondary) re-reads all session fragments with full session summary context. LLM judgment updates relevance scores, adds retroactive attention tags, adjusts pointers. This matches the spec's editorial philosophy — REM is creative, not mechanical. The Mind evaluates fragments against the *completed session arc*, not the context at formation time.
- **D-07:** Fragment promotion gate: promote or discard. REM either promotes fragments from working/ to active/ (with updated headers reflecting full session context) or discards them entirely (delete from Journal, remove Ledger index rows). No archive path for REM-rejected fragments. Clean separation: if REM doesn't endorse it, it never existed in long-term storage. Matches spec §5.4: "fragments that don't survive REM are discarded."
- **D-08:** Association index editorial pass is LLM-driven. Mind reviews domain pairs with high entity overlap or semantic similarity for merge decisions. LLM decides: merge, keep separate, or flag for later. Merged domains update all fragment pointers in Ledger. Matches the organic philosophy — dedup is editorial judgment, not string matching. Also covers: entity dedup, association weight updates (used associations strengthen, unused weaken), domain boundary review, taxonomy narrative updates in Journal.
- **D-09:** Recall meta-fragment creation during REM. Every recall event from the session becomes a meta-recall fragment with full context: which fragments were composed, reconstruction output, conversational trigger, whether Primary incorporated the recall product.

### Claude's Discretion — REM Pipeline
- Sublimation triage cap and criteria: Claude decides how many contributing sublimations become sublimation fragments per session and the signal-to-noise evaluation criteria. The constraint is: signal/noise ratio per domain must update Conditioning's sublimation sensitivity thresholds.

### Conditioning Updates (SM-04)
- **D-10:** Conditioning fields update via exponential moving average (EMA) with configurable alpha (e.g., 0.1-0.3). Each session's evidence contributes proportionally but never dominates. After ~5-10 sessions, trends emerge naturally. Single anomalous sessions wash out without special handling. Applies to: attention biases, recall strategy scores, sublimation sensitivity, error history entries.
- **D-11:** Identity Core has hard floors — personality traits, value orientations, and communication style can shift within a bounded range but never zero out or invert. Conditioning (attention biases, recall strategies) can move freely. Relational Model shifts organically. This preserves the "who" while letting the "how" evolve. Identity Core changes require sustained evidence across multiple consolidation cycles (per spec §5.3: "rarely updated, only when REM detects a sustained pattern across multiple sessions").
- **D-12:** Entropy engine session quality evaluation uses both behavioral signals and LLM reflection. Behavioral signals: user engagement patterns (turn length, response speed, session duration), recall product usage, directive compliance rate, absence of friction signals. LLM reflection: Mind reflects on session quality and mood-state effectiveness as part of REM. Both feed into entropy distribution adjustment. The entropy becomes personalized through accumulated experience (per Phase 7 D-08: conditioned entropy).

### REM + Dormant Modes (OPS-03, OPS-04)
- **D-13:** REM mode uses in-process Secondary. Stop hook triggers Session Manager to terminate Tertiary, then Primary's session ends naturally. Secondary stays alive and runs REM in-process — it's already a full Claude Code session with LLM capabilities. When REM completes, Secondary terminates itself. No new session spawn needed, no state serialization to disk for handoff.
- **D-14:** Dormant mode decay maintenance — Claude's discretion. Constraint: decay must eventually happen, mechanism should be practical for a Claude Code Max user. Options include SessionStart-triggered catch-up (retroactive computation produces same result since decay is time-based) or lightweight scheduled process.
- **D-15:** Mode Manager transitions: sequential with crash fallback. Normal path: Active → REM (always, on session end) → Dormant. Passive → REM → Dormant follows same chain. No skipping REM — enforces REM-07 (nothing enters long-term storage without REM). Crash fallback: if Secondary dies unexpectedly, next SessionStart detects orphaned working/ fragments and runs a recovery REM before normal startup.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Spec
- `.claude/new-plan.md` — Architecture plan. Absolute canon.
- `.claude/reverie-spec-v2.md` — Reverie module specification. Canon. Sections critical for Phase 11:
  - Section 5.1 (The Biological Analog) — REM philosophy: editorial, not archival
  - Section 5.2 (Three Consolidation Tiers) — Tier 1 triage, Tier 2 provisional, Tier 3 full REM
  - Section 5.3 (REM Operations) — Retroactive evaluation, recall meta-fragments, sublimation triage, association index update, Self Model conditioning update, identity core review
  - Section 5.4 (Working Memory → Long-Term Memory Gate) — Working vs consolidated memory, REM as the gate
  - Section 7.3 (REM Mode) — Post-session, Secondary only, no latency pressure
  - Section 7.4 (Dormant Mode) — No active sessions, scheduled decay maintenance
  - Section 9.3 (EXPERIMENTAL: Decay function parameters) — Tuning needed for base_decay_rate, consolidation_protection, access_weight
  - Section 9.6 (EXPERIMENTAL: Taxonomy convergence) — Self-organizing taxonomy convergence signal (informs REM domain dedup)
  - Section 9.10 (EXPERIMENTAL: Multi-angle formation noise ratio) — Survival rates inform sublimation triage signal/noise

### Research
- `.planning/research/PITFALLS.md` — Critical pitfalls affecting Phase 11:
  - Pitfall 4 (Split-Storage Confabulation) — Fragment promotion must maintain Journal+Ledger consistency
  - Pitfall 7 (Formation Fan-Out Signal-to-Noise) — REM sublimation triage addresses this
- `.planning/research/SUMMARY.md` — Research synthesis with phase ordering rationale

### Requirements
- `.planning/REQUIREMENTS.md` — Phase 11 requirements: REM-01 through REM-07, SM-04, OPS-03, OPS-04

### Prior Phase Context
- `.planning/phases/07-foundation-infrastructure/07-CONTEXT.md` — Phase 7 decisions:
  - D-08: Conditioned entropy evolves through REM (entropy engine feedback loop)
  - D-09: Fragment lifecycle directories (working/active/archive) — REM promotes working/ → active/
  - D-11: Journal-first with Ledger rollback (FragmentWriter) — promotion uses same pattern
  - D-12: Full 12-table association index schema — editorial pass operates on these tables
- `.planning/phases/08-single-session-personality-injection/08-CONTEXT.md` — Phase 8 decisions:
  - D-12: Stop hook persists warm-start cache — "Phase 11, REM processing replaces simple snapshot"
- `.planning/phases/09-fragment-memory-engine/09-CONTEXT.md` — Phase 9 decisions:
  - D-10: Domain near-synonyms accumulate — "dedup happens in REM (Phase 11)"
  - D-14: Fragment type is emergent property, not routing decision — REM evaluation respects this
- `.planning/phases/10-three-session-architecture/10-CONTEXT.md` — Phase 10 decisions:
  - D-04: Full Mind minus REM — REM is the excluded piece being added
  - D-07: Tertiary self-prompting loop — sublimation triage in REM evaluates these outputs
  - D-09: Deterministic resonance scoring — same composite scorer available for REM evaluation

### Existing Code (read before modifying)
- `modules/reverie/components/modes/mode-manager.cjs` — Mode Manager with REM/DORMANT placeholders. Expand with real transitions.
- `modules/reverie/components/fragments/fragment-writer.cjs` — Atomic dual-provider writes. Promotion uses same pattern.
- `modules/reverie/components/fragments/decay.cjs` — Deterministic decay computation. Used for Dormant maintenance.
- `modules/reverie/components/fragments/association-index.cjs` — 12-table schema. Editorial pass operates on these tables.
- `modules/reverie/components/self-model/self-model.cjs` — Self Model manager with conditioning aspect. SM-04 populates conditioning fields.
- `modules/reverie/components/self-model/entropy-engine.cjs` — Entropy variance. REM adjusts distribution based on session quality.
- `modules/reverie/lib/schemas.cjs` — Conditioning schema with attention_biases, sublimation_sensitivity, recall_strategies, error_history.
- `modules/reverie/lib/constants.cjs` — DECAY_DEFAULTS, FRAGMENT_TYPES (consolidation), LIFECYCLE_DIRS.
- `modules/reverie/hooks/hook-handlers.cjs` — Stop hook triggers REM transition. PreCompact triggers Tier 1.
- `modules/reverie/components/session/mind-cycle.cjs` — Mind cognitive cycle. REM extends Mind's capabilities.
- `modules/reverie/components/recall/` — Recall engine. Meta-recall fragment creation during REM.
- `modules/reverie/components/formation/` — Formation pipeline. Sublimation triage evaluates formation outputs.
- `core/services/wire/` — Wire service. Heartbeat mechanism for Tier 2 detection.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Mode Manager** (`modes/mode-manager.cjs`): OPERATIONAL_MODES already includes REM and DORMANT as frozen constants. requestActive/requestPassive pattern exists — extend with requestRem/requestDormant.
- **FragmentWriter** (`fragments/fragment-writer.cjs`): Atomic dual-provider writes with Journal-first, Ledger rollback. Fragment promotion (working/ → active/) can use the same atomic pattern — move in Journal, update lifecycle_status in Ledger.
- **Decay function** (`fragments/decay.cjs`): computeDecay() and shouldArchive() ready for Dormant maintenance pass.
- **Association index** (`fragments/association-index.cjs`): 12-table DuckDB schema. Entity dedup, weight updates, and domain boundary review operate directly on these tables.
- **Self Model manager** (`self-model/self-model.cjs`): save/load/getAspect/setAspect with conditioning aspect support. EMA conditioning updates write through this.
- **Entropy engine** (`self-model/entropy-engine.cjs`): Session variance with amplitude tuning. REM adjusts the distribution via quality evaluation.
- **Conditioning schema** (`lib/schemas.cjs`): conditioningSchema with attention_biases, sublimation_sensitivity, recall_strategies, error_history — all optional fields ready for Phase 11 population.
- **Mind cycle** (`session/mind-cycle.cjs`): Cognitive cycle orchestrator. REM extends Mind with consolidation-specific operations.
- **Composite scorer** (`recall/`): Same scoring engine for both recall and sublimation resonance. Available for REM retroactive evaluation.

### Established Patterns
- **Options-based DI**: All new REM components take injected dependencies.
- **Contract shapes**: SHAPE constant + createContract() for frozen APIs.
- **Event emission**: Switchboard-based events on state changes (mode transitions, promotion events).
- **Wire protocol**: Typed envelopes with urgency routing. Heartbeat adds a new message type or uses existing protocol.
- **Journal-first writes**: All fragment mutations go Journal-first with Ledger rollback on failure.

### Integration Points
- **Stop hook → Mode Manager → REM mode**: Stop triggers sequential transition Active/Passive → REM.
- **PreCompact hook → Tier 1 triage**: Fast state dump to Journal.
- **Wire heartbeat → Tier 2 detection**: Secondary monitors Primary heartbeats for idle detection.
- **REM pipeline → FragmentWriter**: Promotion uses atomic dual-provider pattern.
- **REM pipeline → Association Index**: Editorial pass operates on Ledger tables.
- **REM pipeline → Self Model**: Conditioning EMA updates via setAspect().
- **REM pipeline → Entropy Engine**: Quality evaluation adjusts distribution.
- **REM completion → Mode Manager → Dormant**: Secondary terminates after REM finishes.
- **Next SessionStart → Recovery check**: Detect orphaned working/ fragments for crash recovery REM.

</code_context>

<specifics>
## Specific Ideas

### Heartbeat-Based Tier 2 Detection
The user specifically chose heartbeat-based over simple inactivity timers. Heartbeats via Wire let Secondary distinguish three states: (1) user actively chatting (heartbeats + hook events), (2) user idle but session alive (heartbeats only, no hook events), (3) session dead or disconnected (heartbeats stop). This precision matters because Tier 2 should only trigger for state 3, not state 2.

### Abort-and-Revert for Mid-Tier-2 Return
Clean state over partial consolidation. If Tier 2 is running and the user comes back, discard everything tentative. The reasoning: partially consolidated state creates a hybrid that's harder to reason about than either fully working or fully consolidated. The wasted compute is acceptable — Tier 2 is moderate cost and this scenario (user returns during the narrow Tier 2 window) is uncommon.

### Both Behavioral + LLM for Entropy Quality
The entropy engine quality evaluation combines behavioral signals (quantitative) and LLM reflection (qualitative). Neither alone is sufficient: behavioral signals can't assess personality-mood fit, LLM reflection can't measure engagement patterns. Together they provide a robust signal for entropy distribution adjustment.

### Sequential Transitions with Crash Recovery
The user wants the REM-07 gate enforced strictly (nothing skips REM) but recognizes that crashes happen. The crash fallback — detecting orphaned working/ fragments on next SessionStart and running recovery REM — is the pragmatic answer. No data is lost, the gate is eventually enforced, and the normal path remains clean.

</specifics>

<deferred>
## Deferred Ideas

### Self-Organizing Taxonomy (Phase 12, FRG-07)
REM's domain dedup in Phase 11 handles near-synonym merging. Full taxonomy self-organization (domain creation/merge/split/retire with hard caps) is Phase 12 scope. Phase 11 builds the editorial machinery; Phase 12 adds the governance rules.

### Source-Reference Model (Phase 12, FRG-08)
Source-reference fragments exist as a type but the full source-reference model (association chain termini, source locator pointers) is Phase 12. REM processes source-reference fragments like any other type.

### Mind-Controlled Dynamic Referential Framing (Backlog from Phase 10)
Once Conditioning is populated via REM, the Mind could dynamically adjust referential framing intensity per-turn based on attention biases and session context. Not in Phase 11 scope but enabled by it.

</deferred>

---

*Phase: 11-rem-consolidation*
*Context gathered: 2026-03-24*
