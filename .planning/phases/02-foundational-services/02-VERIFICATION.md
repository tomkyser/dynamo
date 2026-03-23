---
phase: 02-foundational-services
verified: 2026-03-22T08:30:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 2: Foundational Services Verification Report

**Phase Goal:** Deliver the four services that form the substrate for all other services -- events, I/O bridging, state, and filesystem access
**Verified:** 2026-03-22
**Status:** passed
**Re-verification:** No -- initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Switchboard dispatches actions (fire-and-forget) and filters (interceptable data pipeline) with priority-ordered handler execution and namespaced event names | VERIFIED | `switchboard.cjs` 259 lines; tests cover action registration order, filter priority ordering (10/50/100), halt on `false`, halt on Err, payload transformation, wildcard prefix matching. 19 tests pass. |
| 2 | Commutator bridges Claude Code hook payloads into Switchboard events with semantic routing (e.g., PostToolUse+Write -> file:changed, PostToolUse+Bash -> shell:executed) | VERIFIED | `commutator.cjs` with TOOL_DOMAIN_MAP, TOOL_ACTION_MAP, TOOL_ACTION_OVERRIDE tables; `resolveEventName()` dispatches to correct domain events; outbound adapter registration via `registerOutput`. 20 tests pass covering all routing paths and fallback cases. |
| 3 | Magnet stores and retrieves scoped state (global, session, module namespaces) with provider-backed persistence surviving process restart | VERIFIED | `magnet.cjs` implements three-tier scoping; emits `state:changed` on every set/delete via Switchboard; `stop()` flushes state via `_provider.save({flush:true})`; restart-survival test explicitly passes (init loads from provider, new instance reads persisted state). 29 Magnet + 13 JSON provider tests pass. |
| 4 | Lathe performs all filesystem operations (read, write, delete, list, exists, atomic write) through a single facade over Bun native APIs | VERIFIED | `lathe.cjs` wraps Bun.file/Bun.write for read/write and node:fs for dir ops + delete + rename; atomic write uses `.tmp` + `fs.renameSync` pattern; all 11 contract methods present and self-validated via `createContract`. 20 tests pass. |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact | Requirement | Status | Details |
|----------|------------|--------|---------|
| `core/services/lathe/lathe.cjs` | SVC-04 | VERIFIED | 204 lines; exports `createLathe`; begins `'use strict'`; uses `Bun.file`, `Bun.write`, `fs.mkdirSync`, `fs.readdirSync`, `fs.unlinkSync`, `fs.renameSync`; self-validates with `createContract('lathe', ...)` |
| `core/services/lathe/__tests__/lathe.test.js` | SVC-04 | VERIFIED | 219 lines; 20 test cases; uses `require('bun:test')`; tmpdir isolation via beforeEach/afterEach; covers all 11 service methods |
| `core/services/switchboard/switchboard.cjs` | SVC-01 | VERIFIED | 259 lines; exports `createSwitchboard`; uses `node:events` EventEmitter; Map-based handler registry; `matchesPattern()` for wildcard; `_collectHandlers()` aggregates exact + wildcard; self-validates with `createContract('switchboard', ...)` |
| `core/services/switchboard/__tests__/switchboard.test.js` | SVC-01 | VERIFIED | 218 lines; 19 test cases; covers action dispatch, filter priority, halt semantics, wildcard matching, handler removal, lifecycle |
| `core/services/magnet/magnet.cjs` | SVC-03 | VERIFIED | 332 lines; exports `createMagnet`; three-tier `get/set/delete` with variadic args; `structuredClone` for old-value capture; `_switchboard.emit('state:changed', ...)` on every mutation; `_provider.load()` in `init`; `_provider.save({flush:true})` in `stop`; self-validates with `createContract('magnet', ...)` |
| `core/services/magnet/provider.cjs` | SVC-03 | VERIFIED | 32 lines; exports `STATE_PROVIDER_SHAPE` and `validateProvider`; contract requires `load` + `save`, optional `clear` |
| `core/services/magnet/json-provider.cjs` | SVC-03 | VERIFIED | 198 lines; exports `createJsonProvider`; debounced save (1000ms) with `flush:true` override; `.bak` file recovery on parse failure; uses `lathe.writeFileAtomic` for crash safety; self-validates via `validateProvider` |
| `core/services/magnet/__tests__/magnet.test.js` | SVC-03 | VERIFIED | 29 test cases; mock Switchboard with `getCalls()`; mock Provider with `getStored()`; covers all three scopes, state:changed event shape, provider lifecycle, cross-restart persistence |
| `core/services/magnet/__tests__/json-provider.test.js` | SVC-03 | VERIFIED | 13 integration tests; real tmpdir + real Lathe; covers load-when-missing, load-valid-JSON, .bak fallback, both-corrupt fallback, save-with-flush, .bak-creation, debounced-write, clear |
| `core/services/commutator/commutator.cjs` | SVC-02 | VERIFIED | 233 lines; exports `createCommutator`, `TOOL_DOMAIN_MAP`, `HOOK_EVENT_MAP`; `resolveEventName()` handles PreToolUse/PostToolUse tool routing and HOOK_EVENT_MAP lifecycle routing; `ingest()` emits domain event + `hook:raw`; `registerOutput()` subscribes to Switchboard; stop cleans up via `_outputRemovers`; self-validates with `createContract('commutator', ...)` |
| `core/services/commutator/__tests__/commutator.test.js` | SVC-02 | VERIFIED | 20 test cases; realistic hook payloads (Write, Edit, Read, Bash, PreToolUse variants, SessionStart, Stop, UserPromptSubmit, PreCompact); fallback routing for unknown hooks/tools; outbound adapter registration and invocation; stop() cleanup |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `lathe.cjs` | `lib/index.cjs` | `require('../../../lib/index.cjs')` | WIRED | Line 5: `const { ok, err, createContract } = require('../../../lib/index.cjs')` |
| `lathe.cjs` | `Bun.file / Bun.write` | Bun global API | WIRED | Lines 76, 96, 148, 176: `Bun.file(filePath)`, `Bun.write(...)` used in readFile, writeFile, exists, writeFileAtomic |
| `switchboard.cjs` | `lib/index.cjs` | `require('../../../lib/index.cjs')` | WIRED | Line 3: `const { ok, err, createContract } = require('../../../lib/index.cjs')` |
| `switchboard.cjs` | `node:events` | `require('node:events')` | WIRED | Line 4: `const EventEmitter = require('node:events')` |
| `magnet.cjs` | `switchboard.cjs` | options.switchboard injected at init | WIRED | Line 194: `_switchboard.emit('state:changed', {...})` -- called on every set/delete with real switchboard injected via `init({switchboard, provider})` |
| `json-provider.cjs` | `lathe.cjs` | options.lathe injected at creation | WIRED | Lines 55, 61, 89, 110, 112, 127: `lathe.exists()`, `lathe.readFile()`, `lathe.writeFile()`, `lathe.writeFileAtomic()` -- real Lathe injected in json-provider.test.js |
| `magnet.cjs` | `provider.cjs` | `require('./provider.cjs')` | WIRED | Line 4: `const { validateProvider } = require('./provider.cjs')` -- used in `registerProvider()` |
| `commutator.cjs` | `switchboard.cjs` | options.switchboard injected at init | WIRED | Line 169: `_switchboard.emit(eventName, hookPayload)` -- called in every ingest |
| `commutator.cjs` | `lib/index.cjs` | `require('../../../lib/index.cjs')` | WIRED | Line 3: `const { ok, err, createContract } = require('../../../lib/index.cjs')` |

