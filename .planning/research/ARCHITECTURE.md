# Architecture Patterns: Reverie Module Integration with Dynamo Platform

**Domain:** Cognitive memory module integrating with existing platform services
**Researched:** 2026-03-23
**Overall confidence:** HIGH (based on direct source code analysis of all platform services + canonical spec)

---

## 1. Recommended Architecture: Module Internal Decomposition

### 1.1 How Reverie Maps to Circuit's Module API

Reverie registers with Circuit via a single manifest and `registerFn`. Circuit provides:
- **Scoped service access** via `circuitApi.getService(name)` -- returns facades only (lines 50-70, circuit.cjs)
- **Scoped provider access** via `circuitApi.getProvider(name)` -- same facade isolation
- **Namespaced events** via `circuitApi.events` (an EventProxy instance) -- `emit('update')` becomes `switchboard.emit('reverie:update')`
- **System event passthrough** -- `events.on('hook:session-start', handler)` passes through un-namespaced (event-proxy.cjs lines 42-48)
- **CLI registration** via `circuitApi.registerCommand()` -- delegates to Pulley
- **MCP tool registration** via `circuitApi.registerMcpTool()`

**Critical constraint:** Circuit checks `manifest.dependencies.services` and `manifest.dependencies.providers` before granting access. Reverie must declare ALL platform dependencies upfront.

### 1.2 Reverie Module Manifest

```javascript
const REVERIE_MANIFEST = {
  name: 'reverie',
  version: '0.1.0',
  description: 'Cognitive memory system with Self Model, fragments, and three-session architecture',
  main: 'modules/reverie/reverie.cjs',
  enabled: true,
  dependencies: {
    services: ['wire', 'switchboard', 'commutator', 'magnet', 'conductor', 'lathe', 'assay'],
    providers: ['ledger', 'journal'],
  },
  hooks: {
    'SessionStart': true,
    'UserPromptSubmit': true,
    'PreToolUse': true,
    'PostToolUse': true,
    'Stop': true,
    'PreCompact': true,
    'SubagentStart': true,
    'SubagentStop': true,
  },
};
```

### 1.3 Internal Component Decomposition

Reverie's internal structure should mirror the spec's functional boundaries, NOT the platform's service/provider pattern. Reverie is a module, not a mini-platform. Its internals are plain CJS modules composed via the options-based DI pattern validated in v0.

```
modules/reverie/
  reverie.cjs                    # Module entry point: registerFn callback
  lib/
    constants.cjs                # Fragment types, decay params, mode enum, thresholds
    schema.cjs                   # Fragment YAML schema, Self Model field definitions
  components/
    self-model/
      self-model.cjs             # Self Model state manager (identity, relational, conditioning)
      cold-start.cjs             # Initial Self Model seed generation
      prompt-composer.cjs        # Composes Face/Mind/Subconscious prompts from state
    fragment-engine/
      fragment-engine.cjs        # Fragment CRUD orchestrator
      formation.cjs              # Multi-angle formation pipeline (attention check, fan-out)
      recall.cjs                 # Retrieval + ranking + reconstruction orchestration
      decay.cjs                  # Deterministic decay computation (no LLM)
      association-index.cjs      # Ledger table management for the association index
    session-manager/
      session-manager.cjs        # Three-session lifecycle orchestrator
      primary-handler.cjs        # Hook processing for Primary session
      secondary-handler.cjs      # Mind session logic dispatcher
      tertiary-handler.cjs       # Sublimation cycle runner
    rem/
      rem-consolidator.cjs       # REM orchestrator (tier 1/2/3 dispatch)
      retroactive.cjs            # Retroactive fragment evaluation
      editorial.cjs              # Association index editorial pass
      conditioning-update.cjs    # Self Model conditioning updater
    context-manager/
      context-manager.cjs        # Primary context injection orchestrator
      budget.cjs                 # 4-phase context budget tracker
      framing.cjs                # Referential framing prompt generator
      compaction.cjs             # PreCompact Self Model preservation
    mode-manager/
      mode-manager.cjs           # Operational mode state machine (Active/Passive/REM/Dormant)
  data/                          # Module data directory (spec Section 6.3)
    fragments/
      active/
      working/
      archive/
    self-model/
    taxonomy/
    sessions/
  tests/
    ...
```

### 1.4 Component Boundaries and Platform Integration Points

| Internal Component | Platform Services Used | Platform Providers Used | Access Pattern |
|---|---|---|---|
| **Self Model** | Magnet (state persistence), Switchboard (state:changed events) | Journal (narrative state files), Ledger (structured state tables) | Read on boot, write on REM, continuous Magnet cache |
| **Fragment Engine** | Assay (recall queries), Lathe (working dir management), Switchboard (formation events) | Journal (fragment markdown files), Ledger (association index tables) | Write-heavy during sessions, read-heavy on recall |
| **Session Manager** | Wire (inter-session messaging), Conductor (dependency checks), Switchboard (lifecycle events) | -- | Wire.send() for all session communication |
| **REM Consolidator** | Lathe (working dir cleanup), Switchboard (REM lifecycle events) | Journal (fragment promotion), Ledger (index editorial) | Write-heavy post-session |
| **Context Manager** | Commutator (hook injection via registerOutput), Magnet (state file reads) | -- | Read Self Model state, write systemMessage via hook stdout |
| **Mode Manager** | Switchboard (mode transition events), Magnet (mode state) | -- | State machine, emits events on transitions |

