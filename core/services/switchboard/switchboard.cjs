'use strict';

const { ok, err, createContract } = require('../../../lib/index.cjs');
const EventEmitter = require('node:events');

/**
 * Contract shape for the Switchboard service.
 * Defines required and optional methods for contract validation.
 * @type {import('../../../lib/contract.cjs').ContractShape}
 */
const SWITCHBOARD_SHAPE = {
  required: ['init', 'start', 'stop', 'healthCheck', 'on', 'off', 'emit', 'filter'],
  optional: ['once']
};

/**
 * Checks if a pattern matches an event name.
 * Supports exact matching and suffix wildcard matching with ':*'.
 *
 * @param {string} pattern - The pattern to match against (e.g., 'hook:*' or 'test:action')
 * @param {string} eventName - The event name to test (e.g., 'hook:session-start')
 * @returns {boolean} True if the pattern matches the event name
 */
function matchesPattern(pattern, eventName) {
  if (pattern.endsWith(':*')) {
    // Wildcard: 'hook:*' matches 'hook:session-start', 'hook:stop', etc.
    // Keep the colon -- 'hook:*' becomes prefix 'hook:' for startsWith
    const prefix = pattern.slice(0, -1);
    return eventName.startsWith(prefix);
  }
  return pattern === eventName;
}

/**
 * Creates a Switchboard event bus service instance.
 *
 * Switchboard is the event dispatch backbone of the Dynamo platform. It wraps
 * node:events EventEmitter with custom prefix-wildcard matching and a dual
 * event type system:
 *
 * - **Actions**: Fire-and-forget event dispatch. All matching handlers execute
 *   in registration order. emit() returns undefined.
 *
 * - **Filters**: Interceptable pipeline. Handlers execute in priority order
 *   (lower number first, FIFO tiebreaker). Handlers can transform the payload
 *   or halt the pipeline by returning false or an Err result.
 *
 * Wildcard matching supports prefix patterns using ':*' suffix:
 * - 'hook:*' matches 'hook:session-start', 'hook:stop', etc.
 * - 'hook:*' does NOT match 'file:changed'
 *
 * @returns {import('../../../lib/result.cjs').Result<Object>} Frozen contract instance on success
 */
