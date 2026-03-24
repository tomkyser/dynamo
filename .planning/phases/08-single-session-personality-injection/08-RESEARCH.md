# Phase 8: Single-Session Personality Injection - Research

**Researched:** 2026-03-24
**Domain:** Claude Code hook-based personality injection, context budget management, compaction survival, prompt composition from Self Model state
**Confidence:** HIGH

## Summary

Phase 8 transforms the Self Model built in Phase 7 into an active personality injection system operating entirely within a single Claude Code session. The core mechanism is straightforward: compose a Face prompt from Self Model aspect state, write it to a well-known file, read that file on every `UserPromptSubmit` hook, and return it as `additionalContext` in the hook's JSON output. The critical complexity lies in three areas: (1) the context budget strategy that must REINFORCE injection at high utilization rather than shrink it (per PITFALLS research, overriding the spec), (2) compaction survival given that PreCompact hook output gets summarized along with conversation content and CANNOT control the compaction algorithm, and (3) the warm-start cache that ensures personality is present from the very first turn.

The Claude Code hooks contract is well-documented and stable. The key finding is that `UserPromptSubmit` and `SessionStart` hooks inject context via `additionalContext` inside `hookSpecificOutput`, or via plain stdout text -- NOT via `systemMessage` (which is a user-facing warning field). This is a correction to the CONTEXT.md's D-02 which references `systemMessage` as the injection mechanism. The `PostToolUse` hook also supports `additionalContext` for micro-nudge injection at Phase 3 budget. All 8 hook types are documented with clear input/output contracts. The hook execution model is synchronous by default with a 600-second timeout for command hooks.

The architecture leverages existing platform infrastructure heavily: Armature's hook registry with `createHookRegistry()` for wiring, Commutator for payload routing to Switchboard, Lathe for atomic file writes, Magnet for in-memory state caching, and the Self Model manager's `getAspect()` for synchronous reads from cache. The `context/` component directory already exists as a placeholder in the Reverie module structure. Phase 8 fills it with the Context Manager (budget tracking, template composition) and creates hook handler implementations that register through the existing hook registry.

