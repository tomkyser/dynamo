'use strict';

/**
 * Reverie CLI command registration orchestrator.
 *
 * Registers all Reverie CLI commands with the Circuit API. Commands are
 * auto-prefixed by Circuit to 'reverie {name}' in Pulley.
 *
 * Per INT-02: CLI surface via Pulley.
 * Per Pitfall 1: Each subcommand registered separately (no catch-all).
 *
 * @module reverie/components/cli/register-commands
 */

const { ok } = require('../../../../lib/result.cjs');
const { createStatusHandler } = require('./status.cjs');

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Registers all Reverie CLI commands with the Circuit API.
 *
 * Currently registers:
 *   - status: Operational dashboard (mode, fragments, Self Model version, etc.)
 *
 * This function is extended by subsequent plans to add inspect, history,
 * and reset commands.
 *
 * @param {Object} circuitApi - Scoped Circuit API with registerCommand()
 * @param {Object} context - Reverie component context
 * @param {Object|null} context.modeManager - Mode Manager
 * @param {Object|null} context.selfModel - Self Model
 * @param {Object|null} context.journal - Journal provider
 * @param {Object|null} context.switchboard - Switchboard service
 * @param {Object|null} context.wire - Wire service
 * @param {Object|null} context.formationPipeline - Formation pipeline
 * @returns {import('../../../../lib/result.cjs').Result<{registered: number}>}
 */
function registerReverieCommands(circuitApi, context) {
  let registered = 0;

  // ---- status ----
  const statusHandler = createStatusHandler(context);
  circuitApi.registerCommand('status', statusHandler.handle, {
    description: 'Show Reverie operational dashboard',
  });
  registered++;

  return ok({ registered: registered });
}

module.exports = { registerReverieCommands };
