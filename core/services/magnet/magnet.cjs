'use strict';

const { ok, err, createContract } = require('../../../lib/index.cjs');
const { validateProvider } = require('./provider.cjs');

/**
 * Contract shape for the Magnet state management service.
 * @type {import('../../../lib/contract.cjs').ContractShape}
 */
const MAGNET_SHAPE = {
  required: ['init', 'start', 'stop', 'healthCheck', 'get', 'set', 'delete', 'getScope', 'registerProvider'],
  optional: ['clearScope']
};

/**
 * Creates a Magnet state management service instance.
 *
 * Magnet is the state primitive for the Dynamo platform. It provides three-tier
 * scoped state management (global, session, module) with event emission on every
 * mutation and a pluggable provider interface for persistence.
 *
 * - **Global scope**: Platform-wide key-value pairs. `set('global', key, value)`
 * - **Session scope**: Per-session state keyed by session ID. `set('session', id, key, value)`
 * - **Module scope**: Per-module state keyed by module name. `set('module', name, key, value)`
 *
 * Every set/delete emits a 'state:changed' event to Switchboard with:
 * `{ scope, key, oldValue, newValue }`
 *
 * Decisions implemented:
 * - D-09: Provider interface defined, ships with JSON file provider
 * - D-10: Three-tier scoping (global/session/module)
 * - D-11: All mutations emit 'state:changed'
 * - D-12/D-13/D-15: Lifecycle, options DI, self-validation
 *
 * @returns {import('../../../lib/result.cjs').Result<Object>} Frozen contract instance on success
 */
