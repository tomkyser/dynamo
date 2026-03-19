# Phase 17: Deploy Pipeline and Integration Fixes - Research

**Researched:** 2026-03-18
**Domain:** Deployment pipeline, hook path resolution, installer behavior, toggle blackout
**Confidence:** HIGH

## Summary

Phase 17 closes 6 integration and flow gaps discovered during the v1.2.1 milestone audit (post-Phase 16). These are deployment-level bugs where code works in the repo layout but fails in the deployed `~/.claude/dynamo/` layout. The three HIGH-severity issues are: (1) hook dispatcher `dynamo-hooks.cjs` uses a hardcoded HANDLERS path that resolves to a non-existent directory in deployed layout, causing all 5 hook events to silently fail; (2) `install.cjs` still calls `registerMcp()` which re-registers Graphiti MCP on every install, undoing the Phase 12-04 deregistration decision and breaking toggle blackout; (3) the installer does not copy `CLAUDE.md.template` to `~/.claude/CLAUDE.md`, leaving users with a stale pre-Phase 14 version.

Additionally, the regression test suite (`regression.test.cjs`) references `lib/` paths that no longer exist after the Phase 12 directory restructure, and the README Mermaid diagram shows an incorrect Neo4j Bolt port (`:7688` instead of `:7687`).

**Primary recommendation:** Apply the dual-layout `resolveSibling()` path resolution pattern (already proven in `dynamo.cjs` during Phase 16) to `dynamo-hooks.cjs`, remove `registerMcp()` from the install flow, add CLAUDE.md template deployment, fix regression tests to reference the current directory structure, and correct the README port.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STAB-03 | Exhaustive documentation | CLAUDE.md.template must be deployed to `~/.claude/CLAUDE.md` during install (INT-CLAUDEMD-DEPLOY); README Mermaid port fix |
| STAB-04 | Dynamo CLI integration in CLAUDE.md | CLAUDE.md.template deployment ensures live CLAUDE.md reflects all Phase 14/15/16 additions |
| STAB-10 | Global on/off and dev mode toggles | Hook path fix enables hooks to actually execute in deployed layout (INT-HOOKS-PATH); MCP deregistration prevents toggle bypass (INT-MCP-REREG); combined = true blackout |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins | v18+ | fs, path, os, child_process | Zero-dependency constraint; all modules use these |
| node:test | built-in | Test framework | Project convention since Phase 8 |

### Supporting
No new libraries needed. All fixes use existing Node.js built-in modules and established project patterns.

**Installation:**
No new packages required.

## Architecture Patterns

### Deployed Layout vs Repo Layout

The root cause of most Phase 17 issues is the structural difference between the two layouts:

**Repo layout (development):**
```
my-cc-setup/              # REPO_ROOT
  dynamo/
    core.cjs
    dynamo.cjs
    hooks/
      dynamo-hooks.cjs    # __dirname = my-cc-setup/dynamo/hooks/
  ledger/
    hooks/
      session-start.cjs   # etc.
  switchboard/
    install.cjs
```

**Deployed layout (production):**
```
~/.claude/dynamo/          # LIVE_DIR
  core.cjs
  dynamo.cjs
  hooks/
    dynamo-hooks.cjs       # __dirname = ~/.claude/dynamo/hooks/
  ledger/
    hooks/
      session-start.cjs
  switchboard/
    install.cjs
```

**The critical difference:** In repo layout, `dynamo/` and `ledger/` are siblings under the repo root. In deployed layout, `ledger/` is nested inside `dynamo/` (the LIVE_DIR).

### Pattern: resolveSibling() for Dual-Layout Resolution

This pattern was established in Phase 16 for `dynamo.cjs` and must now be applied to `dynamo-hooks.cjs`:

```javascript
// Pattern: check repo path first, fall back to deployed path
function resolveSibling(subdir, file) {
  const repoPath = path.join(__dirname, '..', subdir, file);
  if (fs.existsSync(repoPath)) return repoPath;
  return path.join(__dirname, subdir, file);
}
```