### 1.5 Component Communication Pattern

Internal components do NOT communicate through Switchboard. They communicate through direct function calls, orchestrated by the Session Manager and the module entry point. Switchboard is for platform-level event routing only.

```
reverie.cjs (entry)
  -> registers hook handlers via events.on('hook:*')
  -> creates all internal components with injected platform facades
  -> Session Manager orchestrates lifecycle
     -> calls Fragment Engine methods directly
     -> calls Self Model methods directly
     -> calls Context Manager methods directly
  -> REM Consolidator receives control from Session Manager on session end
     -> calls Fragment Engine, Self Model, Association Index directly
```

**Rationale:** Using Switchboard for internal module communication would create a hidden dependency graph and make testing harder. The options-based DI pattern means each component receives exactly what it needs as constructor arguments. Integration tests compose the real components; unit tests inject mocks.

---

## 2. Three-Session Orchestration: Wire Integration

### 2.1 Wire's Existing Capabilities vs. What Reverie Needs

**Wire already provides:**
- Session registry with `register(sessionId, info)` and `unregister(sessionId)` -- stores identity, capabilities, writePermissions
- Message sending via `send(envelope)` with transport routing (Channels API or HTTP relay)
- Priority queue with 4 urgency levels: `urgent (0) > directive (1) > active (2) > background (3)`
- Message types already defined in protocol.cjs that map directly to Reverie's needs:
  - `context-injection` -- Secondary -> Primary Self Model updates
  - `directive` -- Secondary -> Primary behavioral instructions
  - `recall-product` -- Secondary -> Primary recall reconstructions
  - `sublimation` -- Tertiary -> Secondary fuzzy associations
  - `snapshot` -- Primary -> Secondary conversation snapshots
  - `write-intent` -- Any session -> Ledger write coordinator
  - `heartbeat` / `ack` -- Session health monitoring
- Write coordinator with greedy batching for Ledger writes
- Switchboard event emission on all lifecycle events (`wire:session-registered`, `wire:session-lost`, etc.)
- Dual transport: Channels API (primary) + HTTP relay (fallback)

**Wire does NOT currently provide (new orchestration needed):**

| Gap | What's Needed | Where to Build It |
|-----|---------------|-------------------|
| **Session spawning** | Spawn Secondary and Tertiary as Claude Code channel sessions | Session Manager uses Bun.spawn to launch `claude` CLI processes with channel config -- NOT a Conductor responsibility (see rationale below) |
| **Session identity roles** | Registry entries need `role: 'primary' | 'secondary' | 'tertiary'` | Extend the `info` object passed to `wire.register()` -- already supports arbitrary info objects |
| **Topology enforcement** | Primary <-> Secondary <-> Tertiary only (no Primary <-> Tertiary direct) | Session Manager validates `envelope.to` before calling `wire.send()` |
| **Conversation forwarding** | Hooks on Primary need to forward payloads to Secondary via Wire | Commutator output adapters -> Wire.send() in Session Manager |
| **Sublimation cycle timer** | Tertiary needs a configurable interval loop | Tertiary handler runs `setInterval` -> Assay query -> Wire.send(sublimation) |
| **Session health monitoring** | Detect if Secondary or Tertiary crashes / disconnects | Wire already emits `wire:session-lost` -- Session Manager subscribes and handles recovery |

### 2.2 Session Spawning: The Missing Piece

Conductor currently manages Docker Compose lifecycle, not Claude Code sessions. The three-session architecture needs to spawn Claude Code instances as channel sessions. This is the most significant gap.

**Recommended approach:** Session Manager uses Bun.spawn (via Lathe or directly) to launch `claude` CLI processes with the channel plugin configured. This is NOT a Conductor responsibility -- Conductor is for infrastructure dependencies (Docker, DuckDB, disk checks). Session spawning belongs in the Session Manager component within Reverie, using Wire's transport layer for communication after spawn.

```
Session Manager spawning flow:
1. SessionStart hook fires on Primary
2. Session Manager starts Wire relay (wire.start())
3. Session Manager spawns Secondary via Bun.spawn('claude', [...channelArgs])
4. Session Manager spawns Tertiary via Bun.spawn('claude', [...channelArgs])
5. Secondary connects to Wire relay, registers as { role: 'secondary', capabilities: [...] }
6. Tertiary connects to Wire relay, registers as { role: 'tertiary', capabilities: [...] }
7. Session Manager subscribes to wire:session-registered, waits for both
8. Session Manager triggers Self Model load + prompt composition
9. Session Manager sends Face prompt to Primary via hook state file
10. Session Manager sends Subconscious prompt to Tertiary via Wire
```

**Why not Conductor?** Conductor's contract is `composeUp/composeDown/composeStatus/checkDependencies/isDockerAvailable`. Claude Code sessions are not Docker containers. Adding `spawnClaudeSession()` to Conductor would violate its infrastructure-ops domain responsibility. The Session Manager owns session lifecycle; it uses Wire for communication and Bun.spawn for process creation.

### 2.3 Wire Message Flow Topology

