# Phase 1: Core Library - Research

**Researched:** 2026-03-22
**Domain:** CJS library patterns on Bun -- Result types, contract validation, path resolution, configuration loading
**Confidence:** HIGH

## Summary

Phase 1 builds the pure foundation library (`lib/`) that every subsequent Dynamo layer imports. This is greenfield CJS code running on Bun >= 1.3.10 with zero npm dependencies. The scope covers four distinct capabilities: (1) shared error/result type patterns with typed error codes, (2) factory-based contract validation with shape checking at bind-time, (3) a central path registry with marker-file root discovery, and (4) a hierarchical configuration loader with 5-level deep-merge precedence.

All four capabilities are well-understood patterns with no exotic dependencies. The primary technical considerations are: using `.test.js` files for bun:test discovery (Bun does not discover `.test.cjs`), implementing a zero-dependency deep-merge for config precedence, building a minimal schema validator without external libraries, and ensuring `__dirname`-based root discovery works correctly in Bun's CJS runtime. The Bun version on this machine (1.2.3) must be upgraded to >= 1.3.10 before any implementation begins.

**Primary recommendation:** Build four focused modules (`lib/result.cjs`, `lib/contract.cjs`, `lib/paths.cjs`, `lib/config.cjs`) plus a minimal schema validator (`lib/schema.cjs`), each with comprehensive bun:test coverage. Use `.test.js` extension for all test files. Use `node:path` for path operations and `Bun.file().json()` for config file reading. No npm dependencies.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Result types (Ok/Err) for communicating failure across layers. Functions return `{ok: true, value}` or `{ok: false, error}`. Exceptions reserved for truly unexpected crashes only -- not for expected failures. Aligns with deterministic routing principle.
- **D-02:** Result errors carry typed error codes with structure: `{code, message, context}`. Codes defined per domain in lib/. Downstream code switches on codes, never parses message strings.
- **D-03:** Factory functions + shape validation for contracts in CJS. Contracts defined as plain objects with required/optional method names. Validation happens at bind-time (factory creation), not at import-time. Aligns with options-based DI validated in v0.
- **D-04:** Central path registry (`lib/paths.cjs`) that computes all directory locations from a discovered root. Every component imports paths and asks for what it needs -- no hardcoded paths anywhere.
- **D-05:** Root discovery via marker file search -- walk up from `__dirname` looking for `.dynamo` marker file or `config.json`. Works regardless of install location (dev repo vs deployed).
- **D-06:** The architecture plan's logical import paths (e.g., `Dynamo/Services/Assay/assay.cjs`) are deferred to Phase 4 (Armature). Phase 1 uses actual `require()` paths with the central path registry.
- **D-07:** Deep merge with override for 5 precedence levels (defaults < global config.json < project .dynamo/config.json < env vars DYNAMO_* < runtime options). Arrays are replaced, not concatenated. Env vars use `DYNAMO_` prefix with dot-path convention.
- **D-08:** Config validation at load time -- fail fast with clear errors. Boot never completes with invalid config. Returns Result type on failure.
- **D-09:** Minimal built-in schema validator in lib/ (zero npm dependencies). Handles type checks, required fields, defaults, and nested objects. Zod reserved for MCP SDK boundary in later phases.
- **D-10:** Named exports objects (`module.exports = { ... }`) as the primary export pattern. No default exports. Consistent, destructurable, easy to test.
- **D-11:** JSDoc type annotations (`@param`, `@returns`, `@typedef`) on all public API exports and contract definitions. Internal helpers can skip JSDoc.
- **D-12:** `Object.freeze()` on contract instances (validated factory output) only. Utility exports and config objects are not frozen -- immutability by convention for those.
- **D-13:** `'use strict'` at the top of every file (stated in architecture plan, confirmed here).

### Claude's Discretion
- Internal file organization within `lib/` (how many files, what groups together)
- Specific error code naming conventions (UPPER_SNAKE is implied but Claude can refine)
- Whether `discoverRoot()` caches its result or recomputes

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LIB-01 | Shared utility patterns (error types, result types, contract patterns) | Result type Ok/Err pattern (D-01, D-02), factory-based contract validation with shape checking (D-03), Object.freeze on validated contracts (D-12). All implementable in pure CJS with no dependencies. |
| LIB-02 | Path resolution and module identity system | Central path registry computing all directory locations from discovered root (D-04), marker file root discovery walking up from __dirname (D-05), deferred logical import paths (D-06). node:path fully supported in Bun. |
| LIB-03 | Configuration loader with hierarchical precedence | 5-level deep merge (D-07), fail-fast validation returning Result type (D-08), minimal zero-dependency schema validator (D-09). Bun.file().json() for reading config files, Bun.env/process.env for DYNAMO_* env vars. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

