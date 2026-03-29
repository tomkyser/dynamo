---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: "M2: Reverie Module"
status: Ready to execute
last_updated: "2026-03-29T04:18:38.356Z"
last_activity: 2026-03-29
progress:
  total_phases: 13
  completed_phases: 0
  total_plans: 0
  completed_plans: 1
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-23)

**Core value:** Everything routes through Dynamo -- the holistic wrapper via its APIs and interfaces. No component bypasses the patterns and paths Dynamo defines.
**Current focus:** Phase 17 — persistent-runtime-prompt-infrastructure

## Current Position

Phase: 17 (persistent-runtime-prompt-infrastructure) — EXECUTING
Plan: 3 of 10

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
| Phase 12 P01 | 3min | 2 tasks | 7 files |
| Phase 12 P02 | 4min | 2 tasks | 5 files |
| Phase 12 P03 | 4min | 2 tasks | 5 files |
| Phase 12 P04 | 5min | 2 tasks | 4 files |
| Phase 12 P05 | 5min | 2 tasks | 5 files |
| Phase 12 P06 | 5min | 2 tasks | 7 files |
| Phase 12.1 P01 | 3min | 2 tasks | 4 files |
| Phase 12.1 P02 | 4min | 2 tasks | 3 files |
| Phase 12.1 P03 | 4min | 2 tasks | 5 files |
| Phase 12.1 P04 | 5min | 2 tasks | 6 files |
| Phase 12.1 P05 | 3min | 2 tasks | 3 files |
| Phase 13 P03 | 5min | 2 tasks | 2 files |
| Phase 13 P02 | 8min | 2 tasks | 2 files |
| Phase 13 P01 | 8min | 2 tasks | 4 files |
| Phase 13 P06 | 4min | 2 tasks | 3 files |
| Phase 13 P05 | 5min | 2 tasks | 2 files |
| Phase 13 P04 | 6min | 2 tasks | 2 files |
| Phase 13 P07 | 8min | 2 tasks | 4 files |
| Phase 14 P02 | 3min | 2 tasks | 5 files |
| Phase 14 P01 | 4min | 2 tasks | 5 files |
| Phase 15 P02 | 3min | 2 tasks | 3 files |
| Phase 15 P01 | 3min | 2 tasks | 5 files |
| Phase 15 P04 | 3min | 2 tasks | 4 files |
| Phase 15 P03 | 3min | 2 tasks | 5 files |
| Phase 16 P01 | 3min | 2 tasks | 4 files |
| Phase 16 P02 | 6min | 2 tasks | 6 files |
| Phase 16 P03 | 4min | 4 tasks | 8 files |
| Phase 17 P03 | 3min | 2 tasks | 4 files |
| Phase 17 P02 | 4min | 2 tasks | 4 files |

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
- [Phase 12]: source_locator id format: sl-{fragment_id} for deterministic uniqueness
- [Phase 12]: origin field placed between formation and source_locator in baseFragmentSchema for logical provenance grouping
- [Phase 12]: Mode Manager API uses getMode() returning string -- adapted from actual code vs plan interface block
- [Phase 12]: process.argv direct check for --confirm since Pulley only parses --json/--raw/--help
- [Phase 12]: Confirm check BEFORE any destructive operation per Pitfall 6 -- no partial resets
- [Phase 12]: Pressure gradient uses max() across domain/entity/edge dimensions for threshold determination
- [Phase 12]: taxonomyGovernor injected as optional dependency into editorial pass via null guard pattern
- [Phase 12]: Backfill parser uses PARSERS registry pattern from Lithograph for versioned format detection
- [Phase 12]: BACKFILL_TEMPLATES composed in backfill-pipeline and passed as stimulus.backfill_prompt for formation override
- [Phase 12]: Per-conversation fragment cap enforced in processConversation loop for backfill safety
- [Phase 12]: Conditional CLI registration: facade.registerCommand availability check gates CLI wiring for backward compat
- [Phase 12]: Cap pressure computed in full-rem.cjs Step 3 (orchestrator has domainData) not in editorial pass
- [Phase 12]: Backfill command in register-commands.cjs for single-orchestrator CLI pattern consistency
- [Phase 12.1]: Named export resolution pattern for module manifest.cjs (direct > default > first named property with name+main)
- [Phase 12.1]: YAML frontmatter built via string concatenation per plan (no YAML library) for skill SKILL.md files
- [Phase 12.1]: Skills are conversational wrappers that instruct Claude to run Pulley CLI commands per D-03
- [Phase 12.1]: ANSI 256-color codes (Face=39 blue, Mind=214 amber, Subconscious=141 purple) for cross-theme readability per D-11
- [Phase 12.1]: Triplet ID reset in both stop() and completeRem() to prevent stale IDs across session lifecycles
- [Phase 12.1]: Integration tests use real module code with mock dependencies for fast CI verification
- [Phase 12.1]: Checkpoint log uses JSON format with three overall states (pass/fail/partial) per D-15
- [Phase 13]: Composite scorer 6 factors cover spec's 7 ranking dimensions by subsuming attention pointer similarity into attention_tag_match
- [Phase 13]: No spec violations found for fragment schema, types, decay formula, association index, and source-reference model (spec 3.1-3.5, 3.8-3.9, 3.11)
- [Phase 13]: Compliance matrix uses 6 status codes (C/D/V/M/NA/EXP) for comprehensive spec audit categorization
- [Phase 13]: Relational Model relational_dynamics field intentionally omitted -- deviation D-13 in compliance matrix, deferred to future phase
- [Phase 13]: No spec violations found for context management or platform integration -- all documented deviations match STATE.md records
- [Phase 13]: No spec violations found for REM consolidation (spec 5.1-5.4) -- all implementations comply with 5 documented deviations from Phase 11/12
- [Phase 13]: No spec violations found for three-session architecture (topology, roles, lifecycle, urgency levels, ACK protocol)
- [Phase 13]: Compliance matrix audit verdict: PASS -- 0 Missing, 0 unfixed Violations across 97 total rows
- [Phase 14]: Defined --dry-run, --confirm, --limit, --batch-size as explicit parseArgs options rather than relying on strict:false unknown flag parsing
- [Phase 14]: Status Wire.query() code is correctly wired -- the 0 default is for empty data, not a stub
- [Phase 14]: _wiredTypes Set for idempotent wireToSwitchboard prevents duplicate Switchboard handler registration
- [Phase 14]: Bootstrap step 7.6 re-wires Exciter after module registration; step 7.7 generates settings.json entries for all 8 hook types
- [Phase 14]: Lathe readJson/writeJson implemented as sync fs ops for settings-manager compatibility
- [Phase 15]: Welcome flag at resolvedDataDir/.welcome-shown survives reset all; cold-start branch only; null-guard backward compat
- [Phase 15]: Stop handler mirrors hook-handlers.cjs handleStop fire-and-forget pattern for consistent REM lifecycle
- [Phase 15]: Added sessionManager, remConsolidator, contextManager to cliContext in reverie.cjs for stop command REM shutdown
- [Phase 15]: Error recovery format: What happened -- context. Try: bun bin/dynamo.cjs <recovery command>
- [Phase 15]: README serves as first-user onboarding document with complete CLI command list, correct fragment types, and first-run experience
- [Phase 15]: Removed Bash from formation agent tools -- agent only reads stimulus and writes JSON, Read + Write sufficient (least privilege)
- [Phase 15]: Skill content cross-reference test pattern: extract command refs via regex, validate against known command arrays from register-commands.cjs and platform-commands.cjs
- [Phase 16]: Ledger provider writes immediately on every save() -- no delayed batching, DuckDB is fast enough
- [Phase 16]: Provider selection priority: explicit (tests) > Ledger > JSON file > null for backward compatibility
- [Phase 16]: Options-based DI (_deps) for terminal-spawn.cjs test isolation -- consistent with project pattern
- [Phase 16]: useTerminal flag defaults to process.platform === 'darwin' for automatic macOS detection
- [Phase 16]: Terminal-spawned sessions report alive=true in health -- real liveness via relay /health
- [Phase 16]: Magnet fire-and-forget in sync _setMode/_transition: data in-memory immediately, Ledger write async
- [Phase 16]: Clean-start kills stale Secondary/Tertiary/relay PIDs via SIGTERM with catch for already-dead
- [Phase 16]: Relay port placeholder (9876) persisted by start handler; Plan 04 wires real relay lifecycle
- [Phase 17]: Daemon spawned via nohup + Bun.spawn with .unref() for full detachment from parent shell
- [Phase 17]: Atomic PID file write pattern (tmp + rename) to prevent partial reads by thin client
- [Phase 17]: 10MB log cap with tail-keep (last 5MB) rather than external log rotation
- [Phase 17]: EPERM from process.kill(pid, 0) treated as alive (different owner) to avoid false stale detection
- [Phase 17]: inspect() returns unfrozen plain object for BOM debug output, decoupled from Forme immutability
- [Phase 17]: Budget overage logged to stderr, not thrown -- budget is advisory per PRD
- [Phase 17]: cast() computes resolved_slots from Matrix slot keys present in context

