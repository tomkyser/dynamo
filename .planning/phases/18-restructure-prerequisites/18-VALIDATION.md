---
phase: 18
slug: restructure-prerequisites
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) |
| **Config file** | none — tests use node:test directly |
| **Quick run command** | `node dynamo/tests/test-resolve.cjs` |
| **Full suite command** | `node dynamo/tests/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node dynamo/tests/test-resolve.cjs`
- **After every plan wave:** Run `node dynamo/tests/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | ARCH-02 | unit | `node dynamo/tests/test-resolve.cjs` | ❌ W0 | ⬜ pending |
| 18-01-02 | 01 | 1 | ARCH-02 | integration | `node dynamo/tests/` | ✅ | ⬜ pending |
| 18-02-01 | 02 | 1 | ARCH-03 | unit | `node dynamo/tests/test-dep-graph.cjs` | ❌ W0 | ⬜ pending |
| 18-03-01 | 03 | 2 | ARCH-02 | integration | `node dynamo/tests/` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dynamo/tests/test-resolve.cjs` — unit tests for lib/resolve.cjs (layout detection, logical name resolution, error messages)
- [ ] `dynamo/tests/test-dep-graph.cjs` — unit tests for lib/dep-graph.cjs (cycle detection, allowlist)

*Existing test infrastructure (node:test, test runner) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Deployed layout resolution | ARCH-02 | Requires `dynamo install` to ~/.claude/dynamo/ | Run `dynamo install`, then `dynamo health-check` to verify deployed resolver works |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
