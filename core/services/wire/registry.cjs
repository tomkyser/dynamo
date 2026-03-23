'use strict';

const EventEmitter = require('node:events');

/**
 * Creates a session registry for Wire service.
 *
 * The registry manages session lifecycle with register/unregister/lookup/disconnect/reconnect
 * operations. It tracks session identity, capabilities, and write permissions for Ledger
 * write coordination. Disconnected sessions have messages buffered for a configurable TTL
 * period, after which they are removed and marked dead.
 *
 * Per D-06: General-purpose topology -- no hardcoded roles.
 * Per D-07: Registry pattern for session discovery with lifecycle events.
 * Per D-10: Buffered reconnection with configurable TTL.
 *
 * @param {Object} [config]
 * @param {number} [config.reconnectTTL=30000] - Time in ms before a disconnected session is removed
 * @returns {Object} Registry instance with session management methods
 */
function createRegistry(config = {}) {
  const _sessions = new Map();
  const _emitter = new EventEmitter();
  const _buffers = new Map();
  const _timers = new Map();
  const _reconnectTTL = config.reconnectTTL || 30000;

  /**
   * Registers a new session with identity, capabilities, and write permissions.
   * Emits 'session:registered' event.
   *
   * @param {string} sessionId - Unique session identifier
   * @param {Object} info
   * @param {string} info.identity - Session identity (e.g., 'primary', 'secondary')
   * @param {string[]} info.capabilities - Session capabilities (e.g., ['send', 'receive'])
   * @param {string[]} info.writePermissions - Resources session can write to (e.g., ['ledger'], or ['*'] for all)
   */
  function register(sessionId, { identity, capabilities, writePermissions }) {
    const now = Date.now();
    _sessions.set(sessionId, {
      identity,
      capabilities,
      writePermissions,
      connectedAt: now,
      lastSeen: now,
      status: 'active',
    });

    _emitter.emit('session:registered', { sessionId, identity, capabilities });
  }

  /**
   * Removes a session from the registry. Emits 'session:lost' if the session existed.
   * Cleans up any TTL timers and message buffers.
   *
   * @param {string} sessionId - Session to remove
   */
  function unregister(sessionId) {
    const session = _sessions.get(sessionId);
    if (!session) {
      return;
    }

    const identity = session.identity;

    // Clean up timer if exists
    if (_timers.has(sessionId)) {
      clearTimeout(_timers.get(sessionId));
      _timers.delete(sessionId);
    }

    // Clean up buffer
    _buffers.delete(sessionId);

    // Remove session
    _sessions.delete(sessionId);

    _emitter.emit('session:lost', { sessionId, identity });
  }

  /**
   * Looks up a session by ID.
   *
   * @param {string} sessionId
   * @returns {Object|null} Session info or null if not found
   */
  function lookup(sessionId) {
    const session = _sessions.get(sessionId);
    return session || null;
  }

  /**
   * Checks if a session has write permission for a given resource.
   * Supports wildcard ('*') permission.
   *
   * @param {string} sessionId
   * @param {string} resource - Resource name to check (e.g., 'ledger')
   * @returns {boolean}
   */
  function canWrite(sessionId, resource) {
    const session = _sessions.get(sessionId);
    if (!session) {
      return false;
    }
    return session.writePermissions.includes(resource) || session.writePermissions.includes('*');
  }

  /**
   * Returns all registered sessions as [sessionId, sessionInfo] tuples.
   *
   * @returns {Array<[string, Object]>}
   */
  function getSessions() {
    return Array.from(_sessions.entries());
  }

  /**
   * Marks a session as disconnected and starts a TTL timer.
   * After TTL expiry, the session is unregistered (removed + session:lost emitted).
   * Initializes a message buffer for the disconnected session.
   *
   * @param {string} sessionId
   */
  function disconnect(sessionId) {
    const session = _sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.status = 'disconnected';

    // Initialize buffer for this session
    if (!_buffers.has(sessionId)) {
      _buffers.set(sessionId, []);
    }

    // Start TTL timer
    const timer = setTimeout(() => {
      _timers.delete(sessionId);
      unregister(sessionId);
    }, _reconnectTTL);

    _timers.set(sessionId, timer);
  }

  /**
   * Reconnects a disconnected session before TTL expiry.
   * Clears the TTL timer, restores status to 'active', emits 'session:reconnected'.
   * Returns buffered messages and clears the buffer.
   *
   * @param {string} sessionId
   * @returns {Object[]} Buffered messages (empty array if none)
   */
  function reconnect(sessionId) {
    const session = _sessions.get(sessionId);
    if (!session) {
      return [];
    }

    // Clear TTL timer
    if (_timers.has(sessionId)) {
      clearTimeout(_timers.get(sessionId));
      _timers.delete(sessionId);
    }

    // Restore status
    session.status = 'active';
    session.lastSeen = Date.now();

    _emitter.emit('session:reconnected', { sessionId, identity: session.identity });

    // Return and clear buffered messages
    const buffered = _buffers.get(sessionId) || [];
    _buffers.set(sessionId, []);

    return buffered;
  }

  /**
   * Buffers a message for a disconnected session.
   *
   * @param {string} sessionId
   * @param {Object} envelope - Message envelope to buffer
   */
  function bufferMessage(sessionId, envelope) {
    const session = _sessions.get(sessionId);
    if (!session || session.status !== 'disconnected') {
      return;
    }

    if (!_buffers.has(sessionId)) {
      _buffers.set(sessionId, []);
    }

    _buffers.get(sessionId).push(envelope);
  }

  /**
   * Returns buffered messages for a session (empty array if none).
   *
   * @param {string} sessionId
   * @returns {Object[]}
   */
  function getBufferedMessages(sessionId) {
    return _buffers.get(sessionId) || [];
  }

  /**
   * Destroys the registry, clearing all sessions, timers, and buffers.
   */
  function destroy() {
    for (const timer of _timers.values()) {
      clearTimeout(timer);
    }
    _timers.clear();
    _sessions.clear();
    _buffers.clear();
    _emitter.removeAllListeners();
  }

  return {
    register,
    unregister,
    lookup,
    canWrite,
    getSessions,
    disconnect,
    reconnect,
    bufferMessage,
    getBufferedMessages,
    on: _emitter.on.bind(_emitter),
    off: _emitter.off.bind(_emitter),
    destroy,
  };
}

module.exports = { createRegistry };
