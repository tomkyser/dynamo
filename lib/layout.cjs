// Dynamo > Lib > layout.cjs
'use strict';

const path = require('path');

// TARGET layout (Plan 02 -- six-subsystem structure)
// Single source of truth for all path references (ARCH-04).

/**
 * Build the subsystem path map for a given root directory.
 * @param {string} root - Absolute path to the project/deployment root
 * @returns {Object<string, string>} Map of subsystem name -> directory path
 */
function getLayoutPaths(root) {
  return {
    dynamo:      root,   // dynamo.cjs at root; config.json/VERSION in dynamo/ subdir
    ledger:      path.join(root, 'subsystems', 'ledger'),
    switchboard: path.join(root, 'subsystems', 'switchboard'),
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
    // Root-level files (dynamo.cjs, dynamo/config.json, dynamo/VERSION)
    { repo: repoRoot, live: liveDir, label: 'root', excludes: [...SYNC_EXCLUDES, 'subsystems', 'cc', 'lib', 'dynamo', '.planning', '.git', '.gitignore', '.claude', '.agents'], filesOnly: true },
    // dynamo/ meta (config.json handled by install, but VERSION + migrations need sync)
    { repo: path.join(repoRoot, 'dynamo'), live: path.join(liveDir, 'dynamo'), label: 'dynamo-meta', excludes: [...SYNC_EXCLUDES, 'tests'] },
    // Subsystems
    { repo: path.join(repoRoot, 'subsystems', 'switchboard'), live: path.join(liveDir, 'subsystems', 'switchboard'), label: 'switchboard', excludes: SYNC_EXCLUDES },
    { repo: path.join(repoRoot, 'subsystems', 'assay'), live: path.join(liveDir, 'subsystems', 'assay'), label: 'assay', excludes: SYNC_EXCLUDES },
    { repo: path.join(repoRoot, 'subsystems', 'ledger'), live: path.join(liveDir, 'subsystems', 'ledger'), label: 'ledger', excludes: SYNC_EXCLUDES },
    { repo: path.join(repoRoot, 'subsystems', 'terminus'), live: path.join(liveDir, 'subsystems', 'terminus'), label: 'terminus', excludes: SYNC_EXCLUDES },
    { repo: path.join(repoRoot, 'subsystems', 'reverie'), live: path.join(liveDir, 'subsystems', 'reverie'), label: 'reverie', excludes: SYNC_EXCLUDES },
    // cc/ adapter
    { repo: path.join(repoRoot, 'cc'), live: path.join(liveDir, 'cc'), label: 'cc', excludes: SYNC_EXCLUDES },
    // lib/ shared substrate
    { repo: path.join(repoRoot, 'lib'), live: path.join(liveDir, 'lib'), label: 'lib', excludes: SYNC_EXCLUDES },
  ];
}

module.exports = { getLayoutPaths, getSyncPairs };
