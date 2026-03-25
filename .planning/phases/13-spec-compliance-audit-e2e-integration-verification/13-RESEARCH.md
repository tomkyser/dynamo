# Phase 13: Spec Compliance Audit & E2E Integration Verification - Research

**Researched:** 2026-03-25
**Domain:** Adversarial spec compliance audit, verification suite design, compliance matrix generation
**Confidence:** HIGH

## Summary

Phase 13 is an adversarial audit of every component built in M2 (Phases 7-12.1) against the two canonical specs (`.claude/new-plan.md` and `.claude/reverie-spec-v2.md`), with fix-as-you-go remediation, a comprehensive verification suite, and a compliance matrix as the primary deliverable. This is not a code-writing phase in the traditional sense -- it is a systematic verification phase that produces fixes and tests as byproducts of the audit.

The codebase is mature: 1,913 tests across 111 files, all passing. There are 42 M2 requirements, all marked as Complete. The existing test suite covers every component with dedicated test files. The Phase 12.1 integration harness (33 tests, 69 assertions) covers 6 success criteria but is being subsumed by a more comprehensive spec-compliance suite per D-08.

The primary technical challenge is not writing code -- it is the systematic, section-by-section reading of two canonical specs (910 lines in reverie-spec-v2.md, 156 lines in new-plan.md) against the implementing code (55+ Reverie source files, 58+ core source files), identifying gaps, fixing them inline, and producing regression tests for each fix. The audit must also produce a compliance matrix mapping every spec section to its implementing code with status and evidence.

**Primary recommendation:** Structure the audit as a sequential walkthrough of spec sections grouped by domain (Self Model, Fragment Engine, Sessions, REM, Context, Platform Integration, Modes), with each walkthrough plan covering a coherent domain and producing both fixes and the corresponding compliance matrix rows.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Section-by-section spec walkthrough. Read each section of `reverie-spec-v2.md` and `new-plan.md`, grep/read the implementing code, verify contract shapes match, behavioral semantics align, and nothing was silently dropped. Systematic and thorough.
- **D-02:** Adversarial read, not adversarial break. Read the spec like a hostile reviewer looking for gaps, omissions, and silent drops. Verify that what the spec says SHOULD exist actually DOES exist, with the right shape and semantics. Not a penetration test or stress test.
- **D-03:** Cross-component integration seams are priority. The most dangerous spec violations hide at integration boundaries -- where one component's output becomes another's input. Verify that hand-off contracts match across the dependency chain.
- **D-04:** Intentional deviations get a deviation log with justification. When implementation deliberately differs from spec (logged in STATE.md decisions), document the deviation with its rationale. The spec is canon but documented, reasoned departures are acceptable -- undocumented ones are violations.
- **D-05:** Fix as you go. Each spec section walkthrough finds violations and fixes them immediately. Audit and remediation are one pass. Violations don't accumulate.
- **D-06:** Large violations get flagged and scoped as follow-up plans. If a violation requires significant work (new component, major refactor), document it with full detail and scope a remediation plan.
- **D-07:** Every violation fix includes a test that would have caught it. Strengthens the test suite and prevents regression.
- **D-08:** Comprehensive verification suite replaces Phase 12.1's E2E harness. Phase 12.1's `integration-harness.test.cjs` + `checkpoint-log.cjs` are subsumed by a thorough spec-compliance verification suite. The existing 6 success criteria stay as a subset.
- **D-09:** Suite covers structural + behavioral + lifecycle. Three verification dimensions: structural (contract shapes), behavioral (function outputs match spec), lifecycle (init/start/stop ordering).
- **D-10:** Standalone test target. Tests live in `modules/reverie/validation/` and are runnable via `bun test validation/`.
- **D-11:** Primary output is a compliance matrix at `.planning/phases/13-spec-compliance-audit-e2e-integration-verification/13-COMPLIANCE-MATRIX.md`.
- **D-12:** REQUIREMENTS.md traceability enriched with implementation evidence (file:line references proving each of the 42 M2 requirements is met).

