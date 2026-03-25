# Compliance Matrix: Reverie Spec v2 + Dynamo Architecture Plan

**Audit Date:** 2026-03-25
**Auditor:** Phase 13 automated audit
**Spec Sources:** `.claude/reverie-spec-v2.md`, `.claude/new-plan.md`

## Status Legend

- **C** = Compliant
- **D** = Intentional Deviation (documented in STATE.md)
- **V** = Violation (fixed in this phase)
- **M** = Missing (scoped as follow-up)
- **NA** = Not applicable (informational section)
- **EXP** = Experimental (deferred to runtime validation)

---

## Deviation Log

Known intentional deviations from canonical specs, documented in STATE.md decisions.

| # | Spec Section | Spec Says | Implementation Does | Justification (STATE.md Reference) |
|---|-------------|-----------|--------------------|------------------------------------|
| 1 | 3.3 | YAML frontmatter headers | JSON frontmatter | [Phase 07] JSON frontmatter is a clean break from YAML -- no dual-format support, no backward compatibility |
| 2 | 3.3 | Zod 3 syntax | Zod 4 `z.record(z.string(), valueSchema)` | [Phase 07] Zod 4 requires adapted record syntax |
| 3 | 8.3, 4.2 | `systemMessage` injection | `additionalContext` injection | [Phase 08] All hook injection uses additionalContext not systemMessage per Pitfall 1 |
| 4 | 8.5 | Phase 3 smaller than Phase 1 | Phase 3 LARGER than Phase 1 | [Phase 08] Phase 3 reinforced (60-80%) injection LARGER per PITFALLS research D-05/D-06 |
| 5 | 3.3 | associations without emotional_valence | associations includes emotional_valence | [Phase 09] Associations schema includes emotional_valence per actual Zod schema |
| 6 | 3.6 | Formation agents location unspecified | Formation agents at .claude/agents/ | [Phase 09] Formation agent definition placed at .claude/agents/ (Claude Code discovery path) |
| 7 | 4.6 | Session spawner in module scope | Session spawner in conductor/ | [Phase 10] Session spawner lives in core/services/conductor/ as platform capability |
| 8 | 4.x | Enum-based state matching | String literals for state matching | [Phase 10] String literals in switchboard listener -- avoids circular require risk |
| 9 | 5.3 | Evaluator calls LLM directly | Prompt/apply separation | [Phase 11] Evaluator and editorial pass compose prompts but never call LLM directly |
| 10 | 7.x | Mode Manager returns enum/object | Mode Manager uses getMode() returning string | [Phase 12] Adapted from actual code vs plan interface block |
| 11 | 2.2 | `boundary_definitions` field name | `boundaries` field name | [Phase 07] Naming simplification, consistent across all code (schemas, cold-start, template-composer) |
| 12 | 2.2 | `user_communication_patterns`, `user_domain_map`, `user_preference_history` | `communication_patterns`, `domain_map`, `preference_history` | [Phase 07] Dropped `user_` prefix for conciseness, consistent across all relational model code |
| 13 | 2.2 | `relational_dynamics` field in Relational Model | Field not implemented | Deferred -- relational dynamics tracking not yet implemented in initial phases |

---

## Platform Architecture

Audit of core platform components against `.claude/new-plan.md`.

