# Phase 19: Six-Subsystem Directory Restructure - Research

**Researched:** 2026-03-19
**Domain:** CJS codebase directory restructure with operational pipeline updates
**Confidence:** HIGH

## Summary

Phase 19 is a pure structural reorganization: move files from the current 3-directory layout (dynamo/, ledger/, switchboard/) to the six-subsystem architecture (subsystems/switchboard/, subsystems/assay/, subsystems/ledger/, subsystems/terminus/, subsystems/reverie/, cc/, lib/) while keeping all 398 tests green and all operational pipelines (sync, install, deploy) working. No module internals are refactored -- files move as-is.

The codebase is ~7,000 LOC of pure Node.js CJS with zero npm dependencies. Phase 18 established the `lib/resolve.cjs` centralized resolver with an 8-subsystem layout map that already includes future paths (assay, terminus, reverie, cc). The resolver uses layout auto-detection (repo vs deployed) and caches the result. This means Phase 19's core challenge is: (1) creating the new directory structure, (2) moving files with `git mv`, (3) updating the resolver's path map to point to new locations, (4) updating bootstrap `require()` paths in each moved file (the one hardcoded relative path to `lib/resolve.cjs`), (5) updating SYNC_PAIRS and install.cjs for the new layout, and (6) updating boundary/circular-dep tests.

