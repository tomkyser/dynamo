# Technology Stack: v1.3-M2 Core Intelligence

**Project:** Dynamo v1.3-M2
**Researched:** 2026-03-20
**Mode:** Stack additions for new capabilities (not re-researching existing stack)
**Constraint:** Zero npm dependencies -- all additions must use Node.js built-ins or hand-rolled CJS
**Confidence:** HIGH (verified against official docs, platform inspection, and current codebase)

---

## 1. Executive Summary

v1.3-M2 requires eight technical capability domains: cognitive processing (activation maps, sublimation scoring, entity extraction), dual-path routing (hot CJS path + custom subagent deliberation), cost monitoring (SQLite-backed budget tracking), hooks-as-primary-behavior (dispatcher refactoring), modular injection control (feature flags), memory backfill (JSONL transcript parsing), bare CLI invocation (shell shim), and Graphiti small_model support (Docker image update).

**All eight domains are achievable within the zero-npm-dependency constraint.** The cognitive processing engine is pure arithmetic in CJS. The custom subagent uses Claude Code's native `~/.claude/agents/` system with YAML frontmatter. Cost tracking extends the existing SQLite infrastructure (node:sqlite DatabaseSync). Transcript parsing uses Node.js built-in JSONL line reading. The bare CLI shim is a symlink to the already-shebanged `dynamo.cjs`.

No new npm packages. No new external service dependencies beyond what already exists (OpenRouter for Haiku, Graphiti MCP for knowledge graph). The Anthropic Messages API (direct HTTP) is used only as fallback for non-subscription users.

---

## 2. Cognitive Processing Engine (CORTEX-01)

### 2.1 Activation Map Management

**Technology:** Pure CJS arithmetic + JSON state persistence

**Why:** The activation map is a plain JavaScript object keyed by entity UUIDs. Spreading activation is BFS graph traversal with numeric decay -- no matrix math, no embeddings library, no external compute. All operations are deterministic and complete in <50ms.

| Component | Implementation | Built-in Used |
|-----------|---------------|---------------|
| Activation map | `Object<uuid, {level, sources, last_activated, convergence_count}>` | Plain JS objects |
| Decay computation | `level * Math.exp(-decayRate * timeDeltaMinutes)` | `Math.exp`, `Date.now()` |
| Convergence bonus | `level *= 1.5` when independent paths converge | Arithmetic |
| BFS propagation | Iterative BFS through graph adjacency (1-hop, v1.3) | Array/Set iteration |
| State persistence | Atomic JSON write (tmp + rename pattern from existing codebase) | `node:fs`, `node:crypto` for randomUUID |

**Key data structure -- `inner-voice-state.json` activation_map section:**

```javascript
{
  "entity_uuid": {
    "level": 0.85,          // 0.0 - 1.0, decays over time
    "sources": ["direct_mention", "association"],
    "last_activated": "2026-03-20T15:58:00Z",
    "convergence_count": 2  // independent activation paths
  }
}
```

**Graph queries for propagation:** Uses existing `assay/search.cjs` (via Graphiti MCP) to fetch 1-hop neighbors of anchor entities. No new transport code. The Assay interface already returns entity-relationship data that provides the adjacency information needed for BFS.

### 2.2 Sublimation Threshold

**Technology:** Composite scoring function -- pure arithmetic

```
sublimation_score(entity) =
    activation_level             // from activation map (0.0-1.0)
  * surprise_factor              // 1.0 - keyword_overlap(entity, predictions)
  * relevance_ratio              // keyword_overlap(entity, current_prompt)
  * (1 - cognitive_load_penalty) // heuristic: session_age, turn_count, prompt_length
  * confidence_weight            // time-decayed from entity last verification
```

**v1.3 simplification:** The `surprise_factor` and `relevance_ratio` use keyword overlap scoring (Jaccard similarity of tokenized terms), not embeddings. Embedding-based cosine similarity is a v1.4 capability (MENH-08, local embeddings). Jaccard similarity is cheap, deterministic, and sufficient for the threshold function.

