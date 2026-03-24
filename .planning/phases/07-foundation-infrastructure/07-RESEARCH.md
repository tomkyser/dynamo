# Phase 7: Foundation Infrastructure - Research

**Researched:** 2026-03-23
**Domain:** Write integrity, schema validation, dual-provider atomicity, Self Model persistence, association index DDL, deterministic decay
**Confidence:** HIGH

## Summary

Phase 7 establishes the irreversible architectural decisions that every subsequent Reverie component depends on. The phase spans five distinct technical domains: (1) enhancing Wire's write coordinator with retry logic and write-ahead journaling to prevent silent data loss under burst writes (PLT-01), (2) replacing the existing YAML frontmatter parser with a JSON frontmatter parser and defining zod-validated fragment schemas for all 5 fragment types (FRG-01, FRG-02), (3) building the FragmentWriter abstraction that performs atomic dual-provider writes with rollback (FRG-09), (4) defining Self Model schemas and implementing cold start initialization with the entropy engine (SM-01, SM-02, SM-03, SM-05), and (5) creating the full association index DDL in Ledger with the deterministic decay function (FRG-05, FRG-06).

All required technologies are already installed and validated: Bun 1.3.11, zod 4.3.6, @duckdb/node-api 1.5.0-r.1, and the full M1 platform (851 tests passing). The existing write coordinator, Journal provider, and Ledger provider provide solid foundations to build upon. The primary risks are the dual-provider atomicity challenge (no distributed transaction between Journal files and Ledger tables) and ensuring the association index schema is comprehensive enough to avoid future migrations.

**Primary recommendation:** Build journal-first with Ledger rollback for FragmentWriter. Design all ~12 association index tables upfront per D-12. Use `const { z } = require('zod')` for all schema validation in module-level code.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Reverie is developed as a git submodule from day one. Set up `modules/reverie/` as a separate git repo immediately. Validates Circuit module registration + Forge/Relay submodule lifecycle from the start.
- **D-02:** Internal organization is by component domain: `self-model/`, `fragments/`, `session/`, `rem/`, `context/`, `modes/`. Each directory contains its own implementation + tests. Mirrors the 6 architectural components.
- **D-03:** Reverie data directory is configurable via Magnet global state and config.json. Default: `~/.dynamo/reverie/` (outside the repo). Keeps data separate from code.
- **D-04:** Circuit manifest declares all 9 services + 2 providers as dependencies upfront.
- **D-05:** Self Model narrative state uses one Journal file per aspect: `identity-core.md`, `relational-model.md`, `conditioning.md`. Each with JSON frontmatter for structured fields + markdown body for narrative content. Versioning is per-aspect.
- **D-06:** Self Model structured state uses one Ledger table per field type: `sm_value_orientations`, `sm_expertise_map`, `sm_trust_calibration`, `sm_interaction_rhythm`, `sm_attention_biases`, `sm_association_priors`, `sm_sublimation_sensitivity`. Each has its own schema.
- **D-07:** Cold start produces minimal sparse defaults per spec Section 2.3, PLUS an entropy engine that emulates a well-adjusted human adult's mood with stochastic variance into Self Model baseline trait weights per session.
- **D-08:** The entropy engine uses conditioned entropy -- starts with random variance but evolves through REM consolidation. Over time learns which mood states produce good interactions.
- **D-09:** Fragments use lifecycle directories: `fragments/working/` (pre-REM), `fragments/active/` (post-REM), `fragments/archive/` (decayed below threshold, soft-delete).
- **D-10:** Fragment files are named by ID only: `frag-2026-03-22-a7f3b2c1.md`. Type and domain are in frontmatter and Ledger.
- **D-11:** FragmentWriter uses journal-first with Ledger rollback. Write fragment file to Journal first (atomic via Bun.write), then write association index rows to Ledger via Wire write coordinator. If Ledger write fails after retry, delete the Journal file (rollback). Journal is source of truth.
- **D-12:** Association index tables are designed with the full ~12 table schema upfront. Define all tables now even if Phase 7 only populates a subset. Avoids migrations later.
- **D-13:** Replace existing YAML parser in `journal/frontmatter.cjs` with JSON frontmatter parser. Clean break -- no dual-format support.
- **D-14:** JSON frontmatter uses triple-dash delimiters: `---\n{json}\n---\n\nBody text`.
- **D-15:** Fragment and Self Model schema validation uses zod 4.x. `lib/schema.cjs` stays for platform-level validation -- zod is the module-level tool.

