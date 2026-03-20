# Roadmap: Dynamo

## Milestones

- ✅ **v1.0 Research and Ranked Report** -- Phases 1-3 (shipped 2026-03-17)
- ✅ **v1.1 Fix Memory System** -- Phases 4-7 (shipped 2026-03-17)
- ✅ **v1.2 Dynamo Foundation** -- Phases 8-11 (shipped 2026-03-18)
- ✅ **v1.2.1 Stabilization and Polish** -- Phases 12-17 (shipped 2026-03-19)
- ✅ **v1.3-M1 Foundation and Infrastructure Refactor** -- Phases 18-22 (shipped 2026-03-20)
- 📋 **v1.3-M2 Core Intelligence** -- Phases 23-26 (planned)

## Phases

<details>
<summary>✅ v1.0 Research and Ranked Report (Phases 1-3) — SHIPPED 2026-03-17</summary>

- [x] Phase 1: Methodology (1/1 plans) — completed 2026-03-16
- [x] Phase 2: Research (6/6 plans) — completed 2026-03-16
- [x] Phase 3: Synthesis (1/1 plans) — completed 2026-03-17

</details>

<details>
<summary>✅ v1.1 Fix Memory System (Phases 4-7) — SHIPPED 2026-03-17</summary>

- [x] Phase 4: Diagnostics (2/2 plans) — completed 2026-03-17
- [x] Phase 5: Hook Reliability (2/2 plans) — completed 2026-03-17
- [x] Phase 6: Session Management (2/2 plans) — completed 2026-03-17
- [x] Phase 7: Verification and Sync (2/2 plans) — completed 2026-03-17

</details>

<details>
<summary>✅ v1.2 Dynamo Foundation (Phases 8-11) — SHIPPED 2026-03-18</summary>

- [x] Phase 8: Foundation and Branding (3/3 plans) — completed 2026-03-17
- [x] Phase 9: Hook Migration (4/4 plans) — completed 2026-03-17
- [x] Phase 10: Operations and Cutover (4/4 plans) — completed 2026-03-18
- [x] Phase 11: Master Roadmap (1/1 plan) — completed 2026-03-18

</details>

<details>
<summary>✅ v1.2.1 Stabilization and Polish (Phases 12-17) — SHIPPED 2026-03-19</summary>

- [x] Phase 12: Structural Refactor (4/4 plans) — completed 2026-03-18
- [x] Phase 13: Cleanup and Fixes (2/2 plans) — completed 2026-03-18
- [x] Phase 14: Documentation and Branding (3/3 plans) — completed 2026-03-18
- [x] Phase 15: Update System (4/4 plans) — completed 2026-03-19
- [x] Phase 16: Tech Debt Cleanup (1/1 plan) — completed 2026-03-19
- [x] Phase 17: Deploy Pipeline Fixes (3/3 plans) — completed 2026-03-19

</details>

<details>
<summary>✅ v1.3-M1 Foundation and Infrastructure Refactor (Phases 18-22) — SHIPPED 2026-03-20</summary>

- [x] Phase 18: Restructure Prerequisites (2/2 plans) — completed 2026-03-19
- [x] Phase 19: Six-Subsystem Directory Restructure (3/3 plans) — completed 2026-03-20
- [x] Phase 20: Management Hardening (2/2 plans) — completed 2026-03-20
- [x] Phase 21: SQLite Session Index (2/2 plans) — completed 2026-03-20
- [x] Phase 22: M1 Verification and Cleanup (4/4 plans) — completed 2026-03-20

</details>

### v1.3-M2 Core Intelligence (Planned)

**Milestone Goal:** Make the memory system intelligent through the Inner Voice and dual-path architecture. Reverie replaces Haiku curation with context-aware, personality-driven injection. Hybrid architecture: CJS command hooks for hot path + custom subagents for deliberation.

**Phase Numbering:**
- Integer phases (23, 24, 25, 26): Planned milestone work
- Decimal phases (e.g., 23.1): Urgent insertions (marked with INSERTED)

