# Project Research Summary

**Project:** Dynamo v1.3-M2 Core Intelligence
**Domain:** Cognitive memory architecture — Inner Voice, dual-path routing, cost monitoring, and operational improvements on top of an existing six-subsystem hook-based memory platform
**Researched:** 2026-03-20
**Confidence:** HIGH

## Executive Summary

Dynamo v1.3-M2 is a cognitive intelligence upgrade to an existing, working memory system. The goal is to replace mechanical Haiku curation (search-curate-inject on every prompt) with a context-aware Inner Voice that selectively surfaces knowledge when it matters, using a dual-process architecture: a deterministic hot path (<500ms) for the 95% case and a subagent-based deliberation path (2-10s) for the 5% that warrants deeper analysis. All of this must be built under a zero-npm-dependency constraint using only Node.js built-ins and Claude Code platform primitives, on top of a 5,335 LOC CJS codebase with 515 passing tests.

The recommended approach is surgical and reversible. A `reverie.mode` feature flag (classic/cortex) must be the first commit, providing instant rollback to v1.2.1 behavior at any point. The integration seam is a single dispatcher modification (`cc/hooks/dynamo-hooks.cjs`) that routes events to either Ledger's existing handlers or the new Reverie subsystem's handlers. Subsystem boundary rules are strictly preserved: Reverie orchestrates cognitive processing, Ledger writes, Assay reads, Switchboard dispatches, Terminus transports. All eight technical domains (cognitive processing, dual-path routing, cost monitoring, hooks refactor, feature flags, memory backfill, bare CLI, subagent integration) are achievable within the existing constraints — no new npm packages, no new external services.

The dominant risk is quality regression: the Inner Voice must equal or exceed the existing Haiku curation's injection frequency before the feature flag switches to `cortex` mode. A graduated rollout (parallel observation, then augmentation, then replacement) prevents the most user-visible failure mode — silent memory context disappearing. Secondary risks are timing (hot path budget must be instrumented from day one) and state bridge fragility (the subagent-to-hook communication pattern has known race conditions that need explicit defensive handling).

---

## Key Findings

### Recommended Stack

All eight M2 technical domains are achievable with zero new npm dependencies. Node.js built-ins (`node:fs`, `node:crypto`, `node:sqlite`, `node:readline`, `node:perf_hooks`) and Claude Code platform features (custom subagents, SubagentStart/SubagentStop hooks, `additionalContext` injection) cover the full M2 capability surface. The cognitive processing engine is pure CJS arithmetic — Jaccard similarity for v1.3, with embedding-based similarity deferred to v1.4 (MENH-08). Cost tracking extends the existing SQLite infrastructure from Phase 21.

**Core technologies:**
- `node:sqlite` DatabaseSync: cost tracking DB — proven in session-store.cjs, extends naturally to per-operation budget tracking
- `node:crypto` randomUUID: atomic state file writes via tmp+rename — consistent with existing codebase convention
- `node:readline`: JSONL transcript parsing for memory backfill — streaming, no memory overhead
- `node:perf_hooks` performance.now(): hot path timing validation — sub-millisecond resolution required to enforce the 500ms budget
- Claude Code custom subagents (`~/.claude/agents/inner-voice.md`): deliberation path — zero marginal cost on Max subscription, fully verified YAML frontmatter spec as of 2026-03-20
- SubagentStart/SubagentStop hooks: state bridge pattern — the only viable mechanism given GitHub issue #5812 (additionalParentContext NOT_PLANNED)
- Graphiti Docker image (`zepai/knowledge-graph-mcp:standalone`): unchanged — no M2 modifications required; Graphiti PR #1156 (small_model support) is unmerged but irrelevant to Dynamo's default setup

### Expected Features

**Must have (P0/P1 — M2 table stakes):**
- `reverie.mode` feature flag (classic/cortex) with instant rollback — dependency foundation for all other M2 work
- Dispatcher dual-mode routing to Reverie handlers — the integration seam; must exist before any handler logic
- State file lifecycle (load/process/persist) with atomic writes and corruption recovery — foundational for all handlers
- Entity extraction from prompts (deterministic NER/pattern matching, <5ms) — enables activation map population
- Activation map with decay and 1-hop spreading activation — core data structure; all threshold logic depends on it
- Sublimation threshold evaluation (composite scoring: activation, surprise, relevance, cognitive load, confidence) — determines what surfaces
- Hot path execution under 500ms — primary cost control mechanism; tightest constraint in the system
- Deliberation path via custom subagent (subscription) and direct API fallback (API plan) — core dual-process value
- State bridge pattern (SubagentStop file write -> next UserPromptSubmit consume) — only viable cross-process communication
- Injection formatting with Cognitive Load Theory token limits (500/150/50 tokens by context) — prevents context window pollution

