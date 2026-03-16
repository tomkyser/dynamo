# Claude Code + Graphiti Memory System

A self-managed memory and context engineering system for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) powered by [Graphiti](https://github.com/getzep/graphiti) — a temporal knowledge graph built on Neo4j.

Replaces Claude Code's built-in flat-file memory (`MEMORY.md`) with a persistent, semantically searchable knowledge graph that automatically captures context, enriches prompts, and preserves knowledge across sessions.

## What It Does

- **Automatic context injection** — every session starts with relevant preferences, project context, and recent session summaries pulled from the graph
- **Prompt augmentation** — every user prompt is enriched with semantically relevant memories before Claude processes it
- **Change tracking** — file edits are captured as episodes in the knowledge graph
- **Session summarization** — when a session ends, Haiku summarizes the conversation and stores it
- **Pre-compaction preservation** — before context window compression, key knowledge is extracted and re-injected
- **Haiku curation pipeline** — all retrieved memories pass through Claude Haiku to filter noise and return only what's relevant

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Claude Code                           │
│                                                             │
│  SessionStart ──► session-start.sh ──► [GRAPHITI MEMORY     │
│  UserPrompt   ──► prompt-augment.sh ──► CONTEXT]            │
│  PostToolUse  ──► capture-change.sh ──► (async fire+forget) │
│  PreCompact   ──► preserve-knowledge.sh ──► [PRESERVED CTX] │
│  Stop         ──► session-summary.sh ──► (async store)      │
│                                                             │
│  MCP Tools    ──► mcp__graphiti__* ──► (active, on-demand)  │
└─────────────┬───────────────────────────────┬───────────────┘
              │ hooks (passive)               │ MCP (active)
              ▼                               ▼
┌─────────────────────┐         ┌─────────────────────────┐
│  graphiti-helper.py  │         │  Graphiti MCP Server     │
│  (CLI bridge +       │────────►│  (zepai/knowledge-       │
│   Haiku curation)    │         │   graph-mcp:standalone)  │
└─────────────────────┘         └────────────┬────────────┘
                                             │
                                ┌────────────▼────────────┐
                                │  Neo4j 5.26+            │
                                │  (graph database)       │
                                └─────────────────────────┘
                                             │
                  ┌──────────────────────────┼──────────────┐
                  │                          │              │
           ┌──────▼──────┐  ┌───────────────▼┐  ┌─────────▼────────┐
           │ OpenRouter   │  │ OpenRouter      │  │ Haiku Curation   │
           │ LLM (Haiku)  │  │ Embeddings      │  │ (prompt filter)  │
           │ entity       │  │ (text-embedding- │  │                  │
           │ extraction   │  │  3-small)        │  │                  │
           └──────────────┘  └─────────────────┘  └──────────────────┘
```

## Prerequisites

- **macOS or Linux** (tested on macOS Darwin 25.x)
- **Docker** and **Docker Compose**
- **Python 3.11+** with `uv` or `pip`
- **Claude Code** v2.1+ (CLI)
- **OpenRouter API key** — used for both LLM (entity extraction) and embeddings
- **jq** — for JSON parsing in hook scripts

## Quick Start

### 1. Clone and set up

```bash
git clone <this-repo> ~/my-cc-setup
cd ~/my-cc-setup
```

### 2. Create your `.env`

```bash
cp graphiti/.env.example graphiti/.env
# Edit graphiti/.env with your API keys
```

### 3. Install to `~/.claude/graphiti/`

```bash
./install.sh
```

This copies files to `~/.claude/graphiti/`, creates the Python venv, registers the MCP server, and merges hook definitions into your settings.

### 4. Start the stack

```bash
~/.claude/graphiti/start-graphiti.sh
```

### 5. Restart Claude Code

The MCP tools and hooks activate on a fresh session.

## File Structure

```
~/.claude/graphiti/                  # Installed location
├── docker-compose.yml               # Neo4j + Graphiti MCP server
├── config.yaml                      # Graphiti server config (LLM, embeddings, entity types)
├── .env                             # API keys (never committed)
├── graphiti-helper.py               # CLI bridge: hooks → MCP server + Haiku curation
├── requirements.txt                 # Python deps (httpx, pyyaml, anthropic)
├── start-graphiti.sh                # Start Docker stack + health wait
├── stop-graphiti.sh                 # Stop Docker stack (preserves data)
├── curation/
│   └── prompts.yaml                 # Haiku curation prompt templates
└── hooks/
    ├── session-start.sh             # SessionStart: inject global + project context
    ├── prompt-augment.sh            # UserPromptSubmit: semantic search per prompt
    ├── capture-change.sh            # PostToolUse: async file change tracking
    ├── preserve-knowledge.sh        # PreCompact: extract + re-inject key knowledge
    └── session-summary.sh           # Stop: summarize + store session

~/.claude/CLAUDE.md                  # Memory system rules for Claude
~/.claude/settings.json              # Hook definitions + MCP permissions
~/.claude.json                       # MCP server registration (user scope)
```

## How Memory Scoping Works

All data in Graphiti is organized by `group_id`:

| Scope | Format | What's Stored | Example |
|-------|--------|---------------|---------|
| Global | `global` | User preferences, workflow patterns, tools | "Prefers Claude Opus with high effort" |
| Project | `project:{name}` | Architecture, decisions, conventions | "Uses DDEV for local WordPress dev" |
| Session | `session:{timestamp}` | Conversation summaries | "Implemented auth module, decided on JWT" |
| Task | `task:{descriptor}` | Task requirements, progress | "Migrate from REST to GraphQL" |

Project names are auto-detected from git remotes, `package.json`, `composer.json`, `pyproject.toml`, or `.ddev/config.yaml`.

## Hook Details

### SessionStart (`startup|resume` and `compact`)

Fires when Claude Code starts or resumes a session, or after context compaction.

1. Health-checks the Graphiti server
2. Detects the project from the working directory
3. Searches global scope for user preferences
4. Searches project scope for architecture/decisions (if in a project)
5. Searches project scope for recent session summaries
6. All results pass through Haiku curation
7. Outputs `[GRAPHITI MEMORY CONTEXT]` block to Claude's context

### UserPromptSubmit (every prompt)

Fires on every user message (skips prompts < 15 chars).

1. Searches project scope first, falls back to global
2. Haiku curates results against the actual prompt
3. Outputs `[RELEVANT MEMORY]` block (suppressed if nothing relevant)

### PostToolUse (`Write|Edit|MultiEdit`)

Fires after any file edit.

1. Captures `"File {tool}: {filepath}"` as a fire-and-forget episode
2. Backgrounded (`&`) — never blocks editing

### PreCompact

Fires before context window compression.

1. Summarizes the conversation via Haiku
2. Stores the summary in the project scope
3. Re-injects as `[PRESERVED CONTEXT]` so Claude retains key facts

### Stop

Fires when a session ends.

1. Guards against infinite loops (`stop_hook_active` check)
2. Summarizes the session via Haiku
3. Stores in both project scope and session scope

## MCP Tools (Active/Manual)

When the MCP server is connected, Claude Code has direct access to these tools:

| Tool | Purpose |
|------|---------|
| `mcp__graphiti__add_memory` | Store new knowledge |
| `mcp__graphiti__search_memory_facts` | Search for facts (entity relationships) |
| `mcp__graphiti__search_nodes` | Search for entity nodes |
| `mcp__graphiti__get_episodes` | List episodes by scope |
| `mcp__graphiti__get_entity_edge` | Inspect a specific relationship |
| `mcp__graphiti__delete_episode` | Remove an episode |
| `mcp__graphiti__delete_entity_edge` | Remove a relationship |
| `mcp__graphiti__clear_graph` | Wipe all data for a scope (destructive) |
| `mcp__graphiti__get_status` | Check server health |

Usage examples (as Claude Code would use them):
- "Remember that this project uses JWT for auth" → `add_memory` with `group_id: "project:myapp"`
- "What do you know about my dev setup?" → `search_memory_facts` + `search_nodes` with `group_id: "global"`
- "Forget the outdated migration notes" → `delete_episode` by UUID

## Configuration Details

### Docker Compose

- **Neo4j 5.26.0** — ports offset to `7475`/`7688` to avoid conflicts with other local services (e.g., DDEV)
- **Graphiti MCP** (`zepai/knowledge-graph-mcp:standalone`) — port `8100`
- Memory capped at 256m heap / 512m max / 256m pagecache for coexistence with other Docker services
- Data persists in Docker volumes (`neo4j_data`, `neo4j_logs`)

### config.yaml

- **LLM**: `anthropic/claude-haiku-4.5` via OpenRouter (OpenAI-compatible provider)
- **Embeddings**: `openai/text-embedding-3-small` via OpenRouter
- **12 custom entity types**: Preference, ArchitecturalDecision, ProjectConvention, Requirement, Procedure, CodePattern, BugPattern, TechDebt, WorkflowPreference, Organization, Document, Topic
- `temperature: 1.0` required for Anthropic models via OpenRouter (known workaround)

### Haiku Curation Pipeline

The `graphiti-helper.py` includes a curation step where broad search results are filtered through Claude Haiku (via OpenRouter) before being injected into Claude's context. This prevents context bloat from irrelevant memories.

4 prompt templates in `curation/prompts.yaml`:
- `curate_session_context` — for SessionStart
- `curate_prompt_context` — for UserPromptSubmit
- `summarize_session` — for Stop and PreCompact
- `curate_precompact` — for PreCompact knowledge extraction

## Troubleshooting

### MCP tools not showing up

The MCP server must be registered in **`~/.claude.json`** (user scope), not `~/.claude/.mcp.json`:

```bash
claude mcp add --transport http --scope user graphiti http://localhost:8100/mcp
```

Verify:
```bash
cat ~/.claude.json | jq '.mcpServers'
```

Restart Claude Code after adding.

### Hooks working but MCP tools aren't

Hooks use `graphiti-helper.py` which connects directly to the HTTP endpoint — this is independent of Claude Code's MCP client. The MCP tools require proper registration in `~/.claude.json` and a fresh session.

### Server health check failing

```bash
# Check containers
docker compose -f ~/.claude/graphiti/docker-compose.yml ps

# Check health endpoint
curl http://localhost:8100/health

# View server logs
docker logs graphiti-mcp --tail 50

# Full restart
~/.claude/graphiti/stop-graphiti.sh
~/.claude/graphiti/start-graphiti.sh
```

### Neo4j memory issues

If Neo4j is consuming too much memory, adjust in `docker-compose.yml`:
```yaml
- NEO4J_server_memory_heap_initial__size=128m
- NEO4J_server_memory_heap_max__size=256m
- NEO4J_server_memory_pagecache_size=128m
```

### Stale MCP session

If tools return "invalid session ID" errors, restart Claude Code entirely. The MCP client caches session IDs and doesn't refresh them after server restarts.

## Key Design Decisions

1. **OpenRouter as unified provider** — avoids needing separate OpenAI and Anthropic accounts. Both LLM (Haiku for entity extraction) and embeddings (text-embedding-3-small) route through OpenRouter's OpenAI-compatible API.

2. **Hooks for passive, MCP for active** — hooks provide zero-friction automatic memory. MCP tools provide on-demand explicit control. Both paths work independently.

3. **Haiku curation** — raw Graphiti search results can be noisy. Every retrieval passes through a Haiku call that filters to 3-5 most relevant items. This is the key to preventing context bloat.

4. **Fire-and-forget for writes** — `capture-change.sh` and `session-summary.sh` background their Graphiti calls so they never block the user.

5. **Graceful degradation** — every hook exits cleanly if Graphiti is down. Claude Code continues working normally without memory, and the user is informed.

## License

MIT
