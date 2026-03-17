// Dynamo > Ledger > Hooks > prompt-augment.cjs
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { healthGuard, logError } = require(path.join(__dirname, '..', '..', 'core.cjs'));
const { combinedSearch } = require(path.join(__dirname, '..', 'search.cjs'));
const { curateResults, generateSessionName } = require(path.join(__dirname, '..', 'curation.cjs'));
const { generateAndApplyName } = require(path.join(__dirname, '..', 'sessions.cjs'));

/**
 * UserPromptSubmit handler -- augment user prompts with relevant Graphiti memories.
 * Receives ctx object from dispatcher (includes project, scope, prompt, etc).
 */
module.exports = async function promptAugment(ctx) {
  // Skip empty or very short prompts (slash commands, etc.)
  if (!ctx.prompt || ctx.prompt.length < 10) return;

  // Health check
  const health = healthGuard(() => ({ healthy: true, detail: 'deferred to search' }));
  if (!health.healthy) return;

  try {
    // Search for relevant memories
    const results = await combinedSearch(ctx.prompt, ctx.scope, { hookName: 'prompt-augment' });

    if (!results) {
      // Still attempt session naming even if no search results
      await attemptSessionNaming(ctx);
      return;
    }

    // Curate results
    const curated = await curateResults(results, ctx.prompt, {
      projectName: ctx.project,
      sessionType: 'prompt',
      promptName: 'prompt-context',
      hookName: 'prompt-augment'
    });

    if (curated) {
      process.stdout.write('[RELEVANT MEMORY]\n\n' + curated);
    }

    // Attempt preliminary session naming
    await attemptSessionNaming(ctx);
  } catch (err) {
    logError('prompt-augment', 'Handler error: ' + err.message);
  }
};

/**
 * Generate a preliminary session name on the first substantial prompt.
 * Uses a temp flag file to ensure naming happens only once per session.
 */
async function attemptSessionNaming(ctx) {
  const flagPath = path.join(os.tmpdir(), 'dynamo-session-named-' + process.ppid);

  // Already named this session
  if (fs.existsSync(flagPath)) return;

  // Only name from substantial prompts
  if (!ctx.prompt || ctx.prompt.length < 20) return;

  try {
    // Mark as named (even if naming fails, to avoid retries)
    fs.writeFileSync(flagPath, '1', 'utf8');

    const timestamp = new Date().toISOString();
    await generateAndApplyName(
      timestamp,
      ctx.project,
      () => generateSessionName(ctx.prompt.slice(0, 200)),
      'preliminary',
      { hookName: 'prompt-augment' }
    );
  } catch (err) {
    logError('prompt-augment', 'Session naming error: ' + err.message);
  }
}