| ID | Spec Domain | Status | Implementing File(s) | Evidence | Notes |
|----|------------|--------|---------------------|----------|-------|
| PA-01 | Switchboard (Events) | C | `core/services/switchboard/switchboard.cjs` | SWITCHBOARD_SHAPE + createContract(), registered as services.switchboard in core.cjs:77 | |
| PA-02 | Commutator (I/O) | C | `core/services/commutator/commutator.cjs` | COMMUTATOR_SHAPE + createContract(), deps: [switchboard] | |
| PA-03 | Magnet (State) | C | `core/services/magnet/magnet.cjs` | MAGNET_SHAPE + createContract(), deps: [switchboard, lathe] | |
| PA-04 | Conductor (Infrastructure) | C | `core/services/conductor/conductor.cjs` | CONDUCTOR_SHAPE + createContract(), deps: [switchboard], includes session spawning | |
| PA-05 | Forge (Git) | C | `core/services/forge/forge.cjs` | FORGE_SHAPE + createContract(), deps: [lathe, switchboard] | |
| PA-06 | Lathe (Filesystem) | C | `core/services/lathe/lathe.cjs` | LATHE_SHAPE + createContract(), no deps | |
| PA-07 | Relay (Operations) | C | `core/services/relay/relay.cjs` | RELAY_SHAPE + createContract(), deps: [forge, lathe, switchboard] | |
| PA-08 | Wire (Communication) | C | `core/services/wire/wire.cjs` | WIRE_SHAPE + createContract(), deps: [switchboard, conductor, ledger] | |
| PA-09 | Assay (Search) | C | `core/services/assay/assay.cjs` | ASSAY_SHAPE + createContract(), deps: [switchboard, ledger, journal] | |
| PA-10 | Exciter (Integration) | C | `core/services/exciter/exciter.cjs` | EXCITER_SHAPE + createContract(), Phase 9.1 addition, deps: [switchboard, lathe] | Not in original new-plan.md; added as 10th service |
| PA-11 | Ledger Provider (SQL) | C | `core/providers/ledger/ledger.cjs` | DATA_PROVIDER_SHAPE contract, registered as providers.ledger in core.cjs:139 | |
| PA-12 | Journal Provider (Flat File) | C | `core/providers/journal/journal.cjs` | DATA_PROVIDER_SHAPE contract, registered as providers.journal in core.cjs:147 | |
| PA-13 | Lithograph Provider (Transcript) | C | `core/providers/lithograph/lithograph.cjs` | DATA_PROVIDER_SHAPE contract, Phase 9.1 addition, registered as providers.lithograph in core.cjs:155 | Not in original new-plan.md; added as 3rd provider |
| PA-14 | Layer Hierarchy | C | `lib/` -> `core/` -> `modules/` | spec-platform.test.cjs verifies no reverse deps: lib/ has no core/ imports, core/ has no modules/ imports | |
| PA-15 | CJS Format | C | All .cjs files | All core and lib source files start with 'use strict' and use module.exports | |
| PA-16 | No YAML Imports | C | All .cjs files | No require('yaml') or require('js-yaml') found in core or lib | |
| PA-17 | No LLM API Deps | C | All .cjs files | No openai/anthropic/openrouter imports below SDK scope | |
| PA-18 | No ESM Syntax | C | All .cjs files | No export default/const/function/class in core source files | |

---

## Section 1: Mechanistic Constraints

Spec sections 1.1-1.5. These are philosophical/theoretical constraints informing design decisions. No code implementation required.

| ID | Spec Section | Status | Implementing File(s) | Evidence | Notes |
|----|-------------|--------|---------------------|----------|-------|
| MC-01 | 1.1 No cognition, only interpolation | NA | N/A | Informational constraint | Design philosophy, not implementable |
| MC-02 | 1.2 No extrapolation, only manifold traversal | NA | N/A | Informational constraint | Design philosophy, not implementable |
| MC-03 | 1.3 No grounding, only distributional representation | NA | N/A | Informational constraint | Design philosophy, not implementable |
| MC-04 | 1.4 Literature-as-compass principle | NA | N/A | Informational constraint | Guides prompt engineering choices |
| MC-05 | 1.5 Scalar compute as differentiator | NA | N/A | Informational constraint | Justifies multi-session architecture |

---

## Section 2: Self Model