- [x] **Phase 23: Foundation and Routing** - Data structures, operational monitoring, feature flag, dispatcher dual-mode routing, and stub handlers (completed 2026-03-20)
- [ ] **Phase 24: Cognitive Pipeline** - Core orchestration, dual-path routing, curation migration, all 7 handlers, subagent integration, and state bridge
- [ ] **Phase 25: Graduated Rollout** - Hybrid mode A/B comparison, threshold calibration, activation seeding, and voice management CLI
- [ ] **Phase 26: Operational Completion** - Bare CLI shim, CHANGELOG workflow, and install pipeline updates for Reverie

## Phase Details

### Phase 23: Foundation and Routing
**Goal**: Reverie subsystem has its foundational data structures, operational monitoring, feature flag system, and a working dispatcher that routes events to stub handlers based on mode -- without changing any existing behavior
**Depends on**: Phase 22 (M1 complete)
**Requirements**: IV-01, IV-02, IV-03, IV-04, IV-10, IV-12, OPS-MON-01, OPS-MON-02, FLAG-01, FLAG-03, HOOK-01, HOOK-02, HOOK-03
**Success Criteria** (what must be TRUE):
  1. `dynamo config set reverie.mode classic` and `dynamo config get reverie.mode` round-trip correctly; mode defaults to `classic` on fresh install
  2. With mode set to `classic`, all existing hook behavior is identical to v1.3-M1 -- no user-visible change from the feature flag or routing modification
  3. With mode set to `cortex`, dispatcher routes events to Reverie stub handlers that produce the same output as classic Ledger handlers (pass-through stubs)
  4. Inner Voice state file loads from disk, persists atomically, and recovers gracefully from corruption (truncated/invalid JSON resets to fresh defaults)
  5. `activation.cjs` computes entity extraction, activation decay, 1-hop spreading, domain frame classification, and sublimation scoring -- all validated by unit tests with sub-5ms entity extraction and sub-1ms classification benchmarks
**Plans:** 3/3 plans complete
Plans:
- [x] 23-01-PLAN.md -- Config module (lib/config.cjs), state module (subsystems/reverie/state.cjs), and CLI router integration
- [x] 23-02-PLAN.md -- Activation computation engine (entity extraction, spreading activation, decay, classification, sublimation scoring, spawn tracking)
- [x] 23-03-PLAN.md -- 7 Reverie handler stubs, dispatcher dual-mode routing, and SubagentStart/SubagentStop registration

### Phase 24: Cognitive Pipeline
**Goal**: The Inner Voice processes every hook event through a cognitive pipeline -- extracting entities, updating activation maps, selecting hot or deliberation path, formatting injections within token budgets, and communicating with the deliberation subagent via a crash-safe state bridge
**Depends on**: Phase 23
**Requirements**: IV-05, IV-06, IV-07, IV-08, IV-09, IV-11, PATH-01, PATH-02, PATH-03, PATH-04, PATH-05, PATH-06
**Success Criteria** (what must be TRUE):
  1. Hot path completes under 500ms end-to-end (state load through injection formatting through state persist) with per-step timing instrumentation visible in debug output; 400ms abort threshold prevents overruns
  2. Path selection (hot/deliberation/skip) is deterministic based on activation signals -- no LLM call required for the routing decision itself
  3. Deliberation subagent (`cc/agents/inner-voice.md`) spawns on semantic shift or low-confidence signals; rate limit detection degrades to hot-path-only when spawn fails
  4. State bridge writes deliberation results via SubagentStop with correlation ID and 60s TTL; next UserPromptSubmit atomically consumes the result via `fs.renameSync`; stale or crashed results are detected and discarded
  5. Injection formatting respects token limits (500 session start, 150 mid-session, 50 urgent) and uses adversarial counter-prompting templates
**Plans:** 2/4 plans executed
Plans:
- [x] 24-01-PLAN.md -- Dual-path routing module (path selection, semantic shift, recall detection, token management, injection formatting) and inner-voice subagent definition
- [x] 24-02-PLAN.md -- Reverie curation module (template-based formatting, token limits, adversarial framing) and 5 Inner Voice prompt templates
- [ ] 24-03-PLAN.md -- Pipeline orchestrator (inner-voice.cjs) with per-hook cognitive pipelines, state bridge, and hot-path timing instrumentation
- [ ] 24-04-PLAN.md -- All 7 handler rewrites replacing pass-through stubs with cognitive pipeline delegation

