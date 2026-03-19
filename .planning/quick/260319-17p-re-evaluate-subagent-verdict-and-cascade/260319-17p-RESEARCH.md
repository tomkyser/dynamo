# Re-Evaluate Subagent Verdict and Cascade - Research

**Researched:** 2026-03-19
**Domain:** Claude Code hooks, subagents, and context injection mechanisms
**Confidence:** HIGH
**Purpose:** Empirically verify Claude Code hook and subagent capabilities for the Inner Voice architecture. Correct the flawed NO-GO verdict on Concept 7 from INNER-VOICE-SYNTHESIS-RESEARCH.md.

## Summary

The previous steel-man analysis (INNER-VOICE-SYNTHESIS-RESEARCH.md, Concept 7) gave a NO-GO verdict on using Claude Code native subagents for the Inner Voice implementation. That verdict was based on three claims: (1) agent hooks can only return yes/no decisions, (2) `claude -p` has 5-15 second cold start, and (3) the cost model is equivalent. This research re-examines those claims against the actual Claude Code documentation as of March 2026.

**The verdict was partially correct but built on wrong premises.** The actual picture is significantly more nuanced. Hooks CAN inject arbitrary content into Claude's context via `additionalContext` and plain stdout on exit 0. Subagents CAN be custom-defined with model selection (Haiku/Sonnet/Opus), tool restrictions, filesystem access, isolated context windows, persistent memory, and MCP servers. However, the architectural path for the Inner Voice is neither "pure CJS with direct API calls" NOR "native subagent as the Inner Voice" -- it is a hybrid that the previous analysis failed to consider.

**Primary recommendation:** The Inner Voice hot path should remain as CJS command hooks with direct context injection via `additionalContext`. The Inner Voice deliberation and REM consolidation paths should use custom subagents with Haiku/Sonnet model selection, which eliminates the need for direct Anthropic API calls and the ANTHROPIC_API_KEY dependency entirely. This is a materially different architecture than what either the Synthesis v2 or the steel-man analysis proposed.

---

## Q1: Can Hooks Return Arbitrary Processed Content for Injection?

**Answer: YES -- confirmed with HIGH confidence.**

### Mechanism 1: `additionalContext` field (JSON output, exit 0)

Hooks can return a JSON object on stdout with an `additionalContext` field inside `hookSpecificOutput`. This injects content directly into Claude's conversational context.

