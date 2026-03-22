# Domain Pitfalls

**Domain:** Self-contained development platform for Claude Code (layered architecture, plugin system, embedded databases, multi-session communication)
**Researched:** 2026-03-22

---

## Critical Pitfalls

Mistakes that cause rewrites, architectural collapse, or weeks of lost momentum. Each of these has been validated against Dynamo's specific constraints (Bun, CJS, no npm dependencies, Claude Code integration).

---

### Pitfall 1: `node:sqlite` Does Not Exist in Bun

**What goes wrong:** v0 used `node:sqlite` (Node.js built-in DatabaseSync) for session storage. Bun does not implement `node:sqlite` -- it is listed as "Not implemented" in Bun's compatibility matrix. Code that `require('node:sqlite')` will fail at module load time with no graceful fallback.

**Why it happens:** The v0 system was built on Node.js. The rewrite targets Bun as the runtime. Developers assume Node.js built-in modules carry over 1:1. They do not.

**Consequences:** Session storage, any Ledger queries that relied on SQLite, and any test infrastructure using `node:sqlite` all break. This is a hard crash, not a degradation.

**Prevention:**
- Use `bun:sqlite` instead. It provides a synchronous API inspired by `better-sqlite3` and is 3-6x faster than `better-sqlite3`.
- The API surface differs from `node:sqlite` -- `bun:sqlite` uses `new Database(path)` with `.query()` prepared statements, not `DatabaseSync` with `.exec()`.
- Write a thin facade in `lib/` that wraps `bun:sqlite` so that if Bun ever adds `node:sqlite` compatibility, the migration is a one-file change.
- Test this in the very first phase. Do not discover it in Phase 3.

**Detection:** Any `require('node:sqlite')` or `require('node:test')` (also partly unimplemented) in source code.

**Confidence:** HIGH -- verified against Bun compatibility docs.

**Phase relevance:** Core Library (Phase 1) -- must be resolved before any data-touching code is written.

---

### Pitfall 2: `node:test` Is Partially Broken in Bun

**What goes wrong:** v0 validated TDD with `node:test` across 525+ tests. Bun's `node:test` implementation is marked "Partly implemented. Missing mocks, snapshots, timers." Bun recommends `bun:test` instead.

**Why it happens:** v0 ran on Node.js. The rewrite's constraint of "zero npm dependencies" means the project cannot fall back to Jest or Vitest. The choice is between a partially broken `node:test` and a fully functional `bun:test`.

**Consequences:** Tests that use `node:test` mock functions, timer control, or snapshot assertions will silently fail or crash. The v0 test suite cannot be ported verbatim.

**Prevention:**
- Use `bun:test` as the test runner. It is Jest-compatible (`describe`, `it`, `expect`, `mock`, `spyOn`), built into Bun, and requires zero configuration.
- The options-based DI pattern validated in v0 (passing path overrides into every module for test isolation) works identically with `bun:test` -- this pattern is runtime-agnostic.
- Establish the test runner choice in Phase 1 and write the first tests with it. Do not defer.

**Detection:** Any `require('node:test')` or `const { describe, it } = require('node:test')` in test files.

**Confidence:** HIGH -- verified against Bun Node.js compatibility docs.

**Phase relevance:** Core Library (Phase 1) -- the test runner is the first thing built.

---

### Pitfall 3: DuckDB Node Package Is Being Deprecated

**What goes wrong:** The Ledger provider is specified to use DuckDB. The original `duckdb` npm package (node-duckdb) is planned for its last release with DuckDB 1.4.x (Fall 2025) and will not be released for DuckDB 1.5.x (Early 2026). Building on the legacy package means building on an end-of-life dependency.

**Why it happens:** DuckDB is transitioning from a community-maintained Node.js binding (`duckdb` on npm) to an official one (`@duckdb/node-api`, the "Node Neo" package). The old package used SQLite-style conventions; the new one mirrors DuckDB's C API.

