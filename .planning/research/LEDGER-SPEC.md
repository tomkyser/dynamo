# Ledger: Data Construction Layer Specification

**Status:** Subsystem specification
**Date:** 2026-03-19
**Subsystem:** Ledger (Data Construction)
**Architecture reference:** DYNAMO-PRD.md (Section 3 -- Subsystem Overview)
**Transport dependency:** Terminus (all graph writes go through Terminus MCP client)

---

## 1. Executive Summary

Ledger is the Data Construction Layer of the Dynamo six-subsystem architecture. Its sole responsibility is creating, shaping, and writing data into the knowledge graph. In the current codebase (v1.2.1), Ledger is a broad subsystem that owns all memory operations -- search, episodes, curation, sessions, hooks, and MCP transport. In the target architecture, Ledger narrows dramatically: search and sessions move to Assay, the MCP client moves to Terminus, hook dispatching moves to Switchboard, intelligent curation moves to Reverie, and shared utilities move to `lib/`.

What remains is Ledger's core identity: the write side. Ledger owns the functions that create knowledge graph episodes, the PostToolUse capture handler that decides what to extract from file changes, and the minimal write-side formatting that shapes data before it enters the graph. Ledger never reads the knowledge graph for its own purposes -- that is Assay's job. Ledger never decides when or why to write -- that is Reverie's or Switchboard's job. Ledger is the construction crew: it builds what it is told to build, where it is told to build it.

### Key Characteristics

| Property | Value |
|----------|-------|
| **Primary function** | Data construction -- creating and writing knowledge graph episodes |
| **Write mechanism** | All writes go through Terminus MCP client (`addEpisode` via `callTool('add_memory', ...)`) |
| **Read operations** | None. Ledger does not read the knowledge graph. |
| **State management** | Stateless. Ledger does not maintain persistent state between invocations. |
| **Current LOC** | ~1,043 across 8 files (episodes, curation, search, sessions, scope, mcp-client, hooks/) |
| **Target LOC** | ~120-180 across 2-3 files (episodes, format, capture handler) |
| **Migration impact** | 6 of 8 current files depart; 2-3 remain or are created |

---

## 2. Responsibilities and Boundaries

### 2.1 What Ledger Owns

| Responsibility | Description | Current File | Target File |
|---------------|-------------|-------------|-------------|
| **Episode creation** | `addEpisode(content, groupId, options)` -- creates a Graphiti episode via Terminus MCP transport | `ledger/episodes.cjs` | `subsystems/ledger/episodes.cjs` |
| **Content extraction** | `extractContent(response)` -- extracts text from MCP JSON-RPC responses | `ledger/episodes.cjs` | `subsystems/ledger/episodes.cjs` |
| **Write-side formatting** | Minimal data shaping before write -- structuring content for optimal graph ingestion | Part of `ledger/curation.cjs` | `subsystems/ledger/format.cjs` |
| **PostToolUse capture** | The handler logic that decides WHAT to extract from file changes and calls `addEpisode` | `ledger/hooks/capture-change.cjs` | `subsystems/ledger/capture.cjs` |

### 2.2 What Ledger Does NOT Own

| Responsibility | Owning Subsystem | Rationale |
|---------------|-----------------|-----------|
| Search (combined, fact, node) | **Assay** | Read operation -- Assay owns all data access |
| Session management (list, view, label, backfill) | **Assay** | Read/query operation -- sessions are data access |
| MCP transport (JSON-RPC client) | **Terminus** | Infrastructure -- the transport pipe is not construction |
| Hook dispatching | **Switchboard** | Routing events to handlers is dispatcher logic |
| Intelligent curation (LLM-powered formatting) | **Reverie** | Cognitive processing -- deciding how to shape data for injection |
| Session summarization (`summarizeText`) | **Reverie** | Cognitive processing -- synthesis is Inner Voice territory |
| Session naming (`generateSessionName`) | **Reverie** / **Assay** | Session metadata management |
| Scope constants and validation | **Dynamo** (`lib/scope.cjs`) | Shared utility used by all subsystems |
| Cognitive processing (what to write, when to write) | **Reverie** | The intelligence of "what to curate and how" is cognitive processing |

