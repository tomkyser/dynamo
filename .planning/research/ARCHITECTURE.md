# Architecture Research

**Domain:** Claude Code global MCP/tool ecosystem configuration
**Researched:** 2026-03-16
**Confidence:** HIGH (sourced directly from official Claude Code docs and live configuration)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Code Process                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐  │
│  │  Plugins   │  │   Hooks    │  │  MCP Tools │  │  CLAUDE  │  │
│  │ (skills,   │  │ (lifecycle │  │ (mcp__x__y)│  │  .md     │  │
│  │  agents,   │  │  scripts)  │  │  tools     │  │ context  │  │
│  │  hooks,    │  └─────┬──────┘  └─────┬──────┘  └──────────┘  │
│  │  MCP srvc) │        │               │                         │
│  └─────┬──────┘        │               │                         │
├────────┼───────────────┼───────────────┼─────────────────────────┤
│        │       Settings Resolution Layer                          │
│        │  managed > user > project > local  (precedence)         │
├────────┼───────────────┼───────────────┼─────────────────────────┤
│        ↓               ↓               ↓                         │
│  ┌───────────┐  ┌────────────┐  ┌──────────────────────────┐    │
│  │ ~/.claude/│  │~/.claude/  │  │     MCP Server Processes  │    │
│  │ plugins/  │  │settings.   │  │  stdio: child process     │    │
│  │ cache/    │  │json        │  │  http:  remote endpoint   │    │
│  └───────────┘  └────────────┘  └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

External Processes (outside Claude Code):
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────┐  ┌───────────────┐  ┌───────────────────┐  │
│  │  MCP stdio srv  │  │  MCP HTTP srv │  │  CLI tools        │  │
│  │  (npx / node /  │  │  (Docker,     │  │  (brew, npm -g,   │  │
│  │   python proc)  │  │   remote API) │  │   pip, cargo)     │  │
│  └─────────────────┘  └───────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `~/.claude.json` | MCP server registry (user + local scopes), project-specific overrides | JSON, managed by `claude mcp add` CLI |
| `~/.claude/settings.json` | Global preferences: permissions, hooks, env vars, model, plugins, statusLine | JSON, edited directly or via `/config` |
| `.claude/settings.json` | Project-level settings shared via git | JSON, project repo |
| `.claude/settings.local.json` | Per-machine project overrides, not committed | JSON, gitignored |
| `.mcp.json` (project root) | Project-scoped MCP servers shared via git | JSON, managed by `claude mcp add --scope project` |
| `~/.claude/plugins/cache/` | Installed plugin files copied from marketplaces | Auto-managed by Claude Code |
| `~/.claude/hooks/` | User-scope hook scripts (shell, Node.js, Python) | Scripts invoked by hooks config in settings.json |
| MCP stdio server | External tool as child process, communicates via stdin/stdout JSON-RPC | npx package, node script, python script |
| MCP HTTP server | External tool as remote HTTP endpoint (streamable-http protocol) | Cloud service, Docker container |

---

## Config File Relationships

### File Precedence (settings merge order, lowest to highest)

```
managed-settings.json         (system-wide, admin-deployed, read-only)
       ↓
~/.claude/settings.json       (user scope — your global defaults)
       ↓
.claude/settings.json         (project scope — shared with team via git)
       ↓
.claude/settings.local.json   (local scope — per-machine, gitignored)
```

For conflicts: local overrides project overrides user. Managed cannot be overridden.
For permissions: deny rules are absolute — a lower scope cannot un-deny something.

### MCP Server Registry (separate from settings)

MCP servers are stored in **`~/.claude.json`**, not `settings.json`. This is a critical architectural split:

```
~/.claude.json
├── mcpServers                      ← user-scope MCP servers (available all projects)
│   └── graphiti: { type: "http", url: "..." }
└── projects
    └── /path/to/project
        └── mcpServers              ← local-scope MCP servers (this project, private)
            └── my-server: { ... }
```

Project-scope MCP servers go in `.mcp.json` at the project root (committed to git).