**For dynamo-hooks.cjs specifically:**
```javascript
// Current (BROKEN in deployed layout):
const HANDLERS = path.join(__dirname, '..', '..', 'ledger', 'hooks');
// In deployed: ~/.claude/dynamo/hooks/../../ledger/hooks = ~/.claude/ledger/hooks (DOES NOT EXIST)

// Fixed (dual-layout):
function resolveHandlers() {
  // Repo layout: dynamo/hooks/ -> ../../ledger/hooks/
  const repoPath = path.join(__dirname, '..', '..', 'ledger', 'hooks');
  if (fs.existsSync(repoPath)) return repoPath;
  // Deployed layout: hooks/ -> ../ledger/hooks/
  return path.join(__dirname, '..', 'ledger', 'hooks');
}
```

### Pattern: resolveCore() for Switchboard Modules

Already established in `install.cjs` and `sync.cjs`:
```javascript
function resolveCore() {
  const deployed = path.join(__dirname, '..', 'core.cjs');
  if (fs.existsSync(deployed)) return deployed;
  return path.join(__dirname, '..', 'dynamo', 'core.cjs');
}
```

### Anti-Patterns to Avoid
- **Hardcoded relative paths without layout detection:** The exact bug being fixed. Always use `fs.existsSync()` fallback for any cross-component path.
- **Testing only against deployed layout:** Both layouts must work. The regression tests run from the repo, so repo paths must resolve.
- **Leaving dead code (registerMcp):** Do not just skip the call -- remove the function entirely and the install step referencing it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Path resolution across layouts | New resolution mechanism | resolveSibling() pattern from dynamo.cjs | Proven pattern, consistent with Phase 16 decision |
| MCP deregistration | Manual JSON editing of ~/.claude.json | `claude mcp remove` CLI | Phase 12-04 established this as the preferred approach |
| File deployment | Custom copy logic | Existing copyTree() from install.cjs | Already handles recursive copy with excludes |

## Common Pitfalls

### Pitfall 1: Hooks Silently Failing (MODULE_NOT_FOUND)
**What goes wrong:** All 5 hook events (SessionStart, UserPromptSubmit, PostToolUse, PreCompact, Stop) silently fail because the handler path resolves to a non-existent directory in deployed layout.
**Why it happens:** `dynamo-hooks.cjs` uses `path.join(__dirname, '..', '..', 'ledger', 'hooks')`. In repo layout, `__dirname` is `repo/dynamo/hooks/`, so `../..` reaches the repo root, then `ledger/hooks/` works. In deployed layout, `__dirname` is `~/.claude/dynamo/hooks/`, so `../..` reaches `~/.claude/` -- and `~/.claude/ledger/hooks/` does not exist.
**How to avoid:** Apply the `resolveSibling()` dual-layout pattern. Test from both layouts.
**Warning signs:** `hook-errors.log` entries with MODULE_NOT_FOUND for handler files.

### Pitfall 2: MCP Re-Registration Defeating Toggle Blackout
**What goes wrong:** Every `dynamo install` re-registers Graphiti MCP in `~/.claude.json`, meaning `mcp__graphiti__*` tool calls bypass the Dynamo CLI toggle gate entirely.
**Why it happens:** `install.cjs` still has Step 4 calling `registerMcp()`, which was written before Phase 12-04 decided to deregister MCP for complete CLI-only access.
**How to avoid:** Remove `registerMcp()` function and install step entirely. Add `claude mcp remove graphiti` as a defensive step (idempotent -- no error if not registered).
**Warning signs:** `~/.claude.json` containing `mcpServers.graphiti` after a fresh install.

### Pitfall 3: Stale CLAUDE.md After Install
**What goes wrong:** Live `~/.claude/CLAUDE.md` is missing Phase 14/15/16 content (reorganized CLI sections, update commands, troubleshooting).
**Why it happens:** Installer has no step to copy `claude-config/CLAUDE.md.template` to `~/.claude/CLAUDE.md`.
**How to avoid:** Add a template deployment step to `install.cjs`. The template file is at `claude-config/CLAUDE.md.template` in the repo.
**Warning signs:** `diff ~/.claude/CLAUDE.md claude-config/CLAUDE.md.template` showing extensive differences.

