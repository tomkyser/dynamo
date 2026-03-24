---
phase: 10
slug: three-session-architecture
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-24
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in, Jest-compatible) |
| **Config file** | None needed (bun:test uses default discovery) |
| **Quick run command** | `bun test modules/reverie/components/session/ modules/reverie/components/modes/ modules/reverie/components/context/` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test modules/reverie/components/session/ modules/reverie/components/modes/`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 10-01-01 | 01 | 1 | SES-04, SES-05 | unit | `bun test modules/reverie/components/session/__tests__/session-config.test.js core/services/conductor/__tests__/session-spawner.test.js` | ⬜ pending |
| 10-01-02 | 01 | 1 | SES-04, SES-05 | unit | `bun test core/services/conductor/__tests__/conductor.test.js -t "session lifecycle"` | ⬜ pending |
| 10-02-01 | 02 | 1 | CTX-02 | unit | `bun test modules/reverie/components/context/__tests__/referential-framing.test.js` | ⬜ pending |
| 10-02-02 | 02 | 1 | SES-03 | unit | `bun test modules/reverie/components/session/__tests__/sublimation-loop.test.js` | ⬜ pending |
| 10-03-01 | 03 | 2 | SES-01, SES-05 | unit | `bun test modules/reverie/components/session/__tests__/session-manager.test.js` | ⬜ pending |
| 10-03-02 | 03 | 2 | OPS-01, OPS-02 | unit | `bun test modules/reverie/components/modes/__tests__/mode-manager.test.js` | ⬜ pending |
| 10-04-01 | 04 | 2 | SES-02 | unit | `bun test modules/reverie/components/session/__tests__/mind-cycle.test.js` | ⬜ pending |
| 10-04-02 | 04 | 2 | SES-04 | unit | `bun test modules/reverie/components/session/__tests__/wire-topology.test.js` | ⬜ pending |
| 10-05-01 | 05 | 3 | SES-01, SES-02, SES-04, CTX-02 | integration | `bun test modules/reverie/components/context/__tests__/context-manager.test.js modules/reverie/hooks/__tests__/hook-handlers.test.js` | ⬜ pending |
| 10-05-02 | 05 | 3 | SES-05, OPS-01, OPS-02 | integration | `bun test modules/reverie/ --timeout 30000` | ⬜ pending |

*Status: ⬜ pending | ✅ green | ❌ red | ⚠️ flaky*

---

## Wave 0 Requirements

All test files are created by their respective plan tasks (TDD pattern: tests written before implementation). Each plan task listed above with `tdd="true"` creates its own test file as part of the RED phase.

- [ ] `modules/reverie/components/session/__tests__/session-config.test.js` — created by Plan 01 Task 1
- [ ] `core/services/conductor/__tests__/session-spawner.test.js` — created by Plan 01 Task 1
- [ ] `core/services/conductor/__tests__/conductor.test.js` — extended by Plan 01 Task 2 (file exists, new describe block added)
- [ ] `modules/reverie/components/context/__tests__/referential-framing.test.js` — created by Plan 02 Task 1
- [ ] `modules/reverie/components/session/__tests__/sublimation-loop.test.js` — created by Plan 02 Task 2
- [ ] `modules/reverie/components/session/__tests__/session-manager.test.js` — created by Plan 03 Task 1
- [ ] `modules/reverie/components/modes/__tests__/mode-manager.test.js` — created by Plan 03 Task 2
- [ ] `modules/reverie/components/session/__tests__/mind-cycle.test.js` — created by Plan 04 Task 1
- [ ] `modules/reverie/components/session/__tests__/wire-topology.test.js` — created by Plan 04 Task 2

*Existing infrastructure covers bun:test framework — no install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Three concurrent sessions on Max subscription | OPS-01 | Requires real Claude Max account and 3 live sessions | 1. Start Reverie in Active mode. 2. Verify 3 sessions are running (`ps aux \| grep claude`). 3. Confirm no rate limit errors in logs for 5 minutes. |
| Passive-to-Active mode upgrade under real load | OPS-01, OPS-02 | Requires live rate limit observation | 1. Start in Passive mode. 2. Run `/reverie:upgrade-mode active`. 3. Observe resource metrics. 4. Confirm all 3 sessions operational. |
| Referential framing vs technical accuracy | CTX-02 | Requires LLM judgment evaluation | 1. Set framing to FULL mode. 2. Ask technical question. 3. Verify answer defers to Mind directives without degrading technical quality. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
