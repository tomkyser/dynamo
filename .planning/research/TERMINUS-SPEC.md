# Terminus: Data Infrastructure Layer Specification

**Status:** Technical specification
**Date:** 2026-03-19
**Subsystem:** Terminus
**Role:** Data Infrastructure -- MCP transport, Docker stack, health monitoring, diagnostics, migrations
**Depends on:** Dynamo PRD (subsystem boundary definitions)
**Referenced by:** Ledger-SPEC.md (write transport), Assay-SPEC.md (read transport), Switchboard-SPEC.md (lifecycle calls), Reverie-SPEC.md (transport layer)

---

## 1. Executive Summary

Terminus is the Data Infrastructure Layer of the Dynamo architecture. It owns every component between subsystem logic and the knowledge graph backend: the MCP transport client, Docker stack lifecycle management, health monitoring, diagnostics, pipeline verification, and data migrations. Terminus is the pipe -- it does not decide what flows through the pipe, but it guarantees the pipe works.

In the current codebase (v1.2.1), Terminus's responsibilities are split across two directories: `ledger/mcp-client.cjs` provides the transport client while `switchboard/` hosts the infrastructure operations (stack management, health checks, diagnostics, pipeline verification, and migrations). The six-subsystem architecture consolidates all infrastructure concerns into a single subsystem with clear ownership boundaries.

Terminus is stateless by design. It provides transport functions that Ledger and Assay call for graph write and read operations respectively. It provides health and diagnostic functions that Switchboard and Dynamo call for system operations. It does not maintain its own application state beyond what is required for connection lifecycle management.

**Key responsibilities:**

| Domain | What Terminus Owns |
|--------|-------------------|
| Transport | MCP client (JSON-RPC/SSE), connection lifecycle, timeout handling |
| Stack | Docker Compose lifecycle (start with health wait, stop with graceful shutdown) |
| Health | 6-stage health check (Docker, Neo4j, API, MCP, env, canary) |
| Diagnostics | 13-stage deep system inspection |
| Verification | End-to-end pipeline verification (verify-memory) |
| Migrations | Version comparison, sequential execution, boundary filtering |
| Shared Stages | Reusable diagnostic stage building blocks |

---

## 2. Responsibilities and Boundaries

### 2.1 What Terminus Owns

**MCP Transport Client:**
- JSON-RPC request/response handling over HTTP
- SSE (Server-Sent Events) response parsing for streaming results
- Connection lifecycle: initialize, send request, parse response, handle errors
- Timeout management with configurable per-operation timeouts
- Retry logic for transient connection failures
- URL resolution from configuration (`graphiti.mcp_url`)

**Docker Stack Lifecycle:**
- `startStack()` -- bring up Graphiti MCP server + Neo4j via Docker Compose
- `stopStack()` -- graceful shutdown of the Docker Compose stack
- Health wait loop after start (poll until services are healthy)
- Docker Compose file path resolution (`graphiti/docker-compose.yml`)

**Health Monitoring:**
- 6-stage health check: Docker daemon, Neo4j connectivity, Graphiti API, MCP protocol, environment variables, canary write/read
- Stage-by-stage reporting with PASS/FAIL/SKIP status
- Health check as a reusable function callable from multiple contexts (install, CLI, diagnostics)

**Diagnostics:**
- 13-stage deep system inspection (superset of health check)
- Container status inspection, log analysis, port binding verification
- Environment variable validation, configuration consistency checks
- Each stage self-contained with its own PASS/FAIL/SKIP verdict

**Pipeline Verification:**
- End-to-end memory pipeline test (write an episode, read it back, verify content)
- 6-stage verification: write, read, scope isolation, session operations, round-trip
- Used by install (post-deployment verification) and CLI (`dynamo verify-memory`)

**Migrations:**
- Migration harness: discover, filter, and execute migration scripts
- Version comparison (semver, 3-component numeric)
- Sequential execution with boundary filtering (source >= version, target <= version)
- Migration scripts directory management

**Shared Diagnostic Stages:**
- Reusable building blocks for health check and diagnostics
- Stage definitions with standard interface: `{ name, run: async () => { status, detail } }`
- Stages compose into health check (6 stages) and diagnostics (13 stages)

