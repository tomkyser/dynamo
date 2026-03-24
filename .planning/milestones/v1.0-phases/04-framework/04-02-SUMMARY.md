---
phase: 04-framework
plan: 02
subsystem: framework
tags: [facade, hooks, hook-wiring, plugin-extension, armature, delegation]

# Dependency graph
requires:
  - phase: 01-core-library
    provides: Result types (ok/err), contract factory
  - phase: 04-framework-01
    provides: IoC container (createContainer)
provides:
  - Facade generator with delegation, before/after/around hook points, override, and domain metadata
  - Hook schemas for all 8 Claude Code hook types
  - Hook wiring registry with config-driven Switchboard integration
affects: [04-framework, sdk, modules, plugins]

# Tech tracking
tech-stack:
  added: []
  patterns: [facade delegation pattern, method proxy with hook chain, around-hook wrapping, config-driven hook wiring]

key-files:
  created:
    - core/armature/facade.cjs
    - core/armature/__tests__/facade.test.js
    - core/armature/hooks.cjs
    - core/armature/__tests__/hooks.test.js
  modified: []

key-decisions:
  - "Facade creates NEW object delegating to frozen contract -- never modifies the contract"
  - "Around hooks use recursive next() chain pattern -- outermost wraps innermost wraps core"
  - "Hook schemas are documentation/reference, not runtime validators -- Commutator handles payloads"
  - "loadFromConfig registers placeholder handlers -- lifecycle manager replaces with real handlers at boot"
  - "HOOK_EVENT_NAMES includes PreToolUse/PostToolUse for completeness even though Commutator resolves dynamically"

patterns-established:
  - "Facade factory pattern: createFacade(name, contract, metadata) returns frozen object with delegation + hook + override"
  - "Method proxy pattern: createMethodProxy captures method name in closure for hook dispatch"
  - "Hook chain: around wraps (before -> impl -> after) with recursive next(args)"
  - "Wiring registry pattern: register -> wireToSwitchboard connects config declarations to runtime handlers"

requirements-completed: [FWK-02, FWK-05]

# Metrics
duration: 3min
completed: 2026-03-23
---

# Phase 04 Plan 02: Facade and Hook Wiring Summary

**Facade generator with before/after/around hook points and config-driven hook wiring registry for all 8 Claude Code hook types**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-23T16:23:51Z
- **Completed:** 2026-03-23T16:27:17Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Facade generator wraps frozen contracts with delegation, never modifying the original
- Before/after/around hook points enable plugin extension at method level
- Override swaps implementation behind a facade method transparently
- Canonical schemas for all 8 Claude Code hook types (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, PreCompact, SubagentStart, SubagentStop)
- Config-driven wiring registry reads hooks.listeners and connects to Switchboard events

## Task Commits

Each task was committed atomically (TDD: test then feat):

1. **Task 1: Facade Generator (FWK-02)** - RED: `2f75731` (test), GREEN: `8881cc7` (feat)
2. **Task 2: Hook Definitions and Wiring Registry (FWK-05)** - RED: `a2f9cb6` (test), GREEN: `3ccbd62` (feat)

_TDD tasks each have 2 commits (test then feat). No refactor needed._

## Files Created/Modified
- `core/armature/facade.cjs` - Facade generator with createFacade(), delegation, hook points, override, metadata (185 LOC)
- `core/armature/__tests__/facade.test.js` - 27 tests covering delegation, metadata, before/after/around hooks, override, freezing (357 LOC)
- `core/armature/hooks.cjs` - Hook schemas, event name mappings, and createHookRegistry() (234 LOC)
- `core/armature/__tests__/hooks.test.js` - 28 tests covering schemas, event names, register, getListeners, wireToSwitchboard, loadFromConfig (268 LOC)

## Decisions Made
- Facade creates a NEW object that delegates to the frozen contract -- it never modifies the contract itself
- Around hooks use a recursive next() chain pattern where outermost wraps innermost wraps core execution
- Hook schemas serve as documentation/reference for plugin developers -- Commutator handles runtime payload processing
- loadFromConfig registers placeholder handlers that lifecycle manager replaces with real service handlers during boot
- HOOK_EVENT_NAMES includes PreToolUse/PostToolUse event names for completeness, even though Commutator resolves these dynamically to domain-specific events

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Facades ready for lifecycle manager (04-03) to wrap resolved services post-boot
- Hook wiring registry ready for lifecycle manager to connect at boot time
- Plugin API (04-03) can use facade.hook() and facade.override() extension points
- All 77 armature tests pass (container + facade + hooks)

## Self-Check: PASSED

All files exist. All 4 commits verified in git history.
