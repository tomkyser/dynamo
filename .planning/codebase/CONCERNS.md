# Concerns Analysis: Dynamo

**Analysis date:** 2026-03-18

## Active Concerns

### Circular Dependency (core.cjs <-> ledger)
- **What:** `core.cjs` re-exports `loadSessions`/`listSessions` from `ledger/sessions.cjs`, creating a circular require
- **Mitigation:** `Object.assign(module.exports, ...)` pattern breaks the cycle -- module.exports is populated before circular require resolves
- **Risk:** Low -- pattern is stable and tested, but adding new re-exports requires same pattern
- **Future:** Consider extracting shared types to break dependency entirely

### Dual-Path Resolution
- **What:** `resolveCore()` in hook handlers and modules checks deployed path first (`~/.claude/dynamo/core.cjs`), falls back to repo path (`../dynamo/core.cjs`)
- **Risk:** Medium -- if deployed and repo versions diverge, behavior depends on which path resolves
- **Mitigation:** `dynamo sync` keeps them aligned; tests run against repo path

### Toggle State Leakage
- **What:** Global toggle is read from `config.json` at startup -- changes during a session require restart
- **Risk:** Low -- toggles are changed rarely, and the behavior is documented
- **Mitigation:** `DYNAMO_DEV=1` env var provides per-process override without config change

### Hook Error Visibility
- **What:** Hooks always exit 0 to never block Claude Code, but this means errors are silent to the user
- **Risk:** Medium -- failures in hooks go unnoticed unless user checks `hook-errors.log`
- **Mitigation:** Error log with 1MB rotation; SessionStart hook prints health warning once per session if stack is down

### SSE Parsing Fragility
- **What:** `mcp-client.cjs` parses Server-Sent Events manually (no library)
- **Risk:** Low -- Graphiti's SSE format is simple and stable, but edge cases (partial chunks, reconnection) not fully handled
- **Mitigation:** Timeout-based error handling; graceful degradation if parse fails

## Resolved Concerns

### GRAPHITI_GROUP_ID Override (v1.1)
- Server-level env var was forcing all writes to global scope
- Fixed by removing from docker-compose.yml and .env

### Colon Separator Rejection (v1.1)
- Graphiti v1.21.0 rejects colons in group_id
- Fixed by switching to dash separators (project-name instead of project:name)

### Python/Bash Maintenance Burden (v1.2)
- Dual-language codebase was fragile and hard to test
- Fixed by complete CJS rewrite with 272+ tests

### MCP Toggle Gap (v1.2.1)
- MCP server registered directly with Claude meant it bypassed Dynamo's toggle
- Fixed by deregistering MCP, wrapping all tools as CLI commands

---

*Concerns analysis: 2026-03-18*
