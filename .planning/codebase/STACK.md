# Stack Analysis: Dynamo

**Analysis date:** 2026-03-18

## Runtime

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js | 18+ (built-in CJS) | All production and test code |
| Module system | CommonJS (CJS) | N/A | `require()` / `module.exports` throughout |
| Testing | node:test | Built-in | 272+ tests with assert, describe, it |
| YAML parsing | js-yaml | npm | Config file parsing (only npm dependency) |

## Infrastructure

| Service | Image | Ports | Purpose |
|---------|-------|-------|---------|
| Neo4j | neo4j:5.26.0 | 7475 (browser), 7688 (Bolt) | Knowledge graph database |
| Graphiti MCP | zepai/knowledge-graph-mcp:standalone | 8100 | MCP server for graph operations |

## External APIs

| API | Provider | Model/Service | Purpose |
|-----|----------|---------------|---------|
| LLM | OpenRouter | anthropic/claude-haiku-4.5 | Entity extraction, session naming, curation |
| Embeddings | OpenRouter | openai/text-embedding-3-small | Semantic search via Graphiti |

## Key Libraries (Node Built-ins Only)

| Module | Usage |
|--------|-------|
| `node:fs` | File operations, config loading |
| `node:path` | Path resolution |
| `node:http` / `node:https` | HTTP client for MCP and OpenRouter |
| `node:child_process` | Docker compose commands in stack.cjs |
| `node:test` | Test framework |
| `node:assert` | Test assertions |
| `node:crypto` | UUID generation |
| `node:os` | Tmpdir for test isolation |

## Design Philosophy

- Zero npm dependencies beyond js-yaml
- CJS over ESM (ecosystem convention -- GSD, hooks, settings all use CJS)
- Node built-ins cover all needs
- Options-based test isolation (no mocking frameworks)

---

*Stack analysis: 2026-03-18*
