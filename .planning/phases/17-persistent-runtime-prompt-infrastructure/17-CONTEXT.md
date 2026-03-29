# Phase 17: Persistent Runtime & Prompt Infrastructure - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning
**Source:** PRD Express Path (.claude/unfuck-the-whole-damn-thing.md)

<domain>
## Phase Boundary

Transform Dynamo from a bootstrap-per-invocation CLI into a persistent daemon runtime. Add Linotype prompt template library to `lib/`. Rewrite `bin/dynamo.cjs` as a thin client router. Extract all Reverie prompt string literals into markdown template files. Deliver the E2E acceptance test that Phase 16 was blocked from reaching.

Two deliverables:
1. **Daemon runtime** — single persistent process, all services initialized once, HTTP server for hooks/CLI/Wire relay, thin client forwarding
2. **Linotype library** — markdown template parser, template engine (variables, conditionals, iteration, includes), composer, validation

**Acceptance test:** User runs `bun bin/dynamo.cjs start` → daemon starts. User runs `/reverie enable` → 3 terminal windows (Face + Secondary + Tertiary). Hooks fire through thin client → daemon → real processing. `bun bin/dynamo.cjs status` shows live state. `bun bin/dynamo.cjs stop` → graceful shutdown with REM.

</domain>

<decisions>
## Implementation Decisions

### D-01: Dynamo Is a Persistent Daemon
Single long-lived process. All services initialized once. CLI commands and hooks are thin clients that talk to the running daemon via HTTP on localhost. The daemon is either running or not — explicit lifecycle, no auto-start.

**Why:** RAM state, DuckDB single-writer, hook service access all require single long-lived process. Bootstrap-per-invocation was root cause of every Phase 16 bug.

### D-02: Explicit Opt-In Enablement
Flow: (1) Claude Code session starts → (2) `/dynamo enable` starts daemon → (3) `/reverie enable` activates module, spawns triad. Not auto-start.

**Why:** User values control and transparency over convenience. Auto-start deferred to future UX improvement.

### D-03: Single Bun.serve for Hooks, CLI, and Wire Relay
One HTTP server, one port, three concerns via URL routing: `/hook/*` for Exciter, `/cli/*` for Pulley, `/wire/*` for Wire relay, `/ws` for WebSocket upgrade.

**Why:** Simplest correct architecture. One port, one server.

### D-04: Hook Off-Ramp — Silence When Intentional, Noise When Broken
7-state decision tree:
- Daemon off → `{}`, exit 0 (silent)
- Daemon crashed (stale PID) → stderr, exit 1 (loud)
- Daemon on, module off → `{}`, exit 0 (silent)
- Daemon on, module on, no triad for session → `{}`, exit 0 (silent)
- Daemon on, module on, active triad → real processing
- Daemon on, module on, handler error → stderr, exit 1 (loud)
- Dev bypass → `{}`, exit 0 (silent)

### D-05: Linotype Lives in lib/ (Library Layer)
Zero service dependencies. Pure capability. Framework (Armature) defines template contracts. SDK (Circuit) exposes API to modules. Exciter receives assembled output.

### D-06: Mustache-Inspired Template Syntax, Custom Implementation
No npm dependency. `{{slot}}` variables, `{{#if}}` conditionals, `{{#each}}` iteration, `{{> partial}}` includes, `{{! comment}}`. ~300 lines CJS.

### D-07: JSON Frontmatter in Templates
Project convention: JSON for structured data, Markdown for narrative. Not YAML. Declares name, version, slots (with required/type/default), token_estimate, includes.

### D-08: All Prompts Extracted to Markdown Files
15+ Reverie prompt string literals → `modules/reverie/prompts/*.md`. Auditability, separation of content from logic, git-tracked, template reuse via includes.

### D-09: Hybrid Pattern for Function-Based Prompts
Templates own structure/content. Code owns context preparation logic. Formation templates with `user()` functions split into: Linotype template (structure) + context preparation code (conditional logic, data transforms). Template readable for audit, code readable for flow.

### D-10: Exciter Gets dispatchHook() Method
New method: `exciter.dispatchHook(type, payload, env)`. Encapsulates hook dispatch (currently inline in bin/dynamo.cjs). Daemon HTTP handler calls this. Exciter owns hook surface.

### D-11: RAM State by Default, Persistence Opt-In
Magnet stores in memory. No persistence provider by default. Modules opt in (Reverie uses Ledger/Journal). Platform state is transient — dies with daemon restart.

### D-12: Module Lifecycle State Machine
States: discovered → enabled → active → disabled. Module persists across triad shutdown. Re-enable without re-load. Enable/disable via POST /module/enable and /module/disable.

### D-13: Wire Relay Merged into Daemon (NOT Relay Service)
Wire relay transport (relay-server.cjs HTTP/WS routes) merges into daemon Bun.serve. The Relay SERVICE (install/update/sync, relay.cjs) is unchanged — different component.

### D-14: Single Triad per Project for v1
Multi-triad architecturally provisioned but not implemented. `.dynamo/active-triad.json` tracks one triad. Future: `.dynamo/triads/` directory.

### D-15: Settings.json Hooks Registered on Daemon Start
Hooks are no-ops when daemon/module off (off-ramp states 1-4). Registering at daemon start avoids settings.json manipulation at module enable time. Sub-ms latency cost acceptable.

### D-16: Daemon Spawn via nohup
`Bun.spawn` doesn't have Node's `detached: true`. Use `nohup bun core/daemon.cjs` for reliable POSIX daemonization. Validate empirically during implementation.

