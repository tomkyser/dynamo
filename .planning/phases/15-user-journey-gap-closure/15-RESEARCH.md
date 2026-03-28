# Phase 15: User Journey Gap Closure - Research

**Researched:** 2026-03-28
**Domain:** User-facing CLI commands, skill content, onboarding UX, error messages, formation agent audit, README, validation extension
**Confidence:** HIGH

## Summary

Phase 15 closes every gap between "the platform works" and "a first-time user can use it." The codebase has all 42 M2 requirements implemented and verified (Phases 7-14 complete), but the user-facing surface has known holes: the `/reverie` skill references `reverie start` and `reverie stop` commands that do not exist, the README was written before most features were built, error messages lack recovery suggestions, and skill content was written before the CLI surface was finalized.

All infrastructure for Phase 15 already exists. The Mode Manager has `requestActive()` and `requestPassive()`, Session Manager has `start()`/`stop()`/`upgrade()`/`degrade()`/`initShutdown()`/`transitionToRem()`/`completeRem()`, and REM Consolidator has `handleTier3()`. Start and stop CLI commands compose these existing APIs -- no new business logic is needed. The skill rewrite, error audit, and README rewrite are content tasks that must be grounded in the actual CLI command surface as ground truth. The validation extension adds test coverage for the new commands and the welcome injection.

**Primary recommendation:** Implement start/stop CLI commands first (they unblock skill rewrite), then rewrite all skills from CLI ground truth, then welcome injection, then error audit, then formation agent audit, README rewrite, and validation extension.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Implement real `dynamo reverie start` and `dynamo reverie stop` CLI commands via Pulley, registered in `register-commands.cjs` alongside existing commands (status, inspect, history, reset, backfill).
- **D-02:** `reverie start` upgrades to Active mode -- if already Passive (auto-started by SessionStart hook), start calls Mode Manager's `requestActive()` to spawn Secondary+Tertiary. If already Active, reports current state. If not initialized, starts fresh.
- **D-03:** `reverie stop` always triggers REM consolidation (Tier 3 full) before shutting down sessions. No `--skip-rem` flag. Clean shutdown is the only shutdown. Matches existing Stop hook behavior.
- **D-04:** One-time welcome message on first-ever cold start (no Self Model exists yet). Fires once -- flag persisted to prevent repeat.
- **D-05:** Welcome delivered via additionalContext injection in UserPromptSubmit hook. Consistent with all other Reverie context injection.
- **D-06:** Minimal content: what Dynamo/Reverie is, /reverie to manage sessions, /dynamo for platform status. Three lines max. Orient without overwhelming.
- **D-07:** Full rewrite of all 3 skill `.md` files (`/dynamo`, `/reverie`, `/dynamo-validate`) generated from the actual CLI command surface as ground truth. Every action a skill suggests must map to a real Pulley command.
- **D-08:** Skills reference CLI commands directly and transparently: `bun bin/dynamo.cjs reverie status`. User can see exactly what happens and replicate outside skills. Per Phase 12.1 D-03 (skills are conversational wrappers over CLI).
- **D-09:** CLI help text (`--help`) audited as part of skill rewrite -- verify each referenced command's help output is accurate. Fix help text for any command with wrong descriptions or missing flags.
- **D-10:** Audit user-facing errors only: CLI output, hook stderr, skill-visible failures. Don't audit internal error handling that never surfaces to the user.
- **D-11:** Every user-visible error includes an actionable recovery suggestion. Format: "X failed because Y -- try Z." No cryptic errors without next steps.
- **D-12:** Audit `reverie-formation` agent definition (`.claude/agents/reverie-formation.md`) against what `handleSubagentStop` in `hook-handlers.cjs` actually parses. Fix any mismatches in output schema, prompt, or tool permissions in-place.
- **D-13:** Full README rewrite covering: prerequisites (Bun, Claude Max), install steps, what happens on first run (hooks auto-fire, Reverie initializes in Passive mode), available skills (/dynamo, /reverie, /dynamo-validate), and CLI commands. README IS the onboarding document.
- **D-14:** Extend existing validation suite (`modules/reverie/validation/`) with integration tests for start/stop commands and first-run welcome injection. Don't rewrite the whole suite -- Phase 13 already did that.

