---
phase: 24-cognitive-pipeline
plan: 01
subsystem: reverie
tags: [dual-path, routing, semantic-shift, recall, tokens, subagent, inner-voice, adversarial-framing]

# Dependency graph
requires:
  - phase: 23-foundation-and-routing
    provides: activation.cjs (entity extraction, spreading activation, sublimation scoring, spawn budget), state.cjs (state persistence), handler stubs
provides:
  - Deterministic path selection module (selectPath, 7 exported functions)
  - Semantic shift detection via Jaccard overlap
  - Explicit recall phrase detection (5 regex patterns)
  - Token estimation and truncation for injection budgets
  - Hot-path template-based injection formatting with adversarial framing
  - Adaptive sublimation threshold based on acknowledgment rate
  - Inner-voice subagent definition for deliberation and REM processing
affects: [24-02-inner-voice-orchestrator, 24-03-handler-rewrites, 24-04-state-bridge]

# Tech tracking
tech-stack:
  added: []
  patterns: [Jaccard-overlap-semantic-shift, adversarial-counter-prompting-templates, signal-priority-chain-routing, YAML-frontmatter-subagent-definition]

key-files:
  created:
    - subsystems/reverie/dual-path.cjs
    - cc/agents/inner-voice.md
    - dynamo/tests/reverie/dual-path.test.cjs
    - dynamo/tests/reverie/subagent.test.cjs
  modified: []

key-decisions:
  - "selectPath priority chain: predictionsMatch(skip) > explicitRecall(deliberation) > rateLimited(hot) > semanticShift(deliberation) > lowConfidence(deliberation) > noInjection(skip) > default(hot)"
  - "Jaccard overlap with 0.3 default threshold for semantic shift detection -- deterministic, <1ms, no embeddings"
  - "Adversarial framing uses 'From your experience' and 'As you described it' qualifiers in template output"

patterns-established:
  - "Signal-priority-chain: deterministic routing through ordered if-return chain with no LLM call"
  - "Adversarial template framing: all injection text wraps facts with user-experience qualifiers per D-03"
  - "Subagent definition pattern: YAML frontmatter (model, tools, permissionMode, maxTurns, memory) + Markdown system prompt at cc/agents/"

requirements-completed: [PATH-01, PATH-04, PATH-06, IV-09, IV-11]

# Metrics
duration: 6min
completed: 2026-03-20
---

# Phase 24 Plan 01: Dual-Path Routing and Inner Voice Subagent Summary

**Deterministic dual-path routing module with 7 functions (selectPath, semantic shift, recall detection, token management, adversarial injection formatting, threshold adaptation) and Sonnet-based inner-voice subagent definition**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-20T22:05:46Z
- **Completed:** 2026-03-20T22:11:27Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments
- Dual-path routing module with 7 exported functions implementing deterministic path selection (PATH-01), semantic shift detection (IV-09), explicit recall detection (IV-11), token budget management (IV-05 partial), hot-path injection formatting with adversarial framing (D-01, D-02, D-03), and adaptive threshold adjustment (D-09)
- Inner-voice subagent definition at cc/agents/inner-voice.md with Sonnet model, read-only tools, dontAsk permission, contextual narrative system prompt with adversarial counter-prompting instructions
- 56 new tests (44 dual-path + 12 subagent validation), all passing alongside 69 existing reverie tests (125 total)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create dual-path.cjs with TDD** - `61242c8` (test: RED), `b84b1a0` (feat: GREEN)
2. **Task 2: Create inner-voice subagent definition** - `9c36087` (feat)

_Note: Task 1 used TDD with separate RED and GREEN commits_

## Files Created/Modified
- `subsystems/reverie/dual-path.cjs` - Deterministic path selection, semantic shift detection, recall detection, token estimation, injection formatting, threshold adaptation (252 LOC)
- `cc/agents/inner-voice.md` - Custom subagent definition with YAML frontmatter and contextual narrative system prompt
- `dynamo/tests/reverie/dual-path.test.cjs` - 44 unit tests covering all 7 exported functions
- `dynamo/tests/reverie/subagent.test.cjs` - 12 validation tests for subagent definition file structure and constraints

## Decisions Made
- selectPath priority chain orders predictionsMatch (D-12 skip) before explicitRecall (D-11 deliberation), ensuring complete silence when predictions match even if the user used a recall phrase -- this follows the "silence IS the signal" principle
- Jaccard overlap chosen for semantic shift with 0.3 default threshold -- deterministic and sub-millisecond; embedding-based detection deferred to M4/MENH-08
- Adversarial framing templates use sentence-initial "From your experience" and "As you described it" qualifiers -- capitalized for natural reading in contextual narrative output

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed case-sensitive adversarial framing assertion in test**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** Test checked for lowercase "from your experience" but template outputs "From your experience" (sentence-initial capitalization)
- **Fix:** Changed test assertion to use case-insensitive comparison via `.toLowerCase()`
- **Files modified:** dynamo/tests/reverie/dual-path.test.cjs
- **Verification:** All 44 tests pass
- **Committed in:** b84b1a0 (part of GREEN phase commit)

---

**Total deviations:** 1 auto-fixed (1 bug in test assertion)
**Impact on plan:** Minor test fix for case sensitivity. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- dual-path.cjs exports are ready for import by inner-voice.cjs (Plan 02) and handler rewrites (Plan 03)
- cc/agents/inner-voice.md subagent definition is ready for SubagentStart hook context injection (Plan 03)
- All 125 reverie tests pass (no regressions)

## Self-Check: PASSED

All 4 created files verified on disk. All 3 commit hashes verified in git log.

---
*Phase: 24-cognitive-pipeline*
*Completed: 2026-03-20*
