---
phase: 9
slug: hook-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (node:test) v24.13.1 |
| **Config file** | None needed -- uses `node --test tests/*.test.cjs` |
| **Quick run command** | `cd ~/.claude/dynamo && node --test tests/*.test.cjs` |
| **Full suite command** | `cd ~/.claude/dynamo && node --test tests/*.test.cjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd ~/.claude/dynamo && node --test tests/*.test.cjs`
- **After every plan wave:** Run `cd ~/.claude/dynamo && node --test tests/*.test.cjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | LDG-01 | unit + integration | `node --test tests/dispatcher.test.cjs` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | LDG-02 | unit | `node --test tests/integration.test.cjs` | ❌ W0 | ⬜ pending |
| 09-01-03 | 01 | 1 | LDG-03 | unit | `node --test tests/integration.test.cjs` | ❌ W0 | ⬜ pending |
| 09-01-04 | 01 | 1 | LDG-04 | unit | `node --test tests/episodes.test.cjs` | ❌ W0 | ⬜ pending |
| 09-01-05 | 01 | 1 | LDG-05 | unit | `node --test tests/integration.test.cjs` | ❌ W0 | ⬜ pending |
| 09-01-06 | 01 | 1 | LDG-06 | unit | `node --test tests/integration.test.cjs` | ❌ W0 | ⬜ pending |
| 09-01-07 | 01 | 1 | LDG-07 | unit | `node --test tests/curation.test.cjs` | ❌ W0 | ⬜ pending |
| 09-01-08 | 01 | 1 | LDG-08 | unit | `node --test tests/sessions.test.cjs` | ❌ W0 | ⬜ pending |
| 09-01-09 | 01 | 1 | LDG-09 | unit | `node --test tests/sessions.test.cjs` | ❌ W0 | ⬜ pending |
| 09-01-10 | 01 | 1 | LDG-10 | unit | `node --test tests/sessions.test.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/curation.test.cjs` — stubs for LDG-07 (curation pipeline, degradation)
- [ ] `tests/episodes.test.cjs` — stubs for LDG-04 (episode write, content extraction)
- [ ] `tests/search.test.cjs` — stubs for LDG-02, LDG-03 (memory search)
- [ ] `tests/sessions.test.cjs` — stubs for LDG-08, LDG-09, LDG-10 (session CRUD, naming, compatibility)
- [ ] `tests/dispatcher.test.cjs` — stubs for LDG-01 (event routing)
- [ ] `tests/integration.test.cjs` — stubs for LDG-02 through LDG-06 (pipe-through integration)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stop hook completes within timeout in live session | LDG-06 | Requires real Claude Code session lifecycle | Start session, do work, exit. Measure Stop hook timing in logs. |
| Full session lifecycle produces Graphiti episodes + sessions.json entry | LDG-02-06 | Requires real Graphiti server + Claude Code | Run full session, verify `curl localhost:8100` has episodes and sessions.json updated |
| settings.json switchover from Python/Bash to CJS | LDG-01 | One-time migration action | Swap hook registrations, verify next session works end-to-end |

*All other phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
