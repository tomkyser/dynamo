---
phase: 05-sdk-platform-infrastructure
plan: 02
subsystem: sdk
tags: [cli, command-routing, output-formatting, help-generation, mcp-tools, parseArgs]

requires:
  - phase: 01-core-library
    provides: Result types (ok/err), createContract factory, validate
  - phase: 04-framework
    provides: Armature contract pattern, lifecycle management

provides:
  - Pulley CLI framework with extensible command registration
  - Three-mode output formatter (human/JSON/raw)
  - Auto-generated help text from command metadata
  - Longest-match subcommand routing (e.g., 'reverie status')
  - MCP tool registry for programmatic access
  - CLI entry point for process.argv delegation

affects: [05-sdk-platform-infrastructure, modules, reverie]

tech-stack:
  added: [node:util.parseArgs]
  patterns: [factory-with-registry, longest-match-routing, three-mode-output]

key-files:
  created:
    - core/sdk/pulley/output.cjs
    - core/sdk/pulley/help.cjs
    - core/sdk/pulley/pulley.cjs
    - core/sdk/pulley/cli.cjs
    - core/sdk/pulley/__tests__/output.test.js
    - core/sdk/pulley/__tests__/pulley.test.js
    - core/sdk/pulley/__tests__/cli.test.js
  modified: []

key-decisions:
  - "node:util.parseArgs for CLI flag parsing -- zero-dependency, built-in to Bun/Node"
  - "Longest-match routing for subcommands -- positionals.slice(0,i).join(' ') checks from longest to shortest"
  - "Three output modes (human/json/raw) with graceful fallbacks when fields missing"
  - "MCP tool registry separate from CLI command registry -- dual API surface pattern from Wire"

patterns-established:
  - "Factory-with-registry: createPulley() returns contract with registerCommand/registerMcpTool APIs"
  - "Longest-match routing: subcommands checked from longest to shortest positional match"
  - "Three-mode output: handler returns {human, json, raw}, formatOutput selects by mode with fallbacks"

requirements-completed: [SDK-02]

duration: 3min
completed: 2026-03-23
---

# Phase 5 Plan 02: Pulley CLI Framework Summary

**Extensible CLI framework with command registration, longest-match subcommand routing, three-mode output formatting, and MCP tool registry using node:util.parseArgs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-23T18:03:18Z
- **Completed:** 2026-03-23T18:07:17Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Output formatter handles human/JSON/raw modes with graceful fallbacks for missing fields
- Help generator produces sorted command listings and per-command help with flag descriptions
- Pulley command registry with longest-match subcommand routing (e.g., 'reverie status' matched before 'reverie')
- MCP tool registry for programmatic access alongside CLI commands
- CLI entry point parses process.argv and delegates to Pulley router with stdout/stderr output
- 34 tests passing with full coverage of all edge cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Output formatter and help generator** - `618b473` (test: RED), `d9a15e8` (feat: GREEN)
2. **Task 2: Pulley command registry and CLI entry point** - `77a5a20` (test: RED), `2fa6bc8` (feat: GREEN)

_Note: TDD tasks have separate test and implementation commits_

## Files Created/Modified
- `core/sdk/pulley/output.cjs` - Three-mode output formatter (human/JSON/raw) with graceful fallbacks
- `core/sdk/pulley/help.cjs` - Help text generator from command metadata (sorted, padded, with flags)
- `core/sdk/pulley/pulley.cjs` - CLI framework factory with command registry, longest-match routing, MCP tool registry
- `core/sdk/pulley/cli.cjs` - CLI entry point parsing process.argv and delegating to Pulley router
- `core/sdk/pulley/__tests__/output.test.js` - 14 tests for output formatter and help generator
- `core/sdk/pulley/__tests__/pulley.test.js` - 15 tests for Pulley command registry and routing
- `core/sdk/pulley/__tests__/cli.test.js` - 5 tests for CLI entry point

## Decisions Made
- Used `node:util.parseArgs` for CLI flag parsing -- zero-dependency, built-in to both Bun and Node, validated v0 pattern
- Longest-match routing for subcommands: iterates `positionals.slice(0, i).join(' ')` from longest to shortest to resolve 'reverie status' before 'reverie'
- Three output modes with graceful fallbacks: if handler omits `human` field, falls back to `JSON.stringify`; if handler omits `raw`, falls back to `JSON.stringify` without pretty-printing
- MCP tool registry kept separate from CLI command registry, following the dual API surface pattern established in Wire (D-13)
- `createContract` used for Pulley factory return, consistent with all other services/providers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed process.exitCode leak in CLI error test**
- **Found during:** Task 2 (CLI entry point tests)
- **Issue:** The CLI `main()` function sets `process.exitCode = 1` on error, which leaked to the bun test runner exit code causing false test failures
- **Fix:** Added `process.exitCode = 0` reset in the error test case after assertions
- **Files modified:** core/sdk/pulley/__tests__/cli.test.js
- **Verification:** `bun test core/sdk/pulley/__tests__/cli.test.js` exits 0
- **Committed in:** 2fa6bc8 (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Test-only fix for correct test runner behavior. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviation above.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all four source files are fully implemented with no placeholder values or TODO markers.

## Next Phase Readiness
- Pulley CLI framework ready for platform commands (status, health, version) and module subcommands
- MCP tool registry ready for programmatic tool exposure via Conductor
- Output formatter ready for any handler that returns `{ human, json, raw }` objects
- Help generation ready to grow as commands are registered by modules

## Self-Check: PASSED

- All 7 files exist on disk
- All 4 commit hashes found in git log
- 34/34 tests passing

---
*Phase: 05-sdk-platform-infrastructure*
*Completed: 2026-03-23*
