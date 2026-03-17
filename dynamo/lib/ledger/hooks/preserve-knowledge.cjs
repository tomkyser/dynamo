// Dynamo > Ledger > Hooks > preserve-knowledge.cjs
'use strict';

const path = require('path');
const { healthGuard, logError } = require(path.join(__dirname, '..', '..', 'core.cjs'));
const { summarizeText } = require(path.join(__dirname, '..', 'curation.cjs'));
const { addEpisode } = require(path.join(__dirname, '..', 'episodes.cjs'));

/**
 * PreCompact handler -- extract and preserve key knowledge before context compaction.
 * Receives ctx object from dispatcher (includes project, scope, custom_instructions, etc).
 */
module.exports = async function preserveKnowledge(ctx) {
  // Health check
  const health = healthGuard(() => ({ healthy: true, detail: 'deferred to summarize' }));
  if (!health.healthy) return;

  try {
    // Get custom instructions text
    const instructions = ctx.custom_instructions || '';

    // Skip if custom instructions are too short to summarize meaningfully
    if (instructions.length < 50) return;

    // Summarize through Haiku
    const summary = await summarizeText(instructions, {
      hookName: 'preserve-knowledge',
      promptName: 'precompact'
    });

    if (summary) {
      // Store in Graphiti
      await addEpisode('Pre-compact knowledge: ' + summary, ctx.scope, {
        hookName: 'preserve-knowledge'
      });

      // Re-inject to stdout so Claude retains this context post-compaction
      process.stdout.write('[PRESERVED KNOWLEDGE]\n\n' + summary);
    }
  } catch (err) {
    logError('preserve-knowledge', 'Handler error: ' + err.message);
  }
};
