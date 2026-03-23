'use strict';

const { ok, err, createContract } = require('../../../lib/index.cjs');

/**
 * Contract shape defining all required methods for the Relay service.
 * Relay orchestrates install, update, and sync operations with
 * backup-before-modify semantics (D-10), config migration (D-09),
 * and plugin/module management via git submodules (D-08).
 *
 * @type {{ required: string[], optional: string[] }}
 */
const RELAY_SHAPE = {
  required: [
    'init', 'start', 'stop', 'healthCheck',
    'install', 'update', 'sync',
    'addPlugin', 'removePlugin', 'addModule', 'removeModule',
    'migrateConfig',
  ],
  optional: []
};

/**
 * Creates a new Relay operations orchestration service instance.
 *
 * Relay composes Forge git primitives into safe, atomic operations.
 * Every modify operation follows backup-before-modify with git-tag-based
 * rollback on failure (D-10). Plugins and modules are managed as git
 * submodules via Forge (D-08). Config migration merges new defaults
 * while preserving user values (D-09).
 *
 * Dependencies injected via init():
 * - forge (required): Git operations service
 * - lathe (optional): Filesystem operations service
 * - switchboard (optional): Event emission service
 *
 * @returns {import('../../../lib/result.cjs').Result<Object>} Frozen contract instance on success
 */
