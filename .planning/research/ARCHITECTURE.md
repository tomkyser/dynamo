# Architecture Patterns

**Domain:** Self-contained development platform for Claude Code (game-engine-class architecture)
**Researched:** 2026-03-22

## Recommended Architecture

Dynamo's canonical architecture is a strict layered system with unidirectional dependency flow. Each layer provides services to the layer above and depends only on layers below. This pattern is the industry standard for platform-class software (game engines, framework ecosystems like Laravel, Spring) and is well-validated for Dynamo's goals.

**The canonical build order is correct and validated:**

```
Core Library (lib/)
    |
    v
Core Services (core/services/) + Core Providers (core/providers/)   [parallel, both import lib/ only]
    |
    v
Framework / Armature (core/armature/)   [imports services + providers]
    |
    v
SDK: Circuit + Pulley (core/sdk/)   [imports framework]
    |
    v
Plugins (plugins/)   [import SDK]
    |
    v
Modules (modules/)   [import SDK + plugins]
    |
    v
Extensions (extensions/)   [import plugins + modules]
    |
    v
Runtime   [imports extensions, composes everything]
```

### Why This Order Is Right

This matches the universal layered platform pattern observed in:

- **Game engines** (Unreal, Godot, Unity): Platform layer, core systems, resource management, scene management, game logic -- each layer wraps the one below.
- **Framework ecosystems** (Laravel, Spring, Django): Core utilities, service container, service providers, facades, application layer.
- **Build systems** (Gradle, Bazel): Dependency graph with topological ordering guarantees -- lower layers compile before upper layers that consume them.

The key validation: Services and Providers at the same tier, importing only the library, is the correct call. In Laravel's architecture, Service Providers and the Service Container are peers -- both are core infrastructure that the Framework layer (facades, routing, middleware) then composes. Dynamo's separation of "services can do" and "providers can supply/receive" maps cleanly to this industry pattern.

### Component Boundaries