function createMagnet() {
  /** @type {boolean} */
  let _started = false;

  /** @type {Object|null} */
  let _switchboard = null;

  /** @type {Object|null} */
  let _provider = null;

  /** @type {{ global: Object, session: Object, module: Object }} */
  let _state = { global: {}, session: {}, module: {} };

  /**
   * Initialize Magnet with dependencies and hydrate state from provider.
   *
   * @param {Object} options
   * @param {Object} options.switchboard - Switchboard service for event emission
   * @param {Object} options.provider - State provider for persistence
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function init(options) {
    if (!options) {
      return err('INIT_FAILED', 'Magnet init requires options object');
    }

    _switchboard = options.switchboard || null;

    // Wire json-provider if lathe and statePath are injected via mapDeps/config
    if (options.lathe && options.statePath) {
      const { createJsonProvider } = require('./json-provider.cjs');
      const provResult = createJsonProvider({
        lathe: options.lathe,
        filePath: options.statePath,
      });
      if (provResult.ok) {
        _provider = provResult.value;
      }
    } else {
      _provider = options.provider || null;
    }

    // Hydrate state from provider if available
    if (_provider) {
      try {
        const loadResult = await _provider.load();
        if (loadResult.ok) {
          _state = loadResult.value;
        }
      } catch (e) {
        return err('INIT_FAILED', `Failed to load state from provider: ${e.message}`);
      }
    }

    return ok(undefined);
  }

  /**
   * Start the Magnet service, enabling health check reporting.
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function start() {
    _started = true;
    return ok(undefined);
  }

  /**
   * Stop the Magnet service and flush state to provider.
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function stop() {
    if (_provider) {
      try {
        await _provider.save(structuredClone(_state), { flush: true });
      } catch (e) {
        // Log but do not fail stop
      }
    }
    _started = false;
    return ok(undefined);
  }

  /**
   * Check whether the Magnet service is healthy (started).
   * @returns {import('../../../lib/result.cjs').Result<{ healthy: boolean, name: string }>}
   */
  function healthCheck() {
    return ok({ healthy: _started, name: 'magnet' });
  }

  /**
   * Get a value from state by scope and key.
   *
   * - Global: `get('global', key)` -> value
   * - Session: `get('session', sessionId, key)` -> value
   * - Module: `get('module', moduleName, key)` -> value
   *
   * Returns the value directly (not Result-wrapped -- reads are not fallible).
   *
   * @param {string} scope - 'global', 'session', or 'module'
   * @param {...string} args - Key arguments depending on scope
   * @returns {*} The stored value, or undefined if not found
   */
  function get(scope, ...args) {
    if (scope === 'global') {
      const [key] = args;
      return _state.global[key];
    }

    if (scope === 'session') {
      const [sessionId, key] = args;
      return _state.session[sessionId] ? _state.session[sessionId][key] : undefined;
    }

    if (scope === 'module') {
      const [moduleName, key] = args;
      return _state.module[moduleName] ? _state.module[moduleName][key] : undefined;
    }

    return undefined;
  }

  /**
   * Set a value in state by scope and key.
   * Emits 'state:changed' event with { scope, key, oldValue, newValue }.
   * Triggers provider save (debounced by provider).
   *
   * - Global: `set('global', key, value)`
   * - Session: `set('session', sessionId, key, value)`
   * - Module: `set('module', moduleName, key, value)`
   *
   * @param {string} scope - 'global', 'session', or 'module'
   * @param {...*} args - Key/value arguments depending on scope
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function set(scope, ...args) {
    let fullKey;
    let oldValue;

    if (scope === 'global') {
      const [key, value] = args;
      fullKey = key;
      oldValue = _state.global[key] !== undefined ? structuredClone(_state.global[key]) : undefined;
      _state.global[key] = value;
    } else if (scope === 'session') {
      const [sessionId, key, value] = args;
      fullKey = sessionId + '.' + key;
      if (!_state.session[sessionId]) {
        _state.session[sessionId] = {};
      }
      oldValue = _state.session[sessionId][key] !== undefined
        ? structuredClone(_state.session[sessionId][key])
        : undefined;
      _state.session[sessionId][key] = value;
    } else if (scope === 'module') {
      const [moduleName, key, value] = args;
      fullKey = moduleName + '.' + key;
      if (!_state.module[moduleName]) {
        _state.module[moduleName] = {};
      }
      oldValue = _state.module[moduleName][key] !== undefined
        ? structuredClone(_state.module[moduleName][key])
        : undefined;
      _state.module[moduleName][key] = value;
    } else {
      return err('INVALID_SCOPE', `Unknown scope: ${scope}`, { scope });
    }

    // Emit state:changed event
    if (_switchboard) {
      _switchboard.emit('state:changed', {
        scope,
        key: fullKey,
        oldValue,
        newValue: args[args.length - 1]
      });
    }

    // Trigger provider save (debounced by provider)
    if (_provider) {
      await _provider.save(structuredClone(_state));
    }

    return ok(undefined);
  }

  /**
   * Delete a key from state by scope.
   * Emits 'state:changed' event with newValue undefined.
   *
   * - Global: `delete('global', key)`
   * - Session: `delete('session', sessionId, key)`
   * - Module: `delete('module', moduleName, key)`
   *
   * @param {string} scope - 'global', 'session', or 'module'
   * @param {...string} args - Key arguments depending on scope
   * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
   */
  async function del(scope, ...args) {
    let fullKey;
    let oldValue;

    if (scope === 'global') {
      const [key] = args;
      fullKey = key;
      oldValue = _state.global[key] !== undefined ? structuredClone(_state.global[key]) : undefined;
      delete _state.global[key];
    } else if (scope === 'session') {
      const [sessionId, key] = args;
      fullKey = sessionId + '.' + key;
      if (_state.session[sessionId]) {
        oldValue = _state.session[sessionId][key] !== undefined
          ? structuredClone(_state.session[sessionId][key])
          : undefined;
        delete _state.session[sessionId][key];
      }
    } else if (scope === 'module') {
      const [moduleName, key] = args;
      fullKey = moduleName + '.' + key;
      if (_state.module[moduleName]) {
        oldValue = _state.module[moduleName][key] !== undefined
          ? structuredClone(_state.module[moduleName][key])
          : undefined;
        delete _state.module[moduleName][key];
      }
    } else {
      return err('INVALID_SCOPE', `Unknown scope: ${scope}`, { scope });
    }

    // Emit state:changed event
    if (_switchboard) {
      _switchboard.emit('state:changed', {
        scope,
        key: fullKey,
        oldValue,
        newValue: undefined
      });
    }

    // Trigger provider save
    if (_provider) {
      await _provider.save(structuredClone(_state));
    }

    return ok(undefined);
  }

  /**
   * Get all key-value pairs for a given scope.
   *
   * - Global: `getScope('global')` -> { key: value, ... }
   * - Session: `getScope('session', sessionId)` -> { key: value, ... }
   * - Module: `getScope('module', moduleName)` -> { key: value, ... }
   *
   * Returns a shallow copy to prevent external mutation of internal state.
   *
   * @param {string} scope - 'global', 'session', or 'module'
   * @param {string} [namespace] - Session ID or module name (required for session/module)
   * @returns {Object} Shallow copy of the scope's key-value pairs
   */
  function getScope(scope, namespace) {
    if (scope === 'global') {
      return { ..._state.global };
    }

    if (scope === 'session') {
      return _state.session[namespace] ? { ..._state.session[namespace] } : {};
    }

    if (scope === 'module') {
      return _state.module[namespace] ? { ..._state.module[namespace] } : {};
    }

    return {};
  }

  /**
   * Swaps the backing provider to a new one.
   * Validates the new provider against STATE_PROVIDER_SHAPE before accepting.
   *
   * @param {Object} provider - New provider implementation
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function registerProvider(provider) {
    const validation = validateProvider('registered-provider', provider);
    if (!validation.ok) {
      return validation;
    }
    _provider = provider;
    return ok(undefined);
  }

  const impl = {
    init,
    start,
    stop,
    healthCheck,
    get,
    set,
    delete: del,
    getScope,
    registerProvider
  };

  return createContract('magnet', MAGNET_SHAPE, impl);
}

module.exports = { createMagnet };