```javascript
// Keyword overlap (Jaccard similarity) -- zero dependencies
function jaccard(setA, setB) {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}
```

### 2.3 Entity Extraction (Hot Path)

**Technology:** Deterministic pattern matching -- regex + heuristics

Entity extraction on the hot path does NOT use an LLM. It uses pattern matching:
- File paths: `/[\w./\-]+\.\w+/`
- Function/class names: camelCase and PascalCase patterns
- Known entity names from the activation map (exact match against loaded state)
- Domain keywords per frame classification

This is the same approach used by many NER-lite systems for code-centric domains. Accuracy is lower than LLM extraction but latency is <5ms vs 500ms+.

### 2.4 Domain Frame Classification

**Technology:** Keyword/regex heuristic lookup table

```javascript
const FRAME_KEYWORDS = {
  engineering:  ['code', 'function', 'module', 'refactor', 'implement'],
  debugging:    ['error', 'bug', 'fix', 'stack trace', 'failing'],
  architecture: ['design', 'pattern', 'architecture', 'boundary', 'component'],
  social:       ['team', 'meeting', 'review', 'feedback'],
  general:      []  // fallback
};
```

Single dominant frame per prompt in v1.3. Multi-frame fan-out deferred to v1.4 (requires embedding classification from MENH-08).

---

## 3. Dual-Path Routing (CORTEX-02)

### 3.1 Hot Path (<500ms, CJS Command Hooks)

**Technology:** Existing hook dispatcher pattern + new Reverie handler modules

The hot path is pure CJS code that runs within the existing `cc/hooks/dynamo-hooks.cjs` dispatcher. No new infrastructure -- the dispatcher already routes events to handler modules by event name. The change is that handlers migrate from `subsystems/ledger/hooks/` to `subsystems/reverie/handlers/` and gain cognitive processing logic.

**Latency budget verified:**

| Step | Target | Mechanism |
|------|--------|-----------|
| State load (JSON parse) | <5ms | `fs.readFileSync` + `JSON.parse` -- verified on 50KB files |
| Domain classification | <1ms | Keyword lookup table |
| Activation map update | 10-50ms | In-memory object operations + optional Assay search |
| Sublimation scoring | <1ms | Pure arithmetic |
| Template formatting | <5ms | String interpolation |
| State persistence | <5ms | Atomic write (tmp + rename) via `node:crypto.randomUUID()` |
| **Total (no Haiku)** | **<70ms** | Deterministic path |
| **Total (with Haiku)** | **<500ms** | Haiku call adds ~200-400ms |

### 3.2 Deliberation Path (Custom Subagent, 2-10s)

**Technology:** Claude Code custom subagent system (`~/.claude/agents/inner-voice.md`)

**Verified YAML frontmatter fields** (from official Claude Code docs at code.claude.com/docs/en/sub-agents, fetched 2026-03-20):

| Field | Value | Rationale |
|-------|-------|-----------|
| `name` | `inner-voice` | Lowercase + hyphens per spec |
| `description` | Cognitive processing engine for Dynamo memory | Drives automatic delegation decisions |
| `model` | `sonnet` | Alias accepted; resolves to claude-sonnet-4-6. Capable for analysis, cheaper than Opus |
| `tools` | `Read, Grep, Glob, Bash` | Read-only + CLI access for `dynamo search` queries |
| `disallowedTools` | `Write, Edit, Agent` | Reverie observes, does not modify user code or spawn sub-subagents |
| `permissionMode` | `dontAsk` | Auto-deny permission prompts; explicitly allowed tools still work |
| `maxTurns` | `10` | Bounded processing; prevents runaway analysis |
| `memory` | `user` | Persistent at `~/.claude/agent-memory/inner-voice/` |
| `background` | `false` | Foreground for state bridge reliability; background considered for v1.4 |

**Subagent file location:** `~/.claude/agents/inner-voice.md` (user-level, available in all projects). Deployed via `cc/agents/inner-voice.md` in the repo, synced by the install/sync pipeline.