| Component | Layer | Responsibility | Imports From | Exports To |
|-----------|-------|---------------|-------------|-----------|
| **lib/** | 0 - Library | Shared patterns, types, utilities, constants | Nothing (pure) | Everything above |
| **Commutator** | 1 - Service | System I/O bus -- all I/O flows through here | lib/ | Armature |
| **Magnet** | 1 - Service | System state management -- singleton state container | lib/ | Armature |
| **Conductor** | 1 - Service | Infrastructure ops (Docker, dependency mgmt) | lib/ | Armature |
| **Forge** | 1 - Service | Git operations, channel switching, repo-to-deploy sync | lib/ | Armature |
| **Lathe** | 1 - Service | Filesystem operations (thin Bun-native facade) | lib/ | Armature |
| **Relay** | 1 - Service | Install, update, sync operations | lib/ | Armature |
| **Switchboard** | 1 - Service | Event dispatcher -- internal event bus | lib/ | Armature |
| **Wire** | 1 - Service | MCP server toolkit for inter-session communication | lib/ | Armature |
| **Assay** | 1 - Service | Unified search/indexing across all data providers | lib/ | Armature |
| **Ledger** | 1 - Provider | SQL database (DuckDB) | lib/ | Armature |
| **Journal** | 1 - Provider | Flat file markdown system | lib/ | Armature |
| **Armature** | 2 - Framework | Contracts, interfaces, hooks, plugin API, Claude Code integration | Services, Providers | SDK |
| **Circuit** | 3 - SDK | Module API (safe export of platform capabilities) | Armature | Modules |
| **Pulley** | 3 - SDK | External APIs (CLI, MCP endpoints) | Armature | External consumers |
| **Plugins** | 4 - Plugin | Extend/overwrite core domains, introduce new services/providers | SDK | Modules |
| **Modules** | 5 - Module | User-facing features (e.g., Reverie) | SDK + Plugins | Extensions, Users |
| **Extensions** | 6 - Extension | Compose on top of plugins + modules | Plugins, Modules | Runtime |

**Critical boundary rule:** No cross-imports within the same tier. Services do not import other services. Providers do not import other providers. Communication between same-tier components flows through the event bus (Switchboard) or through the Framework layer above them. This prevents circular dependencies and keeps each service independently testable.

### Data Flow

```
User Input (Claude Code)
    |
    v
[Claude Code Hooks] -- SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop
    |
    v
Pulley (CLI/MCP surface) -- routes external commands
    |
    v
Circuit (Module API) -- Reverie and other modules receive dispatched events
    |                         |
    |                         v
    |                   Wire (MCP Channels) -- inter-session communication
    |                         |
    |                         v
    |                   Secondary/Tertiary sessions (Reverie cognitive processing)
    |
    v
Armature (Framework) -- resolves services/providers by domain or name
    |
    +--------> Switchboard (event dispatch to services)
    |
    +--------> Commutator (I/O bus for system-level I/O)
    |
    +--------> Magnet (state reads/writes)
    |
    +--------> Assay (unified search across providers)
    |               |
    |               +--------> Ledger (DuckDB queries)
    |               +--------> Journal (markdown file reads)
    |
    +--------> Forge (git operations)
    +--------> Lathe (filesystem operations)
    +--------> Conductor (infrastructure management)
    +--------> Relay (install/update/sync)
```

**Data flow direction is strictly downward for requests and upward for responses.** Services never call modules. Providers never call services. The event bus (Switchboard) enables lateral communication by allowing services to emit events that the Framework routes -- but services themselves are ignorant of who listens.

### Wire and MCP Channels Architecture

Wire deserves special architectural attention because it is the backbone for Reverie's multi-session cognitive processing.

```
Primary Session (User-facing / Face)
    |
    | <-- Wire (MCP Channel) --> |
    |                            |
    v                            v
Secondary Session (Mind)    Tertiary Session (Subconscious)
    |                            |
    +-- Full Dynamo SDK access --+
    |                            |
    v                            v
Ledger, Journal, Magnet     Fragment Index, Association Engine
```

Claude Code Channels (shipped March 20, 2026 as research preview in v2.1.80) implements channels as MCP servers that push events into running sessions. A Wire channel is an MCP server that sits between sessions, enabling bidirectional communication. This architecture is validated by the Channels PoC.

**Key constraint:** Events only arrive while a session is open. For always-on cognitive processing (Reverie Mind/Subconscious sessions), sessions must run in a persistent background process.

## Patterns to Follow

### Pattern 1: Service Locator via Domain Aliases (Laravel-Inspired)

**What:** The Framework (Armature) provides two import paths for every service and provider:
1. **By name:** `Dynamo/Services/Assay/assay.cjs` -- direct import when you know the service
2. **By domain:** `Dynamo/Services/Data/search.cjs` -- alias that resolves to whatever service owns the "data search" domain

**When:** Always. This is how consumers access platform capabilities.

**Why this over pure DI:** In a CJS/Bun environment without a compilation step, traditional constructor injection is verbose and requires manual wiring. The domain alias pattern (proven by Laravel's facade system) gives clean ergonomics while maintaining decoupling. The alias layer is the seam where plugins can overwrite domain ownership -- a plugin that provides a better search engine registers against the "data search" domain, and all existing consumers automatically use it without code changes.

**Implementation approach:**
```javascript
// core/armature/registry.cjs
// The registry maps domain paths to concrete service/provider facades
const registry = {
  'Services/Data/search': () => require('../services/assay/facade.cjs'),
  'Services/Data/sql': () => require('../providers/ledger/facade.cjs'),
  'Providers/Data/sql': () => require('../providers/ledger/facade.cjs'),
  'Services/IO/bus': () => require('../services/commutator/facade.cjs'),
  // ...
};

// Lazy resolution -- services are not instantiated until first access
// Plugin API can overwrite entries before first resolution
function resolve(domainPath) {
  const factory = registry[domainPath];
  if (!factory) throw new Error(`No service registered for domain: ${domainPath}`);
  return factory();
}

module.exports = { resolve, register };
```

**Confidence:** HIGH -- This pattern is directly validated by Laravel (world's most popular framework ecosystem for this pattern class) and aligns with the canonical architecture document's description of import-by-domain.

### Pattern 2: Event Bus as Cross-Service Coordinator (Switchboard)

**What:** Switchboard implements the singleton event bus pattern. Services emit events; the Framework subscribes handlers. Services never know who listens. This is the mediator topology of event-driven architecture.

**When:** Any time one service's action should trigger behavior in another service or in modules above.

**Why not direct service-to-service calls:** Direct calls create coupling and violate the layer boundary rule. If Forge (git) needs to notify Magnet (state) that a branch changed, Forge emits `git:branch-changed` and Switchboard routes it. Forge never imports Magnet.

**Implementation approach:**
```javascript
// core/services/switchboard/switchboard.cjs
// Singleton event bus -- only one instance per Dynamo runtime
class Switchboard {
  #listeners = new Map();

  on(event, handler, priority = 0) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, []);
    this.#listeners.get(event).push({ handler, priority });
    this.#listeners.get(event).sort((a, b) => b.priority - a.priority);
  }

  emit(event, payload) {
    const handlers = this.#listeners.get(event) || [];
    for (const { handler } of handlers) {
      handler(payload);
    }
  }

  // Hook for plugin API -- plugins can register listeners at framework level
  register(pluginId, events) { /* ... */ }
}

