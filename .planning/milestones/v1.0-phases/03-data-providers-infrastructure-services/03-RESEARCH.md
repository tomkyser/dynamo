# Phase 3: Data Providers & Infrastructure Services - Research

**Researched:** 2026-03-23
**Domain:** Data persistence (DuckDB, flat-file markdown), infrastructure services (git CLI, Docker Compose, install/update orchestration)
**Confidence:** HIGH

## Summary

Phase 3 delivers five components: two data providers (Ledger and Journal) and three infrastructure services (Forge, Conductor, Relay). All follow the established service factory pattern with lifecycle methods and options-based DI from Phase 2. The data providers implement a uniform `read/write/query/delete` contract (separate from Magnet's `load/save/clear` state provider contract per D-01). The infrastructure services shell out to external CLIs (git, docker compose) via Bun.spawn/Bun.spawnSync.

The primary risk is DuckDB `@duckdb/node-api` native N-API bindings on Bun 1.3.11. The package is ESM-only (uses `import` syntax), but Bun's CJS runtime can `require()` ESM modules natively, returning the module namespace object. D-04 mandates a smoke test first, with bun:sqlite as the fallback behind the same contract. All other components use zero npm dependencies -- git via CLI, Docker via CLI, markdown via built-in string parsing, and YAML frontmatter via a lightweight custom parser (no `js-yaml` per project constraints).

**Primary recommendation:** Start with a DuckDB smoke test task, then build Ledger and Journal as parallel provider implementations behind the same DATA_PROVIDER_SHAPE contract. Build Forge first among infrastructure services (Relay depends on it for git operations), then Conductor and Relay.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Two separate provider contracts. State providers (Magnet's existing load/save/clear) and data providers (read/write/query/delete) are different shapes for different jobs. No forced unification. Armature registers them in different provider domains in Phase 4.
- **D-02:** Data provider contract: `read(id)`, `write(id, data)`, `query(criteria)`, `delete(id)` as the uniform interface. Both Ledger and Journal implement this same shape.
- **D-03:** Unified `query(criteria)` method. Criteria is a plain object. Each provider translates internally -- Ledger maps to SQL WHERE clauses, Journal scans frontmatter keys. Provider-specific query optimization deferred to Assay in Phase 6.
- **D-04:** Validate DuckDB on Bun first. First task in the Ledger plan: install `@duckdb/node-api`, run a smoke test on Bun >= 1.3.10. If it works, build on DuckDB. If native bindings fail, build on bun:sqlite immediately. No wasted effort.
- **D-05:** bun:sqlite as fallback implementation. Ledger is built behind the data provider contract. Primary backend: DuckDB. If native bindings fail, swap to bun:sqlite behind the same contract. Both are SQL, so the contract surface is identical. Loses DuckDB's OLAP features but keeps Ledger functional.
- **D-06:** Full infrastructure manager. Build Docker/Compose lifecycle management now, even before Wire needs it. Conductor manages process start/stop/health for containerized services, Docker Compose up/down/status via Bun.spawn, and dependency health checks (Bun version, DuckDB loadable, git installed, disk space).
- **D-07:** Graceful degradation when Docker is absent. Conductor checks for Docker availability at start(). If present, full lifecycle management. If absent, reports 'Docker not available' in health checks and skips container operations. Platform works without Docker installed.
- **D-08:** Full lifecycle management scope. Relay manages: (1) Dynamo platform self-install and self-update, (2) plugins as git submodules via Forge, (3) modules as git submodules via Forge. Each operation follows backup -> modify -> verify -> commit (or rollback) semantics.
- **D-09:** Config migration between versions. Relay handles schema evolution and defaults backfill when updates change config.json shape. Ensures config stays valid across version transitions.
- **D-10:** Git-based rollback mechanism. Relay creates a git tag before operations, uses Forge to commit changes atomically. Rollback = git reset to the tagged state. Leverages existing git infrastructure, no separate backup storage needed.

### Claude's Discretion
- DuckDB schema design (table structure, indexes, column types for Ledger)
- Journal's frontmatter parsing implementation (regex vs dedicated parser)
- Forge's specific git command set beyond requirements (status, commit, branch, submodule add/update/remove)
- Conductor's health check polling frequency and timeout values
- Relay's config migration strategy (version stamping, transform functions, etc.)
- Internal file organization within each service directory

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRV-01 | Ledger -- DuckDB embedded database provider with uniform provider interface | DuckDB `@duckdb/node-api` 1.5.0 API documented; CJS interop via Bun require() of ESM; single-writer concurrency model; bun:sqlite fallback path; DATA_PROVIDER_SHAPE contract design |
| PRV-02 | Journal -- Flat file markdown provider with uniform provider interface | Lathe service available for all file I/O; custom YAML frontmatter parser (regex-based, no npm dep); same DATA_PROVIDER_SHAPE; frontmatter-based query via in-memory scan |
| SVC-05 | Forge -- Git ops, submodule management, branch-aware operations, repo-to-deploy sync | Bun.spawnSync for synchronous git commands; Bun.spawn for async ops; full git CLI patterns documented; Lathe for file sync |
| SVC-06 | Conductor -- Infrastructure ops (Docker/Compose lifecycle, dependency management) | Docker 27.1.2 and Compose v2.39.2 available; Bun.spawn for `docker compose` CLI; graceful degradation pattern for absent Docker; dependency health checks (Bun version, git, disk space) |
| SVC-07 | Relay -- Install/update/sync orchestration with rollback capability | Git-based rollback via tags; backup-before-modify pattern; config migration with version stamping; Forge dependency for git operations |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@duckdb/node-api` | 1.5.0 | Ledger provider SQL backend | Official DuckDB Node.js Neo client. Embedded, serverless, OLAP-oriented. N-API bindings work on Bun >= 1.2.2 (crash fix). ESM package but Bun can require() it. |
| `bun:sqlite` | Built-in | Ledger fallback if DuckDB fails | Zero-dependency, synchronous API, 3-6x faster than better-sqlite3. Same SQL contract surface as DuckDB for the data provider interface. |
| Bun.spawn / Bun.spawnSync | Built-in | Forge (git), Conductor (docker) | 60% faster than Node.js child_process. Direct CLI invocation, no library dependency. |
| Bun.file / Bun.write | Built-in | Journal file I/O (via Lathe) | Atomic writes, lazy loading. Already validated in Lathe service. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:fs` | Built-in (compat) | Directory operations (mkdir, readdir) | When Bun native API does not cover the operation (already established in Lathe) |
| `node:path` | Built-in (compat) | Path manipulation | All path joining, dirname, extension operations |
| `node:crypto` | Built-in (compat) | ID generation | UUID or random ID generation for data provider records |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@duckdb/node-api` | `bun:sqlite` | Loses OLAP features, gains synchronous API and zero setup. D-05 makes this the fallback. |
| Custom YAML frontmatter parser | `gray-matter` / `js-yaml` | External npm dep violates "no npm dependencies for platform core" constraint. Custom regex parser is sufficient for the structured frontmatter schema Reverie defines. |
| Direct git CLI via Bun.spawn | `simple-git` npm | Adds ~50KB dependency for something achievable with Bun.spawn. Project constraint forbids it. |
| Direct docker compose CLI | Docker Compose library bindings | No mature CJS option. Bun.spawn + CLI is the canonical approach per CLAUDE.md. |

**Installation:**
```bash
bun add @duckdb/node-api
```

**Version verification:** `@duckdb/node-api` latest is 1.5.0-r.1 (published 2026-03-21). This is the only npm dependency for Phase 3 -- all other components use Bun/Node built-ins.

## Architecture Patterns

### Recommended Project Structure
```
core/
  providers/
    ledger/
      ledger.cjs            # Ledger provider factory (createLedger)
      provider.cjs           # DATA_PROVIDER_SHAPE contract definition
      duckdb-backend.cjs     # DuckDB implementation
      sqlite-backend.cjs     # bun:sqlite fallback implementation
      __tests__/
        ledger.test.js
        duckdb-backend.test.js
        sqlite-backend.test.js
    journal/
      journal.cjs            # Journal provider factory (createJournal)
      frontmatter.cjs        # YAML frontmatter parser (zero deps)
      __tests__/
        journal.test.js
        frontmatter.test.js
  services/
    forge/
      forge.cjs              # Forge service factory (createForge)
      __tests__/
        forge.test.js
    conductor/
      conductor.cjs          # Conductor service factory (createConductor)
      __tests__/
        conductor.test.js
    relay/
      relay.cjs              # Relay service factory (createRelay)
      __tests__/
        relay.test.js
```

### Pattern 1: Data Provider Contract (DATA_PROVIDER_SHAPE)
**What:** Uniform interface for all data providers, separate from Magnet's STATE_PROVIDER_SHAPE.
**When to use:** Any component that reads/writes structured or document data.
**Example:**
```javascript
// core/providers/ledger/provider.cjs
'use strict';

const { createContract } = require('../../../lib/index.cjs');

const DATA_PROVIDER_SHAPE = {
  required: ['init', 'start', 'stop', 'healthCheck', 'read', 'write', 'query', 'delete'],
  optional: []
};

function validateDataProvider(name, impl) {
  return createContract(name, DATA_PROVIDER_SHAPE, impl);
}

module.exports = { DATA_PROVIDER_SHAPE, validateDataProvider };
```

**Contract method signatures:**
```javascript
// read(id) -> Promise<Result<data>>
// write(id, data) -> Promise<Result<undefined>>
// query(criteria) -> Promise<Result<Array<data>>>
// delete(id) -> Promise<Result<undefined>>
```

Where `criteria` is a plain object like `{ type: 'experiential', 'associations.domains': 'engineering' }`. Ledger translates to SQL WHERE; Journal scans frontmatter keys.

### Pattern 2: Backend Abstraction for Ledger
**What:** Ledger wraps either DuckDB or bun:sqlite behind an internal backend interface.
**When to use:** Isolates the SQL engine choice from the data provider contract.
**Example:**
```javascript
// Internal backend interface (not exposed outside Ledger)
// Both duckdb-backend.cjs and sqlite-backend.cjs implement:
// {
//   open(dbPath) -> Promise<Result<connection>>
//   execute(sql, params) -> Promise<Result<rows>>
//   close() -> Promise<Result<undefined>>
// }
```

### Pattern 3: Service Factory with CLI Subprocess
**What:** Services that wrap external CLIs use Bun.spawnSync for synchronous commands and Bun.spawn for long-running ones.
**When to use:** Forge (git), Conductor (docker compose).
**Example:**
```javascript
// Forge git command pattern
'use strict';

function _runGit(args, options = {}) {
  const result = Bun.spawnSync(['git', ...args], {
    cwd: options.cwd || process.cwd(),
    env: { ...process.env, ...(options.env || {}) },
  });

  if (!result.success) {
    return err('GIT_FAILED', result.stderr.toString().trim(), { args, exitCode: result.exitCode });
  }
  return ok(result.stdout.toString().trim());
}
```

### Pattern 4: Backup-Modify-Verify-Rollback (Relay)
**What:** All Relay operations follow a transactional pattern using git tags.
**When to use:** Install, update, sync, plugin/module management.
**Example:**
```javascript
// 1. Create backup tag via Forge
// forge.tag('relay-backup-' + Date.now())

// 2. Perform modification
// ... install/update/sync operations ...

// 3. Verify result
// ... health checks, config validation ...

// 4. If verify fails, rollback via Forge
// forge.resetTo('relay-backup-' + tagTimestamp)
// forge.deleteTag('relay-backup-' + tagTimestamp)

// 5. If verify passes, commit via Forge
// forge.commit('relay: update complete')
// forge.deleteTag('relay-backup-' + tagTimestamp)
```

### Anti-Patterns to Avoid
- **Sharing DATA_PROVIDER_SHAPE with STATE_PROVIDER_SHAPE:** These are intentionally separate contracts per D-01. State providers do load/save/clear. Data providers do read/write/query/delete. Different jobs, different shapes.
- **Building a generic SQL query builder:** The query(criteria) method translates a plain object to SQL in Ledger-specific code. Do not build a reusable SQL builder -- Assay handles cross-provider query optimization in Phase 6.
- **Synchronous DuckDB operations:** DuckDB's `@duckdb/node-api` is fully async (Promise-based). Do not attempt to make it synchronous. Use `await` throughout.
- **Parsing git output with regex:** Parse `--porcelain` or structured output formats where available. For status, use `git status --porcelain`. For log, use `git log --format=%H`.
- **Catching Docker absence with try/catch on Bun.spawn:** Check `which docker` first. Bun.spawnSync returns `{ success: false }` on command-not-found, but the error message is platform-dependent.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQL database | Custom file-based DB | `@duckdb/node-api` or `bun:sqlite` | Single-writer concurrency, ACID, indexing, query optimization -- all solved |
| Atomic file writes | Custom tmp+rename | Lathe's `writeFileAtomic()` | Already built in Phase 2, handles edge cases (cleanup on failure, directory creation) |
| Event emission | Custom pub/sub | Switchboard service | Already built in Phase 2, supports wildcards and filter pipelines |
| Process spawning | Custom exec wrapper | Bun.spawn / Bun.spawnSync | Built-in, handles stdin/stdout/stderr, exit codes, signals |
| JSON serialization | Custom serializer | `JSON.stringify/parse` | Built-in, handles all types DuckDB and Journal need |
| UUID generation | Custom ID function | `crypto.randomUUID()` | Built-in to Node.js crypto module, available in Bun |
| Path manipulation | String concatenation | `node:path` | Cross-platform path handling, dirname, join, resolve |

**Key insight:** Phase 3 components are integration layers. Ledger integrates a SQL engine. Journal integrates Lathe. Forge integrates git. Conductor integrates Docker. Relay orchestrates Forge operations. The complexity is in the contract design and error handling, not in reimplementing the underlying capabilities.

## Common Pitfalls

### Pitfall 1: DuckDB N-API Crash on Bun
**What goes wrong:** `@duckdb/node-api` uses native N-API bindings that historically crashed on Bun.
**Why it happens:** Bun's N-API implementation had bugs: Bun 1.2.2 fixed DuckDB crash, Bun 1.3.0 fixed `null`-returning `napi_register_module_v1`.
**How to avoid:** D-04 mandates a smoke test first. Bun is currently 1.3.11 which includes all fixes. Test: `const duckdb = require('@duckdb/node-api'); const instance = await duckdb.DuckDBInstance.create(':memory:');`
**Warning signs:** Segfault on require(), undefined exports, or "Cannot find module" errors.

### Pitfall 2: Requiring ESM Package from CJS
**What goes wrong:** `@duckdb/node-api` is an ESM package (uses `import`/`export`). Standard Node.js cannot `require()` ESM.
**Why it happens:** The package ships as ESM-only.
**How to avoid:** Bun natively supports `require()` of ESM modules -- it returns the module namespace object. So `const duckdb = require('@duckdb/node-api')` works in Bun. However, if the module uses top-level `await`, `require()` will fail. In that case, use dynamic `import()`.
**Warning signs:** "ERR_REQUIRE_ESM" on Node.js (does not apply to Bun), or undefined default export.

### Pitfall 3: DuckDB Single-Writer Constraint
**What goes wrong:** Multiple processes trying to write to the same DuckDB file simultaneously causes "database is locked" errors.
**Why it happens:** DuckDB enforces single-writer architecture. One process can read+write; additional processes must open read-only.
**How to avoid:** Dynamo runs as a single process, so this is not immediately dangerous. But M2's multi-session architecture (Reverie) will have multiple Claude Code sessions. Design Ledger with a coordinator pattern in mind -- the writing session holds the connection, others query through Wire/MCP. For Phase 3, document the constraint and ensure a single DuckDB instance per process.
**Warning signs:** "Transaction conflict" errors, "database is locked" errors.

### Pitfall 4: YAML Frontmatter with Nested Objects
**What goes wrong:** Simple regex-based frontmatter parsing fails on nested YAML structures.
**Why it happens:** Reverie's fragment schema has nested objects (`temporal:`, `decay:`, `associations:`, `pointers:`). A naive key-value regex parser cannot handle indentation-based nesting.
**How to avoid:** Build a minimal YAML parser that handles: scalars (strings, numbers, booleans, null), flat arrays (bracket syntax `[a, b, c]` and indented `- item` syntax), and nested objects (indentation-based). The fragment schema is well-defined -- the parser only needs to handle the structures Reverie actually uses, not arbitrary YAML.
**Warning signs:** Nested frontmatter fields returning as strings instead of objects, arrays not being parsed, indentation errors.

### Pitfall 5: Git Subprocess Hanging
**What goes wrong:** Bun.spawn with git commands can hang if git prompts for credentials or confirmation.
**Why it happens:** Git operations like `push`, `fetch`, `clone` may trigger SSH key prompts, HTTP auth prompts, or credential helper dialogs that block stdin.
**How to avoid:** Set `GIT_TERMINAL_PROMPT=0` in the environment to disable prompts. Set `stdin: 'ignore'` on Bun.spawn options. Add timeout to Bun.spawn calls for long-running operations.
**Warning signs:** Process hangs indefinitely, no stdout/stderr output.

### Pitfall 6: Conductor Polling Docker Status
**What goes wrong:** Polling `docker compose ps` too frequently causes unnecessary CPU and I/O load.
**Why it happens:** No event-driven mechanism for Docker status changes -- must poll.
**How to avoid:** Use reasonable polling intervals (5-10 seconds for health checks). Cache last-known status. Only poll when explicitly asked or on a schedule, not continuously.
**Warning signs:** High CPU usage from Conductor, excessive Docker API calls.

## Code Examples

### DuckDB Instance Creation and Query
```javascript
// Source: https://duckdb.org/docs/stable/clients/node_neo/overview
'use strict';

// Bun can require() ESM modules
const duckdb = require('@duckdb/node-api');

async function example() {
  // Create file-based database
  const instance = await duckdb.DuckDBInstance.create('ledger.duckdb');
  const connection = await instance.connect();

  // Create table
  await connection.run(`
    CREATE TABLE IF NOT EXISTS records (
      id VARCHAR PRIMARY KEY,
      data JSON NOT NULL,
      created_at TIMESTAMP DEFAULT current_timestamp,
      updated_at TIMESTAMP DEFAULT current_timestamp
    )
  `);

  // Insert with parameters
  const prepared = await connection.prepare(
    'INSERT INTO records (id, data) VALUES ($1, $2)'
  );
  prepared.bindVarchar(1, 'record-001');
  prepared.bindVarchar(2, JSON.stringify({ type: 'test', value: 42 }));
  await prepared.run();

  // Query with criteria
  const result = await connection.runAndReadAll(
    "SELECT id, data FROM records WHERE json_extract_string(data, '$.type') = 'test'"
  );
  const rows = result.getRowObjects(); // [{id: 'record-001', data: '...'}]

  // Cleanup
  connection.closeSync();
}
```

### bun:sqlite Fallback Pattern
```javascript
// Source: Bun built-in documentation
'use strict';

const { Database } = require('bun:sqlite');

function createSqliteBackend(dbPath) {
  const db = new Database(dbPath, { create: true });
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  return {
    execute(sql, params = []) {
      if (sql.trimStart().toUpperCase().startsWith('SELECT')) {
        return ok(db.prepare(sql).all(...params));
      }
      db.prepare(sql).run(...params);
      return ok(undefined);
    },
    close() {
      db.close();
      return ok(undefined);
    }
  };
}
```

### YAML Frontmatter Parser (Zero Dependencies)
```javascript
// Custom parser for structured YAML frontmatter
'use strict';

/**
 * Extracts and parses YAML frontmatter from markdown content.
 * Handles: scalars, flat arrays, nested objects, quoted strings.
 *
 * @param {string} content - Full markdown file content
 * @returns {{ frontmatter: Object, body: string } | null}
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;

  const yamlStr = match[1];
  const body = match[2].trim();
  const frontmatter = parseYaml(yamlStr);

  return { frontmatter, body };
}

/**
 * Minimal YAML parser for frontmatter.
 * Supports: string, number, boolean, null, arrays (inline and block),
 * nested objects (indentation-based), quoted strings.
 */
function parseYaml(yaml) {
  // Implementation handles indentation-based nesting
  // See frontmatter.cjs for full implementation
}

module.exports = { parseFrontmatter };
```

### Forge Git Command Execution
```javascript
// Source: Bun.spawnSync documentation
'use strict';

function _runGitSync(args, cwd) {
  const result = Bun.spawnSync(['git', ...args], {
    cwd: cwd || process.cwd(),
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    stdin: 'ignore',
  });

  if (!result.success) {
    const stderr = result.stderr.toString().trim();
    return err('GIT_FAILED', `git ${args[0]} failed: ${stderr}`, {
      command: args,
      exitCode: result.exitCode,
    });
  }
  return ok(result.stdout.toString().trim());
}

// Usage examples:
// _runGitSync(['status', '--porcelain'], repoPath)
// _runGitSync(['commit', '-m', message], repoPath)
// _runGitSync(['submodule', 'add', url, path], repoPath)
// _runGitSync(['tag', tagName], repoPath)
```

### Conductor Docker Compose Lifecycle
```javascript
// Source: Bun.spawnSync + docker compose CLI
'use strict';

function _dockerAvailable() {
  const result = Bun.spawnSync(['which', 'docker'], { stdin: 'ignore' });
  return result.success;
}

function _composeCommand(args, composePath) {
  return Bun.spawnSync(
    ['docker', 'compose', '-f', composePath, ...args],
    { stdin: 'ignore', env: process.env }
  );
}

// _composeCommand(['up', '-d'], '/path/to/docker-compose.yml')
// _composeCommand(['down'], '/path/to/docker-compose.yml')
// _composeCommand(['ps', '--format', 'json'], '/path/to/docker-compose.yml')
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `duckdb` npm package (old) | `@duckdb/node-api` (Neo) | DuckDB 1.4.x -> 1.5.x (2026) | Old package deprecated, will not receive 1.5.x bindings |
| `docker-compose` (v1, Python) | `docker compose` (v2, Go plugin) | Docker Compose v2 (2023) | CLI is `docker compose` not `docker-compose`. Syntax identical. |
| `js-yaml` for YAML parsing | Custom minimal parser | Project decision | No npm dependency for core platform. Frontmatter schema is well-defined. |
| Bun 1.2.x N-API | Bun 1.3.x N-API | Bun 1.3.0 (2025) | Fixed null-returning napi_register_module_v1 that crashed DuckDB |

**Deprecated/outdated:**
- `duckdb` npm package: Deprecated. Last release for DuckDB 1.4.x. Use `@duckdb/node-api` instead.
- `docker-compose` (v1): Python-based, no longer maintained. Use `docker compose` (v2 Go plugin).

## Open Questions

1. **DuckDB ESM require() with top-level await**
   - What we know: Bun can require() ESM modules. But if `@duckdb/node-api` uses top-level await, require() will fail.
   - What's unclear: Whether the published package uses top-level await in its entry point.
   - Recommendation: The smoke test in D-04 will resolve this immediately. If require() fails, try `const duckdb = await import('@duckdb/node-api')` in an async context. If that fails too, fall back to bun:sqlite per D-05.

2. **DuckDB Schema Design for Reverie**
   - What we know: Reverie needs association indexes (domains, entities, attention tags, formation groups, source locators, fragment decay). The Reverie spec defines detailed schemas.
   - What's unclear: Exact table structure is Claude's discretion per CONTEXT.md.
   - Recommendation: Design a generic key-value-plus-metadata schema for Phase 3. Reverie-specific tables (association_index, entity_registry) can be created by Reverie in M2 through the Ledger provider interface. Phase 3 Ledger should demonstrate the contract works, not pre-build Reverie's schema.

3. **Journal Query Performance on Large Fragment Collections**
   - What we know: Journal's query() scans frontmatter of all matching files. This is O(n) per query.
   - What's unclear: At what fragment count this becomes unacceptably slow.
   - Recommendation: For Phase 3, implement naive in-memory scan. Assay (Phase 6) will add indexing and caching. The fragment count will be small initially. Add a `limit` parameter to query() for pagination.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | All components | Yes | 1.3.11 | -- |
| git | Forge (SVC-05) | Yes | 2.48.1 | -- |
| Docker | Conductor (SVC-06) | Yes | 27.1.2 | Graceful degradation per D-07 |
| Docker Compose | Conductor (SVC-06) | Yes | v2.39.2 | Graceful degradation per D-07 |
| bun:sqlite | Ledger fallback | Yes | Built-in | -- |
| Disk space | DuckDB storage | Yes (12 GB free) | -- | -- |

**Missing dependencies with no fallback:**
- None -- all required dependencies are available.

**Missing dependencies with fallback:**
- None -- Docker is available, but D-07 mandates graceful degradation regardless.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built-in) |
| Config file | bunfig.toml (root = "./") |
| Quick run command | `bun test core/providers/ core/services/forge core/services/conductor core/services/relay` |
| Full suite command | `bun test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRV-01 | Ledger read/write/query/delete via DuckDB | unit | `bun test core/providers/ledger/__tests__/ledger.test.js` | Wave 0 |
| PRV-01 | DuckDB smoke test on Bun | smoke | `bun test core/providers/ledger/__tests__/duckdb-backend.test.js` | Wave 0 |
| PRV-01 | bun:sqlite fallback implementation | unit | `bun test core/providers/ledger/__tests__/sqlite-backend.test.js` | Wave 0 |
| PRV-02 | Journal read/write/query/delete via Lathe | unit | `bun test core/providers/journal/__tests__/journal.test.js` | Wave 0 |
| PRV-02 | YAML frontmatter parser | unit | `bun test core/providers/journal/__tests__/frontmatter.test.js` | Wave 0 |
| SVC-05 | Forge git operations (status, commit, branch) | unit | `bun test core/services/forge/__tests__/forge.test.js` | Wave 0 |
| SVC-05 | Forge submodule management | unit | `bun test core/services/forge/__tests__/forge.test.js` | Wave 0 |
| SVC-06 | Conductor Docker lifecycle | unit | `bun test core/services/conductor/__tests__/conductor.test.js` | Wave 0 |
| SVC-06 | Conductor dependency health checks | unit | `bun test core/services/conductor/__tests__/conductor.test.js` | Wave 0 |
| SVC-07 | Relay install/update/sync | unit | `bun test core/services/relay/__tests__/relay.test.js` | Wave 0 |
| SVC-07 | Relay rollback on failure | unit | `bun test core/services/relay/__tests__/relay.test.js` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test core/providers/ core/services/forge core/services/conductor core/services/relay`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `core/providers/ledger/__tests__/ledger.test.js` -- covers PRV-01
- [ ] `core/providers/ledger/__tests__/duckdb-backend.test.js` -- covers PRV-01 DuckDB smoke
- [ ] `core/providers/ledger/__tests__/sqlite-backend.test.js` -- covers PRV-01 fallback
- [ ] `core/providers/journal/__tests__/journal.test.js` -- covers PRV-02
- [ ] `core/providers/journal/__tests__/frontmatter.test.js` -- covers PRV-02 frontmatter parser
- [ ] `core/services/forge/__tests__/forge.test.js` -- covers SVC-05
- [ ] `core/services/conductor/__tests__/conductor.test.js` -- covers SVC-06
- [ ] `core/services/relay/__tests__/relay.test.js` -- covers SVC-07
- [ ] Framework install: none needed -- bun:test is built-in and already configured

## Project Constraints (from CLAUDE.md)

- **Runtime:** Bun -- all code runs on Bun, CJS format
- **No npm dependencies for core:** Platform core uses only Bun/Node built-ins. `@duckdb/node-api` is an infrastructure dep (like MCP SDK), not a library dep.
- **'use strict' in every file**
- **Named exports via `module.exports = { ... }`** -- no default exports
- **JSDoc type annotations on all public API exports**
- **Object.freeze() on contract instances** via createContract
- **Options-based DI** -- dependencies passed via options object
- **Service factory pattern:** `createServiceName(options)` returns `Result<ServiceContract>`
- **Self-validating services:** Each factory validates against its contract shape using createContract
- **Lifecycle methods:** init(options), start(), stop(), healthCheck()
- **TDD with bun:test** -- tests written first
- **Directory per service/provider:** `core/{services|providers}/{name}/{name}.cjs` + `__tests__/`
- **Switchboard event emission** for cross-service reactivity
- **Result types for error communication** -- functions return Ok/Err, never throw for expected failures
- **Always push to origin after commits**
- **User decides all version increments**
- **Git submodules** for plugins, modules, and extensions
- **JSON for structured data, Markdown for narrative data**
- **No Neo4j / Graphiti** -- v0 dependency replaced by DuckDB + flat files
- **No js-yaml** -- JSON (structured) + Markdown (narrative) as specified in canon
- **No LLM API dependencies below SDK scope**

## Sources

### Primary (HIGH confidence)
- [DuckDB Node.js Neo Client docs](https://duckdb.org/docs/stable/clients/node_neo/overview) -- Full API: instance creation, connections, SQL execution, prepared statements, data types, result reading
- [DuckDB Concurrency docs](https://duckdb.org/docs/stable/connect/concurrency) -- Single-writer architecture, MVCC, multi-thread within single process, no multi-process writes
- [Bun spawn/spawnSync docs](https://bun.com/docs/runtime/child-process) -- Full subprocess API: async/sync, stdin/stdout/stderr, exit codes, timeout, signals
- [Bun module interop docs](https://bun.com/docs/runtime/modules) -- CJS can require() ESM modules, returns module namespace object; limitation: no top-level await
- Existing codebase: `core/services/lathe/lathe.cjs`, `core/services/switchboard/switchboard.cjs`, `core/services/magnet/magnet.cjs`, `core/services/magnet/provider.cjs`, `core/services/magnet/json-provider.cjs` -- Established patterns: service factory, contract validation, options-based DI, lifecycle methods
- `.claude/reverie-spec-v2.md` -- Fragment schema with YAML frontmatter (downstream data layer requirements)
- `.claude/new-plan.md` -- Architecture plan defining service/provider roles and engineering principles

### Secondary (MEDIUM confidence)
- [Bun v1.2.2 release notes](https://bun.com/blog/bun-v1.2.2) -- DuckDB native module crash fix
- [@duckdb/node-api npm page](https://www.npmjs.com/package/@duckdb/node-api) -- Latest version 1.5.0-r.1
- DuckDB concurrency model confirmed: single-writer, multiple readers, MVCC, append-never-conflicts

### Tertiary (LOW confidence)
- `@duckdb/node-api` CJS require() compatibility -- Training data says it has no `"type": "module"` and uses `main` field (CJS-compatible), but could not verify against actual package.json on GitHub. Bun's require() of ESM resolves this regardless.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- DuckDB API documented, Bun APIs documented, all tools verified available
- Architecture: HIGH -- Follows established patterns from Phase 1 and 2 (service factory, contract, lifecycle, options DI)
- Pitfalls: HIGH -- DuckDB/Bun compatibility issues well-documented in Bun release notes; git subprocess patterns validated in v0
- Data provider contract: HIGH -- Direct extension of existing Magnet provider pattern with different shape per D-01
- YAML frontmatter parsing: MEDIUM -- Custom parser needed, complexity depends on nested YAML handling

**Research date:** 2026-03-23
**Valid until:** 2026-04-22 (30 days -- stable domain, no fast-moving dependencies)