**Consequences:** Building on the deprecated `duckdb` package means: (a) no upstream fixes for Bun compatibility issues, (b) eventual version lock when DuckDB core advances, (c) a forced migration to `@duckdb/node-api` later, which has a completely different API.

**Prevention:**
- Use `@duckdb/node-api` (Node Neo) from the start. It has native Promise support, is built on DuckDB's C API, and wraps released DuckDB binaries (no compilation needed).
- Verify NAPI compatibility with Bun early. Bun implements 95% of Node-API, and DuckDB native module crashes were fixed in Bun 1.2.2/1.3. But the "no npm dependencies" constraint means this is a conscious exception that must be decided: DuckDB is inherently a native binary dependency.
- Write the Ledger provider behind a facade from day one. The provider contract (query, insert, schema management) should not leak DuckDB-specific API details to consumers.

**Detection:** Any `require('duckdb')` instead of `require('@duckdb/node-api')`.

**Confidence:** HIGH -- verified against DuckDB official docs and npm.

**Phase relevance:** Core Providers (Phase 2) -- Ledger is built here.

---

### Pitfall 4: DuckDB Concurrency Model Mismatch with Multi-Session Architecture

**What goes wrong:** Reverie's three-session architecture (Primary/Mind/Subconscious) means multiple Claude Code sessions accessing the same DuckDB database file. DuckDB's documentation is explicit: "Writing to DuckDB from multiple processes is not supported automatically and is not a primary design goal."

**Why it happens:** DuckDB is designed for single-process analytics workloads. Its concurrency model allows multiple threads within one process to write (with optimistic concurrency control), but cross-process writes cause locks, errors, or corruption. Reverie's architecture naturally creates 3+ processes.

**Consequences:** Database corruption, silent write failures, deadlocks between sessions, and data loss during REM consolidation or simultaneous memory writes. This is the kind of bug that surfaces intermittently under load and is extremely difficult to reproduce.

**Prevention:**
- **Coordinator pattern:** Designate one process (the Wire relay server) as the single DuckDB writer. All other sessions send write requests through Wire, which serializes them. Reads can use `access_mode: 'READ_ONLY'` from any process.
- **Alternative: separate databases per session.** Each session writes to its own DuckDB file. Consolidation happens during REM cycles through a single coordinator.
- **Do not assume in-process threading solves this.** The sessions are separate Claude Code processes, not threads.
- Build and test the multi-process access pattern explicitly in the Ledger provider's test suite before any module depends on it.

**Detection:** Multiple processes opening the same `.duckdb` file with write access. Log warnings when `access_mode` is not explicitly set.

**Confidence:** HIGH -- verified against DuckDB concurrency docs.

**Phase relevance:** Core Providers (Phase 2) for the facade, but the multi-process coordination pattern is a Framework (Phase 3) or Wire/Conductor (Phase 2) concern. Must be architecturally decided before Reverie (Milestone 2).

---

### Pitfall 5: Premature Framework Abstraction (The "Build It and They Will Come" Trap)

**What goes wrong:** The architecture plan specifies an ambitious abstraction stack: facades, interfaces, domain aliases, plugin domain interception, service/provider resolution by domain or by name. Building all of this before a single module (Reverie) consumes it produces an abstraction layer that models hypothetical needs, not proven ones.

**Why it happens:** The plan is well-designed as a target architecture. But implementing the full Armature framework -- plugin API, domain aliasing, hook interception points, external API contracts -- before Reverie exercises even basic service resolution means the abstractions will be wrong. The v0 retrospective explicitly noted: "Plugin systems can only be designed once you already have a perfect knowledge of the design space."

**Consequences:** Framework contracts that Reverie cannot use without awkward workarounds. Plugin API surface area that no plugin has validated. Domain resolution paths that add indirection without proven benefit. The worst case: a rewrite of the framework after Reverie reveals what the contracts actually need to be.

