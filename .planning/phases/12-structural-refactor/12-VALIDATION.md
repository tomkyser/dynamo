---
phase: 12
slug: structural-refactor
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, Node 18+) |
| **Config file** | none — uses `node --test` CLI directly |
| **Quick run command** | `node --test dynamo/tests/*.test.cjs` |
| **Full suite command** | `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test dynamo/tests/*.test.cjs`
- **After every plan wave:** Run `node --test dynamo/tests/*.test.cjs dynamo/tests/ledger/*.test.cjs dynamo/tests/switchboard/*.test.cjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | STAB-08 | unit | `node --test dynamo/tests/boundary.test.cjs` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | STAB-08 | unit | `node --test dynamo/tests/switchboard/install.test.cjs` | ✅ (update) | ⬜ pending |
| 12-01-03 | 01 | 1 | STAB-08 | unit | `node --test dynamo/tests/switchboard/sync.test.cjs` | ✅ (update) | ⬜ pending |
| 12-02-01 | 02 | 1 | STAB-09 | unit | `node --test dynamo/tests/boundary.test.cjs` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 1 | STAB-09 | unit | `node --test dynamo/tests/boundary.test.cjs` | ❌ W0 | ⬜ pending |
| 12-03-01 | 03 | 2 | STAB-10 | unit | `node --test dynamo/tests/toggle.test.cjs` | ❌ W0 | ⬜ pending |
| 12-03-02 | 03 | 2 | STAB-10 | unit | `node --test dynamo/tests/toggle.test.cjs` | ❌ W0 | ⬜ pending |
| 12-03-03 | 03 | 2 | STAB-10 | unit | `node --test dynamo/tests/toggle.test.cjs` | ❌ W0 | ⬜ pending |
| 12-03-04 | 03 | 2 | STAB-10 | unit | `node --test dynamo/tests/toggle.test.cjs` | ❌ W0 | ⬜ pending |
| 12-03-05 | 03 | 2 | STAB-10 | unit | `node --test dynamo/tests/router.test.cjs` | ✅ (update) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dynamo/tests/boundary.test.cjs` — stubs for STAB-08 (directory structure), STAB-09 (import boundaries)
- [ ] `dynamo/tests/toggle.test.cjs` — stubs for STAB-10 (toggle on/off, dev mode, CLI gate)
- [ ] Update `dynamo/tests/router.test.cjs` — add checks for new memory commands and toggle commands
- [ ] Update `dynamo/tests/switchboard/install.test.cjs` — verify new directory structure deployment
- [ ] Update `dynamo/tests/switchboard/sync.test.cjs` — verify new directory structure sync

*Existing test infrastructure covers most needs — 17 test files with 100+ test cases. New tests needed only for new functionality.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MCP deregistration from `~/.claude.json` | STAB-10 | Modifies shared user config | Run `claude mcp remove --scope user graphiti`, verify with `cat ~/.claude.json \| grep graphiti` returns nothing |
| CLAUDE.md updated with CLI commands | STAB-10 | Content verification | Review `~/.claude/CLAUDE.md` for CLI memory command documentation replacing MCP tool references |
| Other Claude sessions not broken | STAB-10 | Multi-session env | Toggle OFF, deregister MCP, verify other sessions handle gracefully |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
