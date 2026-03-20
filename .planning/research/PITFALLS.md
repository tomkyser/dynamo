# Domain Pitfalls: v1.3-M2 Core Intelligence

**Domain:** Adding cognitive intelligence layer (Inner Voice, dual-path routing, cost monitoring) to existing hook-based memory system
**Researched:** 2026-03-20
**System:** Dynamo -- ~5,335 LOC CJS, 515 tests, zero npm deps, six-subsystem architecture, deployed at ~/.claude/dynamo/
**Overall confidence:** HIGH (based on codebase analysis, existing spec review, platform documentation verification, and M1 pitfalls precedent)

**Key constraint:** The existing system works. Hooks fire, memories persist, sessions are tracked. M2 must enhance without regressing. The `reverie.mode` feature flag must enable instant rollback to classic Haiku curation.

---

## Critical Pitfalls

Mistakes that cause regressions in the working system, cost explosions, or silent quality degradation. These are the ones where the existing system gets WORSE, not just where the new system fails to work.

---

### CP-01: Timing Regression -- New Reverie Handlers Exceed Hook Latency Budget

**What goes wrong:** The current hook handlers (Ledger-owned, ~5 handlers) are fast because they do one thing: search Graphiti, curate with Haiku, emit. The new Reverie handlers add processing steps that individually seem cheap but compound: load inner-voice-state.json (5ms), domain classification (1ms), semantic shift detection (5ms), activation map update (10-50ms), threshold evaluation (1ms), path selection (1ms), format injection (50-200ms), persist state (5ms). The total approaches or exceeds the 500ms hot path budget. Add any network latency variance to the Assay graph query (the 10-50ms step), and the hook regularly times out.

**Why it happens in THIS system:** The current `prompt-augment.cjs` handler (lines 18-53) does exactly three things: search, curate, emit. Its typical latency is dominated by two network calls (Graphiti search + Haiku curation). The Reverie pipeline adds 6 NEW local processing steps around those same two network calls. Each step is cheap in isolation, but the pipeline is sequential -- every step must complete before the next starts. The spec (REVERIE-SPEC.md Section 4.2) budgets 500ms total, but the budget assumes best-case timing for every step simultaneously.

The real danger: the `inner-voice-state.json` file grows over a session. At session start, it might be 2KB. After 50 prompts with an active activation map, it could be 50KB. JSON.parse of 50KB takes measurably longer than 2KB. The "5ms state load" budget was calibrated against the initial file size, not the steady-state size.

**Consequences:** UserPromptSubmit hooks time out. Claude Code kills the hook process (default command hook timeout is 600s, but the UX degrades at anything over 1s). User perceives lag on every prompt submission. Worse: if the hook times out AFTER persisting a partial state update but BEFORE emitting the injection, the state file is corrupted for the next invocation.

**Warning signs:**
- p95 hook latency exceeds 400ms during testing
- State file size exceeds 20KB in extended sessions
- Activation map has more than 100 entities active simultaneously
- Graph queries return slowly (>200ms) due to dense entity relationships

**Prevention:**
1. Instrument the pipeline from day one. Every handler must log per-step timing (not just total time). Use `performance.now()` before and after each step. Write timing data to a lightweight log or to the state file itself.
2. Set a hard 400ms abort threshold in the handler. If cumulative time exceeds 400ms, skip remaining steps and return whatever injection is available (or empty). This preserves the 100ms buffer before Claude Code notices.
3. Cap the activation map size at 50 entities. When a 51st entity would be added, evict the lowest-activation entity. This bounds both JSON size and processing time.
4. Stream-parse the state file if it exceeds 10KB. Or better: split the state into a small "hot" file (self_model, predictions, processing flags -- always loaded, <2KB) and a larger "cold" file (activation_map, injection_history, pending_associations -- loaded only when needed).
5. Make the graph query via Assay asynchronous-with-timeout: if the graph query hasn't returned in 100ms, proceed with cached activation data from the state file. The cache is stale but the hook completes on time.

**Detection:** Add timing assertions to the handler test suite: `assert.ok(elapsed < 400, 'Handler exceeded 400ms budget: ' + elapsed + 'ms')`. Run these tests with realistic state file sizes (20KB, 50KB).

**Phase to address:** First phase of M2 (Reverie handler implementation). The timing harness is prerequisite infrastructure -- build it before writing any handler logic.

---

### CP-02: Quality Regression -- Intelligent Curation Worse Than Simple Haiku

**What goes wrong:** The current Haiku curation pipeline (curation.cjs, 119 LOC) works. It takes raw Graphiti search results, sends them to Haiku with a curation prompt, and gets back a relevance-filtered summary. It's not smart, but it's consistent and users have calibrated their expectations to it. Reverie replaces this with a multi-stage pipeline: domain frame classification, activation-weighted entity selection, threshold-based filtering, cognitive-load-adjusted formatting. The new pipeline is more sophisticated but produces WORSE results because:

1. **Activation map cold start:** New sessions start with an empty activation map. No entities are activated, no thresholds are crossed, nothing sublimates. The first 5-10 prompts of every session get NO injection -- a massive regression from the current system where even the first prompt gets curated search results.

2. **False-negative silence:** The predictive processing model (inject when surprised, not on schedule) means the system stays silent when the conversation proceeds as expected. But "as expected" is calibrated by the self-model, which starts generic. The system is silent when it should be speaking because it hasn't learned when this user needs context.

3. **Over-filtering:** The composite sublimation threshold requires high scores across MULTIPLE dimensions (activation, surprise, relevance, cognitive load). Any one dimension scoring low vetoes the injection. The current system has no such multi-dimensional gate -- if Graphiti returns results and Haiku says they're relevant, they're injected.

**Why it happens in THIS system:** The INNER-VOICE-ABSTRACT.md explicitly warns about this (Section 9.4): "The initial implementation should be a subset that proves the pattern works." But the M2 spec (REVERIE-SPEC.md) defines the full pipeline for UserPromptSubmit with all 11 steps. If implemented as-specified on day one, the system is too sophisticated for its own data quality. Spreading activation needs graph density (>100 entities, >200 relationships per the spec). Predictive processing needs observation history. The sublimation threshold needs calibration data. None of this exists on day one.

**Consequences:** The user's first experience with M2 is WORSE than M1. Memory injections disappear or become sparse. The user explicitly notices ("where did my memory context go?") and loses trust in the system. The `reverie.mode = classic` rollback becomes the permanent setting rather than an emergency fallback.

**Warning signs:**
- Injection frequency drops below 50% compared to classic mode in the same session
- Session start briefings are empty or generic
- The activation map stays sparse (< 5 entities) after 10+ prompts
- Users toggle back to `reverie.mode = classic` and leave it there

**Prevention:**
1. **Graduated rollout, not big-bang replacement.** Phase 1: Reverie runs IN PARALLEL with classic curation but does not replace it. Classic curation still provides the injection. Reverie's output is logged but not shown. This provides comparison data without quality regression.
2. **Phase 2: Reverie augments classic.** Reverie adds additional context when its pipeline produces output, but classic curation is still the baseline. If Reverie has nothing to add, classic output appears unmodified.
3. **Phase 3: Reverie replaces classic.** Only after comparison data shows Reverie matches or exceeds classic quality. The `reverie.mode` flag controls the transition: `classic` -> `hybrid` -> `cortex`.
4. **Seed the activation map from classic curation results.** When classic mode returns curated results, extract entities and feed them into Reverie's activation map. This gives the activation map data to work with even before Reverie controls the pipeline.
5. **Lower the sublimation threshold initially.** Start at 0.3 instead of 0.6. Let the system over-inject rather than under-inject during calibration. Users tolerate noise better than silence -- they can ignore irrelevant context, but they can't conjure missing context.

**Detection:** A/B comparison test: run both classic and Reverie pipelines on the same prompt corpus, measure injection frequency and content overlap. If Reverie produces <70% of classic's injection frequency, the threshold is too aggressive.

**Phase to address:** This shapes the entire M2 phase structure. The graduated rollout (parallel -> augment -> replace) should be the organizing principle of M2's phases, not the individual Reverie modules.

---

### CP-03: Cost Monitoring Tracks the Wrong Thing on Max Subscription

**What goes wrong:** CORTEX-03 specifies per-operation/per-day/per-month budget tracking with hard enforcement. The spec estimates subscription users at ~$0.37/day and API users at ~$1.98/day. But Max subscription users pay a flat monthly fee ($100 or $200). The "cost" they care about is not dollars -- it's rate limit consumption. Tracking dollar costs for subscription users is meaningless. The real constraint is the weekly usage cap that Anthropic introduced in August 2025, which affects fewer than 5% of subscribers but can halt Claude Code entirely when hit.

**Why it happens in THIS system:** The Dynamo platform decision (PROJECT.md: "Claude Code (Max subscription) as platform") means the primary user is on a Max plan. The cost model in REVERIE-SPEC.md Section 4.5 describes rate limit degradation but frames cost monitoring as budget tracking in dollars. For the actual target user, the useful metrics are:

- **Subagent invocations per session** (each subagent spawn costs against rate limits)
- **Total tokens consumed** (affects weekly usage cap)
- **Deliberation path frequency** (each deliberation = subagent spawn = rate limit pressure)
- **Session length in tokens** (additionalContext injections add to context window, which adds to tokens billed against the cap)