### Claude's Discretion
- Write-ahead journal format and recovery mechanism for the Wire write coordinator (PLT-01)
- Exact DuckDB DDL for the ~12 association index tables
- Decay function implementation details (formula is in spec; implementation approach is engineering)
- Entropy engine internal design -- how mood variance maps to Self Model trait weight adjustments, amplitude range, how REM evaluates mood state outcomes

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLT-01 | Wire write coordinator retry logic with exponential backoff and write-ahead journaling | Write coordinator code analyzed; retry + WAJ patterns documented; Pitfall 1 prevention strategy verified |
| SM-01 | Self Model with three aspects persisting across sessions via Magnet + Journal + Ledger | Magnet 3-tier scoping verified; Journal/Ledger APIs analyzed; D-05/D-06 storage layout defined |
| SM-02 | Identity Core -- stable personality traits, communication style, value orientations, expertise map, boundaries | Spec Section 2.2 field definitions mapped to Journal narrative + Ledger structured storage |
| SM-03 | Relational Model -- user communication patterns, domain map, preference history, trust calibration, interaction rhythm | Spec Section 2.2 field definitions mapped; Ledger table schemas designed |
| SM-05 | Cold start initialization from seed prompt with sparse defaults | Spec Section 2.3 cold start flow documented; entropy engine discretion area researched |
| FRG-01 | Fragment schema (structured frontmatter + fuzzy impressionistic body) stored in Journal | Full fragment schema from spec Section 3.3 analyzed; JSON frontmatter format validated; zod schema patterns documented |
| FRG-02 | Five fragment types -- experiential, meta-recall, sublimation, consolidation, source-reference | Spec Section 3.5 type definitions mapped; per-type schema variations documented |
| FRG-05 | Association index in Ledger (domains, entities, associations, attention tags, formation groups, source locators, fragment decay) | DuckDB DDL capabilities verified; ~12 table schema designed; math functions for decay validated |
| FRG-06 | Deterministic decay function (time decay, consolidation protection, access bonus, relevance factor) | Spec Section 3.9 formula verified; DuckDB exp()/ln() functions tested; implementation approach documented |
| FRG-09 | FragmentWriter abstraction -- atomic dual-provider writes with rollback | Journal-first + Ledger-rollback strategy defined per D-11; Pitfall 4 prevention integrated |

</phase_requirements>

## Standard Stack

### Core (Already Installed -- No New Dependencies)
| Library | Version | Purpose | Verified |
|---------|---------|---------|----------|
| Bun | 1.3.11 | Runtime | `bun --version` confirmed |
| zod | 4.3.6 | Fragment + Self Model schema validation | `require('zod')` CJS confirmed, `safeParse()` works |
| @duckdb/node-api | 1.5.0-r.1 | Association index tables, Self Model structured state | DDL + math functions verified in Bun |
| @modelcontextprotocol/sdk | 1.27.1 | Wire communication (existing, not modified in this phase) | Already in use |
| bun:sqlite | Built-in | Ledger SQLite backend (existing) | Already in use |
| bun:test | Built-in | Test runner (851 tests passing) | Already in use |

### Zod 4.x CJS Usage Pattern
```javascript
'use strict';
// Zod 4.x exports require destructuring via { z }
const { z } = require('zod');

// Define schema
const fragmentSchema = z.object({
  id: z.string(),
  type: z.enum(['experiential', 'meta-recall', 'sublimation', 'consolidation', 'source-reference']),
  created: z.string(),
  // ... etc
});

// Validate
const result = fragmentSchema.safeParse(parsedFrontmatter);
if (!result.success) {
  // result.error contains ZodError with detailed issues
}
```

**Confidence:** HIGH -- verified by running `bun -e 'const { z } = require("zod"); ...'` against installed package.

## Architecture Patterns

### Reverie Module Internal Structure (from CONTEXT.md D-02)
```
modules/reverie/
  reverie.cjs                    # Module entry point: registerFn callback
  manifest.cjs                   # REVERIE_MANIFEST constant
  lib/
    constants.cjs                # Fragment types, decay params, thresholds
    schemas.cjs                  # Zod schemas for fragments, Self Model, frontmatter
  components/
    self-model/
      self-model.cjs             # Self Model state manager
      cold-start.cjs             # Seed generation + entropy engine
      entropy-engine.cjs          # Conditioned stochastic variance
      __tests__/
    fragments/
      fragment-writer.cjs         # Atomic dual-provider write abstraction
      fragment-schema.cjs         # Fragment zod schemas per type
      decay.cjs                  # Deterministic decay computation
      association-index.cjs       # Ledger table DDL + CRUD
      __tests__/
    session/                     # Phase 10+
    rem/                         # Phase 11+
    context/                     # Phase 8+
    modes/                       # Phase 10+
  data/                          # Created at ~/.dynamo/reverie/ (D-03)
    fragments/
      working/                   # Pre-REM fragments (D-09)
      active/                    # Post-REM consolidated (D-09)
      archive/                   # Soft-deleted / decayed (D-09)
    self-model/                  # Identity, relational, conditioning .md files
    taxonomy/
    sessions/
```

### Pattern 1: JSON Frontmatter Parse/Serialize
**What:** Replace YAML with JSON between `---` delimiters. Clean break from existing parser.
**When to use:** All Journal files that carry structured metadata (fragments, Self Model aspects).

```javascript
// Source: D-14 from CONTEXT.md + existing frontmatter.cjs pattern
'use strict';

function parseFrontmatter(content) {
  if (!content || typeof content !== 'string') return null;

  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    const emptyMatch = content.match(/^---\n---\n?([\s\S]*)$/);
    if (!emptyMatch) return null;
    return { frontmatter: {}, body: (emptyMatch[1] || '').trim() };
  }

  let frontmatter;
  try {
    frontmatter = JSON.parse(match[1]);
  } catch (e) {
    return null; // Invalid JSON frontmatter
  }

  return { frontmatter, body: (match[2] || '').trim() };
}

function serializeFrontmatter(frontmatter, body) {
  const json = JSON.stringify(frontmatter, null, 2);
  return `---\n${json}\n---\n\n${body || ''}`;
}
```

**Key advantage over YAML:** JSON.parse is built-in, zero-ambiguity, no special character escaping issues, perfect round-trip fidelity. Addresses Pitfall 15.

