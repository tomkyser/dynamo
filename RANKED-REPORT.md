# Claude Code Global Setup Enhancers — Ranked Report

**Date:** 2026-03-16
**Project:** Research-only vetting of global-scope tools for Claude Code
**Scope:** 5 primary recommendations + 2 conditional recommendations (7 total, within 5-8 cap)

---

## Prerequisites

### Critical: PATH Not Set in settings.json

**Finding:** `~/.claude/settings.json` does not have a PATH entry in its `env` block. All stdio MCP servers (Playwright MCP, Sequential Thinking MCP, and Context7 in stdio mode) invoke `npx` — which requires PATH to resolve the Node.js binary.

**Required fix — do this ONCE before installing any stdio MCP server:**

```json
// In ~/.claude/settings.json, add to the "env" block:
"PATH": "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
```

**Impact:** Without this fix, `npx @playwright/mcp@latest` and `npx -y @modelcontextprotocol/server-sequential-thinking` will fail silently when Claude Code invokes them during sessions. Context7 in HTTP mode is unaffected (HTTP transport requires no local binary).

**This step is required only once.** After the PATH entry is present, all stdio MCP installs will work correctly.

**Source:** `.planning/phases/02-research/setup/COEXISTENCE.md` — Critical PATH finding.

---

## Primary Recommendations

5 tools recommended for immediate installation. Ordered by context cost (lowest overhead first).

| # | Tool | Type | Context Cost | Security | Category |
|---|------|------|-------------|----------|----------|
| 1 | WPCS Skill | CC Skill | ~30-130 tokens | VERY LOW | WordPress |
| 2 | Sequential Thinking MCP | MCP Server | ~150-200 tokens | VERY LOW | Development |
| 3 | Jeffallan code-documenter | CC Skill | ~80-100 tokens | LOW | Writing |
| 4 | Context7 MCP | MCP Server | ~300-500 tokens | LOW | Documentation |
| 5 | Playwright MCP | MCP Server | ~1,328 tokens (lazy) | MEDIUM | Development |

**Type column:** CC Skills are file-based (installed via `Write` tool to `~/.claude/skills/`). MCP Servers are registered via `claude mcp add` and run as child processes or HTTP connections.

---

### 1. WPCS Skill

**Tier:** INCLUDE
**Category:** WordPress
**Verdict:** The most context-efficient tool in this plan — a file-based WordPress Coding Standards skill that fills the persistent WPCS knowledge gap with zero external dependencies and all operations via CC native tools.

#### Gate Results

| Gate | Result |
|------|--------|
| Stars | PASS — 2,737 (WPCS repo, vendor-official: threshold 100; Stars gate adapted for file-based Skill format) |
| Commit Recency | PASS — 10 days ago (≤30 days: PREFERRED) |
| Self-Management | PASS — all 4 operations documented |
| CC Duplication | PASS — CC has no native persistent WPCS knowledge; Skill provides version-specific rules without relying on training data |

#### Context Cost

~30-130 tokens for the SKILL.md index file loaded at session start. Rules files load on-demand only — not at startup. Zero MCP tools exposed. Most context-efficient format in this plan.

#### Security Profile (Document-Only)

**Transport:** N/A (file-based)
**Risk Level:** VERY LOW
**Permissions:** None required
**Run at install time:** Not an MCP server — no mcp-scan needed

The Skill is a plain markdown file with no code execution, no network access, and no external dependencies. Content risk is limited to stale WPCS rules — mitigated by CC's ability to read current WPCS docs from developer.wordpress.org during updates.

#### Self-Management Lifecycle

| Operation | Command |
|-----------|---------|
| Install | CC `Write` tool — create `~/.claude/skills/wordpress/SKILL.md` with WPCS content |
| Configure | No configuration required — auto-loaded by CC at session start |
| Update | CC `Edit` tool on `~/.claude/skills/wordpress/SKILL.md`; optionally `Read` https://developer.wordpress.org/coding-standards/ |
| Troubleshoot | CC `Read` tool on `~/.claude/skills/wordpress/SKILL.md`; `Bash`: `ls ~/.claude/skills/wordpress/` |

#### Pros

- Zero installation dependencies — pure markdown file; CC writes and manages it
- Minimal context overhead (~30-130 tokens) — most efficient format for persistent knowledge
- No API key, no npm, no external service, no rate limits
- Automatically applied at every CC session — zero user friction
- CC can autonomously update the Skill by reading current WPCS docs

