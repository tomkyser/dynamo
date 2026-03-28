# Phase 16: Reverie End-to-End Delivery - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a fully functional Reverie system where every user-facing command produces real, persistent, observable results. State persists across CLI invocations via Magnet/Ledger. Sessions spawn as real terminal windows via Conductor. Wire enables real inter-session communication. Zero stubs, zero theater, zero in-memory-only state that vanishes on process exit.

**Acceptance test:** User runs `bun bin/dynamo.cjs reverie start`, sees 3 terminal windows appear (Primary + Secondary + Tertiary), runs `bun bin/dynamo.cjs reverie status` in a new terminal and sees `Mode: active` with real session data, runs `bun bin/dynamo.cjs reverie stop`, sees sessions shut down cleanly.

</domain>

<decisions>
## Implementation Decisions

### D-01: State Persistence — Route Through Magnet to Ledger
All platform state (mode, session IDs, triplet ID, topology health, relay port) persists through Magnet, which writes to Ledger (DuckDB). Magnet's JSON provider is a stopgap — this phase replaces it with a Ledger-backed provider or wires Magnet to use Ledger directly.

**Why:** Architecture says "Everything routes through Dynamo." Magnet is the state service. Ledger is the structured data provider. Bypassing either violates the core architecture.

### D-02: Terminal Window Strategy — 3 Real Terminal Windows
Conductor spawns Secondary and Tertiary as real, visible terminal windows using platform-native terminal spawning (`open -a Terminal` on macOS, or equivalent). Each window runs a Claude Code session with appropriate environment variables (SESSION_IDENTITY, TRIPLET_ID, WIRE_RELAY_URL). The user sees 3 distinct terminal windows — Primary (where they ran the command), Secondary, and Tertiary.

**Why:** User explicitly stated "the wire strategy is to spin up 3 terminal windows for the triplets."

### D-03: Session Lifecycle — Graceful Shutdown + Fresh Spawn
When Primary exits (or `reverie stop` is called): signal Secondary and Tertiary to shut down gracefully, update Magnet state to reflect shutdown, and clean up relay server. On next `reverie start`: read last state from Magnet/Ledger, spawn fresh sessions, register with Wire. No orphan recovery — always clean start.

**Why:** Orphan management adds complexity with minimal benefit. Fresh spawn from persisted state is simpler and more reliable.

### D-04: Relay Server Lifecycle — Starts/Stops with Primary
Wire relay server starts when `reverie start` is called and stops when `reverie stop` is called. Not a separate daemon. Relay port is persisted in Magnet so status commands can connect.

**Why:** Matches the 3-window model. No background daemon management needed.

### D-05: Magnet Provider — Ledger-Backed, Not JSON
Replace or supplement Magnet's JSON provider with a Ledger-backed provider. Magnet auto-wires to Ledger on init when Ledger is available. State is stored as structured records in DuckDB, not JSON files.

**Why:** Architecture specifies Ledger (DuckDB) for structured data. JSON provider was a bootstrap convenience, not the target architecture.

### D-06: Auto-Wire Magnet on Bootstrap
Reverie's bootstrap (reverie.cjs) must ensure Magnet is initialized with a persistence provider. If Ledger is available, wire Ledger. The current behavior where Magnet defaults to in-memory if `lathe` and `statePath` aren't injected must be fixed — Magnet must always persist.

### D-07: Status Command Reads from Ledger
`reverie status` must read mode, session state, and topology from Ledger (via Magnet), not from in-memory state. This is what makes status work across CLI invocations.

### D-08: No Stubs — Address Framework Deficits
If any SDK or Framework layer is missing functionality needed for real operation (e.g., Armature doesn't expose a needed hook, Circuit doesn't provide a needed API), fix the layer. Do not bypass with a stub or mock. Do not hardcode workarounds.

### Claude's Discretion
- DuckDB table schema design for Magnet state records
- Exact terminal spawning command arguments and environment setup
- Wire relay server port selection strategy
- Graceful shutdown signal mechanism (SIGTERM, message envelope, or both)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture
- `.claude/new-plan.md` — Full architecture plan. Absolute canon. Defines Magnet, Ledger, Wire, Conductor, and how they integrate.
- `.claude/reverie-spec-v2.md` — Reverie module specification. Defines Self Model, three-session architecture, fragment engine, REM consolidation.

