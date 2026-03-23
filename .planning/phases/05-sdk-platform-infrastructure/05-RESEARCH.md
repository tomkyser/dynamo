# Phase 5: SDK & Platform Infrastructure - Research

**Researched:** 2026-03-23
**Domain:** SDK layer (Circuit module API, Pulley CLI/MCP surface), platform infrastructure (health, versioning, self-management)
**Confidence:** HIGH

## Summary

Phase 5 builds the SDK layer on top of the completed Armature framework (Phase 4) and extends two existing services (Relay, Forge) with infrastructure capabilities. The phase has two distinct halves: the SDK (Circuit + Pulley) which makes the platform consumable by modules and users, and infrastructure services (health aggregation, versioning, self-management) which make the platform self-sustaining.

Circuit is a facade-only API layer that wraps the container -- modules receive curated facades, never raw implementations or the container itself. It re-exports lib essentials (ok/err/isOk/isErr, validate, createContract) so modules import everything from Circuit. The module registration pattern mirrors plugins (manifest + register callback) but at module scope with per-module event proxy namespacing.

Pulley provides two surfaces: a CLI framework with command routing, help generation, and output formatting (human/JSON/raw), and an MCP server exposing platform operations as tools. Both use registration APIs that modules can extend -- `pulley.registerCommand()` for CLI, `circuit.registerMcpTool()` for MCP. The infrastructure work extends Forge with GitHub Releases API integration for versioning and extends Relay with full ecosystem install/update orchestration.

**Primary recommendation:** Build Circuit first (modules depend on it), then Pulley CLI (users depend on it), then Pulley MCP (Claude sessions depend on it), then infrastructure extensions (Forge versioning, Relay ecosystem management, health aggregation) in parallel as they are independent concerns.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Facade-only access. Modules receive a curated set of facades resolved from the container -- never raw implementations or the container itself. Modules call `circuit.getService('switchboard')` or `circuit.getProvider('ledger')` and get back facades. Dependency verification at module registration ensures modules only access what they declared.
- **D-02:** Re-export lib essentials. Circuit re-exports ok/err/isOk/isErr, validate, createContract -- the patterns modules need to follow Dynamo conventions. Single import point: everything a module needs comes from Circuit. Modules never require lib/ directly.
- **D-03:** Manifest + register callback for module registration. Module provides a manifest (name, version, dependencies, hooks) and a `register(circuit)` callback. Circuit verifies all declared dependencies exist as facades, then calls register() passing the Circuit API object. Same pattern as plugin registration but at module scope.
- **D-04:** Full event proxy for Switchboard access. Circuit creates a per-module event proxy that namespaces emissions (module emits 'x', Switchboard sees '{module}:x'), tracks all subscriptions for automatic cleanup on module shutdown, and provides auditable event usage. System events (hook:\*, state:\*) are passed through for listening. Proxy enforces module isolation while preserving full event power.
- **D-05:** Operations-focused root command set. Root commands: `dynamo status`, `dynamo health`, `dynamo install`, `dynamo update`, `dynamo version`, `dynamo config [key]`. Modules add subcommands: `dynamo reverie status`. Root stays clean for platform ops; modules namespace themselves.
- **D-06:** Reusable CLI framework. Pulley provides a command registration API. Modules call `pulley.registerCommand('reverie status', handler, {description, flags, output})`. Pulley handles routing, help generation, and output formatting. One CLI framework for the whole ecosystem.
- **D-07:** Flag-based output format selection. Default is human-readable. `--json` for structured JSON. `--raw` for unprocessed data. Command handlers return a result object; Pulley formats based on the flag. Same pattern as v0's dynamo CLI.
- **D-08:** Separate MCP servers for platform ops and Wire communication. Pulley runs its own MCP server for platform operations (health, status, module info). Wire's channel-server.cjs handles inter-session communication. Two distinct concerns, two servers. Conductor manages MCP server lifecycle infrastructure for both -- starting/stopping servers, port management. Pulley and Wire define what tools exist; Conductor manages how the servers run.
- **D-09:** v1 MCP tool set: health & diagnostics (dynamo_health, dynamo_diagnose), status & version (dynamo_status, dynamo_version), module operations (dynamo_module_list, dynamo_module_status). Config management deferred from MCP surface in v1.
- **D-10:** Module MCP tool registration via Circuit. Modules call `circuit.registerMcpTool('reverie_status', handler, schema)` during registration. Pulley's MCP server serves all registered tools -- platform + module tools in one server. Same pattern as CLI command registration.
- **D-11:** Claude's Discretion -- health check aggregation approach (lifecycle-driven vs dedicated service)
- **D-12:** Forge-based with GitHub REST API. Forge gains release management methods: createRelease, getLatestRelease, compareVersions. Uses fetch (zero-dependency). Master branch creates vX.Y.Z releases. Dev branch creates dev-X.Y.Z pre-releases. Version check compares local vs latest release tag.
- **D-13:** Full ecosystem management. Relay + Forge handle install/update for core platform AND git submodule additions (plugins, modules, extensions). `dynamo update` updates core, then checks each submodule for newer versions. `dynamo install <plugin-repo>` adds a new git submodule. Unified management across the entire ecosystem.
- **D-14:** Claude's Discretion -- CLI argument parsing strategy (process.argv vs util.parseArgs)

