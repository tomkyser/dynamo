---
phase: 04-framework
plan: 01
subsystem: framework
tags: [ioc, container, dependency-injection, schema-validation, enum, armature]

# Dependency graph
requires:
  - phase: 01-core-library
    provides: Result types (ok/err), contract factory, schema validator
provides:
  - IoC container with bind/singleton/factory/resolve/resolveTagged/has/getMetadata/getBootOrder
  - Schema enum validation with ENUM_INVALID error code
affects: [04-framework, sdk, modules]

# Tech tracking
tech-stack:
  added: []
  patterns: [IoC container pattern, Kahn's algorithm topological sort, lazy singleton instantiation, mapDeps option injection]

key-files:
  created:
    - core/armature/container.cjs
    - core/armature/__tests__/container.test.js
  modified:
    - lib/schema.cjs
    - lib/__tests__/schema.test.js

key-decisions:
  - "Container is infrastructure (not a service) -- uses createContainer() factory, not createContract()"
  - "Container creates instances but does NOT call init() -- lifecycle manager handles initialization"
  - "Kahn's algorithm for topological sort -- O(V+E) boot order computation with cycle detection"
  - "mapDeps maps container keys to factory option keys during resolution -- enables options-based DI"
  - "Enum validation runs after type check, before assignment -- TYPE_MISMATCH takes precedence over ENUM_INVALID"

patterns-established:
  - "Container factory pattern: createContainer() returns object with bind/resolve/has/getMetadata/getBootOrder methods"
  - "Alias resolution: _aliases Map enables domain-path imports (e.g., 'providers.data.sql' -> 'ledger')"
  - "Tagged resolution: resolveTagged() returns all bindings matching a tag for grouped operations"
  - "Deferred singleton: instance not created until first resolve() call (lazy instantiation)"

requirements-completed: [FWK-01, FWK-06]

# Metrics
duration: 4min
completed: 2026-03-23
---

# Phase 04 Plan 01: Container and Schema Enum Summary

**IoC container with singleton/factory lifetimes, alias and tagged resolution, Kahn's topological boot order, and schema enum validation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-23T16:16:56Z
- **Completed:** 2026-03-23T16:20:35Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- IoC container with full lifecycle semantics: bind, singleton, factory, resolve, resolveTagged, has, getMetadata, getBootOrder, getRegistry
- Singleton caching with lazy/deferred instantiation -- factory not called until first resolve()
- Topological boot ordering via Kahn's algorithm with circular dependency detection
- Schema validator enhanced with enum field validation and ENUM_INVALID error code

## Task Commits

Each task was committed atomically (TDD: test then feat):

1. **Task 1: IoC Container (FWK-01)** - RED: `2dadf62` (test), GREEN: `2b3acff` (feat)
2. **Task 2: Schema Enum Enhancement (FWK-06)** - RED: `b6abf3e` (test), GREEN: `bfec046` (feat)

_TDD tasks each have 2 commits (test then feat). No refactor needed._

## Files Created/Modified
- `core/armature/container.cjs` - IoC container with bind/singleton/factory/resolve/resolveTagged/has/getMetadata/getBootOrder/getRegistry (320 LOC)
- `core/armature/__tests__/container.test.js` - 22 tests covering all container behaviors (241 LOC)
- `lib/schema.cjs` - Enhanced with enum validation after type check (14 lines added)
- `lib/__tests__/schema.test.js` - 5 new enum tests added to existing 16 tests (63 lines added)

## Decisions Made
- Container is infrastructure, not a service -- uses createContainer() factory pattern, not createContract()
- Container creates instances but does NOT call init() -- lifecycle manager handles initialization separately
- Kahn's algorithm chosen for topological sort -- O(V+E), detects cycles by checking if all nodes were visited
- mapDeps option enables container-key-to-options-key mapping during resolution for options-based DI compatibility
- Enum validation positioned after type check and nested object validation -- TYPE_MISMATCH takes precedence

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Container ready for lifecycle manager (04-02) to compose boot sequences
- Schema enum support ready for config validation with constrained value sets
- Core armature directory established at core/armature/ for remaining framework modules

## Self-Check: PASSED

All files exist. All 4 commits verified in git history.
