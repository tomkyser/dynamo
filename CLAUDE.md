<!-- GSD:project-start source:PROJECT.md -->
## Project

**Dynamo**

A self-contained development platform for Claude Code. Dynamo provides the core services, providers, framework, and SDK needed to build modules (like Reverie) and plugins that extend Claude Code's capabilities. It is similar to a game engine — things built with Dynamo are contained within Dynamo as an ecosystem. Dynamo requires at least one Module to provide users with functionality beyond self-management. Plugins extend core capability; modules consume the platform to deliver user-facing features; extensions compose on top of both.

Runtime: **Bun** | Language: **CJS** | Data: **JSON** (structured), **Markdown** (narrative)

**Core Value:** Everything routes through Dynamo. It is the holistic wrapper via its APIs and interfaces — no component bypasses the patterns and paths Dynamo defines. All things integrate at the correct layer, through the correct paths, and in the correct way.

### Constraints

- **Runtime**: Bun — all code runs on Bun, CJS format
- **Subscription**: Claude Max tier required — no paid API dependencies below SDK
- **No npm dependencies**: Platform core uses only Bun/Node built-ins (validated in v0)
- **Git submodules**: Plugins, modules, and extensions are separate repos managed as submodules
- **Engineering principles**: Strict separation of concerns, IoC, DRY, abstraction over lateralization, hardcode nothing (see `.claude/new-plan.md` for full list)
- **Build order**: Core Library first → Services + Providers (parallel) → Framework → SDK → then Modules
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Runtime
| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Bun | >= 1.3.10 (installed: 1.2.3) | JavaScript runtime | Native CJS+ESM interop, built-in SQLite, HTTP/WebSocket server, test runner, 60% faster subprocess spawning than Node. Validated in v0 and Channels PoC. | HIGH |
| CJS (CommonJS) | Standard | Module format | Architecture decision from canon. Bun has first-class CJS support including `require()` of ESM modules -- eliminates the dual-module problem entirely. `'use strict'` in every file. No build step. | HIGH |
### Database
| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| DuckDB via `@duckdb/node-api` | 1.5.0 | Ledger provider (SQL analytics DB) | Embedded, serverless, OLAP-oriented. The new `@duckdb/node-api` package is CJS-compatible (no `type: "module"` in package.json, uses `main` field). Native N-API bindings work in Bun as of v1.2.2. Replaces deprecated `duckdb` npm package. | MEDIUM |
| bun:sqlite | Built-in | Lightweight structured data, caching, metadata | Zero-dependency, synchronous API (inspired by better-sqlite3), 3-6x faster than better-sqlite3. Use for internal platform state (config cache, session tracking, migration state) rather than user-facing data. | HIGH |
### Communication & MCP
| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| `@modelcontextprotocol/sdk` | 1.27.x (v1 line) | MCP server/client for Wire service | Official TypeScript SDK. Dual CJS/ESM exports (`"require": "./dist/cjs/"`, `"import": "./dist/esm/"`). Runs on Bun natively. Validated in Channels PoC. | HIGH |
| Bun.serve (HTTP + WebSocket) | Built-in | Wire relay server, webhook receivers | Zero-dependency HTTP/WebSocket server with native pub/sub. 7x more requests/sec than Node+ws. Validated in Channels PoC relay server. | HIGH |
### Claude Code Integration
| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Claude Code Channels API | v2.1.80+ | Inter-session communication for Wire | Official channel contract: declare `claude/channel` capability, emit `notifications/claude/channel` events. Supports two-way chat bridges, permission relay. Research preview as of 2026-03-20 but Bun is the official runtime for channel plugins. | MEDIUM |
| Claude Code Hooks | Current | Lifecycle integration (SessionStart, PostToolUse, etc.) | JSON stdin/stdout contract. Validated extensively in v0 (515 tests). Zero-dependency integration point. | HIGH |
### Testing
| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| `bun:test` | Built-in | Test runner | Jest-compatible API (describe/it/expect), built-in mocking via `mock()` and `mock.module()`, snapshot testing, 15x faster than Jest. Replaces v0's `node:test` which has limited support in Bun. | HIGH |
### File System & I/O
| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Bun.file / Bun.write | Built-in | Lathe service file operations | Atomic writes, lazy file loading, streaming support. Optimized Zig implementation. Replaces v0's `fs.writeFileSync` + tmp-rename pattern with native atomic semantics. | HIGH |
| `node:fs` | Built-in (compat) | Directory operations, file watching | Bun supports node:fs with 90%+ Node.js test suite pass rate. Use for operations Bun native API does not cover (mkdir, readdir, watch). | HIGH |
### Process & Shell
| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Bun.spawn / Bun.spawnSync | Built-in | Conductor (Docker), Forge (Git) | 60% faster than Node.js child_process. Same posix_spawn(3) foundation. Bun `$` tagged template for shell commands. | HIGH |
| `node:child_process` | Built-in (compat) | Fallback for complex process management | Full compatibility in Bun. Use when Bun.spawn API is insufficient (e.g., fork() for IPC). | HIGH |
### Event System
| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| `node:events` (EventEmitter) | Built-in | Switchboard service, Commutator I/O bus | Standard Node.js EventEmitter, fully compatible in Bun. Synchronous by default, well-understood patterns. No external dependency needed. | HIGH |
### Git Operations
| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Direct git CLI via Bun.spawn | N/A | Forge service, submodule management | Zero-dependency approach. Shell out to `git` binary directly. Avoids npm dependency for git operations. Consistent with v0's pattern of using child_process for git/docker. | HIGH |
## Supporting Libraries
| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| `zod` | 4.x | Schema validation | Required peer dependency for MCP SDK v2 (upcoming). Also useful for config validation, API contract enforcement, runtime type checking in CJS (replaces TypeScript compile-time checks). Start using now to ease v2 migration. | HIGH |
| `@modelcontextprotocol/sdk` | 1.27.x | MCP protocol implementation | Wire service MCP servers and clients. Use v1 now, plan migration path to v2 split packages (`@modelcontextprotocol/server` + `@modelcontextprotocol/client`) when stable. | HIGH |
## Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| `bun:test` | Test runner | Run with `bun test`. Jest-compatible matchers. `--watch` mode for development. |
| `bun --inspect` | Debugger | Built-in WebKit inspector support. Connect via Chrome DevTools. |
| Bun.env | Environment variables | Auto-loads `.env` files. No dotenv package needed. |
## Installation
# Core -- the ONLY npm dependency for platform core
# Ledger provider
# Schema validation (for MCP v2 readiness and runtime type safety)
# No dev dependencies needed -- bun:test is built-in
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@duckdb/node-api` (v1.5) | Old `duckdb` npm package | Never -- deprecated, will not receive DuckDB 1.5.x bindings |
| `@duckdb/node-api` | `@evan/duckdb` (Bun-native) | Only if `@duckdb/node-api` native bindings fail on Bun. Evan's package has 2-6x better perf but is community-maintained, less likely to track DuckDB releases. |
| `bun:sqlite` | `better-sqlite3` | Never for this project -- bun:sqlite is 3-6x faster and zero-dependency |
| `bun:test` | `node:test` | Only if forced to run on Node.js. Bun's node:test compat is incomplete (missing mocking, snapshots). bun:test is the correct choice for a Bun-native project. |
| `bun:test` | Jest / Vitest | Never -- external dependencies, slower (Jest 15x, Vitest 11x slower). |
| Bun.serve | Express / Fastify / Hono | Never for Wire relay -- Bun.serve is zero-dependency with native WebSocket and pub/sub. If Pulley needs REST API framework later, consider Hono (lightweight, Bun-first). |
| Direct git CLI | `simple-git` npm | Only if git command parsing becomes unmanageable. simple-git supports CJS and Bun, but adds ~50KB dependency for something achievable with Bun.spawn. |
| `node:events` EventEmitter | RxJS / EventEmitter3 | Never -- unnecessary complexity/dependency for in-process event dispatch. EventEmitter is sufficient for Switchboard and Commutator. |
| Manual options-based DI | Awilix / InversifyJS | Never -- the validated v0 pattern of options-based injection is simpler, zero-dependency, and CJS-native. Awilix is powerful but adds complexity the architecture does not need. |
| `zod` | `ajv` / `joi` / `yup` | Zod is preferred because it becomes mandatory with MCP SDK v2. Better TypeScript inference (relevant even in CJS with JSDoc). |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| TypeScript compiler / build step | Adds complexity, breaks CJS simplicity, architecture decision is CJS-only | JSDoc type annotations + `@ts-check` if type hints are desired |
| ESM (`import`/`export`) in source files | Architecture decision: CJS throughout. Bun can require() ESM packages, so this only applies to Dynamo's own source code | `require()` / `module.exports` |
| `duckdb` npm package (old) | Deprecated. Last release will be DuckDB 1.4.x (Fall 2025). No 1.5.x support. | `@duckdb/node-api` |
| `node:test` | Incomplete Bun support -- missing mocking, snapshot testing, timer manipulation | `bun:test` |
| `js-yaml` | v0 used this for prompt templates. Bun has no built-in YAML parser, but the architecture plan specifies JSON for structured data and Markdown for narrative | JSON (structured) + Markdown (narrative) as specified in canon |
| Docker Compose library bindings | No mature CJS option. Conductor should shell out to `docker compose` CLI via Bun.spawn | Bun.spawn + `docker compose` CLI |
| Neo4j / Graphiti | v0 dependency. The rewrite uses DuckDB (Ledger) + flat files (Journal) as specified in architecture plan | `@duckdb/node-api` + bun:sqlite + Bun.file |
| OpenRouter API / LLM APIs | Canon explicitly prohibits LLM API dependencies below SDK scope | Claude Code's native capabilities via hooks and channels |
| npm / yarn | Bun is the runtime AND package manager | `bun add`, `bun install`, `bun test`, `bun run` |
## Stack Patterns
- Use `node:events` EventEmitter for internal pub/sub
- Options-based DI for test isolation (validated pattern from v0)
- `'use strict'` + CJS module pattern
- Bun built-in APIs where available, node:* compat otherwise
- Ledger: `@duckdb/node-api` with bun:sqlite for metadata/caching
- Journal: Bun.file/Bun.write for atomic markdown operations
- Both behind facade contracts defined in Armature
- Bun.serve for relay HTTP server with WebSocket upgrade
- `@modelcontextprotocol/sdk` for MCP server contract (channel capability)
- Long-polling + WebSocket dual-transport (validated in PoC)
- Claude Code Channels API for session event push
- Bun.spawnSync for synchronous git commands
- Bun.spawn for async git operations (clone, fetch)
- Direct CLI invocation, no git library dependency
- Submodule management via `git submodule` CLI
- CLI: direct `process.argv` parsing (validated in v0, no arg-parser dependency)
- MCP: `@modelcontextprotocol/sdk` server with tool/resource definitions
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@duckdb/node-api` 1.5.0 | Bun >= 1.2.2, Node >= 18 | Native N-API. Bun 1.2.2 fixed DuckDB native module crash. Bun 1.3 fixed null-returning napi_register_module_v1. |
| `@modelcontextprotocol/sdk` 1.27.x | Bun >= 1.0, Node >= 18 | Dual CJS/ESM. Runs on Bun natively (confirmed by MCP SDK repo). |
| `@modelcontextprotocol/sdk` v2 (upcoming) | Requires `zod` v4 peer | Splits into `@modelcontextprotocol/server` + `@modelcontextprotocol/client`. Target Q1 2026 stable. v1.x maintained 6 months after v2 ships. |
| `zod` 4.x | Bun >= 1.0, Node >= 18 | Required peer dep for MCP SDK v2. Works in CJS. |
| `bun:sqlite` | Bun >= 1.0 | Built-in. SQLite 3.45.0+ bundled. |
| `bun:test` | Bun >= 1.0 | Built-in. Jest-compatible API. |
| Claude Code Channels | Claude Code >= v2.1.80 | Research preview. Requires claude.ai login (not API key). |
## MCP SDK v2 Migration Plan
## Bun Version Note
- DuckDB native module crash fix (1.3.0)
- TC39 standard ES decorators (1.3.10, not needed for CJS but available)
- Faster event loop (1.3.10)
- structuredClone 25x faster for arrays (1.3.10)
## Sources
- [Bun documentation](https://bun.com/docs) -- runtime APIs, module resolution, CJS support (HIGH confidence)
- [Bun 1.2 blog post](https://bun.com/blog/bun-v1.2) -- SQLite, node compat improvements (HIGH confidence)
- [Bun v1.3.10 blog](https://bun.com/blog) -- latest features (HIGH confidence)
- [DuckDB Node.js Neo client docs](https://duckdb.org/docs/stable/clients/node_neo/overview) -- @duckdb/node-api usage (HIGH confidence)
- [DuckDB 1.5.0 announcement](https://duckdb.org/2026/03/09/announcing-duckdb-150) -- latest release (HIGH confidence)
- [@duckdb/node-api package.json](https://github.com/duckdb/duckdb-node-neo) -- CJS format confirmed via main field, no type: "module" (MEDIUM confidence)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) -- v1.27.x stable, v2 pre-alpha, Bun support confirmed (HIGH confidence)
- [MCP SDK v2 docs](https://ts.sdk.modelcontextprotocol.io/v2/) -- package split, zod v4 requirement (MEDIUM confidence)
- [Claude Code Channels docs](https://code.claude.com/docs/en/channels) -- channel contract, notification format (HIGH confidence)
- [Claude Code Channels reference](https://code.claude.com/docs/en/channels-reference) -- full developer API for building channels (HIGH confidence)
- [Bun v1.2.2 release](https://bun.com/blog/bun-v1.2.2) -- DuckDB native module fix (HIGH confidence)
- Dynamo v0 archive (`archive/v0-pre-rewrite`) -- validated patterns: options-based DI, tmpdir test isolation, CJS everywhere, zero npm deps for core (HIGH confidence, local source)
- Channels PoC (`~/dev/cc-channels-poc/`) -- validated Wire relay + MCP channel server on Bun (HIGH confidence, local source)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
