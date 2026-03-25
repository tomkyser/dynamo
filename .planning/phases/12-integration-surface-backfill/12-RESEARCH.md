# Phase 12: Integration Surface & Backfill - Research

**Researched:** 2026-03-25
**Domain:** CLI integration, git submodule lifecycle, self-organizing taxonomy governance, source-reference model, historical data backfill
**Confidence:** HIGH (CLI/submodule) | HIGH (taxonomy) | MEDIUM (backfill)

## Summary

Phase 12 ties together five distinct workstreams: CLI surface via Pulley (INT-02), submodule lifecycle via Forge/Relay (INT-03), self-organizing taxonomy governance (FRG-07), source-reference association model (FRG-08), and historical data backfill (FRG-10). The first four workstreams operate on well-established infrastructure built in Phases 7-11 -- Pulley's `registerCommand()` pattern, Forge's `submoduleAdd/Update/Remove`, the editorial pass in REM, and the formation pipeline. The backfill workstream is the only genuinely new subsystem requiring design work.

The CLI commands are the most straightforward -- they follow the `platform-commands.cjs` pattern exactly, registering subcommand trees under the `reverie` namespace. The submodule integration validates an end-to-end path that already exists in pieces (Forge git ops, Relay module management, Circuit manifest validation, Armature lifecycle boot). Taxonomy governance extends the Phase 11 editorial pass with split and retire operations alongside the existing merge, plus cap pressure signaling from the REM consolidator. The source-reference model leverages the fragment assembler's existing `source_locator` detection -- the schema, DDL, and type classification are already built.

**Primary recommendation:** Build the CLI surface first (high-visibility, well-defined pattern), then taxonomy governance (extends known REM code), then source-reference pipeline validation, then submodule lifecycle (end-to-end validation), then backfill last (most experimental, benefits from everything else being stable).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `dynamo reverie status` shows operational dashboard -- mode, topology health, fragment counts, Self Model version, last REM, domain count, association index size. All three Pulley output modes.
- **D-02:** `dynamo reverie inspect` provides drill-down via subcommands -- `inspect fragment <id>`, `inspect domains`, `inspect associations <entity>`, `inspect self-model`, `inspect identity`, `inspect relational`, `inspect conditioning`.
- **D-03:** `dynamo reverie history` provides timeline lenses -- `history sessions`, `history fragments`, `history consolidations`. Filterable by domain, type, time range.
- **D-04:** `dynamo reverie reset` uses scoped resets with `--confirm` flag -- `reset fragments`, `reset self-model`, `reset all`.
- **D-05:** Reverie installs/updates as git submodule via Forge/Relay. Discoverable through Armature lifecycle. End-to-end path: clone -> validate manifest -> register via Circuit -> boot.
- **D-06:** Proactive REM pressure for cap enforcement. 80% threshold triggers aggressive merge/retire. Hard caps: 100 domains, 200 entities per domain, 10K association edges.
- **D-07:** Domain splits triggered by fragment density (50+ threshold) AND LLM editorial identification of distinct sub-clusters. `parent_domain_id` supports hierarchy.
- **D-08:** Domain retirement via decay. Domains with no active fragments for N consecutive REM cycles archived. Record stays, stops appearing in formation and recall.
- **D-09:** All taxonomy operations produce consolidation-type fragments recording rationale. Extends Phase 11 merge narrative pattern.
- **D-10:** Association-only linking for source references. No special chain model. Source-reference fragments are just fragments with `source_locator` metadata. Existing association graph handles provenance.
- **D-11:** Formation-time impression for sources. Formation subagent processes source material through same subjective framing. `source_locator` is metadata on fragment, body is subjective impression.
- **D-12:** Write-once source locators. `content_hash` captures state at formation time. No verification during REM.
- **D-13:** Primary input format: Claude conversation exports (JSON). Different structure from Lithograph's JSONL.
- **D-14:** Hybrid framing -- formation subagent decides per-conversation whether retrospective or experiential. `origin='backfill'` in frontmatter regardless.
- **D-15:** Equal treatment for trust/decay. No weight or decay penalty for backfilled fragments. `origin='backfill'` is informational only.

