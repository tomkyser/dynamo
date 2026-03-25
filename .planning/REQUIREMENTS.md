# Requirements: Dynamo v1.0 M2 — Reverie Module

**Defined:** 2026-03-23
**Core Value:** Everything routes through Dynamo — the holistic wrapper via its APIs and interfaces. No component bypasses the patterns and paths Dynamo defines.

## M2 Requirements

### Self Model

- [x] **SM-01**: Self Model with three aspects (Face/Mind/Subconscious) persisting across sessions via Magnet + Journal + Ledger
- [x] **SM-02**: Identity Core — stable personality traits, communication style, value orientations, expertise map, boundaries
- [x] **SM-03**: Relational Model — user communication patterns, domain map, preference history, trust calibration, interaction rhythm
- [x] **SM-04**: Conditioning — attention biases, association priors, sublimation sensitivity, recall strategies, error history
- [x] **SM-05**: Cold start initialization from seed prompt with sparse defaults

### Fragment Memory Engine

- [x] **FRG-01**: Fragment schema (structured frontmatter + fuzzy impressionistic body) stored in Journal
- [x] **FRG-02**: Five fragment types — experiential, meta-recall, sublimation, consolidation, source-reference
- [x] **FRG-03**: Multi-angle formation pipeline (attention check, domain fan-out, parallel per-fragment processing, formation group tagging)
- [x] **FRG-04**: Real-time recall via Assay (retrieval, composite ranking, reconstruction through current Self Model frame)
- [x] **FRG-05**: Association index in Ledger (domains, entities, associations, attention tags, formation groups, source locators, fragment decay)
- [x] **FRG-06**: Deterministic decay function (time decay, consolidation protection, access bonus, relevance factor)
- [x] **FRG-07**: Self-organizing taxonomy (domain creation/merge/split/retire during REM)
- [x] **FRG-08**: Source-reference model (association chain termini, source locator pointers, experiential relationship to sources)
- [x] **FRG-09**: FragmentWriter abstraction — atomic dual-provider writes (Journal + Ledger) with rollback to prevent split-storage inconsistency
- [x] **FRG-10**: Historical data backfill — import Claude conversation exports (or analogous app data) through backfill-specific formation pathway with retrospective framing, provenance marking, and appropriate trust/decay parameters for reconstructed (non-experiential) memories

### Three-Session Architecture

- [x] **SES-01**: Primary session (Face) — user-facing session with Self Model personality expression via hook-injected context
- [x] **SES-02**: Secondary session (Mind) — cognitive center managing attention, fragments, recall, taxonomy, Self Model authority
- [x] **SES-03**: Tertiary session (Subconscious) — continuous sublimation stream with configurable cycle frequency
- [x] **SES-04**: Wire-based inter-session communication (Primary <-> Secondary <-> Tertiary) with urgency levels (background/active/directive/urgent)
- [x] **SES-05**: Session lifecycle (startup sequence, active operation, compaction handling, clean shutdown)

### REM Consolidation

- [x] **REM-01**: Tier 1 triage on compaction events (fast working state preservation to Journal)
- [x] **REM-02**: Tier 2 provisional REM on idle timeout (full consolidation flagged tentative)
- [x] **REM-03**: Tier 3 full REM on explicit session end (deep editorial pass)
- [x] **REM-04**: Retroactive evaluation of session fragments against completed session arc
- [x] **REM-05**: Association index editorial pass (entity dedup, weight updates, domain boundary review, taxonomy narrative updates)
- [x] **REM-06**: Self Model conditioning update (attention biases, recall strategies, error history, identity core review)
- [x] **REM-07**: Working memory -> long-term memory gate (nothing enters consolidated storage without REM)

### Primary Context Management

