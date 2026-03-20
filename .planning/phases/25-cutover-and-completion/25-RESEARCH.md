# Phase 25: Cutover & Completion - Research

**Researched:** 2026-03-20
**Domain:** Classic mode removal, CLI tooling, install pipeline, operational completion
**Confidence:** HIGH

## Summary

Phase 25 is a cutover phase: removing the classic Ledger curation path entirely, making Reverie the only processing pipeline, adding voice CLI commands for Inner Voice visibility, enabling bare CLI invocation via symlink shim, integrating update notes via CHANGELOG.md, and extending the install/sync pipelines to deploy all new Reverie files while actively cleaning up removed classic-mode artifacts.

The codebase is well-structured for this work. The dispatcher (`dynamo-hooks.cjs`) has a clear mode-check branch at line 120 that gates classic vs Reverie routing. The classic path (lines 177-222) is the `else` branch of the mode check -- removing the mode check and the else branch leaves only the Reverie routing. Five classic prompt templates exist alongside five iv-* templates in `cc/prompts/`. The `ledger/curation.cjs` module is the only consumer of OpenRouter/Haiku, and it has exactly four callers: `dynamo.cjs` (session backfill), and three Ledger hooks (`session-start.cjs`, `prompt-augment.cjs`, `session-summary.cjs`, `preserve-knowledge.cjs`). Since the classic Ledger hooks are being bypassed (dispatcher always routes to Reverie handlers), these callers become dead code. The session backfill in `dynamo.cjs` (line 398) is the one remaining reference that needs redirection to `reverie/curation.cjs`'s `generateSessionName`.

**Primary recommendation:** Execute as five distinct work areas: (1) classic mode removal from dispatcher/config/curation, (2) voice CLI commands, (3) bare CLI shim, (4) changelog integration, (5) install/sync pipeline updates with active cleanup. Order them so that classic removal happens first (it simplifies tests), then voice commands and CLI shim in parallel, then changelog, then install pipeline last (it needs to know the final file list).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Remove classic Ledger curation path entirely. Delete routing from dispatcher, remove `ledger/curation.cjs` callHaiku function, eliminate all OpenRouter/Haiku dependency from the codebase. Reverie is the only path.
- **D-02:** Remove `reverie.mode` config key entirely. No mode switching. Reverie is always on when Dynamo is enabled. The existing `isEnabled()` toggle gate is the only on/off mechanism.
- **D-03:** Delete the 5 original cc/prompts/ templates (curation.md, precompact.md, prompt-context.md, session-name.md, session-summary.md). Only the 5 iv-* templates remain. Clean break.
- **D-04:** Remove all OpenRouter references, env var checks, and callHaiku function entirely. Session naming now uses the inner-voice subagent or timestamp fallback. No OpenRouter dependency remains in any code path.
- **D-05:** The dispatcher (`dynamo-hooks.cjs`) no longer checks `reverie.mode`. It always routes cognitive events to Reverie handlers. The classic switch/case for Ledger handlers is removed for cognitive events.
- **D-06:** Update `lib/config.cjs` VALIDATORS map -- remove `reverie.mode` entry. Remove any references to classic/hybrid/cortex mode values throughout the codebase.
- **D-07:** `dynamo voice status` shows detailed state dump: all entities with activation scores, domain frame, predictions, self-model, injection history, sublimation threshold, spawn count. Multi-screen, full visibility.
- **D-08:** `dynamo voice explain` shows rationale for the last injection decision. Claude's discretion on whether this reads from state file or a separate log -- pick based on what inner-voice-state.json already stores.
- **D-09:** `dynamo voice reset` performs partial reset: clears self-model, predictions, and injection history but preserves activation map. Entity knowledge is expensive to rebuild from graph queries.
- **D-10:** Additional voice subcommands beyond status/explain/reset are Claude's discretion. Consider whether `voice history` (recent injection decisions) adds value.
- **D-11:** Deploy pipeline approach for new files (cc/agents/, cc/prompts/iv-*, new Reverie modules) is Claude's discretion. Audit install.cjs and sync.cjs to determine the right approach.
- **D-12:** Active cleanup on install: remove old classic prompt templates and unreachable classic-mode code from deployed copies at ~/.claude/dynamo/. Clean slate, not passive orphaning.
- **D-13:** Symlink shim for bare `dynamo` CLI invocation. Install creates a symlink at a PATH-accessible location pointing to a shim script that runs `node ~/.claude/dynamo/dynamo.cjs`. Symlink location is Claude's discretion (consider /usr/local/bin vs ~/.local/bin for macOS/zsh).
- **D-14:** CHANGELOG.md generated from git tags and commit messages. `dynamo check-update` shows the diff between current and latest. `dynamo update` displays notes after updating.