---

### Data-Flow Trace (Level 4)

These services are infrastructure (not UI components rendering dynamic data). They do not render to a screen -- they provide APIs consumed by future services. Level 4 data-flow tracing is satisfied by the integration test suite: json-provider.test.js uses real Lathe + real tmpdir and verifies data written to disk is readable back. The magnet.test.js cross-restart persistence test verifies that data stored in one Magnet instance persists through a provider save and is recovered by a new instance. No hollow props or static-return stubs were found.

| Service | Data Source | Produces Real Data | Status |
|---------|------------|-------------------|--------|
| Lathe | Bun.file / node:fs / real tmpdir in tests | Yes -- 20 tests write + read from real filesystem | FLOWING |
| Switchboard | node:events EventEmitter + Map registries | Yes -- handlers fire and return transformed payloads | FLOWING |
| Magnet | Provider load/save + Switchboard emit | Yes -- state persists across restart in integration test | FLOWING |
| JSON Provider | Lathe.writeFileAtomic / readFile on real disk | Yes -- 13 integration tests with real tmpdir | FLOWING |
| Commutator | Switchboard.emit called with real hook payloads | Yes -- 20 tests verify correct domain event names emitted | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 101 service tests pass | `bun test core/services/` | 101 pass, 0 fail | PASS |
| No regressions in lib/ tests | `bun test` (full suite) | 192 pass, 0 fail | PASS |
| Lathe reads/writes real files | test: `readFile returns Ok(string)` | Passes with real tmpdir | PASS |
| Switchboard filter priority ordering | test: `priority 10 before 50 before 100` | Passes -- order verified | PASS |
| Magnet cross-restart persistence | test: `state survives simulated restart` | Passes with mock provider | PASS |
| Commutator PostToolUse+Write -> file:changed | test: `ingest(PostToolUse+Write) causes...` | Passes | PASS |
| JSON Provider debounced save | test: `calling save() multiple times results in one disk write` | Passes with real disk | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SVC-01 | 02-02-PLAN.md | Switchboard -- event bus with actions and filters, priority ordering | SATISFIED | `switchboard.cjs` implements full dual-event system; 19 tests pass; wildcard matching, priority ordering, halt semantics all verified |
| SVC-02 | 02-04-PLAN.md | Commutator -- System I/O bus bridging Claude Code hooks to Switchboard events with semantic routing | SATISFIED | `commutator.cjs` implements TOOL_DOMAIN_MAP, HOOK_EVENT_MAP, resolveEventName; all hook types routed; outbound adapter pattern; 20 tests pass |
| SVC-03 | 02-03-PLAN.md | Magnet -- centralized state management with provider-backed persistence, session-aware scoping | SATISFIED | `magnet.cjs` implements global/session/module scoping, state:changed events, provider interface; `json-provider.cjs` implements debounced atomic persistence; 42 tests pass |
| SVC-04 | 02-01-PLAN.md | Lathe -- filesystem facade over Bun native APIs | SATISFIED | `lathe.cjs` implements all 11 methods; Bun.file/write + node:fs hybrid; atomic write via tmp+rename; 20 tests pass |

