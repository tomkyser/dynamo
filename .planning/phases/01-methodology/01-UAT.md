---
status: testing
phase: 01-methodology
source: [01-01-SUMMARY.md]
started: 2026-03-16T19:35:00Z
updated: 2026-03-16T19:35:00Z
---

## Current Test

number: 1
name: Vetting Protocol — 4 Binary Hard Gates
expected: |
  Open `.planning/phases/01-methodology/VETTING-PROTOCOL.md`. You should see 4 clearly defined gates, each with binary pass/fail criteria:
  1. Stars threshold (tiered by publisher type)
  2. Commit recency window
  3. Self-management capability (install/configure/update/troubleshoot)
  4. CC duplication check
  Each gate should be unambiguous — no judgment calls needed.
awaiting: user response

## Tests

### 1. Vetting Protocol — 4 Binary Hard Gates
expected: Open `.planning/phases/01-methodology/VETTING-PROTOCOL.md`. You should see 4 clearly defined gates, each with binary pass/fail criteria: Stars threshold (tiered by publisher), Commit recency, Self-management capability, CC duplication check. Each gate is unambiguous — no judgment calls needed.
result: [pending]

### 2. Vetting Protocol — Scorecard Template
expected: VETTING-PROTOCOL.md contains a copy-paste scorecard template that a Phase 2 assessor can fill in for any candidate tool. Every field in the template should be answerable by a CLI command, URL, or protocol rule — no subjective fields.
result: [pending]

### 3. Vetting Protocol — Tier Criteria
expected: VETTING-PROTOCOL.md defines INCLUDE/CONSIDER/DEFER tier criteria with explicit thresholds, so a Phase 2 assessor can assign a tier at assessment time without deliberation.
result: [pending]

### 4. Anti-Features — 7 Named Exclusions
expected: Open `.planning/phases/01-methodology/ANTI-FEATURES.md`. You should see exactly 7 named tool exclusions, each with a clear justification explaining what the tool is, why it's appealing, and why it's excluded.
result: [pending]

### 5. Anti-Features — Category Rules
expected: ANTI-FEATURES.md contains 4 category rules for classifying unlisted tools that aren't in the named list. A Phase 2 researcher should be able to check any tool against these rules for O(1) exclusion lookup.
result: [pending]

### 6. Anti-Features — Not Evaluated Section
expected: ANTI-FEATURES.md has a separate "Not Evaluated" section for out-of-scope tools (e.g., Jira, Notion, database MCPs). These are clearly distinct from anti-features — they were never candidates, not tools that were evaluated and rejected.
result: [pending]

### 7. Cross-References Between Documents
expected: The two documents reference each other: ANTI-FEATURES.md references VETTING-PROTOCOL.md for gate definitions/community fork policy, and VETTING-PROTOCOL.md references the anti-features pre-filter step.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0

## Gaps

[none yet]
