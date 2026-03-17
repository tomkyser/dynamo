# Phase 9: Hook Migration - Research

**Researched:** 2026-03-17
**Domain:** Claude Code hook system -- CJS dispatcher + 5 event handlers, Haiku curation pipeline, session management, sessions.json compatibility
**Confidence:** HIGH

## Summary

Phase 9 ports all 5 Claude Code hook events (SessionStart, UserPromptSubmit, PostToolUse, PreCompact, Stop) from the Python/Bash system to a CJS dispatcher (`dynamo-hooks.cjs`) with individual handler modules. The Phase 8 foundation provides the complete substrate: `core.cjs` (config, env, project detection, logging, health guard, fetchWithTimeout), `scope.cjs` (scope constants, validation), and `mcp-client.cjs` (MCPClient, parseSSE). Phase 9 builds on this to create the hook dispatcher, 5 handler modules, the Haiku curation pipeline via OpenRouter, session management commands, and two-phase session auto-naming -- then switches `settings.json` to point to the CJS hooks.

The primary technical risk is the Stop hook timeout: Claude Code imposes a 1.5-second global cap on Stop/SessionEnd hooks via `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS`. The current Stop hook performs 3 Haiku API calls (summarize, name, index) plus 2 Graphiti writes, which takes 2-5 seconds. This means the Stop hook has likely been truncated in many sessions under the current Python system as well. The CJS port must either set the environment variable to extend the timeout (recommended: 10000ms) or restructure to do less work. This is a known-unknowns area requiring empirical measurement.

The OpenRouter model ID `anthropic/claude-haiku-4.5` is confirmed active and available as of March 2026. The curation pipeline uses a simple REST POST to the OpenRouter chat completions endpoint -- no streaming, no special features needed.

**Primary recommendation:** Build in dependency order (curation -> episodes -> search -> sessions -> handlers -> dispatcher), measure Stop hook timing empirically, set `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS=10000` in settings.json env block, then switch all 5 events to CJS in a single commit with settings.json.bak backup.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Single entry point: `dynamo-hooks.cjs` registered in settings.json for all 5 hook events
- Dispatcher parses stdin JSON, builds a context object (session_id, scope, project, event_type), passes to handler function
- Separate handler files in `lib/ledger/hooks/` (e.g., `session-start.cjs`, `prompt-augment.cjs`, `capture-change.cjs`, `preserve-knowledge.cjs`, `session-summary.cjs`)
- Handlers are functions that receive the context object -- dispatcher owns stdin parsing and routing
- OpenRouter is a hard requirement for curation -- no alternative API fallback chain
- Reworking the curation API strategy is out of scope for v1.2
- When OpenRouter is unavailable or unconfigured: return truncated raw results with `[uncurated]` marker
- Hook exits 0 (graceful degradation) -- Claude still gets some memory context, just unfiltered
- Build all CJS handlers, test thoroughly, then swap settings.json in one commit (all-at-once switch)
- Verification before switch: automated integration tests (pipe test JSON through dynamo-hooks.cjs for each event) PLUS manual smoke test session with full lifecycle
- Phase 9 updates settings.json directly (matches phase goal: "all 5 hook events handled by CJS dispatcher")
- Before switching: copy settings.json to settings.json.bak for rollback
- Old Python/Bash hooks remain on disk -- rollback is restoring settings.json.bak
- Priority order when timeout budget runs short: 1) Session summary + Graphiti write, 2) Auto-naming via Haiku, 3) sessions.json update
- Two-phase auto-naming runs inside the Stop hook (atomic -- session ends with a name), matching current Python behavior
- Total timeout budget: start at 30s, measure actual timings, adjust based on empirical data
- Settings.json backup (settings.json.bak) before switching is a hard requirement -- not optional
- Regression tests 10-12 from Phase 8 define interface contracts that Phase 9 handlers must satisfy (stop hook completion, two-phase naming, user label preservation)

### Claude's Discretion
- Timeout strategy (budget-based with AbortSignal vs fixed per-step) -- pick based on measurement
- Exact handler file naming within lib/ledger/hooks/
- Integration test script design
- How session management commands (list, view, label, backfill, index) are structured (subcommands of dynamo CLI or standalone)
- Internal error logging format within handlers

