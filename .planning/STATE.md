---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: "M2: Reverie Module"
status: Ready to plan
stopped_at: Completed 11-06-PLAN.md
last_updated: "2026-03-25T03:46:47.314Z"
progress:
  total_phases: 7
  completed_phases: 6
  total_plans: 26
  completed_plans: 26
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-23)

**Core value:** Everything routes through Dynamo -- the holistic wrapper via its APIs and interfaces. No component bypasses the patterns and paths Dynamo defines.
**Current focus:** Phase 11 — rem-consolidation

## Current Position

Phase: 12
Plan: Not started

## Performance Metrics

**Velocity (M1 baseline):**

- Total plans completed: 28
- Average duration: 3.2 min
- Total execution time: ~1.5 hours

**By Phase (M1):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Core Library | 3 | 9min | 3.0min |
| 2. Foundational Services | 4 | 10min | 2.5min |
| 3. Data Providers | 5 | 19min | 3.8min |
| 3.1 Wire | 4 | 17min | 4.3min |
| 3.2 Assay | 1 | 3min | 3.0min |
| 4. Framework | 4 | 13min | 3.3min |
| 5. SDK & Platform | 5 | 18min | 3.6min |
| 6. Bootstrap | 2 | 5min | 2.5min |

**Recent Trend:**

- Last 5 plans: 3min, 3min, 5min, 3min, 2min
- Trend: Stable