#### Cons / Caveats

- Content must be curated manually the first time — CC must author SKILL.md with the right WPCS rules
- No auto-update from WPCS releases — CC must proactively check developer.wordpress.org when WPCS publishes a new version
- Skills only load in CC sessions — not available in Claude.ai web or Claude Desktop without Skills configured

**Source:** `.planning/phases/02-research/assessments/WPCS-SKILL.md`

---

### 2. Sequential Thinking MCP

**Tier:** INCLUDE
**Category:** Development
**Verdict:** Official Anthropic reference server with near-zero context cost (1 tool, ~150-200 tokens) — the explicit structuring, revision, and branching capabilities are additive to model-native reasoning, not duplicative.

#### Gate Results

| Gate | Result |
|------|--------|
| Stars | PASS — 81,240 (modelcontextprotocol/servers monorepo; vendor-official threshold: 100; stars belong to full monorepo, not this server alone) |
| Commit Recency | PASS — 0 days ago (2026-03-16; ≤30 days: PREFERRED) |
| Self-Management | PASS — all 4 operations documented |
| CC Duplication | PASS — revision and branching features (`isRevision`, `branchFromThought`) have no equivalent in model-native reasoning |

#### Context Cost

1 tool (`sequential_thinking`), ~150-200 tokens. Lowest possible context cost for an MCP server. With Tool Search lazy-loading active, tool schema is not loaded until needed.

#### Security Profile (Document-Only)

**Transport:** stdio
**Risk Level:** VERY LOW
**Permissions:** None required
**Run at install time:** `npx mcp-scan@latest` (scans all registered MCP servers)

Pure reasoning scaffold with zero external surface: no network access, no file system access, no API keys. Processes only the text the model sends to the tool. No external side effects.

#### Self-Management Lifecycle

| Operation | Command |
|-----------|---------|
| Install | `claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking` |
| Configure | No configuration required. Optional: `DISABLE_THOUGHT_LOGGING=true` env var |
| Update | Re-run install command; verify with `npm view @modelcontextprotocol/server-sequential-thinking version` |
| Troubleshoot | `claude mcp list` — verify registration; `npx -y @modelcontextprotocol/server-sequential-thinking` — test binary |

#### Pros

- Extremely low context cost (1 tool, ~150-200 tokens) — negligible overhead
- Official Anthropic reference server — highest publisher accountability
- No API key, no credentials, no external dependencies
- Revision and branching features provide structured exploration of alternative approaches unavailable in model-native reasoning

#### Cons / Caveats

- Value is task-dependent: Claude Sonnet 4.6 already reasons well implicitly; marginal improvement harder to measure than capability-gap tools
- Stars attribution ambiguity: 81,240 stars are for the entire monorepo, not Sequential Thinking alone
- Date-based versioning (2025.12.18) makes update urgency assessment less intuitive

**Source:** `.planning/phases/02-research/assessments/SEQUENTIAL-THINKING-MCP.md`

---

### 3. Jeffallan code-documenter

**Tier:** INCLUDE
**Category:** Writing
**Verdict:** Highest-starred CC Skills repo (6,845) with a dedicated code-documenter skill covering docstrings, OpenAPI/Swagger, JSDoc, doc portals, user guides, and READMEs — fills the documentation generation gap at near-zero context cost.

#### Gate Results

| Gate | Result |
|------|--------|
| Stars | PASS — 6,845 (community threshold: 1,000) |
| Commit Recency | PASS — 10 days ago (2026-03-06; ≤30 days: PREFERRED) |
| Self-Management | PASS — all 4 operations documented |
| CC Duplication | PASS — CC has no native documentation generation capability; Write/Edit tools write files but provide no documentation framework or structure guidance |

#### Context Cost

0 MCP tools exposed. ~80-100 tokens per skill file loaded. File-based skill: zero context cost at session start; loaded only when explicitly invoked via `/read` command.

#### Security Profile (Document-Only)

**Transport:** N/A (file-based)
**Risk Level:** LOW
**Permissions:** None required
**Run at install time:** Not an MCP server — no mcp-scan needed

Plain markdown file, no code execution, no network access. Only dependency is the git clone from a public GitHub repo — standard supply chain considerations apply.

#### Self-Management Lifecycle

