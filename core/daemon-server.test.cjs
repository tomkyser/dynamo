'use strict';

const { describe, it, expect, beforeEach, afterEach } = require('bun:test');
const { createDaemonServer, _getInternalState } = require('./daemon-server.cjs');

/**
 * Tests for daemon HTTP+WS server.
 *
 * Each test creates a server on a random port (port 0),
 * runs assertions, then calls server.stop().
 */

/** @type {Object|null} */
let server = null;

/** @type {string} */
let baseUrl = '';

/**
 * Creates a mock daemon state for testing.
 *
 * @param {Object} [overrides]
 * @returns {Object}
 */
function createMockState(overrides = {}) {
  return {
    container: overrides.container || null,
    lifecycle: null,
    config: { version: '0.1.0', daemon: { port: 0 } },
    paths: null,
    circuit: null,
    pulley: overrides.pulley || null,
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    startedAt: new Date().toISOString(),
    server: null,
    ...overrides,
  };
}

/**
 * Clears internal state between tests.
 */
function clearInternalState() {
  const state = _getInternalState();
  state.sessions.clear();
  state.mailboxes.clear();
  state.modules.clear();
  // Cancel any pending poll timers
  for (const [, pending] of state.pendingPolls) {
    clearTimeout(pending.timer);
  }
  state.pendingPolls.clear();
}