- [x] **CTX-01**: Continuous Self Model reinjection on every UserPromptSubmit (~800-1800 token budget)
- [x] **CTX-02**: Referential framing prompt (Primary treats context as reference material, Self Model directives as operating frame)
- [x] **CTX-03**: Context budget management (4 phases: full -> compressed -> reinforced -> compaction advocacy)
- [x] **CTX-04**: Self Model as compaction frame (PreCompact preserves Self Model perspective, not neutral summary)
- [x] **CTX-05**: Warm-start face prompt cache — persist final Face prompt from prior session's REM for instant personality on SessionStart before Secondary is ready

### Operational Modes

- [x] **OPS-01**: Active mode — full three-session architecture
- [x] **OPS-02**: Passive mode — Primary + lightweight Secondary only, no Tertiary (also serves as fallback if Active mode exceeds Max subscription limits)
- [x] **OPS-03**: REM mode — post-session consolidation, Secondary only
- [x] **OPS-04**: Dormant mode — no sessions, scheduled decay maintenance only

### Module Integration

- [x] **INT-01**: Hook wiring for 8 Claude Code hooks (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, PreCompact, SubagentStart, SubagentStop)
- [x] **INT-02**: CLI surface via Pulley (`dynamo reverie status/reset/inspect/history`)
- [x] **INT-03**: Reverie installed and managed as git submodule via Forge/Relay

### Platform Prerequisites

- [x] **PLT-01**: Wire write coordinator retry logic with exponential backoff and write-ahead journaling — current implementation drops failed writes silently, which corrupts association index under burst formation load
- [x] **PLT-02**: Lithograph provider — read/write/query Claude Code transcript JSONL files (parse conversation turns, tool use blocks, tool results; atomic content manipulation with rollback)
- [x] **PLT-03**: Exciter service — Claude Code integration surface management (hook registration/wiring, agent definitions, skill definitions, settings.json at project and user scope, CLAUDE.md management). Single interface through which modules and extensions implement Claude Code features.

## Deferred to v2

| Requirement | Reason |
|-------------|--------|
| **SES-06**: Subagent delegation from Secondary and Tertiary | Can be added once base three-session architecture is stable; reduces M2 complexity without losing core functionality |
| **ADV-01**: Emotional/affective modeling (subjective attention model) | Spec marks as DEFERRED (Section 9.12) |
| **ADV-02**: Cross-domain interpolation / "Nehalem problem" | Parked for empirical exploration (Section 9.13) |
| **EXT-01**: Apex extension API | Architecture slot exists but builds after modules ship |
| **EXT-02**: System composition layer | Future consideration for composing multiple modules |
| **API-01**: Web/REST API implementation | Contracts defined in Armature, implement when needed |
| **API-02**: WebSocket API implementation | Contracts defined in Armature, implement when needed |

## Out of Scope

| Feature | Reason |
|---------|--------|
| LLM API integration below SDK scope | Architecture principle: no SDK scope or lower aspect shall require LLM API. Dynamo uses Claude Code Max natively. |
| Pre-programmed emotional responses | Creates "hollow empathy" uncanny valley. Let emotional tone emerge from Self Model state and Conditioning. |
| Verbatim transcript storage alongside fragments | Context pollution, defeats the fragment philosophy. Fragments are the ONLY memory. |
| LLM importance scoring per memory | Prohibitive cost at formation rates. Use deterministic scoring based on Self Model relevance dimensions. |
| Graph database for associations | Explicitly replaced in rewrite. DuckDB relational tables are sufficient. |
| Vector embedding similarity as sole retrieval | Misses structural and temporal relationships, adds massive dependency. Use composite ranking via Assay. |
| Nested JSON in hook payloads | Claude Code issue #17804 triggers false positive injection detection. Use additionalContext field. |
| Fine-grained trait sliders / user-configurable personality | Undermines emergent personality. User influence comes through natural interaction, not configuration UI. |

## Cross-Milestone Dependencies

