---
phase: 05-sdk-platform-infrastructure
plan: 04
subsystem: sdk
tags: [mcp, cli, pulley, health, versioning, relay, forge, circuit]

# Dependency graph
requires:
  - phase: 05-01
    provides: Circuit module API (listModules, getModuleInfo)
  - phase: 05-02
    provides: Pulley CLI framework (registerCommand, registerMcpTool, getMcpTools)
  - phase: 05-03
    provides: Health aggregation (aggregateHealth, analyzeDependencyChain, formatDiagnostics), Versioning (getLatestRelease, isNewerAvailable)
provides:
  - Platform CLI command surface (status, health, version, install, update, config)
  - Pulley MCP server with 6 platform tools (dynamo_health, dynamo_diagnose, dynamo_status, dynamo_version, dynamo_module_list, dynamo_module_status)
  - MCP tool dispatch via @modelcontextprotocol/sdk Server
  - Module-registered tool merging from Pulley registry
affects: [05-05, modules, reverie]

# Tech tracking
tech-stack:
  added: []
  patterns: [mcp-tool-dispatch, triple-output-format, facade-health-iteration, registry-key-dependency-analysis]

key-files:
  created:
    - core/sdk/pulley/platform-commands.cjs
    - core/sdk/pulley/mcp-server.cjs
    - core/sdk/pulley/__tests__/platform-commands.test.js
    - core/sdk/pulley/__tests__/mcp-server.test.js
  modified: []

key-decisions:
  - "Registry-key-based dependency chain analysis: unhealthy service detection uses registry keys (services.switchboard) not health report names (switchboard) for accurate reverse-dependency tracing"
  - "MCP tool handlers return raw objects; MCP CallTool handler wraps in JSON text content"
  - "Platform MCP server separate from Wire channel-server per D-08"

patterns-established:
  - "Triple output format: all CLI handlers return { human, json, raw } for flexible output"
  - "MCP tool dispatch: registerTool + setRequestHandler pattern for CallTool/ListTools"
  - "Facade-based health iteration: collect facades from lifecycle by registry keys, aggregate via aggregateHealth"

requirements-completed: [SDK-03, INF-02, INF-04]

# Metrics
duration: 5min
completed: 2026-03-23
---

# Phase 5 Plan 4: MCP Server and Platform Commands Summary

**Pulley MCP server exposing 6 platform tools via @modelcontextprotocol/sdk with full CLI command surface for status, health, version, install, update, and config**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-23T18:11:26Z
- **Completed:** 2026-03-23T18:16:52Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- 6 platform CLI commands registered with Pulley: status, health, version, install, update, config
- 6 MCP tools registered on platform MCP server: dynamo_health, dynamo_diagnose, dynamo_status, dynamo_version, dynamo_module_list, dynamo_module_status
- Install/update commands orchestrate Relay and Forge with explicit path arguments and verified facade methods
- Module tools delegate to Circuit API (listModules, getModuleInfo) from Plan 01
- Module-registered tools from Pulley's MCP registry merged into MCP server tool listing

## Task Commits

Each task was committed atomically:

1. **Task 1: Platform CLI command handlers** - `e425c07` (feat)
2. **Task 2: Pulley MCP server for platform operations** - `3753ec9` (feat)

_Note: TDD tasks with RED+GREEN combined in single commits_

## Files Created/Modified
- `core/sdk/pulley/platform-commands.cjs` - 6 CLI command handlers (status, health, version, install, update, config) with triple output format
- `core/sdk/pulley/mcp-server.cjs` - MCP server factory with 6 platform tools, stdio transport, and module tool merging
- `core/sdk/pulley/__tests__/platform-commands.test.js` - 13 tests covering all command handlers and edge cases
- `core/sdk/pulley/__tests__/mcp-server.test.js` - 13 tests covering MCP server creation, tool registration, and tool dispatch

## Decisions Made
- Used registry keys (services.switchboard) rather than health report names (switchboard) for dependency chain analysis -- ensures accurate reverse-dependency tracing via analyzeDependencyChain
- MCP tool handlers return raw result objects; CallTool handler wraps results in JSON text content for MCP protocol compliance
- Platform MCP server kept separate from Wire's channel-server.cjs per D-08

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unhealthy service name resolution for dependency chain analysis**
- **Found during:** Task 1 (handleHealth)
- **Issue:** Health report service names (e.g. 'switchboard') do not match registry keys (e.g. 'services.switchboard'), causing analyzeDependencyChain to find no matches
- **Fix:** Changed unhealthy detection to iterate facades Map keys and re-check health status using registry keys instead of health report name field
- **Files modified:** core/sdk/pulley/platform-commands.cjs
- **Verification:** Test "includes dependency chain analysis when services are unhealthy" passes with impacted services found
- **Committed in:** e425c07 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Auto-fix was necessary for correct dependency chain analysis. No scope creep.

## Issues Encountered
- MCP SDK not installed in worktree -- resolved by running `bun install` (dependency was declared in package.json)

## Known Stubs
None -- all handlers are fully wired to their data sources.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 SDK plans (01-04) now complete; Plan 05 (integration and bootstrap wiring) can proceed
- Platform operational surface is complete: CLI commands + MCP tools
- Module API (Circuit), CLI framework (Pulley), health/versioning infrastructure, and now MCP server + platform commands all wired

## Self-Check: PASSED

All 4 source/test files verified present. Both task commits (e425c07, 3753ec9) verified in git log. 26 tests passing across 2 test files.

---
*Phase: 05-sdk-platform-infrastructure*
*Completed: 2026-03-23*
