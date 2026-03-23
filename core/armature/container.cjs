'use strict';

const { ok, err } = require('../../lib/result.cjs');

/**
 * @typedef {Object} RegistryEntry
 * @property {Function} factory - Factory function that creates the instance
 * @property {*} instance - Cached singleton instance (null until first resolve)
 * @property {'singleton'|'factory'} lifetime - Instance lifetime strategy
 * @property {string[]} deps - Dependency names (other registered bindings)
 * @property {string[]} tags - Tags for grouped resolution via resolveTagged()
 * @property {string[]} aliases - Domain aliases (e.g., 'providers.data.sql')
 * @property {Record<string, string>} mapDeps - Maps container dep keys to factory option keys
 * @property {Record<string, *>} config - Static config values merged into factory options
 * @property {boolean} deferred - Whether creation is deferred until first resolve
 */

/**
 * Creates a new IoC container instance.
 *
 * The container is the central composition mechanism for Dynamo. All services
 * and providers register into it and are resolved through it. Supports singleton
 * and factory lifetimes, tagged resolution, domain aliases, dependency declaration,
 * and topological boot ordering.
 *
 * Container creates instances; lifecycle initializes them. The container does NOT
 * call init() on resolved instances -- that is the lifecycle manager's responsibility.
 *
 * @returns {Object} Container instance with bind/singleton/factory/resolve/resolveTagged/has/getMetadata/getBootOrder/getRegistry
 */
