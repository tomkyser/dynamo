---
phase: 15
slug: update-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, Node 24.13.1) |
| **Config file** | none — uses `node --test` CLI |
| **Quick run command** | `node --test dynamo/tests/switchboard/update-check.test.cjs dynamo/tests/switchboard/update.test.cjs dynamo/tests/switchboard/migrate.test.cjs` |
| **Full suite command** | `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test dynamo/tests/switchboard/update-check.test.cjs dynamo/tests/switchboard/update.test.cjs dynamo/tests/switchboard/migrate.test.cjs`
- **After every plan wave:** Run `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 0 | STAB-05a | unit | `node --test dynamo/tests/switchboard/update-check.test.cjs` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 0 | STAB-05b | unit | `node --test dynamo/tests/switchboard/update-check.test.cjs` | ❌ W0 | ⬜ pending |
| 15-01-03 | 01 | 0 | STAB-05j | unit | `node --test dynamo/tests/switchboard/update-check.test.cjs` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 0 | STAB-05d | unit | `node --test dynamo/tests/switchboard/migrate.test.cjs` | ❌ W0 | ⬜ pending |
| 15-02-02 | 02 | 0 | STAB-05e | unit | `node --test dynamo/tests/switchboard/migrate.test.cjs` | ❌ W0 | ⬜ pending |
| 15-03-01 | 03 | 0 | STAB-05c | unit | `node --test dynamo/tests/switchboard/update.test.cjs` | ❌ W0 | ⬜ pending |
| 15-03-02 | 03 | 0 | STAB-05f | unit | `node --test dynamo/tests/switchboard/update.test.cjs` | ❌ W0 | ⬜ pending |
| 15-03-03 | 03 | 0 | STAB-05g | integration | `node --test dynamo/tests/switchboard/update.test.cjs` | ❌ W0 | ⬜ pending |
| 15-03-04 | 03 | 0 | STAB-05h | unit | `node --test dynamo/tests/switchboard/update.test.cjs` | ❌ W0 | ⬜ pending |
| 15-04-01 | 04 | 2 | STAB-05i | unit | `node --test dynamo/tests/router.test.cjs` | Partial | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dynamo/tests/switchboard/update-check.test.cjs` — stubs for STAB-05a, STAB-05b, STAB-05j
- [ ] `dynamo/tests/switchboard/update.test.cjs` — stubs for STAB-05c, STAB-05f, STAB-05g, STAB-05h
- [ ] `dynamo/tests/switchboard/migrate.test.cjs` — stubs for STAB-05d, STAB-05e
- [ ] `dynamo/tests/router.test.cjs` — extend with check-update, update, rollback command tests (STAB-05i)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end update from GitHub Release | STAB-05g | Requires a published GitHub Release and real network access | 1. Create a test release on GitHub. 2. Run `dynamo update`. 3. Verify version changes and health check passes. |
| Rollback during active Claude session | STAB-05h | Requires concurrent Claude Code session to verify no disruption | 1. Start a Claude session. 2. Run `dynamo update` in another terminal (with a forced failure). 3. Verify rollback completes and active session continues. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