### Claude's Discretion
- Compliance matrix format details (markdown table structure, status categories beyond compliant/deviation/violation/missing)
- Order of spec sections in the walkthrough (can be optimized for dependency flow)
- Verification suite internal organization (one test file per spec section, per component, or per concern)
- How to handle the replacement of Phase 12.1's harness (preserve/migrate existing tests or rewrite from scratch)
- Granularity of deviation log entries

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

## Standard Stack

### Core (No New Dependencies)
This phase introduces zero new libraries. It uses only existing project infrastructure:

| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| `bun:test` | Built-in (Bun 1.3.11) | Verification suite framework | Already used for all 1,913 tests, Jest-compatible API |
| Existing `lib/` utilities | N/A | `ok`, `err`, `createContract`, `validate` | Platform Result pattern and contract verification |
| `node:fs` | Built-in | File reading for audit (grep/read implementing code) | Standard filesystem access |
| `zod` | 4.x (installed) | Schema shape verification | Already used in `lib/schemas.cjs` for fragment/Self Model validation |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `checkpoint-log.cjs` | Checkpoint log writer (existing) | Assess for reuse in compliance matrix generation -- JSON format with pass/fail/partial states |
| `integration-harness.test.cjs` | Existing E2E harness (being replaced) | Reference for 6 success criteria that must be subsumed into new suite |

## Architecture Patterns

### Audit Organization: Spec Domain Groupings

The reverie-spec-v2.md has 10 numbered sections with 47 subsections. The new-plan.md has 7 conceptual sections. For audit efficiency, group by domain:

```
Audit Domains (ordered by dependency flow):
1. Platform Architecture (new-plan.md: layers, services, providers, engineering principles)
2. Self Model (spec sections 2.1-2.4)
3. Fragment Memory Engine (spec sections 3.1-3.12)
4. Three-Session Architecture (spec sections 4.1-4.6)
5. REM Consolidation (spec sections 5.1-5.4)
6. Platform Integration (spec section 6.1-6.3)
7. Operational Modes (spec sections 7.1-7.4)
8. Primary Context Management (spec sections 8.1-8.7)
9. Cross-Component Integration Seams (D-03: hand-off contracts between components)
```

### Verification Suite Organization

**Recommended: One test file per audit domain** in `modules/reverie/validation/`:

```
modules/reverie/validation/
  integration-harness.test.cjs     # EXISTING -- subsumed by new suite
  checkpoint-log.cjs               # EXISTING -- reusable for compliance evidence
  checkpoint-log.test.cjs          # EXISTING -- kept
  spec-self-model.test.cjs         # NEW: Self Model structural + behavioral
  spec-fragments.test.cjs          # NEW: Fragment schema, types, formation, decay
  spec-sessions.test.cjs           # NEW: Three-session topology, lifecycle
  spec-rem.test.cjs                # NEW: REM consolidation tiers, operations
  spec-context.test.cjs            # NEW: Context management, budget, referential framing
  spec-platform.test.cjs           # NEW: Platform integration (hook wiring, data architecture)
  spec-modes.test.cjs              # NEW: Operational modes
  spec-integration-seams.test.cjs  # NEW: Cross-component contract matching
```

**Rationale for per-domain files over per-section files:**
- Spec has 47+ subsections -- one file per subsection would be 47+ files, too granular
- Per-domain files keep related tests together and allow structural/behavioral/lifecycle tests to coexist for a domain
- Each file is independently runnable: `bun test validation/spec-self-model.test.cjs`
- The existing harness's 6 SC tests distribute naturally across the domain files (SC-1 to spec-platform, SC-2 to spec-platform, SC-3 to spec-platform, SC-4 to spec-sessions, SC-5 to spec-sessions, SC-6 to spec-integration-seams)

### Pattern 1: Structural Verification (Contract Shape Matching)

**What:** Verify every service/provider's SHAPE constant matches what the spec says it should expose.
**When to use:** For every createContract-wrapped component (21 files with SHAPE constants found).
**Example:**
```javascript
// Verify Wire SHAPE matches spec Section 6.1 (Wire: Inter-session communication)
const { WIRE_SHAPE } = require('../../../core/services/wire/wire.cjs');
expect(WIRE_SHAPE).toHaveProperty('register');
expect(WIRE_SHAPE).toHaveProperty('send');
expect(WIRE_SHAPE).toHaveProperty('subscribe');
// ... verify all spec-required methods exist
```

