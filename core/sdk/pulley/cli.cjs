'use strict';

const { parseArgs } = require('node:util');
const { formatOutput } = require('./output.cjs');

/**
 * CLI entry point for Dynamo.
 *
 * Parses process.argv-style arguments and delegates to Pulley for routing.
 * Handles output writing to stdout/stderr based on result.
 *
 * @param {string[]} argv - Arguments (typically process.argv.slice(2))
 * @param {Object} pulley - Pulley contract instance
 * @returns {Promise<import('../../../lib/result.cjs').Result<Object>>}
 */
async function main(argv, pulley) {
  // Parse global flags for output mode detection
  let globalFlags;
  let positionals;
  try {
    const parsed = parseArgs({
      args: argv,
      options: {
        json: { type: 'boolean', short: 'j', default: false },
        raw: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: true,
      strict: false,
    });
    globalFlags = parsed.values;
    positionals = parsed.positionals;
  } catch (_e) {
    globalFlags = { json: false, raw: false, help: false };
    positionals = argv.filter(a => !a.startsWith('-'));
  }

  // Route through Pulley
  const result = await pulley.route(positionals, argv);

  if (!result.ok) {
    process.stderr.write(`Error: ${result.error.message}\n`);
    process.exitCode = 1;
    return result;
  }

  // Determine output mode for formatting
  const outputMode = globalFlags.json ? 'json' : globalFlags.raw ? 'raw' : 'human';

  // Write output -- route may return { formatted } or { human, json, raw }
  if (result.value.formatted) {
    process.stdout.write(result.value.formatted + '\n');
  } else if (result.value.human || result.value.json || result.value.raw) {
    const formatted = formatOutput(result.value, outputMode);
    process.stdout.write(formatted + '\n');
  }

  return result;
}

module.exports = { main };