```
PRIMARY (Face)                    SECONDARY (Mind)                 TERTIARY (Subconscious)
     |                                  |                                |
     |--- snapshot (background) ------->|                                |
     |                                  |--- directive (directive) ----->| (attention pointer)
     |<-- context-injection (bg) -------|                                |
     |<-- directive (directive) --------|                                |
     |<-- recall-product (active) ------|                                |
     |                                  |<-- sublimation (background) ---|
     |                                  |--- write-intent ------------->Wire.queueWrite()
     |                                  |                                |--- (reads Assay only)
     |--- snapshot (on hook fire) ----->|                                |
     |<-- context-injection (bg) -------|                                |
```

**Urgency level usage:**
- `background`: Self Model prompt updates, conversation snapshots, sublimation candidates
- `active`: Recall products ready for injection, attention pointer updates
- `directive`: Behavioral directives ("shift communication style"), sublimation sensitivity changes
- `urgent`: Emergency context (stop current approach, critical sublimation connection)

### 2.4 Wire Registry Session Info Extension

Current `wire.register(sessionId, info)` accepts arbitrary info objects. Reverie registers sessions with:

```javascript
wire.register('reverie-primary-' + sessionId, {
  identity: { module: 'reverie', role: 'primary', sessionId },
  capabilities: ['receive-context', 'receive-directive', 'receive-recall'],
  writePermissions: [],  // Primary does NOT write to Ledger directly
});

wire.register('reverie-secondary-' + sessionId, {
  identity: { module: 'reverie', role: 'secondary', sessionId },
  capabilities: ['receive-snapshot', 'receive-sublimation', 'formation', 'recall', 'rem'],
  writePermissions: ['fragments', 'associations', 'self-model', 'taxonomy'],
});

wire.register('reverie-tertiary-' + sessionId, {
  identity: { module: 'reverie', role: 'tertiary', sessionId },
  capabilities: ['receive-attention', 'sublimation-scan'],
  writePermissions: [],  // Tertiary reads only
});
```

---

## 3. Data Flow Architecture

### 3.1 Fragment Formation Flow

```
User sends message to Primary
  |
  v
Claude Code fires UserPromptSubmit hook
  |
  v
Commutator.ingest(hookPayload) --> Switchboard.emit('hook:prompt-submit', payload)
  |
  v
Reverie's hook handler (registered via events.on('hook:prompt-submit'))
  |
  v
Context Manager: inject Self Model systemMessage via hook stdout
  |
  v (simultaneously)
Session Manager: forward prompt content to Secondary via Wire
  wire.send(createEnvelope({
    from: primarySessionId,
    to: secondarySessionId,
    type: MESSAGE_TYPES.SNAPSHOT,
    urgency: URGENCY_LEVELS.BACKGROUND,
    payload: { hook: 'UserPromptSubmit', content: hookPayload }
  }))
  |
  v
SECONDARY (Mind) receives snapshot, processes through formation pipeline:
  |
  v
Fragment Engine: formation.cjs
  1. Attention check against current pointer (deterministic gate)
  2. Domain fan-out: classify stimulus, check per-domain thresholds
  3. For each activated domain (1-3 typically):
     a. Score Self Model relevance (identity, relational, conditioning)
     b. Generate associations (entities, tags, valence)
     c. Compose impressionistic body
     d. Seed decay weight
  4. Tag formation group, link sibling fragments
  |
  v
Fragment Engine: fragment-engine.cjs
  5. Write fragments to Journal (working directory)
     journal.write(fragmentId, { frontmatter, body })
     --> writes to: modules/reverie/data/fragments/working/session-{id}/
  |
  v
  6. Update association index in Ledger via Wire write coordinator
     wire.queueWrite(createEnvelope({
       from: secondarySessionId,
       to: 'ledger',
       type: MESSAGE_TYPES.WRITE_INTENT,
       urgency: URGENCY_LEVELS.ACTIVE,
       payload: {
         table: 'associations',
         data: [{ source_id, target_id, type, weight, ... }]
       }
     }))
```

**Key detail:** Journal writes happen directly from Secondary (Journal is file-based, no single-writer constraint). Ledger writes go through Wire's write coordinator (DuckDB single-writer constraint). See Section 4 for the full write coordination analysis.

### 3.2 Fragment Recall Flow

```
Mind determines recall is needed (conversation context or sublimation trigger)
  |
  v
Fragment Engine: recall.cjs
  1. Compose Assay query from:
     - Current attention pointer
     - Active domains
     - Entity references from conversation
     - Temporal hints if applicable
  |
  v
  2. Federated search via Assay:
     assay.search({
       criteria: {
         domains: activeDomains,
         attention_tags: relevantTags,
         min_weight: 0.3  // decay threshold
       },
       providers: ['journal', 'ledger'],  // search both
       options: {
         sql: 'SELECT fragment_id, weight FROM fragment_decay WHERE current_weight > 0.3 ORDER BY current_weight DESC LIMIT 20',
         limit: 20
       }
     })
  |
  v
  3. Assay dispatches to both providers in parallel (assay.cjs lines 192-243):
     - Ledger: SQL query against association index tables
     - Journal: Frontmatter criteria match against fragment files
     Both return results tagged with _provider metadata
  |
  v
  4. recall.cjs: Composite ranking
     - Merge Ledger association scores with Journal content matches
     - Apply Self Model relevance weighting
     - Apply decay weighting (current_weight from fragment_decay table)
     - Select top N fragments (configurable, default 5-15)
  |
  v
  5. recall.cjs: Retrieve full fragment bodies from Journal
     journal.read(fragmentId) for each selected fragment
  |
  v
  6. recall.cjs: LLM Reconstruction
     Mind session synthesizes fragments through current Self Model frame
     (This is an LLM operation within the Secondary Claude Code session)
  |
  v
  7. Send recall product to Primary:
     wire.send(createEnvelope({
       from: secondarySessionId,
       to: primarySessionId,
       type: MESSAGE_TYPES.RECALL_PRODUCT,
       urgency: URGENCY_LEVELS.ACTIVE,
       payload: { reconstruction, sourceFragments, context }
     }))
```

