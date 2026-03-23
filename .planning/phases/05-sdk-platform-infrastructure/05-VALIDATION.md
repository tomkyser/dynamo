---
phase: 5
slug: sdk-platform-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | SDK-01 | unit | `bun test core/sdk/circuit/__tests__/circuit.test.js -x` | Wave 0 | ⬜ pending |
| 05-01-02 | 01 | 1 | SDK-01 | unit | `bun test core/sdk/circuit/__tests__/module-manifest.test.js -x` | Wave 0 | ⬜ pending |
| 05-01-03 | 01 | 1 | SDK-01 | unit | `bun test core/sdk/circuit/__tests__/event-proxy.test.js -x` | Wave 0 | ⬜ pending |
| 05-02-01 | 02 | 1 | SDK-02 | unit | `bun test core/sdk/pulley/__tests__/pulley.test.js -x` | Wave 0 | ⬜ pending |
| 05-02-02 | 02 | 1 | SDK-02 | unit | `bun test core/sdk/pulley/__tests__/output.test.js -x` | Wave 0 | ⬜ pending |
| 05-02-03 | 02 | 1 | SDK-02 | unit | `bun test core/sdk/pulley/__tests__/cli.test.js -x` | Wave 0 | ⬜ pending |
| 05-03-01 | 03 | 2 | SDK-03 | unit | `bun test core/sdk/pulley/__tests__/mcp-server.test.js -x` | Wave 0 | ⬜ pending |
| 05-04-01 | 04 | 2 | INF-01 | unit | `bun test core/sdk/pulley/__tests__/health.test.js -x` | Wave 0 | ⬜ pending |
| 05-04-02 | 04 | 2 | INF-02 | unit | `bun test core/services/relay/__tests__/relay-ecosystem.test.js -x` | Wave 0 | ⬜ pending |
| 05-04-03 | 04 | 2 | INF-03 | unit | `bun test core/services/forge/__tests__/forge-versioning.test.js -x` | Wave 0 | ⬜ pending |
| 05-04-04 | 04 | 2 | INF-04 | unit | covered by INF-02 tests | Wave 0 | ⬜ pending |
| 05-05-01 | 05 | 3 | Integration | integration | `bun test core/sdk/__tests__/integration.test.js -x` | Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `core/sdk/circuit/__tests__/circuit.test.js` — stubs for SDK-01 (module registration, facade access, dependency verification)
- [ ] `core/sdk/circuit/__tests__/module-manifest.test.js` — stubs for SDK-01 (manifest validation schema)
- [ ] `core/sdk/circuit/__tests__/event-proxy.test.js` — stubs for SDK-01 (event namespacing, cleanup)
- [ ] `core/sdk/pulley/__tests__/pulley.test.js` — stubs for SDK-02 (command registry, routing)
- [ ] `core/sdk/pulley/__tests__/output.test.js` — stubs for SDK-02 (output formatting)
- [ ] `core/sdk/pulley/__tests__/cli.test.js` — stubs for SDK-02 (argv parsing)
- [ ] `core/sdk/pulley/__tests__/mcp-server.test.js` — stubs for SDK-03 (MCP tool surface)
- [ ] `core/sdk/pulley/__tests__/health.test.js` — stubs for INF-01 (aggregation, dependency chain)
- [ ] `core/services/relay/__tests__/relay-ecosystem.test.js` — stubs for INF-02, INF-04 (ecosystem management)
- [ ] `core/services/forge/__tests__/forge-versioning.test.js` — stubs for INF-03 (GitHub Releases API)
- [ ] `core/sdk/__tests__/integration.test.js` — stubs for integration (Circuit + Pulley + Bootstrap)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MCP server responds to Claude Code tool calls | SDK-03 | Requires live Claude Code session | Start MCP server, verify tools appear in Claude Code, invoke `dynamo.status` |
| Self-update pulls from GitHub | INF-02 | Requires network + git remote | Run `dynamo update` against test repo with newer tag |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