| ID | Spec Section | Status | Implementing File(s) | Evidence | Notes |
|----|-------------|--------|---------------------|----------|-------|
| SM-01 | 2.1 What the Self Model Is | C | `modules/reverie/components/self-model/self-model.cjs`, `modules/reverie/lib/constants.cjs:59` | SM_ASPECTS = ['identity-core', 'relational-model', 'conditioning'] maps to Face/Mind/Subconscious | Three aspects verified in spec-self-model.test.cjs |
| SM-02 | 2.2 Identity Core (5 fields) | C | `modules/reverie/lib/schemas.cjs:242-251` | personality_traits, communication_style, value_orientations, expertise_map, boundaries | D-11: boundaries not boundary_definitions |
| SM-03 | 2.2 Relational Model (6 fields) | D | `modules/reverie/lib/schemas.cjs:257-266` | 5 of 6 fields present: communication_patterns, domain_map, preference_history, trust_calibration, interaction_rhythm | D-12: user_ prefix dropped; D-13: relational_dynamics not implemented |
| SM-04 | 2.2 Conditioning (5 fields) | C | `modules/reverie/lib/schemas.cjs:272-281` | attention_biases, association_priors, sublimation_sensitivity, recall_strategies, error_history | All 5 fields match spec |
| SM-05 | 2.3 Cold Start | C | `modules/reverie/components/self-model/cold-start.cjs` | Neutral traits (0.5), empty relational, uniform conditioning; passes schema validation | Entropy engine integration verified |
| SM-06 | 2.4 Prompting Across Sessions | C | `modules/reverie/components/context/template-composer.cjs` | 5-slot face prompt (Identity Frame, Relational Context, Attention Directives, Behavioral Directives, Referential Framing); 4 budget phases | Phase 3 > Phase 1 per D-04 deviation |

---

## Section 3: Fragment Memory Engine

*To be completed by Plan 13-02.*

---

## Section 4: Three-Session Architecture

*To be completed by Plan 13-04.*

---

## Section 5: REM Consolidation

| ID | Spec Section | Status | Implementing File(s) | Evidence | Notes |
|----|-------------|--------|---------------------|----------|-------|
| S5.1 | 5.1 The Biological Analog | NA | N/A | Informational/motivational section describing sleep REM analog | Design philosophy, no code implementation required |
| S5.2 | 5.2 Three Consolidation Tiers | C | `modules/reverie/components/rem/rem-consolidator.cjs`, `modules/reverie/components/rem/triage.cjs`, `modules/reverie/components/rem/provisional-rem.cjs`, `modules/reverie/components/rem/full-rem.cjs` | Tier 1 triage on PreCompact (snapshot to Journal via Lathe, 6 fields, no LLM); Tier 2 provisional on idle timeout (heartbeat-monitor.cjs fires timeout, provisional-rem.cjs runs full pipeline flagged tentative with abort-revert); Tier 3 full on session end (5-step editorial pipeline). Verified in spec-rem.test.cjs: 43 tests, 115 assertions | D: [Phase 11] Provisional REM uses _running/_aborted/_tentativeFragmentIds state machine |
| S5.3a | 5.3 Retroactive evaluation | C | `modules/reverie/components/rem/retroactive-evaluator.cjs`, `modules/reverie/components/rem/quality-evaluator.cjs` | evaluate() composes prompt for LLM re-evaluation of fragments against completed session arc; apply() processes PROMOTE/DISCARD decisions; promoteFragment() updates relevance, tags, lifecycle; discardFragment() removes from Journal+Ledger | D: [Phase 11] Prompt/apply separation -- evaluator composes prompts but never calls LLM directly; [Phase 11] Dual-signal quality evaluation: behavioral (0.4) + LLM reflection (0.6) with behavioral-only fallback |
| S5.3b | 5.3 Meta-fragment creation | C | `modules/reverie/components/rem/retroactive-evaluator.cjs:127-158, 433-495` | composeMetaRecallPrompt() builds prompt for significant recall events; meta-recall fragments created with type='meta-recall', _lifecycle='active', source_fragments populated from recall event | Meta-recall fragments written via fragmentWriter with full schema compliance |
| S5.3c | 5.3 Association index editorial pass | C | `modules/reverie/components/rem/editorial-pass.cjs` | composeEditorialPrompt() covers 4 core tasks: entity dedup, domain boundary review, association weight updates, taxonomy narrative updates; applyEntityDedup() merges via Wire write-intent; applyDomainMerge() includes merge_narrative consolidation fragments; Phase 12 adds split/retire governance | D: [Phase 11] Prompt/apply separation; [Phase 12] Domain merge narratives written as consolidation-type fragments; [Phase 12] Cap pressure computed in full-rem.cjs Step 3 |
| S5.3d | 5.3 Self Model conditioning update | C | `modules/reverie/components/rem/conditioning-updater.cjs` | updateConditioning() applies EMA to attention_biases, sublimation_sensitivity, association_priors, recall_strategies; enforceIdentityFloors() prevents personality collapse (D-11); checkDiversityThreshold() + boostUnderrepresented() prevent trait convergence | D: [Phase 11] EMA record-level updates default new keys to 0.5 midpoint; Identity core review gated by identity_min_sessions (default 5) |
| S5.3e | 5.3 Fragment promotion | C | `modules/reverie/components/rem/retroactive-evaluator.cjs:233-303` | promoteFragment() sets _lifecycle='active', updates relevance/tags, increments consolidation_count, writes via fragmentWriter, updates Ledger lifecycle via Wire write-intent, deletes working/ copy | Only promotion path is through REM evaluate->apply chain |
| S5.4 | 5.4 Working Memory Gate | C | `modules/reverie/components/rem/rem-consolidator.cjs` | REM consolidator is single entry point per REM-07: handleTier1/2/3 dispatch to triage/provisional/full; no alternative path promotes fragments; crash recovery (handleCrashRecovery) detects orphaned working/ fragments; dormant maintenance (handleDormantMaintenance) processes decay catch-up | rem-consolidator.cjs line 15: "Per REM-07: Nothing enters long-term storage without passing through the REM pipeline" |