describe('daemon-server', () => {
  afterEach(() => {
    if (server) {
      server.stop();
      server = null;
    }
    clearInternalState();
  });

  describe('createDaemonServer', () => {
    it('creates a Bun.serve server instance', () => {
      const state = createMockState();
      server = createDaemonServer(state);

      expect(server).toBeDefined();
      expect(typeof server.stop).toBe('function');
      expect(typeof server.port).toBe('number');
      expect(server.port).toBeGreaterThan(0);
    });

    it('exports createDaemonServer function', () => {
      const mod = require('./daemon-server.cjs');
      expect(typeof mod.createDaemonServer).toBe('function');
    });
  });

  describe('GET /health', () => {
    it('returns valid JSON with status, pid, port, uptime_seconds, modules', async () => {
      const state = createMockState();
      server = createDaemonServer(state);
      baseUrl = `http://localhost:${server.port}`;

      const res = await fetch(`${baseUrl}/health`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe('running');
      expect(body.pid).toBe(process.pid);
      expect(typeof body.port).toBe('number');
      expect(typeof body.uptime_seconds).toBe('number');
      expect(body.uptime_seconds).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(body.modules)).toBe(true);
    });

    it('includes enabled modules in health response', async () => {
      const state = createMockState();
      server = createDaemonServer(state);
      baseUrl = `http://localhost:${server.port}`;

      // Enable a module first
      await fetch(`${baseUrl}/module/enable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'reverie' }),
      });

      const res = await fetch(`${baseUrl}/health`);
      const body = await res.json();

      expect(body.modules.length).toBe(1);
      expect(body.modules[0].name).toBe('reverie');
      expect(body.modules[0].state).toBe('enabled');
    });
  });

  describe('POST /hook', () => {
    it('returns empty {} when no dispatchHook is available', async () => {
      const state = createMockState();
      server = createDaemonServer(state);
      baseUrl = `http://localhost:${server.port}`;

      const res = await fetch(`${baseUrl}/hook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SessionStart',
          payload: { session_id: 'test-123' },
          env: {},
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({});
    });

    it('calls dispatchHook when exciter has it', async () => {
      let dispatchedType = null;
      let dispatchedPayload = null;

      const mockContainer = {
        resolve(name) {
          if (name === 'exciter') {
            return {
              dispatchHook: async (type, payload, env) => {
                dispatchedType = type;
                dispatchedPayload = payload;
                return { hookSpecificOutput: { additionalContext: 'test-context' } };
              },
            };
          }
          return null;
        },
      };

      const state = createMockState({ container: mockContainer });
      server = createDaemonServer(state);
      baseUrl = `http://localhost:${server.port}`;

      const res = await fetch(`${baseUrl}/hook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SessionStart',
          payload: { session_id: 'test-123' },
          env: {},
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.hookSpecificOutput.additionalContext).toBe('test-context');
      expect(dispatchedType).toBe('SessionStart');
      expect(dispatchedPayload).toEqual({ session_id: 'test-123' });
    });

    it('returns 500 on handler error', async () => {
      const mockContainer = {
        resolve(name) {
          if (name === 'exciter') {
            return {
              dispatchHook: async () => {
                throw new Error('hook exploded');
              },
            };
          }
          return null;
        },
      };

      const state = createMockState({ container: mockContainer });
      server = createDaemonServer(state);
      baseUrl = `http://localhost:${server.port}`;

      const res = await fetch(`${baseUrl}/hook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'SessionStart', payload: {} }),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('hook exploded');
    });

    it('returns 400 on invalid JSON body', async () => {
      const state = createMockState();
      server = createDaemonServer(state);
      baseUrl = `http://localhost:${server.port}`;

      const res = await fetch(`${baseUrl}/hook`, {
        method: 'POST',
        body: 'not json',
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /cli', () => {
    it('returns CLI not implemented when no pulley available', async () => {
      const state = createMockState();
      server = createDaemonServer(state);
      baseUrl = `http://localhost:${server.port}`;

      const res = await fetch(`${baseUrl}/cli`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'status', args: [], flags: {} }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.output).toBe('CLI forwarding not implemented');
      expect(body.exitCode).toBe(1);
    });

    it('forwards to pulley executeCommand when available', async () => {
      const mockContainer = {
        resolve(name) {
          if (name === 'pulley') {
            return {
              executeCommand: async (cmd, args) => ({
                output: `executed: ${cmd} ${args.join(' ')}`,
                exitCode: 0,
              }),
            };
          }
          return null;
        },
      };

      const state = createMockState({ container: mockContainer });
      server = createDaemonServer(state);
      baseUrl = `http://localhost:${server.port}`;

      const res = await fetch(`${baseUrl}/cli`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'reverie', args: ['status'], flags: {} }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.output).toBe('executed: reverie status');
      expect(body.exitCode).toBe(0);
    });
  });

  describe('POST /shutdown', () => {
    it('returns shutting_down status', async () => {
      // Prevent actual shutdown by removing the SIGTERM listener temporarily
      const listeners = process.listeners('SIGTERM');
      process.removeAllListeners('SIGTERM');

      const state = createMockState();
      server = createDaemonServer(state);
      baseUrl = `http://localhost:${server.port}`;

      const res = await fetch(`${baseUrl}/shutdown`, { method: 'POST' });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('shutting_down');

      // Restore listeners
      for (const l of listeners) {
        process.on('SIGTERM', l);
      }
    });
  });

  describe('POST /module/enable', () => {
    it('sets module state to enabled', async () => {
      const state = createMockState();
      server = createDaemonServer(state);
      baseUrl = `http://localhost:${server.port}`;

      const res = await fetch(`${baseUrl}/module/enable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'test-module' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('enabled');
      expect(body.module).toBe('test-module');
    });

    it('returns 400 when module name missing', async () => {
      const state = createMockState();
      server = createDaemonServer(state);
      baseUrl = `http://localhost:${server.port}`;

      const res = await fetch(`${baseUrl}/module/enable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /module/disable', () => {
    it('sets module state to disabled', async () => {
      const state = createMockState();
      server = createDaemonServer(state);
      baseUrl = `http://localhost:${server.port}`;

      // Enable first
      await fetch(`${baseUrl}/module/enable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'test-module' }),
      });

      // Then disable
      const res = await fetch(`${baseUrl}/module/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'test-module' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('disabled');
      expect(body.module).toBe('test-module');
    });
  });

  describe('Wire relay routes', () => {
    beforeEach(() => {
      const state = createMockState();
      server = createDaemonServer(state);
      baseUrl = `http://localhost:${server.port}`;
    });

    it('POST /wire/register creates a session entry', async () => {
      const res = await fetch(`${baseUrl}/wire/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'sess-1', capabilities: { role: 'primary' } }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);

      const { sessions } = _getInternalState();
      expect(sessions.has('sess-1')).toBe(true);
    });

    it('POST /wire/register returns 400 without sessionId', async () => {
      const res = await fetch(`${baseUrl}/wire/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it('POST /wire/send delivers envelope to mailbox', async () => {
      // Register a session first
      await fetch(`${baseUrl}/wire/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'target-1' }),
      });

      // Send an envelope
      const envelope = {
        id: 'env-1',
        from: 'sess-a',
        to: 'target-1',
        type: 'snapshot',
        urgency: 'active',
        payload: { data: 'test' },
        timestamp: new Date().toISOString(),
      };

      const res = await fetch(`${baseUrl}/wire/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.delivered).toBe(true);

      // Verify mailbox
      const { mailboxes } = _getInternalState();
      expect(mailboxes.get('target-1').length).toBe(1);
      expect(mailboxes.get('target-1')[0].id).toBe('env-1');
    });

    it('POST /wire/send returns 400 for invalid envelope', async () => {
      const res = await fetch(`${baseUrl}/wire/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missing: 'fields' }),
      });

      expect(res.status).toBe(400);
    });

    it('POST /wire/send-batch delivers multiple envelopes', async () => {
      // Register target session
      await fetch(`${baseUrl}/wire/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'batch-target' }),
      });

      const envelopes = [
        {
          id: 'batch-1',
          from: 'sender',
          to: 'batch-target',
          type: 'snapshot',
          urgency: 'active',
          payload: {},
          timestamp: new Date().toISOString(),
        },
        {
          id: 'batch-2',
          from: 'sender',
          to: 'batch-target',
          type: 'heartbeat',
          urgency: 'background',
          payload: {},
          timestamp: new Date().toISOString(),
        },
      ];

      const res = await fetch(`${baseUrl}/wire/send-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envelopes }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.results.length).toBe(2);
      expect(body.results[0].ok).toBe(true);
      expect(body.results[1].ok).toBe(true);
    });

    it('GET /wire/poll returns messages from mailbox', async () => {
      // Register and send
      await fetch(`${baseUrl}/wire/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'poll-sess' }),
      });

      const envelope = {
        id: 'poll-env-1',
        from: 'sender',
        to: 'poll-sess',
        type: 'snapshot',
        urgency: 'active',
        payload: { test: true },
        timestamp: new Date().toISOString(),
      };

      await fetch(`${baseUrl}/wire/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      // Poll
      const res = await fetch(`${baseUrl}/wire/poll?sessionId=poll-sess&timeout=100`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.messages.length).toBe(1);
      expect(body.messages[0].id).toBe('poll-env-1');
    });

    it('GET /wire/poll returns empty after timeout on empty mailbox', async () => {
      await fetch(`${baseUrl}/wire/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'timeout-sess' }),
      });

      const res = await fetch(`${baseUrl}/wire/poll?sessionId=timeout-sess&timeout=100`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.messages).toEqual([]);
    });

    it('GET /wire/poll returns 404 for unregistered session', async () => {
      const res = await fetch(`${baseUrl}/wire/poll?sessionId=nonexistent&timeout=100`);
      expect(res.status).toBe(404);
    });

    it('POST /wire/unregister removes session and flushes mailbox', async () => {
      await fetch(`${baseUrl}/wire/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'unreg-sess' }),
      });

      const res = await fetch(`${baseUrl}/wire/unregister`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'unreg-sess' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);

      const { sessions } = _getInternalState();
      expect(sessions.has('unreg-sess')).toBe(false);
    });

    it('GET /wire/health returns session count', async () => {
      await fetch(`${baseUrl}/wire/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'health-sess-1' }),
      });

      const res = await fetch(`${baseUrl}/wire/health`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('ok');
      expect(body.sessions).toBeGreaterThanOrEqual(1);
    });

    it('register + send + poll round-trip works', async () => {
      // Register two sessions
      await fetch(`${baseUrl}/wire/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'primary' }),
      });
      await fetch(`${baseUrl}/wire/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'secondary' }),
      });

      // Send from primary to secondary
      const envelope = {
        id: 'roundtrip-1',
        from: 'primary',
        to: 'secondary',
        type: 'context-injection',
        urgency: 'directive',
        payload: { face_prompt: 'test prompt' },
        timestamp: new Date().toISOString(),
      };

      await fetch(`${baseUrl}/wire/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope),
      });

      // Poll from secondary
      const pollRes = await fetch(`${baseUrl}/wire/poll?sessionId=secondary&timeout=100`);
      const pollBody = await pollRes.json();

      expect(pollBody.messages.length).toBe(1);
      expect(pollBody.messages[0].from).toBe('primary');
      expect(pollBody.messages[0].to).toBe('secondary');
      expect(pollBody.messages[0].payload.face_prompt).toBe('test prompt');

      // Second poll should be empty (messages consumed)
      const pollRes2 = await fetch(`${baseUrl}/wire/poll?sessionId=secondary&timeout=100`);
      const pollBody2 = await pollRes2.json();
      expect(pollBody2.messages).toEqual([]);
    });
  });

  describe('404 on unknown routes', () => {
    it('returns 404 for unmatched route', async () => {
      const state = createMockState();
      server = createDaemonServer(state);
      baseUrl = `http://localhost:${server.port}`;

      const res = await fetch(`${baseUrl}/nonexistent`);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Not found');
    });

    it('returns 404 for wrong method on known route', async () => {
      const state = createMockState();
      server = createDaemonServer(state);
      baseUrl = `http://localhost:${server.port}`;

      // GET on a POST-only route
      const res = await fetch(`${baseUrl}/hook`);
      expect(res.status).toBe(404);
    });
  });
});
