# Feature Research

**Domain:** Claude Code Global Setup Enhancers — MCP servers, CLI tools, and Skills for a full-stack WordPress/PHP developer
**Researched:** 2026-03-16
**Confidence:** HIGH (GitHub API for stars/commit dates, multiple web sources cross-referenced)

---

## Baseline: What Claude Code Has Natively (Do Not Duplicate)

Before evaluating any MCP, understand what CC already provides. Installing MCPs that overlap wastes context tokens and creates confusion.

| Built-in Capability | CC Native Tool | MCP That Duplicates It |
|---------------------|---------------|------------------------|
| File read/write/edit | Read, Write, Edit | Filesystem MCP — **skip** |
| File search by pattern | Glob | Filesystem MCP — **skip** |
| Content search | Grep | Filesystem MCP — **skip** |
| Shell execution | Bash | Desktop Commander — **skip** for CC |
| Web page fetching | WebFetch | Fetch MCP — **skip** |
| Web search | WebSearch | Most search MCPs — **evaluate carefully** |
| Subagent spawning | Task | — |
| Task tracking | TodoWrite | — |

**Key insight:** CC has 20 built-in tools. The 2026 Tool Search lazy-loading feature reduces context overhead from multiple MCPs by ~85%. Even so, each MCP server adds token overhead — the lean approach (5-8 tools) is correct.

**Context cost reality:** A 5-server setup consumes ~55K tokens before conversation starts. A server like Jira MCP alone adds ~17K tokens. Every addition must justify its cost.

---

## Feature Landscape

### Table Stakes (What Power CC Users Have)

Tools that experienced Claude Code users have configured. Missing these means operating below baseline capability.