### Pattern 2: Behavioral Verification (Output Correctness)

**What:** Verify functions produce outputs matching spec-defined behavior.
**When to use:** For spec-defined algorithms (decay function 3.9, formation pipeline 3.6, REM tiers 5.2).
**Example:**
```javascript
// Verify decay function matches spec Section 3.9 formula
const { computeDecay } = require('../components/fragments/decay.cjs');
const result = computeDecay({
  initial_weight: 0.85,
  days_since_creation: 7,
  consolidation_count: 1,
  access_count: 3,
  relevance: { identity: 0.2, relational: 0.7, conditioning: 0.4 },
});
// Verify against hand-computed expected value from spec formula
expect(result).toBeCloseTo(expectedFromFormula, 4);
```

### Pattern 3: Lifecycle Verification (Ordering and State Transitions)

**What:** Verify init/start/stop sequences, two-phase boot ordering, shutdown reverse ordering.
**When to use:** For session lifecycle (spec 4.6), REM lifecycle (spec 5.2), bootstrap chain.
**Example:**
```javascript
// Verify bootstrap boots services in topological order per new-plan.md
const { bootstrap } = require('../../../core/core.cjs');
const result = await bootstrap({ paths: testPaths });
// Verify container has all 10 services and 3 providers registered
```

### Pattern 4: Compliance Matrix Row Generation

**What:** For each spec section, produce a structured record of status + evidence.
**Format:**
```markdown
| Spec Section | Status | Implementing Code | Evidence | Notes |
|-------------|--------|-------------------|----------|-------|
| 2.1 What the Self Model Is | Compliant | modules/reverie/components/self-model/self-model.cjs | Three aspects (Face/Mind/Subconscious) modeled | |
| 2.2 Self Model State | Deviation | modules/reverie/lib/schemas.cjs:45 | JSON frontmatter not YAML per D-106 | Intentional per STATE.md |
```

**Status categories:**
- **Compliant** -- implementation matches spec
- **Deviation** -- implementation intentionally differs from spec (documented in STATE.md)
- **Violation** -- implementation does not match spec (requires fix)
- **Missing** -- spec-required functionality not implemented
- **N/A** -- spec section is informational/motivational, no implementation required (e.g., 1.1-1.5 Mechanistic Constraints, 3.2 Why Fragments)

### Anti-Patterns to Avoid
- **Rubber-stamping:** Marking a section "Compliant" without actually reading the implementing code and verifying the contract shape and behavioral semantics
- **Spec drift normalization:** Accepting undocumented deviations as "close enough" -- if it differs from spec and there's no STATE.md decision justifying it, it is a violation per D-04
- **Test theater:** Writing tests that verify trivial properties (function exists, exports a name) instead of behavioral semantics (output matches spec formula, state transitions follow spec sequence)
- **Accumulation deferral:** Saving all fixes for the end instead of fixing as you go per D-05

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation | Manual property checks | Zod schemas in `lib/schemas.cjs` | Already defined for all fragment types, Self Model state |
| Contract shape verification | Manual hasOwnProperty loops | `createContract()` + frozen SHAPE constants | Platform pattern, already on all 21 contract files |
| Test framework | Custom assertion library | `bun:test` with Jest-compatible expect() | 1,913 tests already using it |
| Checkpoint logging | Custom result file writing | `checkpoint-log.cjs` | Already built with pass/fail/partial states |
| Result type wrapping | try/catch with raw objects | `ok()`/`err()` from `lib/result.cjs` | Platform convention, all components use it |

## Common Pitfalls

### Pitfall 1: JSON vs YAML Frontmatter Confusion
**What goes wrong:** The spec (Section 3.3) shows fragment schema with "YAML frontmatter" headers, but the implementation uses JSON frontmatter per STATE.md decision [Phase 07].
**Why it happens:** Spec was written before the JSON frontmatter decision was locked.
**How to avoid:** This is a documented, intentional deviation. Log it in the deviation column of the compliance matrix. Do NOT flag it as a violation. The spec says "YAML frontmatter" but STATE.md says "JSON frontmatter is a clean break from YAML -- no dual-format support."
**Warning signs:** Any audit note that says "spec says YAML but code uses JSON" should trigger checking STATE.md first.

