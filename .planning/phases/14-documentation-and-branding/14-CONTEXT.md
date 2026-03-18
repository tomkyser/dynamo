# Phase 14: Documentation and Branding - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Fully document Dynamo for both users and future Claude sessions. Rewrite the README to reflect the current CJS architecture, update CLAUDE.md for complete self-management, expand PROJECT.md with detailed architecture decisions, and refresh stale codebase maps. The GitHub repo rename to `dynamo` is already complete.

</domain>

<decisions>
## Implementation Decisions

### README scope and structure
- Comprehensive single-file README — all documentation lives in README.md (no separate docs/ directory)
- Rationale: single file is better for Claude attention during active development sessions
- Tone: developer-to-developer, technical, direct, no hand-holding — assumes reader is a power user or Claude session
- Heavy on code examples and diagrams, concise prose
- Architecture diagram: Mermaid format (GitHub renders natively, cleaner visual)
- Sections: What It Does, Architecture (Mermaid), Installation, CLI Commands, Hook System, Configuration, Scoping, Troubleshooting, Development Guide, Design Decisions
- Design Decisions section in README is a summary table — full detail lives in PROJECT.md

### Documentation topics (STAB-03)
- Cover all five required topics: architecture, CLI commands, hook behavior, configuration, and dev guide
- Claude decides depth for each based on codebase analysis and what future Claude sessions need
- No separate docs/ directory — README is the sole documentation artifact
- claude-config/ templates (CLAUDE.md.template, settings-hooks.json) stay as separate files — README documents what they do and how the installer uses them

### Codebase maps update
- Update all .planning/codebase/ maps (ARCHITECTURE.md, CONVENTIONS.md, STRUCTURE.md, STACK.md, INTEGRATIONS.md, CONCERNS.md, TESTING.md) to reflect the current 3-directory CJS architecture
- These are pre-v1.2 and describe the old Python/Bash system — they need full refresh
- Important for future /gsd:plan-phase and /gsd:execute-phase calls to have accurate context

### Architecture decision capture (STAB-06)
- Expand PROJECT.md's Key Decisions table — add detailed decision blocks for all 16 decisions
- Format per decision: Context, Alternatives considered, Constraints, Downstream implications
- README summarizes decisions (table only), PROJECT.md has the full expanded detail
- Avoids drift between two copies of the same content

### CLAUDE.md completeness (STAB-04)
- Add troubleshooting section — common issues and fixes so Claude can diagnose without user help
- Add update/maintenance instructions — how to update, check version, handle config changes (prep for Phase 15)
- Add component scope awareness — teach Claude the Dynamo/Ledger/Switchboard boundaries
- Claude audits the template against STAB-04's requirement and fills any additional gaps found
- Fix all stale paths — replace legacy `~/.claude/graphiti/` references with current `~/.claude/dynamo/` paths
- Consolidate commands — replace shell script references with Dynamo CLI equivalents where possible (e.g., `dynamo start` instead of `~/.claude/graphiti/start-graphiti.sh`)
- Verify installer handles expanded content — check install.cjs merge logic and fix if needed

### GitHub repo rename (STAB-01 partial)
- ALREADY COMPLETE — repo renamed to `dynamo` at https://github.com/tomkyser/dynamo/
- Local remote already points to `tomkyser/dynamo.git`
- This phase updates docs to reflect the rename (remove "my-cc-setup" references)
- Update PROJECT.md key decisions table to mark rename as "Done" (currently shows "Pending")