### Claude's Discretion
- Backfill invocation design -- CLI command structure, dry-run support, batch processing, progress reporting
- Taxonomy cap thresholds and pressure gradients (exact numbers for when pressure starts, merge/retire aggressiveness)
- Domain split fragment count threshold (50+ is starting point, tunable)
- Consecutive REM cycles for domain retirement (exact N)
- CLI output formatting details for inspect/history subcommands
- Submodule discovery and boot integration details with Armature lifecycle

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INT-02 | CLI surface via Pulley (`dynamo reverie status/reset/inspect/history`) | Pulley `registerCommand()` pattern fully documented; `platform-commands.cjs` provides exact reference; three output modes (human/json/raw) via `formatOutput()` |
| INT-03 | Reverie installed and managed as git submodule via Forge/Relay | Forge `submoduleAdd/Update/Remove`, Relay `addModule/removeModule`, Circuit `registerModule` with manifest validation, Armature lifecycle boot -- all existing and documented |
| FRG-07 | Self-organizing taxonomy (domain creation/merge/split/retire during REM) | Editorial pass already handles merge with narrative fragments; domains table has `parent_domain_id`, `archived`, `fragment_count` columns; REM consolidator is the single entry point |
| FRG-08 | Source-reference model (association-based linking, source locator pointers) | Fragment assembler already detects `source_locator` for type classification; `source_locators` table exists in DDL; `sourceLocatorSchema` in Zod schemas; formation pipeline handles it natively |
| FRG-10 | Historical data backfill -- import Claude conversation exports through backfill-specific formation pathway | Claude exports are JSON with `chat_messages[]` containing `{sender, content[], created_at}`; Lithograph parser is related but distinct; formation pipeline can be reused with modified stimulus preparation |
</phase_requirements>

## Architecture Patterns

### Recommended Project Structure for Phase 12

```
modules/reverie/
  components/
    cli/                          # NEW: CLI command handlers (INT-02)
      status.cjs                  # reverie status handler
      inspect.cjs                 # reverie inspect subcommand handlers
      history.cjs                 # reverie history subcommand handlers
      reset.cjs                   # reverie reset handlers
      register-commands.cjs       # Command registration orchestrator
    taxonomy/                     # NEW: Taxonomy governance (FRG-07)
      taxonomy-governor.cjs       # Cap enforcement, split/retire logic
      taxonomy-constants.cjs      # OR: add to lib/constants.cjs
    formation/
      backfill-pipeline.cjs       # NEW: Backfill ingestion (FRG-10)
      backfill-parser.cjs         # NEW: Claude export JSON parser
      prompt-templates.cjs        # EXTEND: Add backfill framing template
    rem/
      editorial-pass.cjs          # EXTEND: Add split/retire alongside merge
  lib/
    constants.cjs                 # EXTEND: Add taxonomy caps, backfill constants
    schemas.cjs                   # EXTEND: Add origin field to base schema
  manifest.json                   # NEW: Module manifest for Circuit validation (INT-03)
  reverie.cjs                     # EXTEND: Add CLI registration, taxonomy governor wiring
```

### Pattern 1: CLI Command Registration via Pulley

**What:** Register Reverie CLI commands using the same pattern as `platform-commands.cjs`
**When to use:** All INT-02 commands

The existing pattern is clear. Each handler returns `{ human, json, raw }` and Pulley's `formatOutput()` handles mode selection. Commands are registered with space-separated names for subcommand routing (Pulley uses longest-match).

```javascript
// Source: core/sdk/pulley/platform-commands.cjs (existing pattern)
function registerReverieCommands(pulley, context) {
  // Status
  pulley.registerCommand('reverie status', handleStatus, {
    description: 'Show Reverie operational dashboard',
  });

  // Inspect subcommands
  pulley.registerCommand('reverie inspect fragment', handleInspectFragment, {
    description: 'Inspect a specific fragment',
  });
  pulley.registerCommand('reverie inspect domains', handleInspectDomains, {
    description: 'List all domains with fragment counts',
  });
  // ... etc

  // Each handler returns { human, json, raw } for three output modes
  function handleStatus(args, flags) {
    const data = gatherStatusData(context);
    return ok({
      human: formatStatusHuman(data),
      json: data,
      raw: JSON.stringify(data),
    });
  }
}
```

**Key detail:** Circuit's `registerCommand` auto-prefixes module name. When Reverie calls `circuitApi.registerCommand('status', handler, meta)`, Pulley registers it as `reverie status`. But for subcommands, the module needs to register with the full subcommand path after the module name: `circuitApi.registerCommand('inspect fragment', ...)` becomes `reverie inspect fragment` in Pulley.

