# Phase 15: User Journey Gap Closure - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Walk every user-facing surface (skills, CLI, agents) as a first-time user and close gaps where promised actions fail or don't exist. Implement missing CLI commands (`reverie start`, `reverie stop`), add first-run welcome experience, rewrite all skill `.md` files against actual CLI surface, audit formation agent definition, rewrite README for first-time users, audit user-facing error messages with recovery suggestions, and extend validation suite for new commands. All fixes must route through Armature/Circuit/Pulley — no bypassing platform patterns.

</domain>

<decisions>
## Implementation Decisions

### Session Start/Stop Commands
- **D-01:** Implement real `dynamo reverie start` and `dynamo reverie stop` CLI commands via Pulley, registered in `register-commands.cjs` alongside existing commands (status, inspect, history, reset, backfill).
- **D-02:** `reverie start` upgrades to Active mode — if already Passive (auto-started by SessionStart hook), start calls Mode Manager's `requestActive()` to spawn Secondary+Tertiary. If already Active, reports current state. If not initialized, starts fresh.
- **D-03:** `reverie stop` always triggers REM consolidation (Tier 3 full) before shutting down sessions. No `--skip-rem` flag. Clean shutdown is the only shutdown. Matches existing Stop hook behavior.

### First-Use Onboarding
- **D-04:** One-time welcome message on first-ever cold start (no Self Model exists yet). Fires once — flag persisted to prevent repeat.
- **D-05:** Welcome delivered via additionalContext injection in UserPromptSubmit hook. Consistent with all other Reverie context injection.
- **D-06:** Minimal content: what Dynamo/Reverie is, /reverie to manage sessions, /dynamo for platform status. Three lines max. Orient without overwhelming.

### Skill Content Accuracy
- **D-07:** Full rewrite of all 3 skill `.md` files (`/dynamo`, `/reverie`, `/dynamo-validate`) generated from the actual CLI command surface as ground truth. Every action a skill suggests must map to a real Pulley command.
- **D-08:** Skills reference CLI commands directly and transparently: `bun bin/dynamo.cjs reverie status`. User can see exactly what happens and replicate outside skills. Per Phase 12.1 D-03 (skills are conversational wrappers over CLI).
- **D-09:** CLI help text (`--help`) audited as part of skill rewrite — verify each referenced command's help output is accurate. Fix help text for any command with wrong descriptions or missing flags.

### Error Path User Experience
- **D-10:** Audit user-facing errors only: CLI output, hook stderr, skill-visible failures. Don't audit internal error handling that never surfaces to the user.
- **D-11:** Every user-visible error includes an actionable recovery suggestion. Format: "X failed because Y — try Z." No cryptic errors without next steps.

### Formation Agent
- **D-12:** Audit `reverie-formation` agent definition (`.claude/agents/reverie-formation.md`) against what `handleSubagentStop` in `hook-handlers.cjs` actually parses. Fix any mismatches in output schema, prompt, or tool permissions in-place.

### README/Install Documentation
- **D-13:** Full README rewrite covering: prerequisites (Bun, Claude Max), install steps, what happens on first run (hooks auto-fire, Reverie initializes in Passive mode), available skills (/dynamo, /reverie, /dynamo-validate), and CLI commands. README IS the onboarding document.

### Validation Suite
- **D-14:** Extend existing validation suite (`modules/reverie/validation/`) with integration tests for start/stop commands and first-run welcome injection. Don't rewrite the whole suite — Phase 13 already did that.

### Claude's Discretion
- Welcome message exact wording and cold-start detection mechanism
- Start command behavior when no session exists at all (full initialization sequence)
- Stop command output format (progress reporting during REM)
- Formation agent prompt adjustments (scope limited to fixing mismatches)
- README structure and section ordering
- Error message exact wording and formatting patterns
- Validation test organization within existing suite

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Spec
- `.claude/new-plan.md` — Architecture plan. Absolute canon. Service domains, IoC patterns, layer hierarchy.
- `.claude/reverie-spec-v2.md` — Reverie module specification. Canon. Sections critical for Phase 15:
  - Section 4.6 (Session Lifecycle) — start/stop semantics, mode transitions
  - Section 7 (Operational Modes) — Active/Passive/REM/Dormant transitions
  - Section 5 (REM Consolidation) — Tier 3 full REM on session end

### Requirements
- `.planning/REQUIREMENTS.md` — All 42 M2 requirements. Phase 15 does not add new requirements — it closes gaps in INT-01, INT-02 user-facing surface.

### Prior Phase Decisions
- `.planning/phases/12.1-platform-launch-readiness/12.1-CONTEXT.md` — Phase 12.1 decisions:
  - D-01: /dynamo is a platform dashboard skill
  - D-02: /reverie is a session management hub
  - D-03: Skills are conversational wrappers over Pulley CLI commands
  - D-05: Skills registered via Exciter registerSkill() writing .md files to .claude/skills/
- `.planning/phases/08-single-session-personality-injection/08-CONTEXT.md` — Phase 8 decisions:
  - D-02: additionalContext delivery mechanism (used for welcome message)