---

## Section 6: Platform Integration

| ID | Spec Section | Status | Implementing File(s) | Evidence | Notes |
|----|-------------|--------|---------------------|----------|-------|
| PI-01 | 6.1 Dynamo Service and Provider Usage | C | `modules/reverie/reverie.cjs:67-93` | register(facade) destructures { events, getService, getProvider }; resolves switchboard, lathe, magnet, wire, assay, conductor, exciter via getService(); journal, lithograph via getProvider() | All access through Circuit facade, no direct core/ imports |
| PI-02 | 6.2 Hook Wiring | D | `modules/reverie/reverie.cjs:379-388`, `modules/reverie/hooks/hook-handlers.cjs` | exciter.registerHooks('reverie', { SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, PreCompact, SubagentStart, SubagentStop }) — all 8 hooks | D: [Phase 08] Hook registration via Armature createHookRegistry not events.on(); [Phase 09.1] Exciter delegates to Armature createHookRegistry for hook mechanics |
| PI-03 | 6.3 Data Architecture | C | `modules/reverie/components/fragments/fragment-writer.cjs`, `modules/reverie/components/self-model/self-model.cjs`, `modules/reverie/lib/schemas.cjs` | FragmentWriter: journal (narrative markdown) + wire (Ledger association index upserts); Self Model: magnet (in-memory) + journal (narrative .md) + wire (Ledger structured state); schemas define associations, entities, domains for Ledger tables | Dual-storage convention enforced: all fragment writes go through FragmentWriter gateway |

---

## Section 7: Operational Modes

