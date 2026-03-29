'use strict';

/**
 * Dynamo daemon HTTP+WS server.
 *
 * Single Bun.serve instance handling all daemon communication via URL routing:
 *   /hook           -> Exciter hook dispatch
 *   /cli            -> Pulley CLI command forwarding
 *   /health         -> Daemon status and module list
 *   /shutdown       -> Graceful shutdown trigger
 *   /module/enable  -> Module lifecycle enable
 *   /module/disable -> Module lifecycle disable
 *   /wire/register  -> Wire relay session registration
 *   /wire/unregister-> Wire relay session unregistration
 *   /wire/send      -> Wire relay single envelope
 *   /wire/send-batch-> Wire relay batch envelopes
 *   /wire/poll      -> Wire relay long-poll
 *   /wire/health    -> Wire relay health
 *   /ws             -> WebSocket upgrade for Wire persistent connections
 *
 * Per D-03: One server, one port, three concerns (hook, CLI, Wire).
 * Per D-13: Wire relay merged into daemon (not a separate process).
 */

const DEFAULT_PORT = 9876;
const DEFAULT_POLL_TIMEOUT_MS = 30000;

// -- Internal state (module-level for WebSocket handler access) --

/** @type {Map<string, { capabilities: Object, registeredAt: number, lastSeen: number }>} */
const _sessions = new Map();

/** @type {Map<string, Object[]>} */
const _mailboxes = new Map();

/** @type {Map<string, { resolve: Function, timer: any }>} */
const _pendingPolls = new Map();

/** @type {Map<string, { state: string, instance: Object|null }>} */
const _modules = new Map();

/** @type {Map<any, string>} WS-to-sessionId mapping */
const _wsClients = new Map();

/** @type {Object|null} The Bun.serve server instance */
let _server = null;

// -- Helper functions --

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
 * Delivers an envelope to a target session's mailbox.
 * If the target has a pending poll, resolves it immediately.
 *
 * @param {string} sessionId - Target session ID
 * @param {Object} envelope - The message envelope
 * @returns {boolean} Whether the target session exists
 */
function _deliverToMailbox(sessionId, envelope) {
  if (!_sessions.has(sessionId)) {
    return false;
  }

  // Check for pending poll -- resolve immediately with this message
  const pending = _pendingPolls.get(sessionId);
  if (pending) {
    clearTimeout(pending.timer);
    _pendingPolls.delete(sessionId);
    pending.resolve(_jsonResponse({ messages: [envelope] }));
    return true;
  }

  // Queue in mailbox
  if (!_mailboxes.has(sessionId)) {
    _mailboxes.set(sessionId, []);
  }
  _mailboxes.get(sessionId).push(envelope);
  return true;
}

/**
 * Validates a Wire message envelope at transport boundary.
 * Inline validation to avoid requiring the full Wire protocol module
 * (which has deep lib/ dependencies not present in daemon context).
 *
 * @param {Object} envelope
 * @returns {{ ok: boolean, error?: { message: string } }}
 */
function _validateEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object') {
    return { ok: false, error: { message: 'Envelope must be a non-null object' } };
  }
  if (!envelope.id) {
    return { ok: false, error: { message: 'Missing required field: id' } };
  }
  if (!envelope.from) {
    return { ok: false, error: { message: 'Missing required field: from' } };
  }
  if (!envelope.to) {
    return { ok: false, error: { message: 'Missing required field: to' } };
  }
  if (!envelope.type) {
    return { ok: false, error: { message: 'Missing required field: type' } };
  }
  if (!envelope.timestamp) {
    return { ok: false, error: { message: 'Missing required field: timestamp' } };
  }
  return { ok: true };
}

// -- Route handlers --

/**
 * POST /hook -> Hook dispatch via Exciter.
 *
 * @param {Object} state - Daemon state
 * @param {Request} req
 * @returns {Promise<Response>}
 */
