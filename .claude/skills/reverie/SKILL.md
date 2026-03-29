---
name: reverie
description: "Reverie memory module. Enable/disable the three-session architecture, check session state, inspect memory fragments and Self Model. Use when interacting with Reverie memory system."
---

# Reverie Memory Module

Manage Reverie's three-session memory architecture and inspect memory state.

## Prerequisites

Dynamo daemon must be running before Reverie can be enabled. If not running, tell the user to start it first: `bun bin/dynamo.cjs start`

## Module Lifecycle

1. **Enable Reverie**: `bun bin/dynamo.cjs reverie enable`
   - Enables the Reverie module and spawns the three-session triad (Face + Secondary + Tertiary)
   - Requires daemon to be running first

2. **Disable Reverie**: `bun bin/dynamo.cjs reverie disable`
   - Disables Reverie, initiates REM consolidation, terminates Secondary and Tertiary sessions

3. **Check Status**: `bun bin/dynamo.cjs reverie status`
   - Shows Reverie mode, triad ID, session states, turn count

4. **Nuclear Option**: `bun bin/dynamo.cjs reverie kill`
   - Kills all Reverie sessions directly (no daemon required)
   - Use when daemon is unresponsive

## Flow

`/dynamo` (starts daemon) then `/reverie enable` (activates Reverie with 3 terminal windows)

## Session Control

- Graceful shutdown with REM: `bun bin/dynamo.cjs reverie stop`
- Start Active mode: `bun bin/dynamo.cjs reverie start`

## Inspect

- Inspect a fragment: `bun bin/dynamo.cjs reverie inspect fragment <id>`
- List domains: `bun bin/dynamo.cjs reverie inspect domains`
- Association graph: `bun bin/dynamo.cjs reverie inspect associations <entity>`
- Full Self Model: `bun bin/dynamo.cjs reverie inspect self-model`
- Identity Core: `bun bin/dynamo.cjs reverie inspect identity`
- Relational Model: `bun bin/dynamo.cjs reverie inspect relational`
- Conditioning: `bun bin/dynamo.cjs reverie inspect conditioning`

## History

- Session timeline: `bun bin/dynamo.cjs reverie history sessions`
- Fragment timeline: `bun bin/dynamo.cjs reverie history fragments`
- REM consolidation events: `bun bin/dynamo.cjs reverie history consolidations`

## Reset

All reset commands require `--confirm` flag.

- Wipe fragments: `bun bin/dynamo.cjs reverie reset fragments --confirm`
- Reset Self Model: `bun bin/dynamo.cjs reverie reset self-model --confirm`
- Factory reset: `bun bin/dynamo.cjs reverie reset all --confirm`

## Backfill

Import historical conversation data:
`bun bin/dynamo.cjs reverie backfill <file>`
- `--dry-run` -- preview without writing
- `--limit N` -- cap conversations processed
- `--batch-size N` -- control batch size

## Interaction

Offer contextual actions based on current state:
- If Dormant or not enabled: suggest enabling with `/reverie enable`
- If Active: offer inspect, status, or disable
- If Passive: offer upgrading to Active mode

Present results conversationally. This is the friendly human interface -- show personality, not just data.
