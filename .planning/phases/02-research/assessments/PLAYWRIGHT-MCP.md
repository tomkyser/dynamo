## Tool Assessment: Playwright MCP

**Assessment Date:** 2026-03-16
**Assessor:** Claude Code
**Source Repo:** https://github.com/microsoft/playwright-mcp

---

### Identity

| Field | Value |
|-------|-------|
| Name | Playwright MCP |
| Repo URL | https://github.com/microsoft/playwright-mcp |
| Stars | 29,037 (as of 2026-03-16, verified via `gh api repos/microsoft/playwright-mcp --jq '.stargazers_count'`) |
| Last Commit | 2026-03-16 (pushed_at: 2026-03-16T16:40:52Z) |
| Transport Type | stdio (npx) |
| Publisher | vendor-official (Microsoft) |

---

### Pre-filter Check

Checked against ANTI-FEATURES.md Named Exclusion List — Playwright MCP is NOT listed. No category rules apply. Proceeding to gate evaluation.

---

### Hard Gate Results

| Gate | Threshold | Actual | Result |
|------|-----------|--------|--------|
| Stars | vendor-official threshold: 100 | 29,037 | PASS |
| Commit Recency | ≤30 days preferred, ≤90 hard limit | 0 days ago (2026-03-16) | PASS — PREFERRED |
| Self-Management: Install | Must have documented command | `claude mcp add playwright npx @playwright/mcp@latest` | PASS |
| Self-Management: Configure | Must have documented command | `npx @playwright/mcp@latest --headless --browser chromium` (env vars: `PLAYWRIGHT_MCP_BROWSER`, `PLAYWRIGHT_MCP_HEADLESS`, etc.) | PASS |
| Self-Management: Update | Must have documented command | `npm view @playwright/mcp version` (current: 0.0.68); run install command again with `@latest` tag | PASS |
| Self-Management: Troubleshoot | Must have documented command | `claude mcp list` to verify registration; `npx @playwright/mcp@latest --help` to test binary | PASS |
| CC Duplication | Must not duplicate CC built-in | No duplication — see Gate 4 analysis below | PASS |

**Gate Summary:** ALL PASS — continue to scorecard.

#### Gate 4 Analysis: CC Duplication

CC provides two web-access tools natively:
- **WebFetch** — fetches a URL and returns raw page content (stateless HTTP GET; no JavaScript execution; no interaction)
- **WebSearch** — returns search result snippets from a search engine

Playwright MCP provides:
- Stateful browser sessions that persist across multiple tool calls (logged-in state survives between actions)
- Accessibility tree snapshots (structured page representation, not raw HTML)
- Form filling, clicking, keyboard input — interactive automation WebFetch cannot perform
- Screenshots and PDF generation
- Console message capture, network request logging
- Cookie and storage state management
- Browser-level JavaScript evaluation

**Verdict:** NOT a duplicate. WebFetch is a stateless HTTP fetch; it cannot: maintain login sessions, click buttons, fill forms, execute JavaScript, capture dynamic content rendered after page load, or navigate multi-step flows. Playwright MCP fills the interactive browser automation gap that CC's built-in tools cannot address.

---

### Context Cost Estimate

| Field | Value |
|-------|-------|
| Tool count exposed | 59 browser_* tools (counted from official README tool list, verified 2026-03-16) |
| Estimated token overhead | ~8,850 tokens (59 tools × ~150 tokens/tool definition) |
| Source | README tool listing at https://github.com/microsoft/playwright-mcp — counted via `grep -c "^- \*\*browser_"` against decoded README content |

**Note on mitigation:** The official README notes that CLI+SKILLS mode (via Playwright CLI) is emerging as a more token-efficient alternative for coding agents. The MCP remains the correct choice for stateful, interactive workflows (login flows, multi-step form submissions, self-healing tests). The 59-tool overhead is a real cost and should be weighed against session requirements. In practice, Claude Code's Tool Search lazy-loading feature (2026) reduces context overhead by ~85% by loading tool schemas on demand rather than upfront.

**Effective overhead with lazy-loading:** ~8,850 × 0.15 ≈ ~1,328 tokens (at Tool Search activation).

---

### Self-Management Commands