**Should have (P2 — quality differentiators):**
- Semantic shift detection (keyword overlap fallback when embeddings unavailable) — reduces injection noise
- Domain frame classification (keyword/regex heuristic, <1ms) — weights activation propagation
- Per-operation cost tracking with daily budget enforcement — rate limit awareness for subscription users
- Self-model and relationship model persistence across sessions — continuity of cognitive context
- REM Tier 1 (PreCompact preservation) and Tier 3 basic (Stop synthesis) — memory consolidation
- Explicit recall bypass (sublimation threshold skipped when user asks "do you remember X?") — prevents most user-visible failure mode
- Bare CLI symlink shim (`dynamo` without `node` prefix) — convenience, not a correctness requirement

**Defer (M3-M4):**
- Memory backfill from historical chat transcripts — expensive, risky, not a prerequisite for intelligence
- 2-hop spreading activation with density threshold (CORTEX-04, M4)
- Embedding-based domain classification (MENH-08, M4)
- Narrative session briefings with relational framing (CORTEX-04, M4)
- Full IV memory schema with REM-gated writes (CORTEX-04, M4)
- Retroactive session evaluation (CORTEX-04, M4)
- Real-time cost dashboard (UI-02, M6)

**Anti-features (never build in M2):**
- Nested subagents — not supported by Claude Code
- Deliberation on every prompt — eliminates the cost advantage; ~$6-8/day API cost for zero quality gain
- Multi-frame fan-out — exceeds 500ms hot path budget without MENH-08 embeddings
- Automatic memory backfill on install — expensive, unsupervised, requires explicit user opt-in

### Architecture Approach

The integration architecture is a single-seam dispatcher modification. The `cc/hooks/dynamo-hooks.cjs` dispatcher gains a `reverie.mode` config check and an extended routing table. All intelligence lives in `subsystems/reverie/` — the dispatcher stays thin. Subsystem boundaries are strictly preserved: Reverie reads through Assay (`combinedSearch()`), writes through Ledger (`addEpisode()`), and owns its own state files directly via filesystem I/O. LLM-calling functions migrate from `subsystems/ledger/curation.cjs` to `subsystems/reverie/curation.cjs`; Ledger retains deterministic formatting functions only. State files (`inner-voice-state.json`, `inner-voice-deliberation-result.json`, `cost-tracker.json`) all use atomic tmp+rename writes.

**Major components:**
1. `subsystems/reverie/activation.cjs` — activation map management, spreading activation, domain frame classification, sublimation scoring
2. `subsystems/reverie/inner-voice.cjs` — core pipeline orchestrator; all hook-specific processing pipelines delegate here
3. `subsystems/reverie/dual-path.cjs` — deterministic hot/deliberation/skip path selection; no LLM call for the decision itself
4. `subsystems/reverie/curation.cjs` — intelligent curation (migrated from Ledger); owns all LLM-calling functions
5. `subsystems/terminus/cost-store.cjs` — SQLite-backed per-operation cost tracking
6. `subsystems/reverie/handlers/*.cjs` (7 handlers) — thin hook entry points; delegate to inner-voice.cjs
7. `cc/agents/inner-voice.md` — custom subagent definition (YAML frontmatter); Sonnet model, read-only tools, `permissionMode: dontAsk`
8. `cc/hooks/dynamo-hooks.cjs` (modified) — mode-based routing table; extended to 7 events including SubagentStart/SubagentStop

**Key patterns to follow:**
- Mode routing lives in the dispatcher routing table, not inside handler branches — each mode maps to different handler modules
- SubagentStart returns `{ hookSpecificOutput: { hookEventName: "SubagentStart", additionalContext } }` to inject IV state into the subagent
- SubagentStop writes `inner-voice-deliberation-result.json`; next UserPromptSubmit reads-renames-deletes it (atomic POSIX rename)
- Hot path budget: state load (<5ms) + classify (<1ms) + shift detect (<5ms) + activation update (10-50ms) + select (<1ms) + format (50-200ms) + persist (<5ms) = 100-500ms total
- Deliberation path fires only on: semantic shift >= 0.4, entity confidence < 0.7, explicit recall request, or session start

### Critical Pitfalls

