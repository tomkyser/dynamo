---
phase: 4
slug: framework
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in) |
| **Config file** | none — bun:test uses default discovery |
| **Quick run command** | `bun test core/armature/__tests__/` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test core/armature/__tests__/`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | FWK-01 | unit | `bun test core/armature/__tests__/container.test.js` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | FWK-02 | unit | `bun test core/armature/__tests__/facade.test.js` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | FWK-03 | unit | `bun test core/armature/__tests__/lifecycle.test.js` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 2 | FWK-04 | unit | `bun test core/armature/__tests__/plugin.test.js` | ❌ W0 | ⬜ pending |
| 04-05-01 | 05 | 3 | FWK-05 | unit | `bun test core/armature/__tests__/hooks.test.js` | ❌ W0 | ⬜ pending |
| 04-06-01 | 06 | 1 | FWK-06 | unit | `bun test lib/__tests__/schema.test.js` | ✅ (enhance) | ⬜ pending |
| 04-ALL | ALL | 3 | ALL | integration | `bun test core/armature/__tests__/integration.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `core/armature/__tests__/container.test.js` — stubs for FWK-01
- [ ] `core/armature/__tests__/facade.test.js` — stubs for FWK-02
- [ ] `core/armature/__tests__/lifecycle.test.js` — stubs for FWK-03
- [ ] `core/armature/__tests__/plugin.test.js` — stubs for FWK-04
- [ ] `core/armature/__tests__/hooks.test.js` — stubs for FWK-05
- [ ] `core/armature/__tests__/integration.test.js` — stubs for full bootstrap
- [ ] Enhance `lib/__tests__/schema.test.js` with enum validation tests — covers FWK-06

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
