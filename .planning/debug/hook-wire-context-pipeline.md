---
status: fixing
trigger: "hook-wire-context-pipeline: hooks not sending Wire messages, potential hook scope conflicts, possibly stubbed context management pipeline"
created: 2026-03-28T12:00:00-06:00
updated: 2026-03-28T14:00:00-06:00
---

## Current Focus

hypothesis: CONFIRMED — Hook handlers use in-memory sessionManager/wireTopology/modeManager that are freshly bootstrapped per ephemeral process, so they have no state from the long-lived `reverie start` CLI session.
test: Replace all in-memory session/wire/mode dependencies with Magnet-based state reads and direct HTTP POST to relay
expecting: Hook handlers will read persisted state from Magnet (relay_port, mode, relay_pid), send Wire messages via direct HTTP POST to relay, and skip session spawning entirely
next_action: Implement all 4 fixes in hook-handlers.cjs and start.cjs

## Symptoms

expected: When Claude Code hooks fire (PreToolUse, PostToolUse, UserPromptSubmit, Stop), the hook handler in ephemeral `bun run bin/dynamo.cjs hook <type>` should call wireTopology.send() which POSTs to Wire relay at http://127.0.0.1:9876, delivering messages to registered Secondary/Tertiary sessions.
actual: Infrastructure works — relay runs, sessions register (2/2), manual curl delivers messages. But AUTOMATED path (hook fires -> hook-handlers.cjs -> wireTopology.send() -> relay) silently fails. No messages arrive at relay because: (1) sessionManager.start() in SessionStart re-spawns terminal windows from ephemeral process, (2) wireTopology.send() goes through Wire service which isn't registered with relay in ephemeral process, (3) start.cjs checks in-memory sessionManager.getState() which is always 'uninitialized'.
errors: No explicit errors — hook processes complete without crashing, messages just don't arrive. Silent failure.
reproduction: Start Reverie session (relay + Secondary + Tertiary spawned), use Primary Claude normally — hooks should fire and send snapshots to Secondary via Wire. They don't.
started: Fundamental architecture issue — hooks were built for long-lived process model.

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

- hypothesis: Commutator dispatch returns wrong value / async handlers never awaited
  evidence: PREVIOUSLY CONFIRMED AND FIXED in bin/dynamo.cjs — handleHook() now resolves Exciter, calls handlers directly, and awaits them. This was the first-layer fix. The current issue is the SECOND layer: the handlers themselves use in-memory objects (wireTopology, sessionManager, modeManager) that have no state in ephemeral processes.
  timestamp: 2026-03-28T12:04:00-06:00

## Evidence

- timestamp: 2026-03-28T12:00:30-06:00
  checked: bin/dynamo.cjs handleHook() function (lines 18-71)
  found: handleHook() calls commutator.ingest() which returns ok(undefined). The response variable gets this Result object, not the hook handler's output. Reverie hook handlers are NEVER directly invoked in this path — only indirectly via Switchboard fire-and-forget emit.
  implication: ROOT CAUSE 1 (FIXED) — handleHook() used Commutator as the dispatch mechanism, but Commutator only emits Switchboard events. It never returns the hook handler's output (additionalContext, etc.).

- timestamp: 2026-03-28T12:00:35-06:00
  checked: Switchboard emit() and hooks.cjs wireToSwitchboard()
  found: Switchboard.emit() calls handler.fn(payload) synchronously without awaiting. Reverie hook handlers are ALL async. Their Promises are discarded. Then process.exit(0) kills any pending operations.
  implication: ROOT CAUSE 2 (FIXED) — Async handlers (including wireTopology.send()) never complete before the ephemeral process exits.

- timestamp: 2026-03-28T14:00:00-06:00
  checked: hook-handlers.cjs factory options — sessionManager, wireTopology, modeManager
  found: All three are in-memory objects created fresh by reverie.cjs register() on each bootstrap. In ephemeral hook processes: sessionManager state is always 'uninitialized', wireTopology wraps a Wire service that is not registered with the relay, modeManager mode is always null/dormant.
  implication: ROOT CAUSE 3 — Wire sends go through wireTopology -> wire.send() -> Wire service (not registered with relay in ephemeral process) = messages never reach the relay HTTP server. Must bypass Wire service entirely and POST directly to relay.

- timestamp: 2026-03-28T14:00:05-06:00
  checked: handleSessionStart() lines 145-149 — sessionManager.start() call
  found: sessionManager.start() in the SessionStart hook spawns terminal windows for Secondary/Tertiary. In an ephemeral hook process, this re-spawns everything that `reverie start` CLI already spawned. Session tracking dies with the process.
  implication: ROOT CAUSE 4 — sessionManager.start() belongs exclusively in `reverie start` CLI, not in the SessionStart hook. Hook should only do context initialization.

- timestamp: 2026-03-28T14:00:10-06:00
  checked: start.cjs lines 62-67 — isLiveSession check
  found: start.cjs checks `sessionManager.getState()` and `modeManager.getMode()` for live session detection. Both are in-memory state from fresh bootstrap. sessionManager state is always 'uninitialized', modeManager mode is always dormant/null. This means start.cjs ALWAYS thinks there's no live session, triggering the clean-start path even when Reverie is already running.
  implication: ROOT CAUSE 5 — start.cjs must use Magnet (persisted state) to detect live sessions, not in-memory sessionManager/modeManager.

## Resolution

root_cause: Fundamental architecture violation — hook handlers and CLI commands were built as if they run in a long-lived process, but each `bun bin/dynamo.cjs hook <Type>` invocation is an ephemeral process with fresh in-memory state. Three specific problems: (1) handleSessionStart calls sessionManager.start() which re-spawns sessions, (2) Wire sends go through wireTopology -> Wire service which is not registered with the relay in the ephemeral process, (3) start.cjs checks in-memory state instead of Magnet-persisted state.

fix: Four changes. (1) Remove sessionManager.start() from handleSessionStart — session spawning belongs in `reverie start` CLI only. (2) Replace wireTopology.send() in all hook handlers with direct HTTP POST to relay via fetch(), reading relay_port from Magnet. (3) In start.cjs, replace in-memory sessionManager.getState()/modeManager.getMode() with Magnet reads for live session detection. (4) Remove the requestDormant() hack in start.cjs that was compensating for wrong state source.

verification: [pending]

files_changed:
- modules/reverie/hooks/hook-handlers.cjs
- modules/reverie/components/cli/start.cjs