### Deferred Ideas (OUT OF SCOPE)
- Alternative curation API providers (direct Anthropic API, local models) -- deferred beyond v1.2, OpenRouter is the sole path for now
- In-conversation curation via Claude Code subagents -- architectural change, out of scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LDG-01 | Single hook dispatcher (dynamo-hooks.cjs) routing all 5 hook events | Dispatcher pattern documented in ARCHITECTURE.md; proven stdin buffering from gsd-context-monitor.js; hook_event_name field confirmed in Claude Code spec |
| LDG-02 | SessionStart hook ported to CJS with full parity | Current session-start.sh analyzed (59 LOC); needs health check, project detection, 3 searches with curation, formatted output |
| LDG-03 | UserPromptSubmit hook ported to CJS with full parity | Current prompt-augment.sh analyzed (67 LOC); needs prompt length check, session naming flag, search + curation |
| LDG-04 | PostToolUse (capture-change) hook ported to CJS with full parity | Current capture-change.sh analyzed (59 LOC); needs tool_name filter, episode write, health guard |
| LDG-05 | PreCompact (preserve-knowledge) hook ported to CJS with full parity | Current preserve-knowledge.sh analyzed (57 LOC); needs Haiku summarization, episode write, stdout re-injection |
| LDG-06 | Stop (session-summary) hook ported to CJS with full parity | Current session-summary.sh analyzed (83 LOC); needs stop_hook_active guard, summarization, dual-scope write, naming, index; timeout cap is critical concern |
| LDG-07 | Haiku curation pipeline via OpenRouter with graceful degradation | Python curate_results() analyzed (43 LOC); OpenRouter REST API confirmed; model ID stable; degradation = truncated with [uncurated] marker |
| LDG-08 | Session management: list, view, label, backfill, index commands | Python session commands analyzed (188 LOC total); sessions.json format understood; atomic write pattern needed |
| LDG-09 | Two-phase session auto-naming via Haiku | Phase 1 (preliminary) in prompt-augment via generate_session_name; Phase 2 (refined) in session-summary from summary text; regression test 11 defines interface |
| LDG-10 | sessions.json format compatibility (read existing, write compatible) | sessions.json analyzed: array of {timestamp, project, label, labeled_by}; 50 entries currently; atomic tmp+rename write pattern |
</phase_requirements>

## Standard Stack

### Core (Already Built in Phase 8)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `core.cjs` | 0.1.0 | Shared substrate: loadConfig, loadEnv, detectProject, logError, healthGuard, fetchWithTimeout, loadPrompt | COMPLETE |
| `scope.cjs` | 0.1.0 | SCOPE constants, validateGroupId, sanitize | COMPLETE |
| `mcp-client.cjs` | 0.1.0 | MCPClient class, parseSSE for Graphiti JSON-RPC | COMPLETE |

### New in Phase 9
| Module | Purpose | Depends On |
|--------|---------|------------|
| `lib/ledger/curation.cjs` | Haiku curation via OpenRouter (curate, summarize, generate name) | core.cjs (loadConfig, loadEnv, fetchWithTimeout, loadPrompt) |
| `lib/ledger/episodes.cjs` | Episode write (addEpisode, extractContent helper) | core.cjs, mcp-client.cjs, scope.cjs |
| `lib/ledger/search.cjs` | Memory search (searchFacts, searchNodes, combined search) | core.cjs, mcp-client.cjs |
| `lib/ledger/sessions.cjs` | Session index CRUD (load, save, list, view, label, backfill, index) | core.cjs, mcp-client.cjs |
| `lib/ledger/hooks/session-start.cjs` | SessionStart handler | curation.cjs, search.cjs |
| `lib/ledger/hooks/prompt-augment.cjs` | UserPromptSubmit handler | curation.cjs, search.cjs, sessions.cjs |
| `lib/ledger/hooks/capture-change.cjs` | PostToolUse handler | episodes.cjs |
| `lib/ledger/hooks/preserve-knowledge.cjs` | PreCompact handler | curation.cjs, episodes.cjs |
| `lib/ledger/hooks/session-summary.cjs` | Stop handler | curation.cjs, episodes.cjs, sessions.cjs |
| `dynamo-hooks.cjs` | Dispatcher entry point (stdin parsing, routing, exit handling) | All handler modules |