The following directives from CLAUDE.md constrain this phase:

- **Runtime**: Bun -- all code runs on Bun, CJS format
- **No npm dependencies**: Platform core uses only Bun/Node built-ins
- **Module format**: CJS throughout -- `require()` / `module.exports`, no ESM `import`/`export` in source files
- **`'use strict'`** at the top of every file
- **JSDoc type annotations** on public APIs
- **Engineering principles**: Strict separation of concerns, IoC, DRY, abstraction over lateralization, hardcode nothing
- **Versioning**: User decides all version increments. Always push to origin after commits. Feature branches fold into dev.
- **Data formats**: JSON for structured data, Markdown for narrative data
- **Testing**: `bun:test` (not `node:test`, not Jest, not Vitest)
- **Canonical documents**: `.claude/new-plan.md` is absolute canon for architecture decisions

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bun | >= 1.3.10 (latest: 1.3.11) | JavaScript runtime | Architecture decision. Native CJS support, built-in test runner, built-in file I/O. Validated in v0. |
| `node:path` | Built-in (Bun compat) | Path manipulation | Full Bun compatibility confirmed. resolve, join, dirname, basename, relative, sep, isAbsolute all available. |
| `node:fs` | Built-in (Bun compat) | Directory operations | existsSync, mkdirSync, readdirSync for path discovery. Bun supports with 90%+ Node.js test suite pass rate. |
| `Bun.file()` / `Bun.write()` | Built-in | File read/write | Lazy file loading, `.json()` for direct JSON parsing. Used for config file reads. |
| `bun:test` | Built-in | Test runner | Jest-compatible API. describe/it/expect/mock/spyOn/beforeAll/afterAll. mock.module() supports CJS require. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:events` | Built-in (Bun compat) | EventEmitter | Not needed in Phase 1, but listed for awareness -- used in Phase 2 (Switchboard). |
| `process.env` / `Bun.env` | Built-in | Environment variable access | Config loader reads DYNAMO_* prefixed env vars. Both are equivalent in Bun. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom schema validator | Zod | Zod adds npm dependency; decision D-09 explicitly defers Zod to MCP boundary in later phases |
| Custom deep merge | lodash.merge / deepmerge | Adds npm dependency; simple recursive merge is ~30 lines and handles the specified behavior (replace arrays) |
| Custom Result type | neverthrow / true-myth | Adds npm dependency; the Ok/Err shape is 10 lines of code with JSDoc types |

**Installation:**
```bash
# No packages to install for Phase 1. Zero npm dependencies.
# Bun upgrade required:
bun upgrade  # Must reach >= 1.3.10
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
  result.cjs          # Ok/Err result types, error code definitions
  contract.cjs        # Factory-based contract validation
  schema.cjs          # Minimal schema validator (type checks, required, defaults, nested)
  paths.cjs           # Root discovery + central path registry
  config.cjs          # Hierarchical config loader with deep merge
  index.cjs           # Barrel export: re-exports all public APIs from lib/
  __tests__/           # Test directory
    result.test.js    # Tests for result types
    contract.test.js  # Tests for contract validation
    schema.test.js    # Tests for schema validator
    paths.test.js     # Tests for path resolution
    config.test.js    # Tests for config loader
```

### Pattern 1: Result Type (Ok/Err)
**What:** Deterministic error communication without exceptions
**When to use:** Every function that can fail returns a Result instead of throwing
**Example:**
```javascript
'use strict';

/**
 * @typedef {{ ok: true, value: T }} Ok
 * @template T
 */

/**
 * @typedef {{ ok: false, error: DynamoError }} Err
 */

/**
 * @typedef {{ code: string, message: string, context?: Record<string, unknown> }} DynamoError
 */

/**
 * @param {T} value
 * @returns {Ok<T>}
 * @template T
 */
function ok(value) {
  return { ok: true, value };
}

/**
 * @param {string} code
 * @param {string} message
 * @param {Record<string, unknown>} [context]
 * @returns {Err}
 */
function err(code, message, context) {
  return { ok: false, error: { code, message, context } };
}

