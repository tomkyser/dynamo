'use strict';

const { validateEnvelope } = require('./protocol.cjs');

/**
 * Wire relay server -- standalone Bun.serve HTTP+WebSocket process.
 * Per D-08: Relay runs as separate Bun process managed by Conductor.
 *
 * Endpoints:
 *   POST /register   - Register a session
 *   POST /unregister - Unregister a session
 *   POST /send       - Send a single envelope
 *   POST /send-batch - Send a batch of envelopes
 *   GET  /poll       - Long-poll for messages
 *   GET  /health     - Health check
 *   GET  /ws         - WebSocket upgrade
 *
 * Configuration via env:
 *   WIRE_RELAY_PORT     - Server port (default: 9876)
 *   WIRE_POLL_TIMEOUT_MS - Long-poll timeout in ms (default: 30000)
 */

const DEFAULT_PORT = 9876;
const DEFAULT_POLL_TIMEOUT_MS = 30000;

/**
 * Parses JSON body from a Request. Returns parsed object or null on failure.
 *
 * @param {Request} req
 * @returns {Promise<Object|null>}
 */
async function _parseJsonBody(req) {
  try {
    return await req.json();
  } catch (_e) {
    return null;
  }
}

/**
 * Creates a JSON Response.
 *
 * @param {Object} data
 * @param {number} [status=200]
 * @returns {Response}
 */
function _jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Creates and starts a relay server instance.
 * Exported for test isolation -- tests use random ports.
 *
 * @param {Object} [config]
 * @param {number} [config.port] - Port to listen on (0 = random)
 * @param {number} [config.pollTimeoutMs] - Long-poll timeout in ms
 * @returns {Object} Bun server instance (has .stop(), .port, .url)
 */
