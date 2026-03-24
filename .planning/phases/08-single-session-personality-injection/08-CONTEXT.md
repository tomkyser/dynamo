# Phase 8: Single-Session Personality Injection - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Validate that continuous Self Model personality injection via Claude Code hooks produces measurable personality persistence across turns at varying context utilization levels. This phase delivers: template-driven Face prompt composition from Self Model state (CTX-01), research-backed context budget management with reinforcement at high utilization (CTX-03), PreCompact checkpoint + framing injection for compaction survival (CTX-04), warm-start face prompt cache for instant personality on SessionStart (CTX-05), and all 8 Claude Code hook types wired through Armature's hook registry to Reverie handlers (INT-01). This is the empirical gate before multi-session complexity.

</domain>

<decisions>
## Implementation Decisions

### Face Prompt Composition
- **D-01:** Template-driven composition. Context Manager reads Self Model aspects (identity-core, relational-model, conditioning) and fills a structured prompt template with extracted values. Template has 5 slots: Identity Frame (~200-400 tokens), Relational Context (~100-200 tokens), Attention Directives (~100-300 tokens), Behavioral Directives (~100-200 tokens), Referential Framing (~100-200 tokens). Total per-turn budget: ~800-1800 tokens at full injection.
- **D-02:** Delivery via state file + hook read. Context Manager writes the composed Face prompt to a well-known file (`~/.dynamo/reverie/face-prompt.md` or equivalent). The UserPromptSubmit hook reads this file synchronously and returns it as `systemMessage`. This matches the spec's Phase 10 design (Secondary writes, hook reads) -- only the writer changes. The same file serves as the warm-start cache (CTX-05).
- **D-03:** Recomposition triggers: on SessionStart (initial compose) and on context budget phase transitions. Also recompose after compaction (budget reset to full). Between transitions, the same file is read repeatedly -- no wasted work.
- **D-04:** Behavioral Directives slot seeded with static defaults derived from Self Model state in Phase 8 (e.g., "technical depth: match user", "communication mode: balanced"). Secondary replaces these with dynamic directives in Phase 10. Ensures the full template structure is exercised and testable now.

### Context Budget Strategy
- **D-05:** Follow the PITFALLS research model, NOT the spec's budget phases. At high context utilization, the injection gets LARGER, not smaller. Rationale: if 90% of context is raw material, the Self Model needs proportionally stronger injection to compete for attention. The spec's "minimal injection at 75-90%" is exactly backwards for personality persistence.
- **D-06:** Four budget phases with research-backed thresholds:
  - Phase 1 (0-30% utilization): Full injection ~1200 tokens, all 5 template slots
  - Phase 2 (30-60%): Compressed ~800 tokens, tighten identity frame, summarize relational context
  - Phase 3 (60-80%): Reinforced ~1500-2000 tokens, STRENGTHEN identity frame + referential framing, add PostToolUse micro-nudges (~50-100 tokens each)
  - Phase 4 (>80%): Compaction advocacy -- full injection + directive to trigger compaction, proactive not reactive
- **D-07:** Context utilization measured via cumulative byte tracking from hook payloads. Track user_prompt size (UserPromptSubmit), tool_output size (PostToolUse), plus a multiplier estimate for model responses. Use bytes-to-tokens heuristic (~4 bytes/token for English). Hooks already receive these payloads.
- **D-08:** PostToolUse micro-nudges included in Phase 8. Brief personality reinforcement (~50-100 tokens) after every tool call, activated only in Phase 3 (reinforced) budget. Format: "Remember: you are [identity phrase]. Current attention: [pointer]." Tests the re-anchoring mechanism empirically.

### Compaction Survival
- **D-09:** PreCompact does two things: (1) Saves a checkpoint file to Journal (`reverie/data/checkpoints/compact-{timestamp}.json`) containing full Face prompt text, current budget phase, cumulative context bytes, active attention directives, and last entropy state. (2) Injects a `systemMessage` that frames how compaction should summarize -- preserve Self Model frame and active directives verbatim, preserve user's current intent, summarize through attention priorities, discard re-retrievable raw source content.
- **D-10:** Post-compaction full reinjection. After compaction, reset budget phase to Phase 1 (full). The next UserPromptSubmit injects the complete Face prompt. Treat post-compaction as a mini-SessionStart. Reset the cumulative byte counter to an estimate of post-compaction size.

