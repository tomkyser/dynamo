# Phase 4: Framework - Research

**Researched:** 2026-03-23
**Domain:** IoC container, lifecycle orchestration, provider facades, plugin API, hook definitions, configuration validation
**Confidence:** HIGH

## Summary

Phase 4 composes all services and providers built in Phases 1-3.2 into a coherent platform through Armature -- the framework layer that Dynamo's architecture plan places between core services/providers and the SDK. Armature does not introduce new services or providers. It wires, exposes, and governs the existing 9 services (Switchboard, Commutator, Magnet, Lathe, Forge, Conductor, Relay, Wire, Assay) and 2 providers (Ledger, Journal) through an IoC container, two-phase lifecycle, provider facades with domain aliasing, plugin API contracts, hook definitions, and configuration validation.

The existing codebase follows a uniform factory pattern: each service has a `createServiceName()` function returning `Result<Contract>` via `createContract()`, with `init(options)` for dependency injection and `start()/stop()/healthCheck()` for lifecycle. The container wraps this pattern -- it knows the dependency graph, topologically sorts registrations, and calls `init(options)` with resolved deps at boot time. Services never import the container (D-01). Facades wrap resolved services/providers with hook points for plugin extension (D-08). The bootstrap entry point `core/core.cjs` creates the container, registers all built-in components, runs register/boot lifecycle, and exports the ready container (D-07).

**Primary recommendation:** Build Armature as 6 focused modules inside `core/armature/` -- container.cjs, facade.cjs, lifecycle.cjs, plugin.cjs, hooks.cjs, and an index.cjs barrel. The container is a Map-based registry with topological sort for boot ordering. Facades use Object.create() delegation to wrap contracts with before/after/around hooks. `core/core.cjs` is the single bootstrap entry point.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Container wraps existing options-based DI. Container knows the dependency graph and resolves services, but still injects via options objects at init(). Services never import the container -- they receive deps through options as before. Container is the orchestrator, not a service locator. Existing services remain testable and decoupled.
- **D-02:** Declarative metadata for dependency graph. Each service registers with `deps: ['switchboard', 'ledger']`. Container topologically sorts registrations and injects in dependency order. Graph is data, not code. Aligns with "hardcode nothing."
- **D-03:** Two lifetime modes: singleton (one instance, returned on every resolve) and factory (new instance per resolve). Singletons for services (Switchboard, Magnet, etc.), factory for per-request/per-session objects. Deferred/lazy = resolve on first access, not at boot.
- **D-04:** Tagged bindings for contextual resolution. `bind('data-provider', ledgerImpl, { tags: ['sql', 'data'] })`. Resolve by tag: `resolveTagged('sql')` returns Ledger. Enables import-by-domain (FWK-02) through the same mechanism as IoC resolution.
- **D-05:** Domain aliases are container queries, not filesystem paths. The architecture plan's `import Dynamo/Providers/Data/sql.cjs` becomes `container.resolve('providers.data.sql')`. Aliases are metadata in the registry. No parallel file tree. Keeps filesystem clean.
- **D-06:** Facade wraps every registered provider/service. Armature generates a facade object that enforces the contract and adds domain metadata. `container.resolve('providers.data.sql')` returns the Ledger facade, not raw Ledger. Consumers never touch raw implementations. Plugin overrides swap what's behind the facade.
- **D-07:** `core/core.cjs` orchestrates bootstrap. Creates the container, registers all built-in services/providers with their domain tags, runs the register/boot lifecycle, and exports the ready container. Single entry point. Aligns with the architecture plan's file tree (`core/core.cjs` listed explicitly).
- **D-08:** Facade hook points for extension. Facades expose before/after/around hooks at method level. Plugin registers: `facade.hook('query', 'after', myHandler)`. To override: `facade.override('query', myImpl)`. Facade dispatches through hooks, then to implementation. Switchboard events emitted at each hook point. Familiar middleware pattern.
- **D-09:** Plugin introduces new domains via container registration. Plugin calls `container.bind('services.search.s3', myS3SearchImpl, { tags: ['search', 's3'] })`. New domain appears in the registry alongside core domains. Consumers resolve it the same way. No special API -- same bind() core uses.
- **D-10:** Minimal plugin manifest for v1. plugin.json contains: name, version, description, dependencies (core services/providers it requires), entry point (main .cjs file), and enabled flag. No domain declarations in manifest -- code handles registration. Manifest enables dependency checking and enable/disable toggle per FWK-04.
- **D-11:** Core first, plugins second lifecycle. Register phase: core services register, then plugins register (can see what core provides). Boot phase: core boots in dependency order, then plugins boot (can access booted core services). If a plugin fails to boot, core still runs. Clean separation.
- **D-12:** Armature defines canonical hook type schemas (what data each of the 8 Claude Code hooks carries) and provides a declarative hook wiring registry. Services and plugins register hook interests through the registry. At boot, Armature wires Commutator->Switchboard->registered handlers automatically. Commutator stays the runtime bridge; Armature is the boot-time configuration layer.
- **D-13:** Hook configuration from config.json. Armature reads which hooks are enabled and what services listen to what. Single source of truth for what hooks are active. Plugins declare hook interests in their registration.
- **D-14:** Extend existing lib/schema.cjs for FWK-06. Enhance the validator to handle nested object validation, enum types, and plugin config sections. Stays zero-dependency. JSON Schema spec compliance is not needed for internal config validation.

