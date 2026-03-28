---
status: awaiting_human_verify
trigger: "hook-wire-context-pipeline: hooks not sending Wire messages, potential hook scope conflicts, possibly stubbed context management pipeline"
created: 2026-03-28T12:00:00-06:00
updated: 2026-03-28T12:05:00-06:00
---

## Current Focus

hypothesis: CONFIRMED AND FIXED — Two compounding bugs prevented hook-to-Wire message flow
test: Applied fix, ran full test suite (2416/2417 pass, 1 pre-existing failure)
expecting: Human verification in live Reverie session
next_action: User runs Reverie session and verifies Wire messages flow from hooks to Secondary

## Symptoms

expected: When Claude Code hooks fire (PreToolUse, PostToolUse, UserPromptSubmit, Stop), the hook handler in ephemeral `bun run bin/dynamo.cjs hook <type>` should call wireTopology.send() which POSTs to Wire relay at http://127.0.0.1:9876, delivering messages to registered Secondary/Tertiary sessions.
actual: Infrastructure works — relay runs, sessions register (2/2), manual curl delivers messages. But AUTOMATED path (hook fires -> hook-handlers.cjs -> wireTopology.send() -> relay) silently fails. No messages arrive at relay.
errors: No explicit errors — hook processes complete without crashing, messages just don't arrive. Silent failure.
reproduction: Start Reverie session (relay + Secondary + Tertiary spawned), use Primary Claude normally — hooks should fire and send snapshots to Secondary via Wire. They don't.
started: Never worked end-to-end in automated mode. Manual curl delivery proven working.

## Eliminated

- hypothesis: Hook scope conflict between user-scope and project-scope hooks
  evidence: Both scopes fire independently (Claude Code merges). User-scope hooks are v0 legacy (dynamo-hooks.cjs). Project-scope hooks are v1 (dynamo.cjs hook). They do not conflict — they are separate systems. The project-scope hooks are the ones that need to work for Wire messaging.
  timestamp: 2026-03-28T12:01:00-06:00

- hypothesis: Context management pipeline is stubbed
  evidence: receiveSecondaryUpdate(), setSecondaryActive(), and the Wire subscription for face_prompt directives in reverie.cjs (lines 309-328) are all real implementations, not stubs. The pipeline was wired correctly but never received Wire messages due to the transport bugs.
  timestamp: 2026-03-28T12:02:00-06:00

- hypothesis: Event name mismatch prevents handler invocation
  evidence: Lifecycle hooks (SessionStart, UserPromptSubmit, Stop, PreCompact, SubagentStart, SubagentStop) have matching event names between Commutator HOOK_EVENT_MAP and hook registry HOOK_EVENT_NAMES. PreToolUse/PostToolUse DO mismatch (resolved dynamically to domain:action), but this is secondary — the fix bypasses Switchboard entirely for hook dispatch.
  timestamp: 2026-03-28T12:01:30-06:00

## Evidence

- timestamp: 2026-03-28T12:00:30-06:00
  checked: bin/dynamo.cjs handleHook() function (lines 18-71)
  found: handleHook() calls commutator.ingest() which returns ok(undefined). The response variable gets this Result object, not the hook handler's output. Reverie hook handlers are NEVER directly invoked in this path — only indirectly via Switchboard fire-and-forget emit.
  implication: ROOT CAUSE 1 — handleHook() used Commutator as the dispatch mechanism, but Commutator only emits Switchboard events. It never returns the hook handler's output (additionalContext, etc.).

- timestamp: 2026-03-28T12:00:35-06:00
  checked: Switchboard emit() and hooks.cjs wireToSwitchboard()
  found: Switchboard.emit() calls handler.fn(payload) synchronously without awaiting. Reverie hook handlers are ALL async. Their Promises are discarded. Then process.exit(0) kills any pending operations.
  implication: ROOT CAUSE 2 — Async handlers (including wireTopology.send()) never complete before the ephemeral process exits.