### 3.3 Self Model Injection Flow

```
Every UserPromptSubmit hook fires on Primary
  |
  v
Commutator bridges to Switchboard: 'hook:prompt-submit'
  |
  v
Context Manager (registered via Commutator.registerOutput):
  1. Read current Self Model state file
     (Written by Secondary to a known path: modules/reverie/data/self-model/current-face.json)
  |
  v
  2. budget.cjs: Determine injection phase (1-4) based on estimated context utilization
     Phase 1 (0-50%):   Full injection ~1800 tokens
     Phase 2 (50-75%):  Compressed ~1000 tokens
     Phase 3 (75-90%):  Minimal ~400 tokens
     Phase 4 (>90%):    Compaction advocacy ~200 tokens
  |
  v
  3. framing.cjs: Compose referential framing prompt
     - Identity frame (personality, style, boundaries)
     - Relational context (user state, trust calibration)
     - Attention directives (what Mind considers important)
     - Active recall products (if any)
     - Behavioral directives from Secondary
     - Referential framing instruction
  |
  v
  4. Output via hook stdout as systemMessage
     (Commutator's registerOutput pattern -- hook writes to stdout,
      Claude Code processes it as system context injection)
```

**Critical implementation detail:** The `UserPromptSubmit` hook is synchronous. The Context Manager must read a pre-prepared state file, not query Wire in real-time. Secondary writes this state file proactively between user turns. The hook reads the file and outputs the systemMessage. This is the background urgency path -- Secondary updates the file, Primary's hook reads it on next prompt.

### 3.4 REM Consolidation Flow

```
Session end signal (Stop hook or idle timeout)
  |
  v
Session Manager: notify Secondary
  wire.send({ type: DIRECTIVE, payload: { command: 'begin-rem', tier: 3 } })
  |
  v
Session Manager: notify Tertiary to shutdown
  wire.send({ type: DIRECTIVE, payload: { command: 'shutdown' } })
  Tertiary emits final sublimation batch, terminates
  |
  v
REM Consolidator (runs in Secondary):
  |
  v
  1. retroactive.cjs: Re-evaluate all session fragments
     - Read all fragments from Journal working directory
     - Score against completed session arc (full context available)
     - Update headers: relevance scores, pointers, attention tags
     - Write updated fragments back to Journal working directory
  |
  v
  2. rem-consolidator.cjs: Meta-fragment creation
     - For each recall event during session, create meta-recall fragment
     - Write to Journal working directory
  |
  v
  3. rem-consolidator.cjs: Sublimation triage
     - Evaluate all sublimation candidates from Tertiary
     - Signal-producing sublimations -> create sublimation fragments
     - Noise sublimations -> discard
     - Update Conditioning sublimation_sensitivity per domain
  |
  v
  4. editorial.cjs: Association index editorial pass
     - Deduplicate entities (Ledger query + merge)
     - Update association weights (strengthen used, weaken unused)
     - Review domain boundaries (merge/split/create/retire)
     - Update taxonomy narrative in Journal
     All Ledger writes via Wire write coordinator
  |
  v
  5. conditioning-update.cjs: Self Model conditioning update
     - Evaluate attention biases (which were useful?)
     - Update recall strategies
     - Update error history
     - Conservative updates (single session doesn't shift dramatically)
     Write to Journal (narrative) + Ledger (structured) + Magnet (cache)
  |
  v
  6. Fragment promotion: working -> active
     - Surviving fragments moved from working/ to active/ subdirectories
     - Pruned fragments discarded
     - Journal file moves via Lathe
  |
  v
  7. Self Model state persistence
     magnet.set('module', 'reverie', 'selfModelVersion', newVersion)
     journal.write('self-model/identity-core', updatedIdentity)
     journal.write('self-model/relational-model', updatedRelational)
     Ledger writes for structured state via wire.queueWrite()
  |
  v
  8. Cleanup
     - Remove working directory for this session
     - Wire relay shutdown
     - Session Manager terminates Secondary
```

### 3.5 Sublimation Flow

