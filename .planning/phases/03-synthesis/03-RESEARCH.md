# Phase 03: Synthesis - Research

**Researched:** 2026-03-16
**Domain:** Document synthesis — ranked report authoring from completed Phase 2 assessments
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Security Assessment Method**
- Document-only approach — no live mcp-scan runs (consistent with "research only, no install" project constraint)
- Security profile per tool focuses on: transport type (stdio vs HTTP), permissions/tokens required, file/network access scope
- Each tool's security section includes a copy-paste mcp-scan command ready to run at install time (e.g., `npx mcp-scan@latest --server context7`)
- Context7 PHP/WP coverage depth noted as caveat ("unverified at research time — test at install") rather than tested now

**CONSIDER-Tier Disposition**
- Main ranking lists the 5 INCLUDE tools as "Primary Recommendations"
- A separate "Conditional Recommendations" section covers the 2 CONSIDER tools (GitHub MCP, alirezarezvani/claude-skills)
- CONSIDER tools get the same detail level as INCLUDE tools: full write-up with pros/cons, context cost, security profile, self-management commands, plus the specific condition that would upgrade them to INCLUDE
- Report explicitly states the 5-8 cap math: "5 primary recommendations. If you add both CONSIDER tools, total is 7 — still within the 5-8 cap."

**Non-Tool Findings Placement**
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFR-03 | Document self-management lifecycle for each recommended tool (install, configure, update, troubleshoot commands) | All 7 tools have fully documented 4-operation self-management tables in Phase 2 assessments — ready to copy/adapt into report |
| DLVR-01 | Produce ranked report in markdown — categories, ratings, pros/cons, final recommendations (5-8 tools) | Tier assignments complete: 5 INCLUDE + 2 CONSIDER = 7 tools within cap. All pros/cons data in Phase 2 assessments. |
| DLVR-02 | Report includes context cost estimates per tool (token overhead) | All 7 tools have verified context cost estimates in Phase 2 assessments — ready to compile |
| DLVR-03 | Report includes security assessment per tool (mcp-scan or equivalent) | Security profiles exist in all Phase 2 assessments; mcp-scan commands to be documented per-tool |
</phase_requirements>

---

## Summary

Phase 3 is a document synthesis task. No new tool research is required. All data is already collected and verified in Phase 2 assessments. The deliverable is a single ranked report in markdown that compiles, organizes, and presents the Phase 2 findings in a decision-ready format for the user.

The report structure is fully specified by locked decisions in 03-CONTEXT.md: a Prerequisites section (PATH fix first), followed by Primary Recommendations (5 INCLUDE tools), then Conditional Recommendations (2 CONSIDER tools), then a Supplementary Findings appendix containing setup docs summaries and a consolidated Future Enhancements section. Each tool write-up contains the same four elements: context cost, security profile (with copy-paste mcp-scan command), self-management lifecycle (all 4 operations), and pass/fail against Phase 1 vetting criteria.

The key authoring decision delegated to Claude's discretion is: how to order the Primary Recommendations within their section, how to balance reproduction vs. summary of Phase 2 scorecard data, and exactly how to structure each tool write-up's subsections. Research below provides all source data needed, plus a recommended ordering rationale and template structure.

**Primary recommendation:** Use category-based ordering for Primary Recommendations (Documentation tools first, Dev tools next, Writing/Skills tools last) to aid the user's install decision. This provides a natural scan path: install lowest-overhead tools first, higher-overhead tools after.

---

## Standard Stack

This phase produces markdown documentation only. No application code, no libraries, no npm packages.

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Markdown | N/A | Report format | Project-wide convention — all deliverables are `.md` files |

### Supporting
| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| Phase 2 assessment files | Canonical | Source data for tool write-ups | Copy/adapt scored fields; do not re-research |
| VETTING-PROTOCOL.md | v1.0 | Pass/fail criteria for the gate column | Reference the 4 hard gates by name in the report |

**Installation:** None required. All source material is already on disk.

---

## Report Architecture

### Mandated Document Structure

The report structure is locked by CONTEXT.md decisions. The planner must produce exactly this top-level outline:

