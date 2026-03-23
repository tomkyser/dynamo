# Phase 3: Data Providers & Infrastructure Services - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Stand up the data layer (SQL via DuckDB and markdown via flat files) and the infrastructure services (git ops, Docker/Compose lifecycle, install/update orchestration) that Phase 4's framework will compose. Delivers five components: Ledger provider (PRV-01), Journal provider (PRV-02), Forge service (SVC-05), Conductor service (SVC-06), and Relay service (SVC-07). All follow the established service factory pattern with lifecycle methods and options-based DI.

</domain>

<decisions>
## Implementation Decisions

### Provider Interface Design
- **D-01:** Two separate provider contracts. State providers (Magnet's existing load/save/clear) and data providers (read/write/query/delete) are different shapes for different jobs. No forced unification. Armature registers them in different provider domains in Phase 4.
- **D-02:** Data provider contract: `read(id)`, `write(id, data)`, `query(criteria)`, `delete(id)` as the uniform interface. Both Ledger and Journal implement this same shape.
- **D-03:** Unified `query(criteria)` method. Criteria is a plain object. Each provider translates internally -- Ledger maps to SQL WHERE clauses, Journal scans frontmatter keys. Provider-specific query optimization deferred to Assay in Phase 6.

### DuckDB Integration Strategy
- **D-04:** Validate DuckDB on Bun first. First task in the Ledger plan: install `@duckdb/node-api`, run a smoke test on Bun >= 1.3.10. If it works, build on DuckDB. If native bindings fail, build on bun:sqlite immediately. No wasted effort.
- **D-05:** bun:sqlite as fallback implementation. Ledger is built behind the data provider contract. Primary backend: DuckDB. If native bindings fail, swap to bun:sqlite behind the same contract. Both are SQL, so the contract surface is identical. Loses DuckDB's OLAP features but keeps Ledger functional.

### Conductor Infrastructure Management
- **D-06:** Full infrastructure manager. Build Docker/Compose lifecycle management now, even before Wire needs it. Conductor manages process start/stop/health for containerized services, Docker Compose up/down/status via Bun.spawn, and dependency health checks (Bun version, DuckDB loadable, git installed, disk space).
- **D-07:** Graceful degradation when Docker is absent. Conductor checks for Docker availability at start(). If present, full lifecycle management. If absent, reports 'Docker not available' in health checks and skips container operations. Platform works without Docker installed.

### Relay Operations
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture
- `.claude/new-plan.md` -- The architecture plan. Absolute canon. Defines service roles, provider roles, engineering principles, and layer structure.
- `.claude/reverie-spec-v2.md` -- The Reverie module specification. Canon. Defines what data providers ultimately serve -- Ledger for association indexes, Journal for fragment storage.

### Project Definition
- `.planning/PROJECT.md` -- Core value, constraints, validated v0 patterns, key decisions
- `.planning/REQUIREMENTS.md` -- PRV-01, PRV-02, SVC-05, SVC-06, SVC-07 requirement definitions and success criteria

### Technology Stack
- `CLAUDE.md` -- Technology stack section: DuckDB `@duckdb/node-api` 1.5.0, bun:sqlite, Bun.spawn for git/docker CLI, version compatibility notes

### Prior Phases
- `.planning/phases/01-core-library/01-CONTEXT.md` -- Phase 1 decisions (D-01 to D-13): Result types, contract validation, options-based DI, CJS conventions, path resolution
- `.planning/phases/02-foundational-services/02-CONTEXT.md` -- Phase 2 decisions (D-01 to D-15): service factory pattern, lifecycle methods, Switchboard events, Magnet state scoping, provider interface (load/save/clear)

### Existing Code
- `core/services/magnet/provider.cjs` -- Existing state provider contract (STATE_PROVIDER_SHAPE). Data provider contract must be separate.
- `core/services/lathe/lathe.cjs` -- Filesystem facade. Journal uses Lathe for all file operations.
- `core/services/switchboard/switchboard.cjs` -- Event bus. All new services emit events through Switchboard.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/result.cjs` -- Ok/Err for all provider and service error communication
- `lib/contract.cjs` -- createContract for provider and service interface validation
- `lib/schema.cjs` -- validate for config shape checking
- `lib/paths.cjs` -- discoverRoot/createPaths for locating service and provider directories
- `lib/config.cjs` -- loadConfig for hierarchical config loading
- `core/services/lathe/lathe.cjs` -- Filesystem facade (Journal uses this for all file I/O)
- `core/services/switchboard/switchboard.cjs` -- Event bus (all new services emit events)
- `core/services/magnet/magnet.cjs` -- State management (Relay may store operation state)
- `core/services/magnet/provider.cjs` -- State provider contract shape (reference for data provider design, but kept separate per D-01)

### Established Patterns
- Service factory: `createServiceName(options)` returns `Result<ServiceContract>`
- Self-validating via `createContract` at init-time
- Lifecycle methods: `init(options)`, `start()`, `stop()`, `healthCheck()`
- Options-based DI: dependencies passed via options object
- TDD with bun:test: tests written first
- Directory per service: `core/services/{name}/{name}.cjs` + `__tests__/`
- Switchboard event emission for cross-service reactivity

### Integration Points
- `core/providers/` directory -- new, created by this phase for Ledger and Journal
- `core/services/forge/`, `core/services/conductor/`, `core/services/relay/` -- new service directories
- Forge provides git primitives that Relay orchestrates
- Conductor manages infrastructure that other services depend on

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 03-data-providers-infrastructure-services*
*Context gathered: 2026-03-23*