| Operation | Command | Source |
|-----------|---------|--------|
| Install | `claude mcp add playwright npx @playwright/mcp@latest` | https://github.com/microsoft/playwright-mcp README, Claude Code section |
| Configure | `npx @playwright/mcp@latest --headless` (headless mode); browser selection via `--browser chromium\|firefox\|webkit\|msedge`; all options available as env vars (e.g., `PLAYWRIGHT_MCP_HEADLESS=true`). No API key required. Chromium auto-installs on first run. | https://github.com/microsoft/playwright-mcp README, Configuration section |
| Update | Re-run install command (`claude mcp add playwright npx @playwright/mcp@latest`) — `@latest` always pulls the newest published version. Verify with `npm view @playwright/mcp version` (current: 0.0.68 as of 2026-03-16). | https://www.npmjs.com/package/@playwright/mcp |
| Troubleshoot | `claude mcp list` to verify registration; `npx @playwright/mcp@latest --help` to test binary resolution; check browser install with `npx playwright install --dry-run` | https://github.com/microsoft/playwright-mcp README |

---

### Security Findings

**mcp-scan result:** Not yet run — Phase 3
**Known CVEs:** None found as of 2026-03-16
**Risk level:** MEDIUM
**Notes:**

Two security considerations apply, each with both a risk dimension and a value dimension:

1. **Local network access (MEDIUM risk / HIGH value for DDEV):** Playwright can access any URL the browser can reach, including `localhost` and `*.ddev.site` addresses. For a WordPress/DDEV developer, this is intentional value — CC can run browser-level tests against local WordPress sites without exposing them to the internet. The risk is that a prompt injection attack (via malicious web content) could instruct Playwright to exfiltrate data from local services. Mitigation: the `--allowed-hosts` and `--blocked-origins` flags can restrict which hosts the browser is permitted to reach. Default config restricts `file://` URL navigation.

2. **Browser accessibility tree data:** Playwright's accessibility snapshots can expose full page structure including form field contents, ARIA labels, and text content. For development workflows on local sites, this is expected behavior. For production-adjacent use (scraping live sites), be aware that returned content may include sensitive data if authenticated sessions are used.

> Security is informational only — not a hard gate. Findings are presented in the Phase 3 ranked report for user decision.

---

### WordPress/PHP Relevance

**HIGH value for DDEV-based WordPress development:**

- **Visual regression testing:** Playwright can capture screenshots of WordPress admin pages and front-end themes across code changes — provides a browser-level regression check that `phpunit` cannot do
- **Form testing:** Contact forms, checkout flows (WooCommerce), login/registration sequences — test the complete user journey, not just server-side logic
- **Accessibility audits:** The accessibility tree snapshot (Playwright's primary mode) is directly useful for WCAG compliance checks on WP themes without vision models
- **Local WordPress site automation:** Full access to `*.ddev.site` URLs — can log into WP admin, navigate settings, trigger plugin interactions, verify UI state after deployments
- **Plugin QA workflows:** Test plugin UI behavior in a real browser context before shipping — catches JavaScript errors and DOM issues that PHPUnit misses

No additional setup beyond the base install is required for DDEV site access.

---

### Pros and Cons

**Pros:**
- Fills a genuine capability gap: interactive browser automation that CC's stateless WebFetch cannot provide
- Official Microsoft vendor server — high maintenance accountability and active development (29K stars, committed same day as assessment)
- No API key required — zero ongoing cost, no external dependency
- Auto-installs Chromium on first run — no manual browser setup
- Local network access is a FEATURE for DDEV/WordPress developers testing localhost
- Tool Search lazy-loading reduces the 59-tool context overhead by ~85% in practice
- Supports headless mode (CI/automated use) and headed mode (interactive debugging)
- Extensive configuration via CLI flags and env vars — all parameters are CC-controllable

**Cons / Caveats:**
- High raw tool count (59 tools) is the highest context overhead of any candidate in this assessment — significant without Tool Search active
- CLI+SKILLS mode (Playwright CLI) is emerging as more token-efficient for coding agents; MCP may become secondary for high-throughput workflows
- Browser binary auto-install adds ~100-200MB of Chromium to disk on first run — one-time cost but notable
- MEDIUM security risk: browser can access local network; requires attention to `--allowed-hosts` if sensitive local services exist
- Stateful browser sessions add complexity vs. stateless fetches — more to reason about during automation

---

### Verdict

**Tier:** INCLUDE
**Rationale:** Playwright MCP passes all 4 hard gates and fills a capability gap CC cannot address natively — stateful interactive browser automation (form fills, clicks, multi-step flows, JavaScript execution) is categorically different from CC's stateless WebFetch. It directly serves the DDEV/WordPress workflow (browser-level testing of localhost WordPress sites). No other INCLUDE-tier candidate overlaps with this capability. The 59-tool context cost is real but mitigated by Tool Search lazy-loading in Claude Code 2026.
