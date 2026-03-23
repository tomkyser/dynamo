# Feature Landscape

**Domain:** Self-contained development platform for Claude Code (analogous to game engine / Laravel-style framework)
**Researched:** 2026-03-22
**Overall confidence:** HIGH

---

## Table Stakes

Features users (module/plugin developers building on Dynamo) expect. Missing = platform feels incomplete or unusable.

### Service Container and Dependency Resolution

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Service registration (bind/singleton) | Every platform framework provides a way to register services and resolve them. Without this, there is no IoC. Laravel's container, NestJS's module providers, game engine service locators -- all implement this. | Medium | Core to Armature. Must support bind (new instance each resolve), singleton (shared instance), and factory (deferred construction). CJS equivalent of interfaces via facade contracts. |
| Automatic dependency resolution | Developers expect to declare what they need, not manually wire dependency chains. Laravel auto-resolves via reflection; NestJS via decorators. Dynamo must resolve service/provider dependency trees without manual orchestration. | Medium | Without decorators or reflection (CJS), use constructor options pattern validated in v0. The container reads declared dependencies from a manifest or registration call, resolves the graph, and injects via options object. |
| Contextual binding | Different consumers sometimes need different implementations of the same contract. Laravel supports contextual binding (when X needs Y, give it Z). Essential for plugin override scenarios where a plugin replaces a core provider for specific consumers. | Low | Implement as override map keyed by consumer identity. Plugins use this to swap provider implementations without affecting unrelated consumers. |
| Scoped resolution (request/session/global) | Services must have defined lifetimes. A state object for a single CLI invocation differs from a singleton service that persists across the platform lifecycle. NestJS has request-scoped, transient, and default (singleton) scopes. | Medium | Three scopes: global (platform lifetime), session (single Claude Code session), transient (new each resolution). Magnet (state service) is global; per-session state objects are session-scoped. |
| Deferred/lazy loading | Not every service should initialize at boot. VSCode activates extensions lazily on specific events. Laravel supports deferred providers. Dynamo should not load Assay's search indexes if no one queries them. | Low | Providers declare what they provide; container defers instantiation until first resolution request. Critical for startup performance -- modules like Reverie are heavy and should not block boot if not yet needed. |

### Event and Hook System

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Lifecycle hooks (register/boot two-phase) | Laravel's register-then-boot pattern is the gold standard: register phase binds into container (no cross-service calls), boot phase initializes (all services available). Without this, circular dependencies and initialization order bugs are inevitable. | Medium | Armature must enforce two-phase initialization. Register phase: services/providers declare bindings. Boot phase: services can use other services. Switchboard dispatches `platform.registering`, `platform.registered`, `platform.booting`, `platform.booted` events. |
| Event bus (pub/sub) | WordPress hooks, Godot signals, game engine event queues, NestJS event emitters -- every extensible platform has pub/sub. Decouples producers from consumers. Switchboard's entire purpose. | Medium | Switchboard implements typed event channels. Events are fire-and-forget (actions) or interceptable (filters). Actions notify; filters allow mutation of data passing through. This is the WordPress actions/filters distinction, which is the most proven extensibility model in software history. |
| Claude Code hook integration | Dynamo exists inside Claude Code. The host provides lifecycle hooks (PreToolUse, PostToolUse, UserPromptSubmit, Stop, Notification, etc.). Dynamo must bridge these into its own event system so modules and plugins react to Claude Code lifecycle events seamlessly. | High | Commutator (I/O bus) receives raw Claude Code hook payloads and translates them into Switchboard events. This is the primary integration surface -- get this wrong and Dynamo is an island disconnected from its host. Must handle all current hook types and be extensible for new ones. |
| Synchronous and asynchronous event handling | Some events need immediate response (filter hooks that must return modified data). Others are fire-and-forget notifications. Both patterns must coexist. | Medium | Switchboard supports sync handlers (filters -- must return value) and async handlers (actions -- fire and forget). Priority ordering for both. Handler registration specifies sync/async intent. |
| Event priority and ordering | Plugins and modules must control when their handlers fire relative to others. WordPress uses numeric priority; NestJS uses execution order. Without ordering, behavior is non-deterministic. | Low | Numeric priority (lower = earlier). Default priority 10. Core handlers register at 1-5; plugins at 10-20; modules at 20+. Convention, not enforcement -- but documented clearly. |

