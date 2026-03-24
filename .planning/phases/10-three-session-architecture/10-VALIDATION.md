---
phase: 10
slug: three-session-architecture
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| **Quick run command** | `bun test modules/reverie/components/session/ modules/reverie/components/modes/` |
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | SES-01 | integration | `bun test modules/reverie/components/session/__tests__/session-manager.test.js -t "primary receives face prompt"` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | SES-05 | integration | `bun test modules/reverie/components/session/__tests__/session-lifecycle.test.js -t "startup sequence"` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 1 | SES-02 | integration | `bun test modules/reverie/components/session/__tests__/mind-cycle.test.js -t "cognitive pipeline"` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 1 | SES-03 | unit | `bun test modules/reverie/components/session/__tests__/sublimation-loop.test.js -t "cycle frequency"` | ❌ W0 | ⬜ pending |
| 10-04-01 | 04 | 1 | SES-04 | integration | `bun test modules/reverie/components/session/__tests__/wire-integration.test.js -t "urgency levels"` | ❌ W0 | ⬜ pending |
| 10-05-01 | 05 | 2 | OPS-01 | integration | `bun test modules/reverie/components/modes/__tests__/mode-manager.test.js -t "active mode"` | ❌ W0 | ⬜ pending |
| 10-05-02 | 05 | 2 | OPS-02 | integration | `bun test modules/reverie/components/modes/__tests__/mode-manager.test.js -t "passive mode"` | ❌ W0 | ⬜ pending |
| 10-06-01 | 06 | 2 | CTX-02 | unit | `bun test modules/reverie/components/context/__tests__/referential-framing.test.js -t "framing modes"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `modules/reverie/components/session/__tests__/session-manager.test.js` — stubs for SES-01, SES-05
- [ ] `modules/reverie/components/session/__tests__/mind-cycle.test.js` — stubs for SES-02
- [ ] `modules/reverie/components/session/__tests__/sublimation-loop.test.js` — stubs for SES-03
- [ ] `modules/reverie/components/session/__tests__/wire-integration.test.js` — stubs for SES-04
- [ ] `modules/reverie/components/session/__tests__/session-lifecycle.test.js` — stubs for SES-05
- [ ] `modules/reverie/components/modes/__tests__/mode-manager.test.js` — stubs for OPS-01, OPS-02
- [ ] `modules/reverie/components/context/__tests__/referential-framing.test.js` — stubs for CTX-02
- [ ] `core/services/conductor/__tests__/session-spawner.test.js` — stubs for Conductor expansion

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
