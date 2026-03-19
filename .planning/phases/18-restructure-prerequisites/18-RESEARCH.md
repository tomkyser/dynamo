# Phase 18: Restructure Prerequisites - Research

**Researched:** 2026-03-19
**Domain:** CJS module resolution, dependency graph analysis, deployment pipeline
**Confidence:** HIGH

## Summary

Phase 18 prepares the Dynamo codebase for the six-subsystem restructure (Phase 19) by solving three foundational problems: (1) centralizing the 15+ duplicated `resolveCore()`/`resolveSibling()`/`resolveHandlers()` dual-layout resolution functions into a single `lib/resolve.cjs` module, (2) creating a static circular dependency detection test using regex-based `require()` extraction and DFS cycle detection, and (3) updating the sync/install deployment pipeline to include the new `lib/` directory.

The codebase has 25 production `.cjs` files across three directories (`dynamo/`, `ledger/`, `switchboard/`). Every non-dynamo module currently contains its own `resolveCore()` function (identical 4-line pattern repeated 14 times). The CLI router (`dynamo.cjs`) has its own `resolveSibling()`, and the hook dispatcher (`dynamo-hooks.cjs`) has its own `resolveHandlers()`. The centralized resolver replaces all of these with a single logical-name API: `resolve('ledger', 'search.cjs')`.

The zero-npm-dependency constraint means the circular dependency detection must use regex-based `require()` extraction (not Acorn/Esprima AST parsing). The existing `boundary.test.cjs` already demonstrates the `extractRequires()` pattern for scanning `.cjs` files -- the dep-graph module extends this approach to build a full dependency graph and run DFS cycle detection.

