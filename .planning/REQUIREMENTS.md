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
- [ ] **IV-07**: LLM-calling curation functions migrate from Ledger to Reverie; Ledger retains only deterministic formatting
- [ ] **IV-08**: Curation templates use adversarial counter-prompting to evaluate from user's experience, not canonical definitions
- [ ] **IV-09**: Semantic shift detection triggers injection on topic changes using keyword overlap (embedding-based deferred to M4/MENH-08)
- [ ] **IV-10**: Domain frame classification categorizes prompts into engineering/debugging/architecture/social/general via keyword/regex heuristic (<1ms)
- [ ] **IV-11**: Explicit recall bypass skips sublimation threshold when user asks "do you remember X?" — all entities above 0.2 activation considered
- [ ] **IV-12**: Predictions state tracks expected topic and activity; surprise factor provides principled reason for silence when expectations are met

### Dual-Path Routing (CORTEX-02)

- [ ] **PATH-01**: Deterministic path selection (hot/deliberation/skip) based on signal thresholds without LLM call — the path decision itself is always cheap
- [ ] **PATH-02**: Hot path executes under 500ms with per-step timing instrumentation via performance.now() and a 400ms abort threshold
- [ ] **PATH-03**: Deliberation path spawns custom `inner-voice` subagent (Sonnet model, read-only tools, permissionMode: dontAsk) for Max subscription users
- [ ] **PATH-04**: Deliberation path falls back to direct Anthropic API call for API plan users when subagent is unavailable
- [ ] **PATH-05**: State bridge pattern uses SubagentStop file write with correlation ID and 60s TTL, consumed atomically by next UserPromptSubmit via fs.renameSync
- [ ] **PATH-06**: Rate limit detection sets runtime flag on 429 or spawn failure; system degrades to hot-path-only until cleared

### Cost Monitoring (CORTEX-03)

- [ ] **COST-01**: Per-operation cost tracking stores events in SQLite (same pattern as session-store.cjs) with operation type, token count, and timestamp
- [ ] **COST-02**: Daily budget enforcement checks budget before each LLM call and blocks deliberation path when exhausted
- [ ] **COST-03**: Subagent spawn tracking enforces daily cap (configurable, default 20) for subscription users; tracks rate limit proximity
- [ ] **COST-04**: CLI surface exposes cost visibility via `dynamo cost today/month/budget` commands

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

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (populated by roadmapper) | | |

**Coverage:**
- v1.3-M2 requirements: 30 total
- Mapped to phases: 0
- Unmapped: 30 ⚠️

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after initial definition*
