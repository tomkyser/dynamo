# Hook Gap Analysis

**Research Date:** 2026-03-16
**Requirement:** MEMO-03
**Method:** Define ideal system first, then diff against current hooks (per locked decision)
**Note:** Analysis only — no hook scripts or settings files were modified

---

## Hook Gap Analysis — Ideal vs. Current

### Current System Baseline

Verified by reading actual hook scripts from `~/.claude/graphiti/hooks/` and `~/.claude/settings.json` (hook registrations).

#### Hook 1: SessionStart — `session-start.sh`

**Registered in:** `~/.claude/settings.json` → `hooks.SessionStart` (two matchers: `startup|resume` and `compact`, both calling the same script)

**What it actually does:**
1. Runs `graphiti-helper.py health-check` — fails gracefully if Graphiti is offline
2. Detects project from `cwd` via `graphiti-helper.py detect-project`
3. Searches global scope for "user preferences workflow coding style tools" — injects top 10 results as `## User Preferences`
4. Searches project scope for "architecture decisions conventions patterns requirements" — injects top 15 results as `## Project: {name}`
5. Searches project scope for "session summary accomplished decisions outcome" — injects top 5 results as `## Recent Sessions`

**Output format:** `[GRAPHITI MEMORY CONTEXT]` block injected into session context

**What it does NOT capture:** No data is stored during SessionStart — this hook only injects context. No active task state is retrieved. No "what was I working on last?" signal.

**GSD integration:** A separate SessionStart hook entry (no matcher — runs on all starts) calls `gsd-check-update.js` for GSD update checks. This is independent of Graphiti.

---

#### Hook 2: UserPromptSubmit — `prompt-augment.sh`

**Registered in:** `~/.claude/settings.json` → `hooks.UserPromptSubmit` (empty matcher = fires on all prompts, 15s timeout)

**What it actually does:**
1. Skips prompts shorter than 15 characters (slash commands, single words)
2. Runs health check — fails silently if offline
3. Detects project from `cwd`
4. Searches project scope for the full prompt text (limit 10, with Haiku curation)
5. Falls back to global scope search if project search returns nothing
6. Injects results as `[RELEVANT MEMORY]` block if results are non-empty

**Output format:** `[RELEVANT MEMORY]` block prepended to context before Claude processes the prompt

**What it does NOT capture:** No data is stored — inject only. Does not classify user intent or distinguish task types.

---

#### Hook 3: PostToolUse — `capture-change.sh`

**Registered in:** `~/.claude/settings.json` → `hooks.PostToolUse` (matcher: `Write|Edit|MultiEdit`, 10s timeout)

**What it actually does:**
1. Early exit if tool name is not `Write`, `Edit`, or `MultiEdit`
2. Extracts `file_path` from tool input
3. Runs health check — exits silently if offline
4. Detects project scope
5. Fires-and-forgets: `graphiti-helper.py add-episode --text "File {TOOL_NAME}: {FILE_PATH}" --scope "{SCOPE}"`

**Critical detail:** The episode text is ONLY `"File Write: /path/to/file"` — no file content, no diff, no description of what changed. The capture records that a file was touched, not what was changed.

**What it does NOT capture:**
- File content or semantic diff of the change
- Bash tool output (no PostToolUse entry with `Bash` matcher)
- Read tool usage (no matcher for Read)
- TodoWrite tool usage
- Any tool other than Write/Edit/MultiEdit

**GSD integration:** A second PostToolUse entry (no matcher — fires on all tools) calls `gsd-context-monitor.js`. This is independent of Graphiti.

---

#### Hook 4: PreCompact — `preserve-knowledge.sh`

**Registered in:** `~/.claude/settings.json` → `hooks.PreCompact` (empty matcher, 30s timeout)

**What it actually does:**
1. Runs health check
2. Calls `graphiti-helper.py summarize-session` — uses Haiku to summarize the current session content (reads from stdin, which contains the full context window content being compacted)
3. Stores the summary as `"Pre-compaction knowledge extract: {SUMMARY}"` in project/global scope
4. Re-injects the summary as `[PRESERVED CONTEXT]` so Claude doesn't lose it after compaction

**What it captures:** A Haiku-generated summary of the session so far. Quality depends on what was in the context window at compaction time.

**What it does NOT capture:** Unresolved questions, open issues, explicit "remember this" markers. The summary is holistic, not targeted.

---

#### Hook 5: Stop — `session-summary.sh`

**Registered in:** `~/.claude/settings.json` → `hooks.Stop` (empty matcher, 30s timeout)

**What it actually does:**
1. Guards against infinite loops via `stop_hook_active` check
2. Runs health check
3. Generates a session timestamp: `YYYY-MM-DDThh:mm:ssZ`
4. Calls `graphiti-helper.py summarize-session` — Haiku-generated session summary
5. Stores in TWO scopes (both fire-and-forget):
   - `project:{name}` scope: `"Session summary ({TIMESTAMP}): {SUMMARY}"`
   - `session:{TIMESTAMP}` scope: `"Session summary: {SUMMARY}"`

