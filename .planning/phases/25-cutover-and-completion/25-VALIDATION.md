---
phase: 25
slug: cutover-and-completion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node:test` (no external dependency) |
| **Config file** | none — uses node --test glob patterns |
| **Quick run command** | `node --test dynamo/tests/*.test.cjs dynamo/tests/reverie/*.test.cjs` |
| **Full suite command** | `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs dynamo/tests/reverie/*.test.cjs` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 25-01-01 | 01 | 1 | FLAG-02 | unit | `node --test dynamo/tests/ledger/dispatcher.test.cjs` | ✅ update | ⬜ pending |
| 25-01-02 | 01 | 1 | FLAG-02 | unit | `node --test dynamo/tests/config.test.cjs` | ✅ update | ⬜ pending |
| 25-02-01 | 02 | 1 | FLAG-04 | unit | `node --test dynamo/tests/reverie/voice.test.cjs` | ❌ W0 | ⬜ pending |
| 25-03-01 | 03 | 2 | OPS-01 | unit | `node --test dynamo/tests/switchboard/shim.test.cjs` | ❌ W0 | ⬜ pending |
| 25-03-02 | 03 | 2 | OPS-02 | unit | `node --test dynamo/tests/switchboard/changelog.test.cjs` | ❌ W0 | ⬜ pending |
| 25-04-01 | 04 | 2 | OPS-03 | unit | `node --test dynamo/tests/switchboard/install.test.cjs` | ✅ update | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dynamo/tests/reverie/voice.test.cjs` — stubs for FLAG-04 (voice status/explain/reset)
- [ ] `dynamo/tests/switchboard/shim.test.cjs` — stubs for OPS-01 (bare CLI shim)
- [ ] `dynamo/tests/switchboard/changelog.test.cjs` — stubs for OPS-02 (changelog generation)
- [ ] Update `dynamo/tests/ledger/dispatcher.test.cjs` — remove classic tests, add always-Reverie tests
- [ ] Update `dynamo/tests/switchboard/install.test.cjs` — add cleanup step tests
- [ ] Update `dynamo/tests/config.test.cjs` — remove reverie.mode tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bare CLI shim works from terminal | OPS-01 | Requires real PATH and symlink on filesystem | 1. Run `dynamo install` 2. Open new terminal 3. Run `dynamo version` without node prefix |
| DYNAMO_DEV=1 override | OPS-01 | Requires env var and real symlink | 1. Set DYNAMO_DEV=1 2. Run `dynamo version` 3. Verify it loads from repo not deployed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
