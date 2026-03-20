# Phase 21: SQLite Session Index - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning
**Source:** Auto-mode (recommended defaults selected)

<domain>
## Phase Boundary

Replace the flat-file `sessions.json` with SQLite-backed session storage using `node:sqlite` DatabaseSync API. Maintain identical query interface (listSessions, viewSession, labelSession, indexSession, backfillSessions, generateAndApplyName). Provide one-time idempotent migration from existing JSON file. Fall back transparently to JSON if `node:sqlite` is unavailable. Four requirements: DATA-01 (SQLite storage), DATA-02 (identical interface), DATA-03 (migration), DATA-04 (graceful fallback).

</domain>

<decisions>
## Implementation Decisions

### Storage Ownership
- Terminus owns the SQLite database file, schema definition, connection management, and migration logic (new file: `subsystems/terminus/session-store.cjs`)
- Assay owns the query interface -- `subsystems/assay/sessions.cjs` switches from direct JSON I/O to calling session-store functions
- Database file location: `~/.claude/graphiti/sessions.db` (co-located with current `sessions.json`)
- Connection management: module-level singleton via DatabaseSync (synchronous API matches existing sync I/O pattern in sessions.cjs)

### Migration Strategy
- Migration runs during `dynamo install` as a new step (idempotent -- safe to run multiple times)
- Original `sessions.json` renamed to `sessions.json.migrated` after successful migration (backup, not deletion -- follows established backup-before-modify pattern)
- Corrupt or partial JSON entries: skip with warning, migrate valid entries, log skipped entries via `logError()`
- All inserts wrapped in a single SQLite transaction for atomicity (all-or-nothing on interruption)

### Fallback Behavior
- Fully transparent: if `node:sqlite` import fails at require time, sessions.cjs continues using JSON I/O with no user-visible change (DATA-04)
- Fallback logged once on first detection via `logError()` -- then operates silently (visibility without spam)
- No explicit force-JSON flag -- detection is automatic based on `node:sqlite` availability
- Health-check reports which storage backend is active (SQLite or JSON fallback) for operational visibility

### Schema Design
- Table `sessions` with columns matching current JSON fields: `timestamp TEXT PRIMARY KEY, project TEXT, label TEXT, labeled_by TEXT, named_phase TEXT`
- Index on `project` column for filtered listing queries
- WAL mode enabled for better concurrent read performance
- No additional metadata columns (created_at, updated_at) -- timestamp already serves as identifier and ordering key; match existing data model exactly

### Claude's Discretion
- Whether to add a `PRAGMA` for journal size limits or other SQLite tuning
- Exact error message wording for migration step output
- Whether session-store.cjs exports a class or functional API (both viable given the singleton pattern)
- Test strategy details (unit tests for session-store.cjs, integration tests for migration, update existing sessions.test.cjs)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture and Ownership
- `.planning/research/ASSAY-SPEC.md` -- Section 1 (Assay as read-side), Section 7.1 (SQLite session index ownership: Terminus owns storage, Assay owns queries)
- `.planning/research/TERMINUS-SPEC.md` -- Section 2.3 (interface contracts), Section 7.1 (SQLite ownership question and recommendation)
- `.planning/research/DYNAMO-PRD.md` -- Section 6.5 (security/graceful degradation), subsystem boundary rules

### Requirements
- `.planning/REQUIREMENTS.md` -- DATA-01 through DATA-04 (SQLite storage, identical interface, migration, fallback)

### Current Implementation
- `subsystems/assay/sessions.cjs` -- Current JSON-based session management (245 LOC, 9 exported functions)
- `dynamo/tests/ledger/sessions.test.cjs` -- Existing session test suite (must continue passing)
- `lib/core.cjs` -- Re-exports `loadSessions`/`listSessions` from assay/sessions.cjs; `logError()` for error logging
- `subsystems/ledger/hooks/session-summary.cjs` -- Caller: `indexSession`, `generateAndApplyName`
- `subsystems/ledger/hooks/prompt-augment.cjs` -- Caller: `generateAndApplyName`
- `subsystems/switchboard/install.cjs` -- Migration step will be added here
- `subsystems/terminus/health-check.cjs` -- Storage backend reporting will be added here

### Callers of sessions.cjs (integration points)
- `dynamo.cjs:382` -- CLI router requires sessions.cjs for session commands
- `lib/core.cjs:342` -- Re-exports loadSessions/listSessions for boundary compliance
- `subsystems/ledger/hooks/prompt-augment.cjs:12` -- generateAndApplyName
- `subsystems/ledger/hooks/session-summary.cjs:13` -- indexSession, generateAndApplyName

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `subsystems/assay/sessions.cjs`: 9 exported functions (loadSessions, saveSessions, indexSession, listSessions, viewSession, labelSession, backfillSessions, generateAndApplyName, SESSIONS_FILE). All accept `options.filePath` for test isolation -- this pattern extends naturally to `options.dbPath` for SQLite.
- `lib/core.cjs`: `logError()` for error logging, `output()` for formatted output
- `subsystems/terminus/stages.cjs`: Stage runner pattern (runStages) for health-check additions
- `subsystems/switchboard/install.cjs`: Step-based pipeline for adding migration step

### Established Patterns
- Options-based test isolation: all stage/module functions accept options parameter with overrides (tmpdir for filesystem). SQLite tests can use in-memory DB or tmpdir-based `.db` file.
- Atomic write pattern (tmp + rename) in saveSessions -- SQLite transactions serve the same purpose
- Synchronous I/O throughout sessions.cjs -- `node:sqlite` DatabaseSync is synchronous, so no async migration needed for core CRUD
- `backfillSessions` is the only async function (calls nameGenerator) -- its I/O can still be sync SQLite

### Integration Points
- `subsystems/assay/sessions.cjs`: Primary change target -- internal I/O switches from JSON to SQLite, exported interface stays identical
- `subsystems/terminus/session-store.cjs`: New file -- DB init, schema creation, prepared statements, migration logic
- `subsystems/switchboard/install.cjs`: New migration step after file copying
- `subsystems/terminus/health-check.cjs`: New check reporting storage backend type
- `lib/core.cjs`: Re-exports from sessions.cjs -- should need no changes if interface is preserved
- `dynamo/tests/ledger/sessions.test.cjs`: Existing tests must pass unchanged against SQLite backend

### Environment
- Node.js v24.13.1 -- `node:sqlite` DatabaseSync is available (experimental warning expected)
- `sessions.json` lives at `~/.claude/graphiti/sessions.json` (constant `SESSIONS_FILE` in sessions.cjs)

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches. Implementation should follow existing patterns (options-based injection, step pipelines, stage runners, logError for failures). The `node:sqlite` experimental warning is expected and acceptable.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 21-sqlite-session-index*
*Context gathered: 2026-03-20 via auto-mode*
