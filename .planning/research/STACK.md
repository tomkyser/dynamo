# Stack Research

**Domain:** MCP/Tool ecosystem discovery, evaluation, and management for Claude Code (global scope)
**Researched:** 2026-03-16
**Confidence:** HIGH — primary sources are official Anthropic docs (verified via WebFetch), official MCP registry announcements, and cross-confirmed across multiple sources

---

## The Three-Layer Customization Stack

Before listing technologies, understand the taxonomy. Claude Code has three distinct extension mechanisms added in rapid succession:

| Layer | What It Is | Config File | Added |
|-------|-----------|-------------|-------|
| **MCP Servers** | External tool/API connectivity (vendor-neutral plumbing) | `.mcp.json` or `~/.claude.json` | Nov 2024 |
| **Skills** | Procedural knowledge / slash commands (~30-50 tokens each) | `SKILL.md` files | Oct 2025 |
| **Plugins** | Bundles of skills + MCP + slash commands + hooks, distributable | `plugin.json` | Jan 30, 2026 |

For this project, the primary target is **MCP servers** (capability expansion) and **Skills** (reusable prompts). Plugins are the distribution format — relevant only if bundling multiple things for redistribution.

---

## Discovery Sources

### Primary: Official MCP Registry

| Source | URL | Trust | Notes |
|--------|-----|-------|-------|
| Official MCP Registry | `registry.modelcontextprotocol.io` | HIGH | Launched Sept 2025, API-frozen v0.1 as of Oct 2025. 6,400+ servers as of Feb 2026. Community-owned under Linux Foundation (Anthropic + OpenAI + Block + Google + Microsoft). Intentionally minimal — metadata only, no browsing UI. |
| Anthropic's Claude Code MCP page | `code.claude.com/docs/en/mcp` | HIGH | Official "Popular MCP servers" list pulls live from `api.anthropic.com/mcp-registry/v0/servers`. The authoritative curated subset. Use this as starting point for any server evaluation. |
| Official reference implementations | `github.com/modelcontextprotocol/servers` | HIGH | Maintained by MCP project. Reference servers for filesystem, fetch, git, memory, etc. When an official server exists, use it over community forks. |

### Secondary: Community Discovery

| Source | URL | Trust | Use Case |
|--------|-----|-------|----------|
| Smithery.ai | `smithery.ai` | MEDIUM-HIGH | 3,305+ servers. Largest catalog with CLI tooling. Best for searching what exists. Not all servers are vetted — apply vetting criteria. |
| mcp.so | `mcp.so` | MEDIUM | Community resource hub. Curated guides, tutorials, server lists. Good for learning what the ecosystem uses. No CLI tools. |
| punkpeye/awesome-mcp-servers | `github.com/punkpeye/awesome-mcp-servers` | MEDIUM | 83K+ GitHub stars. Curated list maintained by community. Cross-reference for well-known servers. |
| wong2/awesome-mcp-servers + mcpservers.org | `github.com/wong2/awesome-mcp-servers` | MEDIUM | Another popular curated list. Includes official reference servers. Submissions via website. |
| MCP Market | `mcpmarket.com` | LOW (for personal use) | Enterprise-focused, premium/paid. Not relevant for a solo developer's global setup. |

**Why not MCP Market for personal use:** Premium pricing model designed for enterprise SLAs. Free sources (Smithery, official registry, awesome lists) are appropriate for individual developer workflows.

---

## Installation Methods

### The Two Canonical Install Paths

**Path 1: HTTP transport (remote servers) — preferred for cloud services**
```bash
# User/global scope — available across all projects
claude mcp add --transport http <name> <url> --scope user

# With auth header
claude mcp add --transport http <name> <url> --scope user --header "Authorization: Bearer <token>"

# With OAuth (interactive in Claude Code)
claude mcp add --transport http <name> <url> --scope user
# then run /mcp inside Claude Code to authenticate
```

**Path 2: stdio transport (local processes) — for tools needing system access**
```bash
# User/global scope via npm package
claude mcp add --transport stdio <name> --scope user -- npx -y <package-name>

# With env vars
claude mcp add --transport stdio <name> --scope user --env KEY=value -- npx -y <package-name>
```

**What NOT to use — SSE transport:** Officially deprecated as of 2025 MCP spec. If a server only offers SSE, check if an HTTP endpoint exists. Do not add new SSE-based servers.

### Smithery CLI (secondary install path)
```bash
# Install a server via Smithery's managed CLI
npx @smithery/cli@latest install <package-name> --client claude
```

