---
phase: 8
slug: single-session-personality-injection
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in) |
| **Config file** | None needed -- bun test auto-discovers .test.js files |
| **Quick run command** | `bun test modules/reverie/components/context/ modules/reverie/hooks/` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test modules/reverie/components/context/ modules/reverie/hooks/`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | CTX-01 | unit | `bun test modules/reverie/components/context/__tests__/template-composer.test.js` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | CTX-01 | unit | `bun test modules/reverie/hooks/__tests__/hook-handlers.test.js` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | CTX-03 | unit | `bun test modules/reverie/components/context/__tests__/budget-tracker.test.js` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 1 | CTX-03 | unit | `bun test modules/reverie/components/context/__tests__/template-composer.test.js` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 1 | CTX-04 | unit | `bun test modules/reverie/hooks/__tests__/hook-handlers.test.js` | ❌ W0 | ⬜ pending |
| 08-03-02 | 03 | 1 | CTX-04 | unit | `bun test modules/reverie/components/context/__tests__/context-manager.test.js` | ❌ W0 | ⬜ pending |
| 08-04-01 | 04 | 1 | CTX-05 | unit | `bun test modules/reverie/hooks/__tests__/hook-handlers.test.js` | ❌ W0 | ⬜ pending |
| 08-04-02 | 04 | 1 | CTX-05 | unit | `bun test modules/reverie/hooks/__tests__/hook-handlers.test.js` | ❌ W0 | ⬜ pending |
| 08-05-01 | 05 | 1 | INT-01 | unit | `bun test modules/reverie/hooks/__tests__/hook-handlers.test.js` | ❌ W0 | ⬜ pending |
| 08-05-02 | 05 | 1 | INT-01 | unit | `bun test modules/reverie/hooks/__tests__/hook-handlers.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `modules/reverie/components/context/__tests__/context-manager.test.js` — stubs for CTX-01, CTX-03, CTX-04
- [ ] `modules/reverie/components/context/__tests__/budget-tracker.test.js` — stubs for CTX-03
- [ ] `modules/reverie/components/context/__tests__/template-composer.test.js` — stubs for CTX-01
- [ ] `modules/reverie/hooks/__tests__/hook-handlers.test.js` — stubs for INT-01, CTX-04, CTX-05

*Existing infrastructure covers test runner (bun:test). Test files need creation in Wave 0.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Personality persistence across turns at high context utilization | CTX-03 | Requires live Claude Code session with real context growth | Run Dynamo in a Claude Code session, generate >60% context utilization, verify personality markers in model responses |
| Post-compaction personality recovery | CTX-04 | Requires actual Claude Code compaction trigger | Fill context to >83% utilization, observe compaction trigger, verify personality re-injected on next turn |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