### Hook Wiring (INT-01)
- **D-11:** All 8 hooks wired with real handlers. Hooks without dedicated Phase 8 behavior (SubagentStart/Stop, PreToolUse) log the event to Switchboard and update context utilization metrics (byte tracking). Every hook contributes to the cumulative context estimate, making budget phase transitions more accurate.
- **D-12:** Stop hook persists warm-start cache + state snapshot. On Stop: (1) Write current Face prompt to the warm-start cache file (CTX-05). (2) Save a session-end state snapshot (final budget phase, cumulative bytes, turn count, entropy state). This becomes the warm-start source for the next SessionStart. In Phase 11, REM processing replaces the simple snapshot with full consolidation.
- **D-13:** SessionStart hook reads warm-start cache if it exists. If not (first session ever), runs cold-start initialization (Phase 7's cold-start.cjs), then composes a Face prompt from the fresh Self Model state. The user's very first turn always has personality -- even if it's the sparse-default personality with entropy engine variance.

### Claude's Discretion
- Face prompt template exact wording and format (the slot structure is decided; exact prompt engineering is implementation)
- Checkpoint file schema details beyond the fields listed in D-09
- Byte-to-token heuristic calibration and model response size multiplier
- How compaction is detected (hook event vs. context size drop between turns)
- PostToolUse micro-nudge exact phrasing
- Test harness design for measuring personality persistence across turns

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Spec
- `.claude/new-plan.md` -- Architecture plan. Absolute canon. Engineering principles, layer hierarchy, IoC patterns.
- `.claude/reverie-spec-v2.md` -- Reverie module specification. Canon. Sections critical for Phase 8:
  - Section 4.2 (Primary Session / Face) -- How Secondary influences Primary, hook enforcement, urgency levels
  - Section 8 (Primary Context Management) -- The full context management design: continuous reinjection, referential framing, context budget phases, Self Model as compaction frame
  - Section 8.3 (Continuous Self Model Reinjection) -- Per-turn injection components and size budgets
  - Section 8.4 (Referential Framing Prompt) -- Standing instruction for Primary to treat context as reference material
  - Section 8.5 (Context Budget Management) -- 4-phase budget system (NOTE: Phase 8 uses RESEARCH thresholds, not spec thresholds)
  - Section 8.6 (Self Model as Compaction Frame) -- PreCompact hook framing strategy
  - Section 9.7 (EXPERIMENTAL: Directive Compliance) -- Risk that Primary ignores injected directives
  - Section 9.9 (EXPERIMENTAL: Referential Framing Effectiveness) -- At what utilization percentage does framing lose influence

### Research
- `.planning/research/PITFALLS.md` -- Critical pitfalls that override spec decisions for Phase 8:
  - Pitfall 2 (Personality Prompt Erosion) -- WHY injection must reinforce at high utilization, not shrink. The 5-point prevention strategy.
  - Pitfall 5 (Compaction Destroys Self Model Frame) -- WHY PreCompact needs checkpoint + post-compaction full reinjection. 46% constraint retention stat.
  - Pitfall 6 (Session Startup Latency) -- WHY warm-start cache is critical. Seed Face prompt from last session's state.
- `.planning/research/SUMMARY.md` -- Research synthesis with phase ordering rationale
- `.planning/research/ARCHITECTURE.md` -- Component responsibilities, session spawning approach

### Requirements
- `.planning/REQUIREMENTS.md` -- M2 requirements. Phase 8 requirements: CTX-01, CTX-03, CTX-04, CTX-05, INT-01

### Prior Phase Context
- `.planning/phases/07-foundation-infrastructure/07-CONTEXT.md` -- Phase 7 decisions affecting Phase 8:
  - D-02: Component directory structure (context/ already exists as placeholder)
  - D-03: Data directory at `~/.dynamo/reverie/` (where state files live)
  - D-05: One Journal file per Self Model aspect with JSON frontmatter
  - D-07/D-08: Entropy engine with conditioned entropy (affects SessionStart cold-start composition)

### Existing Code (read before modifying)
- `core/armature/hooks.cjs` -- Hook registry with HOOK_SCHEMAS, HOOK_EVENT_NAMES, createHookRegistry(). Register/wireToSwitchboard/loadFromConfig already built.
- `core/services/commutator/commutator.cjs` -- HOOK_EVENT_MAP mapping hook types to Switchboard events. Ingest/routing already built.
- `modules/reverie/reverie.cjs` -- Module entry point (skeleton -- needs real initialization with hook registration)
- `modules/reverie/components/self-model/self-model.cjs` -- Self Model manager with save/load/getAspect/setAspect
- `modules/reverie/components/self-model/cold-start.cjs` -- Cold-start initialization from seed prompt
- `modules/reverie/components/self-model/entropy-engine.cjs` -- Stochastic variance for trait weights
- `modules/reverie/lib/schemas.cjs` -- Zod schemas for Self Model aspects
- `modules/reverie/lib/constants.cjs` -- Module constants (SM_ASPECTS, etc.)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Hook registry** (`core/armature/hooks.cjs`): Full registry with register(), wireToSwitchboard(), loadFromConfig(). Phase 8 registers Reverie handlers through this.
- **Commutator** (`core/services/commutator/commutator.cjs`): HOOK_EVENT_MAP already routes hook payloads to Switchboard events. Ingest pipeline built. Phase 8 hooks receive events through Switchboard.
- **Self Model manager** (`modules/reverie/components/self-model/self-model.cjs`): save/load/getAspect/setAspect with 3-provider persistence (Journal + Magnet + Ledger). Context Manager reads aspects through this.
- **Cold-start** (`modules/reverie/components/self-model/cold-start.cjs`): Initialization from seed prompt with sparse defaults. Used by SessionStart when no warm-start cache exists.
- **Entropy engine** (`modules/reverie/components/self-model/entropy-engine.cjs`): Stochastic variance for Self Model trait weights. SessionStart applies entropy before composing the Face prompt.
- **lib/result.cjs**: ok/err pattern for all Phase 8 components.
- **lib/contract.cjs**: createContract() for Context Manager and hook handler APIs.

### Established Patterns
- **Options-based DI**: Context Manager takes injected dependencies (selfModel, journal, magnet, switchboard). Test isolation via mock injection.
- **Contract shapes**: SHAPE constant + createContract() for frozen public APIs.
- **Event emission**: Switchboard-based events on state changes (budget phase transitions should emit events).
- **File structure**: Components in `modules/reverie/components/context/` with implementation + `__tests__/`.

### Integration Points
- **Armature hook registry -> Reverie handlers**: `reverie.cjs` register function wires hook handlers via the registry.
- **Switchboard events -> Context Manager**: Hook events flow through Switchboard; Context Manager listens for budget-relevant events.
- **Self Model manager -> Face prompt template**: Context Manager reads Self Model aspects to fill template slots.
- **Journal -> Checkpoint files**: PreCompact writes checkpoint to Journal. Post-compaction reads checkpoint for recovery.
- **Lathe -> State file writes**: Face prompt file and warm-start cache written via Lathe for atomic writes.

</code_context>

<specifics>
## Specific Ideas

### Research Over Spec
The user chose to follow the PITFALLS research over the spec's context budget phases. This is a deliberate departure from Section 8.5 of reverie-spec-v2.md. The research model (reinforce at high utilization) is grounded in Anthropic's attention budget research and the documented 46% constraint retention after compaction. The spec's model (minimize at high utilization) optimizes for token economy at the cost of personality persistence -- the exact failure mode the research warns about.

### PostToolUse Micro-Nudges
Brief personality reinforcement after tool calls was included in Phase 8 scope (not deferred to Phase 10). This enables empirical measurement of the re-anchoring mechanism: does periodic nudging between user turns measurably improve personality persistence at high context utilization?

### Warm-Start as Single File
The Face prompt state file and warm-start cache are the same file. On Stop, it's written for the next session. On SessionStart, it's read for instant personality. Dual-purpose design eliminates a separate cache management concern.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 08-single-session-personality-injection*
*Context gathered: 2026-03-24*