### Claude's Discretion
- Container internal data structures (Map, linked list, etc. for dependency graph)
- Facade generation implementation details (Object.create, factory function, etc.)
- Hook schema shape (JSDoc typedefs, plain objects, etc.)
- Topological sort algorithm choice
- Error messages and diagnostics for dependency resolution failures
- Config validation error formatting

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FWK-01 | Service container with IoC (bind/singleton/factory, automatic dependency resolution, contextual binding, scoped resolution, deferred/lazy loading) | Container design in Architecture Patterns section. Decisions D-01 through D-04 define container semantics. Dependency graph mapped in Existing Dependency Map. |
| FWK-02 | Provider contracts and facade system (import by domain of responsibility or by name) | Facade pattern in Architecture Patterns. D-05/D-06 define domain aliasing via container queries and facade wrapping. Existing DATA_PROVIDER_SHAPE and STATE_PROVIDER_SHAPE contracts documented. |
| FWK-03 | Register/boot two-phase lifecycle | Lifecycle orchestration in Architecture Patterns. D-07/D-11 define core-first, plugins-second ordering. Topological sort algorithm in Code Examples. |
| FWK-04 | Plugin API contracts (manifest, domain extension, domain introduction, dependency checking, enable/disable toggle) | Plugin system in Architecture Patterns. D-08 through D-11 define manifest schema, extension hooks, and lifecycle ordering. |
| FWK-05 | Hook definitions and Claude Code integration layer | Hook wiring in Architecture Patterns. D-12/D-13 define schema shapes for all 8 hook types and config-driven wiring registry. Existing Commutator/Switchboard hook event maps documented. |
| FWK-06 | Configuration validation (JSON Schema at boot) | Schema enhancement in Architecture Patterns. D-14 extends lib/schema.cjs with enum support and plugin config sections. Existing validate() function documented. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bun | 1.3.11 (installed) | Runtime | Project runtime. All code runs on Bun, CJS format. |
| bun:test | Built-in | Test runner | Project test framework. Jest-compatible API. |

### Supporting
No additional dependencies needed. Phase 4 is entirely composition of existing lib/ and core/ code. Zero new npm dependencies -- consistent with the project constraint of no npm dependencies for platform core.

## Architecture Patterns

### Recommended Project Structure
```
core/
  armature/
    container.cjs       # IoC container: bind, resolve, resolveTagged, dependency graph
    facade.cjs          # Facade generator: wraps contracts with hook points, domain metadata
    lifecycle.cjs       # Register/boot two-phase lifecycle orchestrator
    plugin.cjs          # Plugin manifest loading, dependency checking, enable/disable
    hooks.cjs           # Claude Code hook type schemas, declarative wiring registry
    __tests__/
      container.test.js
      facade.test.js
      lifecycle.test.js
      plugin.test.js
      hooks.test.js
      integration.test.js  # Full bootstrap with all services
  core.cjs              # Bootstrap entry point: creates container, registers all, runs lifecycle
```

### Existing Dependency Graph (What Container Must Wire)

The container must know these dependency relationships. All discovered from init() signatures:

