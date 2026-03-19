# Architecture Research

**Domain:** Claude Code enhancement platform — CJS module architecture for Ledger + Switchboard systems
**Researched:** 2026-03-17
**Confidence:** HIGH

## System Overview

```
~/.claude/
├─────────────────────────────────────────────────────────────────────┐
│  settings.json (hook registration, permissions, statusLine)        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  hooks/                        dynamo/                              │
│  ├── dynamo-hooks.cjs          ├── bin/                             │
│  │   (single entry point       │   └── dynamo.cjs  (CLI router)    │
│  │    for ALL hook events)     ├── lib/                             │
│  │                             │   ├── core.cjs    (shared substrate│
│  │                             │   ├── ledger/     (memory system)  │
│  │                             │   └── switchboard/(management)     │
│  ├── gsd-context-monitor.js    ├── config.yaml                     │
│  ├── gsd-statusline.js         ├── curation/                       │
│  └── gsd-check-update.js       │   └── prompts.yaml                │
│                                └── docker-compose.yml               │
│                                                                     │
│  graphiti/ (legacy — deprecated after migration)                    │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  get-shit-done/  (GSD framework — read-only dependency)            │
└─────────────────────────────────────────────────────────────────────┘
```

### How the Pieces Connect

Claude Code fires hook events (SessionStart, PostToolUse, Stop, etc.) as defined in `settings.json`. Today, those hooks call Bash scripts that shell out to Python (`graphiti-helper.py`). The v1.2 architecture replaces this chain with a single CJS entry point (`dynamo-hooks.cjs`) that directly calls into the Dynamo module tree, eliminating the Bash-to-Python bridge entirely.

## Component Responsibilities

| Component | Responsibility | Current Implementation | v1.2 CJS Implementation |
|-----------|---------------|----------------------|--------------------------|
| Hook dispatcher | Route Claude Code events to handlers | 6 separate `.sh` scripts in `graphiti/hooks/` | Single `dynamo-hooks.cjs` with event router |
| MCP client | Communicate with Graphiti MCP server | Python `MCPClient` class in `graphiti-helper.py` | `lib/ledger/mcp-client.cjs` |
| Health check | Verify Graphiti server is reachable | `health-check.py` (360 LOC) | `lib/core.cjs` -- `healthCheck()` function |
| Memory search | Query knowledge graph for context | Python `cmd_search()` + curation | `lib/ledger/search.cjs` |
| Memory write | Store episodes in knowledge graph | Python `cmd_add_episode()` | `lib/ledger/episodes.cjs` |
| Context curation | Filter search results via Haiku | Python `curate_results()` via OpenRouter | `lib/ledger/curation.cjs` |
| Session naming | Generate session names via Haiku | Python `generate_session_name()` via OpenRouter | `lib/ledger/sessions.cjs` |
| Session index | Local JSON session tracking | Python `sessions.json` CRUD | `lib/ledger/sessions.cjs` |
| Session summary | Summarize and store session on Stop | Python `cmd_summarize_session()` | `lib/ledger/sessions.cjs` |
| Project detection | Detect project name from cwd | Python `cmd_detect_project()` | `lib/core.cjs` -- `detectProject()` |
| Config loading | Load `.env`, `config.yaml`, etc. | Python scattered across helper | `lib/core.cjs` -- `loadConfig()` |
| Hook registration | Manage `settings.json` hook entries | Manual / `install.sh` | `lib/switchboard/hooks.cjs` |
| Verification | End-to-end memory pipeline test | Python `cmd_verify_memory()` | `lib/switchboard/verify.cjs` |
| Diagnostics | Root cause analysis | `diagnose.py` (23K LOC) | `lib/switchboard/diagnostics.cjs` |

## Recommended Directory Structure

