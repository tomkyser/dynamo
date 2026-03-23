# Phase 2: Foundational Services - Research

**Researched:** 2026-03-22
**Domain:** Event dispatch, I/O bridging, state management, filesystem facade -- all on Bun CJS with zero npm dependencies
**Confidence:** HIGH

## Summary

Phase 2 delivers four foundational services that form the substrate for every subsequent service: Switchboard (event bus), Commutator (I/O bridge), Magnet (state management), and Lathe (filesystem facade). These services import only from `lib/` (Phase 1), use zero npm dependencies, and follow a uniform contract pattern with lifecycle methods and options-based DI.

The primary technical challenge is Switchboard's wildcard event matching -- `node:events` EventEmitter does NOT support native wildcard/glob patterns. Confirmed by direct Bun 1.3.11 testing: subscribing to `'hook:*'` creates a literal event name, not a pattern matcher. Switchboard must implement its own prefix-matching dispatch layer on top of EventEmitter. The remaining three services are straightforward: Commutator is a mapping table plus Switchboard integration, Magnet is scoped key-value state with JSON file persistence via Lathe, and Lathe is a thin facade over Bun.file/Bun.write + node:fs.

All four services depend on each other in a specific order: Lathe has no service dependencies (pure Bun API wrapper), Switchboard depends on nothing (standalone event bus), Magnet depends on Switchboard (emits state change events) and Lathe (JSON file persistence), and Commutator depends on Switchboard (emits domain events into it). Build order should follow this dependency chain.

**Primary recommendation:** Build in dependency order: Lathe first (zero deps), Switchboard second (zero deps), Magnet third (needs Switchboard + Lathe), Commutator fourth (needs Switchboard). Each service gets its own directory under `core/services/`, validates its contract with `createContract`, and follows TDD with `bun:test`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Colon-delimited event namespaces (e.g., 'hook:post-tool-use', 'file:changed', 'state:updated'). Simple, grep-friendly, supports wildcard matching on prefixes.
- **D-02:** Two event types: actions (fire-and-forget, all handlers run) and filters (interceptable data pipeline, handlers run in priority order and can transform or halt the payload).
- **D-03:** Numeric priority for filter handlers. Lower number = runs first, default 100. Actions ignore priority (all fire in registration order).
- **D-04:** Filter handlers can halt the pipeline by returning false or an Err result. Subsequent handlers don't run. The rejected payload returns to the emitter as Err.
- **D-05:** Prefix wildcard support. Listen on 'hook:*' to catch all 'hook:' events. Only suffix wildcard (*) supported -- no regex.
- **D-06:** Tool-aware semantic routing. Commutator inspects tool_name/tool_input in PreToolUse/PostToolUse and emits domain-specific events (e.g., PostToolUse+Write -> 'file:changed', PostToolUse+Bash -> 'shell:executed'). Other hooks pass through with category-level events ('hook:session-start', 'hook:stop', etc.).
- **D-07:** Bidirectional from the start. Commutator handles both inbound (hook payloads -> Switchboard events) and outbound (Switchboard events -> output mechanisms).
- **D-08:** Outbound via event-to-output adapter pattern. Commutator listens for specific Switchboard events (e.g., 'output:inject-context') and translates them to the appropriate output mechanism (stdout for hooks, Wire for inter-session later). Decoupled from stdout specifically.
- **D-09:** Provider interface defined now. Ships with a built-in JSON file provider (via Lathe) as default fallback. When Ledger/Journal arrive in Phase 3, they register as providers through the same contract. Magnet works end-to-end immediately with persistence.
- **D-10:** Three-tier state scoping: global (persists always), session (tied to session ID, cleared on end), and module (namespaced by module name, e.g., 'reverie.selfModel'). Aligns with Reverie's three-session architecture.
- **D-11:** All state mutations emit Switchboard events. Every set/delete emits 'state:changed' with scope, key, old value, new value. Enables reactive patterns without polling.
- **D-12:** Four lifecycle methods for every service: init(options) for dependency injection setup, start() to begin operation, stop() for cleanup, healthCheck() for diagnostics. init returns Result. Aligns with Phase 4's register/boot two-phase lifecycle (FWK-03).
- **D-13:** Dependencies passed via options object at init(). e.g., Commutator gets { switchboard }. Validated with createContract at init-time. Consistent with Phase 1's options-based DI pattern.
- **D-14:** Directory per service: core/services/switchboard/switchboard.cjs + __tests__/. Room for internal helpers, constants, type definitions.
- **D-15:** Self-validating services. Each service factory validates its own implementation against its contract shape using createContract before returning. Catches wiring bugs immediately.

