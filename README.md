# Dynamo

A self-contained development platform for Claude Code.

Dynamo provides the core services, providers, framework, and SDK needed to build modules and plugins that extend Claude Code's capabilities. It is similar to a game engine -- things built with Dynamo are contained within Dynamo as an ecosystem.

## Prerequisites

- [Bun](https://bun.sh) >= 1.2.3
- Claude Code with Max subscription (for Channels API and multi-session)
- Git (for submodule management)

## Install

```
git clone <repo-url> dynamo
cd dynamo
bun install
```

Optional global command (makes `dynamo` available system-wide):

```
bun link
```

## Quick Start

```
bun bin/dynamo.cjs status    # Platform status
bun bin/dynamo.cjs health    # Service health check
bun bin/dynamo.cjs version   # Version info
bun bin/dynamo.cjs config    # Show configuration
bun bin/dynamo.cjs --help    # All commands
```

If linked globally:

```
dynamo status
dynamo health
dynamo version
```

## Architecture Overview

Dynamo follows a strict layered build order:

```
Core Library -> Services + Providers (parallel) -> Framework (Armature) -> SDK (Circuit + Pulley) -> Modules
```

Each layer depends only on the layers below it. Everything routes through Dynamo -- no component bypasses the patterns and paths Dynamo defines.

For the full architecture document, see `.claude/new-plan.md`.

## Core Services

| Service      | Domain          | Description                                           |
|--------------|-----------------|-------------------------------------------------------|
| Switchboard  | Events          | Event and I/O dispatcher                              |
| Lathe        | Filesystem      | Thin filesystem facade over Bun native APIs           |
| Commutator   | I/O             | Shared system I/O bus                                 |
| Magnet       | State           | Shared system state management                        |
| Conductor    | Infrastructure  | MCP server lifecycle, dependency management           |
| Forge        | Git             | Git ops, channel switching, repo sync                 |
| Relay        | Operations      | Install/update/sync                                   |
| Wire         | Communication   | MCP server toolkit for inter-session communication    |
| Assay        | Search          | Unified data search/indexing across all providers     |
| Exciter      | Integration     | Claude Code hook lifecycle and registration management|

## Core Providers

| Provider   | Domain    | Description                       |
|------------|-----------|-----------------------------------|
| Ledger     | SQL       | DuckDB database                   |
| Journal    | Flat File | Markdown file system              |
| Lithograph | Transcript| Claude Code transcript access     |

## Reverie

Reverie is the first module built on Dynamo. It delivers persistent, evolving AI memory and personality for Claude Code sessions.

### What It Does

- **Self Model** -- a three-aspect personality system (Face/Mind/Subconscious) with an Identity Core, Relational Model, and Conditioning layer. Claude develops and maintains a coherent sense of self across conversations.
- **Fragment Memory** -- five fragment types (episodic, semantic, procedural, emotional, relational) formed from conversations, stored across Journal and Ledger providers, recalled by multi-angle scoring with natural decay.
- **Three-Session Architecture** -- Primary (user-facing), Secondary (cognitive orchestrator), and Tertiary (subconscious processing) sessions communicating over Wire. Secondary controls personality injection; Tertiary runs sublimation loops.
- **REM Consolidation** -- tiered memory processing: compaction triage on context pressure, idle provisional consolidation, full session-end consolidation with editorial pass, and domain taxonomy governance.
- **Context Management** -- budget-tracked personality injection across four context phases (30/60/80/100%), with referential framing from Secondary controlling how the Self Model surfaces in Primary.

### Claude Code Skills

Reverie registers three skills that become available as slash commands in Claude Code:

| Skill | What It Does |
|-------|-------------|
| `/dynamo` | Platform dashboard -- shows health, loaded modules, active services, hook status |
| `/reverie` | Session management hub -- shows current mode (Active/Passive/REM/Dormant), session topology, triplet ID, offers start/stop/inspect actions |
| `/dynamo-validate` | Runs E2E validation against all 6 success criteria -- the go-live gate |

### Operational Modes

| Mode | Sessions Active | When |
|------|----------------|------|
| **Active** | Primary + Secondary + Tertiary | Full three-session architecture running |
| **Passive** | Primary + Secondary | Tertiary unavailable or degraded -- automatic fallback |
| **REM** | Secondary only | Session ended, consolidation running |
| **Dormant** | None | No active sessions |

### Session Topology

Each session triplet gets a unique 4-character hex ID (e.g., `a1b2`). Sessions within a triplet are namespaced (`triplet-a1b2:primary`, `triplet-a1b2:secondary`, `triplet-a1b2:tertiary`) with color-coded terminal prefixes for visual distinction. Max 3 concurrent triplets by default (configurable via `max_triplets` in `config.json`).

For the full specification, see `.claude/reverie-spec-v2.md`.

## Development

```
bun test                     # Run all tests
bun test --watch             # Watch mode
bun bin/dynamo.cjs health    # Verify platform health
```

Runtime: **Bun** | Language: **CJS** | Data: **JSON** (structured), **Markdown** (narrative)

## License

[License TBD]