### 2.3 The Reverie Boundary -- Critical Clarification

The current `ledger/curation.cjs` contains two distinct functions:

1. **LLM-powered intelligent curation** (`curateResults`, `summarizeText`, `generateSessionName`) -- This is cognitive processing. It involves calling an LLM to decide what is relevant, how to format it, and what to surface. This moves to **Reverie**.

2. **Write-side data formatting** -- Structuring content before it enters the knowledge graph (ensuring proper groupId formatting, content sanitization, metadata attachment). This stays with **Ledger** as `format.cjs`.

The dividing line: if an operation requires LLM reasoning to decide what or how, it belongs to Reverie. If an operation is deterministic data shaping (string formatting, schema validation, metadata attachment), it belongs to Ledger.

### 2.4 Boundary Rules

1. **Ledger does NOT read.** All read operations go through Assay. If Ledger needs to check whether an entity exists before writing, it delegates that query to Assay (or Reverie orchestrates the read-then-write sequence).
2. **Ledger does NOT decide.** What to write, when to write, and why to write are decisions made by Reverie (cognitive processing) or Switchboard (event dispatching). Ledger executes the write.
3. **Ledger writes through Terminus.** All graph write operations call Terminus transport functions. Ledger never directly constructs HTTP requests or manages MCP sessions.
4. **Ledger is stateless.** It does not maintain state between invocations. Each write operation is independent. State management (activation maps, self-model, session tracking) belongs to Reverie or Assay.

---

## 3. Architecture

### 3.1 Module Structure

```
subsystems/ledger/
  episodes.cjs          # Core write operations: addEpisode, extractContent
  format.cjs            # Write-side data formatting: content shaping, sanitization
  capture.cjs           # PostToolUse capture handler: extract changes, call addEpisode
```

### 3.2 Module Descriptions

#### episodes.cjs (Core Write Operations)

The primary module. Contains the `addEpisode` function that creates knowledge graph episodes through Terminus transport. This is a thin wrapper that accepts structured content and delegates the MCP `tools/call` to Terminus.

**Current implementation:**

```javascript
// Current: episodes.cjs imports MCPClient directly
const { MCPClient } = require(path.join(__dirname, 'mcp-client.cjs'));

async function addEpisode(content, groupId, options = {}) {
  const client = new MCPClient(options);
  const response = await client.callTool('add_memory', {
    content,
    group_id: groupId
  });
  return response;
}
```

**Target implementation:**

```javascript
// Target: episodes.cjs imports transport from Terminus
const terminus = require('../terminus/mcp-client.cjs');

async function addEpisode(content, groupId, options = {}) {
  const response = await terminus.callTool('add_memory', {
    content,
    group_id: groupId
  }, options);
  return response;
}

// New: structured episode creation with metadata
async function addStructuredEpisode(data) {
  const { content, groupId, metadata, hookName } = data;
  const formatted = formatEpisodeContent(content, metadata);
  return addEpisode(formatted, groupId, { hookName });
}
```

#### format.cjs (Write-Side Formatting)

Handles deterministic data shaping before write. This is NOT LLM curation -- it is structural formatting.

**Responsibilities:**

- Content sanitization (removing sensitive data patterns, truncating oversized content)
- Metadata attachment (timestamp, source hook, content type)
- GroupId construction (combining scope components into a valid Graphiti group_id)
- Episode content structuring (wrapping raw content with contextual metadata)

