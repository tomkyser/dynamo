# Phase 4: Framework - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-23
**Phase:** 04-framework
**Areas discussed:** IoC container scope, Domain aliasing system, Plugin extension model, Hook integration layer

---

## IoC Container Scope

### Q1: Container vs existing DI pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Container wraps existing | Container resolves services but still injects via options objects. Services don't import the container. | ✓ |
| Full service locator | Services resolve their own deps from container. Couples services to container. | |
| Minimal registry only | Just a named registry (bind/get). No auto-resolution. | |

**User's choice:** Container wraps existing
**Notes:** Recommended approach. Preserves validated options-based DI pattern while adding orchestration.

### Q2: Dependency graph resolution

| Option | Description | Selected |
|--------|-------------|----------|
| Declarative metadata | Services register with deps: ['switchboard', 'ledger']. Container topologically sorts. | ✓ |
| Inferred from signatures | Container inspects factory parameter names. Fragile in CJS. | |
| Manual wiring with helpers | Developer writes boot order. More boilerplate. | |

**User's choice:** Declarative metadata
**Notes:** Graph is data, not code. Aligns with "hardcode nothing."

### Q3: Scoped lifetime model

| Option | Description | Selected |
|--------|-------------|----------|
| Singleton + factory | Two modes. Covers 95% of cases. Deferred/lazy = resolve on first access. | ✓ |
| Full scoped hierarchy | Singleton + factory + scoped child containers. Premature without multi-tenant. | |
| Singleton only | Everything singleton. Factory outside container. Too limiting. | |

**User's choice:** Singleton + factory
**Notes:** None

### Q4: Contextual binding

| Option | Description | Selected |
|--------|-------------|----------|
| Tagged bindings | bind() with tags metadata. resolveTagged() queries. Enables import-by-domain. | ✓ |
| When-needs pattern | Fluent builder API. More code surface. | |
| You decide | Claude picks. | |

**User's choice:** Tagged bindings
**Notes:** None

---

## Domain Aliasing System

### Q1: How aliases are realized in CJS

| Option | Description | Selected |
|--------|-------------|----------|
| Container resolution | Domain aliases are container queries. resolve('providers.data.sql') returns Ledger. | ✓ |
| Barrel file facades | Actual files on disk re-exporting providers. Parallel file tree to maintain. | |
| Bun path aliases | bunfig.toml module resolution. Ties aliasing to Bun config. Not portable. | |

**User's choice:** Container resolution
**Notes:** Aliases are metadata in the registry, not filesystem paths.

### Q2: Provider facade contract

| Option | Description | Selected |
|--------|-------------|----------|
| Facade wraps provider | Armature generates facade enforcing contract + domain metadata. Plugin overrides swap behind facade. | ✓ |
| Direct provider access | container.resolve() returns raw contract. No interception point. | |
| Proxy-based facades | JavaScript Proxy wrapping. Most flexible but perf overhead. | |

**User's choice:** Facade wraps provider
**Notes:** None

### Q3: Bootstrap entry point

| Option | Description | Selected |
|--------|-------------|----------|
| core.cjs orchestrates boot | Creates container, registers built-ins, runs lifecycle, exports ready container. | ✓ |
| Armature exports bootstrap | Bootstrap logic in armature module. No core.cjs. | |
| You decide | Claude picks. | |

**User's choice:** core.cjs orchestrates boot
**Notes:** Aligns with architecture plan file tree.

---

## Plugin Extension Model

### Q1: Extension/override mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Facade hook points | before/after/around hooks at method level. override() for replacement. Middleware pattern. | ✓ |
| Container rebinding | Replace whole binding. All-or-nothing. | |
| Decorator/wrapper pattern | Manual composition. Flexible but verbose. | |

**User's choice:** Facade hook points
**Notes:** None

### Q2: Introducing new domains

| Option | Description | Selected |
|--------|-------------|----------|
| Container registration | Plugin uses same bind() as core. New domain appears in registry. | ✓ |
| Manifest declares domains | Plugin manifest declares new domains. Armature parses. | |
| Both manifest + code | Manifest declares intent, code does runtime binding. | |

**User's choice:** Container registration
**Notes:** No special API needed.

### Q3: Plugin manifest scope

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal manifest | Name, version, description, dependencies, entry point, enabled flag. | ✓ |
| Full manifest with domain declarations | Also declares domains, hook points. Pre-boot validation. | |
| You decide | Claude picks. | |

**User's choice:** Minimal manifest
**Notes:** None

### Q4: Plugin lifecycle integration

| Option | Description | Selected |
|--------|-------------|----------|
| Core first, plugins second | Core registers/boots first. Plugins register/boot after. Plugin failure doesn't block core. | ✓ |
| Interleaved by dependency | Single topological sort including plugins. Plugin can block core boot. | |
| You decide | Claude picks. | |

**User's choice:** Core first, plugins second
**Notes:** Clean separation.

---

## Hook Integration Layer

### Q1: What Armature adds beyond Commutator

| Option | Description | Selected |
|--------|-------------|----------|
| Schema + wiring registry | Canonical hook type schemas, declarative registration API, boot-time wiring. Commutator stays runtime bridge. | ✓ |
| Just schema definitions | Only type schemas. Manual registration via Switchboard.on(). | |
| Full hook middleware pipeline | Express-style middleware chain per hook type. Most complex. | |

**User's choice:** Schema + wiring registry
**Notes:** None

### Q2: Claude Code integration at boot

| Option | Description | Selected |
|--------|-------------|----------|
| Hook manifest in config | config.json declares hooks, services, listeners. Armature wires at boot. | ✓ |
| Convention-based auto-discovery | Services exporting 'hooks' property auto-wired. Implicit. | |
| You decide | Claude picks. | |

**User's choice:** Hook manifest in config
**Notes:** Single source of truth.

### Q3: Config validation approach (FWK-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Extend schema.cjs | Enhance existing validator. Zero-dependency. No JSON Schema compliance needed. | ✓ |
| Add Zod at framework level | More expressive. Adds dependency at framework level. | |
| You decide | Claude picks. | |

**User's choice:** Extend schema.cjs
**Notes:** None

---

## Claude's Discretion

- Container internal data structures
- Facade generation implementation details
- Hook schema shape
- Topological sort algorithm
- Error messages and diagnostics for resolution failures
- Config validation error formatting

## Deferred Ideas

None -- discussion stayed within phase scope.