```
TERTIARY (continuous cycle, configurable 5-10s interval):
  |
  v
  1. Receive state from Secondary via Wire:
     - attention_pointer: current conversational focus
     - active_domains: which domains to scan
     - sensitivity_thresholds: per-domain sublimation thresholds
     - priming_signals: fragments/entities to bias toward
  |
  v
  2. Index scan via Assay (header-only, no full retrieval):
     assay.search({
       criteria: {
         attention_tags: attention_pointer.tags,
         domains: active_domains,
       },
       providers: ['ledger'],  // Ledger only for header/index scans
       options: {
         sql: `SELECT f.fragment_id, f.current_weight, d.name as domain,
                      GROUP_CONCAT(at.tag) as tags
               FROM fragment_decay f
               JOIN entity_domains ed ON ...
               JOIN domains d ON ...
               JOIN fragment_tags ft ON f.fragment_id = ft.fragment_id
               JOIN attention_tags at ON ft.tag_id = at.id
               WHERE f.current_weight > 0.1
               GROUP BY f.fragment_id
               ORDER BY f.current_weight DESC
               LIMIT 50`
       }
     })
  |
  v
  3. Resonance scoring (deterministic, no LLM):
     - Score each match against attention pointer overlap
     - Score entity co-occurrence across domains
     - Score emotional valence alignment
  |
  v
  4. Emit sublimations above threshold:
     wire.send(createEnvelope({
       from: tertiarySessionId,
       to: secondarySessionId,
       type: MESSAGE_TYPES.SUBLIMATION,
       urgency: URGENCY_LEVELS.BACKGROUND,
       payload: {
         fragmentId,
         resonanceScore,
         associationPath: { domain, tag, entity },
       }
     }))
  |
  v
  5. Wait for next cycle interval, return to step 1
```

---

## 4. Concurrency and Write Coordination

### 4.1 The DuckDB Single-Writer Problem

DuckDB allows only one writer at a time. Wire's write coordinator (write-coordinator.cjs) already addresses this with a centralized queue that serializes writes with greedy batching. The key question: how do three sessions coordinate writes through this single coordinator?

**Architecture decision: Secondary is the sole Ledger writer.**

This is not a limitation -- it follows directly from the spec. Examining write responsibilities:

| Session | Reads Ledger? | Writes Ledger? | What it writes |
|---------|--------------|----------------|----------------|
| Primary | No | **No** | Nothing -- Primary has no fragment or index responsibilities |
| Secondary | Yes (via Assay) | **Yes** | Association index, fragment decay, Self Model structured state, taxonomy structure |
| Tertiary | Yes (via Assay, read-only scans) | **No** | Nothing -- Tertiary only resonates, never modifies |

**Therefore:** The single-writer constraint is satisfied by design. Secondary is the only session that calls `wire.queueWrite()`. There is no multi-writer contention because Primary and Tertiary never write to Ledger.

### 4.2 What About REM Consolidation?

During REM, only Secondary is running (Primary and Tertiary have terminated). Secondary has exclusive access to Ledger. The write coordinator still serializes writes for internal ordering, but there is zero contention.

### 4.3 What About Subagents?

Secondary can spawn subagents for parallel recall or batch processing. If subagents need to write to Ledger, they MUST route through Wire's write coordinator (same as Secondary). Subagents inherit Wire tools (validated by PoC test G3 per spec Section 4.5), so they send `write-intent` envelopes that enter the same serialized queue.

This means subagent writes are serialized with Secondary's writes automatically. No additional coordination needed.

### 4.4 Journal Write Contention

Journal is file-based (markdown files via Lathe). Unlike DuckDB, there is no single-writer constraint at the provider level. However, concurrent file writes to the SAME file from different sessions could corrupt data.

**Mitigation by design:**
- Primary never writes fragments.
- Secondary writes to `fragments/working/session-{id}/` -- a session-scoped directory.
- Tertiary never writes fragments.
- REM runs in Secondary only (no other sessions running).
- Different fragment IDs always produce different file paths.

**Remaining risk:** If Secondary spawns multiple subagents that write different fragments concurrently, they write to DIFFERENT files (unique fragment IDs). Lathe uses atomic writes (Bun.file/Bun.write with atomic semantics). No contention.

**The only coordination needed:** During REM fragment promotion (moving from working/ to active/), Secondary must be the sole writer. Since REM runs post-session with only Secondary active, this is guaranteed.

### 4.5 Self Model State File Coordination

Secondary writes the Face prompt state file (`current-face.json`). Primary's hook reads it synchronously. This is a classic reader-writer scenario.

**Pattern:** Atomic write (Bun.write is atomic). Secondary writes the complete file atomically. Primary reads whatever version is on disk. If Primary reads during a write, it gets either the old complete file or the new complete file -- never a partial. This is safe without locking because Bun.write is implemented with Zig's atomic file operations.

---

## 5. Hook Integration Architecture

### 5.1 Commutator Event Routing

Commutator already maps all 8 Claude Code hooks to Switchboard events (commutator.cjs lines 51-58):

| Claude Code Hook | Commutator Event Name | Reverie Listener |
|---|---|---|
| `SessionStart` | `hook:session-start` | Session Manager: boot Wire, spawn Secondary/Tertiary |
| `UserPromptSubmit` | `hook:prompt-submit` | Context Manager: inject Self Model. Session Manager: forward to Secondary |
| `PreToolUse` | `file:pending` / `shell:pending` / `web:pending` / `tool:pending` | Session Manager: forward to Secondary. Secondary may intercept |
| `PostToolUse` | `file:changed` / `shell:executed` / `web:fetched` / `tool:changed` | Session Manager: forward summary to Secondary |
| `Stop` | `hook:stop` | Session Manager: evaluate -- session-ending or turn-ending? |
| `PreCompact` | `hook:pre-compact` | Context Manager: inject compaction framing. REM Consolidator: Tier 1 triage |
| `SubagentStart` | `hook:subagent-start` | Session Manager: forward to Secondary, inject context if available |
| `SubagentStop` | `hook:subagent-stop` | Session Manager: forward output summary to Secondary |