### Claude's Discretion
- Welcome message exact wording and cold-start detection mechanism
- Start command behavior when no session exists at all (full initialization sequence)
- Stop command output format (progress reporting during REM)
- Formation agent prompt adjustments (scope limited to fixing mismatches)
- README structure and section ordering
- Error message exact wording and formatting patterns
- Validation test organization within existing suite

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INT-01 | Hook wiring for 8 Claude Code hooks | Welcome message injection hooks into existing UserPromptSubmit handler via additionalContext (D-05). Cold-start detection at init() already exists in context-manager.cjs |
| INT-02 | CLI surface via Pulley | Start/stop commands added to register-commands.cjs following the established circuitApi.registerCommand() pattern. Composes Mode Manager + Session Manager APIs. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bun | 1.3.11 (installed) | Runtime | Project runtime -- all code runs on Bun, CJS format |
| bun:test | Built-in | Test runner | Jest-compatible API, 15x faster than Jest, project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:path | Built-in | Path resolution | File path construction in data dir, skill paths |
| node:fs | Built-in | Directory operations | Validation test tmpdir setup, file existence checks |

No new npm dependencies are required for Phase 15. All work composes existing platform APIs.

## Architecture Patterns

### Existing CLI Command Registration Pattern
```
modules/reverie/
  components/cli/
    register-commands.cjs   # Central registration orchestrator
    status.cjs              # Status command handler (factory pattern)
    inspect.cjs             # Inspect subcommand handlers
    history.cjs             # History subcommand handlers
    reset.cjs               # Reset subcommand handlers
    start.cjs               # NEW: Start command handler
    stop.cjs                # NEW: Stop command handler
  hooks/
    hook-handlers.cjs       # Hook dispatch (welcome injection added here)
  skills/
    dynamo-skill.cjs        # /dynamo skill content + registration
    reverie-skill.cjs       # /reverie skill content + registration
    validate-skill.cjs      # /dynamo-validate skill content + registration
    skill-content.test.cjs  # Skill content validation tests
  validation/
    integration-harness.test.cjs  # SC-1 through SC-6 tests
    start-stop.test.cjs           # NEW: Start/stop command tests
    welcome.test.cjs              # NEW: Welcome injection tests
```

### Pattern 1: CLI Command Handler Factory
**What:** Each command group has a factory function that takes injected context and returns frozen handler objects.
**When to use:** All new CLI commands (start, stop).
**Example:**
```javascript
// Source: modules/reverie/components/cli/status.cjs (existing pattern)
'use strict';
const { ok } = require('../../../../lib/result.cjs');

function createStartHandler(context) {
  const { modeManager, sessionManager } = context || {};

  function handle(args, flags) {
    // Compose existing Mode Manager + Session Manager APIs
    // Return ok({ human, json, raw }) triple
  }

  return Object.freeze({ handle });
}
module.exports = { createStartHandler };
```

### Pattern 2: Skill Content Module
**What:** Each skill has a `.cjs` module exporting a content constant and a registration function.
**When to use:** Skill rewrites.
**Example:**
```javascript
// Source: modules/reverie/skills/dynamo-skill.cjs (existing pattern)
const SKILL_CONTENT = `# Title\n\n## Steps\n1. Run \`bun bin/dynamo.cjs ...\``;

