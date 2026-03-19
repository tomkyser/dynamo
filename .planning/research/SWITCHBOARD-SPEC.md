# Switchboard: Dispatcher and Operations Layer Specification

**Status:** Technical specification
**Date:** 2026-03-19
**Subsystem:** Switchboard
**Role:** Hook dispatching, system lifecycle operations (install/sync/update), event routing
**Depends on:** Dynamo PRD (subsystem boundary definitions)
**Referenced by:** Reverie-SPEC.md (receives dispatched cognitive events), Ledger-SPEC.md (receives dispatched capture events), Terminus-SPEC.md (called for stack lifecycle)

---

## 1. Executive Summary

Switchboard is the Dispatcher and Operations Layer of the Dynamo architecture. It is the nervous system that connects Claude Code events to subsystem handlers, and the operations center that manages the system's lifecycle. Switchboard has two distinct responsibilities:

1. **Hook dispatching.** When Claude Code sends a hook event (SessionStart, UserPromptSubmit, PostToolUse, PreCompact, Stop), Switchboard's dispatcher receives the raw event, checks the global toggle gate, detects the project context, builds the scope, and routes the event to the appropriate handler in the owning subsystem. The dispatcher is the single entry point for all Claude Code events.

2. **System lifecycle operations.** Install, sync, update, update-check, and toggle. These operations manage Dynamo's deployment lifecycle -- how the system gets onto the user's machine, stays in sync between repo and deployment, and updates to new versions.

In the current codebase (v1.2.1), Switchboard houses both operations modules and infrastructure modules. The six-subsystem architecture moves infrastructure concerns (health checks, diagnostics, stack management, migrations, pipeline verification) to Terminus, leaving Switchboard focused on dispatching and operations.

**The key architectural distinction:** Switchboard DISPATCHES hook events to handlers but does NOT implement the handler logic. The handler for UserPromptSubmit lives in Reverie (cognitive processing), not in Switchboard. The handler for PostToolUse (file change capture) lives in Ledger (data construction), not in Switchboard. Switchboard is the postal service -- it delivers messages to recipients but does not read them.

**Key responsibilities:**

| Domain | What Switchboard Owns |
|--------|----------------------|
| Dispatching | Hook event reception, toggle gate, project detection, scope building, handler routing |
| Install | 6-step deployment (copy, config, merge settings, register MCP, retire legacy, health check) |
| Sync | Bidirectional content-based comparison between repo and deployment |
| Update | Backup, pull, migrate, verify, auto-rollback on failure |
| Update-check | Version comparison between local and remote |
| Toggle | Global enable/disable with graceful degradation |
| `cc/` adapter | Owns the Claude Code platform adapter directory structure |

---

## 2. Responsibilities and Boundaries

### 2.1 What Switchboard Owns

**Hook Dispatcher (`dynamo-hooks.cjs`):**
- Receives raw hook events from Claude Code via stdin (JSON format)
- Checks the global toggle gate (`dynamo toggle on/off`) -- if disabled, exits silently
- Detects the current project from the working directory
- Builds the scope context (global, project-specific, session-specific)
- Routes the event to the appropriate handler in the owning subsystem
- Manages the hook error log (`hook-errors.log`)
- Ensures hooks always exit cleanly (exit code 0) -- hooks must never block Claude Code

**Install Lifecycle (`install.cjs`):**
- 6-step automated deployment:
  1. **Copy files** -- `dynamo/`, `ledger/`, `switchboard/` trees to `~/.claude/dynamo/`
  2. **Generate config** -- creates `config.json` from `.env` values
  3. **Merge settings** -- adds hook definitions to `~/.claude/settings.json` (backs up first)
  4. **Register MCP** -- registers Graphiti MCP server via `claude mcp add`
  5. **Retire legacy** -- moves legacy Python/Bash files to `~/.claude/graphiti-legacy/`
  6. **Health check** -- verifies the deployment (calls Terminus health check)
- Rollback support: checks `dynamo-backup/` for full-snapshot restore, falls back to legacy settings-only

**Bidirectional Sync (`sync.cjs`):**
- Content-based comparison using `Buffer.compare()` (not timestamp-based)
- Three-directory iteration: `dynamo/`, `ledger/`, `switchboard/` (current layout; evolves to `subsystems/` in new layout)
- Per-pair excludes array for clean filtering
- Dry-run mode for preview without changes
- Direction detection: newer in repo -> deploy; newer in deployment -> pull back to repo

