# Unfuck The Whole Damn Thing

## Problem Statement

Dynamo was built with a bootstrap-per-invocation model. Every `bun bin/dynamo.cjs` call creates a fresh process: initializes all services, loads modules, runs the command, exits. All state dies with the process.

This means:
- **RAM state is meaningless.** Magnet stores mode, sessions, topology in memory. Next invocation sees nothing.
- **Hooks are disconnected.** Each hook invocation bootstraps Dynamo fresh. Hook handlers call `sessionManager.start()` and `wireTopology.send()` on service instances that die milliseconds later.
- **DuckDB contention.** Multiple simultaneous processes (hook invocations, CLI commands, relay server) race to open DuckDB. Single-writer constraint violated.
- **Prompts are opaque.** All prompt engineering lives as string literals in `.cjs` files. Invisible to review, impossible to audit, tightly coupled to assembly logic.

The hook handlers from Phases 8-12 were not wrong. They assumed a persistent runtime with live services. The runtime model was wrong. This plan corrects the runtime and adds the prompt infrastructure that should have existed from the start.

---

## The Fix: Two Architectural Changes

### 1. Dynamo Becomes a Persistent Daemon

One process. Long-lived. All services initialized once. CLI commands and hooks are thin clients that talk to the running daemon via HTTP on localhost. The daemon is either running or not — explicit lifecycle, no auto-start.

### 2. Linotype: Prompt Template Library

All prompts become inspectable markdown files with JSON frontmatter and template syntax. A new library component (`lib/linotype/`) provides parsing, template resolution, and composition. The SDK exposes it to modules. Exciter receives assembled output and delivers it to Claude Code.

---

## Daemon Architecture

### Process Lifecycle

```
bun bin/dynamo.cjs start
  --> Checks: daemon already running? (PID file check)
  --> If running: report status, exit
  --> If not: spawn daemon as detached child process
  --> Wait for health check to pass (GET /health, 5s timeout)
  --> Report: "Dynamo running (PID {pid}, port {port})"
  --> Parent exits. Daemon continues.

bun bin/dynamo.cjs stop
  --> Thin client sends POST /shutdown to daemon
  --> Daemon: signal all active modules to shut down
    --> Reverie: REM consolidation, triad termination, state persist
  --> Close HTTP server
  --> Close Ledger connection (DuckDB)
  --> Remove PID/port file
  --> Flush and close log file
  --> Process exit 0

bun bin/dynamo.cjs status
  --> Thin client sends GET /health to daemon
  --> Returns: uptime, loaded modules, active triads, port, PID
  --> If daemon not running: "Dynamo is not running."
```

### HTTP Server (Single Bun.serve Instance)

One server. Route-based dispatch. Three concerns.

```
Bun.serve({
  port: DYNAMO_PORT || 9876,
  fetch(req, server) {
    /hook          --> Exciter (hook events from thin clients)
    /cli           --> Pulley (CLI commands from thin clients)
    /health        --> Daemon health + module status
    /shutdown      --> Graceful shutdown sequence
    /module/enable --> Module lifecycle (load, init, activate)
    /module/disable--> Module lifecycle (deactivate, cleanup)
    /wire/register --> Wire relay (session registration)
    /wire/send     --> Wire relay (message dispatch)
    /wire/send-batch -> Wire relay (batch dispatch)
    /wire/poll     --> Wire relay (long-poll for messages)
    /ws            --> WebSocket upgrade (Wire relay persistent connections)
  },
  websocket: { /* Wire relay WS handlers */ }
});
```

### IPC Contract

**Hook Dispatch:**
```
POST /hook
Request:
{
  "type": "SessionStart",           // Hook type (8 types)
  "payload": { ... },               // Claude Code hook payload (from stdin)
  "env": {                          // Relevant env vars from hook process
    "SESSION_IDENTITY": "primary",  // Set by Conductor for spawned sessions
    "TRIPLET_ID": "abc-123",        // Set by Conductor for spawned sessions
    "DYNAMO_DEV_BYPASS": "0"        // Dev bypass flag
  }
}
Response:
{
  "hookSpecificOutput": {
    "additionalContext": "..."       // Injected into Claude Code context
  }
}
// Empty {} when no handlers registered or no active triad for this session
```

**CLI Command Forwarding:**
```
POST /cli
Request:
{
  "command": "reverie",
  "args": ["status"],
  "flags": { "json": false, "raw": false }
}
Response:
{
  "output": "Mode: active\nTriad: abc-123\n...",
  "exitCode": 0
}
```

**Health Check:**
```
GET /health
Response:
{
  "status": "running",
  "pid": 12345,
  "port": 9876,
  "uptime_seconds": 3600,
  "modules": [
    {
      "name": "reverie",
      "enabled": true,
      "triads": [
        { "id": "abc-123", "mode": "active", "sessions": 3 }
      ]
    }
  ]
}
```

**Module Lifecycle:**
```
POST /module/enable
Request: { "module": "reverie" }
Response: { "status": "enabled", "triadId": "abc-123" }

POST /module/disable
Request: { "module": "reverie" }
Response: { "status": "disabled" }
```

### PID/Port Management

Location: `<project_root>/.dynamo/daemon.json`

```json
{
  "pid": 12345,
  "port": 9876,
  "started": "2026-03-28T22:00:00.000Z",
  "version": "0.1.0"
}
```

The `.dynamo/` directory is gitignored. It contains runtime-only state:
- `daemon.json` — PID, port, start time
- `dynamo.log` — daemon stdout/stderr (rotated or capped)
- `active-triad.json` — current triad identity mapping (see Session Identity section)

Thin client discovery: read `.dynamo/daemon.json`. If file missing, daemon is not running. If file present, verify PID is alive (`process.kill(pid, 0)`). If PID dead, daemon crashed — warn user, clean up stale file.

Port: default 9876 (matches existing relay default). Override via `DYNAMO_PORT` env var or `config.json` field. Written to `daemon.json` on start.

### Service Initialization (Inside Daemon)

Runs once on daemon start. Same bootstrap sequence as current `core.cjs` with one change: it doesn't exit after running.

```
1.  Switchboard      (event bus, no dependencies)
2.  Lathe            (filesystem, no dependencies)
3.  Commutator       (I/O observer, depends: switchboard)
4.  Magnet           (state holder, depends: switchboard, lathe)
      --> RAM-only by default. No persistence provider wired.
5.  Conductor        (process management, depends: switchboard)
6.  Forge            (git operations, depends: lathe, switchboard)
7.  Relay            (install/update/sync, depends: forge, lathe, switchboard) --> UNCHANGED
8.  Wire             (messaging, depends: switchboard, conductor)
      --> Wire relay transport merged into daemon HTTP server (wire/relay-server.cjs routes).
      --> The Relay SERVICE (install/update/sync) is a different component — unchanged.
9.  Assay            (search/query, depends: switchboard, ledger, journal)
10. Exciter          (Claude Code integration, depends: switchboard, lathe)

Providers:
11. Ledger           (DuckDB, depends: switchboard)
      --> Single connection. Open once. Single writer. No contention.
12. Journal          (flat file, depends: lathe, switchboard)
13. Lithograph       (transcript, depends: lathe)

Post-boot:
14. Create Pulley CLI framework
15. Create Circuit module API
16. Register platform CLI commands
17. Discover module manifests (available but NOT enabled)
18. Update settings.json hook entries (idempotent)
19. Start HTTP server
20. Write PID/port file
21. Daemon ready. Accepting connections.
```

