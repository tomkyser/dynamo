# Phase 7: Foundation Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-23
**Phase:** 07-foundation-infrastructure
**Areas discussed:** Reverie module structure, Self Model file layout, Fragment storage strategy, JSON frontmatter transition

---

## Reverie Module Structure

### Development approach

| Option | Description | Selected |
|--------|-------------|----------|
| Submodule from day one | Set up modules/reverie/ as separate git repo immediately. Validates Circuit + Forge/Relay lifecycle. | ✓ |
| In-repo first, extract later | Develop directly in main repo. Simpler dev loop but defers integration validation. | |
| You decide | Claude picks based on engineering tradeoffs. | |

**User's choice:** Submodule from day one
**Notes:** None

### Internal component organization

| Option | Description | Selected |
|--------|-------------|----------|
| By component domain | Top-level dirs: self-model/, fragments/, session/, rem/, context/, modes/. Mirrors 6 architectural components. | ✓ |
| By layer (model/service/handler) | Organize by architectural layer. Cross-cuts component domains. | |
| Flat with prefixes | All source files in single src/ directory with prefixes. | |

**User's choice:** By component domain
**Notes:** None

### Data directory location

| Option | Description | Selected |
|--------|-------------|----------|
| Configurable via Magnet | Data path in Magnet global state + config.json. Default ~/.dynamo/reverie/. | ✓ |
| Inside the module submodule | Data at modules/reverie/data/. Mixes runtime data with git-managed code. | |
| Platform data directory | Data at ~/.dynamo/modules/reverie/. Platform-level convention. | |

**User's choice:** Configurable via Magnet
**Notes:** None

### Circuit manifest dependencies

| Option | Description | Selected |
|--------|-------------|----------|
| All 9 services + 2 providers | Declare full set upfront. Manifest is the truth contract. | ✓ |
| Progressive — only Phase 7 needs | Start minimal, add dependencies per phase. | |
| You decide | Claude picks based on spec requirements. | |

**User's choice:** All 9 services + 2 providers
**Notes:** None

---

## Self Model File Layout

### Journal (narrative) state organization

| Option | Description | Selected |
|--------|-------------|----------|
| One file per aspect | Three files: identity-core.md, relational-model.md, conditioning.md. Versioning per-aspect. | ✓ |
| Single monolithic self-model.md | One file with sections. Simpler but coarse-grained versioning. | |
| Field-level files | Individual files per field (~15+ files). Maximum granularity. | |

**User's choice:** One file per aspect
**Notes:** None

### Ledger (structured) state organization

| Option | Description | Selected |
|--------|-------------|----------|
| One table per field type | Separate tables: sm_value_orientations, sm_expertise_map, etc. Each optimized for data shape. | ✓ |
| Three tables by aspect | sm_identity_core, sm_relational_model, sm_conditioning as key-value stores. | |
| Single sm_state table | One generic table with aspect/field/value_json columns. | |

**User's choice:** One table per field type
**Notes:** None

### Cold start initialization

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal sparse defaults | Per spec §2.3: neutral traits, empty relational model, uniform biases. | |
| Configurable seed profiles | Multiple seed templates (analytical, creative, balanced). | |
| You decide | Claude follows spec guidance. | |

**User's choice:** Custom — hybrid of #1 and #2 with entropy engine
**Notes:** User introduced the concept of an entropy engine at the cold start layer. Purpose: emulate a well-adjusted human adult's mood through stochastic variance in baseline trait weights. Conditioning still shifts organically toward user's task. Entropy is tunable, starts subtle, and doesn't overwhelm early responses. User sees this as bolstering the entire Self Model and memory theory.

### Entropy engine source

| Option | Description | Selected |
|--------|-------------|----------|
| Seeded randomness per session | Pseudo-random mood seed per session. Tunable amplitude. | |
| Time-of-day + randomness | Circadian-style patterns combined with random variance. | |
| Conditioned entropy | Parameters evolve through REM. System learns which mood states work for this user. | ✓ |
| You decide | Claude designs based on Self Model theory. | |