```
RANKED-REPORT.md
├── Prerequisites (before any tool section)
│   └── PATH fix (critical blocker for all stdio MCPs)
│
├── Primary Recommendations (5 INCLUDE tools)
│   └── [Tool 1–5] — full write-up each
│
├── Conditional Recommendations (2 CONSIDER tools)
│   └── [Tool 6–7] — full write-up + upgrade condition each
│
├── Supplementary Findings (appendix)
│   ├── GSD Lifecycle (2-3 bullets + link to GSD-LIFECYCLE.md)
│   ├── Coexistence Strategy (2-3 bullets + link to COEXISTENCE.md)
│   ├── Memory System Enhancements (summaries of MEMO-01, MEMO-02, MEMO-03)
│   └── Future Enhancements (all v2 items consolidated)
│
└── Cap Math Summary
    └── "5 primary + 2 conditional = 7 — within the 5-8 cap"
```

### Per-Tool Write-Up Structure (Claude's Discretion — Recommended Template)

Each tool write-up (both INCLUDE and CONSIDER) should contain these subsections in this order:

```
### [Tool Name]
**Tier:** INCLUDE / CONSIDER
**Category:** [Documentation / Development / Writing]
**Verdict summary:** [1 sentence from Phase 2 assessment Verdict field]

#### Gate Results (Pass/Fail Table)
| Gate | Result |
|------|--------|
| Stars | PASS — [count] (threshold: [N]) |
| Commit Recency | PASS — [N days ago] |
| Self-Management | PASS — all 4 operations documented |
| CC Duplication | PASS — [one-line reason] |

#### Context Cost
[Token overhead, tool count, lazy-loading note if applicable]

#### Security Profile
**Transport:** [stdio / HTTP]
**Risk level:** [VERY LOW / LOW / MEDIUM]
**Permissions required:** [API key / PAT / none]
**mcp-scan (run at install time):**
`npx mcp-scan@latest --server [name]`
[Key security notes from Phase 2 assessment]

#### Self-Management Lifecycle
| Operation | Command |
|-----------|---------|
| Install | `[command]` |
| Configure | `[command or "No configuration required"]` |
| Update | `[command]` |
| Troubleshoot | `[command]` |

#### Pros
- [from Phase 2 assessment]

#### Cons / Caveats
- [from Phase 2 assessment]

[For CONSIDER tools only:]
#### Upgrade Condition
[Specific condition that would move this tool to INCLUDE tier]
```

---

## Source Data Inventory

All data required for the report is confirmed present in Phase 2 deliverables. No re-research needed.

### Primary Recommendations (INCLUDE tier — 5 tools)

| # | Tool | Source File | Context Cost | Security Level | Transport |
|---|------|-------------|--------------|----------------|-----------|
| 1 | Context7 MCP | assessments/CONTEXT7.md | ~300–500 tokens (2 tools) | LOW | stdio or HTTP |
| 2 | WPCS Skill | assessments/WPCS-SKILL.md | ~30–130 tokens (0 MCP tools) | VERY LOW | N/A (file-based) |
| 3 | Playwright MCP | assessments/PLAYWRIGHT-MCP.md | ~1,328 tokens with lazy-loading (59 tools) | MEDIUM | stdio |
| 4 | Sequential Thinking MCP | assessments/SEQUENTIAL-THINKING-MCP.md | ~150–200 tokens (1 tool) | VERY LOW | stdio |
| 5 | Jeffallan code-documenter | writing-tools/TECHNICAL-WRITING.md | ~80–100 tokens (0 MCP tools) | LOW | N/A (file-based) |

### Conditional Recommendations (CONSIDER tier — 2 tools)

| # | Tool | Source File | Context Cost | Security Level | Transport | Upgrade Condition |
|---|------|-------------|--------------|----------------|-----------|-------------------|
| 6 | GitHub MCP | assessments/GITHUB-MCP.md | ~12,600 tokens (84 tools); ~2,250 with min toolset | MEDIUM | HTTP | User decides structured GitHub API access justifies PAT management and context cost over `gh` CLI via Bash |
| 7 | alirezarezvani/claude-skills | writing-tools/CREATIVE-WRITING.md | ~30–100 tokens (0 MCP tools) | VERY LOW | N/A (file-based) | User needs professional writing capability (copywriting, content strategy) — acknowledging personal/fiction gap is v2 |

