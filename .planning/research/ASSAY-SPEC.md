# Assay: Data Access Layer Specification

**Status:** Subsystem specification
**Date:** 2026-03-19
**Subsystem:** Assay (Data Access)
**Architecture reference:** DYNAMO-PRD.md (Section 3 -- Subsystem Overview)
**Transport dependency:** Terminus (all graph reads go through Terminus MCP client)

---

## 1. Executive Summary

Assay is a new subsystem created by splitting read operations out of Ledger. It is the Data Access Layer of the Dynamo six-subsystem architecture -- the read-side counterpart to Ledger's write-side. Assay owns all data retrieval: knowledge graph queries (combined search, fact search, node search), session management (listing, viewing, labeling, backfilling), and entity inspection (edge detail, node detail).

Assay does not exist in the current codebase as a named subsystem. Its functions currently live in `ledger/search.cjs` and `ledger/sessions.cjs`. The creation of Assay is the most visible architectural change in the Ledger-to-six-subsystem migration: what was a single broad subsystem (Ledger = all memory operations) becomes two focused subsystems (Ledger = write, Assay = read) with a clean directional boundary between them.

### Why Assay Exists

The read/write split is not organizational aesthetics. It enforces a critical architectural constraint: **the subsystem that reads data must never modify it, and the subsystem that writes data must never query it.** This constraint exists because the Inner Voice (Reverie) reads through Assay and writes through Ledger. If a single subsystem owned both operations, the boundary between "deciding what to read" (Reverie's job) and "executing the read" (Assay's job) would blur, creating coupling between cognitive processing and data access logic.

The constraint also enables independent evolution. Assay can optimize read performance (caching, indexing, SQLite session index) without affecting write operations. Ledger can evolve its write formatting without touching query logic. Each subsystem has a single axis of change.

### Key Characteristics

| Property | Value |
|----------|-------|
| **Primary function** | Data access -- querying the knowledge graph and session index |
| **Read mechanism** | All graph reads go through Terminus MCP client (`callTool` for search_memory_facts, search_nodes, etc.) |
| **Write operations** | None to the knowledge graph. Session index writes (indexSession, labelSession) are local file I/O. |
| **State management** | Manages the session index (`sessions.json`) -- a local flat file (migrating to SQLite in MGMT-11) |
| **Current LOC** | ~320 across 2 files (`search.cjs` ~68 LOC, `sessions.cjs` ~250 LOC) |
| **Target LOC** | ~350-400 across 2-3 files (search, sessions, entity-inspect) |
| **Origin** | Split from Ledger (`ledger/search.cjs`, `ledger/sessions.cjs`) |

---

## 2. Responsibilities and Boundaries

### 2.1 What Assay Owns

| Responsibility | Description | Current File | Target File |
|---------------|-------------|-------------|-------------|
| **Combined search** | `combinedSearch(query, groupId, options)` -- parallel fact + node search | `ledger/search.cjs` | `subsystems/assay/search.cjs` |
| **Fact search** | `searchFacts(query, groupId, options)` -- relationship search | `ledger/search.cjs` | `subsystems/assay/search.cjs` |
| **Node search** | `searchNodes(query, groupId, options)` -- entity search | `ledger/search.cjs` | `subsystems/assay/search.cjs` |
| **Session listing** | `listSessions(options)` -- filtered, sorted, limited session index queries | `ledger/sessions.cjs` | `subsystems/assay/sessions.cjs` |
| **Session viewing** | `viewSession(timestamp, options)` -- single session entry retrieval | `ledger/sessions.cjs` | `subsystems/assay/sessions.cjs` |
| **Session labeling** | `labelSession(timestamp, label, options)` -- user-applied session labels | `ledger/sessions.cjs` | `subsystems/assay/sessions.cjs` |
| **Session backfill** | `backfillSessions(nameGenerator, options)` -- batch naming of unlabeled sessions | `ledger/sessions.cjs` | `subsystems/assay/sessions.cjs` |
| **Session indexing** | `indexSession(timestamp, project, label, labeledBy, options)` -- add/update session entries | `ledger/sessions.cjs` | `subsystems/assay/sessions.cjs` |
| **Session I/O** | `loadSessions(filePath)`, `saveSessions(sessions, filePath)` -- raw session file operations | `ledger/sessions.cjs` | `subsystems/assay/sessions.cjs` |
| **Session name generation coordination** | `generateAndApplyName(timestamp, project, nameGenerator, namedPhase, options)` | `ledger/sessions.cjs` | `subsystems/assay/sessions.cjs` |
| **Entity/edge inspection** | Edge detail retrieval by UUID (new in v1.3) | Not yet implemented | `subsystems/assay/inspect.cjs` |

