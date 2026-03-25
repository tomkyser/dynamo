'use strict';

const { ok, err, createContract } = require('../../../lib/index.cjs');
const { MESSAGE_TYPES, URGENCY_LEVELS, createEnvelope, validateEnvelope } = require('./protocol.cjs');
const { createRegistry } = require('./registry.cjs');
const { createPriorityQueue } = require('./queue.cjs');
const { createWriteCoordinator } = require('./write-coordinator.cjs');
const { createTransportRouter } = require('./transport.cjs');
const { createRelayTransport } = require('./transports/relay-transport.cjs');
const { createChannelsTransport } = require('./transports/channels-transport.cjs');

/**
 * Contract shape for the Wire communication service.
 * Defines required and optional methods for contract validation.
 * @type {import('../../../lib/contract.cjs').ContractShape}
 */
const WIRE_SHAPE = {
  required: [
    'init', 'start', 'stop', 'healthCheck',
    'send', 'subscribe', 'register', 'unregister',
    'getRegistry', 'queueWrite',
  ],
  optional: ['broadcast', 'getQueueDepth', 'flush', 'createEnvelope', 'query'],
};

/**
 * Creates a Wire communication service instance.
 *
 * Wire composes the session registry, transport router, priority queue,
 * and write coordinator into a single service contract. It provides a
 * dual API surface: native programmatic API (this factory) and MCP tools
 * (channel-server.cjs).
 *
 * Per D-06: General-purpose topology -- no hardcoded roles.
 * Per D-07: Registry pattern for session discovery with lifecycle events.
 * Per D-09: Urgency-level priority queue routing.
 * Per D-13: Dual API surface -- native + MCP.
 *
 * @returns {import('../../../lib/result.cjs').Result<Object>} Frozen Wire contract instance
 */
