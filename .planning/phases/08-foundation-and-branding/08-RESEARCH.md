# Phase 8: Foundation and Branding - Research

**Researched:** 2026-03-17
**Domain:** CJS shared substrate, directory structure, regression testing for Claude Code hook platform
**Confidence:** HIGH

## Summary

Phase 8 builds the foundation layer of Dynamo -- the CJS shared substrate that all subsequent phases depend on. This is not a feature phase; it is an infrastructure phase. The deliverables are: (1) the `~/.claude/dynamo/` directory tree with Ledger/Switchboard organization, (2) six foundation modules (core, MCP client, scope, logger, health guard, HTTP utility), and (3) a regression test suite covering all 12 v1.1 fixes. No hooks are registered, no settings.json is modified, and the existing Python/Bash system continues running untouched.

The technical approach is highly constrained and well-understood. Every module follows GSD's proven CJS patterns (14 production `.cjs` files as reference), uses zero npm dependencies (the CONTEXT.md decision eliminates js-yaml by converting prompts to .md and config to .json), and builds on Node.js 24.x built-ins (fetch, node:test, node:assert, crypto.randomUUID). The project-level prior research (SUMMARY.md, ARCHITECTURE.md, PITFALLS.md, STACK.md) already maps every module boundary, every pitfall, and every regression test specification. This research phase focuses on translating those findings into actionable implementation guidance specific to Phase 8's scope.

**Primary recommendation:** Build modules in dependency order -- core.cjs first (zero deps), then scope.cjs and http.cjs (depend only on core), then mcp-client.cjs (depends on http + scope), then logger.cjs and health-guard.cjs (depend on core + fs), then regression tests covering all 12 v1.1 fixes. The directory tree and branding (BRD-01, BRD-02) should be established as the very first task since all modules need the directory structure to exist.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Subtle branding: Dynamo name appears in headers/banners only, individual output lines are clean (GSD pattern)
- Module identity block at top of each .cjs file: `// Dynamo > Ledger > mcp-client.cjs` showing system/subsystem/file hierarchy
- Independent semver starting at 0.1.0 (not tied to project milestone version)
- Hook-injected context keeps `[GRAPHITI MEMORY CONTEXT]` tag -- don't break existing CLAUDE.md references
- Curation prompts: separate .md files per prompt (GSD pattern -- `prompts/curation.md`, `prompts/session-summary.md`, etc.), read via `fs.readFileSync`
- Dynamo settings: JSON format (`config.json`), matches GSD pattern
- **Zero npm dependencies** -- prompts as .md and config as .json eliminate the need for js-yaml entirely
- .env file continues to work for environment-specific values (Graphiti URL, API keys)
- Phase 8 builds dynamo/ but does NOT register hooks or modify settings.json -- graphiti hooks keep running as-is
- Phase 9 will switch hooks over; Phase 10 completes cutover
- After cutover: graphiti/ renamed to graphiti-legacy/ (kept as reference, not deleted)
- docker-compose.yml stays in graphiti/ -- Docker stack management isn't moving
- Three test entry points sharing the same underlying node:test runner: `dynamo test`, `verify-memory`, auto-run on install
- Test output verbosity: Claude's discretion based on context

