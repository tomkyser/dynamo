---
phase: 10
slug: operations-and-cutover
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node:test` (v24.13.1) |
| **Config file** | none — uses node --test glob |
| **Quick run command** | `node --test dynamo/tests/stages.test.cjs` |
| **Full suite command** | `node --test dynamo/tests/*.test.cjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test dynamo/tests/{module}.test.cjs`
- **After every plan wave:** Run `node --test dynamo/tests/*.test.cjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | SWB-01, SWB-03 | unit | `node --test dynamo/tests/stages.test.cjs` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 1 | SWB-01 | unit | `node --test dynamo/tests/health-check.test.cjs` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 1 | SWB-03 | unit | `node --test dynamo/tests/diagnose.test.cjs` | ❌ W0 | ⬜ pending |
| 10-02-03 | 02 | 1 | SWB-02 | unit | `node --test dynamo/tests/verify-memory.test.cjs` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 2 | SWB-06 | unit | `node --test dynamo/tests/router.test.cjs` | ❌ W0 | ⬜ pending |
| 10-03-02 | 03 | 2 | SWB-07 | unit | `node --test dynamo/tests/sync.test.cjs` | ❌ W0 | ⬜ pending |
| 10-03-03 | 03 | 2 | SWB-08 | unit | `node --test dynamo/tests/stack.test.cjs` | ❌ W0 | ⬜ pending |
| 10-03-04 | 03 | 2 | SWB-04, SWB-05 | unit | `node --test dynamo/tests/install.test.cjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `dynamo/tests/stages.test.cjs` — stubs for SWB-01, SWB-03 (individual stage functions)
- [ ] `dynamo/tests/health-check.test.cjs` — stubs for SWB-01 (orchestration + skip logic)
- [ ] `dynamo/tests/diagnose.test.cjs` — stubs for SWB-03 (13-stage orchestration)
- [ ] `dynamo/tests/verify-memory.test.cjs` — stubs for SWB-02 (pipeline checks)
- [ ] `dynamo/tests/install.test.cjs` — stubs for SWB-04, SWB-05 (deployment + settings merge)
- [ ] `dynamo/tests/sync.test.cjs` — stubs for SWB-07 (walkDir, diffTrees, conflict detection)
- [ ] `dynamo/tests/stack.test.cjs` — stubs for SWB-08 (start/stop + health wait)
- [ ] `dynamo/tests/router.test.cjs` — stubs for SWB-06 (dispatch table)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Post-install health-check runs against live Docker | SWB-04 | Requires live Docker + Graphiti | Run `dynamo install` on dev machine, verify health-check output |
| `dynamo start`/`dynamo stop` manages real containers | SWB-08 | Requires Docker daemon | Run `dynamo start`, verify containers with `docker ps`, run `dynamo stop` |
| `dynamo sync live-to-repo` syncs from ~/.claude/dynamo/ | SWB-07 | Requires deployed system | Modify a file in ~/.claude/dynamo/, run sync, verify repo updated |
| Graphiti retirement renames graphiti/ correctly | SWB-04 | Destructive live operation | Run installer, verify graphiti-legacy/ exists and Docker still works |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
