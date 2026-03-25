# Phase 12: Integration Surface & Backfill - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 12-integration-surface-backfill
**Areas discussed:** CLI command design, Taxonomy governance, Source-reference model, Backfill pathway

---

## CLI Command Design

### Status Command

| Option | Description | Selected |
|--------|-------------|----------|
| Operational dashboard | Current mode, session health, fragment counts, Self Model version, last REM, domain count, index size | ✓ |
| Minimal health check | Mode + session state + traffic light health | |
| Layered verbosity | Default minimal, --verbose, --debug tiers | |

**User's choice:** Operational dashboard
**Notes:** One-screen overview of everything.

### Inspect Command

| Option | Description | Selected |
|--------|-------------|----------|
| Fragment-focused | inspect fragment/domains/associations | |
| Self Model focused | inspect identity/relational/conditioning | |
| Both with subcommands | Full inspection surface across memory + personality | ✓ |

**User's choice:** Both with subcommands
**Notes:** Full drill-down across all components.

### History Command

| Option | Description | Selected |
|--------|-------------|----------|
| Session history | Chronological session list with REM outcomes | |
| Fragment timeline | Chronological fragments filterable by domain/type/time | |
| Both via subcommands | sessions, fragments, consolidations lenses | ✓ |

**User's choice:** Both via subcommands
**Notes:** Multiple timeline lenses on the same data.

### Reset Command

| Option | Description | Selected |
|--------|-------------|----------|
| Scoped resets | reset fragments/self-model/all with --confirm | ✓ |
| Single full reset | Factory reset only | |
| Granular with dry-run | Scoped + --dry-run | |

**User's choice:** Scoped resets
**Notes:** Each requires --confirm flag.

---

## Taxonomy Governance

### Cap Enforcement Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Proactive REM pressure | Cap as pressure signal, REM gets aggressive near 80% | ✓ |
| Hard wall with rejection | At cap, new creation fails | |
| Soft cap with overflow | Advisory cap, burst then consolidate | |

**User's choice:** Proactive REM pressure
**Notes:** Cap is a pressure signal, not a hard wall.

### Domain Split Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Fragment density trigger | 50+ fragments + LLM identifies sub-clusters | ✓ |
| Entity divergence trigger | Non-overlapping entity sets | |
| Claude's discretion | No programmatic trigger, LLM decides | |

**User's choice:** Fragment density trigger
**Notes:** Quantitative trigger, LLM editorial decision.

### Domain Retirement

| Option | Description | Selected |
|--------|-------------|----------|
| Decay-based | No active fragments for N consecutive REM cycles -> archived | ✓ |
| Merge-first, then retire | Attempt merge before retirement | |
| Manual only via CLI | User-controlled retirement | |

**User's choice:** Decay-based
**Notes:** Domain record stays with archived=true for history.

### Taxonomy Narratives

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, all operations | Splits and retirements also produce consolidation fragments | ✓ |
| Merges only | Only merge narratives (Phase 11 existing) | |
| Ledger-only audit log | Ledger table, not fragments | |

**User's choice:** Yes, all operations
**Notes:** Taxonomy evolution becomes part of Reverie's memory.

---

## Source-Reference Model

### Association Chain Termini

| Option | Description | Selected |
|--------|-------------|----------|
| Source locator as terminal node | Explicit chain: recall -> experiential -> source-reference -> locator | |
| Direct locator on every fragment | No chain, each fragment directly records provenance | |
| Association-only linking | No special chain model, natural association graph | ✓ |

**User's choice:** Association-only linking
**Notes:** Source-reference fragments are just another fragment type. source_locator is metadata, not a graph node.

### Experiential Relationship

| Option | Description | Selected |
|--------|-------------|----------|
| Formation-time impression | Same subjective prompts, source_locator as metadata | ✓ |
| Dual-fragment pattern | Two fragments per source: experiential + source-reference | |
| Deferred source analysis | Minimal at formation, enriched during REM | |

**User's choice:** Formation-time impression
**Notes:** No special pipeline. Existing formation handles it.

### Source Drift Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Write-once | content_hash is fingerprint, not validation. Memories are of moments. | ✓ |
| Verify during REM | Check hash, flag drifted sources | |
| You decide | Claude's discretion | |

**User's choice:** Write-once
**Notes:** Memories are of moments, not living documents.

---

## Backfill Pathway

### Input Format

| Option | Description | Selected |
|--------|-------------|----------|
| Claude conversation exports | Primary target: Claude's JSON export format | ✓ |
| Generic transcript format | Intermediate format, user handles conversion | |
| Multiple formats via adapters | Adapter pattern with Claude adapter first | |

**User's choice:** Claude conversation exports
**Notes:** Most likely source of historical data for Claude Code users.

### Formation Framing

| Option | Description | Selected |
|--------|-------------|----------|
| Retrospective framing | Explicitly reading history, "if you'd been there" | |
| Simulated experiential | Feed as if experiencing live, with origin marker | |
| Hybrid — Claude's discretion | LLM decides per-conversation based on age/context | ✓ |

**User's choice:** Hybrid — Claude's discretion
**Notes:** Some conversations are recent and feel experiential; others are distant history.

### Trust/Decay Parameters

| Option | Description | Selected |
|--------|-------------|----------|
| Lower initial weight | 0.6x discount for reconstructed memories | |
| Equal weight, different decay | Same weight, faster decay | |
| Equal treatment | No penalty. origin='backfill' is informational only. | ✓ |

**User's choice:** Equal treatment
**Notes:** Memories reconstructed with care are as real as memories formed in the moment.

### Backfill Invocation

| Option | Description | Selected |
|--------|-------------|----------|
| CLI command | dynamo reverie backfill <path> [--dry-run] [--limit N] | |
| Batch background process | Queue directory of exports, background Secondary session | |
| You decide | Claude's discretion | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion on invocation design.

---

## Claude's Discretion

- Backfill invocation design (CLI structure, dry-run, batch processing, progress reporting)
- Taxonomy cap pressure thresholds and gradients
- Domain split fragment count threshold (50+ discussed, exact value tunable)
- Consecutive REM cycles for retirement (exact N)
- CLI output formatting for inspect/history subcommands
- Submodule discovery and boot integration with Armature lifecycle

## Deferred Ideas

None — discussion stayed within phase scope.