### Core Services (read implementation before modifying)
- `core/services/magnet/magnet.cjs` — State management service. Has JSON provider, needs Ledger provider.
- `core/services/magnet/json-provider.cjs` — Existing persistence provider (to be replaced/supplemented).
- `core/services/conductor/conductor.cjs` — Infrastructure service. Session spawning via Bun.spawn().
- `core/services/conductor/session-spawner.cjs` — Actual process spawning implementation.
- `core/services/wire/wire.cjs` — Inter-session communication. Real implementation.
- `core/services/wire/relay-server.cjs` — HTTP+WebSocket relay. In-memory session registry (needs persistence).

### Providers
- `core/providers/ledger/ledger.cjs` — DuckDB/SQLite CRUD provider. Working, but disconnected from Magnet.
- `core/providers/ledger/duckdb-backend.cjs` — DuckDB backend implementation.

### Module (read implementation before modifying)
- `modules/reverie/reverie.cjs` — Module bootstrap. Lines 162-177: session/mode manager creation.
- `modules/reverie/components/session/session-manager.cjs` — Session state machine. 8 states, transition validation.
- `modules/reverie/components/session/session-config.cjs` — State transition map.
- `modules/reverie/components/modes/mode-manager.cjs` — Operational mode tracking. Currently in-memory only.
- `modules/reverie/components/cli/start.cjs` — Start command handler.
- `modules/reverie/components/cli/stop.cjs` — Stop command handler.
- `modules/reverie/components/cli/status.cjs` — Status command handler.

### Technology Stack
- CLAUDE.md `## Technology Stack` section — DuckDB via @duckdb/node-api, Bun.spawn for processes, node:events for pub/sub.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Magnet JSON provider** (`json-provider.cjs`): Working persistence pattern with debounced writes, .bak recovery, atomic save. Pattern can inform Ledger provider design.
- **Ledger CRUD API** (`ledger.cjs`): Full read/write/query/delete with Result types. Ready to be consumed by Magnet.
- **Conductor session spawner** (`session-spawner.cjs`): Real Bun.spawn() implementation. Needs terminal window flag added.
- **Wire relay server** (`relay-server.cjs`): Working HTTP+WS server. Needs session registry persisted to Ledger.
- **Session Manager state machine** (`session-manager.cjs`): Properly validated transitions. Needs to read/write state via Magnet.
- **Mode Manager** (`mode-manager.cjs`): Clean API. Needs Magnet integration for persistence.

### Established Patterns
- **Options-based DI**: All components accept dependencies via constructor options. Magnet provider is already pluggable via `registerProvider()`.
- **Result types**: All operations return `ok(value)` or `err(code, message)`. Follow this pattern.
- **Switchboard events**: State changes emit events. Existing events: `state:changed`, `session:state-changed`, `mode:changed`.
- **Service lifecycle**: `init()` → `start()` → `stop()`. Follow for any new providers.

### Integration Points
- **reverie.cjs lines 162-177**: Where session/mode managers are created. This is where Magnet must be injected for state persistence.
- **core.cjs bootstrap**: Where Magnet and Ledger are initialized. Magnet-to-Ledger wiring must happen here.
- **Conductor.spawnSession()**: Where terminal spawning arguments need updating for visible windows.
- **CLI command handlers** (start.cjs, stop.cjs, status.cjs): Must read/write Magnet state instead of in-memory variables.

</code_context>

<specifics>
## Specific Ideas

- User explicitly said: "the wire strategy is to spin up 3 terminal windows for the triplets"
- User explicitly said: "No stubs. no lies. no bullshit."
- User explicitly said: "If there is a deficit within the SDK or the Framework that drives the SDK, then that needs to be addressed, not bypassed, not mocked, not stubbed."
- User rejected sqlite (bun:sqlite) and JSON file approaches — DuckDB via Ledger is the correct persistence layer
- Terminal windows must be visually distinct — user should see 3 separate windows

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-reverie-end-to-end-delivery*
*Context gathered: 2026-03-28*
