---
phase: 17-persistent-runtime-prompt-infrastructure
plan: 08
subsystem: module-reverie
tags: [linotype, prompt-templates, referential-framing, rem, sublimation, face-prompt]

requires:
  - phase: 17-02
    provides: Linotype library (parser, engine, composer, validator, public API)
  - phase: 17-06
    provides: Template contracts, template registry, module lifecycle integration
provides:
  - 7 markdown template files for remaining Reverie prompts (framing, REM, sublimation, face prompt)
  - 5 source files updated to load prompts via Linotype instead of string literals
  - Total 15 prompt templates in modules/reverie/prompts/ (combined with Plan 07)
affects: [17-09, 17-10]

tech-stack:
  added: []
  patterns:
    - "D-09 hybrid pattern: data formatting stays in code, template structure loaded via Linotype"
    - "Template loading at module init via parseString for zero-IO hot path"

key-files:
  created:
    - modules/reverie/prompts/framing-full.md
    - modules/reverie/prompts/framing-dual.md
    - modules/reverie/prompts/framing-soft.md
    - modules/reverie/prompts/rem-quality-eval.md
    - modules/reverie/prompts/rem-editorial.md
    - modules/reverie/prompts/sublimation-system.md
    - modules/reverie/prompts/face-prompt.md
  modified:
    - modules/reverie/components/context/referential-framing.cjs
    - modules/reverie/components/rem/quality-evaluator.cjs
    - modules/reverie/components/rem/editorial-pass.cjs
    - modules/reverie/components/session/sublimation-loop.cjs
    - modules/reverie/components/context/context-manager.cjs

key-decisions:
  - "Framing templates have zero slots -- static content resolved at module init via cast with empty context"
  - "Editorial pass uses D-09 hybrid pattern: entity/domain/assoc data formatted in code, template provides structural sections with conditionals"
  - "Sublimation system prompt slots are all string type -- numeric values cast to String() for Linotype variable substitution"
  - "Face prompt template uses {{#if}} for optional sections and {{#each}} for recall products array"

patterns-established:
  - "Linotype template loading pattern: _loadTemplate(filename) via fs.readFileSync + parseString at module scope"
  - "Conditional template sections via has_* boolean flags passed as truthy/empty strings to {{#if}}"

requirements-completed: [MOD-01]

duration: 7min
completed: 2026-03-29
---

# Phase 17 Plan 08: Remaining Prompt Extraction Summary

**7 remaining Reverie prompts (3 framing, quality eval, editorial, sublimation, face prompt) extracted to Linotype templates with 5 source files updated to use cast-based loading**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-29T04:37:32Z
- **Completed:** 2026-03-29T04:44:57Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Created 7 markdown template files completing prompt extraction (15 total with Plan 07)
- Updated 5 source files to load templates via Linotype instead of containing string literals
- All 113 affected tests pass with zero regressions (1386/1387 full suite, 1 pre-existing failure)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create framing, REM, sublimation, and face prompt templates** - `f59205a` (feat) / submodule `2ae9f00`
2. **Task 2: Update source files to use Linotype templates** - `fa50122` (feat) / submodule `1823851`

## Files Created/Modified
- `modules/reverie/prompts/framing-full.md` - Full referential framing mode (zero slots, static XML-tagged content)
- `modules/reverie/prompts/framing-dual.md` - Dual framing mode (relational deference + technical autonomy)
- `modules/reverie/prompts/framing-soft.md` - Soft framing mode (minimal suggestion)
- `modules/reverie/prompts/rem-quality-eval.md` - LLM reflection prompt for session quality (2 slots: session_summary, conditioning_context)
- `modules/reverie/prompts/rem-editorial.md` - Editorial pass prompt with 4 core + 3 optional governance sections (10 slots)
- `modules/reverie/prompts/sublimation-system.md` - Tertiary sublimation cycle instructions (5 slots)
- `modules/reverie/prompts/face-prompt.md` - Face prompt assembly with optional sections (4 slots)
- `modules/reverie/components/context/referential-framing.cjs` - Loads 3 framing matrices, casts at init
- `modules/reverie/components/rem/quality-evaluator.cjs` - Loads quality eval matrix, casts in composeLlmReflectionPrompt
- `modules/reverie/components/rem/editorial-pass.cjs` - Loads editorial matrix, casts with pre-formatted context
- `modules/reverie/components/session/sublimation-loop.cjs` - Loads sublimation matrix, casts in _buildSystemPrompt
- `modules/reverie/components/context/context-manager.cjs` - Loads face-prompt matrix

## Decisions Made
- Framing templates have zero dynamic slots -- content is static XML-tagged text resolved once at module init. This matches the original pattern where FRAMING_TEMPLATES was a frozen object of static strings.
- Editorial pass uses D-09 hybrid pattern: entity, domain, and association data is formatted into strings in JavaScript code (the complex mapping/joining logic), then passed as pre-formatted strings to the template. Template provides structural sections with {{#if}} conditionals for optional governance sections.
- Sublimation system prompt slots are all string type -- numeric config values (sensitivity_threshold, cycle_ms, etc.) are cast to String() before passing to Linotype, since variable substitution always produces strings.
- Face prompt template provides the assembly structure for combining identity_core with optional behavioral_directives, recall_products array, and referential_frame.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing test failure in spec-platform.test.cjs (strict mode check on core/daemon.cjs shebang line and core/services/conductor/session-spawner.cjs double-quote strict mode). Not caused by this plan's changes, not in scope to fix.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 15 Reverie prompts now in modules/reverie/prompts/ as Linotype templates
- Zero string-literal prompts remain in Reverie .cjs source files
- Template registry integration (from Plan 06) ready to register these templates at module boot
- Plans 09 and 10 (Wave 5) can build on full Linotype integration

## Self-Check: PASSED

- All 7 template files exist in modules/reverie/prompts/
- All 5 modified source files exist
- Commits f59205a and fa50122 verified in git log
- SUMMARY.md created at correct path

---
*Phase: 17-persistent-runtime-prompt-infrastructure*
*Completed: 2026-03-29*