# Phase 06: Bootstrap Integration Fixes - Research

**Researched:** 2026-03-23
**Domain:** IoC container wiring, lifecycle boot order, cross-phase integration gaps
**Confidence:** HIGH

## Summary

Phase 06 closes three integration wiring gaps and one tech debt item identified by the v1.0 milestone audit. All issues are confined to `core/core.cjs` (bootstrap registration) and `core/services/forge/forge.cjs` (missing method). No architectural changes are needed -- the fixes are surgical edits to dependency declarations, one new factory import, and one new git method.

The root cause of all three integration gaps is the same: `core/core.cjs` registers services with incomplete `deps[]` arrays. The container's Kahn's algorithm uses `deps[]` for topological boot ordering. When a service declares `deps: []` but references other services in `mapDeps`, those dependencies resolve via the container's fallback path (`container.resolve(depKey)`) rather than facades, and if the dependency hasn't been instantiated yet, the resolution may succeed with an uninitialized singleton. The fix pattern is identical for each: ensure `deps[]` includes every binding referenced in `mapDeps`.

**Primary recommendation:** Fix `deps[]` declarations in core/core.cjs for 4 services plus providers, wire createJsonProvider for Magnet persistence, implement forge.pull(), and add integration tests that validate the 4 success criteria end-to-end.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SVC-09 | Assay -- Unified search/indexing across all data providers with federated query, provider metadata in results | INT-GAP-01: Assay has `deps: []` but needs `providers.ledger` and `providers.journal` to boot first. Fix deps[] so lifecycle injects initialized provider facades. |
| SVC-03 | Magnet -- Centralized state management with provider-backed persistence, session-aware scoping | INT-GAP-02: createJsonProvider exists (tested in Phase 2) but never wired in bootstrap. Magnet's `init()` accepts `options.provider` but receives undefined. Wire createJsonProvider with Lathe and a `data/state.json` file path. |
| SVC-05 | Forge -- Git ops, submodule management, branch-aware operations, repo-to-deploy sync | INT-GAP-03: `forge.pull()` called by `handleUpdate` but method does not exist in forge.cjs. Implement as `_runGit(['pull', remote, branch])` following existing pattern. |
| INF-02 | Self-install and self-update via Relay (backup, deploy, migrate, verify, rollback) | INT-GAP-03: `dynamo update` command silently skips the pull step because of typeof guard on missing `forge.pull()`. After implementing pull(), the full update flow works. |
</phase_requirements>

## Standard Stack

No new libraries or dependencies are introduced in this phase. All fixes use existing platform code.

### Core (already installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Bun | 1.3.11 | Runtime | Installed, validated |
| bun:test | Built-in | Test runner | In use, 835 passing |

No `bun add` or `bun install` commands needed.

## Architecture Patterns

### The `deps[]` vs `mapDeps` Distinction (Critical to This Phase)

Understanding this distinction is the key to every fix in this phase.

**`deps[]`**: Controls boot ORDER. The container's Kahn's algorithm builds a topological sort from deps[]. A service with `deps: []` lands in level-0 (boots first). A service with `deps: ['services.switchboard']` boots after switchboard.

**`mapDeps`**: Controls what gets INJECTED. During boot, the lifecycle iterates `Object.entries(entry.mapDeps)` and resolves each key to a facade (preferred) or falls back to `container.resolve()`. The resolved value is set on the init options object under the mapped key name.

**The bug pattern**: When `deps: []` but `mapDeps` references dependencies, the service boots in level-0. When the lifecycle attempts to inject its mapDeps, it falls back to `container.resolve()` -- which calls the factory and creates an uninitialized singleton (no `init()` called yet). The injected object exists but lacks the state from `init()`.

**The fix pattern**: Every key in `mapDeps` should appear in `deps[]` unless it is intentionally optional (e.g., switchboard is a "nice to have" for event emission but not required for core function).

### Current Registration (core/core.cjs) with Issues Annotated