**Primary recommendation:** Execute as a three-wave commit sequence: (Wave 1) extract `lib/layout.cjs` from resolve.cjs and move core.cjs/scope.cjs/pretty.cjs into lib/; (Wave 2) create subsystems/*, cc/*, move all remaining files with `git mv`, update resolver layout map; (Wave 3) update SYNC_PAIRS, install.cjs, settings-hooks.json, boundary tests, circular-dep tests. Tests must be green after each wave.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- All-at-once migration: all files move in a single coordinated commit (not subsystem-by-subsystem)
- Prep wave first: extract lib/layout.cjs from resolve.cjs AND move core.cjs, scope.cjs, pretty.cjs into lib/ BEFORE any subsystem directories move
- Main migration wave: create subsystems/*, cc/*, move all remaining files, update resolve.cjs layout map, update SYNC_PAIRS, update install.cjs
- Use `git mv` for all file moves to preserve rename detection and blame history
- Tests must be green after each commit (prep wave, migration wave, pipeline update wave)
- Deployed layout (~/.claude/dynamo/) mirrors repo structure exactly: subsystems/switchboard/, subsystems/assay/, cc/hooks/, lib/, etc.
- Resolver works identically in both layouts (same directory structure eliminates divergence)
- SYNC_PAIRS updated to map new subsystem directories (replacing the old 3+1 pairs)
- Settings.json hook paths updated from dynamo/hooks/dynamo-hooks.cjs to cc/hooks/dynamo-hooks.cjs via install.cjs (clean cutover, no symlinks)
- dynamo.cjs CLI router moves to repo root (not inside any subsystem -- it's the entry point)
- Files move to PRD-defined subsystems but module internals are NOT refactored (move only, no split)
- search.cjs and sessions.cjs move to subsystems/assay/ as-is (functional Ledger/Assay split deferred to 1.3-M2)
- mcp-client.cjs moves to subsystems/terminus/ (infrastructure, not data construction)
- pretty.cjs moves to lib/ (shared formatter)
- episodes.cjs stays in subsystems/ledger/ (write operations)
- curation.cjs stays in subsystems/ledger/ (write operations -- Haiku curation pipeline)
- subsystems/reverie/ created as empty directory with .gitkeep (implementation in 1.3-M2)
- ledger/graphiti/ (Docker infrastructure) moves to subsystems/terminus/graphiti/
- claude-config/ contents (CLAUDE.md.template, settings-hooks.json) move to cc/ and old directory deleted
- dynamo/prompts/ moves to cc/prompts/ (Claude Code platform artifacts)

### Claude's Discretion
- config.json and VERSION: lib/ or shared/ directory
- stages.cjs: subsystems/terminus/ or lib/
- Hook handlers: all in cc/hooks/ or dispatcher in cc/ with handlers in respective subsystems
- Test directory organization (dynamo/tests/ may need reorganization to match new subsystem structure)
- Exact SYNC_PAIRS structure for the new layout
- Update system (update.cjs, update-check.cjs) stays in switchboard per PRD

### Deferred Ideas (OUT OF SCOPE)
- Functional Ledger/Assay split (actual read vs write separation in module internals) -- milestone 1.3-M2
- Reverie implementation -- milestone 1.3-M2
- Test directory reorganization to match subsystem structure -- evaluate after restructure
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ARCH-01 | Codebase organized into six-subsystem directory structure (`subsystems/`, `cc/`, `lib/`) | Complete file-to-directory mapping documented below; all 27 production .cjs files mapped to target locations |
| ARCH-04 | Unified layout mapping module serves as single source of truth for sync, install, and deploy paths | `lib/layout.cjs` extraction pattern documented; SYNC_PAIRS and install.cjs both consume it |
| ARCH-05 | Sync system operates correctly with new six-subsystem directory layout | SYNC_PAIRS rewrite documented with exact new pair definitions |
| ARCH-06 | Install and deploy pipeline operates correctly with new layout (settings.json references `cc/hooks/`) | install.cjs copyTree updates and settings-hooks.json path changes documented |
| ARCH-07 | All existing tests pass after restructure (374+ green) | Current count is 398 tests; specific test files requiring updates identified (boundary, circular-deps, resolve, dispatcher, router) |
</phase_requirements>

## Standard Stack

Not applicable -- this is a restructure of an existing zero-dependency Node.js CJS codebase. No new libraries are introduced.

| Tool | Version | Purpose | Why Used |
|------|---------|---------|----------|
| Node.js | 22+ | Runtime | Existing project requirement |
| node:test | built-in | Test framework | All 398 tests use this; no change |
| node:fs | built-in | File operations | `git mv` for moves, fs for sync/install |
| git | system | VCS | `git mv` preserves blame/rename detection |

## Architecture Patterns

### Current Layout (Before Phase 19)
```
<repo>/
  dynamo/
    dynamo.cjs            # CLI router
    core.cjs              # Shared substrate
    config.json           # Runtime config
    VERSION               # Version file
    hooks/
      dynamo-hooks.cjs    # Hook dispatcher
    prompts/              # 5 .md prompt templates
    migrations/           # README.md
    tests/                # 398 tests (stays in place)
  ledger/
    mcp-client.cjs        # MCP transport
    scope.cjs             # Scope constants
    search.cjs            # Search operations
    episodes.cjs          # Episode creation
    curation.cjs          # Haiku curation
    sessions.cjs          # Session management
    hooks/                # 5 hook handlers
    graphiti/             # Docker infra
  switchboard/
    install.cjs           # 6-step installer
    sync.cjs              # Bidirectional sync
    health-check.cjs      # 6-stage health
    diagnose.cjs          # 13-stage diagnostics
    verify-memory.cjs     # Pipeline verification
    stack.cjs             # Docker start/stop
    stages.cjs            # Shared stage logic
    pretty.cjs            # Formatters
    update.cjs            # Update system
    update-check.cjs      # Version check
    migrate.cjs           # Migration harness
  lib/
    resolve.cjs           # Centralized resolver
    dep-graph.cjs         # Circular dep detector
  claude-config/
    CLAUDE.md.template    # CLAUDE.md template
    settings-hooks.json   # Hook definitions
```

### Target Layout (After Phase 19)
```
<repo>/
  dynamo.cjs                          # CLI router (moved from dynamo/)
  subsystems/
    switchboard/
      install.cjs
      sync.cjs
      update.cjs
      update-check.cjs
    assay/
      search.cjs                      # From ledger/search.cjs
      sessions.cjs                    # From ledger/sessions.cjs
    ledger/
      episodes.cjs                    # From ledger/episodes.cjs
      curation.cjs                    # From ledger/curation.cjs
      hooks/                          # From ledger/hooks/ (5 handlers)
        capture-change.cjs
        preserve-knowledge.cjs
        prompt-augment.cjs
        session-start.cjs
        session-summary.cjs
    terminus/
      mcp-client.cjs                  # From ledger/mcp-client.cjs
      health-check.cjs                # From switchboard/health-check.cjs
      diagnose.cjs                    # From switchboard/diagnose.cjs
      verify-memory.cjs               # From switchboard/verify-memory.cjs
      stack.cjs                       # From switchboard/stack.cjs
      stages.cjs                      # From switchboard/stages.cjs (discretion: terminus)
      migrate.cjs                     # From switchboard/migrate.cjs
      graphiti/                        # From ledger/graphiti/
        docker-compose.yml
        config.yaml
        start-graphiti.sh
        stop-graphiti.sh
    reverie/
      .gitkeep                        # Stub only
  cc/
    hooks/
      dynamo-hooks.cjs                # From dynamo/hooks/dynamo-hooks.cjs
    prompts/                          # From dynamo/prompts/
      curation.md
      precompact.md
      prompt-context.md
      session-name.md
      session-summary.md
    CLAUDE.md.template                # From claude-config/CLAUDE.md.template
    settings-hooks.json               # From claude-config/settings-hooks.json
  lib/
    resolve.cjs                       # Already here
    dep-graph.cjs                     # Already here
    layout.cjs                        # NEW: extracted from resolve.cjs
    core.cjs                          # From dynamo/core.cjs
    scope.cjs                         # From ledger/scope.cjs
    pretty.cjs                        # From switchboard/pretty.cjs
  dynamo/
    config.json                       # Stays (or moves to lib/ -- discretion)
    VERSION                           # Stays (or moves to lib/ -- discretion)
    migrations/                       # Stays
    tests/                            # Stays -- tests do NOT move
```

### Complete File Move Mapping

Every production .cjs file's source and destination (27 files total):

| Current Location | Target Location | Notes |
|-----------------|----------------|-------|
| `dynamo/dynamo.cjs` | `dynamo.cjs` (repo root) | CLI entry point; dual-layout bootstrap simplifies |
| `dynamo/core.cjs` | `lib/core.cjs` | Shared substrate moves to lib/ |
| `dynamo/hooks/dynamo-hooks.cjs` | `cc/hooks/dynamo-hooks.cjs` | Hook dispatcher moves to cc/ |
| `ledger/scope.cjs` | `lib/scope.cjs` | Shared utility moves to lib/ |
| `switchboard/pretty.cjs` | `lib/pretty.cjs` | Shared formatter moves to lib/ |
| `ledger/search.cjs` | `subsystems/assay/search.cjs` | Read operations |
| `ledger/sessions.cjs` | `subsystems/assay/sessions.cjs` | Session management |
| `ledger/episodes.cjs` | `subsystems/ledger/episodes.cjs` | Write operations |
| `ledger/curation.cjs` | `subsystems/ledger/curation.cjs` | Curation pipeline |
| `ledger/hooks/session-start.cjs` | `subsystems/ledger/hooks/session-start.cjs` | Hook handler |
| `ledger/hooks/prompt-augment.cjs` | `subsystems/ledger/hooks/prompt-augment.cjs` | Hook handler |
| `ledger/hooks/capture-change.cjs` | `subsystems/ledger/hooks/capture-change.cjs` | Hook handler |
| `ledger/hooks/preserve-knowledge.cjs` | `subsystems/ledger/hooks/preserve-knowledge.cjs` | Hook handler |
| `ledger/hooks/session-summary.cjs` | `subsystems/ledger/hooks/session-summary.cjs` | Hook handler |
| `ledger/mcp-client.cjs` | `subsystems/terminus/mcp-client.cjs` | Transport |
| `switchboard/install.cjs` | `subsystems/switchboard/install.cjs` | Installer |
| `switchboard/sync.cjs` | `subsystems/switchboard/sync.cjs` | Sync |
| `switchboard/update.cjs` | `subsystems/switchboard/update.cjs` | Update |
| `switchboard/update-check.cjs` | `subsystems/switchboard/update-check.cjs` | Update check |
| `switchboard/health-check.cjs` | `subsystems/terminus/health-check.cjs` | Health monitoring |
| `switchboard/diagnose.cjs` | `subsystems/terminus/diagnose.cjs` | Diagnostics |
| `switchboard/verify-memory.cjs` | `subsystems/terminus/verify-memory.cjs` | Pipeline verification |
| `switchboard/stack.cjs` | `subsystems/terminus/stack.cjs` | Docker lifecycle |
| `switchboard/stages.cjs` | `subsystems/terminus/stages.cjs` | Shared stages |
| `switchboard/migrate.cjs` | `subsystems/terminus/migrate.cjs` | Migration harness |
| `lib/resolve.cjs` | `lib/resolve.cjs` | Already in place |
| `lib/dep-graph.cjs` | `lib/dep-graph.cjs` | Already in place |

Non-.cjs file moves:

| Current Location | Target Location |
|-----------------|----------------|
| `claude-config/CLAUDE.md.template` | `cc/CLAUDE.md.template` |
| `claude-config/settings-hooks.json` | `cc/settings-hooks.json` |
| `dynamo/prompts/*.md` (5 files) | `cc/prompts/*.md` |
| `ledger/graphiti/*` (4 files) | `subsystems/terminus/graphiti/*` |

### Pattern 1: Bootstrap Require Depth Changes

**What:** Every production .cjs file has one hardcoded `require()` to `lib/resolve.cjs`. When files move, this relative path changes.

**Current bootstrap patterns observed:**
```javascript
// Files at depth 1 from repo root (ledger/*.cjs, switchboard/*.cjs):
const resolve = require('../lib/resolve.cjs');

// Files at depth 2 from repo root (ledger/hooks/*.cjs):
const resolve = require('../../lib/resolve.cjs');

// Files with dual-layout bootstrap (dynamo/core.cjs, dynamo/dynamo.cjs):
const resolve = require(
  require('fs').existsSync(require('path').join(__dirname, 'lib', 'resolve.cjs'))
    ? './lib/resolve.cjs'     // deployed layout
    : '../lib/resolve.cjs'    // repo layout
);
```

**After restructure, new bootstrap paths:**
```javascript
// Files at subsystems/X/*.cjs (depth 2):
const resolve = require('../../lib/resolve.cjs');

// Files at subsystems/X/hooks/*.cjs (depth 3):
const resolve = require('../../../lib/resolve.cjs');

// Files at cc/hooks/*.cjs (depth 2):
const resolve = require('../../lib/resolve.cjs');

// Files at lib/*.cjs (same directory):
const resolve = require('./resolve.cjs');  // or direct path.join

// dynamo.cjs at repo root (depth 0):
const resolve = require('./lib/resolve.cjs');
```

**Key insight:** When the deployed layout mirrors the repo layout exactly, the dual-layout conditional bootstrap in dynamo.cjs and core.cjs SIMPLIFIES to a single path. This is a major cleanup.

### Pattern 2: Resolver Layout Map Update

**What:** `lib/resolve.cjs` `getPaths()` function must be updated for the new directory structure.

**Current layout map:**
```javascript
// Repo layout
_paths = {
  dynamo:      path.join(root, 'dynamo'),
  ledger:      path.join(root, 'ledger'),
  switchboard: path.join(root, 'switchboard'),
  lib:         path.join(root, 'lib'),
  assay:       path.join(root, 'subsystems', 'assay'),
  terminus:    path.join(root, 'subsystems', 'terminus'),
  reverie:     path.join(root, 'subsystems', 'reverie'),
  cc:          path.join(root, 'cc'),
};
```

**Target layout map (repo and deployed identical):**
```javascript
_paths = {
  dynamo:      root,   // dynamo.cjs is at repo root; core.cjs moves to lib/
  ledger:      path.join(root, 'subsystems', 'ledger'),
  switchboard: path.join(root, 'subsystems', 'switchboard'),
  lib:         path.join(root, 'lib'),
  assay:       path.join(root, 'subsystems', 'assay'),
  terminus:    path.join(root, 'subsystems', 'terminus'),
  reverie:     path.join(root, 'subsystems', 'reverie'),
  cc:          path.join(root, 'cc'),
};
```

**Critical consideration:** The `dynamo` key currently resolves to `path.join(root, 'dynamo')` which contains core.cjs, dynamo.cjs, config.json, VERSION, hooks/, prompts/. After restructure, core.cjs moves to lib/, hooks/ moves to cc/hooks/, prompts/ moves to cc/prompts/, dynamo.cjs moves to root. The `dynamo` subsystem key needs careful redefinition -- it may need to point to root (for dynamo.cjs, config.json, VERSION) or its meaning changes entirely.

**Recommendation:** After the restructure, the `dynamo` key should point to root (where dynamo.cjs lives). But `resolve('dynamo', 'core.cjs')` will break because core.cjs is in lib/ not root. This means ALL resolve() calls that currently use `resolve('dynamo', 'core.cjs')` must change to `resolve('lib', 'core.cjs')`. This is a significant change -- every production file that imports core.cjs (most of them) needs this update.

### Pattern 3: lib/layout.cjs Extraction

**What:** Extract layout path data from resolve.cjs into a separate module that sync.cjs and install.cjs can also consume.

**Why:** ARCH-04 requires a unified layout mapping module as single source of truth. Currently SYNC_PAIRS in sync.cjs hardcodes paths separately from the resolver. After extraction, both resolve.cjs and sync.cjs consume lib/layout.cjs.

**Example structure:**
```javascript
// lib/layout.cjs
'use strict';
const path = require('path');

function getLayoutPaths(root) {
  return {
    dynamo:      root,
    ledger:      path.join(root, 'subsystems', 'ledger'),
    switchboard: path.join(root, 'subsystems', 'switchboard'),
    assay:       path.join(root, 'subsystems', 'assay'),
    terminus:    path.join(root, 'subsystems', 'terminus'),
    reverie:     path.join(root, 'subsystems', 'reverie'),
    cc:          path.join(root, 'cc'),
    lib:         path.join(root, 'lib'),
  };
}

// Sync pair definitions (repo dir -> deployed dir mapping)
function getSyncPairs(repoRoot, liveDir) {
  return [
    { repo: path.join(repoRoot, 'subsystems', 'switchboard'), live: path.join(liveDir, 'subsystems', 'switchboard'), label: 'switchboard', ... },
    { repo: path.join(repoRoot, 'subsystems', 'assay'), live: path.join(liveDir, 'subsystems', 'assay'), label: 'assay', ... },
    // ... all subsystems, cc/, lib/
  ];
}

module.exports = { getLayoutPaths, getSyncPairs };
```

### Pattern 4: SYNC_PAIRS Rewrite

**What:** The SYNC_PAIRS constant in sync.cjs defines repo-to-deployed directory mappings. Currently 4 pairs; becomes 7+ pairs.

**Current SYNC_PAIRS:**
```javascript
const SYNC_PAIRS = [
  { repo: 'dynamo', live: LIVE_DIR, label: 'dynamo', excludes: [...SYNC_EXCLUDES, 'tests'] },
  { repo: 'ledger', live: path.join(LIVE_DIR, 'ledger'), label: 'ledger', excludes: SYNC_EXCLUDES },
  { repo: 'switchboard', live: path.join(LIVE_DIR, 'switchboard'), label: 'switchboard', excludes: SYNC_EXCLUDES },
  { repo: 'lib', live: path.join(LIVE_DIR, 'lib'), label: 'lib', excludes: SYNC_EXCLUDES },
];
```

**Target SYNC_PAIRS (since deployed mirrors repo):**
```javascript
const SYNC_PAIRS = [
  // Root-level files (dynamo.cjs, config.json, VERSION)
  { repo: REPO_ROOT, live: LIVE_DIR, label: 'root', excludes: [...SYNC_EXCLUDES, 'tests', 'subsystems', 'cc', 'lib', ...], filesOnly: true },
  // Subsystems
  { repo: path.join(REPO_ROOT, 'subsystems', 'switchboard'), live: path.join(LIVE_DIR, 'subsystems', 'switchboard'), label: 'switchboard', excludes: SYNC_EXCLUDES },
  { repo: path.join(REPO_ROOT, 'subsystems', 'assay'), live: path.join(LIVE_DIR, 'subsystems', 'assay'), label: 'assay', excludes: SYNC_EXCLUDES },
  { repo: path.join(REPO_ROOT, 'subsystems', 'ledger'), live: path.join(LIVE_DIR, 'subsystems', 'ledger'), label: 'ledger', excludes: SYNC_EXCLUDES },
  { repo: path.join(REPO_ROOT, 'subsystems', 'terminus'), live: path.join(LIVE_DIR, 'subsystems', 'terminus'), label: 'terminus', excludes: SYNC_EXCLUDES },
  // cc/ adapter
  { repo: path.join(REPO_ROOT, 'cc'), live: path.join(LIVE_DIR, 'cc'), label: 'cc', excludes: SYNC_EXCLUDES },
  // lib/ shared substrate
  { repo: path.join(REPO_ROOT, 'lib'), live: path.join(LIVE_DIR, 'lib'), label: 'lib', excludes: SYNC_EXCLUDES },
];
```

**Key challenge:** The current dynamo/ pair maps `dynamo/*` to `LIVE_DIR/*` (flat copy to root). After restructure, dynamo.cjs is at repo root alongside subsystems/ and cc/. The root sync pair needs special handling -- it must sync only specific root-level files (dynamo.cjs, config.json, VERSION) without recursing into subsystems/, cc/, lib/ which have their own pairs.

### Pattern 5: install.cjs copyTree Updates

**What:** install.cjs Step 1 currently does 4 `copyTree` calls. Must be updated for new layout.

**Current:**
```javascript
fileCount += copyTree(path.join(REPO_ROOT, 'dynamo'), LIVE_DIR, [...INSTALL_EXCLUDES, 'tests']);
fileCount += copyTree(path.join(REPO_ROOT, 'ledger'), path.join(LIVE_DIR, 'ledger'), INSTALL_EXCLUDES);
fileCount += copyTree(path.join(REPO_ROOT, 'switchboard'), path.join(LIVE_DIR, 'switchboard'), INSTALL_EXCLUDES);
fileCount += copyTree(path.join(REPO_ROOT, 'lib'), path.join(LIVE_DIR, 'lib'), INSTALL_EXCLUDES);
```

**Target:**
```javascript
// Root-level files
copyFile(path.join(REPO_ROOT, 'dynamo.cjs'), path.join(LIVE_DIR, 'dynamo.cjs'));
// Subsystems
fileCount += copyTree(path.join(REPO_ROOT, 'subsystems'), path.join(LIVE_DIR, 'subsystems'), INSTALL_EXCLUDES);
// cc/ adapter
fileCount += copyTree(path.join(REPO_ROOT, 'cc'), path.join(LIVE_DIR, 'cc'), INSTALL_EXCLUDES);
// lib/ shared substrate
fileCount += copyTree(path.join(REPO_ROOT, 'lib'), path.join(LIVE_DIR, 'lib'), INSTALL_EXCLUDES);
// Config/version from dynamo/ (if staying there)
copyFile(path.join(REPO_ROOT, 'dynamo', 'config.json'), path.join(LIVE_DIR, 'config.json'));
copyFile(path.join(REPO_ROOT, 'dynamo', 'VERSION'), path.join(LIVE_DIR, 'VERSION'));
```

### Pattern 6: settings-hooks.json Path Update

**What:** Hook command paths in settings-hooks.json must reference the new cc/hooks/ location.

**Current:**
```json
"command": "node \"$HOME/.claude/dynamo/hooks/dynamo-hooks.cjs\""
```

**Target:**
```json
"command": "node \"$HOME/.claude/dynamo/cc/hooks/dynamo-hooks.cjs\""
```

This change affects all 5 hook event entries in settings-hooks.json. The install.cjs `mergeSettings()` function handles the merge, so the template update is sufficient.

### Anti-Patterns to Avoid

- **Incremental file moves with test gaps:** Moving files one at a time and fixing tests between each move creates N intermediate broken states. The all-at-once approach (prep wave -> main migration -> pipeline updates) is safer because each commit is internally consistent.

- **Changing module internals during restructure:** The temptation to refactor while moving is strong. Resist it. Every internal change compounds the risk. Move files as-is; refactor in later milestones.

- **Forgetting the deployed layout:** The resolver must work in both repo and deployed contexts. Since deployed now mirrors repo, this actually simplifies -- but every path change must be validated from the deployed perspective too.

- **Using `mv` instead of `git mv`:** Plain `mv` loses git history and blame. Always `git mv` for file moves.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Path resolution | New ad-hoc resolvers | `lib/resolve.cjs` (existing) | Already handles layout detection and subsystem mapping |
| Layout path definitions | Hardcoded paths in sync/install | `lib/layout.cjs` (new, extracted from resolve.cjs) | Single source of truth per ARCH-04 |
| File moves | Manual copy+delete | `git mv` | Preserves rename detection and blame history |
| Test infrastructure | New test framework | `node:test` (existing) | 398 tests already use this; keep it |

## Common Pitfalls

### Pitfall 1: Relative Require Depth Mismatch
**What goes wrong:** After `git mv`, files are at new depths relative to `lib/resolve.cjs`. The bootstrap `require('../lib/resolve.cjs')` in a file that moved from depth-1 to depth-2 now resolves to the wrong location or throws MODULE_NOT_FOUND.
**Why it happens:** Each file has exactly one hardcoded relative path to the resolver. Depth changes when files move under `subsystems/X/`.
**How to avoid:** Create a mapping of every file's current bootstrap path and its new bootstrap path. Update ALL of them in the same commit as the `git mv`. Validate with `node -e "require('./subsystems/switchboard/install.cjs')"` for each moved file.
**Warning signs:** `Error: Cannot find module '../lib/resolve.cjs'` or similar during test runs.

### Pitfall 2: resolve('dynamo', 'core.cjs') Breaking After core.cjs Moves
**What goes wrong:** 20+ files do `require(resolve('dynamo', 'core.cjs'))`. After core.cjs moves to `lib/core.cjs`, this call fails because the `dynamo` key no longer points to a directory containing core.cjs.
**Why it happens:** The resolver maps subsystem names to directories. core.cjs was in dynamo/, but now it's in lib/.
**How to avoid:** ALL `resolve('dynamo', 'core.cjs')` calls must change to `resolve('lib', 'core.cjs')`. This is a mechanical find-and-replace across ~20 files. Do it in the same commit as the core.cjs move.
**Warning signs:** `resolve('dynamo', 'core.cjs'): not found` errors.

### Pitfall 3: Hook Handler Internal Requires Breaking
**What goes wrong:** Hook handlers in `ledger/hooks/` use `path.join(__dirname, '..', 'search.cjs')` to require sibling ledger modules. If handlers stay at `subsystems/ledger/hooks/` but search.cjs moves to `subsystems/assay/search.cjs`, the relative paths break.
**Why it happens:** Hook handlers use `__dirname` + relative paths to reach sibling modules, not the resolver.
**How to avoid:** After the move, handler `__dirname` relative paths must be updated. The handlers should use the resolver instead: `resolve('assay', 'search.cjs')` instead of `path.join(__dirname, '..', 'search.cjs')`. This is the correct migration pattern.
**Warning signs:** Hooks silently fail (they always exit 0) -- check `hook-errors.log` for MODULE_NOT_FOUND.

### Pitfall 4: Circular Dependency Test Scanning Wrong Directories
**What goes wrong:** The circular-deps.test.cjs scans `dynamo/`, `ledger/`, `switchboard/`, `lib/`. After restructure, files are in `subsystems/*/` and `cc/`. The test passes vacuously because it finds no files in the old directories.
**Why it happens:** The test has hardcoded directory paths.
**How to avoid:** Update the scan directories to `subsystems/switchboard/`, `subsystems/assay/`, `subsystems/ledger/`, `subsystems/terminus/`, `cc/`, `lib/`. Also update the ALLOWLIST cycle paths (e.g., `dynamo/core.cjs` becomes `lib/core.cjs`).
**Warning signs:** Test passes with zero files scanned (false green).

### Pitfall 5: SYNC_PAIRS Root-Level File Handling
**What goes wrong:** After restructure, dynamo.cjs is at repo root alongside subsystems/, cc/, lib/. A naive sync pair `{ repo: REPO_ROOT, live: LIVE_DIR }` would sync everything including .git, .planning, tests, etc.
**Why it happens:** The current dynamo/ pair mapped a single directory to the live root. After restructure, root-level files are mixed with directories that have their own sync pairs.
**How to avoid:** Either (a) create a root pair that explicitly lists only root-level files (dynamo.cjs, config.json, VERSION), or (b) use lib/layout.cjs to generate sync pairs that handle root differently.
**Warning signs:** Sync copies .planning/, .git/, or other non-deployment files to `~/.claude/dynamo/`.

### Pitfall 6: Boundary Test False Positives After Directory Name Changes
**What goes wrong:** The boundary test checks that "ledger files never import from switchboard" by searching for the string `'switchboard` in require lines. After restructure, paths look like `subsystems/switchboard/...` and `subsystems/ledger/...`, so the string matching might produce false positives or miss real violations.
**Why it happens:** The boundary test uses substring matching on require() lines, not structural analysis.
**How to avoid:** Update boundary.test.cjs to check the new directory structure. Consider using the resolver's subsystem keys instead of string matching, or update the patterns to account for `subsystems/` prefix.
**Warning signs:** Boundary test fails on legitimate cross-subsystem imports via the resolver (which is allowed).

