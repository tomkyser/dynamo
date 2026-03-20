# Phase 20: Management Hardening - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning
**Source:** Auto-mode (recommended defaults selected)

<domain>
## Phase Boundary

Self-contained dependency management and input sanitization protect the system from environment issues and prompt injection. Three requirements: MGMT-01 (dependency verification), MGMT-08a (input sanitization), MGMT-08b (prompt injection boundary markers).

</domain>

<decisions>
## Implementation Decisions

### Dependency Verification (MGMT-01)
- Node.js version check runs in both `dynamo install` and `dynamo health-check`
- Minimum version: Node.js 22.x (LTS -- required for node:test, future node:sqlite)
- Graphiti dependency status: check Docker container reachable + API responding, report pass/fail with actionable remediation message
- On version mismatch: warn and continue during install (don't block deployment); report as stage failure during health-check (informational, not fatal to overall health)
- Version check is a new stage added to the existing stage pipeline in both install.cjs and health-check.cjs

### Input Sanitization (MGMT-08a)
- Validation lives in the dispatcher (`cc/hooks/dynamo-hooks.cjs`) before routing to any handler
- Required field validation: `hook_event_name` must be present and one of the known event enum (SessionStart, UserPromptSubmit, PostToolUse, PreCompact, Stop)
- Type checks on optional fields: `tool_name` (string), `tool_input` (object), `cwd` (string)
- Field length limits: `tool_input` string values capped at 100KB, `cwd` capped at 4096 chars, `hook_event_name` at 64 chars
- On invalid input: log violation details to `hook-errors.log` via `logError()`, exit 0 silently (never block Claude Code)
- Reject malformed JSON early (before any handler is loaded) -- the existing try/catch around `JSON.parse(input)` already handles parse failures, but should log the violation type specifically

### Prompt Injection Boundary (MGMT-08b)
- Boundary markers wrap all `additionalContext` output (stdout) from hooks
- Dispatcher wraps all handler stdout in boundary markers (single enforcement point, not per-handler)
- Marker format: structured tags that clearly delimit Dynamo's injected content from user/system content
- All stdout-writing hooks affected: session-start, prompt-augment, preserve-knowledge
- Existing markers like `[GRAPHITI MEMORY CONTEXT]` and `[RELEVANT MEMORY]` are preserved inside the boundary-wrapped content (they serve as section labels within the injection, not as security boundaries)
- The boundary markers should make it clear to Claude that the content inside is from Dynamo's memory system, not from user instructions

### Claude's Discretion
- Exact boundary marker tag names and format (XML-style, bracket-style, or other -- choose based on Claude Code's additionalContext parsing behavior)
- Whether to add a canary/nonce to boundary markers for tamper detection
- Exact error message wording for dependency check failures
- Whether the Node.js version check should also verify `node:test` availability as a smoke test
- Exact field length limit values (100KB/4096/64 are starting points -- adjust based on observed Claude Code input sizes)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture and Security
- `.planning/research/DYNAMO-PRD.md` -- Section 6.5 (Security: jailbreak/hijacking protection, toggle gate, graceful degradation)
- `.planning/research/SWITCHBOARD-SPEC.md` -- Section 3.3 (Event routing, dispatcher pattern, additionalContext injection flow), Section 4.3 (Hook handler response schema)
- `.planning/research/FEATURES.md` -- MGMT-01 and MGMT-08 feature analysis rows (dependency management and jailbreak protection)

### Current Implementation
- `cc/hooks/dynamo-hooks.cjs` -- Current dispatcher: JSON.parse, event routing, handler loading, logError
- `subsystems/switchboard/install.cjs` -- Current install pipeline (6+ steps, copyTree, version reading)
- `subsystems/terminus/health-check.cjs` -- Current 6-stage health check pipeline
- `subsystems/ledger/hooks/session-start.cjs` -- stdout injection pattern: `[GRAPHITI MEMORY CONTEXT]`
- `subsystems/ledger/hooks/prompt-augment.cjs` -- stdout injection pattern: `[RELEVANT MEMORY]`
- `subsystems/ledger/hooks/preserve-knowledge.cjs` -- stdout injection pattern: `[PRESERVED KNOWLEDGE]`
- `lib/core.cjs` -- `logError()` function used for hook error logging

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `logError(source, message)` in `lib/core.cjs`: centralized error logging to `hook-errors.log` -- use for all validation failures
- `stages.cjs` in `subsystems/terminus/`: shared stage runner pattern (runStages/runDiagnosticStages) -- Node.js version check should be a new stage
- Existing health-check stages (Docker, Neo4j, API, MCP, env, canary) -- Graphiti dependency check extends this pipeline

### Established Patterns
- All hooks exit 0 regardless of errors (invariant from SWITCHBOARD-SPEC.md)
- Dispatcher is the single entry point; handlers are loaded lazily via `require(path.join(HANDLERS, ...))`
- Input arrives as JSON on stdin; output goes to stdout as plain text (not JSON)
- Install uses step-based pipeline with numbered steps and progress reporting

### Integration Points
- Dispatcher (`cc/hooks/dynamo-hooks.cjs`): validation layer goes between `JSON.parse(input)` and event routing switch
- Install (`subsystems/switchboard/install.cjs`): new dependency check step before file copying
- Health-check (`subsystems/terminus/health-check.cjs`): new Node.js version stage in existing runStages pipeline
- All stdout-writing handlers: boundary wrapping happens in dispatcher after handler returns

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches. The implementation should follow existing patterns (stage pipelines, options-based test isolation, logError for failures).

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 20-management-hardening*
*Context gathered: 2026-03-20 via auto-mode*
