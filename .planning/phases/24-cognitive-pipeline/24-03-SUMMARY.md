---
phase: 24-cognitive-pipeline
plan: 03
subsystem: reverie
tags: [inner-voice, pipeline-orchestrator, state-bridge, hot-path-timing, deliberation, correlation-id, ttl, cognitive-pipeline]

# Dependency graph
requires:
  - phase: 23-foundation-and-routing
    provides: activation.cjs (entity extraction, spreading activation, sublimation scoring, spawn budget), state.cjs (state persistence, freshDefaults)
  - phase: 24-cognitive-pipeline
    plan: 01
    provides: dual-path.cjs (selectPath, detectSemanticShift, detectExplicitRecall, token management, formatHotPathInjection, adjustThreshold)
  - phase: 24-cognitive-pipeline
    plan: 02
    provides: curation.cjs (curateForInjection, formatBriefing, formatSynthesis, formatPreCompact, TOKEN_LIMITS)
provides:
  - Core pipeline orchestrator (inner-voice.cjs) with 5 per-hook processing functions and 2 state bridge functions
  - Per-step timing instrumentation with 400ms abort threshold (PATH-02)
  - Atomic state bridge write/consume with correlation ID and 60s TTL (PATH-05)
  - Self-model persistence via state updates (IV-06)
affects: [24-04-PLAN, handler-rewrites, subagent-stop-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pipeline orchestrator: central module wiring activation, dual-path, and curation into per-hook cognitive pipelines"
    - "State bridge: file-based async communication with atomic rename consumption, correlation ID, and TTL validation"
    - "Hot path timing: performance.now() per-step instrumentation with 400ms abort threshold"
    - "Deep-copy state isolation: JSON.parse(JSON.stringify(state)) prevents mutation across pipeline steps"

key-files:
  created:
    - subsystems/reverie/inner-voice.cjs
    - dynamo/tests/reverie/inner-voice.test.cjs
  modified: []

key-decisions:
  - "Deep-copy state at pipeline entry prevents mutation leaking between steps or on error paths"
  - "checkThresholdCrossings uses activation level (not sublimation score) for threshold comparison -- consistent with activation.cjs design"
  - "Test uses engineering-heavy prompt for high frame_confidence to deterministically route to hot path for injection testing"

patterns-established:
  - "Pipeline orchestrator pattern: each processX function deep-copies state, runs deterministic steps, returns { result, updatedState }"
  - "State bridge pattern: write JSON with correlation_id and timestamp, consume via fs.renameSync for atomicity, validate TTL and correlation on read"
  - "Hot-path abort pattern: check elapsed time against HOT_PATH_ABORT_MS threshold, return { aborted: true } on overrun"

requirements-completed: [IV-06, PATH-02, PATH-05, IV-05]

# Metrics
duration: 5min
completed: 2026-03-20
---

# Phase 24 Plan 03: Inner Voice Pipeline Orchestrator Summary

**Central pipeline orchestrator wiring activation, dual-path, and curation modules into 5 per-hook cognitive pipelines with per-step timing instrumentation (400ms abort), atomic state bridge for deliberation result consumption (correlation ID + 60s TTL), and self-model persistence across invocations**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-20T22:18:46Z
- **Completed:** 2026-03-20T22:24:38Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files created:** 2

## Accomplishments

- Pipeline orchestrator (inner-voice.cjs, 430 LOC) with 5 per-hook processing functions (processUserPrompt, processSessionStart, processStop, processPreCompact, processPostToolUse) and 2 state bridge functions (consumeDeliberationResult, writeDeliberationResult)
- processUserPrompt implements full cognitive pipeline: entity extraction, activation update, domain classification, semantic shift detection, recall check, prediction match (D-12 silence), sublimation scoring, path selection, 400ms abort threshold (PATH-02), hot-path injection formatting, self-model updates, threshold adaptation (D-09), and deliberation queue management
- Atomic state bridge with fs.renameSync consumption (prevents double-consumption per Pitfall 3), correlation ID validation, and 60s TTL enforcement (PATH-05)
- SessionStart always deliberation (D-14), Stop always deliberation (D-15), both with spawn recording
- 39 new tests (all passing) covering all pipeline functions, state bridge, and hot-path timing

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Add failing inner-voice pipeline tests** - `7bd22c8` (test)
2. **Task 1 GREEN: Implement inner-voice pipeline orchestrator** - `cea9fbe` (feat)

_Note: TDD task with separate RED and GREEN commits_

## Files Created/Modified

- `subsystems/reverie/inner-voice.cjs` - Core pipeline orchestrator (430 LOC) with 5 pipeline functions, 2 state bridge functions, and timing instrumentation
- `dynamo/tests/reverie/inner-voice.test.cjs` - Unit tests (601 LOC, 39 tests) covering all exported functions and hot-path timing

## Decisions Made

- **Deep-copy state isolation:** JSON.parse(JSON.stringify(state)) at pipeline entry prevents mutation from leaking between steps or on error return paths. Consistent with the established options-based test isolation pattern.
- **Activation level for threshold crossings:** checkThresholdCrossings checks against entry.level (not the composite sublimation score) to remain consistent with the existing activation.cjs contract.
- **Engineering-heavy test prompts:** Test for injection threshold crossing uses a prompt with many engineering keywords to ensure high frame_confidence (>0.7), deterministically routing to hot path for injection generation testing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test prompt for deterministic hot-path routing**
- **Found during:** Task 1 GREEN (test execution)
- **Issue:** Test prompt "Working on the dynamo reverie module integration" produced low frame_confidence (<0.7), causing selectPath to route to deliberation instead of hot path, preventing injection generation
- **Fix:** Changed test prompt to engineering-heavy text "implement the dynamo reverie module function to export and build the code for deployment test" which produces frame_confidence of 0.89
- **Files modified:** dynamo/tests/reverie/inner-voice.test.cjs
- **Verification:** All 39 tests pass
- **Committed in:** cea9fbe (GREEN phase commit)

---

**Total deviations:** 1 auto-fixed (1 bug in test assertion)
**Impact on plan:** Minor test prompt adjustment for deterministic path routing. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- inner-voice.cjs exports are ready for handler rewrites (Plan 04): processUserPrompt, processSessionStart, processStop, processPreCompact, processPostToolUse
- State bridge functions (consumeDeliberationResult, writeDeliberationResult) ready for SubagentStop handler integration
- DELIBERATION_RESULT_PATH exported for handler and subagent coordination
- All 164 reverie tests pass (39 inner-voice + 44 dual-path + 22 curation + 49 activation + 10 state = 164 total; excludes handlers and subagent tests)

## Self-Check: PASSED

All 2 created files verified on disk. All 2 commit hashes verified in git log (7bd22c8, cea9fbe).

---
*Phase: 24-cognitive-pipeline*
*Completed: 2026-03-20*
