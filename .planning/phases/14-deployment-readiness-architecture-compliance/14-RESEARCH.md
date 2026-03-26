# Phase 14: Deployment Readiness & Architecture Compliance - Research

**Researched:** 2026-03-26
**Domain:** Bootstrap sequencing, Claude Code hooks integration, CLI flag routing, Ledger queries, architecture compliance
**Confidence:** HIGH

## Summary

Phase 14 closes the gap between "component tests pass" and "the system works end-to-end in production." The M2 milestone audit identified 7 tech debt items (2 HIGH, 2 WARNING, 3 INFO), 2 broken E2E flows, and 4 partially-wired requirements. This phase addresses the 4 actionable items (2 HIGH + 2 WARNING) and performs an architecture compliance audit.

The two HIGH-priority items are tightly coupled: Exciter.start() calls wireToSwitchboard() during lifecycle boot (step 7) before module registration occurs (step 7.5d), and no `.claude/settings.json` exists to dispatch Claude Code events into Dynamo. These are deployment-level gaps -- all internal component logic is correct and tested, but the production boot sequence never wires them together. The two WARNING items (backfill CLI process.argv usage and status.cjs hardcoded metrics) are straightforward code fixes. The architecture compliance audit examines that no component bypasses Armature/Circuit contracts and no values are hardcoded that should route through config/Magnet/providers.

**Primary recommendation:** Fix Exciter boot timing by moving exciter.start() to after module registration in core.cjs, create settings.json hook entries during bootstrap, migrate backfill CLI from process.argv to Pulley flags, and wire status.cjs domain metrics through Wire.query().

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INT-01 | Hook wiring for 8 Claude Code hooks | Exciter boot timing fix + settings.json creation pattern. See "Exciter Bootstrap Timing" and "Settings.json Hook Entry Format" sections. |
| INT-02 | CLI surface via Pulley | Backfill CLI migration from process.argv to Pulley flags parameter. See "Backfill CLI Flag Migration" section. |
| PLT-03 | Exciter integration surface management | Exciter.start() re-sequencing + settings.json auto-generation. See "Exciter Bootstrap Timing" and "Settings.json Hook Entry Format" sections. |
</phase_requirements>

## Standard Stack

No new libraries are needed for Phase 14. All work uses existing platform code.

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bun runtime | >= 1.3.10 | Runtime | Project runtime -- all code runs on Bun |
| bun:test | Built-in | Test runner | Jest-compatible, 15x faster than Jest |
| node:util (parseArgs) | Built-in | Flag parsing | Already used by Pulley for CLI flag extraction |

### No New Dependencies

Phase 14 modifies 4-6 existing files and writes 0 new libraries. All fixes use existing platform APIs (Exciter, Pulley, Wire, Lathe).

## Architecture Patterns

### Pattern 1: Exciter Bootstrap Timing Fix

**What:** Move exciter.start() from lifecycle.boot() (step 7) to after module registration (step 7.5d) in core.cjs.

**When to use:** When services need to wire to Switchboard AFTER module registration completes.

**Current problematic boot sequence (core.cjs):**
```
Step 7:   lifecycle.boot() -> Exciter.start() -> wireToSwitchboard(0 listeners)
Step 7.5a: createPulley()
Step 7.5b: createCircuit()
Step 7.5c: registerPlatformCommands()
Step 7.5d: discoverModules() -> circuit.registerModule() -> reverie.register()
           -> exciter.registerHooks('reverie', {8 handlers})  // AFTER wiring!
```

**Required fix -- two approaches:**

**Approach A (Recommended): Defer exciter.start() to after step 7.5d**
- Remove exciter from lifecycle.boot()'s `start()` call sequence
- Call `exciter.start()` explicitly in core.cjs after all module registrations complete
- This requires either: (a) skipping start() for exciter during lifecycle boot via a config flag, or (b) adding a post-module-registration hook to lifecycle

**Approach B: Add rewire() to Exciter**
- Add a `rewire()` method to Exciter that calls wireToSwitchboard again
- Call `exciter.rewire()` after step 7.5d
- Downside: wireToSwitchboard registers duplicate handlers unless it clears old ones first