1. **Timing regression (CP-01)** — Reverie handler processing compounds across 8 steps; state file grows to 50KB in long sessions, breaking the 500ms budget. Prevention: instrument every step with `performance.now()` from day one, hard 400ms abort threshold in handlers, cap activation map at 50 entities, split state into hot (<2KB) and cold files, add 100ms timeout to Assay graph queries.

2. **Quality regression at cold start (CP-02)** — New sessions have empty activation maps; sublimation threshold requires high scores across multiple dimensions; first 5-10 prompts get no injection. Prevention: graduated rollout (classic -> hybrid -> cortex), seed activation map from classic curation results, lower initial sublimation threshold to 0.3, validate via A/B comparison before switching modes.

3. **Cost monitoring tracks wrong metric for subscription users (CP-03)** — Dollar budget is meaningless on Max subscription; the actionable constraint is subagent spawns and rate limit proximity. Prevention: track subagent spawn count (daily cap of 20), token injection budget per session, rate limit detection via spawn failures, dollar tracking only for API plan users.

4. **Feature flag matrix creates untestable code paths (CP-04)** — 3 modes x enabled/disabled x budget-ok x rate-limited = 12+ combinations. Prevention: mode determines the handler MODULE in the dispatcher routing table (not a branch inside handlers); degradation is a dispatcher-level wrapper; parameterized tests cover all valid combinations.

5. **State bridge race conditions (CP-05)** — Deliberation result file written by SubagentStop can be consumed by wrong turn (stale context), stuck pending if subagent crashes, or double-read by concurrent invocations. Prevention: correlation ID + context hash in result file, 60-second TTL on `deliberation_pending` flag, atomic `fs.renameSync()` for consumption, queue depth of 1.

---

## Implications for Roadmap

Based on combined research, the build order is dictated by two constraints: (1) the feature flag must exist before any Reverie code goes live, and (2) cognitive components must be built bottom-up (activation data structures first, orchestrator last, handlers last of all). Operational improvements (bare CLI, update notes) are fully independent and can be parallelized or deferred.

### Phase A: Foundation Infrastructure

**Rationale:** Every downstream module depends on the config schema, state schema, and the two leaf modules (activation arithmetic, cost tracking). These have no dependencies on each other and can be developed in parallel. The timing harness is prerequisite infrastructure — build it before writing any handler logic.
**Delivers:** `reverie` section added to config.json with all defaults; `inner-voice-state.json` schema with `loadState()`/`persistState()` and corruption recovery; `activation.cjs` (activation map, decay, domain frame classification, sublimation scoring); `cost-store.cjs` (SQLite per-operation budget tracking); per-step `performance.now()` timing harness
**Addresses:** CORTEX-01 data structures, CORTEX-03 storage layer
**Avoids:** CP-01 (timing instrumentation is Phase A output, not an afterthought)

### Phase B: Dispatcher Routing Foundation

**Rationale:** The dispatcher must establish mode-based routing BEFORE any handler logic is written. Creating stub Reverie handlers that pass through to existing Ledger handlers proves the routing table works and prevents MODULE_NOT_FOUND regressions during development (MP-03). This is the one commit that establishes the two-mode table and the handler existence fallback check.
**Delivers:** `reverie.mode` feature flag in config (defaults to `classic`); mode-based routing table in dispatcher with handler existence fallback; stub Reverie handlers as pass-through wrappers over existing Ledger handlers; `dynamo config get/set` CLI commands; SubagentStart/SubagentStop added to VALID_EVENTS and settings-hooks.json
**Addresses:** MGMT-10, MGMT-05
**Avoids:** CP-04 (routing-by-module not routing-by-branch), MP-03 (pass-through stubs before logic)

### Phase C: Core Orchestration

**Rationale:** With data structures (Phase A) and routing (Phase B) in place, build the cognitive pipeline tier. Curation migration first (it unblocks dual-path), dual-path second (it depends on activation signals), inner-voice orchestrator last (it ties everything together). The state bridge race condition design (CP-05) must be resolved in this phase before any subagent wiring occurs.
**Delivers:** `reverie/curation.cjs` (LLM functions migrated from Ledger, cost-tracker integrated); `dual-path.cjs` (path selection signals, hot path execution, deliberation queueing, state bridge design with correlation IDs and TTL); `inner-voice.cjs` (per-hook processing pipelines for all 5 hook events)
**Uses:** activation.cjs, cost-store.cjs, Assay search API, Ledger episodes API
**Addresses:** CORTEX-01 pipeline, CORTEX-02 routing
**Avoids:** CP-05 (state bridge safety mechanisms designed here), anti-pattern of Sonnet on hot path

