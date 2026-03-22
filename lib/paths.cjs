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
 * Creates a path registry object containing absolute paths for all Dynamo
 * directory layout locations, computed from the given root directory.
 *
 * @param {string} rootDir - The Dynamo root directory (absolute path)
 * @returns {DynamoPaths} Object with absolute paths for all layout locations
 */
function createPaths(rootDir) {
  return {
    root: rootDir,
    lib: path.join(rootDir, 'lib'),
    core: path.join(rootDir, 'core'),
    services: path.join(rootDir, 'core', 'services'),
    providers: path.join(rootDir, 'core', 'providers'),
    armature: path.join(rootDir, 'core', 'armature'),
    sdk: path.join(rootDir, 'core', 'sdk'),
    circuit: path.join(rootDir, 'core', 'sdk', 'circuit'),
    pulley: path.join(rootDir, 'core', 'sdk', 'pulley'),
    plugins: path.join(rootDir, 'plugins'),
    modules: path.join(rootDir, 'modules'),
    extensions: path.join(rootDir, 'extensions'),
    config: path.join(rootDir, 'config.json'),
  };
}

/**
 * @typedef {Object} DynamoPaths
 * @property {string} root - Dynamo root directory
 * @property {string} lib - Core library directory
 * @property {string} core - Core directory
 * @property {string} services - Core services directory
 * @property {string} providers - Core providers directory
 * @property {string} armature - Framework directory
 * @property {string} sdk - SDK directory
 * @property {string} circuit - Module API directory
 * @property {string} pulley - CLI/MCP endpoints directory
 * @property {string} plugins - Plugins directory
 * @property {string} modules - Modules directory
 * @property {string} extensions - Extensions directory
 * @property {string} config - Config file path
 */

/**
 * Convenience function that discovers the Dynamo root from the given start
 * directory and returns a full path registry.
 *
 * @param {string} startDir - The directory to start searching from
 * @returns {import('./result.cjs').Result<DynamoPaths>} Ok with path registry, or Err if root not found
 */
function getPaths(startDir) {
  const result = discoverRoot(startDir);
  if (!result.ok) {
    return result;
  }
  return ok(createPaths(result.value));
}

/**
 * Clears the cached root directory, forcing rediscovery on the next call
 * to discoverRoot(). Exported for test use only (underscore prefix convention).
 * @returns {void}
 */
function _resetRoot() {
  _cachedRoot = null;
}

module.exports = { discoverRoot, createPaths, getPaths, _resetRoot };