module.exports = { ok, err };
```

### Pattern 2: Contract Factory with Shape Validation
**What:** Runtime contract enforcement via factory functions that validate an implementation object against a contract shape at bind-time
**When to use:** When a service or provider must satisfy a defined interface
**Example:**
```javascript
'use strict';

/**
 * Creates a validated contract instance.
 * @param {string} name - Contract name for error messages
 * @param {Object} shape - Required/optional method definitions
 * @param {string[]} shape.required - Required method names
 * @param {string[]} [shape.optional] - Optional method names
 * @param {Object} implementation - The object to validate
 * @returns {Result<Object>} - Frozen contract instance or error
 */
function createContract(name, shape, implementation) {
  for (const method of shape.required) {
    if (typeof implementation[method] !== 'function') {
      return err('CONTRACT_MISSING_METHOD',
        `Contract "${name}" requires method "${method}"`,
        { contract: name, method });
    }
  }
  return ok(Object.freeze({ ...implementation }));
}

module.exports = { createContract };
```

### Pattern 3: Marker-File Root Discovery
**What:** Walk up directory tree from `__dirname` looking for `.dynamo` marker or `config.json`
**When to use:** Called once at startup to establish the Dynamo root directory
**Example:**
```javascript
'use strict';
const path = require('node:path');
const fs = require('node:fs');

