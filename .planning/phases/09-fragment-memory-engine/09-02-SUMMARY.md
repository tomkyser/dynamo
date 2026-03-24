---
phase: 09-fragment-memory-engine
plan: 02
subsystem: recall
tags: [composite-scoring, assay-query, reconstruction-prompt, recall-engine, fragment-ranking]

# Dependency graph
requires:
  - phase: 07-foundation-infrastructure
    provides: "Fragment schema, constants, decay function, association index"
  - phase: 03.2-assay
    provides: "Assay federated search service with criteria and SQL query support"
provides:
  - "Composite scorer with 6-factor weighted ranking (createCompositeScorer)"
  - "Assay-compatible query builder for passive and explicit recall (createQueryBuilder)"
  - "Reconstruction prompt templates for passive nudge and explicit recall (createReconstructionPrompt)"
affects: [09-03-recall-engine-orchestrator, 09-04-hook-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Deterministic composite scoring with configurable weight overrides"
    - "Dual-mode query construction (passive tight filter vs explicit broad filter)"
    - "Reconstruction framing via subjective/relational prompt engineering"

key-files:
  created:
    - modules/reverie/components/recall/composite-scorer.cjs
    - modules/reverie/components/recall/query-builder.cjs
    - modules/reverie/components/recall/reconstruction-prompt.cjs
    - modules/reverie/components/recall/__tests__/composite-scorer.test.js
    - modules/reverie/components/recall/__tests__/query-builder.test.js
    - modules/reverie/components/recall/__tests__/reconstruction-prompt.test.js
  modified: []

key-decisions:
  - "Self Model relevance uses fixed aspect weights (identity: 0.3, relational: 0.5, conditioning: 0.2) matching DECAY_DEFAULTS.relevance_weights"
  - "Temporal proximity uses exponential decay (e^(-0.1 * days)) for smooth same-day-to-weeks-old gradient"
  - "Passive nudge instructs invisible shading (no 'I remember' language) while explicit reconstruction drives full re-experiencing"

patterns-established:
  - "Recall component factory pattern: createX(options) returning Object.freeze({...methods})"
  - "Passive vs explicit query differentiation via decay threshold (0.3 vs 0.1) and candidate limit (20 vs 50)"

requirements-completed: [FRG-04]

# Metrics
duration: 5min
completed: 2026-03-24
---

# Phase 9 Plan 2: Recall Engine Components Summary

**Composite scorer with 6-factor weighted ranking, dual-mode Assay query builder, and reconstruction prompts framed as subjective re-experiencing**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-24T17:16:07Z
- **Completed:** 2026-03-24T17:22:01Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Deterministic 6-factor composite scoring engine using pre-computed fragment.decay.current_weight (not calling computeDecay at scoring time)
- Assay-compatible query builder generating passive (5 results, weight > 0.3) and explicit (15 results, weight > 0.1) recall queries per D-11/D-12
- Reconstruction prompts that frame recall as re-experiencing (D-04) with passive nudge shading (D-11) and explicit Self Model-framed reconstruction (Research Pitfall 4)
- 31 tests across 3 test files, all passing with 0 failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Composite scorer + query builder** - `cd2d973` (feat) - 21 tests
2. **Task 2: Reconstruction prompt module** - `7fd8d3f` (feat) - 10 tests

## Files Created/Modified
- `modules/reverie/components/recall/composite-scorer.cjs` - 6-factor weighted scoring with compositeScore() and rankFragments()
- `modules/reverie/components/recall/query-builder.cjs` - Assay query construction for passive and explicit recall paths
- `modules/reverie/components/recall/reconstruction-prompt.cjs` - Prompt templates for passive nudge and explicit reconstruction
- `modules/reverie/components/recall/__tests__/composite-scorer.test.js` - 11 tests covering scoring, ranking, custom weights, edge cases
- `modules/reverie/components/recall/__tests__/query-builder.test.js` - 10 tests covering both query types and extractQueryContext
- `modules/reverie/components/recall/__tests__/reconstruction-prompt.test.js` - 10 tests covering both modes, null returns, content verification

## Decisions Made
- Self Model relevance factor uses the same aspect weights as DECAY_DEFAULTS.relevance_weights (identity: 0.3, relational: 0.5, conditioning: 0.2) for consistency across the system
- Temporal proximity decay rate set to 0.1 per day (e^(-0.1 * days)), giving same-day fragments ~1.0 and week-old fragments ~0.5
- Passive nudge prompt explicitly forbids "I remember" language to enforce invisible shading per D-11
- Explicit reconstruction prompt includes Self Model identity and relational summaries as framing context

## Deviations from Plan

None - plan executed exactly as written. SCORING_DEFAULTS constant was already present in constants.cjs (added by parallel Plan 01 execution).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all three modules are fully wired with production logic and validated tests.

## Next Phase Readiness
- All three recall components ready for consumption by recall engine orchestrator (Plan 03)
- Both passive and explicit recall paths use the same composite scoring engine per D-12
- Reconstruction prompts designed for replaceability per D-16/D-17

## Self-Check: PASSED

All 6 created files verified present. Both task commits (cd2d973, 7fd8d3f) verified in git log.

---
*Phase: 09-fragment-memory-engine*
*Completed: 2026-03-24*
