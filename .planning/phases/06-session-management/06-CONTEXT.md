# Phase 6: Session Management - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Make sessions navigable: the user can browse, view, label, and auto-name sessions through Claude Code without touching raw Neo4j or config files. Four requirements: list sessions chronologically (SESS-01), view a specific session's content (SESS-02), manually label/rename a session (SESS-03), auto-generate meaningful session names (SESS-04).

</domain>

<decisions>
## Implementation Decisions

### Session discovery mechanism
- Local session index file at `~/.claude/graphiti/sessions.json` — the source of truth for what sessions exist
- session-summary.sh appends to this index at Stop time with timestamp, project, and name
- Listing reads the local file — instant, no API calls required
- Graphiti remains the source of truth for session CONTENT; the index tracks existence and metadata only
- Lazy backfill: on first `list-sessions` request, scan Graphiti for existing `session-*` episodes and populate the index. Then session-summary.sh maintains it going forward
- Project-scoped by default: list shows sessions for current project. User can ask for "all sessions" to see cross-project

### Session index entry fields
- Minimal per entry: timestamp, project name, label (auto-generated or user-assigned)
- Session content fetched from Graphiti on demand when viewing (not stored in index)
- Keeps the index file small and fast to read

### Label and name storage
- Labels stored in sessions.json index only — not propagated to Graphiti
- Both user-assigned labels and auto-generated names use the same `label` field
- User-assigned labels overwrite auto-generated names
- Fuzzy match support: `list-sessions --filter` does case-insensitive substring match against labels for retrieval by name

### Auto-naming strategy
- Haiku generates session names from context
- Two-phase naming:
  1. **Preliminary name at first substantial prompt**: prompt-augment.sh (UserPromptSubmit hook) detects the first prompt >15 chars and calls Haiku to generate a 3-5 word name from the prompt text. Writes to sessions.json immediately.
  2. **Refined name at session end**: session-summary.sh calls Haiku to generate a refined name from the full session summary. Overwrites the preliminary name in sessions.json (unless user has manually labeled it).
- Extra Haiku call per session is acceptable (~$0.001 per call)

### Claude's Discretion
- Exact sessions.json schema (array vs object, field names)
- Haiku prompt wording for name generation
- How backfill scans Graphiti (search vs get_episodes, batch size)
- graphiti-helper.py subcommand names and flag conventions
- Whether preliminary name generation is a new hook or added to existing prompt-augment.sh
- Error handling when sessions.json is corrupted or missing

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior research (session management gaps)
- `.planning/phases/02-research/memory/MEMO-02-SESSIONS.md` — v1.0 research documenting session discovery gap: no `list_group_ids` API, sessions undiscoverable without timestamps, dual-scope storage pattern

### Current session hook
- `~/.claude/graphiti/hooks/session-summary.sh` — Stop hook that stores session summaries dual-scope (project-{name} + session-{timestamp}). This is the hook that will be extended to write to sessions.json
- `~/.claude/graphiti/hooks/prompt-augment.sh` — UserPromptSubmit hook that will be extended for preliminary session naming

### Infrastructure
- `~/.claude/graphiti/graphiti-helper.py` — Python bridge. New subcommands needed: `list-sessions`, `view-session`, `label-session`, `backfill-sessions`. Existing: `search`, `add-episode`, `health-check`, `detect-project`, `summarize-session`

### Phase 5 context (scope format)
- `~/.claude/graphiti/SCOPE_FALLBACK.md` — Dash separator format: `session-{timestamp}`, `project-{name}`

### Phase 4/5 diagnostics
- `~/.claude/graphiti/diagnose.py` — 10-stage diagnostic probe (may need session-related stages added in Phase 7)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `graphiti-helper.py` MCPClient class: Already implements MCP HTTP transport with session management, SSE parsing, tool calling. New subcommands can reuse this for searching/retrieving sessions.
- `graphiti-helper.py summarize-session`: Haiku summarization already implemented. Auto-naming can use a similar pattern with a different prompt.
- `graphiti-helper.py search`: Supports `--scope` and `--limit`. Backfill can use this to find existing `session-*` episodes.
- `session-summary.sh`: Already generates timestamps, detects project, stores dual-scope. Natural place to add sessions.json write.
- `prompt-augment.sh`: Already fires on every prompt >15 chars, detects project. Natural place for preliminary name generation.

### Established Patterns
- All hooks use `$HELPER` variable pointing to venv Python + graphiti-helper.py
- All hooks read JSON from stdin via `INPUT=$(cat)` and extract fields with `jq`
- Error logging via `log_error()` function writing to stderr + `~/.claude/graphiti/hook-errors.log`
- Once-per-session health check with PPID-keyed flag file
- Project detection via `detect-project` command
- Scope format: `project-{name}`, `session-{timestamp}`, `global`

### Integration Points
- Claude Code uses natural language — user says "list my sessions" and Claude invokes graphiti-helper.py or MCP tools
- graphiti-helper.py CLI is callable from Bash tool in Claude Code sessions
- Graphiti MCP tools (`get_episodes`, `search_memory_facts`) available via MCP for session content retrieval
- sessions.json is a new local file that hooks write to and CLI commands read from

</code_context>

<specifics>
## Specific Ideas

- The backfill mechanism should be transparent — if the index doesn't exist or is empty, the first list-sessions call builds it automatically
- User manually labeling should feel like a simple rename: "rename session 3 to 'Hook Reliability Fix'"
- The preliminary name from first prompt gives immediate identity to a session even if it ends abnormally (crash, context reset)

</specifics>

<deferred>
## Deferred Ideas

### Intelligent Scope Routing (user-raised)
Two related capabilities that enhance hook context quality beyond Phase 6:

1. **Scope decision engine** — Analyze prompt intent to decide which scopes to search. Today prompt-augment.sh does naive "project first, global if empty" cascade. A real decision engine would detect cross-project references (e.g., "how did I handle auth in Frostgale?" from my-cc-setup should search `project-frostgale`) and choose global vs project vs multi-project based on prompt content.

2. **Session preload engine** — At session start or first substantial prompt, proactively inject the right context. Today session-start.sh does a basic project-scope search. A preload engine would distinguish "continuation of yesterday's work" from "fresh topic" and load appropriate context (recent session state vs broad project overview).

Both are hook intelligence enhancements — candidates for a future "Hook Intelligence" phase or addition to HKENH requirements.

</deferred>

---

*Phase: 06-session-management*
*Context gathered: 2026-03-17*
