# Phase 5: SDK & Platform Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-23
**Phase:** 05-sdk-platform-infrastructure
**Areas discussed:** Circuit API surface, CLI command design, MCP tool surface, Self-management scope

---

## Circuit API surface

### Q1: What should Circuit expose to modules?

| Option | Description | Selected |
|--------|-------------|----------|
| Facade-only access | Modules receive curated facades, never raw implementations or container | ✓ |
| Container passthrough | Restricted container view — can resolve() but not bind() | |
| Scoped container | Child container scoped to declared dependencies | |

**User's choice:** Facade-only access (Recommended)
**Notes:** None

### Q2: Should Circuit re-export lib/ utilities?

| Option | Description | Selected |
|--------|-------------|----------|
| Re-export lib essentials | ok/err, validate, createContract — single import point | ✓ |
| Modules require lib/ directly | Circuit only handles services/providers | |
| Re-export everything | All of lib/ plus Armature APIs | |

**User's choice:** Re-export lib essentials (Recommended)
**Notes:** None

### Q3: How should Circuit handle module registration?

| Option | Description | Selected |
|--------|-------------|----------|
| Manifest + register callback | Module manifest + register(circuit) callback, dependency verification | ✓ |
| Auto-discovery from directory | Scan modules/ for module.json, auto-register | |
| Explicit bootstrap registration | core/core.cjs explicitly requires each module | |

**User's choice:** Manifest + register callback (Recommended)
**Notes:** None

### Q4: How should Circuit handle module event access?

| Option | Description | Selected |
|--------|-------------|----------|
| Direct Switchboard access | Full facade access, same as core services | |
| Full event proxy | Namespaced emit, tracked subscriptions, auto-cleanup | ✓ |
| Hybrid: direct listen, namespaced emit | Direct for listening, namespaced for emitting | |
| You decide | Claude picks best fit | |

**User's choice:** Full event proxy
**Notes:** User requested deeper analysis of proxy vs non-proxy options before deciding. After detailed trade-off breakdown covering Reverie's usage patterns, subscription tracking, namespace collisions, and cleanup semantics, user chose full proxy.

---

## CLI command design

### Q1: What should the v1 root command set look like?

| Option | Description | Selected |
|--------|-------------|----------|
| Operations-focused | status, health, install, update, version, config. Modules add subcommands | ✓ |
| Domain-grouped | platform status, module list — deeper nesting | |
| Minimal root + module-first | Only status/help at root, everything else namespaced | |

**User's choice:** Operations-focused (Recommended)
**Notes:** None

### Q2: Should Pulley be a reusable CLI framework?

| Option | Description | Selected |
|--------|-------------|----------|
| Reusable framework | Command registration API, modules use it too | ✓ |
| Platform-only CLI | Pulley owns all commands, modules expose through Circuit only | |
| You decide | | |

**User's choice:** Reusable framework (Recommended)
**Notes:** None

### Q3: How should CLI output formatting work?

| Option | Description | Selected |
|--------|-------------|----------|
| Flag-based format selection | --json, --raw flags. Default human-readable | ✓ |
| Env-var based | DYNAMO_OUTPUT controls format | |
| Auto-detect | TTY = human, pipe = JSON | |

**User's choice:** Flag-based format selection (Recommended)
**Notes:** None

### Q4: How should Pulley parse CLI arguments?

| Option | Description | Selected |
|--------|-------------|----------|
| Direct process.argv parsing | v0 validated pattern, zero-dependency | |
| Bun.argv with util.parseArgs | Node built-in, structured | |
| You decide | | ✓ |

**User's choice:** You decide
**Notes:** None

---

## MCP tool surface

### Q1: Relationship between Pulley's MCP and Wire's channel-server?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate MCP servers | Pulley for platform ops, Wire for inter-session comms | ✓ |
| Extend Wire's channel server | Add platform tools to Wire's existing server | |
| Single server, namespaced tools | One server, both register into it | |

**User's choice:** Separate MCP servers (Recommended)
**Notes:** User added: "Conductor is responsible for the actual infrastructure side just like it should be for Wire, but everything else I agree with." Clarification that Conductor manages MCP server lifecycle (start/stop, ports) for both servers.

### Q2: Which platform operations as MCP tools in v1?

| Option | Description | Selected |
|--------|-------------|----------|
| Health & diagnostics | dynamo_health, dynamo_diagnose | ✓ |
| Status & version | dynamo_status, dynamo_version | ✓ |
| Config management | dynamo_config_get, dynamo_config_set | |
| Module operations | dynamo_module_list, dynamo_module_status | ✓ |

**User's choice:** Health & diagnostics, Status & version, Module operations (multi-select)
**Notes:** Config management excluded from v1 MCP surface

### Q3: Module MCP tool registration?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, via Circuit | circuit.registerMcpTool() during registration | ✓ |
| Module MCP tools are separate | Each module runs own MCP server | |
| Defer to M2 | Only platform tools in v1 | |

**User's choice:** Yes, via Circuit (Recommended)
**Notes:** None

---

## Self-management scope

### Q1: Health check aggregation approach?

| Option | Description | Selected |
|--------|-------------|----------|
| Lifecycle-driven aggregation | Iterate booted facades, aggregate healthCheck() results | |
| Dedicated health service | HealthMonitor service with polling and caching | |
| You decide | | ✓ |

**User's choice:** You decide
**Notes:** None

### Q2: GitHub Releases versioning?

| Option | Description | Selected |
|--------|-------------|----------|
| Forge-based with GitHub API | GitHub REST API via fetch, semver releases/pre-releases | ✓ |
| Tag-only (no GitHub API) | Version from git tags only, no network calls | |
| You decide | | |

**User's choice:** Forge-based with GitHub API (Recommended)
**Notes:** None

### Q3: Self-management scope for ecosystem?

| Option | Description | Selected |
|--------|-------------|----------|
| Full ecosystem management | Core + plugins + modules + extensions via Relay + Forge | ✓ |
| Core only, manual additions | Relay for core, manual git submodule for additions | |
| Core + modules, not plugins | Modules auto-managed, plugins user-managed | |

**User's choice:** Full ecosystem management (Recommended)
**Notes:** None

## Claude's Discretion

- Health check aggregation approach (lifecycle-driven vs dedicated service)
- CLI argument parsing strategy (process.argv vs util.parseArgs)
- MCP server port/transport configuration
- Help text generation internals
- Diagnostic report formatting

## Deferred Ideas

- Config management MCP tools (dynamo_config_get/set) -- excluded from v1 MCP surface to keep scope focused on read-only operations