### Claude's Discretion
- Health check aggregation approach (D-11) -- lifecycle-driven vs dedicated service
- CLI argument parsing strategy (D-14) -- process.argv vs util.parseArgs
- MCP server port/transport configuration details
- Help text generation internals
- Diagnostic report formatting

### Deferred Ideas (OUT OF SCOPE)
- Config management MCP tools (dynamo_config_get/set) -- considered for v1 MCP surface but excluded to keep initial scope focused on read-only operations
- Web/REST/WebSocket API implementation via Pulley -- architectural slots defined in Armature contracts, implementation deferred to v2 (API-01, API-02)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SDK-01 | Circuit -- Module API (safe export of framework + core services/providers for module consumption, dependency verification) | Circuit facade-only API pattern, module manifest schema, event proxy namespacing, lib re-exports. Directly builds on Phase 4 container/facade/plugin patterns. |
| SDK-02 | Pulley -- CLI framework (command routing with subcommands, help generation, structured output: human/JSON/raw) | `node:util.parseArgs` verified working in Bun 1.3.11, command registry pattern, output formatter, help generator. Follows v0 CLI patterns. |
| SDK-03 | Pulley -- MCP endpoint surface | MCP SDK Server pattern validated in Wire's channel-server.cjs. Pulley creates separate MCP server for platform ops (D-08). Tool registration API for modules (D-10). |
| INF-01 | Health check and diagnostics system | Lifecycle-driven aggregation iterating booted facades' healthCheck() methods. Dependency chain analysis from container registry. |
| INF-02 | Self-install and self-update via Relay | Extending existing Relay backup-modify-verify-rollback pattern. Ecosystem-wide update orchestration for core + submodules. |
| INF-03 | Versioning with GitHub Releases API | Forge gains createRelease/getLatestRelease/compareVersions using fetch(). Semver comparison zero-dependency. |
| INF-04 | Git submodule management for plugins/modules/extensions via Forge | Already implemented in Forge (submoduleAdd/Update/Remove). Phase 5 extends Relay to orchestrate ecosystem-wide submodule updates. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Runtime:** Bun (all code runs on Bun, CJS format)
- **No npm dependencies for core:** Platform core uses only Bun/Node built-ins. MCP SDK and DuckDB are infrastructure deps.
- **CJS everywhere:** `'use strict'` + `require()`/`module.exports`. No ESM in source files.
- **Options-based DI:** Dependencies passed via options object at init(). No service locator pattern.
- **Service factory pattern:** `createServiceName()` returns `Result<Contract>` via createContract.
- **healthCheck():** Every service returns `ok({healthy, name})`.
- **Git versioning:** The user decides all version increments. Always push to origin after commits.
- **Zero npm deps for core logic:** Only MCP SDK, DuckDB, and zod are allowed as infrastructure dependencies.
- **Engineering principles:** Strict separation of concerns, IoC, DRY, abstraction over lateralization, hardcode nothing.

## Standard Stack

### Core (already established -- no new dependencies)
| Technology | Version | Purpose | Why Standard |
|------------|---------|---------|--------------|
| Bun | 1.3.11 (installed) | Runtime | Validated across all prior phases |
| `node:util.parseArgs` | Built-in | CLI argument parsing | Zero-dependency, Bun-compatible, handles subcommands natively |
| `@modelcontextprotocol/sdk` | 1.27.1 (declared) | Pulley MCP server | Already used by Wire channel-server.cjs. Validated pattern. |
| `node:events` EventEmitter | Built-in | Event proxy in Circuit | Already used by Switchboard |
| `fetch` (global) | Built-in | GitHub Releases API calls | Zero-dependency HTTP client in Bun |

### No New Dependencies Required
Phase 5 introduces no new npm dependencies. All features are built using:
- Bun/Node built-ins (`node:util`, `node:events`, `node:path`, `node:fs`)
- Global `fetch()` for GitHub API
- Existing `@modelcontextprotocol/sdk` for Pulley MCP server
- Existing lib/ patterns (ok/err, createContract, validate)

## Architecture Patterns

### Recommended Project Structure
```
core/sdk/
  circuit/
    circuit.cjs           # Circuit module API factory
    module-manifest.cjs   # Module manifest schema + validation
    event-proxy.cjs       # Per-module Switchboard event proxy
    __tests__/
      circuit.test.js
      module-manifest.test.js
      event-proxy.test.js
  pulley/
    pulley.cjs            # CLI framework factory (command registry + router)
    cli.cjs               # CLI entry point (process.argv -> pulley)
    mcp-server.cjs        # MCP server for platform operations
    output.cjs            # Output formatter (human/JSON/raw)
    help.cjs              # Help text generator
    __tests__/
      pulley.test.js
      cli.test.js
      mcp-server.test.js
      output.test.js
  index.cjs               # SDK barrel export
```

### Pattern 1: Circuit Module API (SDK-01)
**What:** Facade-only wrapper over the container that provides safe module access
**When to use:** Any module consuming the Dynamo platform (Reverie is the first client)

```javascript
// Source: CONTEXT.md D-01, D-02, D-03 (locked decisions)
'use strict';

const { ok, err, createContract } = require('../../lib/index.cjs');

const CIRCUIT_SHAPE = {
  required: [
    'registerModule', 'getService', 'getProvider',
    'registerMcpTool', 'registerCommand',
  ],
  optional: ['getModuleInfo', 'listModules'],
};

function createCircuit(options = {}) {
  // options.lifecycle -- lifecycle instance for getFacade()
  // options.container -- container for dependency checking (has() only)
  // options.pulley -- Pulley instance for command/tool registration delegation

  const _modules = new Map(); // name -> { manifest, eventProxy }

  function registerModule(manifest, registerFn) {
    // 1. Validate manifest via MODULE_MANIFEST_SCHEMA
    // 2. Check all declared deps exist (container.has)
    // 3. Create per-module event proxy
    // 4. Build Circuit API object with getService/getProvider scoped to declared deps
    // 5. Call registerFn(circuitApi)
    // 6. Store module info
  }

  function getService(moduleName, serviceName) {
    // Verify module declared this dependency, return facade
  }

  function getProvider(moduleName, providerName) {
    // Verify module declared this dependency, return facade
  }
  // ...
}
```

### Pattern 2: Per-Module Event Proxy (D-04)
**What:** Wraps Switchboard with namespacing and cleanup tracking per module
**When to use:** Every module gets one during registration

```javascript
// Source: CONTEXT.md D-04 (locked decision)
'use strict';

function createEventProxy(moduleName, switchboard) {
  const _subscriptions = []; // Track for cleanup

  function emit(event, payload) {
    // Namespace: module emits 'x', Switchboard sees '{moduleName}:x'
    return switchboard.emit(`${moduleName}:${event}`, payload);
  }

  function on(event, handler) {
    // System events (hook:*, state:*) pass through un-namespaced
    const isSystem = event.startsWith('hook:') || event.startsWith('state:');
    const actualEvent = isSystem ? event : `${moduleName}:${event}`;
    const result = switchboard.on(actualEvent, handler);
    _subscriptions.push({ event: actualEvent, handler });
    return result;
  }

  function cleanup() {
    for (const sub of _subscriptions) {
      switchboard.off(sub.event, sub.handler);
    }
    _subscriptions.length = 0;
  }

  return { emit, on, filter: switchboard.filter, cleanup, getSubscriptionCount: () => _subscriptions.length };
}
```

### Pattern 3: CLI Command Registry (SDK-02)
**What:** Registration-based command routing with structured output
**When to use:** Pulley CLI framework for all CLI commands

```javascript
// Source: CONTEXT.md D-05, D-06, D-07 (locked decisions)
'use strict';

const { parseArgs } = require('node:util');

function createPulley(options = {}) {
  const _commands = new Map(); // 'status' -> handler, 'reverie status' -> handler

  function registerCommand(name, handler, meta = {}) {
    // name: 'status' or 'reverie status' (space-separated subcommands)
    // handler: (args, flags) => Result<{ human: string, json: object, raw: string }>
    // meta: { description, flags: { json: {type:'boolean'} }, output: ['human','json','raw'] }
    _commands.set(name, { handler, ...meta });
    return ok(undefined);
  }

  function route(argv) {
    // 1. Extract positionals from argv
    // 2. Match longest command path ('reverie status' before 'reverie')
    // 3. Parse remaining args with command-specific flag definitions
    // 4. Call handler
    // 5. Format output based on --json/--raw flags
  }

  function generateHelp(commandName) {
    // Auto-generate from registered command metadata
  }
}
```

### Pattern 4: Output Formatter (D-07)
**What:** Three-mode output formatting for CLI commands
**When to use:** Every CLI command result passes through this

```javascript
// Source: CONTEXT.md D-07 (locked decision)
'use strict';

function formatOutput(result, mode) {
  // mode: 'human' (default), 'json', 'raw'
  if (mode === 'json') {
    return JSON.stringify(result.json || result, null, 2);
  }
  if (mode === 'raw') {
    return result.raw || JSON.stringify(result);
  }
  // Human-readable: result.human or formatted table/list
  return result.human || String(result);
}
```

### Pattern 5: Pulley MCP Server (SDK-03)
**What:** MCP server for platform operations, separate from Wire
**When to use:** Claude Code sessions invoking platform tools

```javascript
// Source: CONTEXT.md D-08, D-09, D-10 (locked decisions)
// Follows same pattern as wire/channel-server.cjs
'use strict';

const { Server } = require('@modelcontextprotocol/sdk/server');

function createPlatformMcpServer(options = {}) {
  const _tools = new Map(); // Registered platform + module tools

  const mcp = new Server(
    { name: 'dynamo', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  function registerTool(name, handler, schema) {
    _tools.set(name, { handler, schema });
  }

  // Wire up ListToolsRequestSchema -> enumerate _tools
  // Wire up CallToolRequestSchema -> dispatch to matching tool handler
}
```

### Pattern 6: Health Aggregation (INF-01)
**What:** Lifecycle-driven health check aggregation
**Why lifecycle-driven (D-11 discretion recommendation):** The lifecycle already holds all booted facades in a Map. Health aggregation is a simple iteration -- no new service needed. Aligns with DRY and separation of concerns (lifecycle owns booted state).

```javascript
// Source: Research recommendation for D-11 discretion
'use strict';

function aggregateHealth(facades) {
  const results = [];
  let overall = 'healthy';

  for (const [name, facade] of facades) {
    if (typeof facade.healthCheck !== 'function') continue;
    const result = facade.healthCheck();
    if (result.ok) {
      results.push(result.value);
      if (!result.value.healthy) {
        overall = 'degraded';
      }
    } else {
      results.push({ name, healthy: false, error: result.error.message });
      overall = 'unhealthy';
    }
  }

  return { overall, services: results, timestamp: new Date().toISOString() };
}

function analyzeDependencyChain(container, unhealthyServices) {
  // Walk the container's dependency graph
  // If Ledger is down, find all services that depend on it (Assay, Wire, etc.)
  // Return impacted services list
}
```

### Pattern 7: GitHub Releases API (INF-03)
**What:** Zero-dependency version management via GitHub REST API
**When to use:** Forge release management methods

