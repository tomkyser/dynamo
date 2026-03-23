# Milestones

## v1.0 Platform SDK (Shipped: 2026-03-23)

**Phases completed:** 8 phases, 28 plans, 57 tasks

**Key accomplishments:**

- Result types (ok/err), contract validation factory with Object.freeze, and schema validator with nested object support -- all TDD with 38 passing bun:test specs
- Root discovery via .dynamo marker walking with cached results, plus central path registry computing 13 Dynamo layout locations from discovered root
- Hierarchical config loader with 5-level precedence (defaults < global < project < env < runtime), deep merge with array replacement, env var coercion, and barrel export aggregating all 13 lib/ public APIs
- Lathe filesystem facade wrapping Bun.file/Bun.write and node:fs with atomic writes, contract self-validation, and four-method lifecycle
- Event bus service with dual dispatch (action fire-and-forget + filter interceptable pipeline) and prefix wildcard matching via node:events EventEmitter
- Three-tier scoped state service (global/session/module) with Switchboard event emission, pluggable provider interface, and JSON file persistence with debounced atomic writes and .bak recovery
- Commutator I/O bridge with tool-aware semantic routing mapping Claude Code hooks to Switchboard domain events and outbound adapter registration for bidirectional I/O
- DuckDB + SQLite dual-backend Ledger provider with uniform CRUD interface and Switchboard event emission
- Zero-dependency YAML frontmatter parser and Journal flat-file provider implementing DATA_PROVIDER_SHAPE contract via Lathe file I/O
- Git CLI wrapper via Bun.spawnSync with submodule management, repo-to-deploy sync, and event emission through Switchboard
- Docker Compose lifecycle management with dependency health checks and graceful degradation when Docker is absent
- Relay install/update/sync orchestration with git-tag-based backup-rollback, plugin/module submodule management, and config migration
- Wire message envelope with 8 typed message types, 4 urgency levels, and urgency-based priority queue with configurable backpressure
- Session registry with capability tracking and TTL-based reconnection buffering, plus write coordinator with priority FIFO ordering and greedy same-table batching
- Dual transport abstraction routing messages through Channels API (MCP SDK) or HTTP relay based on urgency, plus standalone Bun.serve relay server with long-poll, WebSocket, and batch endpoints
- Wire service factory composing registry, transport router, queue, and write coordinator into frozen contract with MCP channel server declaring claude/channel capability and multi-session integration test proving urgency-level messaging
- Federated search service with Promise.allSettled parallel dispatch, capability-based SQL/criteria routing, and provider metadata tagging on every result
- IoC container with singleton/factory lifetimes, alias and tagged resolution, Kahn's topological boot order, and schema enum validation
- Facade generator with before/after/around hook points and config-driven hook wiring registry for all 8 Claude Code hook types
- Plugin manifest loading with schema validation and dependency checking, plus two-phase lifecycle orchestrator with topological boot order, facade wrapping, and plugin failure isolation
- Armature barrel export with 11 framework APIs, core.cjs bootstrap composing all 11 components, and 15-test integration suite proving end-to-end platform boot
- Circuit module API with facade-only access, namespaced event proxy, manifest-based registration, and scoped dependency enforcement
- Extensible CLI framework with command registration, longest-match subcommand routing, three-mode output formatting, and MCP tool registry using node:util.parseArgs
- Health aggregation with dependency chain analysis and GitHub Releases API integration for platform diagnostics and version tracking
- Pulley MCP server exposing 6 platform tools via @modelcontextprotocol/sdk with full CLI command surface for status, health, version, install, update, and config
- SDK barrel export with 16 APIs, extended bootstrap wiring Circuit and Pulley into platform lifecycle, and 22-test integration suite validating end-to-end module registration, CLI routing, and health aggregation
- Corrected deps[] boot-order declarations for 8 registrations, wired Magnet json-provider via lathe+statePath injection, added forge.pull() method
- 12 integration tests validating Assay dual-provider injection, Magnet shutdown-restart persistence, forge.pull() callable facade, and dynamic mapDeps/deps consistency across full bootstrap lifecycle

---