**Update System (`update.cjs`):**
- Full update lifecycle:
  1. **Backup** -- snapshot current deployment to `dynamo-backup/`
  2. **Pull** -- `git pull` in repo directory
  3. **Migrate** -- run Terminus migrations for version gap
  4. **Verify** -- run Terminus health check and pipeline verification
  5. **Auto-rollback** -- on failure, restore from backup automatically
- Uses `copyTree` from install.cjs for backup operations

**Update Check (`update-check.cjs`):**
- Compare local VERSION against remote (GitHub releases API)
- Hand-rolled semver comparison (3-component numeric) -- zero-dependency constraint
- Human-readable status to stderr, `--format json` to stdout
- Separate 404 handling from network errors for "No releases published yet" message

**Toggle Gate:**
- Global on/off for the entire Dynamo system
- When disabled: hooks exit silently, CLI commands return "Dynamo is disabled" error
- `DYNAMO_DEV=1` environment variable bypasses toggle for development
- Toggle state stored in config.json

**`cc/` Adapter Directory:**
- Owns the structure and management of the Claude Code platform adapter directory
- `cc/hooks/` -- hook dispatcher and event definitions
- `cc/agents/` -- custom subagent definitions (e.g., `inner-voice.md`)
- `cc/skills/` -- loadable capability modules (future)
- `cc/rules/` -- project-specific rule files (future)
- `cc/prompts/` -- prompt templates (curation, summary, Inner Voice)
- `cc/CLAUDE-TEMPLATE.MD` -- deployed CLAUDE.md template
- `cc/settings-hooks.json` -- hook definitions for settings.json
- `cc/dynamo-cc.cjs` -- Claude Code-specific integration module

### 2.2 What Switchboard Does NOT Own

| Concern | Owner | Why Not Switchboard |
|---------|-------|-------------------|
| What hooks DO with events | Owning subsystems | Switchboard dispatches events; handlers live where the domain logic lives |
| UserPromptSubmit handler logic | Reverie | Cognitive processing is Reverie's domain |
| SessionStart handler logic | Reverie | Session briefing generation is Reverie's domain |
| Stop handler logic | Reverie | REM consolidation is Reverie's domain |
| PreCompact handler logic | Reverie | State preservation is Reverie's domain |
| PostToolUse handler logic | Ledger | File change capture is Ledger's domain |
| Data transport | Terminus | MCP client, Docker stack are Terminus infrastructure |
| Health checks | Terminus | Switchboard calls them during install but does not own the implementation |
| Diagnostics | Terminus | Same -- Switchboard calls, Terminus implements |
| Data access | Assay | Search, sessions, entity inspection are Assay's domain |
| Data construction | Ledger | Episode creation, curation are Ledger's domain |
| CLI routing | Dynamo | Dynamo routes commands; Switchboard handles a subset (install, sync, update, toggle) |
| Cognitive processing | Reverie | Switchboard has no intelligence layer |

### 2.3 The Handler Ownership Model

This is the most important boundary distinction in the entire subsystem architecture. In the current codebase (v1.2.1), hook handlers live in `ledger/hooks/` -- five handler files that process different Claude Code events. In the new architecture, handlers move to their owning subsystems:

| Hook Event | Current Handler Location | New Handler Owner | Rationale |
|-----------|------------------------|------------------|-----------|
| SessionStart | `ledger/hooks/session-start.cjs` | **Reverie** | Session briefing is cognitive processing |
| UserPromptSubmit | `ledger/hooks/user-prompt.cjs` | **Reverie** | Prompt augmentation is cognitive processing |
| PostToolUse | `ledger/hooks/post-tool-use.cjs` | **Ledger** | File change capture is data construction |
| PreCompact | `ledger/hooks/pre-compact.cjs` | **Reverie** | State preservation is cognitive processing |
| Stop | `ledger/hooks/stop.cjs` | **Reverie** | REM consolidation is cognitive processing |

**Switchboard's dispatcher routes to these handlers but does not contain them.** The routing table maps event types to handler module paths:

```javascript
// Event routing table (in Switchboard dispatcher)
const HANDLER_ROUTES = {
  'SessionStart':       '../reverie/handlers/session-start',
  'UserPromptSubmit':   '../reverie/handlers/user-prompt',
  'PostToolUse':        '../ledger/handlers/post-tool-use',
  'PreCompact':         '../reverie/handlers/pre-compact',
  'Stop':               '../reverie/handlers/stop'
};
```

### 2.4 Interface Contracts

**Switchboard receives events from Claude Code:**
- Hook events arrive via stdin as JSON objects
- Switchboard's dispatcher is the single entry point registered in `settings.json`
- All events pass through the toggle gate before routing

