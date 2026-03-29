---
phase: 17-persistent-runtime-prompt-infrastructure
plan: 09
subsystem: module-integration
tags: [skills, hook-handlers, session-identity, daemon-lifecycle, config]

requires:
  - phase: 17-05
    provides: Exciter dispatchHook() method for daemon hook routing
  - phase: 17-06
    provides: Circuit template registry and module lifecycle
provides:
  - Updated Dynamo skill with daemon start/stop/status commands
  - Updated Reverie skill with enable/disable/kill module lifecycle
  - Session identity dispatch in all 8 hook handlers
  - Module register/cleanup lifecycle for daemon enable/disable
  - Daemon port configuration in config.json
affects: [17-10, reverie-module, daemon-runtime]

tech-stack:
  added: []
  patterns: [session-identity-dispatch, module-cleanup-lifecycle, daemon-config]

key-files:
  created: []
  modified:
    - .claude/skills/dynamo/SKILL.md
    - .claude/skills/reverie/SKILL.md
    - config.json
    - modules/reverie/hooks/hook-handlers.cjs
    - modules/reverie/reverie.cjs

key-decisions:
  - "getSessionIdentity() checks payload.env first (daemon model), falls back to process.env (pre-daemon compat)"
  - "Secondary/Tertiary handleUserPromptSubmit returns {} since their processing routes through Wire messages"
  - "cleanup() deregisters hooks by calling registerHooks with empty map -- no dedicated deregister API needed yet"
  - "Module exports name+register+cleanup+manifest for Circuit's module lifecycle contract"

patterns-established:
  - "Session identity dispatch: getSessionIdentity(payload) extracts from payload.env.SESSION_IDENTITY with process.env fallback"
  - "Null-guard pattern: all 8 handlers set payload.env = {} if missing"
  - "Module lifecycle: register() creates components, cleanup() deregisters hooks"

requirements-completed: [SVC-01, MOD-01]

duration: 6min
completed: 2026-03-29
---

# Phase 17 Plan 09: Skills, Hook Dispatch, Module Lifecycle Summary

**Daemon-aware skills, session identity dispatch in hook handlers, and module register/cleanup lifecycle for Reverie**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-29T04:37:09Z
- **Completed:** 2026-03-29T04:42:53Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Dynamo skill updated with daemon lifecycle commands (start/stop/status) and troubleshooting guidance
- Reverie skill updated with module lifecycle (enable/disable/kill) and daemon prerequisite flow
- Hook handlers dispatch by SESSION_IDENTITY from payload.env for all three session types
- Module entry point exports register(), cleanup(), name, and manifest for daemon module lifecycle
- config.json gains daemon.port=9876 configuration field

## Task Commits

Each task was committed atomically:

1. **Task 1: Update skills and config for daemon model** - `aee0f47` (feat)
2. **Task 2: Hook handler session identity dispatch and module register()** - `394320c` (feat)

## Files Created/Modified
- `.claude/skills/dynamo/SKILL.md` - Daemon lifecycle commands (start/stop/status), troubleshooting
- `.claude/skills/reverie/SKILL.md` - Module lifecycle (enable/disable/kill), daemon prerequisite, flow
- `config.json` - Added daemon.port=9876 configuration
- `modules/reverie/hooks/hook-handlers.cjs` - Session identity dispatch, null-guards, helper functions
- `modules/reverie/reverie.cjs` - cleanup() function, updated exports (name, register, cleanup, manifest)

## Decisions Made
- getSessionIdentity() checks payload.env.SESSION_IDENTITY first (daemon model where Exciter enriches payload), then falls back to process.env.SESSION_IDENTITY (pre-daemon compatibility). This ensures backward compatibility while the daemon model is being built.
- Secondary/Tertiary sessions return {} from handleUserPromptSubmit since their processing (experience evaluation, sublimation) routes through Wire messages, not hook additionalContext injection.
- cleanup() deregisters hooks by calling registerHooks('reverie', {}) with an empty handler map. A dedicated deregister API is not needed yet; this pattern works with the current Exciter implementation.
- Module exports include name+register+cleanup+manifest to satisfy Circuit's module lifecycle contract for daemon enable/disable.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- Pre-existing test failure in spec-platform.test.cjs (strict mode check) -- not caused by this plan's changes, confirmed by running test before and after changes.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all functionality is wired to real implementations or intentional placeholders documented in code comments (handleSecondaryStart/handleTertiaryStart return {} because Secondary/Tertiary init is handled by Session Manager during spawn).

## Next Phase Readiness
- Skills instruct Claude on correct daemon and module lifecycle commands
- Hook handlers ready for daemon dispatch via Exciter.dispatchHook()
- Module lifecycle ready for Circuit enable/disable operations
- Plan 10 can wire end-to-end integration testing

---
*Phase: 17-persistent-runtime-prompt-infrastructure*
*Completed: 2026-03-29*

## Self-Check: PASSED

- All 5 modified files exist on disk
- Commit aee0f47 found (Task 1)
- Commit 394320c found (Task 2)
- Commit 86484e6 found (metadata)
- 1386/1387 tests pass (1 pre-existing failure in spec-platform.test.cjs)
