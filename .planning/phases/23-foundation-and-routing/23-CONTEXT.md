# Phase 23: Foundation and Routing - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Reverie subsystem foundational infrastructure: data structures (inner-voice-state.json, activation.cjs), operational monitoring (subagent spawn tracking), feature flag system (reverie.mode with config get/set CLI), and a working dispatcher that routes events to Reverie stub handlers based on mode. No changes to existing classic behavior. No cognitive pipeline (Phase 24). No deliberation path execution (Phase 24).

</domain>

<decisions>
## Implementation Decisions

### Stub Handler Strategy
- **D-01:** Stub handlers are pass-through wrappers that delegate to existing Ledger handlers. In cortex mode, the system produces identical output to classic mode.
- **D-02:** All 7 Reverie handlers created in Phase 23: 5 pass-through wrappers (SessionStart, UserPromptSubmit, PostToolUse, PreCompact, Stop) and 2 no-op stubs (SubagentStart, SubagentStop) that log receipt and return null.
- **D-03:** Reverie handlers use REVERIE-SPEC naming (user-prompt.cjs, pre-compact.cjs, stop.cjs, post-tool-use.cjs, iv-subagent-start.cjs, iv-subagent-stop.cjs, session-start.cjs) with a mapping in the dispatcher for cortex mode.

### Dispatcher Routing
- **D-04:** Dispatcher reads `reverie.mode` from config at dispatch time. Conditional in the existing dispatcher file: if classic, route to Ledger handlers (existing switch/case); if cortex, route to Reverie handlers via name mapping.
- **D-05:** SubagentStart and SubagentStop events registered in settings-hooks.json pointing to the same dispatcher entry point.

### Cost Tracking / Operational Monitoring
- **D-06:** COST-01, COST-02, COST-04 deferred entirely. No cost tracking infrastructure needed -- Dynamo has zero marginal cost on Max subscription. Graphiti infrastructure costs are outside Dynamo's scope.
- **D-07:** Operational monitoring replaces cost tracking: OPS-MON-01 (subagent spawn count with configurable daily cap, default 20) and OPS-MON-02 (rate limit detection with runtime flag and hot-path-only degradation).

### Config CLI Surface
- **D-08:** New `lib/config.cjs` module (~100 LOC) with get(dotPath), set(dotPath, value), validate(dotPath, value), getAll() exports. CLI router delegates `dynamo config get/set` to this module.
- **D-09:** Dot notation for nested keys: `dynamo config get reverie.mode`, `dynamo config set reverie.activation.sublimation_threshold 0.5`.
- **D-10:** Validate known keys before writing. Maintain a validation map for known config paths (reverie.mode accepts only classic/hybrid/cortex). Unknown keys accepted freely for extensibility.
- **D-11:** Config changes take effect immediately on next hook event -- config is loaded fresh from disk on every dispatch (existing pattern via core.loadConfig()). No restart required.

### State File Scope
- **D-12:** Pure JSON state file (inner-voice-state.json) with atomic write via tmp+rename. Corruption recovery: if JSON parse fails, reset to fresh defaults and log the event.
- **D-13:** Phase 23 LIVE sections (initialized with defaults, validated, unit tested): `activation_map`, `domain_frame`, `predictions`, `processing`. Phase 23 STUBBED sections (empty defaults, not exercised): `self_model`, `relationship_model`, `injection_history`, `pending_associations`. Phase 24 activates the stubs.
- **D-14:** State file module lives at `subsystems/reverie/state.cjs` with loadState(path, options) and persistState(state, path) exports.

### Activation Module
- **D-15:** Full 1-hop spreading activation implemented in Phase 23 (activation.cjs). Exports: updateActivation, propagate, checkThresholdCrossings, decayAll, computeSublimationScore. Tests mock graphData parameter; Phase 24 passes real Assay results.

