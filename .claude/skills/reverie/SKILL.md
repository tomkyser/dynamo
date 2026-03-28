---
name: reverie
description: "Reverie session management hub. Shows current mode, session topology, offers start/stop/inspect actions. Use when interacting with Reverie memory system."
---

# Reverie Session Management

Show the user Reverie's current state and offer session management actions.

## Status

Run `bun bin/dynamo.cjs reverie status` to see:
- Current operational mode (Active/Passive/REM/Dormant)
- Session topology (Primary/Secondary/Tertiary)
- Triplet ID if active (e.g., "Triplet a1b2")
- Self Model personality summary, fragment count, recall stats

## Session Control

- Start Active mode: `bun bin/dynamo.cjs reverie start`
- Graceful shutdown with REM: `bun bin/dynamo.cjs reverie stop`
- Force-kill all sessions: `bun bin/dynamo.cjs reverie kill`
  (brute-force — finds and kills relay, channel servers, spawned Claude sessions regardless of state)

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
- `--dry-run` — preview without writing
- `--limit N` — cap conversations processed
- `--batch-size N` — control batch size

## Interaction

Offer contextual actions based on current state:
- If Dormant: suggest starting a session
- If Active: offer inspect, status, or stop
- If Passive: offer upgrading to Active mode

Present results conversationally. This is the friendly human interface -- show personality, not just data.