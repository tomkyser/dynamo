# Phase 24: Cognitive Pipeline - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

The Inner Voice processes every hook event through a cognitive pipeline -- extracting entities, updating activation maps, selecting hot or deliberation path, formatting injections within token budgets, and communicating with the deliberation subagent via a crash-safe state bridge. Replaces Phase 23 pass-through stubs with real cognitive processing. Migrates all curation functions from Ledger to Reverie as subagent-based processing. Does NOT include hybrid A/B comparison (Phase 25), CLI voice commands (Phase 25), or install pipeline updates (Phase 26).

</domain>

<decisions>
## Implementation Decisions

### Injection Voice & Format
- **D-01:** Contextual narrative tone for all injections. Frames facts in context: "When you worked on X last session, you decided Y because Z." Readable, conversational, grounded in the user's experience.
- **D-02:** Distinct formats for hot path vs deliberation. Hot path uses shorter, bullet-oriented narrative (template-based, no LLM). Deliberation produces fuller paragraphs with reasoning and cross-entity connections. Both sound like the same voice but at different depths.
- **D-03:** Light framing for adversarial counter-prompting. Templates wrap facts with "from user's experience" and "as they described it" qualifiers. Prevents canonical drift without being heavy-handed. Example: "User chose X (their reasoning: Y)" rather than "X is the best approach."
- **D-04:** Session-start briefings use the same contextual narrative format as mid-session, just longer (500 tokens vs 150). Consistent voice throughout -- no distinct briefing format.

### Curation Migration Scope
- **D-05:** Full migration. All 5 curation functions (curation, precompact, prompt-context, session-name, session-summary) move from Ledger to Reverie as subagent-based processing. OpenRouter/Haiku dependency removed entirely from the cortex path. Ledger retains only deterministic formatting (no LLM calls).
- **D-06:** Template fallback on degradation. When subagent spawn fails or rate limit is hit, hot-path template formatting produces reduced-quality but functional injections. Session naming falls back to timestamp-based naming. Same degradation pattern as the existing OpenRouter-unavailable path.
- **D-07:** Inner-voice subagent definition lives at `cc/agents/inner-voice.md`. New directory following the cc/ platform adapter pattern. Matches REVERIE-SPEC Section 8 and OPS-03 install scope.
- **D-08:** Existing cc/prompts/ templates kept for classic mode. Classic mode still routes to Ledger handlers which use these prompts via OpenRouter. Only removed when classic mode is eventually sunset post-M2.

### Silence vs. Injection Threshold
- **D-09:** Adaptive from conservative posture. Start at sublimation threshold 0.6 (spec default). If injections are consistently acknowledged (user references them in subsequent prompts), gradually lower threshold. If ignored, raise it. Self-calibrating across sessions.
- **D-10:** Keyword overlap for semantic shift detection (v1.3). Compare entity sets between consecutive prompts. If overlap drops below threshold (e.g., <30% shared entities), flag as semantic shift. Deterministic, fast, no embeddings required.
- **D-11:** Explicit recall ("do you remember X") triggers recall + deliberation. Bypass sublimation threshold entirely AND spawn deliberation subagent for deep graph query. Most thorough answer possible -- worth the deliberation budget when the user explicitly asks.
- **D-12:** Complete silence when predictions match reality. If IV-12 predictions match the current prompt, inject nothing. Silence IS the signal that things are going as expected. Saves token budget.

### Deliberation Budget
- **D-13:** No hard budget enforcement in Phase 24. The existing OPS-MON-01 spawn tracking counts spawns but no hard cap is enforced. Use a high soft cap (default 50 instead of 20) that warns in logs when approaching the limit but doesn't hard-stop. Gather baseline data during hybrid mode (Phase 25) before setting real limits.
- **D-14:** SessionStart always triggers deliberation. Every session spawns the inner-voice subagent for a briefing. This is the user's first impression -- worth the cost. Falls back to template briefing only if spawn fails.
- **D-15:** Stop always triggers deliberation for REM Tier 3 synthesis. Session-end always spawns the inner-voice subagent for consolidation. Falls back to state-persistence-only (REM Tier 1) if spawn fails.

### Claude's Discretion
- PreCompact deliberation heuristic (when to spawn subagent for compact summary vs state-persistence-only)
- Exact keyword overlap threshold for semantic shift detection calibration
- Threshold adaptation speed (how fast the sublimation threshold adjusts)
- Metacognitive adjustment range (spec says +/- 0.1, exact implementation flexible)
- Hot-path template variable design and structure
- Rate limit recovery timing

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Reverie Architecture
- `.planning/research/REVERIE-SPEC.md` -- Full Inner Voice subsystem specification. Processing pipelines (Section 5), sublimation threshold (Section 6), state management (Section 7), hybrid architecture (Section 4), curation migration (Section 3 curation.cjs), subagent definition (Section 8)
- `.planning/research/INNER-VOICE-ABSTRACT.md` -- Platform-agnostic Inner Voice concept. Spreading Activation (Section 5), Dual-Process theory, Predictive Processing, Sublimation model

