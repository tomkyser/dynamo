# GSD Framework — Self-Management Lifecycle

> **Audience:** Dual — structured for Claude Code to execute commands from, readable for user to review.
>
> **Verified against:** Local installation at `~/.claude/get-shit-done/` (VERSION: 1.25.1, checked 2026-03-16)

---

## Overview

Get-Shit-Done (GSD) is a project management framework for Claude Code. It installs into the AI agent's config directory (`~/.claude/`) and provides:
- Structured planning workflows (`~/.claude/get-shit-done/workflows/`)
- Slash commands for the CC interface (`~/.claude/commands/gsd/`)
- Agent markdown files for specialized sub-agents (`~/.claude/agents/gsd-*`)
- Hook scripts that run automatically during CC sessions (`~/.claude/hooks/gsd-*.js`)
- Reference docs and templates (`~/.claude/get-shit-done/references/`, `~/.claude/get-shit-done/templates/`)

CC manages GSD lifecycle entirely. The user never touches config files for GSD operations.

---

## Current State

| Property | Value |
|----------|-------|
| Installed version | 1.25.1 |
| Install scope | Global |
| Install location | `~/.claude/` |
| Version file | `~/.claude/get-shit-done/VERSION` |
| npm package | `get-shit-done-cc` |

---

## Lifecycle Operations

### Install

**Global install (recommended — available in all projects):**

```bash
npx get-shit-done-cc@latest --claude --global
```

**Local install (project-specific only):**

```bash
npx get-shit-done-cc@latest --claude --local
```

**What gets installed:**
- `~/.claude/get-shit-done/` — core framework (workflows, references, templates, bin/, VERSION)
- `~/.claude/commands/gsd/` — all GSD slash commands (e.g., `/gsd:new-project`, `/gsd:execute-phase`)
- `~/.claude/agents/gsd-*` — agent markdown files (executor, planner, verifier, etc.)
- `~/.claude/hooks/gsd-*.js` — hook scripts (gsd-check-update.js, gsd-context-monitor.js, gsd-statusline.js)

**After install:** Restart Claude Code to pick up new commands.

---

### Update (6-Step Process)

**User-facing CC command:** `/gsd:update`

**Under the hood — all 6 steps:**

**Step 1: Detect installed version**

```bash
cat ~/.claude/get-shit-done/VERSION
```

Returns the installed version (e.g., `1.25.1`). If file is missing, treats as version `0.0.0`.

**Step 2: Check npm for latest version**

```bash
npm view get-shit-done-cc version
```

Compares installed vs. latest. If already current, exits without updating.

**Step 3: Fetch changelog and show diff**

CC fetches the CHANGELOG.md from the GitHub raw URL, extracts entries between the installed version and the latest, and displays a preview of what's new before proceeding. Example output:

```
## GSD Update Available

Installed: 1.25.0
Latest:    1.25.1

### What's New
────────────────────────────────────────
## [1.25.1] - 2026-03-01
### Fixed
- Bug fix description
────────────────────────────────────────
```

**Step 4: Confirm with user**

CC presents an `AskUserQuestion` prompt: "Proceed with update?" Options: "Yes, update now" / "No, cancel". Update proceeds only on confirmation.

**Step 5: Run installer**

For global install:
```bash
npx -y get-shit-done-cc@latest --claude --global
```

The installer performs a clean install — it wipes and replaces `commands/gsd/`, `get-shit-done/`, and `agents/gsd-*` files. If any GSD files were locally modified, the installer automatically backs them up to `gsd-local-patches/` before overwriting. Run `/gsd:reapply-patches` afterward to merge custom changes.

**Step 6: Clear update cache**

```bash
rm -f ~/.claude/cache/gsd-update-check.json
```

This clears the cached update-check result so the statusline update indicator disappears. The cache is written by `gsd-check-update.js` on SessionStart.

**After update:** Restart Claude Code to pick up new commands and agents.

---

### Uninstall

**CC command:** Run via npx (no dedicated slash command):

```bash
npx get-shit-done-cc --claude --global --uninstall
```

**What gets removed:**
- `~/.claude/get-shit-done/` — entire framework directory
- `~/.claude/commands/gsd/` — all GSD slash commands
- `~/.claude/agents/gsd-*` — all GSD agent files

**What is NOT removed (preserved):**
- `~/.claude/hooks/gsd-*.js` — hook scripts are left in place (remove manually if desired)
- Hook registrations in `~/.claude/settings.json` — remove manually if needed
- Any project-level `.planning/` directories — GSD project data is never touched
- `gsd-local-patches/` — any backed-up modifications are preserved

---

### Version Check

**Check installed version:**

```bash
cat ~/.claude/get-shit-done/VERSION
```

**Check latest published version:**

```bash
npm view get-shit-done-cc version
```

**One-liner comparison:**

```bash
echo "Installed: $(cat ~/.claude/get-shit-done/VERSION)" && echo "Latest:    $(npm view get-shit-done-cc version)"
```

---

### Troubleshoot

**Decision tree:**

