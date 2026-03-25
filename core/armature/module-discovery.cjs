'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ok, err } = require('../../lib/result.cjs');

/**
 * Discovers modules by scanning a directory for subdirectories containing manifest.cjs.
 *
 * Returns an empty array if the directory does not exist (graceful degradation).
 * Only considers direct subdirectories -- does not recurse.
 * Parallels discoverPlugins() from core/armature/plugin.cjs.
 *
 * @param {string} modulesDir - Absolute path to the modules directory
 * @returns {string[]} Array of absolute paths to module directories
 */
function discoverModules(modulesDir) {
  if (!fs.existsSync(modulesDir)) {
    return [];
  }

  const entries = fs.readdirSync(modulesDir, { withFileTypes: true });
  const modulePaths = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const moduleDir = path.join(modulesDir, entry.name);
    const manifestPath = path.join(moduleDir, 'manifest.cjs');

    if (fs.existsSync(manifestPath)) {
      modulePaths.push(moduleDir);
    }
  }

  return modulePaths;
}

/**
 * Resolves a manifest from a required manifest.cjs module.
 *
 * Handles three export patterns:
 * 1. Direct export: `module.exports = { name, version, main, ... }`
 * 2. Named export: `module.exports = { REVERIE_MANIFEST: { name, version, main, ... } }`
 * 3. Default export: `module.exports = { default: { name, version, main, ... } }`
 *
 * For named exports, finds the first value that has a `name` and `main` property.
 *
 * @param {Object} manifestModule - The required manifest.cjs module
 * @returns {Object|null} The resolved manifest object, or null if not found
 */
function resolveManifest(manifestModule) {
  // Direct export: module.exports = { name, version, main, ... }
  if (manifestModule.name && manifestModule.main) {
    return manifestModule;
  }

  // Default export
  if (manifestModule.default && manifestModule.default.name && manifestModule.default.main) {
    return manifestModule.default;
  }

  // Named export: find first value that looks like a manifest
  for (const key of Object.keys(manifestModule)) {
    const val = manifestModule[key];
    if (val && typeof val === 'object' && val.name && val.main) {
      return val;
    }
  }

  return null;
}

/**
 * Loads a module from a directory.
 *
 * Reads manifest.cjs, resolves the manifest export, checks the enabled flag,
 * validates required fields, and resolves the entry point path.
 * Parallels loadPlugin() from core/armature/plugin.cjs.
 *
 * @param {string} moduleDir - Absolute path to the module directory
 * @returns {import('../../lib/result.cjs').Result<{name: string, manifest: Object, entryPath: string}>}
 */
function loadModule(moduleDir) {
  // 1. Require manifest.cjs
  let manifestModule;
  try {
    const manifestPath = path.join(moduleDir, 'manifest.cjs');
    manifestModule = require(manifestPath);
  } catch (e) {
    return err('MODULE_LOAD_FAILED', `Failed to load manifest.cjs from "${moduleDir}": ${e.message}`, {
      moduleDir,
      error: e.message,
    });
  }

  // 2. Resolve manifest from exports
  const manifest = resolveManifest(manifestModule);
  if (!manifest || !manifest.name || !manifest.main) {
    return err('MODULE_INVALID_MANIFEST', `Invalid manifest in "${moduleDir}": missing required fields (name, main)`, {
      moduleDir,
    });
  }

  // 3. Check enabled
  if (manifest.enabled === false) {
    return err('MODULE_DISABLED', `Module "${manifest.name}" is disabled`, {
      name: manifest.name,
    });
  }

  // 4. Resolve entry path and verify it exists
  const entryPath = path.join(moduleDir, manifest.main);
  if (!fs.existsSync(entryPath)) {
    return err('MODULE_ENTRY_NOT_FOUND', `Module "${manifest.name}" entry point not found: ${entryPath}`, {
      name: manifest.name,
      entryPath,
    });
  }

  // 5. Return success
  return ok({ name: manifest.name, manifest, entryPath });
}

module.exports = { discoverModules, loadModule };