### Pitfall 2: Spec Sections That Are Aspirational, Not Implementable
**What goes wrong:** Some spec sections describe LLM behavior that cannot be verified programmatically (e.g., "the Mind's formation processing template drives questions like: what does this evoke?" from Section 3.6).
**Why it happens:** The spec intentionally describes the *character* of processing, not a literal checklist. These are prompt engineering targets, not code contracts.
**How to avoid:** Mark these sections as having verification limited to: (a) the prompt template exists and contains the relevant framing, (b) the pipeline structure that would enable the described behavior exists. Do not attempt to verify that an LLM actually produces the described phenomenological output.
**Warning signs:** A spec sentence starting with "The Mind processes..." or "The Subconscious resonates..." describes LLM behavior, not code behavior.

### Pitfall 3: Silent Drops at Integration Boundaries
**What goes wrong:** Component A's output schema doesn't match Component B's expected input, but both pass their own unit tests because they use different mock shapes.
**Why it happens:** Each component was built in its own phase with its own mocks. The mocks may not reflect the actual contract of the dependency.
**How to avoid:** D-03 specifically targets this. For every integration seam (Wire topology <-> Session Manager, Formation pipeline <-> Fragment Writer, REM consolidator <-> Editorial Pass, etc.), verify that the actual output of Component A is a valid input for Component B using the real factories, not mocks.
**Warning signs:** A component's test uses a mock with fewer properties than the real dependency exposes.

### Pitfall 4: Overcounting the Existing Test Suite
**What goes wrong:** Assuming the existing 1,913 tests already cover spec compliance because the components "work."
**Why it happens:** The existing tests verify implementation behavior (the code does what the code does), not spec compliance (the code does what the spec says).
**How to avoid:** The verification suite (D-09) tests spec compliance specifically: contract shapes match spec definitions, behavioral outputs match spec formulas, lifecycle sequences match spec descriptions. These are different from unit tests that verify internal consistency.
**Warning signs:** A verification test that can pass even if the spec-defined behavior is wrong (because it tests implementation, not spec).

### Pitfall 5: Missing Sections 9.x Experimental Flags
**What goes wrong:** Treating the 13 experimental sections (9.1-9.13) as things that need implementation verification.
**Why it happens:** They look like spec sections.
**How to avoid:** Section 9 items are "Open Questions and Experimental Flags" -- they describe things that NEED empirical validation, not things that should already be implemented. The compliance matrix should note these as "EXPERIMENTAL -- deferred to runtime validation" with pointers to where the configurable parameters live in code.
**Warning signs:** Trying to verify that "sublimation cycle frequency of 5-10 seconds" is correct -- this is explicitly an estimate needing empirical tuning.