**Prevention:**
- **Thin contracts first.** Build the minimum viable Armature: service registration, provider registration, basic lifecycle hooks. Nothing more until Reverie is consuming it.
- **"Rule of three" for abstractions.** Do not abstract until three concrete consumers demonstrate the pattern. For Dynamo, this means: do not build domain aliasing (e.g., `Dynamo/Services/Data/search.js`) until at least two services need aliases. Start with direct imports.
- **Plugin API is a Phase 4+ concern.** The architecture plan says plugins extend core domains. But no plugin exists in Milestone 1. Stub the plugin API slot. Do not implement hook interception, domain overwriting, or facade extension until a plugin is being built.
- **Facade-first is fine; elaborate facade features are not.** A facade for Ledger that exposes `query()` and `insert()` is correct. A facade with dynamic domain resolution, hot-swappable providers, and plugin interception hooks is premature.

**Detection:** Framework code with zero test consumers. Interfaces with exactly one implementation. Domain resolution paths that are never called outside the framework itself.

**Confidence:** HIGH -- pattern validated across industry literature and v0 retrospective (stub-then-replace worked; premature abstraction did not).

**Phase relevance:** Framework/Armature (Phase 3). This pitfall is the primary risk for Phase 3.

---

### Pitfall 6: Claude Code Channels Is a Research Preview, Not a Stable API

**What goes wrong:** Wire service depends on Claude Code Channels for inter-session communication. Channels was announced March 20, 2026 as a research preview. The protocol and plugin commands may change before GA. Building Wire's core communication layer on an unstable API risks breaking changes with every Claude Code update.

**Why it happens:** The Channels PoC validated the pattern works today. But "works today" and "stable API contract" are different things. Channels currently only delivers messages while a session is running -- there is no persistent message queue.

**Consequences:** A Claude Code update silently breaks Wire, which breaks Reverie's three-session architecture, which breaks the primary module. The entire value proposition of Dynamo collapses because its most sophisticated feature depends on the least stable dependency.

**Prevention:**
- **Wire must abstract Channels behind a transport interface.** The Wire service should define a `WireTransport` contract (send, poll, register, health) that Channels implements but does not own. This is the same pattern v0 used with MCPClient.
- **Build a fallback transport.** The Wire relay server from the PoC uses raw HTTP (long-poll + WebSocket). This works without Channels. Make it the fallback. If Channels breaks, Wire degrades to HTTP relay.
- **Pin to a minimum Claude Code version.** Document the minimum `claude-code` version for Channels support and gate Wire initialization on a version check.
- **Do not build Wire before Channels reaches beta.** If Channels is still research preview when Phase 2 begins, build Wire with the HTTP relay transport only. Add Channels transport when the API stabilizes.

**Detection:** Direct `import` or `require` of Channels-specific APIs without a transport abstraction layer. Wire tests that only pass with Channels enabled.

**Confidence:** MEDIUM -- Channels works now and Anthropic is clearly investing in it, but research preview status means breaking changes are expected.

**Phase relevance:** Core Services (Phase 2) -- Wire is built here. This pitfall should gate the Wire implementation strategy.

---

### Pitfall 7: The "No npm Dependencies" Constraint Meets Native Binaries

**What goes wrong:** The architecture mandates "no npm dependencies" for platform core, using only Bun/Node built-ins. But DuckDB (`@duckdb/node-api`) is a native binary addon distributed via npm. Tika (mentioned for Assay search) requires a JVM. Meilisearch/OpenSearch are external services. The constraint and the chosen technologies are in direct conflict.

**Why it happens:** The "no npm dependencies" constraint was validated in v0 where the only data store was Graphiti (an external MCP server) and flat files. The rewrite introduces DuckDB as a core provider and Tika/search engines for Assay -- all of which are external dependencies.

**Consequences:** Either the constraint is violated (creating maintenance burden and install complexity), or the technologies are swapped for built-in alternatives (losing capability). Ambiguity about this boundary causes inconsistent decisions across phases.