### Pitfall 7: dynamo/core.cjs Re-exports Creating Cycles at New Paths
**What goes wrong:** core.cjs currently re-exports MCPClient (from ledger/mcp-client.cjs), SCOPE (from ledger/scope.cjs), and loadSessions (from ledger/sessions.cjs). After restructure, MCPClient is in `subsystems/terminus/`, SCOPE is in `lib/scope.cjs`, and sessions is in `subsystems/assay/`. The circular dep allowlist references old paths.
**Why it happens:** The Object.assign(module.exports, ...) pattern for breaking circular deps references specific file paths. Path changes require allowlist updates.
**How to avoid:** Update the allowlist in circular-deps.test.cjs to use new paths. Also evaluate whether moving core.cjs to lib/ changes the cycle structure (scope.cjs is now a sibling in lib/ -- may eliminate a cycle).
**Warning signs:** Circular dependency test reports new "unexpected" cycles that are actually the same allowlisted ones at new paths.

## Code Examples

### Bootstrap Require Pattern After Restructure
```javascript
// subsystems/switchboard/install.cjs (depth 2 from root)
const resolve = require('../../lib/resolve.cjs');
const { DYNAMO_DIR, output, error, loadEnv, safeReadFile } = require(resolve('lib', 'core.cjs'));

// subsystems/ledger/hooks/capture-change.cjs (depth 3 from root)
const resolve = require('../../../lib/resolve.cjs');
const { healthGuard, logError } = require(resolve('lib', 'core.cjs'));
const { addEpisode } = require(resolve('ledger', 'episodes.cjs'));

// cc/hooks/dynamo-hooks.cjs (depth 2 from root)
const resolve = require('../../lib/resolve.cjs');
const { loadEnv, detectProject, logError, SCOPE } = require(resolve('lib', 'core.cjs'));
const HANDLERS = resolve('ledger', 'hooks');

// dynamo.cjs at repo root (depth 0)
const resolve = require('./lib/resolve.cjs');
```