### 2.2 What Assay Does NOT Own

| Responsibility | Owning Subsystem | Rationale |
|---------------|-----------------|-----------|
| Writing episodes to the knowledge graph | **Ledger** | Graph writes are construction, not access |
| MCP transport (JSON-RPC client) | **Terminus** | Infrastructure -- the transport pipe is not access logic |
| Intelligent curation (LLM-powered formatting) | **Reverie** | Cognitive processing -- formatting for injection is Reverie's domain |
| Session summarization (LLM synthesis) | **Reverie** | Cognitive processing at session boundaries |
| Hook dispatching | **Switchboard** | Event routing is dispatcher logic |
| Cognitive processing (what to read, when to read) | **Reverie** | The intelligence of "what knowledge is needed" is Reverie's domain |

### 2.3 The Session Write Boundary Question

Assay is described as a "pure read layer," but several session operations involve writes:

| Operation | Read or Write? | Target Data Store | Recommendation |
|-----------|---------------|-------------------|----------------|
| `listSessions` | Read | `sessions.json` (local file) | Assay |
| `viewSession` | Read | `sessions.json` | Assay |
| `indexSession` | Write | `sessions.json` (local file) | **Assay** (domain cohesion) |
| `labelSession` | Write | `sessions.json` | **Assay** (domain cohesion) |
| `saveSessions` | Write | `sessions.json` | **Assay** (internal to session management) |
| `backfillSessions` | Read + Write | `sessions.json` | **Assay** (batch naming is session domain) |