**Primary recommendation:** Build the Context Manager as the central orchestrator with two sub-components (budget tracker and template composer), wire all 8 hooks through Armature's registry, use `additionalContext` (not `systemMessage`) for context injection, and treat the face prompt file as both the active injection source AND the warm-start cache (single file, dual purpose per D-02).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Template-driven composition. Context Manager reads Self Model aspects (identity-core, relational-model, conditioning) and fills a structured prompt template with extracted values. Template has 5 slots: Identity Frame (~200-400 tokens), Relational Context (~100-200 tokens), Attention Directives (~100-300 tokens), Behavioral Directives (~100-200 tokens), Referential Framing (~100-200 tokens). Total per-turn budget: ~800-1800 tokens at full injection.
- **D-02:** Delivery via state file + hook read. Context Manager writes the composed Face prompt to a well-known file (`~/.dynamo/reverie/face-prompt.md` or equivalent). The UserPromptSubmit hook reads this file synchronously and returns it as `systemMessage`. This matches the spec's Phase 10 design (Secondary writes, hook reads) -- only the writer changes. The same file serves as the warm-start cache (CTX-05).
- **D-03:** Recomposition triggers: on SessionStart (initial compose) and on context budget phase transitions. Also recompose after compaction (budget reset to full). Between transitions, the same file is read repeatedly -- no wasted work.
- **D-04:** Behavioral Directives slot seeded with static defaults derived from Self Model state in Phase 8 (e.g., "technical depth: match user", "communication mode: balanced"). Secondary replaces these with dynamic directives in Phase 10. Ensures the full template structure is exercised and testable now.
- **D-05:** Follow the PITFALLS research model, NOT the spec's budget phases. At high context utilization, the injection gets LARGER, not smaller. Rationale: if 90% of context is raw material, the Self Model needs proportionally stronger injection to compete for attention. The spec's "minimal injection at 75-90%" is exactly backwards for personality persistence.
- **D-06:** Four budget phases with research-backed thresholds: Phase 1 (0-30% utilization): Full injection ~1200 tokens, all 5 template slots. Phase 2 (30-60%): Compressed ~800 tokens, tighten identity frame, summarize relational context. Phase 3 (60-80%): Reinforced ~1500-2000 tokens, STRENGTHEN identity frame + referential framing, add PostToolUse micro-nudges (~50-100 tokens each). Phase 4 (>80%): Compaction advocacy -- full injection + directive to trigger compaction, proactive not reactive.
- **D-07:** Context utilization measured via cumulative byte tracking from hook payloads. Track user_prompt size (UserPromptSubmit), tool_output size (PostToolUse), plus a multiplier estimate for model responses. Use bytes-to-tokens heuristic (~4 bytes/token for English). Hooks already receive these payloads.
- **D-08:** PostToolUse micro-nudges included in Phase 8. Brief personality reinforcement (~50-100 tokens) after every tool call, activated only in Phase 3 (reinforced) budget. Format: "Remember: you are [identity phrase]. Current attention: [pointer]."
- **D-09:** PreCompact does two things: (1) Saves a checkpoint file to Journal (`reverie/data/checkpoints/compact-{timestamp}.json`) containing full Face prompt text, current budget phase, cumulative context bytes, active attention directives, and last entropy state. (2) Injects a `systemMessage` that frames how compaction should summarize.
- **D-10:** Post-compaction full reinjection. After compaction, reset budget phase to Phase 1 (full). The next UserPromptSubmit injects the complete Face prompt. Treat post-compaction as a mini-SessionStart. Reset the cumulative byte counter to an estimate of post-compaction size.
- **D-11:** All 8 hooks wired with real handlers. Hooks without dedicated Phase 8 behavior (SubagentStart/Stop, PreToolUse) log the event to Switchboard and update context utilization metrics (byte tracking). Every hook contributes to the cumulative context estimate, making budget phase transitions more accurate.
- **D-12:** Stop hook persists warm-start cache + state snapshot. On Stop: (1) Write current Face prompt to the warm-start cache file (CTX-05). (2) Save a session-end state snapshot (final budget phase, cumulative bytes, turn count, entropy state).
- **D-13:** SessionStart hook reads warm-start cache if it exists. If not (first session ever), runs cold-start initialization (Phase 7's cold-start.cjs), then composes a Face prompt from the fresh Self Model state. The user's very first turn always has personality.

### Claude's Discretion
- Face prompt template exact wording and format (the slot structure is decided; exact prompt engineering is implementation)
- Checkpoint file schema details beyond the fields listed in D-09
- Byte-to-token heuristic calibration and model response size multiplier
- How compaction is detected (hook event vs. context size drop between turns)
- PostToolUse micro-nudge exact phrasing
- Test harness design for measuring personality persistence across turns

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CTX-01 | Continuous Self Model reinjection on every UserPromptSubmit (~800-1800 token budget) | Hook contract verified: `additionalContext` field in `hookSpecificOutput` injects text into Claude's context. Template-driven composition from Self Model aspects via getAspect() provides the content. File-based delivery (Lathe readFile) measured at <5ms for 7KB files. |
| CTX-03 | Context budget management (4 phases: full -> compressed -> reinforced -> compaction advocacy) | Research-backed thresholds from PITFALLS Pitfall 2. Byte tracking via hook payloads (user_prompt in UserPromptSubmit, tool_response in PostToolUse). Heuristic: ~4 bytes/token. Budget transitions trigger recomposition events via Switchboard. |
| CTX-04 | Self Model as compaction frame (PreCompact preserves Self Model perspective) | CRITICAL FINDING: PreCompact hook output gets summarized along with conversation content -- it cannot control HOW compaction works. Mitigation: checkpoint state to Journal before compaction + full reinjection post-compaction. PreCompact stdout/additionalContext is best-effort framing only. |
| CTX-05 | Warm-start face prompt cache -- persist final Face prompt from prior session for instant personality on SessionStart | Single-file dual-purpose design: the face-prompt.md file IS the warm-start cache. Stop hook writes it; SessionStart hook reads it. Lathe readFile returns in <5ms. SessionStart hook additionalContext provides instant personality. |
| INT-01 | Hook wiring for 8 Claude Code hooks (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, PreCompact, SubagentStart, SubagentStop) | Armature's createHookRegistry() already supports register(), wireToSwitchboard(), and loadFromConfig(). Commutator's HOOK_EVENT_MAP routes all 8 hooks. Circuit's EventProxy passes hook:* events to modules un-namespaced. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Runtime**: Bun -- all code runs on Bun, CJS format
- **Module format**: `'use strict'` + `require()`/`module.exports` (no ESM in source)
- **No npm dependencies**: Platform core uses only Bun/Node built-ins. Reverie module uses platform services + zod (already installed).
- **Data format**: JSON for structured data, Markdown for narrative data
- **Engineering principles**: Strict separation of concerns, IoC, DRY, abstraction over lateralization, hardcode nothing
- **Options-based DI**: All components take injected dependencies. Test isolation via mock injection.
- **Contract pattern**: SHAPE constant + createContract() for frozen public APIs
- **Result pattern**: ok/err from lib/result.cjs for all operations
- **Git**: Always push to origin after commits. User decides version bumps.
- **GSD Workflow**: Use GSD entry points for all work

## Standard Stack

### Core (No New Dependencies)

| Component | Source | Purpose | Why Standard |
|-----------|--------|---------|--------------|
| Armature hook registry | `core/armature/hooks.cjs` | Register Reverie handlers for all 8 hook types | Already built with register(), wireToSwitchboard(), HOOK_SCHEMAS. Phase 8 consumes this API. |
| Commutator | `core/services/commutator/commutator.cjs` | Routes hook payloads to Switchboard domain events | HOOK_EVENT_MAP already maps all 8 hooks. resolveEventName() handles tool-specific routing. |
| Circuit EventProxy | `core/sdk/circuit/event-proxy.cjs` | Module receives hook:* events un-namespaced | Passes system events (hook:*, state:*) through without prefixing. Reverie listens via `events.on('hook:prompt-submit', handler)`. |
| Lathe | `core/services/lathe/lathe.cjs` | Read/write face prompt file and checkpoint files | readFile() uses Bun.file().text() -- fast async read. writeFile() uses Bun.write() with auto-mkdir. writeFileAtomic() for crash-safe writes. |
| Magnet | `core/services/magnet/magnet.cjs` | In-memory Self Model state cache | getAspect() reads from Magnet synchronously (no disk I/O). Self Model manager caches aspects on load/save. |
| Self Model manager | `modules/reverie/components/self-model/self-model.cjs` | Read Self Model aspects for template composition | getAspect() for synchronous Magnet cache reads. load() for Journal+Magnet+Ledger full reads. |
| Cold-start | `modules/reverie/components/self-model/cold-start.cjs` | First-session initialization when no warm-start cache exists | createColdStartSeed() with optional entropy engine. Used by SessionStart on cold start. |
| Entropy engine | `modules/reverie/components/self-model/entropy-engine.cjs` | Session-to-session personality variance | applyVariance() for trait weight stochastic noise. getState()/evolve() for persistence. |
| Switchboard | `core/services/switchboard/switchboard.cjs` | Event emission for budget phase transitions | emit(eventName, payload) for reverie:budget-phase-changed, reverie:face-prompt-composed events. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 4.x (installed) | Schema validation for checkpoint data, budget state | Validate checkpoint JSON schema on write/read. Validate budget phase transition payloads. |

**Installation:** No new packages required. All dependencies are already available.

## Architecture Patterns

### Recommended Component Structure

```
modules/reverie/components/context/
  context-manager.cjs          # Central orchestrator: compose, track budget, manage lifecycle
  budget-tracker.cjs           # Budget phase state machine (Phase 1-4 transitions)
  template-composer.cjs        # Fills 5-slot template from Self Model aspects
  __tests__/
    context-manager.test.js
    budget-tracker.test.js
    template-composer.test.js

modules/reverie/hooks/
  hook-handlers.cjs            # All 8 hook handler implementations
  __tests__/
    hook-handlers.test.js
```

### Pattern 1: Context Manager as Orchestrator

**What:** The Context Manager is a stateful component that owns the face prompt lifecycle -- composition, budget tracking, file I/O, and recomposition triggers.

**When to use:** Whenever any hook handler needs to inject or update personality context.

**Example:**
```javascript
'use strict';

// Source: Phase 8 architecture based on D-01 through D-13
const { ok, err, createContract } = require('../../../../lib/index.cjs');

const CONTEXT_MANAGER_SHAPE = {
  required: ['init', 'compose', 'getBudgetPhase', 'trackBytes', 'getInjection', 'checkpoint', 'reset'],
  optional: [],
};

function createContextManager(options) {
  const { selfModel, lathe, switchboard, entropy, dataDir } = options;

  let _budgetPhase = 1;
  let _cumulativeBytes = 0;
  let _turnCount = 0;
  let _currentFacePrompt = null;
  let _facePromptPath = null; // Set during init from dataDir

  function compose() {
    // Read all 3 aspects from Self Model (synchronous Magnet cache)
    const identity = selfModel.getAspect('identity-core');
    const relational = selfModel.getAspect('relational-model');
    const conditioning = selfModel.getAspect('conditioning');
    // Fill 5-slot template based on current budget phase
    // Write to face prompt file via Lathe
    // Cache in memory
  }

  function trackBytes(byteCount, source) {
    _cumulativeBytes += byteCount;
    const prevPhase = _budgetPhase;
    _budgetPhase = _calculatePhase(_cumulativeBytes);
    if (_budgetPhase !== prevPhase) {
      switchboard.emit('reverie:budget-phase-changed', { from: prevPhase, to: _budgetPhase });
      compose(); // Recompose on phase transition
    }
  }

  function getInjection() {
    // Return current face prompt for hook additionalContext
    return _currentFacePrompt;
  }

  // ... remaining methods
}
```

### Pattern 2: Budget Phase State Machine

**What:** A pure-function state machine that maps cumulative byte estimates to budget phases.

**When to use:** On every hook invocation that contributes bytes.

**Example:**
```javascript
'use strict';

// Source: D-06 thresholds from PITFALLS research (NOT spec thresholds)
// Context window: ~200K tokens = ~800K bytes at 4 bytes/token heuristic

const BUDGET_PHASES = Object.freeze({
  FULL: 1,        // 0-30% utilization: ~1200 tokens injection
  COMPRESSED: 2,  // 30-60%: ~800 tokens, tightened slots
  REINFORCED: 3,  // 60-80%: ~1500-2000 tokens, STRENGTHENED injection + micro-nudges
  COMPACTION: 4,  // >80%: full injection + compaction advocacy directive
});

const PHASE_THRESHOLDS = Object.freeze({
  // Byte thresholds assuming ~800K byte context window (200K tokens * 4)
  COMPRESSED_AT: 0.30,  // 240K bytes
  REINFORCED_AT: 0.60,  // 480K bytes
  COMPACTION_AT: 0.80,  // 640K bytes
});

function calculateBudgetPhase(cumulativeBytes, contextWindowBytes) {
  const utilization = cumulativeBytes / contextWindowBytes;
  if (utilization >= PHASE_THRESHOLDS.COMPACTION_AT) return BUDGET_PHASES.COMPACTION;
  if (utilization >= PHASE_THRESHOLDS.REINFORCED_AT) return BUDGET_PHASES.REINFORCED;
  if (utilization >= PHASE_THRESHOLDS.COMPRESSED_AT) return BUDGET_PHASES.COMPRESSED;
  return BUDGET_PHASES.FULL;
}
```

### Pattern 3: Hook Handler as Thin Dispatch

**What:** Each hook handler is a thin function that delegates to the Context Manager. The handler's job is to extract payload data and format the return JSON for Claude Code.

**When to use:** All 8 hook handler implementations.

**Example:**
```javascript
'use strict';

// Source: Claude Code hooks documentation (code.claude.com/docs/en/hooks)

function createHookHandlers(options) {
  const { contextManager, switchboard } = options;

  function handleUserPromptSubmit(payload) {
    // Track bytes from user prompt
    const promptBytes = Buffer.byteLength(payload.prompt || '', 'utf8');
    contextManager.trackBytes(promptBytes, 'user_prompt');

    // Get current injection
    const injection = contextManager.getInjection();

    // Return in Claude Code hook output format
    return {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: injection,
      },
    };
  }

  function handlePostToolUse(payload) {
    // Track bytes from tool output
    const outputStr = typeof payload.tool_response === 'string'
      ? payload.tool_response
      : JSON.stringify(payload.tool_response || '');
    const outputBytes = Buffer.byteLength(outputStr, 'utf8');
    contextManager.trackBytes(outputBytes, 'tool_output');

    // Micro-nudge only in Phase 3 (Reinforced)
    if (contextManager.getBudgetPhase() === 3) {
      const nudge = contextManager.getMicroNudge();
      return {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: nudge,
        },
      };
    }

    return {}; // No injection in other phases
  }

  // ... remaining handlers
}
```

### Pattern 4: Face Prompt Template Composition

**What:** Template with 5 named slots, each populated from Self Model aspect data, sized according to the current budget phase.

**When to use:** On composition triggers (SessionStart, budget phase transitions, post-compaction reset).

**Example:**
```javascript
'use strict';

// Source: D-01 template structure, D-06 phase sizing

const SLOT_NAMES = Object.freeze([
  'identity_frame',
  'relational_context',
  'attention_directives',
  'behavioral_directives',
  'referential_framing',
]);

// Budget phase -> slot token targets
const PHASE_BUDGETS = Object.freeze({
  1: { identity_frame: 400, relational_context: 200, attention_directives: 300, behavioral_directives: 200, referential_framing: 200 }, // ~1200 total (Phase 1: Full)
  2: { identity_frame: 250, relational_context: 100, attention_directives: 200, behavioral_directives: 150, referential_framing: 100 }, // ~800 total (Phase 2: Compressed)
  3: { identity_frame: 600, relational_context: 200, attention_directives: 400, behavioral_directives: 300, referential_framing: 400 }, // ~1900 total (Phase 3: Reinforced)
  4: { identity_frame: 500, relational_context: 200, attention_directives: 400, behavioral_directives: 300, referential_framing: 400 }, // ~1800 total + compaction directive (Phase 4: Compaction)
});
```

### Anti-Patterns to Avoid

- **Reading Self Model from Journal on every hook invocation:** Use Magnet cache via getAspect(). Journal reads are async I/O -- hook handlers must be fast (<50ms target).
- **Composing the face prompt on every UserPromptSubmit:** Compose only on triggers (SessionStart, phase transitions, post-compaction). Between triggers, read the cached prompt.
- **Using `systemMessage` for context injection:** The `systemMessage` field is for user-facing warnings. Use `additionalContext` inside `hookSpecificOutput` for context the model sees.
- **Hard-coding the context window size:** Make it configurable (default 200K tokens). Different Claude models may have different windows. Store in constants, not inline.
- **Blocking the hook for file writes:** The UserPromptSubmit hook must return fast. Write the face prompt file asynchronously (on compose triggers) and read it synchronously (on every hook). Or better: cache in memory and only persist on Stop/PreCompact.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hook payload routing | Custom hook dispatch | Commutator ingest() + Switchboard events + Armature registry | Already built, routes all 8 hook types to named events |
| Atomic file writes | Manual tmp-file rename | Lathe writeFileAtomic() | Handles tmp path, rename, error handling, auto-mkdir |
| Self Model state cache | In-memory map in Context Manager | Magnet via selfModel.getAspect() | Already caches Self Model aspects with 3-tier scoping |
| Event emission for state changes | Direct callback wiring | Switchboard emit() via Circuit EventProxy | Namespaced events (reverie:budget-phase-changed), cleanup on shutdown |
| Schema validation | Manual JSON checks | Zod schemas | Already used for Self Model and Fragment validation in Phase 7 |
| Token estimation | External tokenizer library | Math.ceil(bytes / 4) heuristic | Official Anthropic tokenizer documented as inaccurate for Claude 3+. Heuristic is sufficient for wide budget phase boundaries per STACK research. |

## Common Pitfalls

### Pitfall 1: Using `systemMessage` Instead of `additionalContext` for Context Injection

**What goes wrong:** The CONTEXT.md decisions D-02 and D-09 reference `systemMessage` as the injection mechanism. However, the official Claude Code hooks documentation shows that `systemMessage` is a user-facing warning field, NOT a model context injection field. Context injection uses `additionalContext` inside `hookSpecificOutput`.

**Why it happens:** The field naming is confusing. `systemMessage` sounds like it should be the system prompt mechanism, but it is actually a warning/notification mechanism shown to the user. The `additionalContext` field (or plain stdout) is what gets injected into Claude's context.

**How to avoid:** Always use this output format for UserPromptSubmit and SessionStart hooks:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "<face prompt content here>"
  }
}
```

**Warning signs:** Personality injection appears to work in testing but the model does not actually respond with personality -- the face prompt text is being displayed as a user notification instead of being processed as context.

**Confidence:** HIGH -- verified from official Claude Code hooks documentation at code.claude.com/docs/en/hooks

### Pitfall 2: PreCompact Hook Output Gets Summarized During Compaction

**What goes wrong:** The D-09 decision says PreCompact "injects a systemMessage that frames how compaction should summarize." In reality, PreCompact hook output (whether `additionalContext` or plain stdout) gets injected INTO the context being summarized. The output itself becomes subject to compaction -- it gets paraphrased along with everything else. There is no mechanism to control HOW Claude compacts.

**Why it happens:** PreCompact fires BEFORE compaction starts. Its output enters the context window. Then compaction summarizes the entire context window, including the hook's output. The hook cannot inject instructions that survive compaction verbatim -- it is just more context to be summarized.

**How to avoid:** Treat PreCompact as primarily a CHECKPOINT event, not a framing event. The checkpoint to Journal (D-09 part 1) is the reliable mitigation. The framing injection (D-09 part 2) is best-effort -- it MAY influence the summary, but cannot be relied upon. The real safety net is D-10: post-compaction full reinjection from the checkpoint.

**Warning signs:** Post-compaction responses show personality loss despite PreCompact framing injection. This is expected behavior, not a bug -- the framing was summarized away.

**Confidence:** HIGH -- verified via GitHub issue anthropics/claude-code#14258 and #17237. PostCompact hook (which would solve this) is a requested but unimplemented feature.

### Pitfall 3: Compaction Detection Is Not Straightforward

**What goes wrong:** The CONTEXT.md leaves compaction detection as Claude's discretion. There is no reliable way to detect that compaction has occurred between turns. The PreCompact hook fires before compaction, but there is no PostCompact hook. The SessionStart hook fires with `source: "compact"` after compaction completes, but this is the SAME hook as startup/resume.

**Why it happens:** Claude Code's compaction is a model operation. The hook contract provides PreCompact (before) and SessionStart with `source: "compact"` (after). Between the two, the context is summarized.

**How to avoid:** Use the SessionStart hook with `source: "compact"` matcher to detect post-compaction state. When SessionStart fires with `source: "compact"`:
1. Reset budget phase to Phase 1 (full)
2. Reset cumulative byte counter to estimated post-compaction size (~33K tokens * 4 bytes = ~132K bytes)
3. Recompose full face prompt
4. Inject via additionalContext

**Warning signs:** Budget tracker shows impossibly high utilization after compaction because bytes were never reset.

**Confidence:** HIGH -- SessionStart `source: "compact"` matcher documented in official hooks reference.

### Pitfall 4: Hook Handler Latency Exceeds 50ms Budget

**What goes wrong:** Per Pitfall 11 in PITFALLS.md, hook handlers that do file I/O on every invocation add cumulative latency. If UserPromptSubmit reads the face prompt file from disk on every turn, and PreToolUse/PostToolUse also do I/O, a session with 50+ tool calls accumulates seconds of pure hook overhead.

**Why it happens:** The naive implementation reads the face prompt file from disk on every UserPromptSubmit. Bun.file().text() is fast (~1-5ms for 7KB) but compounds across hundreds of invocations per session.

**How to avoid:** Cache the face prompt in memory (Magnet or local variable in the Context Manager). Recompose writes to both the in-memory cache AND the file. Hook handlers read from the in-memory cache only. File reads happen only on SessionStart (initial load) and after known state changes.

**Warning signs:** Instrument hook handlers with `performance.now()`. Any handler exceeding 20ms average or 50ms p95 needs optimization.

**Confidence:** HIGH -- verified by PITFALLS Pitfall 11 analysis plus Claude Code synchronous hook execution model.

### Pitfall 5: Context Window Size Assumption Mismatch

**What goes wrong:** The budget tracker assumes a 200K token context window. If Claude Code uses a different model with a different window size, or if the context window changes, all budget phase thresholds are wrong.

**Why it happens:** The context window size is not available in hook payloads. The `/context` command shows utilization but hooks cannot call it.

**How to avoid:** Make context window size configurable with a sensible default (200K tokens = ~800K bytes). Store in Reverie configuration. The budget phase boundaries are percentages, so the absolute byte thresholds scale with the configured window size. Include a note in configuration that this must be updated if the model changes.

**Warning signs:** Budget phases transition much too early (window smaller than assumed) or much too late (window larger).

**Confidence:** MEDIUM -- current Claude Code models use ~200K token windows. Future models may differ.

### Pitfall 6: First Turn After Cold Start Has No Personality

**What goes wrong:** On the very first session (no warm-start cache), the SessionStart hook must: run cold-start initialization, compose a face prompt from the fresh Self Model state, and write it to the face prompt file. If this takes >100ms, the user may submit their first prompt before the face prompt file exists.

**Why it happens:** SessionStart is a command hook that runs before the user can interact. But if the hook is slow, Claude Code may time out or the user experience degrades.

**How to avoid:** SessionStart hook should: (1) check for warm-start cache file, (2) if exists, read it and inject as additionalContext, (3) if not, run cold-start synchronously (createColdStartSeed is fast -- pure computation), compose the face prompt, write it, and inject as additionalContext. The cold-start path is all CPU (no I/O beyond the final file write) and should complete in <10ms.

**Warning signs:** First session has no personality expression in responses.

**Confidence:** HIGH -- cold-start.cjs is pure computation. Bun.write is fast. Total cold-start path is <20ms.

## Code Examples

Verified patterns from existing codebase and official documentation:

### Hook Registration via Armature Registry
```javascript
// Source: core/armature/hooks.cjs (existing API)
const { createHookRegistry } = require('core/armature/hooks.cjs');