**Additional confirmed fields available (not used in v1.3):**
- `skills` -- could preload Dynamo skills into subagent context (v1.4 consideration)
- `hooks` -- subagent-scoped hooks, e.g., `Stop` in frontmatter auto-converts to `SubagentStop`
- `effort` -- `low`, `medium`, `high`, `max` (Opus only). Default: inherits from session
- `isolation` -- `worktree` for isolated git worktree (not needed for IV processing)

### 3.3 State Bridge Pattern (SubagentStop to UserPromptSubmit)

**Technology:** File-based state bridge -- JSON write/read/delete

**Confirmed from Claude Code hooks documentation (code.claude.com/docs/en/hooks, fetched 2026-03-20):**

SubagentStop hook receives:
- `agent_id` -- unique identifier
- `agent_type` -- matches subagent name ("inner-voice")
- `agent_transcript_path` -- path to subagent's JSONL transcript
- `last_assistant_message` -- text of the subagent's final response (key field)
- `stop_hook_active` -- boolean for loop prevention

SubagentStart hook receives:
- `agent_id` and `agent_type`
- Can return `additionalContext` that is **injected directly into the subagent's prompt** (not the parent's context)

**Critical constraint confirmed:** SubagentStop CANNOT inject into parent context (GitHub issue #5812, closed as NOT_PLANNED). The file-based state bridge is the correct workaround. SubagentStop writes `inner-voice-deliberation-result.json`; the next UserPromptSubmit reads it.

**Hook event routing in settings.json:**

```json
{
  "hooks": {
    "SubagentStart": [{
      "matcher": "inner-voice",
      "hooks": [{
        "type": "command",
        "command": "node \"$HOME/.claude/dynamo/cc/hooks/dynamo-hooks.cjs\""
      }]
    }],
    "SubagentStop": [{
      "matcher": "inner-voice",
      "hooks": [{
        "type": "command",
        "command": "node \"$HOME/.claude/dynamo/cc/hooks/dynamo-hooks.cjs\""
      }]
    }]
  }
}
```

The existing dispatcher at `cc/hooks/dynamo-hooks.cjs` already handles event routing via `data.hook_event_name`. The `VALID_EVENTS` set needs to be extended to include `SubagentStart` and `SubagentStop`.

### 3.4 API Plan Fallback (Direct HTTP)

**Technology:** Node.js built-in `fetch` + Anthropic Messages API

For non-subscription users, the deliberation path falls back to direct API calls instead of custom subagents. Uses the same built-in `fetch` and `AbortSignal.timeout` already used by `lib/core.cjs` for Haiku calls.

```javascript
// Anthropic Messages API -- same fetch pattern as existing curation.cjs
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json'
  },
  body: JSON.stringify({
    model: config.reverie.deliberation.model,
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: 'user', content: deliberationPrompt }]
  }),
  signal: AbortSignal.timeout(config.reverie.deliberation.max_latency_ms)
});
```

**API key requirement:** `ANTHROPIC_API_KEY` in `.env`. Only needed for non-subscription users. The existing `.env` loading infrastructure (`core.cjs > loadEnv()`) handles this.

---

## 4. Cost Monitoring (CORTEX-03)

### 4.1 Data Store

**Technology:** SQLite via `node:sqlite` DatabaseSync (same infrastructure as session storage)

Cost tracking data is small, structured, and needs aggregation queries (sum by day, by month, by operation type). SQLite is the correct tool -- already proven in the codebase for session storage (Phase 21).

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS cost_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,         -- ISO-8601
  operation TEXT NOT NULL,         -- 'hot_haiku', 'deliberation_sonnet', 'session_start', etc.
  model TEXT NOT NULL,             -- 'anthropic/claude-haiku-4.5', 'claude-sonnet-4-6', etc.
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd REAL NOT NULL,          -- computed from token counts and model pricing
  path TEXT NOT NULL,              -- 'hot' | 'deliberation' | 'rem'
  session_id TEXT
);

CREATE TABLE IF NOT EXISTS budget (
  scope TEXT PRIMARY KEY,          -- 'daily' | 'monthly'
  limit_usd REAL NOT NULL,
  reset_at TEXT NOT NULL           -- ISO-8601, next reset time
);

