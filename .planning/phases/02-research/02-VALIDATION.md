---
phase: 2
slug: research
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | N/A — Phase 2 produces markdown documentation only, no code |
| **Config file** | None required |
| **Quick run command** | `test -f <deliverable> && test -s <deliverable> && echo PASS` |
| **Full suite command** | `for f in assessments/*.md writing-tools/*.md setup/*.md memory/*.md; do test -f "$f" && test -s "$f" && echo "PASS: $f" || echo "FAIL: $f"; done` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Verify the deliverable file exists and is non-empty (`test -f <file> && test -s <file>`)
- **After every plan wave:** Review all wave deliverables against their requirement criteria
- **Before `/gsd:verify-work`:** Final review plan reads all 12 deliverables and verifies every requirement criterion is satisfied
- **Max feedback latency:** 1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DOCS-01 | file+content | `test -s .planning/phases/02-research/assessments/CONTEXT7.md` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | DEVT-01 | file+content | `test -s .planning/phases/02-research/assessments/GITHUB-MCP.md` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | DEVT-02 | file+content | `test -s .planning/phases/02-research/assessments/PLAYWRIGHT-MCP.md` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | DEVT-03 | file+content | `test -s .planning/phases/02-research/assessments/SEQUENTIAL-THINKING-MCP.md` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | DOCS-02 | file+content | `test -s .planning/phases/02-research/assessments/WPCS-SKILL.md` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | WRIT-01 | file+content | `test -s .planning/phases/02-research/writing-tools/CREATIVE-WRITING.md` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | WRIT-02 | file+content | `test -s .planning/phases/02-research/writing-tools/TECHNICAL-WRITING.md` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 1 | GMGR-01 | file+content | `test -s .planning/phases/02-research/setup/GSD-LIFECYCLE.md` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 1 | GMGR-02 | file+content | `test -s .planning/phases/02-research/setup/COEXISTENCE.md` | ❌ W0 | ⬜ pending |
| 02-03-03 | 03 | 1 | MEMO-01 | file+content | `test -s .planning/phases/02-research/memory/MEMO-01-BROWSING.md` | ❌ W0 | ⬜ pending |
| 02-03-04 | 03 | 1 | MEMO-02 | file+content | `test -s .planning/phases/02-research/memory/MEMO-02-SESSIONS.md` | ❌ W0 | ⬜ pending |
| 02-03-05 | 03 | 1 | MEMO-03 | file+content | `test -s .planning/phases/02-research/memory/MEMO-03-HOOK-GAPS.md` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 2 | ALL | cross-review | All 12 files exist, non-empty, and meet requirement criteria | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All 12 deliverable directories must be created during execution. No test framework install needed.

- [ ] `mkdir -p .planning/phases/02-research/assessments` — assessment output directory
- [ ] `mkdir -p .planning/phases/02-research/writing-tools` — writing tools output directory
- [ ] `mkdir -p .planning/phases/02-research/setup` — setup docs output directory
- [ ] `mkdir -p .planning/phases/02-research/memory` — memory research output directory

*Existing infrastructure covers all phase requirements — directories are the only setup needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Assessment scorecard completeness | DOCS-01, DOCS-02, DEVT-01, DEVT-02, DEVT-03 | Content quality requires human review — file existence alone doesn't verify all scorecard fields are filled | Read each assessment; confirm all 4 gate results present, recommendation tier assigned, context cost estimated |
| Writing tools top-5 discovery | WRIT-01, WRIT-02 | Discovery completeness can't be automated | Read each doc; confirm top 5 candidates surfaced, all went through 4-gate protocol |
| Approach comparison table quality | MEMO-01, MEMO-02, MEMO-03 | ADR-style comparison quality is subjective | Read each doc; confirm comparison table with pros/cons per approach and recommendation |
| Runbook operational depth | GMGR-01 | Depth of troubleshooting decision tree can't be automated | Read doc; confirm install/update/troubleshoot/recovery sections exist with executable commands |
| Cross-cutting consistency | ALL | Final review plan checks for overlaps and gaps across all 12 deliverables | Plan 04 (final review) performs this check |

---

## Validation Sign-Off

- [ ] All tasks have file-existence verification or Wave 0 dependencies
- [ ] Sampling continuity: every task commit produces a verifiable deliverable
- [ ] Wave 0 covers directory creation (only setup needed)
- [ ] No watch-mode flags
- [ ] Feedback latency < 1s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
