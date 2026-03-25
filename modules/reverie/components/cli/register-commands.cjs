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
const { createInspectHandlers } = require('./inspect.cjs');

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Registers all Reverie CLI commands with the Circuit API.
 *
 * Currently registers:
 *   - status: Operational dashboard (mode, fragments, Self Model version, etc.)
 *   - inspect fragment: Inspect a specific fragment by ID
 *   - inspect domains: List all domains with fragment counts
 *   - inspect associations: Show association graph around an entity
 *   - inspect self-model: Show complete Self Model state
 *   - inspect identity: Show Identity Core aspect
 *   - inspect relational: Show Relational Model aspect
 *   - inspect conditioning: Show Conditioning aspect
 *
 * Per Pitfall 1: Each subcommand registered individually (no catch-all 'inspect').
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

  // ---- inspect subcommands (7 total, per D-02) ----
  const inspectHandlers = createInspectHandlers(context);

  circuitApi.registerCommand('inspect fragment', inspectHandlers.handleInspectFragment, {
    description: 'Inspect a specific fragment',
  });
  registered++;

  circuitApi.registerCommand('inspect domains', inspectHandlers.handleInspectDomains, {
    description: 'List all domains with fragment counts',
  });
  registered++;

  circuitApi.registerCommand('inspect associations', inspectHandlers.handleInspectAssociations, {
    description: 'Show association graph around an entity',
  });
  registered++;

  circuitApi.registerCommand('inspect self-model', inspectHandlers.handleInspectSelfModel, {
    description: 'Show complete Self Model state',
  });
  registered++;

  circuitApi.registerCommand('inspect identity', inspectHandlers.handleInspectIdentity, {
    description: 'Show Identity Core aspect',
  });
  registered++;

  circuitApi.registerCommand('inspect relational', inspectHandlers.handleInspectRelational, {
    description: 'Show Relational Model aspect',
  });
  registered++;

  circuitApi.registerCommand('inspect conditioning', inspectHandlers.handleInspectConditioning, {
    description: 'Show Conditioning aspect',
  });
  registered++;

  return ok({ registered: registered });
}

module.exports = { registerReverieCommands };
