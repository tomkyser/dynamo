# Roadmap: Dynamo

## Milestones

- ✅ **v1.0 Research and Ranked Report** -- Phases 1-3 (shipped 2026-03-17)
- ✅ **v1.1 Fix Memory System** -- Phases 4-7 (shipped 2026-03-17)
- ✅ **v1.2 Dynamo Foundation** -- Phases 8-11 (shipped 2026-03-18)
- **v1.2.1 Stabilization and Polish** -- Phases 12-17 (in progress)

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
- [x] **Phase 13: Cleanup and Fixes** - Archive legacy system, fix Neo4j browser (completed 2026-03-18)
- [x] **Phase 14: Documentation and Branding** - README, exhaustive docs, CLAUDE.md, architecture capture (completed 2026-03-18)
- [x] **Phase 15: Update System** - Version checks, migration, and rollback (completed 2026-03-19)
- [x] **Phase 16: Tech Debt Cleanup** - Doc updates, stale permissions removal, deploy to live (completed 2026-03-19)
- [ ] **Phase 17: Deploy Pipeline and Integration Fixes** - Fix hook path resolution, remove MCP re-registration, add CLAUDE.md deployment, minor cleanup

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
**Plans:** 2/2 plans complete

Plans:
- [x] 13-01-PLAN.md -- Tag legacy archive + git rm all Python/Bash files
- [x] 13-02-PLAN.md -- Neo4j port fix + stale reference cleanup + README deprecation notice

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
**Plans:** 3/3 plans complete

Plans:
- [x] 14-01-PLAN.md -- Complete README.md rewrite with all 10 sections and Mermaid architecture diagram
- [x] 14-02-PLAN.md -- CLAUDE.md template expansion + PROJECT.md architecture decision records
- [x] 14-03-PLAN.md -- Full rewrite of all 7 codebase map files for CJS architecture

### Phase 15: Update System
**Goal**: Dynamo can check for updates, apply upgrades, and roll back if something goes wrong -- without manual user intervention
**Depends on**: Phase 14 (stable codebase and docs to build update system against)
**Requirements**: STAB-05
**Success Criteria** (what must be TRUE):
  1. Dynamo can check its current version against the latest available version
  2. An upgrade command pulls and applies new versions with migration support for breaking changes
  3. A rollback mechanism restores the previous working version if an update fails
**Plans:** 4/4 plans complete

Plans:
- [x] 15-01-PLAN.md -- Version check module (GitHub API + semver comparison)
- [x] 15-02-PLAN.md -- Migration harness (discover, sort, execute version-keyed scripts)
- [x] 15-03-PLAN.md -- Update orchestrator (snapshot + pull/download + migrate + install + verify + auto-rollback)
- [x] 15-04-PLAN.md -- CLI router wiring (check-update, update commands + help text + tests)

### Phase 16: Tech Debt Cleanup
**Goal**: Close integration and flow gaps from milestone audit — update documentation for Phase 15 commands, remove stale config entries, and deploy to live
**Depends on**: Phase 15 (update system must be complete before documenting it)
**Requirements**: STAB-01, STAB-03, STAB-04, STAB-05, STAB-10
**Gap Closure:** Closes INT-01, INT-02, INT-03, FLOW-01, FLOW-02, FLOW-03 from v1.2.1 audit
**Success Criteria** (what must be TRUE):
  1. README.md CLI reference table includes `check-update`, `update`, and updated `rollback` descriptions
  2. CLAUDE.md.template CLI reference includes `check-update`, `update`, and updated `rollback` descriptions
  3. settings-hooks.json contains zero `mcp__graphiti__*` permission entries
  4. `dynamo install` deploys current code to live `~/.claude/dynamo/`
**Plans:** 1/1 plans complete

Plans:
- [x] 16-01-PLAN.md -- Update docs for Phase 15 commands, clean stale MCP permissions, deploy to live

### Phase 17: Deploy Pipeline and Integration Fixes
**Goal**: Dynamo's deploy pipeline correctly reflects all architectural decisions — hooks work in deployed layout, toggle provides true blackout, and installer deploys all operational files
**Depends on**: Phase 16 (all prior tech debt closed)
**Requirements**: STAB-03, STAB-04, STAB-10
**Gap Closure:** Closes INT-HOOKS-PATH, INT-MCP-REREG, INT-CLAUDEMD-DEPLOY, FLOW-HOOKS-DEPLOYED, FLOW-TOGGLE-BLACKOUT, FLOW-FRESH-INSTALL from v1.2.1 audit
**Success Criteria** (what must be TRUE):
  1. `dynamo-hooks.cjs` resolves handler paths correctly in both repo and deployed (`~/.claude/dynamo/`) layouts
  2. `dynamo install` does NOT register Graphiti MCP server — CLI is the sole memory access path
  3. `dynamo install` copies `CLAUDE.md.template` to `~/.claude/CLAUDE.md`
  4. All 5 hook events execute successfully in deployed layout (not silently fail)
  5. `dynamo toggle off` fully disables all memory access (CLI gate + hook gate + no MCP bypass)
  6. README Mermaid diagram shows correct Neo4j ports (`:7475/:7687`)
  7. Regression tests reference correct paths (no `lib/` references)
**Plans:** 3 plans

Plans:
- [ ] 17-01-PLAN.md -- Fix hook dispatcher dual-layout path resolution + installer MCP deregistration and CLAUDE.md deploy
- [ ] 17-02-PLAN.md -- Fix regression tests for current layout + update dispatcher/install test assertions + correct README port
- [ ] 17-03-PLAN.md -- Deploy to live, run full test suite, human-verify hooks in deployed environment

## Progress

**Execution Order:**
Phases execute in numeric order: 12 -> 12.1 -> 13 -> 13.1 -> 14 -> 15 -> 16 -> 17

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
| 17. Deploy Pipeline Fixes | v1.2.1 | 0/3 | In Progress | - |