**Prevention:**
- **Clarify the constraint's scope.** "No npm dependencies" should mean "no npm runtime libraries" (lodash, express, etc.), not "no infrastructure binaries." DuckDB is infrastructure, like Docker or Git. It is installed via npm for convenience but operates as a standalone binary.
- **Create a dependency classification system in the Core Library:**
  - **Core dependencies:** Bun built-ins only. No exceptions.
  - **Infrastructure dependencies:** Native binaries managed by Conductor. DuckDB, potentially Tika. Installed and version-checked by the platform, not blindly `require()`'d.
  - **External services:** Docker containers managed by Conductor. Meilisearch, OpenSearch, etc. Optional, health-checked, gracefully degraded.
- **Conductor must own the lifecycle of infrastructure dependencies.** `conductor.ensureDuckDB()` checks version, installs if missing, reports health. This is not a `package.json` concern.

**Detection:** `package.json` growing beyond DuckDB. `require()` calls to npm packages in core service/provider code without going through a facade.

**Confidence:** HIGH -- this is a known tension from the architecture plan itself.

**Phase relevance:** Core Library (Phase 1) for the classification system, Core Services/Providers (Phase 2) for Conductor and Ledger implementations.

---

## Moderate Pitfalls

Mistakes that cause significant rework, architectural drift, or delayed delivery but do not require full rewrites.

---

### Pitfall 8: Bun CJS Module Resolution Differences

**What goes wrong:** Bun's CJS support is more permissive than Node.js. It allows `require()` and `import` in the same file, treats `.ts` files as requireable, and does not enforce `"type": "module"` in `package.json`. Code that works in Bun may fail in Node.js, and vice versa. Edge cases exist: arrow functions with spread + optional chaining inside CJS wrappers can crash Bun's CJS loader.

**Prevention:**
- Stick to pure CJS patterns: `require()`, `module.exports`. No `import` statements in `.cjs` files.
- Do not rely on Bun-specific module interop (like requiring `.ts` files from `.cjs`).
- Test module loading in CI with both Bun and Node.js (at least during early phases) to catch divergences.
- Avoid top-level `await` in any file that might be `require()`'d.

**Detection:** Mixed `import`/`require()` in the same `.cjs` file. `require('./something.ts')` patterns. Top-level `await` in modules.

**Confidence:** HIGH -- verified against Bun module resolution docs.

**Phase relevance:** Core Library (Phase 1) -- establish module patterns here and enforce them.

---

### Pitfall 9: IoC/DI Without TypeScript Decorators in CJS

**What goes wrong:** The architecture mandates Inversion of Control. Most IoC frameworks use TypeScript decorators (`@Injectable`, `@Inject`). CJS has no decorator support. Attempting to shoehorn a decorator-based DI pattern into CJS creates brittle, verbose, unreadable code.

**Prevention:**
- Use the **options-object pattern** already validated in v0. Every module exports a factory function that accepts a dependencies object: `module.exports = function createAssay({ ledger, config } = {})`. This is IoC without a container.
- For service registration, use a **simple registry map** in `core.cjs`: `const services = new Map()`. Services register themselves during bootstrap. Consumers look up by name.
- Do not import a DI container library. The added complexity of container lifecycles, scope management, and resolution order is not justified for a system with ~9 services and ~2 providers.
- The "resolve by domain" pattern from the architecture plan (`Dynamo/Services/Data/search.js`) can be implemented as a simple lookup table, not a runtime resolution engine.

**Detection:** `npm install` of any `*inject*` or `*container*` package. Classes with static `inject` properties. Factory functions with more than 6 dependency parameters.

**Confidence:** HIGH -- validated by v0's options-object pattern working across 525+ tests.

**Phase relevance:** Core Library (Phase 1) for the pattern definition, Framework/Armature (Phase 3) for the service registry.

---

### Pitfall 10: Git Submodule Coordination Hell

**What goes wrong:** Plugins, modules, and extensions are separate repos managed as git submodules. Git submodules are notoriously painful: detached HEAD states, commits that reference local-only SHAs, diamond dependency graphs creating duplicate copies, and CI systems needing different URIs than developers.