**Primary recommendation:** Build `lib/resolve.cjs` with layout-auto-detection and logical-name API, `lib/dep-graph.cjs` with regex require extraction and DFS cycle detection, then migrate all 25 production files in one pass. Update sync.cjs `SYNC_PAIRS` and install.cjs `copyTree` calls to deploy `lib/`.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Resolver design:**
- Single centralized resolver at `lib/resolve.cjs` replaces all ad-hoc resolution patterns
- Logical name API: `resolve('ledger', 'search.cjs')` -- subsystem name + file, never hardcoded relative paths
- Handles both current 3-directory layout (dynamo/, ledger/, switchboard/) AND future 6-subsystem layout (subsystems/*, cc/*, lib/) from day one
- Auto-detects which layout it's running in (repo vs deployed) based on `__dirname` on first call, caches the result
- Throws with full context on missing path: "resolve('ledger', 'search.cjs'): not found in repo or deployed layout. Checked: [path1], [path2]"
- Layout map embedded inside resolve.cjs during Phase 18; Phase 19 extracts it to lib/layout.cjs when sync/install also need it
- Future 6-subsystem paths (subsystems/assay/, subsystems/terminus/, cc/hooks/) included in layout map even though directories don't exist yet -- they simply won't resolve until created

**Circular dependency detection:**
- Static AST analysis: parse all .cjs files for require() calls, build dependency graph, detect cycles with DFS
- Runs as a node:test case in the existing test suite (not a standalone CLI command)
- Scans production modules only -- excludes *.test.cjs and tests/ directory
- Allowlist for known intentional cycles (e.g., core.cjs <-> ledger re-exports via Object.assign); new cycles fail the test
- Library module at `lib/dep-graph.cjs` consumed by the test -- no CLI exposure

**Layout mapping scope:**
- Phase 18 creates `lib/` directory with resolve.cjs and dep-graph.cjs (establishes the shared substrate directory from DYNAMO-PRD.md)
- Layout data lives inside resolve.cjs as an internal constant (not a separate module yet)
- Phase 19 will: (a) extract layout data to lib/layout.cjs, (b) move core.cjs, scope.cjs, pretty.cjs into lib/

**Migration strategy:**
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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ARCH-02 | All dual-layout resolution paths centralized into single resolver module in `lib/` | Resolver design patterns (layout map, auto-detection, logical name API), bootstrap require pattern, migration inventory of all 16 ad-hoc resolution functions across 25 production files |
| ARCH-03 | Static circular dependency detection test validates all require() chains across subsystems | Regex-based require() extraction, DFS cycle detection algorithm, allowlist pattern for known cycles (core.cjs <-> ledger re-exports), node:test integration |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:fs` | Node.js built-in | File existence checks for layout detection, file reading for dep-graph | Zero-dependency constraint |
| `node:path` | Node.js built-in | Path construction for layout maps and resolution | Zero-dependency constraint |
| `node:test` | Node.js built-in | Test runner for circular dependency detection test | Existing test convention |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:assert/strict` | Node.js built-in | Assertions in circular dep test | Test assertions |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Regex require() parsing | Acorn/Esprima AST parser | AST is more accurate but violates zero-npm-dependency constraint. Regex handles all patterns in this codebase (simple `require()` calls only, no dynamic requires or computed paths in production code) |
| Custom DFS cycle detection | madge npm package | madge is feature-rich but adds external dependency. DFS is <30 lines of code for this use case |
| Embedded layout map constant | Separate `lib/layout.cjs` module | Separate module is cleaner but premature -- only resolve.cjs needs it in Phase 18. Phase 19 extracts when sync/install need it too |

## Architecture Patterns

### Project Structure (Phase 18 additions)

```
lib/                        # NEW: shared substrate directory
  resolve.cjs               # Centralized dual-layout resolver
  dep-graph.cjs             # Dependency graph builder + cycle detector

dynamo/tests/
  circular-deps.test.cjs    # NEW: circular dependency detection test
```

### Pattern 1: Bootstrap Require

**What:** Each production module starts with exactly one hardcoded `require()` to load the resolver, then uses the resolver for all other cross-module imports.
**When to use:** Every production `.cjs` file that imports from another component.

**Current pattern (repeated 14x):**
```javascript
// switchboard/stages.cjs (and 13 other files)
function resolveCore() {
  const deployed = path.join(__dirname, '..', 'core.cjs');
  if (fs.existsSync(deployed)) return deployed;
  return path.join(__dirname, '..', 'dynamo', 'core.cjs');
}
const { DYNAMO_DIR, loadConfig } = require(resolveCore());
```

**New pattern:**
```javascript
// switchboard/stages.cjs -- after migration
const resolve = require('../lib/resolve.cjs'); // bootstrap: one hardcoded path
const { DYNAMO_DIR, loadConfig } = require(resolve('dynamo', 'core.cjs'));
```

**Key details:**
- The bootstrap `require('../lib/resolve.cjs')` is the ONLY hardcoded relative path per module
- In deployed layout: `require('../lib/resolve.cjs')` resolves `~/.claude/dynamo/switchboard/../lib/resolve.cjs` = `~/.claude/dynamo/lib/resolve.cjs` -- correct
- In repo layout: `require('../lib/resolve.cjs')` resolves `<repo>/switchboard/../lib/resolve.cjs` = `<repo>/lib/resolve.cjs` -- correct
- Both layouts work with `../lib/resolve.cjs` from any module in `dynamo/`, `ledger/`, `switchboard/`, or their subdirectories

**Special cases for subdirectories:**
```javascript
// ledger/hooks/session-start.cjs -- 2 levels deep
const resolve = require('../../lib/resolve.cjs'); // bootstrap
const { healthGuard, logError } = require(resolve('dynamo', 'core.cjs'));
const { combinedSearch } = require(resolve('ledger', 'search.cjs'));
```

```javascript
// dynamo/hooks/dynamo-hooks.cjs -- 2 levels deep
const resolve = require('../../lib/resolve.cjs'); // bootstrap
const { loadEnv, detectProject, logError, SCOPE } = require(resolve('dynamo', 'core.cjs'));
```

### Pattern 2: Layout Auto-Detection

**What:** The resolver detects whether it's running in repo layout or deployed layout on first call, caches the result.
**When to use:** Internally in `lib/resolve.cjs` -- transparent to callers.

```javascript
// lib/resolve.cjs -- layout detection
let _layout = null;

function detectLayout() {
  if (_layout) return _layout;
  // resolve.cjs lives at lib/resolve.cjs
  // Repo layout:     <repo>/lib/resolve.cjs     -> <repo>/dynamo/ exists as sibling
  // Deployed layout:  ~/.claude/dynamo/lib/resolve.cjs -> ~/.claude/dynamo/core.cjs exists as sibling
  const root = path.join(__dirname, '..');
  const deployedMarker = path.join(root, 'core.cjs');  // Only exists in deployed layout (dynamo/ contents are at root)
  if (fs.existsSync(deployedMarker)) {
    _layout = 'deployed';
  } else {
    _layout = 'repo';
  }
  return _layout;
}
```

### Pattern 3: Logical Name Layout Map

**What:** Internal constant mapping logical subsystem names to directory paths in both layouts.
**When to use:** Inside `lib/resolve.cjs` -- maps `resolve('ledger', 'search.cjs')` to the actual file path.

```javascript
// Internal layout map -- Phase 18 includes future paths for zero-change Phase 19
function buildPaths(root) {
  return {
    // Current 3-directory layout names
    dynamo:      root,                                          // deployed: ~/.claude/dynamo/
    ledger:      path.join(root, 'ledger'),                     // deployed: ~/.claude/dynamo/ledger/
    switchboard: path.join(root, 'switchboard'),                // deployed: ~/.claude/dynamo/switchboard/
    lib:         path.join(root, 'lib'),                        // deployed: ~/.claude/dynamo/lib/

    // Future 6-subsystem paths (Phase 19) -- resolve to these dirs when they exist
    assay:       path.join(root, 'subsystems', 'assay'),
    terminus:    path.join(root, 'subsystems', 'terminus'),
    reverie:     path.join(root, 'subsystems', 'reverie'),
    cc:          path.join(root, 'cc'),
    hooks:       path.join(root, 'cc', 'hooks'),
    prompts:     path.join(root, 'cc', 'prompts'),
  };
}

const LAYOUT = {
  repo: (root) => ({
    dynamo:      path.join(root, 'dynamo'),
    ledger:      path.join(root, 'ledger'),
    switchboard: path.join(root, 'switchboard'),
    lib:         path.join(root, 'lib'),
    // Future paths
    assay:       path.join(root, 'subsystems', 'assay'),
    terminus:    path.join(root, 'subsystems', 'terminus'),
    reverie:     path.join(root, 'subsystems', 'reverie'),
    cc:          path.join(root, 'cc'),
    hooks:       path.join(root, 'cc', 'hooks'),
    prompts:     path.join(root, 'cc', 'prompts'),
  }),
  deployed: buildPaths
};
```

### Pattern 4: Resolver Main Function

**What:** The public `resolve(subsystem, file)` function that all modules call.
**When to use:** Every cross-module import.

```javascript
function resolve(subsystem, file) {
  const layout = detectLayout();
  const root = path.join(__dirname, '..');
  const paths = LAYOUT[layout](root);
  const dir = paths[subsystem];
  if (!dir) {
    throw new Error(`resolve('${subsystem}', '${file}'): unknown subsystem '${subsystem}'. Known: ${Object.keys(paths).join(', ')}`);
  }
  const fullPath = path.join(dir, file);
  if (!fs.existsSync(fullPath)) {
    // Build checked paths for error message
    const altLayout = layout === 'repo' ? 'deployed' : 'repo';
    const altPaths = LAYOUT[altLayout](root);
    const altDir = altPaths[subsystem];
    const altPath = altDir ? path.join(altDir, file) : '(no mapping)';
    throw new Error(
      `resolve('${subsystem}', '${file}'): not found in ${layout} layout. ` +
      `Checked: ${fullPath}` +
      (altDir ? `, ${altPath}` : '')
    );
  }
  return fullPath;
}

module.exports = resolve;
```

### Pattern 5: core.cjs Circular Dependency Handling

**What:** `core.cjs` uses `Object.assign(module.exports, ...)` after initial export to break a circular dependency with ledger modules. The resolver must NOT change this pattern -- it's internal to core.cjs's re-export mechanism.
**When to use:** The allowlist in the circular dependency test must include the `core.cjs -> ledger/mcp-client.cjs -> core.cjs` cycle.

```javascript
// core.cjs lines 319-355 (unchanged by Phase 18)
module.exports = { DYNAMO_DIR, output, error, ... };  // base exports first

// Then re-export ledger modules (breaks cycle via Object.assign)
const { MCPClient, parseSSE } = require(resolveLedger('mcp-client.cjs'));
// ...
Object.assign(module.exports, { MCPClient, parseSSE, SCOPE, ... });
```

**Existing cycle:** `core.cjs` -> `ledger/mcp-client.cjs` -> (requires core.cjs for `fetchWithTimeout`, `loadConfig`). This works because core.cjs exports base utilities BEFORE requiring ledger modules. The dep-graph test must allowlist this.

**Note:** core.cjs still uses `resolveLedger()` internally in Phase 18 -- it cannot use `require('../lib/resolve.cjs')` because resolve.cjs uses `__dirname` to detect layout, and core.cjs is in `dynamo/` not a subdirectory. Actually: `../lib/resolve.cjs` from `dynamo/core.cjs` would resolve to `<repo>/lib/resolve.cjs` in repo layout -- this works. But the re-export pattern in core.cjs means core.cjs requires ledger modules at module load time. The resolver must be available before core.cjs loads those ledger modules, so the bootstrap require of resolve.cjs must appear before the re-export block in core.cjs.

### Anti-Patterns to Avoid

- **Dynamic resolver paths:** Never compute the resolver path dynamically. The bootstrap `require('../lib/resolve.cjs')` or `require('../../lib/resolve.cjs')` must be a static string literal so the dep-graph test can track it.
- **Mixed resolution:** Never mix the old `resolveCore()` pattern with the new resolver in the same file. All-or-nothing migration per file.
- **Layout detection per call:** Never call `detectLayout()` on every `resolve()` invocation without caching. The layout cannot change during process lifetime.
- **Bare relative requires for cross-component imports:** After migration, no `require('../switchboard/foo.cjs')` or `require(path.join(__dirname, '..', 'ledger', 'bar.cjs'))` should exist outside of core.cjs's internal re-export block. All cross-component requires go through `resolve()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full AST parsing for require() detection | Custom CJS parser or Acorn integration | Regex-based extraction (like existing `boundary.test.cjs`) | Zero-npm-dependency constraint; all require() calls in codebase are simple string literals or `path.join()` calls -- regex handles these |
| Module resolution algorithm | Custom Node.js module resolution | `fs.existsSync()` + known layout map | The resolver doesn't need `node_modules` resolution. It only resolves project-internal modules between known subsystem directories |
| Graph visualization | DOT/SVG graph renderer | JSON output of cycle paths in test failure messages | The test only needs to report cycles, not visualize the full graph. Visual tools (madge) can be used ad-hoc if needed |

**Key insight:** The resolver is simpler than a general module resolution system. It only handles two known layouts with known directory structures. The layout map is a small constant, not a complex algorithm.

## Common Pitfalls

### Pitfall 1: Bootstrap Path Depth Mismatch

**What goes wrong:** Files at different directory depths need different bootstrap require paths. `switchboard/sync.cjs` needs `../lib/resolve.cjs` but `ledger/hooks/session-start.cjs` needs `../../lib/resolve.cjs`. Getting this wrong produces "Cannot find module" errors.
**Why it happens:** The bootstrap path is the one hardcoded relative path. It must be correct for both repo and deployed layouts from each file's directory depth.
**How to avoid:** Map every production file to its depth before migration:
- Depth 1 (dynamo/, ledger/, switchboard/): `../lib/resolve.cjs`
- Depth 2 (dynamo/hooks/, ledger/hooks/): `../../lib/resolve.cjs`
**Warning signs:** Test failures mentioning "Cannot find module" for resolve.cjs.

### Pitfall 2: core.cjs Re-Export Circular Dependency

**What goes wrong:** The resolver migration could break the `Object.assign(module.exports, ...)` pattern in core.cjs that handles the circular dependency with ledger modules.
**Why it happens:** core.cjs loads ledger modules at require time, and those ledger modules require core.cjs. This cycle works because core.cjs exports base utilities before loading ledger modules. If the resolver changes the load order, the cycle breaks.
**How to avoid:** In core.cjs, the bootstrap resolver require must be at the TOP of the file (before any module.exports assignments). The `resolveLedger()` calls at the bottom of core.cjs (lines 338-349) should be migrated to use `resolve('ledger', ...)` but the pattern of "export base first, then require ledger" must be preserved.
**Warning signs:** `TypeError: ... is not a function` errors when running tests, indicating the partial exports from the circular require are missing expected functions.

### Pitfall 3: Deploy Pipeline Missing lib/

**What goes wrong:** After adding `lib/` to the repo, `dynamo install` and `dynamo sync` don't copy it to the deployed location, causing all resolution to fail in production.
**Why it happens:** `install.cjs` has three explicit `copyTree()` calls and `sync.cjs` has three explicit `SYNC_PAIRS` entries. Neither has `lib/`.
**How to avoid:** Add `lib/` to both `install.cjs` copyTree calls AND `sync.cjs` SYNC_PAIRS in the same commit as the resolver migration.
**Warning signs:** Tests pass (they run in repo layout) but deployed Dynamo fails with "Cannot find module" errors.

### Pitfall 4: Intra-Module Requires Confused With Cross-Module

**What goes wrong:** Files within the same directory (e.g., `switchboard/update.cjs` requiring `switchboard/install.cjs`) might be unnecessarily routed through the resolver, adding overhead and complexity.
**Why it happens:** Over-applying the resolver pattern to intra-module requires that don't need dual-layout resolution.
**How to avoid:** The resolver is for CROSS-component requires (switchboard -> dynamo, ledger -> dynamo). Intra-component requires (`require(path.join(__dirname, 'install.cjs'))`) within switchboard/ can stay as-is -- they work in both layouts already because the relative path is the same.
**Warning signs:** Unnecessary `resolve()` calls for same-directory imports.

### Pitfall 5: Tests That Assert Old Patterns

**What goes wrong:** Existing tests explicitly check for `resolveCore()`, `resolveSibling()`, and `resolveHandlers()` function existence in source code. These tests will fail after migration.
**Why it happens:** Tests like `update.test.cjs` line 63 (`assert.ok(content.includes('function resolveCore()'))`) and `dispatcher.test.cjs` line 56 (`assert.ok(src.includes('function resolveHandlers'))`) use source-code string matching.
**How to avoid:** Update these test assertions to check for the new resolver pattern instead (e.g., `assert.ok(content.includes("require('../lib/resolve.cjs')"))` or `assert.ok(content.includes("require('../../lib/resolve.cjs')"))`).
**Warning signs:** Tests fail with assertion errors about missing `resolveCore` function text.

### Pitfall 6: boundary.test.cjs Directory Assertion

**What goes wrong:** `boundary.test.cjs` line 93 asserts `!fs.existsSync(path.join(REPO_ROOT, 'dynamo', 'lib'))` -- "no lib/ directory remains in dynamo/". The new `lib/` is at repo root, not inside `dynamo/`, so this test should still pass. But adding it to `lib/` in `dynamo/tests/` is a different concern.
**Why it happens:** The test was written to verify cleanup of a legacy dynamo/lib/ directory.
**How to avoid:** The new `lib/` directory is at `<repo>/lib/`, not `<repo>/dynamo/lib/`. Verify this test still passes. May want to add a new assertion: `fs.existsSync(path.join(REPO_ROOT, 'lib'))` -- "lib/ shared substrate directory must exist".
**Warning signs:** Boundary test failures after creating the lib/ directory.

## Code Examples

### Full Resolver Module

```javascript
// lib/resolve.cjs -- centralized dual-layout resolver
'use strict';

const path = require('path');
const fs = require('fs');

let _layout = null;
let _paths = null;

function detectLayout() {
  if (_layout) return _layout;
  const root = path.join(__dirname, '..');
  // In deployed layout, core.cjs exists at root level (alongside lib/)
  // In repo layout, core.cjs is inside dynamo/ subdirectory
  if (fs.existsSync(path.join(root, 'core.cjs'))) {
    _layout = 'deployed';
  } else {
    _layout = 'repo';
  }
  return _layout;
}

function getPaths() {
  if (_paths) return _paths;
  const layout = detectLayout();
  const root = path.join(__dirname, '..');

  if (layout === 'deployed') {
    // ~/.claude/dynamo/ -- everything is flat under root
    _paths = {
      dynamo:      root,
      ledger:      path.join(root, 'ledger'),
      switchboard: path.join(root, 'switchboard'),
      lib:         path.join(root, 'lib'),
      // Future Phase 19 paths
      assay:       path.join(root, 'subsystems', 'assay'),
      terminus:    path.join(root, 'subsystems', 'terminus'),
      reverie:     path.join(root, 'subsystems', 'reverie'),
      cc:          path.join(root, 'cc'),
    };
  } else {
    // Repo -- subdirectories at root
    _paths = {
      dynamo:      path.join(root, 'dynamo'),
      ledger:      path.join(root, 'ledger'),
      switchboard: path.join(root, 'switchboard'),
      lib:         path.join(root, 'lib'),
      // Future Phase 19 paths
      assay:       path.join(root, 'subsystems', 'assay'),
      terminus:    path.join(root, 'subsystems', 'terminus'),
      reverie:     path.join(root, 'subsystems', 'reverie'),
      cc:          path.join(root, 'cc'),
    };
  }
  return _paths;
}

/**
 * Resolve a module path by logical subsystem name.
 * @param {string} subsystem - Logical name ('dynamo', 'ledger', 'switchboard', etc.)
 * @param {string} file - File name or relative path within the subsystem
 * @returns {string} Absolute file path
 * @throws {Error} If subsystem unknown or file not found
 */
function resolve(subsystem, file) {
  const paths = getPaths();
  const dir = paths[subsystem];
  if (!dir) {
    throw new Error(
      `resolve('${subsystem}', '${file}'): unknown subsystem '${subsystem}'. ` +
      `Known: ${Object.keys(paths).join(', ')}`
    );
  }
  const fullPath = path.join(dir, file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(
      `resolve('${subsystem}', '${file}'): not found in ${_layout} layout. ` +
      `Checked: ${fullPath}`
    );
  }
  return fullPath;
}

// Expose internals for testing
resolve._reset = () => { _layout = null; _paths = null; };
resolve._detectLayout = detectLayout;

module.exports = resolve;
```

### Dependency Graph Module

```javascript
// lib/dep-graph.cjs -- dependency graph builder + cycle detector
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Extract require() targets from a CJS source file.
 * Returns resolved file paths for local requires, skips node: built-ins and npm packages.
 * @param {string} filePath - Absolute path to .cjs file
 * @param {string} source - File contents
 * @returns {string[]} Array of required file paths (resolved, deduplicated)
 */
function extractRequires(filePath, source) {
  const requires = [];
  const dir = path.dirname(filePath);

  // Match require('...') with string literal argument
  const stringReqPattern = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = stringReqPattern.exec(source)) !== null) {
    const target = match[1];
    // Skip node: built-ins and bare module specifiers (no ./ or ../)
    if (target.startsWith('node:') || (!target.startsWith('.') && !target.startsWith('/'))) {
      continue;
    }
    try {
      const resolved = require.resolve(path.resolve(dir, target));
      requires.push(resolved);
    } catch (e) {
      // Unresolvable -- skip (might be a conditional require)
    }
  }

  // Match require(path.join(__dirname, ...)) patterns
  const pathJoinPattern = /require\(\s*path\.join\(\s*__dirname\s*,\s*(['"][^'"]+['"](?:\s*,\s*['"][^'"]+['"])*)\s*\)\s*\)/g;
  while ((match = pathJoinPattern.exec(source)) !== null) {
    const argsStr = match[1];
    const args = argsStr.match(/['"]([^'"]+)['"]/g).map(s => s.slice(1, -1));
    try {
      const resolved = require.resolve(path.join(dir, ...args));
      requires.push(resolved);
    } catch (e) {
      // Unresolvable -- skip
    }
  }

  // Match require(resolveCore()) and require(resolveSibling(...)) patterns
  // These are the old patterns that will be removed, but included for pre-migration analysis
  const resolveCorePattern = /require\(\s*resolveCore\(\)\s*\)/g;
  while ((match = resolveCorePattern.exec(source)) !== null) {
    // These resolve to dynamo/core.cjs -- add it
    // (heuristic: works for pre-migration analysis)
  }

  return [...new Set(requires)];
}