| Component | Name Key | Type | Required Deps | Optional Deps | Config |
|-----------|----------|------|---------------|---------------|--------|
| Lathe | `services.lathe` | singleton | (none) | (none) | -- |
| Switchboard | `services.switchboard` | singleton | (none) | (none) | -- |
| Commutator | `services.commutator` | singleton | switchboard | (none) | -- |
| Magnet | `services.magnet` | singleton | (none) | switchboard, provider | -- |
| Conductor | `services.conductor` | singleton | (none) | switchboard | -- |
| Forge | `services.forge` | singleton | repoPath* | lathe, switchboard | repoPath from config |
| Relay | `services.relay` | singleton | forge | lathe, switchboard, configPath | configPath from config |
| Wire | `services.wire` | singleton | switchboard | conductor, ledger, relayUrl, reconnectTTL, queueConfig, mcpServer, sessionId | relayUrl from config |
| Assay | `services.assay` | singleton | (none) | switchboard, ledger, journal | -- |
| Ledger | `providers.data.sql` / `providers.ledger` | singleton | dbPath* | switchboard, backend | dbPath from config |
| Journal | `providers.data.files` / `providers.journal` | singleton | basePath*, lathe | switchboard | basePath from config |

*Config-sourced values (repoPath, dbPath, basePath, configPath) come from loadConfig/paths, not from other services.

**Topological boot order** (derived from dependency graph):
1. Lathe, Switchboard (zero deps -- parallel-safe)
2. Commutator, Magnet, Conductor (depend only on Switchboard)
3. Ledger (depends on dbPath config only), Journal (depends on Lathe)
4. Forge (depends on Lathe), Assay (depends on Ledger, Journal optionally)
5. Relay (depends on Forge, Lathe)
6. Wire (depends on Switchboard, Conductor, Ledger)

### Pattern 1: IoC Container (container.cjs)

**What:** Map-based registry with declarative dependency metadata, topological sorting, tagged bindings, and singleton/factory lifetime modes.

**Key design:** Container wraps the existing options-based DI. It does NOT replace it. Services still receive deps through `init(options)` -- the container is the thing that constructs the options object from resolved deps and calls init().

**Implementation approach:**
- Internal `_registry` Map keyed by binding name (e.g., `'services.switchboard'`)
- Each entry: `{ factory, instance, lifetime, deps, tags, aliases, deferred }`
- `bind(name, factory, options)` registers a binding with metadata
- `singleton(name, factory, options)` shorthand for bind with lifetime:'singleton'
- `factory(name, factory, options)` shorthand for bind with lifetime:'factory'
- `resolve(name)` returns the facade-wrapped instance (creates singleton on first access, new instance for factory)
- `resolveTagged(tag)` returns all bindings matching a tag
- `has(name)` checks if a binding exists
- `getMetadata(name)` returns registration metadata for diagnostics
- Deferred/lazy resolution: singleton instances not created until first `resolve()` call, not at boot

**Topological sort for boot ordering:**
```javascript
// Kahn's algorithm -- O(V+E), iterative, deterministic
function topoSort(registry) {
  const inDegree = new Map();
  const adjList = new Map();
  const queue = [];
  const order = [];

  for (const [name, entry] of registry) {
    inDegree.set(name, 0);
    adjList.set(name, []);
  }

  for (const [name, entry] of registry) {
    for (const dep of entry.deps) {
      if (registry.has(dep)) {
        adjList.get(dep).push(name);
        inDegree.set(name, inDegree.get(name) + 1);
      }
    }
  }

  for (const [name, degree] of inDegree) {
    if (degree === 0) queue.push(name);
  }

  while (queue.length > 0) {
    const current = queue.shift();
    order.push(current);
    for (const dependent of adjList.get(current)) {
      inDegree.set(dependent, inDegree.get(dependent) - 1);
      if (inDegree.get(dependent) === 0) {
        queue.push(dependent);
      }
    }
  }

  if (order.length !== registry.size) {
    // Cycle detected
    const missing = [...registry.keys()].filter(k => !order.includes(k));
    return err('CYCLE_DETECTED', 'Circular dependency detected', { cycle: missing });
  }

  return ok(order);
}
```

### Pattern 2: Facade Generator (facade.cjs)

**What:** Wraps every resolved contract with before/after/around hooks at method level, domain metadata, and override capability.

