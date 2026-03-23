# Phase 7: Foundation Infrastructure - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Resolve irreversible architectural decisions and establish the data schemas, write integrity guarantees, and foundational abstractions that every subsequent Reverie component depends on. This phase delivers: Wire write coordinator retry/WAJ (PLT-01), fragment schema with JSON frontmatter and zod validation (FRG-01, FRG-02), FragmentWriter atomic dual-provider writes (FRG-09), Self Model schema with cold start (SM-01, SM-02, SM-03, SM-05), association index tables (FRG-05), and deterministic decay function (FRG-06).

</domain>

<decisions>
## Implementation Decisions

### Reverie Module Structure
- **D-01:** Reverie is developed as a git submodule from day one. Set up `modules/reverie/` as a separate git repo immediately. Validates Circuit module registration + Forge/Relay submodule lifecycle from the start.
- **D-02:** Internal organization is by component domain: `self-model/`, `fragments/`, `session/`, `rem/`, `context/`, `modes/`. Each directory contains its own implementation + tests. Mirrors the 6 architectural components (Self Model Manager, Fragment Engine, Session Manager, REM Consolidator, Context Manager, Mode Manager).
- **D-03:** Reverie data directory is configurable via Magnet global state and config.json. Default: `~/.dynamo/reverie/` (outside the repo). Keeps data separate from code, survives module updates, allows per-installation customization.
- **D-04:** Circuit manifest declares all 9 services + 2 providers as dependencies upfront. Not all are used in Phase 7 but the manifest is the truth contract. Full set: wire, magnet, switchboard, commutator, lathe, forge, relay, conductor, assay + ledger, journal.

### Self Model File Layout
- **D-05:** Self Model narrative state uses one Journal file per aspect: `identity-core.md`, `relational-model.md`, `conditioning.md`. Each with JSON frontmatter for structured fields + markdown body for narrative content. Versioning is per-aspect (e.g., sm-identity-v47, sm-relational-v12).
- **D-06:** Self Model structured state uses one Ledger table per field type: `sm_value_orientations`, `sm_expertise_map`, `sm_trust_calibration`, `sm_interaction_rhythm`, `sm_attention_biases`, `sm_association_priors`, `sm_sublimation_sensitivity`. Each has its own schema optimized for the data shape.
- **D-07:** Cold start produces minimal sparse defaults per spec Section 2.3, PLUS an entropy engine that emulates a well-adjusted human adult's mood. The entropy engine introduces stochastic variance into Self Model baseline trait weights per session. Conditioning still shifts organically toward the user's task as chat progresses. The entropy amplitude is tunable and starts subtle.
- **D-08:** The entropy engine uses **conditioned entropy** — starts with random variance but evolves through REM consolidation. Over time, the system learns which mood states produce good interactions with this specific user and adjusts the distribution. The entropy becomes personalized through experience, making it part of the Self Model's conditioning cycle.

### Fragment Storage Strategy
- **D-09:** Fragments use lifecycle directories: `fragments/working/` (pre-REM), `fragments/active/` (post-REM consolidated), `fragments/archive/` (decayed below threshold, soft-delete per Pitfall 4). REM physically moves files from working/ to active/ as the promotion gate.
- **D-10:** Fragment files are named by ID only: `frag-2026-03-22-a7f3b2c1.md`. The ID already contains the date. Type and domain are in frontmatter and Ledger. No renaming needed if type changes during REM.
- **D-11:** FragmentWriter uses journal-first with Ledger rollback. Write the fragment file to Journal first (atomic via Bun.write), then write association index rows to Ledger via Wire write coordinator. If Ledger write fails after retry, delete the Journal file (rollback). Journal is the source of truth.
- **D-12:** Association index tables are designed with the full ~12 table schema upfront. Define all tables now: domains, entities, associations, attention_tags, formation_groups, fragment_decay, source_locators, plus join tables. Even if Phase 7 only populates a subset, the schema is the contract. Avoids migrations later.

### JSON Frontmatter Transition
- **D-13:** Replace the existing YAML parser in `journal/frontmatter.cjs` with a JSON frontmatter parser. Clean break — no dual-format support. The YAML parser served its purpose as scaffolding; no production data exists. Aligned with platform convention (JSON for structured data).
- **D-14:** JSON frontmatter uses triple-dash delimiters: `---\n{json}\n---\n\nBody text`. Keeps the universal frontmatter delimiter that editors and tools recognize. Content between dashes is JSON instead of YAML.
- **D-15:** Fragment and Self Model schema validation uses zod 4.x (new dependency). Already in the tech stack as required for MCP SDK v2. Better error messages, nested object support, type inference. `lib/schema.cjs` stays for platform-level validation — zod is the module-level tool.