### Roadmap Evolution

- M1 phases 1-6 shipped 2026-03-23 (28 plans, 851 tests)
- M2 phases 7-12 roadmapped from 40 requirements across 7 categories
- Phase 9.1 inserted after Phase 9: Claude Code Integration Layer (Lithograph provider + Exciter service) — platform-level Claude Code transcript access and integration surface management
- Phase 12.1 inserted after Phase 12: Platform Launch Readiness (URGENT) — module discovery/loading, Claude Code hook wiring, session triplet spawning/management via Claude skills, multi-triplet concurrency, visual session distinction, end-to-end system validation
- Phase 13 added: Spec Compliance Audit & E2E Integration Verification — adversarial audit of every component against canonical specs, live bootstrap verification, zero tolerance for spec violations
- Phase 15 added: User Journey Gap Closure — walk every user-facing surface (skills, CLI, agents) as a first-time user, close gaps where promised actions fail or don't exist. All fixes must route through Armature/Circuit/Pulley. Known starting point: /reverie skill references non-existent `reverie start` command
- Phase 16 added: Reverie End-to-End Delivery — real state persistence via Magnet/Ledger, real session spawning via Conductor (3 terminal windows), real Wire communication, zero stubs. Triggered by discovering all state is in-memory only and resets every CLI invocation.
- Phase 14 added: Deployment Readiness & Architecture Compliance — fix Exciter bootstrap timing + settings.json, migrate backfill CLI to Pulley flags, wire status metrics, verify E2E install-to-use flow, architecture compliance audit
- Phase 17 added: Persistent Runtime & Prompt Infrastructure — daemon runtime + Linotype prompt infrastructure. Inserted after Phase 16 pause due to architectural violation in hook handlers (hooks are stateless CLI invocations but Phase 16 needs persistent state)

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 9: Formation fan-out signal-to-noise ratio is experimentally unvalidated (EXPERIMENTAL 9.10)
- Phase 10: Claude Max concurrent session limits unknown -- go/no-go gate for three-session architecture (EXPERIMENTAL 9.4)
- Phase 10: Channels API is research preview -- stability not guaranteed
- Phase 11: Decay constant tuning needs simulation harness (EXPERIMENTAL 9.3)
- Phase 12: Backfill formation pathway design needs research -- retrospective vs. experiential framing

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260325-hcr | Wire Exciter into bootstrap container, create CLI executable entry point, and add a README with install/run steps | 2026-03-25 | 2ec74fb | [260325-hcr-wire-exciter-into-bootstrap-container-cr](./quick/260325-hcr-wire-exciter-into-bootstrap-container-cr/) |

## Session Continuity

Last activity: 2026-03-29
Resume file: None