**Key design:** Facade delegates to the underlying implementation. Hook chains execute before/after each method call. Override replaces the implementation behind the facade. All consumers get the facade, never the raw contract.

**Implementation approach:**
- `createFacade(name, contract, metadata)` returns a facade object
- Facade has all methods from the contract, plus `hook(method, position, handler)`, `override(method, newImpl)`, and `meta` property
- Before hooks can modify args or halt execution (return Err)
- After hooks can modify return value
- Around hooks wrap the entire call (receive `next` function)
- Hook dispatches also emit Switchboard events: `'facade:{name}:{method}:before'`, `'facade:{name}:{method}:after'`

### Pattern 3: Register/Boot Lifecycle (lifecycle.cjs)

**What:** Two-phase lifecycle orchestrator that separates binding registration from service initialization.

**Register phase:**
1. Core services register bindings (factory functions + dependency metadata)
2. Core providers register bindings
3. Plugins register bindings (can see what core provides via `container.has()`)

**Boot phase:**
1. Topological sort all registered bindings by dependency graph
2. For each binding in order: create instance (call factory), call `init(resolvedOptions)`, call `start()`
3. Wrap each instance in a facade
4. If a plugin fails to boot, log error but continue -- core must still run
5. Wire hook registry after all services are booted

**Shutdown (reverse boot order):**
1. Stop plugins first
2. Stop core services in reverse topological order
3. Each `stop()` call returns Result

### Pattern 4: Plugin System (plugin.cjs)

**What:** Plugin manifest loading, dependency verification, and lifecycle integration.

**Manifest schema (plugin.json):**
```json
{
  "name": "example-plugin",
  "version": "1.0.0",
  "description": "Example plugin",
  "main": "index.cjs",
  "enabled": true,
  "dependencies": {
    "services": ["switchboard", "assay"],
    "providers": ["ledger"]
  }
}
```

**Plugin lifecycle:**
1. Discovery: scan `plugins/` directory for `plugin.json` files
2. Validation: validate manifest against schema, check `enabled` flag
3. Dependency check: verify all listed dependencies exist in container
4. Registration: require plugin entry point, call its `register(container)` function
5. Boot: call plugin's `boot(container)` after core is booted

**Extension model:**
- Extend existing domain: `facade.hook('query', 'after', myEnrichment)` or `facade.override('query', myImpl)`
- Introduce new domain: `container.bind('services.search.s3', myS3Search, { tags: ['search', 's3'] })`
- Both use the same container/facade APIs that core uses

### Pattern 5: Hook Definitions (hooks.cjs)

**What:** Canonical schemas for all 8 Claude Code hook types and a declarative wiring registry.

**The 8 hook types and their schemas:**

| Hook Event | Schema Shape | Switchboard Event |
|------------|-------------|-------------------|
| SessionStart | `{ session_id, cwd, ... }` | `hook:session-start` |
| UserPromptSubmit | `{ user_prompt, session_id, ... }` | `hook:prompt-submit` |
| PreToolUse | `{ tool_name, tool_input, session_id, ... }` | `{domain}:pending` |
| PostToolUse | `{ tool_name, tool_input, tool_output, session_id, ... }` | `{domain}:changed/executed/fetched/completed` |
| Stop | `{ session_id, stop_hook_active, ... }` | `hook:stop` |
| PreCompact | `{ session_id, ... }` | `hook:pre-compact` |
| SubagentStart | `{ subagent_id, session_id, ... }` | `hook:subagent-start` |
| SubagentStop | `{ subagent_id, session_id, ... }` | `hook:subagent-stop` |

**Wiring registry:** Declarative map of which services/plugins listen to which hooks.
```javascript
// In config.json (D-13):
{
  "hooks": {
    "enabled": ["SessionStart", "UserPromptSubmit", "PostToolUse", "Stop", "PreCompact", "SubagentStart", "SubagentStop"],
    "listeners": {
      "SessionStart": ["magnet", "wire"],
      "UserPromptSubmit": ["assay"],
      "PostToolUse": ["magnet", "assay"],
      "Stop": ["magnet", "wire"]
    }
  }
}
```

At boot, Armature reads this config and wires: for each enabled hook, register a Switchboard handler that invokes the listed services' hook handlers. Commutator remains the runtime bridge (it ingests raw payloads and emits domain events on Switchboard). Armature is the boot-time configuration that connects Switchboard events to specific service handlers.

### Pattern 6: Config Validation Enhancement (extends lib/schema.cjs)

**What:** Enhance the existing `validate()` function in `lib/schema.cjs` to support enum types and plugin config sections. Stays zero-dependency.

**New capabilities needed:**
- `enum` field type: `{ type: 'string', enum: ['debug', 'info', 'warn', 'error'] }` -- validates value is one of the allowed values
- Plugin config sections: ability to validate dynamically-shaped plugin config objects
- Better error formatting for boot-time config validation failures

**The existing validate() already supports:** nested objects, type checking, required fields, defaults, key stripping. It already handles the recursive case. Enhancement is additive.

### Anti-Patterns to Avoid
- **Service locator pattern:** Services must NEVER import the container. They receive deps through init(options). The container is an orchestrator, not a lookup table. (D-01)
- **Eager instantiation:** Do not create all singletons at registration time. Create them lazily on first resolve() or during boot phase. (D-03)
- **Filesystem-based aliasing:** Domain aliases are container metadata, NOT parallel file trees or symlinks. `container.resolve('providers.data.sql')` is a Map lookup. (D-05)
- **Global mutable singletons:** Explicitly out of scope per REQUIREMENTS.md. Container-managed singletons are different -- they are created once, frozen, and resolved through the container.
- **Plugin-to-plugin direct imports:** Plugins interact through Armature contracts and Switchboard events, never through direct requires. (REQUIREMENTS.md Out of Scope)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Topological sort | Custom recursive DFS with manual cycle detection | Kahn's algorithm (iterative BFS) | Well-understood O(V+E) algorithm, deterministic ordering, clean cycle detection via remaining in-degree counts |
| Config validation | New validation framework | Enhance existing lib/schema.cjs | Already handles nested objects, type checks, required/default. Only needs enum addition. |
| Contract validation | New contract system | Existing lib/contract.cjs (createContract) | All services already use it. Facades build on top of it, not beside it. |
| Error types | New error handling | Existing lib/result.cjs (ok/err) | Universal across the codebase. Every Result-returning function uses this. |
| Event dispatch | Custom event system in facade | Existing Switchboard | Facade hook events should emit through Switchboard. Don't duplicate the event system. |

**Key insight:** Phase 4 is almost entirely composition. The building blocks (contracts, results, schemas, Switchboard, Commutator) already exist. Armature wires them together and adds the container/facade/lifecycle/plugin layers. Resist the urge to rebuild any existing pattern.

## Common Pitfalls

### Pitfall 1: Circular Dependencies in the Container
**What goes wrong:** Service A depends on Service B which depends on Service A. Topological sort fails with cycle detection error. Bootstrap cannot complete.
**Why it happens:** The current codebase has no circular deps (verified by reading all init() signatures), but plugins or future services could introduce them.
**How to avoid:** Kahn's algorithm naturally detects cycles (remaining nodes with non-zero in-degree). Return a clear error with the cycle participants. Validate the graph before attempting boot.
**Warning signs:** `CYCLE_DETECTED` error during `lifecycle.boot()`.

### Pitfall 2: Facade Hook Ordering Confusion
**What goes wrong:** Before hooks on a facade method modify arguments in unexpected order, or around hooks double-wrap calls.
**Why it happens:** Multiple plugins hooking the same method without clear ordering semantics.
**How to avoid:** Hooks execute in registration order (core first, then plugins in discovery order). Document this clearly. Provide a priority parameter on hook() for explicit ordering if needed.
**Warning signs:** Test assertions showing unexpected argument mutations or doubled side effects.

### Pitfall 3: Deferred Resolution Timing
**What goes wrong:** A service tries to resolve a deferred binding before boot phase completes, gets undefined or an error.
**Why it happens:** Deferred/lazy bindings resolve on first access. If something accesses a binding during registration phase (before boot), it hasn't been created yet.
**How to avoid:** Container should throw a clear error if resolve() is called before boot completes for non-deferred bindings. Deferred bindings should be clearly documented as "available after boot."
**Warning signs:** `BINDING_NOT_BOOTED` errors during register phase.