### Plugin and Extension API

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Plugin manifest and registration | Every plugin system needs a declaration of what the plugin is, what it provides, and what it requires. VSCode uses package.json; WordPress uses header comments; NestJS uses @Module decorators. | Low | Plugin manifest in plugin's root (plugin.json): name, version, provides (services/providers), requires (dependencies), hooks (what it intercepts). Armature reads manifests at registration time. |
| Domain extension (add new capabilities to existing services) | The architecture explicitly requires plugins to extend Assay with new query types (queryS3), extend Ledger with new storage backends, etc. This is the "extend existing" path. | High | Armature exposes extension points on core services. A plugin registers additional methods/capabilities against a service facade. The facade dynamically delegates to plugin-provided implementations. This is the most architecturally complex table-stakes feature -- facade must support runtime extension without becoming a God object. |
| Domain introduction (register entirely new service/provider domains) | Plugins should be able to introduce capabilities that do not exist in core. A Conduit plugin introduces external connectors -- a domain that core does not define. | Medium | Plugin registers new service/provider with the container under its own domain namespace. Framework makes it importable via the same path pattern: `Dynamo/Services/Conduit/connectors.cjs` or `Dynamo/Plugins/Conduit/conduit.cjs`. |
| Plugin dependency checking | If Plugin A requires Plugin B, the platform must verify Plugin B is present and compatible before loading Plugin A. Without this, cryptic runtime failures. | Low | Resolve plugin dependency graph at registration. Fail fast with clear error if dependency missing or version incompatible. Relay service handles this during install; Armature handles this at boot. |
| Plugin enable/disable toggle | Users must be able to disable a plugin without uninstalling it. Global config.json toggle per plugin. Platform skips registration for disabled plugins. | Low | config.json `plugins.{name}.enabled: true/false`. Relay reads config; Armature skips disabled plugins. No code changes required to toggle. |

### Configuration Management

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Hierarchical configuration with precedence | Claude Code itself uses 4-tier config hierarchy (enterprise > organization > project > user). Dynamo must follow suit: platform defaults < user config < project config < runtime overrides. | Medium | Config resolution: built-in defaults (hardcoded nothing -- but sane defaults in a defaults.json) < global config.json < project .dynamo/config.json < environment variables < runtime API overrides. Lathe (filesystem) reads; Magnet (state) holds resolved config. |
| Configuration validation | Invalid config should fail fast at boot, not cause cryptic runtime errors. Every serious framework validates config against a schema. | Low | JSON Schema for config.json. Validated at boot by Armature. Clear error messages pointing to exact invalid field. Schema versioned alongside platform. |
| Hot-reloadable configuration (select fields) | Some config changes should not require platform restart. Plugin enable/disable, log levels, debug flags. Not all config -- service bindings and infrastructure settings require restart. | Low | Magnet watches config file for changes. Switchboard emits `config.changed` event with changed keys. Services/plugins that registered for hot-reload on specific keys receive updates. Most config remains cold (boot-only). |

### CLI Framework

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Command routing with subcommands | `dynamo search`, `dynamo session list`, `dynamo status` -- hierarchical command structure. Every CLI framework (Commander.js, oclif, Bun native) supports this. Pulley's CLI surface must route cleanly. | Medium | Pulley implements a command registry. Commands register via manifest (command name, handler, args schema, help text). Supports nested subcommands (`dynamo session list`). Bun's native arg parsing handles flags; Pulley handles routing. Zero npm dependencies -- Bun built-ins only. |
| Automatic help generation | `-h` / `--help` must work on every command and subcommand. Users expect this. Hand-writing help text that drifts from actual behavior is a maintenance nightmare. | Low | Generated from command manifests. Each command declares its args, flags, and description. Help formatter renders consistently. |
| Structured output (human-readable + JSON + raw) | Dynamo v0 validated this: human output to stderr, structured JSON/raw to stdout. Essential for both human usage and programmatic consumption (hooks, scripts, other tools). | Low | Output formatter takes result object, renders to requested format. `--format json` for structured, `--format raw` for full data, default for human-readable. Already proven in v0. |
| Error reporting with actionable guidance | When something fails, tell the user what went wrong AND what to do about it. Not stack traces -- diagnosis and next steps. v0 validated this pattern with health-check and diagnose commands. | Medium | Error objects carry: what failed, why (diagnosis), what to do (remediation steps), severity level. CLI renderer formats these consistently. Commutator standardizes error shape across all services. |