### Claude's Discretion
- Voice explain data source (state file vs separate log)
- Whether to add `dynamo voice history` subcommand
- Symlink location (/usr/local/bin vs ~/.local/bin)
- Exact sync pair additions for new file deployments
- CHANGELOG.md generation format and level of detail
- How to handle DYNAMO_DEV=1 override for the symlink shim

### Deferred Ideas (OUT OF SCOPE)
- Hard budget calibration for deliberation spawns -- gather baseline data during live usage first (from Phase 24 D-13)
- Embedding-based semantic shift detection (MENH-08, M4)
- Full REM consolidation (M4)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FLAG-02 | Hybrid mode runs both classic and Reverie pipelines on each event; Reverie output logged for A/B comparison but not injected | User explicitly rejected hybrid mode. This requirement is being satisfied by **removing** the mode system entirely -- Reverie is the only pipeline. The hybrid comparison concept is eliminated per user decision. |
| FLAG-04 | `dynamo voice status/explain/reset` CLI commands provide visibility into Inner Voice state, last injection rationale, and state reset | Voice CLI subcommand pattern follows `case 'session'` pattern in dynamo.cjs. State file at `inner-voice-state.json` contains all needed data for status/explain. Partial reset function needs a new `partialReset()` variant in state.cjs. |
| OPS-01 | Bare `dynamo` CLI invocation works via symlink shim without requiring `node` or path prefix; dev flag overrides to repo version | `~/.local/bin` is already in the user's PATH and is the conventional macOS/zsh location. Shim script checks DYNAMO_DEV=1 for repo override. |
| OPS-02 | CHANGELOG.md generated with well-written update notes; integrated into `dynamo update` and `dynamo check-update` display | Git tags exist (v1.1, v1.2, v1.2.1, v1.3-M1). Changelog can be generated from tag-to-tag commit ranges. update-check.cjs and update.cjs need minor additions to read/display CHANGELOG.md content. |
| OPS-03 | Install/sync pipeline updated for new Reverie files, agents directory (`cc/agents/`), and prompt templates (`cc/prompts/`) | install.cjs already copies `cc/` tree (line 312) and sync.cjs has a `cc` pair in layout.cjs (line 50). New files are already covered. Active cleanup step is the new addition. |
</phase_requirements>

## Architecture Patterns

### Removal Scope Inventory

The following table maps every file/location that must change, categorized by the decision it implements:

| Area | File | What Changes | Decision |
|------|------|-------------|----------|
| Dispatcher | `cc/hooks/dynamo-hooks.cjs` | Remove mode check (line 120), remove classic `else` branch (lines 177-222), always route to Reverie handlers | D-05 |
| Config | `lib/config.cjs` | Remove `reverie.mode` validator (line 14) | D-06 |
| Config | `subsystems/switchboard/install.cjs` | Remove `curation` section from `generateConfig()` (lines 77-79), add cleanup step | D-04, D-12 |
| Ledger curation | `subsystems/ledger/curation.cjs` | Remove `callHaiku`, `curateResults`, `summarizeText`, `generateSessionName` -- entire module becomes dead code | D-01, D-04 |
| CLI router | `dynamo.cjs` | Redirect session backfill (line 398) from `ledger/curation.cjs` to `reverie/curation.cjs`; update help text to remove `reverie.mode` examples; add `voice` command case | D-04, D-06, FLAG-04 |
| CLI help | `dynamo.cjs` | Update config help text (line 135) to remove mode examples; add voice to command list | D-06 |
| Prompts | `cc/prompts/` | Delete 5 classic templates: curation.md, precompact.md, prompt-context.md, session-name.md, session-summary.md | D-03 |
| Health check | `subsystems/terminus/stages.cjs` | Remove OPENROUTER_API_KEY from env var checks (lines 145-156, 175) | D-04 |
| Ledger hooks | `subsystems/ledger/hooks/*.cjs` | All 5 handlers become unreachable dead code; can be preserved or removed | D-05 |
| Tests | `dynamo/tests/config.test.cjs` | Remove/update reverie.mode tests | D-06 |
| Tests | `dynamo/tests/ledger/curation.test.cjs` | Remove callHaiku tests | D-04 |
| Tests | `dynamo/tests/ledger/dispatcher.test.cjs` | Remove classic mode routing tests | D-05 |
| Tests | `dynamo/tests/switchboard/stages.test.cjs` | Remove OPENROUTER_API_KEY tests | D-04 |
| Tests | `dynamo/tests/switchboard/install.test.cjs` | Update for removed curation config | D-04 |