| M1 Component | M2 Dependency | Impact |
|--------------|---------------|--------|
| Wire (SVC-08) | Three-session architecture (SES-01 through SES-05) | Wire must support concurrent session orchestration with urgency-level messaging |
| Ledger (PRV-01) | Association index (FRG-05), Self Model structured state | DuckDB single-writer constraint requires Secondary-only-writer pattern |
| Assay (SVC-09) | Fragment recall (FRG-04), sublimation index scans (SES-03) | Federated search must support Journal frontmatter + Ledger association queries |
| Magnet (SVC-03) | Self Model persistence (SM-01) | State must persist across session boundaries with provider backing |
| Switchboard (SVC-01) | Hook event routing (INT-01) | Must support all 8 Claude Code hook types with semantic enrichment |
| Conductor (SVC-06) | Session lifecycle (SES-05) | MCP server lifecycle management for Wire relay and channel sessions |
| Journal (PRV-02) | Fragment storage (FRG-01), Self Model narrative state (SM-02/03/04) | Markdown provider must support frontmatter queries |

## Research Flags

| Phase | Flag | Reason |
|-------|------|--------|
| Phase 7-8 | STANDARD | Write coordinator enhancement, schema definitions, hook wiring -- well-specified in research, validated by Claude-Mem |
| Phase 9 | NEEDS RESEARCH | Formation fan-out signal-to-noise ratio (EXPERIMENTAL 9.10), recall reconstruction quality (EXPERIMENTAL 9.8) |
| Phase 10 | NEEDS RESEARCH | Channels API stability, Claude Max concurrent session limits (EXPERIMENTAL 9.4), referential framing calibration (EXPERIMENTAL 9.9) |
| Phase 11 | NEEDS RESEARCH | Decay constant tuning (EXPERIMENTAL 9.3), conditioning update calibration (EXPERIMENTAL 9.6) |
| Phase 12 | NEEDS RESEARCH | Backfill formation pathway design -- retrospective vs. experiential framing, provenance model |

## Traceability