### Complete Config Map

```
~/.claude.json                  ← MCP server registry (user + local scopes)
~/.claude/settings.json         ← Global settings (hooks, permissions, env, plugins)
~/.claude/CLAUDE.md             ← Global instructions injected into every session
~/.claude/hooks/                ← Hook scripts referenced from settings.json
~/.claude/plugins/cache/        ← Installed plugin files (auto-managed)
~/.claude/commands/             ← Global custom slash commands (standalone)
~/.claude/agents/               ← Global custom agents (standalone)

<project>/
├── .mcp.json                   ← Project-scope MCP servers (shared via git)
├── .claude/settings.json       ← Project settings (shared via git)
├── .claude/settings.local.json ← Local overrides (gitignored)
└── .claude/CLAUDE.md           ← Project instructions
```

---

## MCP Transport Types

Three transports exist, with different tradeoffs for the global setup use case:

### HTTP (streamable-http) — Recommended for Remote/Long-Running

```json
{
  "graphiti": {
    "type": "http",
    "url": "http://localhost:8100/mcp"
  }
}
```

**How it works:** Claude Code sends HTTP POST requests to a persistent server. The server manages its own lifecycle (stays running between sessions).

**Best for global setup when:**
- Server runs as a Docker container or daemon (e.g., Graphiti)
- Server needs to maintain state between Claude sessions
- Server is a remote cloud API (Notion, GitHub, Sentry)

**Tradeoffs:**
- Server must be started separately (not launched by Claude Code)
- Requires health-check pattern to verify availability before use
- OAuth 2.0 supported for authenticated remote services
- SSE variant exists but is deprecated — use HTTP instead

### stdio — Recommended for On-Demand Local Tools

```json
{
  "my-tool": {
    "command": "npx",
    "args": ["-y", "@some/mcp-server"],
    "env": { "API_KEY": "..." }
  }
}
```

**How it works:** Claude Code spawns a child process per session. Process communicates via stdin/stdout JSON-RPC. Process dies when session ends.

**Best for global setup when:**
- Tool is stateless (docs lookup, linting, formatting)
- Tool is distributed as an npm package (use `npx -y`)
- Tool needs filesystem or system access

**Tradeoffs:**
- Cold start latency each session (~1-3s for npx first run)
- PATH issues: Claude Code launches with a different shell environment than your terminal. nvm/pyenv shims may not resolve. Use absolute paths or ensure PATH is set in `settings.json` `env` block.
- On macOS with native Claude install: `~/.local/bin/claude` — Node.js/npm must be independently available

**PATH fix pattern:**
```json
{
  "env": {
    "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
  }
}
```

### SSE — Deprecated

The SSE (Server-Sent Events) transport is officially deprecated per Claude Code docs (March 2026). Use HTTP instead where available. SSE still works but should not be used for new configurations.

---

## MCP Server Lifecycle

### HTTP Server Lifecycle

```
User starts daemon (Docker, systemd, launchd, shell script)
       ↓
Claude Code session starts
       ↓
Claude Code connects to HTTP endpoint (URL from ~/.claude.json)
       ↓
Session uses tools
       ↓
Claude Code session ends (HTTP connection drops, server persists)
       ↓
User stops daemon manually (or it persists indefinitely)
```

**Self-management implication:** A SessionStart hook can run a health check and report if the server is offline (as Graphiti does). Claude Code itself cannot start/stop HTTP servers — an external script or launchd/Docker handles lifecycle.

### stdio Server Lifecycle

```
Claude Code session starts
       ↓
Claude Code spawns child process (command + args from config)
       ↓
Child process initializes, advertises tools via JSON-RPC
       ↓
Session uses tools
       ↓
Claude Code session ends → child process receives SIGTERM → exits
```

**Self-management implication:** Claude Code fully manages stdio server lifecycle. No external daemon needed. The only dependency is that the command is installed and in PATH.

---

## Self-Management Patterns

### Pattern 1: Install via `claude mcp add` CLI

Claude Code can run `claude mcp add` as a Bash command to register MCPs programmatically — without the user ever touching a config file.