function registerSkill(exciter) {
  return exciter.registerSkill('name', {
    description: '...',
    content: SKILL_CONTENT,
  });
}
module.exports = { registerSkill, SKILL_CONTENT };
```

### Pattern 3: Welcome Message via additionalContext
**What:** One-time injection piggybacks on existing cold-start detection in context-manager.cjs init().
**When to use:** First-run welcome.
**Example:**
```javascript
// In context-manager.cjs init(), after cold-start path:
// 1. createColdStartSeed() runs (already exists)
// 2. Check if welcome flag file exists in dataDir
// 3. If not, set _welcomeMessage = WELCOME_TEXT
// 4. Write welcome flag file to prevent repeat
// 5. In handleUserPromptSubmit, prepend _welcomeMessage to combined injection (once)
```

### Pattern 4: Output Triple Format
**What:** Every CLI command returns `{ human, json, raw }` for Pulley's three output modes.
**When to use:** All command handlers.
**Example:**
```javascript
return ok({
  human: 'Reverie: Upgraded to Active mode\nTriplet: a1b2\nSessions: Primary + Secondary + Tertiary',
  json: { mode: 'active', triplet_id: 'a1b2', sessions: ['primary', 'secondary', 'tertiary'] },
  raw: JSON.stringify({ mode: 'active', triplet_id: 'a1b2' }),
});
```

### Anti-Patterns to Avoid
- **Direct service access:** Start/stop handlers MUST receive modeManager and sessionManager via DI context, not require() them directly. This is the IoC pattern enforced throughout the codebase.
- **Blocking on REM in stop command:** Stop must NOT block waiting for Tier 3 REM to complete. The handleStop hook already demonstrates the fire-and-forget pattern (line 460 in hook-handlers.cjs). The CLI stop command should initiate shutdown and report that REM is running, not wait for it.
- **Skipping REM in stop:** Per D-03, there is no `--skip-rem` flag. Clean shutdown is the only path.
- **Skill content that references non-existent commands:** This is the exact bug being fixed. Every command mentioned in a skill MUST be verified against register-commands.cjs.
- **Error messages without recovery steps:** Per D-11, `return err('CODE', 'message')` is insufficient for user-visible errors. The message MUST include "-- try Z" recovery guidance.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mode transitions | Custom state machine | `modeManager.requestActive()`, `modeManager.requestPassive()` | Mode Manager already validates transitions, emits events, handles fallback |
| Session lifecycle | Direct Conductor/Wire calls | `sessionManager.start()`, `sessionManager.upgrade()`, `sessionManager.stop()`, `sessionManager.transitionToRem()` | Session Manager handles the full state machine with validated transitions |
| REM on shutdown | Custom REM dispatch | `remConsolidator.handleTier3(sessionContext)` | REM Consolidator is the single entry point per REM-07 |
| Skill file writing | Direct fs.writeFile | `exciter.registerSkill(name, options)` which delegates to skill-manager.cjs | Exciter manages the SKILL.md format, YAML frontmatter, and directory creation |
| Output formatting | Manual string building | Pulley's `{ human, json, raw }` triple pattern | Pulley handles --json, --raw, --help flags and output routing |
| Cold-start detection | New flag mechanism | Existing `createColdStartSeed()` return path in `contextManager.init()` | init() already distinguishes warm-start (face-prompt.md exists) from cold-start (doesn't exist) |

**Key insight:** Phase 15 is a composition phase -- every piece of business logic already exists. The work is wiring existing APIs into CLI commands, updating content to match reality, and adding the welcome message injection.

## Common Pitfalls

### Pitfall 1: Start Command State Assumptions
**What goes wrong:** Assuming start always transitions from Passive to Active. The session could be in any state: uninitialized (never started), passive (auto-started by SessionStart hook), active (already upgraded), stopped (previous session ended), or even rem_processing.
**Why it happens:** D-02 describes the happy path (Passive -> Active) but doesn't enumerate all states.
**How to avoid:** Check `modeManager.getMode()` and `sessionManager.getState().state` first. Handle: already-active (no-op, report), passive (requestActive), uninitialized/stopped (sessionManager.start() then requestActive), rem_processing (report "REM in progress, please wait").
**Warning signs:** Start command works during testing but fails when user invokes it in unexpected states.

### Pitfall 2: Stop Command Synchronicity
**What goes wrong:** Making the stop CLI command synchronous (blocking until REM completes). REM can take significant time. The CLI call should return promptly.
**Why it happens:** Natural inclination to await completion.
**How to avoid:** Follow the exact pattern from handleStop in hook-handlers.cjs: initiate REM transition as fire-and-forget, report "REM consolidation initiated" immediately. The stop command is a trigger, not a blocker.
**Warning signs:** `dynamo reverie stop` takes a long time or hangs.

### Pitfall 3: Skill Content Drift
**What goes wrong:** Rewriting skill content that still references commands incorrectly because the writer didn't verify against the actual command registry.
**Why it happens:** Skills are prose documents -- easy to write commands from memory rather than from the source.
**How to avoid:** The complete command list must be extracted from register-commands.cjs BEFORE writing skill content. The actual registered commands (after Phase 15 additions) are:
  - `reverie status`
  - `reverie start` (NEW)
  - `reverie stop` (NEW)
  - `reverie inspect fragment`
  - `reverie inspect domains`
  - `reverie inspect associations`
  - `reverie inspect self-model`
  - `reverie inspect identity`
  - `reverie inspect relational`
  - `reverie inspect conditioning`
  - `reverie history sessions`
  - `reverie history fragments`
  - `reverie history consolidations`
  - `reverie reset fragments`
  - `reverie reset self-model`
  - `reverie reset all`
  - `reverie backfill`
  Platform commands: `status`, `health`, `version`, `install`, `update`, `config`
**Warning signs:** Skill mentions a command that doesn't appear in register-commands.cjs.

### Pitfall 4: Welcome Message Fires on Every Cold Start
**What goes wrong:** Welcome fires every time there's no face-prompt.md (cold start), even on reset or re-initialization.
**Why it happens:** Using cold-start detection alone (no face-prompt.md) conflates "first ever" with "reset state."
**How to avoid:** Per D-04, use a separate persisted flag file (e.g., `~/.dynamo/reverie/data/.welcome-shown`). Check this file independently of cold-start detection. Only show welcome if the flag file doesn't exist. Write the flag file after welcome is set.
**Warning signs:** User sees welcome message after running `dynamo reverie reset all --confirm`.

### Pitfall 5: Formation Agent Output Schema Mismatch
**What goes wrong:** The formation agent definition specifies an output schema that differs from what `fragment-assembler.cjs:parseFormationOutput()` actually parses.
**Why it happens:** Agent definition and assembler code evolved independently across phases.
**How to avoid:** Compare the JSON schema in `.claude/agents/reverie-formation.md` field-by-field against the `parseFormationOutput()` parsing logic in fragment-assembler.cjs. Check: field names, types, optional vs required, nesting.
**Warning signs:** Formation agent output is silently ignored because assembler can't parse it.

### Pitfall 6: Error Audit Scope Creep
**What goes wrong:** Auditing internal error handling (try/catch blocks in formation pipeline, Wire internals) instead of only user-visible errors.
**Why it happens:** The codebase has 39 `return err()` calls across 18 Reverie files. Most are internal.
**How to avoid:** Per D-10, only audit errors that surface to the user: (1) CLI command errors (return err() in cli/ directory -- 7 instances), (2) hook stderr writes (process.stderr.write in bin/dynamo.cjs -- 2 instances), (3) Pulley error handler (cli.cjs line 42: `Error: ${result.error.message}`). Ignore all internal catch blocks that are documented as "non-fatal."
**Warning signs:** Spending time auditing internal error handling that users never see.

## Code Examples

### Start Command Handler Pattern
```javascript
// Source: Composed from existing patterns in status.cjs + mode-manager.cjs + session-manager.cjs
'use strict';
const { ok, err } = require('../../../../lib/result.cjs');