function createSwitchboard() {
  /** @type {boolean} */
  let _started = false;

  /** @type {EventEmitter} */
  const _emitter = new EventEmitter();
  // Disable max listener warning -- event bus will have many subscribers
  _emitter.setMaxListeners(0);

  /**
   * Exact-match handler registry.
   * Key: event name, Value: array of { fn, type, priority }
   * @type {Map<string, Array<{fn: Function, type: string, priority: number}>>}
   */
  const _handlers = new Map();

  /**
   * Wildcard handler registry (patterns ending in ':*').
   * Key: pattern, Value: array of { fn, type, priority }
   * @type {Map<string, Array<{fn: Function, type: string, priority: number}>>}
   */
  const _wildcards = new Map();

  /**
   * Registers an event handler.
   *
   * @param {string} eventName - Event name or wildcard pattern (e.g., 'hook:*')
   * @param {Function} handler - Handler function receiving (payload, eventName)
   * @param {Object} [options={}] - Registration options
   * @param {string} [options.type='action'] - Handler type: 'action' or 'filter'
   * @param {number} [options.priority=100] - Priority for filter handlers (lower runs first)
   * @returns {Function} Removal function -- call to unregister this handler
   */
  function on(eventName, handler, options = {}) {
    const type = options.type || 'action';
    const priority = options.priority !== undefined ? options.priority : 100;
    const entry = { fn: handler, type, priority };

    const registry = eventName.endsWith(':*') ? _wildcards : _handlers;

    if (!registry.has(eventName)) {
      registry.set(eventName, []);
    }
    registry.get(eventName).push(entry);

    // Return removal function
    return function remove() {
      const entries = registry.get(eventName);
      if (entries) {
        const idx = entries.indexOf(entry);
        if (idx !== -1) {
          entries.splice(idx, 1);
        }
        if (entries.length === 0) {
          registry.delete(eventName);
        }
      }
    };
  }

  /**
   * Removes a specific handler by reference.
   *
   * @param {string} eventName - Event name or wildcard pattern
   * @param {Function} handler - The handler function reference to remove
   */
  function off(eventName, handler) {
    const registry = eventName.endsWith(':*') ? _wildcards : _handlers;
    const entries = registry.get(eventName);
    if (entries) {
      const idx = entries.findIndex((e) => e.fn === handler);
      if (idx !== -1) {
        entries.splice(idx, 1);
      }
      if (entries.length === 0) {
        registry.delete(eventName);
      }
    }
  }

  /**
   * Collects all matching handler entries for a given event name and handler type.
   *
   * @param {string} eventName - The event name to match
   * @param {string} type - Handler type to filter by ('action' or 'filter')
   * @returns {Array<{fn: Function, type: string, priority: number}>}
   */
  function _collectHandlers(eventName, type) {
    const matched = [];

    // Exact matches
    const exact = _handlers.get(eventName);
    if (exact) {
      for (const entry of exact) {
        if (entry.type === type) {
          matched.push(entry);
        }
      }
    }

    // Wildcard matches
    for (const [pattern, entries] of _wildcards) {
      if (matchesPattern(pattern, eventName)) {
        for (const entry of entries) {
          if (entry.type === type) {
            matched.push(entry);
          }
        }
      }
    }

    return matched;
  }

  /**
   * Dispatches an action event to all matching handlers.
   * Fire-and-forget -- all handlers execute in registration order.
   *
   * @param {string} eventName - The event name to dispatch
   * @param {*} payload - The event payload
   * @returns {undefined} Actions are fire-and-forget
   */
  function emit(eventName, payload) {
    const handlers = _collectHandlers(eventName, 'action');
    for (const entry of handlers) {
      entry.fn(payload, eventName);
    }
    return undefined;
  }

  /**
   * Dispatches a filter event through a priority-ordered pipeline.
   * Handlers can transform the payload, or halt the pipeline by returning
   * false or an Err result.
   *
   * @param {string} eventName - The event name to dispatch
   * @param {*} payload - The initial payload
   * @returns {import('../../../lib/result.cjs').Result<*>} Ok(finalPayload) or Err if halted
   */
  function filter(eventName, payload) {
    const handlers = _collectHandlers(eventName, 'filter');

    // Sort by priority ascending (lower first), stable sort preserves FIFO for same priority
    handlers.sort((a, b) => a.priority - b.priority);

    let current = payload;
    for (const entry of handlers) {
      const result = entry.fn(current, eventName);
      if (result === false) {
        return err('FILTER_HALTED', 'Filter halted pipeline', { eventName });
      }
      if (result && result.ok === false) {
        return result;
      }
      if (result !== undefined && result !== true) {
        current = result;
      }
    }
    return ok(current);
  }

  /**
   * Initializes the Switchboard with the given options.
   * Options-based DI pattern for testability.
   *
   * @param {Object} options - Initialization options (reserved for future use)
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function init(options) {
    return ok(undefined);
  }

  /**
   * Starts the Switchboard service.
   *
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function start() {
    _started = true;
    return ok(undefined);
  }

  /**
   * Stops the Switchboard service.
   *
   * @returns {import('../../../lib/result.cjs').Result<undefined>}
   */
  function stop() {
    _started = false;
    return ok(undefined);
  }

  /**
   * Returns the health status of the Switchboard.
   *
   * @returns {import('../../../lib/result.cjs').Result<{healthy: boolean, name: string}>}
   */
  function healthCheck() {
    return ok({ healthy: _started, name: 'switchboard' });
  }

  const impl = { init, start, stop, healthCheck, on, off, emit, filter };
  return createContract('switchboard', SWITCHBOARD_SHAPE, impl);
}

module.exports = { createSwitchboard };