CREATE INDEX IF NOT EXISTS idx_cost_timestamp ON cost_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_cost_operation ON cost_log(operation);
```

### 4.2 Budget Enforcement

**Technology:** Pre-check query before every LLM call

```javascript
function checkBudget(db) {
  const today = new Date().toISOString().slice(0, 10);
  const row = db.prepare(
    'SELECT COALESCE(SUM(cost_usd), 0) as spent FROM cost_log WHERE timestamp >= ?'
  ).get(today + 'T00:00:00Z');

  const budgetRow = db.prepare('SELECT limit_usd FROM budget WHERE scope = ?').get('daily');
  if (budgetRow && row.spent >= budgetRow.limit_usd) {
    return { allowed: false, spent: row.spent, limit: budgetRow.limit_usd };
  }
  return { allowed: true, spent: row.spent };
}
```

When budget is exhausted, all operations fall back to hot-path-only (deterministic, zero LLM cost). The system degrades gracefully from "intelligent" to "functional."

### 4.3 Model Pricing Table

**Technology:** Static lookup table in CJS, updated during `dynamo update`

```javascript
const MODEL_PRICING = {
  'anthropic/claude-haiku-4.5': { input_per_mtok: 0.80, output_per_mtok: 4.00 },
  'claude-sonnet-4-6':          { input_per_mtok: 3.00, output_per_mtok: 15.00 },
  'claude-opus-4-6':            { input_per_mtok: 15.00, output_per_mtok: 75.00 },
};

function computeCost(model, inputTokens, outputTokens) {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0; // Unknown model -- no cost tracked
  return (inputTokens / 1_000_000) * pricing.input_per_mtok
       + (outputTokens / 1_000_000) * pricing.output_per_mtok;
}
```

### 4.4 Integration Point

Cost logging wraps existing LLM call functions. The `curation.cjs > callHaiku()` function already returns response data. Adding a cost log entry after each call requires ~3 lines of integration code per call site.

**Subsystem placement:** `subsystems/terminus/cost-store.cjs` (data infrastructure). Cost enforcement logic lives in `subsystems/reverie/dual-path.cjs` (cognitive decision). This honors the boundary: Terminus provides the pipe (storage), Reverie decides what flows through it (budget enforcement).

---

## 5. Hooks as Primary Behavior (MGMT-05)

### 5.1 Dispatcher Extension

**Technology:** Extended event routing in existing `cc/hooks/dynamo-hooks.cjs`

The dispatcher's `VALID_EVENTS` set and `switch` statement need two additions:

```javascript
const VALID_EVENTS = new Set([
  'SessionStart', 'UserPromptSubmit', 'PostToolUse', 'PreCompact', 'Stop',
  'SubagentStart', 'SubagentStop'  // NEW for v1.3-M2
]);
```

**Handler routing change:** The dispatcher currently routes to `ledger/hooks/`. For M2, it routes to `reverie/handlers/` for cognitive events while maintaining Ledger's PostToolUse handler (file change capture is Ledger's responsibility, not Reverie's).

```javascript
// Dual dispatch for PostToolUse
case 'PostToolUse':
  await require(resolve('ledger', 'hooks/capture-change.cjs'))(ctx);  // Ledger: file capture
  await require(resolve('reverie', 'handlers/post-tool-use.cjs'))(ctx);  // Reverie: activation update
  break;
