'use strict';

const path = require('node:path');
const { ok, err, createContract } = require('../../../lib/index.cjs');
const { createHookRegistry } = require('../../armature/hooks.cjs');
const { createSettingsManager } = require('./settings-manager.cjs');
const { createClaudeMdManager } = require('./claudemd-manager.cjs');
const { createAgentManager } = require('./agent-manager.cjs');

/**
 * Contract shape defining all required and optional methods for the Exciter service.
 *
 * Exciter is Dynamo's single interface for all Claude Code integration surface management.
 * It enforces the core value "everything routes through Dynamo" for Claude Code features.
 *
 * @type {{ required: string[], optional: string[] }}
 */
const EXCITER_SHAPE = {
  required: [
    'init', 'start', 'stop', 'healthCheck',
    'registerHooks', 'getRegisteredHooks',
    'installAgent', 'removeAgent', 'listAgents',
    'updateSettings', 'readSettings',
    'claimSection', 'updateSection', 'releaseSection',
  ],
  optional: ['getAgent', 'registerSkill'],
};

/**
 * Creates an Exciter service instance.
 *
 * Exciter owns the Claude Code-facing integration surface: hook registration,
 * settings.json management, CLAUDE.md section ownership, and agent definition files.
 * It delegates hook mechanics to Armature's createHookRegistry while owning the
 * registration facade that modules call.
 *
 * Modules call Exciter to register hooks, install agents, manage settings, and claim
 * CLAUDE.md sections -- never touching Claude Code's filesystem surface directly.
 *
 * @returns {import('../../../lib/result.cjs').Result<Object>} Frozen contract instance on success
 */