**Why it happens:** Git submodules solve the "separate repos, managed together" problem in theory. In practice, they create a coordination tax on every commit, pull, and CI run. Every developer (and Claude Code) must remember `git submodule update --init --recursive` or the build breaks silently.

**Prevention:**
- **Defer submodules until the second module exists.** Reverie is the first module and is being actively developed alongside core. There is zero benefit to putting it in a submodule during Milestone 1 or 2. Keep it in-tree until the architecture stabilizes.
- **When submodules are needed, automate everything.** Forge (Git service) must handle `submodule update`, `submodule sync`, and detached HEAD recovery automatically. Developers should never manually run submodule commands.
- **Consider git subrepo as an alternative.** It keeps everything in a single repo workflow while still allowing extraction to a separate repo later. Less ceremony than submodules.
- **Pin submodule versions in config.json, not just in .gitmodules.** Conductor should resolve the intended version and the actual checked-out version on startup, warning on drift.

**Detection:** `.gitmodules` file with entries before the second module exists. Developers manually running `git submodule` commands. CI builds failing with "reference is not a tree" errors.

**Confidence:** HIGH -- documented extensively in git community, confirmed by industry experience.

**Phase relevance:** Not relevant until post-Milestone 2. Do not introduce submodules prematurely.

---

### Pitfall 11: MCP Server Lifecycle and Session ID Caching

**What goes wrong:** v0's CONCERNS.md documented this explicitly: "MCPClient caches the session ID from SSE initialization. If the Graphiti MCP server restarts, cached session IDs become stale, causing 'invalid session' errors. The workaround is restarting Claude Code."

**Why it happens:** MCP uses a stateful initialization handshake. The client and server negotiate capabilities and establish a session. If the server restarts (container crash, update, resource cleanup), the client holds a stale session reference.

**Prevention:**
- **Conductor must implement reconnection logic.** On MCP call failure, attempt: (a) session refresh, (b) full reinitialize, (c) report failure. Do not cache session IDs indefinitely.
- **Health checks must verify MCP session liveness**, not just TCP connectivity. A server can be up with a fresh state that invalidates all cached sessions.
- **Wire relay server (for Channels communication) needs the same pattern.** Any persistent connection between sessions must handle reconnection gracefully.
- **Exponential backoff with circuit breaker.** After 3 failed reconnection attempts, stop trying and surface the error to the user through the CLI.

**Detection:** Error logs with "invalid session" or "session not found" after uptime > 1 hour. MCP client retrying without session refresh.

**Confidence:** HIGH -- documented in v0 CONCERNS.md as a known issue.

**Phase relevance:** Core Services (Phase 2) -- Conductor and Wire are built here.

---

### Pitfall 12: Hook Error Invisibility

**What goes wrong:** All Claude Code hooks must exit 0 to avoid blocking Claude. This means errors are swallowed. v0 logged to `hook-errors.log` but users rarely checked it. Critical failures (memory write failures, session naming failures, state corruption) went unnoticed for entire sessions.

**Why it happens:** The constraint is real: hooks that exit non-zero (except exit 2 for blocking) are treated as failures and can disrupt Claude's workflow. But this creates a "silent failure" class of bugs that are invisible during normal operation.

**Prevention:**
- **Use the hook JSON output protocol for error signaling.** Exit 0 with `{"systemMessage": "Dynamo: memory write failed. Run 'dynamo health-check'"}` surfaces the error in Claude's context without blocking.
- **Implement a session-scoped error counter in Magnet (state service).** If errors exceed a threshold, surface a persistent warning.
- **PostToolUse hooks for Write/Edit should return `additionalContext` with status.** "Memory captured" vs "Memory write failed -- 3 failures this session" gives Claude (and the user) visibility.
- **Health-check should include a "recent errors" stage** that reads the error log and reports any entries from the current session.

**Detection:** `hook-errors.log` growing without user awareness. Silent degradation in memory quality. Sessions completing without any memory being written despite active hooks.

**Confidence:** HIGH -- documented in v0 retrospective and CONCERNS.md.