### Claude's Discretion
- Internal event name dictionary (specific colon-delimited names for each hook type and tool combination)
- Commutator's tool-to-domain mapping table (which tools map to which domain events)
- Magnet's JSON file provider implementation details (file location, write frequency, serialization format)
- Lathe's specific method signatures (which Bun APIs to wrap, what to add beyond Bun.file/Bun.write)
- Whether healthCheck() returns a simple boolean or a structured diagnostic object

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SVC-01 | Switchboard -- Event bus with actions (fire-and-forget) and filters (interceptable data pipeline), priority ordering | EventEmitter foundation with custom prefix-wildcard dispatch, dual event type system (action/filter), priority-ordered filter pipeline with halt semantics |
| SVC-02 | Commutator -- System I/O bus bridging Claude Code hooks to Switchboard events with semantic routing | Claude Code hook JSON payload format documented, tool-to-domain mapping table, bidirectional adapter pattern |
| SVC-03 | Magnet -- Centralized state management with provider-backed persistence, session-aware scoping | Three-tier scoped state (global/session/module), JSON file provider via Lathe, state-change events via Switchboard, provider interface contract |
| SVC-04 | Lathe -- Filesystem facade over Bun native APIs | Bun.file/Bun.write for file I/O, node:fs for directory ops, atomic write semantics, existence checking |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:events` (EventEmitter) | Built-in | Switchboard foundation | Fully compatible in Bun 1.3.11 (confirmed). Synchronous dispatch, listener management, `prependListener` for priority control. Zero dependency. |
| Bun.file / Bun.write | Built-in (1.3.11) | Lathe file operations | Atomic writes, lazy file loading, `.exists()` method, `.text()` / `.json()` readers. Confirmed working in Bun 1.3.11. |
| `node:fs` | Built-in (compat) | Lathe directory operations | `mkdirSync`, `readdirSync` (with `withFileTypes`), `rmSync`, `unlinkSync`, `existsSync`, `statSync`. All confirmed working in Bun 1.3.11. |
| `node:path` | Built-in (compat) | Path construction | `join`, `resolve`, `dirname`, `basename`, `extname`. Standard across all services. |

### Supporting (from Phase 1)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lib/result.cjs` | Phase 1 | Ok/Err result types | Every service method that can fail returns Result. init(), start(), stop(), healthCheck() all return Result. |
| `lib/contract.cjs` | Phase 1 | Contract validation | Every service factory validates its implementation shape via createContract before returning (D-15). |
| `lib/paths.cjs` | Phase 1 | Path resolution | Magnet's JSON file provider needs to locate state file. Lathe uses it for root-relative path construction. |
| `lib/config.cjs` | Phase 1 | Config loading | Services may read config sections for defaults (e.g., Magnet state file path, Switchboard max listeners). |
| `lib/index.cjs` | Phase 1 | Barrel import | Services import `{ ok, err, isOk, isErr, createContract }` from `lib/index.cjs`. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom wildcard dispatch | EventEmitter3 with wildcard plugin | External npm dependency -- violates zero-dependency constraint. Custom prefix matching is ~20 lines. |
| JSON file provider for Magnet | bun:sqlite for persistence | bun:sqlite is faster but adds complexity. JSON file is simpler, human-readable, debuggable. Proper DB providers (Ledger/Journal) arrive in Phase 3. |
| Bun.file for reads | node:fs.readFileSync | Bun.file is async-first, requires `await`. For synchronous reads (rare), node:fs is fine. Lathe should expose both patterns. |

**Installation:**
```bash
# No installation needed -- zero npm dependencies for these services
# All APIs are Bun built-ins or Node.js compat built-ins
```

## Architecture Patterns

### Recommended Project Structure
```
core/
  services/
    switchboard/
      switchboard.cjs          # Service factory + implementation
      __tests__/
        switchboard.test.js    # bun:test specs
    commutator/
      commutator.cjs           # Service factory + implementation
      __tests__/
        commutator.test.js
    magnet/
      magnet.cjs               # Service factory + implementation
      provider.cjs             # State provider interface contract
      json-provider.cjs        # Built-in JSON file provider
      __tests__/
        magnet.test.js
        json-provider.test.js
    lathe/
      lathe.cjs                # Service factory + implementation
      __tests__/
        lathe.test.js
```

