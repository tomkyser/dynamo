# Phase 18: Restructure Prerequisites - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Safe foundation for the directory restructure: centralized path resolver, circular dependency detection, and layout mapping -- all before any files move. Delivers ARCH-02 (centralized resolver) and ARCH-03 (circular dep detection). No files are relocated in this phase; that's Phase 19.

</domain>

<decisions>
## Implementation Decisions

### Resolver design
- Single centralized resolver at `lib/resolve.cjs` replaces all ad-hoc resolution patterns
- Logical name API: `resolve('ledger', 'search.cjs')` -- subsystem name + file, never hardcoded relative paths
- Handles both current 3-directory layout (dynamo/, ledger/, switchboard/) AND future 6-subsystem layout (subsystems/*, cc/*, lib/) from day one
- Auto-detects which layout it's running in (repo vs deployed) based on `__dirname` on first call, caches the result
- Throws with full context on missing path: "resolve('ledger', 'search.cjs'): not found in repo or deployed layout. Checked: [path1], [path2]"
- Layout map embedded inside resolve.cjs during Phase 18; Phase 19 extracts it to lib/layout.cjs when sync/install also need it
- Future 6-subsystem paths (subsystems/assay/, subsystems/terminus/, cc/hooks/) included in layout map even though directories don't exist yet -- they simply won't resolve until created

### Circular dependency detection
- Static AST analysis: parse all .cjs files for require() calls, build dependency graph, detect cycles with DFS
- Runs as a node:test case in the existing test suite (not a standalone CLI command)
- Scans production modules only -- excludes *.test.cjs and tests/ directory
- Allowlist for known intentional cycles (e.g., core.cjs <-> ledger re-exports via Object.assign); new cycles fail the test
- Library module at `lib/dep-graph.cjs` consumed by the test -- no CLI exposure

### Layout mapping scope
- Phase 18 creates `lib/` directory with resolve.cjs and dep-graph.cjs (establishes the shared substrate directory from DYNAMO-PRD.md)
- Layout data lives inside resolve.cjs as an internal constant (not a separate module yet)
- Phase 19 will: (a) extract layout data to lib/layout.cjs, (b) move core.cjs, scope.cjs, pretty.cjs into lib/

### Migration strategy
- All-at-once migration in Phase 18: every resolveCore(), resolveSibling(), and resolveHandlers() replaced with lib/resolve.cjs calls
- Bootstrap pattern: each module requires the resolver with one hardcoded relative path (`require('../lib/resolve.cjs')`), then uses the resolver for all other imports
- Old ad-hoc resolver functions deleted entirely -- no backward-compat wrappers or deprecated shims
- sync.cjs and install.cjs updated in Phase 18 to deploy lib/ to ~/.claude/dynamo/lib/ (deployed layout must work immediately)

### Claude's Discretion
- Internal layout map data structure (object shape, key naming)
- DFS cycle detection algorithm details
- Require() parsing approach (regex vs basic AST)
- Test file organization within dynamo/tests/
- Exact error message formatting

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture specifications
- `.planning/research/DYNAMO-PRD.md` -- Six-subsystem architecture, target directory structure (section 2.2), `lib/` shared substrate definition (section 2.3), `cc/` adapter pattern
- `.planning/REQUIREMENTS.md` -- ARCH-02 (centralized resolver) and ARCH-03 (circular dep detection) requirement definitions

### Codebase maps
- `.planning/codebase/STRUCTURE.md` -- Current repo and deployed directory layouts, all key files
- `.planning/codebase/ARCHITECTURE.md` -- Component architecture, import boundaries, deployment model
- `.planning/codebase/CONVENTIONS.md` -- Module patterns, resolveCore() dual-path pattern, export patterns, test conventions

### Existing resolution patterns (to be replaced)
- `dynamo/dynamo.cjs` lines 14-18 -- `resolveSibling()` function
- `dynamo/hooks/dynamo-hooks.cjs` lines 12-18 -- `resolveHandlers()` function
- `switchboard/stages.cjs` lines 10-13 -- `resolveCore()` (duplicated in 6+ other switchboard/ledger modules)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `dynamo/core.cjs` Object.assign(module.exports) pattern: handles circular dependency with ledger re-exports -- resolver allowlist must account for this
- `switchboard/sync.cjs` SYNC_PAIRS constant: defines repo-to-deployed directory mapping -- needs lib/ added as a new sync pair
- `switchboard/install.cjs`: 6-step deployment pipeline -- step that copies files needs to include lib/

### Established Patterns
- Dual-layout resolution: check deployed path first (`fs.existsSync`), fallback to repo path -- resolver formalizes this
- Options-based test isolation: all stage functions accept options overrides, tests use tmpdir -- resolver should accept options for test isolation
- node:test for all testing: `const { test } = require('node:test')` -- circular dep test follows this pattern

### Integration Points
- `switchboard/sync.cjs` SYNC_PAIRS: add `{ repo: 'lib', live: path.join(LIVE_DIR, 'lib'), label: 'lib' }`
- `switchboard/install.cjs`: add lib/ to file copy step
- `claude-config/settings-hooks.json`: hook paths unchanged (still `dynamo/hooks/dynamo-hooks.cjs` in settings.json)
- 140+ require() calls across ~20 .cjs files: all non-resolver requires route through resolve() after migration

</code_context>

<specifics>
## Specific Ideas

- Bootstrap require pattern: the one hardcoded `require('../lib/resolve.cjs')` per module, with a comment marking it as the bootstrap
- Layout map should include all six future subsystem paths so Phase 19 restructure is zero-resolver-changes
- Allowlist approach for known cycles mirrors the project's convention of explicit over implicit

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 18-restructure-prerequisites*
*Context gathered: 2026-03-19*
