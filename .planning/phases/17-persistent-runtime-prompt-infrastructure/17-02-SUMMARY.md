---
phase: 17-persistent-runtime-prompt-infrastructure
plan: 02
subsystem: lib
tags: [linotype, prompt-template, composer, validator, barrel-api, token-budgeting]

requires:
  - phase: 17-01
    provides: "Linotype types (Matrix/Slug/Forme), parser (JSON frontmatter), engine (template resolution)"
provides:
  - "Linotype composer: multi-slug composition with separator handling and token budgeting"
  - "Linotype validator: frontmatter schema validation, syntax well-formedness, partial reference checking"
  - "Linotype public API barrel: parse, parseString, cast, compose, validate, inspect"
  - "cast() function bridging Matrix through engine resolve into Slug"
affects: [17-03, 17-04, 17-05, armature-template-contract, circuit-module-api, reverie-context-manager]

tech-stack:
  added: []
  patterns:
    - "Advisory token budget pattern (warn on stderr, do not throw)"
    - "Bill of materials (BOM) pattern: unfrozen debug output for prompt inspection"
    - "Public API barrel delegates to internal modules (parse/engine/composer/validator)"

key-files:
  created:
    - lib/linotype/composer.cjs
    - lib/linotype/validator.cjs
    - lib/linotype/linotype.cjs
    - lib/linotype/linotype.test.cjs
  modified: []

key-decisions:
  - "inspect() returns unfrozen plain object (not Forme) since BOM is debug output, not runtime data"
  - "Budget overage logged to stderr, not thrown, per PRD advisory budget semantics"
  - "cast() computes resolved_slots from Matrix slot keys present in context"

patterns-established:
  - "Advisory budget: compose warns on overrun but never throws (budget is informational)"
  - "BOM inspection: inspect returns unfrozen debug snapshot decoupled from Forme immutability"

requirements-completed: [INF-01]

duration: 4min
completed: 2026-03-29
---

# Phase 17 Plan 02: Linotype Composer, Validator, and Public API Summary

**Linotype public API barrel with compose (multi-slug Forme assembly + token budgeting), validate (Matrix structural checks), cast (Matrix-to-Slug bridge), and inspect (prompt BOM debugging)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-29T04:12:51Z
- **Completed:** 2026-03-29T04:17:11Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Composer assembles multiple Slugs into a Forme with configurable separator and advisory token budgeting
- Validator checks Matrix structural correctness: name/version presence, slot required fields, slot type validity, partial resolution against registry, balanced block directives
- Public API barrel exports all 6 functions: parse, parseString, cast, compose, validate, inspect
- cast() bridges Matrix through engine resolve into frozen Slug with Math.ceil(chars/4) token estimation
- 18 integration tests with 63 assertions covering full pipeline: parseString -> cast -> compose -> inspect

## Task Commits

Each task was committed atomically:

1. **Task 1: Composer and validator modules** - `98f210b` (feat)
2. **Task 2: Linotype public API barrel and integration tests (TDD RED)** - `bef8ecb` (test)
3. **Task 2: Linotype public API barrel (TDD GREEN)** - `578bb12` (feat)

## Files Created/Modified
- `lib/linotype/composer.cjs` - Multi-slug composition with separator handling and advisory token budgeting
- `lib/linotype/validator.cjs` - Matrix structural validation (frontmatter, slots, includes, body syntax)
- `lib/linotype/linotype.cjs` - Public API barrel: parse, parseString, cast, compose, validate, inspect
- `lib/linotype/linotype.test.cjs` - 18 integration tests covering full pipeline and error paths

## Decisions Made
- inspect() returns an unfrozen plain object since BOM is debug output, not runtime data that needs immutability guarantees
- Budget overage is logged to stderr rather than thrown, matching the PRD specification that budget is advisory
- cast() computes resolved_slots by checking which Matrix slot keys have values in the provided context
- Token estimation uses Math.ceil(content.length / 4) per D-17 specification

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created Plan 01 dependency files for parallel execution**
- **Found during:** Task 1 (Composer and validator modules)
- **Issue:** Plan 02 runs in parallel with Plan 01. types.cjs, parser.cjs, and engine.cjs do not exist in this worktree.
- **Fix:** Created Plan 01 files (types.cjs, parser.cjs, engine.cjs) following Plan 01 spec exactly, to provide the interfaces Plan 02 builds upon.
- **Files modified:** lib/linotype/types.cjs, lib/linotype/parser.cjs, lib/linotype/engine.cjs
- **Verification:** All integration tests pass, modules load correctly
- **Committed in:** 98f210b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for parallel execution. Files follow Plan 01 spec exactly and will be reconciled at merge.

## Issues Encountered
None - plan executed as specified after resolving parallel build dependency.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Linotype public API complete: parse, parseString, cast, compose, validate, inspect
- Ready for Wave 3 framework integration (Armature template contract, Circuit module API)
- Template discovery and registration (Armature) can now consume Linotype for parsing and validation
- Context Manager can migrate from function-based prompts to Linotype templates

## Self-Check: PASSED

- [x] lib/linotype/composer.cjs: FOUND
- [x] lib/linotype/validator.cjs: FOUND
- [x] lib/linotype/linotype.cjs: FOUND
- [x] lib/linotype/linotype.test.cjs: FOUND
- [x] Commit 98f210b: FOUND
- [x] Commit bef8ecb: FOUND
- [x] Commit 578bb12: FOUND

---
*Phase: 17-persistent-runtime-prompt-infrastructure*
*Completed: 2026-03-29*