```bash
# Install an HTTP MCP (user scope, all projects)
claude mcp add --transport http --scope user graphiti http://localhost:8100/mcp

# Install a stdio MCP (user scope, all projects)
claude mcp add --transport stdio --scope user --env API_KEY=abc123 context7 \
  -- npx -y @upstash/context7-mcp

# Install via JSON (useful for complex configs)
claude mcp add-json --scope user my-server \
  '{"type":"http","url":"https://api.example.com/mcp","headers":{"Authorization":"Bearer TOKEN"}}'

# Verify installation
claude mcp list
claude mcp get context7
```

**Confidence:** HIGH — official CLI documented in claude code docs.

### Pattern 2: CLI Tool Check + Install via Bash

CC can check whether a CLI tool is installed, install it if missing, and verify the result:

```bash
# Check if tool is installed
which context7 || npm install -g @upstash/context7-mcp

# Homebrew pattern
brew list some-tool 2>/dev/null || brew install some-tool

# Version check
node -e "require('@upstash/context7-mcp')" 2>/dev/null || npm install -g @upstash/context7-mcp

# npm global update
npm update -g @upstash/context7-mcp
```

**Path to executable:** For npm global packages on macOS with Homebrew Node:
`/opt/homebrew/lib/node_modules/.bin/` or use `npm config get prefix` + `/bin/`

### Pattern 3: Health Check Hook (SessionStart)

A SessionStart hook can verify MCP server availability and inject context or warnings:

```bash
#!/usr/bin/env bash
# Check if HTTP MCP server is available
if ! curl -s --max-time 3 http://localhost:8100/health > /dev/null; then
  echo "[Warning: my-server MCP is offline. Start it with: ~/.claude/my-server/start.sh]"
fi
exit 0
```

Hook output (stdout) is injected as Claude context at session start.

### Pattern 4: Update Check Hook (SessionStart)

The GSD framework demonstrates this pattern — a Node.js hook runs in the background at SessionStart, compares installed vs. latest version, and surfaces update notifications. CC can run `npm info @pkg/name version` to check latest versions without installing.

### Pattern 5: Direct JSON Edit via Bash

For bulk changes or initial setup, CC can directly edit `~/.claude.json` and `~/.claude/settings.json` using `jq`:

```bash
# Add MCP server to user scope
jq '.mcpServers["new-tool"] = {"type":"http","url":"https://..."}' \
  ~/.claude.json > /tmp/claude-tmp.json && mv /tmp/claude-tmp.json ~/.claude.json

# Add permission to settings.json
jq '.permissions.allow += ["mcp__new-tool__*"]' \
  ~/.claude/settings.json > /tmp/settings-tmp.json && mv /tmp/settings-tmp.json ~/.claude/settings.json
```

**Note:** Changes to `~/.claude.json` take effect on next Claude Code restart. Changes to `settings.json` permissions/hooks require restart. Model/env changes may take effect sooner.

### Pattern 6: Plugin Install via CLI

```bash
# Install plugin to user scope
claude plugin install typescript-lsp@claude-plugins-official

# Install plugin to project scope
claude plugin install formatter@my-marketplace --scope project

# Update a plugin
claude plugin update typescript-lsp@claude-plugins-official

# Check installed plugins (within session)
/plugin
```

Plugins are installed to `~/.claude/plugins/cache/` and registered in `~/.claude/settings.json` under `enabledPlugins`.

---

## CLI Tool Integration

### How CLI Tools Relate to Claude Code

CLI tools (installed via Homebrew, npm global, pip, cargo) are not directly managed by Claude Code's MCP/plugin system. They integrate in one of two ways:

**1. As MCP server backends (stdio transport)**
A CLI tool is wrapped in an MCP server package that exposes it via JSON-RPC. CC launches the MCP server which calls the CLI tool internally. Example: `@modelcontextprotocol/server-filesystem` wraps filesystem operations.

