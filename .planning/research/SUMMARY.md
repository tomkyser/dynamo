# Project Research Summary

**Project:** Dynamo Platform v1.0
**Domain:** Self-contained development platform for Claude Code (game-engine-class layered framework)
**Researched:** 2026-03-22
**Confidence:** HIGH

## Executive Summary

Dynamo is a platform-class framework for building modules and plugins that extend Claude Code. The closest analogues are game engines (Unreal, Godot) and full-stack framework ecosystems (Laravel, Spring) -- layered architectures where a core library provides utilities, a service layer provides capabilities, a framework layer composes and exposes contracts, and an SDK layer makes it all consumable. The research unanimously validates the canonical architecture plan: strict unidirectional layer dependencies, services-and-providers as peers, facades as extension seams, and an event bus (Switchboard) as the cross-service coordinator. The stack is lean -- Bun runtime with CJS modules, three npm dependencies total (MCP SDK, DuckDB, zod), and everything else from Bun built-ins.

The recommended approach is bottom-up construction in five phases: Core Library first (patterns, types, test runner), then Services and Providers in parallel (with internal ordering: Switchboard and foundational services before complex ones like Wire), then Framework/Armature (thin contracts only -- no premature plugin API), then SDK (Circuit + Pulley), and finally search and communication services (Assay, Wire) which depend on nearly everything else. This order is a valid topological sort of the dependency graph and mirrors how every successful layered platform has been built. The critical strategic choice is to build thin contracts in the Framework phase and let Reverie (the first module, Milestone 2) validate and shape them, rather than speculating about plugin needs.

The top risks are: (1) DuckDB's single-writer concurrency model conflicting with Reverie's multi-session architecture -- mitigated by a coordinator pattern that serializes writes through Wire; (2) Claude Code Channels being a research preview that could break Wire -- mitigated by a transport abstraction with HTTP relay fallback; (3) premature framework abstraction producing contracts no consumer validates -- mitigated by the "thin contracts first, elaborate after Reverie" strategy; (4) Bun/Node.js API divergences (`node:sqlite` and `node:test` do not work in Bun) -- mitigated by using `bun:sqlite` and `bun:test` from day one and validating in Phase 1.

## Key Findings

### Recommended Stack

The stack is Bun-native with minimal external dependencies. Bun provides the runtime, package manager, test runner, SQLite driver, HTTP/WebSocket server, and filesystem APIs. Three npm packages are needed: `@modelcontextprotocol/sdk` (MCP protocol for Wire), `@duckdb/node-api` (Ledger provider), and `zod` (schema validation, future MCP v2 readiness). Everything else is Bun built-in or Node.js built-in via Bun's compatibility layer.

**Core technologies:**
- **Bun >= 1.3.10:** Runtime, package manager, test runner, built-in SQLite, HTTP server. 60% faster subprocess spawning than Node. Validated in v0 and Channels PoC.
- **CJS (CommonJS):** Module format throughout. `'use strict'` in every file. Bun has first-class CJS support including `require()` of ESM modules. No build step.
- **@duckdb/node-api 1.5.0:** Ledger provider. Official DuckDB Node.js package (replaces deprecated `duckdb` npm). Native N-API bindings, CJS-compatible.
- **bun:sqlite:** Lightweight structured data, caching, platform metadata. Zero-dependency, 3-6x faster than better-sqlite3.
- **@modelcontextprotocol/sdk 1.27.x:** MCP server/client for Wire service. Dual CJS/ESM exports. Validated in Channels PoC.
- **Bun.serve:** HTTP + WebSocket for Wire relay server. Zero-dependency with native pub/sub. Validated in PoC.
- **bun:test:** Test runner. Jest-compatible API. Built-in mocking, snapshots. Replaces v0's `node:test`.
- **zod 4.x:** Schema validation. Required peer dep for upcoming MCP SDK v2. Useful now for config and contract validation.
- **node:events EventEmitter:** Switchboard and Commutator event bus. Standard, fully Bun-compatible.

**Critical version requirement:** Bun must be upgraded from installed 1.2.3 to >= 1.3.10 (DuckDB native module crash fix, faster event loop).

### Expected Features