```
~/.claude/dynamo/
├── bin/
│   └── dynamo.cjs              # CLI router (like gsd-tools.cjs)
├── lib/
│   ├── core.cjs                # Shared substrate
│   ├── ledger/                 # Memory system
│   │   ├── index.cjs           # Ledger public API
│   │   ├── mcp-client.cjs      # MCP/JSON-RPC client for Graphiti
│   │   ├── search.cjs          # Memory search + curation
│   │   ├── episodes.cjs        # Episode write (add-episode)
│   │   ├── curation.cjs        # Haiku-powered result filtering
│   │   └── sessions.cjs        # Session index, naming, summary, view
│   └── switchboard/            # Management system
│       ├── index.cjs           # Switchboard public API
│       ├── hooks.cjs           # Hook registration/deregistration
│       ├── verify.cjs          # verify-memory pipeline test
│       ├── diagnostics.cjs     # diagnose command
│       ├── docker.cjs          # start/stop/health for Docker stack
│       └── installer.cjs       # settings.json + config management
├── hooks/
│   └── dynamo-hooks.cjs        # Single hook entry point for ALL events
├── config.yaml                 # Graphiti server configuration
├── curation/
│   └── prompts.yaml            # Haiku curation prompts
├── docker-compose.yml          # Neo4j + Graphiti containers
├── .env                        # API keys (not committed)
└── VERSION                     # Dynamo version for self-management
```

### Structure Rationale

- **`bin/dynamo.cjs`:** Single CLI entry point mirroring the GSD pattern (`gsd-tools.cjs`). Provides `dynamo <command> [args]` interface for both human use and hook invocation. All commands route through here.

- **`lib/core.cjs`:** The shared substrate. Contains utilities both Ledger and Switchboard need: config loading, environment/env-file parsing, project detection, health checking, output formatting, error handling. This is the dependency both systems share but neither owns.

- **`lib/ledger/`:** Everything about what Claude knows. The MCP client, search, episode storage, curation, and session management. Ledger has no knowledge of hooks or settings.json -- it only knows about the Graphiti knowledge graph.

- **`lib/switchboard/`:** Everything about how Claude behaves. Hook registration, verification, diagnostics, Docker management, and installer logic. Switchboard has no knowledge of MCP or the knowledge graph -- it only knows about Claude Code's settings and infrastructure.

- **`hooks/dynamo-hooks.cjs`:** The bridge. This single file is what Claude Code actually calls for every hook event. It reads stdin JSON, determines the event type, and delegates to the appropriate Ledger or Switchboard function. One file, one registration pattern in settings.json, all events.

- **Separation from `graphiti/`:** The new `dynamo/` directory coexists with the legacy `graphiti/` during migration. Both can be active simultaneously (hooks registered for either). The migration plan removes `graphiti/` hooks from settings.json once `dynamo/` hooks pass verification.

## Architectural Patterns

### Pattern 1: Single Entry Point Hook Dispatcher

**What:** Instead of N separate hook scripts (current: 6 Bash files), register a single CJS file (`dynamo-hooks.cjs`) for every hook event. The script reads the event from `hook_event_name` in the stdin JSON and routes internally.

**When to use:** Always. This is the core pattern.

**Trade-offs:**
- Pro: One file to maintain, one registration pattern, unified error handling
- Pro: No Bash-to-Python bridge overhead -- direct Node.js execution
- Pro: Shared state (health check cache, MCP session reuse) within a single process
- Con: Slightly larger single file (mitigated by delegation to lib modules)

**Example:**
```javascript
#!/usr/bin/env node
// dynamo-hooks.cjs -- Single entry point for all Claude Code hook events

const { handleSessionStart, handlePostToolUse,
        handleUserPrompt, handlePreCompact,
        handleStop } = require('../lib/ledger/index.cjs');

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 5000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', async () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    const event = data.hook_event_name;

    switch (event) {
      case 'SessionStart':
        await handleSessionStart(data);
        break;
      case 'UserPromptSubmit':
        await handleUserPrompt(data);
        break;
      case 'PostToolUse':
        await handlePostToolUse(data);
        break;
      case 'PreCompact':
        await handlePreCompact(data);
        break;
      case 'Stop':
        await handleStop(data);
        break;
      default:
        process.exit(0); // Unknown event, exit silently
    }
  } catch (e) {
    process.exit(0); // Never block Claude Code
  }
});
```