```javascript
// BUG: deps:[] but mapDeps references switchboard -- works by Map insertion order luck
container.singleton('services.magnet', createMagnet, {
  deps: [],  // SHOULD BE: ['services.switchboard']
  mapDeps: { 'services.switchboard': 'switchboard' },
});

// BUG: deps:[] but mapDeps references switchboard
container.singleton('services.conductor', createConductor, {
  deps: [],  // SHOULD BE: ['services.switchboard']
  mapDeps: { 'services.switchboard': 'switchboard' },
});

// BUG: deps only lathe, but mapDeps also references switchboard
container.singleton('services.forge', createForge, {
  deps: ['services.lathe'],  // SHOULD ALSO INCLUDE: 'services.switchboard'
  mapDeps: { 'services.lathe': 'lathe', 'services.switchboard': 'switchboard' },
});

// BUG: deps:[] but mapDeps references switchboard AND both providers
container.singleton('services.assay', createAssay, {
  deps: [],  // SHOULD BE: ['services.switchboard', 'providers.ledger', 'providers.journal']
  mapDeps: { 'services.switchboard': 'switchboard', 'providers.ledger': 'ledger', 'providers.journal': 'journal' },
});

// BUG: deps:[] but mapDeps references switchboard
container.singleton('providers.ledger', createLedger, {
  deps: [],  // SHOULD BE: ['services.switchboard']
  mapDeps: { 'services.switchboard': 'switchboard' },
});
```

### Fix: Assay Provider Injection (INT-GAP-01)

```javascript
// Source: core/core.cjs line 121-125
// BEFORE:
container.singleton('services.assay', createAssay, {
  deps: [],
  tags: ['service', 'search'],
  mapDeps: { 'services.switchboard': 'switchboard', 'providers.ledger': 'ledger', 'providers.journal': 'journal' },
});

// AFTER:
container.singleton('services.assay', createAssay, {
  deps: ['services.switchboard', 'providers.ledger', 'providers.journal'],
  tags: ['service', 'search'],
  mapDeps: { 'services.switchboard': 'switchboard', 'providers.ledger': 'ledger', 'providers.journal': 'journal' },
});
```

**Why this works:** With Ledger and Journal in deps[], Kahn's algorithm schedules them before Assay. By the time Assay boots, both providers have facades in `_facades` Map. The lifecycle's `mapDeps` resolution loop picks up the initialized facades, and `assay.init({ ledger: <facade>, journal: <facade> })` registers them in the provider pool.

### Fix: Magnet Persistence (INT-GAP-02)

Magnet's `init()` already handles providers correctly (lines 66-77 of magnet.cjs):

```javascript
// Already in magnet.cjs:
_provider = options.provider || null;
if (_provider) {
  const loadResult = await _provider.load();
  if (loadResult.ok) { _state = loadResult.value; }
}
```

The missing piece is creating and injecting the provider in core/core.cjs:

```javascript
// NEW: Import createJsonProvider
const { createJsonProvider } = require('./services/magnet/json-provider.cjs');

// In bootstrap(), after loading config and before container creation:
// (Or: wire via a factory that takes lathe as a dependency)

// APPROACH: Add mapDeps for lathe and use a config value for filePath.
// Magnet needs: { switchboard, provider }
// The json-provider needs: { lathe, filePath }
// Since lifecycle passes mapDeps as init options, the most consistent approach
// is to create the json-provider during Magnet's init() or via a pre-boot step.
```

The cleanest pattern consistent with the existing architecture: add `'services.lathe'` to Magnet's deps, add it to mapDeps, and have `core/core.cjs` set up a config value for statePath. Then in bootstrap, after resolving, construct the provider.

**However**, the simpler approach (consistent with D-09 from Phase 2): create the json-provider in core/core.cjs's bootstrap function after container creation but before lifecycle boot, and pass it as part of Magnet's config. Since the lifecycle merges `entry.config` into init options, setting `config: { statePath }` and adding mapDeps for lathe lets us construct the provider in the bootstrap or lifecycle init flow.

The most architecturally clean approach: Magnet creates its own provider in `init()` when it receives `lathe` and `statePath`:

```javascript
// In core/core.cjs:
container.singleton('services.magnet', createMagnet, {
  deps: ['services.switchboard', 'services.lathe'],
  tags: ['service', 'state'],
  mapDeps: { 'services.switchboard': 'switchboard', 'services.lathe': 'lathe' },
  config: { statePath: paths.root + '/data/state.json' },
});
```

Then in magnet.cjs `init()`, when lathe + statePath are provided, create the json-provider internally:

```javascript
if (options.lathe && options.statePath) {
  const { createJsonProvider } = require('./json-provider.cjs');
  const provResult = createJsonProvider({ lathe: options.lathe, filePath: options.statePath });
  if (provResult.ok) { _provider = provResult.value; }
}
```

**Alternative (simpler, but less DRY):** Create the provider in bootstrap and pass it directly:

```javascript
// After paths resolved, before boot:
// This requires Lathe to be resolvable before boot, which is tricky.
```

**Recommendation:** Wire it through mapDeps (lathe) + config (statePath) and let Magnet create the provider in init(). This keeps dependency injection explicit and testable.

### Fix: forge.pull() (INT-GAP-03)

```javascript
// Add to forge.cjs, following the exact same pattern as other git operations:

/**
 * Pull from a remote repository.
 *
 * @param {string} [remote='origin'] - Remote name
 * @param {string} [branch] - Branch name (omit for current branch)
 * @returns {import('../../../lib/result.cjs').Result<string>}
 */
function pull(remote, branch) {
  const args = ['pull'];
  if (remote) args.push(remote);
  if (branch) args.push(branch);
  return _runGit(args);
}
```

Add `pull` to `FORGE_SHAPE.optional` and include it in the `impl` object.

Add `'pull'` to FORGE_SHAPE.optional:
```javascript
const FORGE_SHAPE = {
  required: [ /* unchanged */ ],
  optional: ['stageAll', 'stageFiles', 'deleteTag', 'pull']
};
```

### Fix: Implicit Switchboard Dependencies (Tech Debt)

Four registrations reference switchboard in mapDeps but omit it from deps[]:

| Service | Current deps[] | Required addition |
|---------|---------------|-------------------|
| services.magnet | `[]` | `'services.switchboard'` |
| services.conductor | `[]` | `'services.switchboard'` |
| services.forge | `['services.lathe']` | `'services.switchboard'` |
| providers.ledger | `[]` | `'services.switchboard'` |

After these fixes, Kahn's algorithm guarantees boot order correctness regardless of registration order in core/core.cjs.

### Boot Order Impact Analysis

**Current level-0 (deps:[]):** switchboard, lathe, magnet, conductor, assay, ledger
**Current level-1+:** commutator(switchboard), forge(lathe), journal(lathe), relay(forge, lathe), wire(switchboard)

**After fix level-0:** switchboard, lathe
**After fix level-1:** commutator(switchboard), magnet(switchboard, lathe), conductor(switchboard), forge(lathe, switchboard), ledger(switchboard), journal(lathe)
**After fix level-2:** relay(forge, lathe), wire(switchboard, conductor, ledger)
**After fix level-3:** assay(switchboard, ledger, journal)

No cycles introduced. Assay correctly boots last among data-dependent services.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Topological ordering | Custom sort | Container's Kahn's algorithm | Already correct, just needs accurate deps[] input |
| State persistence | Custom file write | createJsonProvider (already built) | Handles debouncing, atomic writes, backup, recovery |
| Git pull | Custom fetch+merge | `git pull` via `_runGit` | Simple, well-tested pattern already used for 10+ git ops |

## Common Pitfalls

### Pitfall 1: Circular Dependency After Adding deps[]
**What goes wrong:** Adding too many deps could create a cycle (e.g., if A depends on B and B depends on A).
**Why it happens:** Aggressive deps[] additions without checking the full graph.
**How to avoid:** Before coding, trace the full dependency graph. The current architecture has NO cycles. Adding switchboard as a dep for magnet/conductor/forge/ledger cannot create cycles because switchboard has `deps: []` and nothing depends on magnet/conductor upstream of switchboard.
**Warning signs:** Container returns `CYCLE_DETECTED` error from `getBootOrder()`.

### Pitfall 2: Magnet Provider Creation Timing
**What goes wrong:** Creating the json-provider requires a Lathe instance. If you try to create it before boot, Lathe doesn't exist yet. If you create it during boot but after Magnet's init, persistence is missed.
**Why it happens:** The json-provider factory (`createJsonProvider`) needs an initialized Lathe facade, not just the factory.
**How to avoid:** Use the mapDeps + config pattern: add lathe to Magnet's mapDeps so the lifecycle injects the Lathe facade during Magnet's init(). Magnet creates the json-provider internally in its init() method using the injected lathe and statePath config.
**Warning signs:** `createJsonProvider` returns an error about missing lathe dependency.