| Operation | Command |
|-----------|---------|
| Install | `git clone https://github.com/Jeffallan/claude-skills.git ~/.claude/skills/jeffallan` |
| Configure | No configuration required; no API keys |
| Update | `cd ~/.claude/skills/jeffallan && git pull` |
| Troubleshoot | `git log --oneline -5 ~/.claude/skills/jeffallan` — verify recent commits; re-read SKILL.md |

#### Pros

- Highest star count of any CC Skills repo (6,845) — strongest adoption signal in this category
- Dedicated code-documenter skill covering all three WRIT-02 dimensions: documentation, API docs (OpenAPI/Swagger, JSDoc), READMEs
- Well-maintained (10 days since last commit)
- Zero context overhead unless explicitly invoked

#### Cons / Caveats

- Scope is code-adjacent documentation; no DIATAXIS framework or prose-heavy technical writing guidance
- Broad repo scope (66 skills); code-documenter is one of many — not a dedicated technical writing focus

**Source:** `.planning/phases/02-research/writing-tools/TECHNICAL-WRITING.md`

---

### 4. Context7 MCP

**Tier:** INCLUDE
**Category:** Documentation
**Verdict:** 49,280-star library documentation tool that directly addresses AI hallucination of library APIs — 2 tools, ~300-500 token overhead, free tier requires no API key.

#### Gate Results

| Gate | Result |
|------|--------|
| Stars | PASS — 49,280 (established-org threshold: 500) |
| Commit Recency | PASS — 0 days ago (2026-03-16; ≤30 days: PREFERRED) |
| Self-Management | PASS — all 4 operations documented |
| CC Duplication | PASS — CC has no native library documentation lookup; WebFetch can fetch docs but provides no library indexing or version-specific retrieval |

#### Context Cost

2 tools (`resolve-library-id`, `query-docs`), ~300-500 tokens. Tool Search lazy-loading means definitions load only when invoked. Note: each `query-docs` response injects documentation snippets into context (~1K-5K tokens per lookup depending on library and query).

#### Security Profile (Document-Only)