### Claude's Discretion
- Test output verbosity per entry point
- Exact spacing, formatting, and error message phrasing
- Internal module structure within lib/core.cjs (how config, env, project detection are organized)
- Whether .env loading uses a single function or is split across callers

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FND-01 | CJS shared substrate (core.cjs) with config loading, .env parsing, project detection, output formatting | GSD core.cjs pattern verified (output/error/safeReadFile/loadConfig); Python graphiti-helper.py detect-project logic mapped (git remote, package.json, composer.json, pyproject.toml, .ddev, fallback); .env loading 12-line port from Python lines 42-52 |
| FND-02 | MCP client with SSE parsing for Graphiti JSON-RPC communication | Python MCPClient class (lines 63-139) maps 1:1 to CJS using native fetch + AbortSignal.timeout; SSE parser is 15 lines; MCP protocol 2025-03-26; notifications/initialized handshake required |
| FND-03 | Scope constants and validation function rejecting invalid characters (colon constraint) | SCOPE_FALLBACK.md documents constraint; Graphiti MCP v1.21.0 rejects non-`[a-zA-Z0-9_-]`; four scope types: global, project-{name}, session-{ts}, task-{desc} |
| FND-04 | Error logging with 1MB rotation, ISO timestamps, hook name prefix | v1.1 fix: log_error() function writing `[ISO-Z] [hook-name] msg` format; 1MB rotation via stat + rename; log path ~/.claude/dynamo/hook-errors.log |
| FND-05 | Health guard (once-per-session flag using process.ppid) | v1.1 pattern: `/tmp/graphiti-health-warned-${PPID}` flag file; CJS uses `process.ppid` (not process.pid); TTL-based cache for health results |
| FND-06 | Shared HTTP utility with explicit timeouts (fetchWithTimeout) | Native fetch has NO default timeout; must wrap with AbortSignal.timeout(); timeout map: health 3s, MCP 5s, curation 10s, summarization 15s |
| FND-07 | Regression test suite covering all 12 v1.1 fixes | All 12 fixes mapped to specific test cases (see Regression Test Matrix); node:test + node:assert verified available on Node v24.13.1 |
| BRD-01 | Project renamed to Dynamo with Ledger/Switchboard subsystem identity | Module identity blocks: `// Dynamo > Ledger > mcp-client.cjs`; subtle branding in headers/banners only |
| BRD-02 | Directory restructured to ~/.claude/dynamo/ with lib/ledger/ and lib/switchboard/ | Full directory tree specified in Architecture research; lib/core.cjs at root, subsystems in lib/ledger/ and lib/switchboard/ |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | v24.13.1 (LTS, installed) | Runtime | Already installed; LTS; built-in fetch, node:test, node:assert, crypto.randomUUID |
| CJS (.cjs files) | N/A | Module system | GSD convention; 14 production .cjs files; ~/.claude/package.json is `{"type":"commonjs"}` |

### Supporting (All Node.js Built-ins)
| Module | Purpose | Replaces |
|--------|---------|----------|
| `fs` | File I/O, config loading, log writing | Python pathlib, os |
| `path` | Path manipulation, __dirname-relative requires | Python os.path |
| `os` | tmpdir(), homedir() | Python os, pathlib |
| `child_process` | git commands for project detection | Python subprocess |
| `crypto` | randomUUID() for JSON-RPC message IDs | Python uuid |
| `node:test` | Test runner (describe/it/test) | None (Python had zero tests) |
| `node:assert` | Test assertions (strictEqual, deepStrictEqual, throws) | None |
| `globalThis.fetch` | HTTP to Graphiti MCP, OpenRouter, health endpoints | Python httpx |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual .env parsing | dotenv npm package | Adds a dependency for 10 lines of code; precedence behavior differs subtly |
| Native fetch | axios/undici | External dep for no gain; built-in fetch covers all use cases |
| node:test | Jest/Vitest | External dep; Jest has dozens of transitive deps; Vitest is ESM-first |
| Raw process.argv | commander/yargs | Not needed in Phase 8 (CLI router is Phase 10); GSD uses raw argv |
| .md prompt files | js-yaml + prompts.yaml | Eliminated by CONTEXT.md decision: zero npm deps, prompts as .md |

**Installation:**
```bash
# Zero npm dependencies -- nothing to install
# All capabilities come from Node.js 24 built-ins
```

**Version verification:** Node.js v24.13.1 confirmed installed. `globalThis.fetch`, `AbortSignal.timeout`, `node:test`, `node:assert`, `crypto.randomUUID` all verified available via direct runtime test.

## Architecture Patterns

### Recommended Directory Structure (Phase 8 Deliverable)

```
~/.claude/dynamo/                    # Root of Dynamo system
  lib/
    core.cjs                         # FND-01: Shared substrate
    ledger/                          # Ledger subsystem (memory)
      mcp-client.cjs                 # FND-02: MCP client with SSE
      scope.cjs                      # FND-03: Scope constants + validation
    switchboard/                     # Switchboard subsystem (management)
      (empty in Phase 8 -- populated in Phase 10)
  config.json                        # Dynamo settings (JSON format)
  prompts/                           # Curation prompt templates (.md files)
    curation.md                      # Session context curation prompt
    prompt-context.md                # Prompt-augment curation prompt
    session-summary.md               # Session summarization prompt
    precompact.md                    # Pre-compaction knowledge extraction prompt
    session-name.md                  # Session naming prompt
  tests/                             # FND-07: Regression test suite
    core.test.cjs                    # Tests for core.cjs
    mcp-client.test.cjs              # Tests for MCP client + SSE parsing
    scope.test.cjs                   # Tests for scope validation
    regression.test.cjs              # All 12 v1.1 regression tests
  VERSION                            # Dynamo version (0.1.0)
```

