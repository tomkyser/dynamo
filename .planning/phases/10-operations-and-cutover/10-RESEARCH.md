# Phase 10: Operations and Cutover - Research

**Researched:** 2026-03-17
**Domain:** CLI tooling, system diagnostics, installer/deployment, bidirectional sync, Docker compose orchestration -- all in pure CJS
**Confidence:** HIGH

## Summary

Phase 10 builds the operational tooling layer (Switchboard) for the Dynamo system. It requires porting six Python/Bash tools to CJS, building a unified CLI router, and implementing an installer that performs the full cutover from the legacy Python/Bash system to the new CJS system. All 8 SWB requirements must be addressed.

The technical domain is well-understood because: (1) every source file to be ported is available and fully read during research, (2) the target CJS substrate (core.cjs, mcp-client.cjs, scope.cjs, sessions.cjs) is complete and battle-tested from Phases 8-9, (3) the GSD CLI router pattern (gsd-tools.cjs) provides an exact template for dynamo.cjs, and (4) the project follows a zero-dependency philosophy using only Node.js built-ins.

**Primary recommendation:** Build a shared `stages.cjs` module first (all 13 diagnostic stages as individual exported async functions), then wire health-check.cjs (6 stages) and diagnose.cjs (13 stages) as thin consumers. Build the CLI router (dynamo.cjs) as the spine connecting all subcommands. Implement installer last since it touches live system state and benefits from having all other modules verified first.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Single entry point: `dynamo.cjs` routes all subcommands (matches GSD gsd-tools.cjs pattern)
- Available commands: health-check, diagnose, verify-memory, sync, start, stop, test, session, install, help
- Invoked as `node ~/.claude/dynamo/dynamo.cjs <cmd>` -- shell alias or CLAUDE.md reference makes it convenient. No PATH changes or symlinks needed.
- Output style: GSD-style dual -- JSON internally via core.cjs output() helper, `--pretty` flag for human-friendly formatted output
- Help system: both `dynamo help` and `dynamo --help` show available commands with one-line descriptions. `dynamo <cmd> --help` shows command-specific usage.
- `dynamo version` reads from VERSION file
- Installer is a CJS subcommand: `dynamo install` routed to `lib/switchboard/install.cjs`
- Deploys: copies dynamo/ tree to ~/.claude/dynamo/, generates config.json from .env values, registers MCP server, updates settings.json hook paths to CJS
- Retirement: installer renames graphiti/ to graphiti-legacy/ and removes Python .venv in one step
- Settings.json backed up to settings.json.bak before any changes (hard requirement from Phase 9)
- Post-install: automatically runs `dynamo health-check` after deployment. Failures print actionable messages but don't roll back.
- Rollback path: `dynamo rollback` restores settings.json.bak and renames graphiti-legacy/ back to graphiti/
- `dynamo sync` synchronizes dynamo/ (repo) <-> ~/.claude/dynamo/ (live) only. Docker files in graphiti/ handled by installer, not sync.
- Implementation: pure Node.js fs operations (readdirSync, copyFileSync, statSync). No rsync dependency.
- Conflict detection preserved: compare both directions, warn if both sides changed, require --force to overwrite
- Same interface as current: `dynamo sync live-to-repo`, `dynamo sync repo-to-live`, `dynamo sync status`
- Supports --dry-run and --force flags
- Full parity: all 13 diagnostic stages ported from diagnose.py to CJS
- Stage 9 replaced: Python venv check becomes CJS module integrity check (verify all .cjs modules load without error)
- Updated 13 stages: Docker, Neo4j, Graphiti API, MCP session, env vars, .env file, hook registrations, hook files, CJS modules, MCP tool call, search round-trip, episode write, canary write/read
- Shared stages module: `lib/switchboard/stages.cjs` exports all 13 stage functions. health-check.cjs uses 6, diagnose.cjs uses all 13. No code duplication.
- verify-memory is a separate command (not a mode of diagnose) -- tests live pipeline (write->read round-trip, scope isolation, curation pipeline). Three test entry points honored (Phase 8 decision).

