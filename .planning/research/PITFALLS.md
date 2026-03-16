# Pitfalls Research

**Domain:** Claude Code MCP/tool ecosystem — global setup for capability enhancement
**Researched:** 2026-03-16
**Confidence:** HIGH (multiple verified sources including official CC docs, CVE records, GitHub issue tracker, security research)

## Critical Pitfalls

### Pitfall 1: Installing MCPs Without Verifying Maintenance Activity

**What goes wrong:**
An MCP server is added to the global config. It works initially. Within weeks or months it silently breaks — either because the upstream tool it wraps changed its API, the npm package was abandoned, or the MCP spec evolved past the version the server targets. Claude Code shows the server as "connected" but tool calls fail or return garbage.

**Why it happens:**
The MCP ecosystem exploded rapidly in 2025. Hundreds of servers were created as demos, tutorials, or weekend projects. Many were never intended for long-term maintenance. GitHub repositories look active because they were recently starred or forked, not because the author is maintaining them. npm download counts include one-time installations from tutorials. There is no "MCP verified" badge or official registry with quality gates.

**How to avoid:**
Apply all three trust gates before recommending any MCP server:
1. **Commits gate:** Last commit must be within 30 days of research date (project requires commits within the past month as of March 2026). Check the GitHub commit history, not just the README last-updated timestamp.
2. **Stars gate:** Minimum meaningful community adoption — at least several hundred GitHub stars for general-purpose tools. Stars alone don't prove quality, but they prove the tool has been used by people other than the author.
3. **Issues gate:** Check the open issues list. A healthy project has issues being responded to and closed. A dead project has a graveyard of unanswered issues.

Prefer servers maintained by the vendor of the underlying service (e.g., official Anthropic-maintained servers, vendor-official integrations) over community forks.

**Warning signs:**
- Last commit more than 30 days ago
- Issues accumulating with no responses from maintainers
- README references an outdated MCP spec version (`2024-11-05` when current is `2025-03-26`)
- No changelog or version tags
- Server described as "a quick weekend project" or "proof of concept"
- The GitHub repo is a fork of another abandoned repo

**Phase to address:**
Candidate vetting phase — apply maintenance gates before any MCP server enters the recommendation shortlist.

---

### Pitfall 2: Tool Poisoning and Rug Pull Attacks from Untrusted MCP Servers

**What goes wrong:**
A third-party MCP server embeds adversarial instructions inside its tool descriptions (tool poisoning). Claude Code reads tool descriptions as natural language to understand capabilities — making them a trusted instruction channel. The model then executes hidden instructions (e.g., `cat ~/.ssh/id_rsa`, exfiltrate API keys to remote URL) while appearing to perform the legitimate task. In a rug pull variant, the tool registers with a clean description, gets approved, and the description is later silently amended to contain malicious payloads — the original approval provides no ongoing protection.

**Why it happens:**
Claude Code treats tool descriptions as trusted input by design. There is no standard mechanism for validating or signing tool descriptions. The one-time approval model means subsequent changes to a tool's description do not trigger re-approval. Anthropic explicitly states it does not audit any third-party MCP servers. As of February 2026, Snyk's ToxicSkills scan found 13.4% of agent skills (534 of 3,984) contained critical-level security issues, and 91% of malicious skills combined prompt injection with traditional malware.

**How to avoid:**
- Only install MCPs from sources where you can read and understand the source code before installing.
- Prefer servers where the source code is available on GitHub and auditable.
- Run `mcp-scan` (by Invariant Labs) against installed MCP servers before use. It hashes tool descriptions on first scan and alerts if they change — catching rug pull attacks.
- Never install MCPs from registry listings (ClawHub, skills.sh) without source code review. These are the supply chain attack vectors.
- For global scope tools being installed across all projects: if you cannot read and understand the server's source code, do not install it.
- Avoid MCP servers that fetch arbitrary external content (web scrapers, RSS readers, email readers) — these are the highest-risk vector for prompt injection via data sources.