function createWire() {
  let _started = false;
  let _switchboard = null;
  let _conductor = null;
  let _ledger = null;
  let _registry = null;
  let _queue = null;
  let _writeCoordinator = null;
  let _transportRouter = null;
  /** @type {Map<string, Function[]>} Map<sessionId, callback[]> */
  const _subscribers = new Map();

  /**
   * Handles incoming messages from transports.
   * Looks up subscribers for the target session and delivers the envelope.
   * If the session is disconnected, buffers via registry.
   *
   * @param {Object} envelope - Incoming message envelope
   */
  function _handleIncomingMessage(envelope) {
    if (!envelope || !envelope.to) {
      return;
    }

    const targetId = envelope.to;

    // Check if session is disconnected -- buffer if so
    if (_registry) {
      const session = _registry.lookup(targetId);
      if (session && session.status === 'disconnected') {
        _registry.bufferMessage(targetId, envelope);
        return;
      }
    }

    // Deliver to subscribers
    const callbacks = _subscribers.get(targetId);
    if (callbacks && callbacks.length > 0) {
      for (let i = 0; i < callbacks.length; i++) {
        callbacks[i](envelope);
      }
    }
  }

  const impl = {
    /**
     * Initializes Wire with injected dependencies via options-based DI.
     *
     * @param {Object} options
     * @param {Object} options.switchboard - Switchboard service for event emission
     * @param {Object} [options.conductor] - Conductor service (for relay process management)
     * @param {Object} [options.ledger] - Ledger provider for write coordination
     * @param {string} [options.relayUrl] - Relay server URL (default: http://127.0.0.1:9876)
     * @param {number} [options.reconnectTTL] - Registry reconnect TTL in ms (default: 30000)
     * @param {Object} [options.queueConfig] - Priority queue configuration
     * @param {Object|null} [options.mcpServer] - MCP Server instance for Channels transport
     * @param {string} [options.sessionId] - This session's identifier
     * @returns {import('../../../lib/result.cjs').Result<undefined>}
     */
    init(options) {
      _switchboard = options.switchboard;
      _conductor = options.conductor || null;
      _ledger = options.ledger || null;

      // Create internal modules
      _registry = createRegistry({
        reconnectTTL: options.reconnectTTL || 30000,
      });

      _queue = createPriorityQueue(options.queueConfig || {});

      _writeCoordinator = createWriteCoordinator({
        ledger: _ledger,
        queueConfig: options.queueConfig,
      });

      // Create transports
      const channelsTransport = createChannelsTransport({
        mcpServer: options.mcpServer || null,
      });

      const relayTransport = createRelayTransport({
        relayUrl: options.relayUrl || 'http://127.0.0.1:9876',
        sessionId: options.sessionId,
        onMessage: _handleIncomingMessage,
      });

      _transportRouter = createTransportRouter([channelsTransport, relayTransport]);

      // Wire registry lifecycle events to Switchboard
      _registry.on('session:registered', function (data) {
        if (_switchboard) {
          _switchboard.emit('wire:session-registered', data);
        }
      });

      _registry.on('session:lost', function (data) {
        if (_switchboard) {
          _switchboard.emit('wire:session-lost', data);
        }
      });

      _registry.on('session:reconnected', function (data) {
        if (_switchboard) {
          _switchboard.emit('wire:session-reconnected', data);
        }
      });

      // Wire write coordinator events to Switchboard
      _writeCoordinator.on('write:completed', function (data) {
        if (_switchboard) {
          _switchboard.emit('wire:write-completed', data);
        }
      });

      _writeCoordinator.on('write:failed', function (data) {
        if (_switchboard) {
          _switchboard.emit('wire:write-failed', data);
        }
      });

      return ok(undefined);
    },

    /**
     * Starts the Wire service -- connects transports and starts write coordinator.
     *
     * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
     */
    async start() {
      await _transportRouter.connectAll();
      _writeCoordinator.start();
      _started = true;

      if (_switchboard) {
        _switchboard.emit('wire:started', {});
      }

      return ok(undefined);
    },

    /**
     * Stops the Wire service -- disconnects transports, stops coordinator, destroys registry.
     *
     * @returns {Promise<import('../../../lib/result.cjs').Result<undefined>>}
     */
    async stop() {
      _writeCoordinator.stop();
      await _transportRouter.disconnectAll();

      if (_registry) {
        _registry.destroy();
      }

      _started = false;

      if (_switchboard) {
        _switchboard.emit('wire:stopped', {});
      }

      return ok(undefined);
    },

    /**
     * Returns Wire service health status.
     *
     * @returns {import('../../../lib/result.cjs').Result<Object>}
     */
    healthCheck() {
      return ok({
        started: _started,
        sessions: _registry ? _registry.getSessions().length : 0,
        writeQueueDepth: _writeCoordinator ? _writeCoordinator.getQueueDepth() : 0,
        transports: _transportRouter ? _transportRouter.healthCheck() : [],
      });
    },

    /**
     * Sends an envelope through the transport router.
     * Emits wire:message-sent via Switchboard on success.
     *
     * @param {Object} envelope - Wire message envelope
     * @returns {Promise<import('../../../lib/result.cjs').Result>}
     */
    async send(envelope) {
      const validation = validateEnvelope(envelope);
      if (!validation.ok) {
        return validation;
      }

      const result = await _transportRouter.send(envelope);

      if (result.ok && _switchboard) {
        _switchboard.emit('wire:message-sent', {
          from: envelope.from,
          to: envelope.to,
          type: envelope.type,
          urgency: envelope.urgency,
        });
      }

      return result;
    },

    /**
     * Subscribes to messages for a specific session.
     * Returns an unsubscribe function.
     *
     * @param {string} sessionId - Session to subscribe to
     * @param {Function} callback - Called with each incoming envelope
     * @returns {Function} Unsubscribe function
     */
    subscribe(sessionId, callback) {
      if (!_subscribers.has(sessionId)) {
        _subscribers.set(sessionId, []);
      }

      _subscribers.get(sessionId).push(callback);

      // Return unsubscribe function
      return function unsubscribe() {
        const cbs = _subscribers.get(sessionId);
        if (cbs) {
          const idx = cbs.indexOf(callback);
          if (idx !== -1) {
            cbs.splice(idx, 1);
          }
          if (cbs.length === 0) {
            _subscribers.delete(sessionId);
          }
        }
      };
    },

    /**
     * Registers a session with the internal registry.
     *
     * @param {string} sessionId - Unique session identifier
     * @param {Object} info - Session info { identity, capabilities, writePermissions }
     * @returns {import('../../../lib/result.cjs').Result<undefined>}
     */
    register(sessionId, info) {
      _registry.register(sessionId, info);
      return ok(undefined);
    },

    /**
     * Unregisters a session and removes its subscribers.
     *
     * @param {string} sessionId - Session to remove
     * @returns {import('../../../lib/result.cjs').Result<undefined>}
     */
    unregister(sessionId) {
      _registry.unregister(sessionId);
      _subscribers.delete(sessionId);
      return ok(undefined);
    },

    /**
     * Returns the internal registry instance for direct access.
     *
     * @returns {Object} Registry instance
     */
    getRegistry() {
      return _registry;
    },

    /**
     * Queues a write-intent envelope for Ledger write coordination.
     * Emits wire:write-queued via Switchboard.
     *
     * @param {Object} envelope - Write-intent envelope
     * @returns {import('../../../lib/result.cjs').Result<number>}
     */
    queueWrite(envelope) {
      const result = _writeCoordinator.queueWrite(envelope);

      if (result.ok && _switchboard) {
        _switchboard.emit('wire:write-queued', { from: envelope.from });
      }

      return result;
    },

    /**
     * Broadcasts an envelope to all registered sessions.
     *
     * @param {Object} envelope - Envelope template (to field is overridden per session)
     * @returns {Promise<import('../../../lib/result.cjs').Result>}
     */
    async broadcast(envelope) {
      const sessions = _registry.getSessions();
      const results = [];

      for (const [sessionId] of sessions) {
        if (sessionId === envelope.from) {
          continue; // Skip sender
        }

        const targetEnvelope = Object.assign({}, envelope, { to: sessionId });
        const result = await _transportRouter.send(targetEnvelope);
        results.push({ sessionId, result });
      }

      if (_switchboard) {
        _switchboard.emit('wire:broadcast', {
          from: envelope.from,
          count: results.length,
        });
      }

      return ok({ sent: results.length, results });
    },

    /**
     * Returns the current write queue depth.
     *
     * @returns {number}
     */
    getQueueDepth() {
      return _writeCoordinator ? _writeCoordinator.getQueueDepth() : 0;
    },

    /**
     * Flushes the write coordinator queue.
     *
     * @returns {import('../../../lib/result.cjs').Result<number>}
     */
    flush() {
      return _writeCoordinator.flush();
    },

    /**
     * Creates a message envelope via the protocol module.
     * Convenience re-export for consumers.
     *
     * @param {Object} params - Envelope parameters
     * @returns {import('../../../lib/result.cjs').Result<Object>}
     */
    createEnvelope(params) {
      return createEnvelope(params);
    },

    /**
     * Reads association index data from Ledger by table name.
     *
     * Wire owns both the write path (WriteCoordinator) and this read path
     * for association index tables. WriteCoordinator stores table data in
     * Ledger under the table name as the record ID. This method reads it
     * back as an array of row objects.
     *
     * Valid table names: domains, entities, associations, attention_tags,
     * formation_groups, fragment_decay, source_locators, fragment_domains,
     * fragment_entities, fragment_attention_tags, entity_domains,
     * domain_relationships.
     *
     * @param {string} tableName - Association index table name
     * @returns {import('../../../lib/result.cjs').Result<Array<Object>>}
     */
    query(tableName) {
      if (!_ledger) {
        return err('NO_LEDGER', 'Ledger provider not available for query');
      }

      const result = _ledger.read(tableName);
      if (!result || !result.ok) {
        // Table has no data yet — return empty array (not an error)
        return ok([]);
      }

      // Ledger stores data as { id, data, ... } — the data field contains
      // the row objects. If data is an array, return it directly.
      // If data is a single object, wrap in array for consistency.
      const stored = result.value.data;
      if (Array.isArray(stored)) {
        return ok(stored);
      }
      if (stored && typeof stored === 'object') {
        return ok([stored]);
      }
      return ok([]);
    },
  };

  return createContract('wire', WIRE_SHAPE, impl);
}

module.exports = { createWire, WIRE_SHAPE };