### Claude's Discretion
- Exact stage timeout values for each diagnostic stage
- Internal error message phrasing and formatting
- How the --pretty formatter is structured
- Exclude list for sync (carry forward current excludes, adjust for CJS)
- Whether `dynamo rollback` is a full subcommand or a flag on install

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SWB-01 | Health check (6 stages: Docker, Neo4j, API, MCP session, env vars, canary) | Stages module exports 6 health-check functions; health-check.cjs is thin orchestrator consuming stages.cjs; exact port from health-check.py (553 LOC) |
| SWB-02 | Verify-memory end-to-end pipeline test (6 checks including scope round-trip) | Separate verify-memory.cjs command; port from graphiti-helper.py cmd_verify_memory; reuses MCPClient + scope.cjs |
| SWB-03 | Deep diagnostics ported from diagnose.py (13 stages) | diagnose.cjs consumes all 13 stages from stages.cjs; stage 9 replaced with CJS module integrity check |
| SWB-04 | CJS installer deploying to ~/.claude/dynamo/, eliminating Python venv | install.cjs copies dynamo/ tree, generates config.json, registers MCP, retires graphiti/ to graphiti-legacy/ |
| SWB-05 | Settings generator for hook registrations pointing to .cjs files | Part of installer: reads settings-hooks.json template, merges into settings.json (backup first) |
| SWB-06 | Unified `dynamo <command>` CLI router | dynamo.cjs at repo root dynamo/dynamo.cjs; follows GSD gsd-tools.cjs switch/case pattern |
| SWB-07 | Bidirectional sync rewrite (sync-graphiti.sh to CJS) | sync.cjs uses pure fs operations (readdirSync, copyFileSync, statSync); replaces rsync with recursive compare |
| SWB-08 | Stack start/stop commands (Docker compose wrappers) | stack.cjs wraps child_process.execSync for docker compose up -d / down with health wait loop |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-in `fs` | v24.13.1 | File I/O for sync, installer, config | Zero-dependency philosophy; all file ops use synchronous fs APIs |
| Node.js built-in `path` | v24.13.1 | Path manipulation | Cross-platform path joining |
| Node.js built-in `child_process` | v24.13.1 | Docker compose commands, claude CLI | execSync for docker, execFileSync for safer subprocess calls |
| Node.js built-in `os` | v24.13.1 | Home directory, tmpdir | Platform-independent home directory |
| Node.js built-in `crypto` | v24.13.1 | UUID generation for canary IDs | Already used in mcp-client.cjs |
| Node.js built-in `node:test` | v24.13.1 | Test framework | Already used for all existing dynamo tests (core.test.cjs, regression.test.cjs, etc.) |
| Node.js built-in `fetch` | v24.13.1 | HTTP calls for health checks, MCP | Already wrapped in core.cjs fetchWithTimeout |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `core.cjs` | internal | output(), error(), loadConfig, loadEnv, fetchWithTimeout, logError, healthGuard | Every switchboard module |
| `mcp-client.cjs` | internal | MCPClient class, parseSSE | Diagnostic stages 4+, verify-memory, canary tests |
| `scope.cjs` | internal | validateGroupId, SCOPE constants | verify-memory scope isolation test |
| `sessions.cjs` | internal | Session management (list, view, label, backfill) | `dynamo session` subcommand routing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pure fs sync | rsync subprocess | Rsync is external dependency; pure fs gives full control over conflict detection and exclude logic |
| child_process.execSync for Docker | dockerode npm package | External dependency violates zero-dep philosophy; execSync is proven in existing codebase |
| Built-in node:test | Jest/Vitest | External dependency; node:test already established across 12+ test files |

**Installation:**
```bash
# No npm install needed -- zero external dependencies
# All modules use Node.js built-ins only
```

## Architecture Patterns

### Recommended Project Structure
```
dynamo/
  dynamo.cjs                          # CLI router (NEW - SWB-06)
  VERSION                             # Version file for `dynamo version`
  config.json                         # Existing config
  hooks/
    dynamo-hooks.cjs                  # Existing dispatcher
  lib/
    core.cjs                          # Existing shared substrate
    ledger/                           # Existing (Phase 8+9)
      mcp-client.cjs
      scope.cjs
      sessions.cjs
      search.cjs
      curation.cjs
      episodes.cjs
      hooks/                          # 5 hook handlers
    switchboard/                      # ALL NEW (Phase 10)
      stages.cjs                      # 13 diagnostic stage functions
      health-check.cjs                # 6-stage health check (SWB-01)
      diagnose.cjs                    # 13-stage diagnostics (SWB-03)
      verify-memory.cjs               # Pipeline verification (SWB-02)
      install.cjs                     # Installer + cutover (SWB-04, SWB-05)
      sync.cjs                        # Bidirectional sync (SWB-07)
      stack.cjs                       # Docker start/stop (SWB-08)
      pretty.cjs                      # --pretty formatter (shared)
  prompts/                            # Existing prompt templates
  tests/
    stages.test.cjs                   # NEW - unit tests for stage functions
    health-check.test.cjs             # NEW - health-check orchestration
    diagnose.test.cjs                 # NEW - diagnose orchestration
    verify-memory.test.cjs            # NEW - verify-memory tests
    install.test.cjs                  # NEW - installer logic
    sync.test.cjs                     # NEW - sync logic
    stack.test.cjs                    # NEW - stack commands
    router.test.cjs                   # NEW - CLI router dispatch
```

