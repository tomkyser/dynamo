---
phase: 17
slug: deploy-pipeline-fixes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in) |
| **Config file** | none — uses node --test glob |
| **Quick run command** | `node --test dynamo/tests/toggle.test.cjs dynamo/tests/ledger/dispatcher.test.cjs dynamo/tests/switchboard/install.test.cjs` |
| **Full suite command** | `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test dynamo/tests/toggle.test.cjs dynamo/tests/ledger/dispatcher.test.cjs dynamo/tests/switchboard/install.test.cjs dynamo/tests/regression.test.cjs`
- **After every plan wave:** Run `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | STAB-10 (INT-HOOKS-PATH) | unit | `node --test dynamo/tests/ledger/dispatcher.test.cjs` | ✅ (needs update) | ⬜ pending |
| 17-01-02 | 01 | 1 | STAB-10 (INT-MCP-REREG) | unit | `node --test dynamo/tests/switchboard/install.test.cjs` | ✅ (needs update) | ⬜ pending |
| 17-01-03 | 01 | 1 | STAB-10 (FLOW-TOGGLE-BLACKOUT) | unit | `node --test dynamo/tests/toggle.test.cjs` | ✅ | ⬜ pending |
| 17-02-01 | 02 | 1 | STAB-03 (INT-CLAUDEMD-DEPLOY) | unit | `node --test dynamo/tests/switchboard/install.test.cjs` | ✅ (needs new case) | ⬜ pending |
| 17-02-02 | 02 | 1 | STAB-03 (README-PORT) | unit | `node --test dynamo/tests/regression.test.cjs` | ✅ (needs update) | ⬜ pending |
| 17-03-01 | 03 | 1 | STAB-10 (FLOW-HOOKS-DEPLOYED) | smoke | Manual: `dynamo install && check hook-errors.log` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dynamo/tests/ledger/dispatcher.test.cjs` — needs assertion that HANDLERS path resolves in both layouts
- [ ] `dynamo/tests/switchboard/install.test.cjs` — needs test that install flow does NOT reference registerMcp; needs test for CLAUDE.md template deployment
- [ ] `dynamo/tests/regression.test.cjs` — Tests 6, 9, branding, and directory structure reference `lib/` paths that no longer exist; must be updated to current layout

*Existing infrastructure covers framework install — node:test is built-in.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All 5 hook events execute in deployed layout | STAB-10 (FLOW-HOOKS-DEPLOYED) | Requires actual `dynamo install` to deployed `~/.claude/dynamo/` and real Claude Code hook invocation | 1. Run `dynamo install` 2. Trigger each hook event 3. Check `hook-errors.log` for failures |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
