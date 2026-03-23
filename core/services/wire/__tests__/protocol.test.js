'use strict';

const { describe, it, expect } = require('bun:test');
const { isOk, isErr, unwrap } = require('../../../../lib/index.cjs');
const {
  MESSAGE_TYPES,
  URGENCY_LEVELS,
  URGENCY_PRIORITY,
  createEnvelope,
  validateEnvelope,
} = require('../protocol.cjs');

describe('Protocol', () => {
  describe('MESSAGE_TYPES', () => {
    it('is a frozen object', () => {
      expect(Object.isFrozen(MESSAGE_TYPES)).toBe(true);
    });

    it('contains 8 message type keys', () => {
      const keys = Object.keys(MESSAGE_TYPES);
      expect(keys).toHaveLength(8);
      expect(keys).toContain('CONTEXT_INJECTION');
      expect(keys).toContain('DIRECTIVE');
      expect(keys).toContain('RECALL_PRODUCT');
      expect(keys).toContain('SUBLIMATION');
      expect(keys).toContain('WRITE_INTENT');
      expect(keys).toContain('SNAPSHOT');
      expect(keys).toContain('HEARTBEAT');
      expect(keys).toContain('ACK');
    });

    it('maps keys to kebab-case string values', () => {
      expect(MESSAGE_TYPES.CONTEXT_INJECTION).toBe('context-injection');
      expect(MESSAGE_TYPES.DIRECTIVE).toBe('directive');
      expect(MESSAGE_TYPES.RECALL_PRODUCT).toBe('recall-product');
      expect(MESSAGE_TYPES.SUBLIMATION).toBe('sublimation');
      expect(MESSAGE_TYPES.WRITE_INTENT).toBe('write-intent');
      expect(MESSAGE_TYPES.SNAPSHOT).toBe('snapshot');
      expect(MESSAGE_TYPES.HEARTBEAT).toBe('heartbeat');
      expect(MESSAGE_TYPES.ACK).toBe('ack');
    });
  });

  describe('URGENCY_LEVELS', () => {
    it('is a frozen object', () => {
      expect(Object.isFrozen(URGENCY_LEVELS)).toBe(true);
    });

    it('contains 4 urgency level keys', () => {
      const keys = Object.keys(URGENCY_LEVELS);
      expect(keys).toHaveLength(4);
      expect(keys).toContain('BACKGROUND');
      expect(keys).toContain('ACTIVE');
      expect(keys).toContain('DIRECTIVE');
      expect(keys).toContain('URGENT');
    });

    it('maps keys to lowercase string values', () => {
      expect(URGENCY_LEVELS.BACKGROUND).toBe('background');
      expect(URGENCY_LEVELS.ACTIVE).toBe('active');
      expect(URGENCY_LEVELS.DIRECTIVE).toBe('directive');
      expect(URGENCY_LEVELS.URGENT).toBe('urgent');
    });
  });

  describe('URGENCY_PRIORITY', () => {
    it('is a frozen object', () => {
      expect(Object.isFrozen(URGENCY_PRIORITY)).toBe(true);
    });

    it('maps urgency string values to numeric priority (lower = higher priority)', () => {
      expect(URGENCY_PRIORITY['urgent']).toBe(0);
      expect(URGENCY_PRIORITY['directive']).toBe(1);
      expect(URGENCY_PRIORITY['active']).toBe(2);
      expect(URGENCY_PRIORITY['background']).toBe(3);
    });

    it('orders urgent(0) > directive(1) > active(2) > background(3)', () => {
      expect(URGENCY_PRIORITY['urgent']).toBeLessThan(URGENCY_PRIORITY['directive']);
      expect(URGENCY_PRIORITY['directive']).toBeLessThan(URGENCY_PRIORITY['active']);
      expect(URGENCY_PRIORITY['active']).toBeLessThan(URGENCY_PRIORITY['background']);
    });
  });

  describe('createEnvelope', () => {
    it('returns Ok with valid envelope containing auto-generated id and timestamp', () => {
      const result = createEnvelope({
        from: 'sess-1',
        to: 'sess-2',
        type: 'directive',
        urgency: 'urgent',
        payload: { text: 'hello' },
      });
      expect(isOk(result)).toBe(true);
      const envelope = unwrap(result);
      expect(typeof envelope.id).toBe('string');
      expect(envelope.id.length).toBeGreaterThan(0);
      expect(envelope.from).toBe('sess-1');
      expect(envelope.to).toBe('sess-2');
      expect(envelope.type).toBe('directive');
      expect(envelope.urgency).toBe('urgent');
      expect(envelope.payload).toEqual({ text: 'hello' });
      expect(typeof envelope.timestamp).toBe('string');
      // Verify timestamp is ISO string
      expect(new Date(envelope.timestamp).toISOString()).toBe(envelope.timestamp);
    });

    it('sets correlationId to null when not provided', () => {
      const result = createEnvelope({
        from: 'sess-1',
        to: 'sess-2',
        type: 'directive',
        urgency: 'urgent',
        payload: {},
      });
      expect(isOk(result)).toBe(true);
      const envelope = unwrap(result);
      expect(envelope.correlationId).toBeNull();
    });

    it('preserves correlationId when provided', () => {
      const result = createEnvelope({
        from: 'a',
        to: 'b',
        type: 'directive',
        urgency: 'urgent',
        payload: {},
        correlationId: 'abc-123',
      });
      expect(isOk(result)).toBe(true);
      const envelope = unwrap(result);
      expect(envelope.correlationId).toBe('abc-123');
    });

    it('defaults urgency to ACTIVE when not provided', () => {
      const result = createEnvelope({
        from: 'a',
        to: 'b',
        type: 'directive',
        payload: {},
      });
      expect(isOk(result)).toBe(true);
      const envelope = unwrap(result);
      expect(envelope.urgency).toBe('active');
    });

    it('returns err with INVALID_ENVELOPE when from is missing', () => {
      const result = createEnvelope({
        to: 'b',
        type: 'directive',
        payload: {},
      });
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('INVALID_ENVELOPE');
    });

    it('returns err with INVALID_ENVELOPE when to is missing', () => {
      const result = createEnvelope({
        from: 'a',
        type: 'directive',
        payload: {},
      });
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('INVALID_ENVELOPE');
    });

    it('returns err with INVALID_ENVELOPE when type is missing', () => {
      const result = createEnvelope({
        from: 'a',
        to: 'b',
        payload: {},
      });
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('INVALID_ENVELOPE');
    });

    it('returns err with INVALID_ENVELOPE when type is not a valid MESSAGE_TYPES value', () => {
      const result = createEnvelope({
        from: 'a',
        to: 'b',
        type: 'invalid-type',
        payload: {},
      });
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('INVALID_ENVELOPE');
    });

    it('returns err with INVALID_ENVELOPE when urgency is not a valid URGENCY_LEVELS value', () => {
      const result = createEnvelope({
        from: 'a',
        to: 'b',
        type: 'directive',
        urgency: 'invalid-urgency',
        payload: {},
      });
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('INVALID_ENVELOPE');
    });

    it('generates unique ids across multiple calls', () => {
      const r1 = unwrap(createEnvelope({ from: 'a', to: 'b', type: 'ack', payload: {} }));
      const r2 = unwrap(createEnvelope({ from: 'a', to: 'b', type: 'ack', payload: {} }));
      expect(r1.id).not.toBe(r2.id);
    });
  });

  describe('validateEnvelope', () => {
    it('returns Ok for a valid envelope', () => {
      const envelope = unwrap(createEnvelope({
        from: 'sess-1',
        to: 'sess-2',
        type: 'directive',
        urgency: 'urgent',
        payload: { text: 'hello' },
      }));
      const result = validateEnvelope(envelope);
      expect(isOk(result)).toBe(true);
      expect(result.value).toBe(envelope);
    });

    it('returns err for envelope missing id', () => {
      const result = validateEnvelope({
        from: 'a',
        to: 'b',
        type: 'directive',
        urgency: 'urgent',
        payload: {},
        timestamp: new Date().toISOString(),
        correlationId: null,
      });
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('INVALID_ENVELOPE');
    });

    it('returns err for envelope with invalid type', () => {
      const result = validateEnvelope({
        id: 'some-id',
        from: 'a',
        to: 'b',
        type: 'not-a-real-type',
        urgency: 'urgent',
        payload: {},
        timestamp: new Date().toISOString(),
        correlationId: null,
      });
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('INVALID_ENVELOPE');
    });

    it('returns err for envelope with invalid urgency', () => {
      const result = validateEnvelope({
        id: 'some-id',
        from: 'a',
        to: 'b',
        type: 'directive',
        urgency: 'invalid-urgency',
        payload: {},
        timestamp: new Date().toISOString(),
        correlationId: null,
      });
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('INVALID_ENVELOPE');
    });

    it('returns err for envelope missing from', () => {
      const result = validateEnvelope({
        id: 'some-id',
        to: 'b',
        type: 'directive',
        urgency: 'urgent',
        payload: {},
        timestamp: new Date().toISOString(),
        correlationId: null,
      });
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('INVALID_ENVELOPE');
    });

    it('returns err for envelope missing timestamp', () => {
      const result = validateEnvelope({
        id: 'some-id',
        from: 'a',
        to: 'b',
        type: 'directive',
        urgency: 'urgent',
        payload: {},
        correlationId: null,
      });
      expect(isErr(result)).toBe(true);
      expect(result.error.code).toBe('INVALID_ENVELOPE');
    });
  });
});