| ID | Spec Section | Status | Implementing File(s) | Evidence | Notes |
|----|-------------|--------|---------------------|----------|-------|
| OM-01 | 7.1 Active Mode | C | `modules/reverie/components/modes/mode-manager.cjs:33` | OPERATIONAL_MODES.ACTIVE = 'active'; requestActive() spawns Tertiary via sessionManager.upgrade(); getMetrics reports 2 active sessions | |
| OM-02 | 7.2 Passive Mode | C | `modules/reverie/components/modes/mode-manager.cjs:34` | OPERATIONAL_MODES.PASSIVE = 'passive'; default mode on creation; 1 active session (Secondary only); requestPassive() calls sessionManager.degrade() | |
| OM-03 | 7.3 REM Mode | C | `modules/reverie/components/modes/mode-manager.cjs:35` | OPERATIONAL_MODES.REM = 'rem'; post-session, Secondary only (1 active session); transition from Active degrades first | |
| OM-04 | 7.4 Dormant Mode | C | `modules/reverie/components/modes/mode-manager.cjs:36` | OPERATIONAL_MODES.DORMANT = 'dormant'; 0 active sessions; only reachable from REM (cannot skip REM) | |
| OM-05 | Mode Transitions | C | `modules/reverie/components/modes/mode-manager.cjs:103-180` | Active->Passive (requestPassive), Active->REM (requestRem, degrades first), REM->Dormant (requestDormant); Passive->Dormant blocked; Dormant->REM blocked | D-10: getMode() returns string |
| OM-06 | Auto-fallback | C | `modules/reverie/components/modes/mode-manager.cjs:190-237` | checkHealth() detects Tertiary failure, auto-degrades Active->Passive via sessionManager.degrade() | |

---

## Section 8: Primary Context Management

| ID | Spec Section | Status | Implementing File(s) | Evidence | Notes |
|----|-------------|--------|---------------------|----------|-------|
| CM-01 | 8.1 The Problem | NA | N/A | Informational section describing context window dilution threat | Design motivation, not implementable |
| CM-02 | 8.2 The Design Decision | NA | N/A | Informational section explaining continuous reinjection choice | Implementation verified in S8.3; decision is enacted through reinjection + referential framing |
| CM-03 | 8.3 Continuous Self Model Reinjection | D | `modules/reverie/components/context/context-manager.cjs`, `modules/reverie/components/context/template-composer.cjs`, `modules/reverie/hooks/hook-handlers.cjs` | handleUserPromptSubmit: calls getInjection() synchronously (< 1ms), returns as additionalContext in hookSpecificOutput; template-composer has 5-slot system (identity_frame, relational_context, attention_directives, behavioral_directives, referential_framing); PHASE_BUDGETS: Phase 1=1300, Phase 2=800, Phase 3=1900, Phase 4=1800 tokens — within spec ~800-1800 range (Phase 3 deviation) | D: [Phase 08] Uses additionalContext not systemMessage per Pitfall 1; includes communication style, relational context, attention priorities, behavioral constraints per spec |
| CM-04 | 8.4 Referential Framing Prompt | D | `modules/reverie/components/context/referential-framing.cjs`, `modules/reverie/components/context/template-composer.cjs:524` | FRAMING_TEMPLATES with 3 modes (full/dual/soft); full mode: "reference material" + "defer to Self Model directives"; dual mode: relational deference + technical autonomy; all wrapped in XML tags; slot 5 of 5-slot template | D: [Phase 10] Templates wrapped in `<referential_frame>` XML tags for structured injection |
| CM-05 | 8.5 Context Budget Management | D | `modules/reverie/components/context/budget-tracker.cjs` | BUDGET_PHASES = { FULL:1, COMPRESSED:2, REINFORCED:3, COMPACTION:4 }; PHASE_THRESHOLDS = { 0.30, 0.60, 0.80 }; calculateBudgetPhase pure function; createBudgetTracker state machine with trackBytes/getPhase/reset; Phase 4 appends compaction advocacy directive | D: [Phase 08] Phase 3 reinforced is LARGER than Phase 1 (1900 vs 1300 tokens) per PITFALLS research D-05/D-06; thresholds differ from spec (30/60/80 vs spec 50/75/90) |
| CM-06 | 8.6 Self Model as Compaction Frame | C | `modules/reverie/hooks/hook-handlers.cjs:53-60` | COMPACTION_FRAMING: preserves Self Model identity frame, user intent, attention priorities; instructs to discard re-retrievable raw content; handlePreCompact calls checkpoint() then injects COMPACTION_FRAMING as additionalContext; resetAfterCompaction resets budget to Phase 1 and recomposes | Not neutral summary — preserves personality directives as compaction frame |
| CM-07 | 8.7 RESEARCH: Context Management Strategies | NA | N/A | Research section listing future investigation areas: adaptive sizing, selective context poisoning, partitioning, Mind-as-reader | No implementation required; strategies for future exploration |