- `.planning/phases/10-three-session-architecture/10-CONTEXT.md` — Phase 10 decisions:
  - D-01: Session spawning via Bun.spawn
  - D-03: Session Manager (WHAT), Conductor (HOW), Wire (communication)

### Existing Code (read before modifying)
- `modules/reverie/components/cli/register-commands.cjs` — Where start/stop commands register
- `modules/reverie/hooks/hook-handlers.cjs` — handleSessionStart (auto-init), handleStop (REM trigger), handleSubagentStop (formation agent output parsing)
- `modules/reverie/components/modes/mode-manager.cjs` — requestActive(), requestPassive(), mode transitions
- `modules/reverie/components/session/session-manager.cjs` — start(), upgrade(), stop(), initShutdown()
- `modules/reverie/components/context/context-manager.cjs` — getInjection() for additionalContext, init() for warm-start
- `.claude/skills/dynamo/SKILL.md` — Current /dynamo skill (rewrite target)
- `.claude/skills/reverie/SKILL.md` — Current /reverie skill (rewrite target, contains broken start/stop refs)
- `.claude/skills/dynamo-validate/SKILL.md` — Current /dynamo-validate skill (rewrite target)
- `.claude/agents/reverie-formation.md` — Formation agent definition (audit target)
- `bin/dynamo.cjs` — CLI entry point
- `core/sdk/pulley/platform-commands.cjs` — Platform CLI commands (reference for help text patterns)
- `README.md` — Current README (rewrite target)
- `modules/reverie/validation/` — Validation suite (extension target)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Mode Manager** (`mode-manager.cjs`): `requestActive()` and `requestPassive()` already implement the mode transition logic that start/stop commands need. Start calls requestActive, stop calls the shutdown sequence.
- **Session Manager** (`session-manager.cjs`): Full state machine with `start()`, `upgrade()`, `degrade()`, `stop()`, `initShutdown()`, `transitionToRem()`, `completeRem()`. Start/stop commands compose these.
- **REM Consolidator** (`rem-consolidator.cjs`): `handleTier3()` implements full REM on session end. Stop command triggers this before shutdown.
- **Context Manager** (`context-manager.cjs`): `getInjection()` returns additionalContext. Welcome message injects here on cold start detection.
- **Cold Start** (`cold-start.cjs`): `createColdStartSeed()` already detects first-ever initialization. Welcome flag can piggyback on this detection.
- **Existing CLI patterns** (`register-commands.cjs`): 15 commands registered with consistent patterns (status, inspect x7, history x3, reset x3, backfill). Start/stop follow same registration pattern.
- **Exciter skill registration** (`exciter.cjs`): `registerSkill()` writes SKILL.md files. Skill rewrites go through this or directly update files.

### Established Patterns
- **Options-based DI**: All CLI handlers take injected dependencies — start/stop handlers get Mode Manager + Session Manager.
- **Pulley command registration**: `registerCommand(name, handler, metadata)` with help text, flags, and description.
- **Fire-and-forget for hooks**: Session Manager start() is non-blocking in SessionStart hook. Start command can be synchronous (waits for mode transition).
- **`--confirm` gate**: Destructive operations require --confirm. Stop should NOT require --confirm (it's graceful with REM, not destructive).
- **Output formatting**: Commands support `--json` and `--raw` flags via Pulley's formatter.

### Integration Points
- **register-commands.cjs**: Add start/stop alongside existing commands. Same factory pattern.
- **hook-handlers.cjs handleUserPromptSubmit**: Add welcome message injection check before face prompt injection.
- **Exciter/SKILL.md files**: Rewrite skill content via Exciter registerSkill() or direct file update.
- **Validation suite**: Add test files in `modules/reverie/validation/` for start/stop and welcome.

</code_context>

<specifics>
## Specific Ideas

### Start Upgrades, Not Initializes
The user chose "upgrade to Active" as start's primary behavior. This means start assumes Reverie is already running in Passive (auto-started by SessionStart hook). Start's job is to bring up the full triplet. If Reverie isn't initialized at all, start should handle that gracefully — but the expected path is Passive -> Active, not cold -> Active.

### Stop = Clean Shutdown, Always
No skip-REM option. The user wants clean shutdown to be the only option. This is philosophically consistent with Reverie's design — memories are precious, REM preserves them. If someone is debugging and wants to skip REM, they can kill the process directly. The CLI command always does the right thing.

### Skills as Ground-Truth Maps
The skill rewrite approach treats the CLI command surface as ground truth and generates skills from it. This means skills can't promise anything the CLI can't deliver. It's an inversion of the current state where skills were written first and CLI lagged behind.

### Welcome as Discovery, Not Tutorial
The first-run welcome is intentionally minimal — three lines max. It tells you Reverie exists and how to interact with it. It does NOT explain what Reverie does in detail, how formation works, or any technical concepts. That's what /reverie is for. The welcome is a signpost, not a textbook.

### Error Messages as User Interfaces
Every error gets a recovery suggestion. This means errors are user interfaces, not debug output. "Ledger not initialized" is useless. "Ledger not initialized — run `bun bin/dynamo.cjs reverie reset all --confirm` to initialize" is actionable. The audit checks every user-visible error path against this standard.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 15-user-journey-gap-closure*
*Context gathered: 2026-03-28*