**Phase relevance:** Framework/Armature (Phase 3) for the hook integration layer. Core Services (Phase 2) for Magnet state tracking.

---

### Pitfall 13: Bun `fs` Edge Cases

**What goes wrong:** Bun's `fs` implementation passes 92% of Node.js's test suite. The remaining 8% includes edge cases around `fs.watch`, `Stats.isSymbolicLink()`, and platform-specific behaviors. v0 relied on atomic file writes (`fs.writeFileSync` to tmp + `fs.renameSync`) and `fs.watch` is not reliably implemented.

**Prevention:**
- Use `Bun.write()` and `Bun.file()` for file I/O instead of Node.js `fs` where possible. These are optimized for Bun and have reliable behavior.
- The Lathe service should abstract all filesystem operations. Do not let `require('fs')` calls leak outside of Lathe.
- For atomic writes, the `fs.writeFileSync` + `fs.renameSync` pattern (validated in v0) should work, but verify in an early phase test.
- Do not depend on `fs.watch` for file watching. Use `Bun.file().watch()` or polling if needed.

**Detection:** Direct `require('fs')` calls outside of Lathe service. Test failures around file metadata, symlinks, or watch events.

**Confidence:** MEDIUM -- 92% compatibility is good but the 8% gap is undocumented and may hit obscure paths.

**Phase relevance:** Core Services (Phase 2) -- Lathe is built here.

---

## Minor Pitfalls

Issues that cause friction, debugging time, or suboptimal patterns but are recoverable without architectural changes.

---

### Pitfall 14: `bun:test` vs `node:test` API Surface Differences

**What goes wrong:** v0's test patterns used `node:test`'s `describe`/`it`/`assert`. `bun:test` uses `describe`/`it`/`expect` (Jest-style). The assertion API is different: `assert.strictEqual(a, b)` vs `expect(a).toBe(b)`. Test port from v0 requires systematic assertion rewriting.

**Prevention:** Accept this as a migration cost. Build a small assertion style guide in the Core Library phase and apply it consistently. The logic of the tests (tmpdir isolation, options-object DI, atomic operations) is portable; only the assertion syntax changes.

**Detection:** Mixed `assert` and `expect` usage in test files.

**Phase relevance:** Core Library (Phase 1).

---

### Pitfall 15: Config.json as Global State

