# Phase 12: Integration Surface & Backfill - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Expose Reverie's capabilities through CLI commands via Pulley, complete the submodule management lifecycle through Forge/Relay, finish the self-organizing taxonomy with governance rules and hard caps, complete the source-reference association model, and enable historical data import through a backfill-specific formation pathway. This phase delivers: CLI surface for status/inspect/history/reset with full subcommand trees (INT-02), Reverie as a managed git submodule discoverable and bootable through Armature (INT-03), self-organizing taxonomy with domain creation/merge/split/retire and proactive cap pressure (FRG-07), source-reference model with association-based linking and formation-time impressions (FRG-08), and historical data backfill from Claude conversation exports with hybrid framing and equal trust treatment (FRG-10).

</domain>

<decisions>
## Implementation Decisions

### CLI Command Design (INT-02)
- **D-01:** `dynamo reverie status` shows an operational dashboard — current mode (Active/Passive/REM/Dormant), session topology health, fragment counts (working/active/archive), Self Model version, last REM timestamp, domain count, association index size. One-screen overview of everything. All three Pulley output modes (human/json/raw).
- **D-02:** `dynamo reverie inspect` provides full drill-down via subcommands across both memory and personality:
  - `inspect fragment <id>` — full fragment with frontmatter + body
  - `inspect domains` — all domains with fragment counts, hierarchy, archived status
  - `inspect associations <entity>` — association graph around an entity
  - `inspect self-model` / `inspect identity` / `inspect relational` / `inspect conditioning` — Self Model aspect inspection
- **D-03:** `dynamo reverie history` provides multiple timeline lenses via subcommands:
  - `history sessions` — chronological session list with timestamps, mode, fragment count formed, REM outcome (promoted/discarded counts), conditioning drift
  - `history fragments` — chronological fragment formation with type, domains, decay status. Filterable by domain, type, or time range
  - `history consolidations` — REM events timeline
- **D-04:** `dynamo reverie reset` uses scoped resets with safety:
  - `reset fragments` — wipe all fragments, keep Self Model
  - `reset self-model` — reinitialize from cold start
  - `reset all` — full factory reset
  - Each requires `--confirm` flag. No silent destruction.

### Submodule Management (INT-03)
- **D-05:** Reverie installs and updates as a git submodule managed by Forge/Relay. Module is discoverable through Armature's plugin/module lifecycle — manifest validation, dependency checking, enable/disable, two-phase boot. Existing Relay `install` and Forge git ops handle the mechanics. Phase 12 validates the end-to-end path: clone submodule -> validate manifest -> register via Circuit -> boot through lifecycle.

### Self-Organizing Taxonomy (FRG-07)
- **D-06:** Proactive REM pressure for cap enforcement. When approaching caps (80% threshold — e.g., 80+ domains out of 100), REM prioritizes merge/retire operations in its editorial pass. The cap is a pressure signal, not a hard wall. REM gets more aggressive about merging near-synonyms and retiring sparse domains as the count climbs. Hard caps: 100 domains, 200 entities per domain, 10K association edges.
- **D-07:** Domain splits triggered by fragment density. When a domain's fragment count crosses a threshold (e.g., 50+ fragments) AND the LLM editorial pass identifies distinct sub-clusters within it, split into child domains. The `parent_domain_id` column in the domains table already supports hierarchy. Organic growth drives splits — the trigger is quantitative, the decision is LLM-editorial.
- **D-08:** Domain retirement via decay. Domains with no active (non-decayed) fragments for N consecutive REM cycles get archived (`archived=true`). The domain record stays for history but stops appearing in formation fan-out and recall routing. The `archived` and `fragment_count` columns already exist in the domains table.
- **D-09:** All taxonomy operations (merge, split, retire) produce consolidation-type fragments that record why — "domain X split because...", "domain Y retired after N cycles of inactivity." The taxonomy's evolution becomes part of Reverie's memory. Extends Phase 11's existing merge narrative pattern (D-08, consolidation fragments via fragmentWriter) to splits and retirements.

### Source-Reference Model (FRG-08)
- **D-10:** Association-only linking. No special chain model or terminal nodes. Source-reference fragments are just another fragment type whose association edges connect them to related experiential fragments naturally through the existing association graph. The `source_locator` is metadata on the fragment, not a graph node. Let the existing association graph handle provenance linking organically.
- **D-11:** Formation-time impression. When source material appears in conversation, the formation subagent produces a source-reference fragment through the same subjective prompt framing as experiential fragments ("What does this source mean to *you*?"). The `source_locator` is metadata attached to the fragment. The body is the subjective impression. No special pipeline — the existing formation pipeline handles it, with the fragment assembler already detecting `source_locator` presence for type classification.
- **D-12:** Write-once source locators. The `content_hash` in `source_locators` captures state at formation time. If the file changes later, the fragment still records Reverie's impression of the *original* source. Memories are of moments, not living documents. No verification during REM.

