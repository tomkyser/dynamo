---
phase: 11
slug: rem-consolidation
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-24
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (Jest-compatible API) |
| **Config file** | none — existing bun test infrastructure |
| **Quick run command** | `bun test modules/reverie/components/rem/` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test modules/reverie/components/rem/`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | OPS-03, OPS-04 | unit | `bun test modules/reverie/components/session/__tests__/session-config.test.js && bun test modules/reverie/lib/__tests__/` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | OPS-03, OPS-04 | unit | `bun test modules/reverie/components/modes/__tests__/mode-manager.test.js && bun test modules/reverie/components/session/__tests__/session-manager.test.js` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 1 | REM-01 | unit | `bun test modules/reverie/components/rem/__tests__/triage.test.js` | ❌ W0 | ⬜ pending |
| 11-02-02 | 02 | 1 | REM-02 | unit | `bun test modules/reverie/components/rem/__tests__/heartbeat-monitor.test.js` | ❌ W0 | ⬜ pending |
| 11-03-01 | 03 | 2 | SM-04, REM-06 | unit | `bun test modules/reverie/components/rem/__tests__/conditioning-updater.test.js` | ❌ W0 | ⬜ pending |
| 11-03-02 | 03 | 2 | REM-06 | unit | `bun test modules/reverie/components/rem/__tests__/quality-evaluator.test.js` | ❌ W0 | ⬜ pending |
| 11-04-01 | 04 | 2 | REM-04 | unit | `bun test modules/reverie/components/rem/__tests__/retroactive-evaluator.test.js` | ❌ W0 | ⬜ pending |
| 11-04-02 | 04 | 2 | REM-05 | unit | `bun test modules/reverie/components/rem/__tests__/editorial-pass.test.js` | ❌ W0 | ⬜ pending |
| 11-05-01 | 05 | 3 | REM-03, REM-07 | unit | `bun test modules/reverie/components/rem/__tests__/full-rem.test.js` | ❌ W0 | ⬜ pending |
| 11-05-02 | 05 | 3 | REM-02 | unit | `bun test modules/reverie/components/rem/__tests__/provisional-rem.test.js` | ❌ W0 | ⬜ pending |
| 11-05-03 | 05 | 3 | REM-02, REM-03, REM-07 | unit | `bun test modules/reverie/components/rem/__tests__/rem-consolidator.test.js` | ❌ W0 | ⬜ pending |
| 11-06-01 | 06 | 4 | REM-01, REM-02, REM-03, REM-07, OPS-03, OPS-04 | integration | `bun test modules/reverie/hooks/__tests__/hook-handlers.test.js` | ❌ W0 | ⬜ pending |
| 11-06-02 | 06 | 4 | all | integration | `bun test modules/reverie/` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `modules/reverie/components/rem/__tests__/` — test directory for REM consolidation tests
- [ ] Test stubs created inline by TDD tasks (each plan task creates its own test file)

*Existing bun:test infrastructure covers framework needs. TDD pattern means Wave 0 is satisfied by inline test creation in each task.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Heartbeat-based Tier 2 fires on real session disconnect | REM-02 | Requires actual Claude Code session lifecycle | 1. Start Primary session 2. Let it idle past heartbeat timeout 3. Verify Secondary initiates Tier 2 |
| REM mode runs Secondary-only after Stop hook | OPS-03 | Requires real multi-session orchestration | 1. End a Primary session with Stop hook 2. Verify Secondary stays alive for REM 3. Verify Secondary terminates after REM |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-24