Note: `hooks/dynamo-hooks.cjs` is NOT created in Phase 8. The hook dispatcher belongs to Phase 9 (LDG-01). Phase 8 builds the modules that hooks will import.

Also note: logger (FND-04), health-guard (FND-05), and http utility (FND-06) live inside `lib/core.cjs` as exported functions, not as separate files. This follows GSD's pattern where core.cjs is the shared substrate containing output, error, config, and utility functions. The CONTEXT.md gives Claude discretion on internal structure of core.cjs.

### Pattern 1: GSD-Style CJS Module

**What:** Every .cjs file follows the GSD pattern: require Node.js built-ins at top, define exported functions, module.exports at bottom. No side effects on load.

**When to use:** Every module in the dynamo tree.

**Example:**
```javascript
// Dynamo > Ledger > scope.cjs
// Source: GSD pattern from ~/.claude/get-shit-done/bin/lib/core.cjs

'use strict';

// --- Scope Constants ---

const SCOPE = {
  global: 'global',
  project: (name) => `project-${sanitize(name)}`,
  session: (ts) => `session-${ts}`,
  task: (desc) => `task-${sanitize(desc)}`
};

const SCOPE_PATTERN = /^[a-zA-Z0-9_-]+$/;

function validateGroupId(groupId) {
  if (!SCOPE_PATTERN.test(groupId)) {
    throw new Error(`Invalid group_id "${groupId}": must match [a-zA-Z0-9_-]`);
  }
  return groupId;
}

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

module.exports = { SCOPE, SCOPE_PATTERN, validateGroupId, sanitize };
```

### Pattern 2: Module Identity Block (Branding)

**What:** Every .cjs file starts with a comment showing its position in the Dynamo hierarchy.

**When to use:** Every .cjs file in the dynamo tree.

**Example:**
```javascript
// Dynamo > Ledger > mcp-client.cjs
// Dynamo > Core
// Dynamo > Ledger > scope.cjs
// Dynamo > Tests > regression.test.cjs
```

### Pattern 3: __dirname-Relative Requires

**What:** All internal requires use `path.join(__dirname, ...)` to resolve paths. Never use process.cwd()-relative paths for module loading.

**When to use:** Every require() that imports another dynamo module.

**Why:** Hooks can be invoked from any working directory. GSD's `gsd-context-monitor.js` demonstrates this pattern.

**Example:**
```javascript
// From hooks/dynamo-hooks.cjs (Phase 9, but pattern applies to all)
const core = require(path.join(__dirname, '..', 'lib', 'core.cjs'));
const { SCOPE } = require(path.join(__dirname, '..', 'lib', 'ledger', 'scope.cjs'));
```

### Pattern 4: fetchWithTimeout Wrapper

**What:** All HTTP calls go through a shared wrapper that enforces explicit timeouts via AbortSignal.timeout().

**When to use:** Every fetch() call in the codebase.

**Why:** Native fetch has NO default timeout. Python httpx defaulted to 5s. Without this, a hook hangs indefinitely if Graphiti is slow.

**Example:**
```javascript
// Dynamo > Core (fetchWithTimeout utility)
// Source: Node.js fetch docs + PITFALLS.md Pitfall 6

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const resp = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs)
  });
  return resp;
}

// Timeout map (from Python httpx equivalents):
// Health check: 3000ms
// MCP tool calls: 5000ms
// Curation (OpenRouter Haiku): 10000ms
// Session summarization: 15000ms
```

### Pattern 5: .env Loading (Port from Python)

**What:** Load .env file, parse KEY=VALUE lines, set in process.env only if not already set.

**When to use:** Once at module load time in core.cjs.

**Why:** Preserves the "environment wins over .env file" behavior from Python lines 42-52.

**Example:**
```javascript
// Dynamo > Core (.env loading)
// Source: Direct port from graphiti-helper.py lines 42-52

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && value && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}
```

### Anti-Patterns to Avoid

