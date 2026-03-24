---
phase: 05-sdk-platform-infrastructure
plan: 01
subsystem: sdk
tags: [circuit, module-api, event-proxy, manifest, facade, namespacing, ioc]

# Dependency graph
requires:
  - phase: 04-framework
    provides: container, lifecycle, facade generator, plugin manifest pattern, createContract
  - phase: 02-foundational-services
    provides: Switchboard event bus with on/off/emit/filter contract
  - phase: 01-core-library
    provides: Result types (ok/err), validate(), createContract()
provides:
  - Circuit module API factory (createCircuit) with facade-only service/provider access
  - Per-module event proxy with namespaced emissions and system event passthrough
  - Module manifest schema and validation (mirrors plugin manifest with hooks field)
  - Scoped dependency enforcement (modules only access declared dependencies)
  - Lib essentials re-export for module consumption
affects: [05-02-pulley, 05-04-config-bootstrap, 05-05-self-management, reverie-module]

# Tech tracking
tech-stack:
  added: []
  patterns: [event-proxy-namespacing, scoped-facade-access, manifest-based-registration, module-isolation]

key-files:
  created:
    - core/sdk/circuit/event-proxy.cjs
    - core/sdk/circuit/module-manifest.cjs
    - core/sdk/circuit/circuit.cjs
    - core/sdk/circuit/__tests__/event-proxy.test.js
    - core/sdk/circuit/__tests__/module-manifest.test.js
    - core/sdk/circuit/__tests__/circuit.test.js
  modified: []

key-decisions:
  - "Event proxy namespaces module emissions as moduleName:event while passing hook:* and state:* system events un-namespaced"
  - "Module manifest mirrors plugin manifest schema with added hooks field for module-specific hook wiring"
  - "Circuit enforces facade-only access -- modules never see container or raw implementations"
  - "Scoped getService/getProvider check module's declared dependencies before returning facade"
  - "Pulley delegation is optional -- returns NO_PULLEY error when Pulley not provided"

patterns-established:
  - "Event proxy namespacing: module emits 'x', Switchboard sees 'moduleName:x'; system events (hook:*, state:*) pass through un-namespaced"
  - "Scoped facade access: modules declare dependencies in manifest, Circuit enforces access restrictions at runtime"
  - "Module registration: manifest validation + dependency check + event proxy creation + registerFn callback with scoped API"

requirements-completed: [SDK-01]

# Metrics
duration: 3min
completed: 2026-03-23
---

# Phase 05 Plan 01: Circuit Module API Summary

**Circuit module API with facade-only access, namespaced event proxy, manifest-based registration, and scoped dependency enforcement**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-23T18:02:57Z
- **Completed:** 2026-03-23T18:06:29Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Event proxy namespaces module emissions while passing system events (hook:*, state:*) through un-namespaced, with tracked subscription cleanup
- Module manifest schema mirrors plugin manifest pattern with added hooks field for module-specific hook wiring
- Circuit factory creates module API with facade-only access, dependency verification against container, and lib essentials re-export
- 33 tests across 3 test files passing with 101 expect() calls

## Task Commits

Each task was committed atomically (TDD: RED then GREEN):

1. **Task 1: Event proxy and module manifest**
   - `5ab1f7c` (test: failing tests for event proxy and module manifest)
   - `672fe64` (feat: implement event proxy and module manifest)
2. **Task 2: Circuit module API factory**
   - `06d4a35` (test: failing tests for Circuit module API factory)
   - `0a1e6a4` (feat: implement Circuit module API factory)

## Files Created/Modified
- `core/sdk/circuit/event-proxy.cjs` - Per-module Switchboard proxy with namespace and cleanup
- `core/sdk/circuit/module-manifest.cjs` - Module manifest schema and validation
- `core/sdk/circuit/circuit.cjs` - Circuit module API factory with scoped access
- `core/sdk/circuit/__tests__/event-proxy.test.js` - 8 tests for event proxy behavior
- `core/sdk/circuit/__tests__/module-manifest.test.js` - 8 tests for manifest validation
- `core/sdk/circuit/__tests__/circuit.test.js` - 17 tests for Circuit API behavior

## Decisions Made
- Event proxy namespaces module emissions as `moduleName:event` while passing `hook:*` and `state:*` system events un-namespaced -- this ensures modules can listen to platform-wide events without prefix interference
- Module manifest mirrors plugin manifest schema (from core/armature/plugin.cjs) with added `hooks` field -- maintains consistent validation patterns across the platform
- Circuit enforces facade-only access via lifecycle.getFacade() -- modules never interact with the container directly
- Scoped getService/getProvider validate against the module's declared dependencies before returning facade -- undeclared access returns UNDECLARED_DEPENDENCY error
- Pulley delegation is optional via the options pattern -- returns NO_PULLEY error when Pulley SDK not yet available

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Circuit module API is complete and ready for Pulley SDK (Plan 02) to provide CLI and MCP tool registration
- Module isolation enforced: undeclared dependencies rejected, events namespaced, cleanup tracked
- 33 tests passing with full coverage of the Circuit contract surface

## Self-Check: PASSED

- All 6 source/test files exist
- All 4 task commits verified (5ab1f7c, 672fe64, 06d4a35, 0a1e6a4)
- 33 tests passing across 3 files

---
*Phase: 05-sdk-platform-infrastructure*
*Completed: 2026-03-23*
