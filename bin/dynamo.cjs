#!/usr/bin/env bun
'use strict';

const { bootstrap } = require('../core/core.cjs');
const { main } = require('../core/sdk/pulley/cli.cjs');

/**
 * Hook dispatch entry point.
 *
 * Invoked by Claude Code via settings.json hook entries. Reads the hook
 * payload from stdin (JSON), bootstraps Dynamo, resolves module hook
 * handlers via Exciter, awaits them, and writes their response to stdout.
 *
 * Also emits via Commutator for observability (Switchboard events).
 *
 * Usage: bun run bin/dynamo.cjs hook <HookType>
 * Stdin: JSON payload from Claude Code (includes hook_event_name, etc.)
 * Stdout: JSON response (hookSpecificOutput with additionalContext, decision, etc.)
 */
async function handleHook() {
  // Dev bypass: skip all hook processing during active Dynamo/Reverie development.
  // Set DYNAMO_DEV_BYPASS=1 in your shell to prevent hooks from interfering.
  if (process.env.DYNAMO_DEV_BYPASS === '1') {
    process.stdout.write('{}');
    process.exit(0);
  }

  const hookType = process.argv[3] || 'unknown';

  // Read payload from stdin
  let input = '';
  const reader = Bun.stdin.stream().getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      input += new TextDecoder().decode(value);
    }
  } catch (_e) {
    // stdin may be empty for some hook types
  }

  let payload;
  try {
    payload = input ? JSON.parse(input) : {};
  } catch (_e) {
    process.stderr.write('Error: Invalid JSON on stdin\n');
    process.exit(1);
  }

  // Bootstrap platform
  const bootstrapResult = await bootstrap();
  if (!bootstrapResult.ok) {
    process.stderr.write('Error: ' + bootstrapResult.error.message + '\n');
    process.exit(1);
  }

  const { container, lifecycle } = bootstrapResult.value;

  // Emit via Commutator for observability (fire-and-forget Switchboard events)
  const commutatorFacade = container.resolve('services.commutator');
  if (commutatorFacade.ok) {
    commutatorFacade.value.ingest({
      type: hookType,
      ...payload,
    });
  }

  // Resolve Exciter to access registered hook handlers directly.
  // This bypasses the Switchboard fire-and-forget path so we can:
  //   1. Await async handlers (Wire sends, context init, etc.)
  //   2. Capture their return value (hookSpecificOutput for Claude Code)
  const exciterFacade = lifecycle.getFacade('services.exciter');
  let response = {};

  if (exciterFacade && typeof exciterFacade.getRegisteredHooks === 'function') {
    const hooksResult = exciterFacade.getRegisteredHooks();
    if (hooksResult.ok) {
      const listeners = hooksResult.value[hookType];
      if (listeners && listeners.length > 0) {
        // Invoke all registered handlers for this hook type, awaiting each.
        // Use the LAST non-empty response (modules override platform defaults).
        for (const listener of listeners) {
          try {
            const handlerResult = await listener.handler(payload);
            if (handlerResult && typeof handlerResult === 'object' && Object.keys(handlerResult).length > 0) {
              response = handlerResult;
            }
          } catch (handlerErr) {
            // Individual handler failure is non-fatal -- log and continue to next
            process.stderr.write('Hook handler error (' + hookType + '): ' + (handlerErr.message || handlerErr) + '\n');
            if (handlerErr.stack) process.stderr.write(handlerErr.stack + '\n');
          }
        }
      }
    }
  }

  // Write response to stdout for Claude Code
  if (response && typeof response === 'object' && Object.keys(response).length > 0) {
    process.stdout.write(JSON.stringify(response));
  } else {
    process.stdout.write('{}');
  }

  process.exit(0);
}

/**
 * Dynamo CLI entry point.
 *
 * Bootstraps the platform, extracts the Pulley CLI framework from the
 * container, and delegates argument routing to cli.cjs main().
 *
 * Calls process.exit() after completion because persistent handles
 * (DuckDB connections, EventEmitter listeners) keep the event loop alive.
 */
/**
 * Force-kill all Reverie session processes without bootstrap.
 *
 * Pre-bootstrap handler for `dynamo reverie kill` — works even when
 * DuckDB is locked, bootstrap is broken, or Reverie fails to load.
 * Scans process table, kills matching processes, and exits.
 */
function handleReverieKill() {
  const { execSync } = require('node:child_process');
  const killed = [];

  const patterns = [
    'relay-server\\.cjs',
    'channel-server\\.cjs',
    'dangerously-load-development-channels.*dynamo-wire',
  ];

  for (const pattern of patterns) {
    try {
      const output = execSync(
        'ps aux | grep -E ' + JSON.stringify(pattern) + ' | grep -v grep',
        { encoding: 'utf8', timeout: 5000 }
      ).trim();

      if (!output) continue;
      for (const line of output.split('\n')) {
        const parts = line.trim().split(/\s+/);
        const pid = parseInt(parts[1], 10);
        if (pid && pid !== process.pid) {
          try {
            process.kill(pid, 'SIGTERM');
            killed.push({ pid, desc: parts.slice(10).join(' ').slice(0, 80) });
          } catch (_e) { /* already dead */ }
        }
      }
    } catch (_e) { /* grep returns 1 on no match */ }
  }

  // Kill any stale bun processes holding DB locks (e.g., orphaned test runs)
  try {
    const output = execSync(
      'lsof ' + JSON.stringify(require('node:path').join(process.cwd(), 'data', 'ledger.db')) + ' 2>/dev/null',
      { encoding: 'utf8', timeout: 5000 }
    ).trim();
    if (output) {
      for (const line of output.split('\n').slice(1)) {
        const parts = line.trim().split(/\s+/);
        const cmd = parts[0];
        const pid = parseInt(parts[1], 10);
        // Only kill bun/node processes, not system daemons like fileprovi
        if (pid && pid !== process.pid && (cmd === 'bun' || cmd === 'node')) {
          try { process.kill(pid, 'SIGTERM'); killed.push({ pid, desc: cmd + ' (holding ledger.db lock)' }); } catch (_e) { /* dead */ }
        }
      }
    }
  } catch (_e) { /* no lsof output = no locks */ }

  // Clean up WAL/journal files that can cause lock issues
  const fs = require('node:fs');
  const path = require('node:path');
  const dataDir = path.join(process.cwd(), 'data');
  for (const suffix of ['.wal', '-journal', '-shm']) {
    try { fs.unlinkSync(path.join(dataDir, 'ledger.db' + suffix)); } catch (_e) { /* not present */ }
  }

  if (killed.length === 0) {
    process.stdout.write('No Reverie processes found\n');
  } else {
    process.stdout.write('Killed ' + killed.length + ' process(es):\n');
    for (const p of killed) {
      process.stdout.write('  PID ' + p.pid + ' — ' + p.desc + '\n');
    }
  }
  process.exit(0);
}

async function run() {
  // Pre-bootstrap handlers (must work without DuckDB, bootstrap, etc.)
  if (process.argv[2] === 'reverie' && process.argv[3] === 'kill') {
    handleReverieKill();
    return;
  }

  // Hook dispatch mode: invoked by Claude Code via settings.json
  if (process.argv[2] === 'hook') {
    await handleHook();
    return;
  }

  // Normal CLI path (unchanged)
  const bootstrapResult = await bootstrap();

  if (!bootstrapResult.ok) {
    process.stderr.write(`Error: ${bootstrapResult.error.message}\n`);
    process.exit(1);
  }

  const { pulley } = bootstrapResult.value;

  await main(process.argv.slice(2), pulley);
  process.exit(process.exitCode || 0);
}

run();
