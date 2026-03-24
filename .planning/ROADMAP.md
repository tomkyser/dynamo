# Roadmap: Dynamo Platform

## Milestones

- ✅ **v1.0 M1: Platform SDK** — Phases 1-6 (shipped 2026-03-23)
- 🚧 **v1.0 M2: Reverie Module** — Phases 7-12 (in progress)

## Phases

<details>
<summary>✅ v1.0 M1: Platform SDK (Phases 1-6) — SHIPPED 2026-03-23</summary>

- [x] Phase 1: Core Library (3/3 plans) — completed 2026-03-22
- [x] Phase 2: Foundational Services (4/4 plans) — completed 2026-03-22
- [x] Phase 3: Data Providers & Infrastructure Services (5/5 plans) — completed 2026-03-23
- [x] Phase 3.1: Wire Communication Service (4/4 plans) — completed 2026-03-23
- [x] Phase 3.2: Assay Federated Search (1/1 plan) — completed 2026-03-23
- [x] Phase 4: Framework (4/4 plans) — completed 2026-03-23
- [x] Phase 5: SDK & Platform Infrastructure (5/5 plans) — completed 2026-03-23
- [x] Phase 6: Bootstrap Integration Fixes (2/2 plans) — completed 2026-03-23

**28 plans, 57 tasks, 851 tests, 27/27 requirements**
Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.0 M2: Reverie Module (In Progress)

**Milestone Goal:** Build the first module on the Dynamo platform -- Reverie delivers persistent, evolving AI memory through a three-session architecture with fragment-based recall, Self Model personality, and REM consolidation.

- [ ] **Phase 7: Foundation Infrastructure** - Irreversible architectural decisions, data schemas, write integrity, and the gravitational center every subsequent phase references
- [ ] **Phase 8: Single-Session Personality Injection** - Validate that personality persistence actually works before adding multi-session complexity
- [ ] **Phase 9: Fragment Memory Engine** - Fragment formation and recall validated in single-session context before inter-session orchestration
- [ ] **Phase 10: Three-Session Architecture** - Highest-risk phase: Wire-based session orchestration with go/no-go gate on Claude Max resource limits
- [ ] **Phase 11: REM Consolidation** - Memory consolidation, Self Model evolution, and the working-to-long-term memory gate
- [ ] **Phase 12: Integration Surface & Backfill** - CLI exposure, submodule management, taxonomy self-organization, and historical data import

## Phase Details

### Phase 7: Foundation Infrastructure
**Goal**: Resolve irreversible architectural decisions and establish the data schemas, write integrity guarantees, and foundational abstractions that every subsequent Reverie component depends on
**Depends on**: Phase 6 (M1 platform complete -- all services, providers, framework, SDK validated)
**Requirements**: PLT-01, SM-01, SM-02, SM-03, SM-05, FRG-01, FRG-02, FRG-05, FRG-06, FRG-09
**Success Criteria** (what must be TRUE):
  1. Wire write coordinator retries failed DuckDB writes with exponential backoff and logs to a write-ahead journal, so that burst formation events do not silently drop association index entries
  2. Fragment files use JSON frontmatter (not YAML) with zod-validated schema covering all 5 fragment types, and a round-trip test proves parse-write-parse identity for each type
  3. FragmentWriter abstraction performs atomic dual-provider writes (Journal file + Ledger index rows) as a logical unit, with rollback removing partial state when either write fails
  4. Self Model schema (Identity Core, Relational Model, Conditioning) persists to Journal + Ledger + Magnet with cold start initialization producing valid sparse defaults from a seed prompt
  5. Association index tables exist in Ledger with the deterministic decay function computing correct survival scores for synthetic fragment histories
**Plans:** 5 plans

