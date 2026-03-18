# Phase 15: Update System - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Dynamo can check for updates, apply upgrades, and roll back if something goes wrong -- without manual user intervention. Covers version checking against GitHub releases, a dual-mode upgrade flow (dev repo vs general user tarball), version-keyed migration scripts for breaking changes, and snapshot-based rollback with automatic trigger on failure.

</domain>

<decisions>
## Implementation Decisions

### Version checking
- Check latest version via **GitHub releases API** (no auth needed for public repo)
- Manual only: `dynamo check-update` command -- no automatic background checks
- Output: inline status -- current vs latest version + one-line summary (e.g., "Dynamo 0.1.0 -> 0.2.0 available. Run dynamo update to upgrade.")
- Graceful fail when offline/rate-limited: print "Unable to check for updates (network unavailable)" and exit 0 -- never block the user
- Standard `--format json` flag for structured output (matches existing CLI pattern)

### Upgrade flow
- Two modes, auto-detected:
  - **Dev mode**: If running dynamo.cjs is inside a git repo with remote matching `tomkyser/dynamo`, use `git pull` in the local repo clone, then run install.cjs to deploy
  - **User mode**: If no repo clone detected, download GitHub release tarball to tmp, extract, run install from extracted source
- Auto-detection: check if the script's directory is inside a git repo with the known remote -- no config flag needed
- After pulling new code, **automatically run install.cjs** to deploy to `~/.claude/dynamo/` -- one command does everything (`dynamo update`)
- Matches the self-management core value: user runs one command, everything happens

### Migration strategy
- **Version-keyed migration scripts** in `dynamo/migrations/` directory
  - Files named like `0.1.0-to-0.2.0.cjs`
  - Each exports a function that transforms config and/or settings
  - Update runner applies migrations in sequence (from current version to target version)
- Migrations handle both **config.json** and **settings.json** (hook registrations)
  - Config transforms for structural changes (renames, restructures, new keys)
  - Settings re-merge via existing `mergeSettings()` for hook registration changes
- **Abort + rollback on failure**: if any migration step fails, abort the entire update and trigger rollback
  - Clear error message about which migration failed and why
  - No partial migrations -- all or nothing

### Rollback
- **Pre-update snapshot**: backup `~/.claude/dynamo/` (all deployed code), `config.json`, and `settings.json` before any update begins
  - Stored in `~/.claude/dynamo-backup/` (single backup, overwritten each update)
- **One snapshot retained**: only the previous version -- matches the existing settings.json.bak pattern
- **Dual trigger**:
  - **Automatic**: on update failure (migration error, install error, health check failure)
  - **Manual**: `dynamo rollback` command for user-initiated rollback after a successful but problematic update
- **Post-update health check**: after install completes, run the existing 6-stage health check
  - If health check fails, auto-trigger rollback
  - Reuses existing `health-check.cjs` -- no new verification code needed

### Claude's Discretion
- Exact GitHub API URL construction and response parsing
- Tarball extraction implementation details (Node built-in tar handling vs exec)
- Migration script internal structure and execution harness
- Backup directory cleanup and edge cases
- Error message formatting and verbosity levels
- How to handle version comparison (semver parsing approach)
- Test structure and isolation patterns for update/rollback flows

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` -- STAB-05 (Update/upgrade system -- version checks, migration, rollback)

### Phase success criteria
- `.planning/ROADMAP.md` -- Phase 15 section: 3 success criteria (version check, upgrade with migration, rollback mechanism)

### Existing infrastructure (reuse/extend)
- `switchboard/install.cjs` -- Existing installer (copyTree, generateConfig, mergeSettings, rollback) -- upgrade builds on this
- `switchboard/sync.cjs` -- Bidirectional sync logic -- context for how repo <-> live deployment works
- `switchboard/health-check.cjs` -- 6-stage health check -- post-update verification
- `dynamo/dynamo.cjs` -- CLI router -- add new commands here (check-update, update)
- `dynamo/core.cjs` -- Shared substrate (loadConfig, output, error, fetchWithTimeout, isEnabled)
- `dynamo/VERSION` -- Current version file (0.1.0)
- `dynamo/config.json` -- Runtime config template with version field

### Architecture and conventions
- `.planning/codebase/CONVENTIONS.md` -- CLI router pattern, output pattern, toggle gate, test conventions
- `.planning/codebase/STRUCTURE.md` -- Repo layout vs deployed layout, key files
- `.planning/PROJECT.md` -- Core value (self-management), key decisions (atomic writes, zero npm deps, CJS)

### Prior phase context
- `.planning/phases/10-operations-and-cutover/10-CONTEXT.md` -- Install, sync, settings merge decisions
- `.planning/phases/12-structural-refactor/12-CONTEXT.md` -- 3-directory structure, toggle mechanism
- `.planning/phases/14-documentation-and-branding/14-CONTEXT.md` -- Documentation and CLAUDE.md decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `switchboard/install.cjs` `copyTree()`: Recursive directory copy with excludes -- reuse for backup snapshot creation
- `switchboard/install.cjs` `mergeSettings()`: Idempotent settings.json hook merge -- reuse in migration path
- `switchboard/install.cjs` `generateConfig()`: Config generation from .env -- reuse in post-migration config rebuild
- `switchboard/install.cjs` `run()`: Full install pipeline -- called after upgrade pull
- `switchboard/install.cjs` `restoreSettings()`: Settings.json backup restore -- extend for full rollback
- `switchboard/health-check.cjs` `run()`: 6-stage health check -- post-update verification
- `dynamo/core.cjs` `fetchWithTimeout()`: HTTP with timeout -- reuse for GitHub API calls
- `dynamo/core.cjs` `safeReadFile()`: Safe file read -- reuse for VERSION file reading
- `dynamo/core.cjs` `loadConfig()`: Config loading with defaults -- reuse for version comparison

### Established Patterns
- GSD router pattern (switch/case on argv[2]) -- add `check-update` and `update` commands
- `output()` with JSON to stdout, human text to stderr -- follow for all new commands
- Atomic write (tmp + rename) pattern from install.cjs -- use for backup operations
- Options-based test isolation -- all new modules accept options for test overrides
- `resolveCore()` dual-path resolution -- new modules follow same pattern

### Integration Points
- `dynamo/dynamo.cjs` -- Add `check-update` and `update` commands to switch/case router
- `dynamo/VERSION` -- Read for current version comparison
- `~/.claude/dynamo-backup/` -- New directory for pre-update snapshots
- `dynamo/migrations/` -- New directory for version-keyed migration scripts
- `COMMAND_HELP` object in dynamo.cjs -- Add help text for new commands
- Existing `rollback` command in dynamo.cjs -- Enhance to handle full version rollback (not just legacy Python)

</code_context>

<specifics>
## Specific Ideas

- The update system must serve two audiences: dev users (have the git repo clone) and general users (only have ~/.claude/dynamo/ deployed). Auto-detection determines the path, not user config.
- "One command does everything" -- `dynamo update` should be the only thing the user ever needs to run. Check version, pull code, run migrations, install, verify, rollback on failure.
- Existing `dynamo rollback` command needs to be evolved from its legacy-specific behavior (settings.json.bak + Python restoration) to the new full-snapshot rollback.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 15-update-system*
*Context gathered: 2026-03-18*