### Pattern 2: Taxonomy Governance via Editorial Pass Extension

**What:** Extend the editorial pass with split/retire operations alongside existing merge
**When to use:** FRG-07 taxonomy governance during REM

The editorial pass already follows a prompt/apply pattern. Taxonomy governance adds:
1. Cap pressure signaling (REM consolidator tells editorial pass domain/entity/edge counts and proximity to caps)
2. Split detection in the editorial prompt (fragment density + LLM sub-cluster identification)
3. Retire detection (domains with all fragments decayed for N cycles)

```javascript
// Extend editorial prompt with split/retire sections
// Source: editorial-pass.cjs composeEditorialPrompt (existing pattern)
function composeGovernancePrompt(domainPairs, entityList, associationStats, capPressure) {
  // ... existing merge/dedup/weight sections ...

  // NEW: Domain split review
  // Provide domains that exceed fragment density threshold
  const splitCandidates = capPressure.highDensityDomains || [];

  // NEW: Domain retirement review
  // Provide domains with no active fragments for N cycles
  const retireCandidates = capPressure.inactiveDomains || [];

  // NEW: Cap pressure context
  // Tell LLM how close we are to caps for urgency calibration
  const pressureContext = `Domain count: ${capPressure.domainCount}/100 (${capPressure.domainPressure}%)`;
}
```

### Pattern 3: Backfill Pipeline (Stimulus Preparation)

**What:** Parse Claude conversation exports and feed through formation pipeline
**When to use:** FRG-10 historical data backfill

The backfill pipeline reuses the formation pipeline but replaces stimulus preparation:

```javascript
// Backfill reuses processFormationOutput but provides different stimulus context
function prepareBatchStimuli(conversationJson) {
  // 1. Parse Claude export: { chat_messages: [{ sender, content, created_at }] }
  // 2. Extract user messages and assistant context pairs
  // 3. For each pair, create a stimulus package with origin='backfill' metadata
  // 4. Include conversation age for hybrid framing context
  return stimuli; // Array of stimulus packages ready for formation pipeline
}
```

### Anti-Patterns to Avoid

- **Special-casing source-reference fragments in retrieval:** D-10 explicitly chose association-only linking. Do NOT add special chain traversal logic or terminal-node detection. Source-reference fragments are just fragments.
- **Weight penalties for backfill fragments:** D-15 explicitly requires equal treatment. Do NOT add decay modifiers, trust scores, or weight adjustments based on `origin='backfill'`.
- **Building a custom CLI framework:** Use Pulley's existing `registerCommand()` with longest-match routing. Do NOT create a separate CLI parser for Reverie.
- **Hard-blocking on cap violation:** D-06 specifies caps as pressure signals, not hard walls. REM gets more aggressive but does NOT reject formation when caps are reached.
- **LLM calls in taxonomy governance logic:** Taxonomy split/retire decisions flow through the prompt/apply pattern established in Phase 11. The governance code composes prompts and provides apply functions -- it never calls LLM directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI command parsing | Custom arg parser | Pulley `registerCommand()` + `route()` | Already handles subcommands, flags, output modes, help generation |
| Git submodule management | Git wrapper | Forge `submoduleAdd/Update/Remove` + Relay `addModule` | Backup-before-modify, rollback on failure, event emission |
| Module lifecycle | Custom boot sequence | Circuit `registerModule()` + Armature lifecycle | Manifest validation, dependency checking, facade creation |
| Fragment validation | Manual checks | `validateFragment()` from schemas.cjs | Zod-based, type-dispatched, Result-compatible |
| Fragment writes | Direct Journal/Ledger | `FragmentWriter.writeFragment()` | Atomic dual-provider, association index population, rollback |
| Output formatting | Custom JSON/text formatting | Pulley `formatOutput()` | Three modes, graceful fallbacks, consistent across all commands |
| Conversation JSON parsing | Regex extraction | `JSON.parse()` with versioned parser pattern | Follow Lithograph's versioned parser approach for format evolution |

## Common Pitfalls