### Non-Tool Findings (Appendix Sources)

| Finding | Source File | Appendix Treatment |
|---------|-------------|-------------------|
| GSD lifecycle runbook | setup/GSD-LIFECYCLE.md | 2-3 bullet summary + link |
| Coexistence map | setup/COEXISTENCE.md | 2-3 bullet summary + link; surface PATH prerequisite |
| Memory browsing | memory/MEMO-01-BROWSING.md | Summary: Neo4j Browser at localhost:7475 recommended; mcp-neo4j-cypher eliminated (918 stars) |
| Session visibility | memory/MEMO-02-SESSIONS.md | Summary: combined MCP tools workaround; list_group_ids gap flagged for v2 |
| Hook gaps | memory/MEMO-03-HOOK-GAPS.md | Summary: 9 gaps identified; Tier 1 (Bash error capture, semantic diffs, task state at SessionStart) |

---

## Prerequisites Section Content

The Prerequisites section must appear BEFORE the first tool write-up. Its content comes from COEXISTENCE.md.

### Critical Blocker: PATH Not Set in settings.json

**Finding:** `~/.claude/settings.json` does not have a PATH entry in its `env` block. All stdio MCP servers (Context7 in stdio mode, Playwright, Sequential Thinking) invoke `npx` — which requires PATH to resolve the Node.js binary.

**Required fix (Claude Code runs this once before any stdio MCP install):**
```json
// In ~/.claude/settings.json, add to "env" block:
"PATH": "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
```

**Impact:** Without this, `npx @playwright/mcp@latest` and `npx -y @modelcontextprotocol/server-sequential-thinking` will fail silently when CC invokes them during sessions. Context7 in HTTP mode is unaffected (HTTP transport requires no local binary).

**Source:** `.planning/phases/02-research/setup/COEXISTENCE.md` — Critical PATH finding.

---

## Self-Management Command Reference

Complete self-management data for all 7 tools, extracted from Phase 2 assessments. The planner uses this to populate the INFR-03 lifecycle tables in the report.

### Context7 MCP
| Operation | Command |
|-----------|---------|
| Install (HTTP) | `claude mcp add-json context7 '{"type":"http","url":"https://mcp.context7.com/mcp"}'` |
| Install (stdio) | `claude mcp add context7 -- npx -y @upstash/context7-mcp@latest` |
| Configure | No API key required (free tier: 60 req/hr, 1,000/month). Optional: `export CONTEXT7_API_KEY=your_key` |
| Update (HTTP) | Server-side managed — Upstash handles updates |
| Update (stdio) | Re-run install command with `@latest` |
| Troubleshoot | `claude mcp list` — verify registration; `/mcp` in CC session — check status |

### WPCS Skill
| Operation | Command |
|-----------|---------|
| Install | CC `Write` tool — create `~/.claude/skills/wordpress/SKILL.md` with WPCS content |
| Configure | No configuration required — auto-loaded by CC at session start |
| Update | CC `Edit` tool on `~/.claude/skills/wordpress/SKILL.md`; optionally `Read` https://developer.wordpress.org/coding-standards/ |
| Troubleshoot | CC `Read` tool on `~/.claude/skills/wordpress/SKILL.md`; `Bash`: `ls ~/.claude/skills/wordpress/` |

### Playwright MCP
| Operation | Command |
|-----------|---------|
| Install | `claude mcp add playwright npx @playwright/mcp@latest` |
| Configure | `npx @playwright/mcp@latest --headless`; browser: `--browser chromium|firefox|webkit`; no API key |
| Update | Re-run install command; verify with `npm view @playwright/mcp version` |
| Troubleshoot | `claude mcp list` — verify registration; `npx @playwright/mcp@latest --help` — test binary |

