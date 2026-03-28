# Dynamo

A self-contained development platform for Claude Code. Dynamo provides core services, providers, framework, and SDK for building modules that extend Claude Code's capabilities.

**Runtime:** Bun | **Language:** CJS | **Data:** JSON (structured), Markdown (narrative)

## Prerequisites

- [Bun](https://bun.sh) >= 1.2.3
- [Claude Code](https://code.claude.com) (Claude Max subscription required)
- Git

## Install

```bash
git clone --recurse-submodules <repo-url>
cd dynamo
bun install
```

## First Run

When you start a Claude Code session in this project:

1. **Dynamo boots automatically** via Claude Code hooks -- no manual setup needed
2. **Reverie initializes in Passive mode** -- personality injection begins on your first message
3. **A welcome message** appears on your very first session, orienting you to available skills
4. **Memory formation** runs in the background as you work -- Reverie remembers what matters

You don't need to run any commands to get started. Just start working.

## Skills

Claude Code skills provide natural-language interfaces to Dynamo:

| Skill | Purpose |
|-------|---------|
| `/dynamo` | Platform dashboard -- health, status, configuration |
| `/reverie` | Memory session management -- start, stop, inspect, history |
| `/dynamo-validate` | Run the validation test suite |

## CLI Commands

All commands run via `bun bin/dynamo.cjs`:

### Platform

| Command | Description |
|---------|-------------|
| `status` | Platform status overview |
| `health` | Service health check |
| `version` | Version information |
| `install <url>` | Install a plugin or module |
| `update` | Self-update |
| `config [key]` | Show configuration |

### Reverie

| Command | Description |
|---------|-------------|
| `reverie status` | Operational dashboard |
| `reverie start` | Upgrade to Active mode (full three-session architecture) |
| `reverie stop` | Graceful shutdown with REM memory consolidation |
| `reverie inspect fragment <id>` | Inspect a specific memory fragment |
| `reverie inspect domains` | List all knowledge domains |
| `reverie inspect associations <entity>` | Show association graph around an entity |
| `reverie inspect self-model` | Show complete Self Model state |
| `reverie inspect identity` | Show Identity Core aspect |
| `reverie inspect relational` | Show Relational Model aspect |
| `reverie inspect conditioning` | Show Conditioning aspect |
| `reverie history sessions` | Session timeline |
| `reverie history fragments` | Fragment formation timeline |
| `reverie history consolidations` | REM consolidation events |
| `reverie reset fragments --confirm` | Wipe all fragments |
| `reverie reset self-model --confirm` | Reset Self Model to cold start |
| `reverie reset all --confirm` | Full factory reset |
| `reverie backfill <file>` | Import historical conversation data |

## Architecture

```
Core Library -> Services + Providers -> Framework (Armature) -> SDK (Circuit + Pulley) -> Modules (Reverie)
```

Each layer depends only on the layers below it. Everything routes through Dynamo -- no component bypasses the patterns and paths Dynamo defines.

### Core Services

| Service | Domain | Description |
|---------|--------|-------------|
| Switchboard | Events | Event and I/O dispatcher |
| Commutator | I/O | Shared system I/O bus |
| Magnet | State | Shared system state management |
| Lathe | Filesystem | Thin filesystem facade over Bun native APIs |
| Conductor | Infrastructure | MCP server lifecycle, session spawning |
| Forge | Git | Git ops, channel switching, repo sync |
| Relay | Operations | Install/update/sync |
| Wire | Communication | MCP server toolkit for inter-session communication via Channels |
| Assay | Search | Unified data search/indexing across all providers |

### Providers

| Provider | Domain | Description |
|----------|--------|-------------|
| Ledger | SQL | DuckDB database |
| Journal | Flat File | Markdown file system |

### Reverie Module

Persistent AI memory through a three-session architecture:

- **Primary (Face):** User-facing session with personality injection
- **Secondary (Mind):** Cognitive center for attention, formation, recall, taxonomy
- **Tertiary (Subconscious):** Continuous sublimation and pattern recognition

Five memory fragment types: experiential, meta-recall, sublimation, consolidation, source-reference

REM consolidation gates all fragment promotion from working memory to long-term storage.

### Operational Modes

| Mode | Sessions Active | When |
|------|----------------|------|
| **Active** | Primary + Secondary + Tertiary | Full three-session architecture running |
| **Passive** | Primary + Secondary | Tertiary unavailable or degraded -- automatic fallback |
| **REM** | Secondary only | Session ended, consolidation running |
| **Dormant** | None | No active sessions |

For the full architecture document, see `.claude/new-plan.md`.
For the Reverie specification, see `.claude/reverie-spec-v2.md`.

## Development

```bash
# Run all tests
bun test

# Run Reverie validation suite
bun test modules/reverie/validation/

# Run specific test
bun test modules/reverie/validation/integration-harness.test.cjs

# Verify platform health
bun bin/dynamo.cjs health
```

## License

[License TBD]