### Pattern 1: CLI Router (GSD Pattern)
**What:** Single-file argv[2] switch/case dispatcher routing to handler modules
**When to use:** dynamo.cjs entry point
**Example:**
```javascript
// Source: GSD gsd-tools.cjs (exact pattern)
'use strict';

const path = require('path');
const { output, error } = require('./lib/core.cjs');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const pretty = args.includes('--pretty');
  const restArgs = args.filter(a => a !== '--pretty');

  if (!command || command === 'help' || command === '--help') {
    showHelp();
    return;
  }

  switch (command) {
    case 'health-check':
      await require('./lib/switchboard/health-check.cjs').run(restArgs, pretty);
      break;
    case 'diagnose':
      await require('./lib/switchboard/diagnose.cjs').run(restArgs, pretty);
      break;
    case 'verify-memory':
      await require('./lib/switchboard/verify-memory.cjs').run(restArgs, pretty);
      break;
    case 'sync':
      await require('./lib/switchboard/sync.cjs').run(restArgs, pretty);
      break;
    case 'start':
      await require('./lib/switchboard/stack.cjs').start(restArgs, pretty);
      break;
    case 'stop':
      await require('./lib/switchboard/stack.cjs').stop(restArgs, pretty);
      break;
    case 'install':
      await require('./lib/switchboard/install.cjs').run(restArgs, pretty);
      break;
    case 'rollback':
      await require('./lib/switchboard/install.cjs').rollback(restArgs, pretty);
      break;
    case 'session':
      // Delegate to sessions.cjs subcommands
      break;
    case 'test':
      // Run test suite
      break;
    case 'version':
      showVersion();
      break;
    default:
      error('Unknown command: ' + command + '. Run "dynamo help" for usage.');
  }
}

main().catch(e => { error(e.message); });
```

### Pattern 2: Shared Stages Module
**What:** Each diagnostic stage is an independent async function returning `{ status, detail, raw }` -- stages.cjs exports all 13 as named functions. health-check.cjs cherry-picks 6, diagnose.cjs uses all 13.
**When to use:** SWB-01 and SWB-03
**Example:**
```javascript
// Source: Port from health-check.py check_docker + diagnose.py probe_docker
async function stageDocker(options = {}) {
  try {
    const { execSync } = require('child_process');
    const out = execSync(
      'docker ps --filter name=graphiti --format "{{.Names}} {{.Status}}"',
      { timeout: 10000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    if (!out) return { status: 'FAIL', detail: 'No graphiti containers found', raw: out };

    const neo4jUp = out.split('\n').some(l => l.includes('graphiti-neo4j') && l.includes('Up'));
    const mcpUp = out.split('\n').some(l => l.includes('graphiti-mcp') && l.includes('Up'));

    if (neo4jUp && mcpUp) {
      return { status: 'OK', detail: 'Both containers running', raw: out };
    }
    const issues = [];
    if (!neo4jUp) issues.push('graphiti-neo4j not running');
    if (!mcpUp) issues.push('graphiti-mcp not running');
    return { status: 'FAIL', detail: issues.join('; '), raw: out };
  } catch (e) {
    return { status: 'FAIL', detail: e.message, raw: '' };
  }
}

module.exports = {
  stageDocker, stageNeo4j, stageGraphitiApi, stageMcpSession,
  stageEnvVars, stageEnvFile, stageHookRegistrations, stageHookFiles,
  stageCjsModules, stageMcpToolCall, stageSearchRoundtrip,
  stageEpisodeWrite, stageCanaryWriteRead
};
```

