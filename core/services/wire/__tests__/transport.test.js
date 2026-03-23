'use strict';

const { describe, it, expect, beforeEach } = require('bun:test');
const { isOk, isErr, unwrap } = require('../../../../lib/index.cjs');
const { TRANSPORT_SHAPE, validateTransport, createTransportRouter } = require('../transport.cjs');
const { createChannelsTransport } = require('../transports/channels-transport.cjs');
const { createRelayTransport } = require('../transports/relay-transport.cjs');

// -- Helpers --

/** Creates a mock transport with configurable type and connectivity */
function createMockTransport(type, connected = true) {
  const sent = [];
  const batched = [];
  return {
    type,
    _sent: sent,
    _batched: batched,
    isConnected: () => connected,
    connect: async () => ({ ok: true, value: undefined }),
    disconnect: async () => ({ ok: true, value: undefined }),
    send: async (envelope) => {
      sent.push(envelope);
      return { ok: true, value: { delivered: true, transport: type } };
    },
    sendBatch: async (envelopes) => {
      batched.push(...envelopes);
      return { ok: true, value: { count: envelopes.length, transport: type } };
    },
    healthCheck: async () => ({ ok: true, value: { type, connected } }),
  };
}

// -- TRANSPORT_SHAPE --

describe('TRANSPORT_SHAPE', () => {
  it('defines required and optional transport methods', () => {
    expect(TRANSPORT_SHAPE.required).toContain('send');
    expect(TRANSPORT_SHAPE.required).toContain('connect');
    expect(TRANSPORT_SHAPE.required).toContain('disconnect');
    expect(TRANSPORT_SHAPE.required).toContain('healthCheck');
    expect(TRANSPORT_SHAPE.required).toContain('isConnected');
    expect(TRANSPORT_SHAPE.optional).toContain('sendBatch');
    expect(TRANSPORT_SHAPE.optional).toContain('type');
  });
});

// -- validateTransport --

describe('validateTransport', () => {
  it('validates a complete transport implementation', () => {
    const transport = createMockTransport('test');
    const result = validateTransport(transport);
    expect(isOk(result)).toBe(true);
  });

  it('rejects a transport missing required methods', () => {
    const result = validateTransport({ type: 'broken' });
    expect(isErr(result)).toBe(true);
  });
});

// -- createTransportRouter --

