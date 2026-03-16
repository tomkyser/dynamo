# Project Research Summary

**Project:** Claude Code Global Setup Enhancers
**Domain:** MCP server ecosystem, CLI tooling, and Skills configuration for a full-stack WordPress/PHP developer using Claude Code
**Researched:** 2026-03-16
**Confidence:** HIGH

## Executive Summary

This project builds a global Claude Code setup that expands capability through carefully selected MCP servers and Skills. The ecosystem is well-documented and rapidly mature: an official MCP Registry exists with 6,400+ servers, three stable transport types are defined (HTTP preferred, stdio for local tools, SSE deprecated), and the configuration model is authoritative and CLI-managed. The right strategy for a solo developer is a lean, high-signal stack — 5-8 globally-scoped MCPs installed at `--scope user`, plus file-based Skills — rather than a sprawling collection. Claude Code's own 20 built-in tools already cover file ops, web fetch, search, and shell execution, so the only MCPs worth adding are those filling genuine capability gaps.

The recommended tool set is clear from research: Context7 (version-accurate library docs), GitHub MCP (PR/issue management), Playwright (browser automation for local WP testing), Sequential Thinking (complex reasoning scaffold), and a WPCS Skill (WordPress Coding Standards as a zero-cost file-based instruction). All five pass the maintenance threshold (commits within 30 days), have strong community adoption, are self-manageable by Claude Code, and collectively expose far fewer than 50 tools. Two candidates — Brave Search MCP and Firecrawl MCP — should be added after validating whether CC's native WebSearch is insufficient. The WordPress MCP Adapter is genuinely valuable but is technically project-scoped (requires per-site plugin install) and should await WP 7.0 core integration in April 2026.

The primary risks in this domain are security (tool poisoning, supply chain attacks via untrusted npm packages), configuration instability (CC auto-updates have silently wiped MCP configs in documented incidents), and context window bloat (a single over-tooled MCP can consume 58K tokens). All three risks are manageable: security is addressed by vetting-before-install and running `mcp-scan`; config corruption is addressed by backup-before-update discipline and the `autoUpdates` flag; context bloat is prevented by the 5-8 MCP hard cap and preferring narrow-tool servers over sprawling ones.

---

## Key Findings

### Recommended Stack

Claude Code provides three complementary extension mechanisms: MCP servers (external tool connectivity via JSON-RPC), Skills (procedural knowledge files at ~30-50 tokens each), and Plugins (distributable bundles — not relevant for a personal setup). For global configuration, all MCP servers are registered in `~/.claude.json` via `claude mcp add --scope user`. Two transports apply: HTTP for remote or long-running services, stdio via `npx -y` for stateless on-demand tools. SSE is officially deprecated and must not be used.

**Core technologies:**
- `claude mcp add --scope user` (HTTP/stdio): Primary install and management command — the only safe way to register MCPs (direct `~/.claude.json` editing is fragile and breaks self-management)
- `npx -y @package/mcp-server`: stdio execution pattern for stateless tools — auto-fetches latest, zero install step, no global pollution
- `gh CLI`: Vetting tool for evaluating MCP server trustworthiness via programmatic star/commit/issue checks
- `~/.claude/skills/`: File-based instruction system at trivial token cost — CC can write and update these autonomously
- `~/.claude/settings.json` `permissions.allow`: Pre-authorization list — must be updated alongside every MCP registration to avoid per-call confirmation prompts

**Critical version/naming requirements:**
- Always use `--scope user` (not `--scope global` — old name, may break)
- PATH must be explicitly set in `settings.json` `env` block or stdio MCPs using npx will fail (shell profile not sourced)
- `~/.claude.json` owns MCP registrations; `~/.claude/settings.json` owns hooks, permissions, env vars — these are separate files with different schemas

### Expected Features

Research identified a clear MVP and two post-MVP tiers. CC's built-in tools must not be duplicated.

**Must have (table stakes — v1 launch set):**
- **Context7 MCP** — Version-specific library docs injected into prompts; prevents hallucinated APIs for PHP 8.x and WP 6.x; 49K stars, official Upstash server
- **GitHub MCP** — PR/issue/code-search management without leaving session; 27K stars, official GitHub server, HTTP transport
- **Playwright MCP** — Browser automation for local DDEV WP site testing, form testing, visual regression; 29K stars, official Microsoft server
- **Sequential Thinking MCP** — 54% improvement on complex reasoning benchmarks; official Anthropic reference server, no API key
- **WPCS Skill** — WordPress Coding Standards encoded as a Skills file; zero external dependencies, CC self-manageable, HIGH WP/PHP value