function discoverRoot(startDir) {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, '.dynamo'))) return ok(dir);
    if (fs.existsSync(path.join(dir, 'config.json'))) return ok(dir);
    const parent = path.dirname(dir);
    if (parent === dir) {
      return err('ROOT_NOT_FOUND',
        'Could not find Dynamo root (.dynamo marker or config.json)',
        { startDir });
    }
    dir = parent;
  }
}
```

### Pattern 4: Hierarchical Config with Deep Merge
**What:** 5-level precedence config: defaults < global < project < env < runtime
**When to use:** At boot, before any service initialization
**Example:**
```javascript
'use strict';

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] !== null && typeof source[key] === 'object'
        && !Array.isArray(source[key])
        && typeof result[key] === 'object'
        && !Array.isArray(result[key])
        && result[key] !== null) {
      result[key] = deepMerge(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
```

### Pattern 5: Environment Variable Mapping
**What:** Map `DYNAMO_*` env vars to config paths using dot convention
**When to use:** During config loading, after file-based configs are merged
**Example:**
```javascript
'use strict';

/**
 * Parse DYNAMO_ prefixed env vars into a config object.
 * DYNAMO_FOO_BAR=value becomes { foo: { bar: 'value' } }
 */
function envToConfig(env) {
  const config = {};
  const prefix = 'DYNAMO_';
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith(prefix)) continue;
    const path = key.slice(prefix.length).toLowerCase().split('_');
    let current = config;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]] || typeof current[path[i]] !== 'object') {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    current[path[path.length - 1]] = coerceValue(value);
  }
  return config;
}
```

### Anti-Patterns to Avoid
- **Throwing exceptions for expected failures:** Use Result type (D-01). Exceptions only for truly unexpected crashes (programming errors, out of memory).
- **Import-time validation:** Contract validation happens at bind-time (factory creation), not when a module is `require()`-d (D-03). This enables options-based DI where mocks bypass validation.
- **Hardcoded paths:** No `'/Users/tom/dynamo/lib/'` anywhere. Every path computed from discovered root (D-04).
- **`module.exports = function`:** Use named exports objects `module.exports = { fn1, fn2 }` (D-10). No default exports.
- **Mutable contract instances:** `Object.freeze()` validated contract instances (D-12).
- **Parsing error message strings downstream:** Error codes are the switching mechanism (D-02). Messages are for humans only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Path manipulation | Custom string splitting/joining for file paths | `node:path` (resolve, join, dirname, basename) | Edge cases: Windows separators, trailing slashes, relative resolution, `.` and `..` handling |
| File existence checks | Custom stat-based checks | `fs.existsSync()` via `node:fs` | Synchronous, handles race conditions, returns boolean |
| JSON file reading | Manual fs.readFileSync + JSON.parse | `Bun.file(path).json()` | Lazy loading, optimized Zig implementation, handles encoding |
| Directory walking | Custom recursive readdir | `fs.existsSync()` in a while loop for root discovery | The walk is upward (parent directories), not recursive descent -- simple loop is correct here |

**Key insight:** For Phase 1, the "don't hand-roll" list is short because most capabilities ARE hand-rolled by design (zero npm dependencies). The key is to use Bun/Node built-ins where they exist rather than reimplementing path joining or file reading.

## Common Pitfalls

### Pitfall 1: Test File Extension
**What goes wrong:** Test files named `*.test.cjs` are not discovered by `bun test`
**Why it happens:** Bun's test discovery only matches `*.test.{js|jsx|ts|tsx}` and `*.spec.{js|jsx|ts|tsx}`. The `.cjs` extension is not in the discovery pattern.
**How to avoid:** Use `.test.js` extension for all test files. Bun detects CJS via `module.exports` usage in the transpiler, not by file extension. A `.test.js` file using `require('bun:test')` and `module.exports` works correctly as CJS.
**Warning signs:** `bun test` reports "0 tests found" despite test files existing.

### Pitfall 2: Bun Version Mismatch
**What goes wrong:** Code written for Bun >= 1.3.10 features fails on the currently installed Bun 1.2.3
**Why it happens:** The machine has Bun 1.2.3 but the project requires >= 1.3.10 for the faster event loop, structuredClone improvements, and stable NAPI (needed in Phase 3 for DuckDB).
**How to avoid:** First task in the plan must be `bun upgrade` to >= 1.3.10. Verify with `bun --version`.
**Warning signs:** Subtle runtime differences, missing APIs, or crashes in later phases with native modules.

### Pitfall 3: Deep Merge Array Handling
**What goes wrong:** Arrays are concatenated instead of replaced during config merge
**Why it happens:** Many deep-merge implementations (lodash, deepmerge) concatenate arrays by default. Decision D-07 explicitly requires arrays to be REPLACED, not concatenated.
**How to avoid:** The deep-merge function must check `Array.isArray()` and treat arrays as leaf values (full replacement), not as objects to recurse into.
**Warning signs:** Config arrays growing unexpectedly across merge levels.

### Pitfall 4: Root Discovery Infinite Loop
**What goes wrong:** `discoverRoot()` loops forever if neither `.dynamo` nor `config.json` exists anywhere in the path
**Why it happens:** The loop walks up parent directories but might not detect filesystem root
**How to avoid:** Check `path.dirname(dir) === dir` as the termination condition. On Unix, `path.dirname('/') === '/'`. Return an Err result when root is reached without finding marker.
**Warning signs:** Process hangs during startup.

### Pitfall 5: Environment Variable Type Coercion
**What goes wrong:** All env vars are strings, but config expects numbers, booleans, or null
**Why it happens:** `process.env` / `Bun.env` always returns string values. `DYNAMO_PORT=3000` gives `"3000"` not `3000`.
**How to avoid:** The env-to-config mapper must coerce values: `"true"`/`"false"` to booleans, numeric strings to numbers, `"null"` to null. Document the coercion rules.
**Warning signs:** Type validation fails on env-sourced config values.

### Pitfall 6: Circular Dependencies in lib/
**What goes wrong:** `result.cjs` requires `schema.cjs` which requires `result.cjs` -- Node/Bun returns a partial module
**Why it happens:** In CJS, circular requires return whatever `module.exports` has been assigned so far (partial object). This leads to undefined function errors at runtime.
**How to avoid:** Establish a strict dependency order within lib/: `result.cjs` (depends on nothing) -> `schema.cjs` (may depend on result) -> `contract.cjs` (depends on result, may use schema) -> `paths.cjs` (depends on result) -> `config.cjs` (depends on result, schema, paths). Never allow reverse dependencies.
**Warning signs:** `TypeError: X is not a function` at require-time in certain load orders.

### Pitfall 7: Object.freeze Depth
**What goes wrong:** `Object.freeze()` is shallow -- nested objects remain mutable
**Why it happens:** JavaScript's `Object.freeze()` only freezes own properties one level deep
**How to avoid:** For contract instances (D-12), shallow freeze is sufficient since contracts contain method references (functions), not nested mutable state. Document this explicitly. If deep freeze is ever needed, implement a recursive freeze utility, but do NOT apply it to config objects (which should remain mutable by convention).
**Warning signs:** Downstream code mutating a supposedly-frozen contract's nested property.

## Code Examples

### CJS Module Template
```javascript
// Source: Project convention from CLAUDE.md + D-10, D-11, D-13
'use strict';

const { ok, err } = require('./result.cjs');

