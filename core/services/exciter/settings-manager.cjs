'use strict';

const path = require('node:path');
const os = require('node:os');
const { ok, err } = require('../../../lib/result.cjs');

/**
 * Relative path from project root to project-scope settings.
 * @type {string}
 */
const PROJECT_SETTINGS_REL = '.claude/settings.json';

/**
 * Absolute path to user-scope settings.
 * @type {string}
 */
const USER_SETTINGS = path.join(os.homedir(), '.claude', 'settings.json');

/**
 * Relative path from project root to local-scope settings.
 * @type {string}
 */
const LOCAL_SETTINGS_REL = '.claude/settings.local.json';

/**
 * Default empty settings structure returned when no settings file exists.
 * @type {Readonly<{hooks: {}, permissions: {}, env: {}}>}
 */
const EMPTY_SETTINGS = Object.freeze({ hooks: {}, permissions: {}, env: {} });

/**
 * Creates a settings manager for reading and writing Claude Code settings.json files
 * at project, user, and local scope.
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.lathe - Lathe filesystem facade instance
 * @returns {Object} Settings manager with readSettings, writeHookEntry, removeHookEntry, getScope
 */
function createSettingsManager(options) {
  const { lathe } = options;

  /**
   * Returns the absolute file path for the given scope.
   *
   * @param {string} scope - One of 'project', 'user', or 'local'
   * @param {string} [projectRoot] - Project root path (required for 'project' and 'local' scopes)
   * @returns {string} Absolute path to the settings file
   */
  function getScope(scope, projectRoot) {
    if (scope === 'user') {
      return USER_SETTINGS;
    }
    if (scope === 'local') {
      return path.join(projectRoot, LOCAL_SETTINGS_REL);
    }
    // Default: project scope
    return path.join(projectRoot, PROJECT_SETTINGS_REL);
  }

  /**
   * Reads settings from the specified scope. Returns empty structure if file does not exist.
   *
   * @param {string} scope - One of 'project', 'user', or 'local'
   * @param {string} [projectRoot] - Project root path
   * @returns {import('../../../lib/result.cjs').Result<Object>} Parsed settings or empty default
   */
  function readSettings(scope, projectRoot) {
    const filePath = getScope(scope, projectRoot);
    const result = lathe.readJson(filePath);

    if (!result.ok) {
      // File not found or parse error -- return empty defaults
      return ok(structuredClone(EMPTY_SETTINGS));
    }

    return ok(result.value);
  }

  /**
   * Writes a hook entry to the specified scope's settings file.
   * Deduplicates by comparing the first hook command in each entry.
   *
   * @param {string} scope - One of 'project', 'user', or 'local'
   * @param {string} hookEvent - The hook event name (e.g., 'SessionStart')
   * @param {Object} entry - The hook entry object (e.g., { hooks: [{ type: 'command', command: '...' }] })
   * @param {string} [projectRoot] - Project root path
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function writeHookEntry(scope, hookEvent, entry, projectRoot) {
    const filePath = getScope(scope, projectRoot);
    const readResult = lathe.readJson(filePath);
    const settings = readResult.ok ? readResult.value : structuredClone(EMPTY_SETTINGS);

    // Ensure hooks[hookEvent] is an array
    if (!Array.isArray(settings.hooks[hookEvent])) {
      settings.hooks[hookEvent] = [];
    }

    // Deduplication: check if an entry with the same command already exists
    const newCommand = entry.hooks && entry.hooks[0] && entry.hooks[0].command;
    if (newCommand) {
      const duplicate = settings.hooks[hookEvent].some(
        (existing) => existing.hooks && existing.hooks[0] && existing.hooks[0].command === newCommand
      );
      if (duplicate) {
        return ok(undefined);
      }
    }

    settings.hooks[hookEvent].push(entry);
    return lathe.writeJson(filePath, settings);
  }

  /**
   * Removes hook entries matching the predicate function from the specified scope.
   *
   * @param {string} scope - One of 'project', 'user', or 'local'
   * @param {string} hookEvent - The hook event name
   * @param {Function} matchFn - Predicate function; entries for which matchFn returns true are removed
   * @param {string} [projectRoot] - Project root path
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function removeHookEntry(scope, hookEvent, matchFn, projectRoot) {
    const filePath = getScope(scope, projectRoot);
    const readResult = lathe.readJson(filePath);

    if (!readResult.ok) {
      return ok(undefined);
    }

    const settings = readResult.value;

    if (!Array.isArray(settings.hooks[hookEvent])) {
      return ok(undefined);
    }

    settings.hooks[hookEvent] = settings.hooks[hookEvent].filter((entry) => !matchFn(entry));
    return lathe.writeJson(filePath, settings);
  }

  return { readSettings, writeHookEntry, removeHookEntry, getScope };
}

module.exports = { createSettingsManager };