```

### 5.2 settings.json Hook Registration

**Technology:** Existing install.cjs settings management

The installer already manages `~/.claude/settings.json` hook entries. M2 adds SubagentStart and SubagentStop entries targeting the same dispatcher script. No new infrastructure -- the `subsystems/switchboard/install.cjs` settings merge logic handles this.

---

## 6. Modular Injection Control (MGMT-10)

### 6.1 Feature Flag

**Technology:** `config.json` field + runtime check

```javascript
// In config.json
{
  "reverie": {
    "enabled": true,
    "mode": "cortex"  // "classic" | "cortex"
  }
}
```

The `reverie.mode` field controls which processing path activates:
- `"cortex"` -- Full Inner Voice processing (Reverie handlers)
- `"classic"` -- Legacy Haiku curation (existing Ledger handlers)

**Instant rollback:** `dynamo config set reverie.mode classic` switches back to v1.2 behavior. Zero code changes, zero restart required -- the dispatcher checks the flag on every hook invocation.

### 6.2 Config Command Extension

**Technology:** New `dynamo config` subcommands (CLI router extension)

```bash
dynamo config get reverie.mode     # Read a config value
dynamo config set reverie.mode classic  # Write a config value
```

The CLI router at `dynamo.cjs` already handles 20+ commands. Adding `config get|set` is a simple case branch delegating to a new `lib/config.cjs` utility for safe JSON read/modify/write.

---

## 7. Memory Backfill from Chat Transcripts

### 7.1 Transcript Location and Format

**Technology:** Node.js `readline` or line-by-line `fs.readFileSync` + `JSON.parse`

**Verified transcript location:** `~/.claude/projects/<project-hash>/<session-uuid>.jsonl`

**Verified JSONL line types** (from actual inspection of session files):

| Line Type | Content | Backfill Relevance |
|-----------|---------|-------------------|
| `user` | `{type: "user", message: {role: "user", content: "..."}}` | HIGH -- user prompts are primary backfill source |
| `assistant` | `{type: "assistant", message: {role: "assistant", content: [...]}}` | MEDIUM -- decisions and context |
| `progress` | Hook execution progress | LOW -- operational metadata |
| `system/stop_hook_summary` | Stop hook output | LOW |
| `system/turn_duration` | Timing data | LOW |
| `file-history-snapshot` | File state snapshots | MEDIUM -- what was being worked on |

**Parsing strategy:**

```javascript
const fs = require('node:fs');
const readline = require('node:readline');

async function* parseTranscript(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  for await (const line of rl) {
    try {
      const entry = JSON.parse(line);
      if (entry.type === 'user' || entry.type === 'assistant') {
        yield entry;
      }
    } catch { /* skip malformed lines */ }
  }
}
```

### 7.2 Backfill Pipeline

**Technology:** CJS batch processor feeding Ledger's `episodes.cjs > addEpisode()`

The backfill command (`dynamo backfill`) iterates over transcript files, extracts user/assistant conversation turns, chunks them into episode-sized units, and writes them to the knowledge graph via the existing Ledger write interface.

**Key design decision:** Backfill is a batch operation, not real-time. It runs as a CLI command (`dynamo backfill [--project name] [--since date]`) and processes transcripts sequentially. Rate limiting against the Graphiti MCP server prevents overwhelming the knowledge graph.

**Session metadata from transcript filenames:**
- Session UUID: filename without `.jsonl` extension
- Project: parent directory name decoded from the path-based hash
- Timestamps: from `timestamp` field in each JSONL line

### 7.3 Content Extraction

For backfill, content extraction from assistant messages requires handling the content block array format:

```javascript
function extractAssistantText(message) {
  const content = message?.message?.content;
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');
  }
  return '';
}
```

---

## 8. Bare CLI Invocation (Shell Shim)

### 8.1 Approach

**Technology:** Symlink in `~/.local/bin/` pointing to deployed `dynamo.cjs`

The `dynamo.cjs` file already has `#!/usr/bin/env node` as its first line (verified in both repo and deployed copy). The file is already executable in the functional sense. The missing piece is a symlink from a PATH directory.

**Verified environment:**
- `~/.local/bin/` exists and is in PATH (confirmed: 4 PATH entries include it)
- Other tools (claude, codeman) already use this pattern
- Node.js is accessible via `#!/usr/bin/env node` (nvm-managed, v24.13.1)

### 8.2 Implementation

```bash
# Added to install.cjs (Switchboard)
chmod +x ~/.claude/dynamo/dynamo.cjs  # ensure executable
ln -sf ~/.claude/dynamo/dynamo.cjs ~/.local/bin/dynamo
```

**After installation:** `dynamo search "query"` works directly without `node ~/.claude/dynamo/dynamo.cjs search "query"`.