**Should have (competitive — v1.x after validation):**
- **Brave Search MCP** — Add if CC's built-in WebSearch is insufficient for PHP/WP ecosystem research; official Brave server, API key required
- **Firecrawl MCP** — Add if full-page content extraction is needed beyond search snippets; evaluate overlap with Playwright first

**Defer (v2+):**
- **WordPress MCP Adapter** — High per-project value, but requires per-site WP plugin install; revisit when WP 7.0 ships in April 2026 with native Abilities API in core

**Explicit anti-features (never install):**
- Filesystem MCP, Fetch MCP, Desktop Commander — duplicate CC built-ins, waste context tokens
- Memory MCP — Graphiti already handles this; two memory systems create conflicts
- Jira/Notion/Atlassian MCPs — ~17K tokens each, out of scope
- PHPocalypse MCP — archived, 3 stars, dead project
- Any community fork when an official service-provider server exists

### Architecture Approach

The architecture separates concerns across two config files, two transport types, and three scope levels. MCP server registrations live in `~/.claude.json` (managed exclusively via `claude mcp add`). Behavioral configuration — hooks, permissions, env vars, plugins — lives in `~/.claude/settings.json`. These two files have different schemas and must never be conflated. Scopes (user > project > local) allow global defaults to be overridden at project level, but silent-override bugs exist when scope names conflict — use namespaced server names to avoid this.

**Major components:**
1. `~/.claude.json` (MCP registry) — registers server name → transport config (URL or command+args+env); managed by `claude mcp add` CLI only
2. `~/.claude/settings.json` (behavior config) — hooks, permissions.allow, env vars, plugins; governs when tools require confirmation and what lifecycle scripts run
3. MCP stdio processes (child processes spawned per session) — stateless tools like Context7, Playwright, Sequential Thinking; lifecycle fully managed by CC
4. MCP HTTP servers (external daemons) — stateful services like Graphiti; lifecycle managed externally (Docker, launchd); health check via SessionStart hook
5. `~/.claude/skills/` (instruction files) — WPCS Skill and others; trivial token cost; CC reads and writes these files directly
6. `~/.claude/hooks/` (lifecycle scripts) — SessionStart for health checks and context injection, PostToolUse for state capture; must be fast (<3s synchronous) or spawned as background processes

### Critical Pitfalls

1. **Abandoned/unmaintained MCPs** — Apply three gates before every install: last commit within 30 days, meaningful stars (>500 for general tools), active issue responses. Prefer vendor-official servers. Re-verify at 30-day intervals.

2. **Tool poisoning and rug pull attacks** — Tool descriptions are trusted input in Claude Code; malicious payloads hidden there execute without code-level detection. Run `mcp-scan` (Invariant Labs) after initial install and after every CC update. Only install source-available servers where you have read the code. Never use `enableAllProjectMcpServers: true`.

3. **Context window collapse from MCP accumulation** — Hard cap at 5-8 total MCPs. Each server adds token overhead; reported cases show 82% context consumed before first prompt with 10 uncapped servers. Prefer narrow servers (5-10 tools) over sprawling ones. Tool Search (active on Sonnet 4.6) reduces but does not eliminate this cost.

4. **Silent config corruption from CC auto-updates** — Documented incidents: update 2.1.45 wiped all `mcpServers` entries; update 2.1.69 broke all MCP tool calls. Mitigations: back up `~/.claude.json` before any update; set `autoUpdates: false` + `autoUpdatesProtectedForNative: false`; verify `claude mcp list` after every update.