All four requirements for Phase 2 are satisfied. No orphaned requirements found -- REQUIREMENTS.md traceability table marks SVC-01 through SVC-04 as Phase 2 / Complete.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None | -- | -- | -- |

No anti-patterns found. Grep for `TODO`, `FIXME`, `PLACEHOLDER`, `return null`, `return {}`, `return []`, `console.log` implementations in all four service files returned zero matches. No hardcoded empty returns in non-test paths. All methods return substantive Result types.

---

### Human Verification Required

None. All Phase 2 behaviors are programmatically verifiable. No visual, real-time, or external service dependencies exist in this phase.

---

### Gaps Summary

No gaps. All four services exist, are substantive, are wired correctly, and have their test suites passing. The 9 commits documented in SUMMARY files were verified in git log. The full suite (192 tests across 10 files) passes with zero regressions.

---

## Detailed Findings by Service

### Lathe (SVC-04) -- Plan 02-01

- `createLathe()` returns `Ok(frozen instance)` via `createContract` self-validation
- All 11 contract methods present: `init`, `start`, `stop`, `healthCheck`, `readFile`, `writeFile`, `deleteFile`, `listDir`, `exists`, `mkdir`, `writeFileAtomic`
- Bun.file used for reads and exists checks; Bun.write used for writes
- node:fs used for directory ops (`mkdirSync`, `readdirSync`) and delete (`unlinkSync`) and atomic rename (`renameSync`)
- Atomic write: writes to `filePath + '.tmp'` then `fs.renameSync(tmpPath, filePath)`; cleans up `.tmp` on failure
- `writeFile` auto-creates parent directories via `fs.mkdirSync(path.dirname(filePath), { recursive: true })`
- Error codes: `FILE_NOT_FOUND`, `DIR_NOT_FOUND`, `WRITE_FAILED`, `DELETE_FAILED`, `READ_FAILED`
- Lifecycle: `healthCheck()` returns `{ healthy: _started, name: 'lathe' }` correctly
- 20 tests, all passing

