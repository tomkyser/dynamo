# Integrations Analysis: Dynamo

**Analysis date:** 2026-03-18

## Claude Code Integration

### Hook System
- 5 hooks registered in `~/.claude/settings.json` via `claude-config/settings-hooks.json`
- All hooks point to `~/.claude/dynamo/hooks/dynamo-hooks.cjs`
- Hook events: SessionStart, UserPromptSubmit, PostToolUse, PreCompact, Stop
- Claude Code sends JSON on stdin with `hook_event_name` field
- Single dispatcher (`dynamo-hooks.cjs`) routes to appropriate `ledger/hooks/` handler

### CLAUDE.md Integration
- Template at `claude-config/CLAUDE.md.template`
- User manually incorporates into `~/.claude/CLAUDE.md`
- Provides operational instructions for Claude Code to use Dynamo CLI
- NOT auto-deployed by installer (users have custom CLAUDE.md content)

### Settings.json Integration
- `switchboard/install.cjs` merges hook definitions into `~/.claude/settings.json`
- Backup created at `settings.json.bak` before modification
- Rollback command restores backup

## Graphiti MCP Server Integration

### Connection
- `ledger/mcp-client.cjs` provides `MCPClient` class
- JSON-RPC 2.0 over HTTP with SSE (Server-Sent Events) response parsing
- Endpoint: `http://localhost:8100/mcp` (configurable in config.json)
- Health endpoint: `http://localhost:8100/health`

### Operations
- `add_memory`: Store episodes with group_id scoping
- `search_memory_facts`: Semantic fact search
- `search_memory_nodes`: Entity node search
- `get_episodes`: List episodes by scope
- `get_entity_edge`: Inspect specific relationship
- `delete_episode`: Remove episode by UUID
- `delete_entity_edge`: Remove relationship by UUID
- `clear_graph`: Wipe all data for a scope

### Docker Stack
- Managed by `switchboard/stack.cjs` (wraps docker compose)
- Config at `ledger/graphiti/docker-compose.yml`
- Deployed to `~/.claude/graphiti/` (separate from dynamo/)
- Neo4j data persists in Docker volumes (`neo4j_data`, `neo4j_logs`)

## OpenRouter Integration

### Curation Pipeline
- `ledger/curation.cjs` calls OpenRouter API
- Model: `anthropic/claude-haiku-4.5`
- API URL: `https://openrouter.ai/api/v1/chat/completions`
- Used for: memory curation, session summarization, knowledge extraction
- 5 prompt templates in `dynamo/prompts/` directory
- `temperature: 1.0` required for Anthropic models via OpenRouter

### Authentication
- `OPENROUTER_API_KEY` environment variable
- Loaded from `~/.claude/graphiti/.env` by config loading in core.cjs

## File System Integration

### Sync Pairs (repo -> deployed)
- `dynamo/` -> `~/.claude/dynamo/` (excludes: tests)
- `ledger/` -> `~/.claude/dynamo/ledger/`
- `switchboard/` -> `~/.claude/dynamo/switchboard/`
- Content-based comparison using Buffer.compare (not mtime)
- Bidirectional: detects which side is newer

### Config Generation
- `dynamo/config.json` is the template
- `install.cjs` generates deployed config at `~/.claude/dynamo/config.json`
- `.env` values merged into config during install

---

*Integration analysis: 2026-03-18*
