---
phase: 06-bootstrap-integration-fixes
plan: 01
subsystem: infra
tags: [bootstrap, dependency-injection, lifecycle, IoC, topological-sort]

# Dependency graph
requires:
  - phase: 04-framework
    provides: Container, lifecycle manager, Kahn's algorithm boot ordering
  - phase: 02-foundational-services
    provides: Magnet state management, Forge git operations
provides:
  - Corrected deps[] declarations for all 8 service/provider registrations in core.cjs
  - Magnet auto-wired json-provider via lathe + statePath injection
  - forge.pull() method for git pull operations
affects: [06-02, sdk-integration, bootstrap]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "deps[] must mirror mapDeps keys for correct Kahn's algorithm boot ordering"
    - "Lazy require inside init() for optional provider wiring (avoids circular deps)"

key-files:
  created: []
  modified:
    - core/core.cjs
    - core/services/magnet/magnet.cjs
    - core/services/forge/forge.cjs
    - core/services/forge/__tests__/forge.test.js

key-decisions:
  - "Lazy require for json-provider inside Magnet init() prevents circular dependency at module load time"
  - "forge.pull() added as optional contract method (not required) since not all deployments need pull"

patterns-established:
  - "deps[] coverage rule: every key in mapDeps MUST appear in deps[] for correct topological boot order"

requirements-completed: [SVC-09, SVC-03, SVC-05, INF-02]

# Metrics
duration: 3min
completed: 2026-03-23
---

# Phase 06 Plan 01: Bootstrap Integration Fixes Summary

**Corrected deps[] boot-order declarations for 8 registrations, wired Magnet json-provider via lathe+statePath injection, added forge.pull() method**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-23T19:23:45Z
- **Completed:** 2026-03-23T19:26:19Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Fixed all 8 service/provider registrations in core.cjs so deps[] arrays include every mapDeps key, enabling correct topological boot ordering via Kahn's algorithm
- Wired Magnet persistence by auto-creating json-provider when lathe and statePath are injected via lifecycle (lazy require to avoid circular deps)
- Implemented forge.pull() as optional contract method using existing _runGit pattern, unblocking the platform update command path

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix deps[] declarations in core.cjs and wire Magnet persistence** - `1a143d2` (fix)
2. **Task 2: Implement forge.pull() method** - `61ee486` (feat)

## Files Created/Modified
- `core/core.cjs` - Corrected deps[] for magnet, conductor, forge, relay, wire, assay, ledger, journal; added mapDeps and config for magnet lathe+statePath
- `core/services/magnet/magnet.cjs` - Auto-create json-provider in init() when lathe+statePath injected; backward-compatible else branch for explicit provider
- `core/services/forge/forge.cjs` - Added pull() function and 'pull' to FORGE_SHAPE.optional and impl object
- `core/services/forge/__tests__/forge.test.js` - Added 4 pull() tests: method exists, GIT_FAILED on no remote, optional args, default pull

## Decisions Made
- Lazy require for json-provider inside Magnet init() prevents circular dependency at module load time while keeping the wiring automatic
- forge.pull() placed in optional[] (not required[]) since pull is not essential for all Forge use cases
- Test variable name corrected from plan's `forgeInstance` to `forge` to match existing test file conventions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected test variable name from forgeInstance to forge**
- **Found during:** Task 2 (forge.pull() tests)
- **Issue:** Plan specified `forgeInstance.pull` in test code but existing forge.test.js uses `forge` as the variable name
- **Fix:** Used `forge.pull` in all test assertions to match existing test file conventions
- **Files modified:** core/services/forge/__tests__/forge.test.js
- **Verification:** All 28 forge tests pass
- **Committed in:** 61ee486 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor naming correction to match existing test conventions. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Bootstrap deps[] are now correct, enabling deterministic boot order regardless of registration order
- Magnet persistence is wired automatically through the lifecycle, no manual provider setup needed
- forge.pull() enables the platform update command path in platform-commands.cjs
- Ready for 06-02 plan (remaining bootstrap integration fixes)

## Self-Check: PASSED

All files exist. All commits found. All content verified.

---
*Phase: 06-bootstrap-integration-fixes*
*Completed: 2026-03-23*