### Pattern 1: Service Factory with Self-Validating Contract (D-12, D-13, D-15)
**What:** Every service is created via a factory function that receives dependencies through an options object, validates its own contract shape, and returns a frozen Result-wrapped instance.
**When to use:** Every service in this phase (and all future services).
**Example:**
```javascript
// Source: Phase 1 patterns (contract.cjs, result.cjs) + CONTEXT.md D-12/D-13/D-15
'use strict';

const { ok, err, createContract } = require('../../lib/index.cjs');

const SERVICE_SHAPE = {
  required: ['init', 'start', 'stop', 'healthCheck'],
  optional: []  // service-specific methods added to required
};

function createSwitchboard() {
  let _started = false;

  const impl = {
    init(options) {
      // Validate dependencies from options
      // Store injected deps in closure
      return ok(undefined);
    },
    start() {
      _started = true;
      return ok(undefined);
    },
    stop() {
      _started = false;
      return ok(undefined);
    },
    healthCheck() {
      return ok({ healthy: _started, name: 'switchboard' });
    },
    // Service-specific methods...
  };

  // Self-validate before returning (D-15)
  return createContract('switchboard', {
    required: [...SERVICE_SHAPE.required, 'on', 'off', 'emit', 'filter'],
  }, impl);
}

module.exports = { createSwitchboard };
```

### Pattern 2: Switchboard Wildcard Dispatch (D-01, D-02, D-05)
**What:** Custom prefix-matching dispatch layer over EventEmitter. Maintains a Map of wildcard handlers that are checked against emitted event names. Actions dispatch to all matching handlers. Filters dispatch in priority order with halt capability.
**When to use:** Switchboard internal implementation.
**Example:**
```javascript
// Source: Verified via Bun 1.3.11 testing -- EventEmitter does NOT support native wildcards
'use strict';

const EventEmitter = require('node:events');

// Wildcard matching: 'hook:*' matches 'hook:session-start', 'hook:stop', etc.
function matchesPattern(pattern, eventName) {
  if (!pattern.endsWith(':*')) return pattern === eventName;
  const prefix = pattern.slice(0, -1); // Remove '*', keep the ':'
  return eventName.startsWith(prefix);
}

// Filter pipeline: priority-ordered, haltable
function runFilterPipeline(handlers, payload) {
  // handlers sorted by priority (lower = first)
  let current = payload;
  for (const handler of handlers) {
    const result = handler.fn(current);
    // false or Err halts the pipeline
    if (result === false) return err('FILTER_HALTED', 'Filter halted pipeline');
    if (result && result.ok === false) return result;
    // Transformed payload passes to next handler
    if (result !== undefined && result !== true) current = result;
  }
  return ok(current);
}
```

### Pattern 3: Commutator Semantic Routing (D-06, D-07, D-08)
**What:** A mapping table that inspects hook payloads and routes them to domain-specific Switchboard events based on tool_name and hook type.
**When to use:** Commutator inbound processing.
**Example:**
```javascript
// Source: Claude Code Hooks docs (https://code.claude.com/docs/en/hooks)
'use strict';

// Tool-to-domain mapping table (Claude's discretion per CONTEXT.md)
const TOOL_DOMAIN_MAP = {
  'Write': 'file',
  'Edit': 'file',
  'Read': 'file',
  'Bash': 'shell',
  'Glob': 'file',
  'Grep': 'file',
  'WebFetch': 'web',
  'WebSearch': 'web',
  'Agent': 'agent',
};

// Hook-to-event mapping
const HOOK_EVENT_MAP = {
  'SessionStart': 'hook:session-start',
  'UserPromptSubmit': 'hook:prompt-submit',
  'PreToolUse': null,  // Routed via TOOL_DOMAIN_MAP
  'PostToolUse': null,  // Routed via TOOL_DOMAIN_MAP
  'Stop': 'hook:stop',
  'PreCompact': 'hook:pre-compact',
  'Notification': 'hook:notification',
  'SubagentStart': 'hook:subagent-start',
  'SubagentStop': 'hook:subagent-stop',
};

function resolveEventName(hookPayload) {
  const hookName = hookPayload.hook_event_name;

  // Tool-aware hooks get domain-specific events
  if ((hookName === 'PreToolUse' || hookName === 'PostToolUse') && hookPayload.tool_name) {
    const domain = TOOL_DOMAIN_MAP[hookPayload.tool_name] || 'tool';
    const phase = hookName === 'PreToolUse' ? 'pre' : 'post';
    // e.g., 'file:changed' for PostToolUse+Write, 'shell:executed' for PostToolUse+Bash
    const action = hookName === 'PostToolUse' ? 'changed' : 'pending';
    return `${domain}:${action}`;
  }

  return HOOK_EVENT_MAP[hookName] || `hook:${hookName.toLowerCase()}`;
}
```

