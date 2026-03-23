# Phase 4: Framework - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Compose all services and providers into a coherent platform through Armature -- the IoC container, lifecycle orchestration, provider facades with domain aliasing, plugin API contracts, hook definitions, and Claude Code integration layer. Armature is the composition layer that modules and plugins consume. It does not add new services or providers -- it wires, exposes, and governs the ones built in Phases 1-3.2.

</domain>

<decisions>
## Implementation Decisions

### IoC Container Design
- **D-01:** Container wraps existing options-based DI. Container knows the dependency graph and resolves services, but still injects via options objects at init(). Services never import the container -- they receive deps through options as before. Container is the orchestrator, not a service locator. Existing services remain testable and decoupled.
- **D-02:** Declarative metadata for dependency graph. Each service registers with `deps: ['switchboard', 'ledger']`. Container topologically sorts registrations and injects in dependency order. Graph is data, not code. Aligns with "hardcode nothing."
- **D-03:** Two lifetime modes: singleton (one instance, returned on every resolve) and factory (new instance per resolve). Singletons for services (Switchboard, Magnet, etc.), factory for per-request/per-session objects. Deferred/lazy = resolve on first access, not at boot.
- **D-04:** Tagged bindings for contextual resolution. `bind('data-provider', ledgerImpl, { tags: ['sql', 'data'] })`. Resolve by tag: `resolveTagged('sql')` returns Ledger. Enables import-by-domain (FWK-02) through the same mechanism as IoC resolution.

### Domain Aliasing & Provider Facades
- **D-05:** Domain aliases are container queries, not filesystem paths. The architecture plan's `import Dynamo/Providers/Data/sql.cjs` becomes `container.resolve('providers.data.sql')`. Aliases are metadata in the registry. No parallel file tree. Keeps filesystem clean.
- **D-06:** Facade wraps every registered provider/service. Armature generates a facade object that enforces the contract and adds domain metadata. `container.resolve('providers.data.sql')` returns the Ledger facade, not raw Ledger. Consumers never touch raw implementations. Plugin overrides swap what's behind the facade.
- **D-07:** `core/core.cjs` orchestrates bootstrap. Creates the container, registers all built-in services/providers with their domain tags, runs the register/boot lifecycle, and exports the ready container. Single entry point. Aligns with the architecture plan's file tree (`core/core.cjs` listed explicitly).

### Plugin Extension Model
- **D-08:** Facade hook points for extension. Facades expose before/after/around hooks at method level. Plugin registers: `facade.hook('query', 'after', myHandler)`. To override: `facade.override('query', myImpl)`. Facade dispatches through hooks, then to implementation. Switchboard events emitted at each hook point. Familiar middleware pattern.
- **D-09:** Plugin introduces new domains via container registration. Plugin calls `container.bind('services.search.s3', myS3SearchImpl, { tags: ['search', 's3'] })`. New domain appears in the registry alongside core domains. Consumers resolve it the same way. No special API -- same bind() core uses.
- **D-10:** Minimal plugin manifest for v1. plugin.json contains: name, version, description, dependencies (core services/providers it requires), entry point (main .cjs file), and enabled flag. No domain declarations in manifest -- code handles registration. Manifest enables dependency checking and enable/disable toggle per FWK-04.
- **D-11:** Core first, plugins second lifecycle. Register phase: core services register, then plugins register (can see what core provides). Boot phase: core boots in dependency order, then plugins boot (can access booted core services). If a plugin fails to boot, core still runs. Clean separation.

### Hook Definitions & Claude Code Integration
- **D-12:** Armature defines canonical hook type schemas (what data each of the 8 Claude Code hooks carries) and provides a declarative hook wiring registry. Services and plugins register hook interests through the registry. At boot, Armature wires Commutator->Switchboard->registered handlers automatically. Commutator stays the runtime bridge; Armature is the boot-time configuration layer.
- **D-13:** Hook configuration from config.json. Armature reads which hooks are enabled and what services listen to what. Single source of truth for what hooks are active. Plugins declare hook interests in their registration.

### Configuration Validation
- **D-14:** Extend existing lib/schema.cjs for FWK-06. Enhance the validator to handle nested object validation, enum types, and plugin config sections. Stays zero-dependency. JSON Schema spec compliance is not needed for internal config validation.

### Claude's Discretion
- Container internal data structures (Map, linked list, etc. for dependency graph)
- Facade generation implementation details (Object.create, factory function, etc.)
- Hook schema shape (JSDoc typedefs, plain objects, etc.)
- Topological sort algorithm choice
- Error messages and diagnostics for dependency resolution failures
- Config validation error formatting

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture
- `.claude/new-plan.md` -- The architecture plan. Absolute canon. Defines Armature's role (lines 90-105): framework layer, definitions & contracts, services/providers API with domain aliasing (import by domain or by name), plugin API, external API definitions. Lines 98-103 are the most critical -- they define the domain aliasing and plugin extension patterns that D-05 through D-09 implement.
- `.claude/reverie-spec-v2.md` -- The Reverie module specification. Canon. Defines what Armature ultimately serves -- Reverie is the first module consumer. Section 6.1 (Service Usage) shows how Reverie accesses services through the framework.

