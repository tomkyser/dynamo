# Roadmap: Dynamo

## Milestones

- ✅ **v1.0 Research and Ranked Report** -- Phases 1-3 (shipped 2026-03-17)
- ✅ **v1.1 Fix Memory System** -- Phases 4-7 (shipped 2026-03-17)
- ✅ **v1.2 Dynamo Foundation** -- Phases 8-11 (shipped 2026-03-18)
- ✅ **v1.2.1 Stabilization and Polish** -- Phases 12-17 (shipped 2026-03-19)
- [ ] **v1.3-M1 Foundation and Infrastructure Refactor** -- Phases 18-22

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

<details>
<summary>v1.2 Dynamo Foundation (Phases 8-11) -- SHIPPED 2026-03-18</summary>

- [x] Phase 8: Foundation and Branding (3/3 plans) -- completed 2026-03-17
- [x] Phase 9: Hook Migration (4/4 plans) -- completed 2026-03-17
- [x] Phase 10: Operations and Cutover (4/4 plans) -- completed 2026-03-18
- [x] Phase 11: Master Roadmap (1/1 plan) -- completed 2026-03-18

</details>

<details>
<summary>v1.2.1 Stabilization and Polish (Phases 12-17) -- SHIPPED 2026-03-19</summary>

- [x] Phase 12: Structural Refactor (4/4 plans) -- completed 2026-03-18
- [x] Phase 13: Cleanup and Fixes (2/2 plans) -- completed 2026-03-18
- [x] Phase 14: Documentation and Branding (3/3 plans) -- completed 2026-03-18
- [x] Phase 15: Update System (4/4 plans) -- completed 2026-03-19
- [x] Phase 16: Tech Debt Cleanup (1/1 plan) -- completed 2026-03-19
- [x] Phase 17: Deploy Pipeline Fixes (3/3 plans) -- completed 2026-03-19

</details>

### v1.3-M1 Foundation and Infrastructure Refactor

**Milestone Goal:** Restructure the codebase to the six-subsystem architecture and establish infrastructure prerequisites for the intelligence layer.

- [x] **Phase 18: Restructure Prerequisites** - Centralized path resolver, circular dependency detection, and layout mapping before any files move (completed 2026-03-19)
- [x] **Phase 19: Six-Subsystem Directory Restructure** - 3-wave migration from 3-dir to six-subsystem layout with sync/install/deploy validation (completed 2026-03-20)
- [x] **Phase 20: Management Hardening** - Dependency verification and jailbreak protection for the hook system (completed 2026-03-20)
- [x] **Phase 21: SQLite Session Index** - Replace sessions.json with SQLite-backed session storage via node:sqlite (completed 2026-03-20)
- [ ] **Phase 22: M1 Verification and Cleanup** - End-to-end validation of all M1 deliverables in deployed layout

## Phase Details

### Phase 18: Restructure Prerequisites
**Goal**: Safe foundation for the directory restructure -- every cross-cutting concern locked down before any file moves
**Depends on**: Phase 17 (v1.2.1 complete)
**Requirements**: ARCH-02, ARCH-03
**Success Criteria** (what must be TRUE):
  1. A single `lib/resolve.cjs` module centralizes all dual-layout path resolution (no more per-module `resolveSibling`/`resolveHandlers` ad hoc patterns)
  2. A static analysis test detects circular `require()` chains across all production modules and fails if any are found
  3. Running `node dynamo/tests/` confirms all 374+ existing tests pass with the new resolver in place (no behavioral regressions)
**Plans**: 2 plans
Plans:
- [x] 18-01-PLAN.md -- Create lib/ shared substrate with centralized resolver and dependency graph cycle detector
- [x] 18-02-PLAN.md -- Migrate all production files to centralized resolver and update deploy pipeline

### Phase 19: Six-Subsystem Directory Restructure
**Goal**: Codebase organized into the target six-subsystem architecture with all operational pipelines (sync, install, deploy) working on the new layout
**Depends on**: Phase 18
**Requirements**: ARCH-01, ARCH-04, ARCH-05, ARCH-06, ARCH-07
**Success Criteria** (what must be TRUE):
  1. Directory tree matches the target layout: `subsystems/{switchboard,assay,ledger,terminus,reverie}/`, `cc/hooks/`, `lib/`, with Reverie as a stub directory
  2. `dynamo sync` correctly maps and synchronizes all subsystem directories between repo and `~/.claude/dynamo/` deployment
  3. `dynamo install` registers hooks from `cc/hooks/` in `settings.json` and the deployed layout matches expectations
  4. All 398 existing tests pass after the restructure (zero regressions)
  5. A unified layout mapping module (`lib/layout.cjs`) serves as the single source of truth for all path references used by sync, install, and deploy
