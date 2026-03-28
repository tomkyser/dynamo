---
phase: 16
slug: reverie-end-to-end-delivery
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-28
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test |
| **Config file** | none — uses bun test defaults |
| **Quick run command** | `bun test --filter "magnet\|ledger\|conductor\|wire\|reverie"` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test --filter "magnet\|ledger\|conductor\|wire\|reverie"`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | D-01/D-05 | unit (TDD) | `bun test core/services/magnet/ledger-provider.test.cjs` | Created in task | ⬜ pending |
| 16-01-02 | 01 | 1 | D-06 | integration | `bun test core/services/magnet/ && bun test core/core.test.cjs` | Existing | ⬜ pending |
| 16-02-01 | 02 | 1 | D-02 | unit (TDD) | `bun test core/services/conductor/terminal-spawn.test.cjs` | Created in task | ⬜ pending |
| 16-02-02 | 02 | 1 | D-02 | integration | `bun test core/services/conductor/` | Existing | ⬜ pending |
| 16-03-00 | 03 | 2 | Wave 0 | stub | `bun test modules/reverie/components/cli/start.test.cjs && bun test modules/reverie/components/cli/status.test.cjs` | Created in task | ⬜ pending |
| 16-03-01 | 03 | 2 | D-07 | integration | `bun test modules/reverie/components/modes/ && bun test modules/reverie/components/session/session-manager` | Existing | ⬜ pending |
| 16-03-02 | 03 | 2 | D-03/D-07 | integration | `bun test modules/reverie/` | Existing | ⬜ pending |
| 16-03-03 | 03 | 2 | D-03/D-07 | integration | `bun test modules/reverie/components/cli/` | Created in 16-03-00 | ⬜ pending |
| 16-04-01 | 04 | 3 | D-04/D-08 | integration+e2e | `bun test modules/reverie/components/cli/ && bun test modules/reverie/components/session/session-manager && bun test core/services/wire/` | Existing + 16-03-00 | ⬜ pending |
| 16-04-02 | 04 | 3 | D-02/D-03/D-04 | human-verify | `bun test` (full suite pre-check) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `core/services/magnet/ledger-provider.test.cjs` — Created by Plan 01 Task 1 (TDD task creates test first)
- [x] `core/services/conductor/terminal-spawn.test.cjs` — Created by Plan 02 Task 1 (TDD task creates test first)
- [x] `modules/reverie/components/cli/start.test.cjs` — Created by Plan 03 Task 0 (Wave 0 stub task)
- [x] `modules/reverie/components/cli/status.test.cjs` — Created by Plan 03 Task 0 (Wave 0 stub task)

*All Wave 0 test stubs are accounted for in plan tasks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 3 terminal windows appear | D-02 | Requires visual confirmation of macOS Terminal.app windows | Run `bun bin/dynamo.cjs reverie start`, count visible Terminal windows |
| State persists across CLI invocations | D-01/D-07 | Requires two separate process invocations | Run `reverie start`, then in new terminal run `reverie status`, verify Mode: active |
| Graceful shutdown cleans up | D-03 | Requires observing window closure | Run `reverie stop`, verify all spawned windows close |
| Clean-start kills stale PIDs | D-03 | Requires observing no orphaned windows after restart | Run `reverie start`, then `reverie start` again, verify no duplicate windows |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (post-revision)
