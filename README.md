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

## Modules

**Reverie** is the first module built on Dynamo. It delivers a memory and personality system for Claude Code sessions. See `.claude/reverie-spec-v2.md` for the full specification.

## Development

```
bun test                     # Run all tests
bun test --watch             # Watch mode
bun bin/dynamo.cjs health    # Verify platform health
```

Runtime: **Bun** | Language: **CJS** | Data: **JSON** (structured), **Markdown** (narrative)

## License

[License TBD]
