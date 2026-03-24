---
phase: 09-fragment-memory-engine
plan: 01
subsystem: memory
tags: [formation, attention-gate, nudge-manager, prompt-templates, fragment-assembler, reverie, zod]

# Dependency graph
requires:
  - phase: 07-foundation-infrastructure
    provides: Fragment schemas (Zod validation), constants, FragmentWriter, Self Model
  - phase: 08-single-session-personality-injection
    provides: Context Manager contract, hook handlers, template composer
provides:
  - Formation pipeline component modules (attention-gate, prompt-templates, fragment-assembler, nudge-manager)
  - Extended constants (SCORING_DEFAULTS, FORMATION_DEFAULTS, NUDGE_DEFAULTS)
  - Replaceable cognition layer via prompt templates per D-16
affects: [09-02, 09-03, 09-04, 11-rem-consolidation]

# Tech tracking
tech-stack:
  added: []
  patterns: [replaceable-prompt-template-layer, filesystem-coordination-bus, heuristic-gate-pattern, emergent-type-classification]

key-files:
  created:
    - modules/reverie/components/formation/attention-gate.cjs
    - modules/reverie/components/formation/prompt-templates.cjs
    - modules/reverie/components/formation/fragment-assembler.cjs
    - modules/reverie/components/formation/nudge-manager.cjs
    - modules/reverie/components/formation/__tests__/attention-gate.test.js
    - modules/reverie/components/formation/__tests__/nudge-manager.test.js
    - modules/reverie/components/formation/__tests__/fragment-assembler.test.js
  modified:
    - modules/reverie/lib/constants.cjs

key-decisions:
  - "Temporal schema mapped to actual Zod fields (absolute/session_relative/sequence) not plan approximation (session_start/session_position/turn_number)"
  - "Associations schema includes emotional_valence per actual Zod schema (plan interface block omitted this field)"
  - "Attention gate pure_tool_turn check prioritized over empty_prompt when tools_used is populated and user_prompt is falsy"

patterns-established:
  - "Replaceable cognition layer: prompt-templates.cjs is THE file to change for formation behavior per D-16"
  - "Filesystem coordination bus: nudge-manager writes/reads nudge files, Context Manager consumes them"
  - "Heuristic gate pattern: code-based Gate 1 (attention-gate.cjs) filters before LLM-based Gate 2"
  - "Emergent type classification: fragment type labeled post-formation based on output, not prescribed before"

requirements-completed: [FRG-03]

# Metrics
duration: 6min
completed: 2026-03-24
---

# Phase 09 Plan 01: Formation Pipeline Components Summary

**Four formation component modules with subjective/relational prompt templates, heuristic attention gating, filesystem nudge coordination, and schema-valid fragment assembly -- 28 tests passing**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-24T17:16:07Z
- **Completed:** 2026-03-24T17:22:31Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Attention gate filters low-significance stimuli (empty, too short, pure tool turns) with configurable thresholds
- Prompt templates implement the full subjective/relational cognition layer per D-04 through D-07 with *you*/*{user_name}* framing across 4 formation stages and 2 reconstruction stages
- Fragment assembler reliably parses JSON from raw text or markdown code blocks and builds schema-valid frontmatter that passes Zod validation with emergent type classification per D-14
- Nudge manager provides filesystem coordination bus with staleness detection for asynchronous formation-to-context communication
- Constants extended with SCORING_DEFAULTS (6 weights summing to 1.0), FORMATION_DEFAULTS (min_prompt_length, max_fragments_per_stimulus), and NUDGE_DEFAULTS (max_nudge_age_ms, max_nudge_tokens)

## Task Commits

Each task was committed atomically:

1. **Task 1: Formation constants + attention gate + nudge manager** - `de6e9a2` (feat)
2. **Task 2: Prompt templates + fragment assembler** - `3af01a5` (feat)

## Files Created/Modified
- `modules/reverie/lib/constants.cjs` - Extended with FORMATION_DEFAULTS, NUDGE_DEFAULTS (SCORING_DEFAULTS already present)
- `modules/reverie/components/formation/attention-gate.cjs` - Heuristic stimulus gate with configurable min prompt length
- `modules/reverie/components/formation/prompt-templates.cjs` - Replaceable cognition layer with 6 prompt templates (4 formation + 2 reconstruction)
- `modules/reverie/components/formation/fragment-assembler.cjs` - JSON parsing from raw/markdown + schema-valid frontmatter building
- `modules/reverie/components/formation/nudge-manager.cjs` - Filesystem nudge read/write with staleness detection
- `modules/reverie/components/formation/__tests__/attention-gate.test.js` - 8 attention gate test cases
- `modules/reverie/components/formation/__tests__/nudge-manager.test.js` - 7 nudge manager test cases
- `modules/reverie/components/formation/__tests__/fragment-assembler.test.js` - 13 fragment assembler test cases

## Decisions Made
- **Temporal schema mapping:** The plan's interface block described temporal fields as `session_start/session_position/turn_number`, but the actual Zod schema uses `absolute/session_relative/sequence`. buildFrontmatter maps context fields to the actual schema field names for validation compliance.
- **Emotional valence included:** The plan's interface block omitted `emotional_valence` from the associations schema, but the actual Zod schema requires it. buildFrontmatter populates it from fragmentData (default 0).
- **Gate priority ordering:** When user_prompt is falsy AND tools_used is populated, the attention gate returns `pure_tool_turn` rather than `empty_prompt` to provide more specific filtering information.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reconciled plan interface with actual Zod schema for temporal and associations**
- **Found during:** Task 2 (fragment assembler buildFrontmatter)
- **Issue:** Plan described temporal as `{ session_start, session_position, turn_number }` but actual schema is `{ absolute, session_relative, sequence }`. Plan omitted `emotional_valence` from associations.
- **Fix:** Built frontmatter to match the actual Zod schema fields. Added emotional_valence with default 0.
- **Files modified:** modules/reverie/components/formation/fragment-assembler.cjs
- **Verification:** buildFrontmatter output passes validateFragment() in tests
- **Committed in:** 3af01a5

---

**Total deviations:** 1 auto-fixed (1 bug -- schema mismatch between plan description and actual code)
**Impact on plan:** Essential for correctness. Without reconciliation, all fragments would fail Zod validation.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 formation component modules ready for consumption by the formation pipeline orchestrator (Plan 03)
- Prompt templates are the replaceable cognition layer -- formation behavior changes require only template edits per D-16
- 28 new tests passing, 264 total Reverie tests passing (0 failures)
- Constants available for recall engine (Plan 02: SCORING_DEFAULTS) and formation pipeline (Plan 03: FORMATION_DEFAULTS, NUDGE_DEFAULTS)

## Self-Check: PASSED

- All 8 files verified present on disk
- Commit de6e9a2 verified in git log
- Commit 3af01a5 verified in git log
- 28 formation tests passing, 264 total Reverie tests passing (0 failures)

---
*Phase: 09-fragment-memory-engine*
*Completed: 2026-03-24*