function createRelay() {
  /** @type {boolean} */
  let _started = false;
  /** @type {Object|null} */
  let _forge = null;
  /** @type {Object|null} */
  let _lathe = null;
  /** @type {Object|null} */
  let _switchboard = null;
  /** @type {string|null} */
  let _configPath = null;

  /**
   * Core backup-modify-verify-rollback pattern per D-10.
   *
   * Creates a git tag before any modify operation. On success, the tag
   * is cleaned up. On failure, resets to the tag and then removes it.
   * This ensures every operation is safely reversible.
   *
   * @param {string} operationName - Name of the operation (used in tag naming)
   * @param {Function} fn - Async function to execute within the backup scope
   * @returns {Promise<import('../../../lib/result.cjs').Result>} Result of the operation
   */
  async function _withBackup(operationName, fn) {
    const tagName = `relay-backup-${operationName}-${Date.now()}`;

    // 1. Create backup tag
    const tagResult = _forge.tag(tagName);
    if (!tagResult.ok) {
      return err('BACKUP_FAILED', `Failed to create backup tag: ${tagResult.error.message}`);
    }

    try {
      // 2. Execute operation
      const result = await fn();

      if (!result.ok) {
        // 3a. Rollback on failure
        _forge.resetTo(tagName);
        _forge.deleteTag(tagName);
        return result;
      }

      // 3b. Clean up tag on success
      _forge.deleteTag(tagName);
      return result;
    } catch (e) {
      // 3c. Rollback on exception
      _forge.resetTo(tagName);
      _forge.deleteTag(tagName);
      return err('OPERATION_FAILED', `${operationName} failed: ${e.message}`);
    }
  }

  /**
   * Returns the default config structure for a given version.
   * Each version can define its own defaults. This is the extensibility
   * point for config evolution across platform versions.
   *
   * @param {string} version - Target version string
   * @returns {Object} Default config object
   */
  function _getDefaultConfig(version) {
    return {
      _version: version,
      platform: { name: 'dynamo' },
      services: {},
      providers: {},
      modules: {},
      plugins: {},
    };
  }

  // ---- Lifecycle Methods ----

  /**
   * Initialize the Relay service with required dependencies.
   *
   * @param {Object} options - Initialization options
   * @param {Object} options.forge - Forge git service instance (required)
   * @param {Object} [options.lathe] - Lathe filesystem service instance
   * @param {Object} [options.switchboard] - Switchboard event service instance
   * @param {string} [options.configPath] - Path to config file for migrations
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function init(options) {
    if (!options || !options.forge) {
      return err('INIT_FAILED', 'Relay init requires forge service', {
        provided: options ? Object.keys(options) : []
      });
    }

    _forge = options.forge;
    _lathe = options.lathe || null;
    _switchboard = options.switchboard || null;
    _configPath = options.configPath || null;

    return ok(undefined);
  }

  /**
   * Start the Relay service, enabling health check reporting.
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function start() {
    _started = true;
    return ok(undefined);
  }

  /**
   * Stop the Relay service.
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function stop() {
    _started = false;
    return ok(undefined);
  }

  /**
   * Check whether the Relay service is healthy.
   * @returns {import('../../../lib/result.cjs').Result<{ healthy: boolean, name: string }>}
   */
  function healthCheck() {
    return ok({ healthy: _started, name: 'relay' });
  }

  // ---- Install Operation (D-08) ----

  /**
   * Install from a source directory to a destination directory.
   *
   * Follows backup-before-modify semantics: creates a git tag, syncs
   * files, stages, commits, then cleans up the tag. On any failure,
   * rolls back to the backup tag.
   *
   * @param {string} srcDir - Absolute path to source directory
   * @param {string} destDir - Absolute path to destination directory
   * @returns {Promise<import('../../../lib/result.cjs').Result<{ hash: string }>>}
   */
  async function install(srcDir, destDir) {
    return _withBackup('install', async () => {
      // Sync files from src to dest
      const syncResult = await _forge.sync(srcDir, destDir);
      if (!syncResult.ok) return syncResult;

      // Stage and commit
      const stageResult = _forge.stageAll();
      if (!stageResult.ok) return stageResult;

      const commitResult = _forge.commit(`relay: install from ${srcDir}`);
      if (!commitResult.ok) return commitResult;

      // Emit event
      if (_switchboard) {
        _switchboard.emit('relay:installed', {
          srcDir,
          destDir,
          hash: commitResult.value.hash,
        });
      }

      return ok({ hash: commitResult.value.hash });
    });
  }

  // ---- Update Operation (D-08, D-10) ----

  /**
   * Update from a source directory to a destination directory.
   *
   * Identical backup-modify-rollback pattern as install, but emits
   * relay:updated instead of relay:installed.
   *
   * @param {string} srcDir - Absolute path to source directory
   * @param {string} destDir - Absolute path to destination directory
   * @returns {Promise<import('../../../lib/result.cjs').Result<{ hash: string }>>}
   */
  async function update(srcDir, destDir) {
    return _withBackup('update', async () => {
      const syncResult = await _forge.sync(srcDir, destDir);
      if (!syncResult.ok) return syncResult;

      const stageResult = _forge.stageAll();
      if (!stageResult.ok) return stageResult;

      const commitResult = _forge.commit(`relay: update from ${srcDir}`);
      if (!commitResult.ok) return commitResult;

      if (_switchboard) {
        _switchboard.emit('relay:updated', {
          srcDir,
          destDir,
          hash: commitResult.value.hash,
        });
      }

      return ok({ hash: commitResult.value.hash });
    });
  }

  // ---- Sync Operation ----

  /**
   * Copy files from source to destination via Forge sync.
   * Lighter than install/update -- no backup tag, no commit.
   * Used for hot-sync scenarios (e.g., repo-to-.claude/ sync).
   *
   * @param {string} srcDir - Absolute path to source directory
   * @param {string} destDir - Absolute path to destination directory
   * @returns {Promise<import('../../../lib/result.cjs').Result<{ filesCopied: number }>>}
   */
  async function sync(srcDir, destDir) {
    const syncResult = await _forge.sync(srcDir, destDir);
    if (!syncResult.ok) return syncResult;

    if (_switchboard) {
      _switchboard.emit('relay:synced', {
        srcDir,
        destDir,
        filesCopied: syncResult.value.filesCopied,
      });
    }

    return syncResult;
  }

  // ---- Plugin Management (D-08) ----

  /**
   * Add a plugin as a git submodule under plugins/<name>.
   * Follows backup-modify-rollback pattern.
   *
   * @param {string} url - Git URL of the plugin repository
   * @param {string} name - Plugin name (used as subdirectory)
   * @returns {Promise<import('../../../lib/result.cjs').Result<{ name: string, url: string }>>}
   */
  async function addPlugin(url, name) {
    return _withBackup('add-plugin', async () => {
      const addResult = _forge.submoduleAdd(url, `plugins/${name}`);
      if (!addResult.ok) return addResult;

      const commitResult = _forge.commit(`relay: add plugin ${name}`);
      if (!commitResult.ok) return commitResult;

      if (_switchboard) {
        _switchboard.emit('relay:plugin-added', { name, url });
      }

      return ok({ name, url });
    });
  }

  /**
   * Remove a plugin submodule from plugins/<name>.
   * Follows backup-modify-rollback pattern.
   *
   * @param {string} name - Plugin name to remove
   * @returns {Promise<import('../../../lib/result.cjs').Result<{ name: string }>>}
   */
  async function removePlugin(name) {
    return _withBackup('remove-plugin', async () => {
      const removeResult = _forge.submoduleRemove(`plugins/${name}`);
      if (!removeResult.ok) return removeResult;

      const commitResult = _forge.commit(`relay: remove plugin ${name}`);
      if (!commitResult.ok) return commitResult;

      if (_switchboard) {
        _switchboard.emit('relay:plugin-removed', { name });
      }

      return ok({ name });
    });
  }

  // ---- Module Management (D-08) ----

  /**
   * Add a module as a git submodule under modules/<name>.
   * Follows backup-modify-rollback pattern.
   *
   * @param {string} url - Git URL of the module repository
   * @param {string} name - Module name (used as subdirectory)
   * @returns {Promise<import('../../../lib/result.cjs').Result<{ name: string, url: string }>>}
   */
  async function addModule(url, name) {
    return _withBackup('add-module', async () => {
      const addResult = _forge.submoduleAdd(url, `modules/${name}`);
      if (!addResult.ok) return addResult;

      const commitResult = _forge.commit(`relay: add module ${name}`);
      if (!commitResult.ok) return commitResult;

      if (_switchboard) {
        _switchboard.emit('relay:module-added', { name, url });
      }

      return ok({ name, url });
    });
  }

  /**
   * Remove a module submodule from modules/<name>.
   * Follows backup-modify-rollback pattern.
   *
   * @param {string} name - Module name to remove
   * @returns {Promise<import('../../../lib/result.cjs').Result<{ name: string }>>}
   */
  async function removeModule(name) {
    return _withBackup('remove-module', async () => {
      const removeResult = _forge.submoduleRemove(`modules/${name}`);
      if (!removeResult.ok) return removeResult;

      const commitResult = _forge.commit(`relay: remove module ${name}`);
      if (!commitResult.ok) return commitResult;

      if (_switchboard) {
        _switchboard.emit('relay:module-removed', { name });
      }

      return ok({ name });
    });
  }

  // ---- Config Migration (D-09) ----

  /**
   * Migrate a config object to a target version.
   *
   * Deep-merges new default keys from the target version into the
   * existing config. User values take precedence over defaults.
   * Stamps the _version field with the target version.
   *
   * @param {Object|null} currentConfig - Current config object (may be null/undefined)
   * @param {string} targetVersion - Target version string
   * @returns {Promise<import('../../../lib/result.cjs').Result<Object>>}
   */
  async function migrateConfig(currentConfig, targetVersion) {
    const defaults = _getDefaultConfig(targetVersion);

    // Deep merge: defaults first, then overlay current config (preserves user values)
    const merged = {};

    // Apply defaults
    for (const key of Object.keys(defaults)) {
      merged[key] = defaults[key];
    }

    // Overlay current config (user values take precedence)
    for (const key of Object.keys(currentConfig || {})) {
      if (key === '_version') continue; // version will be stamped below
      if (typeof currentConfig[key] === 'object' && currentConfig[key] !== null && !Array.isArray(currentConfig[key])) {
        merged[key] = { ...(defaults[key] || {}), ...currentConfig[key] };
      } else {
        merged[key] = currentConfig[key];
      }
    }

    // Stamp version
    merged._version = targetVersion;

    return ok(merged);
  }

  const impl = {
    init,
    start,
    stop,
    healthCheck,
    install,
    update,
    sync,
    addPlugin,
    removePlugin,
    addModule,
    removeModule,
    migrateConfig,
  };

  return createContract('relay', RELAY_SHAPE, impl);
}

module.exports = { createRelay };
