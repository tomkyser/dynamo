---
phase: 10-three-session-architecture
plan: 01
subsystem: session
tags: [bun-spawn, session-topology, conductor, wire, three-session, claude-code-channels]

# Dependency graph
requires:
  - phase: 03.1-wire
    provides: Wire protocol (MESSAGE_TYPES, URGENCY_LEVELS) and registry for session communication
  - phase: 02-foundational-services
    provides: Conductor service contract and Switchboard event dispatch
provides:
  - SESSION_IDENTITIES, SESSION_STATES, TRANSITIONS constants for session identity and lifecycle
  - FRAMING_MODES and TOPOLOGY_RULES for Wire communication topology
  - DEFAULT_SESSION_CONFIG with timing budgets and model assignments
  - createSessionConfig factory for user-overridable session configuration
  - createSessionSpawner for Bun.spawn-based Claude Code session management
  - Conductor.spawnSession/stopSession/getSessionHealth contract expansion
affects: [10-02-wire-session-bridge, 10-03-session-mode-managers, 10-04-sublimation-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns: [session-topology-constants, bun-spawn-session-management, conductor-session-delegation]

key-files:
  created:
    - modules/reverie/components/session/session-config.cjs
    - core/services/conductor/session-spawner.cjs
  modified:
    - core/services/conductor/conductor.cjs
    - core/services/conductor/__tests__/conductor.test.js

key-decisions:
  - "Session spawner lives in core/services/conductor/ (platform capability) not modules/reverie/ (module scope)"
  - "Conductor delegates to internal session spawner rather than exposing spawner directly"
  - "Topology rules enforce hub-spoke: Primary<->Secondary<->Tertiary, no Primary<->Tertiary bypass"

patterns-established:
  - "Session topology as frozen constant maps: identity->allowed-peers for Wire routing validation"
  - "Conductor session delegation: spawnSession/stopSession wrap internal spawner with NOT_STARTED guard"
  - "Session spawner Bun.spawn pattern: claude --dangerously-load-development-channels server:<path>"

requirements-completed: [SES-04, SES-05]

# Metrics
duration: 4min
completed: 2026-03-24
---

# Phase 10 Plan 01: Session Config + Conductor Spawner Summary

**Three-session topology constants (identities, states, transitions, framing modes, topology rules) and Conductor expansion with Bun.spawn-based Claude Code session spawning**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-24T22:03:02Z
- **Completed:** 2026-03-24T22:07:21Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Session config exports 7 frozen constants/factory covering all three-session topology needs
- Session spawner creates/stops/monitors Claude Code sessions via Bun.spawn with correct CLI flags and env vars
- Conductor contract expanded with 3 new required methods + 1 optional, all existing Docker tests still pass
- 66 tests passing across 3 test files, 0 failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Session config constants + Conductor session spawner** - `686fd0f` (test) + `d531fcc` (feat) [TDD]
2. **Task 2: Expand Conductor contract with session lifecycle methods** - `9df5109` (feat)

_Note: Task 1 used TDD with separate RED (test) and GREEN (feat) commits_

## Files Created/Modified
- `modules/reverie/components/session/session-config.cjs` - Session topology config: identities, states, transitions, framing modes, topology rules, defaults, factory
- `modules/reverie/components/session/__tests__/session-config.test.js` - 19 tests for session config constants and factory
- `core/services/conductor/session-spawner.cjs` - Claude Code session spawn/stop/health/list via Bun.spawn
- `core/services/conductor/__tests__/session-spawner.test.js` - 14 tests for session spawner with mocked Bun.spawn
- `core/services/conductor/conductor.cjs` - Expanded CONDUCTOR_SHAPE with spawnSession, stopSession, getSessionHealth, listSessions
- `core/services/conductor/__tests__/conductor.test.js` - 10 new session lifecycle tests (33 total conductor tests)

## Decisions Made
- Session spawner placed in `core/services/conductor/` as a platform capability (Conductor owns infrastructure), not in Reverie module scope
- Conductor delegates to an internal `_sessionSpawner` instance created during `init()`, not exposing the spawner directly to consumers
- Topology rules enforce strict hub-spoke: Primary only talks to Secondary, Tertiary only talks to Secondary -- matches spec S4.1
- `createSessionConfig` throws on invalid `framing_mode` rather than returning Result -- config is construction-time validation, not runtime

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all exports are fully functional with no placeholder data.

## Next Phase Readiness
- Session config constants ready for Session Manager (Plan 03) and Mode Manager (Plan 03)
- Conductor session spawning ready for Wire Session Bridge (Plan 02)
- TOPOLOGY_RULES ready for Wire routing validation
- All 66 tests green across session-config, session-spawner, and conductor

---
*Phase: 10-three-session-architecture*
*Completed: 2026-03-24*