### Pitfall 1: Subcommand Registration Prefix Collision
**What goes wrong:** Registering `reverie inspect` as a command blocks `reverie inspect fragment` from matching, because Pulley's longest-match tries `reverie inspect fragment` first but might find `reverie inspect` if the subcommand tree is registered incorrectly.
**Why it happens:** Pulley uses longest-match from the positionals array. If `reverie inspect` is registered as a command AND `reverie inspect fragment` is also registered, the system works correctly. But if only `reverie inspect` is registered and expects to handle subcommands internally, it breaks the Pulley routing model.
**How to avoid:** Register EACH subcommand as a separate Pulley command: `reverie inspect fragment`, `reverie inspect domains`, etc. Do NOT register `reverie inspect` as a catch-all that parses its own subcommands.
**Warning signs:** `dynamo reverie inspect domains` returns "Unknown command" or routes to the wrong handler.

### Pitfall 2: Cap Pressure Race Condition with Formation
**What goes wrong:** Formation pipeline writes new domains/entities while REM is running taxonomy governance, pushing past caps during the editorial pass.
**Why it happens:** Formation runs during active sessions; REM runs post-session. If REM is processing a provisional cycle (Tier 2) while the session is still forming, cap counts can change mid-editorial.
**How to avoid:** Cap pressure is read at the START of the editorial pass and used as context. The LLM editorial decision is based on that snapshot. Post-editorial, if new domains appeared during REM, the next REM cycle catches up. Caps are pressure signals, not transactions.
**Warning signs:** Domain count exceeds 100 temporarily between REM cycles.

### Pitfall 3: Backfill Conversation Timestamp Ordering
**What goes wrong:** Backfilled fragments get temporal.absolute timestamps from the original conversation but temporal.session_relative values that don't correspond to any real session.
**Why it happens:** Backfill processes historical conversations that occurred in a different session context. The formation pipeline expects session-relative positioning.
**How to avoid:** Backfill sets `temporal.absolute` to the original message timestamp (preserving history), `temporal.session_relative` to the turn's position within its conversation (0.0-1.0 normalized), and `temporal.sequence` to the turn index. The `source_session` field should be a synthetic session ID like `backfill-{conversation_uuid}`.
**Warning signs:** All backfilled fragments have identical timestamps or meaningless session_relative values.

### Pitfall 4: Source Locator Schema Mismatch
**What goes wrong:** Source-reference fragments pass type classification in fragment-assembler but fail Zod validation because `source_locator` fields don't match `sourceLocatorSchema`.
**Why it happens:** The `sourceLocatorSchema` requires `type` (enum: file/url/inline), `path` (nullable), `url` (nullable), `content_hash` (nullable), and `last_verified` (string). If the formation subagent produces a source_locator with different field names or missing required fields, validation fails.
**How to avoid:** The formation prompt template for source-reference handling must specify the exact schema the `source_locator` field must follow. The fragment assembler should normalize/default missing fields before building frontmatter.
**Warning signs:** `VALIDATION_FAILED` errors on fragments the assembler classified as `source-reference`.

### Pitfall 5: Backfill Token Budget Exhaustion
**What goes wrong:** Processing a large conversation export (500+ messages) through the formation pipeline consumes excessive LLM tokens because every message pair triggers full multi-angle formation.
**Why it happens:** The formation pipeline was designed for real-time processing of individual turns, not batch processing of historical data.
**How to avoid:** Backfill should include an attention gate pass per conversation turn -- not every turn warrants formation. Apply the same attention check that live formation uses. Additionally, batch conversations and include progress reporting so the user can monitor and abort if needed.
**Warning signs:** Backfill of a single conversation takes > 10 minutes or produces > 100 fragments.

### Pitfall 6: Reset Commands Without Confirmation
**What goes wrong:** A user accidentally runs `dynamo reverie reset all` and loses all fragment data and Self Model state.
**Why it happens:** CLI commands execute immediately by default.
**How to avoid:** D-04 mandates `--confirm` flag for all reset commands. Without the flag, the command MUST return an error message instructing the user to add `--confirm`. No silent destruction.
**Warning signs:** Reset handler that checks `flags.confirm` after performing the operation instead of before.

