---
phase: 12
slug: integration-surface-backfill
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in) |
| **Config file** | None needed (bun:test auto-discovers `__tests__/` dirs) |
| **Quick run command** | `bun test modules/reverie/components/cli/ modules/reverie/components/taxonomy/` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test modules/reverie/components/{changed_dir}/`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | INT-02 | unit | `bun test modules/reverie/components/cli/__tests__/status.test.js` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | INT-02 | unit | `bun test modules/reverie/components/cli/__tests__/inspect.test.js` | ❌ W0 | ⬜ pending |
| 12-01-03 | 01 | 1 | INT-02 | unit | `bun test modules/reverie/components/cli/__tests__/history.test.js` | ❌ W0 | ⬜ pending |
| 12-01-04 | 01 | 1 | INT-02 | unit | `bun test modules/reverie/components/cli/__tests__/reset.test.js` | ❌ W0 | ⬜ pending |
| 12-01-05 | 01 | 1 | INT-02 | unit | `bun test modules/reverie/components/cli/__tests__/output-modes.test.js` | ❌ W0 | ⬜ pending |
| 12-02-01 | 02 | 1 | INT-03 | unit | `bun test modules/reverie/__tests__/manifest.test.js` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 1 | INT-03 | integration | `bun test modules/reverie/__tests__/submodule-lifecycle.test.js` | ❌ W0 | ⬜ pending |
| 12-03-01 | 03 | 2 | FRG-07 | unit | `bun test modules/reverie/components/taxonomy/__tests__/cap-pressure.test.js` | ❌ W0 | ⬜ pending |
| 12-03-02 | 03 | 2 | FRG-07 | unit | `bun test modules/reverie/components/taxonomy/__tests__/domain-split.test.js` | ❌ W0 | ⬜ pending |
| 12-03-03 | 03 | 2 | FRG-07 | unit | `bun test modules/reverie/components/taxonomy/__tests__/domain-retire.test.js` | ❌ W0 | ⬜ pending |
| 12-03-04 | 03 | 2 | FRG-07 | unit | `bun test modules/reverie/components/taxonomy/__tests__/taxonomy-narratives.test.js` | ❌ W0 | ⬜ pending |
| 12-04-01 | 04 | 2 | FRG-08 | unit | `bun test modules/reverie/components/formation/__tests__/source-reference.test.js` | ❌ W0 | ⬜ pending |
| 12-04-02 | 04 | 2 | FRG-08 | unit | `bun test modules/reverie/components/fragments/__tests__/source-locator-write.test.js` | ❌ W0 | ⬜ pending |
| 12-05-01 | 05 | 3 | FRG-10 | unit | `bun test modules/reverie/components/formation/__tests__/backfill-parser.test.js` | ❌ W0 | ⬜ pending |
| 12-05-02 | 05 | 3 | FRG-10 | unit | `bun test modules/reverie/components/formation/__tests__/backfill-pipeline.test.js` | ❌ W0 | ⬜ pending |
| 12-05-03 | 05 | 3 | FRG-10 | unit | `bun test modules/reverie/components/formation/__tests__/backfill-dry-run.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `modules/reverie/components/cli/__tests__/` — All CLI test stubs (status, inspect, history, reset, output-modes)
- [ ] `modules/reverie/components/taxonomy/__tests__/` — Taxonomy governance test stubs (cap-pressure, domain-split, domain-retire, taxonomy-narratives)
- [ ] `modules/reverie/components/formation/__tests__/backfill-parser.test.js` — Backfill parser stub
- [ ] `modules/reverie/components/formation/__tests__/backfill-pipeline.test.js` — Backfill pipeline stub
- [ ] `modules/reverie/components/formation/__tests__/backfill-dry-run.test.js` — Backfill dry-run stub
- [ ] `modules/reverie/components/formation/__tests__/source-reference.test.js` — Source-reference formation stub
- [ ] `modules/reverie/components/fragments/__tests__/source-locator-write.test.js` — Source locator write stub
- [ ] `modules/reverie/__tests__/manifest.test.js` — Module manifest validation stub
- [ ] `modules/reverie/__tests__/submodule-lifecycle.test.js` — Submodule lifecycle integration stub

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CLI human-readable output formatting | INT-02 | Visual formatting judgment | Run `dynamo reverie status` and verify human output is readable and aligned |
| Backfill with real Claude export | FRG-10 | Requires actual export file | Export a conversation from claude.ai, run backfill import, verify fragment count and provenance |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
