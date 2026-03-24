---
phase: 7
slug: foundation-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in) |
| **Config file** | none — built-in to Bun runtime |
| **Quick run command** | `bun test` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | PLT-01 | unit | `bun test` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | FRG-01 | unit | `bun test` | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 1 | FRG-02 | unit | `bun test` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 1 | SM-01 | unit | `bun test` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 1 | SM-02 | unit | `bun test` | ❌ W0 | ⬜ pending |
| 07-02-03 | 02 | 1 | SM-03 | unit | `bun test` | ❌ W0 | ⬜ pending |
| 07-02-04 | 02 | 1 | SM-05 | unit | `bun test` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 2 | FRG-05 | unit | `bun test` | ❌ W0 | ⬜ pending |
| 07-03-02 | 03 | 2 | FRG-06 | unit | `bun test` | ❌ W0 | ⬜ pending |
| 07-03-03 | 03 | 2 | FRG-09 | integration | `bun test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test directory structure for Reverie module tests
- [ ] Shared fixtures for DuckDB in-memory instances
- [ ] Shared fixtures for Journal tmpdir isolation
- [ ] Shared fixtures for Magnet state reset

*Planner will refine based on RESEARCH.md Validation Architecture.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cold start seed prompt produces valid Self Model | SM-01 | Requires Claude Code session context | Verify sparse defaults are valid after fresh init |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