### Pattern 1: Simplified Dispatcher

**What:** The dispatcher becomes a direct router with no mode branching.
**When to use:** After removing the mode check.
**Example:**
```javascript
// BEFORE (current):
const mode = (config.reverie && config.reverie.mode) || 'classic';
if (mode !== 'classic' && !JSON_OUTPUT_EVENTS.has(event)) {
  // Reverie routing
} else if (JSON_OUTPUT_EVENTS.has(event)) {
  // Subagent routing
} else {
  // Classic routing (being removed)
}

// AFTER:
if (JSON_OUTPUT_EVENTS.has(event)) {
  // Subagent routing (unchanged)
} else {
  // All cognitive events route to Reverie handlers (was the non-classic branch)
}
```

The key insight: the dispatcher's three branches collapse to two. The mode variable, the config read, and the entire classic `else` block are removed. The `if (mode !== 'classic' && ...)` condition simplifies to `if (!JSON_OUTPUT_EVENTS.has(event))`.

### Pattern 2: CLI Subcommand Routing (voice command)

**What:** The `voice` command follows the established `session` subcommand pattern.
**When to use:** Adding the voice CLI.
**Example:**
```javascript
// Follows the existing session pattern (dynamo.cjs line 383)
case 'voice': {
  const subCmd = restArgs[0];
  switch (subCmd) {
    case 'status':
      // Load state, format, output
      break;
    case 'explain':
      // Load state, extract last injection decision
      break;
    case 'reset':
      // Load state, apply partial reset, persist
      break;
    default:
      error('Usage: dynamo voice <status|explain|reset>');
  }
  break;
}
```

### Pattern 3: Partial State Reset

**What:** Reset self-model, predictions, and injection history while preserving activation map.
**When to use:** `dynamo voice reset` -- preserving expensive entity knowledge.
**Example:**
```javascript
function partialReset(state) {
  const defaults = freshDefaults();
  return {
    ...state,
    self_model: defaults.self_model,
    predictions: defaults.predictions,
    injection_history: defaults.injection_history,
    pending_associations: defaults.pending_associations,
    processing: defaults.processing,
    // Preserve these -- expensive to rebuild:
    // activation_map, domain_frame, session_id, version
    last_updated: new Date().toISOString()
  };
}
```

### Pattern 4: Symlink Shim Script

**What:** A shell script shim that enables bare `dynamo` invocation.
**When to use:** Install creates this at `~/.local/bin/dynamo`.
**Example:**
```bash
#!/bin/sh
# Dynamo CLI shim -- bare invocation without node prefix
if [ "$DYNAMO_DEV" = "1" ] && [ -d "$HOME/path/to/repo" ]; then
  exec node "$HOME/path/to/repo/dynamo.cjs" "$@"
else
  exec node "$HOME/.claude/dynamo/dynamo.cjs" "$@"
fi
```

### Pattern 5: Active Cleanup on Install

**What:** After copying files, explicitly remove known classic-mode artifacts from the deployed directory.
**When to use:** install.cjs cleanup step.
**Example:**
```javascript
const CLEANUP_FILES = [
  'cc/prompts/curation.md',
  'cc/prompts/precompact.md',
  'cc/prompts/prompt-context.md',
  'cc/prompts/session-name.md',
  'cc/prompts/session-summary.md',
];

function cleanupClassicArtifacts(liveDir) {
  let cleaned = 0;
  for (const relPath of CLEANUP_FILES) {
    const fullPath = path.join(liveDir, relPath);
    try {
      fs.unlinkSync(fullPath);
      cleaned++;
    } catch (e) {
      // File doesn't exist -- already clean
    }
  }
  return cleaned;
}
```