### Module Lifecycle Management

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Install/uninstall via git submodule | Modules are separate repos managed as git submodules. Installing a module = adding submodule + registering in config. Forge (git service) handles submodule operations. | Medium | Relay orchestrates: Forge adds submodule, Lathe verifies file structure, config.json updated with module entry, Armature validates manifest, Switchboard emits `module.installed`. Reverse for uninstall. |
| Enable/disable toggle | Same as plugins -- config.json toggle without removing files. | Low | config.json `modules.{name}.enabled: true/false`. |
| Update mechanism | Modules must be updatable. Forge pulls latest for submodule; Relay runs any migration scripts; version compatibility checked against SDK version. | Medium | Relay orchestrates: Forge pulls submodule update, version compatibility check against Circuit SDK version, migration scripts run if present, health verification, auto-rollback on failure. Pattern validated in v0's update command. |
| Dependency verification | A module declares which plugins and SDK version it requires. Platform verifies before loading. Reverie needs Wire, Magnet, Journal, Ledger -- all must be present and compatible. | Low | Module manifest declares `requires.sdk`, `requires.plugins`, `requires.services`. Circuit (SDK) validates at module load time. |

### Data Provider Contracts

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Uniform provider interface (read/write/query) | Ledger (SQL) and Journal (Markdown) have fundamentally different storage semantics, but consumers should not care which provider backs their data. Facade contracts normalize the API. | High | Armature defines provider contracts: `read(id)`, `write(id, data)`, `query(criteria)`, `delete(id)`. Each provider implements the contract for its domain. Collections map between provider-native data and contract-standard shapes. This is the hardest table-stakes feature because SQL and markdown have very different query semantics -- the contract must be useful without being lowest-common-denominator. |
| Provider metadata in query results | When Assay queries across providers, results must identify which provider they came from so subsequent operations (update, delete) route to the correct backend. Architecture plan explicitly requires this. | Low | Query results include `_provider: "ledger"` or `_provider: "journal"` metadata. Assay passes this through transparently. Consumer code uses metadata to route follow-up operations. |

### Self-Management

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Health check and diagnostics | v0 validated 8-stage health check and 13-stage diagnostics. Platform must verify its own operational state. Infrastructure dependencies (Docker for Conductor), data integrity, service availability. | Medium | Conductor runs infrastructure checks; each service reports its health via a standard `healthCheck()` method on its facade. Aggregated by a diagnostic runner. Human-readable output with PASS/FAIL/SKIP per stage. |
| Self-install and self-update | Relay must handle deploying Dynamo to the correct location, managing config, and updating to new versions. v0 validated install/update/sync/rollback cycle. | Medium | Relay orchestrates the full lifecycle: backup current, deploy new, run migrations, verify health, rollback on failure. Git-based distribution via Forge. |
| Version management | Semver with GitHub Releases API. Master (release), dev (testing), feature branches. Platform knows its own version and can check for updates. | Low | Version stored in config or package manifest. Relay checks GitHub Releases API for newer versions. Version comparison is semver-aware. |

---

## Differentiators

Features that set Dynamo apart. Not expected in a generic platform framework, but uniquely valuable for a Claude Code development platform.