**Events that support `additionalContext` injection:**
- `UserPromptSubmit` -- content added to Claude's context before processing the prompt
- `SessionStart` -- content added to session context at startup
- `SubagentStart` -- content injected directly into the spawning subagent's context
- `PreToolUse` -- context provided before tool execution
- `PostToolUse` -- inconsistent behavior: works for MCP tools, partially works for built-in tools (GitHub issue #18427 documents this gap)
- `Notification` -- added to conversation

**Format:**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "Arbitrary text content injected into Claude's context"
  }
}
```

**Source:** [Hooks reference - Claude Code Docs](https://code.claude.com/docs/en/hooks), [Agent SDK Hooks - Claude API Docs](https://platform.claude.com/docs/en/agent-sdk/hooks)

### Mechanism 2: Plain text stdout (exit 0)

For `UserPromptSubmit` and `SessionStart` specifically, plain text written to stdout is added as context Claude can see and act on. No JSON formatting required.

```bash
echo "The Inner Voice briefing content goes here"
exit 0
```

**Source:** [Hooks reference](https://code.claude.com/docs/en/hooks) -- "For UserPromptSubmit and SessionStart: stdout added as context Claude can see."

### Mechanism 3: `systemMessage` field

**CRITICAL DISCREPANCY IN DOCUMENTATION:** The Agent SDK docs state `systemMessage` "injects a message into the conversation visible to the model." The Claude Code CLI hooks reference states it is "shown to the user only." Real-world testing (GitHub issues #15344, #18427) confirms the CLI behavior: `systemMessage` is a user-facing notification, NOT model context. The SDK behavior may differ from CLI behavior.

**Verdict for Inner Voice:** Use `additionalContext` for model-visible injection, NOT `systemMessage`. The `additionalContext` path is reliable and well-documented for `UserPromptSubmit` and `SessionStart`.

### Size Limits

No explicit size limits are documented for hook response content. Practical constraints:
- Command hooks: 600-second default timeout
- Context window capacity is the implicit limit
- For large content: write to files and reference paths instead of embedding in JSON

### Architectural Implication for Inner Voice

**The Inner Voice CAN inject narrative briefings, contextual memories, and sublimation content through hook responses.** The `UserPromptSubmit` hook with `additionalContext` is the primary injection point. The `SessionStart` hook with `additionalContext` handles session-opening briefings. This eliminates the previous analysis's claim that "the agent hook type cannot output injection text."

**Confidence: HIGH** -- verified against official docs and real-world issue reports.

---

## Q2: What Is the Actual Latency of Hook Invocations?

### Command Hooks (CJS processing)

- Default timeout: 600 seconds
- Practical latency: limited by the script's own execution time
- File I/O for state: <5ms
- Direct HTTP API call to Anthropic: 200-1500ms depending on model and token count
- **Total for hot path with Haiku API call:** ~300-500ms (realistic)
- **Total for state-only operations:** <50ms

### Prompt Hooks (single-turn LLM evaluation)

- Default timeout: 30 seconds
- Spawns a single-turn Claude evaluation -- no tools, no multi-turn
- Returns yes/no decision parsed from model response
- **Latency:** Model inference time only, no tool overhead. Estimated 1-5 seconds for a prompt hook with Sonnet, faster with Haiku.
- **Cannot return arbitrary content** -- only yes/no decisions
- **Not suitable for Inner Voice hot path** -- too slow for classification, no content injection

### Agent Hooks (subagent with tools)

- Default timeout: 60 seconds
- Spawns a subagent with tool access (Read, Grep, Glob, Write, Edit, Bash)
- **Latency:** High. Each subagent starts fresh, potentially loads CLAUDE.md, skills, MCP servers. Reports of ~50K tokens for bootstrap before useful work. Estimated 5-30 seconds per agent hook invocation.
- **Returns decisions, not injection content** in the hook output
- **Not suitable for hot path processing**

### Custom Subagents (via Agent tool, not hooks)

- Spawned by the main Claude session using the Agent tool
- Context bootstrapping: 5,000-15,000 tokens overhead
- Model selectable: `haiku` for fast/cheap, `sonnet` for capable, `opus` for complex
- Can run in foreground (blocking) or background (concurrent)
- **Latency depends on task complexity and model choice**
- Haiku subagents with focused prompts: estimated 2-8 seconds for a focused task

### Architectural Implication for Inner Voice

**The hot path MUST remain as a command hook with direct API call.** No other hook type achieves the <500ms target. The deliberation path and REM consolidation can tolerate subagent latency (2-8 seconds for Haiku, longer for Sonnet).

However, there is a critical insight the previous analysis missed: **subagents are not spawned FROM hooks as the processing engine. Subagents are spawned BY the main session via the Agent tool.** The hook's job is to inject the RESULTS of processing into context. The processing itself can happen either:
1. Inside the command hook via direct API call (current plan)
2. In a pre-spawned subagent that processes asynchronously and writes state to disk, with the command hook reading that state

**Confidence: MEDIUM-HIGH** -- timeouts verified from docs, actual latency estimates based on community reports rather than benchmarks.

---

## Q3: Can the Inner Voice Be Structured as a Custom Subagent?

**Answer: YES -- with significant caveats. Verified with HIGH confidence.**

### Custom Subagent Definition Capabilities

Custom subagents are defined as Markdown files with YAML frontmatter in `.claude/agents/` (project) or `~/.claude/agents/` (user-level). Full configuration:

| Field | Capability | Inner Voice Relevance |
|-------|-----------|----------------------|
| `name` | Unique identifier | `inner-voice` |
| `description` | When to delegate | Triggers automatic delegation by main session |
| `model` | `haiku`, `sonnet`, `opus`, `inherit`, or full model ID | **Critical: Haiku for hot path, Sonnet for deliberation** |
| `tools` | Tool allowlist | Read, Grep, Glob, Bash (for state file I/O) |
| `disallowedTools` | Tool denylist | Write, Edit (Inner Voice should not modify user code) |
| `permissionMode` | `default`, `dontAsk`, `bypassPermissions`, etc. | `dontAsk` for autonomous operation |
| `hooks` | Lifecycle hooks scoped to this subagent | PreToolUse validation, Stop hook for cleanup |
| `skills` | Skills injected at startup | Could load Inner Voice processing instructions |
| `memory` | Persistent memory directory (`user`, `project`, `local`) | **Eliminates need for custom state files** |
| `mcpServers` | MCP servers available to this subagent | Could access Graphiti if needed |
| `maxTurns` | Turn limit | Prevent runaway processing |
| `background` | Run in background | **Allows concurrent Inner Voice processing** |
| `isolation` | `worktree` for git isolation | Not needed for Inner Voice |

**Source:** [Create custom subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents)

### Filesystem Access

YES. Subagents can access the filesystem through Read, Write, Edit, Glob, Grep, and Bash tools. A subagent configured with `tools: Read, Bash` can:
- Read `inner-voice-state.json`
- Execute Bash commands for state manipulation
- Read any project files for context

### MCP Server Access

YES. Subagents can have scoped MCP servers:
```yaml
mcpServers:
  - graphiti:
      type: stdio
      command: /path/to/graphiti-mcp