### Pattern 4: Magnet Scoped State with Provider Backing (D-09, D-10, D-11)
**What:** Three-tier state scoping (global, session, module) with a provider interface that abstracts persistence. Ships with JSON file provider, replaceable with Ledger/Journal in Phase 3.
**When to use:** Magnet implementation.
**Example:**
```javascript
// Source: CONTEXT.md D-09/D-10/D-11, Reverie spec Section 2.2
'use strict';

// State provider interface contract
const STATE_PROVIDER_SHAPE = {
  required: ['load', 'save'],
  optional: ['clear']
};

// Three-tier state structure
// {
//   global: { key: value },           // Persists always
//   session: { 'sess-id': { ... } },  // Tied to session, cleared on end
//   module: { 'reverie': { ... } }    // Namespaced by module name
// }

// Every mutation emits 'state:changed' to Switchboard
// { scope: 'global', key: 'version', oldValue: '0.9', newValue: '1.0' }
```

### Pattern 5: Lathe Facade over Bun APIs (SVC-04)
**What:** Single facade that wraps Bun.file, Bun.write, and node:fs into a unified service interface. Hides the async/sync API split behind a consistent async interface.
**When to use:** Any code that needs filesystem access. All filesystem operations go through Lathe -- never import Bun.file or node:fs directly in service code.
**Example:**
```javascript
// Source: Bun docs (https://bun.com/docs), verified in Bun 1.3.11
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Lathe method signatures (Claude's discretion)
// All methods return Result types
const LATHE_METHODS = {
  required: [
    'init', 'start', 'stop', 'healthCheck',
    'readFile',      // async - returns Ok(string) or Err
    'writeFile',     // async - atomic via Bun.write, returns Ok(undefined) or Err
    'deleteFile',    // sync - returns Ok(undefined) or Err
    'listDir',       // sync - returns Ok(DirEntry[]) or Err
    'exists',        // async - returns Ok(boolean)
    'mkdir',         // sync - returns Ok(undefined) or Err (recursive by default)
    'writeFileAtomic', // async - tmp + rename pattern for guaranteed atomicity
  ]
};
```

### Anti-Patterns to Avoid
- **Direct Bun.file/node:fs imports in services:** All filesystem access goes through Lathe. Forge, Relay, and future services must use Lathe, not raw APIs. This ensures consistency, testability (mock Lathe, not 10 different fs modules), and a single place to add logging/metrics.
- **Synchronous EventEmitter.emit for filters:** EventEmitter.emit is synchronous, which is fine for actions. But filter handlers may need to inspect state or do I/O. Design filter pipeline to support both sync and async handlers.
- **Global mutable state in services:** All state lives in closures within the factory function. No module-level `let` that persists between tests. Options-based DI means every test gets a fresh instance.
- **Hardcoded event names scattered through code:** Define event name constants in each service. Switchboard should export an EVENT_NAMES dictionary or each service should define its own domain events.
- **JSON file writes on every state mutation:** Magnet's JSON provider should debounce writes. State mutations are frequent (every set/delete emits events); writing to disk on every one would be a performance disaster. Buffer mutations and flush periodically or on stop().

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Event emission | Custom pub/sub from scratch | `node:events` EventEmitter as foundation | Listener management, memory leak detection (maxListeners), error events, once(), removeListener() -- all already solved. Layer custom wildcard matching on top. |
| File atomicity | Manual tmp-file + rename | Bun.write (atomic by default) | Bun.write uses optimized Zig implementation with atomic semantics. Only use tmp+rename for cases requiring explicit two-phase commit. |
| Deep object cloning for state | Manual recursive clone | `structuredClone()` | Built-in, handles circular refs, 25x faster in Bun 1.3.10+ for arrays. Use for state snapshots in Magnet (old value capture before mutation). |
| Path construction | String concatenation | `node:path.join()` | Cross-platform path separators, resolves `..` segments, no double-slash bugs. |
| JSON serialization safety | Manual try/catch around JSON.parse everywhere | Centralized parse wrapper in Lathe or lib/ | JSON.parse throws on invalid input. A wrapper returning Result<T> prevents scattered try/catch blocks across all consumers. |

**Key insight:** These four services are infrastructure -- they are consumed by every other service in the system. Bugs here cascade everywhere. Use battle-tested built-ins (EventEmitter, Bun.file, structuredClone, node:path) and layer thin facades on top rather than reimplementing fundamentals.

## Common Pitfalls

