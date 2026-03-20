// Dynamo > Lib > layout.cjs
'use strict';

const path = require('path');

// PRE-MIGRATION layout (Plan 01 -- updated to target in Plan 02)
// Single source of truth for all path references (ARCH-04).

/**
 * Build the subsystem path map for a given root directory.
 * @param {string} root - Absolute path to the project/deployment root
 * @returns {Object<string, string>} Map of subsystem name -> directory path
 */
function getLayoutPaths(root) {
  return {
    dynamo:      path.join(root, 'dynamo'),
    ledger:      path.join(root, 'ledger'),
    switchboard: path.join(root, 'switchboard'),
    lib:         path.join(root, 'lib'),
    assay:       path.join(root, 'subsystems', 'assay'),
    terminus:    path.join(root, 'subsystems', 'terminus'),
    reverie:     path.join(root, 'subsystems', 'reverie'),
    cc:          path.join(root, 'cc'),
  };
}

/**
 * Build sync pair definitions for repo-to-deployed directory mapping.
 * @param {string} repoRoot - Absolute path to the repo root
 * @param {string} liveDir - Absolute path to the live deployment directory
 * @returns {Array<{repo: string, live: string, label: string, excludes: string[]}>}
 */
function getSyncPairs(repoRoot, liveDir) {
  const SYNC_EXCLUDES = [
    '.env', '.env.example', '.venv', '__pycache__', 'sessions.json',
    'hook-errors.log', '.DS_Store', '.last-sync', 'node_modules',
    'config.json', 'tests'
  ];
  return [
    { repo: path.join(repoRoot, 'dynamo'), live: liveDir, label: 'dynamo', excludes: [...SYNC_EXCLUDES, 'tests'] },
    { repo: path.join(repoRoot, 'ledger'), live: path.join(liveDir, 'ledger'), label: 'ledger', excludes: SYNC_EXCLUDES },
    { repo: path.join(repoRoot, 'switchboard'), live: path.join(liveDir, 'switchboard'), label: 'switchboard', excludes: SYNC_EXCLUDES },
    { repo: path.join(repoRoot, 'lib'), live: path.join(liveDir, 'lib'), label: 'lib', excludes: SYNC_EXCLUDES },
  ];
}

module.exports = { getLayoutPaths, getSyncPairs };
