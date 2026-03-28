---
phase: 15
slug: user-journey-gap-closure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in) |
| **Config file** | none -- bun:test discovers *.test.cjs files automatically |
| **Quick run command** | `bun test modules/reverie/validation/start-stop.test.cjs` |
| **Full suite command** | `bun test modules/reverie/validation/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test modules/reverie/validation/start-stop.test.cjs modules/reverie/validation/welcome.test.cjs`
- **After every plan wave:** Run `bun test modules/reverie/validation/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | INT-02-start | unit | `bun test modules/reverie/validation/start-stop.test.cjs` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | INT-02-stop | unit | `bun test modules/reverie/validation/start-stop.test.cjs` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 1 | INT-01-welcome | unit | `bun test modules/reverie/validation/welcome.test.cjs` | ❌ W0 | ⬜ pending |
| 15-03-01 | 03 | 2 | INT-02-skills | unit | `bun test modules/reverie/skills/skill-content.test.cjs` | ✅ (update) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `modules/reverie/validation/start-stop.test.cjs` -- stubs for start/stop CLI commands
- [ ] `modules/reverie/validation/welcome.test.cjs` -- stubs for first-run welcome injection
- [ ] Update `modules/reverie/skills/skill-content.test.cjs` -- update assertions for rewritten skill content

*Existing infrastructure covers remaining phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| README accuracy | D-13 | Content review requires human judgement | Read README.md, verify prerequisites, install steps, first-run description, CLI command list match actual commands |
| Formation agent prompt quality | D-12 | Prompt effectiveness is subjective | Compare agent .md output schema against handleSubagentStop parsing in hook-handlers.cjs |
| Error message clarity | D-10, D-11 | Recovery suggestion quality requires human evaluation | Run each CLI command with invalid inputs, verify error messages include actionable recovery suggestions |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