### Pitfall 4: Config-Sourced Dependencies vs Service Dependencies
**What goes wrong:** Container tries to resolve `repoPath` as a service dependency but it's a config value, not a service.
**Why it happens:** Some init() options are service references (switchboard, lathe) while others are config values (repoPath, dbPath, basePath). The container must distinguish between these.
**How to avoid:** Registration metadata should separate `deps` (service references the container resolves) from `config` (values sourced from loadConfig/paths). The container builds the options object by merging resolved deps + config values.
**Warning signs:** `BINDING_NOT_FOUND` errors for config keys like 'repoPath'.

### Pitfall 5: Frozen Contract + Facade Wrapping Conflict
**What goes wrong:** Attempting to add properties (hook(), override(), meta) to a frozen contract object throws TypeError.
**Why it happens:** createContract() returns Object.freeze(). Facades cannot modify frozen objects.
**How to avoid:** Facades do NOT modify the contract. They create a new object that delegates method calls to the frozen contract. The facade itself is a separate object with its own hook/override/meta properties. Use delegation (explicit property forwarding or Object.create with getters), not modification.
**Warning signs:** TypeError: Cannot add property to a frozen object.

### Pitfall 6: Async init() in Sync Boot Order
**What goes wrong:** Some services have async init() (Magnet, Ledger, Journal) while others are sync. Calling them all in a for-loop without await breaks ordering.
**Why it happens:** Mixed sync/async init signatures across services.
**How to avoid:** Boot phase must await every init() call regardless. Use `await Promise.resolve(service.init(options))` to normalize -- sync Results get wrapped in resolved promises, async Results are awaited naturally.
**Warning signs:** Unhandled promise rejection or services booting before their async deps finish init.

## Code Examples

### Container Registration (core/core.cjs bootstrap)
```javascript
'use strict';

const { createContainer } = require('./armature/container.cjs');
const { runLifecycle } = require('./armature/lifecycle.cjs');
const { loadConfig, getPaths } = require('../lib/index.cjs');

// Service factories
const { createSwitchboard } = require('./services/switchboard/switchboard.cjs');
const { createCommutator } = require('./services/commutator/commutator.cjs');
const { createMagnet } = require('./services/magnet/magnet.cjs');
const { createLathe } = require('./services/lathe/lathe.cjs');
const { createForge } = require('./services/forge/forge.cjs');
const { createConductor } = require('./services/conductor/conductor.cjs');
const { createRelay } = require('./services/relay/relay.cjs');
const { createWire } = require('./services/wire/wire.cjs');
const { createAssay } = require('./services/assay/assay.cjs');

// Provider factories
const { createLedger } = require('./providers/ledger/ledger.cjs');
const { createJournal } = require('./providers/journal/journal.cjs');

async function bootstrap(options = {}) {
  const container = createContainer();

  // Register core services with dependency metadata
  container.singleton('services.switchboard', createSwitchboard, {
    deps: [],
    tags: ['service', 'events'],
  });

  container.singleton('services.lathe', createLathe, {
    deps: [],
    tags: ['service', 'filesystem'],
  });

  container.singleton('services.commutator', createCommutator, {
    deps: ['services.switchboard'],
    tags: ['service', 'io'],
    mapDeps: { 'services.switchboard': 'switchboard' },
  });

  // ... register all services with their dep metadata ...

  // Register providers with domain tags
  container.singleton('providers.ledger', createLedger, {
    deps: [],
    tags: ['provider', 'data', 'sql'],
    aliases: ['providers.data.sql'],
    config: { dbPath: paths.root + '/data/ledger.db' },
  });

  container.singleton('providers.journal', createJournal, {
    deps: ['services.lathe'],
    tags: ['provider', 'data', 'files'],
    aliases: ['providers.data.files'],
    mapDeps: { 'services.lathe': 'lathe' },
    config: { basePath: paths.root + '/data/journal' },
  });

  // Run two-phase lifecycle
  const result = await runLifecycle(container, options);
  return result;
}

module.exports = { bootstrap };
```

