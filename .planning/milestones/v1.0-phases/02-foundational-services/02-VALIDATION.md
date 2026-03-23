---
phase: 2
slug: foundational-services
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in, Bun 1.3.11) |
| **Config file** | none — bun:test discovers `*.test.js` in `__tests__/` directories by convention |
| **Quick run command** | `bun test core/services/` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test core/services/<current-service>/`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | SVC-04 | unit | `bun test core/services/lathe/__tests__/lathe.test.js -t "file"` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | SVC-04 | unit | `bun test core/services/lathe/__tests__/lathe.test.js -t "dir"` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | SVC-04 | unit | `bun test core/services/lathe/__tests__/lathe.test.js -t "atomic"` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | SVC-01 | unit | `bun test core/services/switchboard/__tests__/switchboard.test.js -t "action"` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | SVC-01 | unit | `bun test core/services/switchboard/__tests__/switchboard.test.js -t "filter"` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 1 | SVC-01 | unit | `bun test core/services/switchboard/__tests__/switchboard.test.js -t "wildcard"` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | SVC-03 | unit | `bun test core/services/magnet/__tests__/magnet.test.js -t "scope"` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | SVC-03 | integration | `bun test core/services/magnet/__tests__/json-provider.test.js` | ❌ W0 | ⬜ pending |
| 02-03-03 | 03 | 2 | SVC-03 | unit | `bun test core/services/magnet/__tests__/magnet.test.js -t "events"` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 3 | SVC-02 | unit | `bun test core/services/commutator/__tests__/commutator.test.js -t "semantic"` | ❌ W0 | ⬜ pending |
| 02-04-02 | 04 | 3 | SVC-02 | unit | `bun test core/services/commutator/__tests__/commutator.test.js -t "outbound"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `core/services/lathe/__tests__/lathe.test.js` — stubs for SVC-04
- [ ] `core/services/switchboard/__tests__/switchboard.test.js` — stubs for SVC-01
- [ ] `core/services/magnet/__tests__/magnet.test.js` — stubs for SVC-03 state operations
- [ ] `core/services/magnet/__tests__/json-provider.test.js` — stubs for SVC-03 persistence
- [ ] `core/services/commutator/__tests__/commutator.test.js` — stubs for SVC-02
- [ ] `core/services/` directory creation — does not exist yet

*(All test files are Wave 0 — this is a greenfield phase creating `core/services/` from scratch)*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
