# Roadmap: Dynamo

## Milestones

- ✅ **v1.0 Research and Ranked Report** -- Phases 1-3 (shipped 2026-03-17)
- ✅ **v1.1 Fix Memory System** -- Phases 4-7 (shipped 2026-03-17)
- ✅ **v1.2 Dynamo Foundation** -- Phases 8-11 (shipped 2026-03-18)
- **v1.2.1 Stabilization and Polish** -- Phases 12-15 (in progress)

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

### v1.2.1 Stabilization and Polish

**Milestone Goal:** Close the gaps between v1.2's CJS rewrite and v1.3's intelligence work. Ensure Dynamo is properly branded, fully documented, easy to update, and that architectural decisions are captured for continuity.

- [x] **Phase 12: Structural Refactor** - Reorganize directories and code boundaries, add dev toggles (completed 2026-03-18)
- [ ] **Phase 13: Cleanup and Fixes** - Archive legacy system, fix Neo4j browser
- [ ] **Phase 14: Documentation and Branding** - README, exhaustive docs, CLAUDE.md, architecture capture
- [ ] **Phase 15: Update System** - Version checks, migration, and rollback

## Phase Details

### Phase 12: Structural Refactor
**Goal**: Dynamo's directory structure and code organization reflect the three-component architecture, with toggle infrastructure for safe development
**Depends on**: Phase 11 (v1.2 complete)
**Requirements**: STAB-08, STAB-09, STAB-10
**Success Criteria** (what must be TRUE):
  1. The repo has `dynamo/`, `ledger/`, `switchboard/` as root-level directories with `graphiti/` under `ledger/` as its storage backend
  2. Code in each component only imports from its own scope or shared core -- no cross-boundary leakage between Ledger and Switchboard
  3. A global toggle disables all Dynamo hooks and MCP functionality across all Claude threads
  4. A dev mode toggle overrides global-off for the current development thread, allowing selective Dynamo usage during development
  5. All existing tests pass against the restructured codebase
**Plans:** 4/4 plans complete

Plans:
- [x] 12-01-PLAN.md -- Directory restructure + require path fixes + boundary enforcement
- [x] 12-02-PLAN.md -- Toggle mechanism + installer/sync update for 3-dir layout
- [x] 12-03-PLAN.md -- CLI memory commands (9 MCP tool equivalents)
- [x] 12-04-PLAN.md -- MCP deregistration + CLAUDE.md update + user verification

### Phase 13: Cleanup and Fixes
**Goal**: Legacy artifacts are removed and the Neo4j admin browser is accessible for knowledge graph visibility
**Depends on**: Phase 12 (paths stable before cleanup references them)
**Requirements**: STAB-02, STAB-07
**Success Criteria** (what must be TRUE):
  1. The legacy Python/Bash system is tagged, branched, and fully removed from dev/master -- no Python or Bash hook scripts remain in the active codebase
  2. The legacy archive is accessible for historical reference (tagged release or archive branch)
  3. Neo4j admin browser is accessible at port 7475 and can display the knowledge graph contents
**Plans**: TBD

### Phase 14: Documentation and Branding
**Goal**: Dynamo is fully documented for both users and future Claude sessions, with complete branding and architectural knowledge captured for development continuity
**Depends on**: Phase 13 (docs describe the clean, final state)
**Requirements**: STAB-01, STAB-03, STAB-04, STAB-06
**Success Criteria** (what must be TRUE):
  1. README reflects Dynamo identity with accurate architecture description, installation instructions, and usage examples -- no references to the old Python/Bash system
  2. Documentation covers architecture, CLI commands, hook behavior, configuration, and a development guide
  3. CLAUDE.md contains complete operational instructions for using the Dynamo CLI and system -- Claude Code can self-manage Dynamo without user guidance
  4. Architectural decisions from v1.0-v1.2 are captured in a structured format that new Claude sessions can read for development continuity
  5. GitHub repo is renamed to reflect Dynamo identity
**Plans**: TBD

### Phase 15: Update System
**Goal**: Dynamo can check for updates, apply upgrades, and roll back if something goes wrong -- without manual user intervention
**Depends on**: Phase 14 (stable codebase and docs to build update system against)
**Requirements**: STAB-05
**Success Criteria** (what must be TRUE):
  1. Dynamo can check its current version against the latest available version
  2. An upgrade command pulls and applies new versions with migration support for breaking changes
  3. A rollback mechanism restores the previous working version if an update fails
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 12 -> 12.1 -> 13 -> 13.1 -> 14 -> 15

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
| 12. Structural Refactor | 4/4 | Complete   | 2026-03-18 | - |
| 13. Cleanup and Fixes | v1.2.1 | 0/TBD | Not started | - |
| 14. Documentation and Branding | v1.2.1 | 0/TBD | Not started | - |
| 15. Update System | v1.2.1 | 0/TBD | Not started | - |