### Pattern 3: Cascading Skip Logic (Health Check)
**What:** When an early stage fails, subsequent dependent stages are skipped with actionable messages.
**When to use:** health-check.cjs and diagnose.cjs
**Example:**
```javascript
// Source: health-check.py run_health_check
async function runHealthCheck(verbose) {
  const results = {};
  let skipReason = null;

  // Stage 1: Docker
  results.docker = await stages.stageDocker({ verbose });
  if (results.docker.status === 'FAIL') skipReason = 'Docker';

  // Stage 2: Neo4j (depends on Docker)
  if (skipReason) {
    results.neo4j = { status: 'SKIP', detail: `(skipped -- ${skipReason} failed)` };
  } else {
    results.neo4j = await stages.stageNeo4j({ verbose });
    if (results.neo4j.status === 'FAIL') skipReason = 'Neo4j';
  }
  // ... stages 3-6 follow same pattern
}
```

### Pattern 4: Pure-fs Recursive Sync
**What:** Replace rsync with recursive fs comparison and copy. Walk both directory trees, compare mtimes, copy changed files.
**When to use:** SWB-07 sync.cjs
**Example:**
```javascript
// Source: Replacing sync-graphiti.sh rsync logic
function walkDir(dir, excludes, base) {
  base = base || dir;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = {};
  for (const entry of entries) {
    if (excludes.includes(entry.name)) continue;
    if (entry.name.endsWith('.pyc')) continue; // glob-style exclude
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(base, fullPath);
    if (entry.isDirectory()) {
      Object.assign(files, walkDir(fullPath, excludes, base));
    } else {
      const stat = fs.statSync(fullPath);
      files[relPath] = { mtime: stat.mtimeMs, size: stat.size };
    }
  }
  return files;
}

function diffTrees(srcFiles, dstFiles) {
  const toCopy = []; // files newer in src or missing in dst
  const toDelete = []; // files in dst but not in src
  for (const [rel, info] of Object.entries(srcFiles)) {
    if (!dstFiles[rel] || dstFiles[rel].mtime < info.mtime || dstFiles[rel].size !== info.size) {
      toCopy.push(rel);
    }
  }
  for (const rel of Object.keys(dstFiles)) {
    if (!srcFiles[rel]) toDelete.push(rel);
  }
  return { toCopy, toDelete };
}
```

### Pattern 5: Pretty Formatter
**What:** Shared module that transforms JSON result objects into human-readable terminal output
**When to use:** When `--pretty` flag is passed to any command
**Example:**
```javascript
// pretty.cjs -- shared formatter
function formatStageResult(stage) {
  const label = `[${(stage.status || 'UNKN').padEnd(4)}]`;
  return `${label}  ${stage.name}: ${stage.detail}`;
}

function formatHealthReport(result, pretty) {
  if (!pretty) return; // JSON output handled by core.output()
  const timestamp = new Date().toISOString();
  process.stderr.write(`=== Dynamo Health Check ===\nTimestamp: ${timestamp}\n\n`);
  for (const stage of result.stages) {
    process.stderr.write(formatStageResult(stage) + '\n');
  }
  // Summary
  const passed = result.stages.filter(s => s.status === 'OK' || s.status === 'WARN').length;
  const total = result.stages.filter(s => s.status !== 'SKIP').length;
  process.stderr.write(`\nResult: ${passed}/${total} checks passed\n`);
}
```

### Anti-Patterns to Avoid
- **Duplicating stage logic across health-check and diagnose:** Both MUST consume stages.cjs. Never copy-paste stage functions.
- **Synchronous HTTP in stages:** Use async/await with fetchWithTimeout for all HTTP checks. The stages module must be async.
- **Blocking Docker commands without timeout:** Always pass `{ timeout: 10000 }` to execSync for Docker operations.
- **Modifying settings.json without backup:** Always copy to settings.json.bak before any write (locked requirement from Phase 9).
- **Using rsync or any external tool for sync:** Pure Node.js fs operations only. No rsync, no cp subprocess.
- **Installing npm packages:** Zero-dependency philosophy. Only Node.js built-ins.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP communication | Custom HTTP client | Existing `mcp-client.cjs` MCPClient | Already handles SSE parsing, session init, notifications/initialized handshake |
| HTTP with timeouts | Raw fetch calls | `core.cjs` fetchWithTimeout | AbortSignal.timeout already wired; consistent timeout handling |
| Config loading | Manual JSON parsing | `core.cjs` loadConfig + loadEnv | Already handles defaults, deep merge, missing file fallback |
| Scope validation | Regex checks inline | `scope.cjs` validateGroupId | Colon constraint and sanitization already tested |
| Error logging | Console.error | `core.cjs` logError | 1MB rotation, ISO timestamps, hook name prefix |
| JSON/file output | Manual stdout writes | `core.cjs` output() | Handles @file: for large output, proper JSON formatting |
| Session management | New session code | `sessions.cjs` loadSessions/listSessions etc. | Full session CRUD already built in Phase 9 |
| UUID generation | Custom ID generator | `crypto.randomUUID()` | Built into Node.js, already used in mcp-client.cjs |

