'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { ok, err } = require('./result.cjs');

/**
 * Cached root directory. Set on first successful discovery, cleared by _resetRoot().
 * @type {string|null}
 */
let _cachedRoot = null;

/**
 * Discovers the Dynamo root directory by walking up from startDir looking for
 * the .dynamo marker file or config.json fallback.
 *
 * Results are cached after first successful discovery. Use _resetRoot() to clear.
 *
 * @param {string} startDir - The directory to start searching from
 * @returns {import('./result.cjs').Result<string>} Ok with the root directory path, or Err with ROOT_NOT_FOUND
 */
function discoverRoot(startDir) {
  if (_cachedRoot !== null) {
    return ok(_cachedRoot);
  }

  let dir = path.resolve(startDir);

  while (true) {
    // Check .dynamo marker first (primary)
    if (fs.existsSync(path.join(dir, '.dynamo'))) {
      _cachedRoot = dir;
      return ok(dir);
    }

    // Check config.json as fallback (secondary)
    if (fs.existsSync(path.join(dir, 'config.json'))) {
      _cachedRoot = dir;
      return ok(dir);
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      // Reached filesystem root without finding marker
      return err('ROOT_NOT_FOUND', 'Could not find Dynamo root (.dynamo marker or config.json)', { startDir });
    }

    dir = parent;
  }
}

/**
 * Clears the cached root directory, forcing rediscovery on the next call
 * to discoverRoot(). Exported for test use only (underscore prefix convention).
 * @returns {void}
 */
function _resetRoot() {
  _cachedRoot = null;
}

module.exports = { discoverRoot, _resetRoot };
