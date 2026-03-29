---
name: dynamo
description: "Dynamo platform management. Start/stop the daemon, check platform health, manage modules and services. Use when starting Dynamo, checking status, or diagnosing issues."
---

# Dynamo Platform Management

Manage the Dynamo daemon and show platform state conversationally.

## Daemon Lifecycle

1. **Start Dynamo**: `bun bin/dynamo.cjs start`
   - Launches the Dynamo daemon as a persistent background process
   - Reports PID and port on success
   - The daemon must be running before any module can be enabled

2. **Check Status**: `bun bin/dynamo.cjs status`
   - Shows daemon health, loaded modules, active triads, uptime

3. **Stop Dynamo**: `bun bin/dynamo.cjs stop`
   - Gracefully shuts down the daemon (completes REM, terminates sessions, closes connections)

## Additional Commands

4. Run service health check: `bun bin/dynamo.cjs health`
5. View version info: `bun bin/dynamo.cjs version`
6. View configuration: `bun bin/dynamo.cjs config`
   - View specific key: `bun bin/dynamo.cjs config <key>`

## When to Use

- Start Dynamo when the user wants to use Reverie or other Dynamo modules
- The daemon must be running before any module can be enabled
- Use status to check if everything is healthy before enabling modules

## Troubleshooting

- If daemon fails to start, check `.dynamo/dynamo.log`
- If daemon crashed, run `bun bin/dynamo.cjs start` again (auto-detects and cleans stale PID)
- If daemon is unresponsive, run `bun bin/dynamo.cjs stop` then `bun bin/dynamo.cjs start`

## Presentation

- Platform lifecycle state (running/stopped/error)
- Loaded modules and their registration status
- Active services count and any unhealthy services
- Hook registration status (how many hook types wired)
- If any services are unhealthy, highlight them and suggest next steps
- If Dynamo is not running, advise user to start it first

Present results conversationally -- not as raw CLI output. Summarize, highlight issues, suggest actions.