**What goes wrong:** The global `config.json` controls toggles for modules, plugins, and system state. If multiple services read and write config simultaneously (especially across processes in Reverie's multi-session architecture), race conditions corrupt the config.

**Prevention:**
- Config reads should go through Magnet (state service), which caches in memory and watches for changes.
- Config writes should be serialized through a single writer (Magnet or a dedicated config service).
- Use atomic writes (tmp + rename) for all config mutations.
- Config should be read-heavy, write-rare. If a design requires frequent config writes, the data belongs in Ledger, not config.

**Detection:** Multiple `JSON.parse(fs.readFileSync('config.json'))` calls without going through Magnet.

**Phase relevance:** Core Services (Phase 2) -- Magnet is built here.

---

### Pitfall 16: Boundary Marker Prompt Injection

**What goes wrong:** v0 used `<dynamo-memory-context>` markers to contain hook injection output. If injected memory content itself contains these markers (user-authored text, code snippets), the boundary breaks and content bleeds into or out of the containment zone.

**Prevention:**
- Sanitize all injected content: strip or escape any occurrence of the boundary markers before wrapping.
- Use unique, non-guessable boundary markers (e.g., include a session-specific nonce: `<dynamo-ctx-a7f3e2>`).
- The adversarial counter-prompting pattern from v0 ("From your experience," "As you described it") should continue but is not sufficient alone -- marker sanitization is needed.

**Detection:** Injected content containing literal `<dynamo-` tags. Test for marker-in-content scenarios in the curation pipeline tests.

**Phase relevance:** Framework/Armature (Phase 3) -- hook integration layer.

---

### Pitfall 17: Lazy `require()` Creates Hidden Load-Order Dependencies

**What goes wrong:** v0 used lazy `require()` inside functions (e.g., `resolve()` calls in stub files) to break circular dependencies. While this works, it creates load-order dependencies that are invisible to static analysis. A refactor that changes when a function is first called can break a previously-working lazy require chain.

**Prevention:**
- `lib/dep-graph.cjs` (validated in v0) should be ported to the new architecture and run in CI. It detects circular dependencies statically.
- Prefer explicit dependency injection (options object) over lazy `require()`. If A needs B and B needs A, one of them should receive the other through its factory function, not through a runtime `require()`.
- The circular dependency allowlist should be kept minimal and reviewed at each milestone.

**Detection:** `require()` calls inside function bodies (not at module top level). Growing circular dependency allowlist.

**Phase relevance:** Core Library (Phase 1) for dep-graph, ongoing through all phases.

---

### Pitfall 18: Reverie's Three-Session Architecture Assumes Persistent Sessions

**What goes wrong:** Reverie's Mind (Secondary) and Subconscious (Tertiary) sessions are separate Claude Code instances. Claude Code sessions are not persistent -- they end when the user exits. The Mind session cannot maintain state across the user's session restarts unless state is explicitly externalized.

**Prevention:**
- All session state must be persisted to Ledger/Journal through standard service APIs. In-memory state (Magnet) is session-scoped and must be rebuilt on session start from persistent storage.
- The Self Model state (identity core, relational model, conditioning) must survive session boundaries. This is a Journal/Ledger concern, not a Magnet concern.
- Wire messages are ephemeral (the relay server uses an in-memory buffer). Any Wire messages that must survive a session restart need to be persisted by the Ledger or Journal.
- Test the full cold-start -> warm-session -> shutdown -> cold-start cycle explicitly.

**Detection:** Magnet state that is never persisted. Wire relay buffer growing without bound. Self Model state that only exists in the Secondary session's context window.

**Phase relevance:** Core Services (Phase 2) for Magnet persistence, Milestone 2 for Reverie cold-start testing.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Core Library (Phase 1) | `node:sqlite` and `node:test` incompatibility with Bun | Use `bun:sqlite` and `bun:test` from the start. Validate immediately. |
| Core Library (Phase 1) | Module resolution patterns diverge from Node.js | Establish strict CJS-only patterns. No mixed `import`/`require`. |
| Core Services (Phase 2) | Wire built on unstable Channels API | Abstract Channels behind transport interface. Build HTTP relay fallback first. |
| Core Services (Phase 2) | Conductor does not manage DuckDB lifecycle | DuckDB is infrastructure, not a library. Conductor must own install, version check, health. |
| Core Services (Phase 2) | MCP session stale after server restart | Implement reconnection logic with session refresh in Conductor. |
| Core Providers (Phase 2) | DuckDB multi-process writes from Reverie sessions | Single-writer coordinator pattern through Wire. Read-only mode for secondary processes. |
| Core Providers (Phase 2) | DuckDB npm package deprecated | Use `@duckdb/node-api` (Node Neo), not `duckdb`. |
| Framework/Armature (Phase 3) | Over-engineering abstractions before Reverie validates them | Thin contracts only. No plugin API implementation. No domain aliasing. |
| Framework/Armature (Phase 3) | Hook error invisibility | Use JSON output protocol with `systemMessage` for error surfacing. |
| SDK (Phase 4) | Plugin API designed without plugin consumers | Stub only. Do not implement until a real plugin is being built. |
| SDK (Phase 4) | External API contracts (CLI, MCP) lock in prematurely | Define contracts but mark as unstable. Version the API explicitly. |
| Modules/Reverie (Milestone 2) | Three-session state assumes persistence | Externalize all state to Ledger/Journal. Test cold-start cycle. |
| Modules/Reverie (Milestone 2) | Channels API changes break Wire | Transport abstraction with HTTP relay fallback. Pin minimum CC version. |
| Git Submodules (Post-M2) | Coordination overhead with zero benefit during active development | Keep everything in-tree until the second module exists. |

---

## v0 Lessons Applied

The following patterns from the v0 retrospective are load-bearing for the rewrite and should be preserved:

| v0 Lesson | Status in Rewrite | Risk If Ignored |
|-----------|-------------------|-----------------|
| TDD with zero-framework test runner | Must switch from `node:test` to `bun:test` | Test infrastructure fails silently |
| Options-based DI for test isolation | Directly portable to Bun/CJS | None -- pattern is runtime-agnostic |
| Atomic file writes (tmp + rename) | Verify `fs.renameSync` works identically in Bun | Silent file corruption on race conditions |
| Adversarial counter-prompting in templates | Port verbatim | Claude treats memories as authoritative facts |
| Deterministic path selection (no LLM for routing) | Port verbatim | Hot path becomes expensive and untestable |
| Stub-then-replace for multi-phase builds | Port verbatim | None -- pattern is architecture-agnostic |
| Layout-as-single-source-of-truth (`layout.cjs`) | Must be rebuilt for new directory structure | Path bugs cascade through sync/install/deploy |
| Prerequisite phases before large restructures | Apply to rewrite phase ordering | Cascading breakage during Phase 2+ |
| Milestone audits before archival | Apply at milestone boundaries | Integration gaps ship to production |

---

## Sources

### Official Documentation (HIGH confidence)
- [Bun Node.js Compatibility](https://bun.com/docs/runtime/nodejs-compat) -- module support matrix
- [Bun Module Resolution](https://bun.com/docs/runtime/module-resolution) -- CJS/ESM interop
- [Bun SQLite (bun:sqlite)](https://bun.com/docs/runtime/sqlite) -- built-in SQLite driver
- [DuckDB Concurrency](https://duckdb.org/docs/stable/connect/concurrency) -- multi-process constraints
- [DuckDB Node Neo](https://duckdb.org/docs/stable/clients/node_neo/overview) -- new official Node.js package
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- 26 hook events, contracts, constraints
- [Claude Code Channels](https://code.claude.com/docs/en/channels) -- research preview status
- [Bun Node-API](https://bun.com/docs/runtime/node-api) -- 95% NAPI implementation

### GitHub Issues and Release Notes (MEDIUM confidence)
- [Bun DuckDB crash fix (v1.2.2)](https://bun.com/blog/bun-v1.2.2) -- NAPI null module fix
- [Bun DuckDB crash fix (v1.3)](https://bun.com/blog/bun-v1.3) -- native module crash resolution
- [DuckDB node package deprecation](https://duckdb.org/docs/stable/clients/nodejs/overview) -- last release for 1.4.x
- [Bun CJS wrapper bug](https://github.com/oven-sh/bun/issues/25398) -- CJS loader edge cases

### Community and Analysis (LOW-MEDIUM confidence)
- [Bun Compatibility 2026](https://dev.to/alexcloudstar/bun-compatibility-in-2026-what-actually-works-what-does-not-and-when-to-switch-23eb)
- [Plugin System Design (CSS-Tricks)](https://css-tricks.com/designing-a-javascript-plugin-system/)
- [Plugin Systems: When & Why (DEV)](https://dev.to/arcanis/plugin-systems-when-why-58pp)
- [Git Submodules: Reasons to Avoid](https://blog.timhutt.co.uk/against-submodules/)
- [MCP Real Faults Taxonomy](https://arxiv.org/html/2603.05637v1)
- [Premature Abstraction (Post-Architecture)](https://arendjr.nl/blog/2024/07/post-architecture-premature-abstraction-is-the-root-of-all-evil/)

### Internal (v0 project history)
- `archive/v0-pre-rewrite:.planning/RETROSPECTIVE.md` -- 6 milestones of validated patterns
- `archive/v0-pre-rewrite:.planning/codebase/CONCERNS.md` -- known issues at v0 EOL
- `archive/v0-pre-rewrite:.planning/codebase/ARCHITECTURE.md` -- six-subsystem model
- Wire relay PoC: `~/dev/cc-channels-poc/wire-relay/server.ts` -- validated communication pattern