### Pattern 2: FragmentWriter -- Atomic Dual-Provider Writes
**What:** Abstraction that writes fragment file to Journal FIRST, then indexes to Ledger via Wire. On Ledger failure, deletes Journal file (rollback).
**When to use:** Every fragment creation and update operation.

```javascript
// Source: D-11 from CONTEXT.md, Pitfall 4 prevention
'use strict';
const { ok, err } = require('../../lib/result.cjs');

function createFragmentWriter(options = {}) {
  const { journal, wire, lathe } = options;

  async function writeFragment(fragment, body) {
    // 1. Write to Journal first (atomic via Bun.write)
    const filePath = _resolveFragmentPath(fragment.id, fragment._lifecycle || 'working');
    const writeResult = await journal.write(fragment.id, { frontmatter: fragment, body });
    if (!writeResult.ok) return writeResult;

    // 2. Queue Ledger writes via Wire write coordinator
    const ledgerResult = await _queueAssociationIndexWrites(wire, fragment);
    if (!ledgerResult.ok) {
      // 3. Rollback: delete the Journal file
      await journal.delete(fragment.id);
      return err('FRAGMENT_WRITE_FAILED', 'Ledger write failed, Journal rolled back', {
        fragmentId: fragment.id,
        ledgerError: ledgerResult.error,
      });
    }

    return ok({ id: fragment.id, path: filePath });
  }

  return { writeFragment, /* deleteFragment, updateFragment */ };
}
```

### Pattern 3: Wire Write Coordinator Enhancement (PLT-01)
**What:** Add retry with exponential backoff and write-ahead journaling to existing write coordinator.
**When to use:** This is a modification to `core/services/wire/write-coordinator.cjs`.

The existing write coordinator has:
- Priority queue with urgency levels (queue.cjs)
- Greedy batching for same-table writes
- 10ms setTimeout polling loop
- Event emission on write:completed / write:failed

What it lacks (per PLT-01 / Pitfall 1):
- Retry logic on failed writes
- Exponential backoff between retries
- Write-ahead journal for crash recovery
- Configurable max retry count

**Enhancement strategy:**
```javascript
// Additions to write-coordinator.cjs:

// 1. WAJ: Before executing, append write-intent to a JSON-lines file
//    Format: { id, table, data, timestamp, status: 'pending' }
//    On successful write: mark status 'completed'
//    On startup: replay any 'pending' entries

// 2. Retry: On failed processNext(), re-enqueue with retry count
//    Max retries: configurable (default: 3)
//    Backoff: 50ms * 2^retryCount (50, 100, 200ms)
//    After max retries: emit 'write:fatal', do NOT re-enqueue

// 3. Replace setTimeout(loop, 10) with batching window
//    Collect writes for configurable window (default: 25ms)
//    Execute as batch transaction
```

### Pattern 4: Options-Based DI (Established M1 Pattern)
**What:** Every component takes an options object with injected dependencies.
**When to use:** All new components in this phase.

```javascript
// Every new component follows this shape
function createSelfModel(options = {}) {
  const { magnet, journal, ledger, switchboard } = options;
  // ... implementation
  return createContract('self-model', SELF_MODEL_SHAPE, impl);
}
```

### Anti-Patterns to Avoid
- **Direct provider access from module code:** Always go through Circuit facades. Reverie code never `require()`s services directly.
- **YAML in any new frontmatter:** JSON only. No backward compatibility with YAML format.
- **Ledger writes bypassing Wire:** All writes go through Wire's write coordinator. Direct Ledger writes create contention.
- **Hard-coded data paths:** Use Magnet config for all paths. Default `~/.dynamo/reverie/` but never hardcode.
- **BigInt serialization with JSON.stringify:** DuckDB INTEGER columns return JS `number` (verified), but be cautious with BIGINT columns. Use VARCHAR for IDs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation | Custom validator with if/typeof chains | `zod` 4.3.6 (already installed) | Nested object validation, union types for 5 fragment types, `.safeParse()` returns structured errors. `lib/schema.cjs` is platform-level only. |
| JSON parsing/serialization | Custom JSON parser | Built-in `JSON.parse()` / `JSON.stringify()` | Zero-dependency, perfect round-trip, native speed |
| Atomic file writes | Manual tmp+rename | `journal.write()` which uses `lathe.writeFileAtomic()` which uses `Bun.write()` | Already validated, atomic semantics built-in |
| UUID generation | Custom ID generator | `crypto.randomUUID()` (used in protocol.cjs) | Already the established pattern in Wire protocol |
| Priority queue | New queue implementation | Existing `wire/queue.cjs` with 4 urgency levels | Already tested and validated |
| Contract validation | Manual method checks | `lib/contract.cjs` `createContract()` | Established pattern, frozen API surfaces |
| Result types | Try/catch or null checks | `lib/result.cjs` `ok()` / `err()` | Established pattern used throughout M1 |
| Mathematical functions (decay) | JavaScript Math.exp/Math.log | DuckDB `exp()` / `ln()` for batch computation, JS `Math.exp()` / `Math.log()` for single-fragment | DuckDB has native OLAP math; JS for real-time single computation |

**Key insight:** Phase 7 builds ON TOP of the validated M1 platform. Every infrastructure piece (Lathe, Wire, Journal, Ledger, Magnet, Circuit) is already working. The phase adds Reverie-specific abstractions that compose these existing components -- not replace them.

## Common Pitfalls