// Singleton export
let instance;
module.exports = () => {
  if (!instance) instance = new Switchboard();
  return instance;
};
```

**Confidence:** HIGH -- Event bus singleton is the standard pattern for decoupled service communication in both game engines and framework platforms.

### Pattern 3: Facade per Service/Provider

**What:** Every service and provider exposes a facade -- a thin API surface that defines the contract between the component's internal logic and its consumers. The facade is the only thing imported by the Framework layer.

**When:** Always. No service or provider exposes internals directly.

**Why:** Facades are the seam where plugins intercept. When a plugin "extends Assay with S3 search," it modifies the Assay facade, not Assay's internals. The facade defines what is possible; the implementation behind it is swappable.

**Implementation approach:**
```javascript
// core/services/assay/facade.cjs
// The facade exposes the public contract
// Internal implementation can change without affecting consumers
const { search, index } = require('./internals/engine.cjs');
const { queryProvider } = require('./internals/routing.cjs');

module.exports = {
  queryAllProviders: (query, opts) => search(query, { ...opts, scope: 'all' }),
  queryProvider: (providerId, query, opts) => queryProvider(providerId, query, opts),
  index: (document, metadata) => index(document, metadata),
  // Plugin hook point -- plugins append methods here via Armature's plugin API
};
```

**Confidence:** HIGH -- Facade pattern is explicitly called out in the canonical architecture document and matches Laravel's facade implementation.

### Pattern 4: Options-Based Dependency Injection for Testing

**What:** Functions and constructors accept an options object where dependencies can be overridden. Production code uses defaults; test code injects mocks.

**When:** For all testable components. Validated in v0 with `node:test`.

**Why not a full DI container:** CJS with Bun does not benefit from a heavy DI container. Options-based injection gives the same test isolation with zero framework overhead. This was validated across 525 tests in v0.

**Implementation approach:**
```javascript
// Any service function
function processQuery(query, opts = {}) {
  const ledger = opts.ledger || require('../providers/ledger/facade.cjs');
  const journal = opts.journal || require('../providers/journal/facade.cjs');
  // ...
}

// In tests
const { processQuery } = require('./assay/facade.cjs');
const mockLedger = { query: () => [{ id: 1, name: 'test' }] };
processQuery('test', { ledger: mockLedger });
```

**Confidence:** HIGH -- Validated in v0 with 525 tests. Well-established pattern in the JS ecosystem.

### Pattern 5: Hook System for Claude Code Lifecycle Integration

**What:** Dynamo registers shell command hooks in Claude Code's `.claude/settings.json` that fire at lifecycle points. These hooks are the entry points for Dynamo to intercept and augment Claude Code behavior.

**When:** SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop -- and potentially all 12 Claude Code hook events.

**Architecture:**
```
Claude Code fires hook event
    |
    v
Shell command (registered in settings.json)
    |
    v
Hook dispatcher (cc/hooks/dynamo-hooks.cjs or equivalent)
    |
    v
Switchboard routes to registered handlers
    |
    v
Services/Modules process the event
    |
    v
Response returned via stdout (hookSpecificOutput) or exit code
```

**Key constraints from Claude Code hooks architecture:**
- Hooks are `type: "command"` (shell) or `type: "prompt"` (Claude model decision)
- SessionStart hooks inject context via `hookSpecificOutput.additionalContext` (as of v2.1.0)
- PreToolUse hooks can modify tool inputs (as of v2.0.10)
- PostToolUse hooks receive both `tool_input` and `tool_response`
- Hooks always exit 0 (never block Claude Code) -- errors are logged, not thrown

**Confidence:** HIGH -- Claude Code hooks are documented, and Dynamo v0 validated this pattern across 6 milestones.

### Pattern 6: Plugin Registration and Domain Overwrite

**What:** The Plugin API (defined in Armature) allows plugins to:
1. Extend an existing service facade with new methods
2. Overwrite a domain alias to point to a different implementation
3. Register entirely new services/providers under new domains

**When:** At Armature initialization, before any service is first resolved.

**Architecture:**
```
Plugin loads via config.json toggle
    |
    v
