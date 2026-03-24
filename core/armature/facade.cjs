'use strict';

const { ok, err } = require('../../lib/result.cjs');

/**
 * Valid hook positions for facade method hooks.
 * @type {ReadonlyArray<string>}
 */
const VALID_POSITIONS = ['before', 'after', 'around'];

/**
 * Creates a method proxy that delegates to the implementation with hook support.
 *
 * The proxy executes hooks in this order:
 * 1. Around hooks (outermost wraps innermost, innermost wraps core)
 * 2. Core = before hooks -> implementation -> after hooks
 *
 * @param {string} methodName - The method name on the contract
 * @param {Function} originalFn - The original contract method
 * @param {string} facadeName - The facade name for hook context
 * @param {Object} hooks - Internal hooks registry (mutable, shared reference)
 * @param {Object} overrides - Internal overrides registry (mutable, shared reference)
 * @returns {Function} Proxy function that handles hook execution
 * @private
 */
function createMethodProxy(methodName, originalFn, facadeName, hooks, overrides) {
  return function (...args) {
    const methodHooks = hooks[methodName] || { before: [], after: [], around: [] };
    const impl = overrides[methodName] || originalFn;

    // If around hooks exist, build an execution chain
    if (methodHooks.around.length > 0) {
      let index = 0;

      function next(currentArgs) {
        if (index < methodHooks.around.length) {
          const aroundHandler = methodHooks.around[index++];
          return aroundHandler(next, currentArgs);
        }
        // After all around hooks, execute core (before -> impl -> after)
        return executeCore(impl, currentArgs, methodHooks, facadeName, methodName);
      }

      return next(args);
    }

    // No around hooks: execute core directly
    return executeCore(impl, args, methodHooks, facadeName, methodName);
  };
}

/**
 * Executes the core method call pipeline: before hooks -> implementation -> after hooks.
 *
 * Before hooks can:
 * - Return an Err to halt execution (the Err is returned immediately)
 * - Return an Array to replace the arguments for the implementation call
 * - Return anything else (including undefined) to continue without modification
 *
 * After hooks can:
 * - Return a non-undefined value to replace the result
 * - Return undefined to keep the current result
 *
 * @param {Function} impl - The implementation function to call
 * @param {Array} args - The arguments to pass
 * @param {Object} hooks - Hook arrays { before: [], after: [], around: [] }
 * @param {string} facadeName - The facade name for hook context
 * @param {string} methodName - The method name for hook context
 * @returns {*} The result of the implementation (possibly modified by hooks)
 * @private
 */
function executeCore(impl, args, hooks, facadeName, methodName) {
  // Before hooks: can modify args (return array) or halt (return Err)
  for (const handler of hooks.before) {
    const result = handler(args, facadeName, methodName);
    if (result && result.ok === false) {
      return result; // Halt execution
    }
    if (Array.isArray(result)) {
      args = result; // Replace args
    }
  }

  // Execute implementation
  let result = impl(...args);

  // After hooks: can modify return value
  for (const handler of hooks.after) {
    const modified = handler(result, args, facadeName, methodName);
    if (modified !== undefined) {
      result = modified;
    }
  }

  return result;
}

/**
 * Creates a facade that wraps a frozen contract with hook points and override support.
 *
 * Facades are the consumer-facing layer over services and providers. They delegate
 * all method calls to the underlying frozen contract while enabling:
 * - **Before hooks**: Inspect/modify args or halt execution
 * - **After hooks**: Inspect/modify return values
 * - **Around hooks**: Wrap the entire call chain (before + impl + after)
 * - **Override**: Swap the implementation behind a method transparently
 * - **Metadata**: Domain-level name, tags, and aliases
 *
 * The facade does NOT modify the frozen contract. It creates a separate object
 * that delegates to it. Hook and override mutate internal state, not the facade surface.
 *
 * @param {string} name - The facade name (e.g., 'ledger', 'switchboard')
 * @param {Object} contract - The frozen contract instance to wrap
 * @param {Object} [metadata={}] - Domain metadata
 * @param {string[]} [metadata.tags] - Tags for categorization
 * @param {string[]} [metadata.aliases] - Domain aliases
 * @returns {Object} Frozen facade instance with delegation, hooks, override, and meta
 */
function createFacade(name, contract, metadata = {}) {
  /** @type {Object<string, { before: Function[], after: Function[], around: Function[] }>} */
  const _hooks = {};

  /** @type {Object<string, Function>} */
  const _overrides = {};

  /**
   * Registers a hook on a specific method at a given position.
   *
   * @param {string} method - The method name to hook
   * @param {'before'|'after'|'around'} position - The hook position
   * @param {Function} handler - The hook handler function
   * @returns {import('../../lib/result.cjs').Result<undefined>}
   */
  function hook(method, position, handler) {
    if (!VALID_POSITIONS.includes(position)) {
      return err('FACADE_INVALID_POSITION', `Invalid hook position "${position}". Must be one of: ${VALID_POSITIONS.join(', ')}`);
    }
    if (!_hooks[method]) {
      _hooks[method] = { before: [], after: [], around: [] };
    }
    _hooks[method][position].push(handler);
    return ok(undefined);
  }

  /**
   * Swaps the implementation for a specific method.
   *
   * The method must exist on the original contract as a function.
   * The override persists until replaced by another override call.
   *
   * @param {string} method - The method name to override
   * @param {Function} newImpl - The replacement implementation
   * @returns {import('../../lib/result.cjs').Result<undefined>}
   */
  function override(method, newImpl) {
    if (typeof contract[method] !== 'function') {
      return err('FACADE_INVALID_METHOD', `Method "${method}" not found on "${name}"`);
    }
    _overrides[method] = newImpl;
    return ok(undefined);
  }

  // Build facade by iterating contract keys
  const facade = {};

  // Expose frozen metadata
  facade.meta = Object.freeze({ name, ...metadata });

  // Delegate contract methods through proxies with hook support
  for (const key of Object.keys(contract)) {
    if (typeof contract[key] === 'function') {
      facade[key] = createMethodProxy(key, contract[key], name, _hooks, _overrides);
    } else {
      facade[key] = contract[key]; // Non-function properties copied as-is
    }
  }

  // Attach hook and override APIs
  facade.hook = hook;
  facade.override = override;

  return Object.freeze(facade);
}

module.exports = { createFacade };