- **Cross-boundary imports:** Ledger modules must never import from switchboard/ and vice versa. Both import only from core.cjs.
- **Side effects on require():** No module should perform I/O, HTTP calls, or state mutation when `require()`d. All work happens in explicitly called functions.
- **process.cwd()-relative paths:** Never use `require('./lib/foo')` -- always use `path.join(__dirname, ...)`.
- **Bare .catch(() => {}):** Every catch block must either log to the error logger or re-throw. Silent swallowing recreates the fire-and-forget bug (DIAG-01).
- **process.pid instead of process.ppid:** Health guard flag files must use `process.ppid` (the parent Claude Code process), not `process.pid` (the hook child process).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE parsing | Full EventSource implementation | 15-line parseSSE function (port from Python) | Graphiti SSE is simple data-line format; full EventSource is overkill |
| UUID generation | Custom ID generator | `require('crypto').randomUUID()` | Built-in since Node 19; cryptographically random |
| HTTP timeouts | setTimeout + manual abort | `AbortSignal.timeout(ms)` | Built-in, cleaner, handles edge cases |
| Test runner | Custom test harness | `node:test` + `node:assert` | Built-in, stable in Node 24, full describe/it/test support |
| .env parsing | dotenv npm package | 10-line loadEnv function | Zero deps; behavior matches Python exactly |
| YAML parsing | js-yaml or custom parser | Eliminated -- prompts are .md, config is .json | CONTEXT.md decision: zero npm dependencies |

**Key insight:** The entire Phase 8 deliverable uses zero npm dependencies. Node.js 24 built-ins cover every need. This is a major simplification from the prior research which assumed js-yaml was needed for prompts.yaml -- the CONTEXT.md decision to use .md files for prompts and .json for config eliminates the only external dependency.

## Common Pitfalls

### Pitfall 1: GRAPHITI_GROUP_ID Override (DIAG-02)
**What goes wrong:** If `GRAPHITI_GROUP_ID=global` appears in docker-compose.yml or .env, the Graphiti server silently overrides all group_id values to 'global'. The server acknowledges the requested scope in its response message, making the bug invisible at write time.
**Why it happens:** The variable was the root cause of all missing project-scoped memories in v1.1. During the CJS rewrite, regenerating config files could reintroduce it.
**How to avoid:** The regression test suite (FND-07) must include a test that asserts `GRAPHITI_GROUP_ID` does NOT appear in docker-compose.yml or .env. Additionally, the canary round-trip test writes to project scope and verifies the stored group_id is not 'global'.
**Warning signs:** search_memory_facts with project scope returns 0 facts; get_episodes returns episodes with group_id='global'.

### Pitfall 2: Colon-in-Group-ID Rejection
**What goes wrong:** Using colon as scope separator (project:name instead of project-name) causes Graphiti MCP v1.21.0 to reject the group_id.
**Why it happens:** Colon was the original v1.0 design; it reads naturally as a namespace separator.
**How to avoid:** scope.cjs defines the format as locked constants using dash separator. validateGroupId() rejects any character outside `[a-zA-Z0-9_-]`.
**Warning signs:** The string "project:" appears anywhere in code.

### Pitfall 3: No Default Timeout on fetch()
**What goes wrong:** Native Node.js fetch() hangs indefinitely without explicit AbortSignal.timeout(). A hook blocks Claude Code until the hook timeout kills it.
**Why it happens:** Python httpx had a 5s default timeout. Developers porting from Python naturally write `fetch(url)` without timeout.
**How to avoid:** fetchWithTimeout() wrapper is mandatory for all HTTP calls. Never use bare fetch().
**Warning signs:** Any fetch() call without `signal` parameter.

### Pitfall 4: MCP SSE Response Parsing
**What goes wrong:** Graphiti MCP returns SSE (text/event-stream) for tool calls. Code that expects plain JSON from response.json() gets a parse error.
**Why it happens:** No built-in SSE parser in Node.js. The content-type check is easy to miss.
**How to avoid:** mcp-client.cjs checks content-type header before parsing. SSE path extracts data: lines and finds the JSON-RPC result.
**Warning signs:** `SyntaxError: Unexpected token` errors; MCP calls returning undefined.

### Pitfall 5: Stdin Reading in Hooks
**What goes wrong:** Node.js stdin is async by default. Naive event-based reading may fire callbacks on partial input.
**Why it happens:** Bash `cat` blocks until EOF; Node.js process.stdin emits data events asynchronously.
**How to avoid:** Use the GSD pattern from gsd-context-monitor.js: buffer all chunks, parse on 'end' event, with a 3-5s timeout guard.
**Warning signs:** JSON.parse errors in hook logs; hooks working in manual test but failing in real sessions.