**Dual-storage rationale:** Project scope enables semantic search across all sessions for a project. Session scope enables exact retrieval if the timestamp is known.

**What it does NOT capture:** Next steps or planned continuation tasks. Session stop may be abrupt (terminal close, crash) — the hook has no guarantee of running to completion.

---

### Ideal Memory Capture System

For each CC lifecycle event, what a perfect memory system would capture:

| Lifecycle Event | Ideal Capture | Priority |
|-----------------|---------------|----------|
| SessionStart | Global prefs, project context, recent sessions, **active task state** (what was in progress at last Stop) | HIGH |
| UserPromptSubmit | Semantic search + **user intent classification** (task type: debugging, planning, coding, etc.) | MEDIUM |
| PostToolUse (Write/Edit/MultiEdit) | File path + **semantic diff summary** (what changed and why) | MEDIUM |
| PostToolUse (Bash) | Command run, exit code, **key output** (errors, test results, discovered paths) | MEDIUM |
| PostToolUse (Read) | Which files were consulted as references (key architectural files, config files) | LOW |
| PostToolUse (TodoWrite) | Task creation/completion events for task state continuity | LOW |
| PreCompact | Session summary + **key decisions made** + **unresolved questions** | HIGH |
| Stop | Complete session summary + **explicit next steps** + outcomes | HIGH |
| Error/Failure (any tool) | Failed command with error context, stored as BugPattern entities | MEDIUM |
| Explicit Memory ("remember this") | User statements reliably captured and stored immediately | HIGH |
| Cross-Scope Promotion | Project preferences promoted to global when project-agnostic | LOW |
| Feedback Loop | Track which memories are retrieved vs. never used (pruning candidates) | LOW |

---

### Gap Analysis: Ideal vs. Current

| # | Gap | Current Behavior | Ideal Behavior | Severity | Impact |
|---|-----|-----------------|----------------|----------|--------|
| 1 | **Bash tool capture** | PostToolUse fires only on `Write\|Edit\|MultiEdit`; Bash tool output is never captured | Commands run, exit codes, key output (errors, test results) stored as episodes | MEDIUM | Lost: debugging context, test run results, build errors, discovered file paths from `find`/`ls` commands |
| 2 | **Semantic diff on file changes** | `capture-change.sh` stores only `"File Write: /path/to/file"` — no content | Semantic summary of what changed and why stored alongside file path | MEDIUM | Lost: understanding of what was built in each session; file paths alone provide no architectural context |
| 3 | **Active task state at SessionStart** | SessionStart injects recent session summaries but no "what was in progress" signal | Last incomplete task or "stopped at" point injected at session start | MEDIUM | Lost: continuity when resuming interrupted work; user must re-orient Claude manually |
| 4 | **Explicit user memory commands** | No systematic hook or prompt for user "remember this" statements | User "remember this" statements trigger `add_memory` reliably without manual tool invocation | MEDIUM | Lost: deliberate user preferences and decisions that don't make it into session summaries |
| 5 | **Error/failure capture** | No hook for tool failures; errors appear only in session summaries if they happen to be included | Failed commands stored as BugPattern entities with error context | MEDIUM | Lost: recurring error patterns; Claude must rediscover same errors across sessions |
| 6 | **Unresolved questions at PreCompact** | `preserve-knowledge.sh` stores a holistic Haiku summary — unresolved questions may not surface | Explicitly capture unresolved questions and open decisions before compaction | LOW | Lost: context about what was uncertain; can lead to duplicate analysis after compaction |
| 7 | **TodoWrite capture** | No PostToolUse hook for `TodoWrite`; task creation/completion not captured | Task lifecycle events stored so session continuity includes pending tasks | LOW | Lost: task state across sessions when relying on Graphiti rather than project TodoWrite persistence |
| 8 | **Cross-scope promotion** | All preferences captured in project or session scope; no mechanism to promote project-agnostic prefs to global | Patterns identified as cross-project promoted to global scope | LOW | Lost: slow global preference accumulation; user preferences that should be global stay project-scoped |
| 9 | **Context quality / feedback loop** | No tracking of which retrieved memories are used vs. ignored | Track memory retrieval frequency to identify stale/irrelevant entries for pruning | LOW | Lost: knowledge graph grows unbounded with no pruning signal; context quality degrades over time |

---

### Feasibility Categorization

#### Closable with Current Hook API (add/modify hook entries in settings.json)

These gaps can be closed by adding new hook registrations or modifying existing ones:

**Gap 1 — Bash tool capture:**
Add a PostToolUse hook with matcher `Bash` to capture commands and their exit codes. The hook receives `tool_input` (the command) and `tool_result` (output + exit code). A new `capture-bash.sh` script could record commands with exit codes ≥ 1 (errors only) to avoid noise.

```json
{
  "matcher": "Bash",
  "hooks": [{
    "type": "command",
    "command": "$HOME/.claude/graphiti/hooks/capture-bash.sh",
    "timeout": 10
  }]
}
```