### Switchboard (SVC-01) -- Plan 02-02

- `createSwitchboard()` returns `Ok(frozen instance)` via `createContract`
- Handler registry uses two Maps (`_handlers` for exact, `_wildcards` for `':*'` patterns) -- not native EventEmitter listener API, enabling wildcard + priority support
- `matchesPattern(pattern, eventName)`: if `pattern.endsWith(':*')`, checks `eventName.startsWith(pattern.slice(0, -1))` (keeps the colon, so `'hook:*'` -> prefix `'hook:'`)
- `emit()` returns `undefined` (fire-and-forget)
- `filter()` returns `Ok(finalPayload)` or `Err('FILTER_HALTED', ...)` if a handler returns `false` or an `Err`
- Priority sort uses `Array.sort` (stable in V8/JSC) with FIFO tiebreaker from array insertion order
- `setMaxListeners(0)` disables EventEmitter warning for many subscribers
- `on()` returns a removal function; `off()` removes by reference
- 19 tests, all passing

### Magnet (SVC-03) -- Plan 02-03

- `createMagnet()` returns `Ok(frozen instance)` via `createContract`
- Three-tier scoping: `set('global', key, value)`, `set('session', sessionId, key, value)`, `set('module', moduleName, key, value)`
- `structuredClone` used for `oldValue` capture before mutation (immutable event payloads)
- `state:changed` event emitted on every `set` and `delete` with `{ scope, key, oldValue, newValue }`
- Namespaced keys for session/module scopes: `'sess-1.activeTab'`, `'reverie.active'`
- `init({ switchboard, provider })`: stores deps, calls `_provider.load()` to hydrate state
- `stop()`: calls `_provider.save(state, { flush: true })` before setting `_started = false`
- `registerProvider()`: validates new provider against `STATE_PROVIDER_SHAPE` via `validateProvider`
- `getScope()`: returns shallow copy to prevent external mutation
- `provider.cjs`: exports `STATE_PROVIDER_SHAPE = { required: ['load', 'save'], optional: ['clear'] }` and `validateProvider`
- `json-provider.cjs`: debounced saves (1000ms, reset on each call), immediate on `{ flush: true }`, `.bak` file created before each flush, `writeFileAtomic` for crash safety, `.bak` fallback on parse error
- 29 Magnet + 13 JSON provider tests, all passing

### Commutator (SVC-02) -- Plan 02-04

- `createCommutator()` returns `Ok(frozen instance)` via `createContract`
- Exports `TOOL_DOMAIN_MAP`, `HOOK_EVENT_MAP`, `createCommutator`
- `resolveEventName()`: checks `hookEvent === 'PreToolUse' || 'PostToolUse'` for tool routing; uses `TOOL_ACTION_OVERRIDE` for domain-specific action names (shell:executed, web:fetched, agent:completed vs generic changed/pending)
- `ingest()`: emits domain event AND `hook:raw` alongside it
- `registerOutput(eventName, adapterFn)`: subscribes to Switchboard; stores removal function in `_outputRemovers`
- `stop()`: iterates `_outputRemovers` to clean up all subscriptions
- Exports mapping tables for downstream consumers to reference event vocabulary
- 20 tests, all passing

---

_Verified: 2026-03-22_
_Verifier: Claude (gsd-verifier)_