### Pattern 2: GSD-Style Module Organization

**What:** Follow GSD's proven CJS pattern: single CLI entry point (`bin/`), modular library (`lib/`), pure-function exports, `require()`-based dependency injection. Every module exports named functions. The CLI router maps commands to function calls.

**When to use:** For the entire module tree.

**Trade-offs:**
- Pro: Proven pattern in the same user environment (GSD already works this way)
- Pro: CJS means no build step, no transpilation, runs directly with Node.js
- Pro: Testable -- every export is a pure function or class with explicit dependencies
- Con: No ES module features (top-level await, import.meta) -- mitigated by wrapping async in main()

**Key GSD patterns to adopt:**
1. **`output(result, raw, rawValue)`** -- Dual-mode output: JSON for programmatic use, raw string for human/pipe use
2. **`error(message)`** -- Unified error handling with stderr + exit(1)
3. **`safeReadFile(path)`** -- Graceful file reading (returns null on failure)
4. **`loadConfig(cwd)`** -- Config with defaults + override cascade
5. **CLI router with switch/case** -- Simple, explicit command routing

```javascript
// lib/core.cjs -- Shared substrate (follows GSD core.cjs patterns)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function output(result, raw, rawValue) {
  if (raw && rawValue !== undefined) {
    process.stdout.write(String(rawValue));
  } else {
    process.stdout.write(JSON.stringify(result, null, 2));
  }
  process.exit(0);
}

function error(message) {
  process.stderr.write('Error: ' + message + '\n');
  process.exit(1);
}

module.exports = { output, error, /* ... */ };
```

### Pattern 3: Boundary Enforcement via Index Exports

**What:** Each system (Ledger, Switchboard) exposes a single `index.cjs` that is the public API. Internal modules are never imported directly from outside the system boundary. The hook dispatcher and CLI router only import from `index.cjs`.

**When to use:** For all cross-boundary imports.

**Trade-offs:**
- Pro: Clear contract between Ledger and Switchboard
- Pro: Internal refactoring does not break consumers
- Pro: Easy to audit what each system exposes
- Con: Minor boilerplate (index re-exports)

```javascript
// lib/ledger/index.cjs -- Public API for the memory system
const { searchMemory, searchWithCuration } = require('./search.cjs');
const { addEpisode } = require('./episodes.cjs');
const { summarizeSession, generateSessionName,
        indexSession, listSessions, viewSession } = require('./sessions.cjs');

// Hook handlers (called by dynamo-hooks.cjs)
async function handleSessionStart(data) { /* ... */ }
async function handleUserPrompt(data) { /* ... */ }
async function handlePostToolUse(data) { /* ... */ }
async function handlePreCompact(data) { /* ... */ }
async function handleStop(data) { /* ... */ }

module.exports = {
  // Hook handlers
  handleSessionStart,
  handleUserPrompt,
  handlePostToolUse,
  handlePreCompact,
  handleStop,
  // Direct API (for CLI commands)
  searchMemory,
  addEpisode,
  summarizeSession,
  generateSessionName,
  indexSession,
  listSessions,
  viewSession,
};
```

### Pattern 4: Cached Health Check with Per-Session Flag

**What:** The current Bash hooks use a `/tmp/graphiti-health-warned-${PPID}` flag file to avoid repeated health check warnings. The CJS version should do the same but can be cleaner: check health once per hook invocation with a cached result file that has a TTL.

**When to use:** Every hook that talks to Graphiti.

**Trade-offs:**
- Pro: Avoids 3s health check timeout on every hook invocation
- Pro: Single warning per session, not per event
- Con: Slightly stale health status (mitigated by short TTL of 30s)

