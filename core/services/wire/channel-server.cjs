'use strict';

const { ok, err } = require('../../../lib/index.cjs');
const { Server } = require('@modelcontextprotocol/sdk/server');
const { MESSAGE_TYPES, URGENCY_LEVELS, createEnvelope } = require('./protocol.cjs');

/**
 * Resolves the StdioServerTransport from the MCP SDK.
 * The SDK uses package.json exports with a wildcard pattern that Bun's
 * require() resolution does not always match. We resolve via absolute
 * path to the CJS dist as a reliable fallback.
 *
 * @returns {Function} StdioServerTransport constructor
 */
function _resolveStdioTransport() {
  try {
    const path = require('node:path');
    const sdkDir = require.resolve('@modelcontextprotocol/sdk/server');
    const baseDir = sdkDir.substring(0, sdkDir.lastIndexOf('dist') + 4);
    return require(path.join(baseDir, 'cjs', 'server', 'stdio.js')).StdioServerTransport;
  } catch (_e) {
    throw new Error('Failed to resolve StdioServerTransport from @modelcontextprotocol/sdk');
  }
}

/**
 * Resolves the CallToolRequestSchema and ListToolsRequestSchema from the MCP SDK types.
 *
 * @returns {Object} { CallToolRequestSchema, ListToolsRequestSchema }
 */
function _resolveSchemas() {
  try {
    const path = require('node:path');
    const sdkDir = require.resolve('@modelcontextprotocol/sdk/server');
    const baseDir = sdkDir.substring(0, sdkDir.lastIndexOf('dist') + 4);
    const types = require(path.join(baseDir, 'cjs', 'types.js'));
    return {
      CallToolRequestSchema: types.CallToolRequestSchema,
      ListToolsRequestSchema: types.ListToolsRequestSchema,
    };
  } catch (_e) {
    throw new Error('Failed to resolve MCP SDK type schemas');
  }
}

/**
 * Creates an MCP channel server for Wire inter-session communication.
 *
 * The channel server declares `claude/channel` capability via MCP SDK,
 * exposing wire_send, wire_register, and wire_status as MCP tools. It
 * polls the relay server for incoming messages and pushes them as
 * channel notifications.
 *
 * Per D-13: Dual API surface -- MCP tools for session-to-session communication.
 * Per D-14: Wire declares claude/channel capability via MCP SDK.
 *
 * @param {Object} [options]
 * @param {string} [options.sessionId] - This session's identifier
 * @param {string} [options.relayUrl] - Relay server URL
 * @param {number} [options.pollInterval] - Polling interval in ms (default: 2000)
 * @param {Function} [options.onMessage] - Callback for received messages
 * @returns {Object} Channel server instance { mcp, start, stop, getSessionId }
 */
