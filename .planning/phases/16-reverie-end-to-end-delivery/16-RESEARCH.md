# Phase 16: Reverie End-to-End Delivery - Research

**Researched:** 2026-03-28
**Domain:** State persistence (Magnet-to-Ledger), terminal session spawning, inter-session communication, CLI lifecycle orchestration
**Confidence:** HIGH

## Summary

Phase 16 transforms Reverie from a system where all operational state vanishes on process exit into a fully persistent, observable, multi-terminal system. The core problem is architectural: Magnet (the state service) currently wires to a JSON file provider via Lathe when `statePath` and `lathe` are injected, but the bootstrap in `core.cjs` only provides `statePath: paths.root + '/data/state.json'` and maps `lathe` -- so it uses the JSON provider, not Ledger. The CONTEXT.md decision D-05 explicitly mandates replacing this with a Ledger-backed provider. Additionally, the session spawner (`session-spawner.cjs`) currently pipes all stdio (`stdin: 'pipe', stdout: 'pipe', stderr: 'pipe'`), which means spawned Claude Code sessions are invisible background processes, not visible terminal windows. Finally, every CLI command (`start`, `stop`, `status`) operates on in-memory state that belongs to the current process -- no cross-invocation persistence.

There are three work streams: (1) Create a Ledger-backed Magnet provider that implements the STATE_PROVIDER_SHAPE contract (`load`, `save`, optional `clear`), wire it into bootstrap so Magnet auto-wires to Ledger on init; (2) Modify the session spawner to open real macOS Terminal windows via `osascript` AppleScript commands instead of piped background processes; (3) Rewrite CLI handlers to read/write mode, session state, and topology from Magnet (which now persists to Ledger), enabling `reverie status` to work from a fresh CLI invocation.

**Primary recommendation:** Build a Ledger-backed Magnet provider, modify session spawner for visible terminal windows, and rewrite CLI handlers to read persisted state -- all routing through existing service contracts without bypassing any architectural layer.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: State Persistence -- Route Through Magnet to Ledger. All platform state (mode, session IDs, triplet ID, topology health, relay port) persists through Magnet, which writes to Ledger (DuckDB). Magnet's JSON provider is a stopgap -- this phase replaces it with a Ledger-backed provider or wires Magnet to use Ledger directly.
- D-02: Terminal Window Strategy -- 3 Real Terminal Windows. Conductor spawns Secondary and Tertiary as real, visible terminal windows using platform-native terminal spawning (`open -a Terminal` on macOS, or equivalent). Each window runs a Claude Code session with appropriate environment variables (SESSION_IDENTITY, TRIPLET_ID, WIRE_RELAY_URL). The user sees 3 distinct terminal windows -- Primary (where they ran the command), Secondary, and Tertiary.
- D-03: Session Lifecycle -- Graceful Shutdown + Fresh Spawn. When Primary exits (or `reverie stop` is called): signal Secondary and Tertiary to shut down gracefully, update Magnet state to reflect shutdown, and clean up relay server. On next `reverie start`: read last state from Magnet/Ledger, spawn fresh sessions, register with Wire. No orphan recovery -- always clean start.
- D-04: Relay Server Lifecycle -- Starts/Stops with Primary. Wire relay server starts when `reverie start` is called and stops when `reverie stop` is called. Not a separate daemon. Relay port is persisted in Magnet so status commands can connect.
- D-05: Magnet Provider -- Ledger-Backed, Not JSON. Replace or supplement Magnet's JSON provider with a Ledger-backed provider. Magnet auto-wires to Ledger on init when Ledger is available. State is stored as structured records in DuckDB, not JSON files.
- D-06: Auto-Wire Magnet on Bootstrap. Reverie's bootstrap (reverie.cjs) must ensure Magnet is initialized with a persistence provider. If Ledger is available, wire Ledger. The current behavior where Magnet defaults to in-memory if `lathe` and `statePath` aren't injected must be fixed -- Magnet must always persist.
- D-07: Status Command Reads from Ledger. `reverie status` must read mode, session state, and topology from Ledger (via Magnet), not from in-memory state. This is what makes status work across CLI invocations.
- D-08: No Stubs -- Address Framework Deficits. If any SDK or Framework layer is missing functionality needed for real operation (e.g., Armature doesn't expose a needed hook, Circuit doesn't provide a needed API), fix the layer. Do not bypass with a stub or mock. Do not hardcode workarounds.

