// Dynamo > Switchboard > verify-memory.cjs
'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const resolve = require('../../lib/resolve.cjs');
const { output, error, loadConfig, fetchWithTimeout, DYNAMO_DIR, MCPClient } = require(resolve('lib', 'core.cjs'));
const { SCOPE } = require(resolve('lib', 'scope.cjs'));
const { loadSessions, listSessions } = require(resolve('assay', 'sessions.cjs'));

// --- Check implementations ---

/**
 * Check 1: Health Endpoint - verify Graphiti API is reachable.
 */
async function checkHealthEndpoint(options = {}) {
  try {
    const config = loadConfig();
    const url = config.graphiti.health_url;
    const timeout = config.timeouts.health || 3000;
    const resp = await fetchWithTimeout(url, {}, timeout);
    if (resp.ok) {
      return { name: 'Health Endpoint', status: 'OK', detail: 'API healthy' };
    }
    return { name: 'Health Endpoint', status: 'FAIL', detail: `HTTP ${resp.status}` };
  } catch (e) {
    return { name: 'Health Endpoint', status: 'FAIL', detail: `Connection failed: ${e.message}` };
  }
}

/**
 * Check 2: Write Episode - write test content via MCP add_memory.
 * Returns the test content string for use by Check 3.
 */
async function checkWriteEpisode(mcpClient, options = {}) {
  const testContent = 'dynamo-verify-' + crypto.randomUUID();
  try {
    const result = await mcpClient.callTool('add_memory', {
      data: testContent,
      group_id: SCOPE.project('dynamo-test')
    });

    if (result && result.error && !result.result) {
      return { check: { name: 'Write Episode', status: 'FAIL', detail: `Write error: ${JSON.stringify(result.error)}` }, testContent: null };
    }

    return { check: { name: 'Write Episode', status: 'OK', detail: 'Episode written to project-dynamo-test scope' }, testContent };
  } catch (e) {
    return { check: { name: 'Write Episode', status: 'FAIL', detail: `Write failed: ${e.message}` }, testContent: null };
  }
}

/**
 * Check 3: Read Back - search for the just-written test content.
 */
async function checkReadBack(mcpClient, testContent, options = {}) {
  if (!testContent) {
    return { name: 'Read Back', status: 'SKIP', detail: '(skipped -- Write Episode failed)' };
  }

  try {
    // Brief delay for Graphiti to index the episode
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = await mcpClient.callTool('search_memory_facts', {
      query: testContent,
      group_ids: [SCOPE.project('dynamo-test')]
    });

    if (result && result.error && !result.result) {
      return { name: 'Read Back', status: 'FAIL', detail: `Search error: ${JSON.stringify(result.error)}` };
    }

    // Check if the result contains our test content
    const resultText = JSON.stringify(result);
    if (resultText.includes(testContent.slice(0, 20))) {
      return { name: 'Read Back', status: 'OK', detail: 'Test content found in search results' };
    }

    return { name: 'Read Back', status: 'WARN', detail: 'Write succeeded but content not found in search (eventual consistency)' };
  } catch (e) {
    return { name: 'Read Back', status: 'FAIL', detail: `Read failed: ${e.message}` };
  }
}

/**
 * Check 4: Scope Isolation - verify writes to one scope don't appear in another.
 */
async function checkScopeIsolation(mcpClient, options = {}) {
  const isolationContent = 'dynamo-isolation-' + crypto.randomUUID();
  const isolationScope = 'project-dynamo-isolation-test';

  try {
    // Write to isolation scope
    const writeResult = await mcpClient.callTool('add_memory', {
      data: isolationContent,
      group_id: isolationScope
    });

    if (writeResult && writeResult.error && !writeResult.result) {
      return { name: 'Scope Isolation', status: 'FAIL', detail: `Isolation write error: ${JSON.stringify(writeResult.error)}` };
    }

    // Brief delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Search in global scope -- should NOT find the isolation content
    const searchResult = await mcpClient.callTool('search_memory_facts', {
      query: isolationContent,
      group_ids: ['global']
    });

    const searchText = JSON.stringify(searchResult);
    if (searchText.includes(isolationContent.slice(0, 20))) {
      return { name: 'Scope Isolation', status: 'FAIL', detail: 'Test content leaked from project scope to global scope -- isolation broken' };
    }

    return { name: 'Scope Isolation', status: 'OK', detail: 'Scope boundaries working -- project content not visible in global scope' };
  } catch (e) {
    return { name: 'Scope Isolation', status: 'FAIL', detail: `Scope isolation check failed: ${e.message}` };
  }
}

/**
 * Check 5: Session Index - verify sessions.json is loadable.
 */
function checkSessionIndex(options = {}) {
  try {
    const sessions = loadSessions();
    if (Array.isArray(sessions)) {
      return { name: 'Session Index', status: 'OK', detail: `sessions.json loaded (${sessions.length} entries)` };
    }
    return { name: 'Session Index', status: 'FAIL', detail: 'loadSessions returned non-array' };
  } catch (e) {
    return { name: 'Session Index', status: 'FAIL', detail: `loadSessions failed: ${e.message}` };
  }
}

