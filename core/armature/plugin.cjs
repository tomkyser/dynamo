'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ok, err } = require('../../lib/result.cjs');
const { validate } = require('../../lib/schema.cjs');

/**
 * Schema definition for plugin manifests (plugin.json).
 *
 * Defines the expected shape of every plugin manifest file. Validated
 * using lib/schema.cjs validate() to enforce presence of required fields,
 * correct types, and default values for optional fields.
 *
 * @type {Object<string, import('../../lib/schema.cjs').SchemaField>}
 */
const PLUGIN_MANIFEST_SCHEMA = {
  name: { type: 'string', required: true },
  version: { type: 'string', required: true },
  description: { type: 'string', required: false, default: '' },
  main: { type: 'string', required: true },
  enabled: { type: 'boolean', required: false, default: true },
  dependencies: {
    type: 'object',
    required: false,
    default: { services: [], providers: [] },
    properties: {
      services: { type: 'array', required: false, default: [] },
      providers: { type: 'array', required: false, default: [] },
    },
  },
};

/**
 * Validates a plugin manifest against PLUGIN_MANIFEST_SCHEMA.
 *
 * @param {Object} manifest - The raw manifest object (typically parsed from plugin.json)
 * @returns {import('../../lib/result.cjs').Result<Object>} Validated manifest with defaults applied, or Err
 */
function validateManifest(manifest) {
  return validate(manifest, PLUGIN_MANIFEST_SCHEMA);
}

/**
 * Checks that all declared plugin dependencies exist in the container.
 *
 * Services are checked as 'services.<name>' and providers as 'providers.<name>'
 * in the container. Collects all missing deps and returns them in context.
 *
 * @param {Object} manifest - Validated manifest with dependencies.services and dependencies.providers
 * @param {Object} container - The IoC container with has() method
 * @returns {import('../../lib/result.cjs').Result<undefined>} Ok if all deps found, Err with missing list
 */
function checkDependencies(manifest, container) {
  const missing = [];
  const deps = manifest.dependencies || { services: [], providers: [] };

  for (const svc of (deps.services || [])) {
    if (!container.has('services.' + svc)) {
      missing.push('services.' + svc);
    }
  }

  for (const prov of (deps.providers || [])) {
    if (!container.has('providers.' + prov)) {
      missing.push('providers.' + prov);
    }
  }

  if (missing.length > 0) {
    return err('PLUGIN_MISSING_DEPS', `Plugin "${manifest.name}" has unmet dependencies: ${missing.join(', ')}`, {
      missing,
      plugin: manifest.name,
    });
  }

  return ok(undefined);
}

/**
 * Loads a plugin from a directory.
 *
 * Reads plugin.json, validates the manifest, checks the enabled flag,
 * verifies dependencies exist in the container, requires the entry point,
 * and calls register(container) if the entry point exports one.
 *
 * @param {string} pluginDir - Absolute path to the plugin directory
 * @param {Object} container - The IoC container
 * @returns {import('../../lib/result.cjs').Result<{name: string, manifest: Object}>} Ok with plugin info, or Err
 */
function loadPlugin(pluginDir, container) {
  // 1. Read plugin.json
  let raw;
  try {
    const manifestPath = path.join(pluginDir, 'plugin.json');
    const content = fs.readFileSync(manifestPath, 'utf-8');
    raw = JSON.parse(content);
  } catch (e) {
    return err('PLUGIN_LOAD_FAILED', `Failed to read plugin.json from "${pluginDir}": ${e.message}`, {
      pluginDir,
      error: e.message,
    });
  }

  // 2. Validate manifest
  const validationResult = validateManifest(raw);
  if (!validationResult.ok) {
    return validationResult;
  }
  const manifest = validationResult.value;

  // 3. Check enabled
  if (!manifest.enabled) {
    return err('PLUGIN_DISABLED', `Plugin "${manifest.name}" is disabled`, {
      plugin: manifest.name,
    });
  }

  // 4. Check dependencies
  const depResult = checkDependencies(manifest, container);
  if (!depResult.ok) {
    return depResult;
  }

  // 5. Require entry point
  let entry;
  try {
    entry = require(path.join(pluginDir, manifest.main));
  } catch (e) {
    return err('PLUGIN_LOAD_FAILED', `Failed to load plugin "${manifest.name}" entry point: ${e.message}`, {
      plugin: manifest.name,
      entryPoint: manifest.main,
      error: e.message,
    });
  }

  // 6. Call register if available
  if (entry && typeof entry.register === 'function') {
    const registerResult = entry.register(container);
    // If register returns an Err result, propagate it
    if (registerResult && registerResult.ok === false) {
      return registerResult;
    }
  }

  // 7. Return success
  return ok({ name: manifest.name, manifest });
}

/**
 * Discovers plugins by scanning a directory for subdirectories containing plugin.json.
 *
 * Returns an empty array if the directory does not exist (graceful degradation).
 * Only considers direct subdirectories -- does not recurse.
 *
 * @param {string} pluginsDir - Absolute path to the plugins directory
 * @returns {string[]} Array of absolute paths to plugin directories
 */
function discoverPlugins(pluginsDir) {
  if (!fs.existsSync(pluginsDir)) {
    return [];
  }

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  const pluginPaths = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const pluginDir = path.join(pluginsDir, entry.name);
    const manifestPath = path.join(pluginDir, 'plugin.json');

    if (fs.existsSync(manifestPath)) {
      pluginPaths.push(pluginDir);
    }
  }

  return pluginPaths;
}

module.exports = { PLUGIN_MANIFEST_SCHEMA, validateManifest, checkDependencies, loadPlugin, discoverPlugins };
