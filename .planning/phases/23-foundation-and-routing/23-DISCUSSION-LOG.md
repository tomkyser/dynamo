# Phase 23: Foundation and Routing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-20
**Phase:** 23-foundation-and-routing
**Areas discussed:** Stub handler strategy, Cost tracking data model, Config CLI surface, State file Phase 23 scope

---

## Stub Handler Strategy

### How should cortex-mode stub handlers replicate classic behavior?

| Option | Description | Selected |
|--------|-------------|----------|
| Pass-through wrappers | Stubs import and delegate to existing Ledger handlers. Phase 24 replaces delegation with real logic. | ✓ |
| Independent stubs | Own implementation producing equivalent output without importing Ledger. | |
| Routing-only stubs | Empty shells returning null. Simplest but can't verify equivalence. | |

**User's choice:** Pass-through wrappers
**Notes:** Minimal code, zero behavior risk. cortex mode provably identical to classic.

### SubagentStart/SubagentStop handling (no classic equivalent)

| Option | Description | Selected |
|--------|-------------|----------|
| No-op stubs that log | Create handlers, register events, log receipt, return null. | ✓ |
| Defer to Phase 24 | Don't register until deliberation path needs them. | |

**User's choice:** No-op stubs that log
**Notes:** Proves event routing end-to-end in Phase 23.

### Dispatcher routing structure

| Option | Description | Selected |
|--------|-------------|----------|
| Conditional in dispatcher | Read reverie.mode, swap handler base path. | ✓ |
| Handler map object | Route table keyed by mode + event. | |
| Strategy pattern | Separate dispatcher modules per mode. | |

**User's choice:** Conditional in dispatcher

### Handler naming convention

| Option | Description | Selected |
|--------|-------------|----------|
| Match Ledger names | Same filenames, only base path swaps. | |
| Spec names with mapping | Use REVERIE-SPEC names, add mapping in dispatcher. | ✓ |
| Spec names, separate switch | Two switch blocks. | |

**User's choice:** Spec names with mapping
**Notes:** Reverie gets its own naming identity.

---

## Cost Tracking Data Model

### Database choice

| Option | Description | Selected |
|--------|-------------|----------|
| Separate SQLite DB | New cost-store.cjs in terminus/. Independent lifecycle. | (initially selected) |
| Extend session-store | Add cost tables to existing sessions.db. | |
| JSON file | Simple but no query capability. | |

**User's choice:** Initially selected separate SQLite, then **deferred entirely**.

### Critical design principle established

The user clarified that on Max subscription:
- All Dynamo-native LLM operations should use native Claude Code subagents (zero cost)
- The only external API costs are Graphiti's own infrastructure (embeddings, entity extraction)
- There is nothing for Dynamo to track cost-wise

**Outcome:** COST-01, COST-02, COST-04 deferred. COST-03 revised to OPS-MON-01 (subagent spawn tracking) and OPS-MON-02 (rate limit detection).

### Spec revision cascade

User identified that this principle cascades across all spec documents. Discussion paused to revise:
- REVERIE-SPEC.md: Removed billing_model, cost budgets, API plan fallback; rewrote cost model
- DYNAMO-PRD.md: Revised cost section, CORTEX-03 description
- MASTER-ROADMAP.md: Updated M2 goal, CORTEX-01/03, guiding principles
- REQUIREMENTS.md: Deferred COST-01/02/04, added OPS-MON-01/02
- ROADMAP.md: Updated Phase 23/24/26 requirements and success criteria

---

## Config CLI Surface

### Nested key access

| Option | Description | Selected |
|--------|-------------|----------|
| Dot notation | dynamo config get reverie.mode | ✓ |
| Flat key-value | Top-level only. | |

**User's choice:** Dot notation

### Validation strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Validate known keys | Validation map for known paths. Unknown keys accepted freely. | ✓ |
| Accept anything | No validation. | |
| Strict schema validation | Reject unknown keys. | |

**User's choice:** Validate known keys

### Module location

| Option | Description | Selected |
|--------|-------------|----------|
| lib/config.cjs | New shared module in lib/. | ✓ |
| Inline in CLI router | Cases in dynamo.cjs. | |
| subsystems/switchboard/config.cjs | Operations subsystem. | |

**User's choice:** lib/config.cjs (~100 LOC)

### Reload behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate, no restart | Config loaded fresh from disk on every hook dispatch. | ✓ |
| Require session restart | Cached at session start. | |

**User's choice:** Immediate, no restart

---

## State File Phase 23 Scope

### Schema scope

| Option | Description | Selected |
|--------|-------------|----------|
| Core sections live, rest stubbed | Live: activation_map, domain_frame, predictions, processing. Stubbed: self_model, relationship_model, injection_history, pending_associations. | ✓ |
| Full schema live | All 8 sections. | |
| Minimal skeleton only | Just version + activation_map. | |

**User's choice:** Core sections live, rest stubbed

### Storage format

| Option | Description | Selected |
|--------|-------------|----------|
| Pure JSON with atomic writes | JSON file, tmp+rename, corruption resets to defaults. | ✓ |
| SQLite-backed state | More robust but spec says JSON, no concurrency concern. | |

**User's choice:** Pure JSON with atomic writes

### Activation module completeness

| Option | Description | Selected |
|--------|-------------|----------|
| Full 1-hop spreading | Complete activation.cjs including graph propagation. Tests mock graphData. | ✓ |
| In-memory only | Map ops only, no graph queries until Phase 24. | |
| Separate modules | activation.cjs + propagation.cjs. | |

**User's choice:** Full 1-hop spreading

---

## Claude's Discretion

- Entity extraction pattern details (regex/patterns for project names, file paths, function names, technical terms)
- Domain frame keyword sets for 5 categories
- Sublimation score formula weights and default thresholds
- Internal module organization within subsystems/reverie/

## Deferred Ideas

- Dollar-cost tracking (COST-01/02/04) -- no cost to track on Max subscription
- Session naming migration to subagents -- Phase 24 (IV-07)
- API plan support as separate cc/ adapter -- only if future need arises