**Plans**: 3 plans
Plans:
- [x] 19-01-PLAN.md -- Prep wave: extract lib/layout.cjs and move core.cjs, scope.cjs, pretty.cjs into lib/
- [x] 19-02-PLAN.md -- Main migration: create six-subsystem directories and move all files with git mv
- [x] 19-03-PLAN.md -- Pipeline updates: rewrite SYNC_PAIRS, install.cjs, settings-hooks.json, and structural tests

### Phase 20: Management Hardening
**Goal**: Self-contained dependency management and input sanitization protect the system from environment issues and prompt injection
**Depends on**: Phase 19 (needs `lib/` and `cc/hooks/` to exist)
**Requirements**: MGMT-01, MGMT-08a, MGMT-08b
**Success Criteria** (what must be TRUE):
  1. `dynamo install` and `dynamo health-check` verify Node.js minimum version and report Graphiti dependency status (Docker container reachable, API responding)
  2. The hook dispatcher rejects malformed JSON input and enforces field length limits, logging violations to `hook-errors.log`
  3. `additionalContext` content injected into hooks is wrapped in boundary markers that prevent prompt content from bleeding into system instructions
**Plans**: 2 plans
Plans:
- [x] 20-01-PLAN.md -- Add Node.js version verification to health-check and install pipelines
- [x] 20-02-PLAN.md -- Add input validation and prompt injection boundary protection to hook dispatcher

### Phase 21: SQLite Session Index
**Goal**: Session data lives in an indexed SQLite database with identical query interface and safe migration from the existing JSON file
**Depends on**: Phase 20 (needs dependency verification to confirm `node:sqlite` availability)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria** (what must be TRUE):
  1. `dynamo session list`, `dynamo session view`, `dynamo session label`, and `dynamo session backfill` all read/write session data from SQLite via `node:sqlite` DatabaseSync API
  2. Running `dynamo install` on a system with an existing `sessions.json` automatically migrates all session records into the SQLite database (one-time, idempotent)
  3. On a Node.js version where `node:sqlite` is unavailable, session commands transparently fall back to the existing JSON file with no user-visible errors
  4. Session query performance is at least as fast as JSON file reads for typical operations (list, view, label)
**Plans**: 2 plans
Plans:
- [ ] 21-01-PLAN.md -- Create SQLite session storage layer in Terminus with comprehensive test suite
- [ ] 21-02-PLAN.md -- Wire sessions.cjs delegation, install migration step, and health-check storage stage

### Phase 22: M1 Verification and Cleanup
**Goal**: All M1 deliverables verified end-to-end in deployed layout with any migration shims or temporary scaffolding removed
**Depends on**: Phase 21
**Requirements**: (cross-cutting validation -- no new requirements; validates ARCH-01 through ARCH-07, MGMT-01, MGMT-08a, MGMT-08b, DATA-01 through DATA-04)
**Success Criteria** (what must be TRUE):
  1. Fresh `dynamo install` on a clean `~/.claude/dynamo/` produces a fully functional deployment with all six subsystem directories, SQLite session store, and hardened hooks
  2. `dynamo health-check` reports all green (Docker stack, API, memory pipeline, dependency versions, SQLite)
  3. All re-export shims from the migration waves have been removed -- no module re-exports old paths
  4. `dynamo sync` round-trips correctly between repo and deployed layout with zero silent file skips
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 18 -> 19 -> 20 -> 21 -> 22

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
| 19. Six-Subsystem Directory Restructure | v1.3-M1 | 3/3 | Complete | 2026-03-20 |
| 20. Management Hardening | v1.3-M1 | 2/2 | Complete | 2026-03-20 |
| 21. SQLite Session Index | 2/2 | Complete    | 2026-03-20 | - |
| 22. M1 Verification and Cleanup | v1.3-M1 | 0/TBD | Not started | - |