**Switchboard dispatches events to subsystems:**
- Reverie receives cognitive events (SessionStart, UserPromptSubmit, PreCompact, Stop)
- Ledger receives capture events (PostToolUse)
- Each handler returns output (for stdout injection) or nothing (silent processing)

**Switchboard calls Terminus during lifecycle operations:**
- Install calls `startStack()`, `runHealthCheck()` for post-deployment verification
- Update calls `runMigrations()` for version-gap migrations, `runHealthCheck()` for verification

**Switchboard is called by Dynamo CLI:**
- `dynamo install` -> `install(options)`
- `dynamo sync` -> `sync(options)`
- `dynamo update` -> `update(options)`
- `dynamo check-update` -> `checkUpdate(options)`
- `dynamo toggle on|off` -> `toggle(state)`

---

## 3. Architecture

### 3.1 Module Structure

#### Current Location to New Location Mapping

| Current File | LOC | Current Function | New Location |
|-------------|-----|-----------------|-------------|
| `dynamo/hooks/dynamo-hooks.cjs` | ~200 | Hook dispatcher | `cc/hooks/dynamo-hooks.cjs` |
| `switchboard/install.cjs` | 500 | Deployment installer | `subsystems/switchboard/install.cjs` |
| `switchboard/sync.cjs` | 400 | Bidirectional sync | `subsystems/switchboard/sync.cjs` |
| `switchboard/update.cjs` | 320 | Update/upgrade system | `subsystems/switchboard/update.cjs` |
| `switchboard/update-check.cjs` | 95 | Version check | `subsystems/switchboard/update-check.cjs` |

**Files moving OUT of Switchboard to Terminus:**

| Current File | New Location | Rationale |
|-------------|-------------|-----------|
| `switchboard/stack.cjs` | `subsystems/terminus/stack.cjs` | Infrastructure |
| `switchboard/health-check.cjs` | `subsystems/terminus/health-check.cjs` | Infrastructure |
| `switchboard/diagnose.cjs` | `subsystems/terminus/diagnose.cjs` | Infrastructure |
| `switchboard/verify-memory.cjs` | `subsystems/terminus/verify-memory.cjs` | Infrastructure |
| `switchboard/stages.cjs` | `subsystems/terminus/stages.cjs` | Infrastructure |
| `switchboard/migrate.cjs` | `subsystems/terminus/migrate.cjs` | Infrastructure |

**Files moving OUT of Switchboard to shared lib:**

| Current File | New Location | Rationale |
|-------------|-------------|-----------|
| `switchboard/pretty.cjs` | `lib/pretty.cjs` | Shared utility used by all subsystems |

#### Target Directory Layout

```
cc/                               # Claude Code platform adapter
  hooks/
    dynamo-hooks.cjs              # Hook dispatcher (Switchboard-owned)
  agents/
    inner-voice.md                # Custom subagent definition (Reverie content, cc/ managed)
  skills/                         # (future: loadable capability modules)
  rules/                          # (future: project-specific rules)
  prompts/                        # Prompt templates (Reverie content, cc/ managed)
    curation.md                   # Curation prompt template
    session-summary.md            # Session summary template
    iv-system-prompt.md           # Inner Voice system prompt
  CLAUDE-TEMPLATE.MD              # Deployed CLAUDE.md template
  settings-hooks.json             # Hook definitions for settings.json
  dynamo-cc.cjs                   # CC-specific integration module

subsystems/switchboard/
  install.cjs                     # 6-step deployment installer
  sync.cjs                        # Bidirectional content-based sync
  update.cjs                      # Backup, pull, migrate, verify, rollback
  update-check.cjs                # Version comparison (local vs remote)
```

### 3.2 Hook Event Flow

The complete event flow from Claude Code to handler response:

```
Claude Code                    Switchboard                    Handler Subsystem
    |                              |                              |
    |-- stdin JSON event --------->|                              |
    |                              |-- parse event type           |
    |                              |-- check toggle gate          |
    |                              |   (if disabled: exit 0)      |
    |                              |-- detect project             |
    |                              |-- build scope                |
    |                              |-- lookup handler route       |
    |                              |-- require(handler_module) -->|
    |                              |                              |-- process event
    |                              |                              |-- (may call Assay for reads)
    |                              |                              |-- (may call Ledger for writes)
    |                              |                              |-- (may call Terminus for transport)
    |                              |<-- handler return (output) --|
    |<-- stdout (injection) -------|                              |
    |                              |-- persist error log          |
    |                              |-- exit 0 (always)            |
```

