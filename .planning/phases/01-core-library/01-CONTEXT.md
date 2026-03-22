# Phase 1: Core Library - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the pure foundation that every layer imports — shared error/result patterns, contract validation, path resolution with module identity, and configuration loading with hierarchical precedence. This is a library with no feature logic: patterns and standardization only. All code runs on Bun >= 1.3.10 with bun:test.

</domain>

<decisions>
## Implementation Decisions

### Error & Result Patterns
- **D-01:** Result types (Ok/Err) for communicating failure across layers. Functions return `{ok: true, value}` or `{ok: false, error}`. Exceptions reserved for truly unexpected crashes only — not for expected failures. Aligns with deterministic routing principle.
- **D-02:** Result errors carry typed error codes with structure: `{code, message, context}`. Codes defined per domain in lib/. Downstream code switches on codes, never parses message strings.

### Contract Patterns
- **D-03:** Factory functions + shape validation for contracts in CJS. Contracts defined as plain objects with required/optional method names. Validation happens at bind-time (factory creation), not at import-time. Aligns with options-based DI validated in v0.

### Path Resolution & Identity
- **D-04:** Central path registry (`lib/paths.cjs`) that computes all directory locations from a discovered root. Every component imports paths and asks for what it needs — no hardcoded paths anywhere.
- **D-05:** Root discovery via marker file search — walk up from `__dirname` looking for `.dynamo` marker file or `config.json`. Works regardless of install location (dev repo vs deployed).
- **D-06:** The architecture plan's logical import paths (e.g., `Dynamo/Services/Assay/assay.cjs`) are deferred to Phase 4 (Armature). Phase 1 uses actual `require()` paths with the central path registry.

### Configuration Design
- **D-07:** Deep merge with override for 5 precedence levels (defaults < global config.json < project .dynamo/config.json < env vars DYNAMO_* < runtime options). Arrays are replaced, not concatenated. Env vars use `DYNAMO_` prefix with dot-path convention.
- **D-08:** Config validation at load time — fail fast with clear errors. Boot never completes with invalid config. Returns Result type on failure.
- **D-09:** Minimal built-in schema validator in lib/ (zero npm dependencies). Handles type checks, required fields, defaults, and nested objects. Zod reserved for MCP SDK boundary in later phases.

### CJS Module Conventions
- **D-10:** Named exports objects (`module.exports = { ... }`) as the primary export pattern. No default exports. Consistent, destructurable, easy to test.
- **D-11:** JSDoc type annotations (`@param`, `@returns`, `@typedef`) on all public API exports and contract definitions. Internal helpers can skip JSDoc.
- **D-12:** `Object.freeze()` on contract instances (validated factory output) only. Utility exports and config objects are not frozen — immutability by convention for those.
- **D-13:** `'use strict'` at the top of every file (stated in architecture plan, confirmed here).

### Claude's Discretion
- Internal file organization within `lib/` (how many files, what groups together)
- Specific error code naming conventions (UPPER_SNAKE is implied but Claude can refine)
- Whether `discoverRoot()` caches its result or recomputes

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture
- `.claude/new-plan.md` — The architecture plan. Absolute canon. Defines layer structure, engineering principles, service/provider roles, and the Core Library scope ("shared resources, dependencies and common utilities, no feature or functionality").

### Module Specification
- `.claude/reverie-spec-v2.md` — The Reverie module specification. Canon. Defines what the platform ultimately serves — informs which patterns lib/ must support.

### Project Definition
- `.planning/PROJECT.md` — Core value, constraints, validated v0 patterns, key decisions
- `.planning/REQUIREMENTS.md` — LIB-01, LIB-02, LIB-03 requirement definitions and success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield. No existing `lib/` or `core/` directories.

### Established Patterns
- v0 validated: options-based dependency injection, atomic file writes (tmp + rename), `'use strict'` + CJS throughout, zero npm deps for core
- v0 used `node:test` — Phase 1 uses `bun:test` instead (architecture decision)

### Integration Points
- `config.json` at Dynamo root — created by this phase, consumed by every subsequent phase
- `.dynamo` marker file — created by this phase for root discovery
- `lib/` exports — consumed by core/services/ (Phase 2), core/providers/ (Phase 3), and everything above

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-core-library*
*Context gathered: 2026-03-22*