### Hook Handler Resolver Migration
```javascript
// BEFORE: ledger/hooks/session-start.cjs
const { combinedSearch } = require(path.join(__dirname, '..', 'search.cjs'));
const { curateResults } = require(path.join(__dirname, '..', 'curation.cjs'));

// AFTER: subsystems/ledger/hooks/session-start.cjs
const { combinedSearch } = require(resolve('assay', 'search.cjs'));
const { curateResults } = require(resolve('ledger', 'curation.cjs'));
```

### Updated Resolver Layout Map
```javascript
// lib/resolve.cjs -- updated getPaths()
function getPaths() {
  if (_paths) return _paths;
  const root = path.join(__dirname, '..');
  _paths = {
    dynamo:      root,
    ledger:      path.join(root, 'subsystems', 'ledger'),
    switchboard: path.join(root, 'subsystems', 'switchboard'),
    lib:         path.join(root, 'lib'),
    assay:       path.join(root, 'subsystems', 'assay'),
    terminus:    path.join(root, 'subsystems', 'terminus'),
    reverie:     path.join(root, 'subsystems', 'reverie'),
    cc:          path.join(root, 'cc'),
  };
  // No separate deployed layout needed -- repo and deployed mirror each other
  return _paths;
}
```

### Updated Circular Deps Test
```javascript
// dynamo/tests/circular-deps.test.cjs -- updated scan dirs and allowlist
const REPO_ROOT = path.join(__dirname, '..', '..');
const ALLOWLIST = [
  [
    path.join(REPO_ROOT, 'lib', 'core.cjs'),
    path.join(REPO_ROOT, 'subsystems', 'terminus', 'mcp-client.cjs'),
  ],
  [
    path.join(REPO_ROOT, 'lib', 'core.cjs'),
    path.join(REPO_ROOT, 'subsystems', 'assay', 'sessions.cjs'),
  ],
  [
    path.join(REPO_ROOT, 'subsystems', 'switchboard', 'install.cjs'),
    path.join(REPO_ROOT, 'subsystems', 'switchboard', 'update.cjs'),
  ],
];

const graph = buildGraph([
  path.join(REPO_ROOT, 'subsystems', 'switchboard'),
  path.join(REPO_ROOT, 'subsystems', 'assay'),
  path.join(REPO_ROOT, 'subsystems', 'ledger'),
  path.join(REPO_ROOT, 'subsystems', 'terminus'),
  path.join(REPO_ROOT, 'cc'),
  path.join(REPO_ROOT, 'lib'),
]);
```

