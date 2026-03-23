---
phase: 02-foundational-services
plan: 04
subsystem: services
tags: [commutator, io-bridge, hook-routing, switchboard, events, semantic-routing]

# Dependency graph
requires:
  - phase: 01-core-library
    provides: Result types (ok/err), createContract, barrel export (lib/index.cjs)
  - phase: 02-foundational-services-plan-02
    provides: Switchboard event bus (createSwitchboard, emit, on, filter)
provides:
  - createCommutator factory with semantic hook-to-event routing
  - TOOL_DOMAIN_MAP constant mapping Claude Code tools to semantic domains
  - HOOK_EVENT_MAP constant mapping lifecycle hooks to domain events
  - Outbound adapter pattern via registerOutput for bidirectional I/O
affects: [framework, armature, modules, reverie, wire]

# Tech tracking
tech-stack:
  added: []
  patterns: [tool-aware-semantic-routing, outbound-adapter-pattern, override-map-for-domain-action-combos]

key-files:
  created:
    - core/services/commutator/commutator.cjs
    - core/services/commutator/__tests__/commutator.test.js
  modified: []

key-decisions:
  - "Tool action override map separates generic actions (changed/pending) from domain-specific ones (shell:executed, web:fetched, agent:completed)"
  - "Outbound adapters subscribe to Switchboard events via registerOutput, decoupled from stdout transport -- enables future Wire integration"
  - "hook:raw event emitted alongside domain event for listeners wanting unprocessed hook data"

patterns-established:
  - "Semantic routing via TOOL_DOMAIN_MAP + TOOL_ACTION_MAP + TOOL_ACTION_OVERRIDE triple lookup"
  - "Outbound adapter registration with cleanup tracking via _outputRemovers array"
  - "Mock switchboard pattern for testing services that depend on Switchboard"

requirements-completed: [SVC-02]

# Metrics
duration: 2min
completed: 2026-03-23
---

# Phase 02 Plan 04: Commutator I/O Bridge Summary

**Commutator I/O bridge with tool-aware semantic routing mapping Claude Code hooks to Switchboard domain events and outbound adapter registration for bidirectional I/O**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-23T01:30:28Z
- **Completed:** 2026-03-23T01:32:42Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Commutator routes all Claude Code hook types to domain-specific Switchboard events via semantic routing
- Tool-aware mapping: Write/Edit/Read/Glob/Grep -> file:changed, Bash -> shell:executed, WebFetch/WebSearch -> web:fetched, Agent -> agent:completed
- Hook lifecycle mapping: SessionStart -> hook:session-start, Stop -> hook:stop, UserPromptSubmit -> hook:prompt-submit, PreCompact -> hook:pre-compact
- Outbound adapter pattern via registerOutput enables injecting context back into Claude Code sessions
- Fallback routing for unknown hooks and tools to generic event names
- 20 tests covering semantic routing, outbound adapters, fallback routing, and lifecycle

## Task Commits

Each task was committed atomically:

1. **Task 1: Commutator test suite (RED phase)** - `1b40595` (test)
2. **Task 2: Commutator service implementation (GREEN phase)** - `70c1519` (feat)

_TDD: RED committed failing tests, GREEN committed passing implementation_

## Files Created/Modified
- `core/services/commutator/commutator.cjs` - I/O bridge service factory with semantic routing, outbound adapters, and self-validated contract
- `core/services/commutator/__tests__/commutator.test.js` - 20 test cases with mock switchboard, realistic hook payloads, full coverage

## Decisions Made
- Tool action override map (TOOL_ACTION_OVERRIDE) separates generic actions from domain-specific ones -- shell:executed not shell:changed, web:fetched not web:changed
- Outbound adapters subscribe to Switchboard events via registerOutput, decoupled from stdout transport -- enables future Wire integration in Phase 6
- hook:raw event emitted alongside every domain event for listeners wanting unprocessed hook data
- Exported TOOL_DOMAIN_MAP and HOOK_EVENT_MAP for other services to reference the event vocabulary

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Commutator ready for integration with Magnet (state management) and future services
- Switchboard + Commutator together provide the full event dispatch pipeline: hooks -> semantic events -> subscribers
- Outbound adapter pattern ready for Wire transport when it ships in Phase 6

## Self-Check: PASSED

- [x] core/services/commutator/commutator.cjs exists
- [x] core/services/commutator/__tests__/commutator.test.js exists
- [x] .planning/phases/02-foundational-services/02-04-SUMMARY.md exists
- [x] Commit 1b40595 found
- [x] Commit 70c1519 found
- [x] All 150 tests pass (full suite, zero regressions)

---
*Phase: 02-foundational-services*
*Completed: 2026-03-23*
