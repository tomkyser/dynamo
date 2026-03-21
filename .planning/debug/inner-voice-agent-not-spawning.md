---
status: awaiting_human_verify
trigger: "Dynamo hooks inject inner-voice directives but no agent spawns because the agent type isn't registered with Claude Code"
created: 2026-03-20T12:00:00-06:00
updated: 2026-03-20T12:45:00-06:00
---

## Current Focus

hypothesis: CONFIRMED - Two deployment gaps prevent the inner-voice subagent from working
test: Fix applied and self-verified
expecting: After running `dynamo install`, inner-voice.md appears in ~/.claude/agents/ and SubagentStart/SubagentStop hooks appear in settings.json
next_action: Await human verification that the fix resolves the issue end-to-end

## Symptoms

expected: Hook-injected inner-voice directives should trigger spawning of an inner-voice subagent for deep analysis of session context and entity processing
actual: The directives appear as plain text in system-reminder tags — Claude sees them but has no "inner-voice" agent type available to spawn
errors: No errors — the directive is silently ignored
reproduction: Every SessionStart hook injects "[INNER VOICE: Session briefing queued for deep analysis. Spawn the inner-voice subagent for comprehensive session context.]" and every UserPromptSubmit hook injects "[INNER VOICE: Deep analysis queued (semantic_shift). Spawn the inner-voice subagent to process queued entities.]"
started: Current state during testing of Dynamo updates. Unknown if inner-voice agent was ever functional.

## Eliminated

## Evidence

- timestamp: 2026-03-20T12:05:00-06:00
  checked: cc/agents/inner-voice.md in repo
  found: Well-formed Claude Code agent definition exists with YAML frontmatter (model, tools, permissionMode, maxTurns) and comprehensive system prompt
  implication: The agent definition is complete and ready for deployment

- timestamp: 2026-03-20T12:07:00-06:00
  checked: ~/.claude/agents/ directory
  found: Contains 18 gsd-* agent files but NO inner-voice.md
  implication: Claude Code cannot discover or spawn the inner-voice agent because it is not in the agent discovery directory

- timestamp: 2026-03-20T12:08:00-06:00
  checked: install.cjs Step 1 (lines 401-416) - file copy logic
  found: Install copies cc/ to ~/.claude/dynamo/cc/ but does NOT copy or symlink cc/agents/*.md to ~/.claude/agents/. The agent file ends up at ~/.claude/dynamo/cc/agents/inner-voice.md which is NOT a Claude Code agent discovery path.
  implication: GAP #1 - Install never deploys agents to the discovery directory

- timestamp: 2026-03-20T12:10:00-06:00
  checked: ~/.claude/settings.json for SubagentStart/SubagentStop hooks
  found: These hook events are COMPLETELY ABSENT from deployed settings.json, despite being defined in cc/settings-hooks.json template (lines 79-102)
  implication: GAP #2 - Even if the agent were discoverable, SubagentStart/SubagentStop lifecycle hooks would not fire

- timestamp: 2026-03-20T12:12:00-06:00
  checked: settings.json timestamps and mergeSettings logic in install.cjs
  found: settings.json last modified at 11:30 but dynamo files deployed at 21:03. The mergeSettings function iterates template.hooks keys and should merge SubagentStart/SubagentStop, but they are absent. Either install was run before SubagentStart/SubagentStop were added to the template, or settings.json was overwritten after install.
  implication: The SubagentStart/SubagentStop hooks need to be merged into settings.json (re-running install would fix this)

- timestamp: 2026-03-20T12:15:00-06:00
  checked: session-start.cjs and user-prompt.cjs handlers
  found: These handlers write "[INNER VOICE: ... Spawn the inner-voice subagent ...]" to stdout as plain text. Claude Code does not spawn subagents from hook output text directives. Claude Code spawns subagents via the Agent tool when it determines a task matches an agent description, or when a user explicitly requests it.
  implication: GAP #3 (design note) - The "Spawn the inner-voice subagent" directive in hook output is a passive suggestion that depends on Claude voluntarily spawning the agent. Even with the agent deployed, there is no guarantee Claude will act on this text directive. However, this is the documented pattern for hook-driven subagent triggering in Claude Code.

- timestamp: 2026-03-20T12:18:00-06:00
  checked: sync.cjs and layout.cjs
  found: Sync only copies files between repo and ~/.claude/dynamo/ subdirectories. It does NOT handle settings.json merging or agent deployment to ~/.claude/agents/. This is by design -- sync handles file mirroring, install handles system integration.
  implication: Running dynamo sync would NOT fix either gap. Only install (with additions) can fix this.

- timestamp: 2026-03-20T12:30:00-06:00
  checked: Self-verification of fix
  found: (1) deployAgents function tested with temp directory -- correctly copies inner-voice.md to target. (2) mergeSettings tested with copy of real settings.json -- correctly adds SubagentStart and SubagentStop hooks. (3) All 36 existing install tests pass. (4) All 28 sync tests pass. (5) Module loads and exports correctly.
  implication: Fix is mechanically correct and does not break existing functionality.

## Resolution

root_cause: Two deployment gaps in install.cjs prevented the inner-voice subagent from functioning. (1) install.cjs copied cc/agents/inner-voice.md to ~/.claude/dynamo/cc/agents/ but never deployed it to ~/.claude/agents/ where Claude Code discovers subagents. (2) The SubagentStart/SubagentStop hooks from the settings template were not present in the deployed settings.json (install hadn't been re-run since these hooks were added to the template).
fix: Added deployAgents() helper function and Step 6 to install.cjs that copies .md files from cc/agents/ to ~/.claude/agents/. Also added AGENTS_DIR and REPO_AGENTS_DIR constants. The SubagentStart/SubagentStop hooks will be merged by the existing mergeSettings step on next install run. Re-running `dynamo install` will fix both gaps.
verification: Self-verified with temp directories. deployAgents correctly copies inner-voice.md. mergeSettings correctly adds SubagentStart/SubagentStop. All existing tests pass (36 install, 28 sync). Awaiting human verification of end-to-end functionality.
files_changed: [subsystems/switchboard/install.cjs]