```
Problem: GSD commands not appearing in CC
  └─> Is GSD installed?
        → Run: ls ~/.claude/get-shit-done/VERSION
        → Not found: Run install command (see Install section)
        → Found: Restart Claude Code (commands need restart to load)

Problem: /gsd:update says "already current" but behavior seems old
  └─> Force version check:
        → npm view get-shit-done-cc version
        → cat ~/.claude/get-shit-done/VERSION
        → If out of sync: rm -f ~/.claude/cache/gsd-update-check.json
        → Then run /gsd:update again

Problem: Hook errors (gsd-check-update.js, gsd-context-monitor.js)
  └─> Check hook script exists:
        → ls ~/.claude/hooks/gsd-*.js
        → Not found: reinstall GSD (uninstall + install)
        → Found: Run health check (see Health Check section)

Problem: Update completed but new commands not available
  └─> Restart Claude Code (new commands require restart to load)

Problem: Installer overwrote custom GSD file modifications
  └─> Check backup directory:
        → ls ~/.claude/gsd-local-patches/
        → Run /gsd:reapply-patches to merge modifications into new version

Problem: npm view fails / offline
  └─> Manual update path:
        → npx get-shit-done-cc@latest --claude --global
        → (Installs latest without changelog preview)
```

**Health check command:**

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs validate health
```

Or via CC slash command: `/gsd:health`

---

### Health Check

**CC command:** `/gsd:health`

**Manual command:**

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs validate health
```

**Manual verification checklist:**

```bash
# 1. Version file
cat ~/.claude/get-shit-done/VERSION

# 2. Core directories
ls ~/.claude/get-shit-done/
ls ~/.claude/commands/gsd/
ls ~/.claude/agents/ | grep gsd

# 3. Hook scripts
ls ~/.claude/hooks/gsd-*.js

# 4. Hook registrations in settings.json
grep -c "gsd" ~/.claude/settings.json
# Should return at least 3 (check-update, context-monitor, statusline)

# 5. npm package reachable
npm view get-shit-done-cc version
```

---

## Configuration Structure

All GSD-owned paths (global install):

| Path | Contents | Managed By |
|------|----------|------------|
| `~/.claude/get-shit-done/` | Core framework root | GSD installer |
| `~/.claude/get-shit-done/workflows/` | Workflow `.md` files (update.md, execute-plan.md, etc.) | GSD installer |
| `~/.claude/get-shit-done/references/` | Reference docs (checkpoints.md, tdd.md, etc.) | GSD installer |
| `~/.claude/get-shit-done/templates/` | Output templates (summary.md, etc.) | GSD installer |
| `~/.claude/get-shit-done/bin/` | CLI tools (gsd-tools.cjs) | GSD installer |
| `~/.claude/get-shit-done/VERSION` | Installed version string | GSD installer |
| `~/.claude/commands/gsd/` | Slash commands (38 commands) | GSD installer |
| `~/.claude/agents/gsd-*` | Agent markdown files | GSD installer |
| `~/.claude/hooks/gsd-check-update.js` | Update-check hook (SessionStart) | GSD installer |
| `~/.claude/hooks/gsd-context-monitor.js` | Context monitor hook (PostToolUse) | GSD installer |
| `~/.claude/hooks/gsd-statusline.js` | Status line script | GSD installer |

**GSD does NOT own:**
- `~/.claude/settings.json` — owned by CC core (GSD adds hook registrations but doesn't own the file)
- `~/.claude.json` — owned by CC core (GSD doesn't modify this file)
- `.planning/` in project directories — project data, never touched by installer

---

## Known Issues

1. **Update cache stale after manual install:** If GSD is installed manually via npx (bypassing `/gsd:update`), the update cache at `~/.claude/cache/gsd-update-check.json` may still show an old check time. Fix: `rm -f ~/.claude/cache/gsd-update-check.json`.

2. **Hooks not removed on uninstall:** The `--uninstall` flag removes framework files but leaves hook registrations in `~/.claude/settings.json`. If uninstalling GSD completely, manually remove the `gsd-check-update.js` and `gsd-context-monitor.js` entries from the hooks section and the `statusLine` entry.

3. **Local patches warning:** If `gsd-local-patches/backup-meta.json` exists after an update, custom modifications were backed up. Run `/gsd:reapply-patches` before using any modified GSD files.

4. **Multiple runtime detection:** If GSD is installed in multiple runtimes (claude, opencode, gemini, etc.), `/gsd:update` updates the runtime that invoked it. Other runtime installs require separate update invocations.

---

## Recovery Procedures

### Recovery: Corrupted or missing VERSION file

```bash
# Reinstall GSD (overwrites corrupted installation)
npx get-shit-done-cc@latest --claude --global
```

### Recovery: Hook scripts missing but settings.json still has registrations

```bash
# Reinstall restores hook scripts
npx get-shit-done-cc@latest --claude --global

# If hooks still don't work, verify script paths in settings.json match actual file locations
grep "gsd" ~/.claude/settings.json
ls ~/.claude/hooks/gsd-*.js
```

### Recovery: Slash commands not appearing after install

```bash
# 1. Verify commands directory is populated
ls ~/.claude/commands/gsd/ | head -5

# 2. Restart Claude Code (required for new commands to load)

# 3. If still not appearing after restart, reinstall
npx get-shit-done-cc@latest --claude --global
```

### Recovery: Full reset (last resort)

```bash
# 1. Uninstall
npx get-shit-done-cc --claude --global --uninstall

# 2. Manually clean up hooks (optional — see Known Issues #2)
# Edit ~/.claude/settings.json to remove gsd-* hook entries

# 3. Clear any cached state
rm -f ~/.claude/cache/gsd-update-check.json

# 4. Reinstall fresh
npx get-shit-done-cc@latest --claude --global

# 5. Restart Claude Code
```