**Key insight:** The Phase 8+9 substrate (core.cjs + mcp-client.cjs + scope.cjs + sessions.cjs) already provides 80%+ of the utilities needed. Phase 10 modules should be thin orchestrators importing from the substrate, not reimplementing primitives.

## Common Pitfalls

### Pitfall 1: settings.json Corruption During Install
**What goes wrong:** Installer reads settings.json, modifies hooks section, writes back -- but corrupts JSON structure or overwrites user customizations.
**Why it happens:** settings.json has complex nested structure with permissions, env, hooks, and user-specific entries. Naive overwrite loses data.
**How to avoid:** (1) Always backup to settings.json.bak first. (2) Parse existing, deep-merge only the `hooks` section. (3) Preserve all other keys unchanged. (4) Write atomically (write to .tmp, rename).
**Warning signs:** settings.json parse error after install, hooks not firing, permissions reset.

### Pitfall 2: Docker Compose Path Sensitivity
**What goes wrong:** `docker compose` fails because it can't find docker-compose.yml in the expected directory.
**Why it happens:** docker compose is directory-sensitive. The compose file lives in `~/.claude/graphiti/` but the CJS command may execute from a different cwd.
**How to avoid:** Always pass explicit `-f` flag: `docker compose -f /path/to/docker-compose.yml up -d`. Never rely on cwd for Docker commands.
**Warning signs:** "no configuration file provided" error from Docker.

### Pitfall 3: Sync Conflict False Positives
**What goes wrong:** Sync reports conflicts when only one side actually changed, because mtime comparison is unreliable across file copies.
**Why it happens:** copyFileSync preserves content but not always mtime. macOS iCloud Drive may also alter mtimes.
**How to avoid:** Compare file content (size + content hash or byte comparison) rather than relying solely on mtime. Size check is fast first pass; only hash on size-equal files.
**Warning signs:** Sync always reports "both sides changed" even after a clean sync.

### Pitfall 4: execSync Hanging on Docker
**What goes wrong:** execSync for `docker compose up -d` hangs indefinitely if Docker daemon is unresponsive.
**Why it happens:** No timeout set, or Docker daemon is starting/crashing.
**How to avoid:** Always pass `{ timeout: 30000 }` (or appropriate value) to execSync. Catch the timeout error and return a clear FAIL message.
**Warning signs:** dynamo start command never returns.

### Pitfall 5: Health Check Wait Loop in Start Command
**What goes wrong:** `dynamo start` returns "success" but services aren't actually healthy yet.
**Why it happens:** Docker compose up -d returns immediately. Services need time to initialize (Neo4j: ~30s, MCP: ~10s after Neo4j).
**How to avoid:** Port the health-wait loop from start-graphiti.sh: poll health endpoint with retry (30 attempts, 2s apart). Only report success when health endpoint returns 200.
**Warning signs:** Immediate "ready" followed by failing health checks.

### Pitfall 6: Installer Running from Wrong Directory
**What goes wrong:** `dynamo install` copies incomplete or wrong files because source paths are calculated relative to an unexpected directory.
**Why it happens:** The script might be run from anywhere; relative paths break.
**How to avoid:** Use `__dirname` for all source path calculations. `__dirname` in dynamo.cjs points to the repo's `dynamo/` directory. All paths should be absolute, derived from `__dirname`.
**Warning signs:** Missing files in ~/.claude/dynamo/ after install.

### Pitfall 7: Retirement Race Condition
**What goes wrong:** Installer renames graphiti/ to graphiti-legacy/ but Docker containers still reference files in graphiti/.
**Why it happens:** Docker compose mounts volumes from graphiti/ (docker-compose.yml, config.yaml, .env). Renaming the directory while containers run breaks mounts.
**How to avoid:** (1) docker-compose.yml stays in graphiti/ (not moved to dynamo/ -- CONTEXT.md says "Docker files in graphiti/ handled by installer, not sync"). (2) Retirement only moves Python-specific files (.venv, *.py) and renames the rest. OR (3) Stop containers first, rename, update paths, restart.
**Warning signs:** Docker containers crash after install.

## Code Examples

