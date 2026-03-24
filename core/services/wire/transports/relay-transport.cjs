'use strict';

const { ok, err } = require('../../../../lib/index.cjs');

/**
 * Creates an HTTP/WebSocket relay client transport.
 * Connects to the relay server via fetch for HTTP endpoints and long-polling.
 *
 * Per D-01: Relay for bulk data, high-volume streams, and fallback.
 * Per D-08: Relay runs as separate Bun process managed by Conductor.
 *
 * @param {Object} [options]
 * @param {string} [options.relayUrl] - Relay server base URL (default: http://127.0.0.1:9876)
 * @param {string} [options.sessionId] - This client's session identifier
 * @param {Function} [options.onMessage] - Callback for received messages during polling
 * @param {number} [options.pollTimeoutMs] - Long-poll timeout in ms (default: 30000)
 * @returns {Object} Transport implementation conforming to TRANSPORT_SHAPE
 */
function createRelayTransport(options = {}) {
  const _relayUrl = options.relayUrl || 'http://127.0.0.1:9876';
  const _sessionId = options.sessionId;
  const _onMessage = options.onMessage || (() => {});
  const _pollTimeoutMs = options.pollTimeoutMs || 30000;
  let _connected = false;
  let _polling = false;
  let _pollAbort = null;

  /**
   * Starts the long-poll loop for receiving messages.
   * Uses AbortController for clean cancellation on disconnect.
   */
  async function _startPollLoop() {
    _polling = true;

    while (_polling && _connected) {
      try {
        _pollAbort = new AbortController();
        const response = await fetch(
          `${_relayUrl}/poll?sessionId=${encodeURIComponent(_sessionId)}&timeout=${_pollTimeoutMs}`,
          { signal: _pollAbort.signal }
        );

        if (!response.ok) {
          // Backoff on error before retrying
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          for (const message of data.messages) {
            _onMessage(message);
          }
        }
      } catch (e) {
        if (e.name === 'AbortError') {
          break; // Clean shutdown
        }
        // Exponential backoff on network errors
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  return {
    type: 'relay',

    /**
     * Registers with the relay server and starts the poll loop.
     *
     * @returns {Promise<import('../../../../lib/result.cjs').Result>}
     */
    async connect() {
      try {
        const response = await fetch(`${_relayUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: _sessionId }),
        });

        if (!response.ok) {
          return err('RELAY_CONNECT_FAILED', `Registration failed: HTTP ${response.status}`);
        }

        _connected = true;
        // Start poll loop in background -- do not await
        _startPollLoop();
        return ok(undefined);
      } catch (e) {
        return err('RELAY_CONNECT_FAILED', `Connection to relay failed: ${e.message}`);
      }
    },

    /**
     * Unregisters from the relay server and stops polling.
     *
     * @returns {Promise<import('../../../../lib/result.cjs').Result>}
     */
    async disconnect() {
      _polling = false;
      _connected = false;

      if (_pollAbort) {
        _pollAbort.abort();
        _pollAbort = null;
      }

      try {
        await fetch(`${_relayUrl}/unregister`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: _sessionId }),
        });
      } catch (_e) {
        // Best-effort unregister -- relay cleanup handles orphans
      }

      return ok(undefined);
    },

    /**
     * Returns true if the transport is connected to the relay.
     *
     * @returns {boolean}
     */
    isConnected() {
      return _connected;
    },

    /**
     * Sends a single envelope to the relay server.
     *
     * @param {Object} envelope - Wire message envelope
     * @returns {Promise<import('../../../../lib/result.cjs').Result>}
     */
    async send(envelope) {
      if (!_connected) {
        return err('TRANSPORT_DISCONNECTED', 'Relay transport is not connected');
      }

      try {
        const response = await fetch(`${_relayUrl}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(envelope),
        });

        if (!response.ok) {
          return err('RELAY_SEND_FAILED', `Relay send failed: HTTP ${response.status}`);
        }

        const data = await response.json();
        return ok({ delivered: data.delivered, transport: 'relay' });
      } catch (e) {
        return err('RELAY_SEND_FAILED', `Relay send failed: ${e.message}`);
      }
    },

    /**
     * Sends a batch of envelopes to the relay server.
     *
     * @param {Object[]} envelopes - Array of Wire message envelopes
     * @returns {Promise<import('../../../../lib/result.cjs').Result>}
     */
    async sendBatch(envelopes) {
      if (!_connected) {
        return err('TRANSPORT_DISCONNECTED', 'Relay transport is not connected');
      }

      try {
        const response = await fetch(`${_relayUrl}/send-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(envelopes),
        });

        if (!response.ok) {
          return err('RELAY_BATCH_FAILED', `Relay batch send failed: HTTP ${response.status}`);
        }

        const data = await response.json();
        return ok({ results: data.results, transport: 'relay' });
      } catch (e) {
        return err('RELAY_BATCH_FAILED', `Relay batch send failed: ${e.message}`);
      }
    },

    /**
     * Checks relay server health.
     *
     * @returns {Promise<import('../../../../lib/result.cjs').Result>}
     */
    async healthCheck() {
      try {
        const response = await fetch(`${_relayUrl}/health`);
        if (!response.ok) {
          return ok({ type: 'relay', connected: false, error: `HTTP ${response.status}` });
        }
        const data = await response.json();
        return ok({ type: 'relay', connected: _connected, server: data });
      } catch (e) {
        return ok({ type: 'relay', connected: false, error: e.message });
      }
    },
  };
}

module.exports = { createRelayTransport };