### Pitfall 1: EventEmitter Wildcard Assumption
**What goes wrong:** Developer subscribes to `'hook:*'` expecting EventEmitter to pattern-match against `'hook:session-start'`, `'hook:stop'`, etc. It does not. `'hook:*'` is treated as a literal event name.
**Why it happens:** Many event libraries (MQTT, Redis pub/sub) support glob patterns. EventEmitter does not.
**How to avoid:** Switchboard MUST implement its own wildcard matching layer. Maintain a separate registry of wildcard handlers and check them on every emit.
**Warning signs:** Tests pass when using exact event names but fail with wildcard subscriptions.

### Pitfall 2: EventEmitter Memory Leak Warnings
**What goes wrong:** Bun logs `MaxListenersExceededWarning` when more than 10 handlers are registered for a single event.
**Why it happens:** Default maxListeners is 10 (confirmed in Bun 1.3.11). Switchboard will naturally exceed this as multiple services subscribe to common events.
**How to avoid:** Call `emitter.setMaxListeners(0)` or a high number at Switchboard init. The warning is noise for an event bus, not a real leak.
**Warning signs:** Console warnings in tests that register multiple handlers.

### Pitfall 3: Bun.file Async API in Synchronous Context
**What goes wrong:** Calling `Bun.file(path).text()` returns a Promise, not a string. If consumed without `await`, the test or service gets `[object Promise]` instead of file content.
**Why it happens:** Bun.file methods (.text(), .json(), .arrayBuffer(), .exists()) are all async. Unlike node:fs which offers sync variants.
**How to avoid:** Lathe's public API should be consistently async (return Promises wrapped in Result). For rare sync needs, use `node:fs.readFileSync()` internally.
**Warning signs:** Tests comparing file content get `"[object Promise]"` or `undefined`.

### Pitfall 4: JSON State File Corruption on Crash
**What goes wrong:** Magnet writes partial JSON to the state file during a crash or forced process exit. On next load, JSON.parse fails and all state is lost.
**Why it happens:** Even with Bun.write atomicity, if the process dies mid-write, the file can be truncated.
**How to avoid:** Magnet's JSON provider should write to a `.tmp` file first, then rename (atomic on all POSIX systems). Keep the previous state file as `.bak` for recovery. On load failure, fall back to `.bak`.
**Warning signs:** State file contains truncated JSON after a crash.

### Pitfall 5: Filter Pipeline Ordering is Non-Obvious
**What goes wrong:** Handlers registered with the same priority execute in unpredictable order. Developer expects alphabetical or registration order.
**Why it happens:** D-03 says "lower number = runs first, default 100." But when multiple handlers have priority 100, what order do they run?
**How to avoid:** Define secondary sort as registration order (FIFO). Document this. Handlers with same priority run in the order they were registered.
**Warning signs:** Tests that depend on handler execution order pass intermittently.

### Pitfall 6: Circular Dependency Between Magnet and Switchboard
**What goes wrong:** Magnet needs Switchboard to emit `'state:changed'` events. If Switchboard also stores state in Magnet (e.g., handler counts), circular init dependency.
**Why it happens:** Both are foundational services that logically could depend on each other.
**How to avoid:** Switchboard MUST NOT depend on Magnet. Switchboard is stateless -- it dispatches events, it does not store anything beyond its handler registry (in-memory). Magnet depends on Switchboard (one-way). This is a hard architectural boundary.
**Warning signs:** init() calls forming a cycle. Test setup requiring both services to be initialized simultaneously.

### Pitfall 7: Mock.module Does Not Intercept Bun Native APIs
**What goes wrong:** Using `mock.module('node:fs')` in tests does not intercept calls made through Bun's native fs binding. File operations in Lathe go through the real filesystem even in tests.
**Why it happens:** Bun's native `require('node:fs')` binds to Zig-level implementations that bypass mock.module interception. This was discovered and documented in Phase 1.
**How to avoid:** Use `spyOn(fs, 'methodName')` instead of mock.module. For Lathe tests, use real temporary directories (tmpdir pattern) and clean up after. For testing services that depend on Lathe, inject a mock Lathe instance via options-based DI rather than trying to mock the filesystem.
**Warning signs:** Tests that mock node:fs still hit the real filesystem.

## Code Examples

Verified patterns from official sources and Bun 1.3.11 testing:

### Service Contract Shape (Phase 1 validated)
```javascript
// Source: lib/contract.cjs (Phase 1)
'use strict';

const { createContract } = require('../../lib/index.cjs');

// Base service lifecycle contract -- all four services extend this
const BASE_SERVICE_SHAPE = {
  required: ['init', 'start', 'stop', 'healthCheck'],
  optional: []
};

// Per-service extension
const SWITCHBOARD_SHAPE = {
  required: [...BASE_SERVICE_SHAPE.required, 'on', 'off', 'emit', 'filter'],
  optional: ['once']
};

const COMMUTATOR_SHAPE = {
  required: [...BASE_SERVICE_SHAPE.required, 'ingest', 'registerOutput'],
  optional: []
};

const MAGNET_SHAPE = {
  required: [...BASE_SERVICE_SHAPE.required, 'get', 'set', 'delete', 'getScope', 'registerProvider'],
  optional: ['clearScope']
};

const LATHE_SHAPE = {
  required: [...BASE_SERVICE_SHAPE.required, 'readFile', 'writeFile', 'deleteFile', 'listDir', 'exists', 'mkdir'],
  optional: ['writeFileAtomic', 'readJson', 'writeJson']
};
```

### Claude Code Hook Payload (Commutator Input)
```javascript
// Source: https://code.claude.com/docs/en/hooks
// These are the JSON payloads Commutator will receive on stdin

// PostToolUse + Write -> Commutator routes to 'file:changed'
const postToolUsePayload = {
  session_id: "abc123",
  transcript_path: "/Users/.../.claude/projects/.../transcript.jsonl",
  cwd: "/Users/.../project",
  permission_mode: "default",
  hook_event_name: "PostToolUse",
  tool_name: "Write",
  tool_input: {
    file_path: "/path/to/file.txt",
    content: "file content"
  },
  tool_response: {
    filePath: "/path/to/file.txt",
    success: true
  },
  tool_use_id: "toolu_01ABC123"
};

// SessionStart -> Commutator routes to 'hook:session-start'
const sessionStartPayload = {
  session_id: "abc123",
  transcript_path: "/Users/.../.claude/projects/.../transcript.jsonl",
  cwd: "/Users/.../project",
  hook_event_name: "SessionStart",
  source: "startup",  // "startup" | "resume" | "clear" | "compact"
  model: "claude-sonnet-4-6"
};

// Stop -> Commutator routes to 'hook:stop'
const stopPayload = {
  session_id: "abc123",
  transcript_path: "/Users/.../.claude/projects/.../transcript.jsonl",
  cwd: "/Users/.../project",
  hook_event_name: "Stop",
  stop_hook_active: false,
  last_assistant_message: "I've completed the refactoring..."
};
```

### Bun.file / Bun.write Verified API (Lathe Foundation)
```javascript
// Source: Verified in Bun 1.3.11 on this machine

// Write a file (atomic)
await Bun.write('/path/to/file.txt', 'content');
await Bun.write('/path/to/file.json', JSON.stringify(data, null, 2));
await Bun.write('/path/to/file.bin', Buffer.from([0x48, 0x65]));

// Read a file
const file = Bun.file('/path/to/file.txt');
const text = await file.text();      // string
const json = await file.json();      // parsed object
const buf = await file.arrayBuffer(); // binary

// File metadata
file.size;  // number (bytes)
file.type;  // string (MIME type, e.g., 'text/plain;charset=utf-8')

// Existence check (async)
const fileExists = await Bun.file('/path').exists();  // boolean

// Directory operations (node:fs sync)
const fs = require('node:fs');
fs.mkdirSync('/path/to/dir', { recursive: true });
const entries = fs.readdirSync('/path', { withFileTypes: true });
// entries[n].name, entries[n].isFile(), entries[n].isDirectory()
fs.rmSync('/path', { recursive: true });
fs.unlinkSync('/path/to/file');
fs.existsSync('/path');  // sync boolean
```

