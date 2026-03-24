---
phase: 07-foundation-infrastructure
plan: 03
subsystem: database, validation
tags: [zod, duckdb, decay, association-index, fragment-schema, self-model]

requires:
  - phase: 07-foundation-infrastructure/01
    provides: "Module skeleton, constants.cjs (FRAGMENT_TYPES, DECAY_DEFAULTS, FRAGMENT_ID_PATTERN)"
provides:
  - "Zod schemas for all 5 fragment types with type-specific refinements"
  - "validateFragment() dispatcher function returning Result-compatible output"
  - "Self Model schemas for identity-core, relational-model, conditioning"
  - "12-table DuckDB association index DDL (idempotent)"
  - "Deterministic decay function (computeDecay, shouldArchive)"
affects: [08-hook-wiring, 09-fragment-engine, 11-rem-consolidation, 12-integration]

tech-stack:
  added: [zod-4.3.6]
  patterns: [zod-module-level-validation, options-based-di-for-duckdb, deterministic-decay-formula]

key-files:
  created:
    - modules/reverie/lib/schemas.cjs
    - modules/reverie/components/fragments/association-index.cjs
    - modules/reverie/components/fragments/decay.cjs
    - modules/reverie/components/fragments/__tests__/fragment-schema.test.js
    - modules/reverie/components/fragments/__tests__/association-index.test.js
    - modules/reverie/components/fragments/__tests__/decay.test.js
  modified: []

key-decisions:
  - "Zod 4 requires z.record(z.string(), valueSchema) -- adapted from plan's z.record(valueSchema) for Zod 4 compatibility"
  - "validateFragment() returns { ok, value/error } Result-compatible format wrapping safeParse"
  - "DDL_STATEMENTS array is Object.freeze'd for immutability, separate from init() execution"

patterns-established:
  - "Zod for module-level validation (not lib/schema.cjs which is platform-level)"
  - "Options-based DI for DuckDB connection injection: createAssociationIndex({ connection })"
  - "Deterministic computation functions take (data, config={}) with defaults from constants"

requirements-completed: [FRG-01, FRG-02, FRG-05, FRG-06]

duration: 5min
completed: 2026-03-24
---

# Phase 07 Plan 03: Fragment Schemas, Association Index, and Decay Summary

**Zod 4 schemas for 5 fragment types with type-specific refinements, 12-table DuckDB association index DDL, and deterministic decay function with archive threshold**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-24T03:21:30Z
- **Completed:** 2026-03-24T03:26:52Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Zod schemas validate all 5 fragment types with meta-recall requiring source_fragments and source-reference requiring source_locator
- 12-table association index DDL with correct column types (VARCHAR IDs, INTEGER counts, DOUBLE weights) avoiding BigInt serialization pitfall
- Deterministic decay function computing fragment survival via exponential time decay, logarithmic access bonus, consolidation protection, and relevance weighting
- validateFragment() dispatcher routing to correct type-specific schema with Result-compatible output
- Self Model schemas for identity-core, relational-model, and conditioning aspects

## Task Commits

Each task was committed atomically (TDD: test then feat):

1. **Task 1: Create zod schemas for all 5 fragment types and Self Model aspects**
   - `0fe53d7` (test) — Failing tests for fragment and Self Model zod schemas
   - `a5ec64d` (feat) — Implement zod schemas for 5 fragment types and 3 Self Model aspects

2. **Task 2: Create association index DDL and deterministic decay function**
   - `c979ff1` (test) — Failing tests for association index and decay function
   - `a01c196` (feat) — Implement association index DDL and deterministic decay function

## Files Created/Modified
- `modules/reverie/lib/schemas.cjs` — Zod schemas for all fragment types, Self Model aspects, and validateFragment() dispatcher
- `modules/reverie/components/fragments/association-index.cjs` — 12-table DuckDB DDL with createAssociationIndex() factory
- `modules/reverie/components/fragments/decay.cjs` — computeDecay() and shouldArchive() with DECAY_DEFAULTS re-export
- `modules/reverie/components/fragments/__tests__/fragment-schema.test.js` — 17 tests for schema validation
- `modules/reverie/components/fragments/__tests__/association-index.test.js` — 7 tests for DDL creation and column types
- `modules/reverie/components/fragments/__tests__/decay.test.js` — 10 tests for decay computation and archival

## Decisions Made
- **Zod 4 z.record() API**: Zod 4 requires `z.record(z.string(), valueSchema)` instead of `z.record(valueSchema)`. Adapted all Self Model schemas accordingly. This was an auto-fix (Rule 3 - blocking) since the plan's code example used Zod 3 syntax.
- **validateFragment() output format**: Returns `{ ok: true, value }` / `{ ok: false, error }` wrapping Zod's `safeParse()` result. This aligns with the platform's Result type pattern without depending on lib/result.cjs directly.
- **DDL as frozen array**: DDL statements stored in a `DDL_STATEMENTS` frozen array, iterated by `init()`. This separates schema definition from execution and makes the table list inspectable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Zod 4 z.record() API**
- **Found during:** Task 1 (Schema implementation)
- **Issue:** Plan specified `z.record(z.number())` and `z.record(z.any())` which is Zod 3 syntax. Zod 4 requires explicit key type.
- **Fix:** Changed to `z.record(z.string(), z.number())` and `z.record(z.string(), z.any())`
- **Files modified:** modules/reverie/lib/schemas.cjs
- **Verification:** All 17 schema tests pass
- **Committed in:** a5ec64d (part of Task 1 feat commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Zod 4 API difference required trivial syntax adjustment. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Fragment schemas ready for use by fragment CRUD operations (Phase 9)
- Association index DDL ready for Ledger initialization during module boot
- Decay function ready for fragment lifecycle management
- Self Model schemas ready for Self Model component (Phase 8)
- All 34 tests passing across 3 test files

## Self-Check: PASSED

- All 6 created files exist on disk
- All 4 task commits found in git log (0fe53d7, a5ec64d, c979ff1, a01c196)
- 34 tests pass across 3 test files

---
*Phase: 07-foundation-infrastructure*
*Completed: 2026-03-24*