### Anti-Patterns to Avoid
- **Leaving classic code "just in case":** The user explicitly rejected graduated rollout. Dead code should be removed, not commented out.
- **Modifying the Ledger hooks themselves:** The Ledger hooks (`subsystems/ledger/hooks/`) are unreachable after the dispatcher change. They can remain as-is (the dispatcher never routes to them) or be deleted. Either way, do not refactor them.
- **Creating a new `reverie.mode` validator:** The mode concept is eliminated. There is no replacement validator. The `enabled` toggle is the only on/off mechanism.

## Discretion Recommendations

### Voice Explain Data Source: Use State File

**Recommendation:** Read from `inner-voice-state.json` directly.

The state file already contains:
- `injection_history` array with timestamps, acknowledged status, and entity IDs
- `processing.deliberation_pending`, `processing.last_deliberation_id`, `processing.deliberation_type`
- `self_model.attention_state`, `self_model.confidence`

The last injection decision can be reconstructed from the most recent `injection_history` entry plus the current `processing` state. No separate log file is needed. This avoids adding a new file to manage and keeps the state model as single source of truth.

**Confidence:** HIGH -- the state file was inspected and contains all necessary fields.

### Voice History Subcommand: Skip

**Recommendation:** Do not add `voice history` in this phase.

The `injection_history` array in state is already visible via `voice status`. A separate `history` subcommand adds minimal value -- the status dump already shows the full injection history. If users request a filtered view later, it can be added as a follow-up. Keep the phase scope tight.

### Symlink Location: `~/.local/bin`

**Recommendation:** Use `~/.local/bin/dynamo`.

Evidence:
- `~/.local/bin` is already in the user's PATH (confirmed by PATH inspection)
- It is the conventional XDG user-local binary location
- Claude Code itself installs to `~/.local/bin/claude` (confirmed by ls output)
- `/usr/local/bin` requires elevated permissions on macOS and is more appropriate for system-wide installs
- The user's `~/.local/bin` already contains symlinks for `claude`, `codeman`, `superclaude` -- this is the established pattern

**Confidence:** HIGH -- verified from actual PATH and directory contents.

### DYNAMO_DEV=1 Override for Shim

**Recommendation:** The shim script checks `DYNAMO_DEV=1`. If set, it resolves the repo path by reading a dotfile (`~/.claude/dynamo/.repo-path`) written during `dynamo install`. This avoids hardcoding the repo location.

Alternative: hardcode a well-known repo path. But the dotfile approach is more robust since the repo could be anywhere.

### Sync Pair Additions

**Recommendation:** No new sync pairs needed.

The existing layout.cjs `getSyncPairs` already includes:
- `cc` pair (line 50): covers `cc/agents/`, `cc/prompts/`, `cc/hooks/`, `cc/settings-hooks.json`, `cc/CLAUDE.md.template`
- `reverie` is covered by the `subsystems/reverie` -> `subsystems/reverie` implied in the subsystem sync (but wait -- there is no explicit reverie pair)

**CORRECTION:** Looking more carefully at `layout.cjs` getSyncPairs (lines 39-53), the subsystem pairs are: switchboard, assay, ledger, terminus. **Reverie is missing from the sync pairs.** This is a Phase 23/24 gap. The Reverie subsystem files would only have been deployed via the `copyTree` in install.cjs (which copies all of `subsystems/`), but the incremental sync would miss them.

**Action needed:** Add a reverie sync pair to `lib/layout.cjs`:
```javascript
{ repo: path.join(repoRoot, 'subsystems', 'reverie'), live: path.join(liveDir, 'subsystems', 'reverie'), label: 'reverie', excludes: SYNC_EXCLUDES },
```

**Confidence:** HIGH -- verified by reading layout.cjs lines 39-53, reverie is absent.

### CHANGELOG.md Generation Format

**Recommendation:** Generate CHANGELOG.md from git tags with curated human-written entries. The changelog should be hand-maintained (not auto-generated from raw commits) because:
1. Raw commit messages are implementation-focused, not user-facing
2. The user wants "well-written update notes" (OPS-02)
3. The changelog should group changes by category (Added, Changed, Removed, Fixed)