### Test Pattern (Phase 1 validated, bun:test)
```javascript
// Source: lib/__tests__/contract.test.js (Phase 1 pattern)
'use strict';

const { describe, it, expect, beforeEach, afterEach, spyOn } = require('bun:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

describe('Lathe service', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-lathe-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reads a file and returns Ok with content', async () => {
    const filePath = path.join(tmpDir, 'test.txt');
    await Bun.write(filePath, 'hello');
    // ... test lathe.readFile(filePath) returns ok('hello')
  });
});

// For services depending on Lathe -- inject mock via options DI
describe('Magnet with mock Lathe', () => {
  it('persists state via provider', () => {
    const mockLathe = {
      readFile: async () => ok('{"global":{}}'),
      writeFile: async () => ok(undefined),
      exists: async () => ok(true),
      // ... other Lathe methods as needed
    };
    // createMagnet({ lathe: mockLathe, switchboard: mockSwitchboard })
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| v0 used node:events directly as event bus | Switchboard wraps EventEmitter with wildcard matching + filter pipelines | Phase 2 (now) | Enables prefix subscriptions and interceptable data pipelines that v0 lacked |
| v0 used node:fs exclusively | Lathe wraps Bun.file + Bun.write + node:fs | Phase 2 (now) | Atomic writes by default, async-first API, unified facade |
| v0 had no centralized state management | Magnet with provider-backed persistence | Phase 2 (now) | State survives process restart, reactive patterns via events |
| v0 hook processing was inline | Commutator bridges hooks to Switchboard with semantic routing | Phase 2 (now) | Decoupled I/O, domain-specific event names, bidirectional support |
| bun:test `mock.module('node:fs')` | `spyOn(fs, 'method')` + tmpdir isolation | Phase 1 discovery | Bun native fs binding bypasses mock.module. Use spyOn or real temp dirs. |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built-in, Bun 1.3.11) |
| Config file | none -- bun:test discovers `*.test.js` in `__tests__/` directories by convention |
| Quick run command | `bun test core/services/` |
| Full suite command | `bun test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SVC-01 | Switchboard dispatches actions to all handlers in registration order | unit | `bun test core/services/switchboard/__tests__/switchboard.test.js -t "action"` | Wave 0 |
| SVC-01 | Switchboard dispatches filters in priority order with halt semantics | unit | `bun test core/services/switchboard/__tests__/switchboard.test.js -t "filter"` | Wave 0 |
| SVC-01 | Switchboard prefix wildcard matching ('hook:*' catches 'hook:session-start') | unit | `bun test core/services/switchboard/__tests__/switchboard.test.js -t "wildcard"` | Wave 0 |
| SVC-02 | Commutator routes PostToolUse+Write to 'file:changed' | unit | `bun test core/services/commutator/__tests__/commutator.test.js -t "semantic"` | Wave 0 |
| SVC-02 | Commutator handles bidirectional routing (inbound + outbound) | unit | `bun test core/services/commutator/__tests__/commutator.test.js -t "outbound"` | Wave 0 |
| SVC-03 | Magnet stores/retrieves scoped state (global, session, module) | unit | `bun test core/services/magnet/__tests__/magnet.test.js -t "scope"` | Wave 0 |
| SVC-03 | Magnet persists state via JSON provider across restart | integration | `bun test core/services/magnet/__tests__/json-provider.test.js` | Wave 0 |
| SVC-03 | Magnet emits 'state:changed' events on mutation | unit | `bun test core/services/magnet/__tests__/magnet.test.js -t "events"` | Wave 0 |
| SVC-04 | Lathe reads/writes/deletes files through Bun APIs | unit | `bun test core/services/lathe/__tests__/lathe.test.js -t "file"` | Wave 0 |
| SVC-04 | Lathe lists directories and checks existence | unit | `bun test core/services/lathe/__tests__/lathe.test.js -t "dir"` | Wave 0 |
| SVC-04 | Lathe performs atomic writes (tmp+rename pattern) | unit | `bun test core/services/lathe/__tests__/lathe.test.js -t "atomic"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test core/services/<current-service>/`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green (`bun test`) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `core/services/switchboard/__tests__/switchboard.test.js` -- covers SVC-01
- [ ] `core/services/commutator/__tests__/commutator.test.js` -- covers SVC-02
- [ ] `core/services/magnet/__tests__/magnet.test.js` -- covers SVC-03 state operations
- [ ] `core/services/magnet/__tests__/json-provider.test.js` -- covers SVC-03 persistence
- [ ] `core/services/lathe/__tests__/lathe.test.js` -- covers SVC-04
- [ ] `core/services/` directory creation -- does not exist yet

*(All test files are Wave 0 -- this is a greenfield phase creating `core/services/` from scratch)*

## Open Questions

1. **healthCheck() return shape**
   - What we know: D-12 specifies healthCheck() as one of four lifecycle methods. CONTEXT.md leaves the return type to Claude's discretion.
   - What's unclear: Should it return a simple `Result<boolean>` or a structured `Result<{ healthy: boolean, name: string, details?: object }>`?
   - Recommendation: Use structured return `{ healthy: boolean, name: string, uptime: number, details?: object }`. Phase 5 (INF-01) needs to aggregate per-service health into a diagnostic report -- structured data makes that trivial. A boolean loses the "why" on failure.

2. **Magnet JSON provider write frequency**
   - What we know: D-11 says every mutation emits Switchboard events. Writing to disk on every mutation would be too frequent.
   - What's unclear: How often should the JSON provider flush to disk?
   - Recommendation: Debounced flush -- write at most once per 1 second after last mutation, and always flush on stop(). This balances durability with performance. The state is in-memory between flushes, so it survives rapid mutation bursts.