### Sequential Thinking MCP
| Operation | Command |
|-----------|---------|
| Install | `claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking` |
| Configure | No configuration required. Optional: `DISABLE_THOUGHT_LOGGING=true` env var |
| Update | Re-run install command; verify with `npm view @modelcontextprotocol/server-sequential-thinking version` |
| Troubleshoot | `claude mcp list` — verify registration; `npx -y @modelcontextprotocol/server-sequential-thinking` — test binary |

### Jeffallan code-documenter Skill
| Operation | Command |
|-----------|---------|
| Install | `git clone https://github.com/Jeffallan/claude-skills.git ~/.claude/skills/jeffallan` |
| Configure | No configuration required; no API keys |
| Update | `cd ~/.claude/skills/jeffallan && git pull` |
| Troubleshoot | `git log --oneline -5 ~/.claude/skills/jeffallan` — verify recent commits; re-read SKILL.md |

### GitHub MCP (CONSIDER)
| Operation | Command |
|-----------|---------|
| Install (CC 2.1.1+) | `claude mcp add-json github '{"type":"http","url":"https://api.githubcopilot.com/mcp","headers":{"Authorization":"Bearer YOUR_GITHUB_PAT"}}'` |
| Configure | Create fine-grained PAT at GitHub Settings > Developer settings; minimum scopes: `contents:read`, `issues:write`, `pull_requests:write`, `metadata:read` |
| Update | HTTP transport — GitHub manages server-side; no user action needed |
| Troubleshoot | `claude mcp list` — verify registered; `claude mcp get github` — inspect config; `/mcp` in CC session |

### alirezarezvani/claude-skills (CONSIDER)
| Operation | Command |
|-----------|---------|
| Install | `git clone https://github.com/alirezarezvani/claude-skills.git ~/.claude/skills/alirezarezvani` |
| Configure | No API keys required; file-based |
| Update | `cd ~/.claude/skills/alirezarezvani && git pull` |
| Troubleshoot | `git status ~/.claude/skills/alirezarezvani` — verify state; re-read SKILL.md |

---

## mcp-scan Commands by Tool

Per the locked decision: each tool's security section includes a copy-paste mcp-scan command ready to run at install time. Document-only — no live scan runs in Phase 3.

| Tool | Transport | mcp-scan Command | Scan Applicable? |
|------|-----------|-----------------|------------------|
| Context7 MCP | stdio or HTTP | `npx mcp-scan@latest` (scans all registered MCP servers) | YES |
| WPCS Skill | N/A (file-based) | N/A — not an MCP server; no scan needed | NO |
| Playwright MCP | stdio | `npx mcp-scan@latest` | YES |
| Sequential Thinking MCP | stdio | `npx mcp-scan@latest` | YES |
| Jeffallan code-documenter | N/A (file-based) | N/A — not an MCP server; no scan needed | NO |
| GitHub MCP | HTTP | `npx mcp-scan@latest` | YES |
| alirezarezvani/claude-skills | N/A (file-based) | N/A — not an MCP server; no scan needed | NO |

**Note:** `npx mcp-scan@latest` scans all MCP servers registered in `~/.claude.json` in a single run. The user runs it once after installing any subset of the recommended MCP servers. No per-server invocation is needed unless testing a specific server in isolation. Per-tool documentation should reference the single shared command rather than a server-specific flag, since mcp-scan scans the whole registry.

---

## Recommended Ordering for Primary Recommendations

Claude's discretion. Research-informed recommendation: order by **context cost ascending** (lowest overhead first). This is the most decision-useful ordering because:
1. Lower-overhead tools are lower-risk installs — a user can install all five and know they added minimal overhead
2. Cost-ascending ordering makes the trade-offs visible at a glance — GitHub MCP's CONSIDER status is contextualized by seeing that five tools combined cost less than GitHub MCP alone

**Recommended order for Primary Recommendations:**