### Claude Code Native Integration

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Wire: Multi-session orchestration via Channels | No other Claude Code platform enables multiple Claude Code sessions to communicate and coordinate. Wire wraps the Channels feature (MCP server bridge, polling service, bidirectional messaging) into a service that modules consume. Reverie's three-session architecture (Primary/Secondary/Tertiary) depends entirely on this. This is the single most differentiating capability. | High | Wire manages MCP server instances that bridge Claude Code sessions. Must handle session discovery, message routing, connection lifecycle, reconnection, and message serialization. Validated in PoC (`cc-channels-poc`). Production version must be robust -- Channels is research preview as of March 2026, so Wire must gracefully degrade when Channels is unavailable. |
| Cognitive module support (Reverie archetype) | Dynamo is not just a plugin system -- it is a platform for building cognitive systems within Claude Code. The architecture explicitly supports modules that maintain persistent identity, process experience through a Self Model, and run parallel processing sessions. No other framework in this space even attempts this. | High | Circuit (SDK) must expose primitives that Reverie needs: state persistence across sessions (via Magnet + providers), fragment-based memory operations (via Journal), structured data queries (via Ledger), event-driven processing (via Switchboard), multi-session communication (via Wire). The SDK surface is shaped by its first consumer. |
| Hook-to-event bridge with semantic routing | Beyond simple Claude Code hook forwarding, Dynamo can route hook events based on semantic content. A PostToolUse event for a Write operation could be routed differently than one for a Read operation. Modules declare interest in specific tool types, not raw hook categories. | Medium | Commutator parses hook payloads and enriches events with semantic metadata before forwarding to Switchboard. Modules subscribe to `tool.write.completed` rather than raw `PostToolUse` events. Reduces noise for modules and enables precise behavioral targeting. |

### Unified Search Across Heterogeneous Providers

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Assay: Federated query engine | One query, results from SQL (Ledger), markdown files (Journal), and any plugin-provided data source. Federated search is an enterprise pattern rarely seen in developer tooling. For Reverie, this means querying fragments across both structured (Ledger indexes) and narrative (Journal files) storage in a single call. | High | Assay implements search-time merging (simpler than maintaining a unified index, more flexible for heterogeneous sources). Each provider implements a `search(criteria)` method. Assay fans out, collects, ranks, and merges. Provider metadata in results enables follow-up operations against the correct backend. Tika integration for content extraction from non-text formats is a future extension point. |
| Cross-provider query with provider-specific optimization | Rather than lowest-common-denominator queries, Assay should allow expressing queries that leverage provider strengths. SQL queries against Ledger can use full DuckDB analytical SQL. Markdown queries against Journal can use fuzzy text matching. Assay translates a unified query intent into provider-native queries. | High | Query language is a superset: basic criteria work everywhere, provider-specific extensions are passed through when targeting a specific provider. When querying all providers, Assay translates to each provider's native strength. This is where the "abstraction over lateralization" principle is most tested. |

### Event-Driven Architecture for AI Agent Workflows

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Actions and filters (WordPress-style two-type hooks) | Actions notify (fire-and-forget). Filters transform (interceptable data pipeline). Most event systems only have one type. WordPress proved that having both enables an ecosystem where plugins can both observe and modify platform behavior. For an AI agent platform, filters are critical -- a plugin can modify prompt content, adjust memory retrieval results, or transform state before a module processes it. | Medium | Switchboard implements both: `doAction('event.name', context)` and `applyFilters('filter.name', value, context)`. Filters chain -- each handler receives the previous handler's output. Actions run in priority order but return nothing. This pattern is proven at scale (WordPress powers 40%+ of the web with this exact model). |
| Deterministic event routing (no LLM for dispatch) | v0 validated that routing decisions must be deterministic, not LLM-inferred. Events route based on type, priority, and registered handlers -- not on an LLM deciding where something should go. This is a design principle, not just a feature, but it manifests as a concrete architectural constraint. | Low | Switchboard uses handler registration maps, not inference. When an event fires, its handlers are known at registration time. Zero ambiguity, zero latency from LLM calls, zero hallucination risk in the routing layer. |

### State Management with Persistence

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Magnet: Centralized state with provider-backed persistence | State that survives Claude Code session boundaries. Not just in-memory state (gone when session ends) but state that persists to Journal/Ledger and reconstitutes on next session start. Essential for Reverie's Self Model, which must persist and evolve across sessions. | High | Magnet holds in-memory state tree. On state change, Switchboard emits `state.changed` events. Persistence layer subscribes and writes to appropriate provider. On boot, Magnet hydrates from providers. Conflict resolution for concurrent session access (if multiple Claude Code sessions run simultaneously via Wire). |
| Session-aware state scoping | Different state for different sessions. A Primary session's state differs from a Secondary session's. Magnet must scope state by session identity while maintaining global state accessible to all. | Medium | State tree has namespaces: `global.*` (shared), `session.{id}.*` (per-session), `module.{name}.*` (per-module). Resolution rules: module state > session state > global state. Wire coordinates cross-session state synchronization when needed. |

