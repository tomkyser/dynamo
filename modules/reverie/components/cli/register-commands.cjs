'use strict';

/**
 * Reverie CLI command registration orchestrator.
 *
 * Registers all Reverie CLI subcommands via Circuit's registerCommand(),
 * which auto-prefixes with the module name ('reverie') for Pulley routing.
 *
 * Registered command groups:
 * - history: Timeline lenses (sessions, fragments, consolidations) per D-03
 * - reset: Scoped resets with --confirm gate per D-04
 *
 * @module reverie/components/cli/register-commands
 */

const { ok } = require('../../../../lib/result.cjs');
const { createHistoryHandlers } = require('./history.cjs');
const { createResetHandlers } = require('./reset.cjs');

/**
 * Registers all Reverie CLI commands with the Circuit API.
 *
 * @param {Object} circuitApi - Circuit module API with registerCommand()
 * @param {Object} context - Dependency injection context for handlers
 * @param {Object} context.journal - Journal provider
 * @param {Object} context.wire - Wire service
 * @param {Object} context.switchboard - Switchboard for events
 * @param {Object} context.selfModel - Self Model manager
 * @param {Object} context.fragmentWriter - FragmentWriter instance
 * @param {Object} context.lathe - Lathe filesystem service
 * @param {string} context.dataDir - Reverie data directory path
 * @returns {import('../../../../lib/result.cjs').Result<{registered: number}>}
 */
function registerReverieCommands(circuitApi, context) {
  let count = 0;

  // ---- History commands (D-03) ----

  const historyHandlers = createHistoryHandlers(context);

  circuitApi.registerCommand('history sessions', historyHandlers.handleHistorySessions, {
    description: 'Chronological session list',
  });
  count++;

  circuitApi.registerCommand('history fragments', historyHandlers.handleHistoryFragments, {
    description: 'Fragment formation timeline',
  });
  count++;

  circuitApi.registerCommand('history consolidations', historyHandlers.handleHistoryConsolidations, {
    description: 'REM consolidation events',
  });
  count++;

  // ---- Reset commands (D-04) ----

  const resetHandlers = createResetHandlers(context);

  circuitApi.registerCommand('reset fragments', resetHandlers.handleResetFragments, {
    description: 'Wipe all fragments, keep Self Model',
  });
  count++;

  circuitApi.registerCommand('reset self-model', resetHandlers.handleResetSelfModel, {
    description: 'Reinitialize Self Model from cold start',
  });
  count++;

  circuitApi.registerCommand('reset all', resetHandlers.handleResetAll, {
    description: 'Full factory reset',
  });
  count++;

  return ok({ registered: count });
}

module.exports = { registerReverieCommands };
