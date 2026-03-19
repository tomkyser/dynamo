// Dynamo > Ledger > Hooks > session-start.cjs
'use strict';

const path = require('path');
const fs = require('fs');

const resolve = require('../../lib/resolve.cjs');
const { healthGuard, logError } = require(resolve('dynamo', 'core.cjs'));
const { combinedSearch } = require(path.join(__dirname, '..', 'search.cjs'));
const { curateResults } = require(path.join(__dirname, '..', 'curation.cjs'));
const { MCPClient } = require(path.join(__dirname, '..', 'mcp-client.cjs'));

/**
 * SessionStart handler -- bootstrap session with Graphiti memory context.
 * Receives ctx object from dispatcher (includes project, scope, source, etc).
 */
module.exports = async function sessionStart(ctx) {
  // Compact resumes are handled by PreCompact
  if (ctx.source === 'compact') return;

  // Health check -- if unhealthy, output warning and return
  const health = healthGuard(() => {
    // Synchronous health probe: attempt to construct an MCP client
    // (actual async checks happen in the search calls below)
    return { healthy: true, detail: 'deferred to search' };
  });

  if (!health.healthy) {
    process.stdout.write('[Graphiti: server offline -- no memory context available]');
    return;
  }

  try {
    // Build search queries for session context
    const queries = [
      `${ctx.project} session context`,
      `${ctx.project} recent decisions`,
      `${ctx.project} established patterns`
    ];

    // Run 3 searches in parallel
    const results = await Promise.all(
      queries.map(q => combinedSearch(q, ctx.scope, { hookName: 'session-start' }))
    );

    const rawResults = results.filter(Boolean).join('\n\n');
    if (!rawResults) {
      process.stdout.write('[GRAPHITI MEMORY CONTEXT]\n\n- No memory context available yet');
      return;
    }

    // Curate results through Haiku
    const curated = await curateResults(rawResults, 'session startup', {
      projectName: ctx.project,
      sessionType: ctx.source || 'startup',
      hookName: 'session-start'
    });

    // Format output
    let output = '[GRAPHITI MEMORY CONTEXT]\n\n' + curated;

    // Tag if degraded (uncurated)
    if (curated.includes('[uncurated]')) {
      output += '\n[uncurated]';
    }

    process.stdout.write(output);
  } catch (err) {
    logError('session-start', 'Handler error: ' + err.message);
    process.stdout.write('[Graphiti: error loading memory context]');
  }
};