```

This means a subagent could directly query Graphiti without CLI wrapping. However, given Dynamo's toggle architecture, the CLI path (`dynamo search`) may be preferable to maintain blackout compliance.

### Model Selection

YES. The `model` field accepts `haiku`, `sonnet`, `opus`, or full model IDs like `claude-haiku-4-5-20250314`. This enables:
- Hot path processing: `model: haiku` (fast, cheap)
- Deliberation: `model: sonnet` (capable)
- REM consolidation: `model: sonnet` or `model: opus` (deep analysis)

### Isolated Context Window

YES. Each subagent runs in its own context window:
- Receives only its system prompt (from markdown body) plus basic environment details
- Does NOT receive the full Claude Code system prompt
- Does NOT inherit the parent conversation's context
- Skills listed in `skills` field are injected at startup
- Auto-compaction triggers at ~95% capacity

### Persistent Memory

YES. The `memory` field provides a persistent directory:
- `user` scope: `~/.claude/agent-memory/inner-voice/`
- `project` scope: `.claude/agent-memory/inner-voice/`
- Includes `MEMORY.md` file that the subagent curates
- Survives across sessions
- **This could replace or supplement `inner-voice-state.json`**

### Critical Limitation: Subagents Cannot Spawn Other Subagents

From the docs: "Subagents cannot spawn other subagents. If your workflow requires nested delegation, use Skills or chain subagents from the main conversation."

This means the Inner Voice subagent cannot delegate to further specialized subagents. All Inner Voice processing must happen within its single subagent context.

### Architectural Implication for Inner Voice

A custom `inner-voice` subagent definition could provide:
1. **Model selection** without direct API calls (Haiku for hot, Sonnet for deep)
2. **Persistent memory** without custom state file management
3. **Tool access** (Read, Grep, Glob, Bash) for state and graph queries
4. **Isolated context** preventing Inner Voice processing from polluting the main conversation
5. **Background execution** for non-blocking deliberation
6. **MCP server access** for direct Graphiti queries if needed

**But:** The subagent is spawned by the main session using the Agent tool, not by hooks. The hook system's role is to (a) detect when the Inner Voice should be invoked, and (b) inject the Inner Voice's output into context. The subagent provides the PROCESSING ENVIRONMENT, while hooks provide the TRIGGER and INJECTION mechanisms.

**Confidence: HIGH** -- all capabilities verified against official documentation.

---

## Q4: How Does Context Injection Actually Work?

### `additionalContext` Injection Mechanism

For `UserPromptSubmit` hooks, `additionalContext` is injected into the model's context alongside the user's prompt. It appears as supplementary context that the model can see and reason about. It is added "more discretely" than plain stdout (which appears as visible "hook output" in the transcript).

For `SubagentStart` hooks, `additionalContext` is injected directly into the subagent's context window at spawn time. This is described as "the most reliable way to inject context into Sub-Agents" (source: community documentation and GitHub discussions). It fires synchronously at spawn time and injects directly into the subagent.

### Where It Appears

The content is injected as part of the conversation context. Based on the SDK docs, it becomes visible to the model on its next processing turn. It is NOT a system message in the traditional API sense -- it is conversational context.

### Formatting for Narrative Briefings

The `additionalContext` field accepts arbitrary string content. The Inner Voice could format its output as structured narrative briefings:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "[INNER VOICE BRIEFING]\nBased on the user's recent work on authentication patterns and the current shift toward deployment topics, the following context may be relevant:\n\n- JWT implementation decision from 3 days ago suggests...\n- The deployment pipeline work connects to the earlier CI/CD discussion...\n\n[END BRIEFING]"
  }
}
```