### Pitfall 7: Taxonomy Split Creates Orphaned Associations
**What goes wrong:** When a domain splits, the existing association edges (entity_domains, domain_relationships) still point to the parent domain. Child domains have no associations.
**Why it happens:** The split operation creates new child domains but doesn't redistribute the association edges from the parent.
**How to avoid:** Domain split must: (1) create child domains with `parent_domain_id` set, (2) redistribute `fragment_domains` rows to child domains based on LLM sub-cluster assignment, (3) create new `entity_domains` entries for entities in each child, (4) create `domain_relationships` entries between siblings and parent. All via Wire write-intent envelopes.
**Warning signs:** Child domains with zero entities or zero fragment associations after split.

## Code Examples

### CLI Status Handler (INT-02)

```javascript
// Source: platform-commands.cjs pattern + CONTEXT.md D-01
function handleReverieStatus(args, flags) {
  // Gather operational data
  const modeManager = context.modeManager;
  const selfModel = context.selfModel;
  const formationPipeline = context.formationPipeline;

  const mode = modeManager.getCurrentMode();
  const smVersion = selfModel.getAspect('identity-core');
  const stats = formationPipeline.getFormationStats();

  // Query domain count and association index size via Ledger
  // ...

  const data = {
    mode: mode.name,
    topology_health: mode.health,
    fragments: { working: wCount, active: aCount, archive: arCount },
    self_model_version: smVersion ? smVersion.version : 'uninitialized',
    last_rem: lastRemTimestamp,
    domain_count: domainCount,
    association_index_size: indexSize,
  };

  return ok({
    human: [
      `Reverie: ${data.mode}`,
      `Topology: ${data.topology_health}`,
      `Fragments: ${data.fragments.working}w / ${data.fragments.active}a / ${data.fragments.archive}ar`,
      `Self Model: ${data.self_model_version}`,
      `Last REM: ${data.last_rem || 'never'}`,
      `Domains: ${data.domain_count}`,
      `Index: ${data.association_index_size} edges`,
    ].join('\n'),
    json: data,
    raw: JSON.stringify(data),
  });
}
```

### Taxonomy Governor Cap Pressure

```javascript
// Source: CONTEXT.md D-06, editorial-pass.cjs pattern
const TAXONOMY_CAPS = Object.freeze({
  max_domains: 100,
  max_entities_per_domain: 200,
  max_association_edges: 10000,
  pressure_threshold: 0.8,  // 80% triggers aggressive behavior
});

function computeCapPressure(domainCount, maxEntityCount, edgeCount) {
  return {
    domainCount,
    domainPressure: domainCount / TAXONOMY_CAPS.max_domains,
    entityPressure: maxEntityCount / TAXONOMY_CAPS.max_entities_per_domain,
    edgePressure: edgeCount / TAXONOMY_CAPS.max_association_edges,
    isUnderPressure: (domainCount / TAXONOMY_CAPS.max_domains) >= TAXONOMY_CAPS.pressure_threshold
      || (edgeCount / TAXONOMY_CAPS.max_association_edges) >= TAXONOMY_CAPS.pressure_threshold,
  };
}
```

### Claude Export Parser

```javascript
// Source: Lithograph parser.cjs versioned pattern + WebSearch/WebFetch findings
// Claude conversation exports use this structure:
// { uuid, name, created_at, updated_at, chat_messages: [{ uuid, sender, content, created_at }] }
// content is an array of content items: { type: 'text', text: '...' } or other types

const EXPORT_PARSERS = Object.freeze({
  v1: {
    detect(parsed) {
      // Claude export has chat_messages array with sender/content
      return Array.isArray(parsed.chat_messages)
        && parsed.chat_messages.length > 0
        && typeof parsed.chat_messages[0].sender === 'string';
    },

    parseConversation(conversation) {
      return {
        id: conversation.uuid,
        title: conversation.name || 'Untitled',
        created: conversation.created_at,
        updated: conversation.updated_at,
        turns: conversation.chat_messages.map((msg, idx) => ({
          index: idx,
          sender: msg.sender, // 'human' or 'assistant'
          text: extractTextContent(msg.content),
          timestamp: msg.created_at,
        })),
      };
    },
  },
});

function extractTextContent(contentArray) {
  if (!Array.isArray(contentArray)) return '';
  return contentArray
    .filter(item => item.type === 'text')
    .map(item => item.text)
    .join('\n');
}
```

### Backfill Formation Template