function createStartHandler(context) {
  const { modeManager, sessionManager } = context || {};

  async function handle(args, flags) {
    if (!modeManager || !sessionManager) {
      return err('NOT_INITIALIZED', 'Reverie is not initialized -- run a session first or check platform health with `bun bin/dynamo.cjs health`');
    }

    const currentMode = modeManager.getMode();
    const state = sessionManager.getState();

    // Already active -- no-op with report
    if (currentMode === 'active') {
      return ok({
        human: 'Reverie is already in Active mode\nTriplet: ' + (state.triplet_id || 'unknown'),
        json: { mode: 'active', changed: false, triplet_id: state.triplet_id },
        raw: JSON.stringify({ mode: 'active', changed: false }),
      });
    }

    // Passive -- upgrade to Active (the expected path per D-02)
    if (currentMode === 'passive') {
      const result = await modeManager.requestActive();
      if (!result.ok) {
        return err('UPGRADE_FAILED', 'Could not upgrade to Active mode -- ' + result.error.message + '. Try `bun bin/dynamo.cjs reverie status` to check current state');
      }
      const updatedState = sessionManager.getState();
      return ok({
        human: 'Reverie upgraded to Active mode\nTriplet: ' + (updatedState.triplet_id || 'unknown') + '\nSessions: Primary + Secondary + Tertiary',
        json: { mode: 'active', changed: true, triplet_id: updatedState.triplet_id },
        raw: JSON.stringify({ mode: 'active', changed: true }),
      });
    }

    // Not running -- need full start
    // This handles dormant, stopped, or uninitialized
    // Session Manager start() enters Passive, then requestActive() upgrades
    // ... (full initialization sequence)
  }

  return Object.freeze({ handle });
}
module.exports = { createStartHandler };
```

### Stop Command Handler Pattern
```javascript
// Source: Composed from handleStop in hook-handlers.cjs (lines 432-490)
'use strict';
const { ok, err } = require('../../../../lib/result.cjs');

