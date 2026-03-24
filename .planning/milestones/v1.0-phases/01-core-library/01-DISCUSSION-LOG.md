# Phase 1: Core Library - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-22
**Phase:** 01-core-library
**Areas discussed:** Error & Result patterns, Path resolution & identity, Configuration design, CJS module conventions

---

## Error & Result Patterns

### Q1: How should operations communicate failure across layers?

| Option | Description | Selected |
|--------|-------------|----------|
| Result types | Rust-inspired Ok/Err pattern — functions return {ok, value} or {ok: false, error}. Explicit, composable, no try/catch for expected failures. | ✓ |
| Custom error hierarchy | Class-based error types extending Error — DynamoError > ConfigError, PathError, etc. Standard JS pattern with try/catch. | |
| Both — layered | Result types for expected failures, error hierarchy for unexpected/system failures. | |

**User's choice:** Result types
**Notes:** Aligns with deterministic routing principle from architecture plan.

### Q2: What should contract patterns look like in CJS?

| Option | Description | Selected |
|--------|-------------|----------|
| Factory + shape validation | Factory functions that validate shape at creation time. Contracts as plain objects with required method names. | ✓ |
| Prototype-based classes | CJS constructor functions with prototype methods. Traditional OOP pattern. | |
| Symbol-based protocols | Symbol keys for contract conformance. Duck-typing approach. | |

**User's choice:** Factory + shape validation
**Notes:** Aligns with options-based DI validated in v0.

### Q3: Should Result types carry error codes or just message strings?

| Option | Description | Selected |
|--------|-------------|----------|
| Typed error codes | Result errors carry code + message + context. Downstream code switches on codes. | ✓ |
| Message strings only | Keep it simple — errors are just strings. | |
| You decide | Claude's discretion. | |

**User's choice:** Typed error codes
**Notes:** None.

---

## Path Resolution & Identity

### Q4: How should Dynamo's internal paths be resolved?

| Option | Description | Selected |
|--------|-------------|----------|
| Central path registry | Single paths.cjs computing all locations from discovered root. | ✓ |
| Convention-based | Each module resolves relative to itself via __dirname. | |
| Injected via options | Paths injected as configuration at boot time. | |

**User's choice:** Central path registry
**Notes:** None.

### Q5: How literally should architecture import paths work?

| Option | Description | Selected |
|--------|-------------|----------|
| Logical aliases (deferred) | Architecture paths are logical names. Actual require() uses relative paths. Domain aliasing implemented in Armature (Phase 4). | ✓ |
| Path aliases now | Set up Bun paths/imports in package.json for Dynamo/* imports from Phase 1. | |
| You decide | Claude's discretion. | |

**User's choice:** Logical aliases deferred to Phase 4
**Notes:** None.

### Q6: How should root discovery work across install locations?

| Option | Description | Selected |
|--------|-------------|----------|
| Marker file search | Walk up from __dirname looking for .dynamo or config.json. | ✓ |
| DYNAMO_ROOT env var | Require environment variable to be set. | |
| Both — env overrides marker | Check env var first, fall back to marker search. | |

**User's choice:** Marker file search
**Notes:** None.

---

## Configuration Design

### Q7: How should the 5 precedence levels merge?

| Option | Description | Selected |
|--------|-------------|----------|
| Deep merge with override | Each level deep-merges into previous. Higher precedence wins for scalars. Arrays replaced, not concatenated. | ✓ |
| Flat key-value | Single flat namespace with dot-notation keys. No deep merging. | |
| You decide | Claude's discretion. | |

**User's choice:** Deep merge with override
**Notes:** None.

### Q8: Should config validation happen at load time or on access?

| Option | Description | Selected |
|--------|-------------|----------|
| At load time | Validate merged config against schema immediately. Fail fast. Boot never completes with invalid config. | ✓ |
| On access (lazy) | Load raw config, validate individual sections when first accessed. | |
| You decide | Claude's discretion. | |

**User's choice:** At load time
**Notes:** None.

### Q9: How should config schema validation work without npm dependencies?

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal built-in validator | Small schema validator in lib/ handling type checks, required fields, defaults, nested objects. | ✓ |
| Zod from the start | Use Zod v4 now since it's a planned dependency for MCP SDK v2. | |
| You decide | Claude's discretion. | |

**User's choice:** Minimal built-in validator
**Notes:** Zod reserved for MCP SDK boundary later.

---

## CJS Module Conventions

### Q10: What should the primary export pattern be?

| Option | Description | Selected |
|--------|-------------|----------|
| Named exports object | Each file exports plain object with named functions/values. No default exports. | ✓ |
| Factory functions as default | Each module exports a single factory function as default. | |
| Mixed | Utilities use named exports, services use factory functions. | |

**User's choice:** Named exports object
**Notes:** None.

### Q11: Should JSDoc type annotations be used?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, for public APIs | JSDoc @param, @returns, @typedef on exported functions and contract definitions. Internal helpers skip it. | ✓ |
| No JSDoc | Keep files clean. Tests show how things work. | |
| You decide | Claude's discretion. | |

**User's choice:** Yes, for public APIs
**Notes:** None.

### Q12: Should Object.freeze() be used on exported objects?

| Option | Description | Selected |
|--------|-------------|----------|
| Freeze contracts only | Object.freeze() on validated factory output. Not on utility exports or config. | ✓ |
| Freeze everything | Object.freeze() on all module.exports. Maximum safety. | |
| You decide | Claude's discretion. | |

**User's choice:** Freeze contracts only
**Notes:** None.

---

## Claude's Discretion

- Internal file organization within lib/
- Specific error code naming conventions
- Whether discoverRoot() caches its result

## Deferred Ideas

None — discussion stayed within phase scope.