### Pitfall 3: State File Directory Must Exist
**What goes wrong:** `createJsonProvider` uses `lathe.writeFileAtomic()` which will fail if the parent directory (`data/`) doesn't exist.
**Why it happens:** The `data/` directory is created by Ledger's init for DuckDB but may not exist in a fresh install or test environment.
**How to avoid:** Either (a) ensure data/ directory creation is part of bootstrap, or (b) have the json-provider's save() create the directory if missing. The integration test already creates `data/` (see sdk integration test lines 19-20). For production, Ledger's config already sets `dbPath: paths.root + '/data/ledger.db'` which implies data/ exists.
**Warning signs:** SAVE_FAILED error from json-provider during first Magnet set() call.

### Pitfall 4: forge.pull() in Test Environment
**What goes wrong:** `git pull` requires a remote. In test environments using `git init` (not `git clone`), there is no remote, so `git pull origin master` fails.
**Why it happens:** Integration tests create fresh repos with `git init` that have no origin.
**How to avoid:** The existing `handleUpdate` already uses a `typeof forge.pull === 'function'` guard. After implementing pull(), the guard passes and the pull runs. For integration tests, either (a) mock forge or (b) accept that pull will fail and verify it returns an error Result gracefully rather than throwing.
**Warning signs:** `GIT_FAILED` error with "fatal: 'origin' does not appear to be a git repository".

### Pitfall 5: Contract Freeze Prevents Adding Methods After Creation
**What goes wrong:** `createContract()` returns a frozen object. You cannot add `pull` to an existing forge instance.
**Why it happens:** `Object.freeze({ ...implementation })` in contract.cjs.
**How to avoid:** Add `pull` to the `impl` object BEFORE calling `createContract()`. This is straightforward -- just include it in the impl object and add it to FORGE_SHAPE.optional. The contract freezes all properties from the spread, including optional ones.
**Warning signs:** TypeError: Cannot add property pull, object is not extensible.

## Code Examples

### Pattern: Adding a Method to an Existing Service Contract
```javascript
// Source: core/services/forge/forge.cjs (pattern from existing optional methods)

// 1. Add to FORGE_SHAPE.optional
const FORGE_SHAPE = {
  required: ['init', 'start', 'stop', 'healthCheck', /* ... */],
  optional: ['stageAll', 'stageFiles', 'deleteTag', 'pull']  // <-- add 'pull'
};

// 2. Implement the method using existing _runGit helper
function pull(remote, branch) {
  const args = ['pull'];
  if (remote) args.push(remote);
  if (branch) args.push(branch);
  return _runGit(args);
}

// 3. Add to impl object before createContract call
const impl = {
  /* ...existing methods... */
  pull,  // <-- include it
};

return createContract('forge', FORGE_SHAPE, impl);
```

### Pattern: Wiring a Provider Through mapDeps + Config
```javascript
// Source: core/core.cjs bootstrap registration

// Registration: declare both mapDeps (facades) and config (static values)
container.singleton('services.magnet', createMagnet, {
  deps: ['services.switchboard', 'services.lathe'],
  tags: ['service', 'state'],
  mapDeps: {
    'services.switchboard': 'switchboard',
    'services.lathe': 'lathe',
  },
  config: { statePath: paths.root + '/data/state.json' },
});

// In the service's init(), both mapDeps values and config values arrive in options:
async function init(options) {
  // options.switchboard = Switchboard facade (from mapDeps)
  // options.lathe = Lathe facade (from mapDeps)
  // options.statePath = '/abs/path/data/state.json' (from config)
  _switchboard = options.switchboard || null;

  if (options.lathe && options.statePath) {
    const { createJsonProvider } = require('./json-provider.cjs');
    const provResult = createJsonProvider({
      lathe: options.lathe,
      filePath: options.statePath,
    });
    if (provResult.ok) {
      _provider = provResult.value;
    }
  }
  // ... hydrate state from provider ...
}
```

### Pattern: Integration Test for Bootstrap Wiring
```javascript
// Source: core/sdk/__tests__/integration.test.js (existing pattern)

// Test setup: tmpdir with git init, config.json, required directories
const result = await bootstrap({ paths: testPaths });
expect(result.ok).toBe(true);
const platform = result.value;

// Validate Assay has providers after bootstrap
const assayFacade = platform.lifecycle.getFacade('services.assay');
const providersResult = assayFacade.getProviders();
expect(providersResult.ok).toBe(true);
expect(providersResult.value).toContain('ledger');
expect(providersResult.value).toContain('journal');
```

## State of the Art

No technology changes since Phase 5. All fixes use existing patterns and established code.

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `deps: []` with implicit ordering | Explicit `deps[]` matching `mapDeps` | Phase 06 | Boot order guaranteed regardless of registration order |