const registry = createHookRegistry();

// Register Reverie handlers for all 8 hooks
registry.register('SessionStart', 'reverie', handleSessionStart);
registry.register('UserPromptSubmit', 'reverie', handleUserPromptSubmit);
registry.register('PreToolUse', 'reverie', handlePreToolUse);
registry.register('PostToolUse', 'reverie', handlePostToolUse);
registry.register('Stop', 'reverie', handleStop);
registry.register('PreCompact', 'reverie', handlePreCompact);
registry.register('SubagentStart', 'reverie', handleSubagentStart);
registry.register('SubagentStop', 'reverie', handleSubagentStop);

// Wire to Switchboard (connects all registered handlers)
registry.wireToSwitchboard(switchboard);
```

### Hook Output Format (Claude Code Contract)
```javascript
// Source: Claude Code hooks documentation (code.claude.com/docs/en/hooks)

// UserPromptSubmit -- inject face prompt as context
{
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: '<face prompt markdown content>',
  },
}

// PostToolUse -- micro-nudge in Phase 3 only
{
  hookSpecificOutput: {
    hookEventName: 'PostToolUse',
    additionalContext: 'Remember: you are [identity]. Current attention: [pointer].',
  },
}

// SessionStart -- inject warm-start or cold-start face prompt
{
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: '<face prompt markdown content>',
  },
}