3. **Commutator outbound adapter registration timing**
   - What we know: D-08 says outbound uses an event-to-output adapter pattern. Commutator listens for events like 'output:inject-context' and routes to stdout/Wire.
   - What's unclear: Should outbound adapters be registered at init() time or dynamically?
   - Recommendation: Register at init() with a fixed set of output adapters (stdout adapter for hooks). Wire adapter added in Phase 6 by registering a new adapter through the same interface. Dynamic registration enables extensibility without modifying Commutator.

4. **Lathe: async-only or mixed sync/async API**
   - What we know: Bun.file methods are async. node:fs has sync variants. Some callers (like synchronous config loading) may need sync reads.
   - What's unclear: Should Lathe expose sync variants or be async-only?
   - Recommendation: Async-only public API. Callers that need sync behavior can await at their call site. Exception: `existsSync()` can be exposed as a convenience since `fs.existsSync()` is trivially synchronous and used in conditionals. This keeps the API surface clean while not blocking the one case where sync is genuinely more ergonomic.

## Project Constraints (from CLAUDE.md)

Directives extracted from CLAUDE.md and .claude/CLAUDE.md that constrain implementation:

- **Runtime:** Bun -- all code runs on Bun, CJS format. `'use strict'` at top of every file.
- **Module format:** CJS only -- `require()` / `module.exports`. No ESM `import`/`export` in source files.
- **No npm dependencies:** Platform core uses only Bun/Node built-ins. These four services have zero npm dependencies.
- **Engineering principles:** Strict separation of concerns, IoC, DRY, abstraction over lateralization, hardcode nothing.
- **Named exports:** `module.exports = { ... }` as primary pattern. No default exports. Consistent, destructurable, testable.
- **JSDoc annotations:** `@param`, `@returns`, `@typedef` on all public API exports. Internal helpers can skip.
- **Object.freeze():** On contract instances (validated factory output) only. Utility exports and config objects not frozen.
- **Test framework:** `bun:test` -- Jest-compatible API. `.test.js` extension.
- **Mock pattern:** `spyOn(fs, 'method')` not `mock.module('node:fs')` -- Bun native binding bypasses mock.module.
- **Versioning:** User decides all version increments. Always push to origin after commits.
- **Branching:** Feature/task branches fold into dev. Never force push master or dev.
- **Canonical documents:** `.claude/new-plan.md` and `.claude/reverie-spec-v2.md` are absolute canon.
- **Build order:** Core Library first, then Services + Providers (parallel), then Framework, then SDK, then Modules.

## Sources

### Primary (HIGH confidence)
- Bun 1.3.11 runtime -- verified EventEmitter wildcard behavior, Bun.file/Bun.write APIs, node:fs compat, all via direct execution on this machine
- `lib/result.cjs`, `lib/contract.cjs`, `lib/schema.cjs`, `lib/paths.cjs`, `lib/config.cjs`, `lib/index.cjs` -- Phase 1 validated code (local source, read directly)
- `lib/__tests__/*.test.js` -- Phase 1 test patterns (local source, read directly)
- `.claude/new-plan.md` -- Architecture plan (canonical)
- `.claude/reverie-spec-v2.md` -- Reverie module spec (canonical), defines downstream usage of Switchboard, Magnet, Lathe

### Secondary (MEDIUM confidence)
- [Claude Code Hooks documentation](https://code.claude.com/docs/en/hooks) -- hook payload JSON format for all event types, verified via WebFetch
- [Claude Code Hooks schemas](https://gist.github.com/FrancisBourre/50dca37124ecc43eaf08328cdcccdb34) -- community reference for hook schemas
- [Pixelmojo Claude Code Hooks Reference](https://www.pixelmojo.io/blogs/claude-code-hooks-production-quality-ci-cd-patterns) -- all 12 hook event types documented

### Tertiary (LOW confidence)
- None -- all findings verified against primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all APIs verified by direct Bun 1.3.11 execution. Zero npm dependencies means no version uncertainty.
- Architecture: HIGH -- patterns derive directly from Phase 1 validated code (contract.cjs, result.cjs) and locked CONTEXT.md decisions. Service dependency order confirmed by analysis.
- Pitfalls: HIGH -- EventEmitter wildcard limitation confirmed by direct test. mock.module limitation carried from Phase 1 discovery. JSON corruption and debounce patterns are well-understood engineering concerns.

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable -- all APIs are Bun built-ins and Phase 1 code, low churn risk)