```javascript
/**
 * Format episode content for graph ingestion.
 * Deterministic -- no LLM calls.
 */
function formatEpisodeContent(content, metadata = {}) {
  const parts = [];

  if (metadata.source) {
    parts.push(`[Source: ${metadata.source}]`);
  }
  if (metadata.timestamp) {
    parts.push(`[Time: ${metadata.timestamp}]`);
  }

  parts.push(content);

  return parts.join('\n');
}

/**
 * Build a Graphiti group_id from scope components.
 */
function buildGroupId(scope) {
  // scope: { type: 'project', name: 'dynamo' } -> 'project-dynamo'
  if (!scope || !scope.type) return 'global';
  if (scope.name) return `${scope.type}-${scope.name}`;
  return scope.type;
}

/**
 * Sanitize content before writing to graph.
 * Remove potential secrets, truncate oversized content.
 */
function sanitizeContent(content, maxLength = 10000) {
  if (!content) return '';
  // Truncate oversized content
  if (content.length > maxLength) {
    content = content.slice(0, maxLength) + '\n[truncated]';
  }
  return content;
}

module.exports = { formatEpisodeContent, buildGroupId, sanitizeContent };
```

#### capture.cjs (PostToolUse Capture Handler)

The handler logic for PostToolUse events. When Claude Code writes or edits a file, this handler decides what to extract and calls `addEpisode` to persist the change.

**Current behavior** (in `ledger/hooks/`): The PostToolUse hook handler receives tool use data (file path, operation type, content snippet) and writes an episode summarizing the change.

**Target behavior:** The capture handler is the same logic, but it is now explicitly a Ledger module called by Switchboard when a PostToolUse event is dispatched.

```javascript
const { addEpisode } = require('./episodes.cjs');
const { formatEpisodeContent, buildGroupId, sanitizeContent } = require('./format.cjs');

/**
 * Handle a PostToolUse capture event.
 * Called by Switchboard when a file change is detected.
 *
 * @param {object} event - { tool, filePath, operation, content, scope }
 * @returns {Promise<object|null>} - Episode write result or null
 */
async function handleCapture(event) {
  const { tool, filePath, operation, content, scope } = event;

  // Only capture Write and Edit tool operations
  if (!['Write', 'Edit'].includes(tool)) return null;

  const sanitized = sanitizeContent(content);
  const formatted = formatEpisodeContent(
    `File ${operation}: ${filePath}\n${sanitized}`,
    {
      source: 'PostToolUse',
      timestamp: new Date().toISOString()
    }
  );

  const groupId = buildGroupId(scope);
  return addEpisode(formatted, groupId, { hookName: 'PostToolUse' });
}

module.exports = { handleCapture };
```

### 3.3 Dependency Graph

```
subsystems/ledger/
  episodes.cjs
    imports -> ../terminus/mcp-client.cjs (Terminus transport)
    imports -> ../../lib/core.cjs (shared utilities: logError)
  format.cjs
    imports -> (none -- pure functions)
  capture.cjs
    imports -> ./episodes.cjs
    imports -> ./format.cjs
```

**Inbound dependencies (who imports Ledger):**

| Consumer | What It Imports | Why |
|----------|----------------|-----|
| Reverie (`inner-voice.cjs`) | `addEpisode`, `addStructuredEpisode` | Writes episodes, observations, state updates to graph |
| Switchboard (dispatcher) | `handleCapture` | Routes PostToolUse events to capture handler |
| Dynamo CLI (`dynamo.cjs`) | `addEpisode` | `dynamo remember` command writes episodes |

**Outbound dependencies (what Ledger imports):**

| Module | Subsystem | Why |
|--------|-----------|-----|
| `mcp-client.cjs` | **Terminus** | MCP transport for graph write operations |
| `core.cjs` | **Dynamo** (`lib/`) | Shared utilities (logError, loadConfig) |

### 3.4 Configuration Surface

Ledger has minimal configuration. The transport configuration (MCP URL, timeouts) is owned by Terminus. Ledger's only configuration is:

| Config Key | Location | Default | Description |
|-----------|----------|---------|-------------|
| `capture.enabled` | `config.json` | `true` | Whether PostToolUse capture is active |
| `capture.maxContentLength` | `config.json` | `10000` | Maximum content length before truncation |

---

## 4. Interfaces

### 4.1 Inbound Interface (Who Calls Ledger)

#### From Reverie

Reverie is Ledger's primary caller. The Inner Voice decides what to write and calls Ledger to execute the write.