**Must have (table stakes):**
- Service container with dependency resolution (bind/singleton/factory, scoped lifetimes, lazy loading)
- Two-phase lifecycle hooks (register then boot, Laravel pattern)
- Event bus with actions (fire-and-forget) and filters (interceptable data pipeline)
- Claude Code hook integration bridged into Switchboard events
- Plugin manifest and registration with dependency checking
- Hierarchical configuration with validation (defaults < global < project < env < runtime)
- CLI framework with subcommands, help generation, structured output (human/JSON/raw)
- Module lifecycle management (install, enable/disable, update, dependency verification)
- Uniform provider interface behind facade contracts (read/write/query/delete)
- Health check, diagnostics, self-install, self-update

**Should have (differentiators):**
- Wire: Multi-session orchestration via Claude Code Channels (single most differentiating capability)
- Cognitive module support (Reverie archetype -- persistent identity, Self Model, parallel processing)
- Hook-to-event bridge with semantic routing (route by tool type, not raw hook category)
- Assay: Federated query engine across heterogeneous providers (SQL + markdown + plugin sources)
- Magnet: Centralized state with provider-backed persistence that survives session boundaries
- Forge: Git operations as a first-class service (submodules, branch channels, repo-to-deploy sync)
- Actions/filters dual event model (WordPress-proven extensibility pattern)

**Defer (v2+):**
- Extension layer (Apex) -- design after modules exist and real composition needs emerge
- Web/REST/WebSocket API implementation -- contracts exist, slots are empty, implement when needed
- All plugins (Conduit, Terminus, Library, Vault) -- platform ships without plugins
- Decorator-based DI -- CJS does not support decorators; options-based injection is the correct pattern
- Multi-tenant/multi-user architecture -- single-user assumption baked into design
- LLM API integration below SDK scope -- architecture explicitly prohibits this

### Architecture Approach

The architecture is a strict layered system with unidirectional dependency flow validated against game engine, framework ecosystem, and build system precedents. Six layers: Library (pure utilities) -> Services + Providers (peers, import only Library) -> Framework/Armature (composes services and providers, defines contracts) -> SDK/Circuit + Pulley (safe API for modules and CLI) -> Plugins (extend SDK) -> Modules (consume SDK + plugins). The critical boundary rule is no cross-imports within the same tier -- services communicate via the Switchboard event bus, never by importing each other directly.

**Major components:**
1. **lib/ (Core Library)** -- Shared patterns, types, error classes, constants. Pure foundation with zero dependencies.
2. **Switchboard** -- Singleton event bus. Actions (notify) and filters (intercept/transform). Priority-ordered handlers. The nervous system.
3. **Commutator** -- I/O bus that bridges Claude Code hooks into Switchboard events with semantic enrichment.
4. **Magnet** -- Centralized state tree with scoped namespaces (global, session, module). Change events via Switchboard.
5. **Lathe** -- Thin filesystem facade over Bun.file/Bun.write. All fs operations flow through here.
6. **Ledger** -- SQL provider via DuckDB. Structured data storage behind facade contract.
7. **Journal** -- Markdown flat-file provider. Narrative data storage behind facade contract.
8. **Conductor** -- Infrastructure management (Docker, DuckDB lifecycle, dependency health).
9. **Forge** -- Git operations service (submodules, branch channels, repo-to-deploy sync).
10. **Armature** -- Framework layer. Service container, provider contracts, plugin API slots, hook definitions.
11. **Circuit** -- Module SDK. Safe export of platform capabilities for module consumption.
12. **Pulley** -- CLI + MCP endpoints. External API surface.
13. **Wire** -- MCP server toolkit for inter-session communication via Claude Code Channels.
14. **Assay** -- Federated search across all providers.
15. **Relay** -- Install/update/sync operations orchestrator.

### Critical Pitfalls

1. **`node:sqlite` does not exist in Bun** -- Use `bun:sqlite` from day one. Different API surface (`new Database(path)` with `.query()` vs `DatabaseSync` with `.exec()`). Validate in Phase 1 before any data code is written.

2. **DuckDB concurrency breaks with multi-session writes** -- DuckDB does not support cross-process writes. Reverie's 3-session architecture will cause corruption. Mitigate with a single-writer coordinator pattern (Wire serializes writes; other sessions use read-only mode).