### Phase D: Hook Handlers and Subagent Integration

**Rationale:** Handlers are thin wrappers (10-15 lines each) that load state, delegate to inner-voice.cjs, and return `additionalContext`. The subagent definition and prompt templates are the most tunable components — quality here determines the deliberation path's value. YAML validation must precede deployment to avoid session-wide API 500 failures.
**Delivers:** All 7 Reverie handler modules (replacing stubs from Phase B); `cc/agents/inner-voice.md` with validated YAML frontmatter; prompt templates (iv-system-prompt.md, session-briefing.md, adversarial-counter.md); SubagentStart/SubagentStop state bridge wired end-to-end with correlation ID and TTL handling
**Addresses:** CORTEX-01 handlers, CORTEX-02 deliberation path, SubagentStart/Stop integration
**Avoids:** MP-02 (YAML validation in install.cjs before agent deployment), CP-05 (full state bridge safety implementation)

### Phase E: Graduated Rollout and Quality Validation

**Rationale:** The Inner Voice must prove it equals or exceeds classic curation quality before `reverie.mode` switches to `cortex`. A hybrid mode (both pipelines run, Reverie output logged but not shown) provides A/B comparison data without regression risk. This phase also adds the user-facing management CLI surface.
**Delivers:** Hybrid mode routing (classic output shown, Reverie output logged); A/B comparison metrics; lowered initial sublimation threshold (0.3 start); activation map seeding from classic results; `dynamo voice status/explain/reset` CLI commands
**Addresses:** CP-02 graduated rollout, MGMT-10 full lifecycle
**Research flag:** Hybrid mode output deduplication needs explicit design — two pipelines running on the same UserPromptSubmit requires a merge strategy

### Phase F: Operational Improvements

**Rationale:** Operational improvements are independent of the intelligence layer and can be deferred until core intelligence is proven. They complete the M2 deliverable list.
**Delivers:** Bare CLI shim at `~/.claude/bin/dynamo` (opt-in PATH integration; hooks continue using full `node` path); `dynamo cost today/month/budget` CLI surface; CHANGELOG.md with update notes workflow integrated into `check-update` and `update` commands; install/sync pipeline updates for new files and agents directory
**Addresses:** Operational improvements, update notes, MGMT-05 full install integration
**Avoids:** CP-06 (shim limited to `~/.claude/bin/`; no automatic shell profile modification)

### Phase G: Memory Backfill (stretch/M3)

**Rationale:** Backfill is the highest-risk, most-deferrable M2 feature. It should only run after the real-time pipeline proves its value with current graph data. Deferring to M3 is the recommended default. If included in M2, it must be the last phase with explicit `--dry-run` cost estimation and user confirmation.
**Delivers:** `backfill.cjs` with `--dry-run` cost estimation, selective ingestion (most-recent milestone only), two-pass extract-then-deduplicate approach, `source: "backfill"` confidence tagging
**Addresses:** MP-01 (stale knowledge poisoning prevented by recency filter, deduplication, and confidence tagging)

### Phase Ordering Rationale

- Foundation before orchestration: activation.cjs and cost-store.cjs are leaf modules with no upstream dependencies; building them first unblocks all later phases
- Dispatcher routing before handler logic: pass-through stubs prevent MODULE_NOT_FOUND regressions while handler logic is developed incrementally
- Inner-voice orchestrator before handlers: handlers are thin wrappers that call inner-voice.cjs; the orchestrator must exist first
- State bridge design in Phase C before wiring in Phase D: the race condition mitigations (correlation ID, TTL, atomic rename) must be designed into the data structures before any subagent code is written
- Graduated rollout before mode switch: CP-02 is the most user-visible failure mode; hybrid mode comparison data must validate quality before switching to cortex
- Backfill last or deferred: highest noise-to-signal risk; not a prerequisite for any intelligence feature

### Research Flags

Phases likely needing deeper planning research before implementation:
- **Phase C (Core Orchestration):** The dual-path selection signal thresholds (0.7 confidence, 0.4 semantic shift) are spec-derived estimates, not empirically validated. May need tuning after Phase E comparison data.
- **Phase D (Subagent Integration):** Custom subagent spawning is triggered by a natural-language directive in `additionalContext` — the model must CHOOSE to spawn the agent. Reliability of this mechanism is uncertain; if the model fails to consistently act on the directive, an alternative triggering approach may be needed.
- **Phase E (Graduated Rollout):** Hybrid mode requires an output merge strategy when both classic and Reverie pipelines run on the same UserPromptSubmit. This merge logic needs explicit design before implementation.