```javascript
// Reverie writes a session episode at session end (Stop hook)
const ledger = require('../ledger/episodes.cjs');

async function handleStop(event) {
  const synthesis = await generateSessionSynthesis(event);
  await ledger.addEpisode(synthesis, event.groupId, { hookName: 'Stop' });
}

// Reverie writes an observation (v1.4 -- Enhanced Construction)
async function writeObservation(observation, groupId) {
  await ledger.addStructuredEpisode({
    content: observation.text,
    groupId,
    metadata: {
      source: 'Reverie:observation',
      confidence: observation.confidence,
      timestamp: new Date().toISOString()
    },
    hookName: 'consolidation'
  });
}
```

#### From Switchboard

Switchboard dispatches PostToolUse events to Ledger's capture handler.

```javascript
// Switchboard dispatches capture event
const { handleCapture } = require('../ledger/capture.cjs');

async function dispatchPostToolUse(event) {
  // ... scope building, toggle check ...
  await handleCapture({
    tool: event.tool_name,
    filePath: event.file_path,
    operation: event.operation,
    content: event.content_snippet,
    scope: builtScope
  });
}
```

#### From Dynamo CLI

The `dynamo remember` command writes user-specified content as an episode.

```javascript
// CLI: dynamo remember "some content" --scope project-dynamo
const { addEpisode } = require('../subsystems/ledger/episodes.cjs');

async function handleRemember(content, scope) {
  const groupId = buildGroupId(scope);
  await addEpisode(content, groupId, { hookName: 'cli-remember' });
}
```

### 4.2 Outbound Interface (What Ledger Calls)

#### To Terminus

All graph write operations go through Terminus MCP client.

```javascript
// Ledger calls Terminus for all writes
const terminus = require('../terminus/mcp-client.cjs');

// The only Terminus function Ledger calls:
const response = await terminus.callTool('add_memory', {
  content: formattedContent,
  group_id: groupId
}, options);
```

**Contract:** Ledger calls `terminus.callTool(toolName, args, options)` and receives a JSON-RPC response. The response shape is defined by the Graphiti MCP protocol.

### 4.3 Data Contracts

#### Episode Write Request

```javascript
{
  content: string,      // The episode content (text, structured or unstructured)
  group_id: string,     // Graphiti group identifier (scope-based: "global", "project-dynamo", etc.)
  // Passed through to Terminus:
  options: {
    hookName: string,   // Source hook for logging
    timeout: number     // Override default MCP timeout (optional)
  }
}
```

#### Episode Write Response

```javascript
// Success:
{
  result: {
    content: [
      { type: 'text', text: 'Episode added successfully.' }
    ]
  }
}

// Error:
{
  error: {
    code: number,
    message: string
  }
}

// Transport failure:
null  // Returned when Terminus is unreachable; logged via logError
```

#### Structured Episode Request (v1.3+)

```javascript
{
  content: string,          // Raw content to write
  groupId: string,          // Scope-based group identifier
  metadata: {
    source: string,         // Origin: 'PostToolUse', 'Reverie:observation', 'cli-remember', etc.
    timestamp: string,      // ISO-8601 timestamp
    confidence: number,     // 0.0-1.0 (optional, used for observations)
    contentType: string     // 'file-change', 'session-summary', 'observation', 'user-memory'
  },
  hookName: string          // For error logging context
}
```

#### Capture Event (from Switchboard)

```javascript
{
  tool: string,             // Claude Code tool name: 'Write', 'Edit', 'Bash', etc.
  filePath: string,         // Path to the affected file
  operation: string,        // 'write', 'edit', 'create'
  content: string,          // Content snippet or summary of changes
  scope: {
    type: string,           // 'global', 'project', 'session', 'task'
    name: string            // Scope name (project name, session timestamp, etc.)
  }
}
```

---

## 5. Implementation Detail

### 5.1 addEpisode (Core Write Function)

The primary function. Creates a knowledge graph episode through Terminus transport.

**Signature:**

