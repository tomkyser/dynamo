'use strict';

const { ok, err } = require('../../lib/result.cjs');
const { createFacade } = require('./facade.cjs');
const { createHookRegistry } = require('./hooks.cjs');
const { discoverPlugins, loadPlugin } = require('./plugin.cjs');

/**
 * Creates a lifecycle orchestrator for the Dynamo platform.
 *
 * The lifecycle manages the complete register/boot/shutdown sequence. It takes
 * a container full of bindings (services, providers, plugins) and brings them
 * to life in topological dependency order. Each service is:
 *   1. Created via its factory
 *   2. Initialized with resolved deps (as facades) and config values
 *   3. Started (if start method exists)
 *   4. Wrapped in a facade for consumer access
 *
 * Shutdown reverses the boot order, calling stop() on each service.
 *
 * Plugin failures during boot are isolated -- core services continue running.
 *
 * @param {Object} container - IoC container with registered bindings
 * @param {Object} [options={}] - Lifecycle options
 * @param {string} [options.pluginsDir] - Path to plugins directory for auto-discovery
 * @param {Object} [options.config] - Platform config (for hook wiring)
 * @returns {Object} Lifecycle with register, boot, shutdown, getFacade, getStatus
 */
function createLifecycle(container, options = {}) {
  /** @type {'idle'|'registering'|'registered'|'booting'|'running'|'shutting-down'|'stopped'} */
  let _status = 'idle';

  /** @type {Map<string, Object>} Booted facades keyed by binding name */
  const _facades = new Map();

  /** @type {string[]} Boot order for reverse shutdown */
  const _bootOrder = [];

  /** @type {ReturnType<typeof createHookRegistry>} */
  const _hookRegistry = createHookRegistry();

  /**
   * Runs the registration phase.
   *
   * Accepts a callback that registers bindings on the container. After core
   * registration, discovers and loads plugins if pluginsDir is configured.
   *
   * @param {Function} [registerFn] - Callback receiving the container for registration
   * @returns {import('../../lib/result.cjs').Result<number>} Ok with count of registered bindings
   */
  function register(registerFn) {
    _status = 'registering';

    // Core registration via callback
    if (typeof registerFn === 'function') {
      registerFn(container);
    }

    // Plugin discovery and registration
    if (options.pluginsDir) {
      const pluginDirs = discoverPlugins(options.pluginsDir);
      for (const pluginDir of pluginDirs) {
        loadPlugin(pluginDir, container);
      }
    }

    _status = 'registered';
    return ok(container.getRegistry().size);
  }

  /**
   * Boots all registered services in topological dependency order.
   *
   * For each service in boot order:
   *   1. Creates instance via factory (unwraps Result if returned)
   *   2. Builds options from mapDeps (resolving to facades) and config
   *   3. Calls init(options) -- normalizes sync/async via Promise.resolve()
   *   4. Calls start() if present
   *   5. Wraps in facade and stores for access
   *
   * Plugin failures (name starts with 'plugins.') are logged but do not halt boot.
   * Core service failures abort boot immediately.
   *
   * @returns {Promise<import('../../lib/result.cjs').Result<{facades: Map, bootOrder: string[]}>>}
   */
  async function boot() {
    _status = 'booting';

    // Get topological boot order
    const orderResult = container.getBootOrder();
    if (!orderResult.ok) {
      return orderResult; // Cycle detected
    }

    const bootOrder = orderResult.value;

    for (const name of bootOrder) {
      const entry = container.getRegistry().get(name);
      if (!entry) {
        continue;
      }

      // 1. Create instance via factory
      let instance;
      try {
        const factoryResult = entry.factory();
        // Unwrap Result if factory returns one
        if (factoryResult && typeof factoryResult === 'object' && 'ok' in factoryResult) {
          if (!factoryResult.ok) {
            if (name.startsWith('plugins.')) {
              continue; // Plugin factory failure -- skip
            }
            return factoryResult;
          }
          instance = factoryResult.value;
        } else {
          instance = factoryResult;
        }
      } catch (e) {
        if (name.startsWith('plugins.')) {
          continue;
        }
        return err('BOOT_FAILED', `Factory for "${name}" threw: ${e.message}`, { name, error: e.message });
      }

      // 2. Build options from mapDeps and config
      const initOptions = { ...entry.config };

      for (const [depKey, optionKey] of Object.entries(entry.mapDeps)) {
        // Prefer facade if available, otherwise raw resolve
        const facade = _facades.get(depKey);
        if (facade) {
          initOptions[optionKey] = facade;
        } else {
          // Fallback: resolve from container
          const resolved = container.resolve(depKey);
          if (resolved.ok) {
            initOptions[optionKey] = resolved.value;
          }
        }
      }

      // 3. Call init(options) -- normalize sync/async
      if (instance && typeof instance.init === 'function') {
        try {
          const initResult = await Promise.resolve(instance.init(initOptions));
          // Check if init returned an Err result
          if (initResult && typeof initResult === 'object' && initResult.ok === false) {
            if (name.startsWith('plugins.')) {
              continue; // Plugin init failure -- skip, core continues
            }
            return initResult;
          }
        } catch (e) {
          if (name.startsWith('plugins.')) {
            continue;
          }
          return err('BOOT_FAILED', `Init for "${name}" threw: ${e.message}`, { name, error: e.message });
        }
      }

      // 4. Call start() if present
      if (instance && typeof instance.start === 'function') {
        try {
          await Promise.resolve(instance.start());
        } catch (e) {
          if (name.startsWith('plugins.')) {
            continue;
          }
          return err('BOOT_FAILED', `Start for "${name}" threw: ${e.message}`, { name, error: e.message });
        }
      }

      // 5. Wrap in facade and store
      const metadata = {
        tags: entry.tags || [],
        aliases: entry.aliases || [],
      };
      const facade = createFacade(name, instance || {}, metadata);
      _facades.set(name, facade);

      // Also store under aliases
      for (const alias of (entry.aliases || [])) {
        _facades.set(alias, facade);
      }

      _bootOrder.push(name);
    }

    // Wire hooks if config is available
    if (options.config && options.config.hooks) {
      _hookRegistry.loadFromConfig(options.config);
      const switchboardFacade = _facades.get('services.switchboard');
      if (switchboardFacade) {
        _hookRegistry.wireToSwitchboard(switchboardFacade);
      }
    }

    _status = 'running';
    return ok({ facades: _facades, bootOrder: _bootOrder });
  }

  /**
   * Shuts down all booted services in reverse topological order.
   *
   * Calls stop() on each service's facade if the method exists. Normalizes
   * sync/async via Promise.resolve().
   *
   * @returns {Promise<import('../../lib/result.cjs').Result<number>>} Ok with count of stopped services
   */
  async function shutdown() {
    _status = 'shutting-down';
    let stoppedCount = 0;

    // Reverse boot order for shutdown
    const reverseOrder = [..._bootOrder].reverse();

    for (const name of reverseOrder) {
      const facade = _facades.get(name);
      if (!facade) {
        continue;
      }

      if (typeof facade.stop === 'function') {
        try {
          await Promise.resolve(facade.stop());
        } catch (e) {
          // Log error but continue shutdown -- best effort
        }
      }
      stoppedCount++;
    }

    _status = 'stopped';
    return ok(stoppedCount);
  }

  /**
   * Returns the facade for a booted service by name or alias.
   *
   * @param {string} name - Binding name or alias
   * @returns {Object|null} The facade, or null if not found
   */
  function getFacade(name) {
    return _facades.get(name) || null;
  }

  /**
   * Returns the current lifecycle status.
   *
   * @returns {'idle'|'registering'|'registered'|'booting'|'running'|'shutting-down'|'stopped'}
   */
  function getStatus() {
    return _status;
  }

  return {
    register,
    boot,
    shutdown,
    getFacade,
    getStatus,
  };
}

module.exports = { createLifecycle };