**Warning signs:**
- MCP server distributed only as a binary with no source code
- Tool descriptions that are unusually long or contain `<IMPORTANT>`, `<SYSTEM>`, or similar LLM-targeting syntax
- Server requires permissions far beyond its stated purpose (a docs reader requesting filesystem write access)
- npm package name closely resembles a well-known service but from a different publisher (typosquatting)
- `mcp-scan` reports description hash changes between runs

**Phase to address:**
Security vetting phase — must precede any recommendation of third-party MCPs.

---

### Pitfall 3: Context Window Collapse from Too Many MCPs

**What goes wrong:**
Each MCP server exposes tools with names, descriptions, and full JSON schemas. Before Claude Code 2.1.7 (which introduced lazy Tool Search loading), all of these were loaded into the context window at session start. With 10 servers and ~20 tools each, one reported case consumed 164,000 tokens — 82% of the context window — before a single character was typed. Even with lazy loading, having too many servers still degrades performance: session startup blocks until all MCP servers complete their handshake (3-10+ seconds per server), shutdown is sequential and slow, and the mental overhead of too many available tools can cause the model to select suboptimal tools.

**Why it happens:**
Every MCP looks useful in isolation. The cumulative cost only becomes visible after several are installed. The Claude Code UI does not surface a "tools are consuming X% of your context window" warning. Users install progressively and never experience a clear threshold-crossing event — performance degrades gradually.