### Module Lifecycle

Modules have four states: `discovered`, `enabled`, `active`, `disabled`.

- **Discovered:** Manifest loaded during daemon startup. Module code not yet executed.
- **Enabled:** Module's `register()` called. Services created. Hook handlers registered with Exciter. No active triad yet.
- **Active:** At least one triad is running. Hooks produce real responses.
- **Disabled:** Module's cleanup called. Handlers deregistered. Services torn down.

State transitions:
```
discovered --> enabled     (POST /module/enable)
enabled    --> active      (/reverie enable creates triad)
active     --> enabled     (all triads shut down, module stays loaded)
enabled    --> disabled    (POST /module/disable)
disabled   --> enabled     (POST /module/enable, re-registers)
```

### Logging

Daemon runs as a background process. `console.log` goes nowhere. All output routes to `.dynamo/dynamo.log`.

Log format: `[ISO-TIMESTAMP] [LEVEL] [SOURCE] message`

```
[2026-03-28T22:00:01.234Z] [INFO] [daemon] Dynamo started on port 9876
[2026-03-28T22:00:01.456Z] [INFO] [bootstrap] Services initialized (10 services, 3 providers)
[2026-03-28T22:00:05.789Z] [INFO] [exciter] Hook received: SessionStart (no handlers, returning empty)
[2026-03-28T22:01:12.345Z] [INFO] [module] Reverie enabled, hook handlers registered
[2026-03-28T22:01:15.678Z] [INFO] [conductor] Spawned Secondary (PID 12346, triad abc-123)
```

v1 cap: truncate log file at 10MB (check on each write, truncate from head). Log rotation is a future refinement.

### Signal Handling

The daemon registers handlers for system signals immediately on startup:

```javascript
process.on('SIGTERM', () => gracefulShutdown('SIGTERM', 10000)); // 10s timeout
process.on('SIGINT',  () => gracefulShutdown('SIGINT', 5000));   // 5s for ctrl-C
```

`gracefulShutdown(signal, timeout)` runs the shutdown sequence below. If it doesn't complete within `timeout`, force-exits with `process.exit(1)`. This prevents zombie daemons.

### Graceful Shutdown Sequence

```
1. Stop accepting new HTTP connections
2. Signal all active modules (with per-module timeout):
   a. Reverie: initiate REM on active Secondary sessions
   b. Reverie: wait for REM completion (timeout: 30s for POST /shutdown, 10s for SIGTERM)
   c. Reverie: terminate Secondary and Tertiary sessions (SIGTERM)
   d. Reverie: persist any opt-in state via Ledger/Journal
   e. If REM timeout exceeded: log warning, proceed (fragments in working memory are lost)
3. Deregister all hook handlers from Exciter
4. Close Ledger connection (DuckDB flush + close)
5. Close Journal handles
6. Stop HTTP server
7. Remove .dynamo/daemon.json
8. Remove .dynamo/active-triad.json (safety net — module should clean this in step 2)
9. Flush and close log file
10. Process exit 0
```

Hard shutdown (SIGTERM to daemon PID): same sequence with 10s total timeout. If REM doesn't finish, fragments in session working memory are lost — they were provisional anyway (REM is what promotes them). SIGKILL as last resort leaves stale PID file — next startup detects, warns, and cleans.

### Crash Recovery

If the daemon crashes (segfault, OOM, kill -9):
- **RAM state is lost.** By design. Modules that need cross-crash durability use persistence providers.
- **Orphaned sessions.** Secondary and Tertiary are detached terminal windows — they keep running. On next `dynamo start`, the daemon starts clean. The new daemon does NOT attempt to re-adopt orphaned sessions (complexity not worth it). Instead:
  1. Next `dynamo start` detects stale PID file, warns: "Previous daemon crashed. Cleaning up."
  2. Cleans stale `.dynamo/daemon.json` and `.dynamo/active-triad.json`.
  3. User runs `reverie kill` to nuke orphaned sessions before re-enabling Reverie.
  4. `reverie kill` is preserved as the nuclear pre-bootstrap option — it scans process table directly, no daemon needed.
- **DuckDB WAL files.** DuckDB handles WAL recovery on next connection open. Ledger opens DuckDB during daemon startup — recovery is automatic.

---

## Thin Client Design

### bin/dynamo.cjs Becomes a Router

Current `bin/dynamo.cjs` bootstraps the entire platform on every invocation (200+ lines of setup). In the daemon model, it becomes a thin router (~80 lines):

```
command = process.argv[2]

"start"         --> Launch daemon (spawn detached child, wait for health)
"stop"          --> POST /shutdown to daemon
"status"        --> GET /health from daemon
"hook <Type>"   --> Forward hook to daemon (POST /hook)
"reverie kill"  --> Pre-bootstrap nuclear option (unchanged, no daemon needed)
*               --> Forward CLI to daemon (POST /cli)
```

The actual daemon code lives in a separate entry point (`core/daemon.cjs`). The `start` command spawns it as a detached background process.

**Bun daemonization:** `Bun.spawn` does not have Node's `detached: true` option. The reliable cross-platform pattern is a shell wrapper:

```javascript
// Spawn daemon via nohup to ensure it survives parent exit
const logPath = path.join(projectRoot, '.dynamo', 'dynamo.log');
const daemonProc = Bun.spawn(
  ['nohup', 'bun', daemonEntryPoint],
  {
    env: { ...process.env, DYNAMO_DAEMON_MODE: '1' },
    stdout: Bun.file(logPath),
    stderr: Bun.file(logPath),
    stdin: null,
  }
);
daemonProc.unref();
// Wait for health check — daemon writes PID file on ready
await waitForHealth(port, 5000);
```

If `nohup` proves problematic on macOS (unlikely — it's POSIX standard), fallback is `setsid` or spawning via a temp shell script (same pattern Conductor uses for terminal windows). This must be validated empirically during Wave 1b implementation.

### Hook Dispatch (Thin Client)

```javascript
// Read hook payload from stdin (Claude Code sends JSON)
const payload = JSON.parse(await readStdin());
const hookType = process.argv[3]; // e.g., "SessionStart"

// Check dev bypass
if (process.env.DYNAMO_DEV_BYPASS === '1') {
  process.stdout.write('{}');
  process.exit(0);
}

// Find daemon
const daemon = readDaemonFile(); // .dynamo/daemon.json

if (!daemon) {
  // Daemon not running. Silent no-op.
  process.stdout.write('{}');
  process.exit(0);
}

// Read triad identity (if exists)
const triad = readTriadFile(); // .dynamo/active-triad.json

// Forward to daemon
const response = await fetch(`http://localhost:${daemon.port}/hook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: hookType,
    payload,
    env: {
      SESSION_IDENTITY: process.env.SESSION_IDENTITY || triad?.faceIdentity,
      TRIPLET_ID: process.env.TRIPLET_ID || triad?.triadId,
    }
  })
});

