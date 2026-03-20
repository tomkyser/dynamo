// Dynamo > Tests > circular-deps.test.cjs
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const { buildGraph, detectCycles } = require(path.join(REPO_ROOT, 'lib', 'dep-graph.cjs'));

// Known intentional cycles (allowlisted)
// core.cjs re-exports subsystem modules via Object.assign after base exports.
// These modules require core.cjs back for shared utilities.
const ALLOWLIST = [
  // core.cjs <-> mcp-client.cjs (fetchWithTimeout, loadConfig)
  [
    path.join(REPO_ROOT, 'lib', 'core.cjs'),
    path.join(REPO_ROOT, 'subsystems', 'terminus', 'mcp-client.cjs'),
  ],
  // core.cjs <-> sessions.cjs cycle removed -- core.cjs no longer re-exports sessions.cjs
  // install.cjs <-> update.cjs (intra-switchboard: install calls update for migrations,
  // update calls install for copyTree -- both use deferred require() to break the cycle at runtime)
  [
    path.join(REPO_ROOT, 'subsystems', 'switchboard', 'install.cjs'),
    path.join(REPO_ROOT, 'subsystems', 'switchboard', 'update.cjs'),
  ],
];

describe('Circular dependency detection', () => {
  it('no circular require() chains in production modules (excluding allowlisted)', () => {
    const graph = buildGraph([
      path.join(REPO_ROOT, 'subsystems', 'switchboard'),
      path.join(REPO_ROOT, 'subsystems', 'assay'),
      path.join(REPO_ROOT, 'subsystems', 'ledger'),
      path.join(REPO_ROOT, 'subsystems', 'terminus'),
      path.join(REPO_ROOT, 'cc'),
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