### Critical Clarification: `systemMessage` vs `additionalContext`

| Field | Visible to Model? | Visible to User? | Purpose |
|-------|-------------------|-------------------|---------|
| `additionalContext` | YES | Discrete/minimal | Inject model-visible context |
| `systemMessage` | NO (CLI) / YES (SDK) | YES | User-facing notification |
| Plain stdout | YES (UserPromptSubmit, SessionStart only) | YES (in transcript) | Quick context injection |
| `reason` | YES (in decision context) | YES | Explain block/allow decisions |

**For the Inner Voice: Use `additionalContext` exclusively for model-visible injection.**

**Confidence: HIGH** -- verified across official docs and community reports. The PostToolUse gap (issue #18427) does not affect UserPromptSubmit or SessionStart which are the primary Inner Voice injection points.

---

## Q5: SubagentStart / SubagentStop Hook Events

### SubagentStart

**Input data received:**
```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/working/dir",
  "hook_event_name": "SubagentStart",
  "agent_id": "agent-abc123",
  "agent_type": "inner-voice"
}
```

**Can inject context into the subagent:**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "SubagentStart",
    "additionalContext": "Current inner voice state: { ... }"
  }
}
```

This is powerful: when the main session spawns the `inner-voice` subagent, a SubagentStart hook can inject the current inner voice state, recent memory context, and processing instructions directly into the subagent's context at spawn time. No file reading needed by the subagent.

**Matcher:** Matches on agent type name. `"matcher": "inner-voice"` targets only the Inner Voice subagent.

**Hook types supported for SubagentStart:** Command hooks only (not prompt or agent hooks).

### SubagentStop

**Input data received:**
```json
{
  "session_id": "abc123",
  "hook_event_name": "SubagentStop",
  "stop_hook_active": false,
  "agent_id": "def456",
  "agent_type": "inner-voice",
  "agent_transcript_path": "~/.claude/projects/.../subagents/agent-def456.jsonl",
  "last_assistant_message": "Analysis complete. Injection content: ..."
}
```

**Key fields:**
- `agent_transcript_path` -- full transcript of the subagent's work
- `last_assistant_message` -- the subagent's final output (can be parsed for Inner Voice injection content)

**Can block completion (force continuation):**
```json
{
  "decision": "block",
  "reason": "Additional processing needed"
}
```

**Hook types supported:** Command hooks only.

### Architectural Implication

The SubagentStart/SubagentStop lifecycle provides a clean mechanism for:
1. **SubagentStart:** Inject current inner voice state + relevant memory context into the subagent
2. **Processing:** Subagent runs with its own model (Haiku/Sonnet), reads state, queries memory, produces analysis
3. **SubagentStop:** Parse `last_assistant_message` for injection content, write to state file for the next UserPromptSubmit hook to pick up

However, there is a **critical gap** (documented in GitHub issue #5812): SubagentStop cannot directly inject content back into the PARENT agent's context. The `additionalContext` from SubagentStop goes to the parent, but the feature request for `additionalParentContext` was closed as NOT_PLANNED. Workarounds include:
- Writing to a state file during SubagentStop, reading in the next UserPromptSubmit hook
- Using the `decision: "block"` mechanism (hacky but functional)

**Confidence: HIGH** -- verified against docs and community issue reports.

---

## Q6: Cost Model for Subagent Processing

### Subscription Plans (Pro/Max)

- **Claude Pro ($20/month):** Includes Claude Code usage within subscription. Token costs are not billed separately.
- **Claude Max ($100/month, 5x tier):** Higher usage limits, same subscription model.
- **Claude Max ($200/month, 20x tier):** Highest usage limits.

**Subagent processing on subscription plans uses the subscription allowance, NOT separate API billing.** This is a material difference from the direct API call model:

| Approach | Cost Model |
|----------|-----------|
| Direct Anthropic API calls (current plan) | Per-token API pricing: Haiku $1/$5 per M tokens, Sonnet $3/$15, Opus $5/$25 |
| Subagent within Claude Code session | Included in Pro/Max subscription. Subject to rate limits, not per-token billing. |

**The Synthesis v2 document was PARTIALLY CORRECT** that subagents use a different cost model. On subscription plans, subagent processing is covered. On API plans, subagent processing is billed per-token just like everything else.

### API Plan Users

For users on API plans (not Pro/Max subscribers), Claude Code charges by API token consumption:
- Average: ~$100-200/developer per month with Sonnet
- Average: ~$6/developer per day
- Subagent tokens count against the same billing

### Subagent Token Overhead

Community reports indicate:
- Context bootstrapping: 5,000-15,000 tokens per subagent spawn
- With MCP tools: 10,000-20,000 additional tokens for tool definitions
- Inter-agent communication: 1,000-5,000 tokens per event
- A focused Haiku subagent with minimal tools: ~5,000-10,000 token overhead

### Comparison to Direct API Calls

| Metric | Direct API (Haiku hot path) | Subagent (Haiku) |
|--------|---------------------------|------------------|
| Per-call cost (API plan) | ~$0.005-0.02 | ~$0.01-0.05 (higher due to bootstrap) |
| Per-call cost (subscription) | Same per-token rate | Included in subscription |
| Latency | 200-500ms | 2-8 seconds (includes bootstrap) |
| Infrastructure needed | API key, HTTP client, error handling | Markdown file definition only |
| Maintenance | Custom code for each model call | Zero -- Claude Code manages invocation |

### Architectural Implication

**For Pro/Max subscribers, the subagent path is potentially cheaper** because all processing is covered by the subscription. The previous analysis's cost projections ($1.97/day for v1.3) assumed direct API billing. If the user is on a Max plan, the Inner Voice's model calls are included.

**For API plan users, subagent overhead makes the hot path more expensive** due to bootstrap tokens. Direct API calls remain more efficient for the hot path.

**Recommendation:** Design for both. The command hook + `additionalContext` injection pattern works regardless of billing model. For subscription users, the Inner Voice deliberation path can be a subagent. For API users, it falls back to direct API calls.

**Confidence: MEDIUM** -- subscription behavior verified from official docs, per-token overhead estimates from community reports.

---

## Q7: Complete Hook Event Types

### Full Event List (Claude Code CLI)

| Event | Matcher | Input Includes | Can Inject Context? | Can Block? |
|-------|---------|----------------|---------------------|------------|
| `SessionStart` | Source type | `source`, `model` | YES (`additionalContext`, stdout) | NO |
| `UserPromptSubmit` | None | `prompt` | YES (`additionalContext`, stdout) | YES |
| `PreToolUse` | Tool name | `tool_name`, `tool_input` | YES (`additionalContext`) | YES |
| `PermissionRequest` | Tool name | `tool_name`, `permission_suggestions` | Limited | YES |
| `PostToolUse` | Tool name | `tool_name`, `tool_response` | Inconsistent (#18427) | NO |
| `PostToolUseFailure` | Tool name | `tool_name`, `error` | YES (`additionalContext`) | NO |
| `Notification` | Notification type | `message`, `notification_type` | YES (`additionalContext`) | NO |
| `SubagentStart` | Agent type name | `agent_id`, `agent_type` | YES (into subagent) | NO |
| `SubagentStop` | Agent type name | `agent_id`, `agent_type`, `agent_transcript_path`, `last_assistant_message` | Limited (parent gap) | YES |
| `Stop` | None | `stop_hook_active`, `last_assistant_message` | NO (decision only) | YES |
| `StopFailure` | Error type | `error`, `error_details` | NO | NO |
| `PreCompact` | Trigger type | `trigger`, `custom_instructions` | Observability only | NO |
| `PostCompact` | Trigger type | `trigger`, `compact_summary` | Observability only | NO |
| `InstructionsLoaded` | Load reason | `file_path`, `memory_type`, `load_reason` | NO | NO |
| `ConfigChange` | Source type | `source`, `file_path` | NO | NO |
| `WorktreeCreate` | None | `name` | NO | NO |
| `WorktreeRemove` | None | `worktree_path` | NO | NO |
| `TeammateIdle` | None | `teammate_name`, `team_name` | NO | NO |
| `TaskCompleted` | None | `task_id`, `task_description` | NO | NO |
| `Elicitation` | MCP server name | `mcp_server_name`, `message` | NO | NO |
| `ElicitationResult` | MCP server name | Mirrors Elicitation | NO | NO |
| `SessionEnd` | Reason | `reason` | NO | NO |

### Hook Type Support by Event

All events support `command` hooks. `prompt` and `agent` hook types are supported for most events but NOT for `SubagentStart`, `SubagentStop`, and `SessionEnd`.

### Infinite Loop Prevention

The `stop_hook_active` field in Stop and SubagentStop inputs indicates whether a stop hook has already run this turn. Check this to prevent recursive loops:

```bash
STOP_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active')
if [ "$STOP_ACTIVE" = "true" ]; then
  exit 0  # Don't block again