### 2.2 What Terminus Does NOT Own

| Concern | Owner | Why Not Terminus |
|---------|-------|-----------------|
| What data to write | Ledger | Terminus is the transport, not the author |
| What data to read | Assay | Terminus is the transport, not the query designer |
| When to write/read | Reverie / Switchboard | Terminus responds to calls, it does not initiate them |
| CLI routing | Dynamo | Terminus exposes functions, Dynamo routes commands to them |
| Install/sync/update | Switchboard | System lifecycle operations are Switchboard's domain |
| Hook dispatching | Switchboard | Event routing is Switchboard's core function |
| Cognitive processing | Reverie | Terminus has no intelligence layer |
| Data construction logic | Ledger | Episode formatting, curation, and shaping are Ledger's domain |
| Data access logic | Assay | Search algorithms, session queries, and entity inspection are Assay's domain |

### 2.3 Interface Contracts

**Terminus provides transport functions that Ledger and Assay call:**
- Ledger calls Terminus to write episodes and entities to the knowledge graph
- Assay calls Terminus to read entities, search facts, and query sessions from the knowledge graph
- Both subsystems depend on Terminus's MCP client but do not directly manage connections

**Terminus provides infrastructure functions that Switchboard and Dynamo call:**
- Switchboard calls `startStack()` / `stopStack()` during install and lifecycle operations
- Dynamo routes CLI commands (`health-check`, `diagnose`, `verify-memory`, `migrate`) to Terminus functions
- Switchboard calls health check during install verification

**Terminus calls external systems:**
- Graphiti MCP server via JSON-RPC over HTTP (outbound)
- Docker engine via `docker compose` CLI (outbound)
- Neo4j (indirectly, through Graphiti -- Terminus never connects to Neo4j directly)

---

## 3. Architecture

### 3.1 Module Structure

#### Current Location to New Location Mapping

| Current File | LOC | Current Function | New Location |
|-------------|-----|-----------------|-------------|
| `ledger/mcp-client.cjs` | 115 | MCP JSON-RPC transport | `subsystems/terminus/mcp-client.cjs` |
| `switchboard/stack.cjs` | 212 | Docker start/stop | `subsystems/terminus/stack.cjs` |
| `switchboard/health-check.cjs` | 120 | 6-stage health check | `subsystems/terminus/health-check.cjs` |
| `switchboard/diagnose.cjs` | 170 | 13-stage diagnostics | `subsystems/terminus/diagnose.cjs` |
| `switchboard/verify-memory.cjs` | 330 | Pipeline verification | `subsystems/terminus/verify-memory.cjs` |
| `switchboard/stages.cjs` | 480 | Shared diagnostic stages | `subsystems/terminus/stages.cjs` |
| `switchboard/migrate.cjs` | 130 | Migration harness | `subsystems/terminus/migrate.cjs` |
| `dynamo/migrations/` | -- | Migration scripts | `migrations/` (Terminus-managed, top-level) |
| `ledger/graphiti/` | -- | Docker infrastructure | `graphiti/` (referenced by Terminus, stays top-level) |

#### Target Directory Layout

```
subsystems/terminus/
  mcp-client.cjs          # MCPClient class -- JSON-RPC transport
  stack.cjs               # Docker Compose lifecycle (start, stop, health wait)
  health-check.cjs        # 6-stage health check orchestrator
  diagnose.cjs            # 13-stage diagnostic orchestrator
  verify-memory.cjs       # End-to-end pipeline verification
  stages.cjs              # Shared diagnostic stage definitions
  migrate.cjs             # Migration harness (discover, filter, execute)

migrations/               # Migration scripts (Terminus-managed)
  001-initial.cjs         # Example migration script
  002-scope-refactor.cjs  # Example migration script

graphiti/                 # Docker infrastructure (referenced by Terminus)
  docker-compose.yml      # Graphiti + Neo4j service definitions
  config.yaml             # Graphiti configuration
  .env                    # API keys (never committed)
  start-graphiti.sh       # Legacy convenience script
  stop-graphiti.sh        # Legacy convenience script
```

### 3.2 State Management

Terminus is stateless by design. It does not maintain persistent application state. The only state-adjacent concerns are:

