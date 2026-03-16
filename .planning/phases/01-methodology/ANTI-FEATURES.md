# Anti-Features List: Claude Code Global Setup Enhancers

**Effective Date:** 2026-03-16
**Version:** 1.0
**Purpose:** This document names every currently-known tool that should NOT be installed, with explicit justification for each exclusion. It also defines category rules so Phase 2 researchers can evaluate tools not yet on the named list. Tools that are simply outside this project's scope appear in the "Not Evaluated" section — they are not anti-features.

**Quick usage:**
1. Check Part 1 (Named Exclusion List) — O(1) lookup by tool name
2. If not listed: apply Part 2 (Category Rules) to classify the tool
3. If no category matches: proceed to full gate evaluation in VETTING-PROTOCOL.md
4. If tool is out-of-scope only: it belongs in Part 3, not here

---

## Part 1: Named Exclusion List

### 1. Filesystem MCP Server

**Category:** CC built-in duplication

Provides granular file read/write/search capabilities with configurable access permissions. Appears in official MCP reference servers and looks like a must-have for any AI coding setup. Completely duplicates Claude Code's native Read, Write, Edit, Glob, and Grep tools while adding ~10K+ context tokens of overhead — use CC's built-in file tools instead.

---

### 2. Fetch MCP

**Category:** CC built-in duplication

Fetches web page content and converts it to markdown for AI consumption. Official Anthropic reference server with the credibility of the MCP organization behind it. Duplicates CC's native WebFetch tool and introduces a security concern (can access local/internal IPs) — use CC's built-in WebFetch instead.

---

### 3. Memory MCP Server

**Category:** Out-of-scope (already solved)

Provides persistent memory storage using a knowledge graph for context retention across sessions. Free, official reference implementation from Anthropic with broad community adoption. Already solved with Graphiti (richer temporal knowledge graph with scoped groups, entity edges, and episode tracking) — running two memory systems creates storage conflicts and query ambiguity.

---

### 4. Desktop Commander MCP

**Category:** CC built-in duplication

Provides terminal command execution, file system operations, and process management with diff-based editing. 5,705 stars and designed for full system control including long-running commands and process management. Designed for Claude Desktop (GUI app), not Claude Code (terminal) — CC already has native Bash for shell execution and native file tools for all filesystem operations, making Desktop Commander entirely redundant.

---

### 5. PHPocalypse MCP

**Category:** Abandoned/archived

Bundles PHPStan static analysis, PHP-CS-Fixer formatting, and PHPUnit testing into a single MCP for PHP code quality. All-in-one PHP quality tooling accessible via natural language commands. Archived repository with only 3 stars and last commit March 2025 (12+ months stale) — call `vendor/bin/phpstan`, `vendor/bin/phpcs`, and `vendor/bin/phpunit` directly via CC's native Bash tool instead.

---

### 6. lunetics/php-mcp-phpstan

**Category:** Abandoned/archived

Purpose-built MCP server for running PHPStan static analysis within Claude Code conversations. Targeted PHP static analysis integration that could streamline code quality workflows. 0 GitHub stars and last pushed July 2025 (8+ months stale), failing both the stars gate and the recency gate — run `vendor/bin/phpstan` directly via CC's Bash tool.

---

### 7. Generic community MCP forks

**Category:** Security/supply chain risk

Community-maintained forks of official MCP servers that add features, fix bugs, or extend functionality beyond the original. Often offer more features or faster bug fixes than the official server they forked from. Unverified authorship creates supply chain attack surface — tool descriptions can be silently amended for rug-pull attacks, and community forks lack the accountability of vendor-maintained servers. Use official org-owned repos; forks are assessed case-by-case only when no official alternative meets all gates (see Community Fork Policy in VETTING-PROTOCOL.md).

---

## Part 2: Category Rules

Use these rules to classify tools not yet on the named list. If a tool matches a category, apply the specified action without running the full gate evaluation.

---

### Category 1: CC Built-in Duplication (Auto-disqualify)