### Platform-Aware Git Operations

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Forge: Git operations as a first-class service | Git is not an external tool -- it is a core service. Submodule management for plugins/modules/extensions, branch-aware operations (master/dev/feature channels), repo-to-deploy sync. No other Claude Code framework treats git as a platform service. | Medium | Forge wraps git operations in service methods: `addSubmodule()`, `pullSubmodule()`, `syncToDeployment()`, `getCurrentChannel()`, `switchChannel()`. Used by Relay for install/update operations. Lathe handles filesystem; Forge handles repository. Clear boundary. |

---

## Anti-Features

Features to explicitly NOT build. These would violate architecture principles, add unnecessary complexity, or solve problems that do not exist for this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| LLM API integration below SDK scope | Architecture principle: "No SDK scope or lower aspect shall require an LLM API endpoint or integration." Dynamo is built on what Claude Code Max subscription provides natively. Adding API key management, model selection, token counting at the platform level would fuse Dynamo to specific LLM providers and subscription tiers. | Modules (above SDK) can use LLM capabilities via Claude Code sessions orchestrated through Wire. The LLM is the host environment, not a dependency. |
| Web/REST/WebSocket server in v1 | Pulley defines contracts for external APIs including web, but implementing a web server in v1 adds massive surface area (routing, middleware, authentication, CORS, etc.) for zero immediate value. No module needs HTTP serving in v1. | Define contracts in Armature. Stub in Pulley. Implement when a module actually needs it. "Hardcode nothing" includes not hardcoding the absence of web APIs -- the slot exists, it is just empty. |
| Extension layer (Apex) in v1 | Extensions compose plugins + modules. Building this before modules exist means designing composition patterns in a vacuum. Ship modules first, observe composition needs, then build Apex. | Architectural slot exists in file structure and conceptual model. No code until at least one module ships and real composition needs emerge. |
| Decorator-based DI (NestJS/tsyringe style) | CJS does not support decorators natively. Transpilation adds build step complexity. Bun's CJS mode does not process TypeScript decorators in CJS files. Forcing decorator patterns would fight the runtime. | Options-based injection pattern validated in v0. Constructor receives options object with dependencies. Explicit, testable, zero magic. `function createService({ magnet, switchboard, lathe } = {})`. |
| npm dependency tree | Architecture constraint: "No npm dependencies." Platform core uses only Bun/Node built-ins. Adding npm packages means managing a dependency tree, security audits, version conflicts, and lockfile maintenance for a platform that should be self-contained. | Bun built-ins cover: filesystem, subprocess, HTTP client, test runner, SQLite. DuckDB is the one external binary but is embedded, not an npm package. If a capability is needed, build it or vendor it. |
| Global mutable singleton pattern | Service locator via global mutable state (the "big bag of services" anti-pattern). Seems convenient, destroys testability, makes dependency tracking impossible, and creates hidden coupling. | IoC container with explicit resolution. Services declare dependencies; container provides them. Testing supplies mocks via the same options pattern. No global state outside Magnet's managed state tree. |
| Plugin-to-plugin direct imports | If plugins can import each other directly, you get an unmanaged dependency web. A plugin change can cascade through unknown consumers. | Plugins interact through Armature contracts and Switchboard events. If Plugin A needs Plugin B's capability, it goes through the service facade or event bus. Never direct file imports between plugin directories. |
| Automatic LLM-based error recovery | Self-healing via LLM inference sounds appealing but violates deterministic routing. If the platform can "decide" to do something based on LLM output, behavior becomes non-reproducible. | Deterministic recovery patterns: retry with backoff, rollback to known state, fail with actionable error. Health checks detect problems; documented remediation resolves them. Diagnosis, not divination. |
| Multi-tenant / multi-user architecture | Dynamo serves one developer on one machine. There is no multi-user scenario. Building user isolation, permissions, authentication adds complexity for a use case that does not exist. | Single-user assumption baked into design. Config is local files. State is local storage. No auth layer needed. If multi-user ever matters, it is an extension-layer concern, not platform core. |

