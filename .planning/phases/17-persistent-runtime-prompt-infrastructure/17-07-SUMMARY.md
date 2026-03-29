---
phase: 17-persistent-runtime-prompt-infrastructure
plan: 07
subsystem: prompts
tags: [linotype, templates, formation, recall, backfill, markdown]

requires:
  - phase: 17-02
    provides: Linotype library (parse, parseString, cast, compose)
  - phase: 17-06
    provides: Template registry and module lifecycle in Circuit
provides:
  - 8 Linotype markdown template files for formation/recall/backfill prompts
  - Thin Linotype loader replacing string-literal prompt-templates.cjs
  - Template directory declaration in Reverie manifest
affects: [17-08, 17-09, 17-10]

tech-stack:
  added: []
  patterns: [D-09 hybrid pattern for function-based prompts, system-only templates with code-retained user logic]

key-files:
  created:
    - modules/reverie/prompts/formation-attention-check.md
    - modules/reverie/prompts/formation-domain-id.md
    - modules/reverie/prompts/formation-body-system.md
    - modules/reverie/prompts/formation-body-user.md
    - modules/reverie/prompts/formation-meta-recall.md
    - modules/reverie/prompts/recall-passive-nudge.md
    - modules/reverie/prompts/recall-explicit.md
    - modules/reverie/prompts/formation-backfill.md
  modified:
    - modules/reverie/components/formation/prompt-templates.cjs
    - modules/reverie/manifest.cjs

key-decisions:
  - "System-only templates for prompts with static system strings; user() logic stays in code per D-09 hybrid"
  - "Literal {user_name} preserved in body-system and backfill templates (LLM-directed placeholder, not code-resolved)"
  - "body_composition.user() calls linotype.cast() for template-driven user prompt with conditionals/iteration"

patterns-established:
  - "System-only template pattern: template file holds system prompt, user() function retains context preparation"
  - "Template Matrices loaded synchronously via parseString at module require time"

requirements-completed: [MOD-01]

duration: 7min
completed: 2026-03-29
---

# Phase 17 Plan 07: Formation/Recall/Backfill Prompt Extraction Summary

**8 formation/recall/backfill prompt string literals extracted to Linotype markdown templates with D-09 hybrid loader pattern**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-29T04:36:53Z
- **Completed:** 2026-03-29T04:44:04Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Extracted all 8 formation, recall, and backfill prompt string literals to Linotype markdown template files in modules/reverie/prompts/
- Rewrote prompt-templates.cjs from 464-line string-literal module to thin Linotype loader with no string literals > 100 chars
- Maintained 100% backward compatibility -- all 71 formation tests + 57 spec validation tests pass unchanged
- Added templates section to Reverie manifest for namespace registration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create formation and recall prompt template files** - `853f8b6` (feat) [reverie submodule]
2. **Task 2: Rewrite prompt-templates.cjs as thin Linotype loader** - `d4f5796` (feat) [reverie submodule]

**Submodule update:** `14100a9` (chore: update reverie submodule)

## Files Created/Modified
- `modules/reverie/prompts/formation-attention-check.md` - Gate 2 attention check system prompt template
- `modules/reverie/prompts/formation-domain-id.md` - Domain identification system prompt template
- `modules/reverie/prompts/formation-body-system.md` - Body composition system prompt (literal {user_name})
- `modules/reverie/prompts/formation-body-user.md` - Body composition user prompt with {{#if}}/{{#each}} conditionals
- `modules/reverie/prompts/formation-meta-recall.md` - Meta-recall reflection system prompt template
- `modules/reverie/prompts/recall-passive-nudge.md` - Passive recall nudge system prompt template
- `modules/reverie/prompts/recall-explicit.md` - Explicit reconstruction system prompt template
- `modules/reverie/prompts/formation-backfill.md` - Backfill formation system prompt (literal {user_name})
- `modules/reverie/components/formation/prompt-templates.cjs` - Rewritten as thin Linotype loader
- `modules/reverie/manifest.cjs` - Added templates: { directory: 'prompts', namespace: 'reverie' }

## Decisions Made
- System-only templates for 7 of 8 prompts -- the system string is static text loaded from the template, user() functions retain their context preparation logic in code per D-09 hybrid pattern
- Literal `{user_name}` (single braces) preserved in body-system.md and formation-backfill.md -- these are LLM-directed placeholders that the formation agent interprets, not Linotype template variables
- body_composition.user() uses linotype.cast() on formation-body-user.md with prepared context -- this is the one user function fully driven by a template, demonstrating the conditional/iteration capabilities
- Templates loaded synchronously at module require time via parseString (not async parse) since files are local

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed template body structure for backward compatibility**
- **Found during:** Task 1 (template creation)
- **Issue:** Initial template design combined system+user sections in single template body separated by `---`. This produced a single cast output rather than the separate system/user properties consumers expect.
- **Fix:** Restructured templates to contain system prompt only (7 templates) or user prompt only (1 template). User() functions retain code logic per D-09 hybrid pattern.
- **Files modified:** All 8 template files
- **Verification:** 71 formation tests + 57 spec tests pass
- **Committed in:** 853f8b6, d4f5796

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Architectural correction to match D-09 hybrid pattern. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all templates produce complete output matching original string literals.

## Next Phase Readiness
- 8 formation/recall/backfill templates ready for template registry integration (Plan 08)
- Remaining Reverie prompts (referential framing, REM quality, sublimation, editorial, face) targeted by Plan 08
- Template namespace 'reverie' declared in manifest for Circuit template registry

## Self-Check: PASSED

- All 10 created/modified files verified present on disk
- Reverie submodule commits 853f8b6 (Task 1) and d4f5796 (Task 2) confirmed
- Parent repo commit 14100a9 (submodule update) confirmed
- 71 formation tests + 57 spec validation tests pass (128 total, 0 failures)

---
*Phase: 17-persistent-runtime-prompt-infrastructure*
*Completed: 2026-03-29*