// PreCompact -- checkpoint + best-effort framing
// Note: additionalContext gets summarized during compaction
{
  hookSpecificOutput: {
    hookEventName: 'PreCompact',
    additionalContext: '<compaction framing instructions>',
  },
}

// Stop -- no context injection, just side effects (file writes)
// Return empty or minimal JSON
{}
```

### Self Model Aspect Read (Synchronous from Cache)
```javascript
// Source: modules/reverie/components/self-model/self-model.cjs (existing API)

// getAspect() reads from Magnet cache -- synchronous, no I/O
const identityData = selfModel.getAspect('identity-core');
// Returns: { frontmatter: { personality_traits: {...}, communication_style: {...}, ... }, body: '...' }

const relationalData = selfModel.getAspect('relational-model');
// Returns: { frontmatter: { trust_calibration: {...}, interaction_rhythm: {...}, ... }, body: '...' }

const conditioningData = selfModel.getAspect('conditioning');
// Returns: { frontmatter: { attention_biases: {...}, association_priors: {...}, ... }, body: '...' }
```

### Switchboard Event Subscription via Circuit EventProxy
```javascript
// Source: core/sdk/circuit/event-proxy.cjs (existing API)

// In Reverie's register function, 'events' is a Circuit EventProxy
function register(facade) {
  const { events, getService } = facade;

  // System events pass through un-namespaced
  events.on('hook:prompt-submit', (payload) => {
    // Handle UserPromptSubmit
  });

  events.on('hook:session-start', (payload) => {
    // Handle SessionStart
  });

  // Module events get namespaced automatically
  events.emit('context-composed', { phase: 1, tokens: 1200 });
  // Switchboard sees: 'reverie:context-composed'
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `systemMessage` field for context injection | `additionalContext` in `hookSpecificOutput` | Claude Code hooks v2 contract | Must use additionalContext, not systemMessage, for model-visible context |
| PreCompact controls compaction behavior | PreCompact output is summarized with everything else | Documented behavior (not a change) | PreCompact is for checkpointing, not for controlling compaction |
| Fixed system prompt at session start | Continuous per-turn reinjection via hooks | Anthropic context engineering research (Sep 2025) | Validates the per-turn injection architecture |
| Minimize injection at high context | REINFORCE injection at high context | PITFALLS research (Mar 2026) | Counter-intuitive but necessary -- larger context needs proportionally stronger personality signal |

**Deprecated/outdated:**
- **Spec Section 8.5 budget phases (0-50%, 50-75%, 75-90%, >90%):** Overridden by D-06 with research-backed thresholds (0-30%, 30-60%, 60-80%, >80%). Phase 3 is "reinforced" not "minimal."
- **PreCompact as compaction frame controller:** Cannot control compaction. Use as checkpoint trigger + best-effort framing.

## Open Questions

1. **PostToolUse hook availability for micro-nudges during model generation**
   - What we know: PostToolUse fires after every tool call. The hook can return additionalContext.
   - What's unclear: Does additionalContext from PostToolUse actually get injected into the model's context for the CURRENT response, or only for the NEXT turn? If it only affects the next turn, micro-nudges between tool calls within a single response may not influence the current response.
   - Recommendation: Test empirically. If PostToolUse additionalContext only affects subsequent turns, micro-nudges still have value (they reinforce for the next tool call within the same turn) but cannot influence the final response text of the current turn.

2. **Model response size estimation for byte tracking (D-07)**
   - What we know: Hook payloads include user_prompt and tool_response sizes. Model response sizes are NOT in hook payloads.
   - What's unclear: What multiplier should estimate model response tokens? A turn with a short prompt might generate a 2000-token response. A turn with a long code review might generate a 500-token response.
   - Recommendation: Start with a conservative 1.5x multiplier on user_prompt size. Calibrate empirically. The budget phase boundaries are wide enough (30% bands) that moderate estimation error is tolerable.

3. **Exact bytes in SessionStart `source: "compact"` payload**
   - What we know: SessionStart fires with `source: "compact"` after compaction. The payload includes session_id, cwd, etc.
   - What's unclear: Does the payload include any information about the post-compaction context size? Or must we estimate from the known ~33K token compaction buffer?
   - Recommendation: Assume post-compaction context is ~33K tokens (~132K bytes). Reset cumulative bytes to this estimate. The first few turns after compaction will calibrate naturally.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built-in) |