### Requirements and Roadmap
- `.planning/REQUIREMENTS.md` -- M2 requirements IV-05 through IV-11, PATH-01 through PATH-06
- `.planning/ROADMAP.md` -- Phase 24 goal, requirements list, success criteria (5 criteria)

### Project Context
- `.planning/research/DYNAMO-PRD.md` -- Subsystem boundaries (Section 3), platform adapter pattern (Section 2), non-functional requirements (Section 6), graceful degradation (Section 6.5)

### Prior Phase Context
- `.planning/phases/23-foundation-and-routing/23-CONTEXT.md` -- Phase 23 decisions: stub handler strategy, dispatcher routing, config CLI surface, state file schema, activation module. Phase 24 builds directly on all of these.

### Existing Code (Key Integration Points)
- `subsystems/reverie/handlers/` -- 7 pass-through stubs that Phase 24 replaces with real pipeline logic
- `subsystems/reverie/activation.cjs` -- Complete activation module (entity extraction, spreading activation, decay, sublimation scoring)
- `subsystems/reverie/state.cjs` -- State file module (loadState, persistState, freshDefaults with LIVE + STUBBED sections)
- `cc/hooks/dynamo-hooks.cjs` -- Dispatcher with dual-mode routing (classic/cortex)
- `subsystems/ledger/curation.cjs` -- Current Haiku/OpenRouter curation functions being migrated
- `cc/prompts/` -- 5 existing prompt templates (curation.md, precompact.md, prompt-context.md, session-name.md, session-summary.md) -- kept for classic mode
- `lib/core.cjs` -- loadConfig(), logError(), isEnabled(), loadPrompt() -- shared utilities

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `subsystems/reverie/activation.cjs`: Full entity extraction + spreading activation + decay + sublimation scoring. Phase 24 passes real Assay results instead of test mocks.
- `subsystems/reverie/state.cjs`: State file with atomic write, corruption recovery, freshDefaults(). Phase 24 activates the stubbed sections (self_model, relationship_model, injection_history, pending_associations).
- `lib/core.cjs` loadPrompt(): Loads YAML-frontmatter prompt files from cc/prompts/. May inform how Reverie templates are structured.
- `lib/core.cjs` logError(): Error logging with rotation. Used for degradation event logging.
- `subsystems/ledger/curation.cjs` callHaiku(): Reference for how curation currently works -- Phase 24 replaces this with subagent spawns.

### Established Patterns
- Options-based test isolation: all modules accept `options = {}` for dependency injection in tests
- Branding header: `// Dynamo > Reverie > module-name.cjs` on line 1
- Atomic write pattern (tmp+rename) used throughout codebase
- Toggle gate: every entry point checks isEnabled() before processing
- Hook exit pattern: always exit 0, log errors silently
- Pass-through stub delegation via resolve() lazy require (Phase 23 pattern for hot-swap)

### Integration Points
- `subsystems/reverie/handlers/*.cjs`: 7 handlers that currently delegate to Ledger. Phase 24 replaces internals with cognitive pipeline calls.
- `cc/hooks/dynamo-hooks.cjs` dual-mode routing: Already routes cortex mode to Reverie handlers. No dispatcher changes needed.
- `cc/agents/` directory: Does not exist yet. Phase 24 creates it for `inner-voice.md` subagent definition.
- `cc/settings-hooks.json`: SubagentStart/SubagentStop already registered from Phase 23.
- Assay search/session APIs: Reverie reads graph data through Assay (subsystem boundary rule).

</code_context>

<specifics>
## Specific Ideas

- User explicitly rejected hard budget caps: "we don't need a hard budget limit right now. we don't have a baseline to measure what is needed yet." Gather baseline data during hybrid mode (Phase 25) before calibrating limits.
- Contextual narrative was chosen over terse factual -- the user wants injections that read naturally, not like a database dump.
- Recall + deliberation on explicit "do you remember X" -- the user considers these high-value moments worth spending a subagent spawn on.
- The "native features first" principle (from Phase 23) continues: all LLM operations via native Claude Code subagents, no external API calls for Dynamo's own operations.

</specifics>

<deferred>
## Deferred Ideas

- Embedding-based semantic shift detection (MENH-08, M4) -- using keyword overlap for v1.3
- Narrative session briefings with relational framing (v1.4) -- factual briefings for v1.3
- Full REM consolidation (retroactive evaluation, observation synthesis, cascade promotion) -- deferred to v1.4
- OpenRouter sunset from classic mode -- post-M2, after cortex mode proves reliable
- Hard budget calibration -- gather baseline data during hybrid mode (Phase 25) first

</deferred>

---

*Phase: 24-cognitive-pipeline*
*Context gathered: 2026-03-20*
