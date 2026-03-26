---
phase: 14
slug: deployment-readiness-architecture-compliance
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-26
---

# Phase 14 -- Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test |
| **Config file** | none -- uses bun test defaults |
| **Quick run command** | `bun test core/armature/__tests__/hooks.test.js core/services/exciter/__tests__/exciter.test.js modules/reverie/components/cli --timeout 30000` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command (scoped to changed files)
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | INT-01, PLT-03 | integration | `bun test core/armature/__tests__/hooks.test.js core/services/exciter/__tests__/exciter.test.js --timeout 30000` | hooks.test.js: yes, exciter.test.js: yes (new cases added by task) | pending |
| 14-01-02 | 01 | 1 | INT-01 | structural | `grep -q "process.argv\[2\] === 'hook'" bin/dynamo.cjs && grep -q "async function handleHook" bin/dynamo.cjs && echo "PASS"` | N/A (structural check) | pending |
| 14-02-01 | 02 | 1 | INT-02 | unit | `bun test core/sdk/pulley modules/reverie/components/cli --timeout 30000` | yes | pending |
| 14-02-02 | 02 | 1 | INT-02 | unit | `bun test modules/reverie/components/cli/__tests__/status.test.js --timeout 15000` | yes (new cases added by task) | pending |
| 14-03-01 | 03 | 2 | INT-01, INT-02, PLT-03 | audit | `test -f .planning/phases/14-deployment-readiness-architecture-compliance/14-ARCHITECTURE-AUDIT.md && grep -q '## Audit Results' .planning/phases/14-deployment-readiness-architecture-compliance/14-ARCHITECTURE-AUDIT.md` | created by task | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [x] `core/services/exciter/__tests__/exciter.test.js` -- re-wire after module registration test cases (added in Plan 01, Task 1)
- [x] `modules/reverie/components/cli/__tests__/status.test.js` -- Wire.query() data path test cases (added in Plan 02, Task 2)

*Wave 0 gaps resolved: re-wire tests added to existing exciter.test.js; status data path tests added to existing status.test.js. No new test files needed -- existing infrastructure covers all verification points.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hook dispatch via live Claude Code session | INT-01 | Requires actual Claude Code runtime | Start Claude Code session, observe Dynamo hooks fire via settings.json |
| Full install-to-use user flow | INT-01, INT-02, PLT-03 | End-to-end deployment verification | Fresh clone, bun install, boot platform, verify Reverie loads |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify with functional commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (re-wire tests in exciter.test.js, data path tests in status.test.js)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