### Pitfall 1: Silent Write Loss Under Burst Formation (Pitfall 1 from Research)
**What goes wrong:** Wire's write coordinator emits `write:failed` and moves on. Fragment formation can queue 9+ writes in <100ms. Failed writes are lost permanently.
**Why it happens:** `processNext()` in write-coordinator.cjs has no retry logic. The 10ms setTimeout polling loop cannot drain fast enough for burst patterns.
**How to avoid:** Add retry with exponential backoff (50ms * 2^retryCount, max 3). Add write-ahead journal file (JSON-lines) to persist write intents before execution. Replay pending intents on startup.
**Warning signs:** `wire:write-failed` Switchboard events during testing. Any non-zero count indicates data loss.

### Pitfall 2: Split-Storage Inconsistency (Pitfall 4 from Research)
**What goes wrong:** Fragment exists in Journal but has no Ledger index entries (or vice versa). Recall produces confabulated memories from orphaned associations.
**Why it happens:** Journal (filesystem) and Ledger (DuckDB) have no transactional guarantee between them.
**How to avoid:** FragmentWriter abstraction per D-11: Journal-first, Ledger-rollback. Soft-delete per D-09 (`archive/` directory, never hard-delete). Consistency audit in REM (Phase 11).
**Warning signs:** Fragment count mismatch between `fragments/working/` file count and `fragment_decay` table row count.

### Pitfall 3: YAML Parsing Fragility (Pitfall 15 from Research)
**What goes wrong:** YAML frontmatter with colons, special characters, or nested structures fails unpredictably.
**Why it happens:** The existing `frontmatter.cjs` is a custom YAML parser that handles a subset of YAML. Fragment schemas with nested objects stress it.
**How to avoid:** Replace with JSON frontmatter per D-13/D-14. Clean break, no dual-format support. JSON.parse is unambiguous and native.
**Warning signs:** N/A -- this pitfall is eliminated by the format change.

### Pitfall 4: DuckDB BigInt Serialization
**What goes wrong:** DuckDB BIGINT columns return JavaScript BigInt which cannot be serialized with `JSON.stringify()`.
**Why it happens:** DuckDB's @duckdb/node-api maps BIGINT to JS BigInt. INTEGER maps to JS number (verified).
**How to avoid:** Use INTEGER (not BIGINT) for counts and sequence numbers. Use VARCHAR for all IDs. Use DOUBLE for weights and scores. Tested: INTEGER columns return JS `number` correctly.
**Warning signs:** `TypeError: Do not know how to serialize a BigInt` during any JSON serialization.

### Pitfall 5: Association Index Schema Lock-In
**What goes wrong:** Designing too few tables forces schema migrations when later phases need additional association data.
**Why it happens:** Temptation to "start simple" and add tables later. DuckDB ALTER TABLE support is limited.
**How to avoid:** Per D-12, design all ~12 tables upfront. Define the full schema now even if Phase 7 only populates a subset. Tables can remain empty until their phase.
**Warning signs:** Any "we'll add a column later" thinking during implementation.

### Pitfall 6: Zod Schema Location Confusion
**What goes wrong:** Mixing `lib/schema.cjs` (platform validate()) with zod schemas creates confusion about which validation system to use.
**Why it happens:** Both exist in the codebase with different APIs.
**How to avoid:** Per D-15: `lib/schema.cjs` stays for platform-level validation (manifest schemas, config validation). Zod is the module-level tool for fragment and Self Model schemas. Document this boundary clearly in Reverie's code.
**Warning signs:** Module code importing from `lib/schema.cjs` instead of using zod.

## Code Examples

### Fragment Schema (Zod, All 5 Types)
```javascript
// Source: Spec Section 3.3 + D-15
'use strict';
const { z } = require('zod');

const FRAGMENT_TYPES = ['experiential', 'meta-recall', 'sublimation', 'consolidation', 'source-reference'];

const temporalSchema = z.object({
  absolute: z.string(),               // ISO timestamp
  session_relative: z.number().min(0).max(1),
  sequence: z.number().int().nonnegative(),
});

const decaySchema = z.object({
  initial_weight: z.number().min(0).max(1),
  current_weight: z.number().min(0).max(1),
  last_accessed: z.string(),
  access_count: z.number().int().nonnegative(),
  consolidation_count: z.number().int().nonnegative(),
  pinned: z.boolean(),
});

const selfModelRelevanceSchema = z.object({
  identity: z.number().min(0).max(1),
  relational: z.number().min(0).max(1),
  conditioning: z.number().min(0).max(1),
});

const associationsSchema = z.object({
  domains: z.array(z.string()),
  entities: z.array(z.string()),
  self_model_relevance: selfModelRelevanceSchema,
  emotional_valence: z.number().min(-1).max(1),
  attention_tags: z.array(z.string()),
});

const sourceLocatorSchema = z.object({
  type: z.enum(['file', 'url', 'inline']),
  path: z.string().nullable(),
  url: z.string().nullable(),
  content_hash: z.string().nullable(),
  last_verified: z.string(),
}).optional();

const pointersSchema = z.object({
  causal_antecedents: z.array(z.string()),
  causal_consequents: z.array(z.string()),
  thematic_siblings: z.array(z.string()),
  contradictions: z.array(z.string()),
  meta_recalls: z.array(z.string()),
  source_fragments: z.array(z.string()),
});

const formationSchema = z.object({
  trigger: z.string(),
  attention_pointer: z.string(),
  active_domains_at_formation: z.array(z.string()),
  sublimation_that_prompted: z.string().nullable(),
});

const baseFragmentSchema = z.object({
  id: z.string().regex(/^frag-\d{4}-\d{2}-\d{2}-[a-f0-9]{8}$/),
  type: z.enum(FRAGMENT_TYPES),
  created: z.string(),
  source_session: z.string(),
  self_model_version: z.string(),
  formation_group: z.string(),
  formation_frame: z.string(),
  sibling_fragments: z.array(z.string()),
  temporal: temporalSchema,
  decay: decaySchema,
  associations: associationsSchema,
  pointers: pointersSchema,
  formation: formationSchema,
  source_locator: sourceLocatorSchema,
});

// Type-specific refinements
const experientialFragment = baseFragmentSchema.extend({ type: z.literal('experiential') });
const metaRecallFragment = baseFragmentSchema.extend({
  type: z.literal('meta-recall'),
  // source_fragments must be non-empty for meta-recall
}).refine(f => f.pointers.source_fragments.length > 0, {
  message: 'Meta-recall fragments must reference source fragments',
});
const sublimationFragment = baseFragmentSchema.extend({ type: z.literal('sublimation') });
const consolidationFragment = baseFragmentSchema.extend({ type: z.literal('consolidation') });
const sourceReferenceFragment = baseFragmentSchema.extend({
  type: z.literal('source-reference'),
}).refine(f => f.source_locator != null, {
  message: 'Source-reference fragments must have a source_locator',
});
```

