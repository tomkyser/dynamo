// Dynamo > Lib > resolve.cjs
'use strict';

const path = require('path');
const fs = require('fs');

let _paths = null;

/**
 * Build the subsystem path map.
 * Repo and deployed layouts are identical (six-subsystem structure).
 * @returns {Object<string, string>} Map of subsystem name -> directory path
 */
function getPaths() {
  if (_paths) return _paths;
  const root = path.join(__dirname, '..');
  _paths = require('./layout.cjs').getLayoutPaths(root);
  return _paths;
}

/**
 * Resolve a module path by logical subsystem name.
 * @param {string} subsystem - Logical name ('dynamo', 'ledger', 'switchboard', etc.)
 * @param {string} file - File name or relative path within the subsystem
 * @returns {string} Absolute file path
 * @throws {Error} If subsystem unknown or file not found
 */
function resolve(subsystem, file) {
  const paths = getPaths();
  const dir = paths[subsystem];
  if (!dir) {
    throw new Error(
      `resolve('${subsystem}', '${file}'): unknown subsystem '${subsystem}'. ` +
      `Known: ${Object.keys(paths).join(', ')}`
    );
  }
  const fullPath = path.join(dir, file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(
      `resolve('${subsystem}', '${file}'): not found. ` +
      `Checked: ${fullPath}`
    );
  }
  return fullPath;
}

/**
 * Resolve the true repo root directory.
 * When running from the git repo, __dirname is inside the repo.
 * When running from the deployed copy (~/.claude/dynamo/), reads the
 * .repo-path dotfile written by installShim() during install.
 * @returns {string} Absolute path to the repo root (or deployed root as fallback)
 */
function resolveRepoRoot() {
  const root = path.join(__dirname, '..');
  // If we're in a git repo, use that
  if (fs.existsSync(path.join(root, '.git'))) {
    return root;
  }
  // Otherwise read .repo-path dotfile
  const os = require('os');
  const repoPathFile = path.join(os.homedir(), '.claude', 'dynamo', '.repo-path');
  try {
    const repoPath = fs.readFileSync(repoPathFile, 'utf8').trim();
    if (repoPath && fs.existsSync(path.join(repoPath, 'dynamo.cjs'))) {
      return repoPath;
    }
  } catch (e) { /* .repo-path missing or unreadable */ }
  // Fallback to relative root
  return root;
}

// Expose internals for testing
resolve._reset = () => { _paths = null; };
resolve.resolveRepoRoot = resolveRepoRoot;

module.exports = resolve;