| # | Tool | Context Cost | Rationale |
|---|------|-------------|-----------|
| 1 | WPCS Skill | ~30–130 tokens | Lowest overhead; WordPress-specific; zero external deps |
| 2 | Sequential Thinking MCP | ~150–200 tokens | Near-zero cost; Anthropic official; pure reasoning scaffold |
| 3 | Jeffallan code-documenter | ~80–100 tokens | Low cost; skills repo; covers documentation gap |
| 4 | Context7 MCP | ~300–500 tokens | Low-medium cost; fills hallucination-prevention gap |
| 5 | Playwright MCP | ~1,328 tokens (lazy) | Highest INCLUDE cost; browser automation gap |

**Recommended order for Conditional Recommendations:**

| # | Tool | Context Cost | Rationale |
|---|------|-------------|-----------|
| 6 | alirezarezvani/claude-skills | ~30–100 tokens | Lower cost CONSIDER; professional writing only |
| 7 | GitHub MCP | ~12,600 tokens (full) | Highest cost in entire set; PAT required |

---

## Cap Math Statement

The report must explicitly state this framing per the locked decision:

> "This report recommends 5 primary tools (INCLUDE tier). If you add both conditional tools, total is 7 — still within the 5-8 cap. Adding only GitHub MCP brings total to 6; adding only alirezarezvani/claude-skills brings total to 6. All combinations are within the project constraint."

---

## Future Enhancements Consolidation

All v2 items from Phase 2 deliverables, consolidated for the appendix subsection:

| Item | Source | Condition for Re-evaluation |
|------|--------|-----------------------------|
| WRIT-01 personal/fiction creative writing | CREATIVE-WRITING.md | haowjy/creative-writing-skills exceeds 1,000 stars AND recency ≤90 days; OR new dedicated tool emerges |
| mcp-neo4j-cypher (memory browsing MCP) | MEMO-01-BROWSING.md | Stars reach 1,000 (was 918 at assessment) |
| list_group_ids endpoint (session visibility) | MEMO-02-SESSIONS.md | Graphiti MCP API adds endpoint; submit as upstream contribution |
| Hook gap improvements (Tier 1) | MEMO-03-HOOK-GAPS.md | Implement Bash error capture, semantic diffs, task state at SessionStart via current hook API |
| Brave Search MCP | REQUIREMENTS.md (WEBS-01) | Evaluate after v1 tools are in use (potential overlap with CC WebSearch) |
| Firecrawl MCP | REQUIREMENTS.md (WEBS-02) | Evaluate after v1 tools are in use (potential overlap with CC WebFetch) |
| WordPress MCP Adapter | REQUIREMENTS.md (WPRD-01) | Evaluate after WP 7.0 core integration (April 2026); monitor developer.wordpress.org/news/ |
| levnikolaevich/claude-code-skills | TECHNICAL-WRITING.md | Stars reach 1,000 (was 212 at assessment); strongest documentation-complete skills repo found |
| Sequential Thinking MCP re-eval | SEQUENTIAL-THINKING-MCP.md | Re-evaluate as DEFER if future Claude models render explicit thought structuring redundant |

---

## Common Pitfalls

### Pitfall 1: Reproducing Too Much Scorecard Data
**What goes wrong:** The report becomes a copy of Phase 2 assessments instead of a decision-ready summary. The user has to read 12 Phase 2 files anyway.
**How to avoid:** Summarize gate results in a compact table (4 rows, PASS/FAIL). Reproduce only the data that is required by DLVR-01/02/03: context cost, security, self-management commands. Everything else links to the Phase 2 source file.
**Signal:** If any single tool write-up exceeds 60–80 lines, it is over-reproduced.

### Pitfall 2: Missing the Prerequisites Section
**What goes wrong:** The PATH fix is buried inside the first tool's section or skipped. The user installs Playwright MCP and gets cryptic npx failure with no diagnosis path.
**How to avoid:** Prerequisites section is the FIRST content in the document, before the first `## Primary Recommendations` heading. It must be impossible to skip.

### Pitfall 3: Context Cost Numbers Without Lazy-Loading Clarification
**What goes wrong:** Report says "Playwright MCP: ~8,850 tokens" without mentioning lazy-loading — user sees that number and considers it too expensive.
**How to avoid:** Always state both numbers for MCPs with Tool Search lazy-loading: raw overhead AND effective overhead. Format: "~8,850 tokens raw / ~1,328 tokens with Tool Search lazy-loading (Claude Code 2026)."