if (!response.ok) {
  // Daemon returned error — something is broken. Be loud.
  const err = await response.text();
  process.stderr.write(`Dynamo hook error (${hookType}): ${err}\n`);
  process.exit(1);
}

process.stdout.write(await response.text());
process.exit(0);
```

### CLI Forwarding (Thin Client)

```javascript
const daemon = readDaemonFile();

if (!daemon) {
  // CLI requires daemon. Report clearly.
  console.error('Dynamo is not running. Start with: bun bin/dynamo.cjs start');
  process.exit(1);
}

const response = await fetch(`http://localhost:${daemon.port}/cli`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    command: process.argv[2],
    args: process.argv.slice(3),
    flags: parseFlags(process.argv)
  })
});

const result = await response.json();
process.stdout.write(result.output);
process.exit(result.exitCode);
```

### Off-Ramp Decision Tree

| # | Daemon | Module | Triad | Behavior | Exit |
|---|--------|--------|-------|----------|------|
| 1 | Off (no PID file) | -- | -- | `{}`, silent | 0 |
| 2 | Crashed (PID file, dead process) | -- | -- | stderr warning, cleanup stale PID | 1 |
| 3 | On | Not enabled | -- | `{}`, silent | 0 |
| 4 | On | Enabled | None for this session | `{}`, silent | 0 |
| 5 | On | Enabled | Active | Real processing, return response | 0 |
| 6 | On | Enabled | Active, handler error | stderr error with context | 1 |
| 7 | Dev bypass (env) | -- | -- | `{}`, silent | 0 |

**Rule: silence means intentional. Noise means broken.**

States 1, 3, 4, 7 are expected — user hasn't enabled Dynamo/Reverie or is in dev mode. No errors, no output, Claude Code sees nothing.

States 2, 6 are bugs — daemon crashed or handler failed when it should work. Loud, descriptive errors.

---

## Linotype: Prompt Template Library

### Architecture

Lives in `lib/linotype/`. Library layer — no service dependencies, no state, no npm dependencies. Pure capability.

```
lib/linotype/
  linotype.cjs        -- Public API: parse, cast, compose
  parser.cjs          -- Markdown + frontmatter parser
  engine.cjs          -- Template syntax resolver
  composer.cjs        -- Multi-template composition
  validator.cjs       -- Slot validation, frontmatter schema
  types.cjs           -- Matrix, Slug, Forme type definitions
  linotype.test.cjs   -- Unit tests
