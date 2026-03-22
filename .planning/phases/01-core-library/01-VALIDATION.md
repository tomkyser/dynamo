---
phase: 1
slug: core-library
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built into Bun >= 1.0) |
| **Config file** | `bunfig.toml` (create in Wave 0 if needed for test root config) |
| **Quick run command** | `bun test lib/` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test lib/`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | LIB-01 | unit | `bun test lib/__tests__/result.test.js` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | LIB-01 | unit | `bun test lib/__tests__/contract.test.js` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | LIB-02 | unit | `bun test lib/__tests__/paths.test.js` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 1 | LIB-03 | unit | `bun test lib/__tests__/schema.test.js` | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 1 | LIB-03 | unit | `bun test lib/__tests__/config.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/__tests__/result.test.js` — stubs for LIB-01a, LIB-01b
- [ ] `lib/__tests__/contract.test.js` — stubs for LIB-01c, LIB-01d, LIB-01e
- [ ] `lib/__tests__/schema.test.js` — stubs for LIB-03e, LIB-03f, LIB-03g
- [ ] `lib/__tests__/paths.test.js` — stubs for LIB-02a, LIB-02b, LIB-02c, LIB-02d
- [ ] `lib/__tests__/config.test.js` — stubs for LIB-03a, LIB-03b, LIB-03c, LIB-03d
- [ ] Bun upgrade to >= 1.3.10
- [ ] Verify `require('bun:test')` works correctly in `.test.js` CJS files
- [ ] Create `lib/` and `lib/__tests__/` directories
- [ ] Create `.dynamo` marker file at project root

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Circular dependency check | LIB-01 | Static analysis of import graph | Run `bun test` with all lib/ files imported — verify no partial module errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