Format: [Keep a Changelog](https://keepachangelog.com/) style, which is the most widely adopted format.

The `check-update` and `update` commands read CHANGELOG.md and display entries between the current and latest version.

**Confidence:** HIGH -- standard practice.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Changelog format | Custom changelog parser | Keep a Changelog format with `##` version headers | Standard, easy to parse by splitting on `## [version]` headings |
| Symlink creation | Manual fs.symlinkSync with platform checks | Shell script shim + fs.symlinkSync | Shell shim handles DYNAMO_DEV logic; symlink is standard POSIX |
| State dump formatting | Complex JSON-to-table renderer | Simple key-value stderr output | Voice status is a developer tool, not user-facing; plain text is fine |

## Common Pitfalls

### Pitfall 1: Session Backfill Depends on Ledger Curation

**What goes wrong:** Removing `ledger/curation.cjs` breaks `dynamo session backfill` because dynamo.cjs line 398 imports `generateSessionName` from it.
**Why it happens:** The session backfill code was not migrated to Reverie in Phase 24 because it is a CLI command, not a hook handler.
**How to avoid:** Redirect the import to `reverie/curation.cjs` which has its own `generateSessionName` (deterministic, no LLM call). The Reverie version uses keyword extraction instead of Haiku -- which is actually better for backfill since it does not require an API key.
**Warning signs:** `dynamo session backfill` throws "cannot find module" error.

### Pitfall 2: Config.json in Deployed Installations Has curation Section

**What goes wrong:** Existing deployed config.json files at `~/.claude/dynamo/config.json` contain a `curation` section with `model` and `api_url` keys. After removing OpenRouter, this section is vestigial but harmless -- unless code accidentally reads `config.curation.api_url` and tries to use it.
**Why it happens:** `generateConfig()` in install.cjs writes the curation section. If install runs before the code is updated, or if the user has an old config.json that is not regenerated, the section persists.
**How to avoid:** (1) Remove the curation section from `generateConfig()`. (2) In the install cleanup step, also clean the deployed config.json by removing the `curation` key if present. (3) The Reverie curation module never reads `config.curation`, so no runtime risk exists even if the key persists.
**Warning signs:** Health check warns about OpenRouter API key after it should no longer be needed.

### Pitfall 3: Ledger Hooks Still Exist but are Unreachable

**What goes wrong:** Developer confusion -- the Ledger hooks directory (`subsystems/ledger/hooks/`) still exists with 5 handler files, but the dispatcher never routes to them.
**Why it happens:** The dispatcher's classic branch is removed, so these handlers are dead code. But they still `require('ledger/curation.cjs')` which may break if curation.cjs is deleted.
**How to avoid:** Two options: (a) Delete the Ledger hooks entirely (cleanest, but aggressive), or (b) Leave them in place and accept they are dead code. Since `require()` is lazy in Node.js CJS (it only resolves when the code path executes), and the dispatcher never routes to them, option (b) is safe. However, if `ledger/curation.cjs` is deleted entirely, the `require()` calls will fail at module load time in any file that statically imports the Ledger hooks. For safety, keep `ledger/curation.cjs` as a stub or delete both the hooks and the curation module together.
**Warning signs:** `node --test` fails with "Cannot find module" for ledger/curation.cjs.

### Pitfall 4: OPENROUTER_API_KEY in .env file

**What goes wrong:** The `.env` file in `~/.claude/graphiti/.env` still contains `OPENROUTER_API_KEY`. The stages.cjs health check warns if it is missing. After removal, users may be confused about whether they need it.
**Why it happens:** The .env file is user-managed and not overwritten by install.
**How to avoid:** Update stages.cjs to no longer check for OPENROUTER_API_KEY. Update the env file template/docs to note it is no longer needed. Do not delete the key from the user's .env -- it is harmless and may be used by other tools.
**Warning signs:** Health check shows unexpected warnings after upgrade.

### Pitfall 5: Test Suite References Classic Mode Extensively

**What goes wrong:** The test suite has extensive tests for `reverie.mode` validation, classic mode routing, callHaiku behavior, and OPENROUTER_API_KEY checks. These all need updating.
**Why it happens:** Tests were written when classic mode was the primary path.
**How to avoid:** Systematically update tests:
- `config.test.cjs`: Remove reverie.mode validator tests, add test confirming the key is no longer validated
- `dispatcher.test.cjs`: Remove classic routing tests, add test confirming all cognitive events route to Reverie
- `curation.test.cjs` (ledger): Remove entirely or gut to stub
- `stages.test.cjs`: Remove OPENROUTER_API_KEY tests
- `install.test.cjs`: Update for removed curation config section
**Warning signs:** `dynamo test` fails with many broken test assertions.

### Pitfall 6: Symlink Survives Uninstall

**What goes wrong:** If a user uninstalls Dynamo, the symlink at `~/.local/bin/dynamo` persists and points to a nonexistent target, producing confusing errors.
**Why it happens:** No uninstall mechanism exists.
**How to avoid:** The shim script should check that the target exists before executing it, and produce a helpful error message if not. This is a defense-in-depth measure. Also document the symlink in install output so users know it exists.
**Warning signs:** `dynamo` command produces "node: no such file" errors after manual deletion of `~/.claude/dynamo/`.

## Code Examples

### Voice Status Output Format

```javascript
// Source: state.cjs freshDefaults() structure
function formatVoiceStatus(state) {
  const lines = [];
  lines.push('Inner Voice State');
  lines.push('=================');
  lines.push('Last updated: ' + (state.last_updated || 'never'));
  lines.push('Session ID: ' + (state.session_id || 'none'));
  lines.push('');

  // Activation Map
  const entries = Object.entries(state.activation_map || {});
  lines.push('Activation Map (' + entries.length + ' entities):');
  const sorted = entries.sort((a, b) => (b[1].level || 0) - (a[1].level || 0));
  for (const [name, entry] of sorted) {
    const level = ((entry.level || 0) * 100).toFixed(0);
    const sub = entry.sublimation_score ? ' sub=' + entry.sublimation_score.toFixed(2) : '';
    lines.push('  ' + name + ': ' + level + '%' + sub);
  }
  lines.push('');

  // Domain Frame
  const df = state.domain_frame || {};
  lines.push('Domain Frame: ' + (df.current_frame || 'unknown') +
    ' (confidence: ' + (df.frame_confidence || 0).toFixed(2) + ')');
  lines.push('');

  // Predictions
  const pred = state.predictions || {};
  lines.push('Predictions:');
  lines.push('  Expected topic: ' + (pred.expected_topic || 'none'));
  lines.push('  Expected activity: ' + (pred.expected_activity || 'none'));
  lines.push('  Confidence: ' + (pred.confidence || 0).toFixed(2));
  lines.push('');

  // Self-Model
  const sm = state.self_model || {};
  lines.push('Self-Model:');
  lines.push('  Attention: ' + (sm.attention_state || 'none'));
  lines.push('  Injection mode: ' + (sm.injection_mode || 'standard'));
  lines.push('  Confidence: ' + (sm.confidence || 0).toFixed(2));
  const perf = sm.recent_performance || {};
  lines.push('  Injections made: ' + (perf.injections_made || 0));
  lines.push('  Acknowledged: ' + (perf.injections_acknowledged || 0));
  lines.push('');

  // Injection History
  const history = state.injection_history || [];
  lines.push('Injection History (' + history.length + ' entries):');
  for (const entry of history.slice(-10)) {
    const ack = entry.acknowledged ? 'ack' : 'unack';
    lines.push('  ' + entry.timestamp + ' [' + ack + '] entities: ' +
      (entry.entities || []).join(', '));
  }
  lines.push('');

  // Processing
  const proc = state.processing || {};
  lines.push('Processing:');
  lines.push('  Deliberation pending: ' + (proc.deliberation_pending || false));
  lines.push('  Last deliberation: ' + (proc.last_deliberation_id || 'none'));
  lines.push('  Type: ' + (proc.deliberation_type || 'none'));

  return lines.join('\n');
}
```

### Voice Explain Output

```javascript
// Source: inner-voice-state.json injection_history structure
function formatVoiceExplain(state) {
  const history = state.injection_history || [];
  if (history.length === 0) {
    return 'No injection decisions recorded yet.';
  }

  const last = history[history.length - 1];
  const lines = [];
  lines.push('Last Injection Decision');
  lines.push('=======================');
  lines.push('When: ' + last.timestamp);
  lines.push('Acknowledged: ' + (last.acknowledged ? 'yes' : 'no'));
  lines.push('Entities: ' + (last.entities || []).join(', '));
  lines.push('');

  // Processing context
  const proc = state.processing || {};
  lines.push('Processing Context:');
  lines.push('  Deliberation type: ' + (proc.deliberation_type || 'none'));
  lines.push('  Pending: ' + (proc.deliberation_pending || false));
  lines.push('');

  // Self-model at time of decision
  const sm = state.self_model || {};
  lines.push('Model State at Decision:');
  lines.push('  Attention: ' + (sm.attention_state || 'none'));
  lines.push('  Confidence: ' + (sm.confidence || 0).toFixed(2));

  return lines.join('\n');
}
```

### CHANGELOG.md Format

```markdown
# Changelog

All notable changes to Dynamo are documented in this file.

## [1.3.0] - 2026-03-XX

### Added
- Inner Voice cognitive pipeline (Reverie) with entity activation, sublimation threshold, and dual-path routing
- Subagent-based deliberation for session briefings, recall queries, and end-of-session synthesis
- `dynamo voice status` -- full Inner Voice state dump
- `dynamo voice explain` -- last injection decision rationale
- `dynamo voice reset` -- partial state reset preserving activation map
- Bare `dynamo` CLI invocation via symlink shim

### Changed
- Curation processing migrated from OpenRouter/Haiku to native subagent architecture
- Session naming uses deterministic keyword extraction (no API dependency)
- Install pipeline deploys Reverie modules and actively cleans up removed files

### Removed
- Classic Ledger curation path (OpenRouter/Haiku dependency eliminated)
- `reverie.mode` configuration key (Reverie is always active)
- 5 classic prompt templates (curation.md, precompact.md, prompt-context.md, session-name.md, session-summary.md)

## [1.2.1] - 2026-03-XX

### Added
- ...
```

### Symlink Shim Script

```bash
#!/bin/sh
# Dynamo CLI shim
# Installed by: dynamo install
# Location: ~/.local/bin/dynamo

# Dev mode: use repo version if DYNAMO_DEV=1
if [ "$DYNAMO_DEV" = "1" ]; then
  REPO_PATH=""
  if [ -f "$HOME/.claude/dynamo/.repo-path" ]; then
    REPO_PATH=$(cat "$HOME/.claude/dynamo/.repo-path")
  fi
  if [ -n "$REPO_PATH" ] && [ -f "$REPO_PATH/dynamo.cjs" ]; then
    exec node "$REPO_PATH/dynamo.cjs" "$@"
  fi
fi

# Normal mode: use deployed version
DYNAMO="$HOME/.claude/dynamo/dynamo.cjs"
if [ ! -f "$DYNAMO" ]; then
  echo "Error: Dynamo not installed at $DYNAMO" >&2
  echo "Run the Dynamo installer to set up." >&2
  exit 1
fi
exec node "$DYNAMO" "$@"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| OpenRouter/Haiku for curation | Native subagent (inner-voice) | Phase 24 | Eliminates API cost and external dependency |
| Mode-based routing (classic/hybrid/cortex) | Always-Reverie routing | Phase 25 | Simplifies dispatcher, removes config complexity |
| Manual `node dynamo.cjs` invocation | Bare `dynamo` CLI via shim | Phase 25 | Improved developer experience |
| No changelog | CHANGELOG.md with version-tagged entries | Phase 25 | Update visibility for users |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node --test) |
| Config file | none -- uses node --test glob patterns |
| Quick run command | `node --test dynamo/tests/*.test.cjs` |
| Full suite command | `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs dynamo/tests/reverie/*.test.cjs` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FLAG-02 | Classic mode removed, Reverie always active | unit | `node --test dynamo/tests/ledger/dispatcher.test.cjs` | Exists -- needs update |
| FLAG-04 | Voice CLI status/explain/reset | unit | `node --test dynamo/tests/reverie/voice.test.cjs` | Wave 0 |
| OPS-01 | Bare dynamo CLI shim works | unit | `node --test dynamo/tests/switchboard/shim.test.cjs` | Wave 0 |
| OPS-02 | CHANGELOG.md generated and displayed | unit | `node --test dynamo/tests/switchboard/changelog.test.cjs` | Wave 0 |
| OPS-03 | Install deploys new files and cleans up old | unit | `node --test dynamo/tests/switchboard/install.test.cjs` | Exists -- needs update |

### Sampling Rate
- **Per task commit:** `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs dynamo/tests/reverie/*.test.cjs`
- **Per wave merge:** Full suite (same command)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `dynamo/tests/reverie/voice.test.cjs` -- covers FLAG-04
- [ ] `dynamo/tests/switchboard/shim.test.cjs` -- covers OPS-01 (may be manual-only due to symlink filesystem requirements)
- [ ] `dynamo/tests/switchboard/changelog.test.cjs` -- covers OPS-02
- [ ] Update existing `dynamo/tests/ledger/dispatcher.test.cjs` -- covers FLAG-02 (remove classic tests, add always-Reverie tests)
- [ ] Update existing `dynamo/tests/switchboard/install.test.cjs` -- covers OPS-03 (add cleanup step tests)
- [ ] Update existing `dynamo/tests/config.test.cjs` -- remove reverie.mode tests
- [ ] Update existing `dynamo/tests/switchboard/stages.test.cjs` -- remove OPENROUTER tests

## Open Questions

1. **Should `ledger/curation.cjs` be deleted or stubbed?**
   - What we know: The module is dead code after the dispatcher change. The Ledger hooks that import it are also dead code (never called by the dispatcher).
   - What's unclear: Deleting both simultaneously is cleanest, but the Ledger hooks directory may have sentimental/reference value.
   - Recommendation: Delete `ledger/curation.cjs` entirely. The Ledger hooks can remain as dead code (they only `require` curation.cjs at runtime, and they are never invoked). However, since Node.js CJS evaluates `require()` at the top level in these files, we need to either: (a) delete the hooks too, or (b) make the require conditional. Option (a) is cleaner and aligns with the user's "clean break" preference.

2. **CHANGELOG.md: hand-written or generated?**
   - What we know: User wants "well-written update notes." Git commits exist with conventional prefixes (feat, fix, docs).
   - What's unclear: Whether to auto-generate from git log or hand-write.
   - Recommendation: Hand-write CHANGELOG.md as part of this phase. Auto-generation from commits would produce noisy, developer-focused entries. The changelog is a small, bounded artifact. Write entries for v1.3-M2 covering the Phase 23/24/25 changes.

3. **Should the installed config.json be cleaned of the `curation` section?**
   - What we know: `generateConfig()` writes a `curation` section. After this phase, that section has no consumers.
   - What's unclear: Whether to actively strip it from existing deployed configs.
   - Recommendation: Remove it from `generateConfig()` so new installs don't have it. For existing installs, the cleanup step can optionally remove it, but it is harmless to leave.

## Sources

### Primary (HIGH confidence)
- `cc/hooks/dynamo-hooks.cjs` -- dispatcher routing logic, lines 118-222
- `lib/config.cjs` -- VALIDATORS map, line 14
- `subsystems/ledger/curation.cjs` -- callHaiku and OpenRouter dependency
- `subsystems/reverie/state.cjs` -- freshDefaults() and state structure
- `subsystems/reverie/inner-voice.cjs` -- pipeline orchestrator, injection history
- `subsystems/reverie/curation.cjs` -- generateSessionName (Reverie version)
- `dynamo.cjs` -- CLI router, session backfill at line 398
- `subsystems/switchboard/install.cjs` -- install pipeline, generateConfig()
- `lib/layout.cjs` -- getSyncPairs() missing reverie pair
- `subsystems/terminus/stages.cjs` -- OPENROUTER_API_KEY checks
- User's PATH: `~/.local/bin` confirmed present and containing similar symlinks

### Secondary (MEDIUM confidence)
- Keep a Changelog format (keepachangelog.com) -- community standard for changelog format

### Tertiary (LOW confidence)
- None -- all findings verified from source code inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- this is internal tooling, no new dependencies
- Architecture: HIGH -- verified all file locations, patterns, and dependencies from source
- Pitfalls: HIGH -- identified through systematic grep of all references to removed concepts
- Discretion items: HIGH -- recommendations backed by direct codebase evidence

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable internal project, no external dependency changes)