3. **Premature framework abstraction** -- The #1 risk for Phase 3. Do not implement plugin domain overwriting, elaborate domain aliasing, or facade extension hooks before Reverie validates basic contracts. Thin contracts only. The v0 retrospective explicitly warned: "Plugin systems can only be designed once you already have perfect knowledge of the design space."

4. **Claude Code Channels is research preview** -- Wire must abstract Channels behind a transport interface with HTTP relay fallback. Do not build Wire exclusively on Channels. Pin minimum Claude Code version and gate on version check.

5. **"No npm dependencies" conflicts with DuckDB/native binaries** -- Clarify constraint scope: "no npm runtime libraries" not "no infrastructure binaries." Create dependency classification (core = Bun built-ins only; infrastructure = native binaries managed by Conductor; external = Docker containers). Conductor must own DuckDB lifecycle.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Core Library
**Rationale:** Pure foundation that everything else imports. Must be complete and stable before any service or provider is built. Also the place to establish Bun-specific patterns and validate runtime assumptions.
**Delivers:** Shared utilities, error types/envelopes, contract patterns, path resolution (layout.cjs equivalent), dependency graph checker, test infrastructure patterns.
**Addresses:** Configuration validation schemas (zod), module pattern enforcement (strict CJS), error reporting with actionable guidance.
**Avoids:** Pitfall 1 (node:sqlite -- validate bun:sqlite here), Pitfall 2 (node:test -- establish bun:test here), Pitfall 8 (CJS module resolution -- enforce patterns here), Pitfall 17 (lazy require -- port dep-graph checker here).

### Phase 2: Foundational Services
**Rationale:** Switchboard, Commutator, Magnet, and Lathe are the minimal substrate. No circular dependencies between them. Each independently testable. Together they enable events, I/O, state, and file operations that all subsequent services and providers require.
**Delivers:** Event bus (Switchboard), I/O bridge (Commutator), state management (Magnet), filesystem facade (Lathe).
**Uses:** node:events EventEmitter (Switchboard), Bun.file/Bun.write (Lathe), bun:sqlite for Magnet internal state.
**Avoids:** Pitfall 12 (hook error invisibility -- Magnet tracks error counts), Pitfall 15 (config as global state -- Magnet owns config reads).

### Phase 3: Data Providers and Infrastructure Services
**Rationale:** Providers need Lathe (Phase 2). Forge needs Lathe. Conductor needs Lathe. These can proceed in parallel once Phase 2 completes. Ledger and Journal establish the data layer that Armature will compose.
**Delivers:** Ledger (DuckDB provider), Journal (markdown provider), Conductor (infrastructure management), Forge (git operations), Relay (install/update/sync).
**Uses:** @duckdb/node-api (Ledger), Bun.file/Bun.write (Journal), Bun.spawn (Conductor, Forge).
**Implements:** Provider facade contracts (read/write/query/delete), infrastructure lifecycle management.
**Avoids:** Pitfall 3 (deprecated DuckDB package -- use @duckdb/node-api), Pitfall 4 (DuckDB concurrency -- design single-writer pattern), Pitfall 7 (npm constraint vs native binaries -- Conductor owns DuckDB lifecycle), Pitfall 11 (MCP session caching -- Conductor implements reconnection), Pitfall 13 (Bun fs edge cases -- Lathe abstracts all fs ops).

### Phase 4: Framework (Armature)
**Rationale:** Armature is the composition layer. It cannot exist until the things it composes exist. This is where service registration, provider contracts, lifecycle hooks, and configuration management come together. Build thin -- do not implement elaborate plugin API or domain aliasing until Reverie validates basic contracts.
**Delivers:** Service container (bind/singleton/factory), provider contract enforcement, two-phase lifecycle (register/boot), Claude Code hook integration layer, hierarchical configuration resolution, basic plugin manifest loading (no plugin implementation).
**Avoids:** Pitfall 5 (premature framework abstraction -- thin contracts only), Pitfall 9 (IoC without decorators -- options-object pattern), Pitfall 12 (hook error invisibility -- JSON output protocol with systemMessage), Pitfall 16 (boundary marker injection -- sanitize injected content).