### 5.2 Reverie Hook Registration Pattern

Reverie registers its hook handlers during the `registerFn` callback in Circuit. The event proxy handles namespace routing:

```javascript
// In reverie.cjs registerFn:
function register(circuit) {
  const events = circuit.events;

  // System events (hook:*, state:*) pass through un-namespaced
  events.on('hook:session-start', (payload) => sessionManager.onSessionStart(payload));
  events.on('hook:prompt-submit', (payload) => {
    contextManager.injectSelfModel(payload);  // synchronous hook output
    sessionManager.forwardToSecondary(payload);  // async Wire send
  });
  events.on('hook:stop', (payload) => sessionManager.onStop(payload));
  events.on('hook:pre-compact', (payload) => {
    contextManager.injectCompactionFrame(payload);
    remConsolidator.triggerTriage(payload);
  });
  events.on('hook:subagent-start', (payload) => sessionManager.onSubagentStart(payload));
  events.on('hook:subagent-stop', (payload) => sessionManager.onSubagentStop(payload));

  // For tool hooks (PreToolUse/PostToolUse), Commutator resolves to domain events
  // like file:changed, shell:executed. These are NOT hook:* prefixed, so EventProxy
  // would namespace them as reverie:file:changed. Instead, use hook:raw which
  // Commutator emits for EVERY hook (commutator.cjs line 170).
  // hook:raw passes through EventProxy's system-event filter.

  // NOTE: hook:raw does NOT pass through EventProxy currently (only hook:* and state:* do).
  // Two options:
  // 1. Extend EventProxy pass-through list (small platform change)
  // 2. Register directly on Switchboard facade during registerFn (works now)
  // Recommendation: Option 2 for M2, Option 1 as tech debt for platform v1.1

  return circuit.ok();
}
```

### 5.3 Event Proxy Gap: Tool Hook Access

**Issue identified:** Commutator resolves PreToolUse/PostToolUse to domain events like `file:changed`, `shell:executed`, etc. These are NOT `hook:*` prefixed, so Circuit's event proxy namespaces them as `reverie:file:changed` instead of passing through.

However, Commutator also emits `hook:raw` for every hook (commutator.cjs line 170). Reverie can listen for `hook:raw` and filter for PreToolUse/PostToolUse events internally.

**Current workaround:** `hook:raw` starts with `hook:` so it DOES pass through EventProxy's system event filter. Reverie listens on `hook:raw`, inspects `payload.hook_event_name`, and handles PreToolUse/PostToolUse internally.

**Longer-term fix (platform v1.1):** Extend EventProxy's pass-through list to be configurable per module, or add domain-event prefixes to the pass-through list.

### 5.4 Hook Output Pattern

For hooks that need to inject systemMessage (UserPromptSubmit, PreCompact, SubagentStart), Reverie's handlers must write to stdout in the Claude Code hook response format. The Commutator's `registerOutput` method handles this:

```javascript
// Context Manager registers an output adapter during initialization
commutator.registerOutput('hook:prompt-submit', (payload) => {
  const selfModelContext = contextManager.composeSelfModelInjection(payload);
  // Write to stdout for Claude Code to process as systemMessage
  process.stdout.write(JSON.stringify({ systemMessage: selfModelContext }));
});
```

**Critical timing consideration:** `registerOutput` subscribes an action handler on Switchboard. The hook handler runs synchronously. The state file must already be written before the hook fires. This is why Secondary writes the state file proactively between user turns, and the hook handler reads the file synchronously.

---

## 6. Build Order and Dependency Graph

### 6.1 Dependency Analysis

```
                    +----------------+
                    |  constants     |  (no deps)
                    |   schema       |
                    +-------+--------+
                            |
              +-------------+-----------+
              v             v           v
     +------------+ +----------+ +--------------+
     | Self Model | |   Decay  | | Mode Manager |  (depends on constants/schema only)
     |            | |          | |              |
     +------+-----+ +-----+---+ +------+-------+
            |              |            |
            v              v            |
     +--------------------------+       |
     |   Association Index      |       |
     |  (Ledger table mgmt)    |       |
     +-------------+------------+       |
                   |                    |
     +-------------+----------+         |
     v             v          |         |
+----------+ +----------+    |         |
|Formation | |  Recall  |    |         |
|          | |          |    |         |
+----+-----+ +----+-----+    |         |
     |            |           |         |
     v            v           v         v
     +------------------------------------------+
     |         Fragment Engine                   |  (composes Formation, Recall, Decay,
     |                                           |   Association Index)
     +--------------------+----------------------+
                          |
            +-------------+-------------+
            v             v             v
     +----------+  +------------+  +--------------+
     | Context  |  |    REM     |  |   Session    |
     | Manager  |  |Consolidat. |  |   Manager    |
     |          |  |            |  |              |
     +----------+  +------------+  +------+-------+
                                          |
                                          v
                                    +----------+
                                    | reverie  |  (module entry point)
                                    |  .cjs    |
                                    +----------+
```

