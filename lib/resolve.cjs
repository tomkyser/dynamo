// Dynamo > Lib > resolve.cjs
'use strict';

const path = require('path');
const fs = require('fs');

let _layout = null;
let _paths = null;

/**
 * Detect whether we're running in repo layout or deployed layout.
 * In deployed layout, core.cjs exists at root level (alongside lib/).
 * In repo layout, core.cjs is inside dynamo/ subdirectory.
 * @returns {'repo' | 'deployed'}
 */
function detectLayout() {
  if (_layout) return _layout;
  const root = path.join(__dirname, '..');
  const deployedMarker = path.join(root, 'core.cjs');
  if (fs.existsSync(deployedMarker)) {
    _layout = 'deployed';
  } else {
    _layout = 'repo';
  }
  return _layout;
}

/**
 * Build the subsystem path map for the current layout.
 * @returns {Object<string, string>} Map of subsystem name -> directory path
 */
function getPaths() {
  if (_paths) return _paths;
  const layout = detectLayout();
  const root = path.join(__dirname, '..');

  if (layout === 'deployed') {
    // ~/.claude/dynamo/ -- dynamo files are at root level
    _paths = {
      dynamo:      root,
      ledger:      path.join(root, 'ledger'),
      switchboard: path.join(root, 'switchboard'),
      lib:         path.join(root, 'lib'),
      assay:       path.join(root, 'subsystems', 'assay'),
      terminus:    path.join(root, 'subsystems', 'terminus'),
      reverie:     path.join(root, 'subsystems', 'reverie'),
      cc:          path.join(root, 'cc'),
    };
  } else {
    // Repo -- consume layout.cjs as single source of truth
    _paths = require('./layout.cjs').getLayoutPaths(root);
  }
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
      `resolve('${subsystem}', '${file}'): not found in ${_layout} layout. ` +
      `Checked: ${fullPath}`
    );
  }
  return fullPath;
}

// Expose internals for testing
resolve._reset = () => { _layout = null; _paths = null; };
resolve._detectLayout = detectLayout;

module.exports = resolve;
