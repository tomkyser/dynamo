'use strict';

const { ok, err } = require('../../../../lib/index.cjs');

/**
 * Creates a Channels API transport that emits notifications/claude/channel
 * events via an injected MCP Server instance.
 *
 * Per D-01: Channels for native Claude Code session event push (urgent/directive).
 * Per D-14: Wire declares claude/channel capability via MCP SDK.
 * Per D-02: Build on Channels directly, fix forward if issues arise.
 *
 * The MCP Server instance is created and managed by channel-server.cjs (Plan 04).
 * This transport only wraps the notification emission.
 *
 * @param {Object} [options]
 * @param {Object|null} [options.mcpServer] - Injected MCP Server instance with notification() method
 * @returns {Object} Transport implementation conforming to TRANSPORT_SHAPE
 */
function createChannelsTransport(options = {}) {
  let _mcpServer = options.mcpServer || null;
  let _connected = false;

  return {
    type: 'channels',

    /**
     * Marks the transport as connected.
     * Actual MCP connection lifecycle is managed externally by channel-server.cjs.
     *
     * @returns {Promise<import('../../../../lib/result.cjs').Result>}
     */
    async connect() {
      _connected = true;
      return ok(undefined);
    },

    /**
     * Marks the transport as disconnected.
     *
     * @returns {Promise<import('../../../../lib/result.cjs').Result>}
     */
    async disconnect() {
      _connected = false;
      return ok(undefined);
    },

    /**
     * Returns true if the transport is connected and has a valid MCP server.
     *
     * @returns {boolean}
     */
    isConnected() {
      return _connected && _mcpServer !== null;
    },

    /**
     * Sends a message envelope via Channels API notification.
     * Per research: meta keys must use underscores, not hyphens.
     * Channels silently drops hyphenated keys.
     *
     * @param {Object} envelope - Wire message envelope
     * @returns {Promise<import('../../../../lib/result.cjs').Result>}
     */
    async send(envelope) {
      if (!_connected || !_mcpServer) {
        return err('TRANSPORT_DISCONNECTED', 'Channels transport is not connected');
      }

      try {
        await _mcpServer.notification({
          method: 'notifications/claude/channel',
          params: {
            content: JSON.stringify(envelope.payload),
            meta: {
              from_session: envelope.from,
              urgency_level: envelope.urgency,
              message_type: envelope.type,
              message_id: envelope.id,
              correlation_id: envelope.correlationId || '',
            },
          },
        });
        return ok({ delivered: true, transport: 'channels' });
      } catch (e) {
        return err('CHANNELS_SEND_FAILED', `Channels notification failed: ${e.message}`);
      }
    },

    /**
     * Returns health status of the Channels transport.
     *
     * @returns {Promise<import('../../../../lib/result.cjs').Result>}
     */
    async healthCheck() {
      return ok({ type: 'channels', connected: _connected, hasMcpServer: _mcpServer !== null });
    },
  };
}

module.exports = { createChannelsTransport };
