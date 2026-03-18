# Phase 13 Deferred Items

## Pre-existing Test Failures (Out of Scope)

These test failures existed before Plan 02 execution and are not caused by our changes:

1. **Regression 6 (GRAPHITI_VERBOSE)**: `core.cjs references process.env.GRAPHITI_VERBOSE` -- test expects a rename that hasn't happened yet
2. **Regression 9 (ppid health guard)**: `healthGuard uses process.ppid` -- test expectation mismatch
3. **lib/ identity block**: `all .cjs files in lib/ start with "// Dynamo >"` -- lib/ directory doesn't exist (structural refactor incomplete)
4. **logError format**: `writes with [ISO-Z] [hookName] format` -- test reads stale log file content from deployed hooks path, not from logError output
