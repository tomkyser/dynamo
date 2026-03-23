# Phase 5: SDK & Platform Infrastructure - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the platform consumable and self-managing. Circuit exports the framework safely for modules. Pulley provides the CLI and MCP endpoint surface. Infrastructure services handle health aggregation, versioning via GitHub Releases API, self-install/update, and git submodule management for the entire ecosystem (core + plugins + modules + extensions).

</domain>

<decisions>
## Implementation Decisions

### Circuit Module API (SDK-01)
- **D-01:** Facade-only access. Modules receive a curated set of facades resolved from the container -- never raw implementations or the container itself. Modules call `circuit.getService('switchboard')` or `circuit.getProvider('ledger')` and get back facades. Dependency verification at module registration ensures modules only access what they declared.
- **D-02:** Re-export lib essentials. Circuit re-exports ok/err/isOk/isErr, validate, createContract -- the patterns modules need to follow Dynamo conventions. Single import point: everything a module needs comes from Circuit. Modules never require lib/ directly.
- **D-03:** Manifest + register callback for module registration. Module provides a manifest (name, version, dependencies, hooks) and a `register(circuit)` callback. Circuit verifies all declared dependencies exist as facades, then calls register() passing the Circuit API object. Same pattern as plugin registration but at module scope.
- **D-04:** Full event proxy for Switchboard access. Circuit creates a per-module event proxy that namespaces emissions (module emits 'x', Switchboard sees '{module}:x'), tracks all subscriptions for automatic cleanup on module shutdown, and provides auditable event usage. System events (hook:\*, state:\*) are passed through for listening. Proxy enforces module isolation while preserving full event power.

### Pulley CLI Framework (SDK-02)
- **D-05:** Operations-focused root command set. Root commands: `dynamo status`, `dynamo health`, `dynamo install`, `dynamo update`, `dynamo version`, `dynamo config [key]`. Modules add subcommands: `dynamo reverie status`. Root stays clean for platform ops; modules namespace themselves.
- **D-06:** Reusable CLI framework. Pulley provides a command registration API. Modules call `pulley.registerCommand('reverie status', handler, {description, flags, output})`. Pulley handles routing, help generation, and output formatting. One CLI framework for the whole ecosystem.
- **D-07:** Flag-based output format selection. Default is human-readable. `--json` for structured JSON. `--raw` for unprocessed data. Command handlers return a result object; Pulley formats based on the flag. Same pattern as v0's dynamo CLI.

### Pulley MCP Surface (SDK-03)
- **D-08:** Separate MCP servers for platform ops and Wire communication. Pulley runs its own MCP server for platform operations (health, status, module info). Wire's channel-server.cjs handles inter-session communication. Two distinct concerns, two servers. Conductor manages MCP server lifecycle infrastructure for both -- starting/stopping servers, port management. Pulley and Wire define what tools exist; Conductor manages how the servers run.
- **D-09:** v1 MCP tool set: health & diagnostics (dynamo_health, dynamo_diagnose), status & version (dynamo_status, dynamo_version), module operations (dynamo_module_list, dynamo_module_status). Config management deferred from MCP surface in v1.
- **D-10:** Module MCP tool registration via Circuit. Modules call `circuit.registerMcpTool('reverie_status', handler, schema)` during registration. Pulley's MCP server serves all registered tools -- platform + module tools in one server. Same pattern as CLI command registration.

### Health & Diagnostics (INF-01)
- **D-11:** Claude's Discretion. Claude picks lifecycle-driven aggregation vs dedicated health service based on what fits existing patterns. Key requirements: per-service healthCheck() aggregation into single report, overall healthy/degraded/unhealthy status, dependency chain analysis (if Ledger is down, Assay is impacted).

### Versioning (INF-03)
- **D-12:** Forge-based with GitHub REST API. Forge gains release management methods: createRelease, getLatestRelease, compareVersions. Uses fetch (zero-dependency). Master branch creates vX.Y.Z releases. Dev branch creates dev-X.Y.Z pre-releases. Version check compares local vs latest release tag.

### Self-Management (INF-02, INF-04)
- **D-13:** Full ecosystem management. Relay + Forge handle install/update for core platform AND git submodule additions (plugins, modules, extensions). `dynamo update` updates core, then checks each submodule for newer versions. `dynamo install <plugin-repo>` adds a new git submodule. Unified management across the entire ecosystem.

### CLI Argument Parsing
- **D-14:** Claude's Discretion. Claude picks the arg parsing approach that best fits the zero-dependency constraint. Options considered: direct process.argv parsing (v0 pattern) or Node's built-in util.parseArgs (available in Bun).

### Claude's Discretion
- Health check aggregation approach (D-11) -- lifecycle-driven vs dedicated service
- CLI argument parsing strategy (D-14) -- process.argv vs util.parseArgs
- MCP server port/transport configuration details
- Help text generation internals
- Diagnostic report formatting

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture
- `.claude/new-plan.md` -- The architecture plan. Absolute canon. Lines 105-115 define SDK scope: Circuit (module API) and Pulley (CLI, MCP endpoints). Lines 90-105 define Armature which Circuit exposes.
- `.claude/reverie-spec-v2.md` -- The Reverie module specification. Canon. Section 6.1 (Service Usage) shows how Reverie will consume Circuit -- this is the primary client for the module API.