### Historical Data Backfill (FRG-10)
- **D-13:** Primary input format: Claude conversation exports (JSON). This is the most likely source of historical data for a Claude Code user. Lithograph's JSONL parser is related but distinct — conversation exports have a different structure than live transcript JSONL. Parse conversation turns, extract stimuli, feed through formation.
- **D-14:** Hybrid framing — Claude's discretion. The formation subagent gets context about the conversation age and adjusts framing naturally. Some backfilled conversations may be recent and feel experiential; others are distant history. The subagent decides per-conversation whether to process retrospectively ("reading about something that happened") or experientially ("experiencing this"). Fragment frontmatter marks `origin='backfill'` for provenance regardless of framing choice.
- **D-15:** Equal treatment for trust/decay. No weight or decay penalty for backfilled fragments. The `origin='backfill'` metadata is informational only. Fragment quality speaks for itself through normal decay and REM evaluation. The LLM formation quality is the same regardless of source — if the formation subagent produces a strong impression from historical data, it deserves equal weight.

### Claude's Discretion
- Backfill invocation design — CLI command structure, dry-run support, batch processing approach, progress reporting mechanism
- Taxonomy cap thresholds and pressure gradients (exact numbers for when pressure starts, how aggressively REM merges/retires)
- Domain split fragment count threshold (50+ is the discussed starting point, exact value is tunable)
- Consecutive REM cycles threshold for domain retirement (exact N)
- CLI output formatting details for inspect/history subcommands
- Submodule discovery and boot integration details with Armature lifecycle

### Folded Todos
None — no pending todos matched Phase 12 scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Spec
- `.claude/new-plan.md` — Architecture plan. Absolute canon. Service domains, IoC patterns, layer hierarchy.
- `.claude/reverie-spec-v2.md` — Reverie module specification. Canon. Sections critical for Phase 12:
  - Section 3.5 (Fragment Types) — Five fragment types, source-reference characteristics
  - Section 3.8 (Association Index) — Table descriptions including domains, source_locators
  - Section 3.10 (Self-Organizing Taxonomy) — Domain creation/merge/split/retire, hard caps, convergence
  - Section 3.11 (Source References) — Source-reference fragment model, source_locator field, experiential relationship
  - Section 3.12 (Formation Example) — Multi-angle formation in practice
  - Section 9.6 (EXPERIMENTAL: Taxonomy convergence) — Self-organizing taxonomy convergence signal

### Requirements
- `.planning/REQUIREMENTS.md` — Phase 12 requirements: INT-02, INT-03, FRG-07, FRG-08, FRG-10

### Prior Phase Context
- `.planning/phases/07-foundation-infrastructure/07-CONTEXT.md` — Phase 7 decisions:
  - D-01: Reverie as git submodule from day one (INT-03 validates end-to-end)
  - D-09: Fragment lifecycle directories (working/active/archive)
  - D-12: Full 12-table association index including domains, source_locators, domain_relationships
- `.planning/phases/09-fragment-memory-engine/09-CONTEXT.md` — Phase 9 decisions:
  - D-08/D-09/D-10: No predefined domains, organic emergence, near-synonyms accumulate (taxonomy governance builds on this)
  - D-14: Fragment type is emergent property (source-reference detection via source_locator, not routing)
  - D-16/D-17: Formation prompt engineering is experimental, design for replaceability (backfill reuses same approach)
- `.planning/phases/11-rem-consolidation/11-CONTEXT.md` — Phase 11 decisions:
  - D-07: Promote or discard gate (no archive path for REM-rejected)
  - D-08: LLM-driven editorial pass with domain dedup — Phase 12 adds governance rules on top
  - D-09: Recall meta-fragment creation during REM
  - Deferred: Self-organizing taxonomy (FRG-07) and source-reference model (FRG-08)