### Association Index DDL (DuckDB)
```sql
-- Source: Spec Section 3.8 + D-12 (full schema upfront)

-- Core domain taxonomy
CREATE TABLE IF NOT EXISTS domains (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  parent_domain_id VARCHAR,
  fragment_count INTEGER DEFAULT 0,
  weight DOUBLE DEFAULT 1.0,
  narrative_version VARCHAR,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT current_timestamp,
  updated_at TIMESTAMP DEFAULT current_timestamp
);

-- Named entities (concepts, people, projects, patterns)
CREATE TABLE IF NOT EXISTS entities (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  entity_type VARCHAR,
  description TEXT,
  first_seen TIMESTAMP DEFAULT current_timestamp,
  last_seen TIMESTAMP DEFAULT current_timestamp,
  occurrence_count INTEGER DEFAULT 1,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT current_timestamp,
  updated_at TIMESTAMP DEFAULT current_timestamp
);

-- Weighted edges between entities and/or domains
CREATE TABLE IF NOT EXISTS associations (
  id VARCHAR PRIMARY KEY,
  source_id VARCHAR NOT NULL,
  source_type VARCHAR NOT NULL,      -- 'entity' or 'domain'
  target_id VARCHAR NOT NULL,
  target_type VARCHAR NOT NULL,      -- 'entity' or 'domain'
  weight DOUBLE DEFAULT 0.5,
  co_occurrence_count INTEGER DEFAULT 1,
  last_reinforced TIMESTAMP DEFAULT current_timestamp,
  created_at TIMESTAMP DEFAULT current_timestamp,
  updated_at TIMESTAMP DEFAULT current_timestamp
);

-- Experiential descriptors from fragment formation
CREATE TABLE IF NOT EXISTS attention_tags (
  id VARCHAR PRIMARY KEY,
  tag VARCHAR NOT NULL UNIQUE,
  occurrence_count INTEGER DEFAULT 1,
  co_occurrence_data VARCHAR,        -- JSON: { "tag_id": count }
  first_seen TIMESTAMP DEFAULT current_timestamp,
  last_seen TIMESTAMP DEFAULT current_timestamp,
  created_at TIMESTAMP DEFAULT current_timestamp
);

-- Groups fragments formed from same stimulus
CREATE TABLE IF NOT EXISTS formation_groups (
  id VARCHAR PRIMARY KEY,
  stimulus_summary TEXT,
  fragment_count INTEGER DEFAULT 0,
  surviving_count INTEGER DEFAULT 0,
  source_session VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT current_timestamp
);

-- Fragment decay tracking (one row per fragment)
CREATE TABLE IF NOT EXISTS fragment_decay (
  fragment_id VARCHAR PRIMARY KEY,
  fragment_type VARCHAR NOT NULL,
  initial_weight DOUBLE NOT NULL,
  current_weight DOUBLE NOT NULL,
  last_accessed TIMESTAMP,
  access_count INTEGER DEFAULT 0,
  consolidation_count INTEGER DEFAULT 0,
  pinned BOOLEAN DEFAULT false,
  lifecycle VARCHAR DEFAULT 'working',  -- working | active | archive
  created_at TIMESTAMP DEFAULT current_timestamp,
  updated_at TIMESTAMP DEFAULT current_timestamp
);

-- Source locators for source-reference fragments
CREATE TABLE IF NOT EXISTS source_locators (
  id VARCHAR PRIMARY KEY,
  fragment_id VARCHAR NOT NULL,
  locator_type VARCHAR NOT NULL,     -- file | url | inline
  path VARCHAR,
  url VARCHAR,
  content_hash VARCHAR,
  last_verified TIMESTAMP,
  created_at TIMESTAMP DEFAULT current_timestamp
);

-- Join: fragment <-> domain
CREATE TABLE IF NOT EXISTS fragment_domains (
  fragment_id VARCHAR NOT NULL,
  domain_id VARCHAR NOT NULL,
  relevance_score DOUBLE DEFAULT 0.5,
  PRIMARY KEY (fragment_id, domain_id)
);

-- Join: fragment <-> entity
CREATE TABLE IF NOT EXISTS fragment_entities (
  fragment_id VARCHAR NOT NULL,
  entity_id VARCHAR NOT NULL,
  relationship_type VARCHAR,         -- mentioned | central | peripheral
  PRIMARY KEY (fragment_id, entity_id)
);

-- Join: fragment <-> attention_tag
CREATE TABLE IF NOT EXISTS fragment_attention_tags (
  fragment_id VARCHAR NOT NULL,
  tag_id VARCHAR NOT NULL,
  PRIMARY KEY (fragment_id, tag_id)
);

-- Join: entity <-> domain
CREATE TABLE IF NOT EXISTS entity_domains (
  entity_id VARCHAR NOT NULL,
  domain_id VARCHAR NOT NULL,
  strength DOUBLE DEFAULT 0.5,
  PRIMARY KEY (entity_id, domain_id)
);

-- Domain hierarchy (parent-child + sibling + bridge relationships)
CREATE TABLE IF NOT EXISTS domain_relationships (
  source_domain_id VARCHAR NOT NULL,
  target_domain_id VARCHAR NOT NULL,
  relationship_type VARCHAR NOT NULL,  -- parent | child | sibling | bridge
  strength DOUBLE DEFAULT 0.5,
  PRIMARY KEY (source_domain_id, target_domain_id, relationship_type)
);
```