```javascript
// lib/core.cjs -- Health check with caching
const HEALTH_CACHE_TTL_MS = 30000; // 30 seconds

function getHealthCachePath(sessionId) {
  return path.join(os.tmpdir(), `dynamo-health-${sessionId || 'default'}.json`);
}

async function isHealthy(sessionId) {
  const cachePath = getHealthCachePath(sessionId);
  // Check cache first
  try {
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (Date.now() - cached.timestamp < HEALTH_CACHE_TTL_MS) {
      return cached.healthy;
    }
  } catch {}

  // Fresh check
  try {
    const resp = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(3000) });
    const healthy = resp.ok;
    fs.writeFileSync(cachePath, JSON.stringify({ healthy, timestamp: Date.now() }));
    return healthy;
  } catch {
    fs.writeFileSync(cachePath, JSON.stringify({ healthy: false, timestamp: Date.now() }));
    return false;
  }
}
```

### Pattern 5: Native `fetch()` Instead of Python `httpx`

**What:** Node.js 18+ (which Claude Code requires) includes native `fetch()`. Use it for all HTTP calls: Graphiti health checks, MCP JSON-RPC, OpenRouter API (curation/summarization). No npm dependencies needed.

**When to use:** All HTTP communication.

**Trade-offs:**
- Pro: Zero external dependencies for HTTP
- Pro: Consistent with GSD (which also uses zero npm deps)
- Pro: `AbortSignal.timeout()` provides clean timeout support
- Con: Slightly more verbose than `httpx` for SSE parsing

```javascript
// lib/ledger/mcp-client.cjs -- MCP client using native fetch
class MCPClient {
  constructor(baseUrl, timeout = 5000) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeout = timeout;
    this.sessionId = null;
  }

  async callTool(toolName, args) {
    if (!this.sessionId) await this._initialize();

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };
    if (this.sessionId) headers['mcp-session-id'] = this.sessionId;

    const resp = await fetch(this.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: toolName, arguments: args },
        id: crypto.randomUUID(),
      }),
      signal: AbortSignal.timeout(this.timeout),
    });

    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      return this._parseSSE(await resp.text());
    }
    return resp.json();
  }
}
```

## Data Flow

### Hook Event Flow (v1.2)

```
Claude Code fires hook event
    |
    v
settings.json routes to dynamo-hooks.cjs
    |
    v
dynamo-hooks.cjs reads stdin JSON
    |
    +-- hook_event_name: "SessionStart"
    |       |
    |       v
    |   ledger/index.cjs::handleSessionStart()
    |       |
    |       +-- core.cjs::isHealthy()  -->  Graphiti /health
    |       +-- core.cjs::detectProject()
    |       +-- ledger/search.cjs::searchMemory()  -->  Graphiti MCP
    |       +-- ledger/curation.cjs::curateResults()  -->  OpenRouter (Haiku)
    |       |
    |       v
    |   stdout: "[GRAPHITI MEMORY CONTEXT]\n..."
    |   (Claude Code injects as additionalContext)
    |
    +-- hook_event_name: "PostToolUse"
    |       |
    |       v
    |   Check tool_name: only Write|Edit|MultiEdit
    |       |
    |       v
    |   ledger/index.cjs::handlePostToolUse()
    |       +-- ledger/episodes.cjs::addEpisode()  -->  Graphiti MCP (add_memory)
    |
    +-- hook_event_name: "UserPromptSubmit"
    |       |
    |       v
    |   ledger/index.cjs::handleUserPrompt()
    |       +-- Skip if prompt < 15 chars
    |       +-- ledger/search.cjs::searchMemory()  -->  Graphiti MCP
    |       +-- ledger/curation.cjs::curateResults()  -->  OpenRouter (Haiku)
    |       +-- ledger/sessions.cjs::earlyNameSession()  -->  OpenRouter (Haiku)
    |       |
    |       v
    |   stdout: "[RELEVANT MEMORY]\n..."
    |
    +-- hook_event_name: "PreCompact"
    |       |
    |       v
    |   ledger/index.cjs::handlePreCompact()
    |       +-- ledger/curation.cjs::extractKnowledge()  -->  OpenRouter (Haiku)
    |       +-- ledger/episodes.cjs::addEpisode()  -->  Graphiti MCP
    |       |
    |       v
    |   stdout: "[PRESERVED CONTEXT]\n..."
    |
    +-- hook_event_name: "Stop"
            |
            v
        Guard: skip if stop_hook_active === true
            |
            v
        ledger/index.cjs::handleStop()
            +-- ledger/sessions.cjs::summarizeSession()  -->  OpenRouter (Haiku)
            +-- ledger/episodes.cjs::addEpisode()  -->  Graphiti MCP (project scope)
            +-- ledger/episodes.cjs::addEpisode()  -->  Graphiti MCP (session scope)
            +-- ledger/sessions.cjs::generateSessionName()  -->  OpenRouter (Haiku)
            +-- ledger/sessions.cjs::indexSession()  -->  local sessions.json
```

