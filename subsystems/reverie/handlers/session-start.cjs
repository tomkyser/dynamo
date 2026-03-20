// Dynamo > Reverie > Handlers > session-start.cjs
'use strict';

const resolve = require('../../../lib/resolve.cjs');
const { loadConfig, logError } = require(resolve('lib', 'core.cjs'));
const { loadState, persistState } = require(resolve('reverie', 'state.cjs'));
const innerVoice = require(resolve('reverie', 'inner-voice.cjs'));

/**
 * Reverie SessionStart handler -- cognitive pipeline delegation.
 * Loads state, calls processSessionStart, persists updated state,
 * writes briefing to stdout. Per D-14: always triggers deliberation.
 */
module.exports = async function reverieSessionStart(ctx) {
  try {
    const config = loadConfig();
    const state = loadState();
    const sessionData = {
      project: ctx.project || 'unknown',
      scope: ctx.scope || 'global',
      cwd: ctx.cwd || process.cwd()
    };
    const { briefing, updatedState } = innerVoice.processSessionStart(sessionData, state, { config });
    persistState(updatedState);

    if (briefing) {
      process.stdout.write('[RELEVANT MEMORY]\n\n' + briefing);
    }

    // Per D-14: SessionStart always triggers deliberation
    // Return spawn instruction for dispatcher to include in additionalContext
    if (updatedState.processing.deliberation_pending) {
      process.stdout.write('\n\n[INNER VOICE: Session briefing queued for deep analysis. ' +
        'Spawn the inner-voice subagent for comprehensive session context.]');
    }
  } catch (err) {
    logError('reverie-session-start', 'Handler error: ' + err.message);
  }
};