/**
 * @typedef {Object} MyExport
 * @property {function(string): Result<number>} parse
 */

/**
 * Parses a string to a number, returning Result.
 * @param {string} input
 * @returns {import('./result.cjs').Result<number>}
 */
function parse(input) {
  const num = Number(input);
  if (Number.isNaN(num)) {
    return err('PARSE_FAILED', `Cannot parse "${input}" as number`, { input });
  }
  return ok(num);
}

module.exports = { parse };
```

### bun:test CJS Test File
```javascript
// Source: Bun docs https://bun.com/docs/test + CJS adaptation
// File: lib/__tests__/result.test.js  (NOT .test.cjs)
'use strict';

const { describe, it, expect, beforeEach, mock } = require('bun:test');
const { ok, err } = require('../result.cjs');

describe('Result types', () => {
  it('creates Ok result', () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(42);
  });

  it('creates Err result with typed error', () => {
    const result = err('NOT_FOUND', 'Item not found', { id: '123' });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('NOT_FOUND');
    expect(result.error.message).toBe('Item not found');
    expect(result.error.context).toEqual({ id: '123' });
  });
});
```

### mock.module() for CJS Dependencies
```javascript
// Source: Bun docs https://bun.com/docs/test/mocks
'use strict';

const { describe, it, expect, mock, beforeEach, afterEach } = require('bun:test');

// Mock the fs module before importing paths.cjs
mock.module('node:fs', () => ({
  existsSync: mock((p) => p.endsWith('.dynamo')),
}));

const { discoverRoot } = require('../paths.cjs');

describe('discoverRoot', () => {
  afterEach(() => {
    mock.restore();
  });

  it('finds root via .dynamo marker', () => {
    const result = discoverRoot('/fake/project/lib');
    expect(result.ok).toBe(true);
  });
});
```

### Schema Validator Pattern
```javascript
// Source: Custom implementation per D-09 (minimal built-in validator)
'use strict';

const { ok, err } = require('./result.cjs');

/**
 * @typedef {Object} SchemaField
 * @property {'string'|'number'|'boolean'|'object'|'array'} type
 * @property {boolean} [required]
 * @property {*} [default]
 * @property {Object<string, SchemaField>} [properties] - For nested objects
 */

/**
 * Validate a value against a schema.
 * @param {*} value
 * @param {Object<string, SchemaField>} schema
 * @returns {import('./result.cjs').Result<Object>}
 */
function validate(value, schema) {
  if (typeof value !== 'object' || value === null) {
    return err('SCHEMA_INVALID_ROOT', 'Value must be a non-null object');
  }
  const result = {};
  const errors = [];
  for (const [key, field] of Object.entries(schema)) {
    const val = value[key];
    if (val === undefined) {
      if (field.required) {
        errors.push({ key, code: 'REQUIRED', message: `"${key}" is required` });
        continue;
      }
      if (field.default !== undefined) {
        result[key] = field.default;
        continue;
      }
      continue;
    }
    // Type check
    if (field.type === 'array') {
      if (!Array.isArray(val)) {
        errors.push({ key, code: 'TYPE_MISMATCH', message: `"${key}" must be an array` });
        continue;
      }
    } else if (typeof val !== field.type) {
      errors.push({ key, code: 'TYPE_MISMATCH',
        message: `"${key}" must be ${field.type}, got ${typeof val}` });
      continue;
    }
    // Nested object validation
    if (field.type === 'object' && field.properties) {
      const nested = validate(val, field.properties);
      if (!nested.ok) {
        errors.push(...nested.error.context.errors.map(e => ({
          ...e, key: `${key}.${e.key}` })));
        continue;
      }
      result[key] = nested.value;
      continue;
    }
    result[key] = val;
  }
  if (errors.length > 0) {
    return err('SCHEMA_VALIDATION_FAILED', 'Config validation failed',
      { errors });
  }
  return ok(result);
}

module.exports = { validate };
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `node:test` for testing | `bun:test` | Bun 1.0+ (architecture decision) | Jest-compatible API, built-in mocking, 15x faster. `node:test` has incomplete Bun support. |
| `fs.readFileSync` + `JSON.parse` | `Bun.file(path).json()` | Bun 1.0+ | Lazy loading, async, optimized Zig implementation |
| `dotenv` package for .env | Bun auto-loads .env | Bun 1.0+ | Zero dependency. Precedence: `.env` < `.env.{development,production,test}` < `.env.local` |
| `__dirname` in ESM (workaround) | `__dirname` native in CJS on Bun | Always (CJS) | `__dirname` and `__filename` work natively in CJS files on Bun. No workarounds needed. |
| TypeScript for type safety | JSDoc + `@ts-check` | Architecture decision | No build step, CJS-native, IDE type hints via JSDoc `@typedef`, `@param`, `@returns` |

