# Requirements: Dynamo v1.3-M2

**Defined:** 2026-03-20
**Core Value:** Every capability must be self-manageable by Claude Code without manual user config file edits

## v1.3-M2 Requirements

Requirements for v1.3-M2 Core Intelligence milestone. Each maps to roadmap phases.

### Inner Voice (CORTEX-01)

- [ ] **IV-01**: Inner Voice state file loads, processes, and persists atomically with corruption recovery to fresh defaults
- [ ] **IV-02**: Entity extraction identifies project names, file paths, function names, and technical terms from prompts via deterministic pattern matching (<5ms)
- [ ] **IV-03**: Activation map tracks entity relevance with time-based decay and 1-hop spreading activation from anchor entities via Assay graph queries
- [ ] **IV-04**: Sublimation threshold evaluates composite score (activation * surprise * relevance * (1 - cognitive_load) * confidence) to determine what surfaces
- [ ] **IV-05**: Injection formatting respects token limits by context (500 session start, 150 mid-session, 50 urgent) following Cognitive Load Theory
- [ ] **IV-06**: Self-model persists across sessions (attention state, injection mode, confidence, working patterns) with session-scoped fields that reset
- [ ] **IV-07**: Curation functions migrate from Ledger to Reverie as subagent-based processing; Ledger retains only deterministic formatting
- [ ] **IV-08**: Curation templates use adversarial counter-prompting to evaluate from user's experience, not canonical definitions
- [ ] **IV-09**: Semantic shift detection triggers injection on topic changes using keyword overlap (embedding-based deferred to M4/MENH-08)
- [ ] **IV-10**: Domain frame classification categorizes prompts into engineering/debugging/architecture/social/general via keyword/regex heuristic (<1ms)
- [ ] **IV-11**: Explicit recall bypass skips sublimation threshold when user asks "do you remember X?" — all entities above 0.2 activation considered
- [ ] **IV-12**: Predictions state tracks expected topic and activity; surprise factor provides principled reason for silence when expectations are met

### Dual-Path Routing (CORTEX-02)

- [ ] **PATH-01**: Deterministic path selection (hot/deliberation/skip) based on signal thresholds without LLM call — the path decision itself is always cheap
- [ ] **PATH-02**: Hot path executes under 500ms with per-step timing instrumentation via performance.now() and a 400ms abort threshold
- [ ] **PATH-03**: Deliberation path spawns custom `inner-voice` subagent (Sonnet model, read-only tools, permissionMode: dontAsk) for Max subscription users
- [ ] **PATH-04**: Deliberation path degrades gracefully to hot-path-only when subagent spawn fails or daily cap reached
- [ ] **PATH-05**: State bridge pattern uses SubagentStop file write with correlation ID and 60s TTL, consumed atomically by next UserPromptSubmit via fs.renameSync
- [ ] **PATH-06**: Rate limit detection sets runtime flag on spawn failure or daily cap; system degrades to hot-path-only until cleared

### Operational Monitoring (CORTEX-03)

- [ ] **OPS-MON-01**: Subagent spawn tracking enforces daily cap (configurable, default 20); tracks rate limit proximity
- [ ] **OPS-MON-02**: Rate limit detection sets runtime flag on spawn failure; system degrades to hot-path-only until cleared

> **Deferred (no compelling need on Max subscription):**
> - ~~COST-01: Per-operation cost tracking~~ — Dynamo has zero marginal cost on Max subscription; Graphiti infrastructure costs are outside Dynamo's scope
> - ~~COST-02: Daily budget enforcement~~ — No budget to enforce when all LLM ops use native subagents
> - ~~COST-04: Cost CLI~~ — No cost data to display; subagent spawn counts can surface through `dynamo voice status` instead

### Hook Architecture (MGMT-05)

- [ ] **HOOK-01**: Dispatcher routes events to Reverie handlers or classic Ledger handlers based on `reverie.mode` config value
- [ ] **HOOK-02**: SubagentStart and SubagentStop events registered in settings-hooks.json with inner-voice agent name matcher
- [ ] **HOOK-03**: Seven Reverie handler modules exist (SessionStart, UserPromptSubmit, PostToolUse, PreCompact, Stop, SubagentStart, SubagentStop) — thin wrappers delegating to inner-voice.cjs

### Feature Flags & Injection Control (MGMT-10)

- [ ] **FLAG-01**: `reverie.mode` config flag supports classic (existing behavior), hybrid (both pipelines, Reverie logged only), and cortex (Reverie active) modes with instant rollback
- [ ] **FLAG-02**: Hybrid mode runs both classic and Reverie pipelines on each event; Reverie output logged for A/B comparison but not injected
- [ ] **FLAG-03**: `dynamo config get/set` CLI commands manage feature flags and Reverie configuration
- [ ] **FLAG-04**: `dynamo voice status/explain/reset` CLI commands provide visibility into Inner Voice state, last injection rationale, and state reset

