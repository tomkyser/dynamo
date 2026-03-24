'use strict';

const { describe, it, expect, beforeAll, afterAll } = require('bun:test');
const { _createServer } = require('../relay-server.cjs');
const { createRelayTransport } = require('../transports/relay-transport.cjs');
const { createEnvelope, MESSAGE_TYPES, URGENCY_LEVELS } = require('../protocol.cjs');
const { createPriorityQueue } = require('../queue.cjs');
const { unwrap, isOk } = require('../../../../lib/index.cjs');

/**
 * Multi-session integration test.
 * Validates that two sessions can exchange messages through the relay server
 * with correct urgency handling per ROADMAP success criteria:
 * "Wire supports urgency-level messaging validated by a multi-session integration test."
 */

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
  return unwrap(createEnvelope({
    from: 'session-a',
    to: 'session-b',
    type: MESSAGE_TYPES.DIRECTIVE,
    urgency: URGENCY_LEVELS.DIRECTIVE,
    payload: { test: true },
    ...overrides,
  }));
}

describe('Multi-session integration', () => {

  describe('session registration and discovery', () => {
    it('registers two sessions and both are visible in health check', async () => {
      // Register session A
      const regA = await post('/register', { sessionId: 'session-a' });
      expect(regA.data.ok).toBe(true);

      // Register session B
      const regB = await post('/register', { sessionId: 'session-b' });
      expect(regB.data.ok).toBe(true);

      // Health check shows both sessions
      const health = await get('/health');
      expect(health.data.status).toBe('ok');
      expect(health.data.sessions).toBeGreaterThanOrEqual(2);
    });
  });

  describe('message exchange between sessions', () => {
    it('Session A sends directive to Session B', async () => {
      // Ensure sessions are registered
      await post('/register', { sessionId: 'session-a' });
      await post('/register', { sessionId: 'session-b' });

      // Session A sends a directive to Session B
      const envelope = testEnvelope({
        from: 'session-a',
        to: 'session-b',
        type: MESSAGE_TYPES.DIRECTIVE,
        urgency: URGENCY_LEVELS.DIRECTIVE,
        payload: { action: 'analyze', target: 'file.cjs' },
      });

      const sendResult = await post('/send', envelope);
      expect(sendResult.data.ok).toBe(true);
      expect(sendResult.data.delivered).toBe(true);

      // Session B polls and receives the message
      const pollResult = await get(`/poll?sessionId=session-b&timeout=500`);
      expect(pollResult.data.messages.length).toBe(1);

      const received = pollResult.data.messages[0];
      expect(received.from).toBe('session-a');
      expect(received.to).toBe('session-b');
      expect(received.type).toBe(MESSAGE_TYPES.DIRECTIVE);
      expect(received.urgency).toBe(URGENCY_LEVELS.DIRECTIVE);
      expect(received.payload.action).toBe('analyze');
    });

    it('Session B sends background sublimation to Session A', async () => {
      await post('/register', { sessionId: 'session-a' });
      await post('/register', { sessionId: 'session-b' });

      const envelope = testEnvelope({
        from: 'session-b',
        to: 'session-a',
        type: MESSAGE_TYPES.SUBLIMATION,
        urgency: URGENCY_LEVELS.BACKGROUND,
        payload: { insight: 'pattern detected in codebase' },
      });

      const sendResult = await post('/send', envelope);
      expect(sendResult.data.ok).toBe(true);

      const pollResult = await get(`/poll?sessionId=session-a&timeout=500`);
      expect(pollResult.data.messages.length).toBe(1);

      const received = pollResult.data.messages[0];
      expect(received.from).toBe('session-b');
      expect(received.type).toBe(MESSAGE_TYPES.SUBLIMATION);
      expect(received.urgency).toBe(URGENCY_LEVELS.BACKGROUND);
      expect(received.payload.insight).toBe('pattern detected in codebase');
    });
  });

  describe('batch send', () => {
    it('Session A sends 3 messages, Session B receives all 3', async () => {
      await post('/register', { sessionId: 'session-a' });
      await post('/register', { sessionId: 'session-b' });

      // Drain any existing messages
      await get(`/poll?sessionId=session-b&timeout=100`);

      const envelopes = [
        testEnvelope({ from: 'session-a', to: 'session-b', payload: { seq: 1 } }),
        testEnvelope({ from: 'session-a', to: 'session-b', payload: { seq: 2 } }),
        testEnvelope({ from: 'session-a', to: 'session-b', payload: { seq: 3 } }),
      ];

      const batchResult = await post('/send-batch', envelopes);
      expect(batchResult.data.ok).toBe(true);
      expect(batchResult.data.results.length).toBe(3);

      // Session B polls and gets all 3
      const pollResult = await get(`/poll?sessionId=session-b&timeout=500`);
      expect(pollResult.data.messages.length).toBe(3);
      expect(pollResult.data.messages[0].payload.seq).toBe(1);
      expect(pollResult.data.messages[1].payload.seq).toBe(2);
      expect(pollResult.data.messages[2].payload.seq).toBe(3);
    });
  });

  describe('urgency ordering', () => {
    it('priority queue dequeues urgent first, then active, then background', () => {
      const queue = createPriorityQueue();

      // Enqueue in non-priority order: background, active, urgent
      const bgEnvelope = testEnvelope({
        urgency: URGENCY_LEVELS.BACKGROUND,
        payload: { level: 'background' },
      });
      const activeEnvelope = testEnvelope({
        urgency: URGENCY_LEVELS.ACTIVE,
        payload: { level: 'active' },
      });
      const urgentEnvelope = testEnvelope({
        urgency: URGENCY_LEVELS.URGENT,
        payload: { level: 'urgent' },
      });

      queue.enqueue(bgEnvelope);
      queue.enqueue(activeEnvelope);
      queue.enqueue(urgentEnvelope);

      // Dequeue should return: urgent, active, background
      const first = queue.dequeue();
      expect(first.urgency).toBe(URGENCY_LEVELS.URGENT);
      expect(first.payload.level).toBe('urgent');

      const second = queue.dequeue();
      expect(second.urgency).toBe(URGENCY_LEVELS.ACTIVE);
      expect(second.payload.level).toBe('active');

      const third = queue.dequeue();
      expect(third.urgency).toBe(URGENCY_LEVELS.BACKGROUND);
      expect(third.payload.level).toBe('background');
    });

    it('within same urgency, FIFO order is maintained', () => {
      const queue = createPriorityQueue();

      const first = testEnvelope({ urgency: URGENCY_LEVELS.ACTIVE, payload: { seq: 1 } });
      const second = testEnvelope({ urgency: URGENCY_LEVELS.ACTIVE, payload: { seq: 2 } });
      const third = testEnvelope({ urgency: URGENCY_LEVELS.ACTIVE, payload: { seq: 3 } });

      queue.enqueue(first);
      queue.enqueue(second);
      queue.enqueue(third);

      expect(queue.dequeue().payload.seq).toBe(1);
      expect(queue.dequeue().payload.seq).toBe(2);
      expect(queue.dequeue().payload.seq).toBe(3);
    });
  });

  describe('relay transport integration', () => {
    it('two relay transports can exchange messages through the server', async () => {
      const receivedByB = [];

      const transportA = createRelayTransport({
        relayUrl: baseUrl,
        sessionId: 'transport-a',
        onMessage: () => {},
        pollTimeoutMs: 300,
      });

      const transportB = createRelayTransport({
        relayUrl: baseUrl,
        sessionId: 'transport-b',
        onMessage: (msg) => receivedByB.push(msg),
        pollTimeoutMs: 300,
      });

      // Connect both transports (registers them with relay)
      const connA = await transportA.connect();
      expect(isOk(connA)).toBe(true);

      const connB = await transportB.connect();
      expect(isOk(connB)).toBe(true);

      // Session A sends a message to transport-b
      const envelope = testEnvelope({
        from: 'transport-a',
        to: 'transport-b',
        type: MESSAGE_TYPES.CONTEXT_INJECTION,
        urgency: URGENCY_LEVELS.ACTIVE,
        payload: { context: 'test-data-from-a' },
      });

      const sendResult = await transportA.send(envelope);
      expect(isOk(sendResult)).toBe(true);

      // Wait for transport B's poll loop to pick up the message
      await new Promise(resolve => setTimeout(resolve, 600));

      expect(receivedByB.length).toBe(1);
      expect(receivedByB[0].from).toBe('transport-a');
      expect(receivedByB[0].payload.context).toBe('test-data-from-a');

      // Cleanup
      await transportA.disconnect();
      await transportB.disconnect();
    });
  });
});
