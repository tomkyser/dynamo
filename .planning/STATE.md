---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
stopped_at: Completed 260319-fzc-05 (Roadmap refactor + GSD updates)
last_updated: "2026-03-19T17:22:00Z"
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
**Current focus:** v1.3 architecture specification complete (6 subsystem specs + PRD + abstract IV doc + roadmap refactored to 1.3-M1 through 1.3-M7). Next: implementation planning for 1.3-M1

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
| 260319-17p | Re-evaluate subagent verdict and cascade corrections | 2026-03-19 | 06a60a2 | Verified | [260319-17p](./quick/260319-17p-re-evaluate-subagent-verdict-and-cascade/) |
| 260319-fzc | Architecture spec docs, PRD, and roadmap refactor (5 plans, 4 waves) | 2026-03-19 | a3c9a1e | Verified | [260319-fzc](./quick/260319-fzc-housekeeping-clarification-and-inner-voi/) |

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
- [260319-17p]: Concept 7 verdict corrected from NO-GO to CONDITIONAL GO -- hybrid architecture (CJS hooks for hot path + custom subagent for deliberation)
- [260319-17p]: Dual cost model: subscription users $0.37/day, API users $1.98/day for v1.3 Inner Voice
- [260319-17p]: State file bridge pattern for SubagentStop-to-parent context gap
- [260319-fzc-01]: Platform-agnostic Inner Voice concept separated from platform-specific spec (INNER-VOICE-ABSTRACT.md)
- [260319-fzc-01]: Six-subsystem architecture defined (Dynamo, Switchboard, Ledger, Assay, Terminus, Reverie)
- [260319-fzc-01]: cc/ adapter pattern for Claude Code platform isolation
- [260319-fzc-01]: v1.3 milestoned delivery (1.3-M1 through 1.3-M7), no planning beyond 1.3
- [260319-fzc-02]: Terminus is stateless transport -- provides the pipe, does not decide what flows through
- [260319-fzc-02]: Switchboard dispatches but does not handle -- handlers belong to owning subsystems
- [260319-fzc-02]: Static hook handler routing (hardcoded table, not dynamic registration)
- [260319-fzc-02]: graphiti/ stays top-level, referenced by Terminus through config
- [260319-fzc-02]: cc/ directory owned by Switchboard for deployment; content authored by Reverie
- [260319-fzc-03]: Ledger narrows to write-only -- zero LLM calls, all intelligence moves to Reverie
- [260319-fzc-03]: Assay owns session index writes (local file I/O) for domain cohesion
- [260319-fzc-03]: extractContent moves to shared lib/transport-utils.cjs to prevent cross-subsystem imports
- [260319-fzc-03]: curation.cjs splits: LLM functions to Reverie, deterministic formatting to Ledger
- [260319-fzc-04]: Reverie reads through Assay and writes through Ledger -- never directly through Terminus for standard operations
- [260319-fzc-04]: Hot path targets <500ms with zero LLM calls when cached data available
- [260319-fzc-04]: Deliberation uses custom subagent (subscription) or direct API (API plan)
- [260319-fzc-04]: State bridge pattern (file-based) for SubagentStop-to-parent context gap
- [260319-fzc-04]: PostToolUse dispatched to BOTH Ledger (capture) and Reverie (activation update)
- [260319-fzc-04]: Feature flag (reverie.mode) enables instant rollback to classic Haiku curation
- [260319-fzc-04]: Subscription users pay $0.37/day (cheaper than current baseline)
- [260319-fzc-05]: MASTER-ROADMAP.md refactored to 1.3-M1 through 1.3-M7 milestoned delivery -- no v1.4/v1.5/v2.0 sections
- [260319-fzc-05]: All ~40 active requirements assigned to 1.3-M* milestones or deferred (only UI-07 deferred)
- [260319-fzc-05]: PROJECT.md updated to reflect six-subsystem architecture and v1.3 milestoned delivery model

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-03-19T18:30:00Z
Stopped at: Completed 260319-fzc (Architecture spec docs, PRD, roadmap refactor — verified)
Resume file: None