**2. As direct Bash tools**
CC invokes CLI tools directly via `Bash(tool-name *)` permissions. CC checks if the tool is available (`which tool`), calls it, and parses output. No MCP layer needed for simple tools.

### Package Manager Comparison for Global Tools

| Package Manager | Install Command | Global Path | Update Command | Self-manageable by CC |
|----------------|-----------------|-------------|----------------|-----------------------|
| Homebrew | `brew install <pkg>` | `/opt/homebrew/bin/` | `brew upgrade <pkg>` | YES — `brew` in permissions |
| npm global | `npm install -g <pkg>` | `$(npm config get prefix)/bin/` | `npm update -g <pkg>` | YES — `npm` in permissions |
| pip/pip3 | `pip install <pkg>` | `/opt/homebrew/bin/` (with brew Python) | `pip install -U <pkg>` | YES — `pip3` in permissions |
| npx (one-shot) | `npx -y <pkg>` | Cached in `~/.npm/_npx/` | Auto-fetches latest with `-y` | YES — no install needed |
| cargo | `cargo install <pkg>` | `~/.cargo/bin/` | `cargo install <pkg>` (reinstalls) | YES — `cargo` in permissions |

**Recommendation for MCP stdio servers:** prefer `npx -y` for on-demand use. It auto-updates on each run (fetches latest matching version) and requires no explicit install step. Use explicit global install only if startup latency matters.

### PATH Configuration for stdio MCP Servers

Claude Code (native install at `~/.local/bin/claude`) launches MCP stdio servers with a sanitized PATH. Shell profile files (`.zshrc`, `.bashrc`) are **not sourced**. This means:
- nvm-managed Node.js may not be found
- pyenv-managed Python may not be found
- Homebrew tools may not be found (if not in `/opt/homebrew/bin`)

**Fix:** Set the full PATH in `settings.json` env block (already done in this setup):

```json
{
  "env": {
    "PATH": "/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
  }
}
```

Or use absolute paths in MCP server `command` fields.

---

## Recommended Project Structure

This is the structure for a global Claude Code setup managed as a repository:

```
~/.claude/
├── CLAUDE.md                  # Global instructions (injected every session)
├── settings.json              # Global settings (hooks, permissions, env, plugins)
│
├── hooks/                     # Hook scripts (JS, shell — fast, no subprocess)
│   ├── session-start.sh       # SessionStart: context injection, health checks
│   ├── check-updates.js       # SessionStart: background version check
│   └── context-monitor.js     # PostToolUse: context window monitoring
│
├── graphiti/                  # Graphiti MCP: self-contained service directory
│   ├── docker-compose.yml
│   ├── start-graphiti.sh
│   ├── stop-graphiti.sh
│   └── hooks/                 # Graphiti-specific hook scripts
│       ├── session-start.sh
│       ├── prompt-augment.sh
│       ├── capture-change.sh
│       └── session-summary.sh
│
├── commands/                  # Global slash commands (standalone, not plugins)
│   └── gsd/                   # GSD framework commands
│
├── get-shit-done/             # GSD framework (standalone configuration)
│   └── VERSION
│
└── plugins/
    └── cache/                 # Auto-managed plugin installations
        └── <plugin-name>/     # Copied plugin files (do not edit directly)

~/.claude.json                 # MCP registry (user + local scopes)
```

### Structure Rationale

- **`hooks/` at root:** Fast-executing scripts invoked on every event. Keep these lean — they block session startup/progress until completion.
- **Service directories (e.g., `graphiti/`):** Self-contained subdirectory per long-running MCP service. Contains its own lifecycle scripts, hooks, and configuration. Makes the service portable and self-documenting.
- **`plugins/cache/` is auto-managed:** Do not add files here manually — Claude Code manages this directory. Install plugins via `claude plugin install`, not by dropping files in.
- **`settings.json` owns hooks config:** Hook scripts live in `hooks/` but the `settings.json` `hooks` block wires them to lifecycle events. The script is the implementation; settings.json is the registration.
- **`~/.claude.json` owns MCP registration:** Never edit this manually for MCP servers — use `claude mcp add` so Claude Code manages the format correctly.