**Transport:** stdio or HTTP (user's choice at install time)
**Risk Level:** LOW
**Permissions:** None required for free tier (optional API key for higher rate limits)
**Run at install time:** `npx mcp-scan@latest` (scans all registered MCP servers)

HTTP mode: queries sent to Upstash servers — do not include sensitive internal code fragments in library queries. stdio mode: runs as local process, fetches docs from Upstash API over HTTPS. Free tier: 60 req/hr, 1,000/month — hitting limits causes silent degradation, not errors.

**PHP/WordPress Note:** Coverage depth at free tier unverified — test with `/wordpress/wordpress` and `/php/php` library IDs at install time. Architecture is sound regardless of depth; a paid tier ($10/month) may be required for production WP development.

#### Self-Management Lifecycle

| Operation | Command |
|-----------|---------|
| Install | `claude mcp add-json context7 '{"type":"http","url":"https://mcp.context7.com/mcp"}'` |
| Configure | No API key required (free tier: 60 req/hr, 1,000/month). Optional: `export CONTEXT7_API_KEY=your_key` |
| Update | HTTP mode: server-side managed — Upstash handles updates. stdio mode: re-run install command with `@latest` |
| Troubleshoot | `claude mcp list` — verify registration; `/mcp` in CC session — check status |

#### Pros

- Extremely high adoption (49,280 stars) with Upstash as a credible established org
- Only 2 MCP tools — minimal context overhead
- Directly addresses AI hallucination for library APIs — the most common source of incorrect AI-generated code
- Free tier requires no API key — zero friction onboarding
- Both HTTP (zero local install) and stdio transport options

#### Cons / Caveats

- Free tier limits (60 req/hr, 1,000/month) may constrain heavy documentation sessions; rate limits were reduced 92% in January 2026 (12,000 → 1,000 req/month)
- Coverage depth at free tier unverified — may require paid tier ($10/month) for production WP development use
- Cloud dependency: relies on Upstash servers; no offline operation in HTTP mode

**Source:** `.planning/phases/02-research/assessments/CONTEXT7.md`

---

### 5. Playwright MCP

**Tier:** INCLUDE
**Category:** Development
**Verdict:** Official Microsoft vendor server (29,037 stars) that fills the interactive browser automation gap CC's stateless WebFetch cannot address — directly serves DDEV/WordPress localhost testing workflows.

#### Gate Results

| Gate | Result |
|------|--------|
| Stars | PASS — 29,037 (vendor-official threshold: 100) |
| Commit Recency | PASS — 0 days ago (2026-03-16; ≤30 days: PREFERRED) |
| Self-Management | PASS — all 4 operations documented |
| CC Duplication | PASS — WebFetch is stateless HTTP fetch; cannot maintain login sessions, click buttons, fill forms, execute JavaScript, or navigate multi-step flows |

#### Context Cost

59 tools (`browser_*`), ~8,850 tokens raw. **Effective with Tool Search lazy-loading: ~1,328 tokens** (~8,850 x 0.15). Tool Search reduces context overhead by ~85% by loading tool schemas on demand. The 1,328-token figure is the operative number for Claude Code 2026.

#### Security Profile (Document-Only)

**Transport:** stdio
**Risk Level:** MEDIUM
**Permissions:** None required (no API key; Chromium auto-installs on first run)
**Run at install time:** `npx mcp-scan@latest` (scans all registered MCP servers)

Two considerations: (1) Local network access — Playwright can access `localhost` and `*.ddev.site` addresses; this is intentional value for DDEV/WordPress developers testing local sites. Mitigation: `--allowed-hosts` and `--blocked-origins` flags restrict reachable hosts. (2) Accessibility tree snapshots expose full page structure including form field contents — expected behavior for local development; exercise caution on authenticated sessions against production-adjacent sites.

MEDIUM security is a FEATURE for DDEV localhost testing — same-machine browser access is the design intent.

#### Self-Management Lifecycle

| Operation | Command |
|-----------|---------|
| Install | `claude mcp add playwright npx @playwright/mcp@latest` |
| Configure | `npx @playwright/mcp@latest --headless`; browser: `--browser chromium\|firefox\|webkit`; no API key |
| Update | Re-run install command; verify with `npm view @playwright/mcp version` |
| Troubleshoot | `claude mcp list` — verify registration; `npx @playwright/mcp@latest --help` — test binary |

#### Pros

- Fills genuine capability gap: interactive browser automation CC's stateless WebFetch cannot provide
- Official Microsoft vendor server — high maintenance accountability (29K stars, committed same day as assessment)
- No API key required — zero ongoing cost
- Local network access is a FEATURE for DDEV/WordPress developers testing localhost
- Tool Search lazy-loading reduces 59-tool overhead by ~85% in practice
- Supports headless mode (CI/automated) and headed mode (interactive debugging)

#### Cons / Caveats

- High raw tool count (59 tools, ~8,850 tokens) without Tool Search active
- Browser binary auto-install adds ~100-200MB of Chromium on first run
- MEDIUM security risk: browser can access local network; review `--allowed-hosts` if sensitive local services exist
- Stateful browser sessions add complexity vs. stateless fetches

**Source:** `.planning/phases/02-research/assessments/PLAYWRIGHT-MCP.md`

---

## Conditional Recommendations

2 tools that provide value but have notable limitations. Same detail level as primary recommendations, plus the specific condition for upgrade to INCLUDE.

---

### 6. alirezarezvani/claude-skills

**Tier:** CONSIDER
**Category:** Writing
**Verdict:** 5,387-star CC Skills repo with strong professional writing coverage (copywriting, content strategy, social content) — passes all gates but covers professional writing only; personal/fiction creative writing gap is deferred to v2.

#### Gate Results

| Gate | Result |
|------|--------|
| Stars | PASS — 5,387 (community threshold: 1,000) |
| Commit Recency | PASS — 1 day ago (2026-03-15; ≤30 days: PREFERRED) |
| Self-Management | PASS — all 4 operations documented |
| CC Duplication | PASS — Skills provide specialized writing prompts/personas CC lacks natively |

#### Context Cost

~30-100 tokens per individual skill file loaded. File-based skill: 0 MCP tools. Zero context cost at session start; loaded only when explicitly read.

#### Security Profile (Document-Only)

**Transport:** N/A (file-based)
**Risk Level:** VERY LOW
**Permissions:** None required
**Run at install time:** Not an MCP server — no mcp-scan needed

Plain markdown files, no code execution, no network access. Standard git clone from public GitHub repo.

#### Self-Management Lifecycle

| Operation | Command |
|-----------|---------|
| Install | `git clone https://github.com/alirezarezvani/claude-skills.git ~/.claude/skills/alirezarezvani` |
| Configure | No API keys required; file-based |
| Update | `cd ~/.claude/skills/alirezarezvani && git pull` |
| Troubleshoot | `git status ~/.claude/skills/alirezarezvani` — verify state; re-read SKILL.md |

#### Pros

- Very large, actively maintained repo (5,387 stars; 192+ skills)
- Strong professional writing coverage: copywriting, content-creator, content-strategy, copy-editing, social-content, cold-email
- All gates pass; self-management is standard git workflow

#### Cons / Caveats

- Zero personal/fiction creative writing coverage — no narrative, worldbuilding, or fiction-focused skills found
- Writing scope is professional/commercial only; no storytelling or narrative craft
- Repo is broad (192+ skills across many domains); writing is a subset, not the focus

#### Upgrade Condition

User needs professional writing capability (copywriting, content strategy) and acknowledges that personal/fiction creative writing gap is deferred to v2.

**Source:** `.planning/phases/02-research/writing-tools/CREATIVE-WRITING.md`

---

### 7. GitHub MCP

**Tier:** CONSIDER
**Category:** Development
**Verdict:** Official GitHub/Microsoft server (27,945 stars) providing structured semantic GitHub tool access — passes all gates but 84 tools (~12,600 tokens full) and PAT management overhead places it in CONSIDER given that `gh` CLI via Bash already handles most GitHub operations.

#### Gate Results

| Gate | Result |
|------|--------|
| Stars | PASS — 27,945 (vendor-official threshold: 100) |
| Commit Recency | PASS — 0 days ago (2026-03-16; ≤30 days: PREFERRED) |
| Self-Management | PASS — all 4 operations documented |
| CC Duplication | PASS — provides structured semantic tool access with typed parameters; `gh` CLI via Bash is functional overlap but different interface paradigm (not duplication) |

#### Context Cost

84 tools, ~12,600 tokens full toolset. **Minimum toolset (repos, issues, pull_requests): ~15 tools, ~2,250 tokens.** Toolset filtering via `X-MCP-Toolsets` header or `GITHUB_TOOLSETS` env var reduces overhead significantly. Tool Search lazy-loading applies.

#### Security Profile (Document-Only)

**Transport:** HTTP (Streamable HTTP — remote server at api.githubcopilot.com)
**Risk Level:** MEDIUM
**Permissions:** GitHub Personal Access Token (PAT) required — minimum scopes: `contents:read`, `issues:write`, `pull_requests:write`, `metadata:read`
**Run at install time:** `npx mcp-scan@latest` (scans all registered MCP servers)

PAT security posture: (1) Use fine-grained PAT (not classic) scoped to specific repositories. (2) Grant minimum permissions — `repo` scope on a classic PAT grants write access to all private repos. (3) Set 90-day expiration and rotate. (4) Store PAT in `.env` with `.gitignore` entry — do not commit. All tool calls go to `api.githubcopilot.com` — requests visible to GitHub/Microsoft.

#### Self-Management Lifecycle

| Operation | Command |
|-----------|---------|
| Install | `claude mcp add-json github '{"type":"http","url":"https://api.githubcopilot.com/mcp","headers":{"Authorization":"Bearer YOUR_GITHUB_PAT"}}'` |
| Configure | Create fine-grained PAT at GitHub Settings > Developer settings; minimum scopes: `contents:read`, `issues:write`, `pull_requests:write`, `metadata:read` |
| Update | HTTP transport — GitHub manages server-side; no user action needed |
| Troubleshoot | `claude mcp list` — verify registered; `claude mcp get github` — inspect config; `/mcp` in CC session |

#### Pros

- Official vendor server (GitHub/Microsoft) — highest trust level, verified authorship
- 27,945 stars — strong adoption signal
- HTTP transport — zero local installation; API hosted and maintained by GitHub
- Structured semantic tools enable agent-native workflows (typed parameters, validated responses)
- Toolset filtering allows narrow scope to reduce context overhead

#### Cons / Caveats

- HIGH context cost: ~12,600 tokens at full toolset — highest of any tool in this plan
- CC already provides `gh` CLI via Bash — for simple operations, MCP adds overhead without changing outcomes
- PAT rotation is a recurring maintenance task (90-day expiry recommended)
- Classic PAT `repo` scope grants write access to all private repos — over-privileged for read-only workflows

#### Upgrade Condition

User decides structured GitHub API access justifies PAT management overhead and context cost (~12,600 tokens full, ~2,250 minimum) over `gh` CLI via Bash.

**Source:** `.planning/phases/02-research/assessments/GITHUB-MCP.md`

---

## Supplementary Findings

### GSD Framework Lifecycle

- GSD installs globally at `~/.claude/` and provides structured planning workflows, slash commands, agent files, and hook scripts — all managed by CC with no user config file edits required.
- Updates follow a 6-step staged process: detect installed version (`cat ~/.claude/get-shit-done/VERSION`), check npm for latest (`npm view get-shit-done-cc version`), preview changelog, confirm with user, run installer (`npx -y get-shit-done-cc@latest --claude --global`), and clear update cache (`rm -f ~/.claude/cache/gsd-update-check.json`).
- Troubleshooting follows a decision tree: commands missing → check install then restart CC; update cache stale → delete `gsd-update-check.json`; hook errors → verify `~/.claude/hooks/gsd-*.js` exists; corrupted install → reinstall via npx.

**Full runbook:** `.planning/phases/02-research/setup/GSD-LIFECYCLE.md`

---

### Global Scope Coexistence

- All global tools share the `~/.claude/` namespace — `~/.claude.json` (MCP server registry), `~/.claude/settings.json` (hooks, permissions, env), `~/.claude/skills/` (skill subfolders), and `~/.claude/commands/` (slash commands). Each tool owns distinct subpaths; collision risks are low but require awareness before adding new tools.
- Hook interaction risks: SessionStart has 3 hooks (2 Graphiti, 1 GSD); hooks without explicit timeouts can cascade. Always set explicit timeouts on new hooks and keep scripts under 5 seconds.
- PATH prerequisite (see Prerequisites section above) applies to all stdio MCP additions. Skills subfolder naming must be unique — avoid generic names like `writing/` or `research/`.

**Full strategy:** `.planning/phases/02-research/setup/COEXISTENCE.md`

---

### Memory System Research

- **Memory browsing (MEMO-01):** Neo4j Browser at `http://localhost:7475` is the recommended interface for direct graph exploration of the Graphiti knowledge graph. `mcp-neo4j-cypher` MCP was evaluated and eliminated — 918 stars below the 1,000-star community threshold. Re-evaluate when stars reach 1,000.
- **Session visibility (MEMO-02):** No session listing endpoint exists in the Graphiti MCP API (`list_group_ids` is absent). Workaround: use project-scoped search via existing MCP tools (`search_memory_facts`, `search_nodes` with `group_id` filter). The `list_group_ids` endpoint is flagged for v2 as an upstream contribution to the Graphiti project.
- **Hook gaps (MEMO-03):** 9 gaps identified across 5 lifecycle hooks. Tier 1 priorities (closable with current hook API): Bash error capture (PostToolUse on Bash failures), semantic diffs on file changes (PostToolUse Write/Edit), and active task state injection at SessionStart.

**Full memos:**
- `.planning/phases/02-research/memory/MEMO-01-BROWSING.md`
- `.planning/phases/02-research/memory/MEMO-02-SESSIONS.md`
- `.planning/phases/02-research/memory/MEMO-03-HOOK-GAPS.md`

---

### Future Enhancements

All v2 items from Phase 2 research, consolidated for tracking.

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

## Recommendation Summary

This report recommends 5 primary tools (INCLUDE tier). If you add both conditional tools, total is 7 — still within the 5-8 cap. Adding only GitHub MCP brings total to 6; adding only alirezarezvani/claude-skills brings total to 6. All combinations are within the project constraint.

| Configuration | Tools | Estimated Context Overhead |
|---------------|-------|---------------------------|
| Primary only | 5 | ~1,888-2,258 tokens |
| + alirezarezvani/claude-skills | 6 | ~1,918-2,358 tokens |
| + GitHub MCP (min toolset) | 6 | ~4,138-4,508 tokens |
| + both conditional | 7 | ~4,168-4,608 tokens |
| + GitHub MCP (full toolset) | 6 | ~14,488-14,858 tokens |

**Primary total breakdown:** WPCS 30-130 + Sequential Thinking 150-200 + code-documenter 80-100 + Context7 300-500 + Playwright 1,328 = ~1,888-2,258 tokens.

---

*Report generated: 2026-03-16*
*Phase 1 methodology: .planning/phases/01-methodology/*
*Phase 2 research: .planning/phases/02-research/*
*Project constraints: .planning/PROJECT.md*