### Claude's Discretion
- DuckDB table schema design for Magnet state records
- Exact terminal spawning command arguments and environment setup
- Wire relay server port selection strategy
- Graceful shutdown signal mechanism (SIGTERM, message envelope, or both)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bun | 1.3.11 (installed) | Runtime | Project runtime -- all code runs on Bun |
| @duckdb/node-api | 1.5.0 | Ledger backend (DuckDB) | Verified loadable on this machine. Ledger already uses it. |
| bun:sqlite | Built-in | Ledger fallback backend | Already implemented in sqlite-backend.cjs |
| Bun.spawn | Built-in | Process spawning | Used by session-spawner.cjs, Conductor |
| Bun.serve | Built-in | Wire relay server | Already implemented in relay-server.cjs |
| node:events | Built-in | Switchboard event bus | Already used throughout |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:child_process.execSync | Built-in | osascript terminal spawning | For opening visible Terminal.app windows on macOS |
| node:crypto | Built-in | Triplet ID generation | Already used in triplet.cjs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Ledger-backed Magnet provider | Enhanced JSON provider | User explicitly rejected JSON file approach (D-05). Ledger is the correct structured data layer. |
| osascript Terminal.app | Bun.spawn with stdio:'inherit' | inherit only works for the current terminal, not new windows. osascript is the only reliable cross-terminal approach on macOS. |
| DuckDB for state | bun:sqlite for state | User explicitly rejected bun:sqlite for user-facing state. Architecture specifies Ledger (DuckDB) for structured data. |

## Architecture Patterns

### Recommended Project Structure (changes only)
```
core/
  services/
    magnet/
      magnet.cjs              # Modified: auto-wire to Ledger provider
      json-provider.cjs       # Existing (kept as fallback)
      ledger-provider.cjs     # NEW: Ledger-backed STATE_PROVIDER_SHAPE
      provider.cjs            # Existing (STATE_PROVIDER_SHAPE contract)
    conductor/
      conductor.cjs           # Modified: relay server lifecycle
      session-spawner.cjs     # Modified: visible terminal window spawning
      terminal-spawn.cjs      # NEW: macOS terminal window abstraction
  core.cjs                    # Modified: Magnet dependency includes Ledger
modules/
  reverie/
    components/
      cli/
        start.cjs             # Modified: read persisted state, spawn relay + sessions
        stop.cjs              # Modified: persist state on shutdown
        status.cjs            # Modified: read from Magnet (cross-invocation)
      modes/
        mode-manager.cjs      # Modified: persist mode to Magnet on change
      session/
        session-manager.cjs   # Modified: persist session IDs/triplet to Magnet on transitions
    reverie.cjs               # Modified: inject Magnet into mode-manager, session-manager
```

