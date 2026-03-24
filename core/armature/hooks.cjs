'use strict';

const { ok, err } = require('../../lib/result.cjs');

/**
 * Canonical schemas for all 8 Claude Code hook types.
 *
 * These describe the expected payload shape for each hook event. They serve as
 * documentation, plugin development reference, and potential future validation
 * source. Runtime payload handling is done by Commutator; these schemas define
 * the contract at the Armature level.
 *
 * @type {Object<string, { fields: Object<string, string>, description: string }>}
 */
const HOOK_SCHEMAS = {
  SessionStart: {
    fields: { session_id: 'string', cwd: 'string' },
    description: 'Fired when a Claude Code session begins',
  },
  UserPromptSubmit: {
    fields: { user_prompt: 'string', session_id: 'string' },
    description: 'Fired when user submits a prompt',
  },
  PreToolUse: {
    fields: { tool_name: 'string', tool_input: 'object', session_id: 'string' },
    description: 'Fired before a tool is executed',
  },
  PostToolUse: {
    fields: { tool_name: 'string', tool_input: 'object', tool_output: 'string', session_id: 'string' },
    description: 'Fired after a tool completes',
  },
  Stop: {
    fields: { session_id: 'string', stop_hook_active: 'boolean' },
    description: 'Fired when a session ends',
  },
  PreCompact: {
    fields: { session_id: 'string' },
    description: 'Fired before context compaction',
  },
  SubagentStart: {
    fields: { subagent_id: 'string', session_id: 'string' },
    description: 'Fired when a subagent session begins',
  },
  SubagentStop: {
    fields: { subagent_id: 'string', session_id: 'string' },
    description: 'Fired when a subagent session ends',
  },
};

/**
 * Maps hook type names to Switchboard event names.
 *
 * Mirrors Commutator's HOOK_EVENT_MAP for lifecycle hooks. PreToolUse and
 * PostToolUse are included for completeness -- Commutator resolves these
 * dynamically to domain-specific events, but the registry uses these names
 * for direct hook-type listeners.
 *
 * @type {Object<string, string>}
 */
const HOOK_EVENT_NAMES = {
  SessionStart: 'hook:session-start',
  UserPromptSubmit: 'hook:prompt-submit',
  PreToolUse: 'hook:pre-tool-use',
  PostToolUse: 'hook:post-tool-use',
  Stop: 'hook:stop',
  PreCompact: 'hook:pre-compact',
  SubagentStart: 'hook:subagent-start',
  SubagentStop: 'hook:subagent-stop',
};

/**
 * Creates a hook wiring registry.
 *
 * The registry manages which services listen to which Claude Code hook types.
 * At boot time, Armature reads config and calls register() for each declared
 * listener. Then wireToSwitchboard() connects all registered listeners through
 * Switchboard events.
 *
 * Flow: config.hooks.listeners -> register() -> wireToSwitchboard(switchboard) -> switchboard.on()
 *
 * @returns {Object} Registry with register, getListeners, wireToSwitchboard, loadFromConfig, getSchema, listHookTypes
 */
function createHookRegistry() {
  /**
   * Internal listener map.
   * Key: hook type name (e.g., 'SessionStart')
   * Value: Array of { service: string, handler: Function }
   * @type {Map<string, Array<{service: string, handler: Function}>>}
   */
  const _listeners = new Map();

  /**
   * Registers a service handler for a specific hook type.
   *
   * @param {string} hookType - The hook type name (must be in HOOK_SCHEMAS)
   * @param {string} serviceName - The service name registering the handler
   * @param {Function} handler - The handler function to invoke when the hook fires
   * @returns {import('../../lib/result.cjs').Result<undefined>}
   */
  function register(hookType, serviceName, handler) {
    if (!HOOK_SCHEMAS[hookType]) {
      return err('INVALID_HOOK_TYPE', `Unknown hook type "${hookType}". Valid types: ${Object.keys(HOOK_SCHEMAS).join(', ')}`);
    }

    if (!_listeners.has(hookType)) {
      _listeners.set(hookType, []);
    }
    _listeners.get(hookType).push({ service: serviceName, handler });
    return ok(undefined);
  }

  /**
   * Returns all registered listeners for a hook type.
   *
   * @param {string} hookType - The hook type name
   * @returns {Array<{service: string, handler: Function}>} Listeners array, or empty array if none
   */
  function getListeners(hookType) {
    return _listeners.get(hookType) || [];
  }

  /**
   * Wires all registered hook listeners to Switchboard events.
   *
   * For each hook type that has at least one listener, registers a Switchboard
   * handler that invokes all listeners with the event payload.
   *
   * @param {Object} switchboard - The Switchboard service instance (must have .on() method)
   * @returns {import('../../lib/result.cjs').Result<number>} Ok with count of wired hook types
   */
  function wireToSwitchboard(switchboard) {
    let wiredCount = 0;

    for (const [hookType, listeners] of _listeners) {
      if (listeners.length === 0) {
        continue;
      }

      const eventName = HOOK_EVENT_NAMES[hookType];
      if (!eventName) {
        continue;
      }

      switchboard.on(eventName, (payload) => {
        for (const listener of listeners) {
          listener.handler(payload);
        }
      });

      wiredCount++;
    }

    return ok(wiredCount);
  }

  /**
   * Loads hook listener declarations from a config object.
   *
   * Reads config.hooks.listeners and registers placeholder handlers for each
   * declared service. These placeholders will be resolved to actual service
   * handlers during lifecycle boot when the container has resolved all services.
   *
   * Config format (per D-13):
   * ```json
   * {
   *   "hooks": {
   *     "listeners": {
   *       "SessionStart": ["magnet", "wire"],
   *       "Stop": ["magnet"]
   *     }
   *   }
   * }
   * ```
   *
   * @param {Object} config - The config object with hooks.listeners
   * @returns {import('../../lib/result.cjs').Result<number>} Ok with count of registrations, or Err
   */
  function loadFromConfig(config) {
    if (!config || !config.hooks) {
      return err('MISSING_HOOKS_CONFIG', 'Config object must have a "hooks" section');
    }

    const listenersConfig = config.hooks.listeners || {};
    let count = 0;

    for (const [hookType, serviceNames] of Object.entries(listenersConfig)) {
      if (!HOOK_SCHEMAS[hookType]) {
        // Skip invalid hook types silently -- they may be from a newer version
        continue;
      }

      for (const serviceName of serviceNames) {
        // Register a placeholder handler that will be resolved during boot
        const placeholderHandler = (payload) => {
          // Placeholder: lifecycle manager will replace this with the real handler
        };
        register(hookType, serviceName, placeholderHandler);
        count++;
      }
    }

    return ok(count);
  }

  /**
   * Returns the schema definition for a hook type.
   *
   * @param {string} hookType - The hook type name
   * @returns {{ fields: Object<string, string>, description: string }|null} Schema or null if not found
   */
  function getSchema(hookType) {
    return HOOK_SCHEMAS[hookType] || null;
  }

  /**
   * Returns all known hook type names.
   *
   * @returns {string[]} Array of hook type names
   */
  function listHookTypes() {
    return Object.keys(HOOK_SCHEMAS);
  }

  return {
    register,
    getListeners,
    wireToSwitchboard,
    loadFromConfig,
    getSchema,
    listHookTypes,
  };
}

module.exports = { HOOK_SCHEMAS, HOOK_EVENT_NAMES, createHookRegistry };