| Requirement | Phase | Status | Evidence |
|-------------|-------|--------|----------|
| SM-01 | Phase 7 | Complete | `modules/reverie/components/self-model/self-model.cjs` (createSelfModel factory), `modules/reverie/lib/constants.cjs:59` (SM_ASPECTS) |
| SM-02 | Phase 7 | Complete | `modules/reverie/lib/schemas.cjs:242-251` (identityCoreSchema: personality_traits, communication_style, value_orientations, expertise_map, boundaries) |
| SM-03 | Phase 7 | Complete | `modules/reverie/lib/schemas.cjs:257-266` (relationalModelSchema: communication_patterns, domain_map, preference_history, trust_calibration, interaction_rhythm) |
| SM-04 | Phase 11 | Complete | `modules/reverie/lib/schemas.cjs:272-281` (conditioningSchema), `modules/reverie/components/rem/conditioning-updater.cjs` (EMA updates) |
| SM-05 | Phase 7 | Complete | `modules/reverie/components/self-model/cold-start.cjs` (createColdStartSeed: neutral 0.5 traits, empty relational, uniform conditioning) |
| FRG-01 | Phase 7 | Complete | `modules/reverie/lib/schemas.cjs:10-120` (baseFragmentSchema), `modules/reverie/components/fragments/fragment-writer.cjs` (Journal+Ledger dual write) |
| FRG-02 | Phase 7 | Complete | `modules/reverie/lib/constants.cjs:23-29` (FRAGMENT_TYPES: experiential, meta-recall, sublimation, consolidation, source-reference) |
| FRG-03 | Phase 9 | Complete | `modules/reverie/components/formation/formation-pipeline.cjs` (prepareStimulus + processFormationOutput), `modules/reverie/components/formation/attention-gate.cjs`, `modules/reverie/components/formation/fragment-assembler.cjs` |
| FRG-04 | Phase 9 | Complete | `modules/reverie/components/recall/recall-engine.cjs` (recallPassive:5/recallExplicit:15), `modules/reverie/components/recall/composite-scorer.cjs` (6-factor ranking), `modules/reverie/components/recall/reconstruction-prompt.cjs` |
| FRG-05 | Phase 7 | Complete | `modules/reverie/components/fragments/association-index.cjs` (12 DDL tables), `modules/reverie/components/fragments/fragment-writer.cjs:96-185` (_queueAssociationIndexWrites) |
| FRG-06 | Phase 7 | Complete | `modules/reverie/lib/decay.cjs` (computeDecay: time_decay + consolidation_protection + access_bonus + relevance), `modules/reverie/lib/constants.cjs:79-89` (DECAY_DEFAULTS) |
| FRG-07 | Phase 12 | Complete | `modules/reverie/components/rem/taxonomy-governor.cjs` (applyDomainSplit, applyDomainRetire), `modules/reverie/components/rem/editorial-pass.cjs` (applyDomainMerge), `modules/reverie/lib/constants.cjs:256-263` (TAXONOMY_DEFAULTS) |
| FRG-08 | Phase 12 | Complete | `modules/reverie/lib/schemas.cjs:132-143` (sourceLocatorSchema), `modules/reverie/components/fragments/fragment-writer.cjs:169-182` (source_locators write) |
| FRG-09 | Phase 7 | Complete | `modules/reverie/components/fragments/fragment-writer.cjs` (writeFragment: Journal first -> Ledger via Wire -> rollback on failure) |
| FRG-10 | Phase 12 | Complete | `modules/reverie/components/backfill/backfill-pipeline.cjs`, `modules/reverie/components/backfill/backfill-parser.cjs`, `modules/reverie/cli/register-commands.cjs` (backfill CLI) |
| SES-01 | Phase 10 | Complete | `modules/reverie/hooks/hook-handlers.cjs:112-170` (handleSessionStart), `modules/reverie/components/context/context-manager.cjs` (getInjection -> additionalContext) |
| SES-02 | Phase 10 | Complete | `modules/reverie/components/session/mind-cycle.cjs` (processTurn: attention, formation, recall, sublimation, face prompt composition, directives) |
| SES-03 | Phase 10 | Complete | `modules/reverie/components/session/sublimation-loop.cjs` (getSystemPrompt, getCycleConfig, updateSensitivity), `modules/reverie/components/session/session-config.cjs:105` (sublimation_cycle_ms=15000) |
| SES-04 | Phase 10 | Complete | `modules/reverie/components/session/wire-topology.cjs` (send, subscribe, validateRoute, ACK protocol), `core/services/wire/protocol.cjs` (MESSAGE_TYPES, URGENCY_LEVELS) |
| SES-05 | Phase 10 | Complete | `modules/reverie/components/session/session-manager.cjs` (start/stop/upgrade/degrade/initShutdown/transitionToRem/completeRem), `modules/reverie/components/session/session-config.cjs:40-68` (TRANSITIONS) |
| REM-01 | Phase 11 | Complete | `modules/reverie/components/rem/triage.cjs` (snapshot: 6-field state dump to Journal via Lathe), `modules/reverie/components/rem/rem-consolidator.cjs:74-84` (handleTier1) |
| REM-02 | Phase 11 | Complete | `modules/reverie/components/rem/provisional-rem.cjs` (run: tentative pipeline with abort-revert), `modules/reverie/components/rem/heartbeat-monitor.cjs` |
| REM-03 | Phase 11 | Complete | `modules/reverie/components/rem/full-rem.cjs` (run: 5-step editorial pipeline), `modules/reverie/components/rem/rem-consolidator.cjs:154-170` (handleTier3) |
| REM-04 | Phase 11 | Complete | `modules/reverie/components/rem/retroactive-evaluator.cjs` (evaluate/apply: PROMOTE/DISCARD against completed session arc) |
| REM-05 | Phase 11 | Complete | `modules/reverie/components/rem/editorial-pass.cjs` (entity dedup, domain merge, weight updates, taxonomy narrative; Phase 12: split/retire governance) |
| REM-06 | Phase 11 | Complete | `modules/reverie/components/rem/conditioning-updater.cjs` (updateConditioning: EMA on attention_biases, sublimation_sensitivity, recall_strategies; enforceIdentityFloors, checkDiversityThreshold) |
| REM-07 | Phase 11 | Complete | `modules/reverie/components/rem/rem-consolidator.cjs:15` ("Per REM-07: Nothing enters long-term storage without passing through the REM pipeline") |
| CTX-01 | Phase 8 | Complete | `modules/reverie/components/context/context-manager.cjs:177-179` (getInjection: synchronous, zero I/O), `modules/reverie/hooks/hook-handlers.cjs:182-293` (handleUserPromptSubmit -> additionalContext) |
| CTX-02 | Phase 10 | Complete | `modules/reverie/components/context/referential-framing.cjs` (FRAMING_TEMPLATES: full/dual/soft modes), `modules/reverie/components/context/template-composer.cjs:524` (slot 5) |
| CTX-03 | Phase 8 | Complete | `modules/reverie/components/context/budget-tracker.cjs` (BUDGET_PHASES: 4 phases at 30/60/80% thresholds), `modules/reverie/components/context/template-composer.cjs:46-50` (PHASE_BUDGETS: 1300/800/1900/1800) |
| CTX-04 | Phase 8 | Complete | `modules/reverie/hooks/hook-handlers.cjs:53-60` (COMPACTION_FRAMING), `modules/reverie/hooks/hook-handlers.cjs:378-421` (handlePreCompact: checkpoint + inject framing) |
| CTX-05 | Phase 8 | Complete | `modules/reverie/components/context/context-manager.cjs:108-132` (init: warm-start reads face-prompt.md), `modules/reverie/components/context/context-manager.cjs:305-308` (persistWarmStart) |
| OPS-01 | Phase 10 | Complete | `modules/reverie/components/modes/mode-manager.cjs:33,103-115` (ACTIVE mode, requestActive -> sessionManager.upgrade, 2 active sessions) |
| OPS-02 | Phase 10 | Complete | `modules/reverie/components/modes/mode-manager.cjs:34,117-134` (PASSIVE mode, default, 1 active session, requestPassive -> sessionManager.degrade) |
| OPS-03 | Phase 11 | Complete | `modules/reverie/components/modes/mode-manager.cjs:35,145-160` (REM mode, requestRem, degrades from Active first) |
| OPS-04 | Phase 11 | Complete | `modules/reverie/components/modes/mode-manager.cjs:36,169-180` (DORMANT mode, requestDormant, only from REM, 0 sessions) |
| INT-01 | Phase 8 | Complete | `modules/reverie/hooks/hook-handlers.cjs` (8 handlers), `modules/reverie/reverie.cjs:379-388` (exciter.registerHooks with all 8 hook types) |
| INT-02 | Phase 12 | Complete | `modules/reverie/cli/register-commands.cjs` (status/reset/inspect/history/backfill commands), `core/sdk/pulley/pulley.cjs` (CLI framework) |
| INT-03 | Phase 12 | Complete | `.gitmodules` (modules/reverie submodule), `core/services/relay/relay.cjs` + `core/services/forge/forge.cjs` (submodule management) |
| PLT-01 | Phase 7 | Complete | `core/services/wire/write-coordinator.cjs` (retry with exponential backoff), `core/services/wire/write-ahead-journal.cjs` (WAJ) |
| PLT-02 | Phase 9.1 | Complete | `core/providers/lithograph/lithograph.cjs` (parse, read, write, query), `core/providers/lithograph/parser.cjs` (PARSERS registry, v1 format detection) |
| PLT-03 | Phase 9.1 | Complete | `core/services/exciter/exciter.cjs` (registerHooks, registerAgent, registerSkill), `core/services/exciter/skill-manager.cjs` (SKILL.md generation) |

**Coverage:**
- M2 requirements: 42 total
- Mapped to phases: 42/42
- Evidence provided: 42/42
- Unmapped: 0

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-25 -- Phase 13 enrichment with file:line implementation evidence for all 42 requirements*