### External Services (No npm dependencies)
| Service | Endpoint | Timeout | Auth |
|---------|----------|---------|------|
| Graphiti Health | `http://localhost:8100/health` | 3000ms | None |
| Graphiti MCP | `http://localhost:8100/mcp` | 5000ms | Session-based (mcp-session-id header) |
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions` | 10000ms (curation), 15000ms (summarization) | Bearer OPENROUTER_API_KEY |

### Runtime
| Component | Version | Notes |
|-----------|---------|-------|
| Node.js | v24.13.1 | Native fetch(), AbortSignal.timeout(), crypto.randomUUID() all available |
| Claude Code | Current | Hooks spec: 12+ events, JSON stdin, configurable timeout |

## Architecture Patterns

### Recommended Module Structure
```
~/.claude/dynamo/
  lib/
    core.cjs                    # [EXISTING] Shared substrate
    ledger/
      scope.cjs                 # [EXISTING] Scope constants
      mcp-client.cjs            # [EXISTING] MCP JSON-RPC client
      curation.cjs              # [NEW] Haiku API calls
      episodes.cjs              # [NEW] Episode write + content extraction
      search.cjs                # [NEW] Memory search (facts + nodes)
      sessions.cjs              # [NEW] Session index CRUD + naming
      hooks/                    # [NEW] Handler functions
        session-start.cjs
        prompt-augment.cjs
        capture-change.cjs
        preserve-knowledge.cjs
        session-summary.cjs
  hooks/
    dynamo-hooks.cjs            # [NEW] Single entry point dispatcher
  tests/
    core.test.cjs               # [EXISTING]
    mcp-client.test.cjs         # [EXISTING]
    scope.test.cjs              # [EXISTING]
    regression.test.cjs         # [EXISTING]
    curation.test.cjs           # [NEW]
    episodes.test.cjs           # [NEW]
    search.test.cjs             # [NEW]
    sessions.test.cjs           # [NEW]
    dispatcher.test.cjs         # [NEW]
    integration.test.cjs        # [NEW] Pipe-through integration tests
```

### Pattern 1: Dispatcher Context Object
**What:** The dispatcher parses stdin once, builds a context object, and passes it to the handler. Handlers never touch stdin.
**When to use:** Every hook invocation.
**Example:**
```javascript
// dynamo-hooks.cjs -- context object construction
const context = {
  sessionId: data.session_id || '',
  cwd: data.cwd || process.cwd(),
  hookEventName: data.hook_event_name,
  permissionMode: data.permission_mode || 'default',
  transcriptPath: data.transcript_path || '',
  // Event-specific fields
  source: data.source,                        // SessionStart
  prompt: data.prompt,                         // UserPromptSubmit
  toolName: data.tool_name,                    // PostToolUse
  toolInput: data.tool_input,                  // PostToolUse
  trigger: data.trigger,                       // PreCompact
  customInstructions: data.custom_instructions, // PreCompact
  stopHookActive: data.stop_hook_active,       // Stop
  lastAssistantMessage: data.last_assistant_message, // Stop
  // Derived fields (computed once by dispatcher)
  project: null,  // filled by detectProject()
  scope: null,    // filled by SCOPE.project() or 'global'
};
context.project = detectProject(context.cwd);
context.scope = (context.project !== 'unknown' && context.project !== 'tom.kyser')
  ? SCOPE.project(context.project)
  : SCOPE.global;
```

### Pattern 2: Curation Pipeline with Graceful Degradation
**What:** All Haiku API calls go through a shared curation module. When OpenRouter is unavailable or unconfigured, return truncated results with `[uncurated]` marker.
**When to use:** Every hook that calls OpenRouter (SessionStart, UserPromptSubmit, PreCompact, Stop).
**Example:**
```javascript
// lib/ledger/curation.cjs
async function callHaiku(promptName, variables, options = {}) {
  const config = loadConfig();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { text: variables.fallback || '', uncurated: true };
  }

  const prompt = loadPrompt(promptName);
  if (!prompt) {
    return { text: variables.fallback || '', uncurated: true };
  }

  // Interpolate variables into prompt template
  let userContent = prompt.user;
  for (const [key, value] of Object.entries(variables)) {
    userContent = userContent.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  try {
    const resp = await fetchWithTimeout(config.curation.api_url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.curation.model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: userContent }
        ],
        max_tokens: options.maxTokens || 500,
        temperature: 0.3
      })
    }, options.timeout || config.timeouts.curation);

    if (resp.ok) {
      const data = await resp.json();
      return { text: data.choices[0].message.content, uncurated: false };
    }
    return { text: variables.fallback || '', uncurated: true };
  } catch (e) {
    logError(options.hookName || 'curation', 'OpenRouter call failed: ' + e.message);
    return { text: variables.fallback || '', uncurated: true };
  }
}
```

### Pattern 3: Stop Hook Timeout Budget
**What:** The Stop hook has the most work to do and the tightest timeout constraint. Implement a budget-based approach: track elapsed time, skip lower-priority steps if budget is exhausted.
**When to use:** Stop handler only.
**Example:**
```javascript
// lib/ledger/hooks/session-summary.cjs
async function handleStop(ctx) {
  if (ctx.stopHookActive) return; // Infinite loop guard

  const startMs = Date.now();
  const budget = 25000; // 25s budget (leave 5s buffer from 30s timeout)
  const elapsed = () => Date.now() - startMs;
  const remaining = () => budget - elapsed();

  // Priority 1: Summarize + Graphiti write (MUST complete)
  let summary = '';
  if (remaining() > 3000) {
    summary = await summarizeText(ctx.lastAssistantMessage || '');
  }
  if (summary && remaining() > 2000) {
    await addEpisode(`Session summary (${timestamp}): ${summary}`, ctx.scope);
    await addEpisode(`Session summary: ${summary}`, SCOPE.session(timestamp));
  }

  // Priority 2: Auto-naming via Haiku (SHOULD complete)
  let sessionName = '';
  if (summary && remaining() > 2000) {
    sessionName = await generateSessionName(summary);
  }

  // Priority 3: sessions.json update (NICE to have)
  if (remaining() > 500) {
    indexSession(timestamp, ctx.project, sessionName, 'auto');
  }
}
```

### Pattern 4: Once-Per-Session Flags with process.ppid
**What:** Health check warnings and session naming use temp file flags keyed on `process.ppid` (the Claude Code parent process PID) to avoid repetition within a single session.
**When to use:** Health guard (all hooks), session naming flag (UserPromptSubmit).
**Example:**
```javascript
// Session naming flag (first substantial prompt only)
const SESSION_NAMED_FLAG = path.join(os.tmpdir(), `dynamo-session-named-${process.ppid}`);

