# Roadmap: Dynamo

## Milestones

- ✅ **v1.0 Research and Ranked Report** -- Phases 1-3 (shipped 2026-03-17)
- ✅ **v1.1 Fix Memory System** -- Phases 4-7 (shipped 2026-03-17)
- [ ] **v1.2 Dynamo Foundation** -- Phases 8-11 (in progress)

## Phases

<details>
<summary>v1.0 Research and Ranked Report (Phases 1-3) -- SHIPPED 2026-03-17</summary>

- [x] Phase 1: Methodology (1/1 plans) -- completed 2026-03-16
- [x] Phase 2: Research (6/6 plans) -- completed 2026-03-16
- [x] Phase 3: Synthesis (1/1 plans) -- completed 2026-03-17

</details>

<details>
<summary>v1.1 Fix Memory System (Phases 4-7) -- SHIPPED 2026-03-17</summary>

- [x] Phase 4: Diagnostics (2/2 plans) -- completed 2026-03-17
- [x] Phase 5: Hook Reliability (2/2 plans) -- completed 2026-03-17
- [x] Phase 6: Session Management (2/2 plans) -- completed 2026-03-17
- [x] Phase 7: Verification and Sync (2/2 plans) -- completed 2026-03-17

</details>

### v1.2 Dynamo Foundation

- [x] **Phase 8: Foundation and Branding** - CJS shared substrate, directory restructure, regression tests (completed 2026-03-17)
- [x] **Phase 9: Hook Migration** - All 5 hooks, curation pipeline, session management on CJS (completed 2026-03-17)
- [x] **Phase 10: Operations and Cutover** - Health check, diagnostics, verify, CLI, installer, sync, stack commands (completed 2026-03-18)
- [x] **Phase 11: Master Roadmap** - Backlog prioritized and assigned to v1.3-v2.0 (completed 2026-03-18)

## Phase Details

### Phase 8: Foundation and Branding
**Goal**: The CJS shared substrate exists under ~/.claude/dynamo/ with correct project structure, and all foundation modules pass regression tests covering the 12 v1.1 fixes
**Depends on**: Phase 7 (v1.1 complete)
**Requirements**: FND-01, FND-02, FND-03, FND-04, FND-05, FND-06, FND-07, BRD-01, BRD-02
**Success Criteria** (what must be TRUE):
  1. Running `node lib/core.cjs` from ~/.claude/dynamo/ loads config, parses .env, detects the current project name, and formats output without error
  2. The MCP client can open an SSE connection to Graphiti, send a JSON-RPC request, and parse a structured response (verified by a canary round-trip test)
  3. Scope validation rejects any group_id containing a colon and accepts the dash-separated format (e.g., project-myproject)
  4. The regression test suite passes, covering all 12 v1.1 fixes including GRAPHITI_GROUP_ID override detection, silent fire-and-forget prevention, and scope format enforcement
  5. The directory tree ~/.claude/dynamo/lib/ledger/ and ~/.claude/dynamo/lib/switchboard/ exists with the Dynamo/Ledger/Switchboard naming applied to all new modules
**Plans**: 3 plans

Plans:
- [x] 08-01-PLAN.md -- Foundation substrate: directory tree, config, core.cjs, scope.cjs
- [x] 08-02-PLAN.md -- MCP client and unit tests for all foundation modules
- [x] 08-03-PLAN.md -- Regression test suite covering all 12 v1.1 fixes

### Phase 9: Hook Migration
**Goal**: All 5 Claude Code hook events are handled by the CJS dispatcher with full behavioral parity to the Python/Bash system, including curation, session naming, and sessions.json compatibility
**Depends on**: Phase 8
**Requirements**: LDG-01, LDG-02, LDG-03, LDG-04, LDG-05, LDG-06, LDG-07, LDG-08, LDG-09, LDG-10
**Success Criteria** (what must be TRUE):
  1. The single hook dispatcher (dynamo-hooks.cjs) receives each of the 5 hook events (SessionStart, UserPromptSubmit, PostToolUse, PreCompact, Stop) and routes them to the correct handler without error
  2. After a full session lifecycle (start, prompt, tool use, compact, stop), Graphiti contains correctly scoped episodes and the session appears in sessions.json with an auto-generated name
  3. The Haiku curation pipeline curates search results via OpenRouter, and gracefully degrades to truncated output if OpenRouter is unavailable
  4. Session management commands (list, view, label, backfill, index) read and write sessions.json in the existing format -- no data loss when switching from Python to CJS
  5. The Stop hook completes its summary + naming + Graphiti write within the configured timeout (verified by timing measurement in a real Claude Code session)
**Plans**: 4 plans

Plans:
- [x] 09-01-PLAN.md -- Library modules: curation, episodes, search + unit tests
- [x] 09-02-PLAN.md -- Session management module + unit tests
- [x] 09-03-PLAN.md -- Dispatcher + 5 hook handlers + integration tests
- [x] 09-04-PLAN.md -- Settings switchover + smoke test verification

### Phase 10: Operations and Cutover
**Goal**: The CJS system is fully operational with health checking, diagnostics, verification, bidirectional sync, stack management, and a unified CLI -- and the Python/Bash system is retired
**Depends on**: Phase 9
**Requirements**: SWB-01, SWB-02, SWB-03, SWB-04, SWB-05, SWB-06, SWB-07, SWB-08
**Success Criteria** (what must be TRUE):
  1. Running `dynamo health-check` executes all 6 stages (Docker, Neo4j, API, MCP session, env vars, canary) and reports pass/fail with actionable messages for each failure
  2. Running `dynamo verify-memory` performs the end-to-end pipeline test (6 checks including a project-scope write-then-read round-trip) confirming the CJS hooks are storing data correctly
  3. Running `dynamo diagnose` executes all 13 diagnostic stages with parity to the Python diagnose.py output
  4. The installer deploys CJS files to ~/.claude/dynamo/, generates settings-hooks.json pointing to .cjs files, and eliminates the Python venv dependency entirely
  5. Running `dynamo sync`, `dynamo start`, and `dynamo stop` work with full parity to the Bash originals (bidirectional sync, Docker compose up/down)
**Plans**: 4 plans

Plans:
- [x] 10-01-PLAN.md -- Shared diagnostic stages module (13 stages) and pretty formatter
- [x] 10-02-PLAN.md -- Health check, diagnose, and verify-memory orchestrators
- [x] 10-03-PLAN.md -- Bidirectional sync and Docker stack start/stop
- [x] 10-04-PLAN.md -- CLI router, installer, cutover, and end-to-end verification

### Phase 11: Master Roadmap
**Goal**: The backlog of deferred features is prioritized, assigned to future milestones (v1.3-v2.0), and documented as a living roadmap for the Dynamo project
**Depends on**: Phase 10 (full system operational provides informed perspective on what to build next)
**Requirements**: MRP-01, MRP-02
**Success Criteria** (what must be TRUE):
  1. Every deferred requirement from REQUIREMENTS.md (MENH-01 through MENH-09, MGMT-01 through MGMT-10, UI-01 through UI-07) is assigned to a specific future milestone with a brief rationale
  2. The Master Roadmap document exists in the project root and can be read by Claude Code to understand what comes after v1.2
**Plans**: 1 plan

Plans:
- [ ] 11-01-PLAN.md -- Prioritize 26 deferred requirements into v1.3-v2.0 milestones with rationale

## Progress

**Execution Order:** Phases 8 > 9 > 10 > 11

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
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
| 11. Master Roadmap | 1/1 | Complete    | 2026-03-18 | - |