**Deprecated/outdated:**
- `node:test` on Bun: Missing mocking, snapshot testing, timer manipulation. Use `bun:test`.
- `better-sqlite3`: Bun has built-in `bun:sqlite` that is 3-6x faster. Not needed in Phase 1 regardless.
- `dotenv`: Bun auto-loads `.env` files. No package needed.

## Open Questions

1. **bun:test with require() in test files**
   - What we know: Bun docs show `import { test, expect } from 'bun:test'` (ESM syntax). The project requires CJS. Bun's transpiler supports `require('bun:test')` because Bun can require ESM modules.
   - What's unclear: Whether all bun:test features (mock.module, snapshot) work identically when accessed via `require('bun:test')` vs `import`.
   - Recommendation: Validate in Wave 0 with a simple test file using `require('bun:test')`. If any feature is broken, use `import` from `bun:test` (Bun allows ESM imports in files that also use `module.exports` -- it detects CJS by the presence of `module.exports`, not by absence of `import`).

2. **Bun.file().json() synchronous alternative**
   - What we know: `Bun.file(path).json()` is async (returns Promise). Config loading happens at boot and may benefit from synchronous reading for simplicity.
   - What's unclear: Whether there's a synchronous Bun API for JSON file reading, or if `require('./config.json')` (which is synchronous in CJS) is the better approach for boot-time config.
   - Recommendation: Use `require()` for JSON files when synchronous loading is needed at boot (Bun supports `require('*.json')` natively). Use `Bun.file().json()` only if async config loading becomes a requirement.

3. **discoverRoot() caching strategy**
   - What we know: Root discovery walks the filesystem. The root cannot change during a process lifetime.
   - What's unclear: Whether to cache at module scope (simple but harder to test) or cache in a mutable variable with a reset function (testable).
   - Recommendation: Cache in a module-scope variable with an exported `_resetRoot()` function prefixed with underscore (test-only API convention). This keeps the common path fast while enabling test isolation.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | All code | Yes (WRONG VERSION) | 1.2.3 (need >= 1.3.10) | Must upgrade -- no fallback |
| `node:path` | Path resolution | Yes | Built-in | -- |
| `node:fs` | Root discovery, file checks | Yes | Built-in | -- |
| `bun:test` | Test runner | Yes (after upgrade) | Built-in | -- |
| git | Version control | Yes | Installed | -- |

**Missing dependencies with no fallback:**
- Bun version 1.2.3 is installed but >= 1.3.10 is required. Must run `bun upgrade` before any implementation. This is Wave 0 / pre-flight.