### Facade with Hook Points
```javascript
'use strict';

const { ok, err } = require('../../lib/index.cjs');

function createFacade(name, contract, metadata = {}) {
  const _hooks = {};  // { methodName: { before: [], after: [], around: [] } }

  function hook(method, position, handler) {
    if (!_hooks[method]) _hooks[method] = { before: [], after: [], around: [] };
    _hooks[method][position].push(handler);
  }

  function override(method, newImpl) {
    if (typeof contract[method] !== 'function') {
      return err('FACADE_INVALID_METHOD', `Method "${method}" not found on contract "${name}"`);
    }
    // Store override -- facade dispatch will use it instead of original
    if (!_overrides) _overrides = {};
    _overrides[method] = newImpl;
    return ok(undefined);
  }

  // Build facade object with delegating methods
  const facade = { meta: { name, ...metadata } };
  const _overrides = {};

  for (const key of Object.keys(contract)) {
    if (typeof contract[key] === 'function') {
      facade[key] = function facadeMethod(...args) {
        const hooks = _hooks[key] || { before: [], after: [], around: [] };
        const impl = _overrides[key] || contract[key];

        // Execute before hooks
        for (const h of hooks.before) {
          const result = h(args, name, key);
          if (result && result.ok === false) return result;
          if (Array.isArray(result)) args = result;
        }

        // Execute implementation (or around chain)
        let result = impl(...args);

        // Execute after hooks
        for (const h of hooks.after) {
          const modified = h(result, args, name, key);
          if (modified !== undefined) result = modified;
        }

        return result;
      };
    }
  }

  facade.hook = hook;
  facade.override = override;

  return Object.freeze(facade);
}

module.exports = { createFacade };
```

### Topological Sort (Kahn's Algorithm)
```javascript
'use strict';

const { ok, err } = require('../../lib/index.cjs');

function topoSort(registry) {
  const inDegree = new Map();
  const adjList = new Map();
  const queue = [];
  const order = [];

  // Initialize
  for (const [name] of registry) {
    inDegree.set(name, 0);
    adjList.set(name, []);
  }

  // Build adjacency list from deps
  for (const [name, entry] of registry) {
    for (const dep of (entry.deps || [])) {
      if (registry.has(dep)) {
        adjList.get(dep).push(name);
        inDegree.set(name, inDegree.get(name) + 1);
      }
      // Note: deps that don't exist in registry are config values, not service refs
    }
  }

  // Seed queue with zero in-degree nodes
  for (const [name, degree] of inDegree) {
    if (degree === 0) queue.push(name);
  }

  // Process
  while (queue.length > 0) {
    const current = queue.shift();
    order.push(current);
    for (const dependent of adjList.get(current)) {
      const newDegree = inDegree.get(dependent) - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) queue.push(dependent);
    }
  }

  if (order.length !== registry.size) {
    const cycleParticipants = [...registry.keys()].filter(k => !order.includes(k));
    return err('CYCLE_DETECTED', `Circular dependency detected among: ${cycleParticipants.join(', ')}`, {
      cycle: cycleParticipants,
    });
  }

  return ok(order);
}

module.exports = { topoSort };
```

### Schema Enhancement (enum support for lib/schema.cjs)
```javascript
// Addition to the existing validate() function in lib/schema.cjs:
// Inside the type checking section, after array/type checks:

// Enum validation (new for FWK-06)
if (field.enum) {
  if (!field.enum.includes(val)) {
    errors.push({
      key: fullKey,
      code: 'ENUM_INVALID',
      message: `"${fullKey}" must be one of [${field.enum.join(', ')}], got "${val}"`,
    });
    continue;
  }
}
```

