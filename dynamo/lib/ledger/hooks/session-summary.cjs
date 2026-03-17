// Dynamo > Ledger > Hooks > session-summary.cjs
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { logError } = require(path.join(__dirname, '..', '..', 'core.cjs'));
const { SCOPE } = require(path.join(__dirname, '..', 'scope.cjs'));
const { summarizeText, generateSessionName } = require(path.join(__dirname, '..', 'curation.cjs'));
const { addEpisode } = require(path.join(__dirname, '..', 'episodes.cjs'));
const { indexSession, generateAndApplyName } = require(path.join(__dirname, '..', 'sessions.cjs'));

/**
 * Stop handler -- summarize session and store in Graphiti.
 * This is the most complex handler with budget-based timeout management.
 * Receives ctx object from dispatcher (includes project, scope, last_assistant_message, etc).
 */
module.exports = async function sessionSummary(ctx) {
  // --- Infinite loop guard (regression test 10 contract) ---
  // Primary guard: check stop_hook_active flag from Claude Code
  if (ctx.stop_hook_active === true) return;

  // Secondary guard: check temp flag file to prevent re-entry
  const stopFlagPath = path.join(os.tmpdir(), 'dynamo-stop-active-' + process.ppid);
  if (fs.existsSync(stopFlagPath)) return;

  // Set flag to prevent re-entry
  try {
    fs.writeFileSync(stopFlagPath, '1', 'utf8');
  } catch (err) {
    logError('session-summary', 'Failed to write stop flag: ' + err.message);
  }

  // --- Budget-based timeout ---
  const startMs = Date.now();
  const budget = 25000; // 25s budget (5s buffer from 30s timeout)
  const remaining = () => budget - (Date.now() - startMs);

  let summary = '';
  let timestamp = '';
  let name = '';

  try {
    // --- Priority 1: Summarize + Graphiti write (MUST complete) ---
    if (remaining() > 3000 && ctx.last_assistant_message) {
      summary = await summarizeText(ctx.last_assistant_message.slice(0, 2000), {
        hookName: 'session-summary'
      });
    }

    if (summary && remaining() > 2000) {
      timestamp = new Date().toISOString();

      // Write to project scope
      await addEpisode(
        'Session summary (' + timestamp + '): ' + summary,
        ctx.scope,
        { hookName: 'session-summary' }
      );

      // Write to session scope
      await addEpisode(
        'Session summary: ' + summary,
        SCOPE.session(timestamp),
        { hookName: 'session-summary' }
      );
    }

    // --- Priority 2: Auto-naming via Haiku (SHOULD complete) ---
    if (summary && remaining() > 2000) {
      name = await generateAndApplyName(
        timestamp,
        ctx.project,
        () => generateSessionName(summary),
        'refined',
        { hookName: 'session-summary' }
      );
    }

    // --- Priority 3: sessions.json index (NICE to have) ---
    if (remaining() > 500 && timestamp) {
      indexSession(timestamp, ctx.project, name || '', 'auto', {
        hookName: 'session-summary'
      });
    }
  } catch (err) {
    logError('session-summary', 'Handler error: ' + err.message);
  } finally {
    // Cleanup: remove stop-active flag file
    try {
      fs.unlinkSync(stopFlagPath);
    } catch (cleanupErr) {
      // Ignore cleanup errors
    }
  }
};