### Example 1: Stage Function Signature (Standard for All 13 Stages)
```javascript
// Every stage follows this contract
// Returns: { status: 'OK'|'FAIL'|'WARN'|'SKIP', detail: string, raw?: string }
async function stageName(options = {}) {
  const { verbose = false, mcpClient = null } = options;
  try {
    // ... stage-specific logic ...
    return { status: 'OK', detail: 'human-readable success message', raw: verboseData };
  } catch (e) {
    return { status: 'FAIL', detail: 'human-readable failure + action: ' + e.message, raw: '' };
  }
}
```

### Example 2: Docker Compose Wrapper (Stack Start)
```javascript
// Source: Port from start-graphiti.sh
const { execSync } = require('child_process');
const { fetchWithTimeout } = require('../core.cjs');
const COMPOSE_FILE = path.join(os.homedir(), '.claude', 'graphiti', 'docker-compose.yml');

async function start(args, pretty) {
  // Check if already running
  try {
    const ps = execSync(`docker compose -f "${COMPOSE_FILE}" ps --status running`,
      { encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] });
    if (ps.includes('graphiti-neo4j') && ps.includes('graphiti-mcp')) {
      return output({ status: 'already_running', message: 'Graphiti stack is already running' });
    }
  } catch (e) { /* not running -- proceed */ }

  // Start
  execSync(`docker compose -f "${COMPOSE_FILE}" up -d`,
    { timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'] });

  // Wait for health
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const resp = await fetchWithTimeout('http://localhost:8100/health', {}, 3000);
      if (resp.ok) {
        return output({ status: 'started', message: 'Graphiti stack is ready' });
      }
    } catch (e) { /* not ready yet */ }
    await new Promise(r => setTimeout(r, 2000));
  }
  return output({ status: 'timeout', message: 'Stack started but health check timed out' });
}
```

### Example 3: Installer Settings Merge
```javascript
// Source: settings-hooks.json template merge pattern
function mergeSettings(settingsPath, hooksTemplate) {
  const backupPath = settingsPath + '.bak';

  // Read existing
  let settings = {};
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (e) {
    // No existing settings -- start fresh
  }

  // Backup BEFORE any modification (hard requirement)
  fs.copyFileSync(settingsPath, backupPath);

  // Merge hooks section (replace entirely -- template is authoritative for dynamo hooks)
  settings.hooks = hooksTemplate.hooks;

  // Merge permissions (additive -- don't remove user's existing permissions)
  if (!settings.permissions) settings.permissions = {};
  if (!settings.permissions.allow) settings.permissions.allow = [];
  for (const perm of hooksTemplate.permissions.allow) {
    if (!settings.permissions.allow.includes(perm)) {
      settings.permissions.allow.push(perm);
    }
  }

  // Merge env vars
  if (!settings.env) settings.env = {};
  Object.assign(settings.env, hooksTemplate.env);

  // Write atomically
  const tmpPath = settingsPath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
  fs.renameSync(tmpPath, settingsPath);
}
```

### Example 4: Sync Exclude List (Carried Forward + CJS Adjustments)
```javascript
// Source: sync-graphiti.sh EXCLUDES array, adjusted for CJS
const SYNC_EXCLUDES = [
  '.env',
  '.env.example',
  '.venv',           // Legacy Python -- won't exist in dynamo/ but guard anyway
  '__pycache__',     // Legacy Python
  'sessions.json',   // Runtime state, not synced
  'hook-errors.log', // Runtime log, not synced
  '.DS_Store',
  '*.pyc',
  '.last-sync',
  'node_modules',    // Guard against accidental npm installs
  'config.json',     // Generated per-deployment, not synced (has local .env values)
];
```