```

### Concepts

| Term | Origin | Meaning |
|------|--------|---------|
| **Matrix** | Linotype character mold | A parsed template file. Frontmatter + sections + unresolved slots. |
| **Slug** | Linotype cast line of type | A single resolved template. All slots filled from context. Ready to use alone or compose. |
| **Forme** | Assembled page for the press | The final composed output. Multiple slugs arranged in order. What gets delivered to Exciter. |

### Template Syntax (v1.0)

Templates are markdown files with JSON frontmatter. Template syntax is intentionally readable in raw markdown — anyone can open the file and understand what will be sent.

**Variable Substitution:**
```
{{slot_name}}
```
Replaced with value from context. Required slots error on missing. Optional slots use default or empty string.

**Conditionals:**
```
{{#if slot_name}}
Content included when slot_name is truthy (non-empty, non-null, non-false)
{{/if}}

{{#if slot_name}}
Content when truthy
{{else}}
Content when falsy
{{/if}}
```

**Iteration:**
```
{{#each collection_slot}}
- {{.}} is the current item
- {{@index}} is the 0-based index
{{/each}}
```
Used for fragment lists, entity lists, domain arrays.

**Includes (Partials):**
```
{{> partial_name}}
```
Inlines another registered template by name. Inherits parent context. Enables shared content across templates (e.g., identity core used in both face prompt and mind system prompt).

**Comments:**
```
{{! This is stripped from output }}
```

**Raw Blocks (escape template syntax):**
```
{{{raw}}}
Content with {{literal braces}} preserved as-is
{{{/raw}}}
```

### Frontmatter Contract

JSON format (project convention — no YAML).

```json
{
  "name": "face-prompt",
  "version": "1.0",
  "description": "Primary session personality injection via additionalContext",
  "tags": ["injection", "face", "system-prompt"],
  "token_estimate": 400,
  "slots": {
    "identity_core": {
      "required": true,
      "type": "string",
      "description": "Self Model identity narrative"
    },
    "behavioral_directives": {
      "required": false,
      "type": "string",
      "default": "",
      "description": "Active behavioral instructions from Secondary"
    },
    "recall_products": {
      "required": false,
      "type": "array",
      "default": [],
      "description": "Scored recall fragments for context"
    }
  },
  "includes": ["identity-core", "relational-base"]
}
```

Required fields: `name`, `version`, `slots`.
Optional fields: `description`, `tags`, `token_estimate`, `includes`.

### API

```javascript
const linotype = require('../../lib/linotype/linotype.cjs');

// Parse a template file --> Matrix
const matrix = linotype.parse('/path/to/face-prompt.md');
// matrix.name === "face-prompt"
// matrix.slots === { identity_core: { required: true, ... }, ... }
// matrix.body === "You are an AI assistant...\n\n{{identity_core}}\n..."

// Cast a matrix against context --> Slug
const slug = linotype.cast(matrix, {
  identity_core: selfModel.getIdentityCore(),
  relational_context: selfModel.getRelational(),
  behavioral_directives: modeManager.getDirectives()
});
// slug.name === "face-prompt"
// slug.content === "You are an AI assistant...\n\nI tend to be direct..."
// slug.resolved_slots === ["identity_core", "relational_context", "behavioral_directives"]
// slug.token_estimate === 423

// Compose multiple slugs --> Forme
const forme = linotype.compose([faceSlug, recallSlug, framingSlug], {
  separator: '\n\n---\n\n',  // Optional section separator
  token_budget: 1800          // Optional: warn if total exceeds budget
});
// forme.content === "...full assembled prompt..."
// forme.total_tokens === 1247
// forme.sections === [{ name: "face-prompt", tokens: 423 }, ...]

// Validation: check a matrix for issues before runtime
const issues = linotype.validate(matrix);
// issues === [] (clean) or [{ slot: "identity_core", issue: "no description" }, ...]

// Debug: inspect a forme's bill of materials
const bom = linotype.inspect(forme);
// bom === {
//   sections: [
//     { template: "face-prompt", version: "1.0", tokens: 423,
//       slots: { identity_core: { value: "I tend to...", chars: 156 }, ... } },
//     ...
//   ],
//   total_tokens: 1247,
//   budget: 1800,
//   budget_remaining: 553
// }
```

### Template Discovery and Registration

Modules declare template directories in their manifest:

```javascript
// modules/reverie/manifest.cjs
module.exports = {
  name: 'reverie',
  // ...existing manifest fields...
  templates: {
    directory: 'prompts',    // Relative to module root
    namespace: 'reverie'     // Templates registered as reverie:name
  }
};
```

At module enable time:
1. Scan declared template directory
2. Parse every `.md` file (extract frontmatter, validate structure)
3. Register templates by namespaced name (`reverie:face-prompt`, `reverie:formation-attention-check`)
4. Validate all `includes` references resolve to registered templates
5. Report parse errors at enable time — fail loud, not at runtime

The Armature (Framework) defines the template contract — what frontmatter fields are required, what slot types are valid. Circuit (SDK) provides the `registerTemplates()` and `getTemplate()` methods modules use.

### Validation

**Parse-time (when template is loaded):**
- Frontmatter is valid JSON
- Required frontmatter fields present (`name`, `version`, `slots`)
- Slot declarations have `required` field
- Template syntax is well-formed (balanced `{{#if}}`/`{{/if}}`, `{{#each}}`/`{{/each}}`)
- All `{{> partial}}` references exist in the registry

**Cast-time (when template is resolved against context):**
- All required slots have values in the context
- Slot types match declarations (string vs array)
- Missing optional slots use declared defaults

**Errors are thrown, not swallowed.** A missing required slot at cast time is a bug — the caller must provide it. Silent empty strings mask prompt engineering errors.

### Debug / Inspection Mode

`linotype.inspect(forme)` returns a bill of materials:

```javascript
{
  sections: [
    {
      template: "reverie:face-prompt",
      version: "1.0",
      tokens: 423,
      slots: {
        identity_core: { provided: true, chars: 156, source: "selfModel.getIdentityCore()" },
        behavioral_directives: { provided: true, chars: 89 },
        referential_frame: { provided: false, used_default: true }
      },
      includes: ["reverie:identity-core"]
    },
    // ...
  ],
  total_tokens: 1247,
  budget: 1800,
  budget_remaining: 553
}
```

This enables: "Show me exactly what was injected into the Face session on the last turn, broken down by source template and slot values." Prompt debugging becomes data, not guesswork.

### Handling Function-Based Prompts (Hybrid Pattern)

The formation templates (`prompt-templates.cjs`) have `system` strings AND `user(stimulus, selfModel, fragments)` functions with conditional logic. Linotype handles the templates. Code handles context preparation. This is not a limitation — it's the correct separation.

**Current pattern (all logic + content in code):**
```javascript
// prompt-templates.cjs — body_composition
user: (stimulus, domain, selfModel, recalledFragments) => {
  const parts = [`The moment:\n${stimulus.user_prompt}`, `The angle: ${domain}`];
  if (selfModel) parts.push(`Self context: ${selfModel.identity_summary}`);
  if (recalledFragments.length > 0) {
    const recallSection = recalledFragments.map(f =>
      `- [${f.formation_frame}] ${f.body.substring(0, 200)}`
    ).join('\n');
    parts.push(`Past impressions:\n${recallSection}`);
  }
  return parts.join('\n\n');
}
```

**Linotype pattern (content in template, logic in context prep):**

Template file `reverie:formation-body-user.md`:
```markdown
---
{
  "name": "formation-body-user",
  "version": "1.0",
  "slots": {
    "user_prompt": { "required": true },
    "domain": { "required": true },
    "self_context": { "required": false, "default": "" },
    "recall_fragments": { "required": false, "type": "array", "default": [] }
  }
}
---

The moment:
{{user_prompt}}

The angle: {{domain}}

{{#if self_context}}
Self context: {{self_context}}
{{/if}}

{{#if recall_fragments}}
Past impressions:
{{#each recall_fragments}}
- [{{.formation_frame}}] {{.body_excerpt}}
{{/each}}
{{/if}}
```

Code (context preparation):
```javascript
// Formation pipeline prepares context, Linotype resolves template
const context = {
  user_prompt: stimulus.user_prompt,
  domain: domain,
  self_context: selfModel ? selfModel.identity_summary : '',
  recall_fragments: recalledFragments.map(f => ({
    formation_frame: f.formation_frame,
    body_excerpt: f.body.substring(0, 200)
  }))
};
const slug = linotype.cast(bodyUserMatrix, context);
```

**The separation:** The template defines WHAT gets sent (structure, wording, sections). The code defines WHEN and WITH WHAT (conditional logic, data transformation, truncation). You can read the template to audit the prompt. You can read the code to understand the data flow. Neither is responsible for both.

Every formation template follows this pattern:
- `system` string → becomes a standalone Linotype template (pure text, maybe a few `{{#if}}` blocks)
- `user()` function → split into a Linotype template (structure) + context preparation code (logic)
- The `.cjs` file that previously held both becomes a thin context-preparation module that calls `linotype.cast()`

### Token Estimation

Linotype's `token_estimate` in frontmatter is a static human-authored estimate (author writes it when creating the template). The runtime `slug.token_estimate` uses a character-based heuristic: `Math.ceil(chars / 4)`. This is coarse (~75% accurate for English text) but sufficient for budget checks.

Rationale: a proper tokenizer (tiktoken) is an npm dependency, which violates the zero-dependency constraint. The character heuristic is good enough for "warn if over budget" decisions. If precise token counting becomes critical, a `bun:ffi` binding to a C tokenizer could be added later without changing the Linotype API.

### Zero-Dependency Constraint

Linotype is implemented entirely with Bun/Node built-ins. No Handlebars, no Mustache, no npm template library. The parser uses `Bun.file()` for reads, string operations for frontmatter extraction, and a custom recursive-descent template resolver. The template syntax is deliberately constrained to what can be implemented in ~300 lines of CJS.

---

## Enablement Flow

### Step 1: /dynamo enable

User opens Claude Code session. Types `/dynamo` or `/dynamo enable`.

The skill instructs Claude Code to run:
```bash
bun bin/dynamo.cjs start
```

What happens:
1. Thin client checks `.dynamo/daemon.json` — already running?
2. If yes: report status, done.
3. If no: spawn daemon as detached child process.
4. Daemon initializes all core services (Steps 1-21 from Service Initialization).
5. Daemon discovers module manifests (Reverie found, state: `discovered`).
6. Daemon starts HTTP server.
7. Daemon writes `.dynamo/daemon.json`.
8. Daemon updates `settings.json` hook entries (idempotent).
9. Parent process polls GET /health until daemon responds.
10. Parent reports: `Dynamo running (PID 12345, port 9876)`.
11. Skill confirms to user.

At this point: daemon running, hooks active (but returning empty — no module enabled), CLI commands forwarding to daemon.

### Step 2: /reverie enable

User types `/reverie enable` or `/reverie start`.

The skill instructs Claude Code to run:
```bash
bun bin/dynamo.cjs reverie enable
```

What happens:
1. Thin client forwards to daemon: `POST /module/enable { "module": "reverie" }`.
2. Daemon loads Reverie module (`reverie.cjs register()` called via Circuit).
3. Reverie creates all internal components (contextManager, formationPipeline, recallEngine, sessionManager, wireTopology, modeManager, remConsolidator, etc.).
4. Reverie registers hook handlers with Exciter (all 8 hook types).
5. Reverie opts in to Ledger persistence for Self Model, fragments, associations.
6. Daemon generates a triad ID.
7. Conductor spawns Secondary as a visible terminal window:
   ```
   open -a <Terminal> -- bun claude --dangerously-load-development-channels server:dynamo-wire
   ```
   With env: `SESSION_IDENTITY=secondary`, `TRIPLET_ID=<id>`, `DYNAMO_PORT=9876`.
8. Conductor spawns Tertiary as a visible terminal window (same pattern, `SESSION_IDENTITY=tertiary`).
9. Secondary's Claude Code session starts --> its SessionStart hook fires --> thin client --> daemon --> Reverie handler detects `SESSION_IDENTITY=secondary` --> performs Secondary-specific initialization (loads Self Model, constructs Face prompt).
10. Tertiary follows the same path with Tertiary-specific init (begins sublimation cycle).
11. Daemon writes `.dynamo/active-triad.json` (atomic: write to `.tmp`, rename):
    ```json
    {
      "triadId": "abc-123",
      "faceSessionIdentity": "primary",
      "created": "2026-03-28T22:01:15.000Z"
    }
    ```
12. CLI response returns: triad ID, mode, session count.
13. Skill confirms: "Reverie active. You are the Face."

From this point: every hook from the user's session carries the triad context. UserPromptSubmit injects the face prompt via additionalContext. Wire messages flow between all three sessions through the daemon's relay.

### Session Identity

The daemon needs to know which session's hooks to process and how.

**Spawned sessions (Secondary, Tertiary):** Conductor sets `SESSION_IDENTITY` and `TRIPLET_ID` as environment variables. These are present in every hook invocation from those sessions. The thin client reads them from `process.env` and passes them to the daemon.

**Face session (Primary):** The user's Claude Code session doesn't have these env vars set (they weren't spawned by Conductor). The thin client reads `.dynamo/active-triad.json` to get the triad ID. The daemon infers: hook from a session without `SESSION_IDENTITY` env + matching triad ID = this is the Face.

**No triad:** Hook arrives with no triad context. Daemon checks: is any module enabled? If yes, is there an active triad? If no active triad, return empty. (Off-ramp state #4.)

### Multi-Triad Isolation (Future, Architecturally Provisioned)

For v1: one triad per project. `.dynamo/active-triad.json` is a single file.

The architecture supports multiple triads:
- Each triad has a unique ID.
- Magnet state is namespaced by triad ID.
- Ledger tables include `triad_id` columns.
- Wire messages are routed by triad membership (topology.send already takes session context).
- Hook handlers inspect `TRIPLET_ID` to dispatch to the correct triad.
- `.dynamo/active-triad.json` becomes `.dynamo/triads/` directory with one file per triad.

Not implemented in this phase. Architecturally, nothing blocks it.

---

## Hook Architecture in Daemon Model

### Why Hook Handlers Survive Unchanged

The hook handlers in `modules/reverie/hooks/hook-handlers.cjs` consume these services:

| Service | Used In | Why It Works in Daemon |
|---------|---------|----------------------|
| contextManager | SessionStart, UserPromptSubmit, PostToolUse, PreCompact | Lives in daemon RAM. Persistent across hook invocations. |
| sessionManager | SessionStart | Lives in daemon RAM. State survives between hooks. |
| wireTopology | UserPromptSubmit, PreCompact, Stop | Lives in daemon. Connected to relay. Messages delivered. |
| modeManager | SessionStart, UserPromptSubmit | Lives in daemon RAM. Mode persists. |
| formationPipeline | UserPromptSubmit, PostToolUse | Lives in daemon. Processes formation across turns. |
| recallEngine | UserPromptSubmit | Lives in daemon. Recall state persists. |
| remConsolidator | Stop | Lives in daemon. REM runs on live Secondary. |
| heartbeatMonitor | UserPromptSubmit | Lives in daemon. Tracks idle between turns. |
| switchboard | All handlers | Lives in daemon. Events dispatch to live listeners. |
| lithograph | SessionStart | Lives in daemon. Transcript access persists. |

**Every service the handlers depend on is persistent in the daemon.** The handlers don't change. The runtime makes them correct.

### Single Hook Set, Internal Dispatch

Claude Code supports one set of hooks per project (via `settings.json`). All session types (Primary, Secondary, Tertiary) fire the same hooks to the same `bun bin/dynamo.cjs hook <Type>` command.

The daemon's Exciter receives all hooks. Reverie's handlers inspect the session identity:

```javascript
// Inside Reverie's SessionStart handler (conceptual)
function handleSessionStart(payload) {
  const identity = payload.env.SESSION_IDENTITY;

  if (identity === 'secondary') {
    // Secondary-specific: load Self Model, construct Face prompt, start Wire listening
    return handleSecondaryStart(payload);
  }
  if (identity === 'tertiary') {
    // Tertiary-specific: receive sublimation system prompt, begin cycle
    return handleTertiaryStart(payload);
  }
  // Primary (Face): inject face prompt, set up context management
  return handlePrimaryStart(payload);
}
```

This is Reverie's internal concern. The hook set is singular. The module handles polymorphism.

### Secondary/Tertiary Hook Routing

When Secondary's Claude Code session starts, its hooks flow:

```
Secondary's Claude Code session
  --> SessionStart hook fires
  --> bun bin/dynamo.cjs hook SessionStart (thin client)
  --> Reads env: SESSION_IDENTITY=secondary, TRIPLET_ID=abc-123
  --> POST /hook to daemon
  --> Daemon: Exciter routes to Reverie's SessionStart handler
  --> Handler sees identity=secondary, runs Secondary init
  --> Returns {} (Secondary doesn't inject additionalContext on itself)
```

When Secondary's user prompt fires (the Mind processing):

```
Secondary's Claude Code session
  --> UserPromptSubmit hook fires
  --> Thin client forwards to daemon
  --> Daemon: Reverie handler sees identity=secondary
  --> Handler: Secondary's prompt processing (experience evaluation, directive generation)
  --> Returns appropriate response for Secondary
```

### Exciter Dispatch Method (New)

The current Exciter has `registerHooks()` and `getRegisteredHooks()` but no method to receive and dispatch a hook event. Currently `bin/dynamo.cjs` does the dispatch inline. In the daemon model, Exciter gets a new method:

```javascript
/**
 * Dispatch a hook event to all registered handlers.
 * @param {string} type - Hook type (e.g., 'SessionStart')
 * @param {object} payload - Hook payload from Claude Code
 * @param {object} env - Environment context (SESSION_IDENTITY, TRIPLET_ID)
 * @returns {Promise<object>} - Aggregated response ({ hookSpecificOutput })
 */
async dispatchHook(type, payload, env) {
  const listeners = this._hookRegistry.getListeners(type);
  if (!listeners || listeners.length === 0) return {};

  const enrichedPayload = { ...payload, env };
  let lastResponse = {};

  for (const listener of listeners) {
    try {
      const result = await listener.handler(enrichedPayload);
      if (result && Object.keys(result).length > 0) {
        lastResponse = result;
      }
    } catch (err) {
      // Handler error when module is enabled = bug. Throw to surface as 500.
      throw new Error(`Hook handler error (${type}, ${listener.serviceName}): ${err.message}`);
    }
  }

  return lastResponse;
}
```

This encapsulates what `bin/dynamo.cjs` currently does inline. The daemon's HTTP handler calls `exciter.dispatchHook(type, payload, env)` and returns the result. Exciter owns hook dispatch because Exciter owns the Claude Code integration surface.

### Off-Ramp Summary

The thin client is the first gate. The daemon is the second. Handlers are the third.

```
Thin client:
  DYNAMO_DEV_BYPASS=1?  --> {}, exit 0
  No daemon.json?       --> {}, exit 0
  PID dead?             --> stderr, exit 1

Daemon:
  No module enabled?    --> {}
  Module enabled, no triad for session? --> {}
  Module enabled, active triad?  --> route to handler

Handler:
  Success?              --> response
  Error?                --> 500 with error detail --> thin client stderr, exit 1
```

---

## State Management

### RAM by Default

Magnet stores state in memory. No persistence provider is wired by default. This is correct because:

1. The daemon persists — RAM state survives across hook invocations and CLI commands.
2. RAM is the hot path — zero I/O latency for state reads in hook handlers.
3. If the daemon restarts, it's a clean slate. That's intentional — platform state is session-scoped.

### Opt-In Persistence

Modules register persistence providers when they need cross-restart durability:

```javascript
// Inside Reverie's register():
// Wire Magnet to use Ledger for Self Model state
magnet.registerProvider('ledger', {
  scope: 'reverie',
  read: (key) => ledger.read('magnet_state', { key }),
  write: (key, value) => ledger.write('magnet_state', { key, value }),
});
```

Reverie opts in for:
- Self Model state (identity core, relational model, conditioning)
- Fragment store (via Journal/Ledger directly, not through Magnet)
- Association index (via Ledger directly)

Platform state (mode, session tracking, topology) stays in RAM. It's transient by nature.

### Magnet Provider Interface

Already exists: `magnet.registerProvider()`. The daemon model doesn't change this. Magnet accepts pluggable providers. Modules choose their durability level.

### KV Provider Path (Future)

Over long runtime, Magnet's in-memory Map could grow. Path forward:

- `bun:sqlite` as a KV provider — zero dependency, synchronous API, built-in.
- Registered as a Magnet provider: `magnet.registerProvider('kv', sqliteKvProvider)`.
- Modules opt in when their state footprint warrants spilling to disk.
- Not blocking this phase. Architecturally, Magnet's provider interface already supports it.

---

## DuckDB Single-Writer Resolution

One daemon process. One Ledger instance. One DuckDB connection. Opened once during daemon startup, held for daemon lifetime.

All writes — from any hook handler, any CLI command, any module — funnel through the daemon's single Ledger instance. No contention. No locking. No WAL file races.

Secondary and Tertiary sessions communicate with the daemon via Wire (relay routes). They don't open DuckDB directly. Their writes request Ledger operations through Wire messages, and the daemon's handler writes to Ledger.

This was never going to work with multiple ephemeral processes. It works trivially with a single persistent daemon.

---

## Prompt Extraction Inventory

Every string-literal prompt in Reverie becomes a Linotype markdown template. Extracted to `modules/reverie/prompts/`.

| Current File | Prompt | Template Name | Est. Tokens |
|-------------|--------|---------------|-------------|
| `formation/prompt-templates.cjs:52-96` | Attention check (Gate 2) | `reverie:formation-attention-check` | 150 |
| `formation/prompt-templates.cjs:104-146` | Domain identification | `reverie:formation-domain-id` | 180 |
| `formation/prompt-templates.cjs:154-226` | Body composition | `reverie:formation-body` | 250 |
| `formation/prompt-templates.cjs:234-284` | Meta-recall reflection | `reverie:formation-meta-recall` | 200 |
| `formation/prompt-templates.cjs:308-341` | Passive nudge (recall) | `reverie:recall-passive-nudge` | 150 |
| `formation/prompt-templates.cjs:347-389` | Explicit reconstruction | `reverie:recall-explicit` | 200 |
| `formation/prompt-templates.cjs:411-452` | Backfill formation | `reverie:formation-backfill` | 250 |
| `context/referential-framing.cjs:32-40` | Referential frame (full) | `reverie:framing-full` | 80 |
| `context/referential-framing.cjs:42-51` | Referential frame (dual) | `reverie:framing-dual` | 90 |
| `context/referential-framing.cjs:53-57` | Referential frame (soft) | `reverie:framing-soft` | 60 |
| `rem/quality-evaluator.cjs:106-134` | Quality evaluation | `reverie:rem-quality-eval` | 200 |
| `session/sublimation-loop.cjs:61-94` | Sublimation system prompt | `reverie:sublimation-system` | 300 |
| `rem/editorial-pass.cjs:55-164` | Editorial pass (7 sections) | `reverie:rem-editorial` | 500 |
| `context/context-manager.cjs` | Face prompt assembly | `reverie:face-prompt` | 400 |
| `.claude/agents/reverie-formation.md` | Formation agent definition | Deferred — agent defs use YAML frontmatter (Claude Code format), not JSON. Linotype templates use JSON frontmatter. Converting agent defs requires a separate Linotype parser mode or stays as-is. Not blocking. | 300 |

**Total: 15+ distinct prompt artifacts.** All currently string literals. All become inspectable, git-tracked, editable markdown files.

The extraction pattern: each prompt file in `modules/reverie/prompts/` replaces the string literal. The `.cjs` file that previously contained the literal now calls `linotype.parse()` and `linotype.cast()` with the appropriate context. Prompt content moves to markdown. Assembly logic stays in code. Separation of content from logic.

---

## Impact Assessment

### New Components

| Component | Location | Description |
|-----------|----------|-------------|
| Linotype library | `lib/linotype/` | Parser, template engine, composer, validator, types |
| Daemon entry point | `core/daemon.cjs` | Daemon process: bootstrap + HTTP server + lifecycle |
| Daemon HTTP server | `core/daemon-server.cjs` | Bun.serve with route dispatch (hooks, CLI, Wire, mgmt) |
| Daemon lifecycle | `core/daemon-lifecycle.cjs` | Start, health, shutdown, PID management |
| Reverie prompt templates | `modules/reverie/prompts/*.md` | 15+ markdown template files |
| Runtime directory | `.dynamo/` | PID file, log, triad state (gitignored) |

### Modified Components

| Component | Location | Change |
|-----------|----------|--------|
| `bin/dynamo.cjs` | Entry point | Full rewrite: becomes thin client router (~80 lines) |
| `core/core.cjs` | Bootstrap | Adapted for daemon context (no process.exit at end) |
| `core/services/wire/relay-server.cjs` | Wire relay | HTTP/WS routes merged into daemon HTTP server (NOT the Relay service — that's install/sync) |
| `core/services/exciter/exciter.cjs` | Exciter | Receives hooks via HTTP handler, not direct invocation |
| `core/services/exciter/settings-manager.cjs` | Settings | Hook commands may need path adjustment for thin client |
| `core/services/conductor/session-spawner.cjs` | Conductor | Env vars include DYNAMO_PORT for spawned sessions |
| `core/armature/` | Framework | Add template contract validation |
| `core/sdk/circuit/` | SDK | Expose Linotype API (registerTemplates, getTemplate) |
| `modules/reverie/manifest.cjs` | Manifest | Add `templates` section |
| `modules/reverie/reverie.cjs` | Module entry | Module lifecycle (enable/disable), template registration |
| `modules/reverie/hooks/hook-handlers.cjs` | Handlers | Add session identity dispatch (Primary/Secondary/Tertiary) |
| `modules/reverie/components/context/` | Context mgr | Use Linotype instead of string concatenation |
| `modules/reverie/components/formation/prompt-templates.cjs` | Prompts | Replaced by Linotype templates (file becomes thin loader) |
| `modules/reverie/components/context/referential-framing.cjs` | Framing | Replaced by Linotype templates |
| `modules/reverie/components/rem/quality-evaluator.cjs` | REM | Prompt extracted to template |
| `modules/reverie/components/rem/editorial-pass.cjs` | REM | Prompt extracted to template |
| `modules/reverie/components/session/sublimation-loop.cjs` | Session | Prompt extracted to template |
| `.claude/skills/dynamo/SKILL.md` | Skill | Updated for daemon commands (start/stop/status) |
| `.claude/skills/reverie/SKILL.md` | Skill | Updated for enable/disable flow |
| `.gitignore` | Config | Add `.dynamo/` |
| `config.json` | Config | Add daemon port config field |

### Unchanged Components

These work as-is in the daemon model — they already assumed persistent runtime:

| Component | Why Unchanged |
|-----------|---------------|
| `core/services/relay/` | Install/update/sync operations — unrelated to Wire relay transport |
| `core/services/magnet/` | RAM state is correct in persistent daemon |
| `core/services/switchboard/` | Event bus works as-is, long-lived |
| `core/services/commutator/` | I/O bus works as-is |
| `core/services/forge/` | Git ops unchanged |
| `core/services/lathe/` | Filesystem ops unchanged |
| `core/services/assay/` | Search unchanged |
| `core/providers/ledger/` | DuckDB provider works (single process = single writer) |
| `core/providers/journal/` | Flat file provider unchanged |
| `core/providers/lithograph/` | Transcript provider unchanged |
| `modules/reverie/components/formation/` | Formation engine unchanged |
| `modules/reverie/components/recall/` | Recall engine unchanged |
| `modules/reverie/components/rem/` | REM consolidation unchanged (runs in daemon) |
| `modules/reverie/components/session/session-manager.cjs` | State machine correct (daemon is persistent) |
| `modules/reverie/components/modes/mode-manager.cjs` | Mode tracking correct (daemon is persistent) |
| `modules/reverie/components/context/context-manager.cjs` | Logic unchanged (template sourcing changes, assembly logic stays) |
| `core/armature/hooks.cjs` | Hook registry unchanged |

---

## Build Order

Dependencies flow downward. Each wave can be built in parallel internally.

### Wave 1: Foundations (parallel, no cross-dependencies)

**1a. Linotype Library** (`lib/linotype/`)
- Parser (frontmatter extraction, section parsing, slot detection)
- Template engine (variable substitution, conditionals, iteration, includes)
- Composer (multi-slug composition, separator handling, token budgeting)
- Validator (frontmatter schema, syntax well-formedness, slot type checking)
- Types (Matrix, Slug, Forme definitions with Object.freeze)
- Tests (pure unit tests, no I/O mocking needed for parser/engine)

**1b. Daemon Infrastructure** (`core/daemon.cjs`, `core/daemon-server.cjs`, `core/daemon-lifecycle.cjs`)
- Process lifecycle (start, health check, shutdown)
- HTTP server (Bun.serve with route dispatch)
- PID/port management (write/read/cleanup `.dynamo/daemon.json`)
- Logging to file (`.dynamo/dynamo.log`)
- Merge Wire relay-server.cjs routes into daemon HTTP server
  - HTTP endpoints: /wire/register, /wire/unregister, /wire/send, /wire/send-batch, /wire/poll, /wire/health
  - WebSocket: upgrade on /ws, handle register/send frames via `websocket:` handler in Bun.serve
  - Existing relay-server.cjs logic (session maps, mailboxes, pending polls, envelope validation) moves into daemon server module
  - Wire service connects to daemon's relay routes internally (no HTTP self-call — direct function reference)
- Tests (daemon on test port, health check, shutdown, Wire relay message round-trip)

### Wave 2: Client Rewrite (depends on Wave 1b)

**2a. Thin Client** (`bin/dynamo.cjs`)
- Router: start/stop/status/hook/kill/cli-forward
- Hook dispatch: stdin read, daemon forward, response relay
- CLI forward: args packaging, daemon forward, output relay
- Off-ramp logic (7-state decision tree)
- Daemon file helpers (read/verify PID, cleanup stale)

**2b. Daemon-Side Handlers**
- Hook handler in daemon (receives POST /hook, routes to Exciter)
- CLI handler in daemon (receives POST /cli, routes to Pulley)
- Module lifecycle endpoints (enable/disable)
- Health endpoint
- Shutdown endpoint

### Wave 3: Framework + SDK Integration

**3a. Template Contracts** (Armature) — depends on Wave 1a only
- Frontmatter schema definition and validation
- Template registration contract (what Circuit exposes to modules)
- Template slot type definitions
- Can start as soon as Linotype library exists. No daemon dependency.

**3b. SDK Template API** (Circuit) — depends on Waves 1a + 3a
- `registerTemplates(manifest)` — scan and register from manifest path
- `getTemplate(namespacedName)` — return parsed Matrix
- `castTemplate(name, context)` — parse + cast shorthand
- Linotype instance management (singleton per daemon)
- Can start as soon as Armature contracts exist. No daemon dependency.

**3c. Module Lifecycle API** — depends on Wave 2 (daemon endpoints needed)
- `circuit.enableModule(name)` / `circuit.disableModule(name)`
- Module state machine (discovered → enabled → active → disabled)
- Hook handler registration/deregistration on enable/disable

### Wave 4: Prompt Migration + Skill Updates (depends on Wave 3)

**4a. Prompt Extraction**
- Create `modules/reverie/prompts/` directory
- Extract all 15+ prompts from `.cjs` files to `.md` templates
- Update `.cjs` files to use Linotype parse/cast instead of string literals
- Add `templates` section to `modules/reverie/manifest.cjs`
- Template registration in `reverie.cjs register()`

**4b. Skill and CLI Updates**
- Update `/dynamo` skill for daemon commands (start/stop/status)
- Update `/reverie` skill for enable/disable flow
- Update CLI command registrations in Pulley
- Hook off-ramp in thin client

**4c. Hook Handler Adaptation**
- Add session identity dispatch to Reverie's handlers
- Add triad context reading from `.dynamo/active-triad.json`
- Verify all handlers work in daemon context (should be minimal changes)

### Wave 5: Validation (depends on Wave 4)

**5a. E2E Integration Test**
- Run the full acceptance test (see below)
- Verify hook dispatch through daemon
- Verify Wire message flow through daemon relay
- Verify context injection on every UserPromptSubmit
- Verify triad spawn/shutdown lifecycle

**5b. Regression**
- Run existing test suites (851+ tests from M1/M2)
- Verify no regressions in service/provider behavior
- Verify Linotype templates produce identical output to old string literals

---

## Acceptance Test

This is the E2E test that Phase 16 was trying to reach. With the daemon model, it works.

```
1. Open a Claude Code session (terminal window 1)
2. Run: bun bin/dynamo.cjs start
   --> See: "Dynamo running (PID XXXX, port 9876)"
   --> .dynamo/daemon.json exists with correct PID/port

3. Run: bun bin/dynamo.cjs reverie enable
   --> See: 2 new terminal windows open (Secondary, Tertiary)
   --> See: "Reverie active. Triad: abc-123. You are the Face."
   --> .dynamo/active-triad.json exists

4. Type a message to Claude in the primary session
   --> UserPromptSubmit hook fires --> thin client --> daemon --> Reverie handler
   --> additionalContext injected (face prompt visible in Claude's response behavior)
   --> Wire message sent to Secondary (observable in daemon log)

5. In a NEW terminal (window 4), run: bun bin/dynamo.cjs status
   --> See: daemon health, Reverie module enabled, triad active, 3 sessions

6. In the same terminal, run: bun bin/dynamo.cjs reverie status
   --> See: Mode, triad ID, session states, turn count

7. End the primary Claude Code session (or run: bun bin/dynamo.cjs reverie disable)
   --> Stop hook fires --> Reverie handler initiates REM
   --> Secondary runs REM consolidation
   --> Tertiary terminates
   --> Secondary terminates after REM
   --> Triad cleaned up

8. Run: bun bin/dynamo.cjs stop
   --> Daemon shuts down gracefully
   --> .dynamo/daemon.json removed
   --> Process exits
```

---

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Bun long-running process stability | Medium | Health monitoring in daemon. `reverie kill` as nuclear option. Log all errors for diagnosis. |
| Terminal spawning from background process | Medium | Test on macOS early. Conductor already uses `osascript` + temp scripts. Fallback: daemon runs in foreground terminal. |
| Hook latency (HTTP round-trip added) | Low | Localhost HTTP on Bun is sub-millisecond. Measure. If too slow, Unix domain socket is drop-in replacement for Bun.serve. |
| DuckDB connection longevity | Low | DuckDB is embedded, handles long-lived connections natively. Connection pool not needed for single process. |
| Daemon crash loses RAM state | By design | RAM state is transient. Modules opt in to persistence for what matters. Crash = clean restart. |
| Port conflict (multiple projects) | Low | DYNAMO_PORT env var override. Default 9876 in config.json. Error message if port in use. |
| Stale PID file after crash | Low | Thin client verifies PID liveness. Auto-cleanup on detection. Clear error message. |
| Linotype template syntax too limited | Low | v1.0 covers variables, conditionals, iteration, includes. Expand in future phases. Linotype is designed for growth. |
| Settings.json hook entries stale after thin client rewrite | Low | Daemon updates settings.json on startup (idempotent). No manual settings.json management needed. |

---

## Relationship to Phase 16

Phase 16 (reverie-end-to-end-delivery) completed Plans 01-03:
- Plan 01: Magnet Ledger provider + state persistence
- Plan 02: Terminal window spawning via Conductor
- Plan 03: Wire relay lifecycle + clean-start logic

Plan 04 (E2E verification) was blocked by the architectural violation: hook handlers assumed persistent runtime but got ephemeral processes.

**What survives from Phase 16:**
- All completed plan work (Plans 01-03)
- All patch fixes (commits af3f6aa through ac2c2ef): hook dispatch rewrite, dev bypass, recursion guard, null additionalContext fix, reverie kill command
- The Magnet Ledger provider created in Plan 01 (used for opt-in persistence)
- The terminal spawning code in Conductor (used by daemon)
- The Wire relay routes (merged into daemon HTTP server)

**What this new phase replaces:**
- Plan 04's remaining tasks (E2E verification) — superseded by the daemon-model acceptance test
- The bootstrap-per-invocation model in `bin/dynamo.cjs`
- String-literal prompts throughout Reverie

**This phase is not a rewrite.** Most service/module code is unchanged. It's infrastructure underneath that makes everything work as designed: a persistent daemon, a prompt template library, and a thin client that connects them.

---

## Design Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| D-01 | Dynamo is a persistent daemon, not bootstrap-per-invocation | RAM state, DuckDB single-writer, hook service access all require single long-lived process |
| D-02 | Explicit opt-in: `/dynamo enable` then `/reverie enable` | Control and transparency over convenience. Auto-start deferred to future UX improvement. |
| D-03 | Single Bun.serve for hooks, CLI, and Wire relay | One port, one server, three concerns via URL routing. Simplest correct architecture. |
| D-04 | Linotype lives in `lib/` (library layer) | Zero service dependencies. Pure capability. Framework defines contracts, SDK exposes API. |
| D-05 | Template syntax: Mustache-inspired, custom implementation | No npm dependency. Scope constrained to prompt engineering needs. ~300 lines CJS. |
| D-06 | JSON frontmatter in templates | Project convention (JSON for structured data, Markdown for narrative). Not YAML. |
| D-07 | All prompts extracted to markdown files | Auditability, separation of content from logic, version tracking, template reuse. |
| D-08 | Hook off-ramp: 7-state decision tree | Silence when intentional (off/not enrolled), noise when broken (crash/error). No hook errors from inactive Dynamo. |
| D-09 | Single triad per project for v1 | Multi-triad provisioned architecturally but not implemented. Simplifies session identity. |
| D-10 | RAM state by default, persistence opt-in | Modules control their durability. Platform doesn't impose persistence cost. |
| D-11 | Module lifecycle: discovered/enabled/active/disabled | Clean state machine. Module survives triad shutdown. Re-enable without re-load. |
| D-12 | Relay merged into daemon, not standalone | Eliminates separate relay process. Single process = single writer + single message hub. |
| D-13 | `.dynamo/` directory for runtime state | Gitignored. Contains PID, port, logs, triad state. Clean separation from source. |
| D-14 | `reverie kill` preserved as pre-bootstrap nuclear option | Works without daemon. Kills processes directly. Last resort when daemon is unresponsive. |
| D-15 | Linotype inspect() returns bill of materials | Prompt debugging as data. See exactly what was injected, from which template, with what slot values. |
| D-16 | Hook handlers unchanged in daemon model | They assumed persistent runtime. The daemon provides it. Runtime fixes handlers, not the other way around. |
| D-17 | `additionalContext` not `systemMessage` for hook injection | The Reverie spec v2 (Sections 4.2, 8.3) says `systemMessage`. The implementation uses `additionalContext` per Pitfall 1 research (Claude Code treats `systemMessage` differently). Implementation is correct. Spec has a deviation note pending. |
| D-18 | Relay service vs Wire relay are distinct components | Relay service (`core/services/relay/`) = install/update/sync. Wire relay (`core/services/wire/relay-server.cjs`) = HTTP/WS message transport. The Wire relay routes merge into the daemon. The Relay service is unchanged. |
| D-19 | MCP channel server (dynamo-wire) remains separate from daemon | Claude Code loads channel servers as child processes. dynamo-wire provides Wire tools (wire_send, wire_status) to Claude Code sessions. It connects to the daemon's relay routes for transport. The daemon is the hub; dynamo-wire is the Claude Code adapter. |
| D-20 | Settings.json hooks registered on daemon start, not on module enable | Hooks must be in settings.json before Claude Code fires them. Since hooks are no-ops when daemon/module is off (off-ramp states 1-4), registering them at daemon start is safe and avoids requiring settings.json manipulation at module enable time. Latency cost: one sub-ms HTTP round-trip per hook when Dynamo is running but Reverie is not enabled. Acceptable. |

---

*Prepared for phase insertion upon approval.*
*2026-03-28*