---

## Section 9: Experimental Flags

All Section 9 items are open questions requiring empirical validation. They are not implementation requirements but configurable parameters that need runtime tuning.

| ID | Spec Section | Status | Parameter Location | Notes |
|----|-------------|--------|-------------------|-------|
| EXP-01 | 9.1 Sublimation cycle frequency | EXP | `modules/reverie/components/session/sublimation-loop.cjs` | 5-10 second default; needs empirical tuning per index density |
| EXP-02 | 9.2 Fragment formation rate | EXP | `modules/reverie/lib/constants.cjs:135-140` (FORMATION_DEFAULTS) | max_fragments_per_stimulus=3, target_fragments_per_session=15 |
| EXP-03 | 9.3 Decay function parameters | EXP | `modules/reverie/lib/constants.cjs:79-89` (DECAY_DEFAULTS) | base_decay_rate=0.05, consolidation_protection=0.3, access_weight=0.1 |
| EXP-04 | 9.4 Three-session resource consumption | EXP | `modules/reverie/components/session/session-config.cjs` | Max subscription concurrent session limits unknown |
| EXP-05 | 9.5 Subagent spawn latency | EXP | `core/services/conductor/conductor.cjs` (spawnSession) | Wire PoC validated; production latency needs measurement |
| EXP-06 | 9.6 Taxonomy convergence | EXP | `modules/reverie/lib/constants.cjs:256-263` (TAXONOMY_DEFAULTS) | max_domains=100, pressure_threshold=0.8 |
| EXP-07 | 9.7 Secondary-to-Primary directive compliance | EXP | `modules/reverie/components/context/referential-framing.cjs` | Referential framing modes (full/dual/soft) for enforcement |
| EXP-08 | 9.8 Recall reconstruction quality | EXP | `modules/reverie/components/recall/reconstruction-prompt.cjs` | Reconstruction through Self Model frame; quality unmeasured |
| EXP-09 | 9.9 Referential framing effectiveness | EXP | `modules/reverie/components/context/template-composer.cjs:46-50` (PHASE_BUDGETS) | 4-phase budget strategy; effectiveness unmeasured |
| EXP-10 | 9.10 Multi-angle formation noise ratio | EXP | `modules/reverie/lib/constants.cjs:135-140` (FORMATION_DEFAULTS) | formation_group_prefix tracks siblings; survival rate untested |
| EXP-11 | 9.11 Source-reference chain traversal quality | EXP | `modules/reverie/components/recall/query-builder.cjs` | Chain traversal via association index; accuracy untested |
| EXP-12 | 9.12 Emotional/affective modeling | EXP | `modules/reverie/lib/schemas.cjs:66` (emotional_valence in associations) | Architecturally present but mechanism unspecified |
| EXP-13 | 9.13 Cross-domain interpolation | EXP | `modules/reverie/components/recall/recall-engine.cjs` | Nehalem problem; parked for empirical exploration |

---

## Section 10: Success Criteria

*To be completed by Plan 13-07 (final verification plan).*

---

*Matrix last updated: 2026-03-25 by Plans 13-05/13-06 (REM Consolidation + Context Management + Platform Integration audit)*