| Tool | Category | GitHub | Stars | Last Commit | What It Does | Self-Manageable? |
|------|----------|--------|-------|-------------|--------------|-----------------|
| **Context7 MCP** | Language Refs / Docs | [upstash/context7](https://github.com/upstash/context7) | 49,270 | 2026-03-16 | Injects version-specific library docs into prompts automatically. Prevents hallucinated APIs. | YES — `claude mcp add context7 -- npx -y @upstash/context7-mcp@latest` |
| **GitHub MCP Server** | DevOps / Source Control | [github/github-mcp-server](https://github.com/github/github-mcp-server) | 27,944 | 2026-03-16 | Manages repos, PRs, issues, code search via GitHub API. Official server from GitHub. | YES — HTTP transport, PAT token in env |
| **Playwright MCP** | Web / Browser | [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | 29,037 | 2026-03-16 | Browser automation via accessibility snapshots. No vision model needed. Testing, scraping, form fills. | YES — `npx @playwright/mcp@latest`, auto-installs browser binaries |
| **Brave Search MCP** | Web / API Research | [brave/brave-search-mcp-server](https://github.com/brave/brave-search-mcp-server) | 782 (official) / ~2.6k (community fork) | 2026-03-16 | Web + local search via Brave API. Independent index, less SEO spam than Google. Requires free API key. | YES — env var for API key, npx install |
| **MCP Reference Servers (fetch, sequential-thinking)** | Core Primitives | [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) | 81,234 | 2026-03-15 | Official Anthropic reference implementations. Sequential Thinking improves complex reasoning by 54% on benchmarks. Fetch is CC-native overlap — skip it. | YES — `npx @modelcontextprotocol/server-sequential-thinking` |

**Why these are table stakes:** Combined, these tools appear in nearly every "best MCP setup" list from 2026 sources. Context7 and GitHub MCP are cited in 8+ independent analyses as essential. Playwright has 29K+ stars from an official Microsoft repo. Brave Search fills a gap (CC's built-in WebSearch has limitations for power queries).

---

### Differentiators (Competitive Advantage for WordPress/PHP Workflow)

Tools with specific value for the PHP/WordPress use case. Not universal — these earn their spot only for this profile.

| Tool | Category | GitHub | Stars | Last Commit | What It Does | Self-Manageable? | WordPress/PHP Value |
|------|----------|--------|-------|-------------|--------------|-----------------|-------------------|
| **WordPress MCP Adapter** | CMS Integration | [WordPress/mcp-adapter](https://github.com/WordPress/mcp-adapter) | 670 | 2026-03-16 | Official WordPress MCP. Bridges Abilities API to MCP protocol. Moving into WP 7.0 core (April 2026). Allows CC to manage posts, plugins, settings via natural language. | YES — PHP Composer install, HTTP transport | HIGH — direct WP site management without SSH |
| **Firecrawl MCP** | Web / Research | [firecrawl/firecrawl-mcp-server](https://github.com/firecrawl/firecrawl-mcp-server) | 5,780 | 2026-03-13 | Full-page web scraping + structured extraction. Returns clean Markdown, not just search snippets. Useful for scraping competitor sites, WP documentation, API references. | YES — `npx -y firecrawl-mcp`, API key via env | MEDIUM-HIGH — research-heavy WP/PHP projects benefit from full-page retrieval |
| **PHPocalypse MCP** | Code Quality / PHP | [plapinski/PHPocalypse-MCP](https://github.com/plapinski/PHPocalypse-MCP) | 3 | 2025-03-25 | Runs PHPStan + PHP-CS-Fixer + PHPUnit inside Claude conversations. | **NO — ARCHIVED/ABANDONED** | — |
| **Claude Code Skills (WordPress)** | Code Standards | [mcpmarket.com skill](https://mcpmarket.com/tools/skills/wordpress-development-guidelines) | N/A (Skill, not MCP) | Active 2026 | Encodes WPCS (WordPress Coding Standards) — Yoda conditions, hook registration, i18n, asset enqueuing, deprecated function avoidance. Applied globally via `~/.claude/skills/`. | YES — file-based, CC can write and update | HIGH — ensures all WP code meets WPCS without manual reminders |

**Note on PHP-specific MCPs:** The lunetics/php-mcp-phpstan server (GitHub stars: 0 per API — extremely early stage, last pushed July 2025) and larspohlmann/mcp-phpstan-server are not viable candidates under the "commits within past month" constraint. PHPStan and PHPCS are better run directly via CC's native Bash tool calling `vendor/bin/phpstan` or `composer run-script lint` — no MCP needed.

---

### Anti-Features (Explicitly Avoid Installing)

These appear in ecosystem lists, seem attractive, but should be deliberately excluded.

| Tool | Category | Why It Looks Good | Why to Avoid | Better Alternative |
|------|----------|------------------|--------------|-------------------|
| **Filesystem MCP Server** | File Ops | Granular file permissions | Completely duplicates CC's native Read/Write/Edit/Glob/Grep. Wastes ~10K+ context tokens. | Use CC's built-in file tools |
| **Fetch MCP** (modelcontextprotocol) | Web Fetch | Official Anthropic server | Duplicates CC's native WebFetch tool. Security note: can access local/internal IPs. | CC's built-in WebFetch |
| **Memory MCP Server** (modelcontextprotocol/servers) | Memory | Free, reference implementation | Already solved with Graphiti (richer temporal knowledge graph). Running two memory systems creates conflicts. | Graphiti (already installed) |
| **Desktop Commander MCP** | Terminal / Files | 5,705 stars, full system control | Claude Code already has Bash (native). Desktop Commander designed for Claude Desktop (GUI), not CC (terminal). Adds redundant file system access and terminal control that CC natively provides better. | CC's native Bash + native file tools |
| **PHPocalypse MCP** | PHP Quality | Bundles PHPCS + PHPStan + PHPUnit | **ARCHIVED** (last commit 2025-03-25, 3 stars). Dead project. | Call `vendor/bin/phpstan`, `vendor/bin/phpcs`, `vendor/bin/phpunit` directly via CC's Bash |
| **Notion MCP / Jira MCP / Atlassian MCP** | Project Management | AI-native ticket management | ~17K tokens each before conversation. No PM integration in scope. Creates permission surface for sensitive data exfiltration. | Out of scope |
| **lunetics/php-mcp-phpstan** | PHP Static Analysis | Purpose-built for CC | 0 GitHub stars, last pushed July 2025 (8+ months ago). Fails maintenance criterion. No license. | `vendor/bin/phpstan` via Bash |
| **Generic community MCP forks** | Various | More features than official | Supply chain attack vector. No verified authorship. Rug-pull risk (legitimate server taken over). | Use only official org-owned repos |
| **Database MCPs (PostgreSQL, SQLite)** | Database | Natural language SQL | Out of scope per PROJECT.md. DDEV provides direct DB access already. | DDEV CLI + CC Bash |
| **Sequential Thinking MCP (community forks)** | Reasoning | Additional features | Use official `@modelcontextprotocol/server-sequential-thinking` only. Forks are unverified. | Official MCP reference server |

---

## Feature Dependencies

```
Context7 MCP
    requires --> Node.js 18+ (already on macOS + Homebrew)
    optional --> Context7 API key (1,000/month free tier without; higher limits with key)
    note --> Free tier: 60 req/hour, 1,000/month. Rate limit may be felt in heavy sessions.

GitHub MCP Server
    requires --> GitHub Personal Access Token (PAT)
    requires --> ~/.claude.json user-scope registration
    note --> Official server, HTTP transport, no local install needed

Playwright MCP
    requires --> Node.js (npx)
    auto-installs --> Chromium binaries on first run
    note --> Token-efficient CLI+skills mode emerging in 2026; MCP remains best for stateful workflows

Brave Search MCP
    requires --> Brave Search API key (free tier available)
    requires --> `BRAVE_API_KEY` environment variable
    note --> Official repo has 782 stars; community references cite ~2.6K for broader ecosystem. API key required.

WordPress MCP Adapter
    requires --> WordPress site with REST API accessible
    requires --> Plugin installed on each WP site (per-project, not global)
    note --> Moving to WP core in 7.0 (April 2026). Per-site install means this belongs in project scope, not global.

Claude Code Skills (WPCS)
    requires --> `~/.claude/skills/wordpress/SKILL.md` file
    no external dependencies
    CC can write and update these files autonomously

Firecrawl MCP
    requires --> Firecrawl API key (free tier available)
    requires --> `FIRECRAWL_API_KEY` environment variable

Sequential Thinking MCP
    requires --> Node.js (npx)
    no API key needed
    conflicts --> Do NOT run alongside heavy reasoning extensions (redundant reasoning overhead)
```

### Dependency Notes

- **WordPress MCP Adapter** requires per-site setup, making it a project-scope tool, not truly global. The value is real but the global-scope constraint limits it unless a DDEV-based localhost is consistently used.
- **Context7 free tier** (60 req/hour, 1,000/month) may constrain heavy documentation lookup sessions. The $10/month paid tier removes limits. This is the most likely tool to need tier upgrade.
- **GitHub MCP** and **Firecrawl MCP** both require API keys managed in environment variables — CC can configure these autonomously given the key values.

---

## Tool Candidates — Final Viability Matrix

| Tool | Stars | Last Commit | Maintained | Self-Manageable | WP/PHP Value | Recommendation |
|------|-------|-------------|------------|-----------------|-------------|----------------|
| Context7 MCP | 49,270 | 2026-03-16 | YES | YES | HIGH | **INCLUDE** |
| GitHub MCP | 27,944 | 2026-03-16 | YES | YES | HIGH | **INCLUDE** |
| Playwright MCP | 29,037 | 2026-03-16 | YES | YES | MEDIUM | **INCLUDE** |
| Sequential Thinking MCP | 81,234 (repo) | 2026-03-15 | YES | YES | MEDIUM | **INCLUDE** |
| Brave Search MCP (official) | 782 | 2026-03-16 | YES | YES | MEDIUM | **INCLUDE** (already in use via GSD tool) |
| Firecrawl MCP | 5,780 | 2026-03-13 | YES | YES | MEDIUM-HIGH | **CONSIDER** (needs API key, may overlap with Brave Search) |
| WordPress MCP Adapter | 670 | 2026-03-16 | YES | YES | HIGH (per-site) | **CONSIDER** (project-scope, not global) |
| WPCS Skill (file-based) | N/A | N/A | Self-managed | YES | HIGH | **INCLUDE** |
| Filesystem MCP | 81,234 (repo) | 2026-03-15 | YES | YES | NONE | **SKIP** (CC duplication) |
| Fetch MCP | 81,234 (repo) | 2026-03-15 | YES | YES | NONE | **SKIP** (CC duplication) |
| Memory MCP | 81,234 (repo) | 2026-03-15 | YES | YES | NONE | **SKIP** (Graphiti exists) |
| Desktop Commander | 5,705 | 2026-03-03 | YES | YES | NONE | **SKIP** (CC already does this) |
| PHPocalypse MCP | 3 | 2025-03-25 | NO (ARCHIVED) | NO | N/A | **SKIP** |
| php-mcp-phpstan | 0 | 2025-07-14 | NO (stale) | NO | N/A | **SKIP** |

---

## MVP Definition

### Launch With (v1 — the lean 5-tool set)

- [ ] **Context7 MCP** — Eliminates hallucinated APIs, essential for WP/PHP version-specific docs (PHP 8.x, WP 6.x APIs)
- [ ] **GitHub MCP** — PR/issue management, code search across repos without leaving CC session
- [ ] **Playwright MCP** — Browser automation for local WP site testing, visual regression, form testing on DDEV
- [ ] **Sequential Thinking MCP** — 54% improvement on complex problem benchmarks; valuable for architecture decisions
- [ ] **WPCS Skill** — Encodes WordPress Coding Standards globally; zero external dependencies, pure file-based

### Add After Validation (v1.x)

- [ ] **Brave Search MCP** — Add if CC's built-in WebSearch proves insufficient for PHP/WP ecosystem research. Note: GSD framework already uses Brave Search binary, so API key may already exist.
- [ ] **Firecrawl MCP** — Add if research sessions need full-page content extraction, not just snippets. Evaluate whether Playwright MCP already covers this need.

### Future Consideration (v2+)

- [ ] **WordPress MCP Adapter** — High value but technically project-scoped. Revisit once WP 7.0 ships (April 2026) with native Abilities API in core. At that point, a single adapter configuration may work across all DDEV projects.

---

## Feature Prioritization Matrix

| Tool | User Value | Implementation Cost | Priority |
|------|------------|---------------------|----------|
| Context7 MCP | HIGH | LOW (npx, no key needed at start) | P1 |
| GitHub MCP | HIGH | LOW (HTTP transport, PAT token) | P1 |
| WPCS Skill | HIGH | LOW (file-based, CC writes it) | P1 |
| Playwright MCP | MEDIUM | LOW (npx, auto-installs browsers) | P1 |
| Sequential Thinking MCP | MEDIUM | LOW (npx, no key needed) | P1 |
| Brave Search MCP | MEDIUM | LOW (free API key, env var) | P2 |
| Firecrawl MCP | MEDIUM | LOW (API key, env var) | P2 |
| WordPress MCP Adapter | HIGH (per-project) | MEDIUM (per-site WP plugin install) | P3 |

**Priority key:**
- P1: Must have for initial setup — core capability gaps
- P2: Should have — add after P1 tools are stable
- P3: Future consideration — depends on project patterns

---

## Security Assessment by Tool

Context matters here: the user's constraints include "no security risks" and "self-manageable." These notes flag what to watch.

| Tool | Risk Level | Specific Concern | Mitigation |
|------|-----------|-----------------|------------|
| Context7 MCP | LOW | Cloud dependency, Upstash servers see your queries | Use HTTP transport + API key; don't pass sensitive code in doc queries |
| GitHub MCP | MEDIUM | PAT token scope. Over-scoped PAT = full repo access | Create narrow-scope PAT (repo read, issues read/write only) |
| Playwright MCP | MEDIUM | Browser can access any URL including internal DDEV sites | Default config restricts file:// access; acceptable for dev use |
| Brave Search MCP | LOW | API key, search queries logged by Brave | Expected behavior for search API |
| Sequential Thinking MCP | VERY LOW | No external calls, pure reasoning scaffold | No concerns |
| Firecrawl MCP | MEDIUM | API key, web content returned can contain prompt injection | Don't scrape untrusted/adversarial sites |
| WordPress MCP Adapter | MEDIUM | REST API credentials for WP site | Use application passwords, not admin passwords |

---

## Sources

- [github/github-mcp-server](https://github.com/github/github-mcp-server) — GitHub API verified stars: 27,944, last commit 2026-03-16
- [upstash/context7](https://github.com/upstash/context7) — GitHub API verified stars: 49,270, last commit 2026-03-16
- [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) — GitHub API verified stars: 29,037, last commit 2026-03-16
- [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) — GitHub API verified stars: 81,234, last commit 2026-03-15
- [firecrawl/firecrawl-mcp-server](https://github.com/firecrawl/firecrawl-mcp-server) — GitHub API verified stars: 5,780, last commit 2026-03-13
- [brave/brave-search-mcp-server](https://github.com/brave/brave-search-mcp-server) — GitHub API verified stars: 782, last commit 2026-03-16
- [WordPress/mcp-adapter](https://github.com/WordPress/mcp-adapter) — GitHub API verified stars: 670, last commit 2026-03-16
- [wonderwhy-er/DesktopCommanderMCP](https://github.com/wonderwhy-er/DesktopCommanderMCP) — GitHub API verified stars: 5,705, last commit 2026-03-03
- [plapinski/PHPocalypse-MCP](https://github.com/plapinski/PHPocalypse-MCP) — GitHub API verified: 3 stars, ARCHIVED, last commit 2025-03-25
- [lunetics/php-mcp-phpstan](https://github.com/lunetics/php-mcp-phpstan) — GitHub API: 0 stars, last push 2025-07-14
- [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) — GitHub API verified stars: 83,268, last commit 2026-03-16
- [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) — GitHub API verified stars: 28,539, last commit 2026-03-16
- [Context7 free tier reduction (Jan 2026)](https://blog.devgenius.io/context7-quietly-slashed-its-free-tier-by-92-16fa05ddce03)
- [MCP security vulnerabilities 2026](https://www.practical-devsecops.com/mcp-security-vulnerabilities/)
- [Claude Code built-in tools vs MCP overlap](https://code.claude.com/docs/en/how-claude-code-works)
- [WordPress MCP Adapter developer blog](https://developer.wordpress.org/news/2026/02/from-abilities-to-ai-agents-introducing-the-wordpress-mcp-adapter/)
- [Claude Code skills documentation](https://code.claude.com/docs/en/skills)
- [MCP Tool Search context reduction](https://fastmcp.me/blog/most-popular-mcp-tools-2026)
- [Top Context7 alternatives 2026](https://dev.to/moshe_io/top-7-mcp-alternatives-for-context7-in-2026-2555)
- [PHP code quality tools 2026](https://new2026.medium.com/php-code-quality-tools-in-2026-phpunit-phpcs-phpcbf-phpmd-phpstan-psalm-phan-phplint-691c0a87d4c4)

---

*Feature research for: Claude Code Global Setup Enhancers*
*Researched: 2026-03-16*
