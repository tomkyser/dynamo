// Dynamo > Reverie > Handlers > stop.cjs
'use strict';

const resolve = require('../../../lib/resolve.cjs');
const { loadConfig, logError } = require(resolve('lib', 'core.cjs'));
const { loadState, persistState } = require(resolve('reverie', 'state.cjs'));
const innerVoice = require(resolve('reverie', 'inner-voice.cjs'));

/**
 * Reverie Stop handler -- cognitive pipeline delegation.
 * Loads state, calls processStop, persists updated state.
 * Per D-15: always triggers deliberation for REM Tier 3 synthesis.
 */
module.exports = async function reverieStop(ctx) {
  try {
    const config = loadConfig();
    const state = loadState();
    const sessionData = {
      project: ctx.project || 'unknown',
      scope: ctx.scope || 'global',
      summary: ctx.summary || ''
    };
    const { synthesis, updatedState } = innerVoice.processStop(sessionData, state, { config });
    persistState(updatedState);

    // Per D-15: Stop always triggers deliberation for REM Tier 3
    if (updatedState.processing.deliberation_pending) {
      // The deliberation will happen via the inner-voice subagent
      // which is spawned by the session model reading the additionalContext
      logError('reverie-stop', 'REM Tier 3 deliberation queued, correlation_id=' +
        updatedState.processing.last_deliberation_id);
    }

    // Write template synthesis as fallback (subagent will produce fuller version)
    if (synthesis && synthesis.synthesis) {
      process.stdout.write('[RELEVANT MEMORY]\n\n' + synthesis.synthesis);
    }
  } catch (err) {
    logError('reverie-stop', 'Handler error: ' + err.message);
  }
};