## Open Questions

1. **State file location: `data/state.json` vs `data/magnet/state.json`?**
   - What we know: Ledger uses `data/ledger.db`, Journal uses `data/journal/`. Following the pattern, Magnet's state file logically goes in `data/`.
   - What's unclear: Whether a subdirectory (`data/magnet/`) is preferred for organizational consistency.
   - Recommendation: Use `data/state.json` (flat in data/) for simplicity. It's a single file, not a collection.

2. **Should pull() be required or optional in FORGE_SHAPE?**
   - What we know: The audit says to add to `FORGE_SHAPE.optional`. The handleUpdate code uses a `typeof` guard. Other optional methods (stageAll, stageFiles, deleteTag) follow this pattern.
   - Recommendation: Keep as optional, consistent with the audit's recommendation and the existing guard pattern. This means pull() is available when present but code must check before calling.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built-in) |
| Config file | none (bun:test auto-discovers `__tests__/*.test.js`) |
| Quick run command | `bun test core/core.test.js` (new file, to be created) |
| Full suite command | `bun test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SVC-09 | Assay.search() returns results from both Ledger and Journal after full bootstrap | integration | `bun test core/__tests__/bootstrap-integration.test.js -t "assay search"` | No -- Wave 0 |
| SVC-03 | Magnet state persists across process restart via JSON file provider | integration | `bun test core/__tests__/bootstrap-integration.test.js -t "magnet persist"` | No -- Wave 0 |
| SVC-05 | forge.pull() exists and executes git pull | unit | `bun test core/services/forge/__tests__/forge.test.js -t "pull"` | No -- Wave 0 (add to existing file) |
| INF-02 | dynamo update calls forge.pull() before submodule update | integration | `bun test core/__tests__/bootstrap-integration.test.js -t "update pull"` | No -- Wave 0 |
| Tech-01 | All services with switchboard in mapDeps declare it in deps[] | unit | `bun test core/__tests__/bootstrap-integration.test.js -t "switchboard deps"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test core/__tests__/bootstrap-integration.test.js`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green (835+ tests, 0 failures) before verification

### Wave 0 Gaps
- [ ] `core/__tests__/bootstrap-integration.test.js` -- new integration test file covering all 4 success criteria
- [ ] Additional tests in `core/services/forge/__tests__/forge.test.js` for pull() method

## Project Constraints (from CLAUDE.md)

- **Runtime:** Bun (CJS format, `'use strict'` in every file)
- **No npm dependencies:** All fixes use existing platform code only
- **Engineering principles:** Options-based DI, IoC, strict separation of concerns, hardcode nothing
- **Versioning:** User decides all version increments. Always push to origin after commits.
- **GSD workflow:** All work through GSD commands
- **Conventions established in prior phases:**
  - Service factory pattern: createX returns Result from createContract
  - Options-based DI: deps injected via mapDeps, resolved to facades by lifecycle
  - Test pattern: tmpdir isolation, git init for Forge tests, bun:test with describe/it/expect
  - Debounced writes with flush:true override for stop()
  - structuredClone for immutable event payloads

## Sources

### Primary (HIGH confidence)
- `core/core.cjs` -- Bootstrap registration code, direct source inspection
- `core/armature/lifecycle.cjs` -- Boot sequence, mapDeps resolution logic
- `core/armature/container.cjs` -- Kahn's algorithm, deps[] processing
- `core/services/forge/forge.cjs` -- Forge service, FORGE_SHAPE, _runGit pattern
- `core/services/magnet/magnet.cjs` -- Magnet service, provider handling in init()
- `core/services/magnet/json-provider.cjs` -- JSON persistence provider implementation
- `core/services/assay/assay.cjs` -- Assay service, provider pool registration in init()
- `core/sdk/pulley/platform-commands.cjs` -- handleUpdate, forge.pull() call site
- `.planning/v1.0-MILESTONE-AUDIT.md` -- Integration gap definitions and severity
- `core/sdk/__tests__/integration.test.js` -- Existing bootstrap test pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing code
- Architecture: HIGH -- root cause fully traced through lifecycle boot code
- Pitfalls: HIGH -- all traced from actual code paths, not speculative
- Fixes: HIGH -- each fix is 1-10 lines of code in well-understood modules

**Research date:** 2026-03-23
**Valid until:** Indefinite (fixes to existing codebase, no external dependency concerns)
