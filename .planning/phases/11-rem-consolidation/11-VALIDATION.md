---
phase: 11
slug: rem-consolidation
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| **Quick run command** | `bun test modules/reverie/tests/rem/` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test modules/reverie/tests/rem/`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | REM-01 | unit | `bun test modules/reverie/tests/rem/tier1-triage.test.cjs` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 1 | REM-02 | unit | `bun test modules/reverie/tests/rem/tier2-provisional.test.cjs` | ❌ W0 | ⬜ pending |
| 11-03-01 | 03 | 2 | REM-03 | unit | `bun test modules/reverie/tests/rem/tier3-full.test.cjs` | ❌ W0 | ⬜ pending |
| 11-04-01 | 04 | 2 | REM-04 | unit | `bun test modules/reverie/tests/rem/retroactive-eval.test.cjs` | ❌ W0 | ⬜ pending |
| 11-05-01 | 05 | 2 | REM-05 | unit | `bun test modules/reverie/tests/rem/editorial-pass.test.cjs` | ❌ W0 | ⬜ pending |
| 11-06-01 | 06 | 3 | REM-06, SM-04 | unit | `bun test modules/reverie/tests/rem/conditioning-updates.test.cjs` | ❌ W0 | ⬜ pending |
| 11-07-01 | 07 | 3 | REM-07 | integration | `bun test modules/reverie/tests/rem/promotion-gate.test.cjs` | ❌ W0 | ⬜ pending |
| 11-08-01 | 08 | 3 | OPS-03, OPS-04 | unit | `bun test modules/reverie/tests/rem/modes.test.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `modules/reverie/tests/rem/` — test directory for REM consolidation tests
- [ ] Stubs for all 8 test files listed above
- [ ] Shared fixtures for fragment creation, Self Model state, Wire mock

*Existing bun:test infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Heartbeat-based Tier 2 fires on real session disconnect | REM-02 | Requires actual Claude Code session lifecycle | 1. Start Primary session 2. Let it idle past heartbeat timeout 3. Verify Secondary initiates Tier 2 |
| REM mode runs Secondary-only after Stop hook | OPS-03 | Requires real multi-session orchestration | 1. End a Primary session with Stop hook 2. Verify Secondary stays alive for REM 3. Verify Secondary terminates after REM |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