function createExciter() {
  /** @type {Object|null} Hook registry from Armature */
  let _hookRegistry = null;

  /** @type {Object|null} Switchboard service reference */
  let _switchboard = null;

  /** @type {Object|null} Lathe filesystem facade reference */
  let _lathe = null;

  /** @type {Object|null} Settings manager sub-module */
  let _settingsManager = null;

  /** @type {Object|null} CLAUDE.md manager sub-module */
  let _claudeMdManager = null;

  /** @type {Object|null} Agent manager sub-module */
  let _agentManager = null;

  /** @type {boolean} Whether start() has been called */
  let _started = false;

  /** @type {string|null} Project root path */
  let _projectRoot = null;

  /**
   * Initializes the Exciter service with required dependencies.
   *
   * Creates internal hook registry and sub-managers. Requires switchboard and lathe.
   *
   * @param {Object} options - Initialization options
   * @param {Object} options.switchboard - Switchboard service instance
   * @param {Object} options.lathe - Lathe filesystem facade instance
   * @param {Object} [options.config] - Configuration object
   * @param {string} [options.config.projectRoot] - Project root path (defaults to process.cwd())
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function init(options) {
    if (!options || !options.switchboard || !options.lathe) {
      return err('INIT_FAILED', 'Exciter requires switchboard and lathe in options');
    }

    _switchboard = options.switchboard;
    _lathe = options.lathe;
    _projectRoot = (options.config && options.config.projectRoot) || process.cwd();

    // Create internal hook registry (delegates to Armature's createHookRegistry)
    _hookRegistry = createHookRegistry();

    // Create sub-managers
    _settingsManager = createSettingsManager({ lathe: _lathe });
    _claudeMdManager = createClaudeMdManager({ lathe: _lathe });
    _agentManager = createAgentManager({ lathe: _lathe });

    return ok(undefined);
  }

  /**
   * Starts the Exciter service.
   *
   * Wires all registered hooks to Switchboard ONCE. This is called after all modules
   * have had a chance to register during boot, ensuring all hooks are wired in a
   * single pass.
   *
   * @returns {import('../../../lib/result.cjs').Result<number>} Count of wired hook types
   */
  function start() {
    const wireResult = _hookRegistry.wireToSwitchboard(_switchboard);
    _started = true;
    return ok(wireResult.value);
  }

  /**
   * Stops the Exciter service and resets internal state.
   *
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function stop() {
    _started = false;
    _hookRegistry = null;
    _switchboard = null;
    _lathe = null;
    _settingsManager = null;
    _claudeMdManager = null;
    _agentManager = null;
    _projectRoot = null;
    return ok(undefined);
  }

  /**
   * Returns the health status of the Exciter service.
   *
   * @returns {import('../../../lib/result.cjs').Result<{status: string, registeredHooks: number}>}
   */
  function healthCheck() {
    return ok({
      status: _started ? 'healthy' : 'unhealthy',
      registeredHooks: _hookRegistry ? _hookRegistry.listHookTypes().length : 0,
    });
  }

  /**
   * Registers hook handlers for a module. Delegates to Armature's hook registry.
   *
   * Does NOT call wireToSwitchboard -- that happens once in start() after all
   * modules have registered. Per D-05 and D-09, Exciter is the facade; Armature
   * is the engine.
   *
   * @param {string} moduleName - The module registering hooks
   * @param {Object} handlers - Map of hookType -> handler function
   * @returns {import('../../../lib/result.cjs').Result<number>} Count of registered hooks
   */
  function registerHooks(moduleName, handlers) {
    if (!_hookRegistry) {
      return err('NOT_INITIALIZED', 'Exciter must be initialized before registering hooks');
    }

    for (const [hookType, handler] of Object.entries(handlers)) {
      const result = _hookRegistry.register(hookType, moduleName, handler);
      if (!result.ok) {
        return result;
      }
    }

    return ok(Object.keys(handlers).length);
  }

  /**
   * Returns all registered hooks as a map of hookType to listener arrays.
   *
   * @returns {import('../../../lib/result.cjs').Result<Object>}
   */
  function getRegisteredHooks() {
    if (!_hookRegistry) {
      return err('NOT_INITIALIZED', 'Exciter must be initialized before querying hooks');
    }

    const hookMap = {};
    for (const hookType of _hookRegistry.listHookTypes()) {
      const listeners = _hookRegistry.getListeners(hookType);
      if (listeners.length > 0) {
        hookMap[hookType] = listeners;
      }
    }

    return ok(hookMap);
  }

  // --- Settings delegation ---

  /**
   * Writes a hook entry to the settings file at the specified scope.
   * Delegates to settings-manager.
   *
   * @param {string} scope - One of 'project', 'user', or 'local'
   * @param {string} hookEvent - The hook event name
   * @param {Object} entry - The hook entry object
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function updateSettings(scope, hookEvent, entry) {
    return _settingsManager.writeHookEntry(scope, hookEvent, entry, _projectRoot);
  }

  /**
   * Reads settings from the specified scope.
   * Delegates to settings-manager.
   *
   * @param {string} scope - One of 'project', 'user', or 'local'
   * @returns {import('../../../lib/result.cjs').Result<Object>}
   */
  function readSettings(scope) {
    return _settingsManager.readSettings(scope, _projectRoot);
  }

  // --- CLAUDE.md delegation ---

  /**
   * Claims a named section in the CLAUDE.md file.
   * Delegates to claudemd-manager.
   *
   * @param {string} sectionName - Section identifier
   * @param {string} content - Section content
   * @param {string} [claudeMdPath] - Path to CLAUDE.md (defaults to projectRoot/CLAUDE.md)
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  function claimSection(sectionName, content, claudeMdPath) {
    const targetPath = claudeMdPath || path.join(_projectRoot, 'CLAUDE.md');
    return _claudeMdManager.claimSection(sectionName, content, targetPath);
  }

  /**
   * Updates the content of an existing section.
   * Delegates to claudemd-manager.
   *
   * @param {string} sectionName - Section identifier
   * @param {string} content - New section content
   * @param {string} [claudeMdPath] - Path to CLAUDE.md
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  function updateSection(sectionName, content, claudeMdPath) {
    const targetPath = claudeMdPath || path.join(_projectRoot, 'CLAUDE.md');
    return _claudeMdManager.updateSection(sectionName, content, targetPath);
  }

  /**
   * Releases (removes) a named section from the CLAUDE.md file.
   * Delegates to claudemd-manager.
   *
   * @param {string} sectionName - Section identifier
   * @param {string} [claudeMdPath] - Path to CLAUDE.md
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  function releaseSection(sectionName, claudeMdPath) {
    const targetPath = claudeMdPath || path.join(_projectRoot, 'CLAUDE.md');
    return _claudeMdManager.releaseSection(sectionName, targetPath);
  }

  // --- Agent delegation ---

  /**
   * Installs or updates an agent definition file.
   * Delegates to agent-manager.
   *
   * @param {string} agentName - Agent identifier
   * @param {Object} definition - Agent definition (frontmatter + body)
   * @param {string} [agentsDir] - Agents directory (defaults to projectRoot/.claude/agents)
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  function installAgent(agentName, definition, agentsDir) {
    const targetDir = agentsDir || path.join(_projectRoot, '.claude', 'agents');
    return _agentManager.installAgent(agentName, definition, targetDir);
  }

  /**
   * Removes an agent definition file.
   * Delegates to agent-manager.
   *
   * @param {string} agentName - Agent identifier
   * @param {string} [agentsDir] - Agents directory
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function removeAgent(agentName, agentsDir) {
    const targetDir = agentsDir || path.join(_projectRoot, '.claude', 'agents');
    return _agentManager.removeAgent(agentName, targetDir);
  }

  /**
   * Lists all installed agent definitions.
   * Delegates to agent-manager.
   *
   * @param {string} [agentsDir] - Agents directory
   * @returns {import('../../../lib/result.cjs').Result<Array<{name: string, path: string}>>}
   */
  function listAgents(agentsDir) {
    const targetDir = agentsDir || path.join(_projectRoot, '.claude', 'agents');
    return _agentManager.listAgents(targetDir);
  }

  /**
   * Reads and parses an agent definition file.
   * Delegates to agent-manager. Optional method.
   *
   * @param {string} agentName - Agent identifier
   * @param {string} [agentsDir] - Agents directory
   * @returns {import('../../../lib/result.cjs').Result<{frontmatter: Object, body: string}>}
   */
  function getAgent(agentName, agentsDir) {
    const targetDir = agentsDir || path.join(_projectRoot, '.claude', 'agents');
    return _agentManager.getAgent(agentName, targetDir);
  }

  const impl = {
    init, start, stop, healthCheck,
    registerHooks, getRegisteredHooks,
    installAgent, removeAgent, listAgents,
    updateSettings, readSettings,
    claimSection, updateSection, releaseSection,
    getAgent, // optional
  };

  return createContract('exciter', EXCITER_SHAPE, impl);
}

module.exports = { createExciter, EXCITER_SHAPE };