function _createServer(config = {}) {
  const port = config.port !== undefined ? config.port : DEFAULT_PORT;
  const pollTimeoutMs = config.pollTimeoutMs !== undefined ? config.pollTimeoutMs : DEFAULT_POLL_TIMEOUT_MS;

  /** @type {Map<string, { registeredAt: number, lastSeen: number }>} */
  const _sessions = new Map();

  /** @type {Map<string, Object[]>} */
  const _mailboxes = new Map();

  /** @type {Map<string, { resolve: Function, timer: any }>} */
  const _pendingPolls = new Map();

  /** @type {Map<any, string>} WS-to-sessionId mapping */
  const _wsClients = new Map();

  /**
   * Delivers an envelope to a target session's mailbox.
   * If the target has a pending poll, resolves it immediately.
   *
   * @param {Object} envelope
   * @returns {boolean} Whether the target session exists
   */
  function _deliverToMailbox(envelope) {
    const targetId = envelope.to;
    if (!_sessions.has(targetId)) {
      return false;
    }

    // Check for pending poll -- resolve immediately with this message
    const pending = _pendingPolls.get(targetId);
    if (pending) {
      clearTimeout(pending.timer);
      _pendingPolls.delete(targetId);
      pending.resolve(_jsonResponse({ messages: [envelope] }));
      return true;
    }

    // Queue in mailbox
    if (!_mailboxes.has(targetId)) {
      _mailboxes.set(targetId, []);
    }
    _mailboxes.get(targetId).push(envelope);
    return true;
  }

  const server = Bun.serve({
    port,

    async fetch(req, server) {
      const url = new URL(req.url);
      const method = req.method;
      const path = url.pathname;

      // -- WebSocket upgrade --
      if (path === '/ws' && method === 'GET') {
        const upgraded = server.upgrade(req);
        if (!upgraded) {
          return _jsonResponse({ error: 'WebSocket upgrade failed' }, 400);
        }
        return undefined;
      }

      // -- POST /register --
      if (path === '/register' && method === 'POST') {
        const body = await _parseJsonBody(req);
        if (!body || !body.sessionId) {
          return _jsonResponse({ error: 'Missing sessionId' }, 400);
        }

        _sessions.set(body.sessionId, {
          registeredAt: Date.now(),
          lastSeen: Date.now(),
        });
        _mailboxes.set(body.sessionId, []);
        return _jsonResponse({ ok: true });
      }

      // -- POST /unregister --
      if (path === '/unregister' && method === 'POST') {
        const body = await _parseJsonBody(req);
        if (!body || !body.sessionId) {
          return _jsonResponse({ error: 'Missing sessionId' }, 400);
        }

        _sessions.delete(body.sessionId);
        _mailboxes.delete(body.sessionId);

        // Resolve any pending poll for this session
        const pending = _pendingPolls.get(body.sessionId);
        if (pending) {
          clearTimeout(pending.timer);
          _pendingPolls.delete(body.sessionId);
          pending.resolve(_jsonResponse({ messages: [] }));
        }

        return _jsonResponse({ ok: true });
      }

      // -- POST /send --
      if (path === '/send' && method === 'POST') {
        const body = await _parseJsonBody(req);
        if (!body) {
          return _jsonResponse({ error: 'Invalid JSON body' }, 400);
        }

        const validation = validateEnvelope(body);
        if (!validation.ok) {
          return _jsonResponse({ error: validation.error.message }, 400);
        }

        const delivered = _deliverToMailbox(body);
        return _jsonResponse({ ok: true, delivered });
      }

      // -- POST /send-batch --
      if (path === '/send-batch' && method === 'POST') {
        const body = await _parseJsonBody(req);
        if (!body || !Array.isArray(body)) {
          return _jsonResponse({ error: 'Body must be a JSON array of envelopes' }, 400);
        }

        const results = [];
        for (const envelope of body) {
          const validation = validateEnvelope(envelope);
          if (!validation.ok) {
            results.push({ id: envelope.id || null, ok: false, error: validation.error.message });
            continue;
          }
          const delivered = _deliverToMailbox(envelope);
          results.push({ id: envelope.id, ok: true, delivered });
        }

        return _jsonResponse({ ok: true, results });
      }

      // -- GET /poll --
      if (path === '/poll' && method === 'GET') {
        const sessionId = url.searchParams.get('sessionId');
        if (!sessionId) {
          return _jsonResponse({ error: 'Missing sessionId query param' }, 400);
        }

        if (!_sessions.has(sessionId)) {
          return _jsonResponse({ error: 'Session not registered' }, 404);
        }

        // Update last seen
        const session = _sessions.get(sessionId);
        session.lastSeen = Date.now();

        // Check mailbox for existing messages
        const mailbox = _mailboxes.get(sessionId) || [];
        if (mailbox.length > 0) {
          _mailboxes.set(sessionId, []);
          return _jsonResponse({ messages: mailbox });
        }

        // Long-poll: wait for messages or timeout
        const timeout = parseInt(url.searchParams.get('timeout') || String(pollTimeoutMs), 10);
        return new Promise((resolve) => {
          const timer = setTimeout(() => {
            _pendingPolls.delete(sessionId);
            resolve(_jsonResponse({ messages: [] }));
          }, timeout);

          _pendingPolls.set(sessionId, { resolve, timer });
        });
      }

      // -- GET /health --
      if (path === '/health' && method === 'GET') {
        return _jsonResponse({
          status: 'ok',
          sessions: _sessions.size,
          uptime: process.uptime(),
        });
      }

      // -- 404 --
      return _jsonResponse({ error: 'Not found' }, 404);
    },

    websocket: {
      open(ws) {
        // Wait for registration frame
      },

      message(ws, data) {
        try {
          const frame = typeof data === 'string' ? JSON.parse(data) : JSON.parse(new TextDecoder().decode(data));

          if (frame.type === 'register' && frame.sessionId) {
            _wsClients.set(ws, frame.sessionId);
            _sessions.set(frame.sessionId, {
              registeredAt: Date.now(),
              lastSeen: Date.now(),
            });
            _mailboxes.set(frame.sessionId, []);
            ws.send(JSON.stringify({ type: 'registered', sessionId: frame.sessionId }));
            return;
          }

          if (frame.type === 'send' && frame.envelope) {
            const validation = validateEnvelope(frame.envelope);
            if (!validation.ok) {
              ws.send(JSON.stringify({ type: 'error', message: validation.error.message }));
              return;
            }
            const delivered = _deliverToMailbox(frame.envelope);
            ws.send(JSON.stringify({ type: 'sent', id: frame.envelope.id, delivered }));
            return;
          }

          ws.send(JSON.stringify({ type: 'error', message: 'Unknown frame type' }));
        } catch (e) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON frame' }));
        }
      },

      close(ws) {
        const sessionId = _wsClients.get(ws);
        if (sessionId) {
          _wsClients.delete(ws);
          // Note: we do NOT auto-unregister on WS close.
          // Session may reconnect via HTTP or a new WS connection.
        }
      },
    },
  });

  return server;
}

// -- Main entry point --
if (require.main === module) {
  const port = parseInt(process.env.WIRE_RELAY_PORT || String(DEFAULT_PORT), 10);
  const pollTimeoutMs = parseInt(process.env.WIRE_POLL_TIMEOUT_MS || String(DEFAULT_POLL_TIMEOUT_MS), 10);

  const server = _createServer({ port, pollTimeoutMs });
  console.log(`Wire relay server listening on port ${server.port}`);

  // Graceful shutdown on SIGTERM (sent by stop command via process.kill)
  process.on('SIGTERM', function () {
    if (server && typeof server.stop === 'function') {
      server.stop();
    }
    process.exit(0);
  });
}

module.exports = { _createServer };