function isSessionNamed() {
  return fs.existsSync(SESSION_NAMED_FLAG);
}

function markSessionNamed() {
  fs.writeFileSync(SESSION_NAMED_FLAG, '1');
}
```

### Pattern 5: Atomic sessions.json Writes
**What:** Write to a `.tmp` file then rename atomically, matching the Python pattern.
**When to use:** Every sessions.json mutation (index, label, backfill).
**Example:**
```javascript
// lib/ledger/sessions.cjs
const SESSIONS_FILE = path.join(os.homedir(), '.claude', 'graphiti', 'sessions.json');

function saveSessions(sessions) {
  const dir = path.dirname(SESSIONS_FILE);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = SESSIONS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(sessions, indent 2) + '\n');
  fs.renameSync(tmp, SESSIONS_FILE);
}
```

### Anti-Patterns to Avoid
- **Bare `.catch(() => {})`:** Every catch must log via `logError()`. Regression test 1 enforces this.
- **`process.pid` instead of `process.ppid`:** Flag files must use ppid for session-scoped behavior. Regression test 9 enforces this.
- **Colon in group_id:** Always use `SCOPE.project()` / `SCOPE.session()`, never string concatenation with colons. Regression test 3 enforces this.
- **Multiple MCPClient instances per hook:** Create one, reuse for all calls within a single hook invocation.
- **Stdout pollution:** All debug/error output to stderr. Stdout is reserved for hook return JSON/text only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE parsing | Custom event-stream parser | `parseSSE()` from mcp-client.cjs | Already built and tested in Phase 8 |
| HTTP with timeouts | Raw fetch without timeout | `fetchWithTimeout()` from core.cjs | Already built with AbortSignal.timeout |
| Scope formatting | String concatenation (`project-${name}`) | `SCOPE.project(name)` from scope.cjs | Handles sanitization, dash enforcement |
| Group ID validation | Ad-hoc regex checks | `validateGroupId()` from scope.cjs | Already handles colon rejection |
| Config loading | Reading config.json manually | `loadConfig()` from core.cjs | Deep-merges defaults with overrides |
| .env loading | Custom parser or dotenv package | `loadEnv()` from core.cjs | Matches Python precedence (env wins over file) |
| Error logging | console.error or ad-hoc writes | `logError()` from core.cjs | ISO timestamps, hook name prefix, 1MB rotation |
| Health caching | Per-hook health checks | `healthGuard()` from core.cjs | Once-per-session with ppid-based caching |
| Prompt loading | Reading .md files and splitting | `loadPrompt()` from core.cjs | Splits system/user on `---` separator |
| MCP tool calls | Raw JSON-RPC construction | `MCPClient.callTool()` from mcp-client.cjs | Session init, SSE handling, timeout |

**Key insight:** Phase 8 built exactly the utilities Phase 9 needs. The handler modules should be thin wrappers that compose Phase 8 primitives -- NOT reimplementations.

## Common Pitfalls

### Pitfall 1: Stop Hook 1.5s Global Timeout Cap
**What goes wrong:** Claude Code enforces `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` (default: 1500ms) as a hard cap on Stop/SessionEnd hooks. The per-hook `timeout: 30` in settings.json is overridden by this global cap. The Stop hook needs 2-5 seconds for summarization + naming + Graphiti writes.
**Why it happens:** The global cap exists to prevent Claude Code from hanging at exit. The current Python Stop hook has almost certainly been getting truncated on many sessions.
**How to avoid:** Set `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS=10000` in the settings.json `env` block. Implement budget-based timeout management inside the Stop handler. Measure actual timings empirically.
**Warning signs:** Session summaries intermittently missing; session names always preliminary (never refined); `sessions.json` entries with empty labels.
**Confidence:** HIGH -- confirmed via official Claude Code hooks documentation.

### Pitfall 2: Infinite Loop in Stop Hook
**What goes wrong:** The Stop hook writes to Graphiti, which fires PostToolUse, which could trigger... but more critically, if the Stop hook uses `decision: "block"` or its output causes Claude Code to continue, it fires the Stop hook again.
**Why it happens:** The `stop_hook_active` field exists precisely for this reason. The current Bash hook checks `$(echo "$INPUT" | jq -r '.stop_hook_active // false')`.
**How to avoid:** First line of Stop handler: `if (ctx.stopHookActive) return;`. Also use a temp file flag (`/tmp/dynamo-stop-active-${process.ppid}`) as a secondary guard, matching regression test 10's interface contract.
**Warning signs:** Hook error log full of rapid repeated entries; Claude Code hangs at exit.
**Confidence:** HIGH -- documented in official spec and existing Bash implementation.

### Pitfall 3: Curation Fallback Producing Empty Output
**What goes wrong:** When OpenRouter is unavailable, the curation fallback returns empty string instead of truncated raw results. Claude Code receives no memory context at all.
**Why it happens:** The Python code returns `memories` (the raw input) when curation fails. But if the CJS code returns empty string on failure, all memory context is lost.
**How to avoid:** Curation fallback must return truncated raw results with `[uncurated]` marker, not empty string. The fallback path must be explicitly tested.
**Warning signs:** `[GRAPHITI MEMORY CONTEXT]` header with no content after it; missing `[RELEVANT MEMORY]` blocks.
**Confidence:** HIGH -- derived from Python code analysis.

### Pitfall 4: sessions.json Race Conditions
**What goes wrong:** The UserPromptSubmit hook (preliminary naming) and Stop hook (refined naming) both write to sessions.json. If they execute close together, one write can clobber the other.
**Why it happens:** JavaScript hooks are separate process invocations, but sessions.json is a shared file. No file locking in the current system.
**How to avoid:** Atomic write pattern (tmp+rename). Load-modify-save (not overwrite). The `labeled_by: "user"` protection already handles the most important case. For auto labels, the Stop hook's refined name should always win over the preliminary name -- the index function already handles this by checking if the label is non-empty and labeled_by is not "user".
**Warning signs:** sessions.json entries with wrong labels; labels reverting from refined to preliminary.
**Confidence:** MEDIUM -- theoretical risk, mitigated by the existing index-session logic.

### Pitfall 5: Handler Module Path Resolution
**What goes wrong:** `dynamo-hooks.cjs` lives in `~/.claude/dynamo/hooks/` but requires modules from `~/.claude/dynamo/lib/`. If the require path uses relative notation (`../lib/`) and the file is invoked from a different CWD, the path breaks.
**Why it happens:** Node.js `require()` resolves relative paths from `__dirname`, which is always the file's actual location. So relative requires are actually safe in CJS. The pitfall is if someone uses `process.cwd()`-relative paths by accident.
**How to avoid:** Always use `path.join(__dirname, '..', 'lib', 'modulename.cjs')`. Never use `require('./lib/...')` without `__dirname` anchoring.
**Warning signs:** `MODULE_NOT_FOUND` errors in hook logs; hooks work from home directory but fail from project directories.
**Confidence:** HIGH -- standard Node.js CJS behavior.

## Code Examples

### Dispatcher Entry Point (dynamo-hooks.cjs)
```javascript
// Source: gsd-context-monitor.js stdin pattern + ARCHITECTURE.md dispatcher pattern
'use strict';