### 8.3 Uninstall / Rollback

```bash
# Added to rollback path
rm -f ~/.local/bin/dynamo
```

### 8.4 Why Not Other Approaches

| Approach | Why Not |
|----------|---------|
| Shell function in `.zshrc` | Fragile; requires user's shell config modification; breaks in non-interactive shells |
| Shell alias | Same problems as function; doesn't work in scripts or subshells |
| npm global install / `bin` field | Requires package.json, npm infrastructure; violates zero-dependency constraint |
| Copy script to PATH dir | Diverges from source; sync issues; maintenance burden |
| **Symlink (chosen)** | Zero overhead, follows platform convention, self-updating (always points to deployed copy) |

---

## 9. Graphiti small_model Support

### 9.1 Current Status

**PR #1156** (getzep/graphiti): `feat(mcp): add configurable small_model support for OpenAI provider`
- **Status:** Open, not merged (as of 2026-03-20)
- **Issue:** #1155 -- small_model in LLMConfig cannot be configured via config.yaml
- **Impact:** Only affects users running Graphiti with local LLMs (Ollama). Does NOT affect Dynamo's default setup (which uses Graphiti's default OpenAI models via the Docker MCP image).

### 9.2 Relevance to Dynamo

**LOW relevance for M2.** Dynamo uses the `zepai/knowledge-graph-mcp:standalone` Docker image (verified in `~/.claude/graphiti/docker-compose.yml`). This image uses the Graphiti default models (GPT-4.1-mini and GPT-4.1-nano via OpenAI API). The small_model configuration is only needed for users running local LLMs.

**Action:** Monitor PR #1156. If merged before M2 ships, update the Docker image version. If not, no action needed. The Graphiti MCP server works correctly for Dynamo's use case without this PR.

### 9.3 Docker Image Management

The Graphiti Docker image is pinned in `~/.claude/graphiti/docker-compose.yml`. To update:

```yaml
# Current
graphiti-mcp:
  image: zepai/knowledge-graph-mcp:standalone

# To pin a specific version when updating:
graphiti-mcp:
  image: zepai/knowledge-graph-mcp:standalone@sha256:<digest>
```

Neo4j is pinned at `5.26.0` (verified). No upgrade needed for M2.

---

## 10. Update Notes Generation

### 10.1 Approach

**Technology:** Markdown template + CLI command + git log analysis

```bash
dynamo update-notes [--since tag] [--format md|text]
```

The command:
1. Reads git log since the specified tag (or last release tag)
2. Categorizes commits by conventional commit prefix (feat, fix, chore, docs)
3. Generates structured markdown using a template
4. Optionally uses Haiku for polishing prose (same callHaiku pattern from curation.cjs)

**No new dependencies.** Uses `child_process.execSync` for `git log` (already used by `detectProject()` in core.cjs) and string templating.

---

## 11. Recommended Stack Summary

### Core Technologies (All Existing -- No New Dependencies)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | >= 22 (current: 24.13.1) | Runtime | Already required; provides all built-ins needed |
| `node:fs` | Built-in | State file I/O | Atomic read/write for inner-voice-state.json |
| `node:crypto` | Built-in | UUID generation | `randomUUID()` for state file temp names, deliberation IDs |
| `node:sqlite` | Built-in (experimental) | Cost tracking DB | Already proven for session storage (Phase 21) |
| `node:readline` | Built-in | Transcript parsing | Line-by-line JSONL processing for backfill |
| `node:perf_hooks` | Built-in | Latency measurement | `performance.now()` for hot path timing validation |
| `node:child_process` | Built-in | Git operations | `execSync` for update notes, already used by detectProject |

### Claude Code Platform Features (No New Dependencies)

| Feature | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| Custom subagents | Current | Deliberation path | `~/.claude/agents/inner-voice.md` with YAML frontmatter; zero marginal cost on subscription |
| SubagentStart hook | Current | Context injection | Injects IV state into subagent via `additionalContext` |
| SubagentStop hook | Current | Result capture | Reads `last_assistant_message` for state bridge file write |
| Hook `additionalContext` | Current | Memory injection | Returns processed insights to Claude's context per hook event |
| `permissionMode: dontAsk` | Current | Autonomous subagent | Inner Voice operates without user prompts |

