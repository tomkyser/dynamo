---
phase: 06
slug: bootstrap-integration-fixes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in) |
| **Config file** | none — bun:test auto-discovers `__tests__/*.test.js` |
| **Quick run command** | `bun test core/__tests__/bootstrap-integration.test.js` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test core/__tests__/bootstrap-integration.test.js`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | SVC-09 | integration | `bun test core/__tests__/bootstrap-integration.test.js -t "assay search"` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | SVC-03 | integration | `bun test core/__tests__/bootstrap-integration.test.js -t "magnet persist"` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | SVC-05 | unit | `bun test core/services/forge/__tests__/forge.test.js -t "pull"` | ❌ W0 | ⬜ pending |
| 06-01-04 | 01 | 1 | INF-02 | integration | `bun test core/__tests__/bootstrap-integration.test.js -t "update pull"` | ❌ W0 | ⬜ pending |
| 06-01-05 | 01 | 1 | Tech-01 | unit | `bun test core/__tests__/bootstrap-integration.test.js -t "switchboard deps"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `core/__tests__/bootstrap-integration.test.js` — integration test file covering all 4 success criteria + switchboard deps audit
- [ ] Additional tests in `core/services/forge/__tests__/forge.test.js` for pull() method

*Existing infrastructure (835 passing tests) covers regression; Wave 0 adds gap-specific tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `dynamo update` end-to-end | INF-02 | Requires git remote + network | 1. Set up test repo with origin 2. Run `dynamo update` 3. Verify forge.pull() called before submodule update |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
