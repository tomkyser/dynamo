# Conventions Analysis: Dynamo

**Analysis date:** 2026-03-18

## Module Pattern

- All files use CommonJS (`require()` / `module.exports`)
- No ESM (import/export) anywhere in the codebase
- Shared substrate at `dynamo/core.cjs` -- all common utilities imported from here
- `resolveCore()` dual-path resolution: checks deployed layout (`~/.claude/dynamo/core.cjs`) first, falls back to repo layout (`../dynamo/core.cjs`)

## CLI Router Pattern (GSD Pattern)

The CLI router in `dynamo.cjs` uses a switch/case on `process.argv[2]`:
- Each case delegates to a module function
- showHelp() for unknown commands
- COMMAND_HELP object for per-command help text
- Exit codes: 0 for success, 1 for errors

## Output Pattern

`core.cjs output(data, format)`:
- `format === 'json'`: JSON.stringify to stdout
- `format === 'raw'`: raw text to stdout
- default (human): formatted text to stderr
- stderr for human ensures Claude sees output in context window
- stdout for structured data enables piping

## Export Pattern

- Standard: `module.exports = { fn1, fn2, ... }`
- Circular dependency break: `Object.assign(module.exports, { fn1, fn2 })` (used in core.cjs)
- Re-exports: core.cjs re-exports `loadSessions`/`listSessions` from ledger for boundary compliance

## Error Handling

- Hooks: always exit 0, log errors to `hook-errors.log` via `logError()` in core.cjs
- CLI commands: try/catch with user-facing error messages to stderr, exit 1
- `logError(hookName, error)`: ISO timestamp, hook name prefix, 1MB rotation

## Naming Conventions

- Files: kebab-case with .cjs extension (`health-check.cjs`, `mcp-client.cjs`)
- Functions: camelCase (`loadConfig`, `isEnabled`, `detectProject`)
- Constants: UPPER_SNAKE (`SYNC_PAIRS`, `COMMAND_HELP`, `SCOPE`)
- Config keys: snake_case in JSON (`max_size_bytes`, `mcp_url`)

## Toggle Gate Pattern

Functions that respect the global toggle:
- Check `isEnabled()` from core.cjs early in execution
- Hook dispatcher: exits silently (exit 0) when disabled
- CLI commands: print error message and exit 1 when disabled
- Dev mode override: `process.env.DYNAMO_DEV === '1'` bypasses global off

## Test Conventions

- File naming: `*.test.cjs` alongside or in `dynamo/tests/` directory
- Each test uses `tmpdir` for file isolation
- Stage/module functions accept options objects for overrides (not env vars for test control)
- `configPath` parameter in `isEnabled()` for test isolation

---

*Convention analysis: 2026-03-18*
