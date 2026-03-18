# Architecture Analysis: Dynamo

**Analysis date:** 2026-03-18
**Codebase:** Node/CJS, ~7,000 LOC (3,585 production + 3,382 test)

## System Overview

Dynamo is a Claude Code power-user platform with three components:

### Component Architecture

| Component | Directory | Responsibility | Key Files |
|-----------|-----------|----------------|-----------|
| Dynamo | `dynamo/` | Orchestration -- CLI router, hook dispatcher, config, shared substrate | `dynamo.cjs`, `core.cjs`, `hooks/dynamo-hooks.cjs`, `config.json` |
| Ledger | `ledger/` | Memory -- knowledge graph operations, search, episodes, curation, sessions | `mcp-client.cjs`, `search.cjs`, `episodes.cjs`, `curation.cjs`, `sessions.cjs`, `scope.cjs` |
| Switchboard | `switchboard/` | Operations -- install, sync, health-check, diagnose, verify-memory, stack mgmt | `install.cjs`, `sync.cjs`, `health-check.cjs`, `diagnose.cjs`, `verify-memory.cjs`, `stack.cjs` |

### Data Flow

Two entry points into Dynamo:

1. **CLI invocation**: `node dynamo.cjs <command>` -> switch/case router -> delegates to Ledger (memory commands) or Switchboard (ops commands)
2. **Hook events**: Claude Code sends stdin JSON -> `dynamo-hooks.cjs` dispatcher -> toggle gate -> project detection -> routes to Ledger hook handlers

### Import Boundaries

- `dynamo/core.cjs` is the shared substrate -- all components may import from it
- Ledger and Switchboard do NOT import from each other
- `core.cjs` uses Object.assign(module.exports) pattern to break circular dependency with ledger modules it re-exports
- Each hook handler in `ledger/hooks/` imports from `ledger/` modules and `dynamo/core.cjs` only

### External Dependencies

- **Graphiti MCP Server** (Docker): JSON-RPC over HTTP via SSE, accessed through `ledger/mcp-client.cjs`
- **Neo4j 5.26** (Docker): Graph database backend for Graphiti, ports 7475 (browser) / 7688 (Bolt)
- **OpenRouter API**: Haiku curation pipeline via `ledger/curation.cjs`, model `anthropic/claude-haiku-4.5`
- **No npm dependencies** beyond js-yaml (zero-bloat philosophy)

### Toggle Mechanism

Global on/off toggle in `config.json` (`enabled` field). `dynamo/core.cjs` `isEnabled()` checks:
- `config.enabled !== false` (default: true)
- `process.env.DYNAMO_DEV === '1'` overrides global off for dev threads
- Hook dispatcher exits silently when disabled
- CLI commands error with message when disabled

### Deployment Model

Repo layout (development) -> `dynamo install` or `dynamo sync` -> Deployed layout at `~/.claude/dynamo/`

---

*Architecture analysis: 2026-03-18*