describe('createTransportRouter', () => {
  let channelsTransport;
  let relayTransport;
  let router;

  beforeEach(() => {
    channelsTransport = createMockTransport('channels', true);
    relayTransport = createMockTransport('relay', true);
    router = createTransportRouter([channelsTransport, relayTransport]);
  });

  describe('selectTransport', () => {
    it('selects channels for urgent messages', () => {
      const transport = router.selectTransport({ urgency: 'urgent' });
      expect(transport.type).toBe('channels');
    });

    it('selects channels for directive messages', () => {
      const transport = router.selectTransport({ urgency: 'directive' });
      expect(transport.type).toBe('channels');
    });

    it('selects relay for background messages', () => {
      const transport = router.selectTransport({ urgency: 'background' });
      expect(transport.type).toBe('relay');
    });

    it('selects relay for active messages', () => {
      const transport = router.selectTransport({ urgency: 'active' });
      expect(transport.type).toBe('relay');
    });

    it('falls back to relay when channels is disconnected for urgent', () => {
      const disconnectedChannels = createMockTransport('channels', false);
      const r = createTransportRouter([disconnectedChannels, relayTransport]);
      const transport = r.selectTransport({ urgency: 'urgent' });
      expect(transport.type).toBe('relay');
    });

    it('falls back to channels when relay is disconnected for background', () => {
      const disconnectedRelay = createMockTransport('relay', false);
      const r = createTransportRouter([channelsTransport, disconnectedRelay]);
      const transport = r.selectTransport({ urgency: 'background' });
      expect(transport.type).toBe('channels');
    });

    it('returns null when no transports are connected', () => {
      const r = createTransportRouter([
        createMockTransport('channels', false),
        createMockTransport('relay', false),
      ]);
      const transport = r.selectTransport({ urgency: 'urgent' });
      expect(transport).toBeNull();
    });
  });

  describe('send', () => {
    it('sends through selected transport', async () => {
      const envelope = { id: 'test-1', urgency: 'urgent', from: 'a', to: 'b', type: 'directive', payload: {} };
      const result = await router.send(envelope);
      expect(isOk(result)).toBe(true);
      expect(channelsTransport._sent).toHaveLength(1);
      expect(channelsTransport._sent[0].id).toBe('test-1');
    });

    it('returns error when no transport available', async () => {
      const r = createTransportRouter([
        createMockTransport('channels', false),
        createMockTransport('relay', false),
      ]);
      const result = await r.send({ urgency: 'urgent' });
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('NO_TRANSPORT');
    });
  });

  describe('sendBatch', () => {
    it('groups envelopes by selected transport', async () => {
      const envelopes = [
        { id: '1', urgency: 'urgent', from: 'a', to: 'b', type: 'directive', payload: {} },
        { id: '2', urgency: 'background', from: 'a', to: 'b', type: 'snapshot', payload: {} },
      ];
      const result = await router.sendBatch(envelopes);
      expect(isOk(result)).toBe(true);
      // Urgent -> channels batch, background -> relay batch
      expect(channelsTransport._batched).toHaveLength(1);
      expect(relayTransport._batched).toHaveLength(1);
    });

    it('uses send() if transport lacks sendBatch', async () => {
      const noBatchTransport = createMockTransport('channels', true);
      delete noBatchTransport.sendBatch;
      const r = createTransportRouter([noBatchTransport, relayTransport]);
      const envelopes = [
        { id: '1', urgency: 'urgent', from: 'a', to: 'b', type: 'directive', payload: {} },
      ];
      const result = await r.sendBatch(envelopes);
      expect(isOk(result)).toBe(true);
      expect(noBatchTransport._sent).toHaveLength(1);
    });
  });

  describe('connectAll', () => {
    it('connects all transports and returns statuses', async () => {
      const result = await router.connectAll();
      expect(isOk(result)).toBe(true);
      const statuses = unwrap(result);
      expect(statuses).toHaveLength(2);
      expect(statuses[0].type).toBe('channels');
      expect(statuses[1].type).toBe('relay');
    });
  });

  describe('disconnectAll', () => {
    it('disconnects all transports and returns statuses', async () => {
      const result = await router.disconnectAll();
      expect(isOk(result)).toBe(true);
      const statuses = unwrap(result);
      expect(statuses).toHaveLength(2);
    });
  });

  describe('healthCheck', () => {
    it('returns health statuses for all transports', async () => {
      const result = await router.healthCheck();
      expect(isOk(result)).toBe(true);
      const statuses = unwrap(result);
      expect(statuses).toHaveLength(2);
    });
  });
});

// -- createChannelsTransport --

