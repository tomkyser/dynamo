// Dynamo > Reverie > Handlers > post-tool-use.cjs
'use strict';

const resolve = require('../../../lib/resolve.cjs');
const { logError } = require(resolve('lib', 'core.cjs'));
const { loadState, persistState } = require(resolve('reverie', 'state.cjs'));
const innerVoice = require(resolve('reverie', 'inner-voice.cjs'));

/**
 * Reverie PostToolUse handler -- cognitive pipeline delegation.
 * Loads state, calls processPostToolUse for activation map update,
 * persists updated state. Lightweight -- no injection output (no stdout write).
 */
module.exports = async function reveriePostToolUse(ctx) {
  try {
    const state = loadState();
    const toolData = {
      tool_name: ctx.tool_name || '',
      tool_input: ctx.tool_input || {}
    };
    const { updatedState } = innerVoice.processPostToolUse(toolData, state);
    persistState(updatedState);
    // PostToolUse is lightweight -- no injection output (no stdout write)
  } catch (err) {
    logError('reverie-post-tool-use', 'Handler error: ' + err.message);
  }
};