async function _handleHook(state, req) {
  const body = await _parseJsonBody(req);
  if (!body) {
    return _jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  try {
    const exciter = state.container?.resolve?.('exciter');
    if (exciter && typeof exciter.dispatchHook === 'function') {
      const result = await exciter.dispatchHook(body.type, body.payload, body.env);
      return _jsonResponse(result || {});
    }
    // No dispatchHook available yet -- graceful no-op
    return _jsonResponse({});
  } catch (err) {
    return _jsonResponse({ error: err.message }, 500);
  }
}

/**
 * POST /cli -> CLI command forwarding via Pulley.
 *
 * @param {Object} state - Daemon state
 * @param {Request} req
 * @returns {Promise<Response>}
 */
async function _handleCli(state, req) {
  const body = await _parseJsonBody(req);
  if (!body) {
    return _jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  try {
    const pulley = state.container?.resolve?.('pulley') || state.pulley;
    if (pulley && typeof pulley.executeCommand === 'function') {
      const result = await pulley.executeCommand(body.command, body.args, body.flags);
      return _jsonResponse({ output: result.output || '', exitCode: result.exitCode || 0 });
    }
    return _jsonResponse({ output: 'CLI forwarding not implemented', exitCode: 1 });
  } catch (err) {
    return _jsonResponse({ output: err.message, exitCode: 1 });
  }
}

/**
 * GET /health -> Daemon health check.
 *
 * @param {Object} state - Daemon state
 * @returns {Response}
 */
function _handleHealth(state) {
  const uptimeMs = Date.now() - new Date(state.startedAt).getTime();
  return _jsonResponse({
    status: 'running',
    pid: process.pid,
    port: _server ? _server.port : 0,
    uptime_seconds: Math.floor(uptimeMs / 1000),
    modules: Array.from(_modules.entries()).map(([name, m]) => ({
      name,
      state: m.state,
      has_instance: m.instance !== null,
    })),
    module_count: _modules.size,
  });
}

/**
 * POST /shutdown -> Graceful shutdown trigger.
 *
 * @param {Object} state - Daemon state
 * @returns {Response}
 */
function _handleShutdown(state) {
  if (state.logger) {
    state.logger.info('daemon', 'Shutdown requested via HTTP');
  }
  // Trigger the signal handler in daemon.cjs
  process.emit('SIGTERM');
  return _jsonResponse({ status: 'shutting_down' });
}

/**
 * POST /module/enable -> Enable a module via Circuit lifecycle.
 *
 * Delegates to circuit.enableModule() when Circuit is available in daemon state.
 * Falls back to simple state tracking when Circuit is not yet bootstrapped.
 *
 * @param {Object} state - Daemon state
 * @param {Request} req
 * @returns {Promise<Response>}
 */
async function _handleModuleEnable(state, req) {
  const body = await _parseJsonBody(req);
  if (!body || !body.module) {
    return _jsonResponse({ error: 'Missing module name' }, 400);
  }

  const moduleName = body.module;

  try {
    // Delegate to Circuit if available
    const circuit = state.circuit;
    if (circuit && typeof circuit.enableModule === 'function') {
      const result = await circuit.enableModule(moduleName);
      _modules.set(moduleName, { state: 'enabled', instance: result.instance || null });
      return _jsonResponse({ status: 'enabled', module: moduleName });
    }

    // Fallback: simple state tracking when Circuit not bootstrapped
    const existing = _modules.get(moduleName);
    if (existing) {
      existing.state = 'enabled';
    } else {
      _modules.set(moduleName, { state: 'enabled', instance: null });
    }

    return _jsonResponse({ status: 'enabled', module: moduleName });
  } catch (e) {
    return _jsonResponse({ error: e.message }, 500);
  }
}

/**
 * POST /module/disable -> Disable a module via Circuit lifecycle.
 *
 * Delegates to circuit.disableModule() when Circuit is available in daemon state.
 * Falls back to simple state tracking when Circuit is not yet bootstrapped.
 *
 * @param {Object} state - Daemon state
 * @param {Request} req
 * @returns {Promise<Response>}
 */
async function _handleModuleDisable(state, req) {
  const body = await _parseJsonBody(req);
  if (!body || !body.module) {
    return _jsonResponse({ error: 'Missing module name' }, 400);
  }

  const moduleName = body.module;

  try {
    // Delegate to Circuit if available
    const circuit = state.circuit;
    if (circuit && typeof circuit.disableModule === 'function') {
      await circuit.disableModule(moduleName);
      const existing = _modules.get(moduleName);
      if (existing) {
        existing.state = 'disabled';
        existing.instance = null;
      } else {
        _modules.set(moduleName, { state: 'disabled', instance: null });
      }

      return _jsonResponse({ status: 'disabled', module: moduleName });
    }

    // Fallback: simple state tracking
    const existing = _modules.get(moduleName);
    if (existing) {
      existing.state = 'disabled';
    } else {
      _modules.set(moduleName, { state: 'disabled', instance: null });
    }

    return _jsonResponse({ status: 'disabled', module: moduleName });
  } catch (e) {
    return _jsonResponse({ error: e.message }, 500);
  }
}

/**
 * POST /wire/register -> Register a Wire relay session.
 *
 * @param {Request} req
 * @returns {Promise<Response>}
 */
async function _handleWireRegister(req) {
  const body = await _parseJsonBody(req);
  if (!body || !body.sessionId) {
    return _jsonResponse({ error: 'Missing sessionId' }, 400);
  }

  _sessions.set(body.sessionId, {
    capabilities: body.capabilities || {},
    registeredAt: Date.now(),
    lastSeen: Date.now(),
  });
  _mailboxes.set(body.sessionId, []);

  return _jsonResponse({ ok: true });
}

/**
 * POST /wire/unregister -> Unregister a Wire relay session.
 *
 * @param {Request} req
 * @returns {Promise<Response>}
 */
async function _handleWireUnregister(req) {
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

/**
 * POST /wire/send -> Send a single Wire envelope.
 *
 * @param {Request} req
 * @returns {Promise<Response>}
 */
async function _handleWireSend(req) {
  const body = await _parseJsonBody(req);
  if (!body) {
    return _jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const validation = _validateEnvelope(body);
  if (!validation.ok) {
    return _jsonResponse({ error: validation.error.message }, 400);
  }

  const delivered = _deliverToMailbox(body.to, body);
  return _jsonResponse({ ok: true, delivered });
}

/**
 * POST /wire/send-batch -> Send batch of Wire envelopes.
 *
 * @param {Request} req
 * @returns {Promise<Response>}
 */
async function _handleWireSendBatch(req) {
  const body = await _parseJsonBody(req);
  if (!body || !body.envelopes || !Array.isArray(body.envelopes)) {
    return _jsonResponse({ error: 'Body must contain envelopes array' }, 400);
  }

  const results = [];
  for (const envelope of body.envelopes) {
    const validation = _validateEnvelope(envelope);
    if (!validation.ok) {
      results.push({ id: envelope.id || null, ok: false, error: validation.error.message });
      continue;
    }
    const delivered = _deliverToMailbox(envelope.to, envelope);
    results.push({ id: envelope.id, ok: true, delivered });
  }

  return _jsonResponse({ ok: true, results });
}

/**
 * GET /wire/poll -> Long-poll for Wire messages.
 *
 * @param {URL} url
 * @returns {Response|Promise<Response>}
 */
function _handleWirePoll(url) {
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
  const timeout = parseInt(url.searchParams.get('timeout') || String(DEFAULT_POLL_TIMEOUT_MS), 10);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      _pendingPolls.delete(sessionId);
      resolve(_jsonResponse({ messages: [] }));
    }, timeout);

    _pendingPolls.set(sessionId, { resolve, timer });
  });
}

