---
phase: 19
slug: six-subsystem-directory-restructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, Node.js 22+) |
| **Config file** | none — node:test needs no config |
| **Quick run command** | `node --test dynamo/tests/*.test.cjs` |
| **Full suite command** | `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs`
- **After every plan wave:** Run `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | ARCH-04 | unit | `node --test dynamo/tests/resolve.test.cjs` | ✅ (needs update) | ⬜ pending |
| 19-01-02 | 01 | 1 | ARCH-01 | unit | `node --test dynamo/tests/boundary.test.cjs` | ✅ (needs update) | ⬜ pending |
| 19-02-01 | 02 | 2 | ARCH-01 | unit | `node --test dynamo/tests/boundary.test.cjs` | ✅ (needs update) | ⬜ pending |
| 19-02-02 | 02 | 2 | ARCH-07 | full suite | `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs` | ✅ | ⬜ pending |
| 19-03-01 | 03 | 3 | ARCH-05 | unit | `node --test dynamo/tests/switchboard/sync.test.cjs` | ✅ (needs update) | ⬜ pending |
| 19-03-02 | 03 | 3 | ARCH-06 | unit | `node --test dynamo/tests/switchboard/install.test.cjs` | ✅ (needs update) | ⬜ pending |
| 19-03-03 | 03 | 3 | ARCH-07 | full suite | `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dynamo/tests/layout.test.cjs` — tests for new `lib/layout.cjs` module (ARCH-04)
- [ ] Updated `dynamo/tests/boundary.test.cjs` assertions for new subsystem directory paths
- [ ] Updated `dynamo/tests/circular-deps.test.cjs` scan directories and allowlist paths

*Existing infrastructure covers remaining phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `dynamo sync` syncs all subsystem dirs | ARCH-05 | Requires live Docker deployment at `~/.claude/dynamo/` | Run `dynamo sync`, verify all subsystem dirs appear in `~/.claude/dynamo/subsystems/` |
| `dynamo install` creates correct deployed layout | ARCH-06 | Requires live filesystem at `~/.claude/dynamo/` | Run `dynamo install`, verify `cc/hooks/dynamo-hooks.cjs` path in settings.json |
| Hook commands work from new paths | ARCH-06 | Requires Claude Code session to trigger hooks | Start new Claude Code session, verify no errors in `~/.claude/dynamo/hook-errors.log` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