### Pitfall 4: Regression Tests Referencing lib/ Paths
**What goes wrong:** Tests fail because they scan `~/.claude/dynamo/lib/` which was the pre-Phase 12 layout. After restructure, files live at the root of `~/.claude/dynamo/` with `ledger/` and `switchboard/` subdirectories.
**Why it happens:** Regression tests (6, 9) and branding/structure tests were written before Phase 12 restructured away from the `lib/` directory.
**How to avoid:** Update `LIB_DIR` references in regression.test.cjs to use the correct current paths. Branding test should scan `dynamo/`, `ledger/`, `switchboard/` instead of `lib/`. Directory structure test should expect `ledger/`, `switchboard/` not `lib/`, `lib/ledger/`, `lib/switchboard/`.
**Warning signs:** Tests referencing `LIB_DIR` or `lib/` paths.

### Pitfall 5: Stale lib/ Directory in Deployed Layout
**What goes wrong:** The deployed `~/.claude/dynamo/lib/` directory contains empty subdirectories (leftover from a previous install before Phase 12 restructure). This could cause the `lib/` existence check in `boundary.test.cjs` to fail against the deployed layout.
**How to avoid:** The installer should clean up stale `lib/` directory during install. Add a cleanup step.
**Warning signs:** `ls ~/.claude/dynamo/lib/` showing directories.

## Code Examples

### Fix 1: dynamo-hooks.cjs Dual-Layout Handler Resolution

```javascript
// Source: Established pattern from dynamo.cjs resolveSibling() (Phase 16)
// Current broken code (line 37):
//   const HANDLERS = path.join(__dirname, '..', '..', 'ledger', 'hooks');

// Fixed: resolve handlers for both layouts
const fs = require('fs');

function resolveHandlers() {
  // Repo layout: dynamo/hooks/dynamo-hooks.cjs -> ../../ledger/hooks/
  const repoPath = path.join(__dirname, '..', '..', 'ledger', 'hooks');
  if (fs.existsSync(repoPath)) return repoPath;
  // Deployed layout: ~/.claude/dynamo/hooks/dynamo-hooks.cjs -> ../ledger/hooks/
  return path.join(__dirname, '..', 'ledger', 'hooks');
}

// Inside stdin.on('end'):
const HANDLERS = resolveHandlers();
```

### Fix 2: Remove registerMcp() and Add Defensive Deregistration

```javascript
// In install.cjs run():
// REMOVE Step 4 entirely (registerMcp call)
// REPLACE with defensive MCP deregistration:

// Step 4: Deregister MCP (defensive -- no-op if not registered)
try {
  execSync('claude mcp remove graphiti', {
    timeout: 10000,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  steps.push({ name: 'Deregister MCP', status: 'OK', detail: 'Graphiti MCP removed (CLI-only architecture)' });
} catch (e) {
  // Not registered -- that's fine
  steps.push({ name: 'Deregister MCP', status: 'OK', detail: 'Not registered (already CLI-only)' });
}
```

### Fix 3: Deploy CLAUDE.md Template

```javascript
// In install.cjs run(), after file copy step:
// New Step: Deploy CLAUDE.md template
try {
  const templatePath = path.join(REPO_ROOT, 'claude-config', 'CLAUDE.md.template');
  const claudeMdPath = path.join(os.homedir(), '.claude', 'CLAUDE.md');
  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, claudeMdPath);
    steps.push({ name: 'Deploy CLAUDE.md', status: 'OK', detail: 'CLAUDE.md.template copied to ~/.claude/CLAUDE.md' });
  } else {
    steps.push({ name: 'Deploy CLAUDE.md', status: 'WARN', detail: 'Template not found at ' + templatePath });
  }
} catch (e) {
  steps.push({ name: 'Deploy CLAUDE.md', status: 'WARN', detail: e.message });
}
```