**Analysis of lifecycle.cjs:**
The lifecycle.boot() method (line 162-165) calls `instance.start()` for every service that has it, during the boot loop. Exciter's start() is called at this point, before modules are registered. The cleanest approach is to not let lifecycle.boot() call exciter.start(), and instead call it explicitly from core.cjs after module registration.

The lifecycle.boot() calls start() unconditionally for all services (line 162-165). Two options:
1. **Skip Exciter's start() during boot:** Add a sentinel (e.g., `_deferStart`) so Exciter's start() is a no-op during lifecycle boot, then call it explicitly from core.cjs
2. **Add a rewire path:** Keep the existing start() but add wireToSwitchboard() re-invocation after modules register

**Recommended implementation:**
```javascript
// In core.cjs, after step 7.5d module discovery loop:

// 7.6. Wire Exciter hooks to Switchboard (MUST be after module registration)
// Per Phase 14: Exciter.start() during lifecycle boot wires 0 listeners.
// Now that modules have registered hooks, re-wire to connect them.
const exciterFacade = lifecycle.getFacade('services.exciter');
if (exciterFacade && typeof exciterFacade.start === 'function') {
  exciterFacade.start();
}
```

**Key constraint:** Exciter's hookRegistry uses `_listeners` Map. If wireToSwitchboard is called twice, it registers duplicate handlers on Switchboard. The hookRegistry must either (a) clear previous wiring before re-wiring, or (b) skip hook types already wired. Adding an idempotency check to wireToSwitchboard is the safest approach.

### Pattern 2: Settings.json Hook Entry Generation

**What:** Generate `.claude/settings.json` with hook entries that route Claude Code lifecycle events to Dynamo's entry point script.