**User's choice:** Conditioned entropy
**Notes:** Starts random but evolves through REM consolidation. The entropy becomes personalized as the system learns what mood states produce good interactions with this specific user.

---

## Fragment Storage Strategy

### Directory organization

| Option | Description | Selected |
|--------|-------------|----------|
| Lifecycle directories | working/ (pre-REM), active/ (post-REM), archive/ (decayed). Physical moves as REM gate. | ✓ |
| Flat with status field | All fragments in one directory. Status in frontmatter/Ledger only. | |
| Session-scoped then merged | Per-session directories during formation, consolidated/ after REM. | |

**User's choice:** Lifecycle directories
**Notes:** None

### File naming convention

| Option | Description | Selected |
|--------|-------------|----------|
| ID only | frag-2026-03-22-a7f3b2c1.md. ID contains date. Type/domain in frontmatter. | ✓ |
| Type-prefixed | exp-2026-03-22-a7f3b2c1.md. Human-readable but requires rename on type change. | |
| You decide | Claude picks based on engineering tradeoffs. | |

**User's choice:** ID only
**Notes:** None

### FragmentWriter atomicity

| Option | Description | Selected |
|--------|-------------|----------|
| Journal-first with Ledger rollback | Write file first, then Ledger. If Ledger fails, delete file. Journal is source of truth. | ✓ |
| Ledger-first with Journal rollback | Write Ledger first, then file. More complex rollback (multiple tables). | |
| Write-ahead log both | Log intent to WAL first. Execute both. WAL enables recovery. Most robust. | |
| You decide | Claude designs based on Pitfall 4 failure modes. | |

**User's choice:** Journal-first with Ledger rollback
**Notes:** None

### Association index scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full schema upfront | Define all ~12 tables now. Schema is the contract. Avoids migrations. | ✓ |
| Minimal — expand per phase | Start with core tables, add more in Phase 9+. Lighter Phase 7. | |
| You decide | Claude scopes based on Phase 7 requirements. | |

**User's choice:** Full schema upfront
**Notes:** None

---

## JSON Frontmatter Transition

### Transition strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Replace YAML with JSON | Rewrite frontmatter.cjs for JSON only. Clean break. No production data exists. | ✓ |
| Dual-format support | Detect format and handle both YAML and JSON. Backwards compatible. | |
| JSON with --- delimiters | Keep --- delimiters, parse as JSON. Minimal visual change. | |
| You decide | Claude designs the cleanest transition. | |

**User's choice:** Replace YAML parser with JSON
**Notes:** None

### Delimiter format

| Option | Description | Selected |
|--------|-------------|----------|
| Triple-dash with JSON inside | ---\n{json}\n---. Universal frontmatter delimiter. Editors recognize it. | ✓ |
| Fenced JSON block | ```json\n{json}\n```. Explicit format but not standard frontmatter. | |
| Raw JSON header | {json}\n\n---\n\nBody. Minimal but non-standard. | |
| You decide | Claude picks for tooling compatibility. | |

**User's choice:** Triple-dash with JSON inside
**Notes:** None

### Schema validation tool

| Option | Description | Selected |
|--------|-------------|----------|
| Zod for Reverie schemas | Use zod 4.x. Already in tech stack for MCP SDK v2. Better errors, nested support. | ✓ |
| Extend lib/schema.cjs | Enhance existing validator. Keeps zero new dependencies but builds mini-zod. | |
| You decide | Claude picks based on schema complexity. | |

**User's choice:** Zod for Reverie schemas
**Notes:** None

---

## Claude's Discretion

- Write-ahead journal format and recovery mechanism for Wire write coordinator (PLT-01)
- Exact DuckDB DDL for ~12 association index tables
- Decay function implementation details
- Entropy engine internal design (mood-to-trait mapping, amplitude range, REM evaluation)

## Deferred Ideas

None — discussion stayed within phase scope