function createContainer() {
  /** @type {Map<string, RegistryEntry>} */
  const _registry = new Map();

  /** @type {Map<string, string>} */
  const _aliases = new Map();

  /**
   * Registers a factory with the container.
   *
   * @param {string} name - Unique binding name
   * @param {Function} factory - Factory function that produces the instance
   * @param {Object} [options] - Registration options
   * @param {string[]} [options.deps] - Dependency names
   * @param {string[]} [options.tags] - Tags for resolveTagged()
   * @param {string[]} [options.aliases] - Domain aliases
   * @param {'singleton'|'factory'} [options.lifetime] - Instance lifetime (default: 'singleton')
   * @param {Record<string, string>} [options.mapDeps] - Maps container keys to options keys
   * @param {Record<string, *>} [options.config] - Static config values for options
   * @param {boolean} [options.deferred] - Defer creation until first resolve
   * @returns {import('../../lib/result.cjs').Result<undefined>}
   */
  function bind(name, factory, options = {}) {
    if (_registry.has(name)) {
      return err('BINDING_EXISTS', `Binding "${name}" already exists`, { name });
    }

    const entry = {
      factory,
      instance: null,
      lifetime: options.lifetime || 'singleton',
      deps: options.deps || [],
      tags: options.tags || [],
      aliases: options.aliases || [],
      mapDeps: options.mapDeps || {},
      config: options.config || {},
      deferred: options.deferred || false,
    };

    _registry.set(name, entry);

    // Register all aliases
    for (const alias of entry.aliases) {
      _aliases.set(alias, name);
    }

    return ok(undefined);
  }

  /**
   * Shorthand for bind() with lifetime forced to 'singleton'.
   *
   * @param {string} name - Unique binding name
   * @param {Function} factory - Factory function
   * @param {Object} [options] - Registration options (lifetime is overridden)
   * @returns {import('../../lib/result.cjs').Result<undefined>}
   */
  function singleton(name, factory, options = {}) {
    return bind(name, factory, { ...options, lifetime: 'singleton' });
  }

  /**
   * Shorthand for bind() with lifetime forced to 'factory'.
   *
   * @param {string} name - Unique binding name
   * @param {Function} factory - Factory function
   * @param {Object} [options] - Registration options (lifetime is overridden)
   * @returns {import('../../lib/result.cjs').Result<undefined>}
   */
  function factory(name, factoryFn, options = {}) {
    return bind(name, factoryFn, { ...options, lifetime: 'factory' });
  }

  /**
   * Instantiates a binding by calling its factory with resolved deps and config.
   *
   * @param {string} name - The primary binding name
   * @param {RegistryEntry} entry - The registry entry to instantiate
   * @returns {import('../../lib/result.cjs').Result<*>} The created instance or Err
   * @private
   */
  function _instantiate(name, entry) {
    try {
      // Build options from mapDeps and config
      const options = { ...entry.config };

      // Resolve mapped dependencies
      for (const [depKey, optionKey] of Object.entries(entry.mapDeps)) {
        const depResult = resolve(depKey);
        if (!depResult.ok) {
          return err('INSTANTIATION_FAILED', `Failed to resolve dependency "${depKey}" for "${name}"`, {
            name,
            dependency: depKey,
            cause: depResult.error,
          });
        }
        options[optionKey] = depResult.value;
      }

      const instance = entry.factory(options);

      // Unwrap Result if factory returns one
      if (instance && typeof instance === 'object' && 'ok' in instance) {
        if (instance.ok === false) {
          return err('INSTANTIATION_FAILED', `Factory for "${name}" returned Err`, {
            name,
            cause: instance.error,
          });
        }
        return ok(instance.value);
      }

      return ok(instance);
    } catch (e) {
      return err('INSTANTIATION_FAILED', `Factory for "${name}" threw: ${e.message}`, {
        name,
        error: e.message,
      });
    }
  }

  /**
   * Resolves a binding by name or alias.
   *
   * For singleton lifetime: returns cached instance on subsequent calls.
   * For factory lifetime: creates a new instance on every call.
   *
   * @param {string} name - Binding name or alias
   * @returns {import('../../lib/result.cjs').Result<*>} The resolved instance or Err
   */
  function resolve(name) {
    // Resolve alias to primary name
    const primaryName = _aliases.has(name) ? _aliases.get(name) : name;

    const entry = _registry.get(primaryName);
    if (!entry) {
      return err('BINDING_NOT_FOUND', `No binding found for "${name}"`, { name });
    }

    if (entry.lifetime === 'singleton') {
      if (entry.instance !== null) {
        return ok(entry.instance);
      }
      const result = _instantiate(primaryName, entry);
      if (!result.ok) {
        return result;
      }
      entry.instance = result.value;
      return ok(entry.instance);
    }

    // Factory lifetime: always create fresh
    return _instantiate(primaryName, entry);
  }

  /**
   * Returns all bindings that include the specified tag.
   *
   * @param {string} tag - The tag to search for
   * @returns {Array<{name: string, entry: RegistryEntry}>} Matching bindings
   */
  function resolveTagged(tag) {
    const matches = [];
    for (const [name, entry] of _registry) {
      if (entry.tags.includes(tag)) {
        matches.push({ name, entry });
      }
    }
    return matches;
  }

  /**
   * Checks if a binding exists by name or alias.
   *
   * @param {string} name - Binding name or alias
   * @returns {boolean}
   */
  function has(name) {
    return _registry.has(name) || _aliases.has(name);
  }

  /**
   * Returns metadata for a registered binding.
   *
   * @param {string} name - Binding name
   * @returns {{ deps: string[], tags: string[], aliases: string[], lifetime: string }|null}
   */
  function getMetadata(name) {
    const entry = _registry.get(name);
    if (!entry) {
      return null;
    }
    return {
      deps: entry.deps,
      tags: entry.tags,
      aliases: entry.aliases,
      lifetime: entry.lifetime,
    };
  }

  /**
   * Computes the boot order via Kahn's algorithm (topological sort).
   *
   * Analyzes the dependency graph derived from all registered bindings' deps arrays.
   * Returns the ordered array of binding names, or an Err if circular dependencies
   * are detected.
   *
   * @returns {import('../../lib/result.cjs').Result<string[]>} Ordered binding names or CYCLE_DETECTED Err
   */
  function getBootOrder() {
    // Build adjacency list and in-degree map
    const inDegree = new Map();
    const adjacency = new Map();

    for (const [name] of _registry) {
      inDegree.set(name, 0);
      adjacency.set(name, []);
    }

    for (const [name, entry] of _registry) {
      for (const dep of entry.deps) {
        // Only count deps that are registered
        if (_registry.has(dep)) {
          adjacency.get(dep).push(name);
          inDegree.set(name, inDegree.get(name) + 1);
        }
      }
    }

    // Kahn's algorithm
    const queue = [];
    for (const [name, degree] of inDegree) {
      if (degree === 0) {
        queue.push(name);
      }
    }

    const order = [];
    while (queue.length > 0) {
      const current = queue.shift();
      order.push(current);

      for (const neighbor of adjacency.get(current)) {
        const newDegree = inDegree.get(neighbor) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (order.length !== _registry.size) {
      // Cycle detected: find participants (nodes with remaining in-degree > 0)
      const cycle = [];
      for (const [name, degree] of inDegree) {
        if (degree > 0) {
          cycle.push(name);
        }
      }
      return err('CYCLE_DETECTED', `Circular dependency detected among: ${cycle.join(', ')}`, {
        cycle,
      });
    }

    return ok(order);
  }

  /**
   * Returns the internal registry Map for lifecycle/diagnostics access.
   *
   * @returns {Map<string, RegistryEntry>}
   */
  function getRegistry() {
    return _registry;
  }

  return {
    bind,
    singleton,
    factory,
    resolve,
    resolveTagged,
    has,
    getMetadata,
    getBootOrder,
    getRegistry,
  };
}

module.exports = { createContainer };
