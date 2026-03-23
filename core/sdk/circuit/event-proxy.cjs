'use strict';

/**
 * Creates a per-module event proxy for Switchboard interaction.
 *
 * The event proxy namespaces all module-emitted events (e.g., module emits 'update',
 * Switchboard sees 'mymodule:update') while passing system events (hook:*, state:*)
 * through un-namespaced. Tracks all subscriptions for bulk cleanup on module shutdown.
 *
 * @param {string} moduleName - Module name used as event namespace prefix
 * @param {Object} switchboard - Switchboard facade with on/off/emit/filter methods
 * @returns {Readonly<{emit: Function, on: Function, filter: Function, cleanup: Function, getSubscriptionCount: Function}>}
 */
function createEventProxy(moduleName, switchboard) {
  /** @type {Array<{event: string, handler: Function}>} */
  const _subscriptions = [];

  /**
   * Emits a namespaced event on the Switchboard.
   *
   * All module emissions are prefixed: emit('update', data) becomes
   * switchboard.emit('moduleName:update', data).
   *
   * @param {string} event - Module-local event name
   * @param {*} payload - Event payload
   * @returns {undefined}
   */
  function emit(event, payload) {
    return switchboard.emit(`${moduleName}:${event}`, payload);
  }

  /**
   * Subscribes to an event, with smart namespacing.
   *
   * System events (hook:*, state:*) pass through un-namespaced so modules
   * can listen to platform-wide events. Module events get the module prefix.
   *
   * @param {string} event - Event name (system or module-local)
   * @param {Function} handler - Event handler
   * @returns {*} Result from switchboard.on()
   */
  function on(event, handler) {
    const actualEvent = (event.startsWith('hook:') || event.startsWith('state:'))
      ? event
      : `${moduleName}:${event}`;

    _subscriptions.push({ event: actualEvent, handler });
    return switchboard.on(actualEvent, handler);
  }

  /**
   * Removes all tracked subscriptions from the Switchboard.
   * Called during module shutdown to prevent leaked listeners.
   */
  function cleanup() {
    for (const sub of _subscriptions) {
      switchboard.off(sub.event, sub.handler);
    }
    _subscriptions.length = 0;
  }

  /**
   * Returns the number of active subscriptions tracked by this proxy.
   *
   * @returns {number}
   */
  function getSubscriptionCount() {
    return _subscriptions.length;
  }

  return Object.freeze({
    emit,
    on,
    filter: switchboard.filter,
    cleanup,
    getSubscriptionCount,
  });
}

module.exports = { createEventProxy };