### Pitfall 4: mcp-scan Commands Presented as Already-Run
**What goes wrong:** Security section reads as if mcp-scan was executed and returned clean results — but it was not run (document-only approach per locked decision).
**How to avoid:** Security section title is "Security Profile (document-only)" or equivalent. The mcp-scan command appears under a "Run at install time:" label. Risk levels are based on transport type and permissions analysis, not scan output.

### Pitfall 5: CONSIDER Tools Without Explicit Upgrade Condition
**What goes wrong:** User sees GitHub MCP as "conditional" but doesn't know what condition would move it to a definitive yes. They can't make a decision.
**How to avoid:** Every CONSIDER tool write-up ends with an explicit "Upgrade Condition" block stating the specific criterion for reclassifying it as INCLUDE.

### Pitfall 6: Ordering Skills and MCPs in the Same Comparison Without Flagging the Difference
**What goes wrong:** WPCS Skill appears in the same ranking table as Playwright MCP. User assumes they are installed the same way. WPCS install is CC `Write` tool; Playwright install is `claude mcp add`. Entirely different mechanisms.
**How to avoid:** Add a "Type" column to the summary table — either "MCP Server" or "CC Skill". The install pattern is different and the user must know before running commands.

---

## State of the Art

| Topic | Current State | Source |
|-------|--------------|--------|
| MCP transport | SSE deprecated as of March 2026; stdio and HTTP (Streamable HTTP) are current | VETTING-PROTOCOL.md Section 4 |
| Tool Search lazy-loading | Available in Claude Code 2026 — reduces MCP context overhead by ~85% for large tool sets | Phase 2 assessments (Playwright, GitHub MCP) |
| Context7 free tier | Rate limits reduced 92% in January 2026 (from 12,000 to 1,000 req/month) | CONTEXT7.md Cons section |
| GitHub MCP toolset filtering | Default toolsets: repos, issues, pull_requests, git; can restrict to 15 tools (~2,250 tokens) | GITHUB-MCP.md Context Cost section |
| CC Skills architecture | SKILL.md index loads at session start (~30–130 tokens); rules/*.md files load on-demand only | WPCS-SKILL.md, TECHNICAL-WRITING.md |
| Sequential Thinking package versioning | Uses date-based scheme (2025.12.18) not semver — update urgency harder to assess | SEQUENTIAL-THINKING-MCP.md |

---

## Validation Architecture

Note: `nyquist_validation` is `true` in `.planning/config.json`. However, this phase produces a single markdown document as its deliverable — there is no testable code, no functions to unit test, and no executable behavior to verify. Automated test infrastructure is not applicable.

### Phase Requirements — Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| INFR-03 | Self-management lifecycle documented for each tool | Manual review | N/A | Verify 4 operations x 7 tools = 28 command rows present in RANKED-REPORT.md |
| DLVR-01 | Ranked report exists with categories, ratings, pros/cons | Manual review | N/A | Verify file exists and has all required sections |
| DLVR-02 | Context cost estimate per tool | Manual review | N/A | Verify 7 tools each have a context cost value |
| DLVR-03 | Security assessment per tool | Manual review | N/A | Verify 7 tools each have a security profile and mcp-scan guidance |

### Wave 0 Gaps
None — no automated test infrastructure needed. This phase is documentation only.

### Verification Gate
Before `/gsd:verify-work`, confirm manually:
- [ ] RANKED-REPORT.md exists at `.planning/phases/03-synthesis/RANKED-REPORT.md`
- [ ] Prerequisites section appears before any tool write-up
- [ ] 5 INCLUDE tools present with complete write-ups
- [ ] 2 CONSIDER tools present with upgrade conditions
- [ ] All 7 tools have context cost, security profile, and self-management commands (DLVR-01/02/03, INFR-03)
- [ ] Supplementary Findings appendix present with Future Enhancements consolidation
- [ ] Cap math statement present

---

## Open Questions

1. **Context7 PHP/WP coverage caveat phrasing**
   - What we know: Coverage depth is unverified at free tier (STATE.md blocker)
   - What's unclear: How prominently to caveat this in the report vs. how much to reassure the user that architecture is sound
   - Recommendation: Include a dedicated "PHP/WordPress Note" in the Context7 write-up. State clearly: "Coverage depth at free tier unverified — test with `/wordpress/wordpress` and `/php/php` library IDs at install time. Architecture is sound regardless of depth." This is honest without being alarming.

2. **mcp-scan command format — per-server vs. global**
   - What we know: `npx mcp-scan@latest` scans all registered servers; no reliable per-server flag exists in published documentation
   - What's unclear: Whether the user would prefer per-tool scan invocations or a single post-install scan
   - Recommendation: Document the single shared command in a Security section header with a note: "Run once after installing MCP servers — scans all registered servers." Per-tool security sections explain risk level and reasoning without implying a per-tool scan.

---

## Sources

### Primary (HIGH confidence)
- `.planning/phases/02-research/assessments/CONTEXT7.md` — Full gate evaluation, context cost, self-management, security
- `.planning/phases/02-research/assessments/WPCS-SKILL.md` — Full gate evaluation, self-management, security, WPCS content
- `.planning/phases/02-research/assessments/PLAYWRIGHT-MCP.md` — Full gate evaluation, context cost (59 tools, lazy-loading), security
- `.planning/phases/02-research/assessments/SEQUENTIAL-THINKING-MCP.md` — Full gate evaluation, context cost (1 tool), security
- `.planning/phases/02-research/assessments/GITHUB-MCP.md` — Full gate evaluation, context cost (84 tools), PAT security, toolset filtering
- `.planning/phases/02-research/writing-tools/TECHNICAL-WRITING.md` — Jeffallan code-documenter INCLUDE verdict
- `.planning/phases/02-research/writing-tools/CREATIVE-WRITING.md` — alirezarezvani CONSIDER verdict, personal/fiction v2 gap
- `.planning/phases/01-methodology/VETTING-PROTOCOL.md` — 4 hard gates, tier criteria, SSE deprecation notice
- `.planning/phases/01-methodology/ANTI-FEATURES.md` — Named exclusions and category rules
- `.planning/phases/02-research/02-06-REVIEW.md` — Cross-cutting review confirming Phase 3 readiness
- `.planning/phases/03-synthesis/03-CONTEXT.md` — All locked decisions for this phase
- `.planning/REQUIREMENTS.md` — INFR-03, DLVR-01, DLVR-02, DLVR-03 definitions

### Secondary (MEDIUM confidence)
- `.planning/phases/02-research/setup/COEXISTENCE.md` — PATH prerequisite, hook namespace, config file map
- `.planning/phases/02-research/setup/GSD-LIFECYCLE.md` — GSD lifecycle runbook summary
- `.planning/phases/02-research/memory/MEMO-01-BROWSING.md` — Neo4j Browser recommendation, mcp-neo4j-cypher elimination
- `.planning/phases/02-research/memory/MEMO-02-SESSIONS.md` — Session visibility gap, combined MCP tools workaround
- `.planning/phases/02-research/memory/MEMO-03-HOOK-GAPS.md` — 9 hook gaps, Tier 1/2/3 priorities
- `.planning/STATE.md` — Accumulated decisions and blockers

---

## Metadata

**Confidence breakdown:**
- Report structure: HIGH — fully specified by locked decisions in CONTEXT.md; no ambiguity
- Source data (tool write-ups): HIGH — all Phase 2 assessments confirmed COMPLETE by cross-cutting review
- Authoring guidance (section ordering, template): HIGH — derived directly from locked decisions and Phase 2 field-by-field data
- mcp-scan command format: MEDIUM — document-only approach is locked; the specific command syntax `npx mcp-scan@latest` is from project knowledge; verify CLI flags at install time

**Research date:** 2026-03-16
**Valid until:** Indefinite — all source data is on disk. Phase 2 assessments are the authoritative data source and are not time-sensitive for this synthesis task. Tool star counts and versions will be stale if the report is not created promptly, but the report will state assessment dates.