### Claude's Discretion
- Entity extraction pattern set (IV-02) -- what regex/patterns to use for project names, file paths, function names, technical terms
- Domain frame keyword sets for the 5 frame categories (engineering/debugging/architecture/social/general)
- Exact sublimation score formula weights and default thresholds
- Internal module organization within subsystems/reverie/

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Reverie Architecture
- `.planning/research/REVERIE-SPEC.md` -- Full Inner Voice subsystem specification. Module structure (Section 3), state file schema (Section 3.5), config surface (Section 3.4), activation map data structure (Section 3.2 activation.cjs), sublimation threshold (Section 6), processing pipelines (Section 5)
- `.planning/research/INNER-VOICE-ABSTRACT.md` -- Platform-agnostic Inner Voice concept. Spreading Activation (Section 5), Dual-Process theory, Predictive Processing

### Requirements and Roadmap
- `.planning/REQUIREMENTS.md` -- M2 requirements including revised CORTEX-03 (OPS-MON-01/02 replacing COST-01/02/03)
- `.planning/ROADMAP.md` -- Phase 23 goal, requirements list, success criteria

### Project Context
- `.planning/research/DYNAMO-PRD.md` -- Subsystem boundaries (Section 3), platform adapter pattern (Section 2), non-functional requirements (Section 6)

### Existing Code (Integration Points)
- `cc/hooks/dynamo-hooks.cjs` -- Current dispatcher that Phase 23 modifies for dual-mode routing
- `cc/settings-hooks.json` -- Hook registration template that needs SubagentStart/SubagentStop additions
- `lib/core.cjs` -- loadConfig(), logError(), isEnabled() -- shared utilities Phase 23 modules will use
- `subsystems/terminus/session-store.cjs` -- Reference implementation for the SQLite + options-based test isolation pattern (informational, not direct dependency)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/core.cjs` loadConfig(): Config loading with optional chaining and defaults -- config.cjs extends this pattern
- `lib/core.cjs` logError(): Error logging to hook-errors.log with rotation -- state corruption logging uses this
- `lib/resolve.cjs` resolveSubsystem(): Path resolution for subsystem modules -- Reverie handlers use this
- `lib/scope.cjs` SCOPE: Scope constants -- Reverie handlers pass scope through from dispatcher context
- Atomic write pattern (tmp+rename) used throughout codebase -- state.cjs follows the same pattern

### Established Patterns
- Options-based test isolation: all modules accept `options = {}` for dependency injection in tests
- Branding header: `// Dynamo > Reverie > module-name.cjs` on line 1
- Section separators: `// --- Section Name ---` comments
- Toggle gate: every entry point checks isEnabled() before processing
- Hook exit pattern: always exit 0, log errors silently

### Integration Points
- `cc/hooks/dynamo-hooks.cjs` switch/case at line 131 -- Phase 23 adds conditional routing before this switch
- `cc/settings-hooks.json` -- Phase 23 adds SubagentStart and SubagentStop event registrations
- `dynamo.cjs` CLI router -- Phase 23 adds `config` command case delegating to lib/config.cjs
- `subsystems/reverie/.gitkeep` -- Phase 23 replaces this with actual Reverie modules

</code_context>

<specifics>
## Specific Ideas

- Pass-through stubs must be provably identical to classic behavior -- tests should verify cortex mode produces the same output as classic for the same input
- The "native features first" principle was established during this discussion: no external API calls for Dynamo's own operations; subagents for all LLM work; external APIs only for Graphiti infrastructure
- Spec revision pass completed during discussion -- REVERIE-SPEC, DYNAMO-PRD, MASTER-ROADMAP, REQUIREMENTS, ROADMAP all updated to remove billing_model, cost budgets, API plan fallback, and Haiku curation references

</specifics>

<deferred>
## Deferred Ideas

- COST-01/02/04: Dollar-cost tracking deferred -- no cost to track on Max subscription
- Session naming migration to subagents: Currently uses Haiku via OpenRouter (ledger/curation.cjs). Will migrate when IV-07 (Phase 24) moves curation to Reverie
- API plan support: If a future need arises for non-subscription deliberation, it can be added as a separate adapter in cc/

</deferred>

---

*Phase: 23-foundation-and-routing*
*Context gathered: 2026-03-20*