*Updated after each plan completion*
| Phase 07 P01 | 3min | 2 tasks | 12 files |
| Phase 07 P02 | 5min | 2 tasks | 2 files |
| Phase 07 P03 | 5min | 2 tasks | 6 files |
| Phase 07 P04 | 4min | 2 tasks | 5 files |
| Phase 07 P05 | 4min | 2 tasks | 2 files |
| Phase 08 P01 | 4min | 2 tasks | 4 files |
| Phase 08 P02 | 6min | 2 tasks | 6 files |
| Phase 09 P02 | 5min | 2 tasks | 6 files |
| Phase 09 P01 | 6min | 2 tasks | 8 files |
| Phase 09 P03 | 6min | 2 tasks | 5 files |
| Phase 09 P04 | 6min | 2 tasks | 6 files |
| Phase 09.1 P01 | 4min | 2 tasks | 4 files |
| Phase 09.1 P02 | 5min | 2 tasks | 8 files |
| Phase 09.1 P03 | 4min | 2 tasks | 4 files |
| Phase 10 P02 | 4min | 2 tasks | 4 files |
| Phase 10 P01 | 4min | 2 tasks | 6 files |
| Phase 10 P03 | 5min | 2 tasks | 6 files |
| Phase 10 P04 | 5min | 2 tasks | 4 files |
| Phase 10 P05 | 5min | 2 tasks | 5 files |
| Phase 10 P06 | 5min | 2 tasks | 3 files |
| Phase 11 P02 | 4min | 2 tasks | 4 files |
| Phase 11 P01 | 5min | 2 tasks | 7 files |
| Phase 11 P03 | 5min | 2 tasks | 4 files |
| Phase 11 P04 | 5min | 2 tasks | 4 files |
| Phase 11 P05 | 6min | 3 tasks | 6 files |
| Phase 11 P06 | 5min | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [M2 Roadmap]: 6-phase structure (Phases 7-12) derived from research dependency analysis -- each phase is a validation gate for the next
- [M2 Roadmap]: Phase 10 is a go/no-go gate -- if three sessions exceed Claude Max limits, Passive mode becomes default and Tertiary defers to v2
- [M2 Roadmap]: JSON frontmatter (not YAML) per platform data format convention and Pitfall 15 -- irreversible once fragments are written
- [M2 Roadmap]: Session spawning via Bun.spawn in Session Manager, not Conductor (Conductor's domain is Docker/infrastructure)
- [M2 Roadmap]: INT-01 (hook wiring) assigned to Phase 8 as primary owner, with hooks activated progressively as capabilities come online in subsequent phases
- [Phase 07]: JSON frontmatter is a clean break from YAML -- no dual-format support, no backward compatibility
- [Phase 07]: All exported module constants use Object.freeze() for runtime immutability
- [Phase 07]: WAJ uses node:fs appendFileSync for synchronous atomic-per-line journaling
- [Phase 07]: Retry delay skip re-enqueues items rather than blocking queue, preserving throughput
- [Phase 07]: Zod 4 requires z.record(z.string(), valueSchema) -- adapted Self Model schemas from plan's Zod 3 syntax
- [Phase 07]: validateFragment() returns Result-compatible { ok, value/error } wrapping Zod safeParse, matching platform convention
- [Phase 07]: Self Model save() auto-sets version and timestamp, callers provide frontmatter but version is managed internally
- [Phase 07]: Entropy engine uses LCG for seeded determinism, Box-Muller for gaussian noise -- zero external dependencies
- [Phase 07]: FragmentWriter queues one envelope per association table for batching efficiency
- [Phase 07]: Dual-provider write pattern: Journal first, Ledger via Wire, rollback on failure
- [Phase 08]: Phase 3 reinforced (60-80%) injection LARGER than Phase 1 per PITFALLS research D-05/D-06
- [Phase 08]: Behavioral directives seeded with static defaults per D-04, replaced by Secondary in Phase 10
- [Phase 08]: All hook injection uses additionalContext not systemMessage per Pitfall 1 -- corrects CONTEXT.md D-02/D-09
- [Phase 08]: Context Manager in-memory cache for zero-I/O getInjection() hot path per Pitfall 4
- [Phase 08]: Hook registration via Armature createHookRegistry not events.on() per INT-01 for discoverability
- [Phase 09]: Self Model relevance uses fixed aspect weights matching DECAY_DEFAULTS.relevance_weights for system-wide consistency
- [Phase 09]: Passive nudge forbids explicit memory language; explicit reconstruction drives full re-experiencing through Self Model frame
- [Phase 09]: Temporal schema mapped to actual Zod fields (absolute/session_relative/sequence) not plan approximation
- [Phase 09]: Associations schema includes emotional_valence per actual Zod schema -- plan interface block omitted this field
- [Phase 09]: Attention gate returns pure_tool_turn over empty_prompt when tools_used populated and user_prompt falsy
- [Phase 09]: Formation pipeline populates master association tables via Wire upserts BEFORE fragment writes to prevent FK gaps (Pitfall 5)
- [Phase 09]: Recall engine uses same composite scorer instance for both passive and explicit paths per D-12
- [Phase 09]: Formation agent definition placed at .claude/agents/ (Claude Code discovery path), not modules/reverie/agents/
- [Phase 09]: handleSubagentStop filters by agent_name to only process reverie-formation output, passes through for all other subagents
- [Phase 09]: Combined additionalContext injection: face prompt + nudge + recall with labeled delimiters
- [Phase 09.1]: Versioned parser with PARSERS registry (Object.freeze) for v1 format detection — future format changes add a new parser, no consumer changes
- [Phase 09.1]: Session-scoped transcript_path via setTranscriptPath() matches Journal basePath injection pattern — sync reads, async writes
- [Phase 09.1]: Parser metadata (_parserVersion, _lineIndex) stripped on serialize to avoid polluting transcript file
- [Phase 09.1]: Exciter delegates to Armature createHookRegistry for hook mechanics, owning only the registration facade per D-05
- [Phase 09.1]: wireToSwitchboard called once in start(), not per-registration, per Pitfall 6
- [Phase 09.1]: Section markers use dynamo:section prefix to prevent false matches in content per D-07
- [Phase 09.1]: Lithograph registered with lathe-only dependency since transcript events route through Commutator
- [Phase 09.1]: transcript_path injection before compact check so both new and post-compaction sessions receive the path
- [Phase 10]: Referential framing templates wrapped in <referential_frame> XML tags for slot 5 structured injection
- [Phase 10]: Sublimation system prompt uses practical step-by-step cycle instructions for Tertiary execution
- [Phase 10]: Sensitivity range [0,1] inclusive with INVALID_SENSITIVITY error for out-of-range values
- [Phase 10]: Session spawner lives in core/services/conductor/ as platform capability, not module scope
- [Phase 10]: Conductor delegates to internal _sessionSpawner created during init(), not exposed directly
- [Phase 10]: Topology rules enforce strict hub-spoke: Primary<->Secondary<->Tertiary, no Primary<->Tertiary bypass
- [Phase 10]: Added STOPPED to STARTING valid transitions for spawn failure path
- [Phase 10]: Sublimation system prompt delivered via Wire context-injection from Secondary to Tertiary after registration
- [Phase 10]: Mode Manager auto-degrades on Tertiary health failure with reason tracking via Switchboard
- [Phase 10]: Mind cognitive cycle uses formationPipeline.prepareStimulus for attention worthiness -- empty user_prompt indicates below-threshold
- [Phase 10]: Wire topology subscribe takes separate sessionId and subscriberIdentity params for topology-aware filtering
- [Phase 10]: ACK protocol uses _pendingAcks Map with timer-based timeout and Promise resolution for async delivery confirmation
- [Phase 10]: Session Manager start() fire-and-forget in SessionStart hook for non-blocking hook response
- [Phase 10]: Context Manager compose() short-circuits when _secondaryActive true -- Secondary is face prompt authority per D-04
- [Phase 10]: All Phase 10 hook handler components use null-guard pattern for backward compatibility
- [Phase 10]: String literals for state matching in switchboard listener — avoids circular require risk
- [Phase 10]: DIRECTIVE payload.role filtering for typed Wire message sub-routing without new message types
- [Phase 11]: Triage snapshot async-wraps synchronous filesystem writes via Lathe for future-proofing
- [Phase 11]: Heartbeat monitor emits timeout once per period with flag reset on resume for D-03 abort signaling
- [Phase 11]: initShutdown() added to Session Manager to separate SHUTTING_DOWN entry from atomic stop() for REM lifecycle
- [Phase 11]: REM mode getMetrics active_sessions_count=1 (Secondary stays alive per D-13)
- [Phase 11]: EMA record-level updates default new keys to 0.5 midpoint for smooth first-seen evidence integration
- [Phase 11]: Dual-signal quality evaluation: behavioral (0.4) + LLM reflection (0.6) with behavioral-only fallback per D-12
- [Phase 11]: Prompt/apply separation: evaluator and editorial pass compose LLM prompts but never call LLM directly -- orchestrator feeds and passes responses back for testability
- [Phase 11]: Domain merge narratives written as consolidation-type fragments to Journal via fragmentWriter, covering D-08 taxonomy narrative requirement
- [Phase 11]: Full REM accepts llmResponses parameter for prompt/apply separation -- orchestrator never calls LLM directly
- [Phase 11]: Provisional REM uses _running/_aborted/_tentativeFragmentIds state machine for clean lifecycle
- [Phase 11]: REM consolidator is single entry point for all consolidation -- enforces REM-07 gate
- [Phase 11]: handleStop REM transition is fire-and-forget: hook returns immediately, Tier 3 runs async on Secondary

### Roadmap Evolution

- M1 phases 1-6 shipped 2026-03-23 (28 plans, 851 tests)
- M2 phases 7-12 roadmapped from 40 requirements across 7 categories
- Phase 9.1 inserted after Phase 9: Claude Code Integration Layer (Lithograph provider + Exciter service) — platform-level Claude Code transcript access and integration surface management

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 9: Formation fan-out signal-to-noise ratio is experimentally unvalidated (EXPERIMENTAL 9.10)
- Phase 10: Claude Max concurrent session limits unknown -- go/no-go gate for three-session architecture (EXPERIMENTAL 9.4)
- Phase 10: Channels API is research preview -- stability not guaranteed
- Phase 11: Decay constant tuning needs simulation harness (EXPERIMENTAL 9.3)
- Phase 12: Backfill formation pathway design needs research -- retrospective vs. experiential framing

## Session Continuity

Last session: 2026-03-25T03:41:01.681Z
Stopped at: Completed 11-06-PLAN.md
Resume file: None
