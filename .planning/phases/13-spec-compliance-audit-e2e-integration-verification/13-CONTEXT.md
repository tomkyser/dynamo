# Phase 13: Spec Compliance Audit & E2E Integration Verification - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Adversarial audit of every component built in M2 (Phases 7-12.1) against the two canonical specs (`.claude/new-plan.md` and `.claude/reverie-spec-v2.md`), with live bootstrap verification and zero tolerance for spec violations. This phase delivers: a section-by-section spec walkthrough with fix-as-you-go remediation, a comprehensive verification suite replacing Phase 12.1's E2E harness, a compliance matrix mapping every spec section to implementing code, and enriched requirement traceability with implementation evidence.

</domain>

<decisions>
## Implementation Decisions

### Audit Methodology
- **D-01:** Section-by-section spec walkthrough. Read each section of `reverie-spec-v2.md` and `new-plan.md`, grep/read the implementing code, verify contract shapes match, behavioral semantics align, and nothing was silently dropped. Systematic and thorough.
- **D-02:** Adversarial read, not adversarial break. Read the spec like a hostile reviewer looking for gaps, omissions, and silent drops. Verify that what the spec says SHOULD exist actually DOES exist, with the right shape and semantics. Not a penetration test or stress test.
- **D-03:** Cross-component integration seams are priority. The most dangerous spec violations hide at integration boundaries — where one component's output becomes another's input. Verify that hand-off contracts match across the dependency chain (e.g., Wire topology rules match what Session Manager enforces).
- **D-04:** Intentional deviations get a deviation log with justification. When implementation deliberately differs from spec (logged in STATE.md decisions), document the deviation with its rationale. The spec is canon but documented, reasoned departures are acceptable — undocumented ones are violations.

### Violation Remediation
- **D-05:** Fix as you go. Each spec section walkthrough finds violations and fixes them immediately. Audit and remediation are one pass. Violations don't accumulate — leave each section clean before moving to the next.
- **D-06:** Large violations get flagged and scoped as follow-up plans. If a violation requires significant work (new component, major refactor), document it with full detail and scope a remediation plan. Don't block the audit — complete the walkthrough, then address large gaps as separate plans within this phase.
- **D-07:** Every violation fix includes a test that would have caught it. Strengthens the test suite and prevents regression. The test proves the fix is real.

### Live Bootstrap Verification
- **D-08:** Comprehensive verification suite replaces Phase 12.1's E2E harness. Phase 12.1's `integration-harness.test.cjs` + `checkpoint-log.cjs` are subsumed by a thorough spec-compliance verification suite. The existing 6 success criteria stay as a subset within the new suite.
- **D-09:** Suite covers structural + behavioral + lifecycle. Three verification dimensions:
  - **Structural:** Full bootstrap chain from `core.cjs` through service/provider registration to module discovery. Every contract SHAPE matches its spec definition.
  - **Behavioral:** Each component BEHAVES as the spec describes — decay function produces correct scores, formation pipeline fan-out matches spec, REM editorial pass follows spec sequence.
  - **Lifecycle:** init/start/stop for every service, two-phase boot ordering, shutdown reverse ordering, compaction handling, error recovery paths.
- **D-10:** Standalone test target. Tests live in `modules/reverie/validation/` and are runnable via `bun test validation/` for focused spec-compliance checks without running the full test suite.

### Audit Artifacts
- **D-11:** Primary output is a compliance matrix. Structured document mapping each spec section to its implementing code, with status (compliant/deviation/violation/missing), evidence (file:line), and notes. Lives at `.planning/phases/13-spec-compliance-audit-e2e-integration-verification/13-COMPLIANCE-MATRIX.md`.
- **D-12:** REQUIREMENTS.md traceability enriched with implementation evidence. The audit adds file:line references proving each of the 42 M2 requirements is met. Currently the traceability table has only phase assignments — this phase adds concrete implementation evidence.

### Claude's Discretion
- Compliance matrix format details (markdown table structure, status categories beyond compliant/deviation/violation/missing)
- Order of spec sections in the walkthrough (can be optimized for dependency flow)
- Verification suite internal organization (one test file per spec section, per component, or per concern)
- How to handle the replacement of Phase 12.1's harness (preserve/migrate existing tests or rewrite from scratch)
- Granularity of deviation log entries

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Canonical Specs (the audit targets)
- `.claude/new-plan.md` — Architecture plan. Absolute canon. Every service domain, IoC pattern, and layer hierarchy must match implementation.
- `.claude/reverie-spec-v2.md` — Reverie module specification. Canon. All 9 sections + 13 experimental subsections define expected behavior, schemas, and contracts.