Tracking dollars gives the user a number they cannot act on (they've already paid the subscription). Tracking rate limit proximity gives them actionable information.

**Consequences:** The cost monitoring system is built, tested, and shipped -- but nobody uses it because the numbers don't mean anything to subscription users. The "hard enforcement" (degrade to hot-path-only when budget exhausted) never triggers because the dollar budget is set to $5/day and subscription users spend $0 incremental. Meanwhile, the user hits their weekly rate limit because the deliberation path spawned too many subagents, and the cost monitor didn't warn them because it was tracking the wrong metric.

**Warning signs:**
- Cost dashboard shows $0.00/day for subscription users
- Deliberation path fires on >10% of prompts (should be ~5%)
- User reports "Claude Code rate limited" without cost monitor warning
- Budget enforcement never triggers in testing because no dollars are spent

**Prevention:**
1. **Dual metric tracking:** Track both token consumption (universal) and dollar cost (API users only). The budget enforcement system uses token consumption for subscription users and dollar cost for API users.
2. **Subagent spawn counter with configurable daily maximum.** Default: 20 deliberation subagent spawns per day. When exhausted, degrade to hot-path-only. This directly controls rate limit pressure.
3. **Token injection budget per session.** Track cumulative tokens injected via `additionalContext` across all hooks in a session. Each injection adds to the user's context window, which counts against rate limits. Cap cumulative injection at 10,000 tokens per session (configurable).
4. **Simplify the cost model for v1.3-M2.** Don't build the full per-operation/per-day/per-month budget system in M2. Build: (a) a subagent spawn counter with daily limit, (b) a deliberation frequency tracker, (c) rate limit detection (when a subagent spawn fails with rate limit, set a degradation flag). Save the dollar-denominated budget system for API users in M4.
5. **Expose metrics via `dynamo voice status`.** Show: deliberation count today, subagent spawns remaining, injection tokens this session. Actionable numbers.

**Detection:** Monitor deliberation-to-prompt ratio. If it exceeds 10% over a rolling window of 20 prompts, log a warning. If a subagent spawn returns a rate limit error, immediately set the hot-path-only flag and log the event.

**Phase to address:** CORTEX-03 implementation. Reframe the requirement from "budget tracking" to "rate limit awareness" for subscription users.

---

### CP-04: Feature Flag Complexity Creates Untestable Code Paths

**What goes wrong:** The `reverie.mode` flag has three states: `classic` (old Haiku curation), `cortex` (new Inner Voice), and (from CP-02 prevention) `hybrid` (both running). Each state changes the behavior of 4 hook handlers (SessionStart, UserPromptSubmit, PreCompact, Stop). That's 12 code paths (4 hooks x 3 modes). But the flag also interacts with other configuration: `reverie.enabled` (master switch), `cost.hot_path_only_on_budget_exhaust` (degradation), and rate limit state. The actual combination matrix is:

| Flag | Enabled | Budget OK | Rate Limited | Effective Behavior |
|------|---------|-----------|--------------|-------------------|
| classic | true | - | - | Legacy Haiku curation |
| cortex | true | true | false | Full Reverie pipeline |
| cortex | true | true | true | Hot path only (degraded Reverie) |
| cortex | true | false | - | Hot path only (budget enforced) |
| cortex | false | - | - | No processing |
| hybrid | true | true | false | Classic + Reverie in parallel |
| hybrid | true | true | true | Classic + Reverie hot-path-only |
| ... | ... | ... | ... | 12+ combinations |

Each combination must be tested. Each must degrade gracefully. Each must produce correct output. The test matrix explodes.

**Why it happens in THIS system:** Dynamo already has a toggle gate (`isEnabled()`) and the `DYNAMO_DEV=1` bypass. Adding `reverie.mode` as a second dimension of configuration doubles the state space. Adding budget/rate-limit degradation as a third dimension triples it. The current system has exactly ONE code path per hook (enabled or disabled). M2 proposes 3+ code paths per hook with multiple degradation modes.

**Consequences:** Bugs hide in rarely-exercised code paths. The `hybrid` mode path works in testing but breaks when combined with rate limiting because nobody tested that combination. A user who hits rate limits while in hybrid mode gets double-injected (both classic and degraded Reverie fire but the deduplication logic doesn't handle the degraded case). Or worse: neither fires because both check the rate limit flag and both skip, producing zero injection.

**Warning signs:**
- Test coverage reports show untested branches in handler functions
- Bug reports only occur for specific flag combinations
- "It works for me" (developer) but not in production (different flags)
- Handler functions have deeply nested if/else chains for mode/state combinations

**Prevention:**
1. **Mode determines the handler module, not a branch within one handler.** Don't write `if (mode === 'classic') { ... } else if (mode === 'cortex') { ... }` inside `user-prompt.cjs`. Instead, the dispatcher routes to DIFFERENT handler modules based on mode:
   ```javascript
   const HANDLER_ROUTES = {
     classic: {
       UserPromptSubmit: 'ledger/hooks/prompt-augment',  // existing handler
       SessionStart: 'ledger/hooks/session-start',        // existing handler
     },
     cortex: {
       UserPromptSubmit: 'reverie/handlers/user-prompt',  // new handler
       SessionStart: 'reverie/handlers/session-start',    // new handler
     },
     hybrid: {
       UserPromptSubmit: 'reverie/handlers/user-prompt-hybrid', // runs both
       SessionStart: 'reverie/handlers/session-start-hybrid',
     }
   };
   ```
   This keeps each handler focused on one behavior. The mode decision happens once in the dispatcher, not in every handler.

2. **Degradation is a separate concern from mode.** Rate limit degradation and budget enforcement should be a wrapper/middleware that the dispatcher applies, not logic inside each handler. The wrapper checks budget/rate-limit state and either (a) calls the handler normally, (b) calls the hot-path-only variant, or (c) skips entirely.

3. **Test the matrix explicitly.** Write a test fixture that generates all valid (mode x enabled x budget x rate-limit) combinations and verifies each produces expected behavior. Use parameterized tests (node:test `describe` + loop).

4. **Keep mode transitions atomic.** Changing `reverie.mode` takes effect on the NEXT hook invocation, not mid-session. The state file records which mode was active when state was last written. If mode changes mid-session, the handler detects the mismatch and reinitializes state.

**Detection:** A "mode coverage" test that asserts every valid combination of (mode, enabled, budget, rateLimit) is exercised by at least one test case.

**Phase to address:** Dispatcher modification phase (early M2). The routing-by-mode pattern must be established before any Reverie handlers are written.

---

### CP-05: Subagent State Bridge Pattern Is Fragile and Racy

**What goes wrong:** The deliberation path relies on the "SubagentStop -> state file -> next UserPromptSubmit" bridge pattern (REVERIE-SPEC.md Section 4.3). The inner-voice subagent writes results to `inner-voice-deliberation-result.json`. The next UserPromptSubmit reads and deletes the file. This pattern has multiple race conditions:

1. **Two prompts before the subagent finishes.** User submits prompt A (triggers deliberation). User submits prompt B before the subagent completes. Prompt B's handler checks for the result file, finds nothing (subagent still running), and proceeds. The subagent finishes. User submits prompt C. Prompt C picks up the result -- but the result was generated for prompt A's context, which may be irrelevant to prompt C.

2. **Subagent crashes without writing the result file.** The `processing.deliberation_pending = true` flag is set in state, but the result file never appears. Every subsequent UserPromptSubmit checks for the file, finds nothing, and skips. The pending flag stays set forever, blocking future deliberation requests.

3. **Concurrent subagent invocations.** If two deliberations are queued (e.g., two large semantic shifts in rapid succession), two subagents could write to the same result file. The second write overwrites the first, losing results.

4. **File system race.** UserPromptSubmit reads the result file and then deletes it. If the read-delete is not atomic, another hook invocation could read the same file between read and delete, causing double-injection.

**Why it happens in THIS system:** Claude Code's SubagentStop hook CANNOT inject content into the parent context (GitHub issue #5812, confirmed closed as NOT_PLANNED). The file-based bridge is the only available workaround. But file I/O between independent processes (the subagent process and the main hook process) is inherently racy. The spec acknowledges the one-turn delay but underestimates the race conditions.

**Consequences:** Stale deliberation results injected into wrong context (confusing). Deliberation permanently stuck in pending state (reduced intelligence). Double-injection of the same result (noise). Lost results from crashed subagents (wasted computation).

**Warning signs:**
- `processing.deliberation_pending = true` in state file for more than 30 seconds
- Result file exists but has a timestamp more than 60 seconds old
- Same deliberation content appears in two consecutive injections
- Subagent spawn errors in hook-errors.log without corresponding result files

**Prevention:**
1. **Add a correlation ID and timestamp to the result file.** Each deliberation request gets a UUID. The result file includes the correlation ID and the prompt context hash. UserPromptSubmit checks whether the correlation ID matches the pending request AND whether the prompt context is still relevant (simple string similarity).
2. **Add a TTL to the pending state.** If `deliberation_pending = true` for more than 60 seconds, clear the flag and log a warning. The subagent either crashed or was killed. Do not block future deliberations indefinitely.
3. **Rename-based atomic consumption.** Instead of read-then-delete, use `fs.renameSync()` to atomically move the result file to a `.consumed` path, then read from the consumed path. `rename` is atomic on POSIX filesystems. This prevents double-reads.
4. **One deliberation at a time.** If `deliberation_pending = true` when a new deliberation would be queued, skip the new request. Queue depth of 1. This eliminates concurrent subagent write races.
5. **Log every state bridge transition.** Write to hook-errors.log (or a dedicated deliberation log): "DELIBERATION_QUEUED id=X", "DELIBERATION_COMPLETE id=X", "DELIBERATION_CONSUMED id=X", "DELIBERATION_EXPIRED id=X ttl=60s". This makes debugging the bridge pattern tractable.

**Detection:** A test that simulates the race: queue deliberation, submit 3 prompts before it completes, verify only one prompt consumes the result and it's contextually relevant. A second test: queue deliberation, simulate subagent crash (no result file), verify pending flag is cleared after TTL.

**Phase to address:** Deliberation path implementation phase. The state bridge pattern and its safety mechanisms must be designed and tested before any subagent integration.

---

### CP-06: Shell Shim for Bare `dynamo` Command Breaks Across macOS Environments

**What goes wrong:** M2 targets bare `dynamo` CLI invocation (without `node` prefix or full path). This requires either a shell shim (symlink/script in a PATH directory) or a shell alias. Each approach has environment-specific failure modes on macOS:

1. **Symlink in /usr/local/bin:** Requires `sudo` or admin rights. Conflicts with Homebrew, which owns `/usr/local/`. Apple Silicon Macs use `/opt/homebrew/bin` instead. macOS SIP (System Integrity Protection) may prevent modifications.

2. **PATH modification in ~/.zshrc or ~/.zprofile:** The macOS `path_helper` utility (run from `/etc/zprofile`) reorders PATH on every login shell. Your PATH addition may be moved to the end, behind system directories. Users with custom shell configs, oh-my-zsh, or alternative shells (fish, bash) need different configuration.

3. **Shell alias in ~/.zshrc:** Only works in interactive shells. Does not work in scripts, subprocesses, or when Claude Code runs hooks (hooks run as non-interactive command invocations).

4. **npm global install (`npm link`):** Adds node_modules complexity, violates zero-dep constraint philosophy, requires `package.json` with a `bin` field, and global npm installs can conflict with nvm/fnm version managers.

**Why it happens in THIS system:** The core value is self-management -- "Claude Code must be able to fully manage the tool lifecycle without requiring manual user intervention in config files." A shell shim that requires the user to manually add a PATH entry or run `sudo` violates this core value. But there is no universally reliable way to add a command to PATH on macOS without some form of user action or elevated privilege.

**Consequences:** The `dynamo install` command creates the shim, but it doesn't work for the user because their PATH configuration differs from what was assumed. The user reports "dynamo: command not found." The self-management promise is broken on the very first visible feature of M2. Worse: a poorly implemented shim that modifies `~/.zshrc` can break the user's shell configuration if they have a non-standard setup.

**Warning signs:**
- `which dynamo` returns nothing after install
- Shell profile changes are overridden by oh-my-zsh or path_helper
- Different behavior between terminal.app, iTerm2, VS Code integrated terminal
- Shim works interactively but not when Claude Code invokes `dynamo` as a subprocess

**Prevention:**
1. **Don't modify the user's shell profile.** Instead, create a standalone executable script and tell the user where it is. The install output can SUGGEST a PATH addition but must not make it automatically.
2. **Create the shim at `~/.claude/bin/dynamo`.** This is inside the Dynamo-managed directory tree. The shim is a shell script:
   ```bash
   #!/bin/sh
   exec node ~/.claude/dynamo/dynamo.cjs "$@"
   ```
   Make it executable with `chmod +x`. Claude Code can use `~/.claude/bin/dynamo` directly (it controls its own hook commands).
3. **For hooks and internal use, continue using `node ~/.claude/dynamo/dynamo.cjs`.** The bare `dynamo` command is a convenience for interactive user use, not a system requirement. Hooks, install scripts, and automated processes should use the full `node` path.
4. **Optionally offer PATH integration with explicit user consent.** `dynamo install --add-to-path` appends to `~/.zprofile` (the correct file for macOS login shell PATH). But this is opt-in, documented, and reversible (`dynamo install --remove-from-path`).
5. **Test shim detection in health-check.** Add a diagnostic stage that checks (a) `~/.claude/bin/dynamo` exists and is executable, (b) whether `dynamo` is on PATH (informational, not required).

**Detection:** The health-check stage reports shim status. `dynamo diagnose` reports whether the bare `dynamo` command is available on PATH. Neither should FAIL if the command isn't on PATH -- this is a convenience feature, not a correctness requirement.

**Phase to address:** Late in M2 (after core intelligence is proven). The shim is a convenience improvement, not a prerequisite for any other M2 feature. Do not block intelligence work on shell configuration.

---

## Moderate Pitfalls

Issues that cause bugs, architectural debt, or degraded quality but don't break the existing system.

---

### MP-01: Memory Backfill From Old Transcripts Poisons the Knowledge Graph

**What goes wrong:** M2 includes "intelligent memory backfill from past chat transcripts." The vision is mining old Claude Code session transcripts for knowledge to populate the graph. The reality is that old transcripts contain:

1. **Stale information.** Decisions that were later reversed. Architecture that was refactored. Bugs that were fixed. Code paths that no longer exist. Backfilling this creates false knowledge that the Inner Voice confidently injects.

2. **Noise.** Debug output, error messages, irrelevant exploration, abandoned approaches. Session transcripts include EVERYTHING Claude said, not just conclusions. The signal-to-noise ratio in raw transcripts is extremely low.

3. **Duplicate information.** The same fact discussed across 10 sessions produces 10 graph entries. Spreading activation treats these as convergent evidence, amplifying a fact's perceived importance based on how many times it was discussed rather than its actual significance.

4. **Contradictions.** Session 5 says "we chose CJS because...". Session 8 says "we chose CJS because..." (different reason). Both are true (multiple reasons), but naively extracting entity relationships creates contradictory edges that confuse downstream queries.

**Why it happens in THIS system:** Dynamo has 22 completed phases of session transcripts. These transcripts are the raw record of decisions, designs, and debugging across v1.0-v1.3. The TEMPTATION is strong: "we have all this history, let's use it." But the knowledge graph (Graphiti) was populated incrementally during those sessions via PostToolUse and Stop hooks. The graph already contains the important knowledge -- extracted in context, with temporal edges. Backfilling from transcripts adds a second, lower-quality copy of knowledge that's already there, plus a lot of noise.

**Consequences:** Graph density increases (good for spreading activation) but graph QUALITY decreases (bad for everything else). Search results include stale/contradicted facts. The Inner Voice injects context about architecture that was refactored 3 phases ago. The user corrects the system, but the stale knowledge persists in the graph and resurfaces later.

**Warning signs:**
- Graph entity count jumps dramatically after backfill (>3x)
- Search results for current topics return information from early project phases
- Contradictory context injected (e.g., "the system uses Python" alongside "the system uses CJS")
- User frequently corrects the Inner Voice after backfill

**Prevention:**
1. **Don't backfill everything.** Backfill only the MOST RECENT milestone (v1.3-M1). Earlier milestones have outdated information. The value of transcript data decays rapidly with age.
2. **Use a two-pass approach.** Pass 1: Extract candidate knowledge items using an LLM (Sonnet via subagent). Pass 2: Deduplicate against the existing graph -- if an entity/fact already exists in the graph (via existing PostToolUse/Stop ingestion), skip the backfill version. Only add genuinely NEW knowledge.
3. **Tag backfilled knowledge with a low confidence score.** Add a `source: "backfill"` and `confidence: 0.5` (vs `confidence: 1.0` for real-time captured knowledge). The Inner Voice can weight backfilled knowledge lower in sublimation scoring.
4. **Provide a `dynamo backfill --dry-run` that shows what WOULD be added** without writing to the graph. Let the user review before committing.
5. **Defer backfill to late M2 or M3.** The Inner Voice should prove its value with real-time captured knowledge first. Backfill is an optimization for graph density, not a prerequisite for intelligence.

**Detection:** Before/after quality comparison: run 10 test prompts against the graph before backfill, record results. Run the same prompts after backfill. If result quality decreases (more irrelevant hits, contradictions), the backfill hurt more than it helped.

**Phase to address:** Last phase of M2, or defer to M3. Backfill should never be on the critical path for M2's intelligence layer.

---

### MP-02: Custom Subagent Reliability -- Malformed Frontmatter Causes Session-Wide Failures

**What goes wrong:** The inner-voice subagent definition (`cc/agents/inner-voice.md`) uses YAML frontmatter to configure model, tools, permissions, and memory scope. Claude Code has a documented bug where malformed agent files cause API 500 errors on ALL subsequent API requests (GitHub issue #22843), not just a parse error on the malformed file. A typo in the frontmatter -- wrong field name, invalid YAML syntax, unsupported value -- can break the entire Claude Code session.

**Why it happens in THIS system:** The subagent definition is deployed by Switchboard's install system (`cc/agents/inner-voice.md` -> `~/.claude/agents/inner-voice.md`). If the install deploys a malformed file, EVERY Claude Code session on the machine breaks until the file is fixed. The user sees "API Error: 500" with no indication that it's caused by an agent file. This is especially dangerous during development, where the agent definition is iterated frequently.

Additionally, subagents are loaded at session start. If the inner-voice agent file is invalid, the user must restart their session after the fix -- there's no hot-reload.

**Consequences:** A single bad deploy of the agent file breaks all Claude Code sessions. The error message ("API Error: 500") gives no indication of the cause. The user may not connect the error to a Dynamo update. Recovery requires manually deleting `~/.claude/agents/inner-voice.md` or fixing the YAML, then restarting Claude Code.

**Warning signs:**
- "API Error: 500" immediately after `dynamo install` or `dynamo update`
- All Claude Code sessions fail simultaneously
- Error persists even after restarting Claude Code (because the file is still there)

**Prevention:**
1. **Validate the agent YAML before deploying.** Add a step to `install.cjs` that parses the YAML frontmatter of every file in `cc/agents/` and verifies it against the known Claude Code schema (name, description, tools, model, permissionMode, memory, maxTurns, etc.). Fail the install step with a clear error if validation fails.
2. **Deploy agent files as the LAST step of install,** after the health check. If the health check fails, agent files are not deployed. This prevents a half-working system from also breaking sessions via bad agent files.
3. **Include a recovery command: `dynamo agents fix`.** This scans `~/.claude/agents/` for Dynamo-managed files (identifiable by a `# managed-by: dynamo` comment), validates each, and removes/replaces invalid ones.
4. **Test the agent definition in CI.** Parse the YAML, verify all required fields, verify tool names match Claude Code's tool registry (Read, Write, Edit, Bash, Glob, Grep, Agent).
5. **Keep the agent definition minimal initially.** The supported frontmatter fields as of March 2026 are: name, description, tools, disallowedTools, model, permissionMode, maxTurns, skills, mcpServers, hooks, memory, background, effort, isolation. Use only the fields you need. Avoid undocumented fields.

**Detection:** The install system's final health check should verify that Claude Code can start a session without errors. If the health check passes, agent files are valid. Add a specific check: attempt to parse every `.md` file in `~/.claude/agents/` as YAML frontmatter.

**Phase to address:** Subagent definition phase. Build the YAML validator before writing the agent content.

---

### MP-03: Handler Migration Creates a Transition Period Where Neither Classic Nor Reverie Owns a Hook

**What goes wrong:** The current handlers live in `subsystems/ledger/hooks/` (5 files). M2 moves 4 of them to `subsystems/reverie/handlers/` (SessionStart, UserPromptSubmit, PreCompact, Stop). During the transition, the dispatcher (`cc/hooks/dynamo-hooks.cjs`) needs to be updated to route to the new locations. If the route update and handler creation don't happen atomically, there's a window where:

1. The dispatcher routes to `reverie/handlers/user-prompt.cjs` but the file doesn't exist yet -> MODULE_NOT_FOUND -> hook fails silently -> no memory injection.
2. The dispatcher still routes to `ledger/hooks/prompt-augment.cjs` but the handler was modified to call Reverie functions that don't exist yet -> TypeError -> hook fails silently.
3. Both old and new handlers exist, and the dispatcher routes to the wrong one based on stale config.

**Why it happens in THIS system:** The dispatcher's routing table is currently hardcoded (dynamo-hooks.cjs lines 131-149). Changing it requires modifying the dispatcher AND creating the new handler files in the same operation. But the `reverie.mode` flag means the dispatcher must route to DIFFERENT handlers based on config. The transition isn't a simple "replace old with new" -- it's "route to old OR new based on runtime state."

**Consequences:** During development: hooks fail silently for every prompt. The developer (Claude Code) loses memory context while building the system that provides memory context. During deploy: if the dispatcher update and handler creation aren't synced, deployed users lose hooks.

**Warning signs:**
- hook-errors.log shows MODULE_NOT_FOUND for `reverie/handlers/*`
- Memory injection stops during M2 development
- `dynamo diagnose` shows hook handlers missing

**Prevention:**
1. **Create Reverie handlers as PASS-THROUGH wrappers first.** Before any intelligence is added, create `reverie/handlers/user-prompt.cjs` that simply calls the existing `ledger/hooks/prompt-augment.cjs`. This proves the routing works before any behavior changes.
2. **Update the dispatcher to use mode-based routing (CP-04 prevention #1) as the FIRST commit of M2.** All three modes (classic, hybrid, cortex) initially route to the existing Ledger handlers. Then, one handler at a time, replace the Reverie route with actual Reverie logic.
3. **Keep the Ledger handlers unchanged.** Do not modify the existing handlers. The classic mode path should always route to the ORIGINAL, unmodified handlers. Reverie handlers are new files that may call Ledger code internally but don't modify it.
4. **Add a handler existence check in the dispatcher.** Before `require(handlerPath)`, check `fs.existsSync(handlerPath)`. If the handler doesn't exist, fall back to the classic handler and log a warning. This prevents MODULE_NOT_FOUND from killing the hook.

**Detection:** A smoke test that verifies every handler path in every mode resolves to an existing, loadable module. Run this test in CI and as a diagnostic stage.

**Phase to address:** First phase of M2 handler work. Establish the routing infrastructure before writing any Reverie logic.

---

### MP-04: Hooks-as-Primary-Behavior (MGMT-05) Reduces CLAUDE.md to an Empty Shell

**What goes wrong:** MGMT-05 specifies that hooks replace static CLAUDE.md as the primary behavior mechanism. The intent is good: dynamic hook-injected context is more relevant than static CLAUDE.md text. But if CLAUDE.md is stripped too aggressively:

1. **Bootstrap failure.** SessionStart hook depends on a running Graphiti stack and working Dynamo. If either is down (Docker not running, health check fails, toggle disabled), the hook returns nothing. CLAUDE.md was the fallback that at least gave Claude Code basic Dynamo awareness. Without it, Claude Code doesn't know Dynamo exists.

2. **New session cold start.** The SessionStart hook takes time to generate a briefing (2-4s for deliberation path). CLAUDE.md loads instantly. If CLAUDE.md has no Dynamo instructions, the first few seconds of every session have zero Dynamo awareness.

3. **Development mode.** When `DYNAMO_DEV=1` or `dynamo toggle off`, hooks don't fire. If CLAUDE.md has been gutted, Claude Code has no knowledge of Dynamo commands, troubleshooting steps, or memory system behavior during development or maintenance.

**Consequences:** Users who install Dynamo but have Docker down (common on laptop restart) get a Claude Code session with zero Dynamo awareness. They can't even run `dynamo start` because CLAUDE.md no longer tells Claude about the `dynamo` CLI.

**Warning signs:**
- Claude Code doesn't know about `dynamo` commands when hooks are disabled
- SessionStart hook failure leaves Claude with no Dynamo context
- Users reporting "Claude doesn't know about Dynamo" after restart

**Prevention:**
1. **CLAUDE.md is the minimum viable awareness layer, not a deprecated artifact.** Keep essential content in CLAUDE.md: the `dynamo` CLI exists, how to start/stop, how to troubleshoot. This is ~50 lines, not the current ~200 lines.
2. **Hooks AUGMENT CLAUDE.md, they don't replace it.** CLAUDE.md provides the floor (always available). Hooks provide the ceiling (dynamic, context-aware). The SessionStart hook can inject richer context that builds on CLAUDE.md's baseline.
3. **Test the "no hooks" scenario.** Disable all hooks (toggle off). Verify that a Claude Code session still has basic Dynamo awareness from CLAUDE.md alone. This is the degraded-but-functional state.

**Detection:** A test that loads the CLAUDE.md template with hooks disabled and verifies it contains: (a) `dynamo` CLI reference, (b) basic troubleshooting, (c) memory system description. Minimum viable awareness checklist.

**Phase to address:** MGMT-05 implementation. Define the CLAUDE.md "floor" content before moving any behavior to hooks.

---

### MP-05: Activation Map Grows Unbounded Across Long Sessions

**What goes wrong:** The activation map tracks entity activation levels. Each prompt adds new entities (from entity extraction) and propagates to neighbors. The decay function reduces activation over time, but decay doesn't REMOVE entries -- it sets them to low values. Over a 100-prompt session, the activation map accumulates hundreds of entities, all with near-zero activation. This has three costs:

1. **State file bloat.** The activation map is serialized in `inner-voice-state.json`. 200 entities at ~100 bytes each = 20KB just for the map. Combined with injection history and pending associations, the state file exceeds the "5ms load" budget.

2. **Processing overhead.** Every prompt iterates the full activation map for decay, threshold checking, and propagation. O(n) where n is total entities ever seen, not active entities.

3. **False convergence.** Many near-zero entities create background noise. Two unrelated topics both briefly mentioned in early conversation have residual activation. Later, if the conversation touches either topic, the other's residual activation creates a false convergence signal.

**Prevention:**
1. **Eviction policy.** Remove entities below a minimum threshold (0.05) from the map entirely. Evict on every persist cycle.
2. **Hard cap.** Maximum 50 active entities. When adding a 51st, evict the lowest.
3. **Separate "hot" and "cold" maps.** Hot map: entities above 0.2, always loaded. Cold map: entities 0.05-0.2, loaded only for propagation queries. Evicted: entities below 0.05.
4. **Measure map size in the timing harness.** Log entity count alongside per-step timing. Correlate map size with processing latency.

**Phase to address:** Activation map implementation (activation.cjs). Build with size management from the start; don't add it later.

---

### MP-06: Replacing Working Haiku Curation Without Benchmarking Creates an Invisible Regression

**What goes wrong:** The current Haiku curation in `curation.cjs` calls OpenRouter with a prompt template. The curation.md template has been refined across 22 phases of actual use. It works because it was tested against real Graphiti output over hundreds of sessions. The new Reverie curation (absorbed into `reverie/curation.cjs`) replaces the template with activation-weighted, frame-classified formatting. The new template is untested against real data.

**Prevention:**
1. **Benchmark before replacing.** Run 50 real prompts through both pipelines. Score outputs for: relevance (does it help?), conciseness (is it short enough?), accuracy (is it correct?).
2. **Keep the existing curation.md template available.** Even in cortex mode, the hot path may use the template for fallback formatting. Don't delete it.
3. **Version the prompt templates.** `curation-v1.md` (current), `curation-v2.md` (Reverie). The mode flag selects which template to use.

**Phase to address:** Curation migration phase. Benchmark BEFORE writing the new template.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode sublimation threshold at 0.6 | Ship faster, tune later | Threshold is wrong for this user's graph density; requires manual recalibration | Acceptable for M2 if calibration mechanism is designed (even if not implemented) |
| Skip embedding-based semantic shift detection, use simple string diff | Avoid embedding API dependency | Semantic shifts detected unreliably; false positives on rephrased prompts | Acceptable for M2 v1; switch to embeddings when local embedding (MENH-08, M4) is available |
| Store activation map in a single JSON file | Simple, no new dependencies | File I/O becomes bottleneck at >50 entities; no concurrent access safety | Acceptable for M2 with 50-entity cap; reevaluate in M4 |
| Implement cost monitoring as token counting only | Simpler than full dollar-based budgeting | Doesn't help API users understand actual spend | Acceptable for M2 subscription users; extend for API in M4 |
| Skip the hybrid mode, go directly classic -> cortex | One less mode to maintain | No comparison data; can't prove Reverie is better | Never acceptable -- hybrid is essential for quality validation |
| Use synchronous file I/O for state persistence | Simpler code, deterministic behavior | Blocks the event loop during write; adds latency | Acceptable -- state files are small (<50KB) and writes are infrequent (once per hook) |

---

## Integration Gotchas

Common mistakes when connecting Reverie to existing Dynamo subsystems.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Reverie -> Assay (graph reads) | Calling Assay functions directly from Reverie handler without timeout | Wrap every Assay call in Promise.race with 100ms timeout; return cached data on timeout |
| Reverie -> Ledger (graph writes) | Writing to graph from the hot path, adding latency | Graph writes happen only in Stop/PreCompact hooks (no latency constraint), never in UserPromptSubmit |
| Reverie -> Terminus (transport) | Importing Terminus MCP client directly into Reverie | Go through Assay/Ledger interfaces; Reverie never imports from Terminus directly (REVERIE-SPEC.md Section 2.3) |
| Switchboard dispatcher -> Reverie handlers | Passing the raw stdin data instead of the enriched context object | Dispatcher must add project, scope, config to context before routing to handler |
| Reverie state files -> Switchboard install/sync | Sync system tries to sync state files between repo and deploy | Add state files (inner-voice-state.json, inner-voice-deliberation-result.json) to sync EXCLUDE list -- they're runtime-generated, not repo-managed |
| Inner-voice subagent -> Dynamo CLI | Subagent tries to run `dynamo` commands but `node` path isn't available | Subagent uses `node ~/.claude/dynamo/dynamo.cjs` explicitly; do not depend on bare `dynamo` command from subagent context |
| Config additions -> existing config.json | New `reverie` section overwrites or conflicts with existing config keys | Config merge during install must be additive (deep merge), not replacement. Test with existing config files from M1 |

---

## Performance Traps

Patterns that work in testing but fail in real usage.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading full state file on every hook | p50 latency creeps up over session length | Split into hot/cold state files (see CP-01) | After ~30 prompts when state exceeds 20KB |
| Graph query for activation propagation on every prompt | Latency spikes on dense graphs | Cache propagation results; only re-query on semantic shift | When graph exceeds 500 entities |
| Subagent spawn for session briefing every SessionStart | 2-4s delay on every session start | Cache recent briefing; only regenerate if last session was >1hr ago | When user opens many short sessions |
| JSON.stringify of full state for atomic write | CPU spike on large state objects | Only write changed sections; use streaming writer | When state exceeds 50KB |
| Exhaustive entity extraction from every prompt | NER processing adds 10-50ms per prompt | Extract from first 500 chars only; skip prompts < 20 chars | When users paste large code blocks as prompts |

---

## Security Mistakes

Domain-specific security issues for a cognitive memory system.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Subagent with `bypassPermissions` | Inner-voice subagent could modify user code or system files | Use `permissionMode: dontAsk` (auto-deny unpermitted operations), never `bypassPermissions` |
| Inner Voice state file contains user secrets | State file at ~/.claude/dynamo/ could be read by other processes | Don't store prompt content in state; store only entity UUIDs, activation scores, and metadata hashes |
| Deliberation result file left on disk after crash | Contains injection text derived from user's knowledge graph | TTL-based cleanup: delete result files older than 5 minutes on every handler invocation |
| Backfill extracts PII from old transcripts | Old transcripts may contain API keys, passwords, personal info typed in prompts | PII scrubbing pass before graph ingestion; regex-based pattern detection for common secret formats |
| Subagent memory at ~/.claude/agent-memory/ accumulates sensitive context | Memory persists across sessions and is readable as plain text | Limit what the subagent writes to memory; instruction in system prompt to avoid storing secrets |

---

## UX Pitfalls

Common user experience mistakes when adding intelligence to a working system.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Inner Voice injects on every prompt during initial enthusiasm | User overwhelmed with context they didn't ask for | Default to conservative injection; increase as calibration data accumulates |
| No visibility into what Reverie is doing | User doesn't know if the system is working or broken | `dynamo voice status` showing: mode, injection count today, deliberation count, last injection preview |
| Mode changes require restart | User can't quickly test classic vs cortex | Mode changes take effect on next hook invocation (no restart needed) |
| Injection format radically different from classic | User's mental model breaks; they expect [RELEVANT MEMORY] format | Keep familiar formatting in Reverie output; add Inner Voice insights as additional context, not replacement format |
| No way to tell the Inner Voice "stop talking about X" | User frustrated by persistent irrelevant injections | `dynamo voice suppress <topic>` adds a negative weight to specific entities in the activation map |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Reverie handlers exist:** Often missing timeout enforcement -- verify every handler has a cumulative timeout check that aborts before 400ms
- [ ] **Feature flag works:** Often missing the mode-change-mid-session case -- verify that changing `reverie.mode` in config.json takes effect on the next hook without restart and without corrupting state
- [ ] **Subagent definition deploys:** Often missing YAML validation -- verify `dynamo install` validates the YAML frontmatter before copying to `~/.claude/agents/`
- [ ] **Cost monitoring tracks tokens:** Often missing the subscription-vs-API distinction -- verify that subscription users see rate limit metrics, not dollar amounts
- [ ] **Activation map updates:** Often missing eviction policy -- verify that the map is bounded at 50 entities and evicts on every persist
- [ ] **State file persists across hooks:** Often missing atomic write -- verify tmp+rename pattern is used, not direct writeFileSync to the target path
- [ ] **Deliberation results consumed:** Often missing TTL cleanup -- verify stale result files (>60s old) are deleted, not consumed
- [ ] **Backfill deduplicates:** Often missing graph comparison -- verify that backfilled knowledge is checked against existing graph entities before insertion
- [ ] **Classic mode still works:** Often missing regression test -- verify that `reverie.mode = classic` produces IDENTICAL output to pre-M2 behavior
- [ ] **Shell shim works:** Often missing non-interactive shell test -- verify the shim works from `node -e "require('child_process').execSync('dynamo version')"`, not just interactive zsh
- [ ] **Update notes workflow works:** Often missing the "first run" case -- verify that the update notes work for users who have never seen M2 (not just upgrades from M1)

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| CP-01: Timing regression | LOW | Set `reverie.mode = classic` via config.json; restart session. Hot fix: increase timeout or reduce pipeline steps. |
| CP-02: Quality regression | LOW | Set `reverie.mode = classic` via config.json. This is the entire purpose of the rollback flag. |
| CP-03: Cost monitoring wrong metric | LOW | The system still functions; cost monitoring is advisory. Update the metric type in config; redeploy. |
| CP-04: Feature flag bug in one mode | MEDIUM | Force mode to a known-working state. Fix the handler for the broken mode. Test all combinations before re-enabling. |
| CP-05: Subagent state bridge race | MEDIUM | Delete `inner-voice-deliberation-result.json` and set `processing.deliberation_pending = false` in state file. Clear the jam manually. |
| CP-06: Shell shim broken | LOW | Use `node ~/.claude/dynamo/dynamo.cjs` directly. The shim is convenience, not required. |
| MP-01: Backfill poisons graph | HIGH | No easy undo for graph writes. Must identify and delete backfilled entities (if tagged with source: backfill). If not tagged, restore from graph backup. |
| MP-02: Malformed agent file | MEDIUM | Delete `~/.claude/agents/inner-voice.md`. Restart Claude Code. Redeploy with `dynamo install` after fixing the file. |
| MP-03: Handler routing broken | LOW | Revert dispatcher to M1 version (all routes point to Ledger handlers). Hooks resume immediately. |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| CP-01: Timing regression | Phase 1 (Reverie infrastructure) | Timing harness running; p95 < 400ms on realistic state sizes |
| CP-02: Quality regression | Phase 1-3 (graduated rollout) | A/B comparison shows Reverie >= classic injection quality |
| CP-03: Cost monitoring wrong metric | CORTEX-03 phase | Subscription users see rate limit metrics; spawn counter enforced |
| CP-04: Feature flag complexity | Phase 1 (dispatcher modification) | Parameterized test covers all (mode x enabled x budget x rateLimit) combinations |
| CP-05: Subagent state bridge race | Deliberation path phase | Race condition tests pass; TTL cleanup verified; correlation IDs match |
| CP-06: Shell shim portability | Late M2 phase | Shim exists at ~/.claude/bin/dynamo; health-check reports shim status |
| MP-01: Backfill quality | Last M2 phase (or defer) | Dry-run shows backfill candidates; dedup against existing graph verified |
| MP-02: Subagent reliability | Subagent definition phase | YAML validator in install; recovery command exists |
| MP-03: Handler migration gap | Phase 1 (dispatcher modification) | Pass-through wrappers work before any Reverie logic |
| MP-04: CLAUDE.md gutted | MGMT-05 phase | "No hooks" scenario test passes; minimum viable awareness verified |
| MP-05: Activation map unbounded | activation.cjs implementation | 50-entity cap; eviction on every persist; map size logged |
| MP-06: Curation regression | Curation migration phase | 50-prompt benchmark shows new >= old quality |

---

## Rollback Strategies Beyond `reverie.mode`

The `reverie.mode = classic` flag is the primary rollback mechanism. But it only covers the curation/injection pipeline. Other M2 features need their own rollback paths.

| Feature | Rollback Mechanism | Rollback Scope |
|---------|-------------------|----------------|
| Inner Voice processing pipeline | `reverie.mode = classic` | Full rollback to Haiku curation |
| Dual-path routing | `reverie.mode = classic` | Falls through to classic (no path selection) |
| Cost monitoring | `reverie.cost.enabled = false` | Disables monitoring; no enforcement |
| Subagent spawning | `reverie.deliberation.enabled = false` | Hot-path-only mode; no subagent spawns |
| Activation map | `reverie.activation.enabled = false` | Skip activation entirely; classic search only |
| Shell shim | Delete `~/.claude/bin/dynamo` | Use `node ~/.claude/dynamo/dynamo.cjs` |
| MGMT-05 hooks-as-primary | Restore CLAUDE.md from template | Full CLAUDE.md content restored |
| Backfill data | `dynamo backfill --undo` (if tagged) | Remove backfill-tagged graph entities |
| Subagent definition | Delete `~/.claude/agents/inner-voice.md` | No subagent; deliberation path disabled |
| State files | Delete `inner-voice-state.json` | Fresh state on next hook invocation; no corruption |

**Principle:** Every new feature should have a config flag that disables it independently. The `reverie` config section should look like:

```javascript
{
  "reverie": {
    "enabled": true,                     // Master switch (existing pattern)
    "mode": "cortex",                    // classic | hybrid | cortex
    "activation": { "enabled": true },   // Can disable spreading activation alone
    "deliberation": { "enabled": true }, // Can disable subagent deliberation alone
    "cost": { "enabled": true },         // Can disable cost monitoring alone
    "backfill": { "enabled": false }     // Opt-in backfill
  }
}
```

Each sub-feature degrades gracefully when disabled: the system falls back to the next simpler behavior, never to no behavior.

---

## Risk Summary

| Risk | Probability | Impact | Priority |
|------|-------------|--------|----------|
| CP-01: Timing regression | HIGH | HIGH | Address first (pipeline timing harness) |
| CP-02: Quality regression | HIGH | HIGH | Address first (graduated rollout strategy) |
| CP-03: Cost monitoring wrong metric | MEDIUM | MEDIUM | Reframe requirement before implementation |
| CP-04: Feature flag complexity | HIGH | MEDIUM | Address first (mode-based routing) |
| CP-05: Subagent state bridge race | MEDIUM | HIGH | Address during deliberation path phase |
| CP-06: Shell shim portability | LOW | LOW | Address last; convenience, not critical |
| MP-01: Backfill quality | MEDIUM | HIGH | Defer or address last with extreme caution |
| MP-02: Subagent reliability | MEDIUM | HIGH | YAML validation before deploy |
| MP-03: Handler migration gap | MEDIUM | MEDIUM | Pass-through wrappers first |
| MP-04: CLAUDE.md gutted | LOW | MEDIUM | Define floor content before moving behavior |
| MP-05: Activation map unbounded | HIGH | MEDIUM | Build with size management from day one |
| MP-06: Curation quality regression | MEDIUM | MEDIUM | Benchmark before replacing |

---

## Recommended Phase Ordering Based on Pitfalls

Based on the dependency chain of pitfalls, M2 should proceed in this order:

1. **Timing harness and dispatcher mode-routing** (Addresses CP-01, CP-04, MP-03)
   - Build per-step timing instrumentation
   - Implement mode-based handler routing in dispatcher
   - Create Reverie handler pass-throughs that delegate to existing Ledger handlers
   - All three modes work identically (all route to classic) -- zero regression risk

2. **Reverie infrastructure modules** (Addresses CP-01, MP-05)
   - `activation.cjs` with 50-entity cap and eviction
   - `dual-path.cjs` with deterministic path selection
   - `inner-voice.cjs` pipeline orchestrator with 400ms abort
   - State file management with hot/cold split
   - All tested independently, not wired into hooks yet

3. **Graduated rollout: hybrid mode** (Addresses CP-02, MP-06)
   - Hybrid handlers that run classic AND Reverie in parallel
   - Classic output goes to stdout (user sees it)
   - Reverie output goes to log (developer compares)
   - A/B quality comparison framework

4. **Deliberation path and subagent** (Addresses CP-05, MP-02)
   - Subagent YAML definition with validation
   - State bridge pattern with correlation IDs and TTL
   - Race condition tests
   - Rate limit detection and hot-path degradation

5. **Cost monitoring** (Addresses CP-03)
   - Token counting and spawn counter
   - Rate limit awareness for subscription users
   - `dynamo voice status` command

6. **Graduated rollout: cortex mode** (Addresses CP-02)
   - Reverie handlers wired to cortex mode routing
   - Only enabled after hybrid mode comparison data confirms quality

7. **Hooks-as-primary-behavior** (Addresses MP-04)
   - Define CLAUDE.md floor content
   - Move dynamic content to hook injection
   - Test degraded scenario (hooks disabled)

8. **Shell shim and convenience features** (Addresses CP-06)
   - Shim at ~/.claude/bin/dynamo
   - Health-check diagnostic for shim
   - Update notes workflow

9. **Memory backfill** (Addresses MP-01) -- defer to M3 if possible
   - Dry-run mode first
   - Dedup against existing graph
   - Tag with source and confidence
   - Before/after quality comparison

---

## Sources

- Codebase analysis: `dynamo-hooks.cjs` (167 LOC, current dispatcher), `prompt-augment.cjs` (84 LOC, current UserPromptSubmit handler), `session-start.cjs` (72 LOC, current SessionStart handler), `curation.cjs` (119 LOC, current Haiku pipeline)
- Architecture specs: `REVERIE-SPEC.md` (Reverie subsystem specification), `SWITCHBOARD-SPEC.md` (dispatcher and handler routing), `INNER-VOICE-ABSTRACT.md` (platform-agnostic cognitive architecture)
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- hook types, timeout defaults (command: 600s, SessionEnd: 1.5s), async behavior, additionalContext injection, exit code semantics, error handling
- [Claude Code Custom Subagents](https://code.claude.com/docs/en/sub-agents) -- YAML frontmatter fields (name, description, tools, disallowedTools, model, permissionMode, maxTurns, skills, mcpServers, hooks, memory, background, effort, isolation), permission modes, persistent memory scopes
- [Malformed agent files cause API 500 errors](https://github.com/anthropics/claude-code/issues/22843) -- confirmed bug: invalid YAML frontmatter breaks all API requests
- [SubagentStop cannot inject parent context](https://github.com/anthropics/claude-code/issues/5812) -- confirmed NOT_PLANNED: additionalParentContext field does not exist
- [Subagent YAML Frontmatter documentation gaps](https://github.com/anthropics/claude-code/issues/8501) -- undocumented fields and syntax
- [Per-subagent effortLevel missing](https://github.com/anthropics/claude-code/issues/31536) -- no per-agent effort control in frontmatter
- [Claude Code Rate Limits 2026](https://maxtechera.dev/en/blog/claude-code-rate-limits-2026) -- Max plan rate limits, weekly caps, usage patterns
- [macOS PATH configuration and path_helper](https://gist.github.com/Linerre/f11ad4a6a934dcf01ee8415c9457e7b2) -- PATH reordering, zprofile vs zshrc, Homebrew conflicts
- [Feature Flag Best Practices](https://octopus.com/devops/feature-flags/feature-flag-best-practices/) -- flag lifecycle, testing matrix, cleanup strategies
- [Hidden AI Cost Explosion](https://www.chronoinnovation.com/resources/hidden-cost-explosion-in-ai) -- LLM cost multipliers, unpredictable token usage, retry overhead
- M1 PITFALLS.md (previous milestone pitfalls document, same repository) -- established pitfall documentation patterns and lessons learned

---
*Pitfalls research for: v1.3-M2 Core Intelligence*
*Researched: 2026-03-20*
*Confidence: HIGH -- based on deep codebase analysis, spec review, platform documentation verification, and established M1 precedent*
