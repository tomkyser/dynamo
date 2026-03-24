---
phase: 08-single-session-personality-injection
plan: 02
subsystem: context-management
tags: [context-manager, hook-handlers, face-prompt-lifecycle, personality-injection, warm-start, compaction-survival, armature-wiring]

# Dependency graph
requires:
  - phase: 08-single-session-personality-injection
    plan: 01
    provides: Budget tracker state machine (4-phase), template composer (5-slot face prompt generation)
  - phase: 07-foundation-infrastructure
    provides: Self Model manager, cold-start seed, entropy engine, constants, schemas, write coordinator
provides:
  - Context Manager orchestrator with budget-driven face prompt lifecycle
  - Synchronous getInjection() from in-memory cache for hot-path injection
  - 8 Claude Code hook handler implementations via thin dispatch pattern
  - Hook registration through Armature hook registry per INT-01
  - Warm-start cache via dual-purpose face-prompt.md file
  - Compaction checkpoint save and post-compaction budget reset
  - PostToolUse micro-nudge injection at Phase 3 budget
  - Session snapshot persistence on Stop hook
affects: [phase-09 fragment-memory-engine, phase-10 multi-session-architecture, phase-11 rem-consolidation, phase-12 integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [orchestrator-delegation, thin-dispatch-hook-handlers, dual-purpose-warm-start-file, fire-and-forget-recompose, additionalContext-injection]

key-files:
  created:
    - modules/reverie/components/context/context-manager.cjs
    - modules/reverie/components/context/__tests__/context-manager.test.js
    - modules/reverie/hooks/hook-handlers.cjs
    - modules/reverie/hooks/__tests__/hook-handlers.test.js
  modified:
    - modules/reverie/reverie.cjs
    - modules/reverie/manifest.cjs

key-decisions:
  - "Context Manager uses in-memory _currentFacePrompt cache for zero-I/O getInjection() per Pitfall 4"
  - "All hook injection uses additionalContext inside hookSpecificOutput, NEVER systemMessage per Pitfall 1"
  - "D-09 corrected: PreCompact uses additionalContext not systemMessage for compaction framing (research overrides CONTEXT.md wording)"
  - "Hook handlers are thin dispatch -- all business logic in Context Manager, handlers format hook I/O"
  - "trackBytes fires compose() on phase change as fire-and-forget (non-blocking hot path)"

patterns-established:
  - "Thin-dispatch hook handler: handler validates payload, delegates to Context Manager method, formats hook output"
  - "Dual-purpose file: face-prompt.md is both compose target and warm-start cache"
  - "Fire-and-forget recompose: phase transitions trigger async compose without blocking byte tracking"
  - "additionalContext injection: all context injected via hookSpecificOutput.additionalContext"
  - "Hook registry wiring: modules register via createHookRegistry not events.on() per INT-01"

requirements-completed: [CTX-01, CTX-03, CTX-04, CTX-05, INT-01]

# Metrics
duration: 6min
completed: 2026-03-24
---

# Phase 8 Plan 02: Context Manager + Hook Handlers Summary

**Context Manager orchestrator with 8 Claude Code hook handlers delivering continuous personality injection, budget-driven recomposition, compaction survival, and warm-start caching through Armature hook registry**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-24T12:36:36Z
- **Completed:** 2026-03-24T12:42:55Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Context Manager orchestrates full face prompt lifecycle: init (warm-start/cold-start), compose on triggers, synchronous getInjection from memory cache, budget tracking with auto-recompose, checkpoint to Journal, post-compaction reset, warm-start persist
- All 8 hook handlers implemented as thin dispatch: SessionStart (3 paths), UserPromptSubmit (face prompt injection), PreToolUse/PostToolUse (byte tracking + Phase 3 micro-nudge), PreCompact (checkpoint + framing), Stop (warm-start + snapshot), SubagentStart/SubagentStop (byte tracking)
- Reverie module entry point fully wired: creates Self Model, Context Manager, Hook Handlers, registers all 8 hooks through Armature registry, connects to Switchboard
- Manifest declares all 8 hook types in listeners field for Armature discoverability
- 56 new tests (27 Context Manager + 29 Hook Handlers), 1075 total tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Context Manager Orchestrator** - `634195e` (feat) - TDD: 27 tests
2. **Task 2: Hook Handlers and Armature Wiring** - `aead9f5` (feat) - TDD: 29 tests

## Files Created/Modified
- `modules/reverie/components/context/context-manager.cjs` - Central orchestrator: compose, track budget, manage face prompt lifecycle with 10-method contract
- `modules/reverie/components/context/__tests__/context-manager.test.js` - 27 tests covering init paths, compose, trackBytes, checkpoint, reset, micro-nudge, snapshot, warm-start
- `modules/reverie/hooks/hook-handlers.cjs` - All 8 hook handler implementations with thin dispatch to Context Manager
- `modules/reverie/hooks/__tests__/hook-handlers.test.js` - 29 tests covering all 8 handlers, injection format, byte tracking, checkpoint, warm-start
- `modules/reverie/reverie.cjs` - Updated from skeleton to full initialization with hook registry wiring per INT-01
- `modules/reverie/manifest.cjs` - Added hooks.listeners field declaring all 8 hook types

## Decisions Made
- Context Manager uses in-memory `_currentFacePrompt` cache for zero-I/O `getInjection()` per Research Pitfall 4 -- the hot path on every UserPromptSubmit must be < 1ms
- All hook injection uses `additionalContext` inside `hookSpecificOutput`, NEVER `systemMessage` per Research Pitfall 1 -- corrects CONTEXT.md D-02 and D-09 which referenced systemMessage
- Hook handlers follow thin-dispatch pattern: all business logic lives in Context Manager, handlers just wire payloads to CM methods and format hook output
- `trackBytes` fires `compose()` on phase change as fire-and-forget to avoid blocking the synchronous return path
- Reverie module registers hooks via `createHookRegistry().register()` + `wireToSwitchboard()` instead of `events.on()` per INT-01 for discoverability and contract compliance

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all components are fully functional. The only intended future replacement is behavioral directives (D-04: static defaults replaced by Secondary in Phase 10).

## Next Phase Readiness
- Phase 8 complete: personality injection pipeline fully operational within single session
- Budget tracker + template composer (Plan 01) consumed by Context Manager (Plan 02) -- complete integration validated
- All 8 hooks wired and tested -- ready for Phase 9 (Fragment Memory Engine) which adds memory formation hooks
- Phase 10 will replace static behavioral directives with Secondary session dynamic directives
- 1075 total tests pass (0 failures)

## Self-Check: PASSED

- All 6 files created/modified: FOUND
- Commit 634195e (Task 1): FOUND
- Commit aead9f5 (Task 2): FOUND
- Tests: 56 pass (context + hooks), 1075 pass total, 0 failures

---
*Phase: 08-single-session-personality-injection*
*Completed: 2026-03-24*