### Decay Function Implementation
```javascript
// Source: Spec Section 3.9
'use strict';

// Default constants (tunable via config)
const DECAY_DEFAULTS = {
  base_decay_rate: 0.05,          // lambda_0
  consolidation_protection: 0.3,  // how much each REM cycle slows decay
  access_weight: 0.1,             // weight of access_bonus
  relevance_weights: {            // for weighted_sum of self_model_relevance
    identity: 0.3,
    relational: 0.5,
    conditioning: 0.2,
  },
  archive_threshold: 0.1,         // below this, fragment moves to archive
};

/**
 * Computes the current decay weight for a fragment.
 *
 * current_weight = initial_weight * relevance_factor * time_decay * access_bonus
 *
 * @param {Object} fragment - Fragment frontmatter with decay and associations fields
 * @param {Object} [config] - Decay configuration overrides
 * @returns {number} Current weight (0.0 - 1.0+)
 */
function computeDecay(fragment, config = {}) {
  const cfg = { ...DECAY_DEFAULTS, ...config };
  const decay = fragment.decay;
  const relevance = fragment.associations.self_model_relevance;

  // Days since creation
  const daysSinceCreation = (Date.now() - new Date(fragment.created).getTime()) / (1000 * 60 * 60 * 24);

  // Lambda adjusted by consolidation protection
  const lambda = cfg.base_decay_rate / (1 + decay.consolidation_count * cfg.consolidation_protection);

  // Time decay: exp(-lambda * days)
  const timeDecay = Math.exp(-lambda * daysSinceCreation);

  // Access bonus: 1 + (log(1 + access_count) * access_weight)
  const accessBonus = 1 + (Math.log(1 + decay.access_count) * cfg.access_weight);

  // Relevance factor: weighted sum
  const rw = cfg.relevance_weights;
  const relevanceFactor = (relevance.identity * rw.identity) +
                          (relevance.relational * rw.relational) +
                          (relevance.conditioning * rw.conditioning);

  return decay.initial_weight * relevanceFactor * timeDecay * accessBonus;
}
```

### Self Model Cold Start Seed
```javascript
// Source: Spec Section 2.3 + D-05/D-06/D-07
'use strict';

/**
 * Produces a minimal Self Model state for first activation.
 * Identity Core, Relational Model, and Conditioning all start sparse.
 */
function createColdStartSeed() {
  return {
    identityCore: {
      frontmatter: {
        aspect: 'identity-core',
        version: 'sm-identity-v1',
        updated: new Date().toISOString(),
      },
      body: [
        'Identity not yet formed. Observing.',
        '',
        'Personality traits: undifferentiated.',
        'Communication style: adaptive, following user cues.',
        'Value orientations: balanced, no strong leanings yet.',
        'Expertise map: empty -- awaiting demonstrated interaction domains.',
        'Boundaries: default Claude safety boundaries active.',
      ].join('\n'),
    },

    relationalModel: {
      frontmatter: {
        aspect: 'relational-model',
        version: 'sm-relational-v1',
        updated: new Date().toISOString(),
      },
      body: [
        'No user model formed yet.',
        '',
        'Communication patterns: unknown.',
        'Domain interests: unknown.',
        'Preference history: empty.',
        'Trust calibration: conservative -- no latitude earned yet.',
        'Interaction rhythm: no data.',
      ].join('\n'),
    },

    conditioning: {
      frontmatter: {
        aspect: 'conditioning',
        version: 'sm-conditioning-v1',
        updated: new Date().toISOString(),
      },
      body: [
        'Default conditioning. No learned biases.',
        '',
        'Attention biases: uniform across domains.',
        'Association priors: no weighted connections.',
        'Sublimation sensitivity: default thresholds.',
        'Recall strategies: none learned.',
        'Error history: empty.',
      ].join('\n'),
    },
  };
}
```