### Fix 4: Regression Test Updates (regression.test.cjs)

```javascript
// Replace:
//   const LIB_DIR = path.join(DYNAMO_DIR, 'lib');
// With scanning DYNAMO_DIR directly, plus ledger/ and switchboard/:

const SCAN_DIRS = [DYNAMO_DIR, path.join(DYNAMO_DIR, 'ledger'), path.join(DYNAMO_DIR, 'switchboard')];

// Test 6 (GRAPHITI_VERBOSE): read from DYNAMO_DIR/core.cjs directly
const coreSource = fs.readFileSync(path.join(DYNAMO_DIR, 'core.cjs'), 'utf8');

// Test 9 (ppid health guard): same
const coreSource = fs.readFileSync(path.join(DYNAMO_DIR, 'core.cjs'), 'utf8');

// Branding test: scan all component directories
function collectAllCjsFiles() {
  const results = [];
  for (const dir of SCAN_DIRS) {
    if (fs.existsSync(dir)) results.push(...collectCjsFiles(dir));
  }
  return results;
}

// Directory structure test: expect ledger/, switchboard/, prompts, tests
const requiredDirs = ['ledger', 'switchboard', 'prompts', 'tests', 'hooks'];
```

### Fix 5: README Mermaid Port Correction

```markdown
// Change:
//   GM --> N4[Neo4j 5.26<br/>:7475/:7688]
// To:
    GM --> N4[Neo4j 5.26<br/>:7475/:7687]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `lib/` nested directory | Root-level `dynamo/`, `ledger/`, `switchboard/` | Phase 12 (v1.2.1) | All path references must account for both layouts |
| MCP registration in installer | CLI-only architecture (MCP deregistered) | Phase 12-04 (v1.2.1) | install.cjs still has stale registerMcp() code |
| Hardcoded single-layout paths | resolveSibling() dual-layout | Phase 16 (v1.2.1) | Pattern established but not applied everywhere |

**Deprecated/outdated:**
- `registerMcp()` in install.cjs: Contradicts Phase 12-04 decision; must be removed
- `lib/` directory references in tests: Phase 12 restructured away from this layout
- Neo4j port `:7688` in README: Phase 13 fixed to `:7687`

## Open Questions

1. **Should the stale `~/.claude/dynamo/lib/` directory be cleaned up during install?**
   - What we know: The directory exists with empty subdirectories from a pre-Phase 12 install
   - What's unclear: Whether cleaning it up could break anything
   - Recommendation: Add a cleanup step to remove `lib/` in the installer. It contains only empty directories and is a leftover artifact. The boundary test already asserts `dynamo/lib/` should not exist in repo layout.

2. **Should Graphiti MCP be actively checked in `~/.claude.json` during install?**
   - What we know: The MCP was registered and is currently present in `~/.claude.json` on the live system
   - What's unclear: Whether `claude mcp remove` is reliable without Claude Code running
   - Recommendation: Use `claude mcp remove graphiti` (idempotent) as a defensive step. Also add a direct JSON check as verification.

3. **Should install also handle deploying to `~/.claude/CLAUDE.md` when user has custom additions?**
   - What we know: Current live `~/.claude/CLAUDE.md` has user-specific additions (session start block) not in template
   - What's unclear: Whether overwriting with template will lose user customizations
   - Recommendation: Since the user's `~/.claude/CLAUDE.md` content (session start, dependency updates) is maintained in the global CLAUDE.md and not the template, the template copy should be safe. The template only contains Dynamo-specific instructions. However, the actual `~/.claude/CLAUDE.md` has additional content beyond the template. A merge strategy or a warning may be prudent. Simplest approach: overwrite with template since user's global CLAUDE.md is separate.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (built-in) |
| Config file | none -- uses node --test glob |
| Quick run command | `node --test dynamo/tests/toggle.test.cjs dynamo/tests/ledger/dispatcher.test.cjs dynamo/tests/switchboard/install.test.cjs` |
| Full suite command | `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STAB-10 (INT-HOOKS-PATH) | dynamo-hooks.cjs resolves handlers in both layouts | unit | `node --test dynamo/tests/ledger/dispatcher.test.cjs -x` | Exists -- needs update for path resolution assertion |
| STAB-10 (INT-MCP-REREG) | install.cjs does NOT call registerMcp() | unit | `node --test dynamo/tests/switchboard/install.test.cjs -x` | Exists -- needs update: assert no registerMcp reference |
| STAB-10 (FLOW-TOGGLE-BLACKOUT) | toggle off disables all access paths | unit | `node --test dynamo/tests/toggle.test.cjs -x` | Exists |
| STAB-03 (INT-CLAUDEMD-DEPLOY) | install.cjs copies CLAUDE.md.template | unit | `node --test dynamo/tests/switchboard/install.test.cjs -x` | Exists -- needs new test case |
| STAB-03 (README-PORT) | README Mermaid has correct :7475/:7687 | unit | `node --test dynamo/tests/regression.test.cjs -x` | Exists -- needs update for lib/ paths |
| STAB-10 (FLOW-HOOKS-DEPLOYED) | All 5 hook events execute in deployed layout | smoke | Manual: `dynamo install && check hook-errors.log` | Manual-only |

