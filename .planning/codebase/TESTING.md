# Testing Analysis: Dynamo

**Analysis date:** 2026-03-18

## Test Framework

| Property | Value |
|----------|-------|
| Framework | node:test (Node.js built-in) |
| Assertions | node:assert (strict mode) |
| Test count | 272+ tests |
| Config | None (uses node --test with glob patterns) |

## Running Tests

| Command | Scope |
|---------|-------|
| `node dynamo/dynamo.cjs test` | Full suite via CLI |
| `node --test dynamo/tests/*.test.cjs` | Core tests only |
| `node --test dynamo/tests/ledger/*.test.cjs` | Ledger tests only |
| `node --test dynamo/tests/switchboard/*.test.cjs` | Switchboard tests only |
| `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs` | All tests |

## Test Organization

```
dynamo/tests/
  *.test.cjs              # Core module tests (core, config, hooks, CLI)
  ledger/
    *.test.cjs            # Ledger module tests (mcp-client, scope, search, episodes, curation, sessions)
  switchboard/
    *.test.cjs            # Switchboard module tests (install, sync, health-check, diagnose, stages)
```

## Test Isolation Pattern

All tests use **options-based isolation** (not mocking or env vars):

1. Each test creates a tmpdir: `const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-test-'))`
2. Module functions accept options objects with overridable paths:
   - `isEnabled({ configPath })` -- reads config from custom path
   - `runStage(name, fn, { stages })` -- uses provided stages array
   - `sync({ pairs, dryRun })` -- custom sync pairs for testing
3. Tests write fixtures to tmpdir, call functions with overrides, assert results
4. No global state mutation, no env var switching, no module cache manipulation

## Coverage Areas

| Component | What's Tested | Approximate Count |
|-----------|---------------|-------------------|
| Core | Config loading, toggle, output formatting, project detection | ~40 tests |
| Hooks | Dispatcher routing, toggle gate, event parsing | ~30 tests |
| Ledger | MCP client, scope validation, search, episodes, curation, sessions | ~100 tests |
| Switchboard | Install steps, sync pairs, health stages, diagnostic stages | ~100 tests |

## Key Test Patterns

- **Stage testing:** Health-check and diagnose use shared `stages.cjs` -- each stage is independently testable
- **MCP client testing:** Mock HTTP responses, verify JSON-RPC request format, test SSE parsing
- **Sync testing:** Create source and target dirs in tmpdir, verify content-based comparison logic
- **Config testing:** Write test config.json to tmpdir, verify loadConfig reads it correctly

---

*Testing analysis: 2026-03-18*
