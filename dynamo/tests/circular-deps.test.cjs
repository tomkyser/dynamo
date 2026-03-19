// Dynamo > Tests > circular-deps.test.cjs
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const { buildGraph, detectCycles } = require(path.join(REPO_ROOT, 'lib', 'dep-graph.cjs'));

// Known intentional cycles (allowlisted)
// core.cjs re-exports ledger modules via Object.assign after base exports.
// These ledger modules require core.cjs back for shared utilities.
const ALLOWLIST = [
  // core.cjs <-> mcp-client.cjs (fetchWithTimeout, loadConfig)
  [
    path.join(REPO_ROOT, 'dynamo', 'core.cjs'),
    path.join(REPO_ROOT, 'ledger', 'mcp-client.cjs'),
  ],
  // core.cjs <-> sessions.cjs (logError)
  [
    path.join(REPO_ROOT, 'dynamo', 'core.cjs'),
    path.join(REPO_ROOT, 'ledger', 'sessions.cjs'),
  ],
  // install.cjs <-> update.cjs (intra-switchboard: install calls update for migrations,
  // update calls install for copyTree -- both use deferred require() to break the cycle at runtime)
  [
    path.join(REPO_ROOT, 'switchboard', 'install.cjs'),
    path.join(REPO_ROOT, 'switchboard', 'update.cjs'),
  ],
];

describe('Circular dependency detection', () => {
  it('no circular require() chains in production modules (excluding allowlisted)', () => {
    const graph = buildGraph([
      path.join(REPO_ROOT, 'dynamo'),
      path.join(REPO_ROOT, 'ledger'),
      path.join(REPO_ROOT, 'switchboard'),
      path.join(REPO_ROOT, 'lib'),
    ]);

    const cycles = detectCycles(graph, ALLOWLIST);

    if (cycles.length > 0) {
      const formatted = cycles.map(c =>
        c.map(f => path.relative(REPO_ROOT, f)).join(' -> ')
      ).join('\n  ');
      assert.fail(`Found ${cycles.length} circular dependency chain(s):\n  ${formatted}`);
    }

    assert.equal(cycles.length, 0);
  });
});