5. **Global/project config namespace conflicts** — Identically named global and project MCPs silently shadow each other; multiple `mcpServers` keys in `~/.claude.json` silently override (Issue #4938). Use descriptive namespaced names (e.g., `context7-docs`, not `docs`). Verify single `mcpServers` key exists. Test from a blank project after setup.

---

## Implications for Roadmap

Based on combined research, the architecture and pitfalls research define a clear dependency order. Configuration infrastructure must precede tool installation. Security vetting must precede any third-party tool recommendation. Context budget must be a hard constraint from the start, not an afterthought.

### Phase 1: Configuration Foundation and Safety Infrastructure

**Rationale:** PATH configuration, backup strategy, and config file validation must exist before any MCP is installed. Config corruption (Pitfall 4) and namespace conflicts (Pitfall 5) are setup-time problems. If PATH is wrong, every stdio MCP will fail silently. If backup procedure isn't established, one CC auto-update can wipe everything.
**Delivers:** Verified PATH in `settings.json` env block; `~/.claude.json` backup script or procedure; `autoUpdates` configuration; single `mcpServers` key confirmed; `mcp-scan` installed and runnable; permissions.allow pattern established
**Addresses:** Architecture anti-patterns 1 and 3 (conflating config files, manual editing); PITFALLS Pitfall 4 (auto-update corruption) and Pitfall 5 (namespace conflicts)
**Avoids:** Silent MCP failures from PATH issues; config wipes with no recovery path

### Phase 2: Core Capability — P1 MCP Servers and WPCS Skill

**Rationale:** Once foundation is safe, install the five P1 tools. These have the strongest vetting scores, lowest security risk, and highest daily-use value. Context7 and GitHub MCP are the highest-ROI tools per research. Sequential Thinking and Playwright are lightweight (npx, no API keys). WPCS Skill costs zero tokens and has no dependencies.
**Delivers:** Context7 MCP (stdio, npx), GitHub MCP (HTTP, PAT token), Playwright MCP (stdio, npx), Sequential Thinking MCP (stdio, npx), WPCS Skill (~/.claude/skills/)
**Uses:** `claude mcp add --scope user` for all four MCPs; `--transport http` for GitHub, `--transport stdio` for the rest; PAT token scoped to repo read + issues
**Implements:** permissions.allow entries for all tools; `mcp-scan` run on all four after install; tool count verified <50 total
**Avoids:** Pitfall 3 (context bloat — all four are narrow-tool servers); Pitfall 2 (security — all four are official org-owned repos with source code reviewed); Pitfall 6 (self-management — all four support full CC-managed lifecycle)

### Phase 3: Validation and Anti-Feature Audit

**Rationale:** After P1 tools are live, validate that each tool works as expected before adding more. This phase exists because "MCP connected" does not mean "tools usable" (Pitfall checklist item 1). Also confirm that no anti-features have been installed — Filesystem MCP, Fetch MCP, Desktop Commander. Research found users frequently install these by mistake from ecosystem lists.
**Delivers:** Each P1 tool tested with real queries; tool output sizes verified within token limits; anti-feature audit confirms none present; Context7 coverage validated for PHP/WP libraries; GitHub PAT scope verified with actual PR operation; `mcp-scan` clean report documented
**Avoids:** "Looks Done But Isn't" failure modes from PITFALLS.md

### Phase 4: P2 Augmentation — Brave Search and Firecrawl (Conditional)

**Rationale:** These tools earn their spot only if P1 tools expose gaps. Brave Search MCP adds only if CC's built-in WebSearch proves insufficient for WP/PHP ecosystem research. Firecrawl adds only if full-page extraction is needed beyond what Playwright already covers. Research explicitly flags these as "add after validation" to avoid premature context budget consumption.
**Delivers:** Brave Search MCP (if WebSearch gap confirmed); Firecrawl MCP (if Playwright + Brave Search don't cover full-page extraction need); total MCP count remains at or below 7
**Uses:** API keys for both (free tiers available); env var injection via `claude mcp add --env`
**Avoids:** Pitfall 3 (context bloat — only add if the gap is real, not speculative)

### Phase 5: Operations Hardening and Maintenance Cadence

**Rationale:** Architecture research identifies ongoing maintenance as a first-class concern, not an afterthought. CC auto-updates are frequent and have caused silent config corruption multiple times. A 30-day maintenance cadence must be established as part of the setup, not bolted on later.
**Delivers:** Backup script for `~/.claude.json`; update testing procedure; 30-day maintenance checklist (re-verify commit dates, re-run `mcp-scan`, check `claude mcp list` count); `/mcp disable` pattern documented for infrequently-used tools; WordPress MCP Adapter evaluation scheduled for April 2026 (post WP 7.0)
**Addresses:** Pitfall 1 (maintenance drift), Pitfall 4 (auto-update corruption), Pitfall 6 (self-management long-term)

### Phase Ordering Rationale

- Foundation before tools: PATH and backup infrastructure must exist before any MCP is installed because failures at install time are harder to diagnose than failures at foundation time
- Security gate before any recommendation: Pitfall 2 (tool poisoning) applies at install time; `mcp-scan` must be established in Phase 1 so it can be run in Phase 2
- P1 before P2: Core tools first ensures context budget is monitored from the start; P2 tools only added if gaps are confirmed, not assumed
- Validation phase (Phase 3) before augmentation (Phase 4): Research explicitly distinguishes "connected" from "usable"; validation prevents compounding unverified tools on top of unverified tools
- Operations last but non-optional: Maintenance cadence is what separates a setup that stays working from one that silently degrades over months

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (P2 Augmentation):** Brave Search + Firecrawl interaction needs evaluation — do they overlap? Does Playwright's browser access already cover Firecrawl's use case? This requires hands-on testing, not pre-research.
- **Phase 5 (WordPress MCP Adapter):** Evaluation depends on WP 7.0 release (April 2026) — check official WordPress developer blog at release time; the architecture will have changed significantly from current per-site plugin model.

Phases with standard patterns (research-phase not needed):
- **Phase 1 (Foundation):** PATH config, backup scripting, and `mcp-scan` install are all well-documented standard patterns
- **Phase 2 (P1 MCP Install):** All five tools have official install docs; `claude mcp add` syntax is authoritative; no novel integrations
- **Phase 3 (Validation):** Verification steps are enumerated in PITFALLS.md checklist; no research needed

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Primary sources are official Claude Code docs (WebFetch verified), official MCP Registry, and official GitHub repos. All CLI commands and config file formats confirmed against live configuration on this machine. |
| Features | HIGH | GitHub API used to verify stars and commit dates for all candidate tools. Recommendation matrix based on hard data, not ecosystem lists. Anti-feature rationale sourced from CC's own built-in tool documentation. |
| Architecture | HIGH | Config file relationships and transport types sourced from official CC docs. Patterns confirmed against live `~/.claude.json` and `~/.claude/settings.json` on this machine. Hook execution flow sourced from official hooks documentation. |
| Pitfalls | HIGH | CVEs are public record (CVE-2025-59536, CVE-2026-21852). GitHub Issues are linked directly (issue numbers verified). Snyk ToxicSkills report is published research. Context window bloat figures cited from Medium articles with specific version numbers. |

**Overall confidence:** HIGH

### Gaps to Address

- **Context7 PHP/WP coverage depth:** Context7 has uneven library coverage. Coverage for PHP 8.x core and WordPress 6.x APIs should be verified hands-on in Phase 3 before relying on it for production WP sessions. Free tier (60 req/hour, 1,000/month) may require upgrade to $10/month paid tier for heavy documentation sessions.

- **GitHub PAT scope optimization:** Research recommends narrow-scoped PAT (repo read, issues read/write). The exact minimum scope set for GitHub MCP's full feature set needs verification at install time — GitHub's OAuth scope documentation should be consulted before creating the PAT.

- **WP 7.0 timeline:** WordPress MCP Adapter deferral assumes WP 7.0 ships in April 2026 as announced. If delayed, Phase 5 evaluation date shifts accordingly. Monitor `developer.wordpress.org/news/` for updates.

- **Firecrawl vs Playwright overlap:** Whether Playwright MCP already covers Firecrawl's use cases (full-page content extraction) cannot be determined pre-implementation. This is a hands-on evaluation that belongs in Phase 4.

---

## Sources

### Primary (HIGH confidence)
- `code.claude.com/docs/en/mcp` — CLI commands, transport types, scope names, config file locations (WebFetch verified)
- `code.claude.com/docs/en/settings` — config file locations, scope hierarchy, merge behavior (WebFetch verified)
- `code.claude.com/docs/en/hooks` — lifecycle events, hook types, input/output schema (WebFetch verified)
- `code.claude.com/docs/en/plugins-reference` — plugin structure, install scopes, CLI commands (WebFetch verified)
- Live `~/.claude.json` and `~/.claude/settings.json` — confirmed actual config patterns (read directly)
- GitHub API: stars + last commit for all evaluated repos (gh CLI, verified 2026-03-16)
- CVE-2025-59536, CVE-2026-21852 — Check Point Research (public CVE records)
- GitHub Issues #26437, #31864, #30989, #4938 — Claude Code repo (direct links, verified)

### Secondary (MEDIUM confidence)
- `registry.modelcontextprotocol.io` — Official MCP Registry (6,400+ servers, API v0.1 frozen Oct 2025)
- `github.com/modelcontextprotocol/servers` — Official reference server implementations (81K stars)
- `smithery.ai` — Discovery catalog (3,305+ servers); vetting still required for individual servers
- `github.com/punkpeye/awesome-mcp-servers` — Community curated list (83K stars, 2026-03-16)
- `github.com/hesreallyhim/awesome-claude-code` — CC-specific curated list (28K stars, 2026-03-16)
- Snyk ToxicSkills report — 13.4% of agent skills had critical security issues (published research)
- Invariant Labs mcp-scan — tool poisoning detection tooling (published research)

### Tertiary (LOW confidence — needs validation during implementation)
- Context7 free tier limits (60 req/hour, 1,000/month) — sourced from blog post; verify against current Upstash pricing page at install time
- WordPress MCP Adapter moving to WP 7.0 core (April 2026) — developer blog announcement; verify at release time
- Sequential Thinking 54% benchmark improvement — reported in ecosystem sources; benchmark methodology not reviewed

---

*Research completed: 2026-03-16*
*Ready for roadmap: yes*