### Example 5: CJS Module Integrity Check (Stage 9 Replacement)
```javascript
// Stage 9: Replaces Python venv check with CJS module load verification
async function stageCjsModules(options = {}) {
  const DYNAMO_DIR = path.join(os.homedir(), '.claude', 'dynamo');
  const libDir = path.join(DYNAMO_DIR, 'lib');
  const failures = [];

  // Recursively find all .cjs files
  function collectCjs(dir) {
    const results = [];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) results.push(...collectCjs(full));
        else if (entry.name.endsWith('.cjs')) results.push(full);
      }
    } catch (e) { /* dir doesn't exist */ }
    return results;
  }

  const cjsFiles = collectCjs(libDir);
  if (cjsFiles.length === 0) {
    return { status: 'FAIL', detail: 'No .cjs modules found in ' + libDir };
  }

  for (const file of cjsFiles) {
    try {
      require(file);
    } catch (e) {
      failures.push(path.relative(DYNAMO_DIR, file) + ': ' + e.message);
    }
  }

  if (failures.length > 0) {
    return { status: 'FAIL', detail: failures.length + ' module(s) failed to load: ' + failures.join('; ') };
  }
  return { status: 'OK', detail: cjsFiles.length + ' modules loaded successfully' };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Python venv + httpx + yaml | Pure CJS with Node.js built-ins | Phase 10 | Eliminates Python dependency entirely |
| rsync for bidirectional sync | Pure fs operations (readdirSync, copyFileSync) | Phase 10 | No external tool dependency |
| Separate shell scripts (start/stop/sync) | Unified `dynamo` CLI | Phase 10 | Single entry point for all operations |
| install.sh with jq + python3 prereqs | dynamo install (self-contained CJS) | Phase 10 | Only requires Node.js |
| diagnose.py stages 9-10 test Python helper | CJS module integrity + direct MCP calls | Phase 10 | Tests CJS substrate, not Python bridge |
| Manual settings.json hook editing | Automated settings merge in installer | Phase 10 | No manual config file edits (core value) |

**Deprecated/outdated:**
- `graphiti-helper.py`: Replaced entirely by CJS modules (core.cjs + ledger/ + switchboard/)
- `health-check.py`: Replaced by `dynamo health-check` via stages.cjs
- `diagnose.py`: Replaced by `dynamo diagnose` via stages.cjs
- `install.sh`: Replaced by `dynamo install`
- `sync-graphiti.sh`: Replaced by `dynamo sync`
- `start-graphiti.sh`: Replaced by `dynamo start`
- `stop-graphiti.sh`: Replaced by `dynamo stop`
- Python `.venv`: Eliminated entirely
- Shell hooks (*.sh in hooks/): Replaced by dynamo-hooks.cjs

## Open Questions

1. **Docker compose file path after retirement**
   - What we know: docker-compose.yml lives in ~/.claude/graphiti/ and Docker containers mount volumes from that path
   - What's unclear: When graphiti/ is renamed to graphiti-legacy/, do we need to keep docker-compose.yml accessible at the original path? Or do we move it to dynamo/ and update mount paths?
   - Recommendation: Keep docker-compose.yml in ~/.claude/graphiti/ (don't rename the Docker infrastructure part). Only retire Python-specific files. The CONTEXT.md says "Docker files in graphiti/ handled by installer, not sync" -- meaning the installer should ensure the Docker stack files remain functional.

2. **Verify-memory: three test entry points**
   - What we know: CONTEXT.md says "Three test entry points honored (Phase 8 decision)"
   - What's unclear: What are the exact three entry points?
   - Recommendation: Based on the codebase, these are: (1) `dynamo verify-memory` CLI command, (2) `dynamo test` (runs test suite including verify-memory), (3) Post-install automatic health check. The implementation should work identically from all three.

3. **Config.json generation from .env**
   - What we know: Installer "generates config.json from .env values"
   - What's unclear: Which .env values map to which config.json fields?
   - Recommendation: The mapping is straightforward -- .env has OPENROUTER_API_KEY, NEO4J_PASSWORD, GRAPHITI_MCP_URL, GRAPHITI_HEALTH_URL. Config.json stores graphiti URLs and curation model settings. The installer should read .env, check for required keys, and generate the config.json template with correct URLs.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` (v24.13.1) |
| Config file | none -- uses node --test glob |
| Quick run command | `node --test dynamo/tests/stages.test.cjs` |
| Full suite command | `node --test dynamo/tests/*.test.cjs` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SWB-01 | 6-stage health check pass/fail | unit | `node --test dynamo/tests/health-check.test.cjs` | Wave 0 |
| SWB-02 | verify-memory 6-check pipeline | unit | `node --test dynamo/tests/verify-memory.test.cjs` | Wave 0 |
| SWB-03 | 13-stage diagnostics | unit | `node --test dynamo/tests/diagnose.test.cjs` | Wave 0 |
| SWB-04 | Installer deployment + retirement | unit | `node --test dynamo/tests/install.test.cjs` | Wave 0 |
| SWB-05 | Settings merge + hook registration | unit | `node --test dynamo/tests/install.test.cjs` (same file) | Wave 0 |
| SWB-06 | CLI router dispatch | unit | `node --test dynamo/tests/router.test.cjs` | Wave 0 |
| SWB-07 | Bidirectional sync | unit | `node --test dynamo/tests/sync.test.cjs` | Wave 0 |
| SWB-08 | Docker start/stop commands | unit | `node --test dynamo/tests/stack.test.cjs` | Wave 0 |