### Phase 5: SDK and External Surface
**Rationale:** SDK wraps the Framework for safe module and external consumption. Cannot exist before the framework. Circuit determines what modules can access; Pulley determines how the outside world interacts.
**Delivers:** Circuit (module API with safe exports), Pulley (CLI with subcommands, help generation, structured output; MCP endpoint definitions).
**Addresses:** CLI framework features (command routing, help generation, structured output), module lifecycle management (install/enable/update/verify).
**Avoids:** Pitfall 5 (premature abstraction -- SDK surface shaped by Reverie's actual needs, not hypothetical ones).

### Phase 6: Search and Communication
**Rationale:** Assay and Wire are the most complex services, depend on nearly everything else, and are the most differentiating capabilities. Building them last means they leverage all established platform patterns. Wire's dependency on the research-preview Channels API makes it the highest-risk service -- building it last gives Channels more time to stabilize.
**Delivers:** Assay (federated search across Ledger + Journal + plugin sources), Wire (multi-session communication with transport abstraction, HTTP relay + Channels transport).
**Addresses:** Federated query engine, multi-session orchestration, cross-provider search with provider-specific optimization.
**Avoids:** Pitfall 4 (DuckDB multi-process writes -- Wire coordinator serializes writes), Pitfall 6 (Channels instability -- transport abstraction with HTTP relay fallback).

### Phase Ordering Rationale

- **Bottom-up is mandatory.** The dependency graph has a strict topological order. Library -> Services -> Framework -> SDK is the only valid build sequence. Attempting to build the Framework before Services exist produces untestable abstractions.
- **Services before Providers is a soft preference.** Both import only Library and can technically build in parallel. But Switchboard (event bus) should exist before anything else because services may want to emit events during their own initialization, and Lathe (filesystem) should exist before Journal (markdown provider).
- **Thin Framework before elaborate Framework.** Phase 4 deliberately builds minimal Armature. The plugin API, domain aliasing, and facade extension hooks are deferred until Reverie validates what the contracts actually need to be.
- **Wire and Assay are last because they are highest-risk and highest-dependency.** Wire depends on Switchboard, Commutator, Conductor, and the Channels API. Assay depends on Switchboard and all providers. Delaying these services gives the platform more stability under them and gives Channels more time to mature.
- **This order avoids every critical pitfall.** Phase 1 catches Bun incompatibilities early. Phase 3 addresses DuckDB package and concurrency issues. Phase 4 avoids premature abstraction. Phase 6 handles Channels instability.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Data Providers):** DuckDB @duckdb/node-api is the newest dependency. NAPI compatibility with Bun 1.3.x needs hands-on validation. The single-writer coordinator pattern for multi-process access needs architectural design specific to Dynamo's Wire topology.
- **Phase 4 (Framework/Armature):** Service container design in CJS without decorators has few direct precedents. The register/boot two-phase lifecycle needs careful contract design. Research the exact Laravel Service Provider implementation for adaptation.
- **Phase 6 (Wire):** Claude Code Channels API is research preview. Must research current API surface, stability status, and breaking changes at the time Phase 6 begins. The transport abstraction contract needs dedicated design work.
- **Phase 6 (Assay):** Federated search across SQL and markdown is architecturally complex. Research search-time merging patterns and provider-specific query optimization strategies.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Core Library):** Well-documented Bun APIs, standard utility patterns, validated v0 patterns to port. Straightforward.
- **Phase 2 (Foundational Services):** EventEmitter-based event bus, state management, filesystem facade -- all thoroughly documented patterns with strong precedent.
- **Phase 5 (SDK/Surface):** CLI framework and module API are well-understood patterns. v0 validated the CLI approach (process.argv parsing, structured output).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified against official docs. Bun, DuckDB, MCP SDK all have comprehensive documentation. Only medium-confidence item is DuckDB NAPI on Bun 1.3.x (needs hands-on validation). |
| Features | HIGH | Feature landscape drawn from established framework patterns (Laravel, WordPress, VSCode, NestJS). Table stakes are industry consensus. Differentiators are unique to Dynamo but grounded in validated PoC (Wire) and canonical architecture (Reverie). |
| Architecture | HIGH | Layered architecture validated against game engine, framework, and build system precedents. Every canonical decision has industry precedent. The architecture plan itself is well-designed. |
| Pitfalls | HIGH | Critical pitfalls verified against official docs (Bun compat matrix, DuckDB concurrency docs, Claude Code hooks reference). v0 retrospective provides high-confidence internal validation for hook error invisibility, MCP session caching, and premature abstraction risks. |