**Critical invariant:** The dispatcher ALWAYS exits with code 0. Hook failures are logged to `hook-errors.log` but never propagate to Claude Code. A failing hook must not block the user's session.

### 3.3 Settings Integration

The `cc/settings-hooks.json` file defines how hooks are registered in Claude Code's `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "node ~/.claude/dynamo/cc/hooks/dynamo-hooks.cjs SessionStart"
      }
    ],
    "UserPromptSubmit": [
      {
        "type": "command",
        "command": "node ~/.claude/dynamo/cc/hooks/dynamo-hooks.cjs UserPromptSubmit"
      }
    ],
    "PostToolUse": [
      {
        "type": "command",
        "command": "node ~/.claude/dynamo/cc/hooks/dynamo-hooks.cjs PostToolUse"
      }
    ],
    "PreCompact": [
      {
        "type": "command",
        "command": "node ~/.claude/dynamo/cc/hooks/dynamo-hooks.cjs PreCompact"
      }
    ],
    "Stop": [
      {
        "type": "command",
        "command": "node ~/.claude/dynamo/cc/hooks/dynamo-hooks.cjs Stop"
      }
    ]
  }
}
```

**Key design decisions:**
- Single dispatcher file handles all events (no per-event separate executables)
- Event type passed as CLI argument to the dispatcher
- The dispatcher is a CJS command hook (not a server, not a daemon)
- Hook output goes to stdout; Claude Code captures it as `additionalContext`

### 3.4 Configuration Surface

Switchboard reads configuration from `config.json` for its operations and from `cc/settings-hooks.json` for hook definitions:

```javascript
// Operations config (from shared config.json)
{
  "toggle": {
    "enabled": true,           // Global enable/disable
    "dev_override": false      // DYNAMO_DEV=1 overrides
  },
  "install": {
    "deploy_path": "~/.claude/dynamo",
    "settings_path": "~/.claude/settings.json",
    "backup_path": "~/.claude/dynamo-backup"
  },
  "sync": {
    "dry_run": false,          // Preview mode
    "exclude": [               // Files excluded from sync
      "config.json",
      ".env",
      "node_modules"
    ]
  }
}
```

---

## 4. Interfaces

### 4.1 Inbound Interfaces (Who Calls Switchboard)

#### From Claude Code (Hook Events)

```javascript
// Claude Code invokes the dispatcher as a command hook
// Event arrives via stdin as JSON:
{
  "event": "UserPromptSubmit",
  "data": {
    "prompt": "user's prompt text",
    "timestamp": "2026-03-19T17:00:00Z"
    // Additional event-specific fields
  }
}

// Dispatcher response via stdout (for additionalContext injection):
{
  "additionalContext": "Contextual injection from memory system..."
}

// Or empty response (no injection needed):
// (no stdout output)
```

#### From Dynamo CLI (Command Routing)

```javascript
// Dynamo routes lifecycle commands to Switchboard
const { install } = require('./subsystems/switchboard/install');
const { sync } = require('./subsystems/switchboard/sync');
const { update } = require('./subsystems/switchboard/update');
const { checkUpdate } = require('./subsystems/switchboard/update-check');

// CLI: dynamo install
case 'install': return install({ config, output });

// CLI: dynamo sync
case 'sync': return sync({ config, output, dryRun });

// CLI: dynamo update
case 'update': return update({ config, output });

// CLI: dynamo check-update
case 'check-update': return checkUpdate({ config, output, format });

// CLI: dynamo toggle on|off
case 'toggle': return toggle({ state, config, output });
```

### 4.2 Outbound Interfaces (What Switchboard Calls)

#### Dispatching to Subsystem Handlers

```javascript
// Switchboard dispatcher routes events to handlers
// Each handler implements the same interface:
async function handleEvent(event, context) {
  // event: the parsed hook event data
  // context: { scope, project, config, ... }
  // returns: { additionalContext: String } or null
}
```

**Event routing table:**

| Event Type | Handler Module | Handler Subsystem | What It Does |
|-----------|---------------|------------------|-------------|
| SessionStart | `reverie/handlers/session-start` | Reverie | Load state, assess context, generate briefing |
| UserPromptSubmit | `reverie/handlers/user-prompt` | Reverie | Activation update, threshold check, injection |
| PostToolUse | `ledger/handlers/post-tool-use` | Ledger | Extract entities, capture file changes |
| PreCompact | `reverie/handlers/pre-compact` | Reverie | Persist state, generate compact summary |
| Stop | `reverie/handlers/stop` | Reverie | REM consolidation, session synthesis |

#### Calling Terminus During Operations

```javascript
// Install calls Terminus for stack and health
const { startStack } = require('../terminus/stack');
const { runHealthCheck } = require('../terminus/health-check');