---

## Architectural Patterns

### Pattern 1: Service-Per-Directory

**What:** Each MCP server that requires infrastructure (Docker, daemon) gets its own subdirectory in `~/.claude/` with lifecycle scripts and hooks.

**When to use:** Long-running services like databases, knowledge graphs, or local API servers.

**Trade-offs:**
- Pro: Self-documenting, portable, easy to version-control
- Pro: Service's hooks live alongside service scripts — cohesive unit
- Con: More directories in `~/.claude/` — manageable for 1-5 services

**Example:** The Graphiti setup (`~/.claude/graphiti/`) contains `docker-compose.yml`, start/stop scripts, and a `hooks/` subdirectory. The main `settings.json` references `$HOME/.claude/graphiti/hooks/*.sh`.

### Pattern 2: Hook-Driven Lifecycle Management

**What:** Use SessionStart hooks to verify preconditions (is service running? is tool installed?) and PostToolUse hooks to react to changes.

**When to use:** Any service that needs availability checking or any tool that needs post-processing.

**Trade-offs:**
- Pro: Zero user intervention — CC surfaces problems automatically
- Pro: Can auto-remediate (run install commands, start services)
- Con: Hooks run synchronously (except when spawned as background processes) — keep health checks fast (< 3 seconds)

**Exit code conventions for hooks:**
- `exit 0` — success, stdout injected as CC context
- `exit 2` — blocking failure, stderr shown to Claude (for PreToolUse: blocks tool execution)
- Other non-zero — non-blocking error, logged but execution continues

### Pattern 3: npx for Stateless MCP Servers

**What:** Use `npx -y @package/mcp-server` as the MCP server command for stateless tools (docs lookup, linting, formatting).

**When to use:** Any MCP server distributed as an npm package that does not need to persist state between Claude sessions.

**Trade-offs:**
- Pro: Zero install step — npx fetches and caches automatically
- Pro: Always uses latest version (when `-y` flag is used)
- Pro: No global package pollution
- Con: Cold start: first run downloads package (~1-5 seconds)
- Con: Requires npm and Node.js installed on machine

**Example:**
```json
{
  "context7": {
    "command": "npx",
    "args": ["-y", "@upstash/context7-mcp@latest"],
    "env": {}
  }
}
```

### Pattern 4: Permissions-as-Allowlist

**What:** Pre-authorize all MCP tool calls for trusted, globally-installed MCPs in `settings.json` `permissions.allow`. This avoids per-call permission prompts.

**When to use:** Any MCP tool that CC uses frequently and that has been vetted.

**Trade-offs:**
- Pro: Smooth uninterrupted workflow
- Con: Must explicitly add each `mcp__servername__toolname` pattern

**Example (from live settings.json):**
```json
{
  "permissions": {
    "allow": [
      "mcp__graphiti__add_memory",
      "mcp__graphiti__search_nodes",
      "mcp__graphiti__search_memory_facts"
    ],
    "ask": [
      "mcp__graphiti__clear_graph",
      "mcp__graphiti__delete_entity_edge"
    ]
  }
}
```

---

## Data Flow

### MCP Tool Call Flow (HTTP transport)

```
Claude decides to call mcp__graphiti__search_memory_facts
       ↓
Claude Code checks permissions.allow list
       ↓
Claude Code sends HTTP POST to http://localhost:8100/mcp
  → Request body: JSON-RPC {"method":"tools/call","params":{"name":"search_memory_facts",...}}
       ↓
MCP HTTP server processes request
       ↓
HTTP response: JSON-RPC result
       ↓
Claude Code passes result back to Claude as tool result
       ↓
MAX_MCP_OUTPUT_TOKENS check (default 25k, warn at 10k)
```

### MCP Tool Call Flow (stdio transport)

```
Claude decides to call mcp__context7__resolve-library-id
       ↓
Claude Code checks if stdio process is already running (reuses within session)
If not: spawns process → inherits env from settings.json "env" block
       ↓
Claude Code writes JSON-RPC to process stdin
       ↓
Process reads stdin, executes, writes JSON-RPC result to stdout
       ↓
Claude Code reads stdout → passes result back to Claude
```

