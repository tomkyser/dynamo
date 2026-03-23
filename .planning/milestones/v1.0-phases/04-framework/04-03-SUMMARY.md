---
phase: 04-framework
plan: 03
subsystem: framework
tags: [plugin, lifecycle, boot-order, topological-sort, manifest-validation, facade-wrapping, armature]

# Dependency graph
requires:
  - phase: 01-core-library
    provides: Result types (ok/err), schema validator (validate)
  - phase: 04-framework-01
    provides: IoC container (createContainer, getBootOrder, getRegistry, resolve, has)
  - phase: 04-framework-02
    provides: Facade generator (createFacade), hook wiring registry (createHookRegistry, wireToSwitchboard)
provides:
  - Plugin system with manifest validation, dependency checking, discovery, and loading
  - Two-phase lifecycle orchestrator with topological boot and reverse shutdown
  - Facade-wrapped service access via getFacade after boot
affects: [04-framework, sdk, modules, plugins]

# Tech tracking
tech-stack:
  added: []
  patterns: [plugin manifest schema validation, plugin dependency checking against container, lifecycle register/boot/shutdown orchestration, topological boot with facade wrapping, plugin failure isolation, sync/async init normalization]

key-files:
  created:
    - core/armature/plugin.cjs
    - core/armature/__tests__/plugin.test.js
    - core/armature/lifecycle.cjs
    - core/armature/__tests__/lifecycle.test.js
  modified: []

key-decisions:
  - "Plugin manifest validated via lib/schema.cjs validate() -- reuses existing validation infrastructure"
  - "Dependency checking prefixes services./providers. to match container naming convention"
  - "Plugin boot failures isolated by checking name.startsWith('plugins.') -- core services abort on failure"
  - "Lifecycle normalizes sync/async init via Promise.resolve() -- both patterns supported transparently"
  - "Boot options built from mapDeps (resolved to facades) merged with config values -- options-based DI preserved"
  - "discoverPlugins returns empty array for nonexistent directory -- graceful degradation, no error"

patterns-established:
  - "Plugin manifest pattern: plugin.json with name/version/main required, enabled/dependencies optional"
  - "Plugin lifecycle: discover -> validate manifest -> check enabled -> check deps -> require entry -> call register(container)"
  - "Lifecycle orchestration: register(callback) -> boot(topological) -> shutdown(reverse) with status tracking"
  - "Facade wrapping at boot: each service wrapped in createFacade after init+start, stored in _facades Map"
  - "Plugin isolation: plugin failures logged and skipped, core service failures propagated as Err"

requirements-completed: [FWK-03, FWK-04]

# Metrics
duration: 3min
completed: 2026-03-23
---

# Phase 04 Plan 03: Plugin System and Lifecycle Orchestrator Summary

**Plugin manifest loading with schema validation and dependency checking, plus two-phase lifecycle orchestrator with topological boot order, facade wrapping, and plugin failure isolation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-23T16:30:20Z
- **Completed:** 2026-03-23T16:34:12Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Plugin system handles full lifecycle: discovery, manifest validation, dependency checking, loading, and registration
- Lifecycle orchestrator boots services in topological dependency order with resolved deps as facades
- Plugin boot failures isolated from core services -- core continues running
- Shutdown reverses boot order for clean teardown
- All 115 armature tests pass (container + facade + hooks + plugin + lifecycle)

## Task Commits

Each task was committed atomically (TDD: test then feat):

1. **Task 1: Plugin System (FWK-04)** - RED: `bd73a70` (test), GREEN: `9991707` (feat)
2. **Task 2: Two-Phase Lifecycle Orchestrator (FWK-03)** - RED: `0d72126` (test), GREEN: `c9b2e98` (feat)

_TDD tasks each have 2 commits (test then feat). No refactor needed._

## Files Created/Modified
- `core/armature/plugin.cjs` - Plugin manifest schema, validation, dependency checking, discovery, and loading (183 LOC)
- `core/armature/__tests__/plugin.test.js` - 21 tests covering manifest validation, dependency checking, load/discover (320 LOC)
- `core/armature/lifecycle.cjs` - Two-phase lifecycle orchestrator with register/boot/shutdown/getFacade/getStatus (266 LOC)
- `core/armature/__tests__/lifecycle.test.js` - 17 tests covering boot order, dep injection, plugin isolation, shutdown, status (369 LOC)

## Decisions Made
- Plugin manifest validated through lib/schema.cjs validate() -- reuses existing infrastructure rather than creating new validation
- Dependency checking prefixes names with services./providers. to match container's dotted naming convention
- Plugin boot failures identified by name.startsWith('plugins.') prefix -- simple convention-based isolation
- Lifecycle normalizes sync and async init via Promise.resolve() wrapping -- handles both patterns transparently
- Boot options assembled from mapDeps (resolved to facades when available) merged with static config values
- discoverPlugins returns empty array for nonexistent directories rather than erroring -- graceful degradation for fresh installs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plugin system ready for SDK (Circuit) to expose plugin API to module developers
- Lifecycle orchestrator ready for core.cjs bootstrap (04-04) to compose the full platform boot sequence
- All armature components complete: container, facade, hooks, plugin, lifecycle
- 115 tests across 5 test files provide comprehensive coverage of the framework layer

## Self-Check: PASSED

All files exist. All 4 commits verified in git history.