### CLI Command Flow (v1.2)

```
User or Claude Code runs: node dynamo.cjs <command> [args]
    |
    v
bin/dynamo.cjs (CLI router)
    |
    +-- "health-check"    -->  core.cjs::healthCheck()
    +-- "search"          -->  ledger/search.cjs::searchMemory()
    +-- "add-episode"     -->  ledger/episodes.cjs::addEpisode()
    +-- "summarize"       -->  ledger/sessions.cjs::summarizeSession()
    +-- "list-sessions"   -->  ledger/sessions.cjs::listSessions()
    +-- "view-session"    -->  ledger/sessions.cjs::viewSession()
    +-- "label-session"   -->  ledger/sessions.cjs::labelSession()
    +-- "backfill"        -->  ledger/sessions.cjs::backfillSessions()
    +-- "verify-memory"   -->  switchboard/verify.cjs::verifyMemory()
    +-- "diagnose"        -->  switchboard/diagnostics.cjs::diagnose()
    +-- "install"         -->  switchboard/installer.cjs::install()
    +-- "register-hooks"  -->  switchboard/hooks.cjs::registerHooks()
    +-- "docker-start"    -->  switchboard/docker.cjs::start()
    +-- "docker-stop"     -->  switchboard/docker.cjs::stop()
    +-- "detect-project"  -->  core.cjs::detectProject()
```

## settings.json Hook Registration (v1.2)

The current settings.json has 6 separate hook entries with Bash commands pointing to `$HOME/.claude/graphiti/hooks/`. The v1.2 registration replaces all of them with a single CJS entry per event type.

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$HOME/.claude/dynamo/hooks/dynamo-hooks.cjs\"",
            "timeout": 30
          }
        ]
      },
      {
        "matcher": "compact",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$HOME/.claude/dynamo/hooks/dynamo-hooks.cjs\"",
            "timeout": 30
          }
        ]
      },
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$HOME/.claude/hooks/gsd-check-update.js\""
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$HOME/.claude/dynamo/hooks/dynamo-hooks.cjs\"",
            "timeout": 15
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$HOME/.claude/dynamo/hooks/dynamo-hooks.cjs\"",
            "timeout": 10
          }
        ]
      },
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$HOME/.claude/hooks/gsd-context-monitor.js\""
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$HOME/.claude/dynamo/hooks/dynamo-hooks.cjs\"",
            "timeout": 30
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node \"$HOME/.claude/dynamo/hooks/dynamo-hooks.cjs\"",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

GSD hooks (`gsd-check-update.js`, `gsd-context-monitor.js`, `gsd-statusline.js`) remain untouched. They are GSD's responsibility. Dynamo hooks coexist alongside them.

## Ledger / Switchboard Boundary

