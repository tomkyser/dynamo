---
phase: 03
slug: data-providers-infrastructure-services
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in) |
| **Config file** | bunfig.toml (root = "./") |
| **Quick run command** | `bun test core/providers/ core/services/forge core/services/conductor core/services/relay` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test core/providers/ core/services/forge core/services/conductor core/services/relay`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | PRV-01 | smoke | `bun test core/providers/ledger/__tests__/duckdb-backend.test.js` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | PRV-01 | unit | `bun test core/providers/ledger/__tests__/sqlite-backend.test.js` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | PRV-01 | unit | `bun test core/providers/ledger/__tests__/ledger.test.js` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | PRV-02 | unit | `bun test core/providers/journal/__tests__/frontmatter.test.js` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | PRV-02 | unit | `bun test core/providers/journal/__tests__/journal.test.js` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | SVC-05 | unit | `bun test core/services/forge/__tests__/forge.test.js` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 2 | SVC-06 | unit | `bun test core/services/conductor/__tests__/conductor.test.js` | ❌ W0 | ⬜ pending |
| 03-03-03 | 03 | 2 | SVC-07 | unit | `bun test core/services/relay/__tests__/relay.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `core/providers/ledger/__tests__/ledger.test.js` — stubs for PRV-01
- [ ] `core/providers/ledger/__tests__/duckdb-backend.test.js` — DuckDB smoke test for PRV-01
- [ ] `core/providers/ledger/__tests__/sqlite-backend.test.js` — bun:sqlite fallback for PRV-01
- [ ] `core/providers/journal/__tests__/journal.test.js` — stubs for PRV-02
- [ ] `core/providers/journal/__tests__/frontmatter.test.js` — YAML frontmatter parser for PRV-02
- [ ] `core/services/forge/__tests__/forge.test.js` — stubs for SVC-05
- [ ] `core/services/conductor/__tests__/conductor.test.js` — stubs for SVC-06
- [ ] `core/services/relay/__tests__/relay.test.js` — stubs for SVC-07

*Framework install: none needed — bun:test is built-in and already configured*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DuckDB N-API crash on Bun | PRV-01 | Runtime-specific binary compat | Run `bun test core/providers/ledger/__tests__/duckdb-backend.test.js` on actual Bun 1.3.11 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