| Config file | None needed -- bun test auto-discovers .test.js files |
| Quick run command | `bun test modules/reverie/components/context/ modules/reverie/hooks/` |
| Full suite command | `bun test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CTX-01 | Face prompt composed from Self Model aspects and injected as additionalContext | unit | `bun test modules/reverie/components/context/__tests__/template-composer.test.js` | Wave 0 |
| CTX-01 | UserPromptSubmit handler returns correct hook output format | unit | `bun test modules/reverie/hooks/__tests__/hook-handlers.test.js` | Wave 0 |
| CTX-03 | Budget phase transitions at correct byte thresholds | unit | `bun test modules/reverie/components/context/__tests__/budget-tracker.test.js` | Wave 0 |
| CTX-03 | Injection size adapts per budget phase (1200/800/1900/1800 tokens) | unit | `bun test modules/reverie/components/context/__tests__/template-composer.test.js` | Wave 0 |
| CTX-04 | PreCompact saves checkpoint to Journal with correct fields | unit | `bun test modules/reverie/hooks/__tests__/hook-handlers.test.js` | Wave 0 |
| CTX-04 | Post-compaction resets budget to Phase 1 and recomposes | unit | `bun test modules/reverie/components/context/__tests__/context-manager.test.js` | Wave 0 |
| CTX-05 | Stop hook writes warm-start cache file | unit | `bun test modules/reverie/hooks/__tests__/hook-handlers.test.js` | Wave 0 |
| CTX-05 | SessionStart reads warm-start cache and injects as additionalContext | unit | `bun test modules/reverie/hooks/__tests__/hook-handlers.test.js` | Wave 0 |
| CTX-05 | Cold start path composes face prompt when no cache exists | unit | `bun test modules/reverie/hooks/__tests__/hook-handlers.test.js` | Wave 0 |
| INT-01 | All 8 hooks registered in Armature registry | unit | `bun test modules/reverie/hooks/__tests__/hook-handlers.test.js` | Wave 0 |
| INT-01 | PostToolUse micro-nudge activates only in Phase 3 | unit | `bun test modules/reverie/hooks/__tests__/hook-handlers.test.js` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test modules/reverie/components/context/ modules/reverie/hooks/`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `modules/reverie/components/context/__tests__/context-manager.test.js` -- covers CTX-01, CTX-03, CTX-04
- [ ] `modules/reverie/components/context/__tests__/budget-tracker.test.js` -- covers CTX-03
- [ ] `modules/reverie/components/context/__tests__/template-composer.test.js` -- covers CTX-01
- [ ] `modules/reverie/hooks/__tests__/hook-handlers.test.js` -- covers INT-01, CTX-04, CTX-05