### Pitfall 6: Module Path Resolution from Different CWDs
**What goes wrong:** require('./lib/foo') resolves relative to process.cwd(), which varies by working directory. Hooks invoked from different project directories break.
**Why it happens:** CJS hooks execute from whatever directory Claude Code is working in.
**How to avoid:** All requires use `path.join(__dirname, ...)`. All config/prompt file reads use __dirname-relative paths.
**Warning signs:** MODULE_NOT_FOUND errors that appear intermittently.

## Code Examples

### Example 1: core.cjs Shared Substrate (FND-01)

```javascript
// Dynamo > Core
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DYNAMO_DIR = path.join(require('os').homedir(), '.claude', 'dynamo');

// --- Output helpers (GSD pattern) ---

function output(result, raw, rawValue) {
  if (raw && rawValue !== undefined) {
    process.stdout.write(String(rawValue));
  } else {
    process.stdout.write(JSON.stringify(result, null, 2));
  }
  process.exit(0);
}

function error(message) {
  process.stderr.write('Error: ' + message + '\n');
  process.exit(1);
}

function safeReadFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch { return null; }
}

// --- Config loading ---

function loadConfig() {
  const configPath = path.join(DYNAMO_DIR, 'config.json');
  const defaults = { /* default config values */ };
  const content = safeReadFile(configPath);
  if (!content) return defaults;
  try { return { ...defaults, ...JSON.parse(content) }; }
  catch { return defaults; }
}

// --- .env loading (port from Python lines 42-52) ---

function loadEnv() {
  const envPath = path.join(DYNAMO_DIR, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && value && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// --- Project detection (port from Python lines 293-359) ---

function detectProject(cwd) {
  cwd = cwd || process.cwd();
  // 1. git remote origin
  try {
    const url = execSync('git config --get remote.origin.url', {
      cwd, timeout: 3000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    if (url) {
      let name = url.replace(/\/$/, '').split('/').pop();
      return name.replace(/\.git$/, '');
    }
  } catch {}
  // 2. package.json name
  // 3. composer.json name
  // 4. pyproject.toml name
  // 5. .ddev/config.yaml name (read as text, not YAML)
  // 6. Fallback to directory name
  return path.basename(cwd);
}

// --- HTTP utility (FND-06) ---

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
}

module.exports = {
  DYNAMO_DIR, output, error, safeReadFile,
  loadConfig, loadEnv, detectProject, fetchWithTimeout
};
```

### Example 2: MCP Client with SSE Parsing (FND-02)

```javascript
// Dynamo > Ledger > mcp-client.cjs
'use strict';

const crypto = require('crypto');
const path = require('path');
const { fetchWithTimeout, loadEnv } = require(path.join(__dirname, '..', 'core.cjs'));

const MCP_DEFAULTS = {
  url: 'http://localhost:8100/mcp',
  healthUrl: 'http://localhost:8100/health',
  timeout: 5000
};

class MCPClient {
  constructor(options = {}) {
    this.url = process.env.GRAPHITI_MCP_URL || options.url || MCP_DEFAULTS.url;
    this.timeout = options.timeout || MCP_DEFAULTS.timeout;
    this.sessionId = null;
  }

  async initialize() {
    if (this.sessionId) return;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    };
    // Step 1: initialize
    const resp = await fetchWithTimeout(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'dynamo', version: '0.1.0' }
        },
        id: 1
      })
    }, this.timeout);
    this.sessionId = resp.headers.get('mcp-session-id');
    // Step 2: notifications/initialized
    const notifHeaders = { ...headers };
    if (this.sessionId) notifHeaders['mcp-session-id'] = this.sessionId;
    await fetchWithTimeout(this.url, {
      method: 'POST',
      headers: notifHeaders,
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'notifications/initialized'
      })
    }, this.timeout);
  }

  async callTool(toolName, args) {
    await this.initialize();
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    };
    if (this.sessionId) headers['mcp-session-id'] = this.sessionId;
    const resp = await fetchWithTimeout(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'tools/call',
        params: { name: toolName, arguments: args },
        id: crypto.randomUUID()
      })
    }, this.timeout);
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      return parseSSE(await resp.text());
    }
    return resp.json();
  }
}

function parseSSE(text) {
  for (const line of text.split('\n')) {
    if (line.startsWith('data:')) {
      const data = line.slice(5).trim();
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if ('result' in parsed || 'error' in parsed) return parsed;
        } catch { continue; }
      }
    }
  }
  return { error: { message: 'No valid response in SSE stream' } };
}

module.exports = { MCPClient, parseSSE };
```

