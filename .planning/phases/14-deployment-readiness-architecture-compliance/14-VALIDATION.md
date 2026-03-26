---
phase: 14
slug: deployment-readiness-architecture-compliance
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test |
| **Config file** | none — uses bun test defaults |
| **Quick run command** | `bun test --filter "phase-14"` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test --filter "phase-14"`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | INT-01, PLT-03 | integration | `bun test core/core.test.cjs` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | INT-01 | unit | `bun test core/services/exciter/exciter.test.cjs` | ✅ | ⬜ pending |
| 14-02-01 | 02 | 1 | INT-02 | unit | `bun test modules/reverie/cli/register-commands.test.cjs` | ✅ | ⬜ pending |
| 14-02-02 | 02 | 1 | INT-02 | unit | `bun test modules/reverie/cli/status.test.cjs` | ✅ | ⬜ pending |
| 14-03-01 | 03 | 2 | INT-01, INT-02, PLT-03 | e2e | `bun test --filter "e2e"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Bootstrap integration test for hook wiring after module registration
- [ ] E2E test for settings.json generation and hook dispatch flow

*Existing test infrastructure (2,344 tests) covers most component-level verification.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hook dispatch via live Claude Code session | INT-01 | Requires actual Claude Code runtime | Start Claude Code session, observe Dynamo hooks fire via settings.json |
| Full install-to-use user flow | INT-01, INT-02, PLT-03 | End-to-end deployment verification | Fresh clone, bun install, boot platform, verify Reverie loads |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
