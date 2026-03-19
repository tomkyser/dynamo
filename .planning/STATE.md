---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
stopped_at: Completed 17-03-PLAN.md (Phase 17 complete)
last_updated: "2026-03-19T05:07:22Z"
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 17
  completed_plans: 17
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-19)

**Core value:** Every capability must be self-manageable by Claude Code without manual user config file edits
**Current focus:** v1.2.1 milestone complete — planning next milestone

## Current Position

Phase: 17 (deploy-pipeline-fixes) — COMPLETE
Plan: 3 of 3 (all complete)

### Prior Milestones

v1.0 (3 phases, 8 plans), v1.1 (4 phases, 8 plans), v1.2 (4 phases, 12 plans) -- all shipped.
Total prior: 11 phases, 28 plans completed.

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260318-gcj | Update GSD planning docs to reflect current project state | 2026-03-18 | 3281ecb | | [260318-gcj](./quick/260318-gcj-update-gsd-planning-docs-to-reflect-curr/) |
| 260318-mcy | Research Ledger Cortex brief and produce analysis + draft roadmap | 2026-03-18 | 62dab20 | | [260318-mcy](./quick/260318-mcy-research-ledger-cortex-brief-and-produce/) |
| 260318-nbm | Synthesize Inner Voice cognitive architecture specification | 2026-03-18 | 24f3801 | | [260318-nbm](./quick/260318-nbm-inner-voice-cognitive-architecture-synth/) |
| 260318-oog | Reconcile draft roadmap with Inner Voice spec findings | 2026-03-18 | f74d9b2 | | [260318-oog](./quick/260318-oog-reconcile-draft-roadmap-with-inner-voice/) |
| 260318-pt7 | Apply approved Cortex roadmap draft to MASTER-ROADMAP.md | 2026-03-18 | d55bf0c | | [260318-pt7](./quick/260318-pt7-apply-approved-cortex-roadmap-draft-to-m/) |
| 260318-x55 | Update MASTER-ROADMAP.md to mark v1.2.1 as shipped | 2026-03-19 | 5869aff | | [260318-x55](./quick/260318-x55-update-the-master-roadmap-now-that-1-2-1/) |
| 260318-x21 | Steel-man analysis and implementation planning for Synthesis v2 | 2026-03-19 | 5fe6a40 | Verified | [260318-x21](./quick/260318-x21-steel-man-analysis-and-implementation-pl/) |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.2.1 scoping]: Insert v1.2.1 before v1.3 to close stabilization gaps
- [Phase ordering]: Structural refactors (STAB-08, STAB-09) first since they affect file paths everywhere
- [Phase ordering]: Dev toggles (STAB-10) early to enable safe development of subsequent phases
- [Phase ordering]: Documentation (STAB-01, STAB-03, STAB-04, STAB-06) after structural changes so docs describe the final state
- [12-01 circular deps]: Used Object.assign(module.exports) pattern to break core.cjs <-> ledger circular dependency
- [12-01 resolveCore]: Dual-path resolution checks deployed layout first, falls back to repo layout
- [12-01 re-exports]: loadSessions/listSessions re-exported through core.cjs for boundary compliance
- [12-02 isEnabled]: configPath param for test isolation, reads deployed config by default
- [12-02 REPO_ROOT]: Renamed REPO_DIR to REPO_ROOT in switchboard modules for clarity
- [12-02 SYNC_PAIRS]: Sync uses per-pair excludes array for clean 3-dir iteration
- [12-03 requireEnabled]: Toggle gate respects DYNAMO_CONFIG_PATH env var for test isolation
- [12-03 lazy require]: Memory commands use lazy require() inside switch cases to avoid loading ledger at startup
- [12-03 formatOutput]: stderr for human text, stdout for json/raw -- matches existing output() pattern
- [Phase 12]: [12-04 deregistration]: Used claude mcp remove CLI for Graphiti deregistration (preferred over manual JSON editing)
- [Phase 12]: [12-04 CLAUDE.md]: Preserved all non-memory sections, replaced only the Graphiti MCP block with Dynamo CLI instructions
- [Phase 13]: [13-01 archival]: Tagged v1.2-legacy-archive on dev before deletions for permanent historical reference
- [Phase 14]: Full rewrite of all 7 codebase maps rather than incremental patches -- old Python/Bash content was entirely stale
- [Phase 14]: All 20+ CLI commands included in CLAUDE.md grouped by category (Memory, Session, System, Diagnostics)
- [Phase 14]: 19 structured decision blocks in PROJECT.md (3 more than 16 minimum) covering v1.0 through v1.2.1
- [Phase 15]: Hand-rolled semver comparison (3-component numeric) to maintain zero-dependency constraint
- [Phase 15]: Separate 404 handling from network errors for specific No releases published yet message
- [Phase 15]: [15-02 compareVersions]: Duplicated in migrate.cjs intentionally -- each switchboard module is self-contained per codebase convention
- [Phase 15]: [15-02 migration filter]: Uses >= for source version and <= for target version to include boundary migrations
- [Phase 15]: Snapshot backup uses existing copyTree from install.cjs -- no new directory copy logic
- [Phase 15]: install.cjs rollback() checks dynamo-backup/ first for full-snapshot restore, falls back to legacy settings-only
- [Phase 15]: [15-04 check-update]: Human-readable status to stderr, --format json to stdout -- no output() call in non-JSON mode
- [Phase 15]: [15-04 inline status]: check-update exits cleanly without calling output() since status was already written to stderr
- [Phase 16]: [16-01 resolveSibling]: Dual-layout path resolution in dynamo.cjs -- checks repo path first, falls back to deployed path
- [Phase 16]: [16-01 permissions cleanup]: Removed entire permissions block from settings-hooks.json -- Graphiti MCP is deregistered, no permissions needed
- [Phase 17]: [17-01 resolveHandlers]: Same dual-layout pattern as resolveSibling -- repo path first, deployed fallback
- [Phase 17]: [17-01 defensive deregistration]: MCP deregistration is defensive -- OK status whether graphiti was registered or not
- [Phase 17]: [17-02 collectAllCjsFiles]: Root-level non-recursive + explicit production subdir recursion to avoid scanning test files
- [Phase 17]: [17-02 shebang branding]: Branding test allows shebang on line 1 with identity block on line 2 for CLI entry points

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-03-19T05:07:22Z
Stopped at: Completed 260318-x21 (Steel-man analysis and implementation planning)
Resume file: None