### Pattern 1: Ledger-Backed Magnet Provider
**What:** A new provider implementing STATE_PROVIDER_SHAPE that uses Ledger's CRUD API (read/write) to persist Magnet's three-tier state tree (global/session/module) as a structured JSON record in DuckDB.
**When to use:** Always -- this replaces the JSON file provider as the primary persistence backend.
**Example:**
```javascript
// Source: Existing patterns from json-provider.cjs + ledger.cjs
'use strict';
const { ok, err } = require('../../../lib/index.cjs');
const { validateProvider } = require('./provider.cjs');

function createLedgerProvider(options) {
  const { ledger } = options;
  if (!ledger) return err('MISSING_DEPENDENCY', 'Ledger provider required');

  const RECORD_ID = 'magnet-state';

  async function load() {
    const result = await ledger.read(RECORD_ID);
    if (!result.ok) {
      // NOT_FOUND means first boot -- return empty state
      if (result.error && result.error.code === 'NOT_FOUND') {
        return ok({ global: {}, session: {}, module: {} });
      }
      return result;
    }
    return ok(result.value.data);
  }

  async function save(state, saveOptions = {}) {
    return ledger.write(RECORD_ID, state);
  }

  async function clear(scope) {
    const loadResult = await load();
    if (!loadResult.ok) return loadResult;
    const state = loadResult.value;
    state[scope] = {};
    return save(state);
  }

  return validateProvider('ledger-provider', { load, save, clear });
}

module.exports = { createLedgerProvider };
```

### Pattern 2: Visible Terminal Window Spawning on macOS
**What:** Use osascript to tell Terminal.app to open a new window and run a specific command with environment variables.
**When to use:** When spawning Secondary and Tertiary Claude Code sessions.
**Example:**
```javascript
// Source: macOS Terminal AppleScript integration
'use strict';
const { execSync } = require('node:child_process');

function spawnTerminalWindow({ command, env, title }) {
  // Build env export string
  const envExports = Object.entries(env)
    .map(([k, v]) => 'export ' + k + '=' + JSON.stringify(String(v)))
    .join('; ');

  const fullCommand = envExports + '; ' + command;

  // AppleScript to open a new Terminal window and run the command
  const script = [
    'tell application "Terminal"',
    '  activate',
    '  do script "' + fullCommand.replace(/"/g, '\\"') + '"',
    'end tell',
  ].join('\n');

  execSync('osascript -e ' + JSON.stringify(script));
}
```

### Pattern 3: State Persistence on Mode/Session Transitions
**What:** Every mode change and session state transition writes to Magnet immediately, so a separate CLI invocation can read current state.
**When to use:** In mode-manager.cjs `_setMode()` and session-manager.cjs `_transition()`.
**Example:**
```javascript
// In mode-manager._setMode():
if (magnet) {
  magnet.set('module', 'reverie', 'mode', newMode);
  magnet.set('module', 'reverie', 'mode_changed_at', new Date().toISOString());
}

// In session-manager._transition():
if (magnet) {
  magnet.set('module', 'reverie', 'session_state', targetState);
  magnet.set('module', 'reverie', 'triplet_id', _tripletId);
  magnet.set('module', 'reverie', 'secondary_session_id', _secondarySessionId);
  magnet.set('module', 'reverie', 'tertiary_session_id', _tertiarySessionId);
}
```

### Pattern 4: Relay Server Lifecycle Tied to Start/Stop
**What:** Wire relay server starts as a separate Bun process when `reverie start` is called and is stopped when `reverie stop` is called. Port is persisted in Magnet.
**When to use:** In the start and stop CLI handlers.
**Example:**
```javascript
// Start: spawn relay server process
const relayProc = Bun.spawn(['bun', 'run', relayServerPath, '--port', String(port)], {
  env: { ...process.env, WIRE_RELAY_PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
await magnet.set('global', 'relay_port', port);
await magnet.set('global', 'relay_pid', relayProc.pid);

// Stop: kill relay process by stored PID
const relayPid = magnet.get('global', 'relay_pid');
if (relayPid) {
  try { process.kill(relayPid, 'SIGTERM'); } catch (_e) {}
}
```

