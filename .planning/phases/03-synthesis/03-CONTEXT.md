# Phase 3: Synthesis - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Compile all Phase 2 research findings into a single ranked report in markdown that gives the user everything needed to make an informed install decision for each candidate tool. The report includes 5-8 final recommendations with categories, pros/cons, context cost estimates, security assessment profiles, and self-management lifecycle commands. This phase produces the final deliverable document only — no tools are installed or configured.

</domain>

<decisions>
## Implementation Decisions

### Security Assessment Method
- Document-only approach — no live mcp-scan runs (consistent with "research only, no install" project constraint)
- Security profile per tool focuses on: transport type (stdio vs HTTP), permissions/tokens required, file/network access scope
- Each tool's security section includes a copy-paste mcp-scan command ready to run at install time (e.g., `npx mcp-scan@latest --server context7`)
- Context7 PHP/WP coverage depth noted as caveat ("unverified at research time — test at install") rather than tested now

### CONSIDER-Tier Disposition
- Main ranking lists the 5 INCLUDE tools as "Primary Recommendations"
- A separate "Conditional Recommendations" section covers the 2 CONSIDER tools (GitHub MCP, alirezarezvani/claude-skills)
- CONSIDER tools get the same detail level as INCLUDE tools: full write-up with pros/cons, context cost, security profile, self-management commands, plus the specific condition that would upgrade them to INCLUDE
- Report explicitly states the 5-8 cap math: "5 primary recommendations. If you add both CONSIDER tools, total is 7 — still within the 5-8 cap."

### Non-Tool Findings Placement
- Report has a "Prerequisites" section at the top (before rankings) containing the PATH fix and any other must-do-first items — these are blockers that can't be missed
- An appendix section ("Supplementary Findings") follows the tool rankings
- GSD lifecycle and coexistence strategy: 2-3 bullet summary per doc with link to full Phase 2 deliverable
- Memory research (browsing, sessions, hook gaps): summarized in the appendix
- A "Future Enhancements" subsection in the appendix captures all v2 items in one place: memory improvements, WRIT-01 personal/fiction gap, WordPress MCP Adapter (April 2026), tools flagged for re-evaluation (mcp-neo4j-cypher when stars >= 1,000, Brave Search MCP, Firecrawl MCP)

### Claude's Discretion
- Report structure within each tool write-up (exact section ordering, table vs. prose, how to present the scorecard data)
- Ranking order within the Primary Recommendations (alphabetical, by category, by context cost, or by recommendation strength)
- How much of the Phase 2 assessment to reproduce vs. summarize with links
- Appendix section ordering and depth of v2 roadmap items

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Vetting methodology (what the report evaluates against)
- `.planning/phases/01-methodology/VETTING-PROTOCOL.md` — 4 hard gates, scorecard template, tier criteria (INCLUDE/CONSIDER/DEFER), SSE deprecation policy
- `.planning/phases/01-methodology/ANTI-FEATURES.md` — Named exclusions and category rules

### Phase 2 assessments (raw data for the report)
- `.planning/phases/02-research/assessments/CONTEXT7.md` — INCLUDE, ~300-500 tokens, 2 tools
- `.planning/phases/02-research/assessments/WPCS-SKILL.md` — INCLUDE, ~30-130 tokens, file-based
- `.planning/phases/02-research/assessments/PLAYWRIGHT-MCP.md` — INCLUDE, ~1,328 tokens (lazy-loaded), 59 tools
- `.planning/phases/02-research/assessments/SEQUENTIAL-THINKING-MCP.md` — INCLUDE, ~150-200 tokens, 1 tool
- `.planning/phases/02-research/assessments/GITHUB-MCP.md` — CONSIDER, ~12,600 tokens, 84 tools
- `.planning/phases/02-research/writing-tools/TECHNICAL-WRITING.md` — Jeffallan code-documenter INCLUDE
- `.planning/phases/02-research/writing-tools/CREATIVE-WRITING.md` — alirezarezvani CONSIDER (professional only)

### Non-tool findings (appendix sources)
- `.planning/phases/02-research/memory/MEMO-01-BROWSING.md` — Memory browsing: Neo4j Browser recommendation
- `.planning/phases/02-research/memory/MEMO-02-SESSIONS.md` — Session visibility: combined MCP tools workaround
- `.planning/phases/02-research/memory/MEMO-03-HOOK-GAPS.md` — 9 hook gaps identified, Tier 1/2/3 priorities
- `.planning/phases/02-research/setup/GSD-LIFECYCLE.md` — GSD install/update/troubleshoot runbook
- `.planning/phases/02-research/setup/COEXISTENCE.md` — Config conflict prevention, PATH prerequisite

### Cross-cutting review (Phase 3 readiness confirmation)
- `.planning/phases/02-research/02-06-REVIEW.md` — Requirement coverage matrix, tier summary, overlap analysis, consistency checks

### Project constraints
- `.planning/REQUIREMENTS.md` — INFR-03, DLVR-01, DLVR-02, DLVR-03 are the requirements this phase delivers
- `.planning/PROJECT.md` — Core value, constraints (5-8 cap, global scope, self-management, research only)

### Prior phase context
- `.planning/phases/01-methodology/01-CONTEXT.md` — Threshold calibration, assessment template, pass/fail model
- `.planning/phases/02-research/02-CONTEXT.md` — Research approach decisions, plan organization

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No application code — this project produces documentation only (markdown files)
- Phase 2 assessment scorecards serve as the data source for each tool's write-up in the report
- Phase 1 vetting protocol provides the evaluation framework referenced in the report

### Established Patterns
- Research documents follow structured markdown with tables, sections, and source citations
- Phase deliverables go in `.planning/phases/03-synthesis/`
- Individual assessments use a consistent scorecard format from VETTING-PROTOCOL.md

### Integration Points
- This is the final phase — the ranked report is the project deliverable
- Report references Phase 1 criteria for pass/fail columns
- Report links to Phase 2 assessments for full details
- Appendix links to Phase 2 non-tool deliverables

</code_context>

<specifics>
## Specific Ideas

- The Prerequisites section before rankings ensures the PATH fix (critical blocker for stdio MCPs) is impossible to miss
- The "5 primary + 2 conditional = 7 within 5-8 cap" framing gives the user a clear mental model for decision-making
- Copy-paste mcp-scan commands per tool mean the user can run security scans at install time without looking anything up
- The v2 summary in the appendix prevents valuable deferred items from being lost across 6+ Phase 2 documents

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-synthesis*
*Context gathered: 2026-03-16*