**Resolution:** Assay never writes to the knowledge graph (that is exclusively Ledger's domain via Terminus transport). However, Assay does write to the local session index (`sessions.json`) because the session index is Assay's managed data store. The boundary rule is more precisely stated as: **Assay never writes to the knowledge graph.** The local session index is Assay's own infrastructure, analogous to Reverie owning its own state files.

This distinction matters: `sessions.json` is a local index file, not the knowledge graph. Ledger writes session episodes to the knowledge graph (via Terminus). Assay manages the session index (local file I/O). Two different data stores, two different subsystems.

### 2.4 Boundary Rules

1. **Assay never writes to the knowledge graph.** All knowledge graph modifications go through Ledger. Assay reads, Ledger writes.
2. **Assay reads through Terminus.** All knowledge graph queries call Terminus transport functions. Assay never directly constructs MCP requests.
3. **Assay owns the session index.** The `sessions.json` file (and its future SQLite replacement) is Assay's managed data store. Both reads and writes to this local store are Assay operations.
4. **Assay does not decide relevance.** What to search for, how to rank results for injection, and whether results are worth surfacing are Reverie's decisions. Assay executes the query and returns raw results.
5. **Assay does not import from Ledger.** There is no read-side dependency on write-side logic. The two subsystems communicate only through their shared transport layer (Terminus).

---

## 3. Architecture

### 3.1 Module Structure

```
subsystems/assay/
  search.cjs            # Knowledge graph queries: combinedSearch, searchFacts, searchNodes
  sessions.cjs          # Session index management: CRUD, listing, labeling, backfill
  inspect.cjs           # Entity/edge inspection: getEdge, getEntity (new in v1.3)
```

### 3.2 Module Descriptions

#### search.cjs (Knowledge Graph Queries)

The primary query module. Provides three search functions that query the Graphiti knowledge graph through Terminus MCP transport.

**Current implementation:**

```javascript
// Current: search.cjs imports MCPClient and extractContent directly from Ledger
const { MCPClient } = require(path.join(__dirname, 'mcp-client.cjs'));
const { extractContent } = require(path.join(__dirname, 'episodes.cjs'));

async function searchFacts(query, groupId, options = {}) {
  const client = new MCPClient(options);
  const response = await client.callTool('search_memory_facts', {
    query,
    group_id: groupId,
    max_facts: options.maxFacts || 10
  });
  return extractContent(response);
}

async function searchNodes(query, groupId, options = {}) {
  const client = new MCPClient(options);
  const response = await client.callTool('search_nodes', {
    query,
    group_id: groupId,
    max_nodes: options.maxNodes || 5
  });
  return extractContent(response);
}

async function combinedSearch(query, groupId, options = {}) {
  const [facts, nodes] = await Promise.all([
    searchFacts(query, groupId, options),
    searchNodes(query, groupId, options)
  ]);
  if (!facts && !nodes) return '';
  return '## Facts\n' + facts + '\n\n## Entities\n' + nodes;
}
```

**Target implementation:**

```javascript
// Target: search.cjs imports transport from Terminus
const terminus = require('../terminus/mcp-client.cjs');
const { extractContent } = require('../../lib/transport-utils.cjs');

async function searchFacts(query, groupId, options = {}) {
  const response = await terminus.callTool('search_memory_facts', {
    query,
    group_id: groupId,
    max_facts: options.maxFacts || 10
  }, options);
  return extractContent(response);
}

async function searchNodes(query, groupId, options = {}) {
  const response = await terminus.callTool('search_nodes', {
    query,
    group_id: groupId,
    max_nodes: options.maxNodes || 5
  }, options);
  return extractContent(response);
}

async function combinedSearch(query, groupId, options = {}) {
  const [facts, nodes] = await Promise.all([
    searchFacts(query, groupId, options),
    searchNodes(query, groupId, options)
  ]);
  if (!facts && !nodes) return '';
  return '## Facts\n' + facts + '\n\n## Entities\n' + nodes;
}

// New: scoped search with format control
async function scopedSearch(query, scope, options = {}) {
  const groupId = buildGroupId(scope);
  const format = options.format || 'combined';

  switch (format) {
    case 'facts': return searchFacts(query, groupId, options);
    case 'nodes': return searchNodes(query, groupId, options);
    case 'combined':
    default: return combinedSearch(query, groupId, options);
  }
}
```

**Function signatures unchanged.** The migration from Ledger to Assay does not change any function signatures. Only import paths change. This is a structural move, not a behavioral change.

#### sessions.cjs (Session Index Management)

The session management module. All functions move from `ledger/sessions.cjs` to `subsystems/assay/sessions.cjs` with no signature changes.

**Current functions (all preserved):**

| Function | Signature | Description |
|----------|-----------|-------------|
| `loadSessions` | `(filePath?) -> Array` | Load session entries from JSON file |
| `saveSessions` | `(sessions, filePath?)` | Atomic write to session JSON file |
| `indexSession` | `(timestamp, project, label, labeledBy, options?)` | Add or update session entry |
| `listSessions` | `(options?) -> Array` | Filtered, sorted, limited session listing |
| `viewSession` | `(timestamp, options?) -> object\|null` | Single session retrieval |
| `labelSession` | `(timestamp, label, options?) -> boolean` | Apply user label to session |
| `backfillSessions` | `(nameGenerator, options?) -> Promise<number>` | Batch naming of unlabeled sessions |
| `generateAndApplyName` | `(timestamp, project, nameGenerator, namedPhase, options?) -> Promise<string>` | Generate name and apply via indexSession |

**Target changes (v1.3-M1 migration):**

- Import path for `logError` changes from `resolveCore()` to `require('../../lib/core.cjs')`
- `SESSIONS_FILE` constant path remains the same (`~/.claude/graphiti/sessions.json`)
- No function signature changes
- No behavioral changes

**Future changes (MGMT-11 -- SQLite session index):**

The `sessions.json` flat file will be replaced by a SQLite database in milestone 1.3-M1 (MGMT-11). The function signatures will remain the same -- the storage backend change is internal to Assay. Consumers continue calling `listSessions`, `viewSession`, etc. without knowing whether the backing store is JSON or SQLite.

```javascript
// Future: SQLite-backed session queries
// Same interface, different implementation
function listSessions(options = {}) {
  const db = openSessionDB();
  let query = 'SELECT * FROM sessions';
  const params = [];

  if (options.project) {
    query += ' WHERE project = ?';
    params.push(options.project);
  }

  query += ' ORDER BY timestamp DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  return db.prepare(query).all(...params);
}
```

#### inspect.cjs (Entity/Edge Inspection -- New)

A new module for detailed entity and edge retrieval. The current `dynamo edge <uuid>` command maps to this functionality.

```javascript
const terminus = require('../terminus/mcp-client.cjs');
const { extractContent } = require('../../lib/transport-utils.cjs');

/**
 * Retrieve detailed information about a specific edge (relationship).
 * @param {string} uuid - Edge UUID
 * @param {object} [options] - { timeout, hookName }
 * @returns {Promise<string>} - Formatted edge details
 */
async function getEdge(uuid, options = {}) {
  const response = await terminus.callTool('get_edge', {
    uuid
  }, options);
  return extractContent(response);
}

/**
 * Retrieve detailed information about a specific entity node.
 * @param {string} uuid - Entity UUID
 * @param {object} [options] - { timeout, hookName }
 * @returns {Promise<string>} - Formatted entity details
 */
async function getEntity(uuid, options = {}) {
  const response = await terminus.callTool('get_entity', {
    uuid
  }, options);
  return extractContent(response);
}

/**
 * Retrieve recent episodes for recall/review.
 * @param {string} groupId - Scope-based group identifier
 * @param {object} [options] - { limit, timeout, hookName }
 * @returns {Promise<string>} - Formatted episode list
 */
async function getRecentEpisodes(groupId, options = {}) {
  const response = await terminus.callTool('get_episodes', {
    group_id: groupId,
    last_n: options.limit || 10
  }, options);
  return extractContent(response);
}

module.exports = { getEdge, getEntity, getRecentEpisodes };
```

### 3.3 Dependency Graph

```
subsystems/assay/
  search.cjs
    imports -> ../terminus/mcp-client.cjs (Terminus transport)
    imports -> ../../lib/transport-utils.cjs (extractContent)
    imports -> ../../lib/core.cjs (logError)
  sessions.cjs
    imports -> ../../lib/core.cjs (logError)
    imports -> (node:fs, node:path, node:os -- built-ins)
  inspect.cjs
    imports -> ../terminus/mcp-client.cjs (Terminus transport)
    imports -> ../../lib/transport-utils.cjs (extractContent)
```

**Inbound dependencies (who imports Assay):**

| Consumer | What It Imports | Why |
|----------|----------------|-----|
| Reverie (`inner-voice.cjs`) | `combinedSearch`, `searchFacts`, `searchNodes` | Knowledge graph queries for activation map population, entity lookup, session context |
| Reverie (SessionStart handler) | `listSessions`, `viewSession` | Session history retrieval for briefing generation |
| Reverie (Stop handler) | `indexSession`, `generateAndApplyName` | Session indexing and naming at session end |
| Dynamo CLI (`dynamo.cjs`) | `combinedSearch`, `searchFacts`, `searchNodes` | `dynamo search` command |
| Dynamo CLI (`dynamo.cjs`) | `listSessions`, `viewSession`, `labelSession` | `dynamo session list/view/label` commands |
| Dynamo CLI (`dynamo.cjs`) | `getEdge`, `getEntity` | `dynamo edge` command, entity inspection |
| Dynamo CLI (`dynamo.cjs`) | `getRecentEpisodes` | `dynamo recall` command |
| Dynamo CLI (`dynamo.cjs`) | `backfillSessions` | `dynamo session backfill` command |
| `core.cjs` (re-exports) | `loadSessions`, `listSessions` | Backward-compatible re-exports for existing consumers |

**Outbound dependencies (what Assay imports):**

| Module | Subsystem | Why |
|--------|-----------|-----|
| `mcp-client.cjs` | **Terminus** | MCP transport for graph read operations |
| `transport-utils.cjs` | **Dynamo** (`lib/`) | Shared response parsing (extractContent) |
| `core.cjs` | **Dynamo** (`lib/`) | Shared utilities (logError, loadConfig) |

**Note:** Assay does NOT import from Ledger. The two subsystems have no direct dependency. They are connected only through their shared transport layer (Terminus).

### 3.4 Configuration Surface

| Config Key | Location | Default | Description |
|-----------|----------|---------|-------------|
| `search.maxFacts` | `config.json` | `10` | Default maximum facts returned per search |
| `search.maxNodes` | `config.json` | `5` | Default maximum entity nodes returned per search |
| `sessions.filePath` | `config.json` | `~/.claude/graphiti/sessions.json` | Session index file location |
| `sessions.dbPath` | `config.json` | `~/.claude/graphiti/sessions.db` | SQLite session DB location (MGMT-11, future) |

---

## 4. Interfaces

### 4.1 Inbound Interface (Who Calls Assay)

#### From Reverie

Reverie is Assay's primary caller for knowledge graph queries. The Inner Voice queries Assay to populate its activation map, retrieve entity details, and gather session context for briefing generation.

```javascript
// Reverie queries Assay for knowledge graph data
const assay = require('../assay/search.cjs');
const sessions = require('../assay/sessions.cjs');

// UserPromptSubmit: query for entities related to current prompt
async function queryForPrompt(promptText, groupId) {
  const results = await assay.combinedSearch(promptText, groupId, {
    maxFacts: 15,
    maxNodes: 8,
    hookName: 'UserPromptSubmit'
  });
  return results;
}

// SessionStart: retrieve recent session history for briefing
async function getSessionContext(project) {
  const recentSessions = sessions.listSessions({
    project,
    limit: 5
  });
  return recentSessions;
}

// Stop: index the completed session
async function indexCompletedSession(timestamp, project, summaryText) {
  // Generate name and index
  const name = await sessions.generateAndApplyName(
    timestamp,
    project,
    async () => summaryText.slice(0, 50), // simple name generator
    'refined'
  );
  return name;
}
```

#### From Dynamo CLI

The CLI routes search, session, and inspection commands to Assay.

```javascript
// CLI command routing in dynamo.cjs
case 'search':
  const { combinedSearch } = require('./subsystems/assay/search.cjs');
  const results = await combinedSearch(query, groupId, { format: outputFormat });
  output(results, outputFormat);
  break;

case 'session':
  const sessions = require('./subsystems/assay/sessions.cjs');
  switch (subCommand) {
    case 'list':
      const list = sessions.listSessions({ project, limit });
      output(formatSessionList(list), outputFormat);
      break;
    case 'view':
      const entry = sessions.viewSession(sessionId);
      output(formatSessionDetail(entry), outputFormat);
      break;
    case 'label':
      sessions.labelSession(sessionId, labelText);
      output('Session labeled.', outputFormat);
      break;
    case 'backfill':
      const count = await sessions.backfillSessions(nameGenerator);
      output(`Backfilled ${count} sessions.`, outputFormat);
      break;
  }
  break;

case 'edge':
  const { getEdge } = require('./subsystems/assay/inspect.cjs');
  const edgeDetail = await getEdge(uuid);
  output(edgeDetail, outputFormat);
  break;

case 'recall':
  const { getRecentEpisodes } = require('./subsystems/assay/inspect.cjs');
  const episodes = await getRecentEpisodes(groupId, { limit });
  output(episodes, outputFormat);
  break;
```

### 4.2 Outbound Interface (What Assay Calls)

#### To Terminus

All knowledge graph read operations go through Terminus MCP client.

```javascript
// Assay calls Terminus for all graph reads
const terminus = require('../terminus/mcp-client.cjs');

// Search functions call these Terminus/Graphiti tools:
await terminus.callTool('search_memory_facts', { query, group_id, max_facts }, options);
await terminus.callTool('search_nodes', { query, group_id, max_nodes }, options);
await terminus.callTool('get_edge', { uuid }, options);
await terminus.callTool('get_entity', { uuid }, options);
await terminus.callTool('get_episodes', { group_id, last_n }, options);
```

**Contract:** Assay calls `terminus.callTool(toolName, args, options)` and receives a JSON-RPC response. The response is parsed by `extractContent()` to produce human-readable text or JSON output.

### 4.3 Data Contracts

#### Search Request

```javascript
{
  query: string,            // Natural language search query
  groupId: string,          // Graphiti group identifier (scope-based)
  options: {
    maxFacts: number,       // Maximum facts to return (default: 10)
    maxNodes: number,       // Maximum entity nodes to return (default: 5)
    format: string,         // Output format: 'combined' | 'facts' | 'nodes' (default: 'combined')
    hookName: string,       // Source context for logging
    timeout: number         // Override default MCP timeout (optional)
  }
}
```

#### Search Response

```javascript
// Combined search returns formatted text:
"## Facts\n[fact results]\n\n## Entities\n[entity results]"

// Fact-only search returns:
"[fact results as text]"

// Node-only search returns:
"[entity results as text]"

// Empty result:
""
```

#### Session List Response

```javascript
[
  {
    timestamp: "2026-03-19T12:00:00Z",   // ISO-8601 session timestamp
    project: "dynamo",                     // Project name
    label: "Architecture planning",        // Session label (auto or user)
    labeled_by: "auto",                    // 'auto' or 'user'
    named_phase: "refined"                 // 'preliminary' or 'refined' (optional)
  },
  // ... sorted by timestamp descending
]
```

#### Session View Response

```javascript
// Found:
{
  timestamp: "2026-03-19T12:00:00Z",
  project: "dynamo",
  label: "Architecture planning",
  labeled_by: "auto",
  named_phase: "refined"
}

// Not found:
null
```

#### Edge/Entity Inspection Response

```javascript
// Returns formatted text from Graphiti:
"Entity: Tom Kyser\nType: Person\nRelationships: [...]"

// Error or not found:
""
```

---

## 5. Implementation Detail

### 5.1 searchFacts (Fact/Relationship Search)

Queries the knowledge graph for relationships between entities.

**Signature:**

```javascript
async function searchFacts(query, groupId, options = {}) -> string
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | `string` | Yes | Natural language search query |
| `groupId` | `string` | Yes | Graphiti group identifier for scoping |
| `options.maxFacts` | `number` | No | Maximum facts to return (default: 10) |
| `options.hookName` | `string` | No | Source context for error logging |
| `options.timeout` | `number` | No | Override default MCP timeout |

**Behavior:**

1. Call `terminus.callTool('search_memory_facts', { query, group_id: groupId, max_facts })`
2. Parse response with `extractContent(response)`
3. Return text string of matching facts
4. On error: log via `logError`, return empty string

**Error handling:** Never throws. All errors are caught, logged, and result in an empty string return. The calling subsystem (Reverie, CLI) decides how to handle empty results.

### 5.2 searchNodes (Entity Search)

Queries the knowledge graph for entity nodes.

**Signature:**

```javascript
async function searchNodes(query, groupId, options = {}) -> string
```

**Parameters:** Same pattern as `searchFacts`, with `options.maxNodes` (default: 5) instead of `maxFacts`.

**Behavior:** Same pattern as `searchFacts`, calling `terminus.callTool('search_nodes', ...)`.

### 5.3 combinedSearch (Parallel Fact + Node Search)

Executes fact and node searches in parallel and combines results.

**Signature:**

```javascript
async function combinedSearch(query, groupId, options = {}) -> string
```

**Behavior:**

1. Run `searchFacts` and `searchNodes` in parallel via `Promise.all`
2. If both return empty, return empty string
3. Combine results: `## Facts\n[facts]\n\n## Entities\n[nodes]`

**Performance:** Parallel execution ensures the combined search is not slower than the slower of the two individual searches. Typical latency: 200-500ms (dominated by Graphiti query time, not transport).

### 5.4 Session Management Functions

All session functions are direct migrations from `ledger/sessions.cjs` with no behavioral changes. Function-by-function detail:

#### loadSessions

```javascript
function loadSessions(filePath?) -> Array
```

Reads `sessions.json` from disk. Returns empty array if file is missing, corrupt, or non-array. Pure file I/O, no error propagation.

#### saveSessions

```javascript
function saveSessions(sessions, filePath?)
```

Atomic write: writes to `.tmp` file, then renames. Creates parent directory if needed. This atomic pattern prevents corruption from interrupted writes.

#### indexSession

```javascript
function indexSession(timestamp, project, label, labeledBy, options?)
```

Add or update a session entry. Key contract: **never overwrites entries where `labeled_by` is `'user'`**. This protects user-applied labels from being overwritten by auto-generated names.

#### listSessions

```javascript
function listSessions(options?) -> Array
```

Returns session entries sorted by timestamp descending (newest first). Supports filtering by project and limiting result count.

#### viewSession

```javascript
function viewSession(timestamp, options?) -> object|null
```

Returns a single session entry by timestamp, or null if not found.

#### labelSession

```javascript
function labelSession(timestamp, label, options?) -> boolean
```

Applies a user label to a session entry. Sets `labeled_by` to `'user'`. Returns false if the session timestamp is not found.

#### backfillSessions

```javascript
async function backfillSessions(nameGenerator, options?) -> Promise<number>
```

Finds all session entries with no label (and not labeled by user), generates names using the provided async callback, and applies them. Returns count of backfilled entries. The `nameGenerator` function is provided by the caller (currently Reverie, which calls an LLM for name generation).

#### generateAndApplyName

```javascript
async function generateAndApplyName(timestamp, project, nameGenerator, namedPhase, options?) -> Promise<string>
```

Combines name generation and session indexing. The `namedPhase` parameter tracks whether the name is `'preliminary'` (generated during session) or `'refined'` (generated at session end with full context).

### 5.5 Entity/Edge Inspection (New)

#### getEdge

```javascript
async function getEdge(uuid, options?) -> string
```

Retrieves detailed information about a specific edge (relationship) by UUID. Maps to the `dynamo edge <uuid>` CLI command.

#### getEntity

```javascript
async function getEntity(uuid, options?) -> string
```

Retrieves detailed information about a specific entity node by UUID.

#### getRecentEpisodes

```javascript
async function getRecentEpisodes(groupId, options?) -> string
```

Retrieves recent episodes for a given scope. Maps to the `dynamo recall` CLI command.

---

## 6. Migration Path

### 6.1 File Movement Summary

| Current File | Target Destination | Action |
|-------------|-------------------|--------|
| `ledger/search.cjs` | `subsystems/assay/search.cjs` | Direct move; update import for MCP client (Terminus) and extractContent |
| `ledger/sessions.cjs` | `subsystems/assay/sessions.cjs` | Direct move; update import for core.cjs |
| (new) | `subsystems/assay/inspect.cjs` | New file; entity/edge inspection functions |

### 6.2 Import Path Updates

All consumers of `search.cjs` and `sessions.cjs` must update their import paths:

| Consumer | Current Import | New Import |
|----------|---------------|------------|
| `dynamo.cjs` (search command) | `require('./ledger/search')` | `require('./subsystems/assay/search')` |
| `dynamo.cjs` (session commands) | `require('./ledger/sessions')` via core.cjs re-export | `require('./subsystems/assay/sessions')` |
| `core.cjs` (re-exports) | `require('./ledger/sessions')` for loadSessions/listSessions | `require('./subsystems/assay/sessions')` |
| Hook handlers (SessionStart) | `require('../ledger/search')` | `require('../subsystems/assay/search')` |
| Hook handlers (Stop) | `require('../ledger/sessions')` | `require('../subsystems/assay/sessions')` |

### 6.3 search.cjs Internal Import Changes

The most significant internal change is the MCP client import:

```javascript
// Current (inside ledger/):
const { MCPClient } = require(path.join(__dirname, 'mcp-client.cjs'));
const { extractContent } = require(path.join(__dirname, 'episodes.cjs'));

// Target (inside subsystems/assay/):
const terminus = require('../terminus/mcp-client.cjs');
const { extractContent } = require('../../lib/transport-utils.cjs');
```

**Key change:** `search.cjs` no longer imports from Ledger (`episodes.cjs` for `extractContent`). The `extractContent` utility moves to a shared location (`lib/transport-utils.cjs`) so both Assay and Ledger can use it without cross-subsystem imports.

### 6.4 sessions.cjs Internal Changes

Minimal internal changes:

```javascript
// Current:
function resolveCore() {
  const deployed = path.join(__dirname, '..', 'core.cjs');
  if (fs.existsSync(deployed)) return deployed;
  return path.join(__dirname, '..', 'dynamo', 'core.cjs');
}
const { logError } = require(resolveCore());

// Target:
const { logError } = require('../../lib/core.cjs');
```

The `resolveCore()` dual-layout pattern is replaced by a direct import path since the target directory structure is standardized.

### 6.5 Backward Compatibility

During migration, old import paths are maintained as thin re-export shims:

```javascript
// ledger/search.cjs (shim during migration)
'use strict';
// Deprecated: import from subsystems/assay/search.cjs instead
module.exports = require('../subsystems/assay/search.cjs');

// ledger/sessions.cjs (shim during migration)
'use strict';
// Deprecated: import from subsystems/assay/sessions.cjs instead
module.exports = require('../subsystems/assay/sessions.cjs');
```

These shims are removed at the end of 1.3-M1 after all consumers have been updated.

### 6.6 core.cjs Re-export Updates

`core.cjs` currently re-exports `loadSessions` and `listSessions` from `ledger/sessions.cjs`. These re-exports update their source to Assay:

```javascript
// Current core.cjs:
Object.assign(module.exports, require('./ledger/sessions.cjs'));

// Target core.cjs:
Object.assign(module.exports, require('./subsystems/assay/sessions.cjs'));
```

The re-exports are maintained for backward compatibility during migration but should eventually be removed as consumers are updated to import directly from Assay.

### 6.7 Breaking Changes

| Change | Impact | Mitigation |
|--------|--------|------------|
| `ledger/search.cjs` moves | All search consumers must update imports | Re-export shim at old path |
| `ledger/sessions.cjs` moves | All session consumers must update imports | Re-export shim at old path |
| `extractContent` import source changes | `search.cjs` no longer imports from `episodes.cjs` | Moved to shared `lib/transport-utils.cjs` |
| `resolveCore()` pattern removed | Module-internal change only; no external impact | Direct import paths in standardized layout |

---

## 7. Open Questions

### 7.1 Session Creation Ownership

**Question:** Session creation (the `indexSession` call during the Stop hook) -- is this an Assay operation or a Ledger operation?

**Current thinking:** Assay owns the session index as its managed data store. Session creation via `indexSession` writes to `sessions.json` (local file), not to the knowledge graph. Domain cohesion argues for keeping all session operations together in Assay.

**Resolution:** Assay owns `indexSession`. The Reverie Stop handler calls Assay to index the session AND calls Ledger to write the session episode to the knowledge graph. Two different writes to two different stores, routed to two different subsystems.

### 7.2 Session Labeling and Backfill Write Operations

**Question:** Session labeling (`labelSession`) and backfill (`backfillSessions`) involve writes. Should these move to Ledger for write-boundary purity?

**Current thinking:** No. These write to the local session index, not to the knowledge graph. The write-boundary rule is specifically about the knowledge graph: "Assay never writes to the knowledge graph." Local data stores that Assay manages are Assay's own infrastructure.

**Resolution:** Assay retains session labeling and backfill. The boundary rule is "Assay never writes to the knowledge graph via Terminus." Local session index writes are Assay's internal operations.

### 7.3 SQLite Session Index Ownership (MGMT-11)

**Question:** Does Assay own the SQLite session index (MGMT-11) since it manages session queries?

**Current thinking:** Yes. The SQLite session index replaces `sessions.json` as Assay's managed data store. The migration from flat file to SQLite is internal to Assay -- the function signatures do not change, only the backing store. This is a clean separation: Assay manages session metadata (who, when, what label), while the knowledge graph (via Terminus/Ledger) stores session content (summaries, episodes).

**Resolution:** Assay owns the SQLite session index. MGMT-11 is an Assay internal improvement.

### 7.4 extractContent Shared Utility

**Question:** Where should `extractContent` live? Currently in `ledger/episodes.cjs`, imported by `ledger/search.cjs`.

**Current thinking:** `extractContent` is a transport response parser used by both Ledger (parsing write confirmations) and Assay (parsing search results). It belongs in a shared location. Three options:

1. `lib/transport-utils.cjs` (shared utility in Dynamo's lib) -- **Recommended**
2. `subsystems/terminus/utils.cjs` (Terminus utility module)
3. Keep in Ledger, Assay imports from Ledger -- **Not recommended** (creates cross-subsystem dependency)

**Resolution:** Move to `lib/transport-utils.cjs` during 1.3-M1 migration. Both Ledger and Assay import from the shared location.

### 7.5 Search Result Caching

**Question:** Should Assay implement search result caching for the hot path?

**Current thinking:** Caching is valuable for the Inner Voice hot path (Reverie), where the same entities may be queried multiple times within a processing cycle. However, cache management (invalidation on writes, TTL, scope-based partitioning) adds complexity.

**Recommendation:** Defer caching to 1.3-M2 (Core Intelligence). Assay provides the query interface; Reverie manages its own activation map (which functions as a processing-side cache). If Assay-level caching proves necessary for hot path latency, it can be added without changing function signatures.

### 7.6 Search Result Formatting vs. Raw Results

**Question:** Should Assay return formatted text (current behavior) or structured data (JSON)?

**Current thinking:** Currently, `searchFacts` and `searchNodes` return formatted text strings (the raw output from Graphiti's MCP response). The CLI displays this directly. Reverie needs to parse it for entity extraction.

**Recommendation:** Maintain current text output as the default. Add a `format: 'json'` option that returns parsed structured data for Reverie's consumption. This is backward-compatible and serves both CLI (text) and Reverie (structured) consumers.

---

## Document References

| Document | Relationship |
|----------|-------------|
| **DYNAMO-PRD.md** | Defines Assay's role in the six-subsystem architecture (Section 3.1, 3.3) |
| **LEDGER-SPEC.md** | Companion spec -- defines the write-side counterpart. Assay never imports from Ledger. |
| **TERMINUS-SPEC.md** | Transport layer spec -- defines the MCP client interface Assay calls for graph reads |
| **REVERIE-SPEC.md** | Inner Voice spec -- Reverie is Assay's primary consumer for knowledge graph queries |
| **INNER-VOICE-SPEC.md** | Existing mechanical spec -- defines processing pipelines that consume Assay query results |

---

*Specification date: 2026-03-19*
*Subsystem: Assay (Data Access Layer)*
*Architecture: Six-subsystem model (Dynamo, Switchboard, Ledger, Assay, Terminus, Reverie)*
*Boundary rule: Assay reads, Ledger writes, Terminus transports, Reverie decides*
*Origin: Split from Ledger -- all read operations extracted to new subsystem*
