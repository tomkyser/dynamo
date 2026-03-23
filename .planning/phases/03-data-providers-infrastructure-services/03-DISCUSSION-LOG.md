# Phase 3: Data Providers & Infrastructure Services - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-23
**Phase:** 03-data-providers-infrastructure-services
**Areas discussed:** Provider interface contract, DuckDB + Bun risk strategy, Conductor scope, Relay operational model

---

## Provider Interface Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Two separate contracts | State providers (load/save/clear) and data providers (read/write/query/delete) are different shapes. Armature registers them in different domains. | ✓ |
| Shared base, specialized extensions | Minimal base contract that both extend. More ceremony but single 'provider' concept. | |
| Unified single contract | Force both into one shape. Uniform but leaky abstraction. | |

**User's choice:** Two separate contracts
**Notes:** Clean separation — no awkward forced abstraction.

### Query API Sub-question

| Option | Description | Selected |
|--------|-------------|----------|
| Unified query method | query(criteria) where each provider translates internally. Assay optimizes in Phase 6. | ✓ |
| Capability-declared queries | Providers register supported query types. More explicit but complex contract. | |
| Provider-specific query + shared fallback | Base query(criteria) plus optional queryRaw(native) for power users. | |

**User's choice:** Unified query method
**Notes:** Providers translate criteria internally. Assay handles optimization later.

---

## DuckDB + Bun Risk Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| bun:sqlite fallback | Build behind contract. Primary: DuckDB. If fails, swap to bun:sqlite. Both SQL, identical contract. | ✓ |
| DuckDB or nothing | Commit to DuckDB. If fails, Ledger stays stubbed. | |
| Start with bun:sqlite | Skip DuckDB risk. Build on bun:sqlite now, migrate later. | |

**User's choice:** bun:sqlite fallback
**Notes:** Same contract surface, transparent swap.

### Validation Sub-question

| Option | Description | Selected |
|--------|-------------|----------|
| Validate first | First task: smoke test DuckDB on Bun. If works, build on DuckDB. If not, build on bun:sqlite. | ✓ |
| Build optimistically | Build full Ledger on DuckDB, test at end. | |
| Build both from start | Implement both backends, ship whichever works. | |

**User's choice:** Validate first
**Notes:** No wasted effort — test before building.

---

## Conductor's Actual Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Dependency health monitor | Checks platform dependencies available. Docker stubbed. Real value now, expandable later. | |
| Full infrastructure manager | Build Docker/Compose lifecycle now. Manages process start/stop/health. More complete. | ✓ |
| Minimal contract stub | Define contract, mostly pass-through. Real work deferred to Phase 6. | |

**User's choice:** Full infrastructure manager
**Notes:** Build Docker/Compose lifecycle now even before Wire needs it.

### Docker Degradation Sub-question

| Option | Description | Selected |
|--------|-------------|----------|
| Graceful degradation | Check Docker availability. If present, full management. If absent, skip container ops. | ✓ |
| Require Docker | Hard dependency. Fail init() if Docker not running. | |
| Docker optional with feature flag | Config toggle conductor.docker.enabled (default false). | |

**User's choice:** Graceful degradation
**Notes:** Platform works without Docker installed.

---

## Relay Operational Model

| Option | Description | Selected |
|--------|-------------|----------|
| Platform + plugins + modules | Manages Dynamo, plugins, and modules via Forge. | |
| Platform only | Only Dynamo self-management. Simpler scope. | |
| Everything including config migration | Same as option 1 plus config schema evolution and defaults backfill. | ✓ |

**User's choice:** Everything including config migration
**Notes:** Full lifecycle management including schema evolution across version transitions.

### Rollback Sub-question

| Option | Description | Selected |
|--------|-------------|----------|
| Git-based rollback | Tag before ops, atomic commits via Forge. Rollback = git reset to tag. | ✓ |
| File-system snapshots | Copy files to .backup/ directory. Rollback = restore. Works if git broken. | |
| Both mechanisms | Git primary, file-system fallback for catastrophic git corruption. | |

**User's choice:** Git-based rollback
**Notes:** Leverages existing git infrastructure, no separate backup storage.

---

## Claude's Discretion

- DuckDB schema design, Journal frontmatter parsing, Forge git command set, Conductor health polling, Relay config migration strategy, internal file organization

## Deferred Ideas

None — discussion stayed within phase scope.