---

## Feature Dependencies

```
Core Library (lib/)
  |
  +---> Core Services (parallel, each depends on lib/)
  |       |-- Commutator (I/O bus) -- no service deps
  |       |-- Magnet (state) -- no service deps
  |       |-- Lathe (filesystem) -- no service deps
  |       |-- Switchboard (events) -- no service deps
  |       |-- Forge (git) -- depends on Lathe
  |       |-- Relay (operations) -- depends on Forge, Lathe, Switchboard
  |       |-- Conductor (infrastructure) -- depends on Lathe
  |       |-- Wire (communication) -- depends on Switchboard, Commutator, Conductor
  |       |-- Assay (search) -- depends on Switchboard
  |
  +---> Core Providers (parallel, each depends on lib/)
  |       |-- Ledger (SQL/DuckDB) -- no service deps
  |       |-- Journal (Markdown) -- depends on Lathe
  |
  +---> Framework / Armature (depends on all services + providers)
  |       |-- Service container and DI
  |       |-- Provider contracts and facades
  |       |-- Hook definitions
  |       |-- Plugin API
  |       |-- Claude Code integration layer
  |       |-- Configuration management
  |
  +---> SDK / Circuit + Pulley (depends on Armature)
  |       |-- Circuit: Module API (safe exports of framework + core)
  |       |-- Pulley: CLI + MCP endpoints (user-facing surface)
  |
  +---> Plugins (depend on SDK)
  |       |-- Conduit (connectors)
  |       |-- Terminus (ingestion)
  |       |-- Library (graph RAG)
  |       |-- Vault (storage)
  |
  +---> Modules (depend on SDK + Plugins)
  |       |-- Reverie (cognitive memory system)
  |
  +---> Extensions (depend on Plugins + Modules)
          |-- Apex (extension API -- deferred)
```

### Critical Path Dependencies

```
Switchboard (events) --> Commutator (I/O bridge) --> Claude Code hooks integration
  (Events must exist before I/O bridge can translate hooks into events)

Magnet (state) --> Provider persistence layer --> Session survival
  (State management must exist before providers can back it)

Lathe (filesystem) --> Journal (markdown provider)
  (Filesystem ops required before markdown files can be managed)

Armature (framework) --> Plugin API --> Plugin domain extension
  (Framework contracts must be defined before plugins can extend them)

Wire (communication) --> Channels integration --> Multi-session orchestration
  (Wire must wrap Channels before Reverie can use three-session architecture)

Assay (search) --> Provider search interfaces --> Federated queries
  (Search service needs providers to implement search contracts)
```

---

## MVP Recommendation

### Phase 1: Foundation (must ship first)

Prioritize in this order:

1. **Core Library** -- shared utilities, error types, contract patterns, path resolution
2. **Switchboard** (events) -- the nervous system everything else plugs into
3. **Commutator** (I/O) -- bridges Claude Code hooks into Switchboard events
4. **Magnet** (state) -- centralized state tree with change events
5. **Lathe** (filesystem) -- thin facade over Bun fs APIs

Rationale: These five are the minimal substrate that everything else builds on. No circular dependencies between them. Each is independently testable. Together they enable: events, I/O, state, and file operations.

### Phase 2: Data and Infrastructure

6. **Ledger** (DuckDB provider) -- structured data storage
7. **Journal** (Markdown provider) -- narrative data storage
8. **Conductor** (infrastructure) -- Docker/dependency management
9. **Forge** (git) -- repository and submodule operations

Rationale: Providers need Lathe (Phase 1). Forge needs Lathe. Conductor needs Lathe. These can proceed in parallel once Phase 1 completes.

### Phase 3: Framework and Platform

10. **Armature** -- service container, provider contracts, plugin API, hook definitions, config management
11. **Relay** -- install/update/sync orchestration (needs Forge + Lathe + Switchboard)

