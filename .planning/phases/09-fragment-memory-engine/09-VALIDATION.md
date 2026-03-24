---
phase: 9
slug: fragment-memory-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in) |
| **Config file** | None needed -- bun test auto-discovers `__tests__/*.test.js` |
| **Quick run command** | `bun test modules/reverie` |
| **Full suite command** | `bun test modules/reverie` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test modules/reverie`
- **After every plan wave:** Run `bun test modules/reverie` (full suite)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | FRG-03.1 | unit | `bun test modules/reverie/components/formation/__tests__/attention-gate.test.js -t "rejects"` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | FRG-03.2 | unit | `bun test modules/reverie/components/formation/__tests__/formation-pipeline.test.js -t "fan-out"` | ❌ W0 | ⬜ pending |
| 09-01-03 | 01 | 1 | FRG-03.3 | unit | `bun test modules/reverie/components/formation/__tests__/fragment-assembler.test.js` | ❌ W0 | ⬜ pending |
| 09-01-04 | 01 | 1 | FRG-03.4 | unit | `bun test modules/reverie/components/formation/__tests__/formation-pipeline.test.js -t "formation group"` | ❌ W0 | ⬜ pending |
| 09-01-05 | 01 | 1 | FRG-03.5 | integration | `bun test modules/reverie/components/formation/__tests__/formation-integration.test.js` | ❌ W0 | ⬜ pending |
| 09-01-06 | 01 | 1 | FRG-03.6 | unit | `bun test modules/reverie/components/formation/__tests__/nudge-manager.test.js` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 1 | FRG-04.1 | unit | `bun test modules/reverie/components/recall/__tests__/composite-scorer.test.js` | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 1 | FRG-04.2 | unit | `bun test modules/reverie/components/recall/__tests__/query-builder.test.js` | ❌ W0 | ⬜ pending |
| 09-02-03 | 02 | 1 | FRG-04.3 | integration | `bun test modules/reverie/components/recall/__tests__/recall-engine.test.js` | ❌ W0 | ⬜ pending |
| 09-02-04 | 02 | 1 | FRG-04.4 | integration | `bun test modules/reverie/components/recall/__tests__/nudge-delivery.test.js` | ❌ W0 | ⬜ pending |
| 09-02-05 | 02 | 1 | FRG-04.5 | integration | `bun test modules/reverie/components/formation/__tests__/association-population.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `modules/reverie/components/formation/__tests__/attention-gate.test.js` — stubs for FRG-03.1
- [ ] `modules/reverie/components/formation/__tests__/formation-pipeline.test.js` — stubs for FRG-03.2, FRG-03.4
- [ ] `modules/reverie/components/formation/__tests__/fragment-assembler.test.js` — stubs for FRG-03.3
- [ ] `modules/reverie/components/formation/__tests__/formation-integration.test.js` — stubs for FRG-03.5
- [ ] `modules/reverie/components/formation/__tests__/nudge-manager.test.js` — stubs for FRG-03.6
- [ ] `modules/reverie/components/formation/__tests__/association-population.test.js` — stubs for FRG-04.5
- [ ] `modules/reverie/components/recall/__tests__/composite-scorer.test.js` — stubs for FRG-04.1
- [ ] `modules/reverie/components/recall/__tests__/query-builder.test.js` — stubs for FRG-04.2
- [ ] `modules/reverie/components/recall/__tests__/recall-engine.test.js` — stubs for FRG-04.3
- [ ] `modules/reverie/components/recall/__tests__/nudge-delivery.test.js` — stubs for FRG-04.4

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Formation subagent produces subjective/relational fragments, not summaries | FRG-03 | Prompt quality is qualitative — requires human review of fragment body tone | Run formation on sample turns, inspect fragment bodies for first-person perspective, relational references, and impressionistic tone |
| Passive recall nudges shade responses naturally | FRG-04 | Nudge quality is qualitative — human must judge whether injection feels natural | Trigger formation + recall cycle, read injected nudges in context for naturalness |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending