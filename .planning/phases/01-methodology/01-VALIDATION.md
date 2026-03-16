---
phase: 1
slug: methodology
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — phase produces markdown documentation only |
| **Config file** | N/A |
| **Quick run command** | `test -f ".planning/phases/01-methodology/VETTING-PROTOCOL.md" && test -f ".planning/phases/01-methodology/ANTI-FEATURES.md" && echo "both exist"` |
| **Full suite command** | `test -f ".planning/phases/01-methodology/VETTING-PROTOCOL.md" && test -f ".planning/phases/01-methodology/ANTI-FEATURES.md" && echo "both exist"` |
| **Estimated runtime** | ~1 second |

---

## Sampling Rate

- **After every task commit:** Run quick run command (file existence check)
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green + human review of ANTI-FEATURES.md completeness
- **Max feedback latency:** 1 second

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | INFR-01 | smoke | `test -f ".planning/phases/01-methodology/VETTING-PROTOCOL.md" && echo "EXISTS"` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | INFR-01 | smoke | `grep -c "Gate" ".planning/phases/01-methodology/VETTING-PROTOCOL.md"` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | INFR-01 | smoke | `grep -E "Install\|Configure\|Update\|Troubleshoot" ".planning/phases/01-methodology/VETTING-PROTOCOL.md" \| wc -l` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | INFR-02 | smoke | `test -f ".planning/phases/01-methodology/ANTI-FEATURES.md" && echo "EXISTS"` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | INFR-02 | manual | Human review against FEATURES.md anti-features table | N/A | ⬜ pending |
| 01-02-03 | 02 | 1 | INFR-02 | smoke | `grep -i "category" ".planning/phases/01-methodology/ANTI-FEATURES.md"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- No test files needed — this phase produces markdown only
- No test framework install required
- All validation is file-existence smoke tests + human review

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ANTI-FEATURES.md contains all named exclusions from FEATURES.md | INFR-02 | Semantic completeness check requires cross-document matching — no grep covers this | Compare ANTI-FEATURES.md named entries against FEATURES.md anti-features table; verify every named entry appears with matching justification |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 1s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
