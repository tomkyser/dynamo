# Structure Analysis: Dynamo

**Analysis date:** 2026-03-18

## Repo Layout (Development)

```
dynamo/                 # Orchestration layer
  dynamo.cjs            # CLI router (25 commands)
  core.cjs              # Shared substrate (config, output, toggle, MCPClient re-exports)
  config.json           # Runtime config (version, URLs, timeouts, logging)
  VERSION               # Semantic version (0.1.0)
  hooks/
    dynamo-hooks.cjs    # Single hook dispatcher (5 events)
  prompts/              # Curation prompt templates (5 .md files)
  tests/                # All tests (272+)

ledger/                 # Memory subsystem
  mcp-client.cjs        # MCPClient + SSE parsing
  scope.cjs             # Scope constants, validation, sanitization
  search.cjs            # Combined/fact/node search
  episodes.cjs          # Episode add/extract
  curation.cjs          # Haiku curation pipeline
  sessions.cjs          # Session management (list, view, label, backfill, auto-name)
  hooks/                # 5 hook handlers (session-start, prompt-augment, capture-change, preserve-knowledge, session-summary)
  graphiti/             # Docker infrastructure
    docker-compose.yml  # Neo4j + Graphiti MCP containers
    config.yaml         # Graphiti server config
    start-graphiti.sh   # Stack startup script
    stop-graphiti.sh    # Stack shutdown script

switchboard/            # Operations subsystem
  install.cjs           # CJS installer (6 steps)
  sync.cjs              # Bidirectional repo<->live sync
  health-check.cjs      # 6-stage health check
  diagnose.cjs          # 13-stage deep diagnostics
  verify-memory.cjs     # 6-check pipeline verification
  stack.cjs             # Docker start/stop wrappers
  stages.cjs            # Shared diagnostic stage logic
  pretty.cjs            # Human-readable formatters

claude-config/          # Integration templates
  CLAUDE.md.template    # Memory system rules for ~/.claude/CLAUDE.md
  settings-hooks.json   # Hook definitions for ~/.claude/settings.json
```

## Deployed Layout (Production)

```
~/.claude/dynamo/             # Deployed by install.cjs
  dynamo.cjs                  # CLI entry point
  core.cjs                    # Shared substrate
  config.json                 # Generated from .env values
  VERSION                     # Current version
  hooks/
    dynamo-hooks.cjs          # Single dispatcher for all hooks
  prompts/                    # Curation templates
  ledger/                     # Memory modules (flat)
    mcp-client.cjs
    scope.cjs
    search.cjs
    episodes.cjs
    curation.cjs
    sessions.cjs
    hooks/                    # Hook handlers
  switchboard/                # Operations modules (flat)
    install.cjs
    sync.cjs
    health-check.cjs
    ...

~/.claude/graphiti/           # Graphiti infrastructure (NOT moved)
  docker-compose.yml
  config.yaml
  .env                        # API keys (never committed)
  start-graphiti.sh
  stop-graphiti.sh
  sessions.json               # Session index

~/.claude/CLAUDE.md           # Deployed from template
~/.claude/settings.json       # Hooks merged into this
```

## Key Files

| File | Purpose |
|------|---------|
| `dynamo/dynamo.cjs` | CLI router -- switch/case on process.argv[2], delegates to Ledger or Switchboard |
| `dynamo/core.cjs` | Shared substrate -- config loading, output formatting, toggle gate, project detection, error logging |
| `dynamo/hooks/dynamo-hooks.cjs` | Single hook dispatcher -- reads stdin JSON, routes by event name to ledger/hooks/ handlers |
| `dynamo/config.json` | Runtime config template -- version, MCP URLs, curation model, timeouts, logging |
| `dynamo/VERSION` | Semantic version file (currently 0.1.0) |
| `ledger/mcp-client.cjs` | MCPClient class -- JSON-RPC 2.0 over HTTP with SSE response parsing |
| `ledger/scope.cjs` | SCOPE constants and validation -- global, project-{name}, session-{ts}, task-{desc} |
| `ledger/search.cjs` | Combined/fact/node search against Graphiti via MCPClient |
| `ledger/episodes.cjs` | Episode add and extract operations |
| `ledger/curation.cjs` | Haiku curation pipeline -- OpenRouter API calls with prompt templates |
| `ledger/sessions.cjs` | Session management -- list, view, label, backfill, auto-name via Haiku |
| `switchboard/install.cjs` | CJS installer -- 6-step deployment to ~/.claude/dynamo/ |
| `switchboard/sync.cjs` | Bidirectional sync -- content-based comparison using Buffer.compare |
| `switchboard/health-check.cjs` | 6-stage health check -- Docker, Neo4j, API, MCP, env, canary |
| `switchboard/diagnose.cjs` | 13-stage deep diagnostics -- comprehensive system inspection |
| `switchboard/verify-memory.cjs` | 6-check pipeline verification -- write, read, scope isolation, sessions |
| `switchboard/stack.cjs` | Docker start/stop wrappers -- wraps docker compose commands |
| `switchboard/stages.cjs` | Shared stage runner logic for health-check and diagnose |
| `switchboard/pretty.cjs` | Human-readable formatters for diagnostic output |

## Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| `config.json` | `dynamo/config.json` (repo), `~/.claude/dynamo/config.json` (deployed) | Runtime config -- version, URLs, timeouts, logging settings |
| `.env` | `~/.claude/graphiti/.env` (deployed only, never committed) | API keys -- OPENROUTER_API_KEY, NEO4J credentials |
| `settings-hooks.json` | `claude-config/settings-hooks.json` | Hook definitions merged into `~/.claude/settings.json` by installer |
| `CLAUDE.md.template` | `claude-config/CLAUDE.md.template` | Memory system rules -- user manually incorporates into `~/.claude/CLAUDE.md` |
| `docker-compose.yml` | `ledger/graphiti/docker-compose.yml` | Docker service definitions -- Neo4j + Graphiti MCP containers |
| `config.yaml` | `ledger/graphiti/config.yaml` | Graphiti server config -- LLM provider, embeddings, entity types |

---

*Structure analysis: 2026-03-18*