### Example 3: Scope Validation (FND-03)

```javascript
// Dynamo > Ledger > scope.cjs
'use strict';

const SCOPE_PATTERN = /^[a-zA-Z0-9_-]+$/;

const SCOPE = {
  global: 'global',
  project: (name) => `project-${sanitize(name)}`,
  session: (ts) => `session-${ts}`,
  task: (desc) => `task-${sanitize(desc)}`
};

function validateGroupId(groupId) {
  if (typeof groupId !== 'string' || !groupId) {
    throw new Error('group_id must be a non-empty string');
  }
  if (!SCOPE_PATTERN.test(groupId)) {
    throw new Error(
      `Invalid group_id "${groupId}": contains characters outside [a-zA-Z0-9_-]. ` +
      'Use dash separator, not colon (e.g., project-myproject, not project:myproject).'
    );
  }
  return groupId;
}

function sanitize(name) {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown';
}

module.exports = { SCOPE, SCOPE_PATTERN, validateGroupId, sanitize };
```

### Example 4: Regression Test Pattern (FND-07)

```javascript
// Dynamo > Tests > regression.test.cjs
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');

// Example: Scope format regression tests (v1.1 fix: colon rejection)
describe('Scope validation (v1.1 regression)', () => {
  const { validateGroupId, SCOPE } = require(path.join(__dirname, '..', 'lib', 'ledger', 'scope.cjs'));

  it('rejects group_id containing colon', () => {
    assert.throws(
      () => validateGroupId('project:my-project'),
      /contains characters outside/
    );
  });

  it('accepts dash-separated project scope', () => {
    assert.strictEqual(validateGroupId('project-my-project'), 'project-my-project');
  });

  it('SCOPE.project() produces dash-separated format', () => {
    const result = SCOPE.project('my-project');
    assert.ok(!result.includes(':'), 'Must not contain colon');
    assert.ok(/^project-/.test(result), 'Must start with project-');
  });

  it('rejects empty group_id', () => {
    assert.throws(() => validateGroupId(''), /non-empty string/);
  });

  it('accepts global scope', () => {
    assert.strictEqual(validateGroupId('global'), 'global');
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| js-yaml for prompts.yaml | .md files per prompt, fs.readFileSync | Phase 8 decision | Eliminates only npm dependency; truly zero-dep |
| config.yaml | config.json | Phase 8 decision | Native JSON.parse, no YAML parser needed |
| Python httpx with default 5s timeout | Native fetch + AbortSignal.timeout() | Node.js 21+ | Must wrap explicitly; no default timeout |
| Python subprocess for git | child_process.execSync | CJS migration | Synchronous, same behavior, simpler API |
| Python yaml.safe_load for .ddev detection | fs.readFileSync + simple text search | Zero-dep constraint | Can extract name from YAML without parser |

**Deprecated/outdated:**
- **js-yaml dependency:** Eliminated by CONTEXT.md decision. The prior STACK.md research listed js-yaml as the "ONE external dependency" -- this is no longer accurate. Prompts are .md files, config is .json. Zero npm deps.
- **prompts.yaml format:** Replaced by individual .md files in prompts/ directory. Each prompt is a separate file read via fs.readFileSync.

## Prompt File Conversion Map

The existing `curation/prompts.yaml` contains 5 prompt templates. Each becomes a separate .md file:

| YAML Key | New File | Content |
|----------|----------|---------|
| `curate_session_context` | `prompts/curation.md` | System + user template for session start context curation |
| `curate_prompt_context` | `prompts/prompt-context.md` | System + user template for prompt-augment curation |
| `summarize_session` | `prompts/session-summary.md` | System + user template for session summarization |
| `curate_precompact` | `prompts/precompact.md` | System + user template for pre-compaction knowledge extraction |
| `generate_session_name` | `prompts/session-name.md` | System + user template for session naming |

Each .md file should contain both system and user prompt sections, separated by a clear delimiter (e.g., `---` or `## System` / `## User`). The loading function reads the file and splits on the delimiter.

## Config Conversion

The existing `config.yaml` is the Graphiti MCP server config -- it stays in graphiti/ and is NOT converted. It is read by the Docker container, not by Dynamo.

The new `config.json` is a Dynamo-specific config file for Dynamo settings:

