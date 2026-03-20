---
phase: 21
slug: sqlite-session-index
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) |
| **Config file** | none — node:test is zero-config |
| **Quick run command** | `node --test dynamo/tests/ledger/sessions.test.cjs` |
| **Full suite command** | `node --test dynamo/tests/**/*.test.cjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test dynamo/tests/ledger/sessions.test.cjs dynamo/tests/terminus/session-store.test.cjs`
- **After every plan wave:** Run `node --test dynamo/tests/**/*.test.cjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | DATA-01 | unit | `node --test dynamo/tests/terminus/session-store.test.cjs` | ❌ W0 | ⬜ pending |
| 21-01-02 | 01 | 1 | DATA-02 | unit | `node --test dynamo/tests/ledger/sessions.test.cjs` | ✅ | ⬜ pending |
| 21-02-01 | 02 | 2 | DATA-03 | integration | `node --test dynamo/tests/switchboard/install.test.cjs` | ✅ | ⬜ pending |
| 21-02-02 | 02 | 2 | DATA-04 | unit | `node --test dynamo/tests/ledger/sessions.test.cjs` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dynamo/tests/terminus/session-store.test.cjs` — tests for new session-store.cjs module (SQLite init, schema, CRUD, WAL mode, migration)
- [ ] Existing `dynamo/tests/ledger/sessions.test.cjs` — must continue passing unchanged against SQLite backend

*Existing test infrastructure covers the framework and fixtures.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Performance parity | DATA-01 SC4 | Timing-sensitive, varies by system | Run `dynamo session list` with 100+ sessions, compare wall-clock time against JSON baseline |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