/**
 * Build a dependency graph for all .cjs files in given directories.
 * @param {string[]} dirs - Directories to scan
 * @param {Object} [options]
 * @param {string[]} [options.excludeDirs] - Directory names to skip (default: ['tests', 'node_modules'])
 * @param {string[]} [options.excludePatterns] - File patterns to skip (default: ['*.test.cjs'])
 * @returns {Map<string, string[]>} Map of filePath -> [dependency file paths]
 */
function buildGraph(dirs, options = {}) {
  const excludeDirs = options.excludeDirs || ['tests', 'node_modules', '.planning', '.git'];
  const excludePatterns = options.excludePatterns || ['.test.cjs'];
  const graph = new Map();

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (excludeDirs.includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(full);
      } else if (entry.name.endsWith('.cjs') && !excludePatterns.some(p => entry.name.endsWith(p.replace('*', '')))) {
        const source = fs.readFileSync(full, 'utf8');
        const deps = extractRequires(full, source);
        graph.set(full, deps);
      }
    }
  }

  for (const dir of dirs) {
    scanDir(dir);
  }
  return graph;
}

/**
 * Detect cycles in a dependency graph using DFS.
 * @param {Map<string, string[]>} graph - Dependency graph
 * @param {string[][]} [allowlist] - Known intentional cycles as arrays of file paths
 * @returns {string[][]} Array of cycle paths (each is an array of file paths forming the cycle)
 */
