'use strict';

const { ok, err, createContract } = require('../../../lib/index.cjs');
const { URGENCY_LEVELS } = require('./protocol.cjs');

/**
 * Transport interface contract shape.
 * Each transport must implement required methods; optional methods enhance capability.
 * Per D-01: Pluggable transport abstraction for Channels + relay + future transports.
 */
const TRANSPORT_SHAPE = {
  required: ['send', 'connect', 'disconnect', 'healthCheck', 'isConnected'],
  optional: ['sendBatch', 'type'],
};

/**
 * Validates a transport implementation against the TRANSPORT_SHAPE contract.
 * Does NOT freeze -- transports manage their own mutable internal state.
 * Validates shape only.
 *
 * @param {Object} impl - Transport implementation to validate
 * @returns {import('../../../lib/result.cjs').Result<Object>}
 */
function validateTransport(impl) {
  return createContract('transport', TRANSPORT_SHAPE, impl);
}

/**
 * Creates a transport router that selects the optimal transport per message.
 * Per D-01: Channels for urgent/directive (low-latency session event push),
 * relay for background/active (bulk data, fallback).
 *
 * @param {Object[]} transports - Array of transport instances, each with a `.type` property
 * @returns {Object} Router with send, sendBatch, connectAll, disconnectAll, healthCheck
 */
function createTransportRouter(transports) {
  const _transports = transports;

  /**
   * Selects the optimal transport for a given envelope based on urgency.
   * Urgent/directive -> Channels (if connected), else relay fallback.
   * Background/active -> relay (if connected), else channels fallback.
   *
   * @param {Object} envelope - Message envelope with urgency field
   * @returns {Object|null} Selected transport or null if none available
   */
  function selectTransport(envelope) {
    const urgency = envelope.urgency;

    if (urgency === URGENCY_LEVELS.URGENT || urgency === URGENCY_LEVELS.DIRECTIVE) {
      // Prefer Channels for low-latency session event push
      const channels = _transports.find(t => t.type === 'channels');
      if (channels && channels.isConnected()) {
        return channels;
      }
      // Fallback to relay
      const relay = _transports.find(t => t.type === 'relay');
      if (relay && relay.isConnected()) {
        return relay;
      }
    } else {
      // Background/active -> prefer relay for bulk data
      const relay = _transports.find(t => t.type === 'relay');
      if (relay && relay.isConnected()) {
        return relay;
      }
      // Fallback to channels
      const channels = _transports.find(t => t.type === 'channels');
      if (channels && channels.isConnected()) {
        return channels;
      }
    }

    // Last resort: any connected transport
    const anyConnected = _transports.find(t => t.isConnected());
    return anyConnected || null;
  }

  /**
   * Sends a single envelope through the optimal transport.
   *
   * @param {Object} envelope - Message envelope
   * @returns {Promise<import('../../../lib/result.cjs').Result>}
   */
  async function send(envelope) {
    const transport = selectTransport(envelope);
    if (!transport) {
      return err('NO_TRANSPORT', 'No connected transport available');
    }
    return transport.send(envelope);
  }

  /**
   * Sends a batch of envelopes, grouping by selected transport.
   * Transports with sendBatch use batch mode; others iterate send().
   *
   * @param {Object[]} envelopes - Array of message envelopes
   * @returns {Promise<import('../../../lib/result.cjs').Result>}
   */
  async function sendBatch(envelopes) {
    // Group envelopes by their selected transport
    const groups = new Map();
    for (const envelope of envelopes) {
      const transport = selectTransport(envelope);
      if (!transport) {
        continue; // Skip envelopes with no available transport
      }
      if (!groups.has(transport)) {
        groups.set(transport, []);
      }
      groups.get(transport).push(envelope);
    }

    const results = [];
    for (const [transport, batch] of groups) {
      if (typeof transport.sendBatch === 'function') {
        const result = await transport.sendBatch(batch);
        results.push(result);
      } else {
        // Iterate send for transports without batch support
        for (const envelope of batch) {
          const result = await transport.send(envelope);
          results.push(result);
        }
      }
    }

    return ok({ sent: envelopes.length, results });
  }

  /**
   * Connects all transports.
   *
   * @returns {Promise<import('../../../lib/result.cjs').Result>}
   */
  async function connectAll() {
    const statuses = [];
    for (const transport of _transports) {
      const result = await transport.connect();
      statuses.push({ type: transport.type, result });
    }
    return ok(statuses);
  }

  /**
   * Disconnects all transports.
   *
   * @returns {Promise<import('../../../lib/result.cjs').Result>}
   */
  async function disconnectAll() {
    const statuses = [];
    for (const transport of _transports) {
      const result = await transport.disconnect();
      statuses.push({ type: transport.type, result });
    }
    return ok(statuses);
  }

  /**
   * Returns health status of all transports.
   *
   * @returns {Promise<import('../../../lib/result.cjs').Result>}
   */
  async function healthCheck() {
    const statuses = [];
    for (const transport of _transports) {
      const result = await transport.healthCheck();
      statuses.push(result);
    }
    return ok(statuses);
  }

  return {
    selectTransport,
    send,
    sendBatch,
    connectAll,
    disconnectAll,
    healthCheck,
  };
}

module.exports = { TRANSPORT_SHAPE, validateTransport, createTransportRouter };
