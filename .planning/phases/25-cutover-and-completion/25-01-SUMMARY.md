---
phase: 25-cutover-and-completion
plan: 01
subsystem: reverie, dispatcher, config
tags: [reverie, classic-removal, openrouter, mode-switching, curation, dead-code]

# Dependency graph
requires:
  - phase: 24-cognitive-pipeline
    provides: Reverie handler implementations, dual-path routing, curation module, inner-voice subagent
  - phase: 23-foundation-and-routing
    provides: Reverie config CLI, dispatcher mode-based routing, handler stubs
provides:
  - Simplified two-branch dispatcher (subagent vs Reverie, no mode switching)
  - Removed classic Ledger curation pipeline entirely
  - Eliminated OpenRouter/Haiku dependency from codebase
  - Removed reverie.mode config key and validator
  - Session backfill redirected to Reverie curation module
  - Clean deletion of 5 classic prompt templates, 5 Ledger hooks, and Ledger curation module
affects: [25-02 voice-cli, 25-03 bare-cli-and-changelog, 25-04 install-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Always-Reverie routing: dispatcher has two branches (JSON_OUTPUT_EVENTS for subagents, else for Reverie cognitive handlers)"
    - "No mode checking: Reverie is always active when Dynamo is enabled"

key-files:
  created: []
  modified:
    - cc/hooks/dynamo-hooks.cjs
    - lib/config.cjs
    - subsystems/terminus/stages.cjs
    - dynamo.cjs
    - subsystems/switchboard/install.cjs
    - dynamo/tests/config.test.cjs
    - dynamo/tests/ledger/dispatcher.test.cjs
    - dynamo/tests/switchboard/stages.test.cjs
    - dynamo/tests/switchboard/install.test.cjs
    - dynamo/tests/switchboard/health-check.test.cjs

key-decisions:
  - "Deleted Ledger hooks directory entirely rather than leaving as dead code -- aligns with user's clean break preference"
  - "Removed curation section from generateConfig -- new installs get clean config without OpenRouter artifacts"
  - "Negative assertion tests in config.test.cjs and dispatcher.test.cjs confirm reverie.mode removal"

patterns-established:
  - "Two-branch dispatcher: if JSON_OUTPUT_EVENTS (subagent) else (Reverie cognitive)"

requirements-completed: [FLAG-02]

# Metrics
duration: 33min
completed: 2026-03-21
---

# Phase 25 Plan 01: Classic Mode Removal Summary

**Removed classic Ledger curation path entirely -- Reverie is the only processing pipeline with simplified two-branch dispatcher, no mode switching, no OpenRouter dependency**

## Performance

- **Duration:** 33 min
- **Started:** 2026-03-20T23:32:30Z
- **Completed:** 2026-03-21T00:05:42Z
- **Tasks:** 2
- **Files modified:** 18 (4 production, 1 install config, 5 test files modified, 5 prompt templates deleted, 1 curation module deleted, 5 Ledger hooks deleted, 1 test file deleted)

## Accomplishments
- Dispatcher always routes cognitive events to Reverie handlers -- no mode check, no classic fallback
- Zero OpenRouter/Haiku references remain in production code
- 5 classic prompt templates, 5 Ledger hook handlers, and Ledger curation module all deleted
- Session backfill uses Reverie's deterministic generateSessionName (no API key needed)
- All modified and new test files pass with 0 failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove classic mode from dispatcher, config, and health checks** - `e22990d` (feat)
2. **Task 2: Delete classic dead code and update all affected tests** - `5bae65f` (feat)

## Files Created/Modified

### Deleted
- `cc/prompts/curation.md` - Classic curation prompt template
- `cc/prompts/precompact.md` - Classic pre-compact prompt template
- `cc/prompts/prompt-context.md` - Classic prompt context template
- `cc/prompts/session-name.md` - Classic session naming template
- `cc/prompts/session-summary.md` - Classic session summary template
- `subsystems/ledger/curation.cjs` - Classic curation module (callHaiku, curateResults, summarizeText, generateSessionName)
- `subsystems/ledger/hooks/session-start.cjs` - Classic SessionStart handler
- `subsystems/ledger/hooks/prompt-augment.cjs` - Classic UserPromptSubmit handler
- `subsystems/ledger/hooks/capture-change.cjs` - Classic PostToolUse handler
- `subsystems/ledger/hooks/preserve-knowledge.cjs` - Classic PreCompact handler
- `subsystems/ledger/hooks/session-summary.cjs` - Classic Stop handler
- `dynamo/tests/ledger/curation.test.cjs` - Tests for deleted Ledger curation module

### Modified
- `cc/hooks/dynamo-hooks.cjs` - Simplified from 3-branch to 2-branch dispatcher; removed mode check, loadConfig import, classic else branch
- `lib/config.cjs` - Removed reverie.mode validator from VALIDATORS map
- `subsystems/terminus/stages.cjs` - Removed OPENROUTER_API_KEY from env var and .env file checks
- `dynamo.cjs` - Redirected session backfill to reverie/curation.cjs; updated config help text
- `subsystems/switchboard/install.cjs` - Removed curation section from generateConfig
- `dynamo/tests/config.test.cjs` - Removed reverie.mode tests; added negative assertion tests
- `dynamo/tests/ledger/dispatcher.test.cjs` - Replaced classic mode tests with always-Reverie tests; updated handler checks to Reverie handlers
- `dynamo/tests/switchboard/stages.test.cjs` - Removed OPENROUTER_API_KEY tests
- `dynamo/tests/switchboard/install.test.cjs` - Updated to verify curation section NOT in generated config; removed OPENROUTER from mock .env
- `dynamo/tests/switchboard/health-check.test.cjs` - Removed OPENROUTER mock reference

## Decisions Made
- Deleted Ledger hooks directory entirely rather than leaving as dead code -- aligns with user's explicit "clean break" preference (D-01, D-05)
- Removed curation section from generateConfig so new installs get clean config without OpenRouter artifacts (per Pitfall 2 in research)
- Used negative assertion tests (confirming reverie.mode is NOT validated, classic is NOT present) rather than removing all mentions of the term

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Removed curation section from generateConfig in install.cjs**
- **Found during:** Task 2 (dead code cleanup)
- **Issue:** generateConfig was still producing a `curation` config section with OpenRouter model and API URL, even though all consumers were removed
- **Fix:** Removed the curation key and its sub-keys from the generated config object; also removed the `curation` and `summarization` timeout keys
- **Files modified:** subsystems/switchboard/install.cjs
- **Verification:** install.test.cjs updated and passes -- asserts `config.curation` is undefined
- **Committed in:** 5bae65f (Task 2 commit)

**2. [Rule 1 - Bug] Updated OPENROUTER mock in health-check.test.cjs**
- **Found during:** Task 2 (test updates)
- **Issue:** health-check.test.cjs mock still referenced OPENROUTER_API_KEY in a stub, which is stale after the removal
- **Fix:** Changed mock warning text to generic "optional env var missing"
- **Files modified:** dynamo/tests/switchboard/health-check.test.cjs
- **Verification:** health-check tests pass with 0 failures
- **Committed in:** 5bae65f (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Known Stubs

None -- all changes are removals/simplifications, no new stubs introduced.

## Issues Encountered

- **Pre-existing boundary.test.cjs failure:** The test "reverie/ is a stub directory" fails because it was written in Phase 19 when reverie was a stub, but Phase 23/24 added production files. This is a pre-existing issue not caused by this plan's changes. Logged to deferred-items.md.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Dispatcher is simplified and always routes to Reverie -- ready for voice CLI commands (Plan 02)
- Config has no mode key -- voice commands do not need to check mode
- Session backfill works with Reverie curation -- no API key dependency
- Install pipeline generateConfig is clean -- ready for Plan 04 install/sync updates

## Self-Check: PASSED

- 25-01-SUMMARY.md: FOUND
- Commit e22990d: FOUND
- Commit 5bae65f: FOUND
- cc/prompts/curation.md: CONFIRMED DELETED
- subsystems/ledger/curation.cjs: CONFIRMED DELETED
- subsystems/ledger/hooks/: CONFIRMED DELETED
- cc/prompts/ contains exactly 5 files (all iv-*): CONFIRMED

---
*Phase: 25-cutover-and-completion*
*Completed: 2026-03-21*