### Requirements
- `.planning/REQUIREMENTS.md` -- FWK-01 through FWK-06 requirement definitions and success criteria

### Prior Phase Context (all carry forward)
- `.planning/phases/01-core-library/01-CONTEXT.md` -- D-03 (factory + shape validation), D-06 (logical import paths deferred TO Phase 4), D-07 (5-level config precedence), D-10-13 (CJS conventions)
- `.planning/phases/02-foundational-services/02-CONTEXT.md` -- D-01-05 (Switchboard event model), D-06-08 (Commutator hook bridging), D-09 (Magnet provider interface), D-12-15 (service contract pattern: 4 lifecycle methods, options-based DI, self-validating)
- `.planning/phases/03-data-providers-infrastructure-services/03-CONTEXT.md` -- D-01 (separate state vs data provider contracts), D-02 (DATA_PROVIDER_SHAPE)
- `.planning/phases/03.1-wire-communication-service/03.1-CONTEXT.md` -- D-13 (dual API surface: MCP + native programmatic)
- `.planning/phases/03.2-assay-federated-search/03.2-CONTEXT.md` -- D-01 (options-based DI, "Phase 4 may add container-based resolution"), D-02 (extensible provider pool via registerProvider)

### Existing Code (contracts and patterns Armature composes)
- `lib/contract.cjs` -- createContract(name, shape, impl) returns frozen validated contract. Armature facades build on top of this.
- `core/providers/provider-contract.cjs` -- DATA_PROVIDER_SHAPE (8 required methods). Armature's provider facades must honor this shape.
- `core/services/switchboard/switchboard.cjs` -- SWITCHBOARD_SHAPE, event emission patterns. Armature wires hook events through Switchboard.
- `core/services/commutator/commutator.cjs` -- Hook-to-Switchboard bridge. Armature configures what Commutator routes at boot.
- `core/services/magnet/provider.cjs` -- STATE_PROVIDER_SHAPE (separate from DATA_PROVIDER_SHAPE per Phase 3 D-01).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/contract.cjs` -- createContract for facade and container contract validation
- `lib/result.cjs` -- Ok/Err for all container resolution and lifecycle errors
- `lib/schema.cjs` -- validate() to be enhanced for FWK-06 config validation
- `lib/config.cjs` -- loadConfig for hierarchical config with 5-level precedence
- `lib/paths.cjs` -- discoverRoot/createPaths for locating all directories
- `lib/index.cjs` -- barrel export for 13 lib/ functions

### Established Patterns
- Service factory: `createServiceName(options)` returns `Result<Contract>` via createContract -- frozen, self-validated
- Options-based DI: dependencies passed via options object at init() -- container wraps this, doesn't replace it
- Lifecycle methods: init/start/stop/healthCheck on every service -- container orchestrates boot order
- Switchboard event emission for cross-service reactivity -- facades emit at hook points
- DATA_PROVIDER_SHAPE and STATE_PROVIDER_SHAPE are separate contracts (Phase 3 D-01)
- Directory per service: `core/services/{name}/{name}.cjs` + `__tests__/`

### Integration Points
- `core/armature/` -- new directory created by this phase. Container, facades, hook registry, plugin API, lifecycle orchestrator
- `core/core.cjs` -- new file. Bootstrap entry point that creates container and runs register/boot lifecycle
- All 9 existing services register into the container with declarative dependency metadata
- Both providers (Ledger, Journal) register with domain tags (sql, data, files, etc.)
- config.json gains hook configuration section and plugin registry section
- `plugins/` directory prepared for git submodule plugin repos

</code_context>

<specifics>
## Specific Ideas

- Architecture plan lines 98-103 define the exact domain aliasing vision -- container.resolve() paths should feel like the logical import paths described there (Dynamo/Providers/Data/sql.cjs -> container.resolve('providers.data.sql'))
- Architecture plan line 101 explicitly says plugins "can overwrite or extend core defined domains of responsibility at the provider or service layer or introduce new ones" -- facade hook points (D-08) and container bind (D-09) deliver this
- The arch plan mentions `core/core.cjs` in the file tree -- this is the bootstrap entry point that wires everything
- Plugin API in v1 is contracts only -- no actual plugins ship until separate repos are created. Validation via a minimal test plugin manifest in tests.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 04-framework*
*Context gathered: 2026-03-23*