**Gap 2 — Semantic diff on file changes:**
Modify `capture-change.sh` to pass more context — the tool result (which includes the full file content for Write, or the diff for Edit) is available in `$INPUT`. The existing hook already receives this; it simply discards it. A richer episode text would be: `"File Write: {FILE_PATH} — {BRIEF_DESCRIPTION}"` with a Haiku call to summarize.
*Note: This adds latency to every Write/Edit. The current fire-and-forget with just the path is intentionally lightweight.*

**Gap 3 — Active task state at SessionStart:**
Add a search for "stopped at in progress current task" in project scope during `session-start.sh`. The GSD `STATE.md` file already records `Stopped At` — a hook could read this file and inject it. Alternatively, the session-summary hook could store a more explicit "next session start here" episode.

**Gap 6 — Unresolved questions at PreCompact:**
Modify `preserve-knowledge.sh` to use a more targeted Haiku prompt: "What questions remain unresolved? What decisions were deferred?" — separate from the general summary.

---

#### Closable with Graphiti Changes (modify Python scripts or graphiti-helper.py)

These gaps require changes to the Python layer:

**Gap 4 — Explicit user memory commands:**
The `add_memory` MCP tool is already available and in the permissions allowlist. The gap is that users rely on Claude to proactively call it. A `capture-explicit.sh` hook could intercept specific prompt patterns ("remember this", "note that") at the UserPromptSubmit hook stage. However, this requires pattern matching in the hook — achievable but brittle.
*More robust fix: Add a `remember` command to graphiti-helper.py that Claude can call via Bash when it detects explicit memory intent.*

**Gap 8 — Cross-scope promotion:**
Requires new logic in graphiti-helper.py to identify project-agnostic preferences and promote them to global scope. This is a `promote-to-global` command that doesn't currently exist.

**Gap 9 — Context quality / feedback loop:**
Requires Graphiti API support for tracking retrieval counts per episode or entity. The current Graphiti MCP API has no `mark-retrieved` or `get-retrieval-stats` endpoint. This would require either upstream Graphiti changes or a local counter file.

---

#### Blocked by CC Hook API Limitations

These gaps cannot be closed with the current CC hook API:

**Gap 5 — Error/failure capture:**
The CC hook API fires `PostToolUse` after a tool succeeds. There is no `PostToolError` or `OnToolFailure` hook event. Tool failures (non-zero exit codes from Bash) could be partially captured by a Bash PostToolUse hook that checks the exit code in the tool result, but hooks do not fire if a tool errors before reaching the PostToolUse stage.
*Partial mitigation: A Bash PostToolUse hook checking `exit_code != 0` captures some errors. Full error capture requires a CC hook API feature request.*

**Gap 7 — TodoWrite capture:**
The CC PostToolUse hook fires for file-editing tools by name. `TodoWrite` is not a file-editing tool — it manages Claude's task list in memory, not on disk. Whether PostToolUse fires for `TodoWrite` is not documented in the CC hook specification.
*Action needed: Empirically test by adding `TodoWrite` to the PostToolUse matcher and observing if it fires.*

---

### Recommendations (Prioritized by Severity × Feasibility)

**Tier 1 — Address in v1 (medium severity, closable with hooks):**

1. **Gap 2: Add semantic context to file change capture** — Modify `capture-change.sh` to include the file type and operation description. Even just storing `"File Edit: {FILE_PATH} in project {PROJECT}"` instead of the raw path adds project attribution. Full diff summaries add latency but could be gated on file size.

2. **Gap 1: Add Bash error capture** — Add a PostToolUse hook for `Bash` that stores episodes only when `exit_code != 0`. This captures actual errors without noise from successful commands. Implementation: new `capture-bash-errors.sh` script.

3. **Gap 3: Inject active task state at SessionStart** — Add a search for GSD `STATE.md` `Stopped At` field or a dedicated "current task" episode query to `session-start.sh`. This directly addresses the most common continuity pain point.

**Tier 2 — Address in v1 if capacity allows (low severity, closable):**

4. **Gap 6: Targeted unresolved-questions capture at PreCompact** — Add a second Haiku call in `preserve-knowledge.sh` with a targeted "what is unresolved?" prompt.

5. **Gap 4: Explicit memory command detection** — Add a `remember` helper to `graphiti-helper.py` and document for Claude Code use.

**Tier 3 — Flag for v2 (blocked or low severity):**

6. **Gap 5: Error/failure capture** — File as CC hook API feature request: `PostToolError` event. Partial mitigation via Bash exit-code check.

7. **Gap 7: TodoWrite capture** — Test empirically whether PostToolUse fires for `TodoWrite`. If yes, add a lightweight hook. If no, flag for CC API feature request.

8. **Gap 8: Cross-scope promotion** — Requires new graphiti-helper.py command. Flag for v2.

9. **Gap 9: Context quality feedback loop** — Requires upstream Graphiti API support. Flag for v2 upstream contribution.

---

*Requirement: MEMO-03*
*Feeds into: Phase 3 ranked report — memory system section and GSD self-management section*
*v1 priorities: Gaps 1, 2, 3 (Bash errors, semantic diffs, task state at SessionStart)*
*v2 flags: Gaps 5, 7, 8, 9 (error hooks, TodoWrite, scope promotion, feedback loop)*