- **Connection state:** The MCPClient manages a connection URL and pending request tracking. This is transient runtime state, not persisted.
- **Docker container state:** The Docker engine manages container state. Terminus queries it but does not duplicate it.
- **Migration state:** The VERSION file (shared resource managed by Dynamo) determines which migrations have been applied. Terminus reads VERSION but does not own it.

### 3.3 Configuration Surface

Terminus reads configuration from `config.json` (managed by Dynamo's shared substrate):

```javascript
{
  "graphiti": {
    "mcp_url": "http://localhost:8100",     // Graphiti MCP server URL
    "health_url": "http://localhost:8100",   // Health check URL (typically same as mcp_url)
    "docker_compose_path": "~/.claude/graphiti/docker-compose.yml"
  },
  "timeouts": {
    "mcp_request": 30000,        // MCP request timeout (ms)
    "health_check": 10000,       // Health check stage timeout (ms)
    "stack_start": 120000,       // Docker stack start timeout (ms)
    "stack_health_poll": 5000,   // Health poll interval during start (ms)
    "migration": 60000           // Per-migration timeout (ms)
  }
}
```

Terminus does not write configuration. Configuration changes flow through Dynamo's config management or through Switchboard's install/update lifecycle.

---

## 4. Interfaces

### 4.1 Inbound Interfaces (Who Calls Terminus)

#### From Ledger (Data Construction)

```javascript
// Ledger calls Terminus MCP client to write episodes
const { MCPClient } = require('../terminus/mcp-client');
const client = new MCPClient(config);

// Write an episode to the knowledge graph
await client.request('add_episode', {
  name: episodeName,
  body: episodeBody,
  source: 'dynamo',
  source_description: scopeDescription,
  reference_time: new Date().toISOString()
});
```

#### From Assay (Data Access)

```javascript
// Assay calls Terminus MCP client to read data
const { MCPClient } = require('../terminus/mcp-client');
const client = new MCPClient(config);

// Search the knowledge graph
const results = await client.request('search', {
  query: searchQuery,
  num_results: 10
});

// Get entity details
const entity = await client.request('get_entity', {
  uuid: entityUuid
});

// Get edge/relationship details
const edge = await client.request('get_edge', {
  uuid: edgeUuid
});
```

#### From Switchboard (Lifecycle Operations)

```javascript
// Switchboard calls Terminus for stack lifecycle during install
const { startStack, stopStack } = require('../terminus/stack');

await startStack({ composePath, healthUrl, timeout });
await stopStack({ composePath });

// Switchboard calls health check during install verification
const { runHealthCheck } = require('../terminus/health-check');
const results = await runHealthCheck({ config });
```

#### From Dynamo (CLI Commands)

```javascript
// Dynamo routes CLI commands to Terminus functions
const { runHealthCheck } = require('./subsystems/terminus/health-check');
const { runDiagnostics } = require('./subsystems/terminus/diagnose');
const { runVerifyMemory } = require('./subsystems/terminus/verify-memory');
const { runMigrations } = require('./subsystems/terminus/migrate');

// CLI: dynamo health-check
case 'health-check': return runHealthCheck({ config, output });

// CLI: dynamo diagnose
case 'diagnose': return runDiagnostics({ config, output });

// CLI: dynamo verify-memory
case 'verify-memory': return runVerifyMemory({ config, output });

// CLI: dynamo start
case 'start': return startStack({ composePath, healthUrl, timeout, output });

// CLI: dynamo stop
case 'stop': return stopStack({ composePath, output });
```

### 4.2 Outbound Interfaces (What Terminus Calls)

#### Graphiti MCP Server (JSON-RPC over HTTP)

All knowledge graph operations flow through the Graphiti MCP server using the JSON-RPC 2.0 protocol over HTTP with SSE response streaming.

**Request format:**

```javascript
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "tools/call",
  "params": {
    "name": "add_episode",  // or "search", "get_entity", etc.
    "arguments": { /* tool-specific parameters */ }
  }
}
```

**Response format (SSE):**

```
event: message
data: {"jsonrpc":"2.0","id":"unique-request-id","result":{"content":[{"type":"text","text":"..."}]}}
```

**Available MCP tools (subset relevant to Terminus transport):**

| Tool | Direction | Called By |
|------|-----------|----------|
| `add_episode` | Write | Ledger (via Terminus) |
| `search` | Read | Assay (via Terminus) |
| `get_entity` | Read | Assay (via Terminus) |
| `get_entity_edge` | Read | Assay (via Terminus) |
| `delete_episode` | Write | Ledger (via Terminus) |
| `delete_entity_edge` | Write | Ledger (via Terminus) |
| `clear_data` | Write | Ledger (via Terminus) |
| `get_episodes` | Read | Assay (via Terminus) |

#### Docker Engine (CLI)

```javascript
// Stack start
const { execSync } = require('child_process');
execSync(`docker compose -f ${composePath} up -d`, { stdio: 'pipe' });

// Stack stop
execSync(`docker compose -f ${composePath} down`, { stdio: 'pipe' });

// Container status
const output = execSync('docker ps --format json', { stdio: 'pipe' });
```

### 4.3 Data Contracts

#### MCP Request/Response Schema

Terminus does not define its own data schema for graph operations. It passes through the Graphiti MCP protocol's schemas, which are defined by the Graphiti server. Terminus's responsibility is faithful transport: serialize the request, send it, parse the response, return it to the caller.

**Terminus adds the following transport-level concerns:**

```javascript
// Transport envelope (internal to Terminus)
{
  request_id: String,       // UUID for correlation
  method: String,           // MCP tool name
  params: Object,           // Tool arguments (pass-through from caller)
  timeout: Number,          // Operation-specific timeout
  sent_at: String,          // ISO timestamp
  response: Object | null,  // Parsed response (after completion)
  error: Object | null,     // Error details (if failed)
  duration_ms: Number       // Request duration (for monitoring)
}
```

#### Health Check Stage Result

```javascript
// Standard stage result format (used by health check and diagnostics)
{
  name: String,           // Stage name (e.g., "Docker daemon")
  status: 'PASS' | 'FAIL' | 'SKIP',
  detail: String,         // Human-readable explanation
  duration_ms: Number     // Stage execution time
}
```

#### Migration Script Interface

```javascript
// Each migration script exports:
module.exports = {
  version: '1.2.1',         // Target version this migration brings the system to
  description: String,       // Human-readable description
  up: async (config) => {},  // Forward migration
  down: async (config) => {} // Rollback (optional)
};
```

---

## 5. Implementation Detail

### 5.1 MCPClient Class

The MCPClient is the core transport component. It manages JSON-RPC communication with the Graphiti MCP server over HTTP with SSE response parsing.

**Current implementation (ledger/mcp-client.cjs, 115 LOC):**

```javascript
class MCPClient {
  constructor(config) {
    this.url = config.graphiti?.mcp_url || 'http://localhost:8100';
    this.timeout = config.timeouts?.mcp_request || 30000;
  }

  // Send a JSON-RPC request and parse the SSE response
  async request(toolName, args) {
    const requestId = crypto.randomUUID();
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/call',
      params: { name: toolName, arguments: args }
    });

    // HTTP POST with SSE response parsing
    // Timeout enforcement
    // Error extraction and re-throwing
    // Response content parsing
  }
}
```

**Key behaviors:**

1. **Connection lifecycle:** Stateless per-request HTTP. No persistent connections. Each `request()` call is independent.
2. **SSE parsing:** Responses arrive as Server-Sent Events. The client collects `data:` lines, parses the JSON-RPC envelope, and extracts the content.
3. **Timeout handling:** `AbortController` with configurable timeout. Request is aborted if the response does not complete within the timeout.
4. **Error handling:** JSON-RPC errors (in `response.error`) are extracted and re-thrown as standard Error objects. Network errors (connection refused, timeout) are caught and reported with context.

**Post-migration changes:** The MCPClient class moves from `ledger/mcp-client.cjs` to `subsystems/terminus/mcp-client.cjs`. The class interface does not change. Import paths in Ledger and Assay consumers update to point to the new location.

### 5.2 Stack Management

Docker stack lifecycle management for the Graphiti MCP server and Neo4j database.

**Current implementation (switchboard/stack.cjs, 212 LOC):**

**`startStack(options)`:**
1. Resolve Docker Compose file path
2. Execute `docker compose up -d`
3. Enter health poll loop:
   - Poll health endpoint every `stack_health_poll` interval
   - Timeout after `stack_start` timeout
   - Report progress to output
4. Return success or timeout error

**`stopStack(options)`:**
1. Resolve Docker Compose file path
2. Execute `docker compose down`
3. Wait for containers to stop
4. Return success

**Key behaviors:**

- Health wait uses exponential backoff with jitter to avoid thundering herd
- Compose path resolution supports both repo and deployed layouts (dual-path resolution pattern used throughout Dynamo)
- Output reporting is optional (accepts output function or stays silent)

### 5.3 Health Check

Six-stage health check providing a quick system health assessment.

**Current implementation (switchboard/health-check.cjs, 120 LOC):**

**Stage sequence:**

| # | Stage | What It Checks | PASS Criteria |
|---|-------|---------------|---------------|
| 1 | Docker daemon | Docker engine is running | `docker ps` succeeds |
| 2 | Neo4j | Neo4j is accessible | Bolt protocol connection succeeds |
| 3 | Graphiti API | MCP server responds | HTTP health endpoint returns 200 |
| 4 | MCP protocol | JSON-RPC works | A test MCP request returns valid JSON-RPC response |
| 5 | Environment | Required env vars present | `.env` file exists with required keys |
| 6 | Canary | Full write/read cycle | Write a test episode, read it back, verify content, delete it |

**Orchestration:**
- Stages execute sequentially (later stages depend on earlier ones)
- Failure in stage 1-2 skips stages 3-6 (no point checking MCP if Docker is down)
- Each stage has its own timeout
- Results are collected and reported in a summary table

### 5.4 Diagnostics

Thirteen-stage deep system inspection. A superset of health check that adds container-level, configuration, and log analysis.

**Current implementation (switchboard/diagnose.cjs, 170 LOC):**

**Additional stages beyond health check:**

| # | Stage | What It Checks |
|---|-------|---------------|
| 7 | Container status | Running/stopped state of each container |
| 8 | Container logs | Recent error entries in container logs |
| 9 | Port bindings | Expected ports (7475, 7687, 8100) are bound |
| 10 | Config consistency | `config.json` matches `.env` values |
| 11 | Deployed files | All expected files exist in `~/.claude/dynamo/` |
| 12 | Settings hooks | Hook definitions present in `~/.claude/settings.json` |
| 13 | MCP registration | Graphiti MCP server registered in Claude Code |

**Orchestration:**
- Same stage interface as health check
- Stages 7-13 can run even if some health check stages fail
- Produces a comprehensive diagnostic report

### 5.5 Pipeline Verification

End-to-end memory pipeline testing.

**Current implementation (switchboard/verify-memory.cjs, 330 LOC):**

**Verification stages:**

| # | Stage | What It Tests |
|---|-------|--------------|
| 1 | Write | Create a test episode via MCP client |
| 2 | Read | Search for the test episode and verify content matches |
| 3 | Scope isolation | Verify episodes in one scope are not visible in another |
| 4 | Sessions | Create, list, and view session records |
| 5 | Delete | Remove test data created by verification |
| 6 | Round-trip | End-to-end write-search-verify cycle with production-like data |

**Key behaviors:**
- Creates test data with a recognizable prefix (e.g., `__verify__`) for cleanup
- Each stage is independent -- failure in one does not prevent others from running
- Cleanup runs regardless of stage results (test data never persists)
- Reports per-stage results plus overall pass/fail

### 5.6 Migration Harness

Version-aware migration execution system.

**Current implementation (switchboard/migrate.cjs, 130 LOC):**

**`runMigrations(options)`:**
1. Read current VERSION file
2. Read target version (from update or manual specification)
3. Discover migration scripts in `migrations/` directory
4. Filter: include scripts where `sourceVersion >= current` AND `targetVersion <= target`
5. Sort by version (ascending)
6. Execute sequentially:
   - Run `up()` function
   - Record success/failure
   - On failure: stop and report (manual rollback required)
7. Update VERSION file on success

**Key behaviors:**

- Hand-rolled semver comparison (3-component numeric) -- maintains zero-dependency constraint
- Boundary filtering uses `>=` for source and `<=` for target to include both boundary migrations
- Each migration is a CJS module with `up()` and optional `down()` functions
- Migration state is implicit in the VERSION file (no separate migration tracking table)

### 5.7 Shared Diagnostic Stages

Reusable building blocks composed into health check and diagnostic orchestrators.

**Current implementation (switchboard/stages.cjs, 480 LOC):**

**Stage interface:**

```javascript
// Each stage is a function returning a result object
async function checkDocker(options) {
  try {
    execSync('docker ps', { stdio: 'pipe', timeout: options.timeout });
    return { name: 'Docker daemon', status: 'PASS', detail: 'Docker is running' };
  } catch (err) {
    return { name: 'Docker daemon', status: 'FAIL', detail: err.message };
  }
}
```

**Stage catalog:**

| Stage Function | Used By | Description |
|---------------|---------|-------------|
| `checkDocker` | Health, Diag | Docker daemon accessibility |
| `checkNeo4j` | Health, Diag | Neo4j bolt protocol connection |
| `checkGraphitiApi` | Health, Diag | HTTP health endpoint |
| `checkMcpProtocol` | Health, Diag | JSON-RPC round-trip |
| `checkEnvironment` | Health, Diag | Required env vars and .env file |
| `checkCanary` | Health, Diag | Write/read cycle verification |
| `checkContainers` | Diag only | Container status inspection |
| `checkLogs` | Diag only | Container log error analysis |
| `checkPorts` | Diag only | Port binding verification |
| `checkConfig` | Diag only | Config consistency |
| `checkDeployment` | Diag only | Deployed file existence |
| `checkSettings` | Diag only | Settings.json hook definitions |
| `checkMcpRegistration` | Diag only | Claude Code MCP registration |

Each stage accepts an options object for test isolation (configurable paths, timeouts, mock injection points).

---

## 6. Migration Path

### 6.1 Files Moving to Terminus

| Current Location | New Location | Change Type |
|-----------------|-------------|-------------|
| `ledger/mcp-client.cjs` | `subsystems/terminus/mcp-client.cjs` | Move (Ledger -> Terminus) |
| `switchboard/stack.cjs` | `subsystems/terminus/stack.cjs` | Move (Switchboard -> Terminus) |
| `switchboard/health-check.cjs` | `subsystems/terminus/health-check.cjs` | Move (Switchboard -> Terminus) |
| `switchboard/diagnose.cjs` | `subsystems/terminus/diagnose.cjs` | Move (Switchboard -> Terminus) |
| `switchboard/verify-memory.cjs` | `subsystems/terminus/verify-memory.cjs` | Move (Switchboard -> Terminus) |
| `switchboard/stages.cjs` | `subsystems/terminus/stages.cjs` | Move (Switchboard -> Terminus) |
| `switchboard/migrate.cjs` | `subsystems/terminus/migrate.cjs` | Move (Switchboard -> Terminus) |
| `dynamo/migrations/` | `migrations/` | Move (Dynamo -> top-level, Terminus-managed) |

### 6.2 Breaking Changes

**Import path changes for all consumers:**

| Consumer | Old Import | New Import |
|----------|-----------|------------|
| Ledger (episodes.cjs) | `require('../ledger/mcp-client')` | `require('../terminus/mcp-client')` |
| Assay (search.cjs) | `require('../ledger/mcp-client')` | `require('../terminus/mcp-client')` |
| Assay (sessions.cjs) | `require('../ledger/mcp-client')` | `require('../terminus/mcp-client')` |
| Dynamo (dynamo.cjs) | `require('../switchboard/health-check')` | `require('./subsystems/terminus/health-check')` |
| Dynamo (dynamo.cjs) | `require('../switchboard/diagnose')` | `require('./subsystems/terminus/diagnose')` |
| Dynamo (dynamo.cjs) | `require('../switchboard/verify-memory')` | `require('./subsystems/terminus/verify-memory')` |
| Dynamo (dynamo.cjs) | `require('../switchboard/stack')` | `require('./subsystems/terminus/stack')` |
| Switchboard (install.cjs) | `require('./health-check')` | `require('../terminus/health-check')` |
| Switchboard (install.cjs) | `require('./stack')` | `require('../terminus/stack')` |

### 6.3 Backward Compatibility Strategy

During migration, old paths can temporarily re-export from new locations to avoid a big-bang cutover:

```javascript
// ledger/mcp-client.cjs (temporary shim during migration)
// This file has moved to subsystems/terminus/mcp-client.cjs
// This re-export exists for backward compatibility during the v1.3-M1 migration.
module.exports = require('../subsystems/terminus/mcp-client');
```

**Shim removal timeline:** Shims are removed at the end of 1.3-M1 (infrastructure refactor milestone). All consumers must be updated to use new paths before shim removal.

### 6.4 Docker Infrastructure Directory

The `graphiti/` directory containing Docker Compose files, Graphiti configuration, and the `.env` file stays at the top level (not inside `subsystems/terminus/`). Rationale:

1. The `.env` file contains API keys and should remain in a well-known, documented location
2. Docker Compose files are referenced by path from multiple contexts (CLI, install, tests)
3. The Graphiti infrastructure is a peer dependency, not a Terminus internal detail

Terminus references the `graphiti/` directory through configuration (`config.json -> graphiti.docker_compose_path`) rather than by owning the directory.

---

## 7. Open Questions

### 7.1 SQLite Session Index Ownership

The SQLite session index (MGMT-11) stores session metadata for fast lookup without querying the knowledge graph. This is a read-optimized index that accelerates Assay's session queries.

**Question:** Does the SQLite session index belong to Terminus (as data infrastructure) or to Assay (as a data access optimization)?

**Current thinking:** Terminus owns the storage backend and schema management. Assay owns the query interface. This follows the same pattern as the knowledge graph: Terminus provides the transport (MCP client) while Assay provides the query logic (search, session listing). The SQLite index is analogous -- Terminus manages the database file, schema, and migrations, while Assay provides the query functions.

**Recommendation:** Terminus owns the SQLite file, schema, and migration management. Assay owns the query functions that read from it. Ledger (or Reverie) owns the write functions that populate it during session creation.

### 7.2 Graphiti Docker Infrastructure Location

**Question:** Should the `graphiti/` directory move under Terminus or remain as a top-level peer directory?

**Current thinking:** The `graphiti/` directory stays top-level. See Section 6.4 for rationale. Terminus references it through configuration, not by containing it.

### 7.3 Connection Pooling

**Question:** Should the MCPClient maintain a connection pool or persistent connections for performance?

**Current thinking:** No. The current stateless per-request HTTP model is simple, reliable, and within latency budgets. Connection pooling adds complexity (lifecycle management, connection health monitoring, pool sizing) without measurable benefit given the request frequency (5-30 requests per session). Revisit if latency measurements after the Inner Voice deployment show MCP round-trip as a bottleneck.

### 7.4 Health Check Result Persistence

**Question:** Should health check results be persisted (e.g., to a log file or SQLite) for historical tracking?

**Current thinking:** Not in v1.3. Health checks are point-in-time assessments run on demand. If monitoring becomes important (e.g., for debugging intermittent infrastructure issues), a lightweight health history log could be added in a later milestone.

---

## Document References

| Document | Relationship |
|----------|-------------|
| **DYNAMO-PRD.md** | Defines subsystem boundaries. Terminus is the Data Infrastructure Layer in the six-subsystem architecture. |
| **LEDGER-SPEC.md** | Ledger writes through Terminus transport. Defines the write-side interface contract. |
| **ASSAY-SPEC.md** | Assay reads through Terminus transport. Defines the read-side interface contract. |
| **SWITCHBOARD-SPEC.md** | Switchboard calls Terminus for stack lifecycle during install. Defines the lifecycle interface. |
| **REVERIE-SPEC.md** | Reverie uses Terminus transport (via Ledger and Assay) for knowledge graph operations. |
| **LEDGER-CORTEX-ANALYSIS.md** | Infrastructure Agent verdict: NO-GO as LLM agent, build as deterministic CJS tooling. Terminus IS the deterministic tooling. |

---

*Specification date: 2026-03-19*
*Subsystem: Terminus (Data Infrastructure Layer)*
*Boundary: Transport, stack, health, diagnostics, migrations -- stateless infrastructure*
*Migration source: ledger/mcp-client.cjs + switchboard/{stack,health-check,diagnose,verify-memory,stages,migrate}.cjs*