### Test Strategy Notes

**Unit tests dominate** because most modules wrap external services (Docker, Graphiti MCP) that aren't available in CI. The test approach should:

1. **Mock external services:** Docker commands, HTTP endpoints, file system paths should be injectable/mockable
2. **Use temp directories:** All file-writing tests (sync, install) should operate in `os.tmpdir()` to avoid touching real ~/.claude/
3. **Test the logic, not the service:** Stage functions should be testable with mock responses. The MCPClient is already testable (see mcp-client.test.cjs pattern)
4. **Test the router dispatch:** Verify correct modules are invoked for each command name
5. **Test conflict detection:** Sync conflict logic is pure fs comparison -- fully testable without rsync

### Sampling Rate
- **Per task commit:** `node --test dynamo/tests/{module}.test.cjs` (module under development)
- **Per wave merge:** `node --test dynamo/tests/*.test.cjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `dynamo/tests/stages.test.cjs` -- covers SWB-01, SWB-03 (individual stage functions)
- [ ] `dynamo/tests/health-check.test.cjs` -- covers SWB-01 (orchestration + skip logic)
- [ ] `dynamo/tests/diagnose.test.cjs` -- covers SWB-03 (13-stage orchestration)
- [ ] `dynamo/tests/verify-memory.test.cjs` -- covers SWB-02 (pipeline checks)
- [ ] `dynamo/tests/install.test.cjs` -- covers SWB-04, SWB-05 (deployment + settings merge)
- [ ] `dynamo/tests/sync.test.cjs` -- covers SWB-07 (walkDir, diffTrees, conflict detection)
- [ ] `dynamo/tests/stack.test.cjs` -- covers SWB-08 (start/stop + health wait)
- [ ] `dynamo/tests/router.test.cjs` -- covers SWB-06 (dispatch table)

## Sources

### Primary (HIGH confidence)
- `graphiti/health-check.py` -- 553 LOC, all 6 health check stages read in full
- `graphiti/diagnose.py` -- 588 LOC, all 13 diagnostic stages read in full
- `graphiti/graphiti-helper.py` -- 944 LOC, verify-memory and session management read in full
- `graphiti/start-graphiti.sh` -- 49 LOC, health wait loop logic read in full
- `graphiti/stop-graphiti.sh` -- 13 LOC, compose down logic read in full
- `sync-graphiti.sh` -- 177 LOC, rsync-based bidirectional sync read in full
- `install.sh` -- 92 LOC, Python-era installer read in full
- `dynamo/lib/core.cjs` -- 307 LOC, all 11 exports verified
- `dynamo/lib/ledger/mcp-client.cjs` -- 105 LOC, MCPClient + parseSSE verified
- `dynamo/lib/ledger/scope.cjs` -- 36 LOC, validateGroupId + SCOPE constants verified
- `dynamo/lib/ledger/sessions.cjs` -- Session management API verified
- `dynamo/hooks/dynamo-hooks.cjs` -- 55 LOC, dispatcher pattern verified
- `~/.claude/get-shit-done/bin/gsd-tools.cjs` -- CLI router pattern verified (first 240 LOC)
- `claude-config/settings-hooks.json` -- 96 LOC, hook registration template verified
- `~/.claude/settings.json` -- Live settings structure verified
- `graphiti/docker-compose.yml` -- 50 LOC, container names and health checks verified
- `graphiti/.env.example` -- Required environment variables verified
- `dynamo/config.json` -- Config structure verified
- `.planning/config.json` -- nyquist_validation: true confirmed
- `dynamo/tests/core.test.cjs` -- node:test framework usage pattern verified
- `dynamo/tests/regression.test.cjs` -- Regression test pattern verified

### Secondary (MEDIUM confidence)
- Node.js v24.13.1 -- verified via `node --version`; all APIs used (fs, child_process, node:test, fetch) are stable in this version

### Tertiary (LOW confidence)
- None -- all findings verified from primary sources (actual codebase files)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - zero external deps, all Node.js built-ins already in use by existing codebase
- Architecture: HIGH - exact port from Python/Bash sources with clear 1:1 mapping, GSD router pattern proven
- Pitfalls: HIGH - identified from actual code analysis (Docker path sensitivity, settings corruption, sync mtime issues) not from generic web searches
- Validation: HIGH - node:test framework already established with 12+ test files following consistent patterns

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable -- all dependencies are Node.js built-ins, no fast-moving external libraries)