### Requirements
- `.planning/REQUIREMENTS.md` -- SDK-01, SDK-02, SDK-03, INF-01, INF-02, INF-03, INF-04 definitions

### Prior Phase Context (all carry forward)
- `.planning/phases/04-framework/04-CONTEXT.md` -- D-01 through D-14 (container, facades, lifecycle, plugin API, hook wiring). Circuit builds directly on top of these decisions.
- `.planning/phases/03.1-wire-communication-service/03.1-CONTEXT.md` -- D-13 (dual API surface: MCP + native). Pulley follows same dual pattern for platform ops.
- `.planning/phases/03-data-providers-infrastructure-services/03-CONTEXT.md` -- D-01 (DATA_PROVIDER_SHAPE), D-02 (provider contracts). Circuit exposes these via facades.
- `.planning/phases/02-foundational-services/02-CONTEXT.md` -- D-12-15 (service contract pattern, options-based DI). Circuit preserves these patterns.
- `.planning/phases/01-core-library/01-CONTEXT.md` -- D-10-13 (CJS conventions). All Phase 5 code follows these.

### Existing Code (what Phase 5 builds on)
- `core/core.cjs` -- Bootstrap entry point. Circuit wraps what bootstrap creates.
- `core/armature/index.cjs` -- Barrel export. Circuit re-exports selected items.
- `core/armature/lifecycle.cjs` -- Lifecycle orchestrator. Health aggregation iterates booted facades.
- `core/armature/container.cjs` -- IoC container. Circuit provides facade-only view, not raw container.
- `core/armature/facade.cjs` -- Facades. Circuit's primary export type.
- `core/services/relay/relay.cjs` -- Existing install/update/sync operations. INF-02 extends these.
- `core/services/forge/forge.cjs` -- Existing git/submodule operations. INF-03/INF-04 extend these.
- `core/services/conductor/conductor.cjs` -- MCP server lifecycle management. Manages both Pulley and Wire MCP servers.
- `core/services/wire/channel-server.cjs` -- Existing MCP server for Wire. Separate from Pulley's MCP server per D-08.
- `lib/index.cjs` -- Lib barrel. Circuit re-exports essentials from here.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `core/armature/lifecycle.cjs` -- `getFacade(name)` and registry iteration for health aggregation
- `core/armature/plugin.cjs` -- `PLUGIN_MANIFEST_SCHEMA`, `validateManifest`, `loadPlugin` patterns to replicate for module manifests
- `core/services/relay/relay.cjs` -- install/update/sync operations (backup-before-modify pattern) to extend for ecosystem management
- `core/services/forge/forge.cjs` -- git submodule management already implemented; version management extends it
- `core/services/conductor/conductor.cjs` -- MCP server lifecycle management for both platform and Wire servers
- `core/services/wire/channel-server.cjs` -- MCP server pattern with @modelcontextprotocol/sdk to replicate for Pulley
- `lib/result.cjs` -- ok/err pattern used in all command handlers
- `lib/config.cjs` -- loadConfig for CLI config management commands

### Established Patterns
- Service factory: `createServiceName(options)` returns `Result<Contract>` via createContract
- Options-based DI: dependencies passed via options object at init()
- healthCheck() on every service returns `ok({healthy, name})`
- Dual API surface: native programmatic + MCP tools (Wire Phase 3.1 D-13)
- Barrel exports: single entry point per scope (lib/index.cjs, armature/index.cjs)
- Zero npm dependencies for core -- Bun/Node built-ins only

### Integration Points
- `core/sdk/circuit/` -- new directory for Circuit module API
- `core/sdk/pulley/` -- new directory for CLI framework and MCP surface
- `core/core.cjs` -- gains module registration after lifecycle.boot()
- `config.json` -- gains version tracking and ecosystem management sections
- Conductor -- extended to manage Pulley's MCP server lifecycle alongside Wire's

</code_context>

<specifics>
## Specific Ideas

- Circuit follows the same manifest + register callback pattern as plugins (Phase 4 D-10/D-11) but at module scope -- consistency across the extension model
- Pulley's CLI command registration API mirrors Circuit's module registration -- modules use both to expose CLI subcommands and MCP tools through a single Circuit import
- Conductor owns MCP server infrastructure for both Pulley and Wire -- Pulley/Wire define tools, Conductor manages servers (per user clarification)
- v0's dynamo CLI validated the operations-focused command set and flag-based output formatting -- Pulley formalizes this into a reusable framework

</specifics>

<deferred>
## Deferred Ideas

- Config management MCP tools (dynamo_config_get/set) -- considered for v1 MCP surface but excluded to keep initial scope focused on read-only operations
- Web/REST/WebSocket API implementation via Pulley -- architectural slots defined in Armature contracts, implementation deferred to v2 (API-01, API-02)

</deferred>

---

*Phase: 05-sdk-platform-infrastructure*
*Context gathered: 2026-03-23*