### Plugin Manifest Validation
```javascript
const PLUGIN_MANIFEST_SCHEMA = {
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
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct require() for service access | Container-managed resolution with facades | Phase 4 (now) | Services accessed via container.resolve() with domain aliasing |
| Manual init() call ordering | Topological sort auto-ordering | Phase 4 (now) | Boot order computed from dependency graph, not hardcoded |
| Raw contract objects | Facade-wrapped contracts with hook points | Phase 4 (now) | Plugins can extend/override methods without modifying core |
| Implicit hook wiring (Commutator hardcoded routing) | Declarative hook registry in config.json | Phase 4 (now) | Hook listeners configured data-first, wired automatically at boot |

**Unchanged:**
- Service factory pattern (createServiceName -> Result<Contract>) remains the standard
- Options-based DI at init() remains the injection mechanism
- createContract() shape validation remains the validation mechanism
- Result types (ok/err) remain the error communication pattern

## Open Questions

1. **Container thread safety for concurrent resolve()**
   - What we know: Bun is single-threaded for JS execution, so concurrent resolve() within one event loop tick is not possible. However, async init() calls during boot could interleave.
   - What's unclear: Whether the boot loop needs explicit sequencing beyond topological order for async inits.
   - Recommendation: Use sequential `for...of` with `await` during boot, not `Promise.all()`. Topological order already ensures deps are ready. Sequential boot is safer and deterministic.

2. **Facade method discovery for dynamically-shaped services**
   - What we know: Facade must delegate all methods from the contract. Contract shapes are defined statically (SWITCHBOARD_SHAPE, etc.).
   - What's unclear: Whether new methods added by plugins to a facade should be discoverable by other consumers.
   - Recommendation: Plugin-added methods go on the plugin's own facade, not on the core service facade. Core facades have fixed shapes. This prevents fragile dependency on plugin-specific APIs.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built-in) |
| Config file | none -- bun:test uses default discovery |
| Quick run command | `bun test core/armature/__tests__/` |
| Full suite command | `bun test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FWK-01 | Container bind/resolve/singleton/factory/tagged/deferred | unit | `bun test core/armature/__tests__/container.test.js` | Wave 0 |
| FWK-02 | Facade wrapping, domain aliasing, hook points, override | unit | `bun test core/armature/__tests__/facade.test.js` | Wave 0 |
| FWK-03 | Two-phase lifecycle, topological boot, shutdown | unit | `bun test core/armature/__tests__/lifecycle.test.js` | Wave 0 |
| FWK-04 | Plugin manifest validation, dep check, enable/disable | unit | `bun test core/armature/__tests__/plugin.test.js` | Wave 0 |
| FWK-05 | Hook type schemas, wiring registry, Commutator integration | unit | `bun test core/armature/__tests__/hooks.test.js` | Wave 0 |
| FWK-06 | Config validation with enum, nested, plugin sections | unit | `bun test lib/__tests__/schema.test.js` | Existing (enhance) |
| ALL | Full bootstrap with all 11 services/providers | integration | `bun test core/armature/__tests__/integration.test.js` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test core/armature/__tests__/`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `core/armature/__tests__/container.test.js` -- covers FWK-01
- [ ] `core/armature/__tests__/facade.test.js` -- covers FWK-02
- [ ] `core/armature/__tests__/lifecycle.test.js` -- covers FWK-03
- [ ] `core/armature/__tests__/plugin.test.js` -- covers FWK-04
- [ ] `core/armature/__tests__/hooks.test.js` -- covers FWK-05
- [ ] `core/armature/__tests__/integration.test.js` -- covers full bootstrap
- [ ] Enhance `lib/__tests__/schema.test.js` with enum validation tests -- covers FWK-06

## Sources

### Primary (HIGH confidence)
- Codebase analysis of all 9 service factories and 2 provider factories -- init() signatures, dependency structures, lifecycle patterns
- `lib/contract.cjs` -- createContract pattern (foundation for facades)
- `lib/schema.cjs` -- existing validate() function (foundation for FWK-06)
- `lib/result.cjs` -- ok/err pattern (universal error handling)
- `core/services/commutator/commutator.cjs` -- HOOK_EVENT_MAP, TOOL_DOMAIN_MAP, resolveEventName (foundation for FWK-05)
- `core/providers/provider-contract.cjs` -- DATA_PROVIDER_SHAPE (foundation for FWK-02)
- `core/services/magnet/provider.cjs` -- STATE_PROVIDER_SHAPE (separate contract per Phase 3 D-01)
- `.claude/new-plan.md` -- Architecture plan (absolute canon). Lines 90-105 define Armature scope.
- `04-CONTEXT.md` -- D-01 through D-14 locked decisions

### Secondary (MEDIUM confidence)
- Kahn's algorithm for topological sort -- well-established CS algorithm, O(V+E), iterative. No external source needed.
- Facade/delegation pattern -- standard GoF pattern adapted for CJS frozen contracts.

### Tertiary (LOW confidence)
- None. All findings derived from codebase analysis and locked decisions.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all Bun built-ins validated in prior phases
- Architecture: HIGH -- all patterns derived from existing codebase + locked decisions in CONTEXT.md
- Pitfalls: HIGH -- identified from direct analysis of existing code patterns (frozen contracts, async init, mixed deps)

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable -- internal composition, no external API dependencies)