### 6.2 Recommended Build Order

**Phase 1: Foundation (no platform interaction needed beyond lib patterns)**
1. `lib/constants.cjs` -- Fragment types, decay parameters, mode enums, threshold defaults
2. `lib/schema.cjs` -- Fragment YAML schema definition, Self Model field shapes

**Phase 2: Data Layer (needs Journal + Ledger facades)**
3. `components/fragment-engine/decay.cjs` -- Deterministic decay function (pure computation)
4. `components/fragment-engine/association-index.cjs` -- Ledger table creation, CRUD, query helpers
5. `components/self-model/cold-start.cjs` -- Seed Self Model generation
6. `components/self-model/self-model.cjs` -- Self Model state manager (read/write Journal + Ledger + Magnet)
7. `components/mode-manager/mode-manager.cjs` -- State machine (Active/Passive/REM/Dormant)

Items 3-7 can be parallelized -- they depend only on Phase 1 outputs and platform facades.

**Phase 3: Processing Pipelines (needs Assay + completed data layer)**
8. `components/fragment-engine/formation.cjs` -- Multi-angle formation pipeline
9. `components/fragment-engine/recall.cjs` -- Retrieval + ranking + reconstruction
10. `components/fragment-engine/fragment-engine.cjs` -- Composes formation, recall, decay, association-index

Items 8-9 can be parallelized.

**Phase 4: Context and Consolidation (needs Fragment Engine + Self Model)**
11. `components/self-model/prompt-composer.cjs` -- Composes Face/Mind/Subconscious prompts
12. `components/context-manager/budget.cjs` -- 4-phase context budget tracker
13. `components/context-manager/framing.cjs` -- Referential framing prompt generation
14. `components/context-manager/compaction.cjs` -- PreCompact Self Model preservation
15. `components/context-manager/context-manager.cjs` -- Composes budget, framing, compaction

Items 11-14 can be parallelized.

16. `components/rem/retroactive.cjs` -- Retroactive fragment evaluation
17. `components/rem/editorial.cjs` -- Association index editorial pass
18. `components/rem/conditioning-update.cjs` -- Self Model conditioning updater
19. `components/rem/rem-consolidator.cjs` -- Composes retroactive, editorial, conditioning-update

Items 16-18 can be parallelized.

**Phase 5: Session Orchestration (needs Wire + all above components)**
20. `components/session-manager/primary-handler.cjs` -- Hook processing for Primary
21. `components/session-manager/secondary-handler.cjs` -- Mind session logic
22. `components/session-manager/tertiary-handler.cjs` -- Sublimation cycle runner
23. `components/session-manager/session-manager.cjs` -- Three-session lifecycle orchestrator

Items 20-22 can be parallelized.

**Phase 6: Module Entry Point + Integration**
24. `reverie.cjs` -- Circuit registration, wires all components, CLI commands via Pulley

### 6.3 Build Order Rationale

- **Foundation first** because every component depends on fragment types, schema shapes, and constants.
- **Data layer before processing** because formation and recall cannot be tested without the association index and Self Model state structures.
- **Processing before orchestration** because session management and context injection need to call fragment engine and Self Model methods.
- **Session Manager last** because it orchestrates everything and cannot be tested without all components.
- **Parallelization is aggressive** within phases because the options-based DI pattern means components are testable in isolation with mocked dependencies.

---

## Patterns to Follow

### Pattern 1: Options-Based DI for Internal Components

Every Reverie component takes an options object with injected platform facades and sister components. This is the same validated pattern used by all 9 platform services.

```javascript
function createFragmentEngine(options = {}) {
  const _journal = options.journal;      // Journal facade from Circuit
  const _assay = options.assay;          // Assay facade from Circuit
  const _wire = options.wire;            // Wire facade from Circuit
  const _selfModel = options.selfModel;  // Internal component (not a platform service)
  const _associationIndex = options.associationIndex;  // Internal component

  // ... implementation

  return Object.freeze({
    formFragment,
    recall,
    computeDecay,
    // ...
  });
}
```

### Pattern 2: Facade Access Through Circuit Only

Reverie components NEVER import platform services directly. All access goes through Circuit's scoped API, which returns facades. This is enforced by Circuit's dependency checking (circuit.cjs lines 130-148).

```javascript
// CORRECT
const wireResult = circuit.getService('wire');
const wire = wireResult.value;

// WRONG -- bypasses facade isolation
const { createWire } = require('../../core/services/wire/wire.cjs');
```

### Pattern 3: Working Directory Isolation for Testing

Each test creates an isolated temporary directory. Fragment files, Self Model state, and association index data all go into the temp directory. This is the same pattern used by every platform service test.

```javascript
const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const tmpdir = require('node:os').tmpdir();
const path = require('node:path');
const fs = require('node:fs');

describe('FragmentEngine', () => {
  let testDir;

  beforeEach(() => {
    testDir = path.join(tmpdir, 'reverie-test-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });
});
```

### Pattern 4: Wire Envelope Creation for Inter-Session Communication

All session communication uses Wire's `createEnvelope()` with explicit type and urgency. Payload is opaque to Wire -- only Reverie's handlers interpret it.