function createStopHandler(context) {
  const { modeManager, sessionManager, remConsolidator, contextManager } = context || {};

  async function handle(args, flags) {
    if (!modeManager || !sessionManager) {
      return err('NOT_INITIALIZED', 'Reverie is not running -- nothing to stop. Check status with `bun bin/dynamo.cjs reverie status`');
    }

    const currentMode = modeManager.getMode();
    if (currentMode === 'dormant') {
      return ok({
        human: 'Reverie is already dormant (no active sessions)',
        json: { mode: 'dormant', stopped: false },
        raw: JSON.stringify({ mode: 'dormant', stopped: false }),
      });
    }

    // Initiate clean shutdown with REM (per D-03: always REM, no skip)
    // Fire-and-forget pattern from handleStop hook handler
    await modeManager.requestRem('user_stop_command');
    await sessionManager.transitionToRem();

    if (remConsolidator) {
      const sessionContext = { /* ... build from context manager ... */ };
      remConsolidator.handleTier3(sessionContext).then(function () {
        if (modeManager) modeManager.requestDormant();
        if (sessionManager) sessionManager.completeRem();
      }).catch(function () {
        if (sessionManager) sessionManager.completeRem().catch(function () {});
      });
    }

    // Persist warm-start cache
    if (contextManager && contextManager.persistWarmStart) {
      contextManager.persistWarmStart().catch(function () {});
    }

    return ok({
      human: 'Reverie shutdown initiated\nREM consolidation running in background\nMemories will be preserved before sessions terminate',
      json: { mode: 'rem', stopping: true, rem_initiated: true },
      raw: JSON.stringify({ mode: 'rem', stopping: true }),
    });
  }

  return Object.freeze({ handle });
}
module.exports = { createStopHandler };
```

### Welcome Message Injection Pattern
```javascript
// Source: Extends context-manager.cjs init() cold-start path
// In init(), after cold-start seed creation:
const WELCOME_FLAG_PATH = path.join(resolvedDataDir, 'data', '.welcome-shown');

// Check if welcome has already been shown
const welcomeExists = await lathe.exists(WELCOME_FLAG_PATH);
if (!welcomeExists.ok || !welcomeExists.value) {
  _welcomeMessage = WELCOME_TEXT;
  await lathe.writeFile(WELCOME_FLAG_PATH, new Date().toISOString());
}

// In handleUserPromptSubmit (hook-handlers.cjs), before combined injection:
if (contextManager.getWelcomeMessage) {
  const welcome = contextManager.getWelcomeMessage();
  if (welcome) {
    combinedInjection = welcome + '\n\n' + combinedInjection;
    contextManager.clearWelcomeMessage(); // One-shot
  }
}
```

### Complete Reverie Command List (Ground Truth for Skills)
```
# Platform commands (platform-commands.cjs)
bun bin/dynamo.cjs status          # Platform status
bun bin/dynamo.cjs health          # Service health check
bun bin/dynamo.cjs version         # Version info
bun bin/dynamo.cjs install <url>   # Install plugin/module
bun bin/dynamo.cjs update          # Self-update
bun bin/dynamo.cjs config [key]    # Show configuration

# Reverie commands (register-commands.cjs)
bun bin/dynamo.cjs reverie status                    # Operational dashboard
bun bin/dynamo.cjs reverie start                     # NEW: Upgrade to Active mode
bun bin/dynamo.cjs reverie stop                      # NEW: Clean shutdown with REM
bun bin/dynamo.cjs reverie inspect fragment <id>     # Inspect specific fragment
bun bin/dynamo.cjs reverie inspect domains           # List domains
bun bin/dynamo.cjs reverie inspect associations <e>  # Association graph
bun bin/dynamo.cjs reverie inspect self-model        # Full Self Model
bun bin/dynamo.cjs reverie inspect identity          # Identity Core
bun bin/dynamo.cjs reverie inspect relational        # Relational Model
bun bin/dynamo.cjs reverie inspect conditioning      # Conditioning
bun bin/dynamo.cjs reverie history sessions          # Session timeline
bun bin/dynamo.cjs reverie history fragments         # Fragment timeline
bun bin/dynamo.cjs reverie history consolidations    # REM events
bun bin/dynamo.cjs reverie reset fragments --confirm # Wipe fragments
bun bin/dynamo.cjs reverie reset self-model --confirm# Reset Self Model
bun bin/dynamo.cjs reverie reset all --confirm       # Factory reset
bun bin/dynamo.cjs reverie backfill <file> [--dry-run] [--limit N] [--batch-size N]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Skills written before CLI | Skills generated from CLI ground truth | Phase 15 | Eliminates promise/reality mismatch |
| No start/stop commands | Explicit start/stop via Pulley | Phase 15 | /reverie skill actions actually work |
| Cryptic error codes | Error + recovery suggestion | Phase 15 | User can self-recover from errors |
| No first-run guidance | Welcome message on cold start | Phase 15 | New users oriented on first use |

## Open Questions