```javascript
async function addEpisode(content, groupId, options = {}) -> object|null
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | `string` | Yes | Episode content (text) |
| `groupId` | `string` | Yes | Graphiti group identifier for scoping |
| `options.hookName` | `string` | No | Source hook name for error logging |
| `options.timeout` | `number` | No | Override default MCP timeout |

**Behavior:**

1. Call `terminus.callTool('add_memory', { content, group_id: groupId }, options)`
2. Return the Terminus response (JSON-RPC result or error)
3. On transport failure: log error via `logError`, return `null`
4. Never throw -- all errors are caught and logged

**Error handling:** Ledger follows the Dynamo convention of graceful degradation. If Terminus is unreachable (Docker down, MCP server not responding), Ledger logs the error and returns `null`. The calling subsystem (Reverie, Switchboard) decides how to handle the failure.

### 5.2 extractContent (Response Parser)

Utility function that extracts text from MCP JSON-RPC responses.

**Signature:**

```javascript
function extractContent(response) -> string
```

**Behavior:**

1. If response is null or has an error field, return empty string
2. Navigate to `response.result.content` (array of content items)
3. Filter for items with `type === 'text'` and non-empty `text` field
4. Join filtered text items with newlines
5. Return joined string

**Note:** While `extractContent` is primarily used by read operations (Assay), it remains in Ledger because it is also used to parse write confirmation responses. Both Ledger and Assay may import this utility. In the future, it could move to a shared transport utilities module in Terminus.

### 5.3 handleCapture (PostToolUse Handler)

The handler that processes file change events and persists them as episodes.

**Signature:**

```javascript
async function handleCapture(event) -> object|null
```

**Processing flow:**

1. **Filter**: Only process Write and Edit tool operations. Ignore Bash, Read, Grep, Glob (these do not modify files).
2. **Sanitize**: Truncate oversized content, remove potential secrets patterns.
3. **Format**: Structure the content with metadata (source, timestamp, file path, operation type).
4. **Build scope**: Construct groupId from the event's scope object.
5. **Write**: Call `addEpisode` with the formatted content and groupId.

**Filtering logic:**

| Tool | Captured? | Rationale |
|------|-----------|-----------|
| Write | Yes | Creates or overwrites files -- significant change |
| Edit | Yes | Modifies existing files -- significant change |
| Bash | No | May modify files but content is not structured; capturing Bash output creates noise |
| Read | No | Read-only -- no data to capture |
| Grep/Glob | No | Read-only -- no data to capture |

### 5.4 Write-Side Formatting Functions

#### formatEpisodeContent

Deterministic content shaping. Wraps raw content with contextual metadata.

```javascript
function formatEpisodeContent(content, metadata = {}) -> string
```

Produces a structured text block that Graphiti can ingest and extract entities from. The format is designed to maximize entity extraction quality from the Graphiti pipeline.

#### buildGroupId

Constructs a Graphiti group identifier from scope components.

```javascript
function buildGroupId(scope) -> string
```

Scope mapping:

| Input | Output |
|-------|--------|
| `{ type: 'global' }` | `'global'` |
| `{ type: 'project', name: 'dynamo' }` | `'project-dynamo'` |
| `{ type: 'session', name: '2026-03-19T12:00:00Z' }` | `'session-2026-03-19T12-00-00Z'` |
| `null` or `undefined` | `'global'` |

#### sanitizeContent

Content safety function. Truncates oversized content and removes potential secret patterns.

```javascript
function sanitizeContent(content, maxLength = 10000) -> string
```

---

## 6. Migration Path

### 6.1 File Movement Summary

Every file currently in `ledger/` has a defined destination:

| Current File | Target Destination | Subsystem | Action |
|-------------|-------------------|-----------|--------|
| `ledger/episodes.cjs` | `subsystems/ledger/episodes.cjs` | **Ledger** | Move, update imports |
| `ledger/curation.cjs` | **SPLIT** | **Ledger** + **Reverie** | Write formatting to `subsystems/ledger/format.cjs`; LLM curation to `subsystems/reverie/curation.cjs` |
| `ledger/search.cjs` | `subsystems/assay/search.cjs` | **Assay** | Move entirely to Assay |
| `ledger/sessions.cjs` | `subsystems/assay/sessions.cjs` | **Assay** | Move entirely to Assay |
| `ledger/scope.cjs` | `lib/scope.cjs` | **Dynamo** (shared) | Move to shared library |
| `ledger/mcp-client.cjs` | `subsystems/terminus/mcp-client.cjs` | **Terminus** | Move entirely to Terminus |
| `ledger/hooks/capture-change.cjs` | `subsystems/ledger/capture.cjs` | **Ledger** | Move, extract handler logic |
| `ledger/hooks/session-start.cjs` | `subsystems/reverie/handlers/session-start.cjs` | **Reverie** | Move to Reverie (cognitive hook handler) |
| `ledger/hooks/prompt-submit.cjs` | `subsystems/reverie/handlers/prompt-submit.cjs` | **Reverie** | Move to Reverie (cognitive hook handler) |
| `ledger/hooks/pre-compact.cjs` | `subsystems/reverie/handlers/pre-compact.cjs` | **Reverie** | Move to Reverie (cognitive hook handler) |
| `ledger/hooks/stop.cjs` | `subsystems/reverie/handlers/stop.cjs` | **Reverie** | Move to Reverie (cognitive hook handler) |
| `ledger/graphiti/` | `graphiti/` (stays at project root) | **Terminus** | Docker infrastructure stays at root; Terminus manages it |

### 6.2 curation.cjs Split Detail

This is the most complex migration because `curation.cjs` contains functions belonging to two different subsystems.

**Functions moving to Reverie (`subsystems/reverie/curation.cjs`):**

| Function | Rationale |
|----------|-----------|
| `callHaiku(promptName, variables, options)` | LLM API call -- cognitive processing |
| `curateResults(memories, contextText, options)` | LLM-powered relevance filtering -- cognitive processing |
| `summarizeText(text, options)` | LLM-powered session synthesis -- cognitive processing |
| `generateSessionName(summaryText, options)` | LLM-powered naming -- cognitive processing |

**Functions staying with Ledger (`subsystems/ledger/format.cjs`):**

| Function | Rationale |
|----------|-----------|
| `formatEpisodeContent(content, metadata)` | Deterministic data shaping |
| `buildGroupId(scope)` | Deterministic scope mapping |
| `sanitizeContent(content, maxLength)` | Deterministic safety check |

**New in format.cjs** (extracted from inline logic in hooks):

| Function | Description |
|----------|-------------|
| `formatCaptureContent(filePath, operation, content)` | Structure file change data for graph ingestion |
| `formatSessionSummary(summary, metadata)` | Structure session summary for graph ingestion |

### 6.3 Import Path Changes

All consumers of the departing modules must update their import paths:

| Consumer | Current Import | New Import |
|----------|---------------|------------|
| Hook handlers | `require('../ledger/search')` | `require('../subsystems/assay/search')` |
| Hook handlers | `require('../ledger/sessions')` | `require('../subsystems/assay/sessions')` |
| Hook handlers | `require('../ledger/mcp-client')` | `require('../subsystems/terminus/mcp-client')` |
| `core.cjs` re-exports | `loadSessions` from `ledger/sessions` | `loadSessions` from `subsystems/assay/sessions` |
| `core.cjs` re-exports | `listSessions` from `ledger/sessions` | `listSessions` from `subsystems/assay/sessions` |
| `dynamo.cjs` CLI | `require('./ledger/search')` | `require('./subsystems/assay/search')` |
| `dynamo.cjs` CLI | `require('./ledger/episodes')` | `require('./subsystems/ledger/episodes')` |

### 6.4 Breaking Changes

| Change | Impact | Mitigation |
|--------|--------|------------|
| `ledger/search.cjs` moves to Assay | All search consumers must update imports | During migration: old path can re-export from new location |
| `ledger/sessions.cjs` moves to Assay | All session consumers must update imports | During migration: old path can re-export from new location |
| `ledger/mcp-client.cjs` moves to Terminus | Episodes.cjs and search.cjs must update imports | During migration: old path can re-export from new location |
| `ledger/curation.cjs` splits | Consumers calling `curateResults` must import from Reverie | Clear migration: LLM functions from Reverie, format functions from Ledger |
| `ledger/scope.cjs` moves to shared | All scope consumers must update imports | During migration: old path can re-export from `lib/scope.cjs` |

### 6.5 Backward Compatibility Strategy

During the 1.3-M1 migration, old file paths can be maintained as thin re-export shims:

```javascript
// ledger/search.cjs (shim during migration)
'use strict';
// Deprecated: import from subsystems/assay/search.cjs instead
module.exports = require('../subsystems/assay/search.cjs');
```

These shims are removed after all consumers have been updated, ensuring a clean codebase at the end of 1.3-M1.

---

## 7. Open Questions

### 7.1 Observation Write Path Ownership

**Question:** Does Ledger own the observation write path (CORTEX-05), or does Reverie own it and call Ledger?

**Current thinking:** Reverie owns the decision of WHAT to observe and WHEN to write observations. Ledger provides the write function (`addStructuredEpisode`) that Reverie calls. This maintains the boundary: Reverie decides, Ledger executes.

**Recommendation:** Reverie orchestrates observation synthesis and calls `ledger.addStructuredEpisode()` with the observation content. Ledger does not know or care that the content is an observation -- it writes what it receives.

### 7.2 Curation Intelligence Boundary

**Question:** Does Ledger retain any curation intelligence, or does ALL curation move to Reverie?

**Current thinking:** All LLM-based curation moves to Reverie. Ledger retains only deterministic write-side formatting (content structuring, sanitization, metadata attachment). The line is clear: if it requires an LLM call, it is Reverie's job.

**Recommendation:** Zero LLM calls in Ledger. All intelligence moves to Reverie. Ledger is a pure construction module -- deterministic, stateless, fast.

### 7.3 extractContent Ownership

**Question:** Should `extractContent` stay in Ledger or move to a shared transport utility in Terminus?

**Current thinking:** `extractContent` is used by both Ledger (parsing write confirmations) and Assay (parsing search results). It is fundamentally a transport response parser. Moving it to Terminus (or to `lib/`) would be more architecturally clean.

**Recommendation:** Move to `lib/transport-utils.cjs` or keep in Terminus as a shared utility. For the migration, it can remain in Ledger with Assay importing it -- the dependency is acceptable since both are consumers of Terminus transport.

### 7.4 Session Creation at Stop Hook

**Question:** When the Stop hook fires, a new session entry is created in `sessions.json` via `indexSession`. Is session creation a Ledger operation (it creates data) or an Assay operation (Assay manages sessions)?

**Current thinking:** Session indexing (`indexSession`, `saveSessions`) involves writing to a local JSON file, not to the knowledge graph. Since Assay owns the session management domain (listing, viewing, labeling), session creation also belongs to Assay for domain cohesion. The alternative -- splitting session reads and writes across Assay and Ledger -- creates unnecessary coupling.

**Recommendation:** Assay owns session creation for domain cohesion. The Reverie Stop handler calls Assay to index the session and calls Ledger to write the session episode to the knowledge graph. Two different data stores, two different subsystems.

---

## Document References

| Document | Relationship |
|----------|-------------|
| **DYNAMO-PRD.md** | Defines Ledger's role in the six-subsystem architecture (Section 3.1, 3.3) |
| **ASSAY-SPEC.md** | Companion spec -- defines the read-side counterpart that receives departing Ledger modules |
| **TERMINUS-SPEC.md** | Transport layer spec -- defines the MCP client interface Ledger calls |
| **REVERIE-SPEC.md** | Inner Voice spec -- defines the cognitive layer that calls Ledger for writes |
| **INNER-VOICE-SPEC.md** | Existing mechanical spec -- defines processing pipelines that produce Ledger writes |

---

*Specification date: 2026-03-19*
*Subsystem: Ledger (Data Construction Layer)*
*Architecture: Six-subsystem model (Dynamo, Switchboard, Ledger, Assay, Terminus, Reverie)*
*Boundary rule: Ledger writes, Assay reads, Terminus transports, Reverie decides*
