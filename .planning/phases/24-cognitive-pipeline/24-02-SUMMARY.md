---
phase: 24-cognitive-pipeline
plan: 02
subsystem: reverie
tags: [curation, injection, template-formatting, adversarial-counter-prompting, token-limits, inner-voice]

# Dependency graph
requires:
  - phase: 23-foundation-and-routing
    provides: Reverie subsystem foundation (state.cjs, activation.cjs, handler stubs)
provides:
  - Template-based curation module (subsystems/reverie/curation.cjs) with 6 exports
  - 5 Inner Voice prompt templates for subagent deliberation (cc/prompts/iv-*.md)
  - TOKEN_LIMITS constant (500/150/50) for injection budget enforcement
affects: [24-03-PLAN, 24-04-PLAN, inner-voice-pipeline, handler-rewrites]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Template-based formatting as hot-path and degradation fallback"
    - "Adversarial counter-prompting with experiential qualifiers"
    - "Token limit enforcement via character-based estimation (~4 chars/token)"
    - "Stop-word filtering for session name extraction"

key-files:
  created:
    - subsystems/reverie/curation.cjs
    - dynamo/tests/reverie/curation.test.cjs
    - cc/prompts/iv-briefing.md
    - cc/prompts/iv-injection.md
    - cc/prompts/iv-adversarial.md
    - cc/prompts/iv-precompact.md
    - cc/prompts/iv-synthesis.md
  modified: []

key-decisions:
  - "Case-insensitive adversarial framing check -- 'From your experience' at start of line counts as framing"
  - "Synchronous-only functions -- no async, no LLM calls -- enables hot-path use and degradation fallback"
  - "truncateToTokenLimit prefers sentence boundaries over hard char cuts"

patterns-established:
  - "Adversarial framing pattern: 'From your experience, when you worked on X, Y.' per D-03"
  - "Prompt template format: system prompt above ---, user prompt with {variable} placeholders below"
  - "Token limit enforcement: TOKEN_LIMITS constant + truncateToTokenLimit() utility"

requirements-completed: [IV-07, IV-08, IV-05]

# Metrics
duration: 5min
completed: 2026-03-20
---

# Phase 24 Plan 02: Curation and Templates Summary

**Template-based curation module with adversarial counter-prompting, 5 Inner Voice prompt templates, and token limit enforcement (500/150/50)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-20T22:05:44Z
- **Completed:** 2026-03-20T22:11:02Z
- **Tasks:** 2
- **Files created:** 7

## Accomplishments

- Created 5 Inner Voice prompt templates (iv-briefing, iv-injection, iv-adversarial, iv-precompact, iv-synthesis) with system/user sections, variable placeholders, and adversarial framing qualifiers per D-03
- Implemented subsystems/reverie/curation.cjs with 6 exports: curateForInjection, formatBriefing, formatSynthesis, formatPreCompact, generateSessionName, TOKEN_LIMITS
- All functions are synchronous template-based implementations serving as both hot-path formatters and degradation fallback per D-06
- Token limits enforced at 500 (session-start), 150 (mid-session), 50 (urgent) per IV-05
- 22 unit tests passing with full TDD workflow (RED -> GREEN)
- Ledger curation module unchanged for classic mode per D-08

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 5 Inner Voice prompt templates** - `92a92db` (feat)
2. **Task 2 RED: Add failing curation tests** - `b8160d1` (test)
3. **Task 2 GREEN: Implement curation module** - `c3d0708` (feat)

## Files Created/Modified

- `cc/prompts/iv-briefing.md` - Session-start briefing template (500 token context, D-04)
- `cc/prompts/iv-injection.md` - Mid-session injection template (150 token context, D-01/D-02)
- `cc/prompts/iv-adversarial.md` - Adversarial counter-prompting template (D-03)
- `cc/prompts/iv-precompact.md` - PreCompact state preservation template (REM Tier 1)
- `cc/prompts/iv-synthesis.md` - Session-end synthesis template (D-15, REM Tier 3)
- `subsystems/reverie/curation.cjs` - Template-based curation module (293 LOC)
- `dynamo/tests/reverie/curation.test.cjs` - Curation unit tests (277 LOC, 22 tests)

## Decisions Made

- **Case-insensitive adversarial framing:** "From your experience" at line start counts as D-03 framing. Test updated to match case-insensitively.
- **Synchronous-only design:** All exported functions are synchronous with no async or LLM calls, enabling both hot-path use (<500ms) and degradation fallback when subagent spawn is unavailable.
- **Sentence-boundary truncation:** truncateToTokenLimit() prefers cutting at sentence boundaries (". ") to avoid mid-sentence truncation, falling back to word boundaries.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed case-sensitivity in adversarial framing test**
- **Found during:** Task 2 GREEN (test execution)
- **Issue:** Test checked for lowercase "from your experience" but the template-based output starts the line with capital "From your experience"
- **Fix:** Changed test to lowercase the output before checking for framing qualifiers
- **Files modified:** dynamo/tests/reverie/curation.test.cjs
- **Verification:** All 22 tests pass
- **Committed in:** c3d0708 (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor test adjustment for case sensitivity. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Curation module ready for import by inner-voice.cjs (Plan 03)
- All 5 prompt templates ready for subagent deliberation path
- TOKEN_LIMITS constant available for all injection formatting
- Classic mode Ledger curation preserved for hybrid operation

## Self-Check: PASSED

- All 7 created files verified on disk
- All 3 commit hashes verified in git log (92a92db, b8160d1, c3d0708)

---
*Phase: 24-cognitive-pipeline*
*Completed: 2026-03-20*