Plans:
- [x] 07-01-PLAN.md — Reverie module structure + JSON frontmatter parser
- [x] 07-02-PLAN.md — Wire write coordinator retry + WAJ
- [x] 07-03-PLAN.md — Zod schemas, association index DDL, decay function
- [x] 07-04-PLAN.md — Self Model state manager + cold start + entropy engine
- [x] 07-05-PLAN.md — FragmentWriter atomic dual-provider writes

**Research flag**: STANDARD PATTERNS -- write coordinator enhancement, schema definitions, and zod validation are well-specified in research

### Phase 8: Single-Session Personality Injection
**Goal**: Validate that continuous Self Model personality injection via Claude Code hooks produces measurable personality persistence across turns at varying context utilization levels -- the empirical gate before multi-session complexity
**Depends on**: Phase 7
**Requirements**: CTX-01, CTX-03, CTX-04, CTX-05, INT-01
**Success Criteria** (what must be TRUE):
  1. UserPromptSubmit hook injects Self Model personality into every turn via additionalContext within the target token budget (~800-1800 tokens), and the injection completes under 50ms (measured, not estimated)
  2. Context budget manager transitions through 4 phases (full -> compressed -> reinforced -> compaction advocacy) based on context utilization, with injection size adapting at each phase boundary
  3. PreCompact hook preserves Self Model perspective in the compaction frame so that post-compaction context retains personality directives (not neutral summary)
  4. Warm-start face prompt cache persists the final Face prompt from the prior session and injects it on SessionStart before Secondary is ready, so the first user turn has personality
  5. All 8 Claude Code hook types (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, PreCompact, SubagentStart, SubagentStop) are wired through Armature's hook registry to Reverie handlers
**Plans:** 2 plans

Plans:
- [x] 08-01-PLAN.md — Budget tracker state machine + template composer 5-slot system
- [x] 08-02-PLAN.md — Context Manager orchestrator + hook handlers + Armature wiring