### D-17: Token Estimation via Character Heuristic
`Math.ceil(chars / 4)`. ~75% accurate. Proper tokenizer would require npm dependency. Sufficient for budget checks. Frontmatter `token_estimate` is human-authored static estimate.

### D-18: Crash Recovery — Clean Restart, Not Re-Adoption
Daemon crash → RAM state lost (by design). Orphaned sessions cleaned via `reverie kill`. No attempt to re-adopt. DuckDB WAL recovery automatic on next Ledger open.

### D-19: additionalContext Not systemMessage
Reverie spec v2 says `systemMessage` but implementation uses `additionalContext` per Pitfall 1 research. Implementation is correct. Spec deviation noted.

### D-20: MCP Channel Server (dynamo-wire) Remains Separate
Claude Code loads channel servers as child processes. dynamo-wire provides Wire tools to Claude Code sessions. Connects to daemon's relay routes for transport. Daemon is hub; dynamo-wire is Claude Code adapter.

### Claude's Discretion
- DuckDB table schema design for Magnet opt-in state
- HTTP response format details beyond the specified contract
- Exact daemon log format and rotation implementation
- Internal daemon module for HTTP route registration
- Linotype parser implementation approach (regex vs recursive descent)
- Test structure and organization for new components

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Spec
- `.claude/new-plan.md` — Full architecture plan. Absolute canon. Defines all services, providers, layers.
- `.claude/reverie-spec-v2.md` — Reverie module specification. Self Model, three-session architecture, fragment engine, REM.
- `.claude/unfuck-the-whole-damn-thing.md` — THE PRD for this phase. Daemon design, Linotype design, IPC contract, build order, impact assessment.

### Core (read before modifying)
- `bin/dynamo.cjs` — Current entry point. Full bootstrap per invocation. Becomes thin client.
- `core/core.cjs` — Bootstrap sequence. Service initialization order. Becomes daemon bootstrap.
- `core/services/exciter/exciter.cjs` — Hook registration facade. Gets dispatchHook() method.
- `core/services/exciter/settings-manager.cjs` — Settings.json hook entry generation.
- `core/services/wire/relay-server.cjs` — HTTP+WS relay. Routes merge into daemon server.
- `core/services/conductor/session-spawner.cjs` — Terminal window spawning. Used by daemon for triad.
- `core/services/conductor/conductor.cjs` — Infrastructure service wrapping session spawner.
- `core/services/magnet/magnet.cjs` — State management. RAM default, pluggable providers.

### Module (read before modifying)
- `modules/reverie/reverie.cjs` — Module bootstrap. Lines 162-177: session/mode manager creation.
- `modules/reverie/hooks/hook-handlers.cjs` — All 8 hook handlers. Service dependencies documented.
- `modules/reverie/manifest.cjs` — Module manifest. Gets templates section.
- `modules/reverie/components/formation/prompt-templates.cjs` — Formation/recall/backfill prompts (15+ string literals to extract).
- `modules/reverie/components/context/referential-framing.cjs` — 3 framing mode prompts.
- `modules/reverie/components/context/context-manager.cjs` — Face prompt assembly (uses Linotype post-extraction).
- `modules/reverie/components/rem/quality-evaluator.cjs` — Quality eval prompt.
- `modules/reverie/components/rem/editorial-pass.cjs` — Editorial pass prompt.
- `modules/reverie/components/session/sublimation-loop.cjs` — Tertiary system prompt.

### Skills
- `.claude/skills/dynamo/SKILL.md` — Updated for daemon commands.
- `.claude/skills/reverie/SKILL.md` — Updated for enable/disable flow.

</canonical_refs>

<specifics>
## Specific Ideas

- User explicitly stated: "Dynamo needs to be a single unified process/runtime that is either running or not; persistent."
- User explicitly stated: "The hooks, do not need to be, and should never have been, ephemeral. They are trigger and communication layer integrations."
- User explicitly stated: "all prompt engineering should be well organized and in markdown format saved as markdown files"
- User explicitly stated: "Exciter owns the responsibility of claude code Agents/skills/rules/hooks etc etc but Dynamo provides the SDK the power to construct what is passed to Exciter"
- User explicitly stated: explicit opt-in with commands, not auto-start: `/dynamo enable` then `/reverie enable`
- User explicitly stated: hooks "should not riddle claude code sessions with hook errors" when off, but "should not fail silently when they are supposed to be working"
- Naming: the template library is called **Linotype** (Ottmar Mergenthaler, 1886). Sub-vocabulary: Matrix (parsed template), Slug (resolved template), Forme (composed output), Cast (resolve against context)
- PRD build order: Wave 1 (Linotype + Daemon parallel) → Wave 2 (Thin client + daemon handlers) → Wave 3 (Framework/SDK integration) → Wave 4 (Prompt extraction + skills) → Wave 5 (E2E validation)
- Hook handlers from Phases 8-12 are UNCHANGED — they assumed persistent runtime, daemon provides it

</specifics>

<deferred>
## Deferred Ideas

- Multi-triad coexistence (architecturally provisioned, not implemented)
- bun:sqlite KV provider for Magnet (future concern for long-running state growth)
- Linotype advanced features: filters, token-aware truncation, template inheritance, dynamic partials
- Formation agent definition as Linotype template (YAML frontmatter conflict)
- Auto-start daemon on first SessionStart hook (future UX improvement)
- Daemon health watchdog / auto-restart
- Log rotation beyond 10MB cap

</deferred>

---

*Phase: 17-persistent-runtime-prompt-infrastructure*
*Context gathered: 2026-03-28 via PRD Express Path*