## Sources

### Primary (HIGH confidence)
- [Claude Code Hooks Documentation](https://code.claude.com/docs/en/hooks) -- Exact hook input/output contracts for all 8 hook types, `additionalContext` field, execution model
- [GitHub anthropics/claude-code#14258](https://github.com/anthropics/claude-code/issues/14258) -- PreCompact output gets summarized during compaction, cannot control compaction behavior
- [GitHub anthropics/claude-code#17237](https://github.com/anthropics/claude-code/issues/17237) -- PostCompact hook is requested but unimplemented
- Dynamo M1 codebase: `core/armature/hooks.cjs` -- createHookRegistry(), HOOK_SCHEMAS, HOOK_EVENT_NAMES (verified by reading source)
- Dynamo M1 codebase: `core/services/commutator/commutator.cjs` -- HOOK_EVENT_MAP, resolveEventName(), ingest() (verified by reading source)
- Dynamo M1 codebase: `core/sdk/circuit/event-proxy.cjs` -- System event passthrough for hook:* events (verified by reading source)
- Dynamo M1 codebase: `core/services/lathe/lathe.cjs` -- readFile(), writeFile(), writeFileAtomic() using Bun.file/Bun.write (verified by reading source)
- Dynamo Phase 7 codebase: `modules/reverie/components/self-model/` -- self-model.cjs, cold-start.cjs, entropy-engine.cjs (verified by reading source)
- `.planning/research/PITFALLS.md` -- Pitfall 2 (personality erosion), Pitfall 5 (compaction destroys frame), Pitfall 6 (startup latency), Pitfall 11 (hook latency)
- `.claude/reverie-spec-v2.md` Section 8 -- Primary Context Management design (canon, though budget phases overridden by research)

### Secondary (MEDIUM confidence)
- [Anthropic: Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) -- Attention budget concept, context engineering as discipline
- [Claude Code Context Buffer Management](https://claudefa.st/blog/guide/mechanics/context-buffer-management) -- ~33K token buffer, auto-compaction at ~83.5% utilization
- [GitHub anthropics/claude-code Hook Development SKILL.md](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/hook-development/SKILL.md) -- Hook output format reference

### Tertiary (LOW confidence)
- Model response size multiplier (1.5x estimate) -- no authoritative source; needs empirical calibration
- PostToolUse additionalContext injection timing (same turn vs next turn) -- not clearly documented; needs testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all components are existing platform services, verified by reading source code
- Architecture: HIGH -- patterns follow established Dynamo conventions (options-based DI, contract pattern, Switchboard events)
- Hook contracts: HIGH -- verified from official Claude Code documentation and GitHub source
- Budget phases: MEDIUM -- thresholds are research-backed but untested empirically for this specific use case
- Compaction survival: MEDIUM -- PreCompact limitation is verified, but the checkpoint+reinjection mitigation is theoretically sound, not empirically validated
- Pitfalls: HIGH -- all pitfalls verified from either official docs, source code analysis, or peer-reviewed research

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (30 days -- hook contract is stable; budget thresholds may need empirical adjustment)