### Existing Code (read before modifying)
- `core/sdk/pulley/pulley.cjs` — Pulley CLI framework with registerCommand(), route(), subcommand support, 3 output modes. INT-02 registers Reverie commands here.
- `core/sdk/pulley/platform-commands.cjs` — Reference for how to register module commands (status, health, version, install, update, config pattern).
- `core/services/forge/forge.cjs` — Git operations service. Submodule management for INT-03.
- `core/services/relay/relay.cjs` — Install/update/sync operations. Module lifecycle for INT-03.
- `modules/reverie/components/fragments/association-index.cjs` — 12-table DuckDB schema including domains (parent_domain_id, archived, fragment_count), source_locators, domain_relationships. Taxonomy governance operates on these tables.
- `modules/reverie/components/fragments/fragment-writer.cjs` — Atomic dual-provider writes. Backfill uses same FragmentWriter.
- `modules/reverie/components/fragments/decay.cjs` — Deterministic decay. Domain retirement uses fragment decay status.
- `modules/reverie/components/formation/formation-pipeline.cjs` — Formation pipeline orchestrator. Backfill feeds through this (or a variant).
- `modules/reverie/components/formation/fragment-assembler.cjs` — Already detects source_locator for type classification. Source-reference model leverages this.
- `modules/reverie/components/formation/prompt-templates.cjs` — Formation prompt templates. Backfill hybrid framing extends these.
- `modules/reverie/components/rem/editorial-pass.cjs` — LLM-driven domain dedup. Taxonomy governance extends this with split/retire logic.
- `modules/reverie/components/rem/rem-consolidator.cjs` — REM entry point. Taxonomy operations integrate here.
- `modules/reverie/lib/schemas.cjs` — Zod schemas including source_locator, all fragment types.
- `modules/reverie/lib/constants.cjs` — Module constants. Taxonomy caps and thresholds added here.
- `modules/reverie/reverie.cjs` — Module entry point. CLI command registration integrates here.
- `core/providers/lithograph/` — Transcript provider. Backfill may reference for format understanding (distinct from conversation exports).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Pulley CLI** (`core/sdk/pulley/`): Full command framework with registerCommand(), longest-match subcommand routing, three output modes (human/json/raw), auto-generated help. platform-commands.cjs is the pattern to follow for Reverie commands.
- **Forge + Relay** (`core/services/forge/`, `core/services/relay/`): Git operations + install/update/sync. Complete infrastructure for submodule management. INT-03 validates the path end-to-end.
- **Association Index** (`fragments/association-index.cjs`): 12-table schema with domains (parent_domain_id, archived, fragment_count), source_locators, domain_relationships. Taxonomy governance operates directly on these tables via Ledger.
- **Editorial Pass** (`rem/editorial-pass.cjs`): LLM-driven domain dedup already built. Taxonomy governance extends this with split (fragment density trigger) and retire (decay-based) operations.
- **Formation Pipeline** (`formation/`): Complete pipeline — attention gate, prompt templates, fragment assembler, formation pipeline orchestrator. Backfill feeds conversation turns through this pipeline with hybrid framing.
- **Fragment Assembler** (`formation/fragment-assembler.cjs`): Already detects source_locator presence for source-reference type classification. No changes needed for D-11.
- **FragmentWriter** (`fragments/fragment-writer.cjs`): Atomic dual-provider writes. Both taxonomy narrative fragments and backfill fragments use this.
- **REM Consolidator** (`rem/rem-consolidator.cjs`): Single entry point for all consolidation. Taxonomy governance integrates here for cap pressure signaling.

### Established Patterns
- **Options-based DI**: All new components take injected dependencies.
- **Contract shapes**: SHAPE constant + createContract() for frozen APIs.
- **Event emission**: Switchboard-based events on state changes.
- **Pulley command registration**: registerCommand(name, handler, meta) pattern with output formatting via formatOutput().
- **Journal-first writes**: Fragment mutations go Journal-first with Ledger rollback.

### Integration Points
- **Reverie module -> Pulley**: Register Reverie CLI commands during module boot via Circuit facade.
- **Editorial Pass -> Taxonomy Governance**: Extend editorial pass with split/retire logic alongside existing merge.
- **REM Consolidator -> Cap Pressure**: Signal cap proximity to editorial pass for aggressive merge/retire behavior.
- **Formation Pipeline -> Backfill**: Feed backfill conversation turns as stimuli with origin='backfill' metadata.
- **Forge/Relay -> Armature**: Submodule clone triggers manifest validation and Circuit registration.

</code_context>

<specifics>
## Specific Ideas

### Full Subcommand Trees for CLI
The user chose "both with subcommands" for both inspect and history — full inspection and timeline surfaces. This means Reverie's CLI is a serious diagnostic tool, not just a status check. The subcommand tree gives operators visibility into every layer: memory (fragments, domains, associations), personality (identity, relational, conditioning), and evolution (sessions, fragments, consolidations).

### Association-Only Source Model (Not Chain Termini)
The user rejected the chain-termini approach in favor of organic association linking. Source-reference fragments are just fragments. Their source_locator is metadata, not a graph node. This keeps the association graph uniform — no special-case traversal logic. The existing association edge types (entity co-occurrence, domain overlap, temporal proximity) naturally connect source-reference fragments to the experiential fragments they spawned.

### Hybrid Framing with Equal Trust
The most interesting combination: the formation subagent gets to decide whether to frame retrospectively or experientially per-conversation, BUT the resulting fragments get no weight penalty. This means if the LLM reads old history and forms a strong impression, that impression is as valid as one formed in real-time. The `origin='backfill'` marker is purely informational — for the user's benefit via `inspect`, not for the system's decay calculations. This is a philosophical statement: memories reconstructed with care are as real as memories formed in the moment.

### Taxonomy as Memory
All taxonomy operations produce consolidation-type fragments. When Reverie splits a domain or retires one, it records *why* as a fragment — part of its own memory. This means the taxonomy's evolution is queryable through recall, inspectable through CLI, and subject to REM evaluation like any other fragment. The system's structural evolution is part of its experiential history.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-integration-surface-backfill*
*Context gathered: 2026-03-25*