// During install step 6 (health check):
const results = await runHealthCheck({ config });

// Update calls Terminus for migrations
const { runMigrations } = require('../terminus/migrate');

// During update step 3 (migrate):
await runMigrations({ fromVersion, toVersion, config });
```

### 4.3 Data Contracts

#### Hook Event Schema

The hook event schema is defined by Claude Code, not by Switchboard. Switchboard parses the Claude Code event format and passes it through to handlers.

**Standard event envelope (from Claude Code stdin):**

```javascript
{
  "event": String,        // Event type: SessionStart | UserPromptSubmit | PostToolUse | PreCompact | Stop
  "data": {
    // Event-specific fields (defined by Claude Code)
    "prompt": String,     // UserPromptSubmit: the user's prompt
    "tool": String,       // PostToolUse: the tool that was used
    "output": String,     // PostToolUse: the tool's output
    // ... additional fields per event type
  }
}
```

**Switchboard adds context before dispatching:**

```javascript
{
  event: Object,            // Original Claude Code event
  context: {
    scope: String,          // Computed scope (e.g., "project-dynamo")
    project: String,        // Detected project name
    projectPath: String,    // Working directory
    config: Object,         // Loaded config.json
    configPath: String,     // Path to config.json
    enabled: Boolean,       // Toggle state
    timestamp: String       // ISO timestamp of dispatch
  }
}
```

#### Hook Handler Response Schema

```javascript
// Handler returns injection content or null
{
  additionalContext: String    // Content to inject into Claude's context
}
// OR
null                          // No injection needed
```

#### Install Result Schema

```javascript
{
  success: Boolean,
  steps: [
    { name: String, status: 'PASS' | 'FAIL' | 'SKIP', detail: String }
  ],
  warnings: [String],        // Non-fatal issues
  errors: [String]           // Fatal issues (if success === false)
}
```

---

## 5. Implementation Detail

### 5.1 Hook Dispatcher

The dispatcher is the core of Switchboard's event processing. It is invoked by Claude Code as a command hook registered in `settings.json`.

**Current implementation (dynamo/hooks/dynamo-hooks.cjs, ~200 LOC):**

**Dispatch flow:**

```javascript
async function dispatch(eventType) {
  try {
    // 1. Parse stdin for event data
    const input = await readStdin();
    const event = JSON.parse(input);

    // 2. Check toggle gate
    const config = loadConfig(configPath);
    if (!isEnabled(config) && !process.env.DYNAMO_DEV) {
      process.exit(0);  // Silent exit when disabled
    }

    // 3. Detect project
    const project = detectProject(process.cwd());

    // 4. Build scope
    const scope = buildScope(project);

    // 5. Route to handler
    const handlerPath = HANDLER_ROUTES[eventType];
    if (!handlerPath) {
      logError(`Unknown event type: ${eventType}`);
      process.exit(0);
    }

    const handler = require(handlerPath);
    const result = await handler.handleEvent(event, { scope, project, config });

    // 6. Output injection (if any)
    if (result?.additionalContext) {
      process.stdout.write(JSON.stringify({
        additionalContext: result.additionalContext
      }));
    }

  } catch (err) {
    // Log error but NEVER fail
    logError(err);
    process.exit(0);  // Always exit cleanly
  }
}
```

**Key behaviors:**

1. **Toggle gate.** First check after parsing. If Dynamo is disabled globally, the dispatcher exits immediately with no output. `DYNAMO_DEV=1` bypasses the toggle for the current process only.

2. **Project detection.** Examines the working directory to determine which project is active. This informs scope building (e.g., `project-dynamo` vs `project-myapp`).

3. **Scope building.** Constructs the scope string from the project context. The scope determines which knowledge graph partition is queried/written.

4. **Error isolation.** Every error is caught and logged to `hook-errors.log`. The dispatcher always exits with code 0. Errors never propagate to Claude Code. This is a critical safety property -- a bug in Dynamo must never block a user's Claude Code session.

5. **Error log rotation.** `hook-errors.log` auto-rotates at 1MB to prevent unbounded growth.

### 5.2 Install System

Six-step automated deployment.

**Current implementation (switchboard/install.cjs, 500 LOC):**

**Step-by-step:**

| # | Step | What It Does | Failure Mode |
|---|------|-------------|-------------|
| 1 | Copy files | `copyTree()` from repo to `~/.claude/dynamo/` | Fatal: deployment incomplete |
| 2 | Generate config | Create `config.json` from `.env` values | Fatal: no runtime config |
| 3 | Merge settings | Add hook definitions to `~/.claude/settings.json` | Non-fatal: hooks not registered |
| 4 | Register MCP | `claude mcp add` for Graphiti | Non-fatal: MCP not registered |
| 5 | Retire legacy | Move old Python/Bash to `~/.claude/graphiti-legacy/` | Non-fatal: legacy persists |
| 6 | Health check | Run Terminus health check | Warning: deployment unverified |

**Key behaviors:**

- **Settings backup.** Before modifying `settings.json`, creates a timestamped backup
- **MCP deregistration.** Deregistration is defensive -- OK status whether the server was registered or not
- **Rollback.** `rollback()` function checks `dynamo-backup/` first for full-snapshot restore, falls back to legacy settings-only restore
- **Idempotent.** Running install twice produces the same result (no duplicate entries in settings.json, no duplicate MCP registrations)

### 5.3 Bidirectional Sync

Content-based synchronization between repo and deployment.

**Current implementation (switchboard/sync.cjs, 400 LOC):**

**Sync algorithm:**

```
For each directory pair (repo_dir, deploy_dir):
  For each file in both directories:
    1. Read both copies
    2. Compare with Buffer.compare() (byte-level comparison)
    3. If different:
       a. Check per-pair excludes (skip if excluded)
       b. Determine direction (newer file wins, or user-specified)
       c. Copy in determined direction
    4. If same: skip