function detectCycles(graph, allowlist = []) {
  const cycles = [];
  const visited = new Set();
  const inStack = new Set();

  function dfs(node, stack) {
    if (inStack.has(node)) {
      // Found a cycle -- extract it
      const cycleStart = stack.indexOf(node);
      const cycle = stack.slice(cycleStart).concat(node);
      cycles.push(cycle);
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    inStack.add(node);
    stack.push(node);

    const deps = graph.get(node) || [];
    for (const dep of deps) {
      if (graph.has(dep)) { // Only follow edges within our graph
        dfs(dep, stack);
      }
    }

    stack.pop();
    inStack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  // Filter out allowlisted cycles
  return cycles.filter(cycle => !isAllowlisted(cycle, allowlist));
}

function isAllowlisted(cycle, allowlist) {
  const cycleSet = new Set(cycle);
  return allowlist.some(allowed => {
    const allowedSet = new Set(allowed);
    // Check if cycle involves exactly the same files
    if (allowedSet.size !== cycleSet.size - 1) return false; // cycle has repeated first node
    for (const f of allowed) {
      if (!cycleSet.has(f)) return false;
    }
    return true;
  });
}

module.exports = { extractRequires, buildGraph, detectCycles };
```

### Circular Dependency Test

```javascript
// dynamo/tests/circular-deps.test.cjs
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const { buildGraph, detectCycles } = require(path.join(REPO_ROOT, 'lib', 'dep-graph.cjs'));

// Known intentional cycles (allowlisted)
const ALLOWLIST = [
  // core.cjs <-> ledger modules (Object.assign re-export pattern)
  [
    path.join(REPO_ROOT, 'dynamo', 'core.cjs'),
    path.join(REPO_ROOT, 'ledger', 'mcp-client.cjs'),
  ],
  [
    path.join(REPO_ROOT, 'dynamo', 'core.cjs'),
    path.join(REPO_ROOT, 'ledger', 'scope.cjs'),
  ],
  [
    path.join(REPO_ROOT, 'dynamo', 'core.cjs'),
    path.join(REPO_ROOT, 'ledger', 'sessions.cjs'),
  ],
];

describe('Circular dependency detection', () => {
  it('no circular require() chains in production modules (excluding allowlisted)', () => {
    const graph = buildGraph([
      path.join(REPO_ROOT, 'dynamo'),
      path.join(REPO_ROOT, 'ledger'),
      path.join(REPO_ROOT, 'switchboard'),
      path.join(REPO_ROOT, 'lib'),
    ]);

    const cycles = detectCycles(graph, ALLOWLIST);

    if (cycles.length > 0) {
      const formatted = cycles.map(c =>
        c.map(f => path.relative(REPO_ROOT, f)).join(' -> ')
      ).join('\n  ');
      assert.fail(`Found ${cycles.length} circular dependency chain(s):\n  ${formatted}`);
    }
  });
});
```

### Migration Example: switchboard/health-check.cjs

```javascript
// BEFORE:
function resolveCore() {
  const deployed = path.join(__dirname, '..', 'core.cjs');
  if (fs.existsSync(deployed)) return deployed;
  return path.join(__dirname, '..', 'dynamo', 'core.cjs');
}
const { output, error } = require(resolveCore());
const { formatHealthReport } = require(path.join(__dirname, 'pretty.cjs'));

// AFTER:
const resolve = require('../lib/resolve.cjs'); // bootstrap
const { output, error } = require(resolve('dynamo', 'core.cjs'));
const { formatHealthReport } = require(path.join(__dirname, 'pretty.cjs')); // intra-module: unchanged
```

### Deploy Pipeline Updates

```javascript
// switchboard/sync.cjs -- add lib/ sync pair
const SYNC_PAIRS = [
  { repo: path.join(REPO_ROOT, 'dynamo'), live: LIVE_DIR, label: 'dynamo', excludes: [...SYNC_EXCLUDES, 'tests'] },
  { repo: path.join(REPO_ROOT, 'ledger'), live: path.join(LIVE_DIR, 'ledger'), label: 'ledger', excludes: SYNC_EXCLUDES },
  { repo: path.join(REPO_ROOT, 'switchboard'), live: path.join(LIVE_DIR, 'switchboard'), label: 'switchboard', excludes: SYNC_EXCLUDES },
  { repo: path.join(REPO_ROOT, 'lib'), live: path.join(LIVE_DIR, 'lib'), label: 'lib', excludes: SYNC_EXCLUDES },  // NEW
];

// switchboard/install.cjs -- add lib/ copy step (in Step 1)
fileCount += copyTree(path.join(REPO_ROOT, 'dynamo'), LIVE_DIR, [...INSTALL_EXCLUDES, 'tests']);
fileCount += copyTree(path.join(REPO_ROOT, 'ledger'), path.join(LIVE_DIR, 'ledger'), INSTALL_EXCLUDES);
fileCount += copyTree(path.join(REPO_ROOT, 'switchboard'), path.join(LIVE_DIR, 'switchboard'), INSTALL_EXCLUDES);
fileCount += copyTree(path.join(REPO_ROOT, 'lib'), path.join(LIVE_DIR, 'lib'), INSTALL_EXCLUDES);  // NEW
```

## Migration Inventory

Complete inventory of files requiring changes, organized by change type:

### Files With resolveCore() to Replace (14 files)

| File | Depth | Bootstrap Path | resolveCore Requires |
|------|-------|----------------|---------------------|
| `ledger/search.cjs` | 1 | `../lib/resolve.cjs` | `require(resolveCore())` -> logError |
| `ledger/episodes.cjs` | 1 | `../lib/resolve.cjs` | `require(resolveCore())` -> logError |
| `ledger/sessions.cjs` | 1 | `../lib/resolve.cjs` | `require(resolveCore())` -> logError |
| `ledger/mcp-client.cjs` | 1 | `../lib/resolve.cjs` | `require(resolveCore())` -> fetchWithTimeout, loadConfig |
| `ledger/curation.cjs` | 1 | `../lib/resolve.cjs` | `require(resolveCore())` -> loadConfig, fetchWithTimeout, logError, loadPrompt |
| `switchboard/stages.cjs` | 1 | `../lib/resolve.cjs` | `require(resolveCore())` -> DYNAMO_DIR, loadConfig, loadEnv, etc. |
| `switchboard/health-check.cjs` | 1 | `../lib/resolve.cjs` | `require(resolveCore())` -> output, error |
| `switchboard/diagnose.cjs` | 1 | `../lib/resolve.cjs` | `require(resolveCore())` -> output, error, MCPClient |
| `switchboard/install.cjs` | 1 | `../lib/resolve.cjs` | `require(resolveCore())` -> DYNAMO_DIR, output, error, loadEnv, safeReadFile |
| `switchboard/sync.cjs` | 1 | `../lib/resolve.cjs` | `require(resolveCore())` -> DYNAMO_DIR, output, error |
| `switchboard/update.cjs` | 1 | `../lib/resolve.cjs` | `require(resolveCore())` -> fetchWithTimeout, safeReadFile, output, error |
| `switchboard/update-check.cjs` | 1 | `../lib/resolve.cjs` | `require(resolveCore())` -> fetchWithTimeout, safeReadFile |
| `switchboard/verify-memory.cjs` | 1 | `../lib/resolve.cjs` | `require(resolveCore())` -> output, error, loadConfig, etc. |
| `switchboard/stack.cjs` | 1 | `../lib/resolve.cjs` | `require(resolveCore())` -> output, error, fetchWithTimeout |
| `switchboard/migrate.cjs` | 1 | `../lib/resolve.cjs` | `require(resolveCore())` (unused but present) |

### Files With resolveHandlers() to Replace (1 file)

| File | Depth | Bootstrap Path | Change |
|------|-------|----------------|--------|
| `dynamo/hooks/dynamo-hooks.cjs` | 2 | `../../lib/resolve.cjs` | Replace `resolveHandlers()` with `resolve('ledger', 'hooks')` dir |

### Files With resolveSibling() to Replace (1 file)

| File | Depth | Bootstrap Path | Change |
|------|-------|----------------|--------|
| `dynamo/dynamo.cjs` | 1 | `../lib/resolve.cjs` | Replace all `resolveSibling(subdir, file)` calls with `resolve(subdir, file)` |

### Files With Hook-Level resolveCore() (5 files)

| File | Depth | Bootstrap Path | resolveCore Requires |
|------|-------|----------------|---------------------|
| `ledger/hooks/capture-change.cjs` | 2 | `../../lib/resolve.cjs` | `require(resolveCore())` -> healthGuard, logError |
| `ledger/hooks/preserve-knowledge.cjs` | 2 | `../../lib/resolve.cjs` | `require(resolveCore())` -> healthGuard, logError |
| `ledger/hooks/prompt-augment.cjs` | 2 | `../../lib/resolve.cjs` | `require(resolveCore())` -> healthGuard, logError |
| `ledger/hooks/session-start.cjs` | 2 | `../../lib/resolve.cjs` | `require(resolveCore())` -> healthGuard, logError |
| `ledger/hooks/session-summary.cjs` | 2 | `../../lib/resolve.cjs` | `require(resolveCore())` -> logError |

### core.cjs Internal Migration (1 file)

| File | Depth | Bootstrap Path | Change |
|------|-------|----------------|--------|
| `dynamo/core.cjs` | 1 | `../lib/resolve.cjs` | Replace internal `resolveLedger()` calls (lines 338-349) with `resolve('ledger', ...)` |

### Deploy Pipeline Updates (2 files)

| File | Change |
|------|--------|
| `switchboard/sync.cjs` | Add `lib` entry to `SYNC_PAIRS` |
| `switchboard/install.cjs` | Add `lib/` copyTree call in Step 1 |

### Tests Requiring Updates (2+ files)

| File | Change |
|------|--------|
| `dynamo/tests/switchboard/update.test.cjs` | Update assertion from `'function resolveCore()'` to new pattern |
| `dynamo/tests/ledger/dispatcher.test.cjs` | Update assertions from `'function resolveHandlers'` to new pattern |
| `dynamo/tests/boundary.test.cjs` | Add assertion for `lib/` existence at repo root |

### New Files (3 files)

| File | Purpose |
|------|---------|
| `lib/resolve.cjs` | Centralized dual-layout resolver |
| `lib/dep-graph.cjs` | Dependency graph builder + cycle detector |
| `dynamo/tests/circular-deps.test.cjs` | Circular dependency detection test |

**Total production files changed:** 22 out of 25 (88%)
**Total new files:** 3
**Total test files requiring update:** 2-3

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-module `resolveCore()` function | Centralized resolver with layout auto-detection | This phase (18) | Eliminates 15+ duplicated 4-line functions |
| No circular dependency checking | Static DFS cycle detection on require graph | This phase (18) | Catches circular imports before they cause runtime issues |
| 3 sync pairs (dynamo, ledger, switchboard) | 4 sync pairs (+ lib) | This phase (18) | Supports shared substrate deployment |

## Open Questions

1. **Intra-component resolve() for cross-directory requires within switchboard/**
   - What we know: `switchboard/update.cjs` requires `switchboard/install.cjs`, `switchboard/update-check.cjs`, etc. using `path.join(__dirname, ...)`. These work in both layouts already.
   - What's unclear: Should these also migrate to `resolve('switchboard', 'install.cjs')` for consistency, or stay as `path.join(__dirname, ...)` since they're intra-component?
   - Recommendation: Keep as `path.join(__dirname, ...)` for intra-component. The resolver is for CROSS-component resolution. This matches the CONTEXT.md decision: "Bootstrap pattern: each module requires the resolver with one hardcoded relative path, then uses the resolver for all other imports" -- "all other imports" means cross-component imports.

2. **dynamo-hooks.cjs handler directory resolution**
   - What we know: `resolveHandlers()` returns a DIRECTORY path, not a file. The dispatcher then appends handler filenames to it.
   - What's unclear: `resolve()` as designed takes a subsystem + file. For directory resolution, it needs to handle `resolve('ledger', 'hooks')` where 'hooks' is a directory.
   - Recommendation: The resolver should handle directories. `resolve()` checks `fs.existsSync()` which works for both files and directories. The dispatcher would call `resolve('ledger', 'hooks')` to get the handler directory, then `path.join(handlerDir, handlerFile)` for specific handlers. This works because `fs.existsSync()` returns true for directories.

3. **resolve.cjs self-test isolation**
   - What we know: The resolver caches layout detection and paths in module-level variables.
   - What's unclear: How tests reset the cache between test cases.
   - Recommendation: Export `_reset()` function (prefixed with underscore to signal internal/test-only). Tests call `resolve._reset()` in `beforeEach()` to clear cached state.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | node:test (built-in, Node.js 18+) |
| Config file | none (uses node:test built-in runner) |
| Quick run command | `node --test dynamo/tests/circular-deps.test.cjs` |
| Full suite command | `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARCH-02 | Resolver resolves in repo layout | unit | `node --test dynamo/tests/resolve.test.cjs` | Wave 0 |
| ARCH-02 | Resolver resolves in deployed layout | unit | `node --test dynamo/tests/resolve.test.cjs` | Wave 0 |
| ARCH-02 | Resolver throws for unknown subsystem | unit | `node --test dynamo/tests/resolve.test.cjs` | Wave 0 |
| ARCH-02 | Resolver throws for missing file with context | unit | `node --test dynamo/tests/resolve.test.cjs` | Wave 0 |
| ARCH-02 | All production modules use resolver (no stale resolveCore) | structural | `node --test dynamo/tests/boundary.test.cjs` | Needs update |
| ARCH-03 | No circular deps detected (excluding allowlist) | structural | `node --test dynamo/tests/circular-deps.test.cjs` | Wave 0 |
| ARCH-03 | DFS correctly identifies cycles in test graph | unit | `node --test dynamo/tests/dep-graph.test.cjs` | Wave 0 |
| ARCH-03 | Allowlist correctly suppresses known cycles | unit | `node --test dynamo/tests/dep-graph.test.cjs` | Wave 0 |
| ARCH-02/03 | All 374+ existing tests pass after migration | regression | Full suite command | Exists (update needed) |

### Sampling Rate

- **Per task commit:** `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs`
- **Per wave merge:** Full suite (same command)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `lib/resolve.cjs` -- centralized resolver module
- [ ] `lib/dep-graph.cjs` -- dependency graph builder + cycle detector
- [ ] `dynamo/tests/circular-deps.test.cjs` -- circular dependency detection test
- [ ] `dynamo/tests/resolve.test.cjs` -- resolver unit tests (optional but recommended)
- [ ] `dynamo/tests/dep-graph.test.cjs` -- dep-graph unit tests (optional but recommended)
- [ ] Update `dynamo/tests/boundary.test.cjs` -- add resolver pattern assertions, lib/ existence check

## Sources

### Primary (HIGH confidence)

- **Codebase direct inspection** -- all 25 production .cjs files read and analyzed for require patterns, resolveCore/resolveSibling/resolveHandlers usage
- **Existing test suite** -- 375 tests (374 pass, 1 skipped) verified running, test pattern conventions observed
- **DYNAMO-PRD.md** -- six-subsystem architecture, target directory structure (section 2.2), lib/ shared substrate definition (section 2.3)
- **STRUCTURE.md, ARCHITECTURE.md, CONVENTIONS.md** -- current codebase organization, import boundaries, module patterns

### Secondary (MEDIUM confidence)

- [Node.js CJS module lexer](https://github.com/nodejs/cjs-module-lexer) -- official Node.js tool for CJS static analysis (confirms regex approach is viable for simple cases)
- [Automate Circular Dependency Detection](https://sanyamaggarwal.medium.com/automate-circular-dependency-detection-in-your-node-js-project-394ed08f64bf) -- DFS approach for cycle detection in Node.js projects
- [madge](https://www.npmjs.com/package/madge) -- reference implementation for module dependency graph analysis (confirmed DFS is standard approach)

### Tertiary (LOW confidence)

- None -- all findings verified through direct codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero-npm-dependency constraint makes the choice trivial (Node.js built-ins only)
- Architecture: HIGH -- resolver design is fully specified in CONTEXT.md decisions; layout detection logic verified against actual file structure in both repo and deployed layouts
- Pitfalls: HIGH -- every pitfall identified from actual codebase inspection (test assertions, deploy pipeline gaps, bootstrap depth mismatches)
- Migration inventory: HIGH -- every production file inspected, every require pattern cataloged

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable -- codebase architecture is under our control)