### Anti-Patterns to Avoid
- **In-memory-only state**: Every piece of operational state (mode, session IDs, triplet, relay port) MUST be persisted to Magnet/Ledger. If it only lives in a JavaScript variable, it vanishes on process exit.
- **Piped stdio for user-visible sessions**: `stdin: 'pipe', stdout: 'pipe', stderr: 'pipe'` makes sessions invisible. Terminal windows must be visible.
- **Orphan process recovery**: Per D-03, always do clean start on `reverie start`. Do NOT attempt to find and recover orphaned secondary/tertiary processes.
- **Bypassing Magnet for direct Ledger access**: State routes through Magnet. CLI handlers read from Magnet, not directly from Ledger.
- **Background daemon relay**: Per D-04, relay starts/stops with the Primary session lifecycle, not as a standalone daemon.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State provider contract | Custom save/load interface | STATE_PROVIDER_SHAPE from `magnet/provider.cjs` | Contract already defined and validated, JSON provider already implements it |
| Terminal window spawning on macOS | Custom window management | osascript + Terminal.app AppleScript | Apple's official scriptable interface for Terminal, no native API exists |
| State tree serialization | Custom serialization format | JSON.stringify/parse via Ledger's `data` column | Ledger already stores JSON data column, Magnet state is a plain JS object |
| Process lifecycle tracking | Custom PID file management | Magnet global scope for PID storage + process.kill() for cleanup | Platform already has the state service for this exact purpose |
| Port selection | Hardcoded port | Dynamic port selection with fallback | Relay server already supports `port: 0` for random port; persist chosen port in Magnet |

**Key insight:** The infrastructure for persistence (Ledger), process management (Conductor/Bun.spawn), and communication (Wire/relay-server) already exists and works. The gap is purely the wiring: Magnet is not connected to Ledger, session spawner outputs to pipes not terminals, and CLI handlers read in-memory state instead of Magnet.

## Common Pitfalls