**Claude Code settings.json hook format (verified from official docs):**
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun run bin/dynamo.cjs hook SessionStart"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun run bin/dynamo.cjs hook UserPromptSubmit"
          }
        ]
      }
    ]
  }
}
```

**Required events for Reverie's 8 hooks:**
- SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, PreCompact, SubagentStart, SubagentStop

**Hook entry point architecture:**
Claude Code dispatches hooks by running the specified command, passing the event payload as JSON on stdin. Dynamo needs a hook entry point (bin/dynamo.cjs or a dedicated hook script) that:
1. Reads JSON from stdin
2. Bootstraps Dynamo (or connects to a running instance)
3. Calls Commutator.ingest(payload) to route through Switchboard
4. Returns JSON response on stdout (with additionalContext, decision, etc.)

**Current state:** `bin/dynamo.cjs` only handles CLI routing. It does not have a hook mode. A hook dispatch path needs to be added.

**Exciter already has updateSettings():** The `exciter.updateSettings(scope, hookEvent, entry)` method writes hook entries to settings.json. It's already implemented and tested. It just needs to be called during bootstrap.

**Implementation approach:**
1. Create a hook entry point (either extend bin/dynamo.cjs or create bin/dynamo-hook.cjs)
2. Call `exciter.updateSettings('project', hookEvent, entry)` for each of the 8 hook types during bootstrap
3. The hook entry script reads stdin JSON, bootstraps Dynamo, calls commutator.ingest(), writes response to stdout

### Pattern 3: Pulley Flag Routing for Backfill CLI

**What:** Replace `process.argv` reads in backfill command with Pulley's flags parameter.

**Current broken pattern (register-commands.cjs:144-148):**
```javascript
const isDryRun = process.argv.includes('--dry-run');
const limitIdx = process.argv.indexOf('--limit');
const limit = limitIdx >= 0 ? parseInt(process.argv[limitIdx + 1], 10) : null;
```

**Correct pattern using Pulley flags:**
Pulley's route() method parses argv and passes `flags` as the second argument to command handlers (line 141 in pulley.cjs):
```javascript
const handlerResult = await commandMeta.handler(remainingPositionals, {
  json: values.json,
  raw: values.raw,
});
```

However, Pulley currently only parses `--json`, `--raw`, and `--help`. Custom flags like `--dry-run`, `--limit`, `--batch-size` are NOT parsed by Pulley. They pass through as unrecognized flags (parseArgs with `strict: false` ignores them).

**Fix approach:** Use node:util parseArgs inside the handler with `strict: false` to extract custom flags from the original argv, OR extend Pulley's flag parsing to support custom flags per command. The simpler approach is to parse custom flags within the handler itself using the args array passed by Pulley, not process.argv.

Actually, the correct fix is simpler: Pulley calls `commandMeta.handler(remainingPositionals, flags)` where flags contains `{json, raw}`. The handler should accept these flags and parse any additional custom flags from its own context. Since Pulley uses `strict: false`, unknown flags like `--dry-run` and `--limit` are silently ignored but NOT passed through.

The cleanest fix: parse custom flags from the raw argv that Pulley receives. Since the handler receives `flags` as the second parameter, we need to pass the full flag set. Looking at Pulley line 141, only `json` and `raw` are passed. Custom flags need to be parsed separately.

**Recommended approach:**
Inside the backfill handler, use node:util parseArgs on the args/flags to extract custom flags, or accept them as positional arguments. The simplest compatible approach is to parse the command-specific flags from the argv that Pulley already has access to, by extending the flags object passed to handlers.

Alternatively, the handler can do its own parseArgs on a known set of allowed flags:
```javascript
async function handleBackfill(args, flags) {
  const filePath = args[0];
  // flags now contains: { json, raw, 'dry-run', limit, 'batch-size' }
  const isDryRun = flags['dry-run'] || false;
  const limit = flags.limit ? parseInt(flags.limit, 10) : null;
  const batchSize = flags['batch-size'] ? parseInt(flags['batch-size'], 10) : undefined;
}
```

This requires Pulley to pass through unknown flags. Looking at Pulley's route() (line 84-97), it uses `strict: false` which means unknown flags are collected in `parsed.values`. So `--dry-run`, `--limit 10`, `--batch-size 5` should already be captured. Let me verify: `parseArgs` with `strict: false` does NOT include unknown flags in values -- it only includes defined options. Unknown flags are simply ignored.

**Correct implementation:** The handler receives the full `argv` array through Pulley's route call. The cleanest approach:
1. Register backfill command with flag definitions in meta
2. Use a local parseArgs call inside the handler that accepts `--dry-run`, `--limit`, `--batch-size`
3. The handler already receives `args` (remaining positionals) -- pass the raw argv or use a closure over the command-specific argv

The actual simplest fix for `register-commands.cjs` is to parse the custom flags locally within the handler using a scoped parseArgs call, with the argv portion after the command words. However, since the handler doesn't receive the raw argv, the best approach is to have the handler parse flags from a combination of `args` and `flags`.

**Practical fix:** Modify Pulley to pass through all parsed values (not just json/raw), then the handler can read `flags['dry-run']`, `flags.limit`, etc. This is a one-line change in pulley.cjs line 141: pass `values` (all parsed values) instead of the subset `{json, raw}`.

### Pattern 4: Status Metrics via Wire.query()

**What:** Replace hardcoded 0 values in status.cjs with actual Wire.query() calls for domain_count and association_index_size.

**Current state (status.cjs:89-105):** The code already calls `wire.query('domains')` and `wire.query('associations')`. However the Wire facade may not receive a Ledger reference during module registration, or the stored data structure may not match.

**Analysis:** Looking at the code path:
1. `status.cjs` calls `wire.query('domains')`
2. Wire.query (wire.cjs:400) calls `_ledger.read('domains')`
3. Ledger.read queries `records` table WHERE id = 'domains'
4. If data exists, returns `{id, data, ...}` where data is the stored JSON
5. Wire.query extracts `result.value.data` and returns it

The issue is that the Wire instance injected into Reverie's register() function (via `getService('wire')`) is the facade. The Wire facade has the optional `query()` method because createFacade iterates all contract keys including optional methods.

The Wire service receives `providers.ledger` as a dependency (core.cjs line 121) which gets resolved to the Ledger facade during lifecycle boot. So Wire.query() should have access to Ledger.

**Root cause of "hardcoded 0":** The domain and association data may simply not exist in the records table yet (no formation has run). Additionally, the write-coordinator stores data under table names like 'domains', 'fragment_domains', etc. but the data is the raw row objects, not the domain metadata itself. When FragmentWriter calls `wire.queueWrite()` for domains, it writes fragment-domain association rows, not domain metadata.

To get actual domain_count: Need to query the `domains` table stored in Ledger via Wire.query('domains'). This returns domain records written by formation pipeline's _queueAssociationIndexWrites method. If domains have been written, the query should return them.

**Fix:** Ensure Wire.query('domains') correctly returns stored domain records. If the data is empty (no formations have occurred), status should correctly report 0. The "hardcoded" characterization may be incorrect -- the code path is there, it just returns 0 when no data exists.

However, reviewing status.cjs more carefully, the Wire dependency injected into the CLI context (`context.wire`) comes from `getService('wire')` in reverie.cjs. This IS the Wire facade and should have `.query()`. The more likely issue is that Wire.query calls `_ledger.read(tableName)` which returns Err('NOT_FOUND') for empty tables, so Wire.query returns `ok([])`. This means status.cjs correctly reports 0 for empty databases.

The actual fix needed: ensure that when formation pipeline writes domain upserts, they are stored in a format that Wire.query can retrieve and that status.cjs can filter. The code path is already correct -- it's just that no live data exercises it. The audit's characterization of "hardcoded to 0" may be based on the observation that with no live data, it always returns 0. But the code IS wired to return real values when data exists.

**Conclusion on status.cjs:** The existing code at lines 89-105 should work when data exists. The fix is to verify the data path is exercised end-to-end and that Wire.query() returns the expected structure. No code change may be needed -- just verification. If the audit found a real structural issue (wrong table name, wrong data format), that would need fixing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Settings.json writing | Manual JSON file manipulation | Exciter.updateSettings() | Already implemented with dedup, scope resolution, and Lathe integration |
| Hook event routing | Custom stdin parsing | Commutator.ingest() | Already handles all hook event types with semantic domain mapping |
| Flag parsing | Manual argv scanning | node:util parseArgs | Standard library, handles types, defaults, and unknown flags |
| Test doubles | Custom mock frameworks | bun:test mock() | Built-in, Jest-compatible, already used project-wide |

## Common Pitfalls

### Pitfall 1: Duplicate Switchboard Handlers on Re-wire
**What goes wrong:** Calling wireToSwitchboard() twice registers duplicate handlers, causing hooks to fire twice per event.
**Why it happens:** hookRegistry.wireToSwitchboard iterates _listeners and calls switchboard.on() for each. If called again with the same listeners, it creates new handler registrations.
**How to avoid:** Either (a) track wired state and skip already-wired hook types, or (b) clear previous wiring before re-wiring. Option (a) is safer -- add a `_wiredTypes` Set to track what has been wired.
**Warning signs:** Test assertions expecting 1 handler call seeing 2 calls per hook event.

### Pitfall 2: Hook Entry Point Cold Start Latency
**What goes wrong:** Each Claude Code hook invocation spawns `bun run bin/dynamo.cjs hook ...` which bootstraps the entire platform. This adds 100-500ms per hook event.
**Why it happens:** Dynamo has no persistent daemon. Every hook invocation is a cold start: create container, boot services, connect Ledger, discover modules.
**How to avoid:** This is acceptable for v1.0. The hook response includes `additionalContext` which Claude Code processes synchronously. Long-running hooks should use `"async": true` in settings.json. Session-start hooks can afford the latency. Per-tool hooks (PreToolUse/PostToolUse) should be async or lightweight.
**Warning signs:** Hooks timing out (default 600s is generous; real concern is user-visible delay).

### Pitfall 3: Settings.json Merge Conflicts
**What goes wrong:** Dynamo overwrites user-added hook entries in settings.json.
**Why it happens:** Writing the full settings.json replaces the entire file.
**How to avoid:** Exciter's updateSettings uses writeHookEntry which reads existing settings, checks for duplicates by command string, and only appends new entries. This is already handled correctly.
**Warning signs:** User hooks disappearing after Dynamo bootstrap.

### Pitfall 4: process.argv Contamination in Programmatic Context
**What goes wrong:** Backfill CLI works from terminal but fails when called programmatically (e.g., from tests or MCP tools).
**Why it happens:** process.argv contains the invoking program's argv, not the command's flags. In programmatic context, argv may not contain --dry-run, --limit, etc.
**How to avoid:** Read flags from the handler's `flags` parameter (populated by Pulley), never from process.argv. The handler's flags represent the command's intended arguments regardless of invocation context.
**Warning signs:** Tests that manipulate process.argv (e.g., reset.test.js lines 73-89) -- this is a test smell indicating the production code reads process.argv.

### Pitfall 5: Architecture Compliance Audit Scope Creep
**What goes wrong:** The audit becomes an unbounded refactoring exercise.
**Why it happens:** Every codebase has patterns that could be "cleaner." Without clear criteria, the audit expands indefinitely.
**How to avoid:** Define audit criteria upfront: (1) Does it bypass Armature/Circuit contracts? (2) Is there a hardcoded path/value that should come from config/Magnet? (3) Does it violate the engineering principles in CLAUDE.md? Only fix actual violations, not style preferences.
**Warning signs:** Audit findings that begin with "it would be better if..." rather than "this bypasses X contract."

## Code Examples

### Example 1: Idempotent wireToSwitchboard
```javascript
// In hooks.cjs createHookRegistry
const _wiredTypes = new Set();

