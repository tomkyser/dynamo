# Phase 2: Foundational Services - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the four services that form the substrate for all other services: event dispatch (Switchboard), I/O bridging (Commutator), state management (Magnet), and filesystem access (Lathe). These are infrastructure services with no feature logic — they provide the communication, state, and I/O primitives that Phase 3+ services consume. All services follow a uniform contract pattern with lifecycle methods and options-based DI.

</domain>

<decisions>
## Implementation Decisions

### Switchboard Event Model
- **D-01:** Colon-delimited event namespaces (e.g., 'hook:post-tool-use', 'file:changed', 'state:updated'). Simple, grep-friendly, supports wildcard matching on prefixes.
- **D-02:** Two event types: actions (fire-and-forget, all handlers run) and filters (interceptable data pipeline, handlers run in priority order and can transform or halt the payload).
- **D-03:** Numeric priority for filter handlers. Lower number = runs first, default 100. Actions ignore priority (all fire in registration order).
- **D-04:** Filter handlers can halt the pipeline by returning false or an Err result. Subsequent handlers don't run. The rejected payload returns to the emitter as Err.
- **D-05:** Prefix wildcard support. Listen on 'hook:*' to catch all 'hook:' events. Only suffix wildcard (*) supported — no regex.

### Commutator Hook Mapping
- **D-06:** Tool-aware semantic routing. Commutator inspects tool_name/tool_input in PreToolUse/PostToolUse and emits domain-specific events (e.g., PostToolUse+Write -> 'file:changed', PostToolUse+Bash -> 'shell:executed'). Other hooks pass through with category-level events ('hook:session-start', 'hook:stop', etc.).
- **D-07:** Bidirectional from the start. Commutator handles both inbound (hook payloads -> Switchboard events) and outbound (Switchboard events -> output mechanisms).
- **D-08:** Outbound via event-to-output adapter pattern. Commutator listens for specific Switchboard events (e.g., 'output:inject-context') and translates them to the appropriate output mechanism (stdout for hooks, Wire for inter-session later). Decoupled from stdout specifically.

### Magnet State Management
- **D-09:** Provider interface defined now. Ships with a built-in JSON file provider (via Lathe) as default fallback. When Ledger/Journal arrive in Phase 3, they register as providers through the same contract. Magnet works end-to-end immediately with persistence.
- **D-10:** Three-tier state scoping: global (persists always), session (tied to session ID, cleared on end), and module (namespaced by module name, e.g., 'reverie.selfModel'). Aligns with Reverie's three-session architecture.
- **D-11:** All state mutations emit Switchboard events. Every set/delete emits 'state:changed' with scope, key, old value, new value. Enables reactive patterns without polling.

### Service Contract Pattern
- **D-12:** Four lifecycle methods for every service: init(options) for dependency injection setup, start() to begin operation, stop() for cleanup, healthCheck() for diagnostics. init returns Result. Aligns with Phase 4's register/boot two-phase lifecycle (FWK-03).
- **D-13:** Dependencies passed via options object at init(). e.g., Commutator gets { switchboard }. Validated with createContract at init-time. Consistent with Phase 1's options-based DI pattern.
- **D-14:** Directory per service: core/services/switchboard/switchboard.cjs + __tests__/. Room for internal helpers, constants, type definitions.
- **D-15:** Self-validating services. Each service factory validates its own implementation against its contract shape using createContract before returning. Catches wiring bugs immediately.

### Claude's Discretion
- Internal event name dictionary (specific colon-delimited names for each hook type and tool combination)
- Commutator's tool-to-domain mapping table (which tools map to which domain events)
- Magnet's JSON file provider implementation details (file location, write frequency, serialization format)
- Lathe's specific method signatures (which Bun APIs to wrap, what to add beyond Bun.file/Bun.write)
- Whether healthCheck() returns a simple boolean or a structured diagnostic object

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture
- `.claude/new-plan.md` -- The architecture plan. Absolute canon. Defines service roles, engineering principles, and layer structure. Services import Core Library only.
- `.claude/reverie-spec-v2.md` -- The Reverie module specification. Canon. Defines what these services ultimately serve -- informs Switchboard event patterns, Magnet state shapes, and Wire communication needs.

### Project Definition
- `.planning/PROJECT.md` -- Core value, constraints, validated v0 patterns, key decisions
- `.planning/REQUIREMENTS.md` -- SVC-01 through SVC-04 requirement definitions and success criteria

### Prior Phase
- `.planning/phases/01-core-library/01-CONTEXT.md` -- Phase 1 decisions (D-01 through D-13) that carry forward: Result types, contract validation, options-based DI, CJS conventions

### Technology
- `.planning/ROADMAP.md` -- Phase 2 success criteria and cross-milestone dependency table (Switchboard -> M2 hooks, Magnet -> M2 Self Model)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/result.cjs` -- ok/err/isOk/isErr/unwrap for all service error communication
- `lib/contract.cjs` -- createContract for service interface validation at init-time
- `lib/schema.cjs` -- validate for config shape checking
- `lib/paths.cjs` -- discoverRoot/createPaths for locating service directories
- `lib/config.cjs` -- loadConfig for hierarchical config loading
- `lib/index.cjs` -- barrel import for all 13 lib/ exports

### Established Patterns
- Options-based DI: services receive dependencies via options object (validated in v0 and Phase 1)
- Result types for error communication: functions return Ok/Err, never throw for expected failures
- Contract validation at bind-time: createContract validates interface shape
- TDD with bun:test: tests written first per Phase 1 pattern
- spyOn(fs, 'existsSync') for mocking node:fs (mock.module doesn't intercept Bun's native fs)

### Integration Points
- `lib/` exports -- all four services import from lib/index.cjs or individual modules
- `config.json` at Dynamo root -- services may read service-specific config sections
- `.dynamo` marker file -- used by paths.cjs for root discovery
- `core/services/` directory -- new, created by this phase

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 02-foundational-services*
*Context gathered: 2026-03-22*