### Hook Execution Flow (SessionStart)

```
Claude Code session begins
       ↓
Claude Code reads hooks config from settings.json
       ↓
For each SessionStart hook matching current trigger:
  → Spawns hook command as subprocess
  → Pipes session JSON context to subprocess stdin
  → Waits up to `timeout` seconds
  → Collects stdout (injected as Claude context)
  → Collects stderr (surfaced as warning if exit 2)
       ↓
Claude session starts with injected context available
```

### Self-Management: MCP Install Flow

```
User asks CC to install a new MCP tool
       ↓
CC researches tool (WebSearch/WebFetch)
       ↓
CC runs: claude mcp add --scope user --transport stdio <name> -- npx -y @pkg/mcp
       ↓
claude CLI writes entry to ~/.claude.json mcpServers
       ↓
CC adds permission entry to ~/.claude/settings.json (via jq or direct edit)
       ↓
CC verifies: claude mcp list | grep <name>
       ↓
Informs user: "Restart Claude Code to activate <name>"
```

---

## Anti-Patterns

### Anti-Pattern 1: Manual Config File Editing

**What people do:** Directly edit `~/.claude.json` or `~/.claude/settings.json` to add MCP servers.

**Why it's wrong:** `~/.claude.json` has a complex nested structure with project-specific overrides alongside global mcpServers. Manual edits risk malforming the JSON or placing entries in the wrong scope. Claude Code also caches config — a bad edit causes silent failures.

**Do this instead:** Use `claude mcp add --scope user` for MCP servers. Use `jq` with temp file pattern for settings.json edits if CLI is insufficient. Always validate with `python3 -c "import json; json.load(open('~/.claude.json'))"` after edits.

### Anti-Pattern 2: Putting Server Lifecycle Logic in MCP Config

**What people do:** Try to start the Graphiti Docker container inside the MCP server command field.

**Why it's wrong:** HTTP servers need to be running before Claude Code connects. stdio servers launched by Claude Code cannot start Docker reliably (daemon not available, PATH issues, etc.).

**Do this instead:** Use a SessionStart hook that checks if the service is running and injects a warning if not. Manage service lifecycle separately (Docker, launchd, or a start script the user runs explicitly).

### Anti-Pattern 3: Conflating ~/.claude.json with ~/.claude/settings.json

**What people do:** Look in `settings.json` for MCP server definitions or in `~/.claude.json` for hook configurations.

**Why it's wrong:** These files control different things with completely different schemas. MCP servers → `~/.claude.json` (mcpServers key). Hooks, permissions, env vars, plugins → `~/.claude/settings.json`. Mixing them up causes silent ignored configuration.

**Do this instead:** Remember the split: **JSON = MCP registrations, settings = behavior configuration**.

### Anti-Pattern 4: Over-Permissioning via Wildcards

**What people do:** Add `"mcp__*"` or `"Bash(*)"` to `permissions.allow` for convenience.

**Why it's wrong:** Defeats the safety model. `Bash(*)` effectively disables all Bash restrictions. `mcp__*` allows any current or future MCP server to run without confirmation.

**Do this instead:** Use specific tool patterns: `"mcp__graphiti__*"` for a fully-trusted server, individual tool names for partial trust. For Bash, the existing pattern in this setup (explicit per-command allows with a denylist for destructive operations) is the correct approach.

### Anti-Pattern 5: Slow Synchronous Hooks

**What people do:** Write SessionStart hooks that do expensive operations (large file reads, slow API calls, complex Python startup) synchronously, blocking session start.

**Why it's wrong:** Every hook runs synchronously and blocks Claude Code until it completes or times out. A 10-second SessionStart hook means 10 seconds of dead time before every session.

**Do this instead:** Use background spawning for expensive checks (the GSD update checker does this — spawns a child process and returns immediately). Keep synchronous hooks under 3 seconds. Use the `timeout` field as a safety net (30 seconds max).