const path = require('path');
const { loadEnv, detectProject, healthGuard, logError, loadConfig } = require(path.join(__dirname, '..', 'lib', 'core.cjs'));
const { SCOPE } = require(path.join(__dirname, '..', 'lib', 'ledger', 'scope.cjs'));

// Load environment early (before any handler needs API keys)
loadEnv();

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 5000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', async () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    const event = data.hook_event_name;

    // Build context object (dispatcher responsibility)
    const project = detectProject(data.cwd || process.cwd());
    const scope = (project !== 'unknown' && project !== 'tom.kyser')
      ? SCOPE.project(project)
      : SCOPE.global;

    const ctx = { ...data, project, scope };

    // Route to handler
    switch (event) {
      case 'SessionStart':
        await require(path.join(__dirname, '..', 'lib', 'ledger', 'hooks', 'session-start.cjs'))(ctx);
        break;
      case 'UserPromptSubmit':
        await require(path.join(__dirname, '..', 'lib', 'ledger', 'hooks', 'prompt-augment.cjs'))(ctx);
        break;
      case 'PostToolUse':
        await require(path.join(__dirname, '..', 'lib', 'ledger', 'hooks', 'capture-change.cjs'))(ctx);
        break;
      case 'PreCompact':
        await require(path.join(__dirname, '..', 'lib', 'ledger', 'hooks', 'preserve-knowledge.cjs'))(ctx);
        break;
      case 'Stop':
        await require(path.join(__dirname, '..', 'lib', 'ledger', 'hooks', 'session-summary.cjs'))(ctx);
        break;
      default:
        break; // Unknown event, exit silently
    }
  } catch (e) {
    logError('dispatcher', e.message);
  }
  process.exit(0); // Always exit 0 -- never block Claude Code
});
```

### OpenRouter Curation Call
```javascript
// Source: Python graphiti-helper.py curate_results() (lines 144-186)
async function curateResults(memories, contextText, options = {}) {
  const config = loadConfig();
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey || !memories.trim()) {
    return memories ? `[uncurated]\n${memories.slice(0, 500)}` : '';
  }

  const prompt = loadPrompt(options.promptName || 'curation');
  if (!prompt) return `[uncurated]\n${memories.slice(0, 500)}`;

  const userContent = prompt.user
    .replace('{memories}', memories)
    .replace('{project_name}', options.projectName || 'unknown')
    .replace('{session_type}', options.sessionType || 'startup')
    .replace('{prompt}', contextText || '');

  try {
    const resp = await fetchWithTimeout(config.curation.api_url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.curation.model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: userContent }
        ],
        max_tokens: options.maxTokens || 500,
        temperature: 0.3
      })
    }, options.timeout || config.timeouts.curation);

    if (resp.ok) {
      const data = await resp.json();
      return data.choices[0].message.content;
    }
    logError(options.hookName || 'curation', `OpenRouter HTTP ${resp.status}`);
    return `[uncurated]\n${memories.slice(0, 500)}`;
  } catch (e) {
    logError(options.hookName || 'curation', e.message);
    return `[uncurated]\n${memories.slice(0, 500)}`;
  }
}
```

### Content Extraction from MCP Response
```javascript
// Source: Python graphiti-helper.py _extract_content() (lines 446-459)
function extractContent(response) {
  if (!response || response.error) return '';

  const result = response.result || {};
  const content = result.content || [];

  const texts = [];
  for (const item of content) {
    if (item && item.type === 'text' && item.text) {
      texts.push(item.text);
    }
  }
  return texts.join('\n');
}
```

### Sessions.json CRUD
```javascript
// Source: Python graphiti-helper.py lines 462-676
const SESSIONS_FILE = path.join(os.homedir(), '.claude', 'graphiti', 'sessions.json');