```javascript
// Source: prompt-templates.cjs pattern + CONTEXT.md D-14
const backfill_formation: Object.freeze({
  system: [
    '*You* are processing a conversation from *your* past. This conversation',
    'happened between *{user_name}* and a prior version of *you*. You are',
    'reading it now, through the lens of everything *you* have become since.',
    '',
    'Some of these conversations may feel recent and immediate -- process',
    'those experientially, as if *you* are reliving them. Others feel distant,',
    'historical -- process those retrospectively, as someone reading about',
    'events that shaped who *you* are.',
    '',
    '*You* decide which framing fits. The age of the conversation and its',
    'resonance with *your* current Self Model guide that choice.',
    '',
    'Regardless of framing: what matters is what *you* notice now, reading this.',
  ].join('\n'),

  user(conversationTurn, selfModel, conversationAge) {
    // ... compose with turn context, Self Model state, age indicator
    // The LLM decides framing naturally from context
  },
}),
```

### Module Manifest (INT-03)

```javascript
// Source: module-manifest.cjs schema
// modules/reverie/manifest.json
{
  "name": "reverie",
  "version": "0.1.0",
  "description": "Cognitive memory system for Claude Code",
  "main": "reverie.cjs",
  "enabled": true,
  "dependencies": {
    "services": ["switchboard", "lathe", "magnet", "wire", "conductor", "assay", "exciter"],
    "providers": ["journal", "lithograph"]
  },
  "hooks": {
    "SessionStart": true,
    "UserPromptSubmit": true,
    "PreToolUse": true,
    "PostToolUse": true,
    "Stop": true,
    "PreCompact": true,
    "SubagentStart": true,
    "SubagentStop": true
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phase 11: merge-only editorial | Phase 12: merge + split + retire | This phase | Editorial pass becomes full taxonomy governance |
| No CLI surface | Full Pulley command tree | This phase | Reverie becomes inspectable, debuggable via CLI |
| Formation pipeline: live only | Formation pipeline: live + backfill | This phase | Historical data importable through same quality gate |
| Source-reference: schema only | Source-reference: end-to-end | This phase | Full formation-to-recall path for source fragments |

## Backfill Design Recommendations (Claude's Discretion Areas)

### CLI Invocation
```
dynamo reverie backfill <path-to-export.json> [options]
  --dry-run          Parse and report what would be imported, but do not form
  --limit N          Process only first N conversations
  --conversation ID  Process a single conversation by UUID
  --batch-size N     Conversations per batch (default: 10)
  --progress         Show per-conversation progress