### Pitfall 1: DuckDB Single-Writer Constraint
**What goes wrong:** DuckDB allows only one writer at a time. If the relay server, Primary CLI, and Secondary session all try to write to the same DuckDB file simultaneously, writes will fail with locking errors.
**Why it happens:** DuckDB is OLAP-oriented, not designed for concurrent multi-process writes.
**How to avoid:** Only one process opens the DuckDB file at a time. The Primary CLI process owns the Ledger connection. Relay server stores state in-memory (it's ephemeral). Secondary/Tertiary route writes through Wire to Primary.
**Warning signs:** `DUCKDB_ERROR: Failed to open DuckDB` or locking errors in test output.

### Pitfall 2: Bootstrap Runs on Every CLI Invocation
**What goes wrong:** Every `bun bin/dynamo.cjs` call bootstraps the entire platform (creates container, boots services, registers modules). This means Magnet re-initializes, Ledger opens the DB file, and all services start. Heavy for a simple `reverie status` call.
**Why it happens:** The entry point (`dynamo.cjs`) calls `bootstrap()` unconditionally.
**How to avoid:** Accept the bootstrap cost -- it's architecturally correct (everything routes through Dynamo). But ensure Ledger init is fast and Magnet hydration from Ledger is efficient. The DuckDB file is already on disk and WAL mode is fast.
**Warning signs:** `reverie status` taking more than 2 seconds. Profile if needed.

### Pitfall 3: Terminal Window Spawning Race Condition
**What goes wrong:** osascript sends commands to Terminal.app asynchronously. The Claude Code session might not be fully started by the time start() returns. Wire registration might fail because the session hasn't connected to the relay yet.
**Why it happens:** AppleScript's `do script` returns immediately after telling Terminal to run the command, not after the command completes.
**How to avoid:** After spawning a terminal window, poll the relay server's `/health` endpoint to confirm the session has registered. Use a short timeout (5-10 seconds) with exponential backoff.
**Warning signs:** `reverie start` reports success but `reverie status` shows 0 connected sessions.

### Pitfall 4: Stale State After Crash
**What goes wrong:** If the Primary process crashes (or user force-kills it), Magnet state still shows `mode: active` and has stale session IDs/PIDs. Next `reverie start` reads this state and may try to interact with dead processes.
**Why it happens:** No shutdown hook ran to clean up state.
**How to avoid:** Per D-03, `reverie start` always does a clean start: kill any stale processes by stored PID (ignore errors if already dead), clear session state in Magnet, spawn fresh. Never try to "resume" a previous session.
**Warning signs:** `reverie start` hangs trying to communicate with dead processes.

### Pitfall 5: Magnet save() is Debounced in JSON Provider
**What goes wrong:** The JSON provider debounces writes by 1000ms. If the process exits within that window, state is lost.
**Why it happens:** Debouncing is a performance optimization for frequent state changes.
**How to avoid:** The Ledger provider should NOT debounce -- DuckDB writes are fast enough for the expected mutation rate (mode changes, session transitions). Each save() calls ledger.write() immediately. On stop(), call save() with `{ flush: true }` per existing Magnet contract.
**Warning signs:** State appears to persist intermittently -- sometimes it survives process exit, sometimes not.

### Pitfall 6: osascript Escaping
**What goes wrong:** Environment variable values containing special characters (quotes, backslashes, dollar signs) break the AppleScript command string.
**Why it happens:** Nested escaping: JavaScript string -> osascript command line -> AppleScript string -> shell command.
**How to avoid:** Use a shell script intermediary. Write a temp .sh file with proper env exports and command, then tell Terminal to run `bash /path/to/temp.sh`. This eliminates multi-layer escaping.
**Warning signs:** Sessions fail to start with "AppleScript error" or wrong environment variables.

### Pitfall 7: Relay Port Conflict
**What goes wrong:** Default port 9876 is already in use from a previous crashed session.
**Why it happens:** Prior relay server didn't shut down cleanly and the port is still bound.
**How to avoid:** On start: check if stored relay PID is still alive. If so, kill it. If port is still bound, try the stored port first with a timeout, then fall back to port 0 (random) if that fails. Persist the actual port in Magnet.
**Warning signs:** `EADDRINUSE` error when starting relay server.

## Code Examples

### Example 1: Ledger Provider load/save cycle
```javascript
// Source: Existing Ledger CRUD API (ledger.cjs)
// Ledger.write(id, data) -> upserts record
// Ledger.read(id) -> returns { id, data, created_at, updated_at }

// Save state:
await ledger.write('magnet-state', { global: { mode: 'active' }, session: {}, module: {} });

// Load state:
const result = await ledger.read('magnet-state');
// result.ok === true
// result.value.data === { global: { mode: 'active' }, session: {}, module: {} }
```

### Example 2: macOS Terminal Window via osascript
```javascript
// Source: macOS Terminal.app AppleScript dictionary
const { execSync } = require('node:child_process');

// Write a launcher script to avoid escaping hell
const scriptContent = [
  '#!/bin/bash',
  'export SESSION_IDENTITY="secondary"',
  'export TRIPLET_ID="triplet-a1b2"',
  'export WIRE_RELAY_URL="http://127.0.0.1:9876"',
  'cd ' + JSON.stringify(projectRoot),
  'exec claude --dangerously-load-development-channels server:' + channelServerPath,
].join('\n');

const tmpScript = '/tmp/dynamo-session-' + sessionId + '.sh';
require('node:fs').writeFileSync(tmpScript, scriptContent, { mode: 0o755 });

// Tell Terminal.app to open a new window and run the script
const appleScript = 'tell application "Terminal" to do script "bash ' + tmpScript + '"';
execSync('osascript -e ' + JSON.stringify(appleScript));
```

### Example 3: Magnet State Persistence in Mode Manager
```javascript
// Source: mode-manager.cjs pattern + Magnet API
function _setMode(newMode, reason) {
  const oldMode = _mode;
  _mode = newMode;
  _modeChanges++;

  // Persist to Magnet for cross-invocation reads
  if (_magnet) {
    _magnet.set('module', 'reverie', 'mode', newMode);
    _magnet.set('module', 'reverie', 'mode_reason', reason);
    _magnet.set('module', 'reverie', 'mode_changed_at', new Date().toISOString());
  }

  if (switchboard) {
    switchboard.emit('mode:changed', { from: oldMode, to: newMode, reason });
  }
}
```

### Example 4: Status Command Reading Persisted State
```javascript
// Source: status.cjs pattern + Magnet cross-invocation reads
function handle(args, flags) {
  // Read persisted mode from Magnet (survives process restart)
  const mode = magnet ? magnet.get('module', 'reverie', 'mode') : null;
  const tripletId = magnet ? magnet.get('module', 'reverie', 'triplet_id') : null;
  const relayPort = magnet ? magnet.get('global', 'relay_port') : null;

  // Check relay health if port is known
  let topologyHealth = 'disconnected';
  if (relayPort) {
    try {
      const resp = Bun.spawnSync(['curl', '-s', 'http://127.0.0.1:' + relayPort + '/health']);
      if (resp.success) {
        const health = JSON.parse(resp.stdout.toString());
        topologyHealth = health.sessions > 0 ? 'connected' : 'disconnected';
      }
    } catch (_e) { /* relay not running */ }
  }

  // ... build output
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSON file provider for Magnet | Ledger-backed provider | Phase 16 | State persists in DuckDB, survives process exit, queryable |
| Piped stdio session spawning | Visible terminal windows via osascript | Phase 16 | User sees 3 distinct terminal windows |
| In-memory mode/session state | Magnet-persisted state | Phase 16 | CLI commands work across invocations |
| Relay as background pipe | Relay as visible process managed by start/stop | Phase 16 | Clean lifecycle, port persistence |

**Current approach (being replaced):**
- Magnet wires to JSON file provider on bootstrap (state.json) -- but the JSON file was never created because Magnet's debounced writes may not flush before process exit
- Session spawner creates invisible background processes with piped stdio
- CLI commands read from in-memory service instances that are fresh on every invocation
- No way to query current Reverie mode from a new terminal

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Runtime | Yes | 1.3.11 | -- |
| DuckDB (@duckdb/node-api) | Ledger provider | Yes | Loadable | bun:sqlite fallback in Ledger |
| Claude Code CLI | Session spawning | Yes | 2.1.86 | -- |
| osascript | Terminal window spawning | Yes | macOS built-in | -- |
| Terminal.app | Visible session windows | Yes | macOS built-in | iTerm2 (if detected) |
| curl | Relay health check | Yes | macOS built-in | fetch() API |
| git | Forge service | Yes | -- | -- |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:** None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built-in) |
| Config file | None needed (Bun auto-discovers *.test.cjs) |
| Quick run command | `bun test --filter "magnet\|conductor\|session-manager\|mode-manager\|status\|start\|stop"` |
| Full suite command | `bun test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-01 | Magnet state persists to Ledger via new provider | unit | `bun test core/services/magnet/ledger-provider.test.cjs -x` | Wave 0 |
| D-02 | Session spawner opens visible terminal windows | unit (mock osascript) | `bun test core/services/conductor/terminal-spawn.test.cjs -x` | Wave 0 |
| D-03 | Clean start on reverie start (kill stale, fresh spawn) | unit | `bun test modules/reverie/components/cli/start.test.cjs -x` | Wave 0 |
| D-04 | Relay server starts/stops with Primary | integration | `bun test modules/reverie/components/cli/start.test.cjs -x` | Wave 0 |
| D-05 | Magnet auto-wires to Ledger on bootstrap | unit | `bun test core/services/magnet/ledger-provider.test.cjs -x` | Wave 0 |
| D-06 | Bootstrap injects Ledger into Magnet | integration | `bun test core/core.test.cjs -x` | Exists (update) |
| D-07 | Status reads persisted state cross-invocation | unit | `bun test modules/reverie/components/cli/status.test.cjs -x` | Wave 0 |
| D-08 | No stubs -- real implementations throughout | smoke | Manual code review | N/A |

### Sampling Rate
- **Per task commit:** `bun test --filter "magnet\|conductor\|session-manager\|mode-manager" -x`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `core/services/magnet/ledger-provider.test.cjs` -- covers D-01, D-05
- [ ] `core/services/conductor/terminal-spawn.test.cjs` -- covers D-02
- [ ] `modules/reverie/components/cli/start.test.cjs` -- covers D-03, D-04 (update existing if present, else create)
- [ ] `modules/reverie/components/cli/status.test.cjs` -- covers D-07 (update existing if present, else create)

## Open Questions

1. **Claude Code Channels development flag stability**
   - What we know: `--dangerously-load-development-channels` flag is used by session-spawner.cjs. Claude Code 2.1.86 supports it.
   - What's unclear: Whether this flag will be renamed or removed in a future Claude Code release.
   - Recommendation: Use the flag as-is. The flag name is already in the codebase from Phase 10. If it changes, it's a one-line fix in session-spawner.cjs.

2. **iTerm2 vs Terminal.app detection**
   - What we know: The user has Terminal.app available. iTerm2 is also common on macOS.
   - What's unclear: Whether to support both terminal emulators or just Terminal.app.
   - Recommendation: Default to Terminal.app (guaranteed available on macOS). Detecting iTerm2 is a future enhancement -- the abstraction layer (terminal-spawn.cjs) should make it easy to add later.

3. **Relay server port persistence on crash**
   - What we know: If the process crashes without running stop(), the relay port in Magnet will be stale.
   - What's unclear: Whether to add a heartbeat/watchdog for the relay process.
   - Recommendation: Per D-03, always clean start. On `reverie start`, check if stored PID is still alive, kill if so, then spawn fresh. No watchdog complexity needed.

## Sources

### Primary (HIGH confidence)
- `core/services/magnet/magnet.cjs` -- Magnet service API, provider registration, three-tier state tree
- `core/services/magnet/json-provider.cjs` -- Existing STATE_PROVIDER_SHAPE implementation pattern
- `core/services/magnet/provider.cjs` -- STATE_PROVIDER_SHAPE contract definition (load, save, clear)
- `core/providers/ledger/ledger.cjs` -- Ledger CRUD API (read, write, query, delete)
- `core/providers/ledger/duckdb-backend.cjs` -- DuckDB backend, confirmed loadable on machine
- `core/services/conductor/session-spawner.cjs` -- Current session spawning (piped stdio)
- `core/services/wire/relay-server.cjs` -- Wire relay HTTP+WS server
- `core/core.cjs` -- Bootstrap sequence, service/provider registration
- `modules/reverie/reverie.cjs` -- Module registration, component wiring
- `modules/reverie/components/session/session-manager.cjs` -- Session lifecycle state machine
- `modules/reverie/components/modes/mode-manager.cjs` -- Operational mode tracking
- `modules/reverie/components/cli/start.cjs` -- Start command handler
- `modules/reverie/components/cli/stop.cjs` -- Stop command handler
- `modules/reverie/components/cli/status.cjs` -- Status command handler

### Secondary (MEDIUM confidence)
- [macOS Terminal.app AppleScript](https://scriptingosx.com/2020/03/macos-shell-command-to-create-a-new-terminal-window/) -- Terminal window spawning via osascript
- [Apple Technical Note TN2065](https://developer.apple.com/library/archive/technotes/tn2065/_index.html) -- do shell script in AppleScript
- [osascript Terminal execution](https://gist.github.com/nuada/204e8082280328654ca651f1730a1aa7) -- Execute command in new Terminal window

### Tertiary (LOW confidence)
- None -- all findings verified against local codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- entirely existing project stack, no new dependencies
- Architecture: HIGH -- all patterns derived from reading existing code, contracts already defined
- Pitfalls: HIGH -- identified from direct code analysis (debounce timing, DuckDB single-writer, stdio piping)
- Terminal spawning: MEDIUM -- osascript approach is well-documented but escaping complexity and Terminal.app scripting behavior needs careful implementation

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable domain -- no rapidly evolving dependencies)