### External Services (Already Configured -- No New Dependencies)

| Service | Current Setup | M2 Usage |
|---------|--------------|----------|
| OpenRouter (Haiku) | `.env > OPENROUTER_API_KEY` | Hot path formatting, session naming (unchanged) |
| Graphiti MCP | Docker: `zepai/knowledge-graph-mcp:standalone` | Knowledge graph queries, episode writes (unchanged) |
| Neo4j | Docker: `neo4j:5.26.0` | Graph storage backend (unchanged) |
| Anthropic API | `.env > ANTHROPIC_API_KEY` (NEW, optional) | API plan fallback for deliberation path only |

### Supporting Patterns (Already Established in Codebase)

| Pattern | Current Usage | M2 Extension |
|---------|--------------|-------------|
| Atomic file write (tmp + rename) | session-store.cjs, settings backup | inner-voice-state.json, deliberation-result.json |
| Options-based test isolation | All 515 existing tests | All new Reverie module tests |
| Centralized path resolver | `lib/resolve.cjs` for 8 subsystems | Already resolves `reverie` subsystem path |
| SQLite DatabaseSync | session-store.cjs (Phase 21) | cost-store.cjs (identical pattern) |
| Hook dispatcher routing | 5 events in dynamo-hooks.cjs | Extended to 7 events (+SubagentStart, +SubagentStop) |
| Config.json runtime check | `isEnabled()` toggle gate | `reverie.mode` feature flag gate |

---

## 12. Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Keyword overlap (Jaccard) for v1.3 similarity | npm: `natural`, `compromise`, or TF-IDF | Violates zero-dependency constraint; embedding-based approach deferred to v1.4 (MENH-08) |
| SQLite for cost tracking | JSON file | Need aggregation queries (SUM by day/month); JSON scanning is O(n); SQLite is O(log n) with indexes |
| Custom subagent for deliberation | Direct Anthropic API always | Subscription users get zero marginal cost via subagent; API-only wastes the subscription benefit |
| Symlink for bare CLI | npm `bin` field or shell function | Symlink is simplest, follows platform convention, self-updating; npm adds unnecessary infrastructure |
| File-based state bridge | In-memory IPC, named pipes | Subagent runs in separate process; no shared memory; file bridge is the only reliable cross-process pattern in Claude Code's architecture |
| Regex entity extraction (hot path) | LLM-based NER | Hot path latency budget (<500ms) cannot accommodate an LLM call for entity extraction |
| `perf_hooks.performance.now()` for timing | `Date.now()` | `performance.now()` provides sub-millisecond resolution; important for validating hot path stays under 500ms |

---

## 13. What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| npm packages for NLP/ML | Violates zero-dependency constraint; adds installation complexity | Built-in regex/Jaccard for v1.3; local embeddings (MENH-08) for v1.4 |
| ESM modules | CJS is the standard in this ecosystem; all 27 existing modules are CJS | CJS with `require()` |
| TypeScript | Adds build step; no compilation dependency allowed | JSDoc comments for type hints where needed |
| WebSocket for state bridge | Overengineered; Claude Code subagents are separate processes with no native IPC | File-based JSON state bridge |
| External embedding API (e.g., OpenAI embeddings) | Adds latency (network round-trip) and cost to the hot path | Keyword overlap for v1.3; local embeddings for v1.4 |
| Redis/Memcached for activation map | Overkill for single-user system; adds infrastructure dependency | In-memory JS object + JSON file persistence |
| `node:worker_threads` for parallel processing | Adds complexity; activation map processing is fast enough single-threaded | Sequential processing within the 500ms budget |
| `process.env` for feature flags | Not persistent; lost between process invocations | `config.json` field checked at runtime |

---

## 14. Version Compatibility

