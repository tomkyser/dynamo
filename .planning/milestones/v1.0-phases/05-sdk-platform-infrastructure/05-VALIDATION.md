---
phase: 5
slug: sdk-platform-infrastructure
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-23
---

# Phase 5 -- Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

**Wave 0 Note:** Plans use TDD-collocated approach where each task creates tests and implementation together (tdd="true" attribute on tasks). This satisfies the Wave 0 intent -- every task has test creation as its first step in the RED-GREEN-REFACTOR cycle. No separate Wave 0 stub plan is needed because test files are created within each task before production code, fulfilling the Nyquist requirement that every verify has an automated command.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in, Jest-compatible API) |
| **Config file** | bunfig.toml (root = "./") |
| **Quick run command** | `bun test core/sdk/` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test core/sdk/ --bail`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Test Approach | Status |
|---------|------|------|-------------|-----------|-------------------|---------------|--------|
| 05-01-01 | 01 | 1 | SDK-01 | unit | `bun test core/sdk/circuit/__tests__/event-proxy.test.js -x` | TDD-collocated | pending |
| 05-01-02 | 01 | 1 | SDK-01 | unit | `bun test core/sdk/circuit/__tests__/module-manifest.test.js -x` | TDD-collocated | pending |
| 05-01-03 | 01 | 1 | SDK-01 | unit | `bun test core/sdk/circuit/__tests__/circuit.test.js -x` | TDD-collocated | pending |
| 05-02-01 | 02 | 1 | SDK-02 | unit | `bun test core/sdk/pulley/__tests__/output.test.js -x` | TDD-collocated | pending |
| 05-02-02 | 02 | 1 | SDK-02 | unit | `bun test core/sdk/pulley/__tests__/pulley.test.js -x` | TDD-collocated | pending |
| 05-02-03 | 02 | 1 | SDK-02 | unit | `bun test core/sdk/pulley/__tests__/cli.test.js -x` | TDD-collocated | pending |
| 05-03-01 | 03 | 1 | INF-01 | unit | `bun test core/sdk/pulley/__tests__/health.test.js -x` | TDD-collocated | pending |
| 05-03-02 | 03 | 1 | INF-03 | unit | `bun test core/services/forge/__tests__/versioning.test.js -x` | TDD-collocated | pending |
| 05-04-01 | 04 | 2 | SDK-03, INF-02, INF-04 | unit | `bun test core/sdk/pulley/__tests__/platform-commands.test.js -x` | TDD-collocated | pending |
| 05-04-02 | 04 | 2 | SDK-03 | unit | `bun test core/sdk/pulley/__tests__/mcp-server.test.js -x` | TDD-collocated | pending |
| 05-05-01 | 05 | 3 | All | integration | `bun test core/sdk/__tests__/integration.test.js -x` | TDD-collocated | pending |

*Status: pending / green / red / flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MCP server responds to Claude Code tool calls | SDK-03 | Requires live Claude Code session | Start MCP server, verify tools appear in Claude Code, invoke `dynamo.status` |
| Self-update pulls from GitHub | INF-02 | Requires network + git remote | Run `dynamo update` against test repo with newer tag |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or TDD-collocated test creation
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] TDD-collocated approach satisfies Wave 0 intent (tests created before production code within each task)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter
- [x] `wave_0_complete: true` set in frontmatter

**Approval:** ready