### Phase 25: Graduated Rollout
**Goal**: The Inner Voice proves it equals or exceeds classic curation quality through a hybrid comparison mode before any user switches to cortex mode, and users can inspect and manage Inner Voice state
**Depends on**: Phase 24
**Requirements**: FLAG-02, FLAG-04
**Success Criteria** (what must be TRUE):
  1. In hybrid mode, both classic and Reverie pipelines run on each event; classic output is injected as normal while Reverie output is logged for comparison but not shown to the user
  2. `dynamo voice status` shows current Inner Voice state (activation map size, injection mode, confidence, last injection reason); `dynamo voice explain` shows rationale for the last injection decision; `dynamo voice reset` clears state to fresh defaults
  3. Switching between classic, hybrid, and cortex modes via `dynamo config set reverie.mode` takes effect on the next hook event with no restart required
**Plans**: TBD

### Phase 26: Operational Completion
**Goal**: M2 deliverable is complete with bare CLI access, update notes workflow, and install pipeline that deploys all new Reverie files
**Depends on**: Phase 25
**Requirements**: OPS-01, OPS-02, OPS-03
**Success Criteria** (what must be TRUE):
  1. Running `dynamo` from any terminal (without `node` prefix or full path) invokes the CLI via a symlink shim at `~/.claude/bin/dynamo`; `DYNAMO_DEV=1` overrides to the repo version
  2. CHANGELOG.md exists with well-written update notes; `dynamo check-update` and `dynamo update` display relevant changelog entries
  3. `dynamo install` and `dynamo sync` deploy all new Reverie files, the `cc/agents/` directory, and `cc/prompts/` templates alongside existing subsystem files
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 23 -> 24 -> 25 -> 26

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Methodology | v1.0 | 1/1 | Complete | 2026-03-16 |
| 2. Research | v1.0 | 6/6 | Complete | 2026-03-16 |
| 3. Synthesis | v1.0 | 1/1 | Complete | 2026-03-17 |
| 4. Diagnostics | v1.1 | 2/2 | Complete | 2026-03-17 |
| 5. Hook Reliability | v1.1 | 2/2 | Complete | 2026-03-17 |
| 6. Session Management | v1.1 | 2/2 | Complete | 2026-03-17 |
| 7. Verification and Sync | v1.1 | 2/2 | Complete | 2026-03-17 |
| 8. Foundation and Branding | v1.2 | 3/3 | Complete | 2026-03-17 |
| 9. Hook Migration | v1.2 | 4/4 | Complete | 2026-03-17 |
| 10. Operations and Cutover | v1.2 | 4/4 | Complete | 2026-03-18 |
| 11. Master Roadmap | v1.2 | 1/1 | Complete | 2026-03-18 |
| 12. Structural Refactor | v1.2.1 | 4/4 | Complete | 2026-03-18 |
| 13. Cleanup and Fixes | v1.2.1 | 2/2 | Complete | 2026-03-18 |
| 14. Documentation and Branding | v1.2.1 | 3/3 | Complete | 2026-03-18 |
| 15. Update System | v1.2.1 | 4/4 | Complete | 2026-03-19 |
| 16. Tech Debt Cleanup | v1.2.1 | 1/1 | Complete | 2026-03-19 |
| 17. Deploy Pipeline Fixes | v1.2.1 | 3/3 | Complete | 2026-03-19 |
| 18. Restructure Prerequisites | v1.3-M1 | 2/2 | Complete | 2026-03-19 |
| 19. Six-Subsystem Restructure | v1.3-M1 | 3/3 | Complete | 2026-03-20 |
| 20. Management Hardening | v1.3-M1 | 2/2 | Complete | 2026-03-20 |
| 21. SQLite Session Index | v1.3-M1 | 2/2 | Complete | 2026-03-20 |
| 22. M1 Verification and Cleanup | v1.3-M1 | 4/4 | Complete | 2026-03-20 |
| 23. Foundation and Routing | v1.3-M2 | 3/3 | Complete    | 2026-03-20 |
| 24. Cognitive Pipeline | v1.3-M2 | 2/4 | In Progress|  |
| 25. Graduated Rollout | v1.3-M2 | 0/TBD | Not started | - |
| 26. Operational Completion | v1.3-M2 | 0/TBD | Not started | - |