**Missing dependencies with fallback:**
- None. All other dependencies are Bun/Node built-ins.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built into Bun >= 1.0) |
| Config file | `bunfig.toml` (create in Wave 0 if needed for test root config) |
| Quick run command | `bun test lib/` |
| Full suite command | `bun test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIB-01a | ok() creates Ok result with value | unit | `bun test lib/__tests__/result.test.js` | Wave 0 |
| LIB-01b | err() creates Err result with code/message/context | unit | `bun test lib/__tests__/result.test.js` | Wave 0 |
| LIB-01c | createContract() validates required methods exist | unit | `bun test lib/__tests__/contract.test.js` | Wave 0 |
| LIB-01d | createContract() returns frozen instance on success | unit | `bun test lib/__tests__/contract.test.js` | Wave 0 |
| LIB-01e | createContract() returns Err for missing methods | unit | `bun test lib/__tests__/contract.test.js` | Wave 0 |
| LIB-02a | discoverRoot() finds .dynamo marker walking up | unit | `bun test lib/__tests__/paths.test.js` | Wave 0 |
| LIB-02b | discoverRoot() finds config.json as fallback | unit | `bun test lib/__tests__/paths.test.js` | Wave 0 |
| LIB-02c | discoverRoot() returns Err at filesystem root | unit | `bun test lib/__tests__/paths.test.js` | Wave 0 |
| LIB-02d | paths registry returns correct absolute paths for all layout dirs | unit | `bun test lib/__tests__/paths.test.js` | Wave 0 |
| LIB-03a | loadConfig() merges 5 precedence levels correctly | unit | `bun test lib/__tests__/config.test.js` | Wave 0 |
| LIB-03b | loadConfig() replaces arrays (not concatenates) | unit | `bun test lib/__tests__/config.test.js` | Wave 0 |
| LIB-03c | loadConfig() maps DYNAMO_* env vars to config paths | unit | `bun test lib/__tests__/config.test.js` | Wave 0 |
| LIB-03d | loadConfig() returns Err for invalid config | unit | `bun test lib/__tests__/config.test.js` | Wave 0 |
| LIB-03e | Schema validator rejects missing required fields | unit | `bun test lib/__tests__/schema.test.js` | Wave 0 |
| LIB-03f | Schema validator applies defaults for missing optional fields | unit | `bun test lib/__tests__/schema.test.js` | Wave 0 |
| LIB-03g | Schema validator handles nested object validation | unit | `bun test lib/__tests__/schema.test.js` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test lib/`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `lib/__tests__/result.test.js` -- covers LIB-01a, LIB-01b
- [ ] `lib/__tests__/contract.test.js` -- covers LIB-01c, LIB-01d, LIB-01e
- [ ] `lib/__tests__/schema.test.js` -- covers LIB-03e, LIB-03f, LIB-03g
- [ ] `lib/__tests__/paths.test.js` -- covers LIB-02a, LIB-02b, LIB-02c, LIB-02d
- [ ] `lib/__tests__/config.test.js` -- covers LIB-03a, LIB-03b, LIB-03c, LIB-03d
- [ ] Bun upgrade to >= 1.3.10
- [ ] Verify `require('bun:test')` works correctly in `.test.js` CJS files
- [ ] Create `lib/` and `lib/__tests__/` directories
- [ ] Create `.dynamo` marker file at project root

## Sources

### Primary (HIGH confidence)
- [Bun test runner docs](https://bun.com/docs/test) -- test API, discovery patterns, lifecycle hooks
- [Bun test mocks docs](https://bun.com/docs/test/mocks) -- mock(), mock.module(), spyOn(), CJS+ESM mock support
- [Bun test discovery docs](https://bun.com/docs/test/discovery) -- file patterns: `*.test.{js|jsx|ts|tsx}` only, no `.cjs`
- [Bun file I/O docs](https://bun.com/docs/api/file-io) -- Bun.file(), Bun.write(), .json() parsing
- [Bun module resolution docs](https://bun.com/docs/runtime/module-resolution) -- CJS detection via module.exports, .cjs support
- [Bun environment variables docs](https://bun.com/docs/runtime/environment-variables) -- auto .env loading, Bun.env, precedence
- [Bun node:path reference](https://bun.com/reference/node/path) -- full node:path compatibility confirmed
- [Bun GitHub releases](https://github.com/oven-sh/bun/releases) -- latest: v1.3.11 (2026-03-18)
- [Bun v1.3.10 blog](https://bun.sh/blog/bun-v1.3.10) -- ES decorators, faster event loop, structuredClone improvements

### Secondary (MEDIUM confidence)
- [CommonJS is not going away (Bun blog)](https://bun.sh/blog/commonjs-is-not-going-away) -- Bun's CJS philosophy and first-class support
- [TypeScript JSDoc reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html) -- @typedef, @param, @returns patterns
- [Deep merge gist (ES6)](https://gist.github.com/ahtcx/0cd94e62691f539160b32ecda18af3d6) -- reference implementation for recursive merge
- [Result Pattern article (DEV.to)](https://dev.to/gautam_kumar_d3daad738680/goodbye-exceptions-mastering-error-handling-in-javascript-with-the-result-pattern-26kb) -- Ok/Err pattern in JavaScript

### Tertiary (LOW confidence)
- None. All findings verified against official Bun documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All built-in Bun/Node APIs, no external dependencies. Verified against official docs.
- Architecture: HIGH -- Patterns are simple CJS with well-understood JavaScript constructs. All decisions locked in CONTEXT.md.
- Pitfalls: HIGH -- Test discovery limitation verified against official Bun docs. Deep merge behavior specified explicitly in decisions. Bun version gap confirmed by checking installed version.
- Validation: HIGH -- bun:test is well-documented with Jest-compatible API. All tests are pure unit tests with no external dependencies.

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (30 days -- stable domain, Bun 1.3.x is mature)
