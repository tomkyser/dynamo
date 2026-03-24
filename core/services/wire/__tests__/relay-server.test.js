'use strict';

const { describe, it, expect, beforeAll, afterAll } = require('bun:test');
const { _createServer } = require('../relay-server.cjs');
const { createEnvelope, MESSAGE_TYPES, URGENCY_LEVELS } = require('../protocol.cjs');
const { unwrap } = require('../../../../lib/index.cjs');

// -- Test setup: one server instance for all tests --
let server;
let baseUrl;

beforeAll(() => {
  server = _createServer({ port: 0, pollTimeoutMs: 500 });
  baseUrl = `http://127.0.0.1:${server.port}`;
});

afterAll(() => {
  if (server) {
    server.stop(true);
  }
});

/** Helper: POST JSON to a relay endpoint */
async function post(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

/** Helper: GET from a relay endpoint */
async function get(path) {
  const response = await fetch(`${baseUrl}${path}`);
  return { status: response.status, data: await response.json() };
}

/** Helper: create a valid test envelope */
function testEnvelope(overrides = {}) {
  const result = createEnvelope({
    from: 'session-a',
    to: 'session-b',
    type: MESSAGE_TYPES.DIRECTIVE,
    urgency: URGENCY_LEVELS.ACTIVE,
    payload: { text: 'test message' },
    ...overrides,
  });
  return unwrap(result);
}

// -- Tests --

describe('Relay Server', () => {
  describe('GET /health', () => {
    it('returns ok status and session count', async () => {
      const { status, data } = await get('/health');
      expect(status).toBe(200);
      expect(data.status).toBe('ok');
      expect(typeof data.sessions).toBe('number');
      expect(typeof data.uptime).toBe('number');
    });
  });

  describe('POST /register', () => {
    it('registers a session and returns ok', async () => {
      const { status, data } = await post('/register', { sessionId: 'reg-test-1' });
      expect(status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it('returns 400 for missing sessionId', async () => {
      const { status } = await post('/register', {});
      expect(status).toBe(400);
    });

    it('session appears in health check after registration', async () => {
      await post('/register', { sessionId: 'reg-test-health' });
      const { data } = await get('/health');
      expect(data.sessions).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /send', () => {
    it('delivers message to registered session', async () => {
      await post('/register', { sessionId: 'send-target' });
      const envelope = testEnvelope({ to: 'send-target' });
      const { status, data } = await post('/send', envelope);
      expect(status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.delivered).toBe(true);
    });

    it('returns delivered:false for unregistered target', async () => {
      const envelope = testEnvelope({ to: 'nonexistent-session' });
      const { status, data } = await post('/send', envelope);
      expect(status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.delivered).toBe(false);
    });

    it('returns 400 for invalid envelope', async () => {
      const { status, data } = await post('/send', { invalid: true });
      expect(status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('returns 400 for invalid JSON body', async () => {
      const response = await fetch(`${baseUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      });
      expect(response.status).toBe(400);
    });
  });

  describe('GET /poll', () => {
    it('returns messages already in mailbox', async () => {
      const sid = 'poll-immediate';
      await post('/register', { sessionId: sid });
      const envelope = testEnvelope({ to: sid });
      await post('/send', envelope);

      const { status, data } = await get(`/poll?sessionId=${sid}&timeout=500`);
      expect(status).toBe(200);
      expect(data.messages).toHaveLength(1);
      expect(data.messages[0].id).toBe(envelope.id);
    });

    it('long-polls and resolves with empty array on timeout', async () => {
      const sid = 'poll-timeout';
      await post('/register', { sessionId: sid });

      const start = Date.now();
      const { status, data } = await get(`/poll?sessionId=${sid}&timeout=200`);
      const elapsed = Date.now() - start;

      expect(status).toBe(200);
      expect(data.messages).toHaveLength(0);
      // Should have waited roughly the timeout duration
      expect(elapsed).toBeGreaterThanOrEqual(150);
    });

    it('resolves immediately when message arrives during poll', async () => {
      const sid = 'poll-push';
      await post('/register', { sessionId: sid });

      // Start a long poll
      const pollPromise = get(`/poll?sessionId=${sid}&timeout=5000`);

      // Send a message after a short delay
      await new Promise(r => setTimeout(r, 50));
      const envelope = testEnvelope({ to: sid });
      await post('/send', envelope);

      const { status, data } = await pollPromise;
      expect(status).toBe(200);
      expect(data.messages).toHaveLength(1);
      expect(data.messages[0].id).toBe(envelope.id);
    });

    it('returns 400 for missing sessionId', async () => {
      const { status } = await get('/poll');
      expect(status).toBe(400);
    });

    it('returns 404 for unregistered session', async () => {
      const { status } = await get('/poll?sessionId=unknown-session');
      expect(status).toBe(404);
    });
  });

  describe('POST /send-batch', () => {
    it('delivers a batch of envelopes', async () => {
      const sid = 'batch-target';
      await post('/register', { sessionId: sid });

      const envelopes = [
        testEnvelope({ to: sid }),
        testEnvelope({ to: sid }),
      ];

      const { status, data } = await post('/send-batch', envelopes);
      expect(status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.results).toHaveLength(2);
      expect(data.results[0].delivered).toBe(true);
      expect(data.results[1].delivered).toBe(true);
    });

    it('returns partial results for mixed valid/invalid envelopes', async () => {
      const sid = 'batch-mixed';
      await post('/register', { sessionId: sid });

      const envelopes = [
        testEnvelope({ to: sid }),
        { invalid: true }, // Missing required fields
      ];

      const { status, data } = await post('/send-batch', envelopes);
      expect(status).toBe(200);
      expect(data.results).toHaveLength(2);
      expect(data.results[0].ok).toBe(true);
      expect(data.results[1].ok).toBe(false);
    });

    it('returns 400 for non-array body', async () => {
      const { status } = await post('/send-batch', { not: 'array' });
      expect(status).toBe(400);
    });
  });

  describe('POST /unregister', () => {
    it('removes a registered session', async () => {
      const sid = 'unreg-test';
      await post('/register', { sessionId: sid });
      const { status, data } = await post('/unregister', { sessionId: sid });
      expect(status).toBe(200);
      expect(data.ok).toBe(true);

      // Session should no longer be pollable
      const poll = await get(`/poll?sessionId=${sid}`);
      expect(poll.status).toBe(404);
    });

    it('returns 400 for missing sessionId', async () => {
      const { status } = await post('/unregister', {});
      expect(status).toBe(400);
    });

    it('resolves pending poll on unregister', async () => {
      const sid = 'unreg-poll';
      await post('/register', { sessionId: sid });

      // Start a long poll
      const pollPromise = get(`/poll?sessionId=${sid}&timeout=5000`);

      // Unregister after short delay
      await new Promise(r => setTimeout(r, 50));
      await post('/unregister', { sessionId: sid });

      const { status, data } = await pollPromise;
      expect(status).toBe(200);
      expect(data.messages).toHaveLength(0);
    });
  });

  describe('Unknown routes', () => {
    it('returns 404 for unknown paths', async () => {
      const { status } = await get('/unknown');
      expect(status).toBe(404);
    });
  });
});