### Operational Improvements

- [ ] **OPS-01**: Bare `dynamo` CLI invocation works via symlink shim without requiring `node` or path prefix; dev flag overrides to repo version
- [ ] **OPS-02**: CHANGELOG.md generated with well-written update notes; integrated into `dynamo update` and `dynamo check-update` display
- [ ] **OPS-03**: Install/sync pipeline updated for new Reverie files, agents directory (`cc/agents/`), and prompt templates (`cc/prompts/`)

## v2 Requirements (Deferred)

### Memory Backfill (deferred to M3)

- **BKFL-01**: Intelligent memory backfill parses historical chat transcripts (JSONL) and ingests to knowledge graph
- **BKFL-02**: Backfill includes `--dry-run` cost estimation and requires explicit user confirmation before ingestion
- **BKFL-03**: Backfill uses two-pass extract-then-deduplicate approach with `source: "backfill"` confidence tagging

### Advanced Inner Voice (deferred to M4)

- **IV-ADV-01**: 2-hop spreading activation with density threshold (CORTEX-04)
- **IV-ADV-02**: Embedding-based domain classification (MENH-08)
- **IV-ADV-03**: Narrative session briefings with relational framing (CORTEX-04)
- **IV-ADV-04**: Full IV memory schema with REM-gated writes (CORTEX-04)
- **IV-ADV-05**: Retroactive session evaluation (CORTEX-04)
- **IV-ADV-06**: Graph-backed self-model evolution (CORTEX-06)

### Graphiti small_model Support (deferred — evaluate at M3)

- **TERM-01**: Support Graphiti PR #1156 small_model parameter if merged; irrelevant for default Docker setup

## Out of Scope

| Feature | Reason |
|---------|--------|
| Nested subagents | Not supported by Claude Code platform |
| Deliberation on every prompt | Eliminates cost advantage (~$6-8/day API); no quality gain over selective deliberation |
| Multi-frame fan-out | Exceeds 500ms hot path budget without local embeddings (MENH-08, M4) |
| Automatic memory backfill on install | Expensive, unsupervised, requires explicit user opt-in — never automatic |
| Real-time cost dashboard | Requires UI (M6); CLI visibility sufficient for M2 |
| Continuous background processing | Claude Code has no background threads; hook-based event-driven is the correct architecture |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| IV-01 | Phase 23 | Pending |
| IV-02 | Phase 23 | Pending |
| IV-03 | Phase 23 | Pending |
| IV-04 | Phase 23 | Pending |
| IV-05 | Phase 24 | Pending |
| IV-06 | Phase 24 | Pending |
| IV-07 | Phase 24 | Pending |
| IV-08 | Phase 24 | Pending |
| IV-09 | Phase 24 | Pending |
| IV-10 | Phase 23 | Pending |
| IV-11 | Phase 24 | Pending |
| IV-12 | Phase 23 | Pending |
| PATH-01 | Phase 24 | Pending |
| PATH-02 | Phase 24 | Pending |
| PATH-03 | Phase 24 | Pending |
| PATH-04 | Phase 24 | Pending |
| PATH-05 | Phase 24 | Pending |
| PATH-06 | Phase 24 | Pending |
| COST-01 | -- | Deferred (no cost to track on Max subscription) |
| COST-02 | -- | Deferred (no budget to enforce with native subagents) |
| COST-03 | Phase 23 | Revised → OPS-MON-01 (subagent spawn tracking) |
| COST-04 | -- | Deferred (no cost data; spawn counts via `dynamo voice status`) |
| OPS-MON-01 | Phase 23 | Pending |
| OPS-MON-02 | Phase 23 | Pending |
| HOOK-01 | Phase 23 | Pending |
| HOOK-02 | Phase 23 | Pending |
| HOOK-03 | Phase 23 | Pending |
| FLAG-01 | Phase 23 | Pending |
| FLAG-02 | Phase 25 | Pending |
| FLAG-03 | Phase 23 | Pending |
| FLAG-04 | Phase 25 | Pending |
| OPS-01 | Phase 26 | Pending |
| OPS-02 | Phase 26 | Pending |
| OPS-03 | Phase 26 | Pending |

**Coverage:**
- v1.3-M2 requirements: 28 active (COST-01, COST-02, COST-04 deferred; COST-03 revised to OPS-MON-01; OPS-MON-02 added)
- Mapped to phases: 28
- Deferred: 3 (no cost to track on Max subscription)

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after roadmap creation*