fi
```

The docs explicitly warn: "A UserPromptSubmit hook that spawns subagents can create infinite loops if those subagents trigger the same hook."

**Confidence: HIGH** -- complete event list verified from official documentation.

---

## Corrected Architectural Assessment

### What the Previous Analysis Got Wrong

| Claim in Steel-Man Analysis | Reality | Impact |
|----------------------------|---------|--------|
| "Agent hooks can only return yes/no decisions" | Agent hooks return structured decisions, but ALL hook types can inject `additionalContext` into context | Eliminates the primary objection to hook-based injection |
| "Hooks cannot spawn subagents for processing" | Hooks cannot spawn subagents, but the main session CAN delegate to custom subagents with full tool access and model selection | The invocation path is different than assumed |
| "`claude -p` cold start: 5-15 seconds" | Custom subagents defined in `.claude/agents/` are different from `claude -p` -- they are spawned natively by the Agent tool within the session | Not directly comparable |
| "Cost model does not change" | On Pro/Max subscription plans, subagent processing IS included in the subscription | Materially different for subscription users |
| "The correct pattern is CJS modules making direct HTTP API calls" | This works but requires API key management, custom HTTP client code, and error handling. Subagents eliminate ALL of this. | Significant implementation simplification |

### What the Previous Analysis Got Right

- The hot path (<500ms) cannot be served by subagents due to bootstrap overhead
- The command hook is the correct trigger mechanism for `UserPromptSubmit`
- State persistence via JSON files remains valid
- The dual-path architecture (hot vs deliberation) is sound
- REM consolidation at Stop hook is validated

### Revised Architecture: Hybrid Approach

**Hot Path (UserPromptSubmit, <500ms target):**
1. `UserPromptSubmit` command hook fires
2. CJS code loads state from `inner-voice-state.json` (<5ms)
3. Deterministic processing: entity extraction, activation map update, threshold check (<50ms)
4. If injection needed and hot path selected:
   - Format injection from cached/indexed data (no LLM call)
   - Return via `additionalContext` in hook response
5. If deliberation needed:
   - Write trigger data to `inner-voice-deliberation-queue.json`
   - Return minimal hot-path content via `additionalContext`
   - The main session can optionally spawn the `inner-voice` subagent for deep analysis

**Deliberation Path (when triggered, 2-10 second budget):**
1. Main session recognizes deliberation trigger (from hook's `additionalContext` signal or CLAUDE.md instruction)
2. Spawns the `inner-voice` custom subagent (defined in `~/.claude/agents/inner-voice.md`)
3. SubagentStart hook injects current state + queue data into subagent context
4. Subagent (Sonnet model) performs deep analysis with tool access
5. Subagent writes results to state file and returns summary
6. Next UserPromptSubmit hook reads the results and injects via `additionalContext`

**REM Consolidation (Stop hook, no time constraint):**
1. Stop command hook fires
2. CJS code performs Tier 1 triage (state preservation, <5ms)
3. For full REM: either direct API call to Sonnet OR main session spawns `inner-voice` subagent in background
4. Consolidation results written to state files for next session

**Session Start (SessionStart hook):**
1. SessionStart command hook fires
2. CJS code loads persisted state and generates briefing
3. Returns narrative briefing via `additionalContext`
4. Alternatively: main session spawns `inner-voice` subagent for deep briefing generation

### Custom Subagent Definition

```yaml
---
name: inner-voice
description: Cognitive processing engine for context-aware memory injection.
  Use when deep analysis of user context is needed beyond hot-path processing.
  Produces narrative briefings and contextual insights.