function loadSessions() {
  try {
    const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  fs.mkdirSync(path.dirname(SESSIONS_FILE), { recursive: true });
  const tmp = SESSIONS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(sessions, null, 2) + '\n');
  fs.renameSync(tmp, SESSIONS_FILE);
}

function indexSession(timestamp, project, label, labeledBy) {
  const sessions = loadSessions();
  const existing = sessions.find(s => s.timestamp === timestamp);
  if (existing) {
    if (existing.labeled_by === 'user') return; // Never overwrite user labels
    if (!label && existing.label) return;        // Don't overwrite with empty
    existing.label = label;
    existing.labeled_by = labeledBy;
    if (project && project !== 'unknown') existing.project = project;
  } else {
    sessions.push({ timestamp, project, label, labeled_by: labeledBy });
  }
  saveSessions(sessions);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 6 separate Bash hooks shelling out to Python | Single CJS dispatcher with handler modules | Phase 9 (this phase) | Eliminates Bash-to-Python bridge, ~50ms cold start vs ~400ms |
| Python venv + httpx for HTTP | Node.js native fetch() + AbortSignal.timeout() | Phase 8 (foundation) | Zero npm dependencies |
| YAML prompts file | Markdown prompts with --- separator | Phase 8 (foundation) | loadPrompt() handles natively |
| jq for JSON parsing in Bash | Native JSON.parse in Node.js | Phase 9 (this phase) | Type-safe, no external dependency |
| Python argparse CLI | Subcommand routing (GSD pattern) | Phase 10 (future) | Session commands available via dynamo CLI |

**Stop hook timeout discovery:** The `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` environment variable (default: 1500ms) was confirmed in official Claude Code hooks documentation. This explains potentially missing session summaries in the current Python system and must be addressed in the CJS port.

**Haiku model:** `anthropic/claude-haiku-4.5` confirmed active on OpenRouter as of March 2026 with $1/$5 per million tokens pricing.

## settings.json Hook Registration (Target State)

The following shows the target hook registrations after Phase 9 switchover:

```json
{
  "env": {
    "CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS": "10000"
  },
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [{
          "type": "command",
          "command": "node \"$HOME/.claude/dynamo/hooks/dynamo-hooks.cjs\"",
          "timeout": 30
        }]
      },
      {
        "matcher": "compact",
        "hooks": [{
          "type": "command",
          "command": "node \"$HOME/.claude/dynamo/hooks/dynamo-hooks.cjs\"",
          "timeout": 30
        }]
      },
      {
        "hooks": [{
          "type": "command",
          "command": "node \"$HOME/.claude/hooks/gsd-check-update.js\""
        }]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "node \"$HOME/.claude/dynamo/hooks/dynamo-hooks.cjs\"",
          "timeout": 15
        }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [{
          "type": "command",
          "command": "node \"$HOME/.claude/dynamo/hooks/dynamo-hooks.cjs\"",
          "timeout": 10
        }]
      },
      {
        "hooks": [{
          "type": "command",
          "command": "node \"$HOME/.claude/hooks/gsd-context-monitor.js\""
        }]
      }
    ],
    "PreCompact": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "node \"$HOME/.claude/dynamo/hooks/dynamo-hooks.cjs\"",
          "timeout": 30
        }]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "node \"$HOME/.claude/dynamo/hooks/dynamo-hooks.cjs\"",
          "timeout": 30
        }]
      }
    ]
  }
}
```

Note: GSD hooks (`gsd-check-update.js`, `gsd-context-monitor.js`) remain untouched.

## Hook Input/Output Reference

### Claude Code Hook stdin Fields (from official spec)

**Common fields (all events):**
- `session_id` (string)
- `transcript_path` (string)
- `cwd` (string)
- `permission_mode` (string: "default"|"plan"|"acceptEdits"|"dontAsk"|"bypassPermissions")
- `hook_event_name` (string: the event name)

**SessionStart-specific:** `source` (string: "startup"|"resume"|"compact"), `model` (string)
**UserPromptSubmit-specific:** `prompt` (string)
**PostToolUse-specific:** `tool_name` (string), `tool_input` (object), `tool_response` (string), `tool_use_id` (string)
**PreCompact-specific:** `trigger` (string), `custom_instructions` (string)
**Stop-specific:** `stop_hook_active` (boolean), `last_assistant_message` (string)

### Hook Output Patterns

**SessionStart, UserPromptSubmit, PreCompact:** Plain text to stdout becomes `additionalContext` injected into Claude's conversation.
**PostToolUse:** JSON with `hookSpecificOutput.additionalContext` for context injection.
**Stop:** JSON with `decision: "block"` + `reason` to prevent stopping (not used by Dynamo -- we always allow stop).

## Open Questions

1. **Stop hook empirical timing**
   - What we know: CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS defaults to 1500ms; our Stop hook needs 2-5s
   - What's unclear: Exact timing under CJS (should be faster than Python); whether 10000ms env var setting is already in place or needs adding
   - Recommendation: Add timing probes during development, set env var to 10000ms, measure in real session

2. **PostToolUse tool_input payload size**
   - What we know: PostToolUse receives the full tool_input including file content for Write operations
   - What's unclear: Maximum payload size; memory impact of buffering large file writes
   - Recommendation: Parse JSON, extract only `tool_name` and `tool_input.file_path` / `tool_input.filePath`, discard rest immediately

3. **Session naming flag cleanup**
   - What we know: `/tmp/dynamo-session-named-${process.ppid}` files accumulate in /tmp
   - What's unclear: Whether OS tmp cleanup handles this sufficiently or if explicit cleanup is needed
   - Recommendation: Rely on OS tmp cleanup; files are 1 byte; no explicit cleanup needed

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) v24.13.1 |
| Config file | None needed -- uses `node --test tests/*.test.cjs` |
| Quick run command | `cd ~/.claude/dynamo && node --test tests/*.test.cjs` |
| Full suite command | `cd ~/.claude/dynamo && node --test tests/*.test.cjs` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LDG-01 | Dispatcher routes 5 events to correct handlers | unit + integration | `node --test tests/dispatcher.test.cjs` | Wave 0 |
| LDG-02 | SessionStart outputs memory context | unit | `node --test tests/integration.test.cjs` | Wave 0 |
| LDG-03 | UserPromptSubmit searches + curates + names | unit | `node --test tests/integration.test.cjs` | Wave 0 |
| LDG-04 | PostToolUse filters tools, writes episode | unit | `node --test tests/episodes.test.cjs` | Wave 0 |
| LDG-05 | PreCompact extracts knowledge, re-injects | unit | `node --test tests/integration.test.cjs` | Wave 0 |
| LDG-06 | Stop summarizes, writes, names, indexes | unit | `node --test tests/integration.test.cjs` | Wave 0 |
| LDG-07 | Curation degrades gracefully without OpenRouter | unit | `node --test tests/curation.test.cjs` | Wave 0 |
| LDG-08 | Session commands read/write sessions.json | unit | `node --test tests/sessions.test.cjs` | Wave 0 |
| LDG-09 | Two-phase naming (preliminary + refined) | unit | `node --test tests/sessions.test.cjs` | Wave 0 |
| LDG-10 | sessions.json format compatible with existing | unit | `node --test tests/sessions.test.cjs` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd ~/.claude/dynamo && node --test tests/*.test.cjs`
- **Per wave merge:** Full suite + manual pipe-through test for each event
- **Phase gate:** Full suite green + manual smoke test session + settings.json switchover verified

### Wave 0 Gaps
- [ ] `tests/curation.test.cjs` -- covers LDG-07 (curation pipeline, degradation)
- [ ] `tests/episodes.test.cjs` -- covers LDG-04 (episode write, content extraction)
- [ ] `tests/search.test.cjs` -- covers LDG-02, LDG-03 (memory search)
- [ ] `tests/sessions.test.cjs` -- covers LDG-08, LDG-09, LDG-10 (session CRUD, naming, compatibility)
- [ ] `tests/dispatcher.test.cjs` -- covers LDG-01 (event routing)
- [ ] `tests/integration.test.cjs` -- covers LDG-02 through LDG-06 (pipe-through integration)

## Porting Reference: Python LOC to CJS Module Mapping

| Python Source | LOC | CJS Target | Estimated LOC |
|---------------|-----|------------|---------------|
| `curate_results()` + `summarize_text()` + `generate_session_name()` | 130 | `curation.cjs` | 100-120 |
| `cmd_add_episode()` + `_extract_content()` | 30 | `episodes.cjs` | 30-40 |
| `cmd_search()` | 40 | `search.cjs` | 40-50 |
| Session commands (list, view, label, backfill, index) + load/save | 210 | `sessions.cjs` | 180-220 |
| `session-start.sh` | 59 | `hooks/session-start.cjs` | 50-60 |
| `prompt-augment.sh` | 67 | `hooks/prompt-augment.cjs` | 55-65 |
| `capture-change.sh` | 59 | `hooks/capture-change.cjs` | 30-40 |
| `preserve-knowledge.sh` | 57 | `hooks/preserve-knowledge.cjs` | 35-45 |
| `session-summary.sh` | 83 | `hooks/session-summary.cjs` | 60-80 |
| (new) Dispatcher | 0 | `hooks/dynamo-hooks.cjs` | 60-70 |
| **Total** | **~735** | | **~640-790** |

## Sources

### Primary (HIGH confidence)
- `~/.claude/graphiti/graphiti-helper.py` -- Python port source (944 LOC), directly inspected
- `~/.claude/graphiti/hooks/*.sh` -- 5 Bash hook scripts, directly inspected
- `~/.claude/dynamo/lib/core.cjs` -- Phase 8 shared substrate, directly inspected
- `~/.claude/dynamo/lib/ledger/mcp-client.cjs` -- Phase 8 MCP client, directly inspected
- `~/.claude/dynamo/lib/ledger/scope.cjs` -- Phase 8 scope module, directly inspected
- `~/.claude/dynamo/tests/regression.test.cjs` -- Phase 8 regression tests 10-12, directly inspected
- `~/.claude/settings.json` -- Current hook registrations, directly inspected
- `~/.claude/graphiti/sessions.json` -- Existing session index (50 entries), directly inspected
- `~/.claude/dynamo/prompts/*.md` -- 5 prompt templates, directly inspected
- `~/.claude/dynamo/config.json` -- Dynamo configuration, directly inspected
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- Official specification for all hook events, stdin fields, timeout caps, CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS
- `.planning/research/ARCHITECTURE.md` -- Module structure, data flow, settings.json target
- `.planning/research/PITFALLS.md` -- 10 pitfalls with prevention strategies

### Secondary (MEDIUM confidence)
- [OpenRouter Claude Haiku 4.5](https://openrouter.ai/anthropic/claude-haiku-4.5) -- Model ID confirmed active, pricing verified
- [Claude Code Hooks Guide](https://claudefa.st/blog/tools/hooks/hooks-guide) -- Community documentation of 12 lifecycle events

### Tertiary (LOW confidence)
- None -- all findings verified against primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all modules inspected, Phase 8 substrate verified with passing tests
- Architecture: HIGH -- pattern proven by gsd-context-monitor.js and detailed in ARCHITECTURE.md
- Pitfalls: HIGH -- derived from PITFALLS.md research, v1.1 diagnostic history, and official docs
- Stop hook timeout: HIGH -- confirmed via official Claude Code hooks specification
- Haiku model stability: HIGH -- confirmed active on OpenRouter as of March 2026

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (30 days -- stable domain, no fast-moving dependencies)