### Sampling Rate
- **Per task commit:** `node --test dynamo/tests/toggle.test.cjs dynamo/tests/ledger/dispatcher.test.cjs dynamo/tests/switchboard/install.test.cjs dynamo/tests/regression.test.cjs`
- **Per wave merge:** Full suite
- **Phase gate:** Full suite green before verification

### Wave 0 Gaps
- [ ] `dynamo/tests/ledger/dispatcher.test.cjs` -- needs assertion that HANDLERS path resolves in both layouts
- [ ] `dynamo/tests/switchboard/install.test.cjs` -- needs test that install flow does NOT reference registerMcp; needs test for CLAUDE.md template deployment
- [ ] `dynamo/tests/regression.test.cjs` -- Tests 6, 9, branding, and directory structure reference `lib/` paths that no longer exist; must be updated to current layout

## Sources

### Primary (HIGH confidence)
- **Direct code inspection:** `dynamo/hooks/dynamo-hooks.cjs` line 37 -- hardcoded HANDLERS path verified to break in deployed layout
- **Direct code inspection:** `switchboard/install.cjs` lines 184-208, 355-360 -- registerMcp() still present and called in run()
- **Direct code inspection:** `dynamo/dynamo.cjs` lines 14-18 -- resolveSibling() pattern (Phase 16 established)
- **Direct filesystem inspection:** `~/.claude/dynamo/` -- verified deployed layout structure, confirmed `lib/` stale directory exists, confirmed handlers at `ledger/hooks/`
- **Direct filesystem inspection:** `~/.claude.json` -- confirmed Graphiti MCP still registered as `mcpServers.graphiti`
- **Milestone audit:** `.planning/v1.2.1-MILESTONE-AUDIT.md` -- gap IDs INT-HOOKS-PATH, INT-MCP-REREG, INT-CLAUDEMD-DEPLOY, FLOW-HOOKS-DEPLOYED, FLOW-TOGGLE-BLACKOUT, FLOW-FRESH-INSTALL
- **Docker compose:** `ledger/graphiti/docker-compose.yml` -- ports `7475:7474` and `7687:7687` (not 7688)
- **Test file inspection:** `dynamo/tests/regression.test.cjs` lines 16, 124, 168, 246-266 -- `LIB_DIR` and `lib/` references confirmed

### Secondary (MEDIUM confidence)
- None needed -- all findings from direct code and filesystem inspection

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries; existing Node.js built-ins and project patterns
- Architecture: HIGH - resolveSibling() pattern already proven in Phase 16; direct filesystem inspection confirms both layouts
- Pitfalls: HIGH - Every gap verified through direct code reading and deployed filesystem inspection

**Research date:** 2026-03-18
**Valid until:** Indefinite (code-level fixes, not library-dependent)