### Claude's Discretion
- Write-ahead journal format and recovery mechanism for the Wire write coordinator (PLT-01)
- Exact DuckDB DDL for the ~12 association index tables
- Decay function implementation details (the formula is specified in the spec; the implementation approach is engineering)
- Entropy engine internal design — how mood variance maps to Self Model trait weight adjustments, what the amplitude range is, how REM evaluates mood state outcomes

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Spec
- `.claude/new-plan.md` — Architecture plan. Absolute canon. Engineering principles, layer hierarchy, platform decisions.
- `.claude/reverie-spec-v2.md` — Reverie module specification. Canon. Sections critical for Phase 7:
  - Section 2 (Self Model) — Self Model state schema, Identity Core, Relational Model, Conditioning fields and storage targets
  - Section 2.3 (Cold Start) — Initialization from seed prompt with sparse defaults
  - Section 3.3 (Fragment Schema) — Full frontmatter field specification with example
  - Section 3.5 (Fragment Types) — Five fragment types and their characteristics
  - Section 3.8 (Association Index) — Table descriptions: domains, entities, associations, attention_tags
  - Section 3.9 (Decay Function) — Deterministic decay formula with all parameters
  - Section 3.11 (Source References) — Source-reference fragment model and source_locator field

### Research
- `.planning/research/SUMMARY.md` — Research synthesis with phase ordering rationale and confidence assessment
- `.planning/research/PITFALLS.md` — Critical pitfalls. Phase 7 addresses: Pitfall 1 (write coordinator data loss), Pitfall 4 (confabulation from split-storage), Pitfall 15 (YAML parsing fragility)
- `.planning/research/ARCHITECTURE.md` — Component responsibilities, DuckDB single-writer constraint, session spawning approach
- `.planning/research/FEATURES.md` — Feature classification and dependency graph
- `.planning/research/STACK.md` — Technology stack decisions, zero new npm deps for core, zod for schema validation

### Requirements
- `.planning/REQUIREMENTS.md` — M2 requirements with traceability. Phase 7 requirements: PLT-01, SM-01, SM-02, SM-03, SM-05, FRG-01, FRG-02, FRG-05, FRG-06, FRG-09

### Existing Code (read before modifying)
- `core/services/wire/write-coordinator.cjs` — Current write coordinator (lacks retry logic — PLT-01 target)
- `core/providers/journal/frontmatter.cjs` — Current YAML frontmatter parser (to be replaced with JSON parser)
- `core/providers/journal/journal.cjs` — Journal provider (update to use new JSON frontmatter)
- `core/services/magnet/magnet.cjs` — State management with 3-tier scoping
- `core/sdk/circuit/circuit.cjs` — Module registration API (how Reverie registers)
- `core/sdk/circuit/module-manifest.cjs` — Manifest validation (Reverie's manifest must pass this)
- `lib/schema.cjs` — Existing validation (stays for platform; zod is for module-level)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Wire write coordinator** (`wire/write-coordinator.cjs`): Priority queue + batching already built. Needs retry logic, exponential backoff, and WAJ added — enhancement, not rewrite.
- **Journal provider** (`journal/journal.cjs`): Full CRUD + query with frontmatter metadata matching. The provider contract is stable — only the frontmatter format changes.
- **Ledger provider** (`ledger/`): DuckDB + SQLite backends with write/read/query methods. Association index tables will use the existing Ledger API.
- **Magnet** (`magnet/magnet.cjs`): 3-tier state (global/session/module) with persistence provider. Self Model uses module scope + global scope for config.
- **lib/result.cjs**: ok/err pattern used throughout. All new code follows this convention.
- **lib/contract.cjs**: createContract() for frozen API surfaces. All new abstractions (FragmentWriter, Self Model Manager, etc.) should use this.
- **Circuit module API** (`circuit/circuit.cjs`): registerModule with manifest validation, facade-only service access, namespaced event proxy. Reverie registers through this.

### Established Patterns
- **Options-based DI**: Every component takes an options object with injected dependencies. Test isolation via mock injection. (Validated in v0, used throughout M1.)
- **Contract shapes**: SHAPE constant + createContract() for frozen public APIs.
- **Event emission**: Switchboard-based events on mutations (e.g., state:changed, journal:write).
- **File structure**: Each service/provider in its own directory with implementation + \_\_tests\_\_/.

### Integration Points
- **Circuit.registerModule()**: Reverie's entry point into the platform. Manifest declares dependencies, registerFn receives facade access.
- **Wire.queueWrite()**: How Reverie writes to Ledger — all writes go through Wire's write coordinator.
- **Journal.write()/Journal.query()**: Fragment file CRUD. Frontmatter format change is the main impact.
- **Assay.search()**: Fragment recall will use this in Phase 9. Schema decisions now affect query patterns later.
- **Magnet.set('module', 'reverie', ...)**: Self Model in-memory state cache.

</code_context>

<specifics>
## Specific Ideas

### Entropy Engine (User's Idea)
The user introduced the concept of an **entropy engine** at the Self Model cold start layer. This is not a configurable personality profile — it is a mechanism that introduces stochastic variance into Self Model baseline trait weights, emulating a well-adjusted human adult's mood. Key characteristics:
- Starts with random per-session variance (subtle amplitude)
- Conditioning still shifts organically toward the user's task as interaction progresses
- The entropy engine's parameters **evolve through REM** (conditioned entropy) — over time, the system learns which mood states produce good interactions with this specific user
- The entropy becomes personalized, making even the "randomness" a product of accumulated experience
- Amplitude is tunable — low influence initially, potentially stronger as the Self Model matures
- This supports the spec's philosophy that personality is *earned through interaction*, not configured — while preventing the flat-neutral uncanny valley of a blank-slate cold start

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-foundation-infrastructure*
*Context gathered: 2026-03-23*