### Pitfall 6: Scope Creep Into New Feature Development
**What goes wrong:** Finding a spec section that describes a feature more completely than the implementation, and building the full feature instead of documenting the gap.
**Why it happens:** The adversarial read mindset is supposed to find gaps. The temptation is to fill them.
**How to avoid:** Per D-06, large violations get flagged and scoped as follow-up plans. The audit documents the gap; it does not build new components. Fixes per D-05 are for discrepancies in existing code, not absent features.
**Warning signs:** A "fix" that creates a new file rather than modifying an existing one (unless it's a test file per D-07).

## Code Examples

### Verified Pattern: Running Validation Suite in Isolation

```bash
# Run only the spec-compliance validation suite (per D-10)
cd modules/reverie && bun test validation/

# Run a specific domain
bun test validation/spec-fragments.test.cjs

# Run the full project suite (includes validation)
bun test
```

### Verified Pattern: Contract Shape Audit

```javascript
'use strict';
const { describe, it, expect } = require('bun:test');

// Structural verification: every SHAPE method exists on the real contract
describe('Wire contract matches spec Section 6.1', () => {
  it('exposes all spec-required methods', () => {
    const { createWire } = require('../../../core/services/wire/wire.cjs');
    const wireResult = createWire();
    expect(wireResult.ok).toBe(true);
    const wire = wireResult.value;
    // Spec 6.1: Wire provides inter-session communication
    expect(typeof wire.register).toBe('function');
    expect(typeof wire.send).toBe('function');
    expect(typeof wire.subscribe).toBe('function');
  });
});
```

### Verified Pattern: Behavioral Audit (Decay Formula)

```javascript
'use strict';
const { describe, it, expect } = require('bun:test');

// Behavioral verification: decay function matches spec Section 3.9
describe('Decay function matches spec Section 3.9', () => {
  it('applies spec formula: current_weight = initial_weight * relevance * time_decay * access_bonus', () => {
    const { computeDecay, DECAY_DEFAULTS } = require('../components/fragments/decay.cjs');
    const params = {
      initial_weight: 1.0,
      days_since_creation: 0,
      consolidation_count: 0,
      access_count: 0,
      relevance: { identity: 1.0, relational: 1.0, conditioning: 1.0 },
    };
    // At t=0, no consolidation, no access: should return initial_weight * relevance * 1.0 * 1.0
    const result = computeDecay(params);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(params.initial_weight);
  });
});
```

### Verified Pattern: Deviation Log Entry

```markdown
| Spec Section | Spec Says | Implementation Does | Justification |
|-------------|-----------|---------------------|---------------|
| 3.3 Fragment Schema | YAML frontmatter | JSON frontmatter | STATE.md [Phase 07]: "JSON frontmatter is a clean break from YAML" |
| 4.2 Primary Session | systemMessage injection | additionalContext injection | STATE.md [Phase 08]: "All hook injection uses additionalContext not systemMessage per Pitfall 1" |
```

## Spec Section Inventory (Audit Targets)

### reverie-spec-v2.md: 10 Sections, 47 Subsections

| Section | Subsections | Implementing Components | Audit Focus |
|---------|-------------|------------------------|-------------|
| 1. Mechanistic Constraints | 1.1-1.5 | N/A -- philosophical grounding | N/A (informational) |
| 2. Self Model | 2.1-2.4 | self-model.cjs, cold-start.cjs, schemas.cjs | State shape, three aspects, initialization |
| 3. Fragment Engine | 3.1-3.12 | fragment-writer.cjs, decay.cjs, formation-pipeline.cjs, attention-gate.cjs, recall-engine.cjs, association-index.cjs, taxonomy-governor.cjs, backfill-*.cjs, schemas.cjs | Schema, types, pipeline, decay formula, taxonomy, source-reference |
| 4. Three-Session Architecture | 4.1-4.6 | session-manager.cjs, session-config.cjs, wire-topology.cjs, mind-cycle.cjs, sublimation-loop.cjs, triplet.cjs | Topology rules, lifecycle, Wire communication patterns |
| 5. REM Consolidation | 5.1-5.4 | rem-consolidator.cjs, triage.cjs, provisional-rem.cjs, full-rem.cjs, editorial-pass.cjs, retroactive-evaluator.cjs, conditioning-updater.cjs, quality-evaluator.cjs | Three tiers, operations, working memory gate |
| 6. Platform Integration | 6.1-6.3 | hook-handlers.cjs, reverie.cjs, register-commands.cjs | Hook wiring, service usage, data architecture |
| 7. Operational Modes | 7.1-7.4 | mode-manager.cjs | Active/Passive/REM/Dormant |
| 8. Context Management | 8.1-8.7 | context-manager.cjs, budget-tracker.cjs, referential-framing.cjs, template-composer.cjs | Continuous reinjection, referential framing, budget phases |
| 9. Experimental Flags | 9.1-9.13 | Various configurable parameters | Document parameter locations, not verify values |
| 10. Success Criteria | 10.1-10.10 | N/A -- outcome metrics | Map to testable proxies where possible |

### new-plan.md: 7 Conceptual Domains

| Domain | Key Requirements | Audit Focus |
|--------|-----------------|-------------|
| General Decisions | Bun, CJS, JSON, no LLM API below SDK | Verify all source files are CJS, no YAML parsing, no LLM API calls |
| Layer Hierarchy | Core Library -> Services/Providers -> Framework -> SDK -> Modules | Verify import direction, no reverse dependencies |
| Core Services (9) | Commutator, Magnet, Conductor, Forge, Lathe, Relay, Switchboard, Wire, Assay | All registered in bootstrap, all have contracts |
| Core Providers (2) | Ledger, Journal | Registered, contract shapes match |
| Framework (Armature) | Contracts, hooks, plugin API | Container, lifecycle, facade, hooks |
| SDK (Circuit + Pulley) | Module API, CLI/MCP | Circuit exposes services safely, Pulley routes commands |
| Engineering Principles | IoC, SoC, DRY, hardcode nothing | Spot-check patterns across codebase |

## Existing Assets Assessment

### Integration Harness (modules/reverie/validation/integration-harness.test.cjs)
- **33 tests, 69 assertions**, covering 6 success criteria (SC-1 through SC-6)
- **SC-1:** Module discovery and automatic registration (5 tests)
- **SC-2:** Hook handlers fire through Exciter/Armature (3 tests)
- **SC-3:** Skills registered and accessible (4 tests)
- **SC-4:** Session triplet spawning with Wire topology (4 tests)
- **SC-5:** Multi-triplet isolation (4 tests)
- **SC-6:** Full lifecycle validation (5 tests)
- **Recommendation:** Preserve the existing file as-is during the transition. The 6 SCs are subsumed into the new suite's domain files. Once new spec-compliance tests cover the same ground, the old harness can be deprecated or removed.

### Checkpoint Log (modules/reverie/validation/checkpoint-log.cjs)
- JSON format checkpoint writer with pass/fail/partial states
- **Recommendation:** Reuse for generating structured compliance evidence. Extend the schema if needed to include spec section references.

### Existing Component Tests (106 test files, 1,913 tests)
- Every component has dedicated unit tests in `__tests__/` directories
- These verify internal behavior, not spec compliance
- **Recommendation:** These remain as-is. The spec-compliance suite is additive, not a replacement.

## Compliance Matrix Format

**Recommended format for 13-COMPLIANCE-MATRIX.md:**

```markdown
# Compliance Matrix: Reverie Spec v2

## Status Legend
- **C** = Compliant
- **D** = Intentional Deviation (documented in STATE.md)
- **V** = Violation (fixed in this phase)
- **M** = Missing (scoped as follow-up)
- **NA** = Not applicable (informational section)
- **EXP** = Experimental (deferred to runtime validation)

## Section 2: Self Model

| ID | Spec Section | Status | Implementing File(s) | Evidence | Notes |
|----|-------------|--------|---------------------|----------|-------|
| S2.1 | 2.1 What the Self Model Is | C | self-model.cjs | Three aspects modeled via Face/Mind/Subconscious | |
| S2.2a | 2.2 Identity Core | C | schemas.cjs:XX, self-model.cjs:YY | 5 fields match spec table | |
...
```

## Known Intentional Deviations (from STATE.md)

The following STATE.md decisions represent intentional departures from spec that should be marked as "D" (Deviation), not "V" (Violation):

| State Decision | Spec Section Affected | Deviation |
|---------------|----------------------|-----------|
| [Phase 07] JSON frontmatter | 3.3 Fragment Schema (shows YAML) | JSON not YAML |
| [Phase 07] Zod 4 record syntax | 3.3 (field definitions) | `z.record(z.string(), schema)` not Zod 3 syntax |
| [Phase 08] additionalContext not systemMessage | 4.2 (hook injection), 8.3 (reinjection) | Pitfall 1 drove this change |
| [Phase 08] Phase 3 injection LARGER than Phase 1 | 8.5 (budget phases) | Per research D-05/D-06 |
| [Phase 09] associations includes emotional_valence | 3.3 (schema) | Actual Zod schema more complete than plan interface |
| [Phase 09] Formation agents at .claude/agents/ | 3.6 (formation pipeline) | Claude Code discovery path |
| [Phase 10] Session spawner in conductor/ not module scope | 4.6 (session lifecycle) | Platform capability, not module scope |
| [Phase 10] String literals for state matching | 4.x (session states) | Avoids circular require risk |
| [Phase 11] Prompt/apply separation | 5.3 (REM operations) | Testability: orchestrator never calls LLM directly |
| [Phase 12] Mode Manager uses getMode() returning string | 7.x (operational modes) | Adapted from actual code vs plan interface |

This is not exhaustive -- the full list of 60+ STATE.md decisions must be checked during the audit.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | bun:test (built-in, Bun 1.3.11) |
| Config file | None -- bun:test needs no config file |
| Quick run command | `bun test modules/reverie/validation/` |
| Full suite command | `bun test` |

### Phase Requirements -> Test Map

Phase 13 has no formal requirement IDs assigned. The requirements are the spec sections themselves. The mapping is:

| Audit Domain | Spec Sections | Test File | Automated Command |
|-------------|---------------|-----------|-------------------|
| Self Model | 2.1-2.4 | `validation/spec-self-model.test.cjs` | `bun test validation/spec-self-model.test.cjs` |
| Fragment Engine | 3.1-3.12 | `validation/spec-fragments.test.cjs` | `bun test validation/spec-fragments.test.cjs` |
| Sessions | 4.1-4.6 | `validation/spec-sessions.test.cjs` | `bun test validation/spec-sessions.test.cjs` |
| REM | 5.1-5.4 | `validation/spec-rem.test.cjs` | `bun test validation/spec-rem.test.cjs` |
| Platform Integration | 6.1-6.3 | `validation/spec-platform.test.cjs` | `bun test validation/spec-platform.test.cjs` |
| Modes | 7.1-7.4 | `validation/spec-modes.test.cjs` | `bun test validation/spec-modes.test.cjs` |
| Context Management | 8.1-8.7 | `validation/spec-context.test.cjs` | `bun test validation/spec-context.test.cjs` |
| Cross-Component Seams | D-03 | `validation/spec-integration-seams.test.cjs` | `bun test validation/spec-integration-seams.test.cjs` |

### Sampling Rate
- **Per task commit:** `bun test modules/reverie/validation/` (validation suite only)
- **Per wave merge:** `bun test` (full suite -- must remain green)
- **Phase gate:** Full suite green + compliance matrix complete + REQUIREMENTS.md enriched

### Wave 0 Gaps
- [ ] `modules/reverie/validation/spec-self-model.test.cjs` -- covers spec sections 2.1-2.4
- [ ] `modules/reverie/validation/spec-fragments.test.cjs` -- covers spec sections 3.1-3.12
- [ ] `modules/reverie/validation/spec-sessions.test.cjs` -- covers spec sections 4.1-4.6
- [ ] `modules/reverie/validation/spec-rem.test.cjs` -- covers spec sections 5.1-5.4
- [ ] `modules/reverie/validation/spec-platform.test.cjs` -- covers spec sections 6.1-6.3
- [ ] `modules/reverie/validation/spec-modes.test.cjs` -- covers spec sections 7.1-7.4
- [ ] `modules/reverie/validation/spec-context.test.cjs` -- covers spec sections 8.1-8.7
- [ ] `modules/reverie/validation/spec-integration-seams.test.cjs` -- covers D-03 integration boundaries
- [ ] `.planning/phases/13-spec-compliance-audit-e2e-integration-verification/13-COMPLIANCE-MATRIX.md` -- primary deliverable

## Integration Seams to Audit (D-03 Priority)

These are the most dangerous boundaries where spec violations hide:

| Seam | Component A Output | Component B Input | Risk |
|------|-------------------|-------------------|------|
| Wire <-> Session Manager | Wire topology rules (registry.cjs) | Session Manager Wire registration (session-manager.cjs) | Topology rules might not match session identity expectations |
| Formation Pipeline <-> Fragment Writer | Formation pipeline produces fragment envelopes | Fragment Writer expects envelope shape | Envelope schema mismatch |
| Formation Pipeline <-> Association Index | Pipeline produces association upserts via Wire | Association index expects specific table schemas | Column/field name mismatch |
| Hook Handlers <-> Context Manager | Hook handlers call context manager for injection | Context manager returns formatted injection | additionalContext format expectations |
| REM Consolidator <-> Editorial Pass | Consolidator calls editorial pass with session data | Editorial pass expects specific data shape | Session artifact schema mismatch |
| REM Consolidator <-> Conditioning Updater | Consolidator calls conditioning updater | Updater expects Self Model + session metrics | Metrics shape mismatch |
| Recall Engine <-> Assay | Recall engine builds queries for Assay | Assay expects query format from provider contract | Query format mismatch |
| Mind Cycle <-> Formation Pipeline | Mind cycle produces stimulus for formation | Pipeline expects stimulus shape (attention gate input) | Stimulus schema mismatch |
| Sublimation Loop <-> Wire | Loop sends sublimation candidates via Wire | Mind cycle receives and evaluates sublimation messages | Message format mismatch |
| Mode Manager <-> Session Manager | Mode transitions trigger session state changes | Session manager expects specific transition commands | State machine compatibility |

## Codebase Metrics (Baseline)

| Metric | Value |
|--------|-------|
| Total test files | 111 |
| Total tests | 1,913 |
| Total assertions | 6,506 |
| Test run time | ~9.5 seconds |
| Reverie source files | 55+ |
| Core source files | 58+ |
| Contract-wrapped components | 21 |
| M2 requirements | 42 (all marked Complete) |
| Spec sections (reverie-spec-v2) | 47 subsections |
| Spec sections (new-plan) | 7 domains |
| Integration harness tests (existing) | 33 tests, 69 assertions |
| STATE.md accumulated decisions | 60+ |

## Open Questions

1. **How granular should compliance matrix rows be?**
   - What we know: Spec has 47 subsections, each could be 1 row, but some subsections have multiple verifiable claims
   - What's unclear: Should each verifiable claim within a subsection get its own row, or is one row per subsection sufficient?
   - Recommendation: One row per subsection as default. Add sub-rows only when a subsection has both compliant and non-compliant elements.

2. **Should integration-harness.test.cjs be deleted or preserved?**
   - What we know: D-08 says it's "subsumed" but doesn't say "deleted"
   - What's unclear: Whether to keep it as a historical artifact or remove it to avoid confusion
   - Recommendation: Keep it during Phase 13 execution. Mark it with a deprecation comment. Remove in a cleanup pass at the end.

3. **What qualifies as a "large violation" per D-06?**
   - What we know: "New component, major refactor" qualifies
   - What's unclear: The threshold between "fix inline" and "scope as follow-up"
   - Recommendation: If a fix requires changes to more than 3 files or creates a new source file (not test), scope it as a follow-up plan within Phase 13.

## Project Constraints (from CLAUDE.md)

- **Runtime:** Bun -- all code runs on Bun, CJS format
- **No npm dependencies for core:** Platform core uses only Bun/Node built-ins
- **CJS everywhere:** `'use strict'` + `require()`/`module.exports` in every file
- **Canonical specs:** `.claude/new-plan.md` (architecture plan, absolute canon) and `.claude/reverie-spec-v2.md` (Reverie module spec, canon)
- **Engineering principles:** IoC, SoC, DRY, abstraction over lateralization, hardcode nothing
- **Testing:** `bun:test` with Jest-compatible API
- **Versioning:** User decides version increments; always push to origin after commits
- **Data format:** JSON for structured data, Markdown for narrative data (no YAML)
- **No LLM API below SDK scope**

## Sources

### Primary (HIGH confidence)
- `.claude/reverie-spec-v2.md` -- Reverie specification, 910 lines, 10 sections (directly read and analyzed)
- `.claude/new-plan.md` -- Architecture plan, 156 lines, 7 domains (directly read and analyzed)
- `.planning/REQUIREMENTS.md` -- 42 M2 requirements with traceability (directly read)
- `.planning/STATE.md` -- 60+ accumulated decisions (directly read)
- `13-CONTEXT.md` -- Phase 13 user decisions D-01 through D-12 (directly read)
- Codebase audit: 111 test files, 1,913 tests, 21 contract-wrapped components (verified via bun test and grep)

### Secondary (MEDIUM confidence)
- Existing `integration-harness.test.cjs` -- 33 tests covering 6 success criteria (directly read)
- `checkpoint-log.cjs` -- Reusable checkpoint writer (directly read)

### Tertiary (LOW confidence)
- None. This phase is entirely internal to the project -- no external sources needed.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing infrastructure
- Architecture: HIGH -- audit methodology is well-defined by CONTEXT.md decisions
- Pitfalls: HIGH -- derived from direct reading of spec vs code patterns

**Research date:** 2026-03-25
**Valid until:** N/A -- this is a one-time audit phase, not an evolving technology research