### Claude's Discretion
- Exact depth of each README section based on what's most useful for the audience
- How to structure the Mermaid architecture diagram (component relationships, level of detail)
- Which codebase map files need full rewrites vs. incremental updates
- Internal organization of expanded decision detail blocks in PROJECT.md
- What additional CLAUDE.md gaps the audit reveals beyond the three specified areas
- How to handle any remaining stale references to the old system found during documentation

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` -- STAB-01 (README and rebranding), STAB-03 (exhaustive docs), STAB-04 (CLAUDE.md integration), STAB-06 (architecture decision capture)

### Current documentation (to be rewritten)
- `README.md` -- Current legacy README with deprecation notice; entire content needs replacement
- `claude-config/CLAUDE.md.template` -- Current CLAUDE.md template; needs expansion and path fixes
- `claude-config/settings-hooks.json` -- Hook definitions template; document in README

### Architecture and decisions
- `.planning/PROJECT.md` -- Key Decisions table to expand with detail blocks; Context section to update
- `MASTER-ROADMAP.md` -- Milestone and requirement context for decision capture

### Stale codebase maps (to be updated)
- `.planning/codebase/ARCHITECTURE.md` -- Pre-v1.2, describes Python/Bash architecture
- `.planning/codebase/CONVENTIONS.md` -- Pre-v1.2, describes Python/Bash conventions
- `.planning/codebase/STRUCTURE.md` -- Pre-v1.2, describes old directory layout
- `.planning/codebase/STACK.md` -- Pre-v1.2 stack description
- `.planning/codebase/INTEGRATIONS.md` -- Pre-v1.2 integration points
- `.planning/codebase/CONCERNS.md` -- Pre-v1.2 concerns
- `.planning/codebase/TESTING.md` -- Pre-v1.2 testing patterns

### Prior phase context
- `.planning/phases/08-foundation-and-branding/08-CONTEXT.md` -- Branding decisions (Dynamo/Ledger/Switchboard)
- `.planning/phases/10-operations-and-cutover/10-CONTEXT.md` -- CLI router, installer, sync decisions
- `.planning/phases/12-structural-refactor/12-CONTEXT.md` -- 3-directory structure, toggle, CLI-wrapped MCP
- `.planning/phases/13-cleanup-and-fixes/13-CONTEXT.md` -- Legacy removal, Neo4j fix

### Current codebase (source of truth for documentation)
- `dynamo/dynamo.cjs` -- CLI entry point and command router
- `dynamo/core.cjs` -- Shared substrate (config, output, toggle)
- `dynamo/hooks/dynamo-hooks.cjs` -- Hook dispatcher
- `dynamo/config.json` -- Runtime configuration
- `dynamo/VERSION` -- Current version (0.1.0)
- `ledger/` -- Memory subsystem (mcp-client, search, episodes, curation, sessions, hooks)
- `switchboard/` -- Operations subsystem (install, sync, health-check, diagnose, stack, verify-memory)
- `ledger/graphiti/` -- Docker infrastructure (docker-compose.yml, start/stop scripts)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `dynamo/dynamo.cjs`: CLI router with all commands — source of truth for CLI reference docs
- `dynamo/core.cjs`: loadConfig, isEnabled, output() — documents config structure and toggle behavior
- `switchboard/install.cjs`: Installer logic — documents installation flow and CLAUDE.md template deployment
- `switchboard/sync.cjs`: Sync pairs — documents repo-to-deployed mapping for dev guide
- `switchboard/stages.cjs`: Shared diagnostic stages — documents health check and diagnostic flows
- `claude-config/CLAUDE.md.template`: Current template content to expand

### Established Patterns
- GSD router pattern (switch/case on argv[2]) — consistent CLI command structure to document
- `core.cjs output()` with `--format` switching — document the three output modes
- Toggle gate (`isEnabled()` + `DYNAMO_DEV` env var) — document for troubleshooting and dev guide
- Hook stdin/JSON/exit pattern — document for hook behavior section
- Sync SYNC_PAIRS array — maps repo paths to deployed paths; critical for dev guide

### Integration Points
- `~/.claude/CLAUDE.md` — deployed from `claude-config/CLAUDE.md.template` via install.cjs
- `~/.claude/settings.json` — hook registrations deployed from `claude-config/settings-hooks.json`
- `~/.claude/dynamo/` — deployed codebase (source of truth for runtime behavior)
- GitHub repo at `https://github.com/tomkyser/dynamo/` — already renamed

</code_context>

<specifics>
## Specific Ideas

- The README should serve double duty: onboard humans AND give future Claude sessions full system context when they read it during development
- Mermaid diagrams for architecture — GitHub renders them natively, cleaner than ASCII art
- Decision detail format in PROJECT.md: Context, Alternatives, Constraints, Implications — structured enough for Claude to understand rationale, not just the choice
- CLAUDE.md consolidation: replace raw shell script paths with `dynamo` CLI equivalents so Claude always goes through the toggle-aware interface

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-documentation-and-branding*
*Context gathered: 2026-03-18*