```

**Key behaviors:**

- **Content-based, not timestamp-based.** `Buffer.compare()` ensures only genuinely different files are synced. This avoids false positives from metadata changes.
- **Per-pair excludes.** Each directory pair can specify files to exclude from sync (e.g., `config.json` is excluded because it is generated, not synced).
- **Dry-run mode.** `--dry-run` shows what would change without making changes.
- **Bidirectional.** Changes can flow in both directions: repo-to-deploy (after code changes) or deploy-to-repo (after manual deployment edits).
- **Three-directory iteration.** Currently iterates `dynamo/`, `ledger/`, `switchboard/`. Evolves to new layout in 1.3-M1.

### 5.4 Update System

Full update lifecycle with automatic rollback.

**Current implementation (switchboard/update.cjs, 320 LOC):**

**Update flow:**

```
1. BACKUP
   - copyTree() from ~/.claude/dynamo/ to ~/.claude/dynamo-backup/
   - Record current VERSION

2. PULL
   - git pull in repo directory
   - Verify pull succeeded

3. MIGRATE
   - Call Terminus runMigrations(fromVersion, toVersion)
   - Migrations execute sequentially
   - On migration failure: ROLLBACK

4. VERIFY
   - Call Terminus runHealthCheck()
   - Call Terminus runVerifyMemory() (optional, if available)
   - On verification failure: ROLLBACK

5. COMPLETE
   - Deploy new files (via install step 1)
   - Update VERSION file
   - Report success

ROLLBACK (on any failure):
   - Restore from dynamo-backup/
   - Restore original VERSION
   - Report failure with details