### Write-Ahead Journal Format
```javascript
// Recommended WAJ format: JSON-lines (.jsonl) file
// Location: ~/.dynamo/reverie/wal/write-ahead.jsonl (configurable via Magnet)
//
// Each line is a complete JSON object:
// { "id": "uuid", "table": "fragment_decay", "data": [...], "timestamp": "ISO", "status": "pending", "retries": 0 }
//
// On successful write: append { "id": "uuid", "status": "completed", "timestamp": "ISO" }
// On startup: read file, filter for status=pending, replay those writes
// Periodic compaction: rewrite file keeping only pending entries (or truncate when empty)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| YAML frontmatter (journal/frontmatter.cjs) | JSON frontmatter | Phase 7 (D-13/D-14) | Eliminates Pitfall 15. Clean break. |
| Write coordinator without retry (write-coordinator.cjs) | Write coordinator with retry + WAJ | Phase 7 (PLT-01) | Prevents silent data loss under burst writes |
| Generic Ledger `records` table | Purpose-built association index tables | Phase 7 (D-12) | 12+ tables optimized for fragment association queries |
| `lib/schema.cjs` validate() for all schemas | Zod for module-level, schema.cjs for platform-level | Phase 7 (D-15) | Better nested validation, union types, structured errors |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built-in, Jest-compatible API) |
| Config file | None needed -- `bun test` auto-discovers `*.test.js` in `__tests__/` dirs |
| Quick run command | `bun test --filter "fragment"` (or specific file) |
| Full suite command | `bun test` (851 existing tests + new Phase 7 tests) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLT-01 | Write coordinator retries failed DuckDB writes with exponential backoff | unit | `bun test core/services/wire/__tests__/write-coordinator.test.js` | Exists (needs new retry test cases) |
| PLT-01 | WAJ logs to write-ahead journal and replays on startup | unit | `bun test core/services/wire/__tests__/write-coordinator.test.js` | Exists (needs WAJ test cases) |
| FRG-01 | JSON frontmatter parse-write-parse identity for each fragment type | unit | `bun test core/providers/journal/__tests__/frontmatter.test.js` | Exists (needs JSON rewrite) |
| FRG-01 | Fragment schema validation via zod for all required fields | unit | `bun test modules/reverie/components/fragments/__tests__/fragment-schema.test.js` | Wave 0 |
| FRG-02 | All 5 fragment types pass schema validation with type-specific constraints | unit | `bun test modules/reverie/components/fragments/__tests__/fragment-schema.test.js` | Wave 0 |
| FRG-05 | Association index tables created in DuckDB with correct DDL | integration | `bun test modules/reverie/components/fragments/__tests__/association-index.test.js` | Wave 0 |
| FRG-06 | Decay function computes correct survival scores for synthetic histories | unit | `bun test modules/reverie/components/fragments/__tests__/decay.test.js` | Wave 0 |
| FRG-09 | FragmentWriter performs atomic dual-provider write (Journal + Ledger) | integration | `bun test modules/reverie/components/fragments/__tests__/fragment-writer.test.js` | Wave 0 |
| FRG-09 | FragmentWriter rolls back Journal file when Ledger write fails | integration | `bun test modules/reverie/components/fragments/__tests__/fragment-writer.test.js` | Wave 0 |
| SM-01 | Self Model persists to Journal + Ledger + Magnet | integration | `bun test modules/reverie/components/self-model/__tests__/self-model.test.js` | Wave 0 |
| SM-02 | Identity Core schema stores personality_traits, communication_style, value_orientations, expertise_map, boundaries | unit | `bun test modules/reverie/components/self-model/__tests__/self-model.test.js` | Wave 0 |
| SM-03 | Relational Model schema stores communication patterns, domain map, preference history, trust, rhythm | unit | `bun test modules/reverie/components/self-model/__tests__/self-model.test.js` | Wave 0 |
| SM-05 | Cold start produces valid sparse defaults from seed prompt | unit | `bun test modules/reverie/components/self-model/__tests__/cold-start.test.js` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test --filter "<relevant_module>"`
- **Per wave merge:** `bun test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `modules/reverie/components/fragments/__tests__/fragment-schema.test.js` -- covers FRG-01, FRG-02
- [ ] `modules/reverie/components/fragments/__tests__/association-index.test.js` -- covers FRG-05
- [ ] `modules/reverie/components/fragments/__tests__/decay.test.js` -- covers FRG-06
- [ ] `modules/reverie/components/fragments/__tests__/fragment-writer.test.js` -- covers FRG-09
- [ ] `modules/reverie/components/self-model/__tests__/self-model.test.js` -- covers SM-01, SM-02, SM-03
- [ ] `modules/reverie/components/self-model/__tests__/cold-start.test.js` -- covers SM-05
- [ ] Reverie module directory structure (`modules/reverie/`) must be created as git submodule per D-01
- [ ] No new framework install needed -- `bun:test` is already in use

## Open Questions

1. **Entropy Engine Amplitude Range**
   - What we know: D-07/D-08 specify stochastic variance that starts subtle and becomes conditioned through REM.
   - What's unclear: What is the initial amplitude range? How does "subtle" translate to numeric variance on trait weights? What distribution (gaussian, uniform, beta) produces the most natural-feeling mood variance?
   - Recommendation: Start with gaussian noise, sigma=0.05 (5% variance on trait weights). Make amplitude configurable. Let REM adjust sigma based on session outcome feedback. This is a Claude's Discretion item -- engineering judgment.

2. **WAJ File Compaction Strategy**
   - What we know: Write-ahead journal grows indefinitely if never compacted. Pending entries must survive crashes.
   - What's unclear: When to compact? On every startup? After N completed entries? On timer?
   - Recommendation: Compact on startup (rewrite keeping only pending entries). If file exceeds 1000 lines, compact on next flush. This is a Claude's Discretion item.

3. **Reverie Git Submodule Bootstrap**
   - What we know: D-01 says Reverie must be a git submodule from day one.
   - What's unclear: Does the user want the submodule repo created now, or should Phase 7 create a placeholder that becomes a real submodule later?
   - Recommendation: Create the `modules/reverie/` directory locally first with all Phase 7 code. Convert to submodule as the final step. Submodule setup is a distinct task from the schema/infrastructure work.

4. **Ledger Raw SQL vs. Provider API**
   - What we know: The Ledger provider currently uses a generic `records` table with JSON data column. Association index tables are purpose-built with typed columns.
   - What's unclear: Should association index operations use the Ledger provider's generic `write(id, data)` API, or should they use raw DuckDB SQL through a new lower-level interface?
   - Recommendation: The association index needs its own DuckDB backend access that bypasses the generic `records` table. Either extend Ledger with an `execute(sql, params)` method exposed through the facade, or create a dedicated Reverie-internal DuckDB connection manager. The generic Ledger API (JSON-in-records-table) is wrong for typed relational tables.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Runtime for all code | Yes | 1.3.11 | -- |
| Git | Submodule management (D-01) | Yes | 2.48.1 | -- |
| @duckdb/node-api | Association index, Self Model structured state | Yes | 1.5.0-r.1 | SQLite backend (already exists) |
| zod | Schema validation (D-15) | Yes | 4.3.6 | -- |
| @modelcontextprotocol/sdk | Wire (existing, not modified) | Yes | 1.27.1 | -- |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Sources

### Primary (HIGH confidence)
- `core/services/wire/write-coordinator.cjs` -- Direct source code analysis, verified no retry logic, 10ms setTimeout loop
- `core/providers/journal/frontmatter.cjs` -- Direct source code analysis, verified YAML parser implementation
- `core/providers/journal/journal.cjs` -- Direct source code analysis, verified write/query API
- `core/providers/ledger/ledger.cjs` -- Direct source code analysis, verified DuckDB backend usage
- `core/providers/ledger/duckdb-backend.cjs` -- Direct source code analysis, verified CREATE TABLE, prepared statements
- `core/services/magnet/magnet.cjs` -- Direct source code analysis, verified 3-tier state management
- `core/sdk/circuit/circuit.cjs` -- Direct source code analysis, verified module registration flow
- `.claude/reverie-spec-v2.md` -- Canonical specification Sections 2 (Self Model), 3 (Fragments), 3.3 (Schema), 3.8 (Association Index), 3.9 (Decay)
- `.planning/research/PITFALLS.md` -- Pitfalls 1, 4, 15 directly relevant
- `.planning/research/ARCHITECTURE.md` -- Module integration patterns, Wire capabilities
- `package.json` -- Verified installed versions: zod 4.3.6, @duckdb/node-api 1.5.0-r.1
- Runtime verification -- `bun -e` tests confirming zod CJS require, DuckDB DDL/math functions, Bun version 1.3.11

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` -- Component decomposition and integration points (derived from spec + code analysis)

