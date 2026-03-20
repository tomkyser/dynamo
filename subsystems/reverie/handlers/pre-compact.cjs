// Dynamo > Reverie > Handlers > pre-compact.cjs
'use strict';

const resolve = require('../../../lib/resolve.cjs');
const { logError } = require(resolve('lib', 'core.cjs'));
const { loadState, persistState } = require(resolve('reverie', 'state.cjs'));
const innerVoice = require(resolve('reverie', 'inner-voice.cjs'));

/**
 * Reverie PreCompact handler -- cognitive pipeline delegation.
 * Loads state, calls processPreCompact, persists updated state,
 * writes compact summary to stdout.
 */
module.exports = async function reveriePreCompact(ctx) {
  try {
    const state = loadState();
    const compactData = { cwd: ctx.cwd || process.cwd() };
    const { summary, updatedState } = innerVoice.processPreCompact(compactData, state);
    persistState(updatedState);

    if (summary) {
      process.stdout.write('[RELEVANT MEMORY]\n\n' + summary);
    }
  } catch (err) {
    logError('reverie-pre-compact', 'Handler error: ' + err.message);
  }
};