/**
 * GET /wire/health -> Wire relay health status.
 *
 * @returns {Response}
 */
function _handleWireHealth() {
  const mailboxSizes = {};
  for (const [sid, msgs] of _mailboxes) {
    mailboxSizes[sid] = msgs.length;
  }

  return _jsonResponse({
    status: 'ok',
    sessions: _sessions.size,
    mailboxSizes,
  });
}

// -- Main server factory --

/**
 * Creates and starts the daemon HTTP+WS server.
 *
 * @param {Object} state - Daemon state from daemon.cjs getState()
 * @param {Object} [state.container] - IoC container (may be null in minimal mode)
 * @param {Object} [state.config] - Configuration object
 * @param {string} state.startedAt - ISO timestamp of daemon start
 * @param {Object} [state.logger] - Daemon logger
 * @returns {Object} Bun server instance (has .stop(), .port, .url)
 */
function createDaemonServer(state) {
  // Port resolution: explicit config > env var > default
  // Note: port 0 means "auto-assign" (used in tests), so we must check
  // for undefined/null, not just falsy, to allow port 0 through.
  const configPort = state.config?.daemon?.port;
  const envPort = process.env.DYNAMO_PORT ? parseInt(process.env.DYNAMO_PORT, 10) : undefined;
  const serverPort = configPort !== undefined && configPort !== null
    ? configPort
    : (envPort !== undefined ? envPort : DEFAULT_PORT);

  _server = Bun.serve({
    port: serverPort,

    async fetch(req, server) {
      const url = new URL(req.url);
      const pathname = url.pathname;
      const method = req.method;

      // -- WebSocket upgrade --
      if (pathname === '/ws' && method === 'GET') {
        const sessionId = url.searchParams.get('sessionId');
        const upgraded = server.upgrade(req, { data: { sessionId: sessionId || null } });
        if (!upgraded) {
          return _jsonResponse({ error: 'WebSocket upgrade failed' }, 400);
        }
        return undefined;
      }

      // -- Hook dispatch --
      if (pathname === '/hook' && method === 'POST') {
        return _handleHook(state, req);
      }

      // -- CLI forwarding --
      if (pathname === '/cli' && method === 'POST') {
        return _handleCli(state, req);
      }

      // -- Health check --
      if (pathname === '/health' && method === 'GET') {
        return _handleHealth(state);
      }

      // -- Shutdown --
      if (pathname === '/shutdown' && method === 'POST') {
        return _handleShutdown(state);
      }

      // -- Module enable --
      if (pathname === '/module/enable' && method === 'POST') {
        return _handleModuleEnable(state, req);
      }

      // -- Module disable --
      if (pathname === '/module/disable' && method === 'POST') {
        return _handleModuleDisable(state, req);
      }

      // -- Wire relay routes --
      if (pathname === '/wire/register' && method === 'POST') {
        return _handleWireRegister(req);
      }

      if (pathname === '/wire/unregister' && method === 'POST') {
        return _handleWireUnregister(req);
      }

      if (pathname === '/wire/send' && method === 'POST') {
        return _handleWireSend(req);
      }

      if (pathname === '/wire/send-batch' && method === 'POST') {
        return _handleWireSendBatch(req);
      }

      if (pathname === '/wire/poll' && method === 'GET') {
        return _handleWirePoll(url);
      }

      if (pathname === '/wire/health' && method === 'GET') {
        return _handleWireHealth();
      }

      // -- 404 fallthrough --
      return _jsonResponse({ error: 'Not found' }, 404);
    },

    websocket: {
      open(ws) {
        // If sessionId was passed via query param on upgrade
        const sessionId = ws.data?.sessionId;
        if (sessionId) {
          _wsClients.set(ws, sessionId);
          if (!_sessions.has(sessionId)) {
            _sessions.set(sessionId, {
              capabilities: {},
              registeredAt: Date.now(),
              lastSeen: Date.now(),
            });
            _mailboxes.set(sessionId, []);
          }
          ws.send(JSON.stringify({ type: 'registered', sessionId }));
        }
        // Otherwise, wait for registration frame
      },

      message(ws, data) {
        try {
          const frame = typeof data === 'string'
            ? JSON.parse(data)
            : JSON.parse(new TextDecoder().decode(data));

          if (frame.type === 'register' && frame.sessionId) {
            _wsClients.set(ws, frame.sessionId);
            _sessions.set(frame.sessionId, {
              capabilities: frame.capabilities || {},
              registeredAt: Date.now(),
              lastSeen: Date.now(),
            });
            _mailboxes.set(frame.sessionId, []);
            ws.send(JSON.stringify({ type: 'registered', sessionId: frame.sessionId }));
            return;
          }

          if (frame.type === 'send' && frame.envelope) {
            const validation = _validateEnvelope(frame.envelope);
            if (!validation.ok) {
              ws.send(JSON.stringify({ type: 'error', message: validation.error.message }));
              return;
            }
            const delivered = _deliverToMailbox(frame.envelope.to, frame.envelope);
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

  return _server;
}

module.exports = {
  createDaemonServer,
  _getInternalState: () => ({
    sessions: _sessions,
    mailboxes: _mailboxes,
    modules: _modules,
    pendingPolls: _pendingPolls,
  }),
};
