---
phase: 12-integration-surface-backfill
plan: 05
subsystem: memory
tags: [backfill, formation, parser, pipeline, hybrid-framing, conversation-import]

# Dependency graph
requires:
  - phase: 12-integration-surface-backfill
    plan: 01
    provides: "BACKFILL_DEFAULTS constants, baseFragmentSchema origin field"
  - phase: 09-fragment-memory-engine
    provides: "Formation pipeline, fragment assembler, attention gate"
provides:
  - "createBackfillParser factory with v1 Claude export format detection, turn extraction, age computation"
  - "createBackfillPipeline factory with dryRun, processConversation, runBatch"
  - "BACKFILL_TEMPLATES with hybrid subjective framing for retrospective/experiential formation"
  - "Full backfill formation path: parse -> attention gate -> formation -> origin tracking"
affects: [12-06]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Versioned parser registry for Claude export format evolution", "Pre-composed prompt override via stimulus.backfill_prompt field"]

key-files:
  created:
    - "modules/reverie/components/formation/backfill-parser.cjs"
    - "modules/reverie/components/formation/backfill-pipeline.cjs"
    - "modules/reverie/components/formation/__tests__/backfill-parser.test.js"
    - "modules/reverie/components/formation/__tests__/backfill-pipeline.test.js"
  modified:
    - "modules/reverie/components/formation/prompt-templates.cjs"

key-decisions:
  - "Backfill parser uses PARSERS registry pattern from Lithograph for versioned format detection"
  - "BACKFILL_TEMPLATES composed in backfill-pipeline and passed as stimulus.backfill_prompt for formation override"
  - "Per-conversation fragment cap enforced in processConversation loop, not formation pipeline"

patterns-established:
  - "Backfill stimulus carries backfill_prompt and backfill_temporal fields for formation pipeline consumption"
  - "Synthetic session IDs use backfill-{conversation_uuid} format for provenance isolation"

requirements-completed: [FRG-10]

# Metrics
duration: 5min
completed: 2026-03-25
---

# Phase 12 Plan 05: Historical Data Backfill Pipeline Summary

**Claude conversation export parser with versioned format detection, backfill pipeline orchestrator with dry-run/batch/origin tracking, and BACKFILL_TEMPLATES hybrid framing for retrospective/experiential formation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-25T05:15:23Z
- **Completed:** 2026-03-25T05:20:23Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Versioned Claude export parser (v1) with format detection, turn extraction, text content filtering, and human-readable conversation age computation
- BACKFILL_TEMPLATES with hybrid subjective framing per D-14 -- formation subagent decides between retrospective and experiential processing based on conversation age and Self Model resonance
- Backfill pipeline orchestrator with three modes: dryRun (stats only), processConversation (single conversation), runBatch (multi-conversation with batch processing)
- All backfill fragments marked origin='backfill' per D-14 with equal trust per D-15
- Per-conversation fragment cap (50) prevents runaway formation per Pitfall 5
- Original timestamps preserved in temporal fields per Pitfall 3
- Progress events emitted via Switchboard for real-time monitoring
- 27 new tests across 2 test files, all passing; 71 total formation tests passing with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create versioned Claude export parser and backfill formation template** - `d3d6c64` (feat)
2. **Task 2: Create backfill pipeline orchestrator with dry-run, batch processing, and origin tracking** - `2bd756e` (feat)

## Files Created/Modified
- `modules/reverie/components/formation/backfill-parser.cjs` - Versioned parser with v1 detect, parseConversation, extractTextContent, getConversationAge
- `modules/reverie/components/formation/backfill-pipeline.cjs` - Pipeline orchestrator with dryRun, processConversation, runBatch
- `modules/reverie/components/formation/prompt-templates.cjs` - Added BACKFILL_TEMPLATES with hybrid subjective framing
- `modules/reverie/components/formation/__tests__/backfill-parser.test.js` - 13 tests for parser and template
- `modules/reverie/components/formation/__tests__/backfill-pipeline.test.js` - 14 tests for pipeline orchestration

## Decisions Made
- Backfill parser uses PARSERS registry pattern (Object.freeze) matching Lithograph's versioned approach -- future format changes add a new parser version without modifying consumers
- BACKFILL_TEMPLATES composed in backfill-pipeline and passed as stimulus.backfill_prompt, enabling formation pipeline to use backfill-specific prompts without modifying the core formation code path
- Per-conversation fragment cap enforced in processConversation loop rather than delegating to formation pipeline, keeping backfill safety distinct from formation pipeline concerns

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all code paths are fully wired with no placeholder data.

## Next Phase Readiness
- Backfill parser and pipeline ready for CLI integration (12-06 backfill CLI command)
- BACKFILL_TEMPLATES available for prompt iteration and tuning
- Formation pipeline integration validated: backfill stimuli route through existing prepareStimulus and processFormationOutput
- FRG-10 requirement complete

## Self-Check: PASSED

- All 5 created/modified files exist on disk
- Both task commits verified (d3d6c64, 2bd756e)
- All acceptance criteria patterns found in source files
- 27 tests passing across 2 test files, 71 total formation tests passing

---
*Phase: 12-integration-surface-backfill*
*Completed: 2026-03-25*
