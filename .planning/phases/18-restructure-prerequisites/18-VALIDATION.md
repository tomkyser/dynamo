---
phase: 18
slug: restructure-prerequisites
status: complete
nyquist_compliant: true
wave_0_complete: true
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
| **Quick run command** | `node --test dynamo/tests/resolve.test.cjs` |
| **Full suite command** | `node dynamo/tests/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test dynamo/tests/resolve.test.cjs`
- **After every plan wave:** Run `node dynamo/tests/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | ARCH-02 | unit | `node --test dynamo/tests/resolve.test.cjs` | ✅ | ✅ green |
| 18-01-02 | 01 | 1 | ARCH-03 | unit | `node --test dynamo/tests/dep-graph.test.cjs && node --test dynamo/tests/circular-deps.test.cjs` | ✅ | ✅ green |
| 18-02-01 | 02 | 2 | ARCH-02 | integration | inline stale-resolver scan | ✅ | ✅ green |
| 18-02-02 | 02 | 2 | ARCH-02, ARCH-03 | regression | `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `dynamo/tests/resolve.test.cjs` — unit tests for lib/resolve.cjs (layout detection, logical name resolution, error messages)
- [x] `dynamo/tests/dep-graph.test.cjs` — unit tests for lib/dep-graph.cjs (cycle detection, allowlist)
- [x] `dynamo/tests/circular-deps.test.cjs` — integration test scanning all production modules for circular require() chains

*Existing test infrastructure (node:test, test runner) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Deployed layout resolution | ARCH-02 | Requires `dynamo install` to ~/.claude/dynamo/ | Run `dynamo install`, then `dynamo health-check` to verify deployed resolver works |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (2026-03-20)

---

## Validation Audit 2026-03-20
| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Full suite: 514 pass, 0 fail. All Wave 0 test files exist and pass.
