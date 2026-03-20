# Phase 22: M1 Verification and Cleanup - Research

**Researched:** 2026-03-20
**Domain:** End-to-end milestone validation, dead code removal, documentation refresh, milestone closure
**Confidence:** HIGH

## Summary

Phase 22 is a cross-cutting validation and cleanup phase with no new feature requirements. It validates all 14 M1 requirements (ARCH-01 through ARCH-07, MGMT-01, MGMT-08a, MGMT-08b, DATA-01 through DATA-04) by exercising the end-to-end install, health-check, and sync pipelines in both tmpdir sandbox and real deployment contexts. It removes migration artifacts, audits core.cjs re-exports, cleans stale documentation, and closes the milestone with a git tag and roadmap updates.

The codebase is in solid shape: 479 tests passing, 5,339 LOC across production files, six-subsystem layout fully operational. The primary risk areas are: (1) the core.cjs re-export audit where some consumers import MCPClient/SCOPE through core.cjs while others import directly from subsystem modules -- this inconsistency should be resolved, (2) stale documentation (README, codebase maps, CLAUDE.md template all reference the old 3-directory layout), and (3) ensuring the tmpdir sandbox verification properly isolates from the live deployment.

**Primary recommendation:** Structure as three work streams: verification first (tmpdir sandbox + real install), cleanup second (shim audit + dead code + stale comments), documentation and closure third (README, codebase maps, PROJECT.md, tag). Use the existing options-based test isolation pattern and copyTree/getSyncPairs functions for the tmpdir sandbox.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Two-phase verification: tmpdir sandbox first (automated, no risk), then real fresh install (scripted with user confirmation)
- Tmpdir sandbox covers: fresh install to temp directory, health-check against it, sync round-trip validation
- Real fresh install: script backs up `~/.claude/dynamo/`, installs fresh, runs health-check, pauses for user confirmation before restoring
- Automated checks must cover: full test suite (479+ tests), boundary enforcement (circular-deps + boundary tests), hook dispatch smoke test (sample JSON through dispatcher with boundary markers and input validation), SQLite migration path (sessions.json to SQLite with sample data, fallback test)
- VERIFICATION.md report produced as persistent milestone evidence documenting what was checked, results, and any issues found
- Audit core.cjs re-exports (MCPClient, SCOPE, loadSessions, etc.) -- evaluate whether consumers should import directly from subsystems instead of through core.cjs indirection. Fix unnecessary re-exports in this phase.
- Full dead code scan for old migration artifacts: grep for `detectLayout`, `resolveSibling`, `resolveHandlers`, old 3-directory path constants, commented-out fallbacks, unused layout detection functions
- Remove anything that's truly dead. This is cleanup, not a new capability.
- Regenerate all 7 codebase maps in `.planning/codebase/` via `/gsd:map-codebase` -- STRUCTURE.md, ARCHITECTURE.md, CONVENTIONS.md, INTEGRATIONS.md, STACK.md, CONCERNS.md, TESTING.md
- Update stale comments in production code that reference old directory names (e.g., `ledger/hooks/` when it's now `subsystems/ledger/hooks/`)
- Full README refresh to reflect six-subsystem architecture (directory tree, Mermaid diagram, command reference)
- Update CLAUDE.md template (`cc/CLAUDE.md.template`) to reflect any changed paths or commands from M1
- Tag on dev branch (v1.3-M1) -- do NOT merge dev to master (master merge deferred until full v1.3 ships)
- Full PROJECT.md evolution: update "What This Is", current state, context section, LOC/test counts, add decision records from Phases 18-21
- Update MASTER-ROADMAP.md to mark M1 as shipped
- Update ROADMAP.md to mark Phase 22 and M1 as complete

### Claude's Discretion
- Exact VERIFICATION.md structure and sections
- Order of operations between verification, cleanup, and documentation tasks
- Whether to split into multiple plans or execute as one
- Exact grep patterns for dead code detection
- How to structure the real fresh install backup/restore script

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

This is a cross-cutting validation phase with no new requirements. It validates all 14 previously-completed M1 requirements:

| ID | Description | Research Support |
|----|-------------|-----------------|
| ARCH-01 | Six-subsystem directory structure | Verified via tmpdir install producing all 6 subsystem directories |
| ARCH-02 | Centralized dual-layout resolver | Verified via boundary tests (no ad-hoc resolveCore/resolveSibling/resolveHandlers) |
| ARCH-03 | Circular dependency detection | Verified via circular-deps.test.cjs execution |
| ARCH-04 | Unified layout mapping (lib/layout.cjs) | Verified via sync round-trip using getSyncPairs() |
| ARCH-05 | Sync with new layout | Verified via sync round-trip validation in tmpdir |
| ARCH-06 | Install/deploy pipeline with new layout | Verified via fresh install to tmpdir producing functional deployment |
| ARCH-07 | All tests pass after restructure | Verified via full test suite run (479 tests) |
| MGMT-01 | Node.js version + Graphiti dependency check | Verified via health-check stage 6 (Node.js) and stages 0-3 (Docker/Neo4j/API/MCP) |
| MGMT-08a | Hook dispatcher JSON validation + field limits | Verified via dispatcher smoke test with valid/invalid JSON |
| MGMT-08b | Boundary markers for additionalContext | Verified via dispatcher smoke test checking stdout wrapping |
| DATA-01 | SQLite session storage via node:sqlite | Verified via health-check stage 7 (Session Storage) |
| DATA-02 | Identical session query interface | Verified via session-store test execution |
| DATA-03 | One-time JSON-to-SQLite migration | Verified via migration smoke test with sample sessions.json |
| DATA-04 | Graceful JSON fallback | Verified via fallback behavior in session-store tests |

</phase_requirements>

## Standard Stack

This phase uses no new libraries. All verification and cleanup uses existing project infrastructure.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node:test | Built-in (Node 24.x) | Test framework | Zero-dependency, project convention |
| node:assert/strict | Built-in | Assertions | Project convention |
| node:fs | Built-in | File system operations | tmpdir sandbox, file verification |
| node:os | Built-in | tmpdir paths | Test isolation via os.tmpdir() |
| node:sqlite | Built-in (Node 22+) | SQLite verification | DATA-01 requirement validation |
| node:child_process | Built-in | Process execution for real install script | execSync for scripted operations |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| git tag | Milestone tagging | v1.3-M1 tag on dev branch |
| /gsd:map-codebase | Codebase map regeneration | Regenerating all 7 stale codebase maps |

## Architecture Patterns

### Verification Architecture

The phase has three distinct work streams executed sequentially:

```
Phase 22 Execution Order:
1. Verification (tmpdir sandbox + real install)
   ├── Full test suite (479+ tests)
   ├── Tmpdir fresh install + health-check + sync
   ├── Dispatcher smoke test
   ├── SQLite migration smoke test
   └── Real fresh install (scripted, user-confirmed)
2. Cleanup (shims + dead code + stale comments)
   ├── core.cjs re-export audit
   ├── Dead code scan and removal
   └── Stale comment fixes
3. Documentation and Closure
   ├── README refresh
   ├── CLAUDE.md template update
   ├── Codebase map regeneration
   ├── PROJECT.md evolution
   ├── ROADMAP.md + MASTER-ROADMAP.md updates
   ├── VERIFICATION.md report
   └── v1.3-M1 tag
```

### Pattern 1: Tmpdir Sandbox Verification

**What:** Install to a temporary directory, run health-check and sync against it, then clean up. No risk to real deployment.
**When to use:** First verification step -- must succeed before attempting real install.

The project already uses this pattern extensively in tests. The install.cjs `copyTree` function, layout.cjs `getLayoutPaths`, and sync.cjs `getSyncPairs` all accept parameterized roots, enabling redirection to tmpdir.

```javascript
// Sandbox verification pattern (conceptual)
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dynamo-verify-'));
const tmpLive = path.join(tmpRoot, 'live');

// 1. Copy files using install.cjs copyTree
install.copyTree(REPO_ROOT, tmpLive, INSTALL_EXCLUDES);

// 2. Verify directory structure
const paths = layout.getLayoutPaths(tmpLive);
// Check all 6 subsystem directories exist

// 3. Verify file count and key files
// dynamo.cjs, lib/resolve.cjs, cc/hooks/dynamo-hooks.cjs, etc.

// 4. Sync round-trip validation
const pairs = layout.getSyncPairs(REPO_ROOT, tmpLive);
// Verify 8 pairs, all files synchronized
```

### Pattern 2: Real Fresh Install with Scripted Backup/Restore

**What:** Script that backs up `~/.claude/dynamo/`, removes it, runs `dynamo install`, verifies health-check, then pauses for user confirmation before optionally restoring.
**When to use:** After tmpdir sandbox passes. Requires user interaction.

```javascript
// Real install verification flow
// 1. Backup: mv ~/.claude/dynamo/ ~/.claude/dynamo-backup-verify/
// 2. Fresh install: node dynamo.cjs install
// 3. Health-check: node dynamo.cjs health-check
// 4. Report results
// 5. Pause: "Press enter to restore backup or 'keep' to keep fresh install"
// 6. Restore or keep based on user input
```

**Critical:** This step must NOT run automatically. It must pause and wait for user confirmation because it affects the live deployment that may be in use by other Claude Code sessions.

### Pattern 3: core.cjs Re-Export Audit Decision Framework

**What:** Evaluate each re-export in core.cjs (lines 337-348) against actual consumer patterns.
**Current state analysis:**

| Re-Export | Source | Consumers via core.cjs | Consumers Direct | Recommendation |
|-----------|--------|----------------------|-----------------|----------------|
| MCPClient | terminus/mcp-client.cjs | dynamo.cjs (4x), stages.cjs, diagnose.cjs, verify-memory.cjs | search.cjs, episodes.cjs, session-start.cjs | **Keep** -- widely used through core.cjs by non-terminus modules |
| parseSSE | terminus/mcp-client.cjs | None (only in core.cjs exports) | regression.test.cjs only | **Remove** -- no production consumer uses it via core.cjs |
| SCOPE | lib/scope.cjs | dynamo-hooks.cjs, verify-memory.cjs | None found beyond tests | **Evaluate** -- SCOPE is in lib/ already; core.cjs re-export adds a cycle |
| SCOPE_PATTERN | lib/scope.cjs | None found in production | None | **Remove** -- unused re-export |
| validateGroupId | lib/scope.cjs | verify-memory.cjs | None | **Evaluate** -- only 1 consumer |
| sanitize | lib/scope.cjs | None found in production | None | **Remove** -- unused re-export |
| loadSessions | assay/sessions.cjs | verify-memory.cjs | None | **Evaluate** -- creates core<->assay cycle |
| listSessions | assay/sessions.cjs | verify-memory.cjs | None | **Evaluate** -- creates core<->assay cycle |

**Key insight:** The core.cjs re-exports create two known circular dependency chains (core<->mcp-client, core<->sessions) that are in the allowlist. Removing unused re-exports reduces the surface area of these cycles. The MCPClient re-export is the most heavily used and should be kept for convenience since it's consumed by 7+ files. SCOPE could go either way since it's in lib/ already. loadSessions/listSessions should be changed to direct imports in verify-memory.cjs since it's the only consumer.

### Anti-Patterns to Avoid
- **Running real install without tmpdir first:** Never skip the sandbox. The sandbox catches 95% of issues without risk.
- **Modifying re-export consumers without updating the circular-deps allowlist:** If cycles change, tests break.
- **Editing codebase maps manually:** Use `/gsd:map-codebase` to regenerate -- manual edits will be inconsistent.
- **Tagging before all verification passes:** The tag should be the last step, after VERIFICATION.md confirms everything green.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Directory structure verification | Custom recursive scanner | `layout.getLayoutPaths()` + `fs.existsSync` | Layout module IS the source of truth |
| Sync pair validation | Hardcoded pair list | `layout.getSyncPairs()` | Same module used by production sync |
| File copy for sandbox | Custom copy function | `install.copyTree()` | Same function used by production install |
| Dead code detection | Custom AST parser | `grep` for specific patterns | Known list of dead patterns is finite |
| Codebase map generation | Manual markdown | `/gsd:map-codebase` | Automated tool produces consistent maps |
| Health-check validation | Custom health logic | `health-check.run([], false, true)` | Returns structured result for assertion |

## Common Pitfalls

### Pitfall 1: Tmpdir Sandbox Resolver Mismatch
**What goes wrong:** resolve.cjs caches paths on first call (`_paths`). If you require resolve.cjs from the repo, it caches the repo root, not the tmpdir root. Sandbox verification then checks repo paths, not tmpdir paths.
**Why it happens:** resolve.cjs uses a lazy singleton `_paths` via `getPaths()`.
**How to avoid:** Use `resolve._reset()` before sandbox operations, or avoid using resolve.cjs in sandbox verification -- instead use `layout.getLayoutPaths(tmpRoot)` directly for path building.
**Warning signs:** Sandbox tests pass even when tmpdir is empty -- means they're reading from the wrong root.

### Pitfall 2: Real Install Disrupts Active Sessions
**What goes wrong:** Running `dynamo install` or removing `~/.claude/dynamo/` while other Claude Code sessions are active breaks those sessions' hook execution.
**Why it happens:** Hooks reference `$HOME/.claude/dynamo/cc/hooks/dynamo-hooks.cjs` -- if that file disappears mid-session, hooks fail.
**How to avoid:** The real install script MUST warn the user about active sessions and pause for confirmation. This is why it's a scripted operation, not automated.
**Warning signs:** Hook errors in hook-errors.log from other sessions during verification.

### Pitfall 3: core.cjs Re-Export Removal Breaking Consumers
**What goes wrong:** Removing a re-export from core.cjs breaks consumers that destructure it from the require.
**Why it happens:** Consumers like `const { MCPClient, SCOPE, validateGroupId } = require(resolve('lib', 'core.cjs'))` will get `undefined` for removed re-exports.
**How to avoid:** Before removing any re-export: (1) grep ALL consumers, (2) update each consumer to import directly, (3) run full test suite, (4) then remove from core.cjs.
**Warning signs:** Tests pass but deployed code fails because test files import differently than production files.

### Pitfall 4: Circular Dependency Allowlist Drift
**What goes wrong:** After changing re-exports, the circular-deps.test.cjs allowlist no longer matches actual cycles. Either false negatives (new cycles not caught) or false positives (test fails for cycles that no longer exist).
**Why it happens:** The allowlist in circular-deps.test.cjs is a hardcoded list of path pairs.
**How to avoid:** After any re-export change: run `circular-deps.test.cjs` to see if cycles have changed, update the allowlist to match the new reality.
**Warning signs:** circular-deps test fails after re-export changes.

### Pitfall 5: Stale README Directory Tree
**What goes wrong:** README directory tree shows old layout but code references new layout. Users following README instructions hit wrong paths.
**Why it happens:** README was last updated for the 3-directory layout (dynamo/ledger/switchboard) and never updated for the six-subsystem layout.
**How to avoid:** Generate the directory tree from the actual filesystem, not from memory. Use `find` or `tree` to produce the accurate current layout.
**Warning signs:** README mentions `ledger/`, `switchboard/`, `dynamo/hooks/`, or `claude-config/` as top-level directories.

### Pitfall 6: VERIFICATION.md Written Before All Checks Complete
**What goes wrong:** VERIFICATION.md documents partial results, then a later check fails, requiring the document to be regenerated.
**Why it happens:** Writing the report as you go rather than at the end.
**How to avoid:** Collect all results in a structured object throughout execution, then write VERIFICATION.md as a single final step.
**Warning signs:** VERIFICATION.md has "PENDING" entries alongside "PASS" entries.

## Code Examples

### Tmpdir Sandbox Structure Verification

```javascript
// Verify all expected directories exist after tmpdir install
const layout = require('../../lib/layout.cjs');
const EXPECTED_DIRS = [
  'subsystems/switchboard',
  'subsystems/assay',
  'subsystems/ledger',
  'subsystems/terminus',
  'subsystems/reverie',
  'cc/hooks',
  'cc/prompts',
  'lib',
  'dynamo'
];

function verifyStructure(liveDir) {
  const results = [];
  for (const dir of EXPECTED_DIRS) {
    const fullPath = path.join(liveDir, dir);
    results.push({
      directory: dir,
      exists: fs.existsSync(fullPath),
    });
  }
  // Also check key files
  const KEY_FILES = [
    'dynamo.cjs',
    'lib/resolve.cjs',
    'lib/core.cjs',
    'lib/layout.cjs',
    'cc/hooks/dynamo-hooks.cjs',
    'cc/settings-hooks.json',
    'subsystems/terminus/session-store.cjs',
    'subsystems/terminus/health-check.cjs',
    'subsystems/switchboard/install.cjs',
    'subsystems/switchboard/sync.cjs',
  ];
  for (const file of KEY_FILES) {
    results.push({
      file: file,
      exists: fs.existsSync(path.join(liveDir, file)),
    });
  }
  return results;
}
```

### Dead Code Grep Patterns

```bash
# Migration artifact patterns to scan for
grep -rn 'detectLayout\|resolveSibling\|resolveHandlers\|resolveCore\|resolveLedger' \
  --include='*.cjs' \
  --exclude-dir=tests \
  subsystems/ cc/ lib/ dynamo.cjs

# Old 3-directory path constants (should not exist in production)
grep -rn "path\.join.*'dynamo'.*'core\.cjs'" \
  --include='*.cjs' \
  --exclude-dir=tests \
  subsystems/ cc/ lib/

# Stale directory references in comments
grep -rn "ledger/hooks/\|switchboard/install\|switchboard/sync\|switchboard/health\|dynamo/core\|dynamo/hooks/" \
  --include='*.cjs' \
  --exclude-dir=tests \
  subsystems/ cc/ lib/ dynamo.cjs
```

### Sync Round-Trip Verification

```javascript
const layout = require('../../lib/layout.cjs');

function verifySyncPairs(repoRoot, liveDir) {
  const pairs = layout.getSyncPairs(repoRoot, liveDir);
  const results = [];
  for (const pair of pairs) {
    // Walk repo side
    const repoFiles = sync.walkDir(pair.repo, pair.excludes, [], undefined, pair.filesOnly);
    // Walk live side
    const liveFiles = sync.walkDir(pair.live, pair.excludes, [], undefined, pair.filesOnly);
    // Diff should be zero after install
    const diff = sync.diffTrees(repoFiles, liveFiles);
    results.push({
      label: pair.label,
      repoFileCount: Object.keys(repoFiles).length,
      liveFileCount: Object.keys(liveFiles).length,
      toCopy: diff.toCopy.length,
      toDelete: diff.toDelete.length,
      inSync: diff.toCopy.length === 0 && diff.toDelete.length === 0,
    });
  }
  return results;
}
```

### VERIFICATION.md Report Structure (Recommended)

```markdown
# v1.3-M1 Verification Report

**Date:** 2026-03-20
**Node.js:** v24.x
**Test Suite:** 479 tests (478 pass, 1 skip)

## Requirement Validation Matrix

| ID | Requirement | Method | Result | Notes |
|----|-------------|--------|--------|-------|
| ARCH-01 | Six-subsystem structure | Tmpdir install structure check | PASS/FAIL | |
| ... | ... | ... | ... | |

## Test Suite Results
- Total: 479
- Pass: 478
- Skip: 1 (reason)
- Fail: 0

## Tmpdir Sandbox Verification
- Directory structure: PASS (9/9 directories)
- Key files: PASS (10/10 files)
- Sync round-trip: PASS (8/8 pairs in sync)

## Real Install Verification
- Backup: OK
- Fresh install: OK (N steps, all OK)
- Health-check: 8/8 green
- User confirmed: YES

## Cleanup Summary
- Re-exports removed: N
- Dead code removed: N lines across M files
- Stale comments fixed: N instances

## Issues Found
(any issues discovered and how they were resolved)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 3-directory layout (dynamo/ledger/switchboard) | Six-subsystem layout (subsystems/cc/lib) | Phase 19 (2026-03-20) | README, codebase maps, CLAUDE.md template all stale |
| Per-module resolveSibling/resolveHandlers | Centralized lib/resolve.cjs | Phase 18 (2026-03-19) | Dead code may linger in comments |
| JSON session storage | SQLite session storage (with JSON fallback) | Phase 21 (2026-03-20) | Health-check now has 8 stages, not 6 |
| No input validation on hooks | MGMT-08a/b validation + boundary markers | Phase 20 (2026-03-20) | Dispatcher smoke test needed |
| 374 tests | 479 tests | Phase 21 | Documentation references outdated counts |

**Deprecated/outdated:**
- All codebase maps in `.planning/codebase/` are from 2026-03-18 (pre-Phase 19), showing old 3-directory layout
- README references `ledger/`, `switchboard/`, `claude-config/`, `dynamo/hooks/`, "6-stage health check", "272+ tests"
- CLAUDE.md template may reference old paths (needs audit)
- MASTER-ROADMAP.md still shows M1 as in-progress
- ROADMAP.md Phase 21 plan checkboxes incorrectly show unchecked

## Codebase Inventory for Verification

### Production Files (27 files, 5,339 LOC)
```
lib/           (6 files: core, resolve, layout, scope, pretty, dep-graph)
cc/            (1 file: hooks/dynamo-hooks.cjs + templates)
dynamo.cjs     (1 file: CLI router)
subsystems/
  switchboard/ (4 files: install, sync, update, update-check)
  assay/       (2 files: search, sessions)
  ledger/      (2 files: curation, episodes + 5 hook handlers)
  terminus/    (8 files: health-check, stages, diagnose, verify-memory, mcp-client, stack, migrate, session-store)
  reverie/     (stub: .gitkeep only)
```

### Test Files (27 test files, 479 tests)
All in `dynamo/tests/` with subdirectories `ledger/` and `switchboard/`.

### Sync Pairs (8 pairs)
root, dynamo-meta, switchboard, assay, ledger, terminus, cc, lib

### Health-Check Stages (8 stages)
Docker, Neo4j, Graphiti API, MCP Session, Env Vars, Canary Write/Read, Node.js Version, Session Storage

### Install Steps (10 steps)
Check dependencies, Copy files, Generate config, Merge settings, Deregister MCP, Deploy CLAUDE.md, Verify lib/, Retire Python, Migrate sessions, Health check

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (built-in, Node.js 24.x) |
| Config file | none -- tests discovered via glob pattern |
| Quick run command | `node --test dynamo/tests/**/*.test.cjs dynamo/tests/*.test.cjs` |
| Full suite command | `node --test dynamo/tests/**/*.test.cjs dynamo/tests/*.test.cjs` |

### Phase Requirements -> Test Map

Since this is a validation-only phase, the "tests" are the verification procedures themselves. The existing test suite validates the implementation; Phase 22 validates the integration.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARCH-01 | Six-subsystem directories exist | structural | `node --test dynamo/tests/boundary.test.cjs` (six-subsystem directory structure test) | Yes |
| ARCH-02 | No ad-hoc resolver functions | structural | `node --test dynamo/tests/boundary.test.cjs` (resolveCore/resolveSibling/resolveHandlers test) | Yes |
| ARCH-03 | No circular dependencies | static analysis | `node --test dynamo/tests/circular-deps.test.cjs` | Yes |
| ARCH-04 | Unified layout mapping | unit | `node --test dynamo/tests/switchboard/sync.test.cjs` (uses getSyncPairs) | Yes |
| ARCH-05 | Sync with new layout | unit+integration | `node --test dynamo/tests/switchboard/sync.test.cjs` | Yes |
| ARCH-06 | Install pipeline works | unit | `node --test dynamo/tests/switchboard/install.test.cjs` | Yes |
| ARCH-07 | All tests pass | full suite | `node --test dynamo/tests/**/*.test.cjs dynamo/tests/*.test.cjs` | Yes |
| MGMT-01 | Node.js + Graphiti check | unit | `node --test dynamo/tests/switchboard/health-check.test.cjs` | Yes |
| MGMT-08a | Hook input validation | unit | `node --test dynamo/tests/ledger/dispatcher.test.cjs` | Yes |
| MGMT-08b | Boundary markers | unit | `node --test dynamo/tests/ledger/dispatcher.test.cjs` | Yes |
| DATA-01 | SQLite session storage | unit | `node --test dynamo/tests/switchboard/session-store.test.cjs` | Yes |
| DATA-02 | Session query interface | unit | `node --test dynamo/tests/ledger/sessions.test.cjs` | Yes |
| DATA-03 | JSON-to-SQLite migration | unit | `node --test dynamo/tests/switchboard/session-store.test.cjs` | Yes |
| DATA-04 | JSON fallback | unit | `node --test dynamo/tests/ledger/sessions.test.cjs` | Yes |

### Sampling Rate
- **Per task commit:** `node --test dynamo/tests/**/*.test.cjs dynamo/tests/*.test.cjs`
- **Per wave merge:** Same (single wave expected)
- **Phase gate:** Full suite green + VERIFICATION.md produced before `/gsd:verify-work`

### Wave 0 Gaps
None -- existing test infrastructure covers all phase requirements. Phase 22 adds verification procedures (tmpdir sandbox, real install script) but does not need new test files in the traditional sense. The VERIFICATION.md serves as the persistent evidence artifact.

## Open Questions

1. **core.cjs re-export removal scope**
   - What we know: parseSSE, SCOPE_PATTERN, sanitize are unused re-exports. loadSessions/listSessions are used by only verify-memory.cjs. MCPClient is widely used.
   - What's unclear: Whether removing the core<->sessions cycle (by having verify-memory.cjs import directly from assay/sessions.cjs) will introduce a new cycle or require allowlist updates.
   - Recommendation: Map the dependency graph change BEFORE making the change. Run dep-graph.cjs on the proposed new state. If the core<->sessions allowlist entry can be removed entirely, that's a clean win.

2. **ROADMAP.md Phase 21 plan status**
   - What we know: Phase 21 shows plans as `[ ]` (unchecked) even though Phase 21 is complete.
   - What's unclear: Whether this is a display issue or was missed during Phase 21 verification.
   - Recommendation: Fix during documentation cleanup wave.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: all 27 production files, 27 test files, README, CLAUDE.md template, codebase maps
- `node --test` execution: 479 tests, 478 pass, 0 fail, 1 skip
- CONTEXT.md: locked decisions and discretion areas from user discussion

### Secondary (MEDIUM confidence)
- REQUIREMENTS.md: all 14 M1 requirements marked complete with traceability to phases
- PROJECT.md: current state description and decision records
- ROADMAP.md: phase completion status

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all tools are existing project infrastructure
- Architecture: HIGH - direct inspection of all verification targets, established patterns reusable
- Pitfalls: HIGH - identified from concrete codebase analysis (resolve caching, re-export consumers, active session disruption)
- Re-export audit: HIGH - exhaustive grep of all MCPClient/SCOPE/loadSessions consumers completed

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable infrastructure, no external dependency drift expected)