```json
{
  "version": "0.1.0",
  "graphiti": {
    "mcp_url": "http://localhost:8100/mcp",
    "health_url": "http://localhost:8100/health"
  },
  "curation": {
    "model": "anthropic/claude-haiku-4.5",
    "api_url": "https://openrouter.ai/api/v1/chat/completions"
  },
  "timeouts": {
    "health": 3000,
    "mcp": 5000,
    "curation": 10000,
    "summarization": 15000
  },
  "logging": {
    "max_size_bytes": 1048576,
    "file": "hook-errors.log"
  }
}
```

The .env file stays as-is in the dynamo/ directory for API keys (OPENROUTER_API_KEY, ANTHROPIC_API_KEY, NEO4J_PASSWORD). The .env is NOT converted to JSON -- it contains secrets that must not be committed.

## Regression Test Matrix (FND-07)

All 12 v1.1 fixes must have explicit regression tests. These tests must pass without a running Graphiti server (unit tests, not integration tests).

| # | v1.1 Fix | Test Specification | Can Test Offline? |
|---|----------|-------------------|-------------------|
| 1 | DIAG-01: Silent write failures | Assert no bare .catch(() => {}) patterns in codebase; all HTTP errors propagate | YES (code analysis + mock) |
| 2 | DIAG-02: GRAPHITI_GROUP_ID override | Assert variable absent from docker-compose.yml and .env; canary round-trip writes to project scope | Partial (file check offline, round-trip needs server) |
| 3 | Colon-in-group_id rejection | validateGroupId rejects ':', accepts '-'; SCOPE.project() never produces ':' | YES |
| 4 | Foreground hook execution | Assert no `async: true` in generated hook config | YES (config generation test) |
| 5 | Error logging to file | Logger writes `[ISO-Z] [hook-name] msg` format; file created on first error | YES |
| 6 | GRAPHITI_VERBOSE support | core.cjs checks process.env.GRAPHITI_VERBOSE; prints confirmation to stderr | YES |
| 7 | Health check canary round-trip | Health check function attempts MCP write + search, not just /health GET | YES (verify function signature/behavior with mock) |
| 8 | Log rotation | Logger checks file size > 1MB and rotates to .old | YES |
| 9 | Once-per-session health warning | healthGuard uses process.ppid for flag file; second call returns cached result | YES |
| 10 | Infinite loop guard | Session summary checks stop_hook_active field (tested in Phase 9, but interface defined here) | YES (interface test) |
| 11 | Two-phase session naming | Session name interface supports preliminary + refined naming (tested in Phase 9) | YES (interface test) |
| 12 | User label preservation | Session index never overwrites labeled_by: "user" entries (tested in Phase 9) | YES (interface test) |

Tests 10-12 define interfaces in Phase 8 but full behavioral testing happens in Phase 9 when the hook handlers are implemented.

## Open Questions

1. **MCP notifications/initialized requirement**
   - What we know: The Python MCPClient sends both `initialize` (request) and `notifications/initialized` (notification). The MCP spec says omitting the notification "may cause undefined behavior."
   - What's unclear: Whether Graphiti v1.21.0 actually requires it or silently tolerates omission.
   - Recommendation: Include the notification (2 extra lines of code). Better safe than debugging "undefined behavior" later. The canary round-trip test in FND-07 will confirm it works.

2. **.ddev/config.yaml project detection without YAML parser**
   - What we know: The Python code uses `yaml.safe_load()` to extract the `name` field from `.ddev/config.yaml`. The zero-npm-dep constraint means no YAML parser.
   - What's unclear: Whether simple text parsing (`line.startsWith('name:')`) is sufficient for all .ddev config formats.
   - Recommendation: Use simple text parsing. The .ddev config `name:` field is always a top-level key with a simple string value. If the line starts with `name:`, extract the value after the colon and trim whitespace/quotes. This covers >99% of real DDEV configs.

3. **Prompt .md file format**
   - What we know: Each prompt needs system + user sections. The CONTEXT.md says "separate .md files per prompt."
   - What's unclear: The exact delimiter between system and user sections within each .md file.
   - Recommendation: Use `---` (horizontal rule) as the delimiter. First section is system prompt, second is user template. Simple, readable, parseable with `content.split('---')`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (Node.js 24 built-in) |
