// Dynamo > Reverie > Handlers > user-prompt.cjs
'use strict';

const resolve = require('../../../lib/resolve.cjs');
const { loadConfig, logError } = require(resolve('lib', 'core.cjs'));
const { loadState, persistState } = require(resolve('reverie', 'state.cjs'));
const innerVoice = require(resolve('reverie', 'inner-voice.cjs'));

/**
 * Reverie UserPromptSubmit handler -- cognitive pipeline delegation.
 * Loads state, consumes any pending deliberation result (PATH-05 state bridge),
 * calls processUserPrompt, persists updated state, writes injection to stdout.
 * Includes deliberation spawn instruction when deliberation path selected.
 */
module.exports = async function reverieUserPrompt(ctx) {
  try {
    const config = loadConfig();
    const state = loadState();

    // Check for pending deliberation results (PATH-05 state bridge)
    const pendingResult = innerVoice.consumeDeliberationResult(state);

    const promptData = {
      prompt: ctx.prompt || '',
      project: ctx.project || 'unknown',
      scope: ctx.scope || 'global'
    };

    const { injection, updatedState, pathSelected } = innerVoice.processUserPrompt(
      promptData, state, pendingResult, { config }
    );

    persistState(updatedState);

    if (injection) {
      process.stdout.write('[RELEVANT MEMORY]\n\n' + injection);
    }

    // If deliberation path selected, include spawn instruction (Pattern 5)
    if (pathSelected === 'deliberation' && updatedState.processing.deliberation_pending) {
      const reason = updatedState.processing.deliberation_type || 'analysis';
      process.stdout.write('\n\n[INNER VOICE: Deep analysis queued (' + reason + '). ' +
        'Spawn the inner-voice subagent to process queued entities.]');
    }
  } catch (err) {
    logError('reverie-user-prompt', 'Handler error: ' + err.message);
  }
};
