---
phase: 16
slug: reverie-end-to-end-delivery
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 16-01-01 | 01 | 1 | D-01/D-05 | unit+integration | `bun test core/services/magnet/` | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 1 | D-06 | integration | `bun test core/` | ❌ W0 | ⬜ pending |
| 16-02-01 | 02 | 1 | D-02 | integration | `bun test core/services/conductor/` | ❌ W0 | ⬜ pending |
| 16-03-01 | 03 | 2 | D-03/D-04 | integration | `bun test modules/reverie/` | ❌ W0 | ⬜ pending |
| 16-03-02 | 03 | 2 | D-07 | integration | `bun test modules/reverie/components/cli/` | ❌ W0 | ⬜ pending |
| 16-04-01 | 04 | 3 | D-08 | e2e | `bun bin/dynamo.cjs reverie start && bun bin/dynamo.cjs reverie status` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `core/services/magnet/__tests__/ledger-provider.test.cjs` — Ledger provider load/save/clear
- [ ] `core/services/conductor/__tests__/terminal-spawn.test.cjs` — Terminal window spawning
- [ ] `modules/reverie/validation/e2e-lifecycle.test.cjs` — Full start/status/stop cycle

*Existing test infrastructure covers unit tests. Integration and e2e stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 3 terminal windows appear | D-02 | Requires visual confirmation of macOS Terminal.app windows | Run `bun bin/dynamo.cjs reverie start`, count visible Terminal windows |
| State persists across CLI invocations | D-01/D-07 | Requires two separate process invocations | Run `reverie start`, then in new terminal run `reverie status`, verify Mode: active |
| Graceful shutdown cleans up | D-03 | Requires observing window closure | Run `reverie stop`, verify all spawned windows close |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
