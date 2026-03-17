---
phase: 8
slug: foundation-and-branding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (Node.js 24 built-in) |
| **Config file** | none — node:test works without config |
| **Quick run command** | `node --test ~/.claude/dynamo/tests/*.test.cjs` |
| **Full suite command** | `node --test ~/.claude/dynamo/tests/*.test.cjs` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test ~/.claude/dynamo/tests/*.test.cjs`
- **After every plan wave:** Run `node --test ~/.claude/dynamo/tests/*.test.cjs`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | FND-01 | unit | `node --test tests/core.test.cjs -x` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | FND-04 | unit | `node --test tests/core.test.cjs --test-name-pattern "log" -x` | ❌ W0 | ⬜ pending |
| 08-01-03 | 01 | 1 | FND-05 | unit | `node --test tests/core.test.cjs --test-name-pattern "health" -x` | ❌ W0 | ⬜ pending |
| 08-01-04 | 01 | 1 | FND-06 | unit | `node --test tests/core.test.cjs --test-name-pattern "fetch" -x` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | FND-02 | unit + integration | `node --test tests/mcp-client.test.cjs -x` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 1 | FND-03 | unit | `node --test tests/scope.test.cjs -x` | ❌ W0 | ⬜ pending |
| 08-04-01 | 04 | 2 | FND-07 | unit | `node --test tests/regression.test.cjs -x` | ❌ W0 | ⬜ pending |
| 08-04-02 | 04 | 2 | BRD-01 | static check | `node --test tests/regression.test.cjs --test-name-pattern "branding" -x` | ❌ W0 | ⬜ pending |
| 08-04-03 | 04 | 2 | BRD-02 | static check | `node --test tests/regression.test.cjs --test-name-pattern "directory" -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/core.test.cjs` — stubs for FND-01, FND-04, FND-05, FND-06
- [ ] `tests/mcp-client.test.cjs` — stubs for FND-02
- [ ] `tests/scope.test.cjs` — stubs for FND-03
- [ ] `tests/regression.test.cjs` — stubs for FND-07, BRD-01, BRD-02
- No framework install needed (node:test is built-in)
- No config file needed (node:test works without configuration)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MCP SSE canary round-trip | FND-02 | Requires running Graphiti | Start Graphiti, run `node --test tests/mcp-client.test.cjs --test-name-pattern "canary"` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
