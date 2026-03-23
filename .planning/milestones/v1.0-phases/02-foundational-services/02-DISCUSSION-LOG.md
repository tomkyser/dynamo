# Phase 2: Foundational Services - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-22
**Phase:** 02-foundational-services
**Areas discussed:** Switchboard event model, Commutator hook mapping, Magnet persistence boundary, Service contract pattern

---

## Switchboard Event Model

### Event Namespacing

| Option | Description | Selected |
|--------|-------------|----------|
| Colon-delimited | e.g., 'hook:post-tool-use', 'file:changed'. Simple, grep-friendly, supports wildcard matching on prefixes. | ✓ |
| Dot-delimited hierarchy | e.g., 'hook.postToolUse.write'. Deeper hierarchy, familiar from logging frameworks. | |
| Flat with category prefix | e.g., 'HOOK_POST_TOOL_USE'. No hierarchy, just constants. | |

**User's choice:** Colon-delimited (Recommended)

### Handler Priority

| Option | Description | Selected |
|--------|-------------|----------|
| Numeric priority | Lower = runs first, default 100. Actions ignore priority. | ✓ |
| Named tiers | Pre-defined 'early', 'normal', 'late' tiers. | |
| Pipeline stages | Explicit before/main/after stages. | |

**User's choice:** Numeric priority (Recommended)

### Filter Halt

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, return false to halt | Filter returning false/Err stops pipeline. Rejected payload returns as Err. | ✓ |
| No, filters only transform | All handlers always run. Filters modify but never block. | |
| You decide | Claude discretion. | |

**User's choice:** Yes, return false to halt (Recommended)

### Wildcard Support

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, prefix wildcards | Listen on 'hook:*' catches all 'hook:' events. Suffix wildcard only. | ✓ |
| No wildcards | Only exact event name matches. | |
| You decide | Claude discretion. | |

**User's choice:** Yes, prefix wildcards (Recommended)

---

## Commutator Hook Mapping

### Enrichment Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Tool-aware routing | Inspects tool_name/tool_input, emits domain-specific events. | ✓ |
| Pass-through only | Wraps raw hook JSON as 'hook:{type}' events. | |
| Full semantic graph | Deep inspection of all payloads. | |

**User's choice:** Tool-aware routing (Recommended)

### Directionality

| Option | Description | Selected |
|--------|-------------|----------|
| Inbound-only for now | Receives hooks, emits events. Outbound deferred. | |
| Bidirectional from the start | Handles both inbound and outbound I/O. | ✓ |
| You decide | Claude discretion. | |

**User's choice:** Bidirectional from the start
**Notes:** User chose bidirectional despite recommended inbound-only. Aligns with architecture plan calling Commutator "Shared System I/O Bus" -- bus implies both directions.

### Outbound Path

| Option | Description | Selected |
|--------|-------------|----------|
| Stdout contract owner | Commutator owns hook response format directly. | |
| Event-to-output adapter | Listens for Switchboard events, translates to appropriate output mechanism. | ✓ |
| You decide | Claude discretion. | |

**User's choice:** Event-to-output adapter
**Notes:** Decoupled from stdout specifically -- supports future Wire inter-session output alongside hook stdout.

---

## Magnet Persistence Boundary

### Pre-Provider Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Provider interface now, JSON file fallback | Define contract, ship with JSON file provider via Lathe. | ✓ |
| In-memory only, wire providers later | No persistence until Phase 3. | |
| You decide | Claude discretion. | |

**User's choice:** Provider interface now, JSON file fallback (Recommended)

### State Scoping

| Option | Description | Selected |
|--------|-------------|----------|
| Three-tier: global / session / module | Aligns with Reverie's three-session architecture. | ✓ |
| Two-tier: global / namespaced | Arbitrary namespaces, no built-in session concept. | |
| Flat key-value | No hierarchy, consumers manage namespacing. | |

**User's choice:** Three-tier: global / session / module (Recommended)

### Event Emission

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, all mutations emit events | Every set/delete emits 'state:changed'. | ✓ |
| Opt-in event emission | Silent by default, consumers request emission. | |
| No events, poll-based | Passive store, consumers read when needed. | |

**User's choice:** Yes, all mutations emit events (Recommended)

---

## Service Contract Pattern

### Lifecycle Methods

| Option | Description | Selected |
|--------|-------------|----------|
| init / start / stop / healthCheck | Four methods. init for DI, start/stop for lifecycle, healthCheck for diagnostics. | ✓ |
| start / stop only | Minimal lifecycle. | |
| You decide | Claude discretion. | |

**User's choice:** init / start / stop / healthCheck (Recommended)

### Dependency Declaration

| Option | Description | Selected |
|--------|-------------|----------|
| Options object at init | Dependencies via options, validated with createContract. | ✓ |
| Static dependency list | Exports DEPENDENCIES array. | |
| You decide | Claude discretion. | |

**User's choice:** Options object at init (Recommended)

### File Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Directory per service | core/services/switchboard/switchboard.cjs + __tests__/. | ✓ |
| Single file per service | core/services/switchboard.cjs. | |
| You decide | Claude discretion. | |

**User's choice:** Directory per service (Recommended)

### Self-Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, self-validating | Factory validates own implementation via createContract before returning. | ✓ |
| No, trust the implementation | Contract validation deferred to framework. | |
| You decide | Claude discretion. | |

**User's choice:** Yes, self-validating (Recommended)

---

## Claude's Discretion

- Internal event name dictionary
- Commutator's tool-to-domain mapping table
- Magnet's JSON file provider implementation details
- Lathe's specific method signatures
- healthCheck() return shape

## Deferred Ideas

None -- discussion stayed within phase scope.