---

## Build Order Implications

For the roadmap, the architecture implies this dependency order:

1. **Config files must be understood before tools are selected** — choosing a tool requires knowing whether it supports user-scope HTTP, stdio with npx, or a plugin. Different tools require different registration approaches.

2. **settings.json permissions must be updated alongside MCP registration** — adding an MCP server without adding permissions causes every tool call to prompt for confirmation. These two changes ship together.

3. **stdio PATH must be confirmed before stdio MCPs are added** — if PATH is not set in settings.json env block, stdio MCP servers using npx/node will fail. Validate PATH first.

4. **HTTP MCPs require lifecycle strategy before registration** — Graphiti demonstrates: Docker + start script + health check hook. Any HTTP MCP needs this pattern designed before installation.

5. **Plugin installation order matters** — LSP plugins require the language server binary to exist. Install binary first (`brew install gopls`), then install plugin (`claude plugin install gopls-lsp`).

6. **Hook scripts must be executable before hooks config references them** — `chmod +x` is required. Hooks fail silently if the script is not executable.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Graphiti (Neo4j + Python) | HTTP MCP via Docker on localhost:8100 | Needs Docker daemon running; health check hook |
| npm MCP packages | stdio via `npx -y @pkg/mcp-server` | PATH must include npm/node; cold start latency |
| Claude.ai cloud MCPs | Automatic via Claude.ai account login | No config needed; appears in `/mcp` list |
| Homebrew CLI tools | Direct Bash invocation via permissions | Must add `Bash(tool-name *)` to permissions.allow |
| Remote HTTP APIs (GitHub, Notion, etc.) | HTTP MCP with OAuth or Bearer token | Use `claude mcp add --transport http --header "Authorization: Bearer $TOKEN"` |
| Plugin marketplaces | `claude plugin install <name>@<marketplace>` | Plugins cached in `~/.claude/plugins/cache/` |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| settings.json ↔ hooks | settings.json `hooks` block references hook script paths | Hook scripts are external files, not embedded |
| settings.json ↔ plugins | settings.json `enabledPlugins` key maps plugin@marketplace to boolean | Plugin install writes this; do not edit manually |
| ~/.claude.json ↔ MCP servers | `mcpServers` key maps server name to connection config | Managed by `claude mcp add` CLI |
| Claude Code ↔ stdio MCP | stdin/stdout JSON-RPC per session | Process spawned by CC, inherits settings.json env |
| Claude Code ↔ HTTP MCP | HTTP POST JSON-RPC | Server must be independently running |
| Hook script ↔ Claude context | stdout from hook is injected as system context | stderr at exit 2 is shown as error to Claude |
| Plugin ↔ Claude Code | Plugin files copied to cache; hooks/MCP/commands registered | Use `${CLAUDE_PLUGIN_ROOT}` for paths in plugin scripts |

---

## Sources

- [Claude Code MCP Documentation](https://code.claude.com/docs/en/mcp) — transport types, scopes, `claude mcp add` syntax — HIGH confidence
- [Claude Code Settings Documentation](https://code.claude.com/docs/en/settings) — config file locations, scope hierarchy, merging behavior — HIGH confidence
- [Claude Code Hooks Documentation](https://code.claude.com/docs/en/hooks) — lifecycle events, hook types, input/output schema — HIGH confidence
- [Claude Code Plugins Reference](https://code.claude.com/docs/en/plugins-reference) — plugin structure, install scopes, CLI commands — HIGH confidence
- [Claude Code Discover Plugins](https://code.claude.com/docs/en/discover-plugins) — marketplace system, install lifecycle, official plugins — HIGH confidence
- Live `~/.claude.json`, `~/.claude/settings.json` from this machine — confirmed actual config patterns — HIGH confidence
- Live hook scripts in `~/.claude/hooks/` and `~/.claude/graphiti/hooks/` — confirmed real-world patterns — HIGH confidence

---

*Architecture research for: Claude Code global MCP/tool ecosystem*
*Researched: 2026-03-16*