1. **Start from uninitialized state**
   - What we know: SessionStart hook auto-fires sessionManager.start() (entering Passive). The CLI start command's primary path is Passive -> Active.
   - What's unclear: What if user runs `reverie start` before any session has started (SessionStart hook hasn't fired)? This could happen if hooks aren't wired yet or the user runs the CLI command directly.
   - Recommendation: Start handler should detect uninitialized state and call sessionManager.start() + modeManager.requestActive() sequentially. This provides a graceful fallback path.

2. **Stop command progress reporting**
   - What we know: Stop initiates fire-and-forget REM. The command returns immediately.
   - What's unclear: How should the user know when REM completes? There's no polling mechanism in the CLI.
   - Recommendation: Return message says "REM consolidation running in background." User can check `reverie status` to see current mode. When REM completes, mode transitions to Dormant. This is sufficient -- REM is not something users need to watch in real-time.

3. **Formation agent tool permissions**
   - What we know: Agent definition specifies `tools: Read, Write, Bash` and `permissionMode: bypassPermissions`.
   - What's unclear: Does the formation agent actually need Bash? It reads a stimulus file and writes JSON output. Read + Write should suffice.
   - Recommendation: Audit whether any formation agent invocation has ever used Bash. If not, remove it to follow principle of least privilege. This is within D-12 scope.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built-in) |
| Config file | none -- bun:test discovers *.test.cjs files automatically |
| Quick run command | `bun test modules/reverie/validation/start-stop.test.cjs` |
| Full suite command | `bun test modules/reverie/validation/` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INT-02-start | Start command upgrades to Active | unit | `bun test modules/reverie/validation/start-stop.test.cjs` | Wave 0 |
| INT-02-stop | Stop command triggers REM + shutdown | unit | `bun test modules/reverie/validation/start-stop.test.cjs` | Wave 0 |
| INT-01-welcome | Welcome injection on first cold start | unit | `bun test modules/reverie/validation/welcome.test.cjs` | Wave 0 |
| INT-02-skills | Skill content matches CLI surface | unit | `bun test modules/reverie/skills/skill-content.test.cjs` | Exists (update) |