| Config file | None needed -- node:test works without config |
| Quick run command | `node --test ~/.claude/dynamo/tests/*.test.cjs` |
| Full suite command | `node --test ~/.claude/dynamo/tests/*.test.cjs` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FND-01 | core.cjs loads config, parses .env, detects project, formats output | unit | `node --test tests/core.test.cjs -x` | Wave 0 |
| FND-02 | MCP client initializes, calls tools, parses SSE | unit + integration | `node --test tests/mcp-client.test.cjs -x` | Wave 0 |
| FND-03 | Scope rejects colon, accepts dash format | unit | `node --test tests/scope.test.cjs -x` | Wave 0 |
| FND-04 | Logger writes ISO format, rotates at 1MB | unit | `node --test tests/core.test.cjs --test-name-pattern "log" -x` | Wave 0 |
| FND-05 | Health guard uses ppid, caches results | unit | `node --test tests/core.test.cjs --test-name-pattern "health" -x` | Wave 0 |
| FND-06 | fetchWithTimeout enforces timeout | unit | `node --test tests/core.test.cjs --test-name-pattern "fetch" -x` | Wave 0 |
| FND-07 | All 12 v1.1 regression tests pass | unit | `node --test tests/regression.test.cjs -x` | Wave 0 |
| BRD-01 | Module identity blocks present | static check | `node --test tests/regression.test.cjs --test-name-pattern "branding" -x` | Wave 0 |
| BRD-02 | Directory structure matches spec | static check | `node --test tests/regression.test.cjs --test-name-pattern "directory" -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test ~/.claude/dynamo/tests/*.test.cjs`
- **Per wave merge:** `node --test ~/.claude/dynamo/tests/*.test.cjs` (same -- all tests are fast)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/core.test.cjs` -- covers FND-01, FND-04, FND-05, FND-06
- [ ] `tests/mcp-client.test.cjs` -- covers FND-02
- [ ] `tests/scope.test.cjs` -- covers FND-03
- [ ] `tests/regression.test.cjs` -- covers FND-07, BRD-01, BRD-02
- [ ] No framework install needed (node:test is built-in)
- [ ] No config file needed (node:test works without configuration)

## Sources

### Primary (HIGH confidence)
- GSD source code `~/.claude/get-shit-done/bin/gsd-tools.cjs` and `bin/lib/*.cjs` (12 modules) -- CJS patterns, module structure, output/error helpers, config loading (direct code inspection)
- `~/.claude/hooks/gsd-context-monitor.js` -- Proven CJS hook pattern: stdin buffering, 3s timeout guard, JSON parse, process.exit conventions (direct code inspection)
- `~/.claude/graphiti/graphiti-helper.py` (944 LOC) -- MCP client, .env loading, project detection, curation, search, sessions (direct code inspection, lines referenced)
- `~/.claude/graphiti/SCOPE_FALLBACK.md` -- Dash separator constraint, Graphiti MCP v1.21.0 group_id validation rules (direct inspection)
- `~/.claude/graphiti/.env` -- Current environment variable structure (direct inspection)
- `~/.claude/graphiti/curation/prompts.yaml` -- 5 prompt templates to convert to .md files (direct inspection)
- Node.js v24.13.1 runtime -- fetch, node:test, node:assert, crypto.randomUUID, AbortSignal.timeout all verified via direct execution test
- `~/.claude/package.json` -- Confirmed `{"type":"commonjs"}` (direct inspection)

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` -- Directory structure, module boundaries, build order (project research output)
- `.planning/research/PITFALLS.md` -- 12 regression risks with prevention strategies (project research output)
- `.planning/research/STACK.md` -- Technology choices, Node.js built-in mapping (project research output)
- `.planning/milestones/v1.1-phases/04-diagnostics/04-DIAGNOSTIC-REPORT.md` -- DIAG-01, DIAG-02 root causes and fixes

### Tertiary (LOW confidence)
- MCP `notifications/initialized` requirement: Whether Graphiti v1.21.0 strictly requires this notification is unverified. The Python client sends it, and we will preserve the behavior. LOW confidence on whether omission actually causes failure versus being silently tolerated.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Verified against installed runtime, GSD source, zero ambiguity
- Architecture: HIGH -- Directory structure and patterns derived from GSD production code and project research
- Pitfalls: HIGH -- 10/12 derived from v1.1 diagnostic history with documented root causes
- Code examples: HIGH -- Ported directly from verified Python source with line-level references
- Prompt conversion: MEDIUM -- Format decision (--- delimiter) is reasonable but untested

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable domain -- Node.js LTS, established patterns)