## Discretion Recommendations

### config.json and VERSION placement
**Recommendation:** Keep in `dynamo/` directory (which becomes a "dynamo meta" directory containing only config.json, VERSION, migrations/, and tests/). Alternative: move to `lib/`. Keeping in `dynamo/` avoids changing the config loading path in core.cjs (which uses `DYNAMO_DIR` constant pointing to `~/.claude/dynamo/`). The installed config.json lives at `~/.claude/dynamo/config.json` regardless -- the repo location is less critical since install generates it fresh.

### stages.cjs placement
**Recommendation:** `subsystems/terminus/stages.cjs`. It is consumed exclusively by health-check.cjs and diagnose.cjs, both of which move to terminus/. Keeping it with its consumers reduces cross-subsystem imports.

### Hook handlers placement
**Recommendation:** Keep all 5 hook handlers in `subsystems/ledger/hooks/` for now. The CONTEXT.md explicitly says "module internals are NOT refactored" and the functional Ledger/Assay split is deferred to 1.3-M2. Moving handlers to their eventual subsystems (prompt-augment to Reverie, etc.) would require refactoring their internal requires to import from multiple subsystems, which contradicts the "move only" constraint. The dispatcher in `cc/hooks/dynamo-hooks.cjs` routes to handlers via `resolve('ledger', 'hooks')` -- this is a single path to update.