Plugin calls Armature's plugin API during registration phase
    |
    v
Armature updates the domain registry and/or facade method tables
    |
    v
All subsequent resolve() calls return the plugin-modified version
```

**Key constraint:** Plugins import from the SDK layer (Circuit), not from services directly. They declare what they extend/overwrite through the Plugin API, and Armature applies the modifications. This prevents plugins from bypassing the layered architecture.

**Confidence:** MEDIUM -- The pattern is well-established in plugin architectures (WordPress, PocketBase, VSCode extensions) but the specific CJS implementation for domain overwriting needs careful design to avoid hidden state mutation. The canonical architecture document describes this clearly, but implementation nuances will need phase-specific research.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Cross-Tier Imports

**What:** A service importing another service directly. A module importing a provider directly. Any import that skips a layer.

**Why bad:** Circular dependency risk. Untestable coupling. Breaks plugin extensibility (if Module X imports Ledger directly, a plugin that replaces Ledger's domain with a different provider does not affect Module X).

**Instead:** All access goes through the Framework layer (Armature). Services communicate via Switchboard events. Modules access services through Circuit (SDK).

### Anti-Pattern 2: God Service

**What:** One service accumulating too many responsibilities because "it's easier." Likely candidates: Commutator (I/O bus becoming a catch-all), Magnet (state store becoming a global dump), Assay (search becoming a query router for everything).

**Why bad:** Violates separation of concerns. Makes testing exponentially harder. The v0 monolith grew organically into this exact problem.

**Instead:** Each service has a single domain. When a new responsibility emerges, evaluate whether it belongs to an existing service's domain or warrants a new service. Prefer new services over expanding existing ones.

### Anti-Pattern 3: Leaky Facade

**What:** A facade that exposes implementation details -- returning DuckDB result objects directly, exposing file paths from Journal's internal storage layout, leaking Switchboard's event Map structure.

**Why bad:** Consumers couple to the implementation behind the facade. Swapping implementations (which plugins need to do) becomes a breaking change.

**Instead:** Facades return plain objects/arrays with documented shapes. Providers never return database-specific types. Services never return internal data structures.

### Anti-Pattern 4: Eager Initialization

**What:** All services and providers instantiating at startup, even those not needed for the current operation.

**Why bad:** Slow startup. Unnecessary resource consumption. DuckDB initialization, for example, involves native bindings -- expensive if you're only running a git operation.

**Instead:** Lazy resolution (the registry pattern uses factory functions, not pre-built instances). Services initialize on first access. The registry caches after first resolution.

### Anti-Pattern 5: Hook Handler Doing Business Logic

**What:** Claude Code hook handlers (in the dispatcher) containing complex logic instead of routing to the appropriate service.

**Why bad:** Hook handlers cannot be unit tested in isolation from Claude Code. They have strict execution constraints (timeout, exit behavior). Business logic in hooks becomes untestable.

**Instead:** Hook handlers are thin routers. They parse the hook input, emit a Switchboard event or call a Circuit API method, and return the result. All logic lives in services/modules.

## Scalability Considerations

| Concern | MVP (1 Module) | Growth (5+ Plugins, 3+ Modules) | Ecosystem (Community Additions) |
|---------|----------------|----------------------------------|-------------------------------|
| **Service Resolution** | Direct require, lazy singleton | Registry with plugin overrides, cached | Registry with conflict resolution, priority ordering |
| **Event Volume** | Switchboard handles <100 events/session | Priority-ordered handlers, debouncing | Namespace events by plugin/module origin |
| **State Management** | Magnet as simple key-value | Magnet with scoped namespaces per module | Magnet with access control, module isolation |
| **Provider Growth** | Ledger + Journal | Plugin providers registered via Armature | Provider discovery, health checks, fallback chains |
| **Wire Sessions** | 3 sessions (Primary/Mind/Subconscious) | Multiple module-owned sessions | Session pool management, resource limits |
| **Hook Overhead** | 5-6 hook handlers | Many handlers per hook event | Priority chain, handler timeout enforcement |

## Build Order: Dependency Graph and Bootstrap Sequence

The canonical build order is a valid topological sort of the dependency graph. Here is the detailed breakdown with rationale for each phase:

### Phase 1: Core Library (lib/)
**Dependencies:** None
**Produces:** Shared patterns, types, error classes, utility functions, constants
**Rationale:** Pure foundation. Everything else imports from here. Must be complete and stable before anything builds on it.
**Validation gate:** 100% unit test coverage. Zero external dependencies.

### Phase 2: Core Services + Core Providers (parallel)
**Dependencies:** lib/ only
**Produces:** 9 services (Commutator, Magnet, Conductor, Forge, Lathe, Relay, Switchboard, Wire, Assay) + 2 providers (Ledger, Journal)
**Rationale:** Services and providers are peers at the same tier. Neither depends on the other. Building in parallel is correct and efficient.

**Within this phase, there is an internal ordering preference:**
1. **Switchboard first** -- other services may want to emit events during their own initialization
2. **Commutator and Magnet early** -- I/O bus and state are foundational for other services
3. **Lathe before Forge** -- git ops depend on filesystem ops
4. **Ledger and Journal in parallel with services** -- providers have no service dependencies
5. **Assay last among services** -- it queries across providers, so providers should exist first (though at this layer Assay only imports lib/, the logical dependency matters for integration testing)
6. **Wire last** -- depends on MCP patterns that may require Conductor for server lifecycle

### Phase 3: Framework / Armature
**Dependencies:** All services and providers
**Produces:** Domain registry, facade resolution, plugin API contracts, hook definitions, Claude Code integration layer
**Rationale:** The Framework is the composition layer. It cannot exist until all the things it composes exist. This is where domain aliases are defined, plugin extension points are declared, and the service/provider API surface solidifies.

### Phase 4: SDK (Circuit + Pulley)
**Dependencies:** Armature
**Produces:** Module API (Circuit), external API surface (Pulley -- CLI, MCP endpoints)
**Rationale:** The SDK wraps the Framework for safe consumption by modules and external users. Circuit determines what modules can and cannot access. Pulley determines how the outside world interacts with Dynamo.

### Phase 5: Plugins (if any ship with v1)
**Dependencies:** SDK
**Note:** The Plugin API ships in v1 (defined in Armature), but actual plugin implementations are separate repos. No plugins are in scope for the initial platform build.

### Phase 6: Modules (Reverie)
**Dependencies:** SDK + any required plugins
**Produces:** The first user-facing functionality
**Rationale:** Dynamo is inert without a module. Reverie is the proof that the platform works.

## Validation of Canonical Architecture Against Industry Patterns

| Canonical Decision | Industry Precedent | Assessment |
|-------------------|--------------------|------------|
| Strict unidirectional layer dependencies | Game engines (Unreal, Godot), Laravel, Spring Boot | **Validated.** Universal pattern for platform-class software. |
| Services do, Providers supply/receive | Laravel's Service/Provider distinction, DDD's Application/Infrastructure split | **Validated.** Clean separation matches industry consensus. Services contain logic; providers supply data and accept writes. |
| Facade per component | Laravel facades, game engine Service Locator pattern | **Validated.** Industry standard for decoupling API surface from implementation. |
| Domain-based import aliasing | Laravel facade aliases, Spring's qualifier annotations, DDD bounded contexts | **Validated.** Elegant approach. Less common in the JS ecosystem specifically, but well-proven in platform frameworks. CJS implementation is straightforward via a registry. |
| Plugin API that can overwrite core domains | WordPress hooks/filters, VSCode extension API, PocketBase hooks | **Validated.** Standard extensibility pattern. Key nuance: registration timing matters -- plugins must register before first service resolution. |
| Event bus for cross-service communication | Game engine event systems, Redux, RxJS | **Validated.** The mediator topology (Switchboard as central dispatcher) is the correct choice over broker topology when services need orchestration. |
| Git submodules for plugins/modules/extensions | Common in game engine ecosystems (Godot plugins, Unreal marketplace content) | **Validated with caveat.** Git submodules are well-suited for decoupled repos, but they have UX friction (submodule sync, update, init). Relay service should abstract this completely. |
| MCP for inter-session communication (Wire) | Claude Code Channels (shipped March 2026), MCP architecture spec | **Validated.** MCP's JSON-RPC 2.0 over stdio is the correct transport for local inter-session communication. Channels is the first-party feature that makes this possible. |
| No LLM API below SDK scope | Unique to Dynamo's constraint set | **Novel but sound.** This forces the platform to be pure infrastructure. LLM capabilities come through Claude Code sessions (via Wire), not through API calls. This is a significant architectural differentiator. |
| Options-based DI over container | Common in lightweight JS frameworks, validated in Dynamo v0 | **Validated.** Right choice for CJS + Bun. A full DI container adds complexity without proportional benefit in this runtime environment. |

## Open Architectural Questions

1. **Switchboard event namespacing:** How are events namespaced as the ecosystem grows? Recommend `{origin}:{domain}:{action}` format (e.g., `forge:git:branch-changed`, `plugin-terminus:pipeline:completed`).

2. **Plugin registration timing:** The registry must support a registration phase (plugins modify domain mappings) followed by a resolution phase (services are instantiated). A "freeze" mechanism after first resolution prevents mid-runtime domain changes that could cause inconsistency.

3. **Wire session lifecycle:** Who manages the lifecycle of secondary/tertiary sessions? Conductor should own MCP server lifecycle, but the Module (Reverie) defines what sessions it needs. The interaction between Circuit's session request API and Conductor's lifecycle management needs careful contract design.

4. **Magnet state isolation:** When multiple modules share Magnet, how is state isolated? Recommend scoped namespaces with module ownership (a module cannot read or write another module's state unless explicitly shared through Circuit's API).

5. **Error propagation across layers:** The canonical docs specify hooks always exit 0. What about errors within the service layer? Recommend a consistent error envelope pattern in lib/ that all facades use, with Switchboard emitting `system:error` events for cross-cutting error handling.

## Sources

- [Layered Architecture (Baeldung)](https://www.baeldung.com/cs/layered-architecture)
- [Software Architecture Patterns 2026 (SayOne)](https://www.sayonetech.com/blog/software-architecture-patterns/)
- [Game Engine Architecture: Systems Design 2025](https://generalistprogrammer.com/game-engine-architecture)
- [Component Pattern (Game Programming Patterns)](https://gameprogrammingpatterns.com/component.html)
- [Service Locator (Game Programming Patterns)](https://gameprogrammingpatterns.com/service-locator.html)
- [Service Provider Pattern for Games (DigitalRune)](https://digitalrune.github.io/DigitalRune-Documentation/html/619b1341-c6a1-4c59-b33d-cc1f799402dc.htm)
- [Laravel Service Container (v12.x)](https://laravel.com/docs/12.x/container)
- [Laravel Facades (v12.x)](https://laravel.com/docs/12.x/facades)
- [Inversion of Control (Martin Fowler)](https://martinfowler.com/bliki/InversionOfControl.html)
- [Service Locator is an Anti-Pattern (Mark Seemann)](https://blog.ploeh.dk/2010/02/03/ServiceLocatorisanAnti-Pattern/)
- [MCP Architecture Overview](https://modelcontextprotocol.io/docs/learn/architecture)
- [MCP Architecture Patterns for Multi-Agent AI (IBM)](https://developer.ibm.com/articles/mcp-architecture-patterns-ai-systems/)
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks)
- [Claude Code Channels](https://code.claude.com/docs/en/channels)
- [EventBus Pattern in JS (Galperin)](https://yaron-galperin.medium.com/eventbus-pattern-event-driven-communication-in-js-2f29c3875982)
- [Event-Based Architectures in JavaScript (freeCodeCamp)](https://www.freecodecamp.org/news/event-based-architectures-in-javascript-a-handbook-for-devs/)
- [DuckDB Node.js API](https://duckdb.org/docs/stable/clients/nodejs/overview)
- [Fast DuckDB Bindings for Bun (@evan/duckdb)](https://github.com/evanwashere/duckdb)
- [Plugin Architecture Design Pattern (DevLeader)](https://devleader.substack.com/p/plugin-architecture-design-pattern)
- [Plug-in Architecture (OmarElgabry)](https://medium.com/omarelgabrys-blog/plug-in-architecture-dec207291800)
- [Introduction to the Dependency Graph (Tweag)](https://www.tweag.io/blog/2025-09-04-introduction-to-dependency-graph/)