Smithery CLI wraps the underlying `claude mcp add` call and handles config prompting. Useful for servers that have complex configuration. Requires a Smithery key (free, from smithery.ai). **Caveat:** Smithery is an intermediary — prefer native `claude mcp add` when the install command is simple. Use Smithery CLI when a server has interactive setup/config prompts that Smithery manages.

---

## Configuration System (Authoritative)

### Files and Their Roles

| File | Location | Scope | What It Controls |
|------|----------|-------|-----------------|
| `~/.claude.json` | User home | User + Local MCP | Global Claude settings, OAuth sessions, user-scoped MCP servers, per-project local-scoped MCPs |
| `.mcp.json` | Project root | Project | Team-shared MCPs, checked into version control |
| `~/.claude/settings.json` | User home | User global settings | Claude behavior settings, tool permissions, env vars |
| `.claude/settings.json` | Project dir | Project settings | Project-specific settings |
| `.claude/settings.local.json` | Project dir | Local (private) | Personal overrides not committed to git |

**For global setup (this project's goal): `~/.claude.json` is the target file. Use `--scope user` flag.**

### Scope Hierarchy (highest to lowest precedence)

```
local  (project-specific, private)
  ↓
project  (.mcp.json in repo, team-shared)
  ↓
user  (~/.claude.json globally, ← THIS IS THE TARGET SCOPE)
```

**Critical naming gotcha:** Scope names were renamed in recent versions.
- Old: `project` → New: `local` (same-project, private)
- Old: `global` → New: `user` (cross-project)

Always use `--scope user` for global setup. Never use `--scope global` (old name, may break).

### CLI Management Commands
```bash
claude mcp list                          # List all configured servers
claude mcp get <name>                    # Get details for a specific server
claude mcp remove <name>                 # Remove a server
claude mcp add-from-claude-desktop       # Import from Claude Desktop config
claude mcp add-json <name> '<json>'      # Add from raw JSON config
/mcp                                     # Inside Claude Code: check status, authenticate OAuth
```

---

## Vetting Protocol (Programmatic via gh CLI)

The `gh` CLI is the standard tool for programmatically evaluating MCP server trustworthiness. Claude Code knows how to use it natively.

### Vetting Commands
```bash
# Stars (proxy for community trust)
gh repo view <owner/repo> --json stargazerCount

# Recency (this project requires commits within past month)
gh repo view <owner/repo> --json updatedAt,pushedAt

# Activity signals
gh api repos/<owner/repo>/commits --jq '.[0].commit.committer.date'

# Open issue health
gh issue list -R <owner/repo> --state open --limit 5

# License
gh repo view <owner/repo> --json licenseInfo

# Full summary
gh repo view <owner/repo> --json stargazerCount,updatedAt,pushedAt,licenseInfo,description,forkCount
```

### Vetting Criteria (from PROJECT.md)
- **Must have:** Commits within the past month (March 2026 = commits since Feb 2026)
- **Must have:** Meaningful GitHub stars (>500 as rough floor; official servers exempt)
- **Preferred:** Active issue/PR discussion (not just commits)
- **Preferred:** Official server from the service provider (GitHub's own MCP > random GitHub MCP)
- **Disqualify:** No README, no license, or last commit > 1 month ago

---

## Transport Selection Guide

| Condition | Use | Why |
|-----------|-----|-----|
| Server runs on remote cloud infrastructure | HTTP | Recommended 2026 standard, supports OAuth |
| Server needs direct filesystem/process access | stdio | Only option for local system tools |
| Server only offers SSE | Migrate or skip | SSE is deprecated |
| Server is from official provider (Sentry, GitHub, Notion, etc.) | HTTP | These providers expose HTTP endpoints |
| Server is a local utility (e.g., filesystem ops, local DB) | stdio via npx | Process isolation, no network exposure |

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `claude mcp add --scope user` | Manually editing `~/.claude.json` | Self-management requirement: CC must be able to manage tool lifecycle without user touching config files. CLI is the managed path. |
| Official MCP Registry + Smithery for discovery | MCP Market | MCP Market is enterprise/premium. Free sources cover the same ground. |
| HTTP transport for remote servers | SSE transport | SSE is officially deprecated as of 2025 MCP spec. |
| Official service-provider MCPs | Community forks | Security: official servers are maintained by the service provider, undergo security review, and are vetted by Anthropic's registry. Community forks lack accountability. |
| `npx -y <package>` for stdio servers | Installing globally with `npm install -g` | npx always fetches latest published version. Global npm install requires manual updates. CC cannot self-update a globally-installed package. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| SSE transport (`--transport sse`) | Officially deprecated in MCP 2025 spec; will be removed in future releases | `--transport http` for remote servers |
| Manually editing `~/.claude.json` | Fragile (config gets regenerated/reformatted), breaks self-management constraint | `claude mcp add` CLI commands |
| `--scope global` flag | Old scope name — renamed to `user`. May cause confusion or break in future versions | `--scope user` |
| Community MCP forks when official server exists | Supply chain risk; less maintained; lacks security review | Official service-provider servers (GitHub's own, Sentry's own, etc.) |
| `--dangerously-skip-permissions` | Removes human checkpoint; prompt injection has no guardrail | Default permission flow |
| Adding many MCPs indiscriminately | Context window cost: 5 typical servers = ~55,000 tokens before any conversation. Tool Search (Sonnet 4+) mitigates but doesn't eliminate this | Keep list lean (PROJECT.md target: 5-8 total); prefer Tool Search-compatible servers |
| MCPs from unknown authors with <100 stars | No community validation, potential malicious code execution on your system | Filter via vetting protocol above |

---

## Context Window Impact (Critical Constraint)

Each MCP server contributes tool definitions to the context window upfront. This is a hard cost.

| Server count | Approx token cost | Notes |
|-------------|------------------|-------|
| 1-2 servers | ~5,000-20,000 tokens | Manageable |
| 5 servers | ~55,000 tokens | Significant — nearly fills smaller models |
| 10+ servers | Context degradation | Avoid without Tool Search |

**Mitigation:** Claude Code's MCP Tool Search (requires Sonnet 4 or later, which is the current default) lazy-loads tools on-demand, reducing cost by ~85-95%. Enabled by default for first-party API access. This user already runs Sonnet 4.6 — Tool Search is active.

**Implication for recommendations:** Prefer servers with fewer, more targeted tools over servers that dump 50+ tools into context.

---

## Security Model Summary

MCP servers run with your shell user's permissions. This is the primary threat surface.

| Risk | Mitigation |
|------|-----------|
| Prompt injection via MCP responses | Only install servers from trusted sources; official/service-provider servers preferred |
| Credential exfiltration | Credentials in env vars (never in config files); prefer OAuth over API key where available |
| Supply chain attack via project `.mcp.json` | User scope MCPs bypass this entirely; project-scoped MCPs require trust confirmation |
| Arbitrary code execution | MCP servers can execute commands with your permissions — treat as equivalent trust to npm packages |

**CVE note:** CVE-2025-59536 and CVE-2026-21852 (patched) showed that malicious `.mcp.json` in a cloned repo could execute before trust prompts. Global/user scope MCPs in `~/.claude.json` are not affected by this vector — they are user-controlled only.

---

## Stack Patterns for This Project

**For general-purpose global Claude Code enhancers (this project's goal):**
- Target scope: `--scope user` (stored in `~/.claude.json`)
- Transport preference: HTTP for remote cloud services, stdio via npx for local tools
- Install method: `claude mcp add --scope user` (primary) or `npx @smithery/cli@latest install --client claude` (when server has complex config)
- Vetting gate: `gh repo view` for stars + recency before adding
- Context budget: Aim for total tool count across all servers < 100 tools to stay safe without Tool Search

**If a tool is a Skill (not an MCP):**
- Install to `~/.claude/skills/`
- CC can write/modify skill files directly — fully self-manageable
- Skills cost ~30-50 tokens each (trivial cost vs MCP overhead)

---

## Sources

- `code.claude.com/docs/en/mcp` (WebFetch, verified) — Authoritative CLI commands, scope names, transport types, config file locations
- `registry.modelcontextprotocol.io` — Official MCP Registry (launched Sept 2025, API v0.1 frozen Oct 2025)
- `github.com/modelcontextprotocol/servers` — Official reference server implementations
- `github.com/smithery-ai/cli` — Smithery CLI install methodology
- WebSearch: Smithery.ai directory, mcp.so, awesome-mcp-servers, MCP security CVEs — MEDIUM confidence (cross-confirmed with official docs)
- Check Point Research: CVE-2025-59536, CVE-2026-21852 security analysis — HIGH confidence (CVEs are public record)
- MCP Registry launch announcement: `blog.modelcontextprotocol.io/posts/2025-09-08-mcp-registry-preview/` — HIGH confidence

---

*Stack research for: Claude Code MCP/tool ecosystem discovery, evaluation, and management*
*Researched: 2026-03-16*