Rationale: Armature is where everything comes together. It cannot be built until the things it wraps exist. Relay orchestrates platform operations and needs the framework's patterns.

### Phase 4: SDK and Surface

12. **Circuit** -- Module API (safe SDK exports)
13. **Pulley** -- CLI + MCP endpoints

Rationale: The SDK wraps the framework for module consumption. Cannot exist before the framework.

### Phase 5: Search and Communication

14. **Assay** -- federated search across providers (needs providers + Switchboard)
15. **Wire** -- multi-session communication via Channels (needs Switchboard + Commutator + Conductor)

Rationale: These are the most complex services and depend on nearly everything else. They are also the most differentiating. Building them last means they can leverage all platform capabilities and patterns established in earlier phases.

### Defer to Milestone 2 (Reverie)

- Reverie module (consumes the platform)
- All plugins (Conduit, Terminus, Library, Vault)
- Extension layer (Apex)
- Web/REST/WebSocket API implementation

---

## Sources

### Service Container / IoC
- [Laravel Service Container](https://laravel.com/docs/12.x/container) -- HIGH confidence
- [Laravel Service Providers](https://laravel.com/docs/12.x/providers) -- HIGH confidence
- [InversifyJS](https://inversify.io/) -- MEDIUM confidence
- [NestJS Module System](https://docs.nestjs.com/guards) -- HIGH confidence
- [Service Locator Pattern (Game Programming Patterns)](https://gameprogrammingpatterns.com/service-locator.html) -- HIGH confidence

### Event Systems
- [WordPress Hooks API](https://developer.wordpress.org/plugins/hooks/) -- HIGH confidence
- [Godot Event Bus Pattern](https://www.gdquest.com/tutorial/godot/design-patterns/event-bus-singleton/) -- MEDIUM confidence
- [Event Queue Pattern (Game Programming Patterns)](https://gameprogrammingpatterns.com/event-queue.html) -- HIGH confidence
- [Observer Pattern (Game Programming Patterns)](https://gameprogrammingpatterns.com/observer.html) -- HIGH confidence

### Plugin Architecture
- [VSCode Extension API](https://code.visualstudio.com/api/references/activation-events) -- HIGH confidence
- [VSCode Contribution Points](https://code.visualstudio.com/api/references/contribution-points) -- HIGH confidence

### MCP and Claude Code
- [MCP Specification](https://modelcontextprotocol.io/specification/2025-11-25) -- HIGH confidence
- [2026 MCP Roadmap](http://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/) -- HIGH confidence
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- HIGH confidence
- [Claude Code Channels](https://code.claude.com/docs/en/channels) -- HIGH confidence

### CLI Patterns
- [Bun CLI Applications](https://oneuptime.com/blog/post/2026-01-31-bun-cli-applications/view) -- MEDIUM confidence
- [oclif Framework](https://oclif.io/) -- MEDIUM confidence

### Search Patterns
- [Federated Search (Algolia)](https://www.algolia.com/blog/product/federated-search-types) -- MEDIUM confidence
- [Unified Search vs Federated Search](https://swirlaiconnect.com/unified-vs-federated-vs-metasearch/) -- MEDIUM confidence

### Configuration
- [Claude Code Configuration Management](https://deepwiki.com/anthropics/claude-code/2.2-configuration-management) -- MEDIUM confidence
- [Hierarchical Configuration Inheritance Pattern](https://configcraft.readthedocs.io/en/latest/01-Hierarchy-Configuration-Inheritance-Pattern/index.html) -- MEDIUM confidence

### State Management
- [Event Sourcing Pattern (Microsoft)](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) -- HIGH confidence
- [Centralized State Stores](https://clojurepatterns.com/11/9/2/) -- MEDIUM confidence

### DuckDB
- [DuckDB Bun Bindings](https://github.com/evanwashere/duckdb) -- MEDIUM confidence
- [DuckDB Ecosystem (January 2026)](https://motherduck.com/blog/duckdb-ecosystem-newsletter-january-2026/) -- MEDIUM confidence

### Self-Healing / Diagnostics
- [Health Endpoint Monitoring (Microsoft)](https://learn.microsoft.com/en-us/azure/well-architected/reliability/self-preservation) -- HIGH confidence