### Test directory organization
**Recommendation:** Do NOT reorganize tests in Phase 19. Tests stay in `dynamo/tests/` with their current subdirectory structure. Update the test runner command in dynamo.cjs if needed, but do not move test files. This aligns with the REQUIREMENTS.md "Out of Scope" entry: "Test file relocation: Update require paths incrementally, don't move test files."

### SYNC_PAIRS structure
**Recommendation:** Use lib/layout.cjs to generate SYNC_PAIRS from the layout definition. Root-level files (dynamo.cjs) get a special "root files only" pair that copies specific files rather than walking a directory tree. This prevents accidental sync of .planning, .git, etc.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ad-hoc `resolveCore()` per file | Centralized `lib/resolve.cjs` | Phase 18 | All path resolution goes through resolver |
| 3-directory layout (dynamo/ledger/switchboard) | 6-subsystem layout (subsystems/*/cc/lib/) | Phase 19 (this phase) | Aligns with PRD architecture |
| Separate repo and deployed layout maps | Unified layout (deployed mirrors repo) | Phase 19 (this phase) | Eliminates dual-layout detection complexity |
| SYNC_PAIRS hardcoded in sync.cjs | SYNC_PAIRS from lib/layout.cjs | Phase 19 (this phase) | Single source of truth for paths |

## Open Questions

1. **dynamo.cjs at repo root: how does install.cjs deploy it?**
   - What we know: dynamo.cjs moves from `dynamo/` to repo root. Currently `copyTree(dynamo/, LIVE_DIR, ...)` copies it along with everything in dynamo/.
   - What's unclear: After restructure, dynamo.cjs is at repo root but config.json and VERSION may remain in `dynamo/`. Need explicit handling for root-level .cjs files.
   - Recommendation: Install.cjs copies dynamo.cjs explicitly: `fs.copyFileSync(path.join(REPO_ROOT, 'dynamo.cjs'), path.join(LIVE_DIR, 'dynamo.cjs'))`. Config/VERSION handled separately.

2. **core.cjs re-exports: do they still work after scope.cjs becomes a sibling in lib/?**
   - What we know: core.cjs currently does `require(resolve('ledger', 'scope.cjs'))` to re-export SCOPE. After restructure, scope.cjs is at `lib/scope.cjs` -- same directory as core.cjs. The resolve call becomes `resolve('lib', 'scope.cjs')`.
   - What's unclear: Whether the Object.assign circular dep pattern still applies when both files are in lib/. Likely yes -- scope.cjs is standalone (no core.cjs require), so there's no actual cycle to break.
   - Recommendation: Update re-export paths and verify with circular dep test. The scope.cjs <-> core.cjs pair may drop from the allowlist since scope.cjs has zero imports from core.cjs.

3. **dynamo/tests/ REPO_ROOT calculation**
   - What we know: Tests calculate `REPO_ROOT = path.join(__dirname, '..', '..')`. This resolves from `dynamo/tests/` to the repo root.
   - What's unclear: Whether any tests use `REPO_ROOT + '/dynamo/core.cjs'` style hardcoded paths that will break when core.cjs moves.
   - Recommendation: Grep all test files for hardcoded paths to moved files. Update to use new paths.

4. **dynamo.cjs test command: how to find tests after restructure?**
   - What we know: dynamo.cjs `test` case runs `node --test` on `path.join(__dirname, 'tests', ...)`. If dynamo.cjs moves to repo root, `__dirname` changes from `dynamo/` to the repo root, so `path.join(__dirname, 'tests', ...)` would resolve to `<repo>/tests/` (which doesn't exist) instead of `<repo>/dynamo/tests/`.
   - Recommendation: Update the test path in dynamo.cjs to use `path.join(__dirname, 'dynamo', 'tests', ...)` after dynamo.cjs moves to root. Or use the resolver: `resolve('dynamo', 'tests')` -- but tests/ is not a subsystem. Simplest: hardcode `path.join(__dirname, 'dynamo', 'tests', ...)`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (built-in, Node.js 22+) |
| Config file | none (no config needed for node:test) |
| Quick run command | `node --test dynamo/tests/*.test.cjs` |
| Full suite command | `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARCH-01 | Directory tree matches target layout | unit | `node --test dynamo/tests/boundary.test.cjs` | Yes (needs update) |
| ARCH-04 | lib/layout.cjs serves as single source of truth | unit | `node --test dynamo/tests/resolve.test.cjs` | Partially (needs layout.cjs tests) |
| ARCH-05 | Sync works with new layout | unit | `node --test dynamo/tests/switchboard/sync.test.cjs` | Yes (needs SYNC_PAIRS update) |
| ARCH-06 | Install works with new layout | unit | `node --test dynamo/tests/switchboard/install.test.cjs` | Yes (needs copyTree update) |
| ARCH-07 | All tests pass (398+ green) | full suite | `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs` | Yes |

### Sampling Rate
- **Per task commit:** `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs`
- **Per wave merge:** Full suite (same as above -- this is the full suite)
- **Phase gate:** Full suite green (398+ pass, 0 fail)

### Wave 0 Gaps
- [ ] `lib/layout.cjs` tests -- new module needs test coverage
- [ ] Updated boundary.test.cjs assertions for new directory structure
- [ ] Updated circular-deps.test.cjs scan directories and allowlist paths

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all 27 production .cjs files, all 29 test files, all configuration files
- `lib/resolve.cjs` -- current resolver implementation with 8-subsystem layout map
- `switchboard/sync.cjs` -- current SYNC_PAIRS structure (4 pairs)
- `switchboard/install.cjs` -- current 8-step deployment pipeline with copyTree calls
- `claude-config/settings-hooks.json` -- current hook command paths
- `dynamo/tests/boundary.test.cjs` -- current boundary enforcement assertions
- `dynamo/tests/circular-deps.test.cjs` -- current scan directories and allowlist
- `.planning/research/DYNAMO-PRD.md` -- target directory structure (section 2.2)
- `.planning/phases/19-six-subsystem-directory-restructure/19-CONTEXT.md` -- locked decisions

### Secondary (MEDIUM confidence)
- `.planning/research/SWITCHBOARD-SPEC.md` -- cc/ adapter directory ownership
- `.planning/research/TERMINUS-SPEC.md` -- infrastructure file ownership mapping
- `.planning/research/ASSAY-SPEC.md` -- read operation file mapping
- `.planning/research/LEDGER-SPEC.md` -- write operation file narrowing

### Tertiary (LOW confidence)
- None -- all findings are from direct codebase inspection and project documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, pure restructure of existing CJS codebase
- Architecture: HIGH - target layout precisely defined in PRD and CONTEXT.md; every file mapped
- Pitfalls: HIGH - identified from direct code analysis of bootstrap patterns, resolver, sync, install, and test files

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable -- internal project restructure, no external dependency changes)