- timestamp: 2026-03-28T12:00:40-06:00
  checked: Commutator resolveEventName() vs HOOK_EVENT_NAMES mapping
  found: Lifecycle hooks match, but PreToolUse/PostToolUse diverge (Commutator emits 'file:pending' but registry listens on 'hook:pre-tool-use'). Confirmed via runtime comparison.
  implication: Secondary issue — tool-specific hooks would not have been dispatched even via Switchboard. Fixed by bypassing Switchboard entirely.

- timestamp: 2026-03-28T12:00:45-06:00
  checked: Dual hook scope — project .claude/settings.json vs user ~/.claude/settings.json
  found: Project scope runs `bun run bin/dynamo.cjs hook <Type>` (v1). User scope runs `node "$HOME/.claude/dynamo/cc/hooks/dynamo-hooks.cjs"` (v0 legacy). Both fire in parallel. Not a conflict — separate systems.
  implication: Not a bug, but a note: the v0 user-scope hooks are a separate system that does not use Wire.

- timestamp: 2026-03-28T12:00:50-06:00
  checked: handleHook() response chain
  found: commutator.ingest() returns { ok: true, value: undefined }. This gets JSON-serialized and written to stdout. Claude Code expects { hookSpecificOutput: { additionalContext: "..." } }. Face prompt injection was also broken.
  implication: Confirms ROOT CAUSE 1 — wrong response sent to Claude Code.

- timestamp: 2026-03-28T12:01:00-06:00
  checked: wireTopology.send() calls in hook-handlers.cjs (handleUserPromptSubmit, handlePreCompact)
  found: Wire sends use `.catch()` but are NOT awaited. Pattern: `wireTopology.send({...}).catch(fn)` — creates a detached promise. Even if the handler was called and awaited, the Wire send itself would not complete before process.exit(0).
  implication: ROOT CAUSE 3 — Wire sends within handlers must be awaited for ephemeral processes.

- timestamp: 2026-03-28T12:03:00-06:00
  checked: Functional test of fix — bootstrap, resolve Exciter, invoke handler directly
  found: UserPromptSubmit handler returns { hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: ... } } correctly when called via getRegisteredHooks().
  implication: Fix confirmed — handlers are accessible via Exciter and return correct response format.

- timestamp: 2026-03-28T12:04:00-06:00
  checked: Full test suite after fix
  found: 2416 pass, 1 fail (pre-existing, unrelated bootstrap-integration.test.js). Verified pre-existing by running same test without changes — same failure.
  implication: Fix introduces zero regressions.

## Resolution

root_cause: Two compounding bugs in the ephemeral hook process dispatch chain. (1) handleHook() in bin/dynamo.cjs used Commutator.ingest() as the dispatch mechanism, which only emits fire-and-forget Switchboard events and returns ok(undefined). The Reverie hook handlers were never directly invoked, their response (hookSpecificOutput with additionalContext) was never captured, and a Result object was written to stdout instead. (2) Wire sends (wireTopology.send()) inside the hook handlers were fire-and-forget (detached promises with .catch()), so even if the handlers ran, the HTTP POST to the relay would not complete before process.exit(0).

fix: Two changes. In bin/dynamo.cjs: replaced the Commutator-only dispatch with direct handler invocation via Exciter.getRegisteredHooks(). handleHook() now resolves the Exciter facade, gets the registered listeners for the hook type, awaits each handler, and captures the last non-empty response for stdout. Commutator.ingest() is still called for observability/Switchboard events. In modules/reverie/hooks/hook-handlers.cjs: changed wireTopology.send() calls in handleUserPromptSubmit and handlePreCompact from fire-and-forget (.catch()) to awaited (await ... with try/catch), ensuring Wire sends complete before the handler returns.

verification: Full test suite passes (2416/2417, 1 pre-existing). Functional test confirms handler invocation via Exciter returns correct hookSpecificOutput format. Awaiting human verification in live Reverie session.

files_changed:
- bin/dynamo.cjs
- modules/reverie/hooks/hook-handlers.cjs