```javascript
const envResult = wire.createEnvelope({
  from: secondarySessionId,
  to: primarySessionId,
  type: 'context-injection',     // MESSAGE_TYPES value
  urgency: 'background',         // URGENCY_LEVELS value
  payload: {
    selfModelPrompt: composedPrompt,
    version: selfModelVersion,
  },
});
if (envResult.ok) {
  await wire.send(envResult.value);
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Switchboard for Intra-Module Communication

**What:** Using Switchboard events for component-to-component calls within Reverie.
**Why bad:** Creates hidden coupling, makes testing harder (need full Switchboard setup), makes control flow opaque. Switchboard is for platform-level cross-cutting events, not intra-module method calls.
**Instead:** Direct function calls between components. Session Manager calls `fragmentEngine.formFragment()` directly, not via `switchboard.emit('reverie:form-fragment')`.

### Anti-Pattern 2: Primary Writing to Ledger

**What:** Primary session making direct Ledger writes (e.g., logging tool usage).
**Why bad:** Violates single-writer ownership. If Primary writes, it must go through Wire write coordinator, adding contention and complexity for no benefit.
**Instead:** Primary sends snapshots to Secondary via Wire. Secondary decides what to persist.

### Anti-Pattern 3: Tertiary Running LLM Synthesis

**What:** Having the Tertiary session perform LLM-based fragment reconstruction or evaluation.
**Why bad:** Tertiary is a resonance engine. It scans headers and scores matches deterministically. LLM synthesis is expensive and would compete with the Mind's cognitive budget.
**Instead:** Tertiary does header-only scans via Assay, scores resonance deterministically, and sends fuzzy sublimation candidates to Secondary. Secondary decides if directed recall is warranted.

### Anti-Pattern 4: Synchronous Wire Communication in Hook Handlers

**What:** Hook handler awaiting Wire response before returning hook output.
**Why bad:** Claude Code hooks are synchronous. Awaiting Wire round-trips would block the hook and potentially timeout.
**Instead:** Hook handler reads pre-prepared state file synchronously. Wire communication is fire-and-forget from the hook handler's perspective.

### Anti-Pattern 5: Reverie Importing Platform Internals Directly

**What:** `require('../../core/services/wire/wire.cjs')` from within Reverie module code.
**Why bad:** Bypasses Circuit's facade isolation, dependency checking, and contract validation. Creates tight coupling to implementation details that may change.
**Instead:** Always access via `circuit.getService('wire')` which returns the validated facade.

---

## Scalability Considerations

| Concern | At 10 sessions | At 100 sessions | At 1000 sessions |
|---------|---------------|-----------------|-------------------|
| **Fragment volume** | ~100-500 fragments | ~5K-25K fragments | ~50K-250K fragments |
| **Journal file count** | Manageable | May need directory sharding (by date or domain) | Definitely needs sharding + cold archival |
| **Ledger association index** | Fast queries | Index size matters; need DuckDB indexes on join columns | May need partitioning or periodic cleanup |
| **Assay search latency** | <100ms | <500ms if indexed properly | Need result caching or pre-computed indexes |
| **Wire message volume** | Low | Moderate; write coordinator batching essential | May need message aggregation or sampling |
| **Self Model state size** | Small (<10KB) | Growing; Conditioning and Relational Model accumulate | Need periodic compaction of conditioning history |

---

## Sources

- Dynamo core/core.cjs -- Bootstrap entry point with all service registrations (HIGH confidence, direct source)
- Dynamo core/services/wire/wire.cjs -- Wire service implementation with full API (HIGH confidence, direct source)
- Dynamo core/services/wire/protocol.cjs -- Message types and urgency levels (HIGH confidence, direct source)
- Dynamo core/services/wire/write-coordinator.cjs -- Write coordination with greedy batching (HIGH confidence, direct source)
- Dynamo core/services/switchboard/switchboard.cjs -- Event bus with wildcard matching (HIGH confidence, direct source)
- Dynamo core/services/commutator/commutator.cjs -- Hook-to-event bridge with tool domain routing (HIGH confidence, direct source)
- Dynamo core/services/magnet/magnet.cjs -- State management with 3-tier scoping (HIGH confidence, direct source)
- Dynamo core/services/conductor/conductor.cjs -- Infrastructure ops (Docker, dependencies) (HIGH confidence, direct source)
- Dynamo core/services/assay/assay.cjs -- Federated search with capability routing (HIGH confidence, direct source)
- Dynamo core/providers/ledger/ledger.cjs -- DuckDB/SQLite dual backend (HIGH confidence, direct source)
- Dynamo core/providers/journal/journal.cjs -- Flat file markdown with frontmatter (HIGH confidence, direct source)
- Dynamo core/sdk/circuit/circuit.cjs -- Module API with facade isolation (HIGH confidence, direct source)
- Dynamo core/sdk/circuit/event-proxy.cjs -- Namespaced events with system passthrough (HIGH confidence, direct source)
- Dynamo core/sdk/circuit/module-manifest.cjs -- Module manifest schema (HIGH confidence, direct source)
- `.claude/reverie-spec-v2.md` -- Canonical Reverie specification (HIGH confidence, canonical document)
- `.claude/new-plan.md` -- Architecture plan (HIGH confidence, canonical document)
- `.planning/milestones/v1.0-REQUIREMENTS.md` -- Cross-milestone dependency matrix (HIGH confidence, project artifact)