**Overall confidence:** HIGH

### Gaps to Address

- **DuckDB on Bun 1.3.x hands-on validation:** @duckdb/node-api NAPI bindings are documented as compatible, but Bun's NAPI implementation is 95%, not 100%. Must validate with actual queries in Phase 3 before building Ledger.
- **Claude Code Channels API stability:** Research preview status means the API may change. Wire transport abstraction mitigates this, but the Channels transport implementation will need to track API changes. Re-evaluate at Phase 6 planning time.
- **MCP SDK v2 migration timing:** v2 splits into separate server/client packages and requires zod v4. v1.x maintained 6 months post-v2-stable. The migration is a package swap + import path update, but timing needs monitoring.
- **Switchboard event namespacing convention:** How events are named as the ecosystem grows (`{origin}:{domain}:{action}` recommended but not yet validated). Define convention in Phase 2, validate under load in Phase 6.
- **Magnet state isolation for multi-module:** Scoped namespaces with module ownership are recommended but the exact access control mechanism (can Module A read Module B's state?) needs Phase 4 design work.
- **Wire session lifecycle ownership:** Who manages secondary/tertiary session lifecycle -- Conductor (infrastructure) or the Module (Reverie) via Circuit API? This is an open architectural question that must be resolved before Phase 6.

## Sources

### Primary (HIGH confidence)
- [Bun documentation](https://bun.com/docs) -- runtime APIs, module resolution, CJS support, SQLite, test runner
- [DuckDB official docs](https://duckdb.org/docs/stable/) -- Node Neo API, concurrency model, deprecation timeline
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) -- v1.27.x stable, v2 pre-alpha, Bun support
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- 26 hook events, contracts, constraints
- [Claude Code Channels](https://code.claude.com/docs/en/channels) -- research preview status, channel contract
- [Laravel Service Container](https://laravel.com/docs/12.x/container) -- IoC pattern reference
- [Laravel Service Providers](https://laravel.com/docs/12.x/providers) -- register/boot lifecycle
- [WordPress Hooks API](https://developer.wordpress.org/plugins/hooks/) -- actions/filters extensibility model
- [Game Programming Patterns](https://gameprogrammingpatterns.com/) -- Service Locator, Event Queue, Observer, Component
- Dynamo v0 archive -- 525+ tests, 6 milestones, validated patterns (options-based DI, tmpdir isolation, stub-then-replace)
- Channels PoC (`~/dev/cc-channels-poc/`) -- validated Wire relay + MCP channel server on Bun

### Secondary (MEDIUM confidence)
- [MCP SDK v2 docs](https://ts.sdk.modelcontextprotocol.io/v2/) -- package split, zod v4 requirement
- [@duckdb/node-api package](https://github.com/duckdb/duckdb-node-neo) -- CJS format confirmed
- [DuckDB Bun bindings (@evan/duckdb)](https://github.com/evanwashere/duckdb) -- alternative if official NAPI fails
- [Federated Search patterns (Algolia)](https://www.algolia.com/blog/product/federated-search-types) -- Assay design reference
- [VSCode Extension API](https://code.visualstudio.com/api/references/activation-events) -- plugin manifest and activation patterns

### Tertiary (LOW confidence)
- [Bun Compatibility 2026](https://dev.to/alexcloudstar/bun-compatibility-in-2026-what-actually-works-what-does-not-and-when-to-switch-23eb) -- community assessment, needs validation
- [MCP Real Faults Taxonomy](https://arxiv.org/html/2603.05637v1) -- academic, useful for Wire robustness
- Community blog posts on plugin architecture patterns -- directional, not authoritative

---
*Research completed: 2026-03-22*
*Ready for roadmap: yes*
