#!/usr/bin/env bun
'use strict';

const { bootstrap } = require('../core/core.cjs');
const { main } = require('../core/sdk/pulley/cli.cjs');

/**
 * Dynamo CLI entry point.
 *
 * Bootstraps the platform, extracts the Pulley CLI framework from the
 * container, and delegates argument routing to cli.cjs main().
 *
 * Does NOT call process.exit() -- lets the event loop drain naturally.
 */
async function run() {
  const bootstrapResult = await bootstrap();

  if (!bootstrapResult.ok) {
    process.stderr.write(`Error: ${bootstrapResult.error.message}\n`);
    process.exitCode = 1;
    return;
  }

  const { pulley } = bootstrapResult.value;

  await main(process.argv.slice(2), pulley);
}

run();