This is the critical architectural boundary. Here is the definitive rule:

**Ledger** owns anything that touches the knowledge graph or involves what Claude remembers:
- MCP client (JSON-RPC to Graphiti)
- Memory search (facts, nodes, curation)
- Episode storage (file changes, session summaries, knowledge preservation)
- Session management (index, naming, summary, view, label, backfill)
- Context curation (Haiku calls for relevance filtering)
- All hook event handlers that produce `additionalContext` for Claude

**Switchboard** owns anything that manages Claude Code's infrastructure or behavior:
- Hook registration/deregistration in `settings.json`
- Memory pipeline verification (`verify-memory`)
- Diagnostics and troubleshooting (`diagnose`)
- Docker stack management (start, stop, health)
- Installation and self-management
- Configuration management (`.env`, `config.yaml`)
- Future: skill registration, agent management, permission management

**Shared Substrate** (`core.cjs`) owns cross-cutting utilities both systems need:
- Output formatting (`output()`, `error()`)
- Config loading (`.env` parsing, YAML config, environment variables)
- Project detection (`detectProject()`)
- Health check (cached, with session awareness)
- File I/O utilities (`safeReadFile()`)

**The boundary test:** Can Ledger function if Switchboard is completely removed? Yes -- it only needs `core.cjs`. Can Switchboard function if Ledger is removed? Yes -- it only needs `core.cjs`. They never import from each other.

## Integration Points

### Claude Code Hook System

| Hook Event | Dynamo Handler | System | What It Does |
|------------|---------------|--------|-------------|
| SessionStart (startup/resume) | `handleSessionStart()` | Ledger | Injects global prefs + project context + recent sessions |
| SessionStart (compact) | `handleSessionStart()` | Ledger | Same as startup (re-injects context after compaction) |
| UserPromptSubmit | `handleUserPrompt()` | Ledger | Searches memory for relevant context, names session |
| PostToolUse (Write/Edit/MultiEdit) | `handlePostToolUse()` | Ledger | Stores file change episode in knowledge graph |
| PreCompact | `handlePreCompact()` | Ledger | Extracts and preserves key knowledge before compaction |
| Stop | `handleStop()` | Ledger | Summarizes session, stores summary, generates name |

### Graphiti MCP Server

| Integration | Protocol | Endpoint |
|-------------|----------|----------|
| Health check | HTTP GET | `http://localhost:8100/health` |
| Tool calls (search, add, get) | JSON-RPC over HTTP + SSE | `http://localhost:8100/mcp` |

MCP tools used: `add_memory`, `search_memory_facts`, `search_nodes`, `get_episodes`.

### OpenRouter API (Haiku)

| Integration | Purpose | Model |
|-------------|---------|-------|
| Context curation | Filter search results for relevance | `anthropic/claude-haiku-4.5` |
| Session summarization | Compress session into 3-5 bullets | `anthropic/claude-haiku-4.5` |
| Session naming | Generate 3-5 word session name | `anthropic/claude-haiku-4.5` |
| Knowledge preservation | Extract key facts before compaction | `anthropic/claude-haiku-4.5` |

### Docker Infrastructure

| Service | Port | Purpose |
|---------|------|---------|
| Neo4j | 7475 (HTTP), 7687 (Bolt) | Knowledge graph database |
| Graphiti MCP | 8100 | MCP server for memory operations |

### GSD Framework (Read-Only)

Dynamo does not depend on GSD at runtime. The relationship is pattern-based: Dynamo follows GSD's CJS conventions so the codebase is consistent for Claude Code to work with. GSD hooks and Dynamo hooks coexist in `settings.json` without conflict.

### Repository (my-cc-setup)

The `my-cc-setup` repo contains the source of truth. `install.sh` (or future `dynamo install`) copies files from the repo to `~/.claude/dynamo/` and updates `settings.json`.