### Requirements & Traceability
- `.planning/REQUIREMENTS.md` — 42 M2 requirements with traceability table. Phase 13 enriches this with implementation evidence (file:line references).

### Prior Phase Decisions (audit must respect these)
- `.planning/STATE.md` — Accumulated decisions section contains all intentional deviations from spec with rationale. These are the "documented, reasoned departures" per D-04.

### Existing Verification (being replaced)
- `modules/reverie/validation/integration-harness.test.cjs` — Phase 12.1's E2E harness (33 tests, 69 assertions). Being subsumed per D-08.
- `modules/reverie/validation/checkpoint-log.cjs` — Checkpoint log writer. Assess for reuse in new suite.

### Prior Phase Context (all phases being audited)
- `.planning/phases/07-foundation-infrastructure/07-CONTEXT.md` — Foundation decisions
- `.planning/phases/08-single-session-personality-injection/08-CONTEXT.md` — Personality injection decisions
- `.planning/phases/09-fragment-memory-engine/09-CONTEXT.md` — Fragment engine decisions
- `.planning/phases/09.1-claude-code-integration-layer/09.1-CONTEXT.md` — Integration layer decisions
- `.planning/phases/10-three-session-architecture/10-CONTEXT.md` — Three-session decisions
- `.planning/phases/11-rem-consolidation/11-CONTEXT.md` — REM consolidation decisions
- `.planning/phases/12-integration-surface-backfill/12-CONTEXT.md` — Integration surface decisions
- `.planning/phases/12.1-platform-launch-readiness/12.1-CONTEXT.md` — Launch readiness decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Integration harness** (`modules/reverie/validation/integration-harness.test.cjs`): 33 existing tests covering Phase 12.1's 6 success criteria. Tests use real module code with mock dependencies. Pattern reusable for new comprehensive suite.
- **Checkpoint log** (`modules/reverie/validation/checkpoint-log.cjs`): JSON-format checkpoint writer with pass/fail/partial states. Reusable for compliance matrix generation.
- **Contract shapes**: Every service and provider defines a `SHAPE` constant via `createContract()`. These are the structural audit targets — verify each matches its spec definition.

### Established Patterns
- **Options-based DI**: All components take injected dependencies — enables test isolation for behavioral verification.
- **SHAPE + createContract()**: Frozen contract shapes on every service/provider. Auditable structural target.
- **Switchboard events**: State change events emitted throughout lifecycle. Observable for lifecycle verification.
- **bun:test**: Jest-compatible API, 1,913 tests across 111 files. New suite uses same framework.

### Integration Points
- **Bootstrap chain** (`core/core.cjs` -> `armature/lifecycle.cjs` -> services/providers -> module discovery): Full boot sequence to verify.
- **Wire topology** (`wire/registry.cjs` + `session/wire-topology.cjs`): Cross-component contract between Wire service and Reverie session management.
- **Hook pipeline** (`armature/hooks.cjs` -> `exciter/exciter.cjs` -> `reverie/hooks/hook-handlers.cjs`): Three-layer hook dispatch chain to verify matches spec.
- **REM pipeline** (`rem-consolidator.cjs` -> tiers -> editorial-pass -> conditioning-updater`): Multi-stage consolidation pipeline to verify sequence matches spec.
- **Formation pipeline** (`formation-pipeline.cjs` -> attention gate -> prompt templates -> fragment assembler -> fragment-writer`): Formation chain to verify matches spec flow.

</code_context>

<specifics>
## Specific Ideas

### Adversarial Read Mindset
The user chose "adversarial read, not adversarial break" — the audit reads the spec like a hostile reviewer looking for gaps, silent drops, and undocumented deviations. The question is always "does what the spec says SHOULD exist actually exist in the code?" Not "can I crash it?" This is a compliance audit, not a pentest.

### Fix-as-you-go with Test Proof
Every violation found gets fixed AND gets a test. The test proves the fix is real and prevents regression. This means Phase 13 will grow the test suite beyond the current 1,913 — each spec violation discovered and fixed adds at least one test.

### Comprehensive Suite Replaces E2E Harness
Phase 12.1's harness was a launch readiness check. Phase 13 replaces it with a thorough spec-compliance verification suite covering structural (contract shapes), behavioral (function outputs), and lifecycle (init/start/stop ordering) dimensions. The existing 6 success criteria are subsumed as a subset. This is the definitive "does the code match the spec?" test suite.

### Compliance Matrix as the Deliverable
The phase IS the audit, and the compliance matrix IS the deliverable. Every spec section maps to implementing code with status, evidence, and notes. This becomes the permanent record that someone can read in the future and know: "yes, every spec section was verified against the code."

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 13-spec-compliance-audit-e2e-integration-verification*
*Context gathered: 2026-03-25*
