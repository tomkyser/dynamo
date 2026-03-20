---
phase: 22
slug: m1-verification-and-cleanup
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-20
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, Node.js 24.x) |
| **Config file** | none — tests discovered via glob pattern |
| **Quick run command** | `node --test dynamo/tests/**/*.test.cjs dynamo/tests/*.test.cjs` |
| **Full suite command** | `node --test dynamo/tests/**/*.test.cjs dynamo/tests/*.test.cjs` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test dynamo/tests/**/*.test.cjs dynamo/tests/*.test.cjs`
- **After every plan wave:** Run `node --test dynamo/tests/**/*.test.cjs dynamo/tests/*.test.cjs`
- **Before `/gsd:verify-work`:** Full suite must be green + VERIFICATION.md produced
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | ARCH-01 | structural | `node --test dynamo/tests/boundary.test.cjs` | ✅ | ✅ green |
| 22-01-02 | 01 | 1 | ARCH-02 | structural | `node --test dynamo/tests/boundary.test.cjs` | ✅ | ✅ green |
| 22-01-03 | 01 | 1 | ARCH-03 | static analysis | `node --test dynamo/tests/circular-deps.test.cjs` | ✅ | ✅ green |
| 22-01-04 | 01 | 1 | ARCH-04 | unit | `node --test dynamo/tests/switchboard/sync.test.cjs` | ✅ | ✅ green |
| 22-01-05 | 01 | 1 | ARCH-05 | unit+integration | `node --test dynamo/tests/switchboard/sync.test.cjs` | ✅ | ✅ green |
| 22-01-06 | 01 | 1 | ARCH-06 | unit | `node --test dynamo/tests/switchboard/install.test.cjs` | ✅ | ✅ green |
| 22-01-07 | 01 | 1 | ARCH-07 | full suite | `node --test dynamo/tests/**/*.test.cjs dynamo/tests/*.test.cjs` | ✅ | ✅ green |
| 22-01-08 | 01 | 1 | MGMT-01 | unit | `node --test dynamo/tests/switchboard/health-check.test.cjs` | ✅ | ✅ green |
| 22-01-09 | 01 | 1 | MGMT-08a | unit | `node --test dynamo/tests/ledger/dispatcher.test.cjs` | ✅ | ✅ green |
| 22-01-10 | 01 | 1 | MGMT-08b | unit | `node --test dynamo/tests/ledger/dispatcher.test.cjs` | ✅ | ✅ green |
| 22-01-11 | 01 | 1 | DATA-01 | unit | `node --test dynamo/tests/switchboard/session-store.test.cjs` | ✅ | ✅ green |
| 22-01-12 | 01 | 1 | DATA-02 | unit | `node --test dynamo/tests/ledger/sessions.test.cjs` | ✅ | ✅ green |
| 22-01-13 | 01 | 1 | DATA-03 | unit | `node --test dynamo/tests/switchboard/session-store.test.cjs` | ✅ | ✅ green |
| 22-01-14 | 01 | 1 | DATA-04 | unit | `node --test dynamo/tests/ledger/sessions.test.cjs` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Phase 22 adds verification procedures (tmpdir sandbox, real install script) but does not need new test files. The VERIFICATION.md serves as the persistent evidence artifact.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fresh `dynamo install` on clean `~/.claude/dynamo/` | ARCH-06 | Requires real filesystem side effects, user backup/restore | Script backs up existing deployment, installs fresh, runs health-check, user confirms, restores |
| `dynamo health-check` all green on fresh deploy | MGMT-01 | Requires Docker stack running | Run `dynamo health-check` after fresh install, verify 8/8 stages pass |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (2026-03-20)

---

## Validation Audit 2026-03-20
| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Full suite: 514 pass, 0 fail. All 14 task test commands verified green. All Wave 0 items satisfied.
