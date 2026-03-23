'use strict';

const { ok, err } = require('../../../lib/index.cjs');
const { validateProvider } = require('./provider.cjs');

/**
 * Default empty state tree structure.
 * @returns {{ global: Object, session: Object, module: Object }}
 */
function emptyState() {
  return { global: {}, session: {}, module: {} };
}

/**
 * Creates a JSON file persistence provider for Magnet state.
 *
 * Uses Lathe for all file I/O operations. Implements debounced writes
 * (1000ms inactivity) with crash-safe atomic persistence and .bak file
 * recovery on parse errors.
 *
 * @param {Object} options
 * @param {Object} options.lathe - Lathe service instance for filesystem operations
 * @param {string} options.filePath - Absolute path to the state JSON file
 * @returns {import('../../../lib/result.cjs').Result<Object>} Validated provider instance
 */
function createJsonProvider(options) {
  const { lathe, filePath } = options;

  if (!lathe) {
    return err('MISSING_DEPENDENCY', 'JSON provider requires lathe option', { option: 'lathe' });
  }
  if (!filePath) {
    return err('MISSING_DEPENDENCY', 'JSON provider requires filePath option', { option: 'filePath' });
  }

  const bakPath = filePath + '.bak';

  /** @type {ReturnType<typeof setTimeout> | null} */
  let _debounceTimer = null;

  /** @type {boolean} */
  let _dirty = false;

  /** @type {{ global: Object, session: Object, module: Object } | null} */
  let _pendingState = null;

  /**
   * Loads state from the JSON file on disk.
   * Falls back to .bak file if primary file has invalid JSON.
   * Returns empty state structure if neither file exists or is parseable.
   *
   * @returns {Promise<import('../../../lib/result.cjs').Result<Object>>}
   */
  async function load() {
    const existsResult = await lathe.exists(filePath);
    if (!existsResult.ok) {
      return ok(emptyState());
    }

    if (existsResult.value) {
      const readResult = await lathe.readFile(filePath);
      if (readResult.ok) {
        try {
          const parsed = JSON.parse(readResult.value);
          return ok(parsed);
        } catch (_parseErr) {
          // Primary file has invalid JSON -- attempt .bak recovery
          return _loadFromBackup();
        }
      }
    }

    // File does not exist -- return empty state
    return ok(emptyState());
  }

  /**
   * Attempts to load state from the .bak file.
   * Returns empty state if backup also fails.
   *
   * @returns {Promise<import('../../../lib/result.cjs').Result<Object>>}
   */
  async function _loadFromBackup() {
    const bakExists = await lathe.exists(bakPath);
    if (!bakExists.ok || !bakExists.value) {
      return ok(emptyState());
    }

    const bakRead = await lathe.readFile(bakPath);
    if (!bakRead.ok) {
      return ok(emptyState());
    }

    try {
      const parsed = JSON.parse(bakRead.value);
      return ok(parsed);
    } catch (_bakParseErr) {
      return ok(emptyState());
    }
  }

  /**
   * Writes the current state content to disk as a backup file.
   *
   * @returns {Promise<void>}
   */
  async function _writeBackup() {
    const existsResult = await lathe.exists(filePath);
    if (existsResult.ok && existsResult.value) {
      const currentContent = await lathe.readFile(filePath);
      if (currentContent.ok) {
        await lathe.writeFile(bakPath, currentContent.value);
      }
    }
  }

  /**
   * Performs the actual atomic write of state to disk.
   *
   * @param {{ global: Object, session: Object, module: Object }} state
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function _flush(state) {
    try {
      await _writeBackup();
      const content = JSON.stringify(state, null, 2);
      const writeResult = await lathe.writeFileAtomic(filePath, content);
      return writeResult;
    } catch (e) {
      return err('SAVE_FAILED', `Failed to save state: ${e.message}`, { path: filePath });
    }
  }

  /**
   * Saves state to disk. Debounced by default -- marks dirty and schedules
   * a flush after 1000ms of inactivity. Pass { flush: true } to write immediately.
   *
   * @param {{ global: Object, session: Object, module: Object }} state - Full state tree
   * @param {{ flush?: boolean }} [saveOptions={}] - Save options
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function save(state, saveOptions = {}) {
    if (saveOptions.flush) {
      // Immediate flush -- cancel any pending debounce
      if (_debounceTimer !== null) {
        clearTimeout(_debounceTimer);
        _debounceTimer = null;
      }
      _dirty = false;
      _pendingState = null;
      return _flush(state);
    }

    // Debounced save
    _dirty = true;
    _pendingState = state;

    if (_debounceTimer !== null) {
      clearTimeout(_debounceTimer);
    }

    return new Promise((resolve) => {
      _debounceTimer = setTimeout(async () => {
        _debounceTimer = null;
        if (_dirty && _pendingState !== null) {
          _dirty = false;
          const stateToFlush = _pendingState;
          _pendingState = null;
          await _flush(stateToFlush);
        }
        resolve(ok(undefined));
      }, 1000);
    });
  }

  /**
   * Clears a specific scope from state and saves.
   *
   * @param {string} scope - Scope to clear ('global', 'session', or 'module')
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function clear(scope) {
    const loadResult = await load();
    if (!loadResult.ok) {
      return loadResult;
    }

    const state = loadResult.value;
    state[scope] = {};
    return _flush(state);
  }

  const impl = { load, save, clear };
  return validateProvider('json-provider', impl);
}

module.exports = { createJsonProvider };