**How to avoid:**
- Hard cap at 5-8 total MCPs globally (this project's constraint is correct and well-motivated).
- For each candidate: calculate approximate tool count and schema complexity. A server exposing 78 tools (like GitLab) costs vastly more than one exposing 5.
- Prefer narrow, focused servers over sprawling all-in-one servers.
- Use `/mcp disable <server>` for servers only needed occasionally — Claude Code supports per-session disabling without config changes.
- Run `claude mcp list` to audit what's actually configured and count total tools across all servers.

**Warning signs:**
- Session startup takes more than 5-10 seconds
- Claude frequently hits context limits mid-conversation
- Model produces worse results despite same prompts (context dilution)
- `claude mcp list` shows more servers than you remember configuring
- Total tool count across servers exceeds 50

**Phase to address:**
Candidate selection phase — total tool count across all recommended MCPs must be a selection criterion, not an afterthought.

---

### Pitfall 4: Silent Configuration Corruption from CC Auto-Updates

**What goes wrong:**
Claude Code auto-updates silently break MCP configurations. Documented incidents include: update 2.1.45 wiped all `mcpServers` entries from `~/.claude.json` without warning or backup; update to v1.1.3189 introduced a new extension-based management system that conflicted with legacy `mcpServers` config, causing all tools to show as enabled but be non-functional; update 2.1.69 introduced a `defer_loading` + `cache_control` conflict that made every single prompt return a 400 error until the user discovered the `ENABLE_TOOL_SEARCH=false` workaround. In all cases, there was no error message, no UI indication, and no automatic recovery.

**Why it happens:**
Claude Code is rapidly iterating (multiple releases per week as of March 2026). Configuration format migrations are sometimes implemented without backward compatibility or user-visible migration paths. The `~/.claude.json` file is both a configuration store and a session state file — updates that touch the state layer can collide with the config layer.

**How to avoid:**
- Before recommending any MCP setup, document exactly which config file stores MCP server definitions and what format they use. These details change across versions.
- For the setup being built: document the current authoritative config approach (`claude mcp add` writes to `~/.claude.json`; project MCPs go in `.mcp.json` at project root).
- Set `autoUpdates: false` or `autoUpdatesProtectedForNative: false` in `~/.claude.json` to control update timing. Test updates in a non-critical window. Note: `autoUpdates: false` alone is insufficient — `autoUpdatesProtectedForNative` must also be addressed.
- Keep a backup of `~/.claude.json` before any update: `cp ~/.claude.json ~/.claude.json.bak`.

**Warning signs:**
- MCP servers show as connected but tools are unavailable after a CC update
- `claude mcp list` returns empty or different results than before an update
- Session startup behavior changes (different timing, new prompts, missing servers)
- `numStartups` resets to 1 in `~/.claude.json` (indicates config wipe)
- Any CC update release notes mentioning "MCP configuration", "extension system", or "tool loading"

**Phase to address:**
Maintenance/operations guidance — the final recommendation report should include post-install verification steps and update risk warnings.

---

### Pitfall 5: Global Config Conflicts with Per-Project .mcp.json Files

**What goes wrong:**
A server defined globally in `~/.claude.json` has the same name as a server defined in a project's `.mcp.json`. Claude Code merges configurations rather than erroring, with project scope taking precedence over user scope. This means global tools can be silently shadowed by project-level definitions without any warning. Worse, a documented bug (Issue #4938) shows that multiple `mcpServers` sections in `.claude.json` silently override each other — only the last section takes effect — with no error, warning, or log entry.

**Why it happens:**
The three-scope system (local, project, user) is intentionally hierarchical, but the silent-override behavior in edge cases is a bug, not a feature. Developers building the global setup don't necessarily know what `.mcp.json` files exist in project repositories they'll later clone.

**How to avoid:**
- Use highly specific, namespaced names for global MCPs (e.g., `context7-docs`, `graphiti-memory`) rather than generic names (e.g., `docs`, `memory`) that are likely to collide with project-level definitions.
- Verify `~/.claude.json` has exactly one `mcpServers` section. The presence of multiple sections is a silent failure mode.
- After initial setup, verify in a test project: run `claude mcp list` and confirm all expected global servers appear.
- Document the scope hierarchy clearly in any setup guide: local `.claude/settings.local.json` > project `.mcp.json` > user `~/.claude.json`.

**Warning signs:**
- A server that works in one project context doesn't appear or behaves differently in another
- `~/.claude.json` contains multiple top-level `mcpServers` keys (grep for it)
- Project repositories in your workflow already have `.mcp.json` files checked in
- Server behavior changes when moving between project directories

**Phase to address:**
Candidate configuration phase — naming conventions and scope management must be established before writing any config.

---

### Pitfall 6: MCPs That Cannot Be Self-Managed by Claude Code

**What goes wrong:**
An MCP server is recommended but its full lifecycle (install, configure, update, troubleshoot) cannot be performed by Claude Code without user touching config files. Common failure modes:
- Server requires manual OAuth flow or browser-based authentication that CC cannot initiate
- Server requires environment variables or credentials that must be manually injected (cannot be set by CC in `~/.claude.json`)
- Server uses a transport type (SSE) that was deprecated from the MCP spec and removed in Claude Code versions above 2.0.9
- Server configuration changed formats across versions, breaking CC's ability to use `claude mcp add` to manage it
- Server requires a runtime (Python, Go binary) that CC cannot install or verify on its own without user sudo access

**Why it happens:**
"Self-manageable by Claude Code" is not a documented capability tier in the MCP ecosystem. Servers are documented for initial setup only. Update paths, troubleshooting flows, and credential rotation procedures are rarely documented. Many servers that work fine for initial install require manual intervention the first time credentials expire.

**How to avoid:**
For each candidate MCP, explicitly verify self-management capability across the full lifecycle:
1. **Install:** Can CC execute `claude mcp add` or equivalent without user touching any file?
2. **Configure:** Can CC write all required config, including API keys, via config commands without manual file editing?
3. **Update:** Can CC update the server package (`npm update -g` or equivalent) and verify the update worked?
4. **Troubleshoot:** If the server fails, can CC run `claude mcp list`, check server status, and diagnose from log output without user opening files?

Prefer HTTP transport MCPs over stdio MCPs for self-management — HTTP transports use URLs and don't require local process management.

Prefer MCPs from services that provide token-based auth (API key in env var) over OAuth flows. OAuth requires browser interaction that breaks self-management.

**Warning signs:**
- Server documentation says "run the browser-based OAuth flow first" before any other step
- Server requires editing a JSON file by hand as step 1 in the setup docs
- Server uses SSE transport (deprecated, removed in CC 2.0.9+)
- Server runtime is a compiled binary with no package manager update path
- Auth tokens for the server expire on short intervals (hours) and require manual renewal

**Phase to address:**
Candidate vetting phase — self-management capability must be verified as a hard requirement, not assumed.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Install a "catch-all" MCP that exposes 50+ tools | One install covers many use cases | 82% context window consumed before first prompt; model tool-selection degrades | Never — prefer focused narrow servers |
| Use `npx` transport without pinning package version | Always runs latest, no update needed | Breaking changes silently change behavior; security patches to MCP spec may not land | Never for global scope — always pin version |
| Configure MCP via direct `~/.claude.json` edits instead of `claude mcp add` | Full control, faster | Manual edits broken by auto-updates; format changes not handled; multiple `mcpServers` keys silently override | Never — use `claude mcp add` exclusively |
| Trust a high-star GitHub repo without reading source | Saves time, community validation signals quality | Stars don't reflect security; tool poisoning payload hidden in description, not code | Never for globally installed MCPs |
| Install an MCP at project scope for testing, forget to remove | Quick experiment | Accumulates silently; project `.mcp.json` files shadow global config unexpectedly | Only if tracked and cleaned up same session |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OAuth-based services (Atlassian, GitHub, Slack) | Install MCP expecting it to just work | Verify auth mechanism first — short-lived OAuth tokens require browser renewal CC cannot perform |
| npm-distributed MCPs | Install via `npx` without pinning | Pin to a specific version: `npx @scope/server@1.2.3` — unpinned `npx` runs latest on every session start |
| HTTP remote MCPs | Trust the URL without verifying TLS and auth | Verify HTTPS only, require API key auth, never configure plain HTTP remote MCPs |
| Context7 (library docs lookup) | Register globally and forget to verify docs coverage | Test against your primary language/framework before recommending — Context7 has uneven coverage by library |
| Any MCP serving as a proxy to external content | Use for general web fetching | External content is the #1 vector for prompt injection — only allow MCPs that fetch content from domains you control or explicitly trust |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Accumulating MCPs without removing unused ones | Startup takes 10+ seconds; context fills faster; model tool selection degrades | Hard cap of 5-8 MCPs; quarterly audit; remove before adding | 4+ MCP servers for macOS users; 8+ globally |
| MCP servers with high tool counts (50+) | 164k tokens consumed before first message; API errors for context length | Filter candidates by tool count; GitLab alone costs 58k tokens | Single server with 50+ tools |
| Running MCPs on every session that are only needed weekly | Cumulative startup overhead; context waste every session | Use `/mcp disable <server>` for infrequent tools; enable only for relevant sessions | Any MCP used < 3 times/week |
| MCP producing large tool outputs (logs, file trees, raw HTML) | Token limit warnings; truncated results; context collapse | Set `MAX_MCP_OUTPUT_TOKENS` appropriately; prefer MCPs that return structured summaries | Any tool output > 10,000 tokens |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Installing MCP from npm without reading source | Supply chain attack — malicious package exfiltrates API keys, env vars, SSH keys | Read source before installing; prefer source-available packages; verify publisher identity matches expected maintainer |
| Using `enableAllProjectMcpServers: true` in settings | Any cloned repository's `.mcp.json` auto-approved — untrusted repo code executes as MCP | Never use `enableAllProjectMcpServers`; review each project MCP manually |
| Never running `mcp-scan` on installed MCPs | Rug pull attacks go undetected; tool descriptions silently amended | Run `mcp-scan` after initial install and after any CC update; tool description hash changes = immediate red flag |
| Configuring MCPs that access `~/.ssh`, `~/.aws`, `~/.env` files | Single prompt injection can exfiltrate credentials across all projects | Prefer MCPs with explicit, narrow scope; avoid filesystem MCPs with home directory access for global install |
| Cloning unknown repositories without checking for `.claude/` or `.mcp.json` | Malicious `.claude/settings.json` with hooks executes before trust dialog renders (CVE-2026-21852) | Scan cloned repos before opening in CC: `ls .claude/ .mcp.json 2>/dev/null` |
| Treating MCP tool approval as permanent security clearance | Rug pull attacks exploit one-time approval — tool behavior changes post-approval | Re-run `mcp-scan` periodically; treat any behavioral change in a known MCP as a security event |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **MCP server connected:** "Connected" status in `claude mcp list` does not mean tools are usable — verify by actually invoking a tool and confirming non-error output.
- [ ] **API key configured:** API key present in config does not mean it has the required scopes — test the specific operations the MCP will perform.
- [ ] **Self-management verified:** Initial install working does not mean CC can update, troubleshoot, or reconfigure — test a simulated update and failure scenario.
- [ ] **Security scanned:** MCP appearing in a "best MCPs" list does not mean it's been audited — run `mcp-scan` before finalizing any recommendation.
- [ ] **Maintenance confirmed:** Recent commits in README history or release page does not confirm active maintenance — check the commit graph on GitHub directly.
- [ ] **Context cost measured:** MCP server registered does not mean its context footprint is acceptable — count the tools it exposes and estimate token cost before including in recommendation.
- [ ] **Global scope tested:** MCP working in one project does not guarantee it works from all project directories — test from a fresh project without a `.mcp.json` file.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Config wiped by CC auto-update | LOW if backup exists, HIGH if not | Restore from `~/.claude.json.bak`; re-run `claude mcp add` for each server; verify with `claude mcp list` |
| Tool poisoning discovered (mcp-scan alert) | MEDIUM | Immediately remove server: `claude mcp remove <name>`; rotate any API keys CC had access to during the affected period; review recent session history for exfiltration indicators |
| Context window collapse from too many MCPs | LOW | Run `/mcp disable` for lowest-priority servers; use `claude mcp remove` for permanently unused servers; restart session |
| Silent config conflict (multiple mcpServers sections) | LOW | Edit `~/.claude.json` manually to merge into single `mcpServers` key; verify with `claude mcp list`; back up before editing |
| Abandoned MCP breaking tool calls | LOW | `claude mcp remove <name>`; find active alternative; update recommendation report |
| OAuth auth failure breaking MCP (short-lived token) | MEDIUM if CC can't renew | Document as self-management failure; remove from recommendations; replace with API-key-based alternative |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Abandoned/unmaintained MCPs | Candidate vetting (maintenance gates) | Confirm last commit date at time of vetting; flag for re-check at 30-day cadence |
| Tool poisoning / rug pull | Security vetting (source code review + mcp-scan) | `mcp-scan` output clean; no hidden instructions in tool descriptions |
| Context window collapse | Candidate selection (tool count as selection criterion) | Total tools across all recommended MCPs counted; estimated token cost documented |
| Auto-update config corruption | Post-recommendation operations guidance | Backup procedure documented; update testing procedure included in setup guide |
| Global/project config conflicts | Configuration design (naming conventions) | Unique namespaced names; single `mcpServers` key verified; tested in blank project |
| Cannot self-manage lifecycle | Candidate vetting (lifecycle verification) | Install, configure, update, troubleshoot all tested without manual file editing |
| Large tool output truncation | Per-MCP integration testing | Each recommended MCP tested with realistic queries; output size confirmed within limits |
| Supply chain via npm | Candidate vetting (source code review) | Source code read; publisher identity verified; `mcp-scan` passed |

---

## Sources

- [Check Point Research: CVE-2025-59536 / CVE-2026-21852 — RCE and API Token Exfiltration via Claude Code Project Files](https://research.checkpoint.com/2026/rce-and-api-token-exfiltration-through-claude-code-project-files-cve-2025-59536/)
- [The Hacker News: Claude Code Flaws Allow Remote Code Execution and API Key Exfiltration](https://thehackernews.com/2026/02/claude-code-flaws-allow-remote-code.html)
- [Claude Code Official Security Documentation](https://code.claude.com/docs/en/security)
- [Claude Code Official MCP Documentation](https://code.claude.com/docs/en/mcp)
- [Claude Code Official Troubleshooting Documentation](https://code.claude.com/docs/en/troubleshooting)
- [MCP Security 2026: 30 CVEs in 60 Days — What Went Wrong](https://www.heyuan110.com/posts/ai/2026-03-10-mcp-security-2026/)
- [Snyk ToxicSkills: Malicious AI Agent Skills Supply Chain Compromise](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/)
- [MCP Tool Poisoning and Rug Pulls — FlowHunt](https://www.flowhunt.io/blog/mcp-tool-poisoning-rug-pulls-safe-tool-design/)
- [Invariant Labs: MCP Security Notification — Tool Poisoning Attacks](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks)
- [Elastic Security Labs: MCP Tools Attack Vectors and Defense Recommendations](https://www.elastic.co/security-labs/mcp-tools-attack-defense-recommendations)
- [SlowMist MCP Security Checklist (GitHub)](https://github.com/slowmist/MCP-Security-Checklist)
- [MCP Server Security Standard — MSSS (GitHub)](https://github.com/mcp-security-standard/mcp-server-security-standard)
- [Claude Code Lazy Loading for MCP Tools — Medium (JP Caparas)](https://jpcaparas.medium.com/claude-code-finally-gets-lazy-loading-for-mcp-tools-explained-39b613d1d5cc)
- [MCP Tools Eating 82% of Context Window — AI Advances](https://ai.gopubby.com/mcp-tools-are-eating-82-of-your-context-window-the-10-minute-fix-for-claude-code-1619733d00db)
- [Claude Code Cut MCP Context Bloat by 46.9% — Medium (Joe Njenga)](https://medium.com/@joe.njenga/claude-code-just-cut-mcp-context-bloat-by-46-9-51k-tokens-down-to-8-5k-with-new-tool-search-ddf9e905f734)
- [Optimising MCP Server Context Usage in Claude Code — Scott Spence](https://scottspence.com/posts/optimising-mcp-server-context-usage-in-claude-code)
- [Why Claude Code with MCP Tools Requires Higher Effort Levels — BSWEN](https://docs.bswen.com/blog/2026-03-13-mcp-tools-effort/)
- [GitHub Issue #26437: Update 2.1.45 silently resets MCP configs](https://github.com/anthropics/claude-code/issues/26437)
- [GitHub Issue #31864: Auto-update creates silent MCP extension conflict](https://github.com/anthropics/claude-code/issues/31864)
- [GitHub Issue #30989: Claude Code 2.1.69 breaks all MCP tool calls](https://github.com/anthropics/claude-code/issues/30989)
- [GitHub Issue #4938: Multiple mcpServers sections silently override each other](https://github.com/anthropics/claude-code/issues/4938)
- [GitHub Issue #7174: Claude Code CLI MCP reload broken for 6+ months](https://github.com/anthropics/claude-code/issues/7174)
- [Claude Code Settings Reference — claudefa.st](https://claudefa.st/blog/guide/settings-reference)
- [Global vs Project Settings Best Practices — shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice/blob/main/reports/claude-global-vs-project-settings.md)
- [MCP vs Agent Skills in the Era of Claude Code — atal upadhyay](https://atalupadhyay.wordpress.com/2026/03/15/mcp-vs-agent-skills-in-the-era-of-claude-code/)
- [Malicious MCP Servers Used in Supply Chain Attacks — Securelist](https://securelist.com/model-context-protocol-for-ai-integration-abused-in-supply-chain-attacks/117473/)

---
*Pitfalls research for: Claude Code MCP/tool ecosystem — global capability enhancement setup*
*Researched: 2026-03-16*
