---
phase: 17-persistent-runtime-prompt-infrastructure
plan: 06
subsystem: framework, sdk
tags: [linotype, armature, circuit, template-registry, module-lifecycle, daemon]

requires:
  - phase: 17-02
    provides: "Linotype library (parse, cast, compose, validate, inspect)"
  - phase: 17-05
    provides: "Exciter dispatchHook method for daemon hook routing"
provides:
  - "Armature template validation contracts (validateTemplateFrontmatter, TEMPLATE_SLOT_TYPES, TEMPLATE_CONTRACT_SHAPE)"
  - "Circuit template registry (registerTemplates, getTemplate, castTemplate, listTemplates)"
  - "Circuit module lifecycle (enableModule, disableModule)"
  - "Daemon /module/enable and /module/disable wired through Circuit"
affects: [17-07, 17-08, reverie-templates, module-enable-flow]

tech-stack:
  added: []
  patterns: ["Armature contract -> Circuit registry -> Linotype parse pipeline", "Daemon endpoint delegation to Circuit when available with fallback"]

key-files:
  created:
    - core/armature/template-contracts.cjs
    - core/sdk/circuit/template-registry.cjs
    - core/armature/__tests__/template-contracts.test.js
    - core/sdk/circuit/__tests__/template-registry.test.js
  modified:
    - core/sdk/circuit/circuit.cjs
    - core/daemon-server.cjs
    - core/daemon-server.test.cjs

key-decisions:
  - "Template registry uses Map<namespacedName, Matrix> for O(1) lookup"
  - "Cross-registry include resolution runs after all templates in a batch are registered"
  - "Daemon module handlers delegate to Circuit when available, fallback to simple state tracking for pre-bootstrap"
  - "v1 single-module clear() clears all templates; future multi-module would scope by namespace"

patterns-established:
  - "Framework contract -> SDK registry -> lib parse pipeline for template validation"
  - "Daemon endpoint delegation pattern: try Circuit first, fallback to simple state tracking"

requirements-completed: [INF-01, MOD-01]

duration: 4min
completed: 2026-03-29
---

# Phase 17 Plan 06: Template Contracts, Registry, and Module Lifecycle Summary

**Armature template validation contracts, Circuit namespaced template registry with Linotype integration, and daemon module lifecycle wired through Circuit SDK**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-29T04:29:35Z
- **Completed:** 2026-03-29T04:34:29Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Armature defines template frontmatter validation contract with slot type checking
- Circuit provides namespaced template registry with parse-time validation, cast shorthand, and include resolution
- Daemon module enable/disable endpoints delegate to Circuit lifecycle when available
- 245 tests passing across armature, circuit, and daemon-server (81 new)

## Task Commits

Each task was committed atomically:

1. **Task 1: Armature template contracts and Circuit template registry** - `0da0718` (feat)
2. **Task 2: Circuit SDK integration and daemon module lifecycle** - `9dae8e3` (feat)

## Files Created/Modified
- `core/armature/template-contracts.cjs` - Armature-level template frontmatter validation contract (validateTemplateFrontmatter, TEMPLATE_SLOT_TYPES, TEMPLATE_CONTRACT_SHAPE)
- `core/sdk/circuit/template-registry.cjs` - Namespaced template registry with registerTemplates, getTemplate, hasTemplate, castTemplate, listTemplates, clear
- `core/armature/__tests__/template-contracts.test.js` - 21 tests for contract validation
- `core/sdk/circuit/__tests__/template-registry.test.js` - 19 tests for registry operations
- `core/sdk/circuit/circuit.cjs` - Added template registry creation, registerTemplates/getTemplate/castTemplate/listTemplates, enableModule/disableModule
- `core/daemon-server.cjs` - Module enable/disable handlers delegate to Circuit, health includes module_count and has_instance
- `core/daemon-server.test.cjs` - Added 4 tests for Circuit-wired module lifecycle and enriched health

## Decisions Made
- Template registry uses Map<namespacedName, Matrix> for O(1) lookup with namespace:name keys
- Cross-registry include resolution runs post-batch to allow inter-template references within a module
- Daemon module handlers delegate to Circuit when available, fall back to simple state tracking for pre-bootstrap mode
- v1 single-module: clear() empties all templates; future multi-module would clear only the module's namespace
- enableModule searches modules/ directory as fallback when armature.getModuleManifest is unavailable

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Template test expected contract validation error but Linotype parser threw first**
- **Found during:** Task 1
- **Issue:** Test for invalid frontmatter used a template missing name/version, but Linotype parser validates these at parse time before contract validation runs
- **Fix:** Split into two tests: one for Linotype parse errors (missing name/version) and one for contract violations (invalid slot type)
- **Files modified:** core/sdk/circuit/__tests__/template-registry.test.js
- **Verification:** Both tests pass, covering both validation layers
- **Committed in:** 0da0718 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor test adjustment. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Template infrastructure complete from framework contracts through SDK registry to Linotype resolution
- Module lifecycle endpoints operational through Circuit delegation
- Ready for Plan 07 to add Reverie template directory and register templates on module enable

---
*Phase: 17-persistent-runtime-prompt-infrastructure*
*Completed: 2026-03-29*