```

**Key behaviors:**

- **Snapshot backup.** Uses `copyTree` from install.cjs -- no new directory copy logic.
- **Auto-rollback.** Any failure at steps 3-4 triggers automatic rollback to the backup snapshot.
- **Version-gap migrations.** The migration harness (Terminus) handles multi-version jumps by executing all applicable migrations in sequence.

### 5.5 The `cc/` Directory

The `cc/` directory is the Claude Code platform adapter. It isolates all Claude Code-specific integration from platform-agnostic subsystem logic. Switchboard owns the `cc/` directory structure and manages its contents during install and sync.

**What lives in `cc/`:**

| Path | Owner | Content |
|------|-------|---------|
| `cc/hooks/dynamo-hooks.cjs` | Switchboard | The hook dispatcher |
| `cc/agents/inner-voice.md` | Reverie (content), Switchboard (deployment) | Custom subagent definition |
| `cc/skills/` | (future) | Loadable capability modules |
| `cc/rules/` | (future) | Project-specific rule files |
| `cc/prompts/` | Reverie (content), Switchboard (deployment) | Prompt templates |
| `cc/CLAUDE-TEMPLATE.MD` | Switchboard | CLAUDE.md template for deployment |
| `cc/settings-hooks.json` | Switchboard | Hook definitions for settings.json |
| `cc/dynamo-cc.cjs` | Switchboard | CC-specific integration module |

**Ownership distinction:** Switchboard owns the `cc/` directory structure and the deployment mechanism. Reverie owns the content of agent definitions and prompt templates that live within `cc/`. During install and sync, Switchboard copies these files to the deployment directory; Reverie defines what is in them.

**The platform adapter pattern:** The existence of `cc/` enables future platform adapters. A web interface could add `web/` alongside `cc/`. An API service could add `api/`. Each adapter would contain platform-specific integration while subsystem logic in `subsystems/` remains unchanged. This is Claudia-aware design: the architecture supports future expansion without requiring subsystem changes.

---

## 6. Migration Path

### 6.1 Files Moving Within Switchboard

| Current Location | New Location | Change Type |
|-----------------|-------------|-------------|
| `switchboard/install.cjs` | `subsystems/switchboard/install.cjs` | Move (directory change) |
| `switchboard/sync.cjs` | `subsystems/switchboard/sync.cjs` | Move (directory change) |
| `switchboard/update.cjs` | `subsystems/switchboard/update.cjs` | Move (directory change) |
| `switchboard/update-check.cjs` | `subsystems/switchboard/update-check.cjs` | Move (directory change) |

### 6.2 Files Moving FROM Switchboard to Other Subsystems

| Current Location | New Location | New Owner | Rationale |
|-----------------|-------------|-----------|-----------|
| `switchboard/stack.cjs` | `subsystems/terminus/stack.cjs` | Terminus | Infrastructure |
| `switchboard/health-check.cjs` | `subsystems/terminus/health-check.cjs` | Terminus | Infrastructure |
| `switchboard/diagnose.cjs` | `subsystems/terminus/diagnose.cjs` | Terminus | Infrastructure |
| `switchboard/verify-memory.cjs` | `subsystems/terminus/verify-memory.cjs` | Terminus | Infrastructure |
| `switchboard/stages.cjs` | `subsystems/terminus/stages.cjs` | Terminus | Infrastructure |
| `switchboard/migrate.cjs` | `subsystems/terminus/migrate.cjs` | Terminus | Infrastructure |
| `switchboard/pretty.cjs` | `lib/pretty.cjs` | Dynamo (shared) | Shared utility |

### 6.3 Files Moving TO Switchboard-Managed Locations

| Current Location | New Location | Change Type |
|-----------------|-------------|-------------|
| `dynamo/hooks/dynamo-hooks.cjs` | `cc/hooks/dynamo-hooks.cjs` | Move (Dynamo -> cc/) |
| `dynamo/prompts/` | `cc/prompts/` | Move (Dynamo -> cc/) |
| `claude-config/settings-hooks.json` | `cc/settings-hooks.json` | Move (claude-config -> cc/) |
| `claude-config/CLAUDE.md.template` | `cc/CLAUDE-TEMPLATE.MD` | Move + rename |

### 6.4 Breaking Changes

**Dispatcher path in settings.json must update:**

```json
// Current:
"command": "node ~/.claude/dynamo/hooks/dynamo-hooks.cjs SessionStart"