```javascript
// Source: CONTEXT.md D-12, GitHub REST API docs
'use strict';

async function getLatestRelease(owner, repo) {
  const resp = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
    { headers: { 'Accept': 'application/vnd.github.v3+json' } }
  );
  if (!resp.ok) return err('RELEASE_FETCH_FAILED', `HTTP ${resp.status}`);
  const data = await resp.json();
  return ok({ tag: data.tag_name, version: data.tag_name.replace(/^v/, ''), url: data.html_url });
}

async function createRelease(owner, repo, tag, options = {}) {
  // POST /repos/{owner}/{repo}/releases
  // Requires auth token (GH_TOKEN or GITHUB_TOKEN env var)
  const resp = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases`,
    {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${process.env.GH_TOKEN || process.env.GITHUB_TOKEN}`,
      },
      body: JSON.stringify({
        tag_name: tag,
        name: options.name || tag,
        body: options.body || '',
        prerelease: options.prerelease || false,
        draft: options.draft || false,
      }),
    }
  );
  // ...
}

function compareVersions(a, b) {
  // Zero-dependency semver comparison
  // Parse major.minor.patch from both, compare numerically
  const pa = a.replace(/^[vdD.]/, '').split('.').map(Number);
  const pb = b.replace(/^[vdD.]/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}
```

### Anti-Patterns to Avoid
- **Exposing the container to modules:** Circuit must never pass the raw container. Modules get facades only (D-01).
- **Modules requiring lib/ directly:** All lib essentials re-exported through Circuit (D-02). Modules import from Circuit.
- **Monolithic CLI parser:** Pulley's command registry must be extensible -- modules register subcommands, not hard-coded.
- **Single MCP server for everything:** Pulley and Wire have separate MCP servers (D-08). Conductor manages both.
- **Custom arg parser:** Use `node:util.parseArgs` -- it is zero-dependency, built into Bun, and handles all needed patterns.
- **Hand-rolled semver comparison:** Keep it simple -- parse to `[major, minor, patch]` numbers, compare. No npm semver library needed for basic version comparison.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI argument parsing | Custom process.argv splitter | `node:util.parseArgs` | Built-in, handles flags/positionals/subcommands, validated in Bun 1.3.11 |
| MCP server protocol | Custom JSON-RPC handler | `@modelcontextprotocol/sdk` Server class | Already validated in Wire channel-server.cjs, handles protocol correctly |
| MCP transport resolution | Custom transport lookup | Same `_resolveStdioTransport()` pattern from channel-server.cjs | Known Bun wildcard export workaround |
| Semver parsing | Complex regex parser | Simple split('.').map(Number) comparison | Only need basic major.minor.patch comparison, no ranges/wildcards needed |
| Event namespacing | String concatenation throughout module code | EventProxy wrapper (D-04) | Centralizes namespacing, tracks subscriptions for cleanup |

**Key insight:** Phase 5 builds exclusively on existing patterns. Circuit mirrors plugin registration. Pulley mirrors Wire's MCP server. Health aggregation iterates existing healthCheck() methods. Versioning uses fetch() which is a global built-in. No new paradigms needed.

## Discretion Recommendations

### D-11: Health Check Aggregation -- Lifecycle-Driven (RECOMMENDED)

**Recommendation:** Lifecycle-driven aggregation, NOT a dedicated health service.

**Reasoning:**
1. The lifecycle already holds all booted facades in `_facades` Map (line 34 of lifecycle.cjs)
2. Every service already implements `healthCheck()` returning `ok({healthy, name})`
3. Adding a `getHealth()` method to lifecycle is a ~30-line function that iterates facades
4. The container already has the dependency graph via `getBootOrder()` and `getRegistry()` -- dependency chain analysis reads this directly
5. A dedicated health service would need access to all facades AND the container, creating a circular dependency concern
6. The diagnostic report can live as a utility function consumed by both Pulley CLI and MCP

**Implementation:** Add `getHealth()` and `getDiagnostics()` to the lifecycle object. These are read-only queries on existing state. Pulley's `dynamo health` and `dynamo_health` MCP tool call these.

### D-14: CLI Argument Parsing -- node:util.parseArgs (RECOMMENDED)

**Recommendation:** `node:util.parseArgs` over direct `process.argv` parsing.

**Reasoning:**
1. Verified working in Bun 1.3.11 -- handles flags, positionals, subcommands correctly
2. Zero-dependency (built into Node.js/Bun)
3. Handles boolean and string flag types with short aliases
4. `allowPositionals: true` cleanly separates subcommands from flags
5. `strict: true` mode catches unknown flags early
6. Manual process.argv parsing is error-prone for edge cases (quoted strings, `--key=value` vs `--key value`)
7. Only gap: parseArgs does not do subcommand routing -- Pulley handles that with its command registry Map before delegating flag parsing to parseArgs

**Implementation:** Pulley consumes `process.argv.slice(2)`, extracts the command path from positionals, looks up the registered command handler, then passes remaining args to `parseArgs` with the command's declared flag definitions.

## Common Pitfalls

### Pitfall 1: Module Event Leaks
**What goes wrong:** Module subscribes to Switchboard events during registration but never cleans up on shutdown, causing memory leaks and phantom handlers.
**Why it happens:** EventEmitter listeners persist unless explicitly removed. Modules may forget cleanup.
**How to avoid:** EventProxy tracks every subscription. Module shutdown calls `eventProxy.cleanup()` which removes all tracked listeners. Circuit enforces this during module unregistration.
**Warning signs:** EventEmitter maxListeners warnings, stale handlers firing after module shutdown.

### Pitfall 2: MCP SDK Resolution in Bun
**What goes wrong:** `require('@modelcontextprotocol/sdk/server/stdio')` fails with "Module not found" due to Bun wildcard export resolution mismatch.
**Why it happens:** MCP SDK uses package.json `exports` with wildcard patterns that Bun's CJS resolver does not always match (known issue from Phase 3.1).
**How to avoid:** Use the same `_resolveStdioTransport()` and `_resolveSchemas()` absolute path fallback from channel-server.cjs. Extract to a shared utility if both Wire and Pulley need it.
**Warning signs:** Module resolution errors mentioning `@modelcontextprotocol/sdk`.

### Pitfall 3: GitHub API Rate Limiting
**What goes wrong:** `getLatestRelease()` fails with HTTP 403 when called repeatedly without authentication.
**Why it happens:** GitHub REST API has a 60 req/hour limit for unauthenticated requests.
**How to avoid:** Always include `Authorization: Bearer $GH_TOKEN` header when available. Cache the latest release result for a reasonable TTL (e.g., 5 minutes). Handle 403 gracefully with a user-facing message about setting GH_TOKEN.
**Warning signs:** HTTP 403 responses, `X-RateLimit-Remaining: 0` header.

### Pitfall 4: Circular Module Dependencies
**What goes wrong:** Module A declares dependency on Module B which declares dependency on Module A.
**Why it happens:** Module manifests declare dependencies but there is no cycle detection at the module level.
**How to avoid:** Circuit's registerModule should use the same Kahn's algorithm approach from the container to detect cycles before allowing registration. Or more simply: modules only depend on services/providers, not other modules (this is the current architecture -- modules import SDK, not each other).
**Warning signs:** Infinite loops during module registration, stack overflow.

### Pitfall 5: Forge Release Without Auth Token
**What goes wrong:** `createRelease()` called without GH_TOKEN, returns 401.
**Why it happens:** getLatestRelease is read-only (works unauthenticated for public repos), but createRelease requires write permissions.
**How to avoid:** Check for GH_TOKEN/GITHUB_TOKEN before attempting write operations. Return a clear error with instructions for setting the token. Reading releases should work without auth (public repo).
**Warning signs:** HTTP 401 on POST to releases endpoint.

### Pitfall 6: Command Name Collision Between Modules
**What goes wrong:** Two modules register the same CLI command name (e.g., both register 'status' as a subcommand).
**Why it happens:** Pulley command registry is first-come-first-served.
**How to avoid:** Module commands are namespaced by module name per D-05. `dynamo reverie status` and `dynamo library status` are distinct. The registry key is the full space-separated path. Pulley rejects duplicate registrations with an error.
**Warning signs:** Err('COMMAND_EXISTS') during module registration.

## Code Examples

### Module Manifest Schema (mirrors plugin manifest)
```javascript
// Source: CONTEXT.md D-03, Phase 4 plugin.cjs pattern
'use strict';

const MODULE_MANIFEST_SCHEMA = {
  name: { type: 'string', required: true },
  version: { type: 'string', required: true },
  description: { type: 'string', required: false, default: '' },
  main: { type: 'string', required: true },
  enabled: { type: 'boolean', required: false, default: true },
  dependencies: {
    type: 'object',
    required: false,
    default: { services: [], providers: [] },
    properties: {
      services: { type: 'array', required: false, default: [] },
      providers: { type: 'array', required: false, default: [] },
    },
  },
  hooks: {
    type: 'object',
    required: false,
    default: {},
    // Maps hook type -> handler name, e.g., { SessionStart: 'onSessionStart' }
  },
};
```

### CLI Entry Point Pattern
```javascript
// Source: Discretion recommendation (D-14), v0 validated pattern
'use strict';

const { parseArgs } = require('node:util');

// cli.cjs -- the entry point invoked as `bun core/sdk/pulley/cli.cjs status --json`
async function main(argv) {
  const pulley = /* resolve from bootstrapped platform */;

  // Global flags parsed first
  const { values: globalFlags, positionals } = parseArgs({
    args: argv,
    options: {
      json: { type: 'boolean', short: 'j', default: false },
      raw: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
    strict: false, // Allow command-specific flags to pass through
  });

  if (globalFlags.help && positionals.length === 0) {
    process.stdout.write(pulley.generateHelp());
    return;
  }

  const outputMode = globalFlags.json ? 'json' : globalFlags.raw ? 'raw' : 'human';

  // Route to command handler
  const result = await pulley.route(positionals, argv);

  if (!result.ok) {
    process.stderr.write(`Error: ${result.error.message}\n`);
    process.exitCode = 1;
    return;
  }

  // Format and output
  const formatted = formatOutput(result.value, outputMode);
  process.stdout.write(formatted + '\n');
}

main(process.argv.slice(2));
```

### MCP Tool Registration from Module
```javascript
// Source: CONTEXT.md D-10 (locked decision)
// Example: How Reverie would register MCP tools via Circuit
function register(circuit) {
  // Register CLI subcommands
  circuit.registerCommand('reverie status', handleReverieStatus, {
    description: 'Show Reverie module status',
    flags: {},
  });

  circuit.registerCommand('reverie inspect', handleReverieInspect, {
    description: 'Inspect Reverie self-model state',
    flags: { aspect: { type: 'string', description: 'face|mind|subconscious' } },
  });

  // Register MCP tools
  circuit.registerMcpTool('reverie_status', handleReverieStatusMcp, {
    type: 'object',
    properties: {},
    description: 'Get Reverie module status',
  });
}
```

### Ecosystem Update Orchestration
```javascript
// Source: CONTEXT.md D-13 (locked decision), existing Relay patterns
// Extending Relay for full ecosystem management
async function updateEcosystem() {
  return _withBackup('ecosystem-update', async () => {
    // 1. Pull latest for core
    const pullResult = _forge.pull();
    if (!pullResult.ok) return pullResult;

    // 2. Update all submodules
    const submoduleResult = _forge.submoduleUpdate();
    if (!submoduleResult.ok) return submoduleResult;

    // 3. Run config migration
    const configResult = await migrateConfig(currentConfig, newVersion);
    if (!configResult.ok) return configResult;

    // 4. Verify health after update
    // (caller responsible for running health check)

    return ok({ updated: true });
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| v0 process.argv manual parsing | `node:util.parseArgs` (built-in) | Node 18.3+ / Bun 1.0+ | Eliminates edge case bugs in flag parsing |
| v0 custom health check scripts | Lifecycle-driven healthCheck() aggregation | Phase 4 (Armature) | Every service has healthCheck(), aggregation is iteration |
| v0 manual version checking | GitHub Releases API via fetch() | Phase 5 (new) | Automated semver tracking tied to release workflow |
| v0 dynamo.cjs monolithic CLI | Pulley command registry (extensible) | Phase 5 (new) | Modules extend CLI via registration, not hard-coded paths |

**Deprecated/outdated:**
- v0's `node:test` replaced by `bun:test` (incomplete Bun support for node:test)
- v0's Neo4j/Graphiti replaced by DuckDB + Journal
- v0's flat-file memory system replaced by Dynamo platform services

## Open Questions

1. **MCP Server Transport for Pulley**
   - What we know: Wire uses StdioServerTransport for its channel server. Pulley's MCP server is a separate server (D-08).
   - What's unclear: Should Pulley also use stdio transport (making it an MCP server that Claude Code connects to directly), or should it use a different transport? If both Wire and Pulley use stdio, they cannot both be stdio -- only one process gets stdin/stdout.
   - Recommendation: Pulley MCP server should use StdioServerTransport as a standalone MCP server entry point (separate from cli.cjs). Claude Code's settings.json would list both `wire/channel-server.cjs` and `pulley/mcp-server.cjs` as separate MCP server entries. Conductor manages starting/stopping both. They run as separate processes.

2. **Auth Token Management for GitHub Releases**
   - What we know: Read operations (getLatestRelease) work without auth for public repos. Write operations (createRelease) require a token.
   - What's unclear: Where should the token be stored? Environment variable only, or also in config.json?
   - Recommendation: Environment variable only (`GH_TOKEN` or `GITHUB_TOKEN`). Never store tokens in config.json (which is committed to git). Document the requirement in help text.

3. **Health Check Granularity**
   - What we know: Each service returns `ok({healthy, name})`. Some add extra fields (Forge adds `gitAvailable`, Conductor adds `dockerAvailable`).
   - What's unclear: Should health aggregation preserve these extra fields, or normalize to a standard shape?
   - Recommendation: Preserve extra fields. The aggregated report includes the full healthCheck() result from each service. This gives diagnostics maximum information without losing service-specific details.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | All phase 5 code | Yes | 1.3.11 | -- |
| git | Forge versioning, submodule mgmt | Yes | 2.48.1 | -- |
| GitHub CLI (gh) | Not directly required (uses REST API) | Yes | 2.87.3 | fetch() to REST API |
| node:util.parseArgs | Pulley CLI | Yes | Built-in | -- |
| @modelcontextprotocol/sdk | Pulley MCP server | Declared (1.27.1) | Not installed | `bun install` before Phase 5 execution |
| GitHub REST API | Forge versioning | Yes (verified) | v3 | -- |
| Docker | Conductor MCP lifecycle | Yes | Varies | Graceful degradation (existing pattern) |

**Missing dependencies with no fallback:**
- `@modelcontextprotocol/sdk` is declared in package.json but node_modules does not exist. Must run `bun install` before execution.

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built-in, Jest-compatible API) |
| Config file | bunfig.toml (root = "./") |
| Quick run command | `bun test core/sdk/` |
| Full suite command | `bun test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SDK-01 | Circuit registerModule validates manifest, checks deps, provides facades | unit | `bun test core/sdk/circuit/__tests__/circuit.test.js -x` | Wave 0 |
| SDK-01 | Module manifest schema validation | unit | `bun test core/sdk/circuit/__tests__/module-manifest.test.js -x` | Wave 0 |
| SDK-01 | Event proxy namespaces emissions, tracks subscriptions, cleans up | unit | `bun test core/sdk/circuit/__tests__/event-proxy.test.js -x` | Wave 0 |
| SDK-02 | Pulley command registration, routing, help generation | unit | `bun test core/sdk/pulley/__tests__/pulley.test.js -x` | Wave 0 |
| SDK-02 | Output formatter (human/JSON/raw modes) | unit | `bun test core/sdk/pulley/__tests__/output.test.js -x` | Wave 0 |
| SDK-02 | CLI entry point argv handling | unit | `bun test core/sdk/pulley/__tests__/cli.test.js -x` | Wave 0 |
| SDK-03 | MCP server tool listing and dispatch | unit | `bun test core/sdk/pulley/__tests__/mcp-server.test.js -x` | Wave 0 |
| INF-01 | Health aggregation across all facades | unit | `bun test core/sdk/pulley/__tests__/health.test.js -x` | Wave 0 |
| INF-01 | Dependency chain analysis for degraded services | unit | `bun test core/sdk/pulley/__tests__/health.test.js -x` | Wave 0 |
| INF-02 | Relay ecosystem update (backup-modify-verify-rollback) | unit | `bun test core/services/relay/__tests__/relay-ecosystem.test.js -x` | Wave 0 |
| INF-03 | Forge release management (getLatestRelease, createRelease, compareVersions) | unit | `bun test core/services/forge/__tests__/forge-versioning.test.js -x` | Wave 0 |
| INF-04 | Submodule management orchestration via Relay | unit | covered by INF-02 tests | Wave 0 |
| Integration | Circuit + Pulley + Bootstrap end-to-end | integration | `bun test core/sdk/__tests__/integration.test.js -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test core/sdk/ --bail`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `core/sdk/circuit/__tests__/circuit.test.js` -- covers SDK-01 (module registration, facade access, dependency verification)
- [ ] `core/sdk/circuit/__tests__/module-manifest.test.js` -- covers SDK-01 (manifest validation schema)
- [ ] `core/sdk/circuit/__tests__/event-proxy.test.js` -- covers SDK-01 (event namespacing, cleanup)
- [ ] `core/sdk/pulley/__tests__/pulley.test.js` -- covers SDK-02 (command registry, routing)
- [ ] `core/sdk/pulley/__tests__/output.test.js` -- covers SDK-02 (output formatting)
- [ ] `core/sdk/pulley/__tests__/cli.test.js` -- covers SDK-02 (argv parsing)
- [ ] `core/sdk/pulley/__tests__/mcp-server.test.js` -- covers SDK-03 (MCP tool surface)
- [ ] `core/sdk/pulley/__tests__/health.test.js` -- covers INF-01 (aggregation, dependency chain)
- [ ] `core/services/relay/__tests__/relay-ecosystem.test.js` -- covers INF-02, INF-04 (ecosystem management)
- [ ] `core/services/forge/__tests__/forge-versioning.test.js` -- covers INF-03 (GitHub Releases API)
- [ ] `core/sdk/__tests__/integration.test.js` -- covers integration (Circuit + Pulley + Bootstrap)

## Sources

### Primary (HIGH confidence)
- Existing codebase: `core/core.cjs`, `core/armature/` (lifecycle, container, facade, plugin, hooks) -- verified patterns that Phase 5 extends
- Existing codebase: `core/services/relay/relay.cjs` -- backup-modify-rollback pattern, ecosystem management to extend
- Existing codebase: `core/services/forge/forge.cjs` -- git operations, submodule management to extend
- Existing codebase: `core/services/wire/channel-server.cjs` -- MCP server pattern to replicate for Pulley
- Existing codebase: `lib/index.cjs` -- barrel export pattern, lib essentials Circuit re-exports
- Existing codebase: `core/armature/plugin.cjs` -- manifest schema pattern to replicate for modules
- `.planning/phases/05-sdk-platform-infrastructure/05-CONTEXT.md` -- all 14 locked decisions
- Bun 1.3.11 runtime verification: `node:util.parseArgs` tested, `fetch` tested against GitHub API

### Secondary (MEDIUM confidence)
- [GitHub REST API Releases documentation](https://docs.github.com/en/rest/releases/releases) -- endpoints, auth requirements, request/response format
- `.claude/reverie-spec-v2.md` section 6.1 -- Reverie as first Circuit consumer, defines what module needs from SDK

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all tools verified in Bun 1.3.11
- Architecture: HIGH -- all patterns derive from existing codebase (plugin.cjs -> module manifest, channel-server.cjs -> MCP server, facade.cjs -> Circuit access)
- Pitfalls: HIGH -- drawn from actual issues encountered in prior phases (MCP SDK resolution, event listener leaks, etc.)
- Discretion recommendations: HIGH -- D-11 (lifecycle aggregation) verified by reading lifecycle.cjs facade Map; D-14 (parseArgs) verified by runtime test in Bun

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable -- no external API changes expected)