### Sampling Rate
- **Per task commit:** `bun test modules/reverie/validation/start-stop.test.cjs modules/reverie/validation/welcome.test.cjs`
- **Per wave merge:** `bun test modules/reverie/validation/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `modules/reverie/validation/start-stop.test.cjs` -- covers start/stop CLI commands
- [ ] `modules/reverie/validation/welcome.test.cjs` -- covers first-run welcome injection
- [ ] Update `modules/reverie/skills/skill-content.test.cjs` -- update assertions for rewritten skill content

## Detailed Component Analysis

### Start Command Implementation (D-01, D-02)

**New files:** `modules/reverie/components/cli/start.cjs`

**Dependencies (injected via context):**
- `modeManager` -- for getMode() and requestActive()
- `sessionManager` -- for getState(), start(), upgrade()

**State handling matrix:**

| Current Mode | Current State | Action | Result |
|-------------|---------------|--------|--------|
| active | active | No-op | Report "already Active" |
| passive | passive | requestActive() | Upgrade to Active, report |
| dormant | stopped | sessionManager.start() then requestActive() | Full init, report |
| rem | rem_processing | Report "REM in progress" | Wait message |
| unknown | uninitialized | sessionManager.start() then requestActive() | Full init, report |

**Registration in register-commands.cjs:**
```javascript
const startHandler = createStartHandler(context);
circuitApi.registerCommand('start', startHandler.handle, {
  description: 'Start or upgrade Reverie to Active mode',
});
```

### Stop Command Implementation (D-01, D-03)

**New files:** `modules/reverie/components/cli/stop.cjs`

**Dependencies (injected via context):**
- `modeManager` -- for getMode(), requestRem(), requestDormant()
- `sessionManager` -- for transitionToRem(), completeRem()
- `remConsolidator` -- for handleTier3()
- `contextManager` -- for persistWarmStart(), getSessionSnapshot()

**Stop sequence (mirrors handleStop in hook-handlers.cjs):**
1. Check current mode -- if dormant, report no-op
2. requestRem('user_stop_command') -- transitions mode to REM
3. sessionManager.transitionToRem() -- stops Tertiary, keeps Secondary
4. Fire-and-forget remConsolidator.handleTier3() -- runs full REM on Secondary
5. After REM: requestDormant() + sessionManager.completeRem()
6. Persist warm-start cache for next session
7. Return immediately with "shutdown initiated" message

**No --confirm gate** per D-03 and established pattern (stop is graceful with REM, not destructive like reset).

### Welcome Message Implementation (D-04, D-05, D-06)

**Modified files:**
- `modules/reverie/components/context/context-manager.cjs` -- add welcome state, getWelcomeMessage(), clearWelcomeMessage()
- `modules/reverie/hooks/hook-handlers.cjs` -- prepend welcome to additionalContext in handleUserPromptSubmit

**Detection mechanism (Claude's discretion):**
- Separate flag file (`data/.welcome-shown`) independent of cold-start detection
- Why separate: cold-start fires after `reset all`, but welcome should NOT repeat after reset
- init() checks flag file; if missing AND cold-start path taken, sets _welcomeMessage
- handleUserPromptSubmit prepends welcome to additionalContext (one-shot, cleared after first injection)

**Content (D-06: three lines max):**
```
Welcome to Dynamo. Reverie is now watching -- it will remember what matters from our conversations.
Use /reverie to manage sessions or /dynamo to check platform health.
```

### Skill Rewrite (D-07, D-08, D-09)

**Modified files:**
- `modules/reverie/skills/dynamo-skill.cjs` -- DYNAMO_SKILL_CONTENT rewrite
- `modules/reverie/skills/reverie-skill.cjs` -- REVERIE_SKILL_CONTENT rewrite
- `modules/reverie/skills/validate-skill.cjs` -- VALIDATE_SKILL_CONTENT rewrite
- `modules/reverie/skills/skill-content.test.cjs` -- test assertions updated

**Ground truth process:**
1. Extract full command list from register-commands.cjs (16 Reverie commands + 6 platform commands after start/stop added)
2. Cross-reference each skill's referenced commands against the list
3. Rewrite content to only reference verified commands
4. Verify --help output for each referenced command (help.cjs generateCommandHelp)

**Current /reverie skill problems:**
- References `reverie start` -- command doesn't exist yet (fixed by implementing start)
- References `reverie stop` -- command doesn't exist yet (fixed by implementing stop)
- Both are correct AFTER start/stop are implemented

**Current /dynamo skill:** Looks accurate -- references `status` and `health` which both exist.

**Current /dynamo-validate skill:** Looks accurate -- references `bun test modules/reverie/validation/` which works.

### Error Audit (D-10, D-11)

**Scope: user-visible errors only:**

1. **CLI command errors** (7 instances in `modules/reverie/components/cli/`):
   - `inspect.cjs:88` -- 'MISSING_ID' -- needs recovery suggestion
   - `inspect.cjs:92` -- 'NO_JOURNAL' -- needs recovery suggestion
   - `inspect.cjs:97` -- 'FRAGMENT_NOT_FOUND' -- needs recovery suggestion
   - `inspect.cjs:185` -- 'MISSING_ENTITY' -- needs recovery suggestion
   - `reset.cjs:37` -- 'CONFIRM_REQUIRED' -- already has hint (good pattern)
   - `register-commands.cjs:135` -- 'MISSING_PATH' -- already has usage hint
   - `register-commands.cjs:141` -- 'FILE_NOT_FOUND' -- needs recovery suggestion

2. **CLI error output** (`core/sdk/pulley/cli.cjs:42`):
   - `process.stderr.write('Error: ' + result.error.message)` -- this is where all CLI errors surface. The message string IS the user-visible error.

3. **Bootstrap errors** (`bin/dynamo.cjs:45,97`):
   - `process.stderr.write('Error: ' + bootstrapResult.error.message)` -- platform boot failure

4. **Platform command errors** (`core/sdk/pulley/platform-commands.cjs`):
   - `install:189` -- 'MISSING_URL' -- already has usage hint
   - `install:196` -- 'NO_RELAY' -- needs recovery suggestion
   - `config:300` -- 'CONFIG_KEY_NOT_FOUND' -- needs recovery suggestion

**Error format pattern (from D-11 and existing reset.cjs example):**
```javascript
return err('CODE', 'What failed -- why it failed. Try: `bun bin/dynamo.cjs <recovery command>`');
```

### Formation Agent Audit (D-12)

**Audit targets:**
1. `.claude/agents/reverie-formation.md` -- agent definition
2. `modules/reverie/hooks/hook-handlers.cjs:531-583` -- handleSubagentStop parsing
3. `modules/reverie/components/formation/fragment-assembler.cjs` -- parseFormationOutput()

**Known alignment check points:**
- Agent output contract: `{ should_form, attention_reasoning, fragments: [...], nudge }`
- Fragment fields: `formation_frame, domains, entities, attention_tags, self_model_relevance, emotional_valence, initial_weight, body, source_locator, source_fragments`
- handleSubagentStop reads from `data/formation/output/latest-output.json`
- formation-pipeline.processFormationOutput() parses the raw output

**Risk areas:**
- Agent specifies `tools: Read, Write, Bash` but may only need Read + Write
- `model: sonnet` -- verify this matches sessionConfig expectations
- `background: true` and `permissionMode: bypassPermissions` -- verify these are correct for formation
- Output file path convention must match FORMATION_OUTPUT_DIR constant

### README Rewrite (D-13)

**Current README:** Written during Phase 12.1 (quick task 260325-hcr). Contains accurate architecture overview but:
- Missing: first-run experience description
- Missing: what happens automatically (hooks fire, Reverie initializes Passive)
- Incomplete: CLI command list (missing start/stop, missing many Reverie subcommands)
- Fragment types listed incorrectly: says "episodic, semantic, procedural, emotional, relational" but actual types are "experiential, meta-recall, sublimation, consolidation, source-reference"

**README structure (D-13 scope):**
1. What Dynamo Is (brief)
2. Prerequisites (Bun >= 1.2.3, Claude Max, Git)
3. Install Steps (git clone, bun install)
4. First Run Experience (what happens automatically)
5. Skills (/dynamo, /reverie, /dynamo-validate)
6. CLI Commands (full verified list)
7. Architecture Overview (existing, may need minor updates)
8. Development (bun test, etc.)

## Project Constraints (from CLAUDE.md)

- **Runtime:** Bun -- all code runs on Bun, CJS format
- **Module format:** CJS with `'use strict'` in every file
- **No npm dependencies** for platform core
- **IoC pattern:** Options-based dependency injection (validated v0 pattern)
- **Engineering principles:** Strict separation of concerns, DRY, hardcode nothing, abstraction over lateralization
- **Build order:** Core Library -> Services + Providers -> Framework -> SDK -> Modules
- **Versioning:** User decides all version increments. Always push to origin after commits.
- **Data format:** JSON for structured data, Markdown for narrative
- **Testing:** bun:test (built-in), Jest-compatible API
- **GSD workflow:** All changes go through GSD workflow
- **Canonical docs:** `.claude/new-plan.md` and `.claude/reverie-spec-v2.md` are absolute canon

## Sources

### Primary (HIGH confidence)
- `modules/reverie/components/cli/register-commands.cjs` -- actual registered CLI commands (15 current + 2 new)
- `modules/reverie/components/modes/mode-manager.cjs` -- Mode Manager API (requestActive, requestPassive, requestRem, requestDormant, getMode, getMetrics, checkHealth)
- `modules/reverie/components/session/session-manager.cjs` -- Session Manager API (start, stop, upgrade, degrade, initShutdown, transitionToRem, completeRem, getState)
- `modules/reverie/hooks/hook-handlers.cjs` -- Hook handler implementations including handleStop REM pattern and handleSubagentStop formation parsing
- `modules/reverie/components/context/context-manager.cjs` -- Context Manager with init() cold-start/warm-start paths
- `modules/reverie/components/self-model/cold-start.cjs` -- Cold start seed generation
- `modules/reverie/skills/*.cjs` -- Skill content modules and registration pattern
- `modules/reverie/validation/*.test.cjs` -- Existing validation suite structure
- `.claude/agents/reverie-formation.md` -- Formation agent definition (audit target)
- `core/sdk/pulley/pulley.cjs` -- Pulley CLI framework, registerCommand(), route()
- `core/sdk/pulley/cli.cjs` -- CLI entry point, error output pattern
- `core/sdk/pulley/platform-commands.cjs` -- Platform command registration pattern
- `modules/reverie/reverie.cjs` -- Module entry point, full component wiring
- `modules/reverie/components/session/session-config.cjs` -- Session states, transitions, topology rules

### Secondary (MEDIUM confidence)
- `.planning/phases/12.1-platform-launch-readiness/12.1-CONTEXT.md` -- Phase 12.1 decisions on skill design (D-01 through D-05)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing Bun/CJS patterns
- Architecture: HIGH -- all patterns established in prior phases, code examples sourced from actual codebase
- Pitfalls: HIGH -- identified from concrete code paths and state machine analysis
- CLI commands: HIGH -- exact command list verified from register-commands.cjs source
- Error audit scope: HIGH -- exact file:line locations identified for all user-visible errors
- Formation agent audit: MEDIUM -- output contract alignment needs verification against fragment-assembler.cjs parseFormationOutput() at implementation time
- README content: HIGH -- incorrect fragment types identified by comparing README to actual constants.cjs FRAGMENT_TYPES

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable -- all code under our control, no external dependencies changing)