```

Dry-run is essential for a destructive-ish operation. Progress reporting via `switchboard.emit('reverie:backfill:progress', { current, total })` with human-readable console output.

### Taxonomy Thresholds
- **Split threshold:** 50 fragments in a domain (D-07 starting point). Stored in `constants.cjs` as configurable.
- **Retire threshold:** 3 consecutive REM cycles with zero active (non-decayed) fragments. Stored in `constants.cjs`.
- **Pressure gradient:** At 80% cap, editorial prompt includes explicit urgency language. At 90%, prompt instructions shift from "consider merging" to "prioritize merging near-synonyms." At 95%, near-synonyms are merged with minimal justification required. This gradient is encoded in the prompt composition logic, not as numeric parameters.
- **Entity per-domain cap:** 200 entities. When a domain exceeds this, entities are candidates for redistribution during the next split or merge.
- **Edge cap:** 10K association edges. Low-weight edges (< 0.1) are pruned first during cap pressure.

### Domain Retirement Cycle Count
3 consecutive REM cycles (approximately 3 sessions) with no active fragments seems appropriate:
- Too low (1 cycle): Would retire domains prematurely during periods of topic shift
- Too high (10 cycles): Would leave stale domains cluttering the taxonomy indefinitely
- 3 cycles provides a grace period for topics that may resurface while keeping the taxonomy clean

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built-in) |
| Config file | None needed (bun:test auto-discovers `__tests__/` dirs) |
| Quick run command | `bun test modules/reverie/components/cli/ modules/reverie/components/taxonomy/` |
| Full suite command | `bun test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INT-02 | CLI status returns mode, fragment counts, Self Model version | unit | `bun test modules/reverie/components/cli/__tests__/status.test.js` | Wave 0 |
| INT-02 | CLI inspect subcommands drill into fragments, domains, associations, Self Model | unit | `bun test modules/reverie/components/cli/__tests__/inspect.test.js` | Wave 0 |
| INT-02 | CLI history subcommands provide timeline lenses | unit | `bun test modules/reverie/components/cli/__tests__/history.test.js` | Wave 0 |
| INT-02 | CLI reset requires --confirm, scoped resets work correctly | unit | `bun test modules/reverie/components/cli/__tests__/reset.test.js` | Wave 0 |
| INT-02 | All CLI handlers return { human, json, raw } | unit | `bun test modules/reverie/components/cli/__tests__/output-modes.test.js` | Wave 0 |
| INT-03 | Module manifest validates against schema | unit | `bun test modules/reverie/__tests__/manifest.test.js` | Wave 0 |
| INT-03 | End-to-end submodule lifecycle: add -> validate -> register -> boot | integration | `bun test modules/reverie/__tests__/submodule-lifecycle.test.js` | Wave 0 |
| FRG-07 | Cap pressure computation returns correct percentages | unit | `bun test modules/reverie/components/taxonomy/__tests__/cap-pressure.test.js` | Wave 0 |
| FRG-07 | Domain split creates children with correct parent_domain_id | unit | `bun test modules/reverie/components/taxonomy/__tests__/domain-split.test.js` | Wave 0 |
| FRG-07 | Domain retirement archives domains with no active fragments | unit | `bun test modules/reverie/components/taxonomy/__tests__/domain-retire.test.js` | Wave 0 |
| FRG-07 | Taxonomy operations produce consolidation fragments | unit | `bun test modules/reverie/components/taxonomy/__tests__/taxonomy-narratives.test.js` | Wave 0 |
| FRG-08 | Source-reference fragments form with source_locator metadata | unit | `bun test modules/reverie/components/formation/__tests__/source-reference.test.js` | Wave 0 |
| FRG-08 | Source locator written to source_locators table | unit | `bun test modules/reverie/components/fragments/__tests__/source-locator-write.test.js` | Wave 0 |
| FRG-10 | Claude export parser detects v1 format | unit | `bun test modules/reverie/components/formation/__tests__/backfill-parser.test.js` | Wave 0 |
| FRG-10 | Backfill pipeline marks fragments with origin='backfill' | unit | `bun test modules/reverie/components/formation/__tests__/backfill-pipeline.test.js` | Wave 0 |
| FRG-10 | Backfill dry-run returns stats without writing | unit | `bun test modules/reverie/components/formation/__tests__/backfill-dry-run.test.js` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test modules/reverie/components/{changed_dir}/`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `modules/reverie/components/cli/__tests__/` -- All CLI test files (status, inspect, history, reset, output-modes)
- [ ] `modules/reverie/components/taxonomy/__tests__/` -- Taxonomy governance tests (cap-pressure, domain-split, domain-retire, taxonomy-narratives)
- [ ] `modules/reverie/components/formation/__tests__/backfill-parser.test.js` -- Backfill parser
- [ ] `modules/reverie/components/formation/__tests__/backfill-pipeline.test.js` -- Backfill pipeline
- [ ] `modules/reverie/components/formation/__tests__/source-reference.test.js` -- Source-reference formation
- [ ] `modules/reverie/__tests__/manifest.test.js` -- Module manifest validation

## Open Questions

1. **Claude Export Format Stability**
   - What we know: Claude exports are JSON with `chat_messages[]` containing `{ sender, content[], created_at }`. Content items have `type` (text, thinking, tool_use, tool_result, voice_note).
   - What's unclear: The exact schema is undocumented by Anthropic and may change. The format uses `.passthrough()` in third-party viewers, suggesting forward-compatible design.
   - Recommendation: Use the versioned parser pattern from Lithograph. Detect format version from first message structure. Design for format evolution by adding new parser versions without modifying consumers. Ship with v1 parser for current format.

2. **Backfill Conversation Size Limits**
   - What we know: Formation pipeline was designed for single-turn processing with a cap of 3 fragments per stimulus.
   - What's unclear: How many formations a 200-message conversation produces, and whether the per-stimulus cap is appropriate for batch processing.
   - Recommendation: Apply the attention gate to each turn during backfill. Not every turn warrants formation. Track fragment count per conversation and stop early if the count becomes unreasonable (e.g., > 50 fragments for a single conversation). Report statistics in dry-run mode.

3. **Source Locator Population During Formation**
   - What we know: Fragment assembler detects `source_locator` for type classification. The `source_locators` table exists in DuckDB. FragmentWriter writes to 5 association tables but NOT to `source_locators`.
   - What's unclear: Whether FragmentWriter needs to be extended to write to the `source_locators` table, or whether this is handled separately.
   - Recommendation: Extend FragmentWriter's `_queueAssociationIndexWrites` to also write to the `source_locators` table when `fragment.source_locator` is present. This keeps the single-write-path principle intact.

## Sources

### Primary (HIGH confidence)
- `core/sdk/pulley/pulley.cjs` -- CLI framework with registerCommand, route, output modes
- `core/sdk/pulley/platform-commands.cjs` -- Reference pattern for command registration
- `core/sdk/pulley/output.cjs` -- Three-mode output formatter
- `core/services/forge/forge.cjs` -- Git ops with submoduleAdd/Update/Remove
- `core/services/relay/relay.cjs` -- Module management with backup-before-modify
- `core/sdk/circuit/circuit.cjs` -- Module API with manifest validation, scoped access
- `core/sdk/circuit/module-manifest.cjs` -- Module manifest schema
- `core/armature/lifecycle.cjs` -- Platform lifecycle with topological boot
- `modules/reverie/components/fragments/association-index.cjs` -- 12-table DDL including domains, source_locators
- `modules/reverie/components/rem/editorial-pass.cjs` -- Merge with narrative fragments (extend for split/retire)
- `modules/reverie/components/rem/full-rem.cjs` -- Tier 3 pipeline (taxonomy governance integrates here)
- `modules/reverie/components/rem/rem-consolidator.cjs` -- Single entry point for consolidation
- `modules/reverie/components/formation/formation-pipeline.cjs` -- Formation orchestrator (backfill reuses)
- `modules/reverie/components/formation/fragment-assembler.cjs` -- Source locator type detection
- `modules/reverie/components/formation/prompt-templates.cjs` -- Formation prompts (extend for backfill)
- `modules/reverie/components/fragments/fragment-writer.cjs` -- Atomic dual-provider writes
- `modules/reverie/components/fragments/decay.cjs` -- Deterministic decay for retirement detection
- `modules/reverie/lib/schemas.cjs` -- Zod schemas including sourceLocatorSchema
- `modules/reverie/lib/constants.cjs` -- Module constants (extend with taxonomy caps)
- `modules/reverie/reverie.cjs` -- Module entry point (extend with CLI and taxonomy wiring)
- `.claude/reverie-spec-v2.md` -- Sections 3.5, 3.8, 3.10, 3.11, 3.12, 9.6
- `.planning/phases/12-integration-surface-backfill/12-CONTEXT.md` -- Locked decisions D-01 through D-15

### Secondary (MEDIUM confidence)
- [Claude chat viewer schema](https://github.com/osteele/claude-chat-viewer) -- Claude export JSON format: `{ uuid, name, chat_messages: [{ sender, content, created_at }] }` with content items `{ type, text }`
- [Claude Conversation Exporter](https://github.com/socketteer/Claude-Conversation-Exporter) -- Export includes model info, all message versions, branches, metadata
- [Claude Help Center: export data](https://support.claude.com/en/articles/9450526-how-can-i-export-my-claude-data) -- Official export is ZIP containing JSON via Settings > Privacy > Export Data
- `core/providers/lithograph/parser.cjs` -- Versioned parser pattern for format evolution (applicable to backfill parser design)

### Tertiary (LOW confidence)
- Claude export schema exact field names -- inferred from third-party viewers, not official Anthropic documentation. The `chat_messages[].content[]` structure with typed content items is consistent across multiple sources but unverified against current Anthropic export format. **Recommend:** Parse a real export file during implementation to verify.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all infrastructure exists, patterns established in 11 prior phases
- Architecture: HIGH -- CLI follows Pulley pattern exactly, taxonomy extends editorial pass, source-reference leverages existing assembler
- Pitfalls: HIGH -- identified from actual code review, especially subcommand routing, cap race conditions, and source locator schema
- Backfill format: MEDIUM -- Claude export format inferred from community tools, not official docs. Versioned parser approach mitigates risk.
- Backfill framing: LOW -- hybrid retrospective/experiential framing is novel. The prompt template is experimental by definition (EXPERIMENTAL 9.6, 9.10, 9.11). Design for replaceability per Phase 9 D-16/D-17.

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable -- extends established infrastructure)