**Research flag**: STANDARD PATTERNS for hook wiring and state file pattern (validated by Claude-Mem). Personality injection size at high context utilization needs empirical measurement (PITFALLS research contradicts spec's "minimal injection at 75-90%").

### Phase 9: Fragment Memory Engine
**Goal**: Validate that multi-angle fragment formation and Assay-based recall produce useful memories in a single-session context before the complexity of inter-session communication is layered on
**Depends on**: Phase 8
**Requirements**: FRG-03, FRG-04
**Success Criteria** (what must be TRUE):
  1. Formation pipeline processes a stimulus through attention check gate, domain fan-out, and per-domain body composition, producing 1-3 fragments per stimulus with distinct formation group tags
  2. Recall via Assay returns ranked fragments using composite scoring (association pointers, domain overlap, entity co-occurrence, decay weighting, Self Model relevance) and reconstructs them through the current Self Model frame
**Plans:** 4 plans

Plans:
- [x] 09-01-PLAN.md — Formation components: attention gate, prompt templates, fragment assembler, nudge manager
- [x] 09-02-PLAN.md — Recall components: composite scorer, query builder, reconstruction prompt
- [x] 09-03-PLAN.md — Formation pipeline orchestrator + recall engine orchestrator
- [x] 09-04-PLAN.md — Hook wiring, agent definition, Context Manager nudge integration, Reverie module wiring

**Research flag**: NEEDS RESEARCH -- formation fan-out signal-to-noise ratio (EXPERIMENTAL 9.10) and recall reconstruction quality (EXPERIMENTAL 9.8) have no validated production references. Empirical measurement required during this phase.
**Design note**: Single-session mode uses turn-scoped background subagents (fire-and-forget via Agent tool) as an intuitive inner voice — high-perception, low-deliberation formation. Self Model framing shifts to ISFP/INFP cognitive style (impressionistic, not analytical). Phase 9.1 (Lithograph) will later enable richer transcript-based stimulus context for these agents. See `.planning/phases/09.1-claude-code-integration-layer/09.1-RESEARCH-TRANSCRIPT-CONTROL.md`.

### Phase 09.1: Claude Code Integration Layer (INSERTED)

**Goal**: Establish the platform-level interface between Dynamo and Claude Code's native features — Lithograph provider for transcript read/write/query and Exciter service for managing hooks, agents, skills, settings, and CLAUDE.md at project and user scope. Modules and extensions go through Exciter to implement Claude Code features, maintaining architectural integrity.
**Depends on**: Phase 9
**Requirements**: PLT-02, PLT-03
**Success Criteria** (what must be TRUE):
  1. Lithograph provider reads Claude Code transcript JSONL, parses conversation turns and tool use blocks, and supports atomic content manipulation (replace block content, clear inputs) with rollback on failure
  2. Exciter service owns Claude Code integration surface: hook registration/wiring, agent definition management, skill definitions, settings.json management (project + user scope), CLAUDE.md management — other services and modules access Claude Code features through Exciter's contract
  3. Reverie's existing hook registration (Phase 8) can be migrated to use Exciter without breaking existing tests or behavior
**Plans**: TBD
**Canonical refs**: `.claude/reverie-spec-v2.md`, `core/armature/hooks.cjs`, `core/services/commutator/commutator.cjs`, `.planning/phases/09.1-claude-code-integration-layer/09.1-RESEARCH-TRANSCRIPT-CONTROL.md`
**Research flag**: RESEARCH COMPLETE — transcript control mechanism verified via claude-mem source code analysis (2026-03-24). Transcript JSONL is read/write via hook `transcript_path`. `additionalContext` for injection, direct JSONL manipulation for removal.

Plans:
- [ ] TBD (run /gsd:plan-phase 09.1 to break down)

### Phase 10: Three-Session Architecture
**Goal**: Prove that Primary (Face), Secondary (Mind), and Tertiary (Subconscious) sessions can operate concurrently via Wire with acceptable latency and resource consumption on Claude Max -- with Passive mode as the fallback if three sessions exceed subscription limits
**Depends on**: Phase 9.1
**Requirements**: SES-01, SES-02, SES-03, SES-04, SES-05, OPS-01, OPS-02, CTX-02
**Success Criteria** (what must be TRUE):
  1. Session Manager spawns Secondary and Tertiary sessions via Bun.spawn, enforces the Primary <-> Secondary <-> Tertiary Wire topology, and completes the full startup sequence (Wire connect -> load Self Model -> compose Face prompt -> inject to Primary) within a measurable time budget
  2. Wire-based inter-session communication delivers messages at all four urgency levels (background/active/directive/urgent) with ACK protocol for critical message types and message loss detection
  3. Tertiary session runs continuous sublimation cycles at a configurable frequency without overwhelming Wire or exceeding Claude Max rate limits -- measured, not assumed
  4. Active mode (three sessions) and Passive mode (Primary + lightweight Secondary only) both function end-to-end, with automatic fallback from Active to Passive when resource limits are detected
  5. Referential framing prompt causes Primary to treat injected context as reference material subordinate to Self Model directives, verified against test scenarios where technically correct answers conflict with relational directives
**Plans**: TBD
**Research flag**: NEEDS RESEARCH -- Channels API contract stability, Claude Max concurrent session limits (EXPERIMENTAL 9.4), referential framing dual-mode calibration (EXPERIMENTAL 9.9). Go/no-go gate: if three sessions exceed Max limits, Passive mode becomes default and Tertiary defers to v2.

### Phase 11: REM Consolidation
**Goal**: Implement the three-tier consolidation pipeline that gates all fragment promotion from working memory to long-term storage, evolves the Self Model through conditioning updates, and maintains association index integrity
**Depends on**: Phase 10
**Requirements**: REM-01, REM-02, REM-03, REM-04, REM-05, REM-06, REM-07, SM-04, OPS-03, OPS-04
**Success Criteria** (what must be TRUE):
  1. Tier 1 triage on PreCompact events preserves working state to Journal within the hook time budget, so that compaction never destroys uncommitted memory
  2. Tier 2 provisional REM fires on idle timeout, performs full consolidation flagged as tentative, and covers the ambiguous-session-end case where Tier 3 never triggers
  3. Tier 3 full REM on session end performs retroactive evaluation, meta-fragment creation, association index editorial pass (entity dedup, weight updates, domain boundary review), and promotes fragments from working/ to active/ -- nothing enters consolidated storage without passing through REM (REM-07)
  4. Self Model conditioning updates (attention biases, recall strategies, error history) accumulate across sessions with trait floor constraints preventing identity collapse
  5. REM mode and Dormant mode operate correctly: REM mode runs Secondary-only consolidation, Dormant mode runs only scheduled decay maintenance with no active sessions
**Plans**: TBD
**Research flag**: STANDARD PATTERNS for Tier 1 and Tier 3 (spec is explicit). NEEDS RESEARCH on decay constant tuning (EXPERIMENTAL 9.3) and conditioning update calibration (EXPERIMENTAL 9.6). Recommend building a simulation harness for decay before live deployment.

### Phase 12: Integration Surface & Backfill
**Goal**: Expose Reverie's capabilities through CLI and submodule management, complete the self-organizing taxonomy and source-reference models, and enable historical data import through a backfill-specific formation pathway
**Depends on**: Phase 11
**Requirements**: INT-02, INT-03, FRG-07, FRG-08, FRG-10
**Success Criteria** (what must be TRUE):
  1. CLI commands via Pulley (`dynamo reverie status`, `dynamo reverie inspect`, `dynamo reverie history`, `dynamo reverie reset`) expose module state, fragment inspection, and operational controls in all three output modes (human/json/raw)
  2. Reverie installs and updates as a git submodule managed by Forge/Relay, with the module discoverable and bootable through Armature's plugin/module lifecycle
  3. Self-organizing taxonomy creates, merges, splits, and retires domains during REM based on fragment accumulation patterns, with hard caps (100 domains, 200 entities per domain, 10K association edges) preventing unbounded growth
  4. Source-reference model stores association chain termini and source locator pointers, establishing experiential relationships to source material without direct file indexing
  5. Historical data backfill imports conversation exports through a backfill-specific formation pathway with retrospective framing, provenance marking, and decay/trust parameters appropriate for reconstructed (non-experiential) memories
**Plans**: TBD
**Research flag**: STANDARD PATTERNS for CLI and submodule integration. NEEDS RESEARCH on backfill formation pathway design -- retrospective vs. experiential framing, provenance model (EXPERIMENTAL).

## Progress

**Execution Order:**
Phases execute in numeric order: 7 -> 8 -> 9 -> 10 -> 11 -> 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Core Library | M1 | 3/3 | Complete | 2026-03-22 |
| 2. Foundational Services | M1 | 4/4 | Complete | 2026-03-22 |
| 3. Data Providers & Infra | M1 | 5/5 | Complete | 2026-03-23 |
| 3.1 Wire Communication | M1 | 4/4 | Complete | 2026-03-23 |
| 3.2 Assay Federated Search | M1 | 1/1 | Complete | 2026-03-23 |
| 4. Framework | M1 | 4/4 | Complete | 2026-03-23 |
| 5. SDK & Platform Infra | M1 | 5/5 | Complete | 2026-03-23 |
| 6. Bootstrap Integration | M1 | 2/2 | Complete | 2026-03-23 |
| 7. Foundation Infrastructure | M2 | 0/5 | Planned | - |
| 8. Single-Session Personality | M2 | 1/2 | In Progress | - |
| 9. Fragment Memory Engine | M2 | 0/4 | Planned | - |
| 10. Three-Session Architecture | M2 | 0/TBD | Not started | - |
| 11. REM Consolidation | M2 | 0/TBD | Not started | - |
| 12. Integration Surface | M2 | 0/TBD | Not started | - |
