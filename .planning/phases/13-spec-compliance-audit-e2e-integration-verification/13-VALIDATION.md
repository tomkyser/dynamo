---
phase: 13
slug: spec-compliance-audit-e2e-integration-verification
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test |
| **Config file** | none — existing bun test runner |
| **Quick run command** | `bun test modules/reverie/validation/` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~30 seconds (validation suite), ~120 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `bun test modules/reverie/validation/`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | Audit | structural | `bun test modules/reverie/validation/` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `modules/reverie/validation/` — spec-compliance verification suite files
- [ ] `modules/reverie/validation/compliance-matrix.cjs` — compliance matrix generator (if needed)

*Existing 33-test harness provides baseline; new suite extends it.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Compliance matrix accuracy | D-11 | Requires human spec-vs-code judgment | Read COMPLIANCE-MATRIX.md, verify each row's evidence file:line is accurate |
| Deviation log completeness | D-04 | Requires cross-referencing STATE.md decisions | Verify every STATE.md deviation appears in deviation log |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