model: sonnet
tools: Read, Grep, Glob, Bash
disallowedTools: Write, Edit, Agent
permissionMode: dontAsk
maxTurns: 10
memory: user
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "~/.claude/dynamo/ledger/hooks/validate-iv-bash.sh"
---

You are the Inner Voice cognitive processing engine for the Dynamo system.

Your role is to analyze the user's conversational context against their knowledge
graph and produce contextually relevant insights for injection into the main session.

[... detailed system prompt with processing instructions ...]
```

### What This Changes in the Roadmap

| Component | Previous Plan | Revised Plan | Impact |
|-----------|--------------|--------------|--------|
| Model invocation | Direct Anthropic API calls via fetch() | Custom subagent for deliberation; direct API or subagent for REM | Eliminates API key dependency for subscription users |
| State management | Custom JSON file I/O | Combination: JSON for hot path + subagent persistent memory for cross-session | Leverages native memory feature |
| Hook integration | Command hooks return injection text | Command hooks for hot path + SubagentStart/Stop lifecycle for deliberation | More sophisticated but native |
| Cost model | ~$1.97/day fixed API cost | Variable: $0 additional on subscription, ~$1.97/day on API plan | Major cost reduction for Pro/Max users |
| Implementation complexity | Custom HTTP client, error handling, retry logic, API key management | Markdown file + CJS command hooks | Significant simplification for deliberation path |

---

## Open Questions

1. **SubagentStop-to-parent context gap:** How reliably can SubagentStop results reach the parent's next turn? The state file workaround (SubagentStop writes, UserPromptSubmit reads) is functional but indirect. Monitor GitHub issues #5812, #4908, #4462 for official parent context injection support.

2. **Subagent bootstrap overhead in practice:** The 5,000-15,000 token estimates are from community reports. Actual overhead for a focused Haiku subagent with minimal tools (Read, Grep, Glob, Bash only) needs empirical measurement.

3. **Background subagent + UserPromptSubmit race condition:** If the Inner Voice subagent runs in background and writes results to disk, the next UserPromptSubmit hook might fire before the subagent completes. The state file needs a "processing" flag to handle this gracefully.

4. **Rate limit interaction:** On subscription plans, the Inner Voice subagent competes for the same rate limits as the main session. Heavy Inner Voice processing could cause rate limit errors for the user's primary work.

5. **Subagent persistent memory format:** The native `memory` feature provides a MEMORY.md file. How does this interact with the `inner-voice-state.json` schema already designed? Could the subagent's native memory replace the custom state management?

---

## Sources

### Primary (HIGH confidence)
- [Hooks reference - Claude Code Docs](https://code.claude.com/docs/en/hooks) -- Complete hook event list, input/output schemas, exit code behavior
- [Create custom subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents) -- Subagent definition, model selection, tool access, persistent memory, MCP servers
- [Agent SDK Hooks - Claude API Docs](https://platform.claude.com/docs/en/agent-sdk/hooks) -- SDK-level hook API including systemMessage behavior
- [Manage costs effectively - Claude Code Docs](https://code.claude.com/docs/en/costs) -- Cost model, subscription vs API billing, subagent token overhead

### Secondary (MEDIUM confidence)
- [Hook-driven dev workflows with Claude Code - Nick Tune](https://nick-tune.me/blog/2026-02-28-hook-driven-dev-workflows-with-claude-code/) -- Real-world SubagentStart hook implementation for injecting instructions
- [Feature Request: Allow Hooks to Bridge Context Between Sub-Agents and Parent Agents - GitHub #5812](https://github.com/anthropics/claude-code/issues/5812) -- Documents the SubagentStop-to-parent context gap and workarounds
- [PostToolUse hooks cannot inject context visible to Claude - GitHub #18427](https://github.com/anthropics/claude-code/issues/18427) -- Documents the PostToolUse additionalContext inconsistency

### Tertiary (LOW confidence)
- [Building a 24/7 Claude Code Wrapper - DEV Community](https://dev.to/jungjaehoon/why-claude-code-subagents-waste-50k-tokens-per-turn-and-how-to-fix-it-41ma) -- Subagent token overhead estimates (single source, community report)
- [The Claude Code Subagent Cost Explosion - AICosts.ai](https://www.aicosts.ai/blog/claude-code-subagent-cost-explosion-887k-tokens-minute-crisis) -- Token cost reports for subagent teams (extreme case, not typical)

## Metadata

**Confidence breakdown:**
- Hook injection mechanisms: HIGH -- verified from official docs, consistent across multiple sources
- Subagent capabilities: HIGH -- verified from official docs with comprehensive feature documentation
- Latency estimates: MEDIUM -- derived from community reports and timeout defaults, not benchmarks
- Cost model: MEDIUM -- subscription behavior confirmed from docs, per-token overhead from community
- Architectural recommendations: MEDIUM-HIGH -- synthesis of verified capabilities, but untested in practice

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (Claude Code hooks API evolving rapidly; re-verify before implementation)
