---
phase: 15-user-journey-gap-closure
plan: 04
subsystem: cli, documentation
tags: [error-messages, readme, onboarding, recovery-suggestions, cli-commands]

requires:
  - phase: 15-01
    provides: start/stop CLI commands for complete command list
  - phase: 12.1
    provides: skill registration, module discovery
provides:
  - Actionable recovery suggestions in all user-visible error messages
  - Complete first-user onboarding README with correct fragment types and full CLI command list
affects: [user-experience, first-run, documentation]

tech-stack:
  added: []
  patterns: ["Error format: What happened -- context. Try: recovery command"]

key-files:
  created: []
  modified:
    - modules/reverie/components/cli/inspect.cjs
    - core/sdk/pulley/platform-commands.cjs
    - modules/reverie/components/cli/register-commands.cjs
    - README.md

key-decisions:
  - "Error recovery format: What happened -- context. Try: bun bin/dynamo.cjs <recovery command>"
  - "MISSING_URL left as-is (already has Usage hint, no further recovery command to suggest)"
  - "README structure: Prerequisites, Install, First Run, Skills, CLI Commands, Architecture, Development"

patterns-established:
  - "Every user-visible error includes Try: or Usage: recovery guidance"
  - "README serves as first-user onboarding document, not internal architecture doc"

requirements-completed: [INT-02]

duration: 3min
completed: 2026-03-28
---

# Phase 15 Plan 04: Error Message Audit and README Rewrite Summary

**Every user-visible error message now includes actionable recovery suggestions; README rewritten as complete first-user onboarding document with correct fragment types and all 23 CLI commands**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T16:18:12Z
- **Completed:** 2026-03-28T16:20:49Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Audited all `return err()` calls in inspect.cjs (4), platform-commands.cjs (3), and register-commands.cjs (2) -- every user-visible error now includes Try: or Usage: recovery guidance
- Rewrote README.md with complete first-user onboarding flow: Prerequisites, Install, First Run, Skills (3), CLI Commands (6 platform + 17 Reverie), Architecture overview
- Corrected fragment types from wrong (episodic, semantic, procedural, emotional, relational) to correct (experiential, meta-recall, sublimation, consolidation, source-reference)

## Task Commits

Each task was committed atomically:

1. **Task 1: Audit and fix user-visible error messages** - `ca738e3` (fix)
2. **Task 2: Rewrite README.md as first-user onboarding document** - `c7b668f` (docs)

## Files Created/Modified

- `modules/reverie/components/cli/inspect.cjs` - MISSING_ID, NO_JOURNAL, FRAGMENT_NOT_FOUND, MISSING_ENTITY errors now include Try: recovery commands
- `core/sdk/pulley/platform-commands.cjs` - NO_RELAY and CONFIG_KEY_NOT_FOUND errors now include Try: recovery commands
- `modules/reverie/components/cli/register-commands.cjs` - FILE_NOT_FOUND error now includes Verify guidance and Try: recovery
- `README.md` - Complete rewrite as first-user onboarding document

## Decisions Made

- Error recovery format standardized as: "What happened -- context. Try: bun bin/dynamo.cjs <recovery command>"
- MISSING_URL error left unchanged -- already has Usage hint and no further recovery command applies
- README structure follows research D-13 recommendations: Prerequisites, Install, First Run, Skills, CLI Commands, Architecture, Development

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all data is live, no placeholder content.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 15 complete -- all user journey gaps closed
- Error messages audit complete across all CLI surfaces
- README serves as accurate onboarding document for first-time users

## Self-Check: PASSED

- All 4 modified files exist on disk
- Both task commits (ca738e3, c7b668f) found in git log

---
*Phase: 15-user-journey-gap-closure*
*Completed: 2026-03-28*