Phases with standard patterns (skip research-phase):
- **Phase A (Foundation):** SQLite DatabaseSync pattern is proven in session-store.cjs (Phase 21); atomic JSON write pattern is established across the codebase
- **Phase B (Dispatcher):** Config-based routing is a standard pattern; existing dispatcher is well-understood
- **Phase F (Operational):** Symlink shim, CHANGELOG, install pipeline — all established patterns in this codebase

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified on target machine (Node v24.13.1, Claude Code v2.1.80); zero new npm deps confirmed; SubagentStart/Stop hooks verified against official docs fetched 2026-03-20 |
| Features | HIGH | Detailed REVERIE-SPEC.md (1,463 lines) and INNER-VOICE-ABSTRACT.md serve as internal specifications; M2/M4 boundary clearly defined; all M2 features analyzed for table-stakes vs. defer |
| Architecture | HIGH | Based on live codebase analysis of all 27 production modules; subsystem boundaries explicitly audited; platform constraints verified (GitHub #5812 confirms file bridge is the only option) |
| Pitfalls | HIGH | Based on M1 pitfalls precedent, codebase analysis, and verified platform documentation; five critical pitfalls identified with specific prevention strategies and detection criteria |

**Overall confidence:** HIGH

### Gaps to Address

- **Sublimation threshold calibration:** The initial value of 0.3 (graduated rollout) vs. 0.6 (spec target) needs empirical tuning against real session data. Phase E must produce a calibration plan based on A/B comparison metrics.
- **Subagent spawn reliability:** The deliberation path depends on the main session model choosing to spawn the inner-voice agent based on a natural-language directive in `additionalContext`. This is not a guaranteed trigger. If the model fails to spawn the agent consistently, an alternative mechanism may be needed — requires platform experimentation in Phase D.
- **Rate limit thresholds:** CORTEX-03 reframed as rate-limit awareness for subscription users. The specific thresholds (20 deliberation subagent spawns per day, 10,000 token injection budget per session) are informed estimates; actual Anthropic Max subscription rate limit parameters are not publicly documented.
- **Hybrid mode output merge:** When classic and Reverie pipelines both run on a single UserPromptSubmit in hybrid mode, the dispatcher must merge or deduplicate outputs. The merge strategy needs explicit design before Phase E implementation.

---

## Sources

### Primary (HIGH confidence)
- [Claude Code Custom Subagents](https://code.claude.com/docs/en/sub-agents) — YAML frontmatter specification, all fields verified 2026-03-20
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) — SubagentStart/Stop input/output schemas, additionalContext behavior, all 22 hook events
- [Node.js Crypto API](https://nodejs.org/api/crypto.html) — randomUUID() documentation
- Internal: REVERIE-SPEC.md (1,463 lines) — module structure, processing pipelines, state schemas, cost model
- Internal: INNER-VOICE-ABSTRACT.md — platform-agnostic cognitive architecture and theory mappings
- Internal: DYNAMO-PRD.md — subsystem boundaries and interface patterns
- Live codebase analysis — all 27 production modules verified 2026-03-20

### Secondary (MEDIUM confidence)
- [ICLR 2026 Workshop: MemAgents](https://openreview.net/pdf?id=U51WxL382H) — memory architecture patterns for LLM-based agentic systems
- [Arxiv: Spreading Activation for KG-RAG](https://arxiv.org/abs/2512.15922) — implementation validation for spreading activation approach
- [Arxiv: Memory for Autonomous LLM Agents](https://arxiv.org/html/2603.07670) — memory mechanism survey, March 2026
- [Langfuse: Token and Cost Tracking](https://langfuse.com/docs/observability/features/token-and-cost-tracking) — cost attribution patterns for per-operation budget tracking
- [GitHub Issue #5812](https://github.com/anthropics/claude-code/issues/5812) — SubagentStop context bridge limitation (NOT_PLANNED; confirms file bridge is the only option)
- [GitHub Issue #22843](https://github.com/anthropics/claude-code/issues/22843) — malformed agent file causes session-wide API 500 errors

### Tertiary (LOW confidence)
- Anthropic Max subscription weekly rate limit parameters — not publicly documented; daily subagent spawn cap of 20 is an estimate based on community reports and needs empirical validation

---
*Research completed: 2026-03-20*
*Ready for roadmap: yes*