### Tertiary (LOW confidence)
- Entropy engine design -- No prior art or validation. D-07/D-08 are novel concepts. Amplitude, distribution, and REM feedback loop are engineering judgment calls.

## Project Constraints (from CLAUDE.md)

- **Runtime:** Bun -- all code runs on Bun, CJS format
- **Module format:** `'use strict'` + CJS (`require()` / `module.exports`)
- **No ESM in source:** Architecture decision. Bun can require() ESM packages.
- **Engineering principles:** Strict separation of concerns, IoC, DRY, abstraction over lateralization, hardcode nothing
- **Data format:** JSON for structured data, Markdown for narrative data
- **No npm deps for platform core:** Platform uses only Bun/Node built-ins (zod is module-level, not platform-level)
- **Git submodules:** Modules are separate repos managed as submodules
- **Versioning:** User decides all version increments. Always push to origin after commits.
- **Testing:** `bun:test` only. No Jest, Vitest, or node:test.
- **Options-based DI:** Validated pattern from v0. Every component takes options object with injected dependencies.
- **Result types:** All fallible operations return `ok(value)` or `err(code, message, context)`.
- **Contracts:** Use `createContract(name, shape, impl)` for frozen public API surfaces.
- **Wire owns Ledger writes:** All writes go through Wire's write coordinator. No direct Ledger writes from module code.
- **Canonical documents:** `.claude/new-plan.md` (architecture, absolute canon) and `.claude/reverie-spec-v2.md` (Reverie spec, canon).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all dependencies verified as installed with correct versions
- Architecture: HIGH -- based on direct source code analysis of all platform components + canonical spec
- Pitfalls: HIGH -- three directly relevant pitfalls (1, 4, 15) from adversarial research with concrete prevention strategies
- Schema design: HIGH -- fragment schema derived directly from spec Section 3.3, association index from Section 3.8
- Decay function: HIGH -- formula specified in spec Section 3.9, DuckDB math functions verified
- Entropy engine: LOW -- novel concept with no prior art, engineering discretion area
- WAJ format: MEDIUM -- standard pattern (JSON-lines WAL) but recovery logic needs validation

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable -- no external dependencies changing)
