#!/usr/bin/env bun
'use strict';

const { bootstrap } = require('../core/core.cjs');
const { main } = require('../core/sdk/pulley/cli.cjs');

/**
 * Hook dispatch entry point.
 *
 * Invoked by Claude Code via settings.json hook entries. Reads the hook
 * payload from stdin (JSON), bootstraps Dynamo, routes through Commutator,
 * and writes the response to stdout.
 *
 * Usage: bun run bin/dynamo.cjs hook <HookType>
 * Stdin: JSON payload from Claude Code
 * Stdout: JSON response (additionalContext, decision, etc.)
 */
async function handleHook() {
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

  // Route through Commutator
  const { container } = bootstrapResult.value;
  const commutatorFacade = container.resolve('services.commutator');
  if (!commutatorFacade.ok) {
    process.stderr.write('Error: Could not resolve commutator\n');
    process.exit(1);
  }

  // Commutator.ingest expects { type, payload } shape
  const response = commutatorFacade.value.ingest({
    type: hookType,
    ...payload,
  });

  // Write response to stdout for Claude Code
  if (response && typeof response === 'object') {
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
async function run() {
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