| Component | Required Version | Verified | Notes |
|-----------|-----------------|----------|-------|
| Node.js | >= 22 | v24.13.1 on this machine | Required for `node:sqlite`, native `fetch`, `crypto.randomUUID()` |
| `node:sqlite` | Experimental (Node >= 22) | Works on v24.13.1 | DatabaseSync API used; experimental warning suppressed |
| Claude Code | >= 2.1.63 | v2.1.80 on this machine | Required for SubagentStart/Stop hooks, custom agents, Agent tool (renamed from Task) |
| Graphiti MCP | `standalone` tag | Current Docker image | No version-specific requirements for M2 |
| Neo4j | 5.x | 5.26.0 | No version-specific requirements for M2 |

---

## 15. New Files Created by M2

| File | Subsystem | Purpose |
|------|-----------|---------|
| `subsystems/reverie/inner-voice.cjs` | Reverie | Core pipeline orchestrator |
| `subsystems/reverie/dual-path.cjs` | Reverie | Hot/deliberation path routing |
| `subsystems/reverie/activation.cjs` | Reverie | Activation map management |
| `subsystems/reverie/curation.cjs` | Reverie | Intelligent curation (migrated from Ledger) |
| `subsystems/reverie/handlers/session-start.cjs` | Reverie | SessionStart handler |
| `subsystems/reverie/handlers/user-prompt.cjs` | Reverie | UserPromptSubmit handler |
| `subsystems/reverie/handlers/pre-compact.cjs` | Reverie | PreCompact handler |
| `subsystems/reverie/handlers/stop.cjs` | Reverie | Stop handler |
| `subsystems/reverie/handlers/post-tool-use.cjs` | Reverie | PostToolUse activation update |
| `subsystems/reverie/handlers/iv-subagent-start.cjs` | Reverie | SubagentStart handler |
| `subsystems/reverie/handlers/iv-subagent-stop.cjs` | Reverie | SubagentStop handler |
| `subsystems/terminus/cost-store.cjs` | Terminus | SQLite cost tracking storage |
| `cc/agents/inner-voice.md` | CC (adapter) | Custom subagent definition |
| `cc/prompts/iv-system-prompt.md` | CC (adapter) | Inner Voice system prompt |
| `cc/prompts/session-briefing.md` | CC (adapter) | Session briefing template |
| `cc/prompts/adversarial-counter.md` | CC (adapter) | Counter-prompting template |
| `lib/config.cjs` | Lib | Config get/set utility |

**Migrated (not new):**
- `subsystems/ledger/curation.cjs` LLM functions migrate to `subsystems/reverie/curation.cjs`
- Ledger retains deterministic formatting functions as `subsystems/ledger/format.cjs`

---

## 16. Sources

### Official Documentation (HIGH confidence)
- [Claude Code Custom Subagents](https://code.claude.com/docs/en/sub-agents) -- YAML frontmatter specification, all fields, examples
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- SubagentStart/Stop input/output, additionalContext behavior, all 22 hook events
- [Node.js Crypto API](https://nodejs.org/api/crypto.html) -- randomUUID() documentation

### GitHub Issues/PRs (MEDIUM confidence)
- [Graphiti Issue #1155](https://github.com/getzep/graphiti/issues/1155) -- small_model configuration request (open)
- [Graphiti PR #1156](https://github.com/getzep/graphiti/pull/1156) -- small_model support (open, not merged)
- [Claude Code Issue #5812](https://github.com/anthropics/claude-code/issues/5812) -- additionalParentContext NOT_PLANNED (confirms state bridge necessity)

### Verified on This Machine
- Node.js v24.13.1 built-in capabilities (crypto.randomUUID, node:sqlite, fetch, AbortSignal.timeout)
- `~/.local/bin/` exists and is in PATH (symlink approach confirmed viable)
- Claude Code v2.1.80 installed
- JSONL transcript format and location verified via direct file inspection
- Graphiti Docker compose config verified at `~/.claude/graphiti/docker-compose.yml`

---
*Stack research for: Dynamo v1.3-M2 Core Intelligence*
*Researched: 2026-03-20*
*Previous: M1 STACK.md archived to .planning/research/archive/*