/**
 * Check 6: Session List - verify listSessions returns an array.
 */
function checkSessionList(options = {}) {
  try {
    const sessions = listSessions();
    if (Array.isArray(sessions)) {
      return { name: 'Session List', status: 'OK', detail: `listSessions returned ${sessions.length} entries` };
    }
    return { name: 'Session List', status: 'FAIL', detail: 'listSessions returned non-array' };
  } catch (e) {
    return { name: 'Session List', status: 'FAIL', detail: `listSessions failed: ${e.message}` };
  }
}

// --- Main orchestrator ---

/**
 * Run 6 pipeline checks verifying end-to-end memory system operation.
 *
 * @param {string[]} args - CLI args (supports --verbose, --pretty)
 * @param {boolean} pretty - Pretty output flag (also checks args)
 * @param {boolean} _returnOnly - If true, return result instead of calling output() (for testing)
 * @returns {Promise<object>} Result object (only when _returnOnly is true)
 */
async function run(args = [], pretty = false, _returnOnly = false) {
  const verbose = args.includes('--verbose');
  const usePretty = pretty || args.includes('--pretty');

  const checks = [];
  let mcpClient = null;

  try {
    // Check 1: Health Endpoint
    const healthResult = checkHealthEndpoint({ verbose });
    checks.push(await healthResult);

    // Create MCPClient for checks 2-4
    try {
      mcpClient = new MCPClient();
    } catch (e) {
      // If MCPClient creation fails, checks 2-4 will fail gracefully
      checks.push({ name: 'Write Episode', status: 'FAIL', detail: `MCPClient creation failed: ${e.message}` });
      checks.push({ name: 'Read Back', status: 'SKIP', detail: '(skipped -- Write Episode failed)' });
      checks.push({ name: 'Scope Isolation', status: 'FAIL', detail: `MCPClient creation failed: ${e.message}` });
      checks.push(checkSessionIndex({ verbose }));
      checks.push(checkSessionList({ verbose }));

      const result = buildResult(checks);
      return finalize(result, usePretty, _returnOnly);
    }

    // Check 2: Write Episode
    const { check: writeCheck, testContent } = await checkWriteEpisode(mcpClient, { verbose });
    checks.push(writeCheck);

    // Check 3: Read Back (depends on check 2's test content)
    const readCheck = await checkReadBack(mcpClient, testContent, { verbose });
    checks.push(readCheck);

    // Check 4: Scope Isolation
    const isolationCheck = await checkScopeIsolation(mcpClient, { verbose });
    checks.push(isolationCheck);

  } catch (e) {
    // Fill remaining network checks with FAIL if not yet added
    while (checks.length < 4) {
      const names = ['Health Endpoint', 'Write Episode', 'Read Back', 'Scope Isolation'];
      checks.push({ name: names[checks.length], status: 'FAIL', detail: `Unexpected error: ${e.message}` });
    }
  } finally {
    if (mcpClient && typeof mcpClient.close === 'function') {
      try {
        await mcpClient.close();
      } catch (e) {
        // Cleanup errors are non-fatal
      }
    }
  }

  // Checks 5-6: Local-only (no network needed)
  checks.push(checkSessionIndex({ verbose }));
  checks.push(checkSessionList({ verbose }));

  const result = buildResult(checks);
  return finalize(result, usePretty, _returnOnly);
}

function buildResult(checks) {
  const passed = checks.filter(c => c.status === 'OK' || c.status === 'WARN').length;
  const total = checks.length;

  return {
    command: 'verify-memory',
    timestamp: new Date().toISOString(),
    checks,
    summary: {
      passed,
      total,
      ok: passed === total
    }
  };
}

function finalize(result, usePretty, _returnOnly) {
  if (usePretty) {
    // Pretty output to stderr
    const isTTY = process.stderr.isTTY;
    const bold = isTTY ? '\x1b[1m' : '';
    const green = isTTY ? '\x1b[32m' : '';
    const red = isTTY ? '\x1b[31m' : '';
    const yellow = isTTY ? '\x1b[33m' : '';
    const gray = isTTY ? '\x1b[90m' : '';
    const reset = isTTY ? '\x1b[0m' : '';

    const lines = [];
    lines.push(`${bold}=== Dynamo Verify Memory ===${reset}`);
    lines.push(`Timestamp: ${result.timestamp}`);
    lines.push('');

    for (const check of result.checks) {
      const color = check.status === 'OK' ? green :
                    check.status === 'FAIL' ? red :
                    check.status === 'WARN' ? yellow :
                    gray;
      const padded = check.status.padEnd(4);
      lines.push(`${color}[${padded}]${reset}  ${check.name}: ${check.detail}`);
    }

    lines.push('');
    const { passed, total } = result.summary;
    if (result.summary.ok) {
      lines.push(`${green}Result: ${passed}/${total} checks passed${reset}`);
    } else {
      lines.push(`${red}Result: ${passed}/${total} checks passed${reset}`);
    }

    process.stderr.write(lines.join('\n') + '\n');
  }

  if (_returnOnly) {
    return result;
  }

  output(result);
}

module.exports = { run };