describe('createChannelsTransport', () => {
  it('has type "channels"', () => {
    const transport = createChannelsTransport();
    expect(transport.type).toBe('channels');
  });

  it('is not connected without mcpServer', () => {
    const transport = createChannelsTransport();
    expect(transport.isConnected()).toBe(false);
  });

  it('becomes connected after connect() with mcpServer', async () => {
    const mockServer = { notification: async () => {} };
    const transport = createChannelsTransport({ mcpServer: mockServer });
    await transport.connect();
    expect(transport.isConnected()).toBe(true);
  });

  it('becomes disconnected after disconnect()', async () => {
    const mockServer = { notification: async () => {} };
    const transport = createChannelsTransport({ mcpServer: mockServer });
    await transport.connect();
    await transport.disconnect();
    expect(transport.isConnected()).toBe(false);
  });

  it('returns error when sending while disconnected', async () => {
    const transport = createChannelsTransport();
    const result = await transport.send({ id: 'x', from: 'a', to: 'b', type: 'directive', urgency: 'urgent', payload: {} });
    expect(isErr(result)).toBe(true);
    expect(result.error.code).toBe('TRANSPORT_DISCONNECTED');
  });

  it('calls mcpServer.notification with correct Channels format', async () => {
    let capturedNotification = null;
    const mockServer = {
      notification: async (data) => {
        capturedNotification = data;
      },
    };
    const transport = createChannelsTransport({ mcpServer: mockServer });
    await transport.connect();

    const envelope = {
      id: 'msg-001',
      from: 'session-alpha',
      to: 'session-beta',
      type: 'context-injection',
      urgency: 'directive',
      payload: { text: 'hello' },
      correlationId: 'corr-123',
    };

    const result = await transport.send(envelope);
    expect(isOk(result)).toBe(true);

    // Verify notification structure
    expect(capturedNotification).not.toBeNull();
    expect(capturedNotification.method).toBe('notifications/claude/channel');
    expect(capturedNotification.params.content).toBe(JSON.stringify({ text: 'hello' }));

    // Verify meta keys use underscores (not hyphens -- Channels silently drops hyphenated keys)
    const meta = capturedNotification.params.meta;
    expect(meta.from_session).toBe('session-alpha');
    expect(meta.urgency_level).toBe('directive');
    expect(meta.message_type).toBe('context-injection');
    expect(meta.message_id).toBe('msg-001');
    expect(meta.correlation_id).toBe('corr-123');
  });

  it('uses empty string for missing correlationId', async () => {
    let capturedNotification = null;
    const mockServer = {
      notification: async (data) => {
        capturedNotification = data;
      },
    };
    const transport = createChannelsTransport({ mcpServer: mockServer });
    await transport.connect();

    await transport.send({
      id: 'msg-002',
      from: 'a',
      to: 'b',
      type: 'heartbeat',
      urgency: 'background',
      payload: null,
      correlationId: null,
    });

    expect(capturedNotification.params.meta.correlation_id).toBe('');
  });

  it('returns error when mcpServer.notification throws', async () => {
    const mockServer = {
      notification: async () => {
        throw new Error('MCP transport error');
      },
    };
    const transport = createChannelsTransport({ mcpServer: mockServer });
    await transport.connect();

    const result = await transport.send({
      id: 'x', from: 'a', to: 'b', type: 'directive', urgency: 'urgent', payload: {},
    });
    expect(isErr(result)).toBe(true);
    expect(result.error.code).toBe('CHANNELS_SEND_FAILED');
  });

  it('healthCheck returns connected status', async () => {
    const mockServer = { notification: async () => {} };
    const transport = createChannelsTransport({ mcpServer: mockServer });
    await transport.connect();
    const result = await transport.healthCheck();
    expect(isOk(result)).toBe(true);
    const health = unwrap(result);
    expect(health.type).toBe('channels');
    expect(health.connected).toBe(true);
    expect(health.hasMcpServer).toBe(true);
  });

  it('conforms to TRANSPORT_SHAPE contract', () => {
    const transport = createChannelsTransport();
    const result = validateTransport(transport);
    expect(isOk(result)).toBe(true);
  });
});

// -- createRelayTransport (mock-based, no real HTTP) --

describe('createRelayTransport', () => {
  it('has type "relay"', () => {
    const transport = createRelayTransport({ sessionId: 'test-session' });
    expect(transport.type).toBe('relay');
  });

  it('is not connected initially', () => {
    const transport = createRelayTransport({ sessionId: 'test-session' });
    expect(transport.isConnected()).toBe(false);
  });

  it('returns error when sending while disconnected', async () => {
    const transport = createRelayTransport({ sessionId: 'test-session' });
    const result = await transport.send({ id: 'x', from: 'a', to: 'b' });
    expect(isErr(result)).toBe(true);
    expect(result.error.code).toBe('TRANSPORT_DISCONNECTED');
  });

  it('returns error for sendBatch while disconnected', async () => {
    const transport = createRelayTransport({ sessionId: 'test-session' });
    const result = await transport.sendBatch([{ id: 'x' }]);
    expect(isErr(result)).toBe(true);
    expect(result.error.code).toBe('TRANSPORT_DISCONNECTED');
  });

  it('conforms to TRANSPORT_SHAPE contract', () => {
    const transport = createRelayTransport({ sessionId: 'test-session' });
    const result = validateTransport(transport);
    expect(isOk(result)).toBe(true);
  });

  it('healthCheck works when not connected', async () => {
    const transport = createRelayTransport({
      sessionId: 'test',
      relayUrl: 'http://127.0.0.1:1', // unreachable
    });
    const result = await transport.healthCheck();
    expect(isOk(result)).toBe(true);
    const health = unwrap(result);
    expect(health.type).toBe('relay');
    expect(health.connected).toBe(false);
  });
});