function wireToSwitchboard(switchboard) {
  let wiredCount = 0;
  for (const [hookType, listeners] of _listeners) {
    if (listeners.length === 0 || _wiredTypes.has(hookType)) continue;
    const eventName = HOOK_EVENT_NAMES[hookType];
    if (!eventName) continue;
    switchboard.on(eventName, (payload) => {
      for (const listener of listeners) listener.handler(payload);
    });
    _wiredTypes.add(hookType);
    wiredCount++;
  }
  return ok(wiredCount);
}
```
Source: Derived from core/armature/hooks.cjs:131-153

### Example 2: Settings.json Hook Entries for Dynamo
```javascript
// Generate settings.json entries for all 8 hook types
const HOOK_TYPES = [
  'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse',
  'Stop', 'PreCompact', 'SubagentStart', 'SubagentStop'
];

for (const hookType of HOOK_TYPES) {
  exciter.updateSettings('project', hookType, {
    hooks: [{
      type: 'command',
      command: 'bun run bin/dynamo.cjs hook',
    }],
  });
}
```
Source: Derived from core/services/exciter/settings-manager.cjs:89-112

### Example 3: Backfill Handler with Pulley Flags
```javascript
async function handleBackfill(args, flags) {
  const filePath = args[0];
  if (!filePath) {
    return err('MISSING_PATH', 'Usage: dynamo reverie backfill <path> [--dry-run] [--limit N] [--batch-size N]');
  }
  // Read flags from Pulley parameter, not process.argv
  const isDryRun = flags['dry-run'] || false;
  const limit = flags.limit ? parseInt(String(flags.limit), 10) : null;
  const batchSize = flags['batch-size'] ? parseInt(String(flags['batch-size']), 10) : undefined;
  // ... rest of handler
}
```
Source: Derived from modules/reverie/components/cli/register-commands.cjs:132-168

### Example 4: Hook Entry Point Script
```javascript
// bin/dynamo.cjs hook mode addition
if (process.argv[2] === 'hook') {
  // Read hook payload from stdin
  let input = '';
  for await (const chunk of Bun.stdin.stream()) {
    input += new TextDecoder().decode(chunk);
  }
  const payload = JSON.parse(input);

  // Bootstrap and ingest
  const result = await bootstrap();
  if (result.ok) {
    const commutator = result.value.container.resolve('services.commutator');
    const response = commutator.value.ingest(payload);
    process.stdout.write(JSON.stringify(response));
  }
  process.exit(0);
}
```
Source: Derived from bin/dynamo.cjs and core/services/commutator/commutator.cjs

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Lifecycle boot calls start() for all services unconditionally | Need deferred start for Exciter (after module registration) | Phase 14 | Exciter hooks wire to Switchboard at correct time |
| process.argv direct reads in CLI handlers | Pulley flags parameter with handler-local parseArgs | Phase 14 | CLI commands work in both direct and programmatic contexts |
| No .claude/settings.json | Auto-generated during bootstrap | Phase 14 | Claude Code lifecycle events route to Dynamo |

## Open Questions

1. **Hook entry point cold start performance**
   - What we know: Each hook invocation bootstraps Dynamo from scratch. DuckDB connection, module discovery, service init all run per hook.
   - What's unclear: Whether this latency is acceptable for high-frequency hooks (UserPromptSubmit, PreToolUse, PostToolUse).
   - Recommendation: For v1.0, mark per-tool hooks as `"async": true` in settings.json to avoid blocking Claude Code. Optimize cold start in future versions.

2. **reset.cjs process.argv usage for --confirm**
   - What we know: reset.cjs also reads `--confirm` from process.argv (line 34). This is the same anti-pattern as the backfill CLI.
   - What's unclear: Whether --confirm should also be migrated to Pulley flags in this phase, or only the backfill flags per the audit's scope.
   - Recommendation: Fix reset.cjs --confirm in the same plan since it's the identical pattern. The audit flagged backfill specifically but the principle applies to reset too.

3. **status.cjs Wire.query() data format**
   - What we know: The code path wire.query('domains') -> ledger.read('domains') is implemented. Returns ok([]) when no data exists.
   - What's unclear: Whether formation pipeline's domain upserts store data in the `records` table format that Wire.query expects, or whether domains are only stored as DDL table rows in DuckDB (separate from the generic records table).
   - Recommendation: Trace the exact data path during a formation write to verify Wire.query('domains') returns real domain objects with the `archived` field.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built-in) |
| Config file | none -- bun:test auto-discovers *.test.* files |
| Quick run command | `bun test core/services/exciter core/armature/hooks.cjs modules/reverie/components/cli` |
| Full suite command | `bun test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INT-01 | Exciter hooks wire to Switchboard after module registration | integration | `bun test core/services/exciter/__tests__/exciter.test.js -x` | Exists (needs new test cases) |
| INT-01 | settings.json hook entries generated for 8 events | unit | `bun test core/services/exciter/__tests__/exciter.test.js -x` | Exists (needs new test cases) |
| INT-02 | Backfill flags read from Pulley flags param | unit | `bun test modules/reverie/components/cli/__tests__/ -x` | Needs verification |
| PLT-03 | Exciter.start() after module registration in boot order | integration | `bun test core/ -x --filter "bootstrap"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test core/services/exciter core/armature modules/reverie/components/cli`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green (2,344+ tests, 0 fail) before /gsd:verify-work