| Boundary | Communication | Notes |
|----------|---------------|-------|
| dynamo-hooks.cjs to Ledger | Direct `require()` | Same process, synchronous import |
| dynamo-hooks.cjs to core | Direct `require()` | Same process, synchronous import |
| Ledger to Graphiti MCP | HTTP (JSON-RPC) | Async `fetch()`, 5s timeout |
| Ledger to OpenRouter | HTTP (REST) | Async `fetch()`, 10-15s timeout |
| Switchboard to settings.json | File I/O | JSON read/write |
| Switchboard to Docker | `child_process.execSync` | `docker compose up/down` |
| install.sh to ~/.claude/ | File copy | One-way sync from repo to runtime |

## Build Order (Dependency-Driven)

The dependency graph dictates build order:

```
Phase 1: core.cjs (shared substrate)
    No dependencies. Everything else depends on this.
    Includes: output/error, config loading, .env parsing,
    project detection, health check, safeReadFile.

Phase 2: lib/ledger/mcp-client.cjs
    Depends on: core.cjs (config, health check)
    The MCP client is the foundation of all memory operations.

Phase 3: lib/ledger/ (remaining modules)
    Depends on: core.cjs, mcp-client.cjs
    episodes.cjs, search.cjs, curation.cjs, sessions.cjs
    Can be built in parallel since they share mcp-client but
    do not depend on each other.

Phase 4: lib/ledger/index.cjs (hook handlers)
    Depends on: all ledger modules
    Composes individual modules into hook event handlers.

Phase 5: hooks/dynamo-hooks.cjs
    Depends on: ledger/index.cjs, core.cjs
    The single entry point. Routes events to handlers.

Phase 6: lib/switchboard/ (all modules)
    Depends on: core.cjs only
    hooks.cjs, verify.cjs, diagnostics.cjs, docker.cjs, installer.cjs
    Can be built in parallel with phases 2-5 if desired.

Phase 7: bin/dynamo.cjs (CLI router)
    Depends on: everything
    Routes CLI commands to Ledger and Switchboard functions.
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (1 user, 5-10 hooks/session) | Single-file hooks, synchronous MCP calls, file-based session index |
| Future (many sessions, large knowledge graph) | Session index could move to SQLite if JSON grows large (>1MB). MCP client could pool connections. Not needed for v1.2. |
| Future (multiple projects, concurrent sessions) | Session-scoped health cache already handles this. Group_id scoping in Graphiti handles project isolation. |

### Scaling Priorities

1. **First bottleneck:** Haiku API latency (~200-500ms per call, 3-5 calls per session lifecycle). Mitigate with parallel requests where possible (e.g., search global + project simultaneously).
2. **Second bottleneck:** sessions.json file size. Currently ~5KB for ~20 sessions. At 1000+ sessions, switch to append-only log with periodic compaction, or SQLite.

## Anti-Patterns

### Anti-Pattern 1: Multiple Hook Entry Points

**What people do:** Register separate scripts for each hook event (current state: 6 Bash files).
**Why it is wrong:** Each invocation pays the full startup cost (Python interpreter + virtual env + module imports is approximately 500ms). Makes error handling inconsistent. Hook registration in settings.json becomes a complex manual task.
**Do this instead:** Single CJS entry point with internal routing. Node.js cold start is approximately 50ms. One file to register, one error handling strategy.

### Anti-Pattern 2: Bash-as-Glue Language

**What people do:** Write Bash scripts that parse JSON with `jq`, shell out to Python, and handle errors with cascading `if/then/fi`.
**Why it is wrong:** Brittle JSON parsing, hard to test, inconsistent error handling between Bash and Python layers, difficult to share state between hook invocations.
**Do this instead:** CJS handles JSON natively, has try/catch, and shares modules via `require()`.

### Anti-Pattern 3: Cross-Boundary Imports

**What people do:** Import Ledger internals from Switchboard or vice versa (e.g., Switchboard calling `mcp-client.cjs` directly).
**Why it is wrong:** Couples the two systems, prevents independent evolution, makes it unclear which system owns what.
**Do this instead:** Each system exports through `index.cjs`. If Switchboard needs memory data for verification, it calls Ledger's public API. If Ledger needs hook state, it asks core.cjs.

### Anti-Pattern 4: Blocking Hook Execution

**What people do:** Let a hook time out or throw an unhandled error, which blocks Claude Code.
**Why it is wrong:** A memory hook should never impair Claude Code's core functionality. The existing system correctly catches errors and exits 0.
**Do this instead:** Wrap every hook handler in try/catch. On any error, log to `hook-errors.log` and exit 0. Never exit 2 (blocking) from a memory hook. The stdin timeout guard pattern from GSD hooks (3-5s timeout on stdin read) must be preserved.

### Anti-Pattern 5: npm Dependencies

**What people do:** Install npm packages for HTTP, YAML parsing, etc.
**Why it is wrong:** Creates a `node_modules` directory in `~/.claude/dynamo/`, requires `npm install` during setup, version conflicts possible, increases attack surface.
**Do this instead:** Zero external dependencies. Use native `fetch()` for HTTP, simple YAML parser for config (or convert config to JSON), `fs`/`path`/`crypto` from Node.js stdlib. GSD proves this works at scale with 14 CJS files and zero npm deps.

## Migration Strategy

The migration from `graphiti/` (Python/Bash) to `dynamo/` (CJS) should be gradual:

1. **Build `dynamo/` alongside `graphiti/`** -- they coexist in `~/.claude/`
2. **Feature parity first** -- each CJS module must match the Python equivalent's behavior
3. **Per-event migration** -- switch one hook event at a time in `settings.json`
4. **Verify each switch** -- run `dynamo verify-memory` after each event migration
5. **Remove `graphiti/` hooks last** -- only after all events verified on CJS

This avoids any downtime in the memory system during migration.

## YAML Config Consideration

The current `config.yaml` is read by Python's `yaml.safe_load()`. CJS without npm deps cannot parse YAML natively. Two options:

**Option A (recommended):** Convert `config.yaml` to `config.json` during the v1.2 migration. JSON is natively parseable in Node.js. The YAML format provides no advantage for this use case (no multi-line strings, no anchors/aliases used).

**Option B:** Write a minimal YAML subset parser (~50 LOC) that handles the flat key-value and simple nested structure used in `config.yaml`. This preserves format continuity but adds maintenance burden for no real benefit.

Recommendation: Option A. Convert to JSON. The Docker Compose file stays YAML (Docker reads it, not Dynamo). The curation prompts file (`prompts.yaml`) should also convert to `prompts.json` with escaped newlines in prompt strings, or be loaded as raw text files (one per prompt).

## Sources

- GSD CJS architecture: `/Users/tom.kyser/.claude/get-shit-done/bin/gsd-tools.cjs` and `lib/*.cjs` (14 modules, zero deps) -- **HIGH confidence** (direct code inspection)
- Claude Code hooks specification: [Hooks reference - Claude Code Docs](https://code.claude.com/docs/en/hooks) -- **HIGH confidence** (official documentation, 23 hook events documented)
- Current graphiti system: `/Users/tom.kyser/.claude/graphiti/` (6 Bash hooks, 3 Python modules) -- **HIGH confidence** (direct code inspection)
- Current settings.json hook registration: `/Users/tom.kyser/.claude/settings.json` -- **HIGH confidence** (direct inspection)
- Claude Code hook plugin development: [anthropics/claude-code plugin-dev skill](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/hook-development/SKILL.md) -- **MEDIUM confidence** (GitHub, may be version-specific)
- [Claude Code power user customization: How to configure hooks](https://claude.com/blog/how-to-configure-hooks) -- **MEDIUM confidence** (official blog)

---
*Architecture research for: Dynamo v1.2 -- Ledger + Switchboard CJS Architecture*
*Researched: 2026-03-17*