// New:
"command": "node ~/.claude/dynamo/cc/hooks/dynamo-hooks.cjs SessionStart"
```

This is a breaking change that must be handled during the 1.3-M1 install migration. The install step that merges settings must update the hook command paths.

**Import path changes in Switchboard operations modules:**

| Module | Old Import | New Import |
|--------|-----------|------------|
| install.cjs | `require('./health-check')` | `require('../terminus/health-check')` |
| install.cjs | `require('./stack')` | `require('../terminus/stack')` |
| update.cjs | `require('./migrate')` | `require('../terminus/migrate')` |
| update.cjs | `require('./health-check')` | `require('../terminus/health-check')` |

### 6.5 Agent Definition Management

Custom subagent definitions (`.claude/agents/inner-voice.md`) are managed through `cc/agents/`. During install:

1. Switchboard copies `cc/agents/inner-voice.md` to `~/.claude/agents/inner-voice.md`
2. The file is a Markdown document with YAML frontmatter (Claude Code agent definition format)
3. Reverie defines the content; Switchboard handles the deployment

During sync:

1. Changes to `cc/agents/inner-voice.md` in the repo propagate to the deployment
2. The sync system treats agent definitions like any other deployed file
3. Content-based comparison ensures only genuine changes are deployed

### 6.6 Backward Compatibility Strategy

During migration, Switchboard's operations modules can temporarily remain at their old paths with re-export shims:

```javascript
// switchboard/install.cjs (temporary shim during migration)
module.exports = require('../subsystems/switchboard/install');
```

The dispatcher path change (Section 6.4) requires a migration script in Terminus that updates `~/.claude/settings.json` to reference the new path. This migration runs during the 1.3-M1 update.

---

## 7. Open Questions

### 7.1 `cc/` Directory Ownership

**Question:** Should Switchboard own the `cc/` directory entirely, or should `cc/` be a peer of `subsystems/` with shared ownership?

**Current thinking:** Switchboard owns the `cc/` directory structure and deployment mechanism. Content within `cc/` may be authored by other subsystems (Reverie writes agent definitions and prompt templates) but deployed by Switchboard. This follows the pattern of a platform adapter layer that is managed by the operations subsystem.

**Alternative:** `cc/` could be a top-level directory managed by Dynamo (the system wrapper) rather than by Switchboard. This would separate "what the Claude Code adapter contains" from "how Dynamo deploys."

**Recommendation:** Switchboard owns `cc/` for pragmatic reasons -- the install and sync systems already manage file deployment, and `cc/` is just another deployment target. Content authorship is separate from directory ownership.

### 7.2 Hook Handler Registration

**Question:** Should handler routing be static (hardcoded in the dispatcher, updated during install) or dynamic (subsystems register their own handlers at startup)?

**Current thinking:** Static registration. The handler routing table is hardcoded in the dispatcher and updated during install/update. This is simpler, more predictable, and consistent with the zero-external-dependency constraint.

**Rationale against dynamic registration:**
- Hooks execute in <500ms budgets. Dynamic registration adds discovery overhead.
- The routing table changes only when subsystems change (during updates), not at runtime.
- Static routing is easier to debug -- the routing table is visible in one place.
- Dynamic registration requires a registration protocol, persistence, and conflict resolution -- complexity that adds no value when the subscriber list is known at build time.

### 7.3 Per-Project Hook Configuration

**Question:** Should Switchboard support per-project hook configurations (different handlers or different behavior for different projects)?

**Current thinking:** Not in v1.3. All projects use the same hook handlers. Project-specific behavior is achieved through scope-based data partitioning (different scopes query different knowledge graph partitions), not through different handlers.

**Future consideration:** If per-project customization becomes necessary (e.g., some projects want verbose injection, others want minimal), it could be implemented via a project-level configuration file that handlers read, rather than through different handlers.

### 7.4 Hook Timeout Enforcement

**Question:** Should Switchboard enforce a timeout on handler execution to prevent slow handlers from blocking Claude Code?

**Current thinking:** Yes, but soft enforcement. Claude Code itself enforces hook timeouts (hooks that exceed the timeout are killed). Switchboard should have its own internal timeout (slightly shorter than Claude Code's limit) that logs a warning and returns a partial result when a handler is slow.

**Implementation:** `Promise.race` with a timeout promise in the dispatcher:

```javascript
const result = await Promise.race([
  handler.handleEvent(event, context),
  timeoutPromise(HANDLER_TIMEOUT_MS)
]);
```

This allows Switchboard to log slow handlers (for debugging) while still returning within Claude Code's external timeout.

---

## Document References

| Document | Relationship |
|----------|-------------|
| **DYNAMO-PRD.md** | Defines subsystem boundaries. Switchboard is the Dispatcher and Operations Layer in the six-subsystem architecture. |
| **TERMINUS-SPEC.md** | Terminus provides infrastructure functions that Switchboard calls during install and update. Files move from Switchboard to Terminus. |
| **REVERIE-SPEC.md** | Reverie owns the hook handler logic that Switchboard dispatches to. Reverie authors content that Switchboard deploys via cc/. |
| **LEDGER-SPEC.md** | Ledger owns the PostToolUse handler that Switchboard dispatches to. |
| **ASSAY-SPEC.md** | Assay provides read operations; no direct interface with Switchboard. |
| **INNER-VOICE-SYNTHESIS-RESEARCH.md** | Track B Section 4 defines the hybrid architecture (CJS hooks for hot path + custom subagent for deliberation) that informs Switchboard's dispatcher design. |

---

*Specification date: 2026-03-19*
*Subsystem: Switchboard (Dispatcher and Operations Layer)*
*Boundary: Hook dispatching, install/sync/update lifecycle, cc/ adapter management*
*Migration source: dynamo/hooks/dynamo-hooks.cjs + switchboard/{install,sync,update,update-check}.cjs + claude-config/*
*Key distinction: Switchboard dispatches events to handlers but does not implement handler logic*