**Rule:** If the tool replicates a capability from the CC built-in tools table (see Gate 4 in VETTING-PROTOCOL.md) with no additional value beyond what CC provides natively, it is an anti-feature.

**Action:** Do not assess. Record: "Anti-feature — CC duplication: replicates [CC tool name]."

**Note:** Tools that enhance or extend a CC built-in (e.g., providing a different search index, a different web scraping strategy, or structured data extraction beyond raw fetch) are NOT duplicates and should proceed through the full gate evaluation. Only tools that replicate the same capability with no additional value are auto-disqualified.

---

### Category 2: Abandoned/Archived Projects (Hard fail on recency gate)

**Rule:** If the tool's GitHub repository is archived, has 0 stars, or has not had a commit in over 90 days at assessment time, it is an anti-feature.

**Action:** Do not assess. Record: "Anti-feature — Abandoned: last commit [date], [stars] stars."

**Note:** This category catches tools that would fail Gate 2 (recency) anyway. The anti-features list enables O(1) lookup so assessors don't waste time running the full gate evaluation on tools that are obviously disqualified by maintenance status alone.

---

### Category 3: Out-of-Scope for This Project

**Rule:** If the tool serves a domain explicitly listed in PROJECT.md "Out of Scope" or REQUIREMENTS.md "Out of Scope", it is out-of-scope.

**Action:** Move to "Not Evaluated" section (see Part 3) rather than listing here, UNLESS the tool is commonly recommended alongside in-scope tools and would create scope creep if not explicitly flagged. In that case, list as a named anti-feature with justification.

**Note:** The distinction matters — anti-features are tools that look appealing but have a concrete disqualifying reason (duplication, abandonment, security). Out-of-scope tools are simply not relevant to this project's goals. Placing out-of-scope tools in the anti-features list implies a quality judgment that wasn't made.

---

### Category 4: Security/Supply Chain Risk

**Rule:** If the tool is distributed only as a binary with no source code, requires permissions far beyond its stated purpose, has been flagged by mcp-scan for tool description manipulation, or exhibits typosquatting patterns (npm package name closely resembles a known tool from a different publisher), it is an anti-feature.

**Action:** Record: "Anti-feature — Security risk: [specific concern]." Do not install or recommend.

**Note:** This category is distinct from the security findings in the assessment scorecard. Scorecard security findings are informational and not a hard gate. Category 4 anti-features are tools where the security concern is so fundamental (no source code, typosquatting, confirmed mcp-scan alert) that assessment is not warranted.

---

## Part 3: Not Evaluated

These tools are outside this project's scope entirely. They are NOT anti-features — they simply were not candidates for this assessment. This section exists to prevent scope creep: listing a tool here signals "don't investigate this," so Phase 2 researchers don't spend time evaluating it.

| Tool | Domain | Why Not Evaluated |
|------|--------|-------------------|
| Notion MCP | Project management | Out of scope — no PM integration requested; ~17K tokens per server |
| Jira MCP | Project management | Out of scope — no PM integration requested; ~17K tokens per server |
| Atlassian MCP | Project management | Out of scope — no PM integration requested; ~17K tokens per server |
| Database/SQL MCPs (PostgreSQL, SQLite, etc.) | Database access | Out of scope per PROJECT.md — not requested; DDEV provides direct DB access |
| SSE-only transport MCPs (no HTTP/stdio alternative) | Various | Deprecated protocol — SSE transport removed from MCP spec as of March 2026; tools with no alternative transport are not evaluated |

**Closing note:** If a Phase 2 researcher encounters a tool not on the named exclusion list and not in the "Not Evaluated" section, apply the category rules above. If the tool doesn't match any category, proceed with the full gate evaluation in VETTING-PROTOCOL.md.

---

*Anti-features list version: 1.0*
*Effective: 2026-03-16*
*Named entries: 7*
*Category rules: 4*
*See also: VETTING-PROTOCOL.md for gate definitions and Community Fork Policy*