function createChannelServer(options = {}) {
  const _sessionId = options.sessionId || process.env.WIRE_SESSION_ID || 'session-' + Date.now();
  const _relayUrl = options.relayUrl || process.env.WIRE_RELAY_URL || 'http://127.0.0.1:9876';
  const _pollInterval = options.pollInterval || 2000;
  let _pollTimer = null;
  const _onMessage = options.onMessage || (() => {});

  const { CallToolRequestSchema, ListToolsRequestSchema } = _resolveSchemas();

  // Create MCP Server with claude/channel capability
  const mcp = new Server(
    { name: 'wire', version: '1.0.0' },
    {
      capabilities: {
        experimental: { 'claude/channel': {} },
        tools: {},
      },
      instructions: 'Wire inter-session communication channel. Messages arrive as channel events with urgency levels. Use wire_send to communicate with peer sessions.',
    },
  );

  // Register tool listing handler
  mcp.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'wire_send',
          description: 'Send a message to another session via Wire.',
          inputSchema: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Target session identifier' },
              type: {
                type: 'string',
                enum: Object.values(MESSAGE_TYPES),
                description: 'Message type',
              },
              urgency: {
                type: 'string',
                enum: Object.values(URGENCY_LEVELS),
                description: 'Urgency level',
              },
              payload: { type: 'string', description: 'JSON-encoded message payload' },
              correlationId: { type: 'string', description: 'Optional correlation ID for request/reply' },
            },
            required: ['to', 'type', 'urgency', 'payload'],
          },
        },
        {
          name: 'wire_register',
          description: 'Register this session with Wire for message routing.',
          inputSchema: {
            type: 'object',
            properties: {
              identity: { type: 'string', description: 'Session identity (e.g., primary, secondary)' },
              capabilities: {
                type: 'array',
                items: { type: 'string' },
                description: 'Session capabilities (e.g., send, receive)',
              },
              writePermissions: {
                type: 'array',
                items: { type: 'string' },
                description: 'Resources this session can write to',
              },
            },
            required: ['identity', 'capabilities', 'writePermissions'],
          },
        },
        {
          name: 'wire_status',
          description: 'Get Wire connection status and registered sessions.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    };
  });

  // Register tool call handler
  mcp.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'wire_send') {
      const { to, type, urgency, payload, correlationId } = args;

      // Create envelope
      const envelopeResult = createEnvelope({
        from: _sessionId,
        to,
        type,
        urgency,
        payload: JSON.parse(payload),
        correlationId: correlationId || null,
      });

      if (!envelopeResult.ok) {
        return {
          content: [{ type: 'text', text: `Error: ${envelopeResult.error.message}` }],
          isError: true,
        };
      }

      // Send via relay
      try {
        const response = await fetch(`${_relayUrl}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(envelopeResult.value),
        });

        const data = await response.json();

        // Push channel notification
        try {
          await mcp.notification({
            method: 'notifications/claude/channel',
            params: {
              content: 'Message sent to ' + to,
              meta: {
                status: 'sent',
                to_session: to,
                message_type: type,
              },
            },
          });
        } catch (_notifErr) {
          // Notification push is best-effort -- do not fail the tool call
        }

        return {
          content: [{ type: 'text', text: JSON.stringify({ ok: true, delivered: data.delivered }) }],
        };
      } catch (e) {
        return {
          content: [{ type: 'text', text: `Send failed: ${e.message}` }],
          isError: true,
        };
      }
    }

    if (name === 'wire_register') {
      const { identity, capabilities, writePermissions } = args;

      try {
        const response = await fetch(`${_relayUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: _sessionId,
            identity,
            capabilities,
            writePermissions,
          }),
        });

        const data = await response.json();

        return {
          content: [{ type: 'text', text: JSON.stringify({ ok: true, sessionId: _sessionId, registered: data.ok }) }],
        };
      } catch (e) {
        return {
          content: [{ type: 'text', text: `Registration failed: ${e.message}` }],
          isError: true,
        };
      }
    }

    if (name === 'wire_status') {
      try {
        const response = await fetch(`${_relayUrl}/health`);
        const data = await response.json();

        return {
          content: [{ type: 'text', text: JSON.stringify({ sessionId: _sessionId, relay: data }) }],
        };
      } catch (e) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ sessionId: _sessionId, relay: { error: e.message } }) }],
        };
      }
    }

    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  });

  /**
   * Starts the polling loop for incoming messages from the relay.
   * Each received message triggers the onMessage callback and a channel notification.
   */
  function _startPolling() {
    _pollTimer = setInterval(async () => {
      try {
        const response = await fetch(
          `${_relayUrl}/poll?sessionId=${encodeURIComponent(_sessionId)}&timeout=5000`
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          for (const message of data.messages) {
            _onMessage(message);

            // Push channel notification for each received message
            try {
              await mcp.notification({
                method: 'notifications/claude/channel',
                params: {
                  content: JSON.stringify(message.payload),
                  meta: {
                    from_session: message.from,
                    urgency_level: message.urgency,
                    message_type: message.type,
                    message_id: message.id,
                  },
                },
              });
            } catch (_notifErr) {
              // Best-effort notification push
            }
          }
        }
      } catch (_e) {
        // Poll failure is non-fatal -- next interval will retry
      }
    }, _pollInterval);
  }

  /**
   * Stops the polling loop.
   */
  function _stopPolling() {
    if (_pollTimer) {
      clearInterval(_pollTimer);
      _pollTimer = null;
    }
  }

  /**
   * Starts the channel server: connects MCP via StdioServerTransport and begins polling.
   */
  async function start() {
    const StdioServerTransport = _resolveStdioTransport();
    const transport = new StdioServerTransport();
    await mcp.connect(transport);
    _startPolling();
  }

  /**
   * Stops the channel server: halts polling and closes MCP.
   */
  async function stop() {
    _stopPolling();
    try {
      await mcp.close();
    } catch (_e) {
      // Best-effort close
    }
  }

  return {
    mcp,
    start,
    stop,
    getSessionId: () => _sessionId,
  };
}

// -- Main entry point --
if (require.main === module) {
  const server = createChannelServer();
  server.start();
}

module.exports = { createChannelServer };
