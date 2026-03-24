---
phase: 09-fragment-memory-engine
plan: 03
subsystem: memory
tags: [formation, recall, pipeline, orchestrator, association-index, wire, assay, composite-scorer, nudge]

requires:
  - phase: 09-fragment-memory-engine (Plan 01)
    provides: attention gate, prompt templates, fragment assembler, nudge manager
  - phase: 09-fragment-memory-engine (Plan 02)
    provides: composite scorer, query builder, reconstruction prompt
  - phase: 07-foundation-infrastructure
    provides: FragmentWriter, Self Model, constants, schemas, Wire protocol
provides:
  - Formation pipeline orchestrator (prepareStimulus, processFormationOutput, getFormationStats)
  - Recall engine orchestrator (recallPassive, recallExplicit, getRecallStats)
  - Master association table population via Wire upserts (domains, entities, attention_tags)
  - Formation group tagging for sibling fragment linking
affects: [09-04-hook-wiring, 10-three-session, 11-rem-consolidation]

tech-stack:
  added: []
  patterns:
    - "Master table population before join table writes (Research Pitfall 5)"
    - "Shared composite scorer instance across both recall paths (D-12)"
    - "Formation group tagging with fg- prefix and UUID suffix"

key-files:
  created:
    - modules/reverie/components/formation/formation-pipeline.cjs
    - modules/reverie/components/recall/recall-engine.cjs
    - modules/reverie/components/formation/__tests__/formation-pipeline.test.js
    - modules/reverie/components/formation/__tests__/association-population.test.js
    - modules/reverie/components/recall/__tests__/recall-engine.test.js
  modified: []

key-decisions:
  - "Formation pipeline populates master tables via Wire upserts BEFORE fragment writes to prevent FK gaps"
  - "Recall engine uses same composite scorer instance for both passive and explicit paths per D-12"
  - "Formation group ID uses fg- prefix with 8-char hex UUID suffix"

patterns-established:
  - "Orchestrator pattern: pipeline composes Plan 01/02 components via options-based DI, never instantiates services directly"
  - "Master table upsert pattern: collect all unique names from batch, send one Wire envelope per table with upsert: true"

requirements-completed: [FRG-03, FRG-04]

duration: 6min
completed: 2026-03-24
---

# Phase 09 Plan 03: Formation Pipeline and Recall Engine Orchestrators Summary

**End-to-end formation pipeline (stimulus to fragment write with master table population) and dual-path recall engine (passive nudge + explicit reconstruction) wiring all Plan 01/02 components**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-24T17:26:39Z
- **Completed:** 2026-03-24T17:32:42Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments
- Formation pipeline orchestrates complete formation cycle: parse subagent output, populate master association tables, write validated fragments via FragmentWriter, deliver nudges via NudgeManager
- Recall engine orchestrates complete recall cycle for both paths: passive (Assay search, rank top 5, ~100-200 token nudge) and explicit (Assay search, rank top 15, ~500-1000 token reconstruction through Self Model frame)
- Master association table population ensures FK integrity by writing domains/entities/attention_tags via Wire upserts BEFORE fragment join table writes (Research Pitfall 5)
- Formation group tagging links sibling fragments with shared fg- prefix group IDs and cross-referencing sibling_fragments arrays

## Task Commits

Each task was committed atomically:

1. **Task 1: Formation pipeline orchestrator + association population** - `b0826b5` (test: RED) -> `9976b58` (feat: GREEN)
2. **Task 2: Recall engine orchestrator** - `a8e9ddf` (test: RED) -> `35dc1f9` (feat: GREEN)

_TDD: Each task had separate RED (failing test) and GREEN (implementation) commits._

## Files Created/Modified
- `modules/reverie/components/formation/formation-pipeline.cjs` - Formation orchestrator: prepareStimulus, processFormationOutput, getFormationStats
- `modules/reverie/components/recall/recall-engine.cjs` - Recall orchestrator: recallPassive, recallExplicit, getRecallStats
- `modules/reverie/components/formation/__tests__/formation-pipeline.test.js` - 9 tests for formation pipeline
- `modules/reverie/components/formation/__tests__/association-population.test.js` - 4 tests for master table population
- `modules/reverie/components/recall/__tests__/recall-engine.test.js` - 8 tests for recall engine

## Decisions Made
- Formation pipeline populates master association tables (domains, entities, attention_tags) via Wire upserts with `upsert: true` flag BEFORE writing fragments, preventing FK gaps per Research Pitfall 5
- Recall engine uses a single shared composite scorer instance for both passive and explicit paths, ensuring consistent ranking per D-12
- Formation group IDs use `fg-` prefix with 8-character hex UUID suffix for uniqueness
- NudgeManager integration is called only when parsed output contains a nudge field

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed frozen object extension in association population tests**
- **Found during:** Task 1 (formation pipeline tests)
- **Issue:** Tests attempted to assign `_wire` property to a frozen pipeline object (Object.freeze prevents extension)
- **Fix:** Removed the unnecessary `Object.assign` that tried to add `_wire` to the frozen return value -- tests already had direct access to the wire mock via closure
- **Files modified:** modules/reverie/components/formation/__tests__/association-population.test.js
- **Verification:** All 13 tests pass
- **Committed in:** 9976b58 (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor test scaffolding fix. No scope creep.

## Issues Encountered
None beyond the test fix above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Formation pipeline and recall engine are ready for Plan 04 (hook wiring + agent definition) to connect to the hook system
- Both orchestrators use options-based DI -- Plan 04 only needs to instantiate them with real service instances from Armature container
- Full Reverie test suite passes (285 tests, 0 failures)

## Self-Check: PASSED

All 5 created files verified on disk. All 4 commit hashes verified in git log.

---
*Phase: 09-fragment-memory-engine*
*Completed: 2026-03-24*