### Wave 0 Gaps
- [ ] `core/services/exciter/__tests__/exciter.test.js` -- add test for re-wire after module registration (INT-01/PLT-03)
- [ ] Bootstrap integration test verifying Exciter hooks reach Switchboard in production boot order
- [ ] Backfill CLI test verifying flags param instead of process.argv

## Sources

### Primary (HIGH confidence)
- `core/core.cjs` -- bootstrap sequence (steps 7 through 7.5d), module registration order
- `core/armature/lifecycle.cjs` -- lifecycle.boot() start() calling logic (lines 162-165)
- `core/services/exciter/exciter.cjs` -- Exciter.start() wiring logic, registerHooks API
- `core/armature/hooks.cjs` -- createHookRegistry, wireToSwitchboard implementation
- `core/services/exciter/settings-manager.cjs` -- writeHookEntry with dedup, scope resolution
- `modules/reverie/reverie.cjs` -- register() function, hook registration at line 379-388
- `modules/reverie/components/cli/register-commands.cjs` -- backfill handler process.argv usage (lines 144-148)
- `modules/reverie/components/cli/status.cjs` -- domain_count/index_size queries (lines 89-105)
- `core/sdk/pulley/pulley.cjs` -- route() method, flag passing to handlers (line 141)
- `.planning/v1.0-M2-MILESTONE-AUDIT.md` -- tech debt inventory, broken flows, partial wiring

### Secondary (MEDIUM confidence)
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- settings.json format, hook types, stdin/stdout contract
- `bin/dynamo.cjs` -- current CLI entry point (no hook mode yet)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Exciter boot timing: HIGH -- traced through core.cjs, lifecycle.cjs, exciter.cjs, hooks.cjs. Root cause and fix approach verified.
- Settings.json format: HIGH -- verified against official Claude Code docs. Exciter.updateSettings() already implements the write path.
- Backfill CLI fix: HIGH -- process.argv usage located, Pulley flag architecture understood. Straightforward code change.
- Status metrics: MEDIUM -- code path exists and appears correct. Uncertainty about whether formation writes produce data in the format Wire.query expects.
- Architecture compliance: MEDIUM -- audit criteria defined, but scope depends on what violations are found during the sweep.

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable platform code, no external dependency changes expected)
